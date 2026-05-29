import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { CONFIG } from './config.js';
import { getPathPoint } from './path.js';

const WHITE = new THREE.Color(1, 1, 1);
const tmp = new THREE.Color();

const randomLane = () => Math.floor(Math.random() * CONFIG.lineCount);
const randomSpeed = () => CONFIG.speedMin + Math.random() * CONFIG.speedSpan;

const palette = CONFIG.palette.map((c) => new THREE.Color(c));
const pick = () => palette[Math.floor(Math.random() * palette.length)];

export function createSignals(group, count) {
  const material = new LineMaterial({
    linewidth: CONFIG.signalWidth, vertexColors: true, transparent: true, depthTest: false, depthWrite: false,
  });

  const signals = [];
  for (let i = 0; i < count; i++) {
    const geo = new LineGeometry();
    geo.setPositions(new Array(CONFIG.trail * 3).fill(0));
    geo.setColors(new Array(CONFIG.trail * 3).fill(1));
    const line = new Line2(geo, material);
    line.frustumCulled = false;
    group.add(line);
    signals.push({
      line, geo,
      lane: randomLane(), speed: randomSpeed(), progress: Math.random(),
      history: [], color: pick(),
      pos: new Array(CONFIG.trail * 3), col: new Array(CONFIG.trail * 3),
    });
  }
  return { signals, material };
}

export function updateSignals(signals, time) {
  for (const s of signals) {
    s.progress += s.speed * 0.005 * CONFIG.speedGlobal;
    if (s.progress > 1) {
      // jitter no reset evita que sinais sincronizem no início do trajeto ao longo do tempo
      s.progress = Math.random() * 0.1; s.lane = randomLane(); s.history = []; s.color = pick(); s.speed = randomSpeed();
    }
    s.history.push(getPathPoint(s.progress, s.lane, time, CONFIG));
    if (s.history.length > CONFIG.trail) s.history.shift();

    const h = s.history, n = h.length;
    for (let k = 0; k < CONFIG.trail; k++) {
      const fromHead = (CONFIG.trail - 1) - k;
      let idx = (n - 1) - fromHead; if (idx < 0) idx = 0;
      const p = h[idx] || h[0];
      s.pos[k * 3] = p.x; s.pos[k * 3 + 1] = p.y; s.pos[k * 3 + 2] = p.z;
      const t = CONFIG.trail > 1 ? k / (CONFIG.trail - 1) : 1; // 0 cauda -> 1 cabeça
      tmp.copy(WHITE).lerp(s.color, t * t);                    // cauda some no branco
      s.col[k * 3] = tmp.r; s.col[k * 3 + 1] = tmp.g; s.col[k * 3 + 2] = tmp.b;
    }
    s.geo.setPositions(s.pos);
    s.geo.setColors(s.col);
  }
}
