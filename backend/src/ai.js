import { mkdirSync } from 'fs';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { prisma, HttpError } from './db.js';

// IA pela assinatura Claude (Pro/Max): o Claude Code roda como subprocesso,
// autenticado com o token de `claude setup-token` (CLAUDE_CODE_OAUTH_TOKEN). Sem chave de API.
export const DEFAULT_MODEL = 'opus';
export const MODELS = ['opus', 'sonnet', 'haiku'];

const TOKEN_SETTING = 'claude_oauth_token';
const MODEL_SETTING = 'claude_model';
const TOKEN_RE = /^sk-ant-oat01-[\w-]{20,}$/;
const HOME = '/tmp/dieta-x-claude';

/** Token e modelo: o que foi salvo pela tela vale mais que o .env. */
export async function aiConfig() {
  const rows = await prisma.setting.findMany({ where: { key: { in: [TOKEN_SETTING, MODEL_SETTING] } } });
  const saved = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const token = saved[TOKEN_SETTING] || process.env.CLAUDE_CODE_OAUTH_TOKEN || '';
  const envModel = MODELS.includes(process.env.CLAUDE_MODEL) ? process.env.CLAUDE_MODEL : DEFAULT_MODEL;
  const model = MODELS.includes(saved[MODEL_SETTING]) ? saved[MODEL_SETTING] : envModel;
  return { token, model, source: saved[TOKEN_SETTING] ? 'app' : token ? 'env' : 'none' };
}

export async function saveAiConfig({ token, model }) {
  const ops = [];
  if (token !== undefined) {
    ops.push(
      token
        ? prisma.setting.upsert({ where: { key: TOKEN_SETTING }, create: { key: TOKEN_SETTING, value: token }, update: { value: token } })
        : prisma.setting.deleteMany({ where: { key: TOKEN_SETTING } }),
    );
  }
  if (model !== undefined) {
    ops.push(prisma.setting.upsert({ where: { key: MODEL_SETTING }, create: { key: MODEL_SETTING, value: model }, update: { value: model } }));
  }
  await prisma.$transaction(ops);
}

export const maskToken = (k) => (k ? `${k.slice(0, 14)}…${k.slice(-4)}` : '');
export const isToken = (k) => TOKEN_RE.test(k);

const NUM = { type: 'number', minimum: 0 };
const MEAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'notes'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'quantity', 'kcal', 'protein_g', 'carbs_g', 'fat_g'],
        properties: { name: { type: 'string' }, quantity: { type: 'string' }, kcal: NUM, protein_g: NUM, carbs_g: NUM, fat_g: NUM },
      },
    },
    notes: { type: 'string' },
  },
};

const SYSTEM = `Você é um nutricionista brasileiro que estima calorias e macronutrientes de refeições descritas em texto livre.
Use como referência a Tabela Brasileira de Composição de Alimentos (TACO) e porções caseiras típicas do Brasil.
Separe a refeição em itens. Quando a quantidade não for informada, assuma uma porção média brasileira e diga qual em "quantity" (ex.: "1 unidade (50 g)", "4 colheres de sopa (100 g)").
Considere o modo de preparo citado (frito, grelhado, com óleo, com açúcar). Valores por item: kcal, proteína, carboidrato e gordura em gramas.
Em "notes", escreva em português, em no máximo duas frases, as suposições feitas sobre porções (ou deixe vazio).
Se o texto não descrever comida ou bebida, devolva "items" vazio e explique em "notes".
Responda só com os dados pedidos, sem usar ferramentas.`;

const ERRORS = {
  authentication_failed: [400, 'O token da assinatura Claude é inválido ou expirou. Gere outro com "claude setup-token" e cadastre em Admin → Inteligência artificial.'],
  oauth_org_not_allowed: [400, 'Esta conta Claude não permite uso por token. Verifique a assinatura.'],
  account_on_hold: [400, 'A conta Claude está suspensa. Verifique em claude.ai.'],
  verification_required: [400, 'A conta Claude precisa de verificação. Entre em claude.ai e conclua.'],
  billing_error: [402, 'Problema na assinatura Claude (pagamento). Verifique em claude.ai.'],
  rate_limit: [429, 'Limite de uso da assinatura Claude atingido. Tente de novo mais tarde.'],
  overloaded: [503, 'O Claude está sobrecarregado agora. Tente de novo em instantes.'],
  model_not_found: [400, 'Modelo indisponível na sua assinatura. Escolha outro em Admin → Inteligência artificial.'],
};

