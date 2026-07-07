/**
 * Deterministic per-category accent, derived from the category name (stable
 * across sessions, no data to maintain). Tuned for the dark theme. Used to
 * differentiate Explora tiles at a glance — layered over the existing
 * scene-bg gradients, never replacing them.
 */

export function categoryHue(category: string): number {
  let h = 0;
  for (let i = 0; i < category.length; i++) {
    h = (h * 31 + category.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

export function categoryAccent(category: string): string {
  return `hsl(${categoryHue(category)} 72% 68%)`;
}
