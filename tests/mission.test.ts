import { describe, it, expect } from "vitest";
import { buildMission, checkOffMission, currentMission } from "@/lib/mission";
import { localIsoDate, mondayOfWeek, datesOfWeek } from "@/lib/dates";
import { createCapture } from "@/lib/capture";
import { makeDeckEntry } from "./storage.test";

const WEEK = "2026-07-06";

function producedDeck(ids: string[]) {
  const deck: Record<string, ReturnType<typeof makeDeckEntry>> = {};
  for (const id of ids) {
    deck[id] = makeDeckEntry({ phraseId: id, stage: "recalled" });
  }
  return deck;
}

describe("weekly mission", () => {
  it("returns null when nothing is recalled/usable yet", () => {
    expect(buildMission({}, WEEK)).toBeNull();
    expect(buildMission({ p: makeDeckEntry({ stage: "recognised" }) }, WEEK)).toBeNull();
  });

  it("picks up to 3 recalled phrases, deterministically per week", () => {
    const deck = producedDeck(["a", "b", "c", "d", "e"]);
    const one = buildMission(deck, WEEK)!;
    const two = buildMission(deck, WEEK)!;
    expect(one.phraseIds).toEqual(two.phraseIds);
    expect(one.phraseIds).toHaveLength(3);
    const otherWeek = buildMission(deck, "2026-07-13")!;
    expect(otherWeek.phraseIds).not.toEqual(one.phraseIds);
  });

  it("excludes suppressed and mastered phrases", () => {
    const deck = {
      ...producedDeck(["a"]),
      b: makeDeckEntry({ phraseId: "b", stage: "recalled", suppressed: true }),
      c: makeDeckEntry({ phraseId: "c", stage: "mastered" }),
    };
    const mission = buildMission(deck, WEEK)!;
    expect(mission.phraseIds).toEqual(["a"]);
  });

  it("currentMission keeps this week's stored mission, rolls over stale ones", () => {
    const deck = producedDeck(["a", "b", "c"]);
    const stored = { weekKey: WEEK, phraseIds: ["a"], done: { a: true as const } };
    expect(currentMission(stored, deck, WEEK)).toBe(stored);
    const rolled = currentMission({ ...stored, weekKey: "2026-06-29" }, deck, WEEK)!;
    expect(rolled.weekKey).toBe(WEEK);
    expect(rolled.done).toEqual({});
  });

  it("check-off marks once and ignores foreign phrases", () => {
    const mission = { weekKey: WEEK, phraseIds: ["a", "b", "c"], done: {} };
    const once = checkOffMission(mission, "a");
    expect(once.done.a).toBe(true);
    expect(checkOffMission(once, "a")).toBe(once);
    expect(checkOffMission(once, "zz")).toBe(once);
  });
});

describe("date helpers", () => {
  it("mondayOfWeek lands on a Monday for every day of the week", () => {
    // 2026-07-06 is a Monday.
    expect(mondayOfWeek(new Date(2026, 6, 6))).toBe("2026-07-06");
    expect(mondayOfWeek(new Date(2026, 6, 9))).toBe("2026-07-06"); // Thursday
    expect(mondayOfWeek(new Date(2026, 6, 12))).toBe("2026-07-06"); // Sunday
    expect(mondayOfWeek(new Date(2026, 6, 13))).toBe("2026-07-13"); // next Monday
  });

  it("datesOfWeek spans Monday to Sunday", () => {
    const week = datesOfWeek(new Date(2026, 6, 9));
    expect(week).toHaveLength(7);
    expect(week[0]).toBe("2026-07-06");
    expect(week[6]).toBe("2026-07-12");
  });

  it("localIsoDate formats local dates", () => {
    expect(localIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("quick capture", () => {
  it("builds a trimmed capture with a readable id", () => {
    const capture = createCapture("  circle back  ", " meeting ", " retomar ", 1234);
    expect(capture.text).toBe("circle back");
    expect(capture.note).toBe("meeting");
    expect(capture.meaningEs).toBe("retomar");
    expect(capture.id).toBe("capture-1234-circle-back");
  });
});
