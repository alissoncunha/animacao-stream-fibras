import * as THREE from 'three';
import { createScene, resizeRenderer } from './scene.js';
import { createLines, updateLines } from './lines.js';

const { scene, camera, renderer, group } = createScene();
const lines = createLines(group);

let view = resizeRenderer(renderer, camera);
window.addEventListener('resize', () => { view = resizeRenderer(renderer, camera); });

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  updateLines(lines, time);
  renderer.render(scene, camera);
}
animate();
