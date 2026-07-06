import { describe, it, expect } from "vitest";
import { pickRandomTopics, pickTopicsPreferringUnseen } from "@/lib/pickTopics";
import { topics } from "@/lib/data/topics";

describe("pickRandomTopics", () => {
  it("returns the requested count", () => {
    const picked = pickRandomTopics(topics, 10);
    expect(picked).toHaveLength(10);
  });

  it("returns only topics from the pool, with no duplicates", () => {
    const picked = pickRandomTopics(topics, 10);
    const ids = picked.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(topics.some((t) => t.id === id)).toBe(true);
    }
  });

  it("caps at the pool size when count exceeds it", () => {
    const picked = pickRandomTopics(topics.slice(0, 3), 10);
    expect(picked).toHaveLength(3);
  });

  it("produces different selections across calls (statistically)", () => {
    const selections = Array.from({ length: 10 }, () =>
      pickRandomTopics(topics, 10)
        .map((t) => t.id)
        .join(",")
    );
    expect(new Set(selections).size).toBeGreaterThan(1);
  });
});

describe("pickTopicsPreferringUnseen", () => {
  it("never picks a completed topic while enough fresh ones exist", () => {
    const completed = new Set(topics.slice(0, 5).map((t) => t.id));
    for (let i = 0; i < 20; i++) {
      const picked = pickTopicsPreferringUnseen(topics, 4, completed);
      expect(picked.every((t) => !completed.has(t.id))).toBe(true);
    }
  });

  it("falls back to completed topics once the fresh pool runs out", () => {
    const pool = topics.slice(0, 3);
    const completed = new Set(pool.map((t) => t.id));
    const picked = pickTopicsPreferringUnseen(pool, 3, completed);
    expect(picked).toHaveLength(3);
    expect(picked.map((t) => t.id).sort()).toEqual(pool.map((t) => t.id).sort());
  });

  it("only dips into completed topics for as many slots as fresh ones can't fill", () => {
    const pool = topics.slice(0, 5);
    const completed = new Set([pool[0].id, pool[1].id]); // 2 completed, 3 fresh, want 4
    const picked = pickTopicsPreferringUnseen(pool, 4, completed);
    expect(picked).toHaveLength(4);
    const completedInPicked = picked.filter((t) => completed.has(t.id));
    expect(completedInPicked).toHaveLength(1);
  });
});
