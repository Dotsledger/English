import type { Box, DeckEntry, PhraseStage } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

/** Days until the next review for each Leitner box (index = box - 1). */
export const BOX_INTERVALS_DAYS = [1, 3, 7, 16, 35] as const;

export function intervalForBox(box: Box): number {
  return BOX_INTERVALS_DAYS[box - 1] * DAY;
}

const STAGE_RANK: Record<PhraseStage, number> = {
  new: 0,
  seen: 1,
  recognised: 2,
  recalled: 3,
  usable: 4,
  mastered: 5,
};

/** Raise a stage toward `to`, never lowering it (upgrades only). */
export function advanceStage(current: PhraseStage, to: PhraseStage): PhraseStage {
  return STAGE_RANK[to] > STAGE_RANK[current] ? to : current;
}

/**
 * Applies a retrieval result: correct → box +1 (cap 5), wrong → box −1
 * (floor 1), reschedule at the new box's interval. Stages only ever
 * advance (never regress on a wrong answer — only boxes drop), and only
 * through retrieval: recognition (MCQ) correct → recognised; recall
 * (cloze / reverse) correct → recalled. Reaching "usable"/"mastered"
 * requires self-generated *production*, handled by the mastery gate
 * (recordMasteryResult), not by scaffolded recall here.
 */
export function applyReviewResult(
  entry: DeckEntry,
  result: { correct: boolean; produced: boolean },
  now: number
): DeckEntry {
  const next: DeckEntry = { ...entry, lastAttemptAt: now };
  if (result.correct) {
    next.correctCount += 1;
    next.box = Math.min(entry.box + 1, 5) as Box;
    if (result.produced) {
      // Recall with a prompt/scaffold (cloze, reverse) → recalled.
      next.stage = advanceStage(next.stage, "recalled");
      // Stamp the first time this phrase reaches "recalled" (weekly recap).
      if (next.stage === "recalled" && (entry.producedAt ?? null) === null) {
        next.producedAt = now;
      }
    } else {
      next.stage = advanceStage(next.stage, "recognised");
    }
  } else {
    next.wrongCount += 1;
    next.box = Math.max(entry.box - 1, 1) as Box;
  }
  next.nextReviewAt = now + intervalForBox(next.box);
  return next;
}

/** Weekly-mission boost: jump one box. No mastery-counter credit — that
 * requires actual production reviews. */
export function jumpBox(entry: DeckEntry, now: number): DeckEntry {
  const box = Math.min(entry.box + 1, 5) as Box;
  return { ...entry, box, nextReviewAt: now + intervalForBox(box) };
}

/** Deck entries whose review is due, most overdue first. Frozen items
 * (backlog triage) are parked out of every due count and queue. */
export function dueEntries(
  deck: Record<string, DeckEntry>,
  now: number
): DeckEntry[] {
  return Object.values(deck)
    .filter(
      (e) =>
        e.inDeck &&
        !e.suppressed &&
        !e.frozen &&
        e.nextReviewAt !== null &&
        e.nextReviewAt <= now
    )
    .sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0));
}

/** Not yet due, soonest first — the "almost due" pool for thin snacks. */
export function upcomingEntries(
  deck: Record<string, DeckEntry>,
  now: number
): DeckEntry[] {
  return Object.values(deck)
    .filter(
      (e) =>
        e.inDeck &&
        !e.suppressed &&
        !e.frozen &&
        e.nextReviewAt !== null &&
        e.nextReviewAt > now
    )
    .sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0));
}
