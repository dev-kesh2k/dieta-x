// Datas do app como chave do dia (YYYY-MM-DD), sem depender do banco: dá para testar sem o Prisma.

export const TZ = process.env.TZ || 'America/Sao_Paulo';

/** Dia (YYYY-MM-DD) no fuso do app. */
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

// Aritmética de datas sobre a chave do dia (sempre em UTC, sem efeito de fuso).
const toUtc = (day) => new Date(`${day}T00:00:00Z`);
export const addDays = (day, n) => new Date(toUtc(day).getTime() + n * 86400000).toISOString().slice(0, 10);
export const diffDays = (a, b) => Math.round((toUtc(b) - toUtc(a)) / 86400000);
