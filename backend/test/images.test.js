import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImages } from '../src/images.js';
import { HttpError } from '../src/errors.js';

const png = `data:image/png;base64,${Buffer.from('png').toString('base64')}`;

test('parseImages: sem lista não há fotos', () => {
  assert.deepEqual(parseImages(undefined), []);
  assert.deepEqual(parseImages('x'), []);
});

test('parseImages: data URL vira bloco de imagem da API', () => {
  assert.deepEqual(parseImages([png]), [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'cG5n' } }]);
});

test('parseImages: respeita o máximo de fotos', () => {
  assert.equal(parseImages([png, png, png, png, png]).length, 3);
  assert.equal(parseImages([png, png], 1).length, 1);
});

test('parseImages: formato não aceito dá 400', () => {
  for (const u of ['data:image/svg+xml;base64,PHN2Zz4=', 'https://x.com/a.png', null]) {
    assert.throws(() => parseImages([u]), (e) => e instanceof HttpError && e.status === 400 && /GIF/.test(e.message), String(u));
  }
});

test('parseImages: acima de 5 MB dá 413', () => {
  const grande = `data:image/jpeg;base64,${'A'.repeat(7_000_000)}`;
  assert.throws(() => parseImages([grande]), (e) => e instanceof HttpError && e.status === 413);
});
