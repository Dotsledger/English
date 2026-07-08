import { describe, it, expect } from "vitest";
import { phrases as corePhrases } from "@/lib/data/categories/core-life-phrases";
import { LEVELS } from "@/lib/data/topics";

/**
 * The curated "core life phrases" are the ones fully populated with rich
 * metadata (usageContext, situations, …) that Context / Situation / Contrast
 * cards rely on. This guards their authoring quality.
 */
describe("core life phrases", () => {
  it("seeds at least 25 high-value phrases", () => {
    expect(corePhrases.length).toBeGreaterThanOrEqual(25);
  });

  it("every core phrase carries the rich metadata the new cards need", () => {
    for (const p of corePhrases) {
      expect(p.text.length, `${p.id} text`).toBeGreaterThan(0);
      expect(p.meaningEs.length, `${p.id} meaningEs`).toBeGreaterThan(0);
      expect(p.usageContext?.length, `${p.id} usageContext`).toBeGreaterThan(0);
      expect(p.situations?.length ?? 0, `${p.id} situations`).toBeGreaterThanOrEqual(1);
      // Primary + alternatives → at least two contexts to rotate through.
      expect((p.examples?.length ?? 0) + 1, `${p.id} examples`).toBeGreaterThanOrEqual(2);
      expect(LEVELS, `${p.id} level`).toContain(p.level);
      expect(["easy", "medium", "hard"], `${p.id} difficulty`).toContain(p.difficulty);
    }
  });

  it("core phrase ids are unique", () => {
    const ids = corePhrases.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("any contrastWith entry explains the difference in Spanish", () => {
    for (const p of corePhrases) {
      for (const c of p.contrastWith ?? []) {
        expect(c.phrase.length, `${p.id} contrast phrase`).toBeGreaterThan(0);
        expect(c.explanationEs.length, `${p.id} contrast explanation`).toBeGreaterThan(0);
      }
    }
  });
});
