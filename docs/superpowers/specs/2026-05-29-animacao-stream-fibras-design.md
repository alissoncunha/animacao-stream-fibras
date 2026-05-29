# Animação "Stream de Fibras + Código" — Design

**Data:** 2026-05-29
**Status:** Aprovado para planejamento
**Referência:** inspirado em https://codepen.io/sabosugi/pen/azZmLoB (efeito de fibras com sinais), adaptado para fundo branco.

## Objetivo

Uma animação web standalone, em tela cheia, sobre **fundo branco**, publicável no **Netlify** como site estático. Um "leque" de fibras se abre à esquerda e converge num feixe à direita; por elas correm **cometas coloridos** e uma camada de **código** (tokens monoespaçados) fluindo em direção ao ponto de convergência — como uma transmissão de dados.

Sem texto, logo ou interação: é uma peça visual que roda sozinha em loop.

## Decisões de design (validadas ao vivo no companion visual)

A referência original usa fundo preto com brilho neon (additive blending + bloom). Como o requisito é **fundo branco** — onde brilho aditivo e bloom "lavam" e somem — o efeito foi **re-tematizado**: linhas e sinais sólidos, com o rastro se desfazendo no branco em vez de brilhar. Essa direção foi escolhida comparando 3 estratégias lado a lado no navegador.

## Especificação visual (valores travados)

### Fundo e câmera
- Fundo: `#ffffff` (branco puro), tela cheia.
- `THREE.FogExp2('#ffffff', 0.0016)` — leve fade no branco para profundidade.
- `PerspectiveCamera(45, aspect, 1, 1000)`, posição `(0, 0, 90)`, olhando para `(0, 0, 0)`.
- Conteúdo num `THREE.Group` deslocado em `x = (curveLength - straightLength) / 2 = -25` para centralizar.

### Geometria do caminho (`getPathPoint(t, lane, time)`)
Reaproveitada da referência. Para `t ∈ [0,1]`: `x = -curveLength + t * (curveLength + straightLength)`.
- `curveLength = 50`, `straightLength = 100`, `curvePower = 0.8265`.
- `spreadHeight = 30.33`, `spreadDepth = 0`.
- Quando `x < 0` (região do leque): abre em `y` por um fator de cosseno elevado a `curvePower`, com onda senoidal (`waveSpeed = 2.48`, `waveHeight = 0.145`). Quando `x ≥ 0`: tudo colapsa em `y = 0` (o feixe reto à direita).
- `segmentCount = 150` pontos por linha.

### Camada 1 — Linhas de fundo (o leque)
- `lineCount = 70`, cada uma `THREE.Line` com `LineBasicMaterial`.
- Cor `#9aa6b8`, `opacity 0.9`, `transparent`, `depthWrite: false` (nível "Médio").

### Camada 2 — Cometas (sinais)
- `signalCount ≈ 55`. Cada sinal é uma **linha espessa** (`Line2` + `LineGeometry` + `LineMaterial`), porque `LineBasicMaterial` ignora `linewidth` na maioria das plataformas.
- Largura `2px` (nível "Fino"), `vertexColors`, `transparent`, `depthTest: false`, `NormalBlending`.
- Rastro de `18` pontos (nível "Longo"). O rastro faz **fade do branco (cauda) até a cor do sinal (cabeça)** via `lerp(white, color, t²)` — no fundo branco isso simula o cometa se dissolvendo.
- Paleta **Multicolor**: cada sinal sorteia entre azul `#2563eb`, rosa `#ec4899`, âmbar `#f59e0b`.
- Movimento: `progress += speed * 0.005 * speedGlobal`, com `speedGlobal = 0.72` (rápido). Velocidade por sinal sorteada em `0.07 + random * 1.15` (muita variação). Ao passar de `1.0`, o sinal reinicia em outra lane, com nova cor e nova velocidade.

### Camada 3 — Código (overlay DOM)
- `codeCount ≈ 80` (densidade "Muito"). Cada token é um `<span>` posicionado por cima do canvas.
- A cada frame: calcula o ponto 3D na lane (mesmo `getPathPoint`), soma o offset do grupo, projeta com `vector.project(camera)` e converte para pixels: `x = (ndc.x*0.5+0.5)*W`, `y = (-ndc.y*0.5+0.5)*H`. Posiciona via `transform: translate(x,y) translate(-50%,-50%)`.
- Fonte monoespaçada `600 12px`, cor slate `#334155` (legível no branco, cara de terminal). Opacidade até `0.92`, com fade-in (`progress < 0.08`) e fade-out (`progress > 0.85`).
- Tokens sorteados de um pool tipo: `0` `1` `01` `10` `0x1F` `0xFF` `</>` `=>` `fn()` `i++` `&&` `||` `[]` `01010` `0b1` `...` etc. Token novo a cada reinício de partícula.
- `pointer-events: none` e `overflow: hidden` no container.

