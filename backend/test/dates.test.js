import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dayKey, diffDays, isDay } from '../src/dates.js';

test('isDay: só aceita data válida no formato YYYY-MM-DD', () => {
  assert.equal(isDay('2026-11-15'), true);
  assert.equal(isDay('2024-02-29'), true);
  for (const v of ['2026-13-01', '2026-1-5', '15/11/2026', '', null, 20261115]) assert.equal(isDay(v), false, String(v));
});

test('addDays: soma e subtrai dias atravessando mês e ano', () => {
  assert.equal(addDays('2026-11-15', 1), '2026-11-16');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2024-03-01', -1), '2024-02-29');
  assert.equal(addDays('2026-11-15', -7), '2026-11-08');
});

test('diffDays: diferença em dias, com sinal', () => {
  assert.equal(diffDays('2026-11-01', '2026-11-15'), 14);
  assert.equal(diffDays('2026-11-15', '2026-11-01'), -14);
  assert.equal(diffDays('2026-10-31', '2026-11-03'), 3);
});

test('dayKey: usa o fuso do app (São Paulo)', () => {
  // 02:00 UTC ainda é o dia anterior em São Paulo (UTC−3).
  assert.equal(dayKey(new Date('2026-11-15T02:00:00Z')), '2026-11-14');
  assert.equal(dayKey(new Date('2026-11-15T12:00:00Z')), '2026-11-15');
});
