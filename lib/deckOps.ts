import type { Box, DeckEntry, DeckStore, SentenceStore } from "@/lib/types";
import { advanceStage, applyReviewResult, intervalForBox } from "@/lib/session/leitner";

const DAY = 24 * 60 * 60 * 1000;

export type MasteryVerdict = "me_salio" | "regular" | "no_me_salio";

/** Pure deck operations — every UI interaction maps to exactly one of these. */

export function freshEntry(phraseId: string, source: DeckEntry["source"]): DeckEntry {
  return {
    phraseId,
    source,
    stage: "new",
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
    [phraseId]: {
      ...entry,
      // Viewing moves new → seen, and never any higher ("seen ≠ learned").
      stage: advanceStage(entry.stage, "seen"),
      timesSeen: entry.timesSeen + 1,
      lastSeenAt: now,
    },
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
      // Saving a phrase implies you've seen it; never regresses a higher stage.
      stage: advanceStage(entry.stage, "seen"),
      inDeck: true,
      suppressed: false,
      addedToDeckAt: now,
      nextReviewAt: entry.nextReviewAt ?? now + intervalForBox(entry.box),
    },
  };
}

/**
 * Undo an "Add": take the phrase out of the active review queue without
 * destroying its history. Only `inDeck`/`nextReviewAt` change — stage, box,
 * counts and timestamps are preserved, so re-adding later resumes where it
 * left off and nothing in the memory record is corrupted. No-op if the phrase
 * isn't in the deck.
 */
export function removeFromDeck(deck: DeckStore, phraseId: string): DeckStore {
  const entry = deck[phraseId];
  if (!entry || !entry.inDeck) return deck;
  return { ...deck, [phraseId]: { ...entry, inDeck: false, nextReviewAt: null } };
}

/** "Ya la domino" — out of feeds, out of the queue. Wins over deck entry. */
export function suppressPhrase(deck: DeckStore, phraseId: string, now: number): DeckStore {
  const entry = entryOf(deck, phraseId);
  return {
    ...deck,
    [phraseId]: { ...entry, suppressed: true, lastSeenAt: entry.lastSeenAt ?? now },
  };
}

/** Undo a "Ya la domino" (inline undo after the action sheet). */
export function unsuppressPhrase(deck: DeckStore, phraseId: string): DeckStore {
  const entry = deck[phraseId];
  if (!entry) return deck;
  return { ...deck, [phraseId]: { ...entry, suppressed: false } };
}

/** Tap-to-reveal telemetry: how long before the user peeked at the Spanish. */
export function recordPeek(deck: DeckStore, phraseId: string, ms: number): DeckStore {
  const entry = entryOf(deck, phraseId);
  return {
    ...deck,
    [phraseId]: {
      ...entry,
      // Peeking at the Spanish is a form of seeing it.
      stage: advanceStage(entry.stage, "seen"),
      peekCount: entry.peekCount + 1,
      lastPeekMs: ms,
    },
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
        // Recognition in a feed checkpoint → recognised (never higher).
        stage: advanceStage(entry.stage, "recognised"),
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

/**
 * Self-assessed production/situation attempt (mastery gate, Situation card).
 * Calibrated so a single success can't manufacture false mastery from a low
 * box: "Me salió" advances ONE box (cap 5) and reschedules at that box's
 * interval — not a jump to box 5. A production success moves the stage to
 * `usable`; only two production successes at a long box (≥ 4) reach `mastered`
 * ("fluent"). "Regular" → stays put, back in 3 days; "No me salió" → down one
 * box. Stages never regress on a wrong self-grade — only the box drops.
 */
export function recordMasteryResult(
  deck: DeckStore,
  phraseId: string,
  verdict: MasteryVerdict,
  now: number
): DeckStore {
  const entry = { ...entryOf(deck, phraseId), lastAttemptAt: now };
  if (verdict === "me_salio") {
    const startBox = entry.box;
    entry.box = Math.min(startBox + 1, 5) as Box;
    entry.correctCount += 1;
    // One production success is evidence, not proof. From a low box (1–2) it
    // only shows recall, not reliable use → stage caps at `recalled`. `usable`
    // needs prior retrieval history (box 3+). Long-box mastery credit accrues
    // only when the success happened while ALREADY at a long box (≥ 4), so
    // "fluent" still requires repeated spaced production.
    entry.stage = advanceStage(entry.stage, startBox <= 2 ? "recalled" : "usable");
    if (startBox >= 4) {
      entry.producedCorrectAtLongBoxes += 1;
      if (entry.producedCorrectAtLongBoxes >= 2) {
        entry.stage = advanceStage(entry.stage, "mastered");
      }
    }
    entry.producedAt = entry.producedAt ?? now;
    entry.nextReviewAt = now + intervalForBox(entry.box);
  } else if (verdict === "regular") {
    entry.nextReviewAt = now + 3 * DAY;
  } else {
    entry.wrongCount += 1;
    entry.box = Math.max(entry.box - 1, 1) as Box;
    entry.nextReviewAt = now + intervalForBox(entry.box);
  }
  return { ...deck, [phraseId]: entry };
}

/** Appends the user's own sentence to their personal corpus for a phrase. */
export function appendSentence(
  store: SentenceStore,
  phraseId: string,
  text: string,
  now: number
): SentenceStore {
  const trimmed = text.trim();
  if (trimmed.length === 0) return store;
  const list = store[phraseId] ?? [];
  return { ...store, [phraseId]: [...list, { text: trimmed, createdAt: now }] };
}
