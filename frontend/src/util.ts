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
