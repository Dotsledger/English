import type { DeckEntry, DeckStore } from "@/lib/types";
import { applyReviewResult, intervalForBox } from "@/lib/session/leitner";

/** Pure deck operations — every UI interaction maps to exactly one of these. */

export function freshEntry(phraseId: string, source: DeckEntry["source"]): DeckEntry {
  return {
    phraseId,
    source,
    stage: "seen",
    box: 1,
    inDeck: false,
    suppressed: false,
    timesSeen: 0,
    correctCount: 0,
    wrongCount: 0,
    producedCorrectAtLongBoxes: 0,
    lastSeenAt: null,
    lastAttemptAt: null,
    nextReviewAt: null,
    peekCount: 0,
    lastPeekMs: null,
    addedToDeckAt: null,
    frozen: false,
    producedAt: null,
  };
}

function entryOf(deck: DeckStore, phraseId: string, source: DeckEntry["source"] = "catalog") {
  return deck[phraseId] ?? freshEntry(phraseId, source);
}

export function markSeen(deck: DeckStore, phraseId: string, now: number): DeckStore {
  const entry = entryOf(deck, phraseId);
  return {
    ...deck,
    [phraseId]: { ...entry, timesSeen: entry.timesSeen + 1, lastSeenAt: now },
  };
}

/** Tap on the phrase = save to My Deck. Starts reviewing at box 1 tomorrow. */
export function saveToDeck(
  deck: DeckStore,
  phraseId: string,
  now: number,
  source: DeckEntry["source"] = "catalog"
): DeckStore {
  const entry = entryOf(deck, phraseId, source);
  if (entry.inDeck) return deck;
  return {
    ...deck,
    [phraseId]: {
      ...entry,
      inDeck: true,
      suppressed: false,
      addedToDeckAt: now,
      nextReviewAt: entry.nextReviewAt ?? now + intervalForBox(entry.box),
    },
  };
}

/** "Ya la domino" — out of feeds, out of the queue. Wins over deck entry. */
export function suppressPhrase(deck: DeckStore, phraseId: string, now: number): DeckStore {
  const entry = entryOf(deck, phraseId);
  return {
    ...deck,
    [phraseId]: { ...entry, suppressed: true, lastSeenAt: entry.lastSeenAt ?? now },
  };
}

/** Tap-to-reveal telemetry: how long before the user peeked at the Spanish. */
export function recordPeek(deck: DeckStore, phraseId: string, ms: number): DeckStore {
  const entry = entryOf(deck, phraseId);
  return {
    ...deck,
    [phraseId]: { ...entry, peekCount: entry.peekCount + 1, lastPeekMs: ms },
  };
}

/**
 * A feed-checkpoint answer. In-deck entries get the full Leitner update.
 * Outside the deck: a correct answer advances recognition without starting
 * a schedule; a failed one enters the deck at box 1 (unless suppressed —
 * explicit user intent wins).
 */
export function recordCheckpointResult(
  deck: DeckStore,
  phraseId: string,
  correct: boolean,
  now: number
): DeckStore {
  const entry = entryOf(deck, phraseId);
  if (entry.inDeck && !entry.suppressed) {
    return { ...deck, [phraseId]: applyReviewResult(entry, { correct, produced: false }, now) };
  }
  if (correct) {
    return {
      ...deck,
      [phraseId]: {
        ...entry,
        correctCount: entry.correctCount + 1,
        lastAttemptAt: now,
        stage: entry.stage === "seen" ? "recognised" : entry.stage,
      },
    };
  }
  if (entry.suppressed) {
    return {
      ...deck,
      [phraseId]: { ...entry, wrongCount: entry.wrongCount + 1, lastAttemptAt: now },
    };
  }
  return {
    ...deck,
    [phraseId]: {
      ...entry,
      wrongCount: entry.wrongCount + 1,
      lastAttemptAt: now,
      inDeck: true,
      box: 1,
      addedToDeckAt: now,
      nextReviewAt: now + intervalForBox(1),
    },
  };
}

/** A My Deck review answer (Daily Snack). */
export function recordReviewResult(
  deck: DeckStore,
  phraseId: string,
  result: { correct: boolean; produced: boolean },
  now: number
): DeckStore {
  const entry = entryOf(deck, phraseId);
  return { ...deck, [phraseId]: applyReviewResult(entry, result, now) };
}
