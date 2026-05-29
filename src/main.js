import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createScene, resizeRenderer } from './scene.js';
import { createLines, updateLines } from './lines.js';
import { createSignals, updateSignals } from './signals.js';
import { scaleForViewport } from './util.js';

const { scene, camera, renderer, group } = createScene();
const scale = scaleForViewport(window.innerWidth);

const lines = createLines(group);
const { signals, material: signalMat } = createSignals(group, Math.round(CONFIG.signalCount * scale));

let view = resizeRenderer(renderer, camera, signalMat);
window.addEventListener('resize', () => { view = resizeRenderer(renderer, camera, signalMat); });

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  updateLines(lines, time);
  updateSignals(signals, time);
  renderer.render(scene, camera);
}
animate();
