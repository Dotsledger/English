import { describe, it, expect } from "vitest";
import {
  markSeen,
  recordCheckpointResult,
  recordPeek,
  recordReviewResult,
  saveToDeck,
  suppressPhrase,
} from "@/lib/deckOps";
import { makeDeckEntry } from "./storage.test";

const NOW = 1_750_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe("deck operations", () => {
  it("markSeen creates a fresh entry and increments on repeat", () => {
    let deck = markSeen({}, "p", NOW);
    expect(deck.p.timesSeen).toBe(1);
    expect(deck.p.stage).toBe("seen");
    expect(deck.p.inDeck).toBe(false);
    deck = markSeen(deck, "p", NOW + 1);
    expect(deck.p.timesSeen).toBe(2);
  });

  it("saveToDeck queues the phrase at its box interval and is idempotent", () => {
    const deck = saveToDeck(markSeen({}, "p", NOW), "p", NOW);
    expect(deck.p.inDeck).toBe(true);
    expect(deck.p.nextReviewAt).toBe(NOW + 1 * DAY);
    const again = saveToDeck(deck, "p", NOW + 5000);
    expect(again).toBe(deck);
  });

  it("suppressPhrase marks and never queues", () => {
    const deck = suppressPhrase({}, "p", NOW);
    expect(deck.p.suppressed).toBe(true);
    expect(deck.p.inDeck).toBe(false);
  });

  it("recordPeek counts reveals and keeps the latest latency", () => {
    let deck = recordPeek({}, "p", 1200);
    deck = recordPeek(deck, "p", 300);
    expect(deck.p.peekCount).toBe(2);
    expect(deck.p.lastPeekMs).toBe(300);
  });

  it("failed checkpoint enters the deck at box 1; correct one only recognises", () => {
    const failed = recordCheckpointResult({}, "p", false, NOW);
    expect(failed.p.inDeck).toBe(true);
    expect(failed.p.box).toBe(1);
    expect(failed.p.nextReviewAt).toBe(NOW + 1 * DAY);

    const passed = recordCheckpointResult({}, "q", true, NOW);
    expect(passed.q.inDeck).toBe(false);
    expect(passed.q.stage).toBe("recognised");
    expect(passed.q.nextReviewAt).toBeNull();
  });

  it("suppression wins over checkpoint failure", () => {
    const deck = { p: makeDeckEntry({ phraseId: "p", suppressed: true }) };
    const after = recordCheckpointResult(deck, "p", false, NOW);
    expect(after.p.inDeck).toBe(false);
    expect(after.p.wrongCount).toBe(1);
  });

  it("in-deck checkpoint answers get the full Leitner update", () => {
    const deck = {
      p: makeDeckEntry({ phraseId: "p", inDeck: true, box: 2, nextReviewAt: NOW - 1 }),
    };
    const after = recordCheckpointResult(deck, "p", true, NOW);
    expect(after.p.box).toBe(3);
    expect(after.p.nextReviewAt).toBe(NOW + 7 * DAY);
  });

  it("review results delegate to applyReviewResult including production", () => {
    const deck = {
      p: makeDeckEntry({ phraseId: "p", inDeck: true, box: 4, stage: "produced" }),
    };
    let after = recordReviewResult(deck, "p", { correct: true, produced: true }, NOW);
    after = recordReviewResult(after, "p", { correct: true, produced: true }, NOW);
    expect(after.p.stage).toBe("mastered");
  });
});
