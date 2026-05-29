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
    z = spreadFactor * cfg.spreadDepth * shapeFactor || 0; // normaliza -0 -> 0 (spreadDepth=0)
    y += Math.sin(time * cfg.waveSpeed + currentX * 0.1 + lane) * cfg.waveHeight * shapeFactor;
  }

  return { x: currentX, y, z };
}
