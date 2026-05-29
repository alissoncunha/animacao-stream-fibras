# Animação Stream de Fibras + Código — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma animação web standalone (three.js) sobre fundo branco — leque de fibras com cometas coloridos e uma camada de código fluindo até convergir — publicável no Netlify e embarcável via iframe num site ScaleDraw.

**Architecture:** 100% client-side, sem build. `index.html` com `importmap` (three.js via CDN unpkg) carrega ES modules em `src/`. Três camadas desenhadas num único loop `requestAnimationFrame`: linhas de fundo (WebGL), cometas (Line2 — linhas espessas, WebGL) e código (overlay DOM projetando pontos 3D→tela). A matemática do caminho e os helpers são funções puras, testadas com o runner nativo do Node (`node --test`); as camadas visuais são verificadas no navegador.

**Tech Stack:** three.js `0.160.0` (módulos via CDN), `Line2`/`LineMaterial`/`LineGeometry` (fat lines), ES modules vanilla, Node test runner nativo (dev only), Netlify (deploy estático).

**Spec:** `docs/superpowers/specs/2026-05-29-animacao-stream-fibras-design.md`

---

## Estrutura de arquivos

```
index.html            → containers (#stage, #code), CSS, importmap, <script> main
netlify.toml          → deploy estático (sem build, publish ".")
package.json          → "type":"module"; scripts de teste/serve (dev only, não deployado)
src/config.js         → todos os parâmetros (single source of truth) — sem imports
src/path.js           → getPathPoint() — função pura, sem imports
src/util.js           → ndcToPixel(), codeOpacity(), scaleForViewport() — puras, sem imports
src/scene.js          → renderer, câmera, fog, grupo, resize
src/lines.js          → cria/atualiza as linhas de fundo
src/signals.js        → cria/atualiza os cometas (Line2)
src/code.js           → cria/atualiza a camada de código (DOM)
src/main.js           → init das camadas + loop
test/config.test.js   → sanidade do config
test/path.test.js     → matemática do caminho
test/util.test.js     → helpers puros
test/embed-harness.html → página local com <iframe> para validar embed
```

`config.js`, `path.js` e `util.js` **não importam three** — por isso rodam no Node sem CDN. Os demais módulos importam three e são verificados no navegador.

---

### Task 1: Scaffold do projeto + config

**Files:**
- Create: `package.json`
- Create: `netlify.toml`
- Create: `src/config.js`
- Test: `test/config.test.js`

- [ ] **Step 1: Escrever o teste de sanidade do config (falhando)**

`test/config.test.js`:
```js
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
  assert.equal(positionX, (CONFIG.curveLength - CONFIG.straightLength) / 2);
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `node --test test/config.test.js`
Expected: FAIL — `Cannot find module '../src/config.js'`.

- [ ] **Step 3: Criar `package.json`**

```json
{
  "name": "animation-hexa",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "serve": "python3 -m http.server 8000"
  }
}
```

- [ ] **Step 4: Criar `netlify.toml`**

```toml
# Site estático, sem passo de build.
[build]
  publish = "."

# Para restringir o embed só ao domínio do ScaleDraw (opcional), descomente:
# [[headers]]
#   for = "/*"
#   [headers.values]
#     Content-Security-Policy = "frame-ancestors https://SEU-DOMINIO-SCALEDRAW"
```

- [ ] **Step 5: Criar `src/config.js`**

```js
export const CONFIG = {
  // fundo / fog
  bg: '#ffffff',
  fogColor: '#ffffff',
  fogDensity: 0.0016,

  // linhas de fundo
  lineCount: 70,
  lineColor: '#9aa6b8',
  lineOpacity: 0.9,

  // cometas
  signalCount: 55,
  signalWidth: 2.0,
  trail: 18,
  palette: ['#2563eb', '#ec4899', '#f59e0b'],

  // código
  codeCount: 80,
  codeColor: '#334155',
  tokens: ['0', '1', '01', '10', '11', '0x1F', '0xA3', '0xFF', '{ }', '</>', '=>',
    'fn()', 'i++', '&&', '||', '[]', '::', '01010', '0b1', '#!', '...', ';', '%', '$_', '1010', '110', '0x7E'],

  // movimento
  speedGlobal: 0.72,
  speedMin: 0.07,
  speedSpan: 1.15,

  // geometria do caminho
  segmentCount: 150,
  curveLength: 50,
  straightLength: 100,
  curvePower: 0.8265,
  spreadHeight: 30.33,
  spreadDepth: 0,
  waveSpeed: 2.48,
  waveHeight: 0.145,

  // câmera / render
  camera: { fov: 45, z: 90 },
  maxPixelRatio: 2,
};

