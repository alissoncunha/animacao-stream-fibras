import * as THREE from 'three';
import { CONFIG, positionX } from './config.js';
import { getPathPoint } from './path.js';
import { ndcToPixel, codeOpacity } from './util.js';

const ndc = new THREE.Vector3();
const MAX_OPACITY = 0.92; // teto de opacidade dos tokens, pra manter leveza sobre o branco

const randomLane = () => Math.floor(Math.random() * CONFIG.lineCount);
const randomSpeed = () => CONFIG.speedMin + Math.random() * CONFIG.speedSpan;
const randomToken = () => CONFIG.tokens[Math.floor(Math.random() * CONFIG.tokens.length)];

export function createCode(container, count) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'code-token';
    el.textContent = randomToken();
    container.appendChild(el);
    particles.push({ el, lane: randomLane(), speed: randomSpeed(), progress: Math.random() });
  }
  return particles;
}

export function updateCode(particles, camera, time, w, h) {
  for (const c of particles) {
    c.progress += c.speed * 0.005 * CONFIG.speedGlobal;
    if (c.progress > 1) {
      c.progress = 0; c.lane = randomLane(); c.speed = randomSpeed(); c.el.textContent = randomToken();
    }
    const p = getPathPoint(c.progress, c.lane, time, CONFIG);
    // soma positionX (o deslocamento X do grupo) para converter coord local -> mundo antes de projetar
    ndc.set(p.x + positionX, p.y, p.z).project(camera);
    const { x, y } = ndcToPixel(ndc.x, ndc.y, w, h);
    c.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%,-50%)`;
    c.el.style.opacity = (codeOpacity(c.progress) * MAX_OPACITY).toFixed(2);
  }
}
