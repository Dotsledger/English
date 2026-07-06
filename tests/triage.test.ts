import { describe, it, expect } from "vitest";
import type { DeckStore, TriageStore } from "@/lib/types";
import {
  DISPLAY_CAP,
  FREEZE_CAP,
  THAW_PER_DAY,
  daysSinceLastActivity,
  displayedDueCount,
  reconcileTriage,
  valuableDue,
} from "@/lib/session/triage";
import { dueEntries } from "@/lib/session/leitner";
import { composeComebackSession } from "@/lib/session/composeComebackSession";
import { phrases, phraseById } from "@/lib/data/phrases";
import { contentScenes, checkpointScenes } from "@/lib/data/scenes";
import { topics } from "@/lib/data/topics";
import { phraseCategoryIndex } from "@/lib/exercises/phraseIndex";
import { localIsoDate } from "@/lib/dates";
import { makeDeckEntry } from "./storage.test";

const NOW = new Date(2026, 6, 6, 12, 0, 0).getTime(); // local noon, Monday
const DAY = 24 * 60 * 60 * 1000;
const freshTriage = (): TriageStore => ({ lastThawDate: "", thawedToday: 0 });

function dueDeck(count: number, boxFor: (i: number) => 1 | 2 | 3 | 4 | 5 = () => 1): DeckStore {
  const deck: DeckStore = {};
  for (let i = 0; i < count; i++) {
    const id = `p${i}`;
    deck[id] = makeDeckEntry({
      phraseId: id,
      inDeck: true,
      box: boxFor(i),
      nextReviewAt: NOW - (i + 1) * 1000, // higher i = more overdue
    });
  }
  return deck;
}

describe("displayedDueCount", () => {
  it("never exceeds the cap", () => {
    expect(displayedDueCount(0)).toBe(0);
    expect(displayedDueCount(5)).toBe(5);
    expect(displayedDueCount(8)).toBe(DISPLAY_CAP);
    expect(displayedDueCount(40)).toBe(DISPLAY_CAP);
  });
});

describe("daysSinceLastActivity", () => {
  it("is null when there is no activity", () => {
    expect(daysSinceLastActivity({}, NOW)).toBeNull();
  });

  it("is 0 for activity today", () => {
    expect(daysSinceLastActivity({ [localIsoDate(new Date(NOW))]: true }, NOW)).toBe(0);
  });

  it("counts whole days from the most recent active day", () => {
    const fourAgo = localIsoDate(new Date(NOW - 4 * DAY));
    const sixAgo = localIsoDate(new Date(NOW - 6 * DAY));
    expect(daysSinceLastActivity({ [fourAgo]: true, [sixAgo]: true }, NOW)).toBe(4);
  });
});

describe("valuableDue", () => {
  it("returns highest-box due entries first, limited", () => {
    const deck = dueDeck(6, (i) => ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5);
    const top = valuableDue(deck, NOW, 3);
    expect(top).toHaveLength(3);
    expect(top[0].box).toBeGreaterThanOrEqual(top[1].box);
    expect(top[1].box).toBeGreaterThanOrEqual(top[2].box);
  });

  it("ignores frozen and suppressed entries", () => {
    const deck = dueDeck(3);
    deck.p0 = { ...deck.p0, frozen: true };
    deck.p1 = { ...deck.p1, suppressed: true };
    expect(valuableDue(deck, NOW, 5).map((e) => e.phraseId)).toEqual(["p2"]);
  });
});

describe("reconcileTriage — freeze", () => {
  it("freezes the overflow above the cap, lowest-box oldest first", () => {
    const deck = dueDeck(FREEZE_CAP + 5, (i) => (i < 5 ? 1 : 3)); // p0..p4 are box 1
    const { deck: next } = reconcileTriage(deck, freshTriage(), NOW);
    const frozen = Object.values(next).filter((e) => e.frozen);
    expect(frozen).toHaveLength(5);
    // the 5 box-1 items are the least invested → frozen first
    expect(frozen.every((e) => e.box === 1)).toBe(true);
    expect(dueEntries(next, NOW)).toHaveLength(FREEZE_CAP);
  });

  it("does nothing when the queue is within the cap", () => {
    const deck = dueDeck(FREEZE_CAP);
    const { deck: next } = reconcileTriage(deck, freshTriage(), NOW);
    expect(Object.values(next).some((e) => e.frozen)).toBe(false);
  });
});