export const positionX = (CONFIG.curveLength - CONFIG.straightLength) / 2; // -25
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `node --test test/config.test.js`
Expected: PASS (3 testes).

- [ ] **Step 7: Commit**

```bash
git add package.json netlify.toml src/config.js test/config.test.js
git commit -m "feat: scaffold do projeto + config da animação"
```

---

### Task 2: Matemática do caminho (`getPathPoint`)

**Files:**
- Create: `src/path.js`
- Test: `test/path.test.js`

- [ ] **Step 1: Escrever os testes (falhando)**

`test/path.test.js`:
```js
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
  const low = getPathPoint(t, 0, 0, cfg).y;                 // spreadFactor = -1
  const high = getPathPoint(t, CONFIG.lineCount, 0, cfg).y;  // spreadFactor = +1
  assert.ok(Math.abs(low + 17.10) < 0.1, `low=${low}`);
  assert.ok(Math.abs(high - 17.10) < 0.1, `high=${high}`);
  assert.ok(Math.abs(low + high) < 1e-9, 'simétrico');
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test test/path.test.js`
Expected: FAIL — `Cannot find module '../src/path.js'`.

- [ ] **Step 3: Implementar `src/path.js`**

```js
// Retorna {x,y,z} — função PURA (sem three) para ser testável no Node.
export function getPathPoint(t, lane, time, cfg) {
  const totalLen = cfg.curveLength + cfg.straightLength;
  const currentX = -cfg.curveLength + t * totalLen;
  let y = 0;
  let z = 0;

  if (currentX < 0) {
    const spreadFactor = (lane / cfg.lineCount - 0.5) * 2;
    const ratio = (currentX + cfg.curveLength) / cfg.curveLength;
    const shapeFactor = Math.pow((Math.cos(ratio * Math.PI) + 1) / 2, cfg.curvePower);
    y = spreadFactor * cfg.spreadHeight * shapeFactor;
    z = spreadFactor * cfg.spreadDepth * shapeFactor;
    y += Math.sin(time * cfg.waveSpeed + currentX * 0.1 + lane) * cfg.waveHeight * shapeFactor;
  }

  return { x: currentX, y, z };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test test/path.test.js`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/path.js test/path.test.js
git commit -m "feat: matemática do caminho (getPathPoint) com testes"
```

---

### Task 3: Helpers puros (`util.js`)

**Files:**
- Create: `src/util.js`
- Test: `test/util.test.js`

- [ ] **Step 1: Escrever os testes (falhando)**

`test/util.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ndcToPixel, codeOpacity, scaleForViewport } from '../src/util.js';

test('ndcToPixel mapeia o centro NDC para o centro da tela', () => {
  assert.deepEqual(ndcToPixel(0, 0, 1000, 500), { x: 500, y: 250 });
});

test('ndcToPixel mapeia os cantos', () => {
  assert.deepEqual(ndcToPixel(-1, 1, 1000, 500), { x: 0, y: 0 });
  assert.deepEqual(ndcToPixel(1, -1, 1000, 500), { x: 1000, y: 500 });
});

test('codeOpacity faz fade-in, segura e faz fade-out', () => {
  assert.equal(codeOpacity(0), 0);
  assert.ok(Math.abs(codeOpacity(0.04) - 0.5) < 1e-9);
  assert.equal(codeOpacity(0.5), 1);
  assert.equal(codeOpacity(0.85), 1);
  assert.ok(Math.abs(codeOpacity(0.925) - 0.5) < 1e-9);
  assert.equal(codeOpacity(1), 0);
});

