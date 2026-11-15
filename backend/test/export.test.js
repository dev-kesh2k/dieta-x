import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, exportCsv, toCsv } from '../src/export.js';

test('csvCell: aspas, ponto e vírgula e bloqueio de fórmula', () => {
  assert.equal(csvCell(null), '');
  assert.equal(csvCell('arroz; feijão'), '"arroz; feijão"');
  assert.equal(csvCell('diz "oi"'), '"diz ""oi"""');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('+5545'), "'+5545");
  assert.equal(csvCell('-2,5'), '-2,5');
});

test('toCsv: BOM, ponto e vírgula e CRLF', () => {
  assert.equal(toCsv(['a', 'b'], [[1, 'x']]), '﻿a;b\r\n1;x\r\n');
});

test('exportCsv: uma linha por registro, por tipo e em ordem de data', () => {
  const csv = exportCsv({
    weights: [{ day: '2026-11-08', weightKg: 79.5, note: '' }, { day: '2026-11-01', weightKg: 80, note: 'início' }],
    meals: [{ day: '2026-11-01', type: 'almoco', description: 'Arroz', kcal: 500, proteinG: 20.5, carbsG: 60, fatG: 10, source: 'manual' }],
    waters: [{ day: '2026-11-01', ml: 300 }],
    exercises: [{ day: '2026-11-02', exerciseId: 'marcha', kcal: 30 }],
  });
  const linhas = csv.replace('﻿', '').trim().split('\r\n');
  assert.equal(linhas.length, 6);
  assert.match(linhas[0], /^tipo;dia;detalhe/);
  assert.equal(linhas[1], 'peso;2026-11-01;;80 kg;;;;;início');
  assert.equal(linhas[2], 'peso;2026-11-08;;79,5 kg;;;;;');
  assert.equal(linhas[3], 'refeição;2026-11-01;almoco;Arroz;500;20,5;60;10;manual');
  assert.equal(linhas[4], 'água;2026-11-01;;300 ml;;;;;');
  assert.equal(linhas[5], 'exercício;2026-11-02;marcha;;30;;;;');
});

test('exportCsv: sem registros só o cabeçalho', () => {
  assert.equal(exportCsv({}).trim().split('\r\n').length, 1);
});
