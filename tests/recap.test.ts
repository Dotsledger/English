import { describe, it, expect } from "vitest";
import type { DeckStore } from "@/lib/types";
import { buildRecap, shouldShowRecap } from "@/lib/recap";
import { makeDeckEntry } from "./storage.test";

// 2026-07-06 is a Monday; the "week that just ended" is 2026-06-29..07-05.
const MONDAY = new Date(2026, 6, 6, 10, 0, 0).getTime();
const TUESDAY = new Date(2026, 6, 7, 10, 0, 0).getTime();
const lastWeek = (dayOffset: number) =>
  new Date(2026, 5, 29 + dayOffset, 12, 0, 0).getTime(); // 06-29 + offset

const index = new Map<string, Set<string>>([
  ["p1", new Set(["Travel"])],
  ["p2", new Set(["Travel"])],
  ["p3", new Set(["Sports"])],
]);

describe("buildRecap", () => {
  it("counts active days, produced phrases and the top category from last week", () => {
    const activity = { "2026-06-29": true as const, "2026-07-01": true as const, "2026-07-06": true as const };
    const deck: DeckStore = {
      p1: makeDeckEntry({ phraseId: "p1", producedAt: lastWeek(0), lastAttemptAt: lastWeek(0) }),
      p2: makeDeckEntry({ phraseId: "p2", producedAt: lastWeek(2), lastAttemptAt: lastWeek(2) }),
      p3: makeDeckEntry({ phraseId: "p3", lastAttemptAt: lastWeek(1) }),
    };
    const recap = buildRecap(deck, activity, index, MONDAY);
    expect(recap.weekKey).toBe("2026-06-29");
    expect(recap.activeDays).toBe(2); // 06-29 and 07-01; 07-06 is this week
    expect(recap.produced).toBe(2);
    expect(recap.topCategory).toBe("Travel"); // p1+p2 vs p3
  });

  it("ignores this-week activity and produced-before-last-week", () => {
    const deck: DeckStore = {
      old: makeDeckEntry({ phraseId: "p1", producedAt: new Date(2026, 5, 1).getTime(), lastAttemptAt: MONDAY }),
    };
    const recap = buildRecap(deck, { "2026-07-06": true }, index, MONDAY);
    expect(recap.produced).toBe(0);
    expect(recap.activeDays).toBe(0);
  });
});

describe("shouldShowRecap", () => {
  const recap = { weekKey: "2026-06-29", activeDays: 3, produced: 2, topCategory: "Travel" };

  it("shows on Monday when unacknowledged and there is something to show", () => {
    expect(shouldShowRecap(recap, undefined, MONDAY)).toBe(true);
  });

  it("does not show on a non-Monday", () => {
    expect(shouldShowRecap(recap, undefined, TUESDAY)).toBe(false);
  });

  it("does not show once acknowledged for that week", () => {
    expect(shouldShowRecap(recap, "2026-06-29", MONDAY)).toBe(false);
  });

  it("does not show an empty week", () => {
    const empty = { weekKey: "2026-06-29", activeDays: 0, produced: 0, topCategory: null };
    expect(shouldShowRecap(empty, undefined, MONDAY)).toBe(false);
  });
});