test('scaleForViewport reduz em telas pequenas', () => {
  assert.equal(scaleForViewport(500), 0.6);
  assert.equal(scaleForViewport(1200), 1);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test test/util.test.js`
Expected: FAIL — `Cannot find module '../src/util.js'`.

- [ ] **Step 3: Implementar `src/util.js`**

```js
// Converte NDC (-1..1) em pixels de tela.
export function ndcToPixel(ndcX, ndcY, w, h) {
  return { x: (ndcX * 0.5 + 0.5) * w, y: (-ndcY * 0.5 + 0.5) * h };
}

// Envelope de opacidade do token de código ao longo do trajeto (0..1).
export function codeOpacity(progress) {
  if (progress < 0.08) return progress / 0.08;
  if (progress > 0.85) return Math.max(0, (1 - progress) / 0.15);
  return 1;
}

// Fator de densidade conforme a largura da viewport.
export function scaleForViewport(width) {
  return width < 768 ? 0.6 : 1;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test` (roda todos)
Expected: PASS — config + path + util.

- [ ] **Step 5: Commit**

```bash
git add src/util.js test/util.test.js
git commit -m "feat: helpers puros (ndcToPixel, codeOpacity, scaleForViewport) com testes"
```

---

### Task 4: Cena + `index.html` (canvas branco)

**Files:**
- Create: `index.html`
- Create: `src/scene.js`
- Create: `src/main.js`

- [ ] **Step 1: Criar `index.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stream</title>
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
    }
  }
  </script>
  <style>
    html, body { height: 100%; margin: 0; }
    body { background: #fff; overflow: hidden; }
    #stage { position: fixed; inset: 0; }
    #stage canvas { display: block; width: 100%; height: 100%; }
    #code { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 2; }
    #code .code-token {
      position: absolute; left: 0; top: 0; white-space: nowrap;
      font: 600 12px/1 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      color: #334155; letter-spacing: .02em; will-change: transform, opacity;
    }
  </style>
</head>
<body>
  <div id="stage"></div>
  <div id="code"></div>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Criar `src/scene.js`**

```js
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
```

- [ ] **Step 3: Criar `src/main.js` (mínimo — só a cena)**

```js
import { createScene, resizeRenderer } from './scene.js';

const { scene, camera, renderer } = createScene();
let view = resizeRenderer(renderer, camera);
window.addEventListener('resize', () => { view = resizeRenderer(renderer, camera); });

renderer.render(scene, camera);
```

- [ ] **Step 4: Servir e verificar no navegador**

```bash
python3 -m http.server 8000   # rodar em background; deixar rodando para as próximas tasks
agent-browser open "http://localhost:8000"
agent-browser wait 1500
agent-browser screenshot /tmp/t4-white.png
```
Expected: tela toda branca, sem barras de rolagem, sem erro no console. Conferir o console:
```bash
agent-browser eval "({ err: window.__err||null, canvas: !!document.querySelector('#stage canvas') })"
```
Expected: `canvas: true` e nenhum erro de importação do three.

- [ ] **Step 5: Commit**

```bash
git add index.html src/scene.js src/main.js
git commit -m "feat: cena three.js + shell html (canvas branco)"
```

---

### Task 5: Linhas de fundo (o leque)

**Files:**
- Create: `src/lines.js`
- Modify: `src/main.js`

- [ ] **Step 1: Criar `src/lines.js`**

```js
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
```

- [ ] **Step 2: Atualizar `src/main.js` (cena + linhas + loop)**

```js
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
```

- [ ] **Step 3: Verificar no navegador**

```bash
agent-browser open "http://localhost:8000"
agent-browser wait 1800
agent-browser screenshot /tmp/t5-lines.png
```
Expected: leque de ~70 linhas cinza-azuladas (`#9aa6b8`) abrindo à esquerda e convergindo num feixe à direita, sobre branco. Ondulação sutil visível.

- [ ] **Step 4: Commit**

```bash
git add src/lines.js src/main.js
git commit -m "feat: linhas de fundo (leque de fibras)"
```

---

### Task 6: Cometas (sinais Line2)

**Files:**
- Create: `src/signals.js`
- Modify: `src/main.js`

- [ ] **Step 1: Criar `src/signals.js`**

```js
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

export function createSignals(group, count) {
  const material = new LineMaterial({
    linewidth: CONFIG.signalWidth, vertexColors: true, transparent: true, depthTest: false,
  });
  const palette = CONFIG.palette.map((c) => new THREE.Color(c));
  const pick = () => palette[Math.floor(Math.random() * palette.length)];

  const signals = [];
  for (let i = 0; i < count; i++) {
    const geo = new LineGeometry();
    geo.setPositions(new Array(CONFIG.trail * 3).fill(0));
    geo.setColors(new Array(CONFIG.trail * 3).fill(1));
    const line = new Line2(geo, material);
    line.frustumCulled = false;
    group.add(line);
    signals.push({
      line, geo, pick,
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
      s.progress = 0; s.lane = randomLane(); s.history = []; s.color = s.pick(); s.speed = randomSpeed();
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
```

- [ ] **Step 2: Atualizar `src/main.js` (adiciona cometas + scale responsivo)**

```js
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
```

- [ ] **Step 3: Verificar no navegador**

```bash
agent-browser open "http://localhost:8000"
agent-browser wait 2000
agent-browser screenshot /tmp/t6-signals.png
```
Expected: cometas finos azul/rosa/âmbar correndo pelas fibras, visíveis em **todo** o trajeto (inclusive no feixe reto à direita), com rastro se dissolvendo no branco. Velocidades visivelmente diferentes entre eles.

- [ ] **Step 4: Commit**

```bash
git add src/signals.js src/main.js
git commit -m "feat: cometas (sinais Line2) com rastro que se dissolve no branco"
```

---

### Task 7: Camada de código (overlay DOM)

**Files:**
- Create: `src/code.js`
- Modify: `src/main.js`

- [ ] **Step 1: Criar `src/code.js`**

```js
import * as THREE from 'three';
import { CONFIG, positionX } from './config.js';
import { getPathPoint } from './path.js';
import { ndcToPixel, codeOpacity } from './util.js';

const ndc = new THREE.Vector3();
const OFFSET = { x: positionX, y: 0, z: 0 };

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
    ndc.set(p.x + OFFSET.x, p.y + OFFSET.y, p.z + OFFSET.z).project(camera);
    const { x, y } = ndcToPixel(ndc.x, ndc.y, w, h);
    c.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%,-50%)`;
    c.el.style.opacity = (codeOpacity(c.progress) * 0.92).toFixed(2);
  }
}
```

- [ ] **Step 2: Atualizar `src/main.js` (adiciona camada de código)**

```js
import * as THREE from 'three';
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
window.addEventListener('resize', () => { view = resizeRenderer(renderer, camera, signalMat); });

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  updateLines(lines, time);
  updateSignals(signals, time);
  updateCode(codeParticles, camera, time, view.w, view.h);
  renderer.render(scene, camera);
}
animate();
```

- [ ] **Step 3: Verificar no navegador**

```bash
agent-browser open "http://localhost:8000"
agent-browser wait 2000
agent-browser screenshot /tmp/t7-code.png
agent-browser eval "[...document.querySelectorAll('#code .code-token')].length"
```
Expected: ~80 tokens monoespaçados slate (`0xFF`, `</>`, `i++`, `01010`…) fluindo pelas fibras e convergindo num stream à direita, junto com os cometas. Contagem de tokens > 0.

- [ ] **Step 4: Commit**

```bash
git add src/code.js src/main.js
git commit -m "feat: camada de código (overlay DOM projetando 3D->tela)"
```

---

### Task 8: Polimento — reduced-motion + medição de FPS

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Atualizar `src/main.js` (respeitar prefers-reduced-motion)**

```js
import * as THREE from 'three';
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
window.addEventListener('resize', () => { view = resizeRenderer(renderer, camera, signalMat); });

