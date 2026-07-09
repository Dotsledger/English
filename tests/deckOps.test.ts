import { describe, it, expect } from "vitest";
import {
  appendSentence,
  markSeen,
  recordCheckpointResult,
  recordMasteryResult,
  recordPeek,
  recordReviewResult,
  removeFromDeck,
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

  it("removeFromDeck drops the phrase from the queue but preserves its history", () => {
    const deck = saveToDeck(markSeen({}, "p", NOW), "p", NOW);
    const advanced = recordReviewResult(deck, "p", { correct: true, produced: false }, NOW);
    const before = advanced.p;
    const removed = removeFromDeck(advanced, "p");
    expect(removed.p.inDeck).toBe(false);
    expect(removed.p.nextReviewAt).toBeNull();
    // History untouched — stage, box, counts, timesSeen all preserved.
    expect(removed.p.stage).toBe(before.stage);
    expect(removed.p.box).toBe(before.box);
    expect(removed.p.correctCount).toBe(before.correctCount);
    expect(removed.p.timesSeen).toBe(before.timesSeen);
    // No-op when the phrase isn't in the deck.
    expect(removeFromDeck({}, "missing")).toEqual({});
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

  it("review results delegate to applyReviewResult (recall → recalled, never masters)", () => {
    const deck = {
      p: makeDeckEntry({ phraseId: "p", inDeck: true, box: 3, stage: "recognised" }),
    };
    let after = recordReviewResult(deck, "p", { correct: true, produced: true }, NOW);
    expect(after.p.stage).toBe("recalled");
    expect(after.p.box).toBe(4);
    // More scaffolded recall never reaches usable/mastered.
    after = recordReviewResult(after, "p", { correct: true, produced: true }, NOW);
    expect(after.p.stage).toBe("recalled");
  });
});

describe("recordMasteryResult", () => {
  const box5 = () => ({ p: makeDeckEntry({ phraseId: "p", inDeck: true, box: 5, stage: "recalled" }) });

  it("first 'me salió' makes it usable; a second spaced one masters it (fluent)", () => {
    let after = recordMasteryResult(box5(), "p", "me_salio", NOW);
    expect(after.p.stage).toBe("usable");
    expect(after.p.box).toBe(5);
    expect(after.p.nextReviewAt).toBe(NOW + 35 * DAY);
    expect(after.p.producedAt).toBe(NOW);
    expect(after.p.producedCorrectAtLongBoxes).toBe(1);

    after = recordMasteryResult(after, "p", "me_salio", NOW + 35 * DAY);
    expect(after.p.stage).toBe("mastered");
    expect(after.p.producedCorrectAtLongBoxes).toBe(2);
  });

  it("'regular' keeps the box and comes back in 3 days", () => {
    const after = recordMasteryResult(box5(), "p", "regular", NOW);
    expect(after.p.box).toBe(5);
    expect(after.p.stage).toBe("recalled");
    expect(after.p.nextReviewAt).toBe(NOW + 3 * DAY);
  });

  it("'no me salió' drops one box without regressing the stage", () => {
    const after = recordMasteryResult(box5(), "p", "no_me_salio", NOW);
    expect(after.p.box).toBe(4);
    expect(after.p.stage).toBe("recalled");
    expect(after.p.nextReviewAt).toBe(NOW + 16 * DAY);
  });

  // ── Memory calibration: one self-assessed success ≠ instant mastery ──
  const at = (box: 1 | 2 | 3 | 4 | 5, stage: "seen" | "recognised" | "recalled") => ({
    p: makeDeckEntry({ phraseId: "p", inDeck: true, box, stage }),
  });

  it("'me salió' advances only ONE box, never jumping a low box straight to 5", () => {
    expect(recordMasteryResult(at(1, "recognised"), "p", "me_salio", NOW).p.box).toBe(2);
    expect(recordMasteryResult(at(2, "recognised"), "p", "me_salio", NOW).p.box).toBe(3);
    expect(recordMasteryResult(at(3, "recalled"), "p", "me_salio", NOW).p.box).toBe(4);
    expect(recordMasteryResult(at(4, "recalled"), "p", "me_salio", NOW).p.box).toBe(5);
    expect(recordMasteryResult(at(5, "recalled"), "p", "me_salio", NOW).p.box).toBe(5);
  });

  it("a low-box (1–2) success reaches only 'recalled', not 'usable'", () => {
    const b1 = recordMasteryResult(at(1, "recognised"), "p", "me_salio", NOW);
    expect(b1.p.stage).toBe("recalled"); // one production ≠ reliably usable
    expect(b1.p.producedCorrectAtLongBoxes).toBe(0);
    expect(b1.p.nextReviewAt).toBe(NOW + 3 * DAY); // box-2 interval, not 35 days
    const b2 = recordMasteryResult(at(2, "recognised"), "p", "me_salio", NOW);
    expect(b2.p.stage).toBe("recalled");
  });

  it("box 3 success can become 'usable' (enough retrieval history)", () => {
    const after = recordMasteryResult(at(3, "recalled"), "p", "me_salio", NOW);
    expect(after.p.box).toBe(4);
    expect(after.p.stage).toBe("usable");
    expect(after.p.producedCorrectAtLongBoxes).toBe(0); // credit only at box ≥ 4
    expect(after.p.nextReviewAt).toBe(NOW + 16 * DAY); // medium review
  });

  it("mastery credit only accrues from long-box (≥ 4) successes; 'fluent' needs two", () => {
    let after = recordMasteryResult(at(4, "recalled"), "p", "me_salio", NOW);
    expect(after.p.box).toBe(5);
    expect(after.p.producedCorrectAtLongBoxes).toBe(1);
    expect(after.p.stage).toBe("usable"); // not yet mastered
    after = recordMasteryResult(after, "p", "me_salio", NOW + 35 * DAY);
    expect(after.p.producedCorrectAtLongBoxes).toBe(2);
    expect(after.p.stage).toBe("mastered");
  });
});

describe("appendSentence", () => {
  it("appends to the phrase's corpus and ignores blanks", () => {
    let store = appendSentence({}, "p", "  My own sentence.  ", NOW);
    expect(store.p).toEqual([{ text: "My own sentence.", createdAt: NOW }]);
    store = appendSentence(store, "p", "Another one", NOW + 1);
    expect(store.p).toHaveLength(2);
    expect(appendSentence(store, "p", "   ", NOW + 2)).toBe(store);
  });
});
