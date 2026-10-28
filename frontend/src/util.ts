export const MEAL_TYPES: { id: string; label: string }[] = [
  { id: 'cafe', label: 'Café da manhã' },
  { id: 'lanche_manha', label: 'Lanche da manhã' },
  { id: 'almoco', label: 'Almoço' },
  { id: 'lanche_tarde', label: 'Lanche da tarde' },
  { id: 'jantar', label: 'Jantar' },
  { id: 'ceia', label: 'Ceia' },
  { id: 'outro', label: 'Outro' },
];
export const mealLabel = (id: string) => MEAL_TYPES.find((t) => t.id === id)?.label ?? 'Refeição';

/** Tipo de refeição sugerido pelo horário. */
export function mealByHour(h = new Date().getHours()) {
  if (h < 10) return 'cafe';
  if (h < 12) return 'lanche_manha';
  if (h < 15) return 'almoco';
  if (h < 18) return 'lanche_tarde';
  if (h < 21) return 'jantar';
  return 'ceia';
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fmtMin = (min: number) => {
  const m = ((Math.round(min / 15) * 15) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export interface MealSlot { id: string; label: string; from: number; to: number; tip: string; optional?: boolean }

/**
 * Melhores horários das refeições pela rotina de sono (crononutrição):
 * café até ~1 h depois de acordar, intervalos de 3–4 h, almoço como refeição maior perto do meio do dia
 * e jantar terminando pelo menos 3 h antes de dormir (melhor sono e glicemia). Minutos desde 00:00.
 */
export function mealSchedule(wake = '07:00', sleep = '23:00'): MealSlot[] {
  const w = toMin(wake);
  let s = toMin(sleep);
  if (s <= w) s += 1440;
  const cafe = w + 45;
  const jantar = Math.max(cafe + 6 * 60, s - 3.5 * 60);
  const almoco = cafe + (jantar - cafe) * 0.45;
  const slot = (id: string, center: number, tip: string, optional = false): MealSlot => ({
    id, label: mealLabel(id), from: center - 30, to: center + 30, tip, optional,
  });
  return [
    slot('cafe', cafe, 'Até 1 h depois de acordar, com proteína.'),
    slot('lanche_manha', (cafe + almoco) / 2, 'Intervalo de 3 h; fruta ou iogurte.'),
    slot('almoco', almoco, 'Maior refeição do dia.'),
    slot('lanche_tarde', (almoco + jantar) / 2, 'Evita chegar com muita fome no jantar.'),
    slot('jantar', jantar, 'Mais leve, até 3 h antes de dormir.'),
    slot('ceia', s - 90, 'Só se tiver fome ou no ganho de massa: algo leve com proteína.', true),
  ];
}

/** Tipo de refeição sugerido pelo horário, pela rotina do usuário. */
export function mealBySchedule(slots: MealSlot[], now = new Date()) {
  const n = now.getHours() * 60 + now.getMinutes();
  // Madrugada (mais de 4 h antes do café) conta como fim do dia anterior.
  const t = slots[0].from - 240 > n ? n + 1440 : n;
  let best = slots[0];
  for (const sl of slots) if (t >= sl.from - 60) best = sl;
  return best.id;
}

export const ACTIVITY_LEVELS = [
  { id: 'sedentario', label: 'Sedentário', hint: 'sem exercício' },
  { id: 'leve', label: 'Leve', hint: '1–3×/sem.' },
  { id: 'moderado', label: 'Moderado', hint: '3–5×/sem.' },
  { id: 'intenso', label: 'Intenso', hint: '6–7×/sem.' },
  { id: 'atleta', label: 'Atleta', hint: 'treino diário' },
];

export const todayKey = () => new Date().toLocaleDateString('en-CA');

export function shiftDay(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const fmtDate = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC', ...opts });

export const dateShort = (day: string) => fmtDate(day, { day: '2-digit', month: '2-digit' });
export const dateLong = (day: string) => fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' });
export const dateFull = (day: string) => fmtDate(day, { day: '2-digit', month: '2-digit', year: 'numeric' });

export const n1 = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
export const n0 = (v: number) => Math.round(v).toLocaleString('pt-BR');
export const kg = (v: number) => `${n1(v)} kg`;
export const signedKg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${n1(Math.abs(v))} kg`;
export const liters = (ml: number) => `${(ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`;

/** Converte texto digitado (aceita vírgula) em número ou null. */
export const parseNum = (s: string) => {
  const v = Number(String(s).replace(',', '.'));
  return s.trim() === '' || !Number.isFinite(v) ? null : v;
};
