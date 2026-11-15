import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateShort, fmtMin, liters, mealByHour, mealBySchedule, mealLabel, mealSchedule, parseNum, shiftDay, signedKg } from '../src/util.ts';

test('mealByHour e mealLabel', () => {
  assert.equal(mealByHour(7), 'cafe');
  assert.equal(mealByHour(13), 'almoco');
  assert.equal(mealByHour(22), 'ceia');
  assert.equal(mealLabel('nao-existe'), 'Refeição');
});

test('fmtMin: arredonda a 15 min e dá a volta no dia', () => {
  assert.equal(fmtMin(7 * 60 + 52), '07:45');
  assert.equal(fmtMin(7 * 60 + 53), '08:00');
  assert.equal(fmtMin(25 * 60), '01:00');
  assert.equal(fmtMin(-30), '23:30');
});

test('mealSchedule: café 45 min após acordar e jantar 3h30 antes de dormir', () => {
  const s = mealSchedule('07:00', '23:00');
  assert.deepEqual(s.map((x) => x.id), ['cafe', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia']);
  assert.equal(fmtMin((s[0].from + s[0].to) / 2), '07:45');
  assert.equal(fmtMin((s[4].from + s[4].to) / 2), '19:30');
  assert.equal(s[5].optional, true);
  const turno = mealSchedule('14:00', '06:00');
  assert.ok(turno[4].from > turno[0].from, 'quem dorme depois da meia-noite continua em ordem');
});

test('mealBySchedule: refeição pelo horário da rotina e madrugada conta como ceia', () => {
  const s = mealSchedule('07:00', '23:00');
  const em = (h: number, m = 0) => mealBySchedule(s, new Date(2026, 10, 15, h, m));
  assert.equal(em(7, 30), 'cafe');
  assert.equal(em(19, 30), 'jantar');
  assert.equal(em(2, 0), 'ceia');
});

test('datas e números', () => {
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
  assert.equal(dateShort('2026-11-05'), '05/11');
  assert.equal(signedKg(-1.25), '−1,3 kg');
  assert.equal(signedKg(0.5), '+0,5 kg');
  assert.equal(liters(1500), '1,5 L');
  assert.equal(parseNum('72,5'), 72.5);
  assert.equal(parseNum(' '), null);
  assert.equal(parseNum('abc'), null);
});
