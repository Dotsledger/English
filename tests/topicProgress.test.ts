import { describe, it, expect } from "vitest";
import { isCompleted, markCompleted, parseTopicProgress } from "@/lib/topicProgress";

describe("markCompleted / isCompleted", () => {
  it("marks a topic as completed", () => {
    const store = markCompleted({}, "electric-scooters");
    expect(isCompleted(store, "electric-scooters")).toBe(true);
  });

  it("defaults to not completed for unknown topics", () => {
    expect(isCompleted({}, "never-visited")).toBe(false);
  });

  it("marking twice is idempotent", () => {
    const once = markCompleted({}, "electric-scooters");
    const twice = markCompleted(once, "electric-scooters");
    expect(twice).toEqual(once);
  });
});

describe("parseTopicProgress (corruption safety)", () => {
  it("returns empty store for null", () => {
    expect(parseTopicProgress(null)).toEqual({});
  });

  it("returns empty store for invalid JSON", () => {
    expect(parseTopicProgress("{not json")).toEqual({});
  });

  it("returns empty store for non-object JSON", () => {
    expect(parseTopicProgress("[1,2,3]")).toEqual({});
    expect(parseTopicProgress('"hello"')).toEqual({});
  });

  it("drops entries whose value isn't literally true", () => {
    const raw = JSON.stringify({ good: true, bad: "yes", worse: 1 });
    expect(parseTopicProgress(raw)).toEqual({});
  });

  it("keeps a valid all-true store", () => {
    const raw = JSON.stringify({ a: true, b: true });
    expect(parseTopicProgress(raw)).toEqual({ a: true, b: true });
  });
});
