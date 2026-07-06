/** Lowercase, unify curly apostrophes, collapse whitespace — shared by phrase
 * matching (lib/sceneText.ts) and answer grading (lib/exercises/grade.ts). */
export const normalize = (s: string) =>
  s.toLowerCase().replace(/[’‘']/g, "'").replace(/\s+/g, " ");
