import { describe, it, expect } from "vitest";
import type { DeckStore } from "@/lib/types";
import {
  computeSessionRecap,
  planPhraseIds,
  recapHasTransitions,
  snapshotStages,
} from "@/lib/session/transitions";
import type { SessionCard } from "@/lib/session/types";
import { makeDeckEntry } from "./storage.test";

const NOW = 1_750_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe("session transitions recap", () => {
  it("snapshots stages, treating absent phrases as new", () => {
    const deck: DeckStore = { a: makeDeckEntry({ phraseId: "a", stage: "recognised" }) };
    expect(snapshotStages(deck, ["a", "b"])).toEqual({ a: "recognised", b: "new" });
  });

  it("buckets each advanced phrase once, by its final stage", () => {
    const before = { a: "new", b: "seen", c: "recognised", d: "recalled", e: "recognised" } as const;
    const deck: DeckStore = {
      a: makeDeckEntry({ phraseId: "a", stage: "seen" }), // new → seen
      b: makeDeckEntry({ phraseId: "b", stage: "recognised" }), // seen → recognised
      c: makeDeckEntry({ phraseId: "c", stage: "recalled" }), // recognised → recalled
      d: makeDeckEntry({ phraseId: "d", stage: "usable" }), // recalled → usable
      e: makeDeckEntry({ phraseId: "e", stage: "recognised" }), // unchanged
    };
    const r = computeSessionRecap(before, deck, NOW);
    expect(r.metNew).toBe(1);
    expect(r.toRecognised).toBe(1);
    expect(r.toRecalled).toBe(1);
    expect(r.toUsable).toBe(1);
    expect(r.toMastered).toBe(0);
  });

  it("never counts a regression (stage only advances)", () => {
    const before = { a: "recalled" } as const;
    const deck: DeckStore = { a: makeDeckEntry({ phraseId: "a", stage: "recalled" }) };
    const r = computeSessionRecap(before, deck, NOW);
    expect(recapHasTransitions(r)).toBe(false);
  });

  it("counts in-deck phrases coming back within a day", () => {
    const deck: DeckStore = {
      soon: makeDeckEntry({ phraseId: "soon", inDeck: true, nextReviewAt: NOW + DAY / 2 }),
      later: makeDeckEntry({ phraseId: "later", inDeck: true, nextReviewAt: NOW + 3 * DAY }),
      overdue: makeDeckEntry({ phraseId: "overdue", inDeck: true, nextReviewAt: NOW - 1000 }),
      loose: makeDeckEntry({ phraseId: "loose", inDeck: false, nextReviewAt: NOW + DAY / 2 }),
    };
    expect(computeSessionRecap({}, deck, NOW).dueTomorrow).toBe(1);
  });

  it("collects every phrase a plan touches, once", () => {
    const cards: SessionCard[] = [
      { kind: "context", phraseId: "p1" },
      { kind: "situation", phraseId: "p2" },
      { kind: "contrast", phraseId: "p1" },
      { kind: "mastery", phraseId: "p3" },
      { kind: "end" },
    ];
    expect(planPhraseIds(cards).sort()).toEqual(["p1", "p2", "p3"]);
  });
});
