import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, positionX } from '../src/config.js';

test('config tem contagens positivas', () => {
  for (const k of ['lineCount', 'signalCount', 'codeCount', 'trail', 'segmentCount']) {
    assert.ok(CONFIG[k] > 0, `${k} deve ser > 0`);
  }
});

test('paleta tem 3 cores hex', () => {
  assert.equal(CONFIG.palette.length, 3);
  for (const c of CONFIG.palette) assert.match(c, /^#[0-9a-f]{6}$/i);
});

test('positionX centraliza o conteúdo', () => {
  assert.equal(positionX, -25);
});
