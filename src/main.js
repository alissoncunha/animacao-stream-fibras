import { createScene, resizeRenderer } from './scene.js';

const { scene, camera, renderer } = createScene();
let view = resizeRenderer(renderer, camera);
window.addEventListener('resize', () => { view = resizeRenderer(renderer, camera); });

renderer.render(scene, camera);
