import { describe, it, expect } from "vitest";
import { pickRandomTopics } from "@/lib/pickTopics";
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
