import { CONFIG } from './config.js';
import { createScene, resizeRenderer } from './scene.js';
import { createLines, updateLines } from './lines.js';
import { createSignals, updateSignals } from './signals.js';
import { createCode, updateCode } from './code.js';
import { scaleForViewport } from './util.js';

const { scene, camera, renderer, group } = createScene();
const scale = scaleForViewport(window.innerWidth);

const lines = createLines(group);
const { signals, material: signalMat } = createSignals(group, Math.round(CONFIG.signalCount * scale));
const codeParticles = createCode(document.getElementById('code'), Math.round(CONFIG.codeCount * scale));

let view = resizeRenderer(renderer, camera, signalMat);

function renderFrame(time) {
  updateLines(lines, time);
  updateSignals(signals, time);
  updateCode(codeParticles, camera, time, view.w, view.h);
  renderer.render(scene, camera);
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

window.addEventListener('resize', () => {
  view = resizeRenderer(renderer, camera, signalMat);
  // no modo reduced-motion não há loop; re-renderiza o quadro estático no novo tamanho
  if (reduceMotion) renderFrame(0.6);
});

if (reduceMotion) {
  // Pré-aquece o rastro dos cometas e renderiza um único quadro estático.
  // 0.6s: timestamp arbitrário só para fixar uma fase de onda visualmente assentada.
  for (let i = 0; i < CONFIG.trail; i++) renderFrame(0.6);
} else {
  const t0 = performance.now();
  (function animate() {
    requestAnimationFrame(animate);
    renderFrame((performance.now() - t0) / 1000); // tempo decorrido em segundos
  })();
}
