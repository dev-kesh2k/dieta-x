import { addDays, dayKey, diffDays } from './db.js';

export const MEAL_TYPES = ['cafe', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia', 'outro'];
export const ACTIVITY = { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725, atleta: 1.9 };
export const KCAL_PER_KG = 7700;

const r1 = (n) => Math.round(n * 10) / 10;

export function ageOn(birthDate, day = dayKey()) {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = day.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

export function bmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  return r1(weightKg / (h * h));
}

export function bmiClass(v) {
  if (v == null) return null;
  if (v < 18.5) return 'Abaixo do peso';
  if (v < 25) return 'Peso normal';
  if (v < 30) return 'Sobrepeso';
  if (v < 35) return 'Obesidade grau I';
  if (v < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

/** Gasto diário estimado (Mifflin-St Jeor × fator de atividade). */
export function energy(user, weightKg, day = dayKey()) {
  const age = ageOn(user.birthDate, day);
  if (!weightKg || !user.heightCm || age == null) return null;
  const sexAdj = user.sex === 'M' ? 5 : user.sex === 'F' ? -161 : -78;
  const bmr = Math.round(10 * weightKg + 6.25 * user.heightCm - 5 * age + sexAdj);
  const tdee = Math.round(bmr * (ACTIVITY[user.activity] || ACTIVITY.leve));
  let suggested = tdee;
  let goalCalories = null;

  if (user.goalWeightKg) {
    const diff = weightKg - user.goalWeightKg;
    if (diff > 0.5) {
      // Emagrecer: déficit moderado de 500 kcal/dia (0,5 kg/semana)
      suggested = Math.max(tdee - 500, user.sex === 'M' ? 1500 : 1200);
      goalCalories = suggested;
    } else if (diff < -0.5) {
      // Ganhar: superávit de 300 kcal/dia (0,3 kg/semana)
      suggested = tdee + 300;
      goalCalories = suggested;
    } else {
      // Meta atingida: manter o TDEE
      goalCalories = tdee;
    }
  }

  return { bmr, tdee, suggested, goalCalories };
}

/** Último peso registrado até o dia (pesos ordenados por dia crescente). */
export function weightAt(weights, day) {
  let found = null;
  for (const w of weights) {
    if (w.day > day) break;
    found = w;
  }
  return found;
}

/** Inclinação (kg/dia) por mínimos quadrados. */
function slope(points) {
  if (points.length < 2) return null;
  const n = points.length;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den ? num / den : null;
}

/**
 * Resumo do usuário: peso, IMC, metas, semana e previsão.
 * weights: pesos ordenados por dia; kcalByDay: { 'YYYY-MM-DD': kcal }.
 */
export function report(user, weights, kcalByDay, today = dayKey()) {
  const latest = weights.at(-1) || null;
  const current = latest?.weightKg ?? null;
  const en = energy(user, current, today);
  const calorieGoal = user.calorieGoal ?? en?.suggested ?? null;
  const currentBmi = bmi(current, user.heightCm);

  // Semana: comparação com o peso de 7 dias atrás (ou a pesagem anterior mais próxima).
  const weekAgoDay = addDays(today, -7);
  let ref = weightAt(weights, weekAgoDay);
  if (!ref && weights.length >= 2) ref = weights[0];
  const lostLastWeek = latest && ref && ref.id !== latest.id ? r1(ref.weightKg - latest.weightKg) : null;

  // Média de calorias dos últimos 7 dias (só dias com refeição registrada).
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -6 + i));
  const logged = last7.filter((d) => kcalByDay[d] > 0);
  const avgKcal = logged.length ? Math.round(logged.reduce((a, d) => a + kcalByDay[d], 0) / logged.length) : null;

  // Previsão para os próximos 7 dias: balanço energético e tendência das pesagens (últimos 28 dias).
  const energyChange = en && avgKcal != null ? r1(((avgKcal - en.tdee) * 7) / KCAL_PER_KG) : null;
  const recent = weights.filter((w) => w.day >= addDays(today, -28)).map((w) => ({ x: diffDays(today, w.day), y: w.weightKg }));
  const s = slope(recent);
  const trendChange = s != null && recent.length >= 2 ? r1(s * 7) : null;
  const parts = [energyChange, trendChange].filter((v) => v != null);
  const change = parts.length ? r1(parts.reduce((a, v) => a + v, 0) / parts.length) : null;
  const forecast = current != null && change != null
    ? { change, weightKg: r1(current + change), energyChange, trendChange, bmi: bmi(current + change, user.heightCm) }
    : null;

  // Meta de peso: quanto falta e quando deve chegar no ritmo previsto.
  let goal = null;
  if (user.goalWeightKg && current != null) {
    const start = weights[0].weightKg;
    const remaining = r1(current - user.goalWeightKg);
    const total = start - user.goalWeightKg;
    const pct = total ? Math.max(0, Math.min(100, Math.round(((start - current) / total) * 100))) : 100;
    let etaDay = null;
    if (change && remaining && Math.sign(change) === -Math.sign(remaining)) {
      const weeks = Math.abs(remaining / change);
      if (weeks <= 260) etaDay = addDays(today, Math.ceil(weeks * 7));
    }
    goal = { weightKg: user.goalWeightKg, startKg: start, remaining, pct, etaDay, bmi: bmi(user.goalWeightKg, user.heightCm) };
  }

  const missing = [];
  if (!user.heightCm) missing.push('altura');
  if (!user.birthDate) missing.push('data de nascimento');
  if (!user.sex) missing.push('sexo');
  if (current == null) missing.push('peso');

  const daysSinceWeigh = latest ? diffDays(latest.day, today) : null;

  return {
    today,
    age: ageOn(user.birthDate, today),
    weightKg: current,
    lastWeighDay: latest?.day ?? null,
    daysSinceWeigh,
    weighDue: daysSinceWeigh == null || daysSinceWeigh >= 7,
    bmi: currentBmi,
    bmiClass: bmiClass(currentBmi),
    bmr: en?.bmr ?? null,
    tdee: en?.tdee ?? null,
    suggestedCalories: en?.suggested ?? null,
    goalCalories: en?.goalCalories ?? null,
    calorieGoal,
    waterGoalMl: user.waterGoalMl,
    week: { refDay: ref && latest && ref.id !== latest.id ? ref.day : null, lostKg: lostLastWeek, avgKcal, daysLogged: logged.length },
    forecast,
    goal,
    missing,
  };
}

/** Série diária de IMC (carrega o último peso para frente). */
export function bmiSeries(weights, heightCm, from, to) {
  const out = [];
  if (!heightCm) return out;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const w = weightAt(weights, d);
    if (w) out.push({ day: d, weightKg: w.weightKg, bmi: bmi(w.weightKg, heightCm) });
  }
  return out;
}
