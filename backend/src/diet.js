import { addDays, dayKey, diffDays } from './dates.js';

export const MEAL_TYPES = ['cafe', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia', 'outro'];
export const ACTIVITY = { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725, atleta: 1.9 };
export const KCAL_PER_KG = 7700;
export const GOAL_MODES = ['emagrecer', 'massa'];

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

/** Classificação do IMC: OMS para adultos; a partir dos 60 anos, a do SISVAN/Ministério da Saúde (Lipschitz). */
export function bmiClass(v, age = null) {
  if (v == null) return null;
  if (age != null && age >= 60) return v < 22 ? 'Abaixo do peso' : v <= 27 ? 'Peso adequado' : 'Sobrepeso';
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
  const floor = user.sex === 'M' ? 1500 : 1200;
  const currentBmi = bmi(weightKg, user.heightCm);
  // Proteína pelo peso de referência: com obesidade (IMC ≥ 30) o peso atual superestima a necessidade,
  // então usa o peso equivalente a IMC 25. Perder peso: 1,8 g/kg (preserva massa magra no déficit,
  // faixa 1,6–2,4); ganhar massa: 2 g/kg (faixa 1,6–2,2, Morton 2018 / ISSN).
  const refKg = currentBmi != null && currentBmi >= 30 ? 25 * (user.heightCm / 100) ** 2 : weightKg;
  const proteinGoalG = Math.round(refKg * (user.goalMode === 'massa' ? 2 : 1.8));
  // Déficit proporcional ao gasto: 20% do TDEE, entre 300 e 750 kcal (≈ 0,3–0,7 kg/semana), nunca abaixo do piso.
  const deficit = Math.min(750, Math.max(300, Math.round(tdee * 0.2)));
  // Superávit leve para massa magra: 10% do TDEE, entre 200 e 400 kcal (mais que isso vira gordura).
  const surplus = Math.min(400, Math.max(200, Math.round(tdee * 0.1)));
  let suggested = tdee;
  let goalCalories = null;
  let strategy = 'manter';

  if (user.goalMode === 'massa') {
    if (user.goalWeightKg && weightKg >= user.goalWeightKg) strategy = 'manter';
    // Com sobrepeso (IMC ≥ 27) o recomendado é recomposição: calorias de manutenção + proteína alta + treino de força.
    else if (currentBmi != null && currentBmi >= 27) strategy = 'recomposicao';
    else strategy = 'superavit';
    suggested = strategy === 'superavit' ? tdee + surplus : tdee;
    goalCalories = suggested;
  } else if (user.goalWeightKg) {
    const diff = weightKg - user.goalWeightKg;
    if (diff > 0.5) {
      strategy = 'deficit';
      suggested = Math.max(tdee - deficit, floor);
    } else if (diff < -0.5) {
      strategy = 'superavit';
      suggested = tdee + surplus;
    }
    goalCalories = suggested;
  }

  return { bmr, tdee, suggested, goalCalories, proteinGoalG, strategy, deficit: tdee - suggested };
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
export function report(user, weights, kcalByDay, today = dayKey(), burnedByDay = {}) {
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
  const avgBurned = logged.length ? Math.round(logged.reduce((a, d) => a + (burnedByDay[d] || 0), 0) / logged.length) : 0;

  // Previsão para os próximos 7 dias: balanço energético e tendência das pesagens (últimos 28 dias).
  const energyChange = en && avgKcal != null ? r1(((avgKcal - avgBurned - en.tdee) * 7) / KCAL_PER_KG) : null;
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
    bmiClass: bmiClass(currentBmi, ageOn(user.birthDate, today)),
    bmr: en?.bmr ?? null,
    tdee: en?.tdee ?? null,
    suggestedCalories: en?.suggested ?? null,
    goalCalories: en?.goalCalories ?? null,
    proteinGoalG: en?.proteinGoalG ?? null,
    strategy: en?.strategy ?? null,
    goalMode: user.goalMode || 'emagrecer',
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
