import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_WEIGHT_KG, LEVELS, UNLOCK_DAYS, exerciseKcal, findExercise, levelProgress } from '../src/exercises.js';

test('níveis: ids únicos e dados válidos', () => {
  const ids = LEVELS.flatMap((l) => l.exercises.map((e) => e.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const l of LEVELS) for (const e of l.exercises) {
    assert.ok(e.met > 1 && e.minutes > 0, e.id);
  }
});

test('findExercise: acha pelo id e informa o nível', () => {
  const primeiro = LEVELS[0].exercises[0];
  assert.equal(findExercise(primeiro.id).level, LEVELS[0].level);
  assert.equal(findExercise('nao-existe'), null);
});

test('exerciseKcal: gasto líquido pelo MET e peso padrão sem peso', () => {
  const ex = { met: 8, minutes: 10 };
  assert.equal(exerciseKcal(ex, 80), 98);
  assert.equal(exerciseKcal(ex, null), exerciseKcal(ex, DEFAULT_WEIGHT_KG));
  assert.equal(exerciseKcal({ met: 1, minutes: 5 }, 80), 1);
});

test('levelProgress: libera o próximo nível com os dias completos', () => {
  const nivel1 = new Set(LEVELS[0].exercises.map((e) => e.id));
  const vazio = levelProgress({});
  assert.equal(vazio[0].unlocked, true);
  assert.equal(vazio[1].unlocked, false);
  const dias = {};
  for (let i = 0; i < UNLOCK_DAYS; i++) dias[`2026-11-0${i + 1}`] = nivel1;
  const p = levelProgress(dias);
  assert.equal(p[0].completeDays, UNLOCK_DAYS);
  assert.equal(p[1].unlocked, true);
  if (p[2]) assert.equal(p[2].unlocked, false);
});
