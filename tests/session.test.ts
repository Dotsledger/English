import { describe, it, expect } from "vitest";
import type { DeckEntry, DeckStore } from "@/lib/types";
import {
  applyReviewResult,
  dueEntries,
  intervalForBox,
  jumpBox,
  upcomingEntries,
} from "@/lib/session/leitner";
import { exerciseTypeFor, buildReviewExercise } from "@/lib/session/exercisePicker";
import { composeCategorySession, type ComposerContent } from "@/lib/session/composeCategorySession";
import { composeSnackSession } from "@/lib/session/composeSnackSession";
import {
  computeStats,
  initSessionRun,
  isFinished,
  sessionReducer,
} from "@/lib/session/runReducer";
import { phrases, phraseById } from "@/lib/data/phrases";
import { contentScenes, checkpointScenes } from "@/lib/data/scenes";
import { topics } from "@/lib/data/topics";
import { phraseCategoryIndex } from "@/lib/exercises/phraseIndex";
import { makeDeckEntry } from "./storage.test";

const NOW = 1_750_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

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

const CONTENT: ComposerContent = {
  topics,
  scenes: contentScenes,
  authoredCheckpoints: checkpointScenes,
  phrases,
  phraseById,
  index: phraseCategoryIndex,
};

function deckEntry(overrides: Partial<DeckEntry>): DeckEntry {
  return makeDeckEntry({ inDeck: true, nextReviewAt: NOW - 1000, ...overrides });
}

describe("leitner box math", () => {
  it("correct promotes one box, wrong demotes one, with cap and floor", () => {
    const base = deckEntry({ box: 3 });
    expect(applyReviewResult(base, { correct: true, produced: false }, NOW).box).toBe(4);
    expect(applyReviewResult(base, { correct: false, produced: false }, NOW).box).toBe(2);
    expect(applyReviewResult(deckEntry({ box: 5 }), { correct: true, produced: true }, NOW).box).toBe(5);
    expect(applyReviewResult(deckEntry({ box: 1 }), { correct: false, produced: false }, NOW).box).toBe(1);
  });

  it("reschedules at the NEW box's interval", () => {
    const promoted = applyReviewResult(deckEntry({ box: 1 }), { correct: true, produced: false }, NOW);
    expect(promoted.nextReviewAt).toBe(NOW + 3 * DAY);
    const demoted = applyReviewResult(deckEntry({ box: 2 }), { correct: false, produced: false }, NOW);
    expect(demoted.nextReviewAt).toBe(NOW + 1 * DAY);
  });

  it("mcq correct advances seen → recognised; production advances → produced", () => {
    const recognised = applyReviewResult(deckEntry({ stage: "seen" }), { correct: true, produced: false }, NOW);
    expect(recognised.stage).toBe("recognised");
    const produced = applyReviewResult(deckEntry({ stage: "recognised", box: 3 }), { correct: true, produced: true }, NOW);
    expect(produced.stage).toBe("produced");
  });

  it("stages never regress on wrong answers", () => {
    const entry = deckEntry({ stage: "produced", box: 4 });
    expect(applyReviewResult(entry, { correct: false, produced: true }, NOW).stage).toBe("produced");
  });

  it("two correct productions while box >= 4 master the phrase", () => {
    let entry = deckEntry({ stage: "produced", box: 4, producedCorrectAtLongBoxes: 0 });
    entry = applyReviewResult(entry, { correct: true, produced: true }, NOW);
    expect(entry.stage).toBe("produced");
    expect(entry.producedCorrectAtLongBoxes).toBe(1);
    entry = applyReviewResult(entry, { correct: true, produced: true }, NOW);
    expect(entry.stage).toBe("mastered");
  });

  it("production below box 4 never counts toward mastery", () => {
    const entry = applyReviewResult(
      deckEntry({ stage: "produced", box: 3 }),
      { correct: true, produced: true },
      NOW
    );
    expect(entry.producedCorrectAtLongBoxes).toBe(0);
  });

  it("jumpBox promotes and reschedules without mastery credit", () => {
    const boosted = jumpBox(deckEntry({ box: 4, producedCorrectAtLongBoxes: 1 }), NOW);
    expect(boosted.box).toBe(5);
    expect(boosted.nextReviewAt).toBe(NOW + intervalForBox(5));
    expect(boosted.producedCorrectAtLongBoxes).toBe(1);
  });

  it("dueEntries excludes suppressed, non-deck and future entries, sorts most overdue first", () => {
    const deck: DeckStore = {
      later: deckEntry({ phraseId: "later", nextReviewAt: NOW - 1 }),
      sooner: deckEntry({ phraseId: "sooner", nextReviewAt: NOW - 999 }),
      future: deckEntry({ phraseId: "future", nextReviewAt: NOW + 999 }),
      shelved: deckEntry({ phraseId: "shelved", suppressed: true }),
      loose: deckEntry({ phraseId: "loose", inDeck: false }),
    };
    expect(dueEntries(deck, NOW).map((e) => e.phraseId)).toEqual(["sooner", "later"]);
    expect(upcomingEntries(deck, NOW).map((e) => e.phraseId)).toEqual(["future"]);
  });
});

