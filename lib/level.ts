import type { CefrBand, LevelState } from "@/lib/types";

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
  };
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
  rng: () => number = Math.random
): LevelState {
  const gain = gainForScore(scorePct);
  let band = level.band;
  let sub = level.sub;

  if (gain > 0) {
    const nb = nextBand(band);
    if (sub >= MAX_SUB && nb) {
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
  };
}

export function markTooltipSeen(level: LevelState): LevelState {
  return level.tooltipSeen ? level : { ...level, tooltipSeen: true };
}
