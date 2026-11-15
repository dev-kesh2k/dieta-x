import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageOn, bmi, bmiClass } from '../src/diet.js';

test('ageOn: conta o aniversário só quando chega o dia', () => {
  assert.equal(ageOn('1996-11-15', '2026-11-15'), 30);
  assert.equal(ageOn('1996-11-16', '2026-11-15'), 29);
  assert.equal(ageOn('1996-12-01', '2026-11-15'), 29);
  assert.equal(ageOn(null, '2026-11-15'), null);
});

test('bmi: peso / altura² com uma casa decimal', () => {
  assert.equal(bmi(70, 175), 22.9);
  assert.equal(bmi(100, 180), 30.9);
  assert.equal(bmi(null, 180), null);
  assert.equal(bmi(70, 0), null);
});

test('bmiClass: faixas da OMS para adultos', () => {
  assert.equal(bmiClass(18.4), 'Abaixo do peso');
  assert.equal(bmiClass(18.5), 'Peso normal');
  assert.equal(bmiClass(24.9), 'Peso normal');
  assert.equal(bmiClass(25), 'Sobrepeso');
  assert.equal(bmiClass(30), 'Obesidade grau I');
  assert.equal(bmiClass(35), 'Obesidade grau II');
  assert.equal(bmiClass(40), 'Obesidade grau III');
  assert.equal(bmiClass(null), null);
});

test('bmiClass: a partir dos 60 anos usa a faixa do idoso', () => {
  assert.equal(bmiClass(21.9, 60), 'Abaixo do peso');
  assert.equal(bmiClass(25, 70), 'Peso adequado');
  assert.equal(bmiClass(27.1, 65), 'Sobrepeso');
  assert.equal(bmiClass(25, 59), 'Sobrepeso');
});