// Um Claude Code por vez: cada processo usa ~250 MB e o container tem limite de memória.
let chain = Promise.resolve();
const serial = (fn) => {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
};

/** Roda um pedido no Claude Code com o token da assinatura e devolve a mensagem de resultado. */
function runClaude({ token, model, prompt, system, schema, timeoutMs = 120_000 }) {
  return serial(async () => {
    mkdirSync(HOME, { recursive: true });
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), timeoutMs);
    let stderr = '';
    let apiError = null;
    try {
      const q = query({
        prompt,
        options: {
          model,
          systemPrompt: system,
          tools: [],
          maxTurns: schema ? 4 : 1,
          effort: 'low',
          ...(schema ? { outputFormat: { type: 'json_schema', schema } } : {}),
          persistSession: false,
          settingSources: [],
          cwd: HOME,
          abortController,
          stderr: (d) => {
            stderr = (stderr + d).slice(-2000);
          },
          // O env substitui o do processo: só o necessário, sem chave de API (ela teria prioridade sobre o token).
          env: {
            PATH: process.env.PATH,
            HOME,
            TZ: process.env.TZ,
            CLAUDE_CODE_OAUTH_TOKEN: token,
            CLAUDE_AGENT_SDK_CLIENT_APP: 'dieta-x/1.0',
            DISABLE_AUTOUPDATER: '1',
            DISABLE_TELEMETRY: '1',
            CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
          },
        },
      });
      for await (const msg of q) {
        if (msg.type === 'assistant' && msg.error) apiError = msg.error;
        if (msg.type === 'result') {
          if (apiError && ERRORS[apiError]) throw new HttpError(...ERRORS[apiError]);
          if (msg.subtype !== 'success' || msg.is_error) {
            console.error('Claude falhou:', msg.subtype, msg.result || '', apiError || '', stderr);
            if (/auth|login|token|401/i.test(String(msg.result || ''))) throw new HttpError(...ERRORS.authentication_failed);
            throw new HttpError(502, 'A IA não conseguiu responder. Tente de novo ou informe as calorias manualmente.');
          }
          return msg;
        }
      }
      throw new HttpError(502, 'A IA encerrou sem resposta. Tente de novo.');
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (abortController.signal.aborted) throw new HttpError(504, 'A IA demorou demais para responder. Tente de novo.');
      if (apiError && ERRORS[apiError]) throw new HttpError(...ERRORS[apiError]);
      console.error('Claude erro:', err?.message, stderr);
      throw new HttpError(502, 'A IA está indisponível no momento. Tente de novo.');
    } finally {
      clearTimeout(timer);
    }
  });
}

/** Pede ao Claude a estimativa nutricional da refeição descrita. */
export async function estimateMeal(description) {
  const { token, model } = await aiConfig();
  if (!token) throw new HttpError(503, 'A IA ainda não está configurada. Peça ao administrador para cadastrar o token da assinatura Claude em Admin → Inteligência artificial, ou informe as calorias manualmente.');
  const msg = await runClaude({ token, model, system: SYSTEM, schema: MEAL_SCHEMA, prompt: `Refeição: ${description}` });
  const parsed = msg.structured_output;
  if (!parsed || !Array.isArray(parsed.items)) throw new HttpError(502, 'A IA respondeu num formato inesperado. Tente de novo.');
  const r1 = (n) => Math.max(0, Math.round((Number(n) || 0) * 10) / 10);
  const items = parsed.items.slice(0, 40).map((i) => ({
    name: String(i.name ?? '').slice(0, 120),
    quantity: String(i.quantity ?? '').slice(0, 80),
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
    model,
  };
}

/** Testa o token com um pedido mínimo. */
export async function testAi({ token, model }) {
  await runClaude({ token, model, system: 'Responda apenas: OK', prompt: 'Teste de conexão.', timeoutMs: 60_000 });
}
