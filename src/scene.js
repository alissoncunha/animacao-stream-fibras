import * as THREE from 'three';
import { CONFIG, positionX } from './config.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.bg);
  scene.fog = new THREE.FogExp2(CONFIG.fogColor, CONFIG.fogDensity);

  const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 1, 1000);
  camera.position.set(0, 0, CONFIG.camera.z);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
  document.getElementById('stage').appendChild(renderer.domElement);

  const group = new THREE.Group();
  group.position.set(positionX, 0, 0);
  scene.add(group);

  return { scene, camera, renderer, group };
}

// Reaplica tamanho usando o #stage (funciona em tela cheia e dentro de iframe).
export function resizeRenderer(renderer, camera, signalMat) {
  const stage = document.getElementById('stage');
  const w = stage.clientWidth || 1;
  const h = stage.clientHeight || 1;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  if (signalMat) signalMat.resolution.set(w, h);
  return { w, h };
}
