// Exportação dos dados do usuário em CSV (abre no Excel/Google Planilhas). Sem banco: testável.

/** Célula CSV: aspas quando precisa e bloqueio de fórmula (= + - @ no início viram texto). */
export function csvCell(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Tabela CSV com ponto e vírgula (padrão do Excel em português) e BOM para os acentos abrirem certo. */
export function toCsv(header, rows) {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(';'));
  return `﻿${lines.join('\r\n')}\r\n`;
}

const num = (n) => (n === null || n === undefined ? '' : String(n).replace('.', ','));

/** Uma seção por tipo de registro, em ordem de data. */
export function exportCsv({ meals = [], weights = [], waters = [], exercises = [] }) {
  const byDay = (a, b) => (a.day === b.day ? 0 : a.day < b.day ? -1 : 1);
  const rows = [];
  for (const w of [...weights].sort(byDay)) rows.push(['peso', w.day, '', `${num(w.weightKg)} kg`, '', '', '', '', w.note || '']);
  for (const m of [...meals].sort(byDay))
    rows.push(['refeição', m.day, m.type, m.description, m.kcal, num(m.proteinG), num(m.carbsG), num(m.fatG), m.source || '']);
  for (const a of [...waters].sort(byDay)) rows.push(['água', a.day, '', `${a.ml} ml`, '', '', '', '', '']);
  for (const e of [...exercises].sort(byDay)) rows.push(['exercício', e.day, e.exerciseId, '', e.kcal, '', '', '', '']);
  return toCsv(['tipo', 'dia', 'detalhe', 'descrição', 'kcal', 'proteína (g)', 'carboidrato (g)', 'gordura (g)', 'obs.'], rows);
}