describe("exercise picker", () => {
  it("maps boxes to exercise types per spec", () => {
    expect(exerciseTypeFor(1)).toBe("mcq");
    expect(exerciseTypeFor(2)).toBe("mcq");
    expect(exerciseTypeFor(3)).toBe("cloze");
    expect(exerciseTypeFor(4)).toBe("cloze");
    expect(exerciseTypeFor(5)).toBe("freetype");
  });

  it("builds per-box exercises for a catalog phrase", () => {
    const deps = { phrases, phraseById, index: phraseCategoryIndex, captures: {}, rng: seededRng(1) };
    const id = phrases[0].id;
    expect(buildReviewExercise(deckEntry({ phraseId: id, box: 1 }), deps)?.type).toBe("mcq");
    expect(buildReviewExercise(deckEntry({ phraseId: id, box: 3 }), deps)?.type).toBe("cloze");
    expect(buildReviewExercise(deckEntry({ phraseId: id, box: 5 }), deps)?.type).toBe("freetype");
  });

  it("captured phrases always review as free recall; missing captures skip", () => {
    const deps = {
      phrases,
      phraseById,
      index: phraseCategoryIndex,
      captures: { c1: { id: "c1", text: "circle back", note: "", meaningEs: "retomar", createdAt: 1 } },
      rng: seededRng(1),
    };
    const exercise = buildReviewExercise(deckEntry({ phraseId: "c1", source: "custom", box: 1 }), deps);
    expect(exercise?.type).toBe("freetype");
    expect(buildReviewExercise(deckEntry({ phraseId: "gone", source: "custom" }), deps)).toBeNull();
  });

  it("unknown catalog phrases skip", () => {
    const deps = { phrases, phraseById, index: phraseCategoryIndex, captures: {}, rng: seededRng(1) };
    expect(buildReviewExercise(deckEntry({ phraseId: "no-such-phrase" }), deps)).toBeNull();
  });
});

