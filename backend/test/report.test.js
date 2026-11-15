import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bmiSeries, report, weightAt } from '../src/diet.js';

const HOJE = '2026-11-15';
const user = { birthDate: '1996-01-01', heightCm: 180, sex: 'M', activity: 'leve', goalWeightKg: 75, waterGoalMl: 2500 };
const pesos = [
  { id: 1, day: '2026-11-01', weightKg: 82 },
  { id: 2, day: '2026-11-08', weightKg: 81 },
  { id: 3, day: '2026-11-15', weightKg: 80 },
];

test('weightAt: último peso até o dia', () => {
  assert.equal(weightAt(pesos, '2026-10-31'), null);
  assert.equal(weightAt(pesos, '2026-11-10').id, 2);
  assert.equal(weightAt(pesos, '2026-12-01').id, 3);
});

test('report: semana, meta e pesagem em dia', () => {
  const r = report(user, pesos, {}, HOJE);
  assert.equal(r.weightKg, 80);
  assert.equal(r.week.lostKg, 1);
  assert.equal(r.week.refDay, '2026-11-08');
  assert.equal(r.goal.remaining, 5);
  assert.equal(r.goal.pct, 29);
  assert.equal(r.weighDue, false);
  assert.deepEqual(r.missing, []);
  assert.equal(r.calorieGoal, r.suggestedCalories);
});

test('report: previsão pela tendência leva a uma data para a meta', () => {
  const r = report(user, pesos, {}, HOJE);
  assert.equal(r.forecast.trendChange, -1);
  assert.equal(r.forecast.energyChange, null);
  assert.equal(r.forecast.weightKg, 79);
  assert.equal(r.goal.etaDay, '2026-12-20');
});

test('report: média de calorias só dos dias registrados', () => {
  const r = report(user, pesos, { '2026-11-14': 2000, '2026-11-15': 1800, '2026-11-01': 5000 }, HOJE);
  assert.equal(r.week.avgKcal, 1900);
  assert.equal(r.week.daysLogged, 2);
});

test('report: sem dados avisa o que falta', () => {
  const r = report({ waterGoalMl: 2000 }, [], {}, HOJE);
  assert.deepEqual(r.missing, ['altura', 'data de nascimento', 'sexo', 'peso']);
  assert.equal(r.weighDue, true);
  assert.equal(r.forecast, null);
  assert.equal(r.goal, null);
  assert.equal(r.goalMode, 'emagrecer');
});

test('bmiSeries: carrega o último peso para frente', () => {
  const s = bmiSeries(pesos, 180, '2026-11-07', '2026-11-09');
  assert.deepEqual(s.map((p) => [p.day, p.weightKg]), [['2026-11-07', 82], ['2026-11-08', 81], ['2026-11-09', 81]]);
  assert.deepEqual(bmiSeries(pesos, null, '2026-11-01', '2026-11-02'), []);
});
