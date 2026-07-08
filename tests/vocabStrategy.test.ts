import { describe, it, expect } from "vitest";
import type { Phrase, VocabularyCategory } from "@/lib/types";
import {
  calculateUsefulnessScore,
  filterPhrasesForExplore,
  getCategoryPriority,
  rankForExplore,
  type ExploreFilter,
} from "@/lib/vocabStrategy";
import { phrases as vocabSeed } from "@/lib/data/categories/vocab-seed";
import { generateCloze } from "@/lib/exercises/cloze";

const ALL_CATEGORIES: VocabularyCategory[] = [
  "core_chunk",
  "phrasal_verb",
  "collocation",
  "sentence_frame",
  "discourse_marker",
  "high_frequency_verb_pattern",
  "work_communication",
  "daily_life",
  "emotion_opinion",
  "travel_social",
  "false_friend",
  "spanish_speaker_trap",
  "advanced_expression",
];

function mk(over: Partial<Phrase>): Phrase {
  return {
    id: "x",
    text: "x",
    meaningEs: "x",
    example: "x",
    level: "B2",
    tags: [],
    ...over,
  };
}

describe("getCategoryPriority", () => {
  it("ranks productive patterns highest, advanced_expression lowest", () => {
    const order = [...ALL_CATEGORIES].sort((a, b) => getCategoryPriority(a) - getCategoryPriority(b));
    expect(order.slice(0, 4)).toEqual([
      "core_chunk",
      "sentence_frame",
      "high_frequency_verb_pattern",
      "phrasal_verb",
    ]);
    expect(order.at(-1)).toBe("advanced_expression");
  });

  it("assigns a distinct priority to every category", () => {
    const priorities = ALL_CATEGORIES.map(getCategoryPriority);
    expect(new Set(priorities).size).toBe(ALL_CATEGORIES.length);
  });
});

describe("calculateUsefulnessScore", () => {
  it("always returns 1–100 and is deterministic", () => {
    for (const p of vocabSeed) {
      const s = calculateUsefulnessScore(p);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(100);
      expect(calculateUsefulnessScore(p)).toBe(s); // deterministic
    }
  });

  it("scores higher frequency above lower for the same category", () => {
    const high = mk({ category: "phrasal_verb", frequencyBand: "very_high" });
    const low = mk({ category: "phrasal_verb", frequencyBand: "low" });
    expect(calculateUsefulnessScore(high)).toBeGreaterThan(calculateUsefulnessScore(low));
  });

  it("boosts Spanish-speaker traps (error prevention)", () => {
    const base = mk({ category: "collocation", frequencyBand: "high" });
    const trap = mk({ category: "collocation", frequencyBand: "high", isSpanishSpeakerTrap: true });
    expect(calculateUsefulnessScore(trap)).toBeGreaterThan(calculateUsefulnessScore(base));
  });

  it("rewards productive categories over advanced expressions", () => {
    const frame = mk({ category: "sentence_frame", frequencyBand: "high" });
    const advanced = mk({ category: "advanced_expression", frequencyBand: "high" });
    expect(calculateUsefulnessScore(frame)).toBeGreaterThan(calculateUsefulnessScore(advanced));
  });
});

describe("filterPhrasesForExplore", () => {
  const fixture: Phrase[] = [
    mk({ id: "a", category: "daily_life" }),
    mk({ id: "b", category: "work_communication" }),
    mk({ id: "c", category: "phrasal_verb", isPhrasalVerb: true }),
    mk({ id: "d", category: "collocation" }),
    mk({ id: "e", category: "sentence_frame" }),
    mk({ id: "f", category: "spanish_speaker_trap", isSpanishSpeakerTrap: true }),
    mk({ id: "g", category: "collocation", isSpanishSpeakerTrap: true }), // trap flag on a collocation
  ];
  const ids = (filter: ExploreFilter) => filterPhrasesForExplore(fixture, filter).map((p) => p.id);

  it("returns everything for 'all'", () => {
    expect(ids("all")).toHaveLength(fixture.length);
  });

  it("matches by category and by flag", () => {
    expect(ids("daily_life")).toEqual(["a"]);
    expect(ids("work")).toEqual(["b"]);
    expect(ids("phrasal_verbs")).toEqual(["c"]);
    expect(ids("collocations")).toEqual(["d", "g"]);
    expect(ids("sentence_frames")).toEqual(["e"]);
    // trap filter catches both the category and the flag-on-collocation
    expect(ids("spanish_speaker_traps").sort()).toEqual(["f", "g"]);
  });
});

describe("rankForExplore", () => {
  it("orders by category priority, then usefulness", () => {
    const ranked = rankForExplore([
      mk({ id: "coll", category: "collocation", usefulnessScore: 90 }),
      mk({ id: "chunk", category: "core_chunk", usefulnessScore: 50 }),
      mk({ id: "frame", category: "sentence_frame", usefulnessScore: 80 }),
    ]);
    expect(ranked.map((p) => p.id)).toEqual(["chunk", "frame", "coll"]);
  });
});

describe("vocab seed validity", () => {
  it("has ~24 items with unique ids", () => {
    expect(vocabSeed.length).toBeGreaterThanOrEqual(20);
    const ids = vocabSeed.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every seed item carries complete strategy metadata", () => {
    for (const p of vocabSeed) {
      expect(p.category, `${p.id} category`).toBeDefined();
      expect(p.cefrLevel, `${p.id} cefrLevel`).toBeDefined();
      expect(p.frequencyBand, `${p.id} frequencyBand`).toBeDefined();
      expect(p.difficulty, `${p.id} difficulty`).toBeDefined();
      expect(p.usageContext?.length, `${p.id} usageContext`).toBeGreaterThan(0);
      expect(p.situations?.length ?? 0, `${p.id} situations`).toBeGreaterThanOrEqual(1);
      expect((p.examples?.length ?? 0) + 1, `${p.id} examples`).toBeGreaterThanOrEqual(2);
      expect(p.usefulnessScore ?? 0, `${p.id} usefulnessScore`).toBeGreaterThanOrEqual(1);
      expect(p.usefulnessScore ?? 0, `${p.id} usefulnessScore`).toBeLessThanOrEqual(100);
      expect(p.productivePriority ?? 0, `${p.id} productivePriority`).toBeGreaterThanOrEqual(1);
      expect(p.productivePriority ?? 0, `${p.id} productivePriority`).toBeLessThanOrEqual(100);
    }
  });

  it("every seed example is cloze-able (phrase appears verbatim)", () => {
    for (const p of vocabSeed) {
      for (const example of [p.example, ...(p.examples ?? [])]) {
        expect(generateCloze(p, example), `${p.id}: "${example}"`).not.toBeNull();
      }
    }
  });

  it("covers all six requested seed categories", () => {
    const cats = new Set(vocabSeed.map((p) => p.category));
    for (const c of [
      "core_chunk",
      "sentence_frame",
      "phrasal_verb",
      "collocation",
      "discourse_marker",
      "spanish_speaker_trap",
    ] as const) {
      expect(cats.has(c), `missing category ${c}`).toBe(true);
    }
  });
});
