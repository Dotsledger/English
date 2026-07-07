import type { ActivityStore } from "@/lib/types";
import { localIsoDate } from "@/lib/dates";

/**
 * Loss-free, cumulative progress derived entirely from the append-only
 * ActivityStore — no persisted state, no migration. Tiers and best streak are
 * monotonic by construction (the set of active days only grows), so they can
 * never decrease. Purely cosmetic: never touches level/mastery/SRS.
 */

export type StreakTier = "bronce" | "plata" | "oro" | "platino";

const TIER_THRESHOLDS: { tier: StreakTier; days: number }[] = [
  { tier: "platino", days: 180 },
  { tier: "oro", days: 90 },
  { tier: "plata", days: 30 },
  { tier: "bronce", days: 7 },
];

const DAY = 24 * 60 * 60 * 1000;

/** Calendar-day ordinal for a "YYYY-MM-DD" string, via UTC midnight so it's
 * DST-safe (consecutive calendar dates always differ by exactly 1). */
const ordinal = (iso: string) => Math.round(new Date(`${iso}T00:00:00Z`).getTime() / DAY);

export function activeDaysTotal(activity: ActivityStore): number {
  return Object.keys(activity).length;
}

/** Highest tier reached for a given number of lifetime active days, or null. */
export function tierForDays(days: number): StreakTier | null {
  return TIER_THRESHOLDS.find((t) => days >= t.days)?.tier ?? null;
}

export function tierForActivity(activity: ActivityStore): StreakTier | null {
  return tierForDays(activeDaysTotal(activity));
}

/**
 * Consecutive active days ending today or yesterday. 0 if the most recent
 * active day is older than yesterday (a broken streak resets silently — no
 * penalty, no copy).
 */
export function currentStreak(activity: ActivityStore, now: number): number {
  const ords = new Set(Object.keys(activity).map(ordinal));
  const today = ordinal(localIsoDate(new Date(now)));

  let anchor: number | null = null;
  if (ords.has(today)) anchor = today;
  else if (ords.has(today - 1)) anchor = today - 1;
  if (anchor === null) return 0;

  let streak = 0;
  for (let o = anchor; ords.has(o); o -= 1) streak += 1;
  return streak;
}

/** Longest run of consecutive active days ever. Monotonic over the growing set. */
export function bestStreak(activity: ActivityStore): number {
  const ords = Object.keys(activity)
    .map(ordinal)
    .sort((a, b) => a - b);
  if (ords.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < ords.length; i++) {
    run = ords[i] - ords[i - 1] === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}