function renderFrame(time) {
  updateLines(lines, time);
  updateSignals(signals, time);
  updateCode(codeParticles, camera, time, view.w, view.h);
  renderer.render(scene, camera);
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion) {
  // Pré-aquece o rastro dos cometas e renderiza um único quadro estático.
  for (let i = 0; i < CONFIG.trail; i++) renderFrame(0.6);
} else {
  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    renderFrame(clock.getElapsedTime());
  })();
}
```

- [ ] **Step 2: Verificar FPS no navegador**

```bash
agent-browser open "http://localhost:8000"
agent-browser wait 1500
cat <<'EOF' | agent-browser eval --stdin
await new Promise((res) => {
  let frames = 0; const t0 = performance.now();
  function tick(){ frames++; if (performance.now()-t0 < 2000) requestAnimationFrame(tick); else res(); }
  requestAnimationFrame(tick);
  window.__fps = () => Math.round(frames / ((performance.now()-t0)/1000));
});
window.__fps();
EOF
```
Expected: FPS ≈ 55–60 em desktop. **Se FPS consistentemente < 50**, aplicar a otimização de buffers in-place do **Apêndice A** (atualiza os atributos do `Line2` no lugar, sem realloc) e medir de novo.

- [ ] **Step 3: Verificar reduced-motion**

```bash
agent-browser emulate-media --reduced-motion reduce 2>/dev/null || true
agent-browser open "http://localhost:8000"
agent-browser wait 1200
agent-browser screenshot /tmp/t8-reduced.png
```
(Se o `emulate-media` não existir na versão instalada, verificar manualmente ativando "Reduzir movimento" no SO.)
Expected: um quadro estático composto (linhas + cometas + código parados), sem loop.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: respeitar prefers-reduced-motion + verificação de FPS"
```