describe("composeCategorySession", () => {
  const seedTopic = topics[0];

  it("starts with the seed topic and stays in its category", () => {
    const plan = composeCategorySession({
      seedTopicId: seedTopic.id,
      content: CONTENT,
      completedTopicIds: new Set(),
      suppressedPhraseIds: new Set(),
      rng: seededRng(3),
    });
    const contentCards = plan.cards.filter((c) => c.kind === "content");
    expect(contentCards[0].scene.topicId).toBe(seedTopic.id);
    const categoryByTopic = new Map(topics.map((t) => [t.id, t.category]));
    for (const card of contentCards) {
      expect(categoryByTopic.get(card.scene.topicId)).toBe(seedTopic.category);
    }
  });

  it("hits 12–15 interactive cards plus the end card", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const plan = composeCategorySession({
        seedTopicId: seedTopic.id,
        content: CONTENT,
        completedTopicIds: new Set(),
        suppressedPhraseIds: new Set(),
        rng: seededRng(seed),
      });
      const interactive = plan.cards.filter((c) => c.kind !== "end");
      expect(interactive.length).toBeGreaterThanOrEqual(12);
      expect(interactive.length).toBeLessThanOrEqual(15);
      expect(plan.cards.at(-1)?.kind).toBe("end");
    }
  });

  it("every checkpoint tests a phrase from an earlier content card, never twice", () => {
    const plan = composeCategorySession({
      seedTopicId: seedTopic.id,
      content: CONTENT,
      completedTopicIds: new Set(),
      suppressedPhraseIds: new Set(),
      rng: seededRng(7),
    });
    const seen = new Set<string>();
    const tested = new Set<string>();
    let checkpoints = 0;
    for (const card of plan.cards) {
      if (card.kind === "content") seen.add(card.scene.phraseId);
      if (card.kind === "checkpoint") {
        checkpoints += 1;
        expect(seen.has(card.exercise.phraseId)).toBe(true);
        expect(tested.has(card.exercise.phraseId)).toBe(false);
        tested.add(card.exercise.phraseId);
      }
    }
    expect(checkpoints).toBeGreaterThanOrEqual(1);
  });

  it("checkpoints sit after gaps of 4–5 content cards", () => {
    const plan = composeCategorySession({
      seedTopicId: seedTopic.id,
      content: CONTENT,
      completedTopicIds: new Set(),
      suppressedPhraseIds: new Set(),
      rng: seededRng(11),
    });
    let gap = 0;
    for (const card of plan.cards) {
      if (card.kind === "content") gap += 1;
      if (card.kind === "checkpoint") {
        expect(gap).toBeGreaterThanOrEqual(4);
        expect(gap).toBeLessThanOrEqual(5);
        gap = 0;
      }
    }
  });

  it("suppressed phrases never appear as content", () => {
    const suppressedId = contentScenes.find((s) => s.topicId === seedTopic.id)!.phraseId;
    const plan = composeCategorySession({
      seedTopicId: seedTopic.id,
      content: CONTENT,
      completedTopicIds: new Set(),
      suppressedPhraseIds: new Set([suppressedId]),
      rng: seededRng(3),
    });
    for (const card of plan.cards) {
      if (card.kind === "content") expect(card.scene.phraseId).not.toBe(suppressedId);
    }
  });

  it("a tiny category yields a short session without crashing", () => {
    const tinyContent: ComposerContent = {
      ...CONTENT,
      topics: [seedTopic],
      scenes: contentScenes.filter((s) => s.topicId === seedTopic.id),
    };
    const plan = composeCategorySession({
      seedTopicId: seedTopic.id,
      content: tinyContent,
      completedTopicIds: new Set(),
      suppressedPhraseIds: new Set(),
      rng: seededRng(3),
    });
    expect(plan.cards.at(-1)?.kind).toBe("end");
    expect(plan.cards.filter((c) => c.kind === "content").length).toBeGreaterThan(0);
  });
});

describe("composeSnackSession", () => {
  function dueDeck(count: number, boxes: Array<DeckEntry["box"]> = [1]): DeckStore {
    const deck: DeckStore = {};
    const ids = phrases.slice(0, count).map((p) => p.id);
    ids.forEach((id, i) => {
      deck[id] = deckEntry({
        phraseId: id,
        box: boxes[i % boxes.length],
        nextReviewAt: NOW - (i + 1) * 1000,
        timesSeen: 1,
      });
    });
    return deck;
  }

  const base = {
    captures: {},
    content: CONTENT,
    completedTopicIds: new Set<string>(),
    now: NOW,
  };

  it("mixes ~60% due reviews with new content at the default target", () => {
    const plan = composeSnackSession({ ...base, deck: dueDeck(20), rng: seededRng(5) });
    const reviews = plan.cards.filter((c) => c.kind === "review");
    const content = plan.cards.filter((c) => c.kind === "content");
    expect(reviews.length).toBe(8); // round(13 * 0.6)
    expect(content.length).toBeGreaterThan(0);
    expect(plan.cards.at(-1)?.kind).toBe("end");
  });

  it("most overdue reviews come first in the queue", () => {
    const plan = composeSnackSession({ ...base, deck: dueDeck(20), rng: seededRng(5) });
    const firstReview = plan.cards.find((c) => c.kind === "review");
    // dueDeck makes later indices MORE overdue, so the last id is most overdue
    expect(firstReview && firstReview.kind === "review" ? firstReview.exercise.phraseId : "").toBe(
      phrases[19].id
    );
  });

  it("zero due → all new content", () => {
    const plan = composeSnackSession({ ...base, deck: {}, rng: seededRng(5) });
    expect(plan.cards.filter((c) => c.kind === "review")).toHaveLength(0);
    expect(plan.cards.filter((c) => c.kind === "content").length).toBeGreaterThan(0);
  });

  it("no unseen content → leans fully into reviews", () => {
    const allSeen: DeckStore = {};
    for (const p of phrases) {
      allSeen[p.id] = deckEntry({ phraseId: p.id, timesSeen: 1, nextReviewAt: NOW - 1000 });
    }
    const plan = composeSnackSession({ ...base, deck: allSeen, rng: seededRng(5) });
    expect(plan.cards.filter((c) => c.kind === "content")).toHaveLength(0);
    expect(plan.cards.filter((c) => c.kind === "review").length).toBeGreaterThanOrEqual(8);
  });

  it("nothing due and nothing new → pulls almost-due to the floor", () => {
    const deck: DeckStore = {};
    for (const p of phrases) {
      deck[p.id] = deckEntry({ phraseId: p.id, timesSeen: 1, nextReviewAt: NOW + (deck ? Object.keys(deck).length + 1 : 1) * 1000 });
    }
    const plan = composeSnackSession({ ...base, deck, rng: seededRng(5) });
    const reviews = plan.cards.filter((c) => c.kind === "review");
    expect(reviews.length).toBeGreaterThanOrEqual(6);
  });

  it("empty deck and every topic completed → end card only", () => {
    const plan = composeSnackSession({
      ...base,
      deck: {},
      completedTopicIds: new Set(topics.map((t) => t.id)),
      rng: seededRng(5),
    });
    expect(plan.cards).toHaveLength(1);
    expect(plan.cards[0].kind).toBe("end");
  });

  it("caps due reviews even with a large backlog", () => {
    const plan = composeSnackSession({ ...base, deck: dueDeck(100), rng: seededRng(5) });
    const interactive = plan.cards.filter((c) => c.kind !== "end");
    expect(interactive.length).toBeLessThanOrEqual(15);
  });

  it("suppressed entries never produce review cards", () => {
    const deck = dueDeck(3);
    for (const id of Object.keys(deck)) deck[id] = { ...deck[id], suppressed: true };
    const plan = composeSnackSession({ ...base, deck, rng: seededRng(5) });
    expect(plan.cards.filter((c) => c.kind === "review")).toHaveLength(0);
  });
});

