import * as THREE from 'three';
import { CONFIG } from './config.js';
import { getPathPoint } from './path.js';

export function createLines(group) {
  const material = new THREE.LineBasicMaterial({
    color: CONFIG.lineColor, transparent: true, opacity: CONFIG.lineOpacity, depthWrite: false,
  });
  const lines = [];
  for (let i = 0; i < CONFIG.lineCount; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CONFIG.segmentCount * 3), 3));
    const line = new THREE.Line(geo, material);
    line.userData.id = i;
    group.add(line);
    lines.push(line);
  }
  return lines;
}

export function updateLines(lines, time) {
  for (const line of lines) {
    const pos = line.geometry.attributes.position.array;
    const id = line.userData.id;
    for (let j = 0; j < CONFIG.segmentCount; j++) {
      const p = getPathPoint(j / (CONFIG.segmentCount - 1), id, time, CONFIG);
      pos[j * 3] = p.x; pos[j * 3 + 1] = p.y; pos[j * 3 + 2] = p.z;
    }
    line.geometry.attributes.position.needsUpdate = true;
  }
}