describe("reconcileTriage — thaw", () => {
  function frozenDeck(frozenCount: number, activeCount: number): DeckStore {
    const deck: DeckStore = {};
    for (let i = 0; i < activeCount; i++) {
      deck[`a${i}`] = makeDeckEntry({ phraseId: `a${i}`, inDeck: true, box: 1, nextReviewAt: NOW - 1000 });
    }
    for (let i = 0; i < frozenCount; i++) {
      deck[`f${i}`] = makeDeckEntry({
        phraseId: `f${i}`,
        inDeck: true,
        box: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        nextReviewAt: NOW - 1000,
        frozen: true,
      });
    }
    return deck;
  }

  it("thaws up to the daily budget when the active queue is low", () => {
    const { deck: next, triage } = reconcileTriage(frozenDeck(10, 2), freshTriage(), NOW);
    const stillFrozen = Object.values(next).filter((e) => e.frozen).length;
    expect(stillFrozen).toBe(10 - THAW_PER_DAY);
    expect(triage.thawedToday).toBe(THAW_PER_DAY);
    expect(triage.lastThawDate).toBe(localIsoDate(new Date(NOW)));
  });

  it("does not thaw when the active queue is still high", () => {
    const { deck: next } = reconcileTriage(frozenDeck(10, 20), freshTriage(), NOW);
    expect(Object.values(next).filter((e) => e.frozen)).toHaveLength(10);
  });

  it("respects the per-day budget already spent", () => {
    const spent: TriageStore = { lastThawDate: localIsoDate(new Date(NOW)), thawedToday: THAW_PER_DAY };
    const { deck: next } = reconcileTriage(frozenDeck(10, 2), spent, NOW);
    expect(Object.values(next).filter((e) => e.frozen)).toHaveLength(10); // none thawed
  });

  it("thaws the most valuable frozen items first (highest box)", () => {
    const { deck: next } = reconcileTriage(frozenDeck(10, 0), freshTriage(), NOW);
    const thawed = Object.values(next).filter((e) => !e.frozen && e.phraseId.startsWith("f"));
    expect(thawed.every((e) => e.box >= 4)).toBe(true); // boxes 5,5,4 thawed first
  });
});

describe("composeComebackSession", () => {
  const CONTENT = {
    topics,
    scenes: contentScenes,
    authoredCheckpoints: checkpointScenes,
    phrases,
    phraseById,
    index: phraseCategoryIndex,
  };
  const rng = () => 0.5;

  it("is review-only, capped at 5, ending with an end card", () => {
    const deck: DeckStore = {};
    for (let i = 0; i < 12; i++) {
      const id = phrases[i].id;
      deck[id] = makeDeckEntry({ phraseId: id, inDeck: true, box: 2, nextReviewAt: NOW - i * 1000 });
    }
    const plan = composeComebackSession({ deck, captures: {}, content: CONTENT, now: NOW, rng });
    const reviews = plan.cards.filter((c) => c.kind === "review");
    expect(reviews.length).toBe(5);
    expect(plan.cards.every((c) => c.kind === "review" || c.kind === "end")).toBe(true);
    expect(plan.cards.at(-1)?.kind).toBe("end");
    expect(plan.mode).toBe("comeback");
  });

  it("is just an end card when nothing is due", () => {
    const plan = composeComebackSession({ deck: {}, captures: {}, content: CONTENT, now: NOW, rng });
    expect(plan.cards).toHaveLength(1);
    expect(plan.cards[0].kind).toBe("end");
  });
});
