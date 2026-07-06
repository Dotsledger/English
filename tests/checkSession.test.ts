import { describe, it, expect } from "vitest";
import type { DeckStore, LevelState } from "@/lib/types";
import { composeCheck, scoreCheck } from "@/lib/checkSession";
import { initialLevel } from "@/lib/level";
import { phrases, phraseById } from "@/lib/data/phrases";
import { phraseCategoryIndex } from "@/lib/exercises/phraseIndex";
import { makeDeckEntry } from "./storage.test";

function seededRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const byLevel = (lvl: string) => phrases.filter((p) => p.level === lvl).map((p) => p.id);
const b2 = byLevel("B2");
const c1 = byLevel("C1");

function deckWith(stages: { mastered?: string[]; produced?: string[]; seen?: string[] }): DeckStore {
  const deck: DeckStore = {};
  for (const id of stages.mastered ?? [])
    deck[id] = makeDeckEntry({ phraseId: id, stage: "mastered", inDeck: true, timesSeen: 5 });
  for (const id of stages.produced ?? [])
    deck[id] = makeDeckEntry({ phraseId: id, stage: "produced", inDeck: true, timesSeen: 4 });
  for (const id of stages.seen ?? [])
    deck[id] = makeDeckEntry({ phraseId: id, stage: "seen", timesSeen: 1 });
  return deck;
}

const deps = { phrases, phraseById, index: phraseCategoryIndex };

describe("composeCheck", () => {
  it("builds 10 distinct items from a rich deck", () => {
    const deck = deckWith({
      mastered: b2.slice(0, 6),
      produced: b2.slice(6, 12),
      seen: b2.slice(12, 20),
    });
    const { items } = composeCheck({ deck, level: initialLevel(() => 0), ...deps, rng: seededRng(1) });
    expect(items).toHaveLength(10);
    const ids = items.map((i) => i.exercise.phraseId);
    expect(new Set(ids).size).toBe(ids.length); // no phrase tested twice
    expect(items.some((i) => i.source === "retention")).toBe(true);
    expect(items.some((i) => i.source === "production")).toBe(true);
  });

  it("stretch items come from the next band and are unstudied", () => {
    // Study lots of B2, leave C1 untouched → stretch should reach into C1.
    const deck = deckWith({ mastered: b2.slice(0, 5), produced: b2.slice(5, 10), seen: b2.slice(10, 20) });
    const { items } = composeCheck({ deck, level: initialLevel(() => 0), ...deps, rng: seededRng(2) });
    const stretch = items.filter((i) => i.source === "stretch");
    expect(stretch.length).toBeGreaterThan(0);
    for (const item of stretch) {
      expect(phraseById.get(item.exercise.phraseId)?.level).toBe("C1");
      expect(deck[item.exercise.phraseId]).toBeUndefined(); // unstudied
    }
  });

  it("stays composable for a thin deck (only seen phrases)", () => {
    const deck = deckWith({ seen: b2.slice(0, 12) });
    const { items } = composeCheck({ deck, level: initialLevel(() => 0), ...deps, rng: seededRng(3) });
    expect(items.length).toBeGreaterThanOrEqual(8);
    const ids = items.map((i) => i.exercise.phraseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not mutate the deck", () => {
    const deck = deckWith({ mastered: b2.slice(0, 6), produced: b2.slice(6, 12) });
    const snapshot = JSON.stringify(deck);
    composeCheck({ deck, level: initialLevel(() => 0), ...deps, rng: seededRng(4) });
    expect(JSON.stringify(deck)).toBe(snapshot);
  });

  it("every mcq item has one correct option present", () => {
    const deck = deckWith({ mastered: b2.slice(0, 8), produced: c1.slice(0, 4) });
    const level: LevelState = { ...initialLevel(() => 0), band: "C2" }; // no next band → no stretch
    const { items } = composeCheck({ deck, level, ...deps, rng: seededRng(5) });
    for (const item of items) {
      if (item.exercise.type === "mcq") {
        expect(item.exercise.options[item.exercise.correctIndex]).toBeTruthy();
        expect(new Set(item.exercise.options).size).toBe(item.exercise.options.length);
      }
    }
  });
});

describe("scoreCheck", () => {
  it("computes a rounded percentage", () => {
    expect(scoreCheck(9, 10)).toBe(90);
    expect(scoreCheck(5, 8)).toBe(63);
    expect(scoreCheck(0, 0)).toBe(0);
  });
});
