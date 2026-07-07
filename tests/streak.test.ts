import { describe, it, expect } from "vitest";
import type { ActivityStore } from "@/lib/types";
import {
  activeDaysTotal,
  bestStreak,
  currentStreak,
  tierForActivity,
  tierForDays,
  type StreakTier,
} from "@/lib/streak";
import { localIsoDate } from "@/lib/dates";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 6, 7, 12, 0, 0).getTime();
const iso = (offsetDays: number) => localIsoDate(new Date(NOW - offsetDays * DAY));

const activityFromOffsets = (offsets: number[]): ActivityStore => {
  const a: ActivityStore = {};
  for (const o of offsets) a[iso(o)] = true;
  return a;
};

const TIER_RANK: Record<StreakTier, number> = { bronce: 1, plata: 2, oro: 3, platino: 4 };
const rank = (t: StreakTier | null) => (t ? TIER_RANK[t] : 0);

describe("tierForDays", () => {
  it("maps lifetime active days to tiers at the exact thresholds", () => {
    expect(tierForDays(0)).toBeNull();
    expect(tierForDays(6)).toBeNull();
    expect(tierForDays(7)).toBe("bronce");
    expect(tierForDays(29)).toBe("bronce");
    expect(tierForDays(30)).toBe("plata");
    expect(tierForDays(89)).toBe("plata");
    expect(tierForDays(90)).toBe("oro");
    expect(tierForDays(179)).toBe("oro");
    expect(tierForDays(180)).toBe("platino");
    expect(tierForDays(9999)).toBe("platino");
  });
});

describe("never-decreasing invariant (critical)", () => {
  it("tier and best streak never drop as active days accumulate", () => {
    const activity: ActivityStore = {};
    let prevTierRank = 0;
    let prevBest = 0;
    // Add 200 days in a deliberately jumbled order (gaps then fills).
    const order = Array.from({ length: 200 }, (_, i) => (i * 73) % 200);
    for (const offset of order) {
      activity[iso(offset)] = true;
      const t = rank(tierForActivity(activity));
      const b = bestStreak(activity);
      expect(t).toBeGreaterThanOrEqual(prevTierRank);
      expect(b).toBeGreaterThanOrEqual(prevBest);
      prevTierRank = t;
      prevBest = b;
    }
    expect(tierForActivity(activity)).toBe("platino"); // 200 distinct days
    expect(bestStreak(activity)).toBe(200); // all filled → one long run
  });
});

describe("currentStreak", () => {
  it("counts a consecutive run ending today", () => {
    expect(currentStreak(activityFromOffsets([0, 1, 2, 3]), NOW)).toBe(4);
  });

  it("counts a run ending yesterday when today isn't active yet", () => {
    expect(currentStreak(activityFromOffsets([1, 2, 3]), NOW)).toBe(3);
  });

  it("resets silently to 0 when the last active day is older than yesterday", () => {
    expect(currentStreak(activityFromOffsets([3, 4, 5]), NOW)).toBe(0);
  });

  it("is 0 for empty activity and 1 for a single day today", () => {
    expect(currentStreak({}, NOW)).toBe(0);
    expect(currentStreak(activityFromOffsets([0]), NOW)).toBe(1);
  });
});

describe("bestStreak", () => {
  it("returns the longest consecutive run", () => {
    // run of 5 long ago, plus a broken recent day
    expect(bestStreak(activityFromOffsets([20, 21, 22, 23, 24, 0]))).toBe(5);
  });

  it("survives a broken current streak (best stays, current drops)", () => {
    const activity = activityFromOffsets([10, 11, 12, 13, 0]); // 4-run past + today alone
    expect(bestStreak(activity)).toBe(4);
    expect(currentStreak(activity, NOW)).toBe(1);
  });

  it("counts total active days independently of runs", () => {
    expect(activeDaysTotal(activityFromOffsets([0, 5, 10]))).toBe(3);
    expect(bestStreak(activityFromOffsets([0, 5, 10]))).toBe(1);
  });
});
