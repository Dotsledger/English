import type { CefrBand, LevelState } from "@/lib/types";
import { localIsoDate } from "@/lib/dates";

/**
 * Internal progress score (NOT a CEFR certification). A continuous scale of
 * sublevels 0..10 within each band: B2.0 → B2.10 → C1.0 → … → C2.10. The
 * score NEVER decreases — a weak check holds it flat, never drops it — and
 * it never gates content; it's a badge, not an unlock.
 */

const BANDS: CefrBand[] = ["B2", "C1", "C2"];
const MAX_SUB = 10;
const MIN_THRESHOLD = 50;
const MAX_THRESHOLD = 60;
/** Each correct "stretch" (next-band) item nudges the gain by this much… */
const STRETCH_BONUS_PER_CORRECT = 1;
/** …up to this cap. A bonus alone can never cross a band (see applyCheckResult). */
const STRETCH_BONUS_CAP = 2;

export function nextBand(band: CefrBand): CefrBand | null {
  const i = BANDS.indexOf(band);
  return i >= 0 && i < BANDS.length - 1 ? BANDS[i + 1] : null;
}

function rollThreshold(rng: () => number = Math.random): number {
  return MIN_THRESHOLD + Math.floor(rng() * (MAX_THRESHOLD - MIN_THRESHOLD + 1));
}

export function initialLevel(rng: () => number = () => 0.5): LevelState {
  return {
    band: "B2",
    sub: 0,
    cardsSinceCheck: 0,
    checkThreshold: rollThreshold(rng),
    history: [],
    tooltipSeen: false,
    lastDismissedAt: null,
  };
}

/** Bonus stretch items add to the sublevel gain (never negative, capped). */
export function stretchBonus(stretchCorrect: number): number {
  return Math.min(Math.max(stretchCorrect, 0) * STRETCH_BONUS_PER_CORRECT, STRETCH_BONUS_CAP);
}

export function formatLevel(level: Pick<LevelState, "band" | "sub">): string {
  return `${level.band}.${level.sub}`;
}

/** Counts a newly-seen content card toward the next milestone. */
export function bumpCardsSeen(level: LevelState, n = 1): LevelState {
  return { ...level, cardsSinceCheck: level.cardsSinceCheck + n };
}

export function isCheckAvailable(level: LevelState): boolean {
  return level.cardsSinceCheck >= level.checkThreshold;
}

/**
 * Whether to actually surface the opt-in offer card: available AND not
 * dismissed earlier the same calendar day (so "Ahora no" gives a day's
 * rest instead of re-offering on the very next session).
 */
export function shouldOfferCheck(level: LevelState, now: number): boolean {
  if (!isCheckAvailable(level)) return false;
  const dismissed = level.lastDismissedAt ?? null;
  if (dismissed === null) return true;
  return localIsoDate(new Date(dismissed)) !== localIsoDate(new Date(now));
}

/** Records an "Ahora no" dismissal, suppressing the offer for the rest of the day. */
export function dismissCheck(level: LevelState, now: number): LevelState {
  return { ...level, lastDismissedAt: now };
}

/** Sublevel gain from a check score: never negative. */
export function gainForScore(scorePct: number): number {
  if (scorePct >= 85) return 4;
  if (scorePct >= 60) return 1;
  return 0;
}

/**
 * Applies a check result. Movement is monotonic: a gain caps at .10 within
 * a band, and only crosses into the next band's .0 when starting from .10
 * (so "B2.10 → C1.0"). C2.10 is the ceiling. Resets the milestone counter
 * and re-rolls the threshold, and records history.
 */
export function applyCheckResult(
  level: LevelState,
  scorePct: number,
  now: number,
  rng: () => number = Math.random,
  stretchCorrect = 0
): LevelState {
  // scorePct is the CORE score (retention + production); stretch items only
  // add an optional bonus and never drag the score down.
  const baseGain = gainForScore(scorePct);
  const bonus = stretchBonus(stretchCorrect);
  const gain = baseGain + bonus;
  let band = level.band;
  let sub = level.sub;

  if (gain > 0) {
    const nb = nextBand(band);
    // Only a genuine core pass may cross a band — a bonus alone never does.
    if (sub >= MAX_SUB && nb && baseGain > 0) {
      band = nb;
      sub = 0;
    } else {
      sub = Math.min(sub + gain, MAX_SUB);
    }
  }

  return {
    ...level,
    band,
    sub,
    cardsSinceCheck: 0,
    checkThreshold: rollThreshold(rng),
    history: [...level.history, { at: now, band, sub, score: scorePct }],
    lastDismissedAt: null, // completing clears any prior dismissal
  };
}

export function markTooltipSeen(level: LevelState): LevelState {
  return level.tooltipSeen ? level : { ...level, tooltipSeen: true };
}
