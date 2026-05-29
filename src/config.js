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