## Arquitetura

100% client-side, sem backend. Um único `requestAnimationFrame` avança o relógio e atualiza as três camadas (linhas, cometas, código) por frame.

```
index.html          → <canvas>, container do código, CSS mínimo, importmap
src/config.js       → todos os parâmetros travados acima (single source of truth)
src/path.js         → getPathPoint(t, lane, time)
src/scene.js        → renderer, câmera, cena, fog, resize
src/lines.js        → cria/atualiza as 70 linhas de fundo
src/signals.js      → cria/atualiza os cometas (Line2) + rastro/fade
src/code.js         → cria/atualiza a camada de código DOM (projeção 3D→tela)
src/main.js         → init das camadas + loop de animação
```

Cada módulo expõe `create...()` e `update...(time)` e pode ser entendido/testado isolado. `config.js` é importado por todos — mudar um número de comportamento acontece num lugar só.

## Empacotamento e deploy (sem build + CDN)

- **Sem passo de build.** `index.html` declara um `importmap` apontando para o CDN:
  - `three` → `https://unpkg.com/three@0.160.0/build/three.module.js`
  - `three/addons/` → `https://unpkg.com/three@0.160.0/examples/jsm/`
- Os módulos `src/*.js` são ES modules servidos estaticamente (Netlify serve a pasta como está; múltiplos arquivos funcionam sem bundler).
- **Deploy:** arrastar a pasta no Netlify Drop, ou conectar o repositório (publish directory = raiz, sem build command). `netlify.toml` mínimo opcional.
- **Trade-off aceito:** depende do unpkg em runtime (precisa de internet). Se um dia quiser remover a dependência de CDN, dá pra migrar para three.js vendorizado ou Vite sem mexer na lógica.

### Embed em site do ScaleDraw (iframe)

A animação no Netlify é embarcada em outro site (ScaleDraw) via `<iframe>`:

```html
<iframe src="https://seu-site.netlify.app"
        style="width:100%;height:100%;border:0"
        loading="lazy" title="Animação"></iframe>
```

- **Funciona por padrão:** o Netlify serve por HTTPS e não envia `X-Frame-Options`, então o framing é permitido sem configuração extra.
- **Preencher o iframe:** o layout já é tela cheia (`position: fixed; inset: 0`) e responde ao `resize`, então preenche 100% do iframe em qualquer tamanho.
- **Opcional — restringir o embed:** se quiser permitir o iframe só no domínio do ScaleDraw, adicionar um arquivo `_headers` (ou `netlify.toml`) com `Content-Security-Policy: frame-ancestors https://<dominio-do-scaledraw>`. Sem esse header, qualquer site pode embedar (ok para peça pública).
- **Requisito do lado do ScaleDraw:** a plataforma precisa aceitar um bloco de HTML/embed/iframe customizado. Se ela não permitir iframe mas permitir HTML cru, a alternativa é colar o conteúdo direto — mas o iframe para a URL do Netlify é o caminho recomendado (isola o código e atualiza sozinho a cada deploy).

## Performance, responsividade e acessibilidade

- **Performance:** pré-alocar os buffers do `Line2` (tamanho fixo de rastro) e **atualizar os atributos no lugar** (`instanceStart`/`instanceEnd`/cor) em vez de chamar `setPositions`/`setColors` a cada frame — evita realloc e pressão de GC. Alvo: 60fps em desktop. `pixelRatio` limitado a 2.
- **Responsivo:** recalcula câmera/renderer no `resize`. Em telas pequenas ou hardware fraco, reduz `lineCount`, `signalCount` e `codeCount` (ex.: ~60% em largura < 768px).
- **Acessibilidade:** respeita `prefers-reduced-motion: reduce` — em vez do loop, renderiza um único quadro estático (composição bonita parada).

## Verificação

Não há testes unitários (peça visual). Critérios de aceite verificados manualmente:
1. Abre em fundo branco, tela cheia, sem barras de rolagem.
2. As três camadas aparecem: leque de linhas legível, cometas coloridos visíveis em todo o trajeto (inclusive no feixe reto à direita), código fluindo e convergindo.
3. Roda em loop suave (~60fps) sem vazamento de memória crescente.
4. Reage a `resize` sem distorcer.
5. Com `prefers-reduced-motion`, congela num quadro estático.
6. Publicado no Netlify, carrega e roda igual ao local.
7. Embarcado num `<iframe>` (simulando o ScaleDraw), carrega, preenche o iframe e roda normalmente.

Verificação prática via agent-browser: screenshots de cada camada, FPS no console e checagem do deploy.

## Fora de escopo (YAGNI)

- Painel de controles (lil-gui da referência) — removido; os valores ficam fixos em `config.js`.
- Texto, logo, CTA, navegação.
- Interação com mouse/toque.
- Backend, analytics, múltiplas telas.
