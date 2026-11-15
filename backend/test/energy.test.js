import { test } from 'node:test';
import assert from 'node:assert/strict';
import { energy } from '../src/diet.js';

const DIA = '2026-11-15';
const homem = { birthDate: '1996-01-01', heightCm: 180, sex: 'M', activity: 'leve' };

test('energy: Mifflin-St Jeor com fator de atividade', () => {
  const e = energy(homem, 80, DIA);
  // 10×80 + 6,25×180 − 5×30 + 5 = 1780; × 1,375 = 2448
  assert.equal(e.bmr, 1780);
  assert.equal(e.tdee, 2448);
  assert.equal(e.strategy, 'manter');
  assert.equal(e.suggested, e.tdee);
  assert.equal(e.goalCalories, null);
  assert.equal(e.proteinGoalG, 144);
});

test('energy: sem dados mínimos devolve null', () => {
  assert.equal(energy({ ...homem, birthDate: null }, 80, DIA), null);
  assert.equal(energy({ ...homem, heightCm: null }, 80, DIA), null);
  assert.equal(energy(homem, null, DIA), null);
});

test('energy: emagrecer usa déficit de 20% (300–750) e respeita o piso', () => {
  const e = energy({ ...homem, goalWeightKg: 70 }, 80, DIA);
  assert.equal(e.strategy, 'deficit');
  assert.equal(e.deficit, 490);
  assert.equal(e.suggested, 2448 - 490);
  const mulher = { birthDate: '1950-01-01', heightCm: 150, sex: 'F', activity: 'sedentario', goalWeightKg: 40 };
  const f = energy(mulher, 45, DIA);
  assert.equal(f.suggested, 1200);
});

test('energy: meta acima do peso atual vira superávit; perto da meta mantém', () => {
  assert.equal(energy({ ...homem, goalWeightKg: 90 }, 80, DIA).strategy, 'superavit');
  assert.equal(energy({ ...homem, goalWeightKg: 80.3 }, 80, DIA).strategy, 'manter');
});

test('energy: modo massa — superávit, recomposição com sobrepeso ou manter na meta', () => {
  const massa = { ...homem, goalMode: 'massa' };
  const s = energy(massa, 70, DIA);
  assert.equal(s.strategy, 'superavit');
  assert.equal(s.proteinGoalG, 140);
  assert.equal(energy(massa, 95, DIA).strategy, 'recomposicao');
  assert.equal(energy({ ...massa, goalWeightKg: 70 }, 72, DIA).strategy, 'manter');
});

test('energy: com obesidade a proteína usa o peso de IMC 25', () => {
  const e = energy(homem, 120, DIA);
  // 25 × 1,8² = 81 kg de referência × 1,8 g/kg
  assert.equal(e.proteinGoalG, 146);
});
