import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPathPoint } from '../src/path.js';
import { CONFIG } from '../src/config.js';

test('x mapeia linearmente de -curveLength a +straightLength', () => {
  assert.equal(getPathPoint(0, 0, 0, CONFIG).x, -50);
  assert.equal(getPathPoint(1, 0, 0, CONFIG).x, 100);
});

test('região reta (currentX >= 0) é plana: y=0, z=0', () => {
  const p = getPathPoint(0.8, 13, 2.0, CONFIG); // x = 70
  assert.equal(p.y, 0);
  assert.equal(p.z, 0);
});

test('z é sempre 0 porque spreadDepth é 0', () => {
  for (const t of [0, 0.1, 0.16, 0.3]) {
    assert.equal(getPathPoint(t, 5, 1.0, CONFIG).z, 0);
  }
});

test('spread é simétrico em torno da lane central (onda desligada)', () => {
  const cfg = { ...CONFIG, waveHeight: 0 };
  const t = 1 / 6; // currentX = -25 (meio da curva)
  // lane=0 e lane=lineCount dão spreadFactor -1/+1: extremos matemáticos do leque
  // (em runtime a lane vai de 0..lineCount-1), úteis para verificar a simetria.
  const low = getPathPoint(t, 0, 0, cfg).y;                 // spreadFactor = -1
  const high = getPathPoint(t, CONFIG.lineCount, 0, cfg).y;  // spreadFactor = +1
  assert.ok(Math.abs(low + 17.10) < 0.1, `low=${low}`);
  assert.ok(Math.abs(high - 17.10) < 0.1, `high=${high}`);
  assert.ok(Math.abs(low + high) < 1e-9, 'simétrico');
});
