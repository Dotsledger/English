import { describe, it, expect } from "vitest";
import type { Phrase, VocabularyCategory } from "@/lib/types";
import {
  calculateUsefulnessScore,
  filterPhrasesForExplore,
  getCategoryLabel,
  getCategoryPriority,
  getWhyThisMatters,
  rankForExplore,
  type ExploreFilter,
} from "@/lib/vocabStrategy";
import { phrases as vocabSeed } from "@/lib/data/categories/vocab-seed";
import { phrases as allPhrases, phraseById } from "@/lib/data/phrases";
import { generateCloze } from "@/lib/exercises/cloze";
import { dueEntries } from "@/lib/session/leitner";
import type { DeckStore } from "@/lib/types";
import { makeDeckEntry } from "./storage.test";

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

describe("getCategoryLabel", () => {
  it("returns readable labels for the key categories", () => {
    expect(getCategoryLabel("phrasal_verb")).toBe("Phrasal verb");
    expect(getCategoryLabel("collocation")).toBe("Collocation");
    expect(getCategoryLabel("sentence_frame")).toBe("Sentence frame");
    expect(getCategoryLabel("core_chunk")).toBe("Core chunk");
    expect(getCategoryLabel("discourse_marker")).toBe("Discourse marker");
    expect(getCategoryLabel("spanish_speaker_trap")).toBe("Spanish-speaker trap");
  });
});

describe("getWhyThisMatters", () => {
  it("returns rationale copy per category", () => {
    expect(getWhyThisMatters(mk({ category: "phrasal_verb" }))).toMatch(/spoken English/i);
    expect(getWhyThisMatters(mk({ category: "collocation" }))).toMatch(/literal Spanish/i);
    expect(getWhyThisMatters(mk({ category: "sentence_frame" }))).toMatch(/reusable structure/i);
    expect(getWhyThisMatters(mk({ category: "discourse_marker" }))).toMatch(/flow naturally/i);
  });

  it("prioritises the error-prevention message for traps (even on a collocation)", () => {
    const trapColloc = mk({ category: "collocation", isSpanishSpeakerTrap: true });
    expect(getWhyThisMatters(trapColloc)).toMatch(/Spanish-to-English mistake/i);
    expect(getWhyThisMatters(mk({ category: "spanish_speaker_trap" }))).toMatch(/mistake/i);
  });

  it("returns null when there is no strategy category", () => {
    expect(getWhyThisMatters(mk({}))).toBeNull();
  });
});

