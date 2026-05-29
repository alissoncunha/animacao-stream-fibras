import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ndcToPixel, codeOpacity, scaleForViewport } from '../src/util.js';

test('ndcToPixel mapeia o centro NDC para o centro da tela', () => {
  assert.deepEqual(ndcToPixel(0, 0, 1000, 500), { x: 500, y: 250 });
});

test('ndcToPixel mapeia os cantos', () => {
  assert.deepEqual(ndcToPixel(-1, 1, 1000, 500), { x: 0, y: 0 });
  assert.deepEqual(ndcToPixel(1, -1, 1000, 500), { x: 1000, y: 500 });
});

test('codeOpacity faz fade-in, segura e faz fade-out', () => {
  assert.equal(codeOpacity(0), 0);
  assert.ok(Math.abs(codeOpacity(0.04) - 0.5) < 1e-9);
  assert.equal(codeOpacity(0.5), 1);
  assert.equal(codeOpacity(0.85), 1);
  assert.ok(Math.abs(codeOpacity(0.925) - 0.5) < 1e-9);
  assert.equal(codeOpacity(1), 0);
});

test('scaleForViewport reduz em telas pequenas', () => {
  assert.equal(scaleForViewport(500), 0.6);
  assert.equal(scaleForViewport(1200), 1);
});
