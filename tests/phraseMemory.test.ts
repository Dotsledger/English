import { describe, it, expect } from "vitest";
import {
  emptyEntry,
  parseStore,
  recordAttempt,
  recordSeen,
  statusOf,
} from "@/lib/phraseMemory";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_750_000_000_000;

describe("recordSeen", () => {
  it("increments timesSeen and sets lastSeenAt", () => {
    const seen = new Set<string>();
    const store = recordSeen({}, "not-worth-it", "scene-1", seen, NOW);
    expect(store["not-worth-it"].timesSeen).toBe(1);
    expect(store["not-worth-it"].lastSeenAt).toBe(NOW);
    expect(store["not-worth-it"].status).toBe("seen");
  });

  it("does not double-count the same scene in one session", () => {
    const seen = new Set<string>();
    let store = recordSeen({}, "not-worth-it", "scene-1", seen, NOW);
    store = recordSeen(store, "not-worth-it", "scene-1", seen, NOW + 1000);
    expect(store["not-worth-it"].timesSeen).toBe(1);
  });

  it("counts different scenes with the same phrase", () => {
    const seen = new Set<string>();
    let store = recordSeen({}, "not-worth-it", "scene-1", seen, NOW);
    store = recordSeen(store, "not-worth-it", "scene-2", seen, NOW + 1000);
    expect(store["not-worth-it"].timesSeen).toBe(2);
  });
});

describe("recordAttempt", () => {
  it("schedules +1 day after the first correct answer", () => {
    const store = recordAttempt({}, "not-worth-it", true, NOW);
    const entry = store["not-worth-it"];
    expect(entry.correctCount).toBe(1);
    expect(entry.timesRecalled).toBe(1);
    expect(entry.nextReviewAt).toBe(NOW + 1 * DAY);
    expect(entry.status).toBe("learning");
  });

  it("schedules +3 days after the second correct, +7 after the third", () => {
    let store = recordAttempt({}, "p", true, NOW);
    store = recordAttempt(store, "p", true, NOW);
    expect(store["p"].nextReviewAt).toBe(NOW + 3 * DAY);
    expect(store["p"].status).toBe("familiar");
    store = recordAttempt(store, "p", true, NOW);
    expect(store["p"].nextReviewAt).toBe(NOW + 7 * DAY);
    expect(store["p"].status).toBe("strong");
  });

  it("schedules a wrong answer back in ~5 minutes and lowers confidence", () => {
    let store = recordAttempt({}, "p", true, NOW);
    const confidenceAfterCorrect = store["p"].confidenceScore;
    store = recordAttempt(store, "p", false, NOW);
    expect(store["p"].wrongCount).toBe(1);
    expect(store["p"].nextReviewAt).toBe(NOW + 5 * 60 * 1000);
    expect(store["p"].confidenceScore).toBeLessThan(confidenceAfterCorrect);
  });
});

describe("parseStore (corruption safety)", () => {
  it("returns empty store for null", () => {
    expect(parseStore(null)).toEqual({});
  });

  it("returns empty store for invalid JSON", () => {
    expect(parseStore("{not json")).toEqual({});
  });

  it("returns empty store for non-object JSON", () => {
    expect(parseStore("[1,2,3]")).toEqual({});
    expect(parseStore('"hello"')).toEqual({});
  });

  it("drops malformed entries but keeps valid ones", () => {
    const valid = emptyEntry("good");
    const raw = JSON.stringify({ good: valid, bad: { nonsense: true } });
    const store = parseStore(raw);
    expect(store["good"]).toBeDefined();
    expect(store["bad"]).toBeUndefined();
  });
});

describe("statusOf", () => {
  it("defaults to new for unknown phrases", () => {
    expect(statusOf({}, "never-seen")).toBe("new");
  });
});