describe("Explore does not affect Review", () => {
  it("filtering the Explore list leaves due-phrase selection unchanged", () => {
    const now = 1_750_000_000_000;
    const deck: DeckStore = {
      "make-a-decision": makeDeckEntry({
        phraseId: "make-a-decision",
        inDeck: true,
        nextReviewAt: now - 1000,
      }),
      "look-into": makeDeckEntry({ phraseId: "look-into", inDeck: true, nextReviewAt: now - 500 }),
    };
    const before = dueEntries(deck, now).map((e) => e.phraseId);
    // Applying any Explore filter must not change what's due (they're unrelated).
    for (const f of ["all", "phrasal_verbs", "collocations", "daily_life"] as ExploreFilter[]) {
      filterPhrasesForExplore(vocabSeed, f);
      expect(dueEntries(deck, now).map((e) => e.phraseId)).toEqual(before);
    }
  });

  it("an empty filter result does not crash and ranks to an empty list", () => {
    const empty = filterPhrasesForExplore(vocabSeed, "daily_life"); // no daily_life in seed
    expect(empty).toEqual([]);
    expect(rankForExplore(empty)).toEqual([]);
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

describe("strategy inventory (seed + core + backfill)", () => {
  // Same pool the PatternExplorer uses: any phrase carrying a strategy category.
  const strategy = allPhrases.filter((p) => p.category !== undefined);
  const inFilter = (f: ExploreFilter) => filterPhrasesForExplore(strategy, f).length;

  it("has 80–120 strategy-annotated phrases", () => {
    expect(strategy.length).toBeGreaterThanOrEqual(80);
    expect(strategy.length).toBeLessThanOrEqual(120);
  });

  it("every strategy phrase has complete, in-range metadata", () => {
    for (const p of strategy) {
      expect(p.category, `${p.id} category`).toBeDefined();
      expect(p.frequencyBand, `${p.id} frequencyBand`).toBeDefined();
      expect(p.usefulnessScore ?? 0, `${p.id} usefulnessScore`).toBeGreaterThanOrEqual(1);
      expect(p.usefulnessScore ?? 0, `${p.id} usefulnessScore`).toBeLessThanOrEqual(100);
      expect(p.productivePriority ?? 0, `${p.id} productivePriority`).toBeGreaterThanOrEqual(1);
      expect(p.productivePriority ?? 0, `${p.id} productivePriority`).toBeLessThanOrEqual(100);
    }
  });

  it("every isPhrasalVerb phrase is categorised as phrasal_verb", () => {
    for (const p of strategy) {
      if (p.isPhrasalVerb) expect(p.category, `${p.id}`).toBe("phrasal_verb");
    }
  });

  it("strategy phrase ids are unique", () => {
    const ids = strategy.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every Explore filter now meets its minimum inventory", () => {
    expect(inFilter("daily_life")).toBeGreaterThanOrEqual(8);
    expect(inFilter("work")).toBeGreaterThanOrEqual(8);
    expect(inFilter("phrasal_verbs")).toBeGreaterThanOrEqual(15);
    expect(inFilter("collocations")).toBeGreaterThanOrEqual(12);
    expect(inFilter("sentence_frames")).toBeGreaterThanOrEqual(12);
    expect(inFilter("spanish_speaker_traps")).toBeGreaterThanOrEqual(10);
  });

  it("Spanish-speaker traps (category or flag) appear in the traps filter", () => {
    const trapIds = new Set(filterPhrasesForExplore(strategy, "spanish_speaker_traps").map((p) => p.id));
    // a pure trap, a flagged collocation, and a false friend all show up
    expect(trapIds.has("depend-on")).toBe(true);
    expect(trapIds.has("make-a-decision")).toBe(true);
    expect(trapIds.has("eventually")).toBe(true);
  });
});

describe("strategy learning depth", () => {
  const strategy = allPhrases.filter((p) => p.category !== undefined);
  const byCat = (c: string) => strategy.filter((p) => p.category === c);
  const sitCount = (p: (typeof strategy)[number]) => p.situations?.length ?? 0;
  const hasAvoidOrContrast = (p: (typeof strategy)[number]) =>
    Boolean(p.avoid) || (p.contrastWith?.length ?? 0) > 0;

  it("every phrasal verb has at least 2 realistic situations", () => {
    for (const p of byCat("phrasal_verb")) expect(sitCount(p), p.id).toBeGreaterThanOrEqual(2);
  });

  it("every sentence frame has at least 2 production situations", () => {
    for (const p of byCat("sentence_frame")) expect(sitCount(p), p.id).toBeGreaterThanOrEqual(2);
  });

  it("every work_communication item has at least 1 situation", () => {
    for (const p of byCat("work_communication")) expect(sitCount(p), p.id).toBeGreaterThanOrEqual(1);
  });

  it("every daily_life item has at least 1 situation", () => {
    for (const p of byCat("daily_life")) expect(sitCount(p), p.id).toBeGreaterThanOrEqual(1);
  });

  it("every collocation has an avoid or contrastWith", () => {
    for (const p of byCat("collocation")) expect(hasAvoidOrContrast(p), p.id).toBe(true);
  });

  it("every Spanish-speaker trap (category or flag) has avoid or contrastWith", () => {
    const traps = strategy.filter((p) => p.category === "spanish_speaker_trap" || p.isSpanishSpeakerTrap);
    for (const p of traps) expect(hasAvoidOrContrast(p), p.id).toBe(true);
  });

  it("every false friend has a contrastWith", () => {
    for (const p of byCat("false_friend")) expect((p.contrastWith?.length ?? 0), p.id).toBeGreaterThanOrEqual(1);
  });

  it("every situation is a non-trivial scenario (> 30 chars)", () => {
    for (const p of strategy) {
      for (const sit of p.situations ?? []) {
        expect(sit.length, `${p.id}: "${sit}"`).toBeGreaterThan(30);
      }
    }
  });

  it("strategy phrase texts are unique", () => {
    const texts = strategy.map((p) => p.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("strategy phrase ids are unique", () => {
    const ids = strategy.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("global phrase-id uniqueness", () => {
  it("no two phrases share an id (topic ids are a separate namespace)", () => {
    // phraseById is built from phrases; equal sizes ⇒ no duplicate phrase ids.
    expect(phraseById.size).toBe(allPhrases.length);
  });
});
