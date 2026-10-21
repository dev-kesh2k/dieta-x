import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { prisma, HttpError } from './db.js';

export const DEFAULT_MODEL = 'claude-opus-5-5';
export const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5'];

const KEY_SETTING = 'anthropic_api_key';
const MODEL_SETTING = 'anthropic_model';

/** Chave e modelo: o que foi salvo pela tela vale mais que o .env. */
export async function aiConfig() {
  const rows = await prisma.setting.findMany({ where: { key: { in: [KEY_SETTING, MODEL_SETTING] } } });
  const saved = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const apiKey = saved[KEY_SETTING] || process.env.ANTHROPIC_API_KEY || '';
  const model = saved[MODEL_SETTING] || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  return { apiKey, model, source: saved[KEY_SETTING] ? 'app' : apiKey ? 'env' : 'none' };
}

export async function saveAiConfig({ apiKey, model }) {
  const ops = [];
  if (apiKey !== undefined) {
    ops.push(
      apiKey
        ? prisma.setting.upsert({ where: { key: KEY_SETTING }, create: { key: KEY_SETTING, value: apiKey }, update: { value: apiKey } })
        : prisma.setting.deleteMany({ where: { key: KEY_SETTING } }),
    );
  }
  if (model !== undefined) {
    ops.push(prisma.setting.upsert({ where: { key: MODEL_SETTING }, create: { key: MODEL_SETTING, value: model }, update: { value: model } }));
  }
  await prisma.$transaction(ops);
}

export const maskKey = (k) => (k ? `${k.slice(0, 10)}…${k.slice(-4)}` : '');

const MealEstimate = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      kcal: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
    }),
  ),
  notes: z.string(),
});

const SYSTEM = `Você é um nutricionista brasileiro que estima calorias e macronutrientes de refeições descritas em texto livre.
Use como referência a Tabela Brasileira de Composição de Alimentos (TACO) e porções caseiras típicas do Brasil.
Separe a refeição em itens. Quando a quantidade não for informada, assuma uma porção média brasileira e diga qual em "quantity" (ex.: "1 unidade (50 g)", "4 colheres de sopa (100 g)").
Considere o modo de preparo citado (frito, grelhado, com óleo, com açúcar). Valores por item: kcal, proteína, carboidrato e gordura em gramas.
Em "notes", escreva em português, em no máximo duas frases, as suposições feitas sobre porções (ou deixe vazio).
Se o texto não descrever comida ou bebida, devolva "items" vazio e explique em "notes".`;

/** Pede ao Claude a estimativa nutricional da refeição descrita. */
export async function estimateMeal(description) {
  const { apiKey, model } = await aiConfig();
  if (!apiKey) throw new HttpError(503, 'A IA ainda não está configurada. Peça ao administrador para cadastrar a chave da API Anthropic em Perfil → Inteligência artificial, ou informe as calorias manualmente.');
  const client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 1 });
  let response;
  try {
    response = await client.beta.messages.parse({
      model,
      max_tokens: 4000,
      // Haiku 4.5 não aceita "effort"; nos demais, esforço baixo basta para estimar porções.
      output_config: {
        format: betaZodOutputFormat(MealEstimate),
        ...(model === 'claude-haiku-4-5' ? {} : { effort: 'low' }),
      },
      // Se o modelo principal recusar, a própria API tenta outro modelo na mesma chamada.
      ...(model.startsWith('claude-opus') || model.startsWith('claude-sonnet-5-5')
        ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }
        : {}),
      system: SYSTEM,
      messages: [{ role: 'user', content: `Refeição: ${description}` }],
    });
  } catch (err) {
    throw aiError(err);
  }
  if (response.stop_reason === 'refusal') throw new HttpError(422, 'A IA não conseguiu analisar esta descrição. Reescreva a refeição ou informe as calorias manualmente.');
  if (response.stop_reason === 'max_tokens') throw new HttpError(422, 'Descrição longa demais para analisar de uma vez. Divida em duas refeições.');
  const parsed = response.parsed_output;
  if (!parsed) throw new HttpError(502, 'A IA respondeu num formato inesperado. Tente de novo.');
  const r1 = (n) => Math.max(0, Math.round((Number(n) || 0) * 10) / 10);
  const items = parsed.items.map((i) => ({
    name: String(i.name).slice(0, 120),
    quantity: String(i.quantity).slice(0, 80),
    kcal: Math.max(0, Math.round(Number(i.kcal) || 0)),
    proteinG: r1(i.protein_g),
    carbsG: r1(i.carbs_g),
    fatG: r1(i.fat_g),
  }));
  const sum = (k) => items.reduce((acc, i) => acc + i[k], 0);
  return {
    items,
    kcal: sum('kcal'),
    proteinG: r1(sum('proteinG')),
    carbsG: r1(sum('carbsG')),
    fatG: r1(sum('fatG')),
    notes: String(parsed.notes || '').slice(0, 400),
    model: response.model,
  };
}

/** Testa a chave com uma chamada mínima. */
export async function testAi({ apiKey, model }) {
  const client = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 0 });
  try {
    await client.models.retrieve(model);
  } catch (err) {
    throw aiError(err);
  }
}

function aiError(err) {
  if (err instanceof Anthropic.AuthenticationError) return new HttpError(400, 'Chave da API Anthropic inválida. Confira em Perfil → Inteligência artificial.');
  if (err instanceof Anthropic.PermissionDeniedError) return new HttpError(400, 'A chave não tem permissão para usar este modelo.');
  if (err instanceof Anthropic.NotFoundError) return new HttpError(400, 'Modelo não encontrado para esta chave.');
  if (err instanceof Anthropic.RateLimitError) return new HttpError(429, 'Limite de uso da IA atingido. Tente de novo em instantes.');
  if (err instanceof Anthropic.BadRequestError) {
    const msg = String(err.message || '');
    if (/credit|balance/i.test(msg)) return new HttpError(402, 'A conta da API Anthropic está sem créditos.');
    console.error('Claude 400:', msg);
    return new HttpError(502, 'A IA recusou a requisição. Tente de novo ou informe as calorias manualmente.');
  }
  if (err instanceof Anthropic.APIConnectionError) return new HttpError(504, 'Sem conexão com a IA. Tente de novo.');
  if (err instanceof Anthropic.APIError) {
    console.error('Claude erro:', err.status, err.message);
    return new HttpError(502, 'A IA está indisponível no momento. Tente de novo.');
  }
  return err;
}
