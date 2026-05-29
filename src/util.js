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
