import type { DeckEntry, DeckStore, TriageStore } from "@/lib/types";
import { localIsoDate } from "@/lib/dates";

/**
 * Abandonment-proof SRS survival layer (Feature 1). Classic Leitner turns
 * absence into a growing wall of overdue reviews — the top abandonment
 * trigger. These pure helpers cap visible debt, prioritise a gentle
 * comeback, and freeze/thaw overflow so a break never produces a backlog.
 */

/** Never surface more than this many due phrases to the user. */
export const DISPLAY_CAP = 8;
/** Above this many active due items, overflow is frozen out of sight. */
export const FREEZE_CAP = 25;
/** Only thaw once the active queue has been cleared to (at most) this. */
export const THAW_WHEN_ACTIVE_AT_MOST = 10;
/** Frozen items reintroduced per calendar day. */
export const THAW_PER_DAY = 3;
/** Days of silence after which the home screen switches to comeback mode. */
export const COMEBACK_AFTER_DAYS = 4;
/** Size of the comeback micro-session. */
export const COMEBACK_SIZE = 5;

const DAY = 24 * 60 * 60 * 1000;

/** The number to *show* — the raw count is never displayed. */
export function displayedDueCount(rawCount: number): number {
  return Math.min(rawCount, DISPLAY_CAP);
}

const isActiveDue = (e: DeckEntry, now: number) =>
  e.inDeck && !e.suppressed && !e.frozen && e.nextReviewAt !== null && e.nextReviewAt <= now;

/** Whole days since the most recent active day, or null if never active. */
export function daysSinceLastActivity(
  activity: Record<string, true>,
  now: number
): number | null {
  const days = Object.keys(activity).sort();
  const last = days[days.length - 1];
  if (!last) return null;
  const lastMs = new Date(`${last}T00:00:00`).getTime();
  const todayMs = new Date(`${localIsoDate(new Date(now))}T00:00:00`).getTime();
  return Math.max(0, Math.round((todayMs - lastMs) / DAY));
}

/** Due entries ranked by value = highest box first (most invested, closest
 * to being lost), tie-broken by most overdue. Used by comeback mode. */
export function valuableDue(deck: DeckStore, now: number, limit: number): DeckEntry[] {
  return Object.values(deck)
    .filter((e) => isActiveDue(e, now))
    .sort((a, b) => b.box - a.box || (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0))
    .slice(0, limit);
}

/**
 * Freezes overflow when the active due queue exceeds FREEZE_CAP (oldest
 * low-box items first — least invested, so least missed), then thaws up to
 * THAW_PER_DAY items (highest box first) once the queue is cleared to
 * THAW_WHEN_ACTIVE_AT_MOST. Pure: returns new deck + triage, never mutates.
 */
export function reconcileTriage(
  deck: DeckStore,
  triage: TriageStore,
  now: number
): { deck: DeckStore; triage: TriageStore } {
  const today = localIsoDate(new Date(now));
  let nextDeck = deck;
  let nextTriage = triage;

  const activeDue = () => Object.values(nextDeck).filter((e) => isActiveDue(e, now));

  // Freeze overflow: park the least-invested overdue items.
  const due = activeDue();
  if (due.length > FREEZE_CAP) {
    const toFreeze = [...due]
      .sort((a, b) => a.box - b.box || (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0))
      .slice(0, due.length - FREEZE_CAP);
    const frozenIds = new Set(toFreeze.map((e) => e.phraseId));
    nextDeck = Object.fromEntries(
      Object.entries(nextDeck).map(([id, e]) =>
        frozenIds.has(id) ? [id, { ...e, frozen: true }] : [id, e]
      )
    );
  }

  // Thaw gradually, but only once the user has cleared the active queue.
  const frozen = Object.values(nextDeck).filter(
    (e) => e.inDeck && !e.suppressed && e.frozen
  );
  if (frozen.length > 0 && activeDue().length <= THAW_WHEN_ACTIVE_AT_MOST) {
    const usedToday = triage.lastThawDate === today ? triage.thawedToday : 0;
    const budget = Math.max(0, THAW_PER_DAY - usedToday);
    if (budget > 0) {
      const toThaw = [...frozen]
        .sort((a, b) => b.box - a.box || (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0))
        .slice(0, budget);
      const thawIds = new Set(toThaw.map((e) => e.phraseId));
      nextDeck = Object.fromEntries(
        Object.entries(nextDeck).map(([id, e]) =>
          thawIds.has(id) ? [id, { ...e, frozen: false }] : [id, e]
        )
      );
      // Spread to preserve unrelated fields (e.g. recapAckedWeek).
      nextTriage = { ...triage, lastThawDate: today, thawedToday: usedToday + toThaw.length };
    }
  }

  return { deck: nextDeck, triage: nextTriage };
}