---

### Task 9: Deploy no Netlify + validação do embed (iframe)

**Files:**
- Create: `test/embed-harness.html`

- [ ] **Step 1: Criar harness local de embed**

`test/embed-harness.html`:
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Embed harness</title>
  <style>
    body { margin: 0; font-family: sans-serif; background: #eef; }
    .frame-box { width: 80vw; height: 70vh; margin: 6vh auto; border: 2px dashed #88a; background: #fff; }
    iframe { width: 100%; height: 100%; border: 0; }
    p { text-align: center; color: #446; }
  </style>
</head>
<body>
  <p>Simulação do embed no ScaleDraw — animação dentro de um iframe.</p>
  <div class="frame-box">
    <iframe src="/index.html" loading="lazy" title="Animação"></iframe>
  </div>
</body>
</html>
```

- [ ] **Step 2: Verificar o embed localmente**

```bash
# servidor da raiz ainda rodando em :8000
agent-browser open "http://localhost:8000/test/embed-harness.html"
agent-browser wait 2200
agent-browser screenshot /tmp/t9-embed.png
```
Expected: a animação roda **dentro** do iframe (caixa branca), preenchendo a área, sem erro de framing no console.

- [ ] **Step 3: Publicar no Netlify**

O login do Netlify é interativo — o usuário roda no chat:
```
! npx netlify-cli login
```
Depois, deploy de produção a partir da raiz do projeto:
```bash
npx netlify-cli deploy --dir . --prod
```
(Alternativa sem CLI: arrastar a pasta do projeto em https://app.netlify.com/drop.)
Expected: URL pública `https://<algo>.netlify.app` impressa.

- [ ] **Step 4: Verificar produção + embed real**

```bash
agent-browser open "https://<sua-url>.netlify.app"
agent-browser wait 2500
agent-browser screenshot /tmp/t9-prod.png
```
Expected: idêntico ao local. Para o embed no ScaleDraw, colar no bloco de HTML/embed da plataforma:
```html
<iframe src="https://<sua-url>.netlify.app" style="width:100%;height:100%;border:0" loading="lazy" title="Animação"></iframe>
```

- [ ] **Step 5: Commit**

```bash
git add test/embed-harness.html
git commit -m "test: harness de embed via iframe + deploy Netlify"
```

---

## Apêndice A — Otimização opcional: buffers in-place do Line2

Aplicar **somente se** a medição de FPS (Task 8, Step 2) ficar abaixo de ~50, para eliminar a realocação do `setPositions`/`setColors` por frame.

Substituir, em `src/signals.js`, as duas linhas finais do loop (`s.geo.setPositions(s.pos); s.geo.setColors(s.col);`) por uma escrita direta nos buffers interleaved já alocados:

```js
// dentro de updateSignals, no lugar de setPositions/setColors:
const segCount = CONFIG.trail - 1;
const posArr = s.geo.attributes.instanceStart.data.array;       // stride 6: [sx,sy,sz, ex,ey,ez]
const colArr = s.geo.attributes.instanceColorStart.data.array;  // stride 6: [r,g,b, r,g,b]
for (let seg = 0; seg < segCount; seg++) {
  const o = seg * 6, a = seg * 3, b = (seg + 1) * 3;
  posArr[o] = s.pos[a]; posArr[o + 1] = s.pos[a + 1]; posArr[o + 2] = s.pos[a + 2];
  posArr[o + 3] = s.pos[b]; posArr[o + 4] = s.pos[b + 1]; posArr[o + 5] = s.pos[b + 2];
  colArr[o] = s.col[a]; colArr[o + 1] = s.col[a + 1]; colArr[o + 2] = s.col[a + 2];
  colArr[o + 3] = s.col[b]; colArr[o + 4] = s.col[b + 1]; colArr[o + 5] = s.col[b + 2];
}
s.geo.attributes.instanceStart.data.needsUpdate = true;
s.geo.attributes.instanceColorStart.data.needsUpdate = true;
```

A geometria já foi criada com `setPositions`/`setColors` do tamanho certo (`CONFIG.trail` pontos) em `createSignals`, então os buffers existem e só são reescritos. Re-medir o FPS após aplicar.