describe("session run reducer", () => {
  const miniPlan = () =>
    composeCategorySession({
      seedTopicId: topics[0].id,
      content: CONTENT,
      completedTopicIds: new Set(),
      suppressedPhraseIds: new Set(),
      rng: seededRng(3),
    });

  it("advances through content but gates on unanswered exercises", () => {
    let state = initSessionRun(miniPlan());
    const checkpointIndex = state.plan.cards.findIndex((c) => c.kind === "checkpoint");
    for (let i = 0; i < checkpointIndex; i++) {
      state = sessionReducer(state, { type: "advance" });
    }
    expect(state.index).toBe(checkpointIndex);
    state = sessionReducer(state, { type: "advance" }); // gated
    expect(state.index).toBe(checkpointIndex);
    state = sessionReducer(state, {
      type: "answer",
      cardIndex: checkpointIndex,
      phraseId: "p",
      correct: true,
      produced: false,
    });
    state = sessionReducer(state, { type: "advance" });
    expect(state.index).toBe(checkpointIndex + 1);
  });

  it("answers are idempotent and stats add up", () => {
    let state = initSessionRun(miniPlan());
    state = sessionReducer(state, { type: "answer", cardIndex: 4, phraseId: "a", correct: true, produced: false });
    state = sessionReducer(state, { type: "answer", cardIndex: 4, phraseId: "a", correct: false, produced: false });
    state = sessionReducer(state, { type: "save", phraseId: "x" });
    state = sessionReducer(state, { type: "save", phraseId: "x" });
    state = sessionReducer(state, { type: "advance" });
    state = sessionReducer(state, { type: "advance" });
    const stats = computeStats(state);
    expect(stats.recuperadas).toBe(1); // second answer ignored
    expect(stats.guardadas).toBe(1); // duplicate save ignored
    expect(stats.vistas).toBe(2);
  });

  it("reaches the end card and reports finished", () => {
    let state = initSessionRun(miniPlan());
    for (let i = 0; i < state.plan.cards.length * 2; i++) {
      const card = state.plan.cards[state.index];
      if (card.kind === "checkpoint" || card.kind === "review") {
        state = sessionReducer(state, {
          type: "answer",
          cardIndex: state.index,
          phraseId: card.exercise.phraseId,
          correct: true,
          produced: false,
        });
      }
      if (isFinished(state)) break;
      state = sessionReducer(state, { type: "advance" });
    }
    expect(isFinished(state)).toBe(true);
    expect(computeStats(state).vistas).toBeGreaterThan(0);
  });

  it("back navigation floors at zero", () => {
    let state = initSessionRun(miniPlan());
    state = sessionReducer(state, { type: "back" });
    expect(state.index).toBe(0);
  });
});
