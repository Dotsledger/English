import { describe, it, expect } from "vitest";
import {
  freshEntry,
  markSeen,
  recordCheckpointResult,
  recordReviewResult,
  recordMasteryResult,
} from "@/lib/deckOps";
import { applyReviewResult } from "@/lib/session/leitner";
import { parseDeck } from "@/lib/storage/docs";
import type { DeckStore } from "@/lib/types";
import { makeDeckEntry } from "./storage.test";

const NOW = 1_750_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

/**
 * The six-stage lifecycle contract: only successful retrieval/production
 * moves a phrase upward; viewing tops out at "seen"; wrong answers never
 * regress the stage (only the box). See lib/types.ts PhraseStage.
 */
describe("phrase lifecycle — stages only advance, and only through retrieval", () => {
  it("a fresh entry starts as new (never introduced)", () => {
    expect(freshEntry("p", "catalog").stage).toBe("new");
  });

  it("seen ≠ learned: viewing moves new → seen and no higher", () => {
    const deck = markSeen({}, "p", NOW);
    expect(deck.p.stage).toBe("seen");
    // Repeated viewing never climbs past seen.
    const twice = markSeen(markSeen(deck, "p", NOW + 1), "p", NOW + 2);
    expect(twice.p.stage).toBe("seen");
  });

  it("correct recognition (MCQ) upgrades to recognised", () => {
    const deck = recordCheckpointResult(markSeen({}, "p", NOW), "p", true, NOW);
    expect(deck.p.stage).toBe("recognised");
    // And directly via the review engine.
    const viaReview = applyReviewResult(
      makeDeckEntry({ stage: "seen" }),
      { correct: true, produced: false },
      NOW
    );
    expect(viaReview.stage).toBe("recognised");
  });

  it("correct scaffolded recall (cloze/reverse) upgrades to recalled", () => {
    const deck = recordReviewResult(
      { p: makeDeckEntry({ phraseId: "p", inDeck: true, box: 2, stage: "recognised" }) },
      "p",
      { correct: true, produced: true },
      NOW
    );
    expect(deck.p.stage).toBe("recalled");
  });

  it("correct self-generated production (mastery gate) upgrades to usable", () => {
    const deck = recordMasteryResult(
      { p: makeDeckEntry({ phraseId: "p", inDeck: true, box: 5, stage: "recalled" }) },
      "p",
      "me_salio",
      NOW
    );
    expect(deck.p.stage).toBe("usable");
  });

  it("mastered (fluent) requires two spaced production successes", () => {
    let deck: DeckStore = { p: makeDeckEntry({ phraseId: "p", inDeck: true, box: 5, stage: "recalled" }) };
    deck = recordMasteryResult(deck, "p", "me_salio", NOW);
    expect(deck.p.stage).toBe("usable"); // not fluent on the first success
    deck = recordMasteryResult(deck, "p", "me_salio", NOW + 35 * DAY);
    expect(deck.p.stage).toBe("mastered");
  });

  it("an incorrect answer never regresses the stage and schedules it soon", () => {
    const before = makeDeckEntry({ phraseId: "p", inDeck: true, box: 4, stage: "recalled" });
    const after = recordReviewResult({ p: before }, "p", { correct: false, produced: true }, NOW);
    expect(after.p.stage).toBe("recalled"); // stage held
    expect(after.p.box).toBe(3); // box dropped
    expect(after.p.nextReviewAt).toBe(NOW + 7 * DAY); // sooner than box 4's 16d
  });
});

describe("stage migration on load", () => {
  it("maps a persisted legacy 'produced' stage to 'recalled'", () => {
    const legacy = makeDeckEntry({ phraseId: "p", stage: "recalled" });
    // Simulate the old on-disk value.
    const raw = JSON.stringify({ p: { ...legacy, stage: "produced" } });
    expect(parseDeck(raw).p.stage).toBe("recalled");
  });

  it("keeps all six valid stages and drops unknown ones", () => {
    const mk = (stage: string) => ({ ...makeDeckEntry({ phraseId: "x" }), stage });
    const raw = JSON.stringify({
      a: mk("new"),
      b: mk("seen"),
      c: mk("recognised"),
      d: mk("recalled"),
      e: mk("usable"),
      f: mk("mastered"),
      g: mk("wizard"), // corrupt → dropped, never crashes
    });
    const deck = parseDeck(raw);
    expect(Object.keys(deck).sort()).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(deck.e.stage).toBe("usable");
  });
});
