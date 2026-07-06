import { describe, it, expect } from "vitest";
import { contentScenes, checkpointScenes, buildFeed } from "@/lib/data/scenes";
import { CATEGORIES, LEVELS, topics } from "@/lib/data/topics";
import { phraseById, phrases } from "@/lib/data/phrases";
import { phraseAppearsIn, sceneVisibleText } from "@/lib/sceneText";
import { phraseExamples } from "@/lib/exercises/examples";
import { generateCloze } from "@/lib/exercises/cloze";
import type { SceneType } from "@/lib/types";

const ALL_SCENE_TYPES: SceneType[] = [
  "hero_image",
  "editorial_poster",
  "chat",
  "myth_vs_reality",
  "price_breakdown",
  "red_flag",
  "mini_story",
  "decision",
  "checklist",
  "news_alert",
];

const REQUIRED_TOPIC_IDS = [
  "electric-scooters",
  "smart-homes",
  "ai-tools",
  "ux-design",
  "weird-science",
  "travel-hacks",
  "hidden-costs",
  "gadgets",
  "cheap-travel",
  "bad-ux-premium",
];

describe("content requirements", () => {
  it("has at least 10 topic tiles", () => {
    expect(topics.length).toBeGreaterThanOrEqual(10);
  });

  it("has an extended pool of at least 20 topics for the refresh button", () => {
    expect(topics.length).toBeGreaterThanOrEqual(20);
  });

  it("every topic has a non-empty category and a valid B2/C1/C2 level", () => {
    for (const topic of topics) {
      expect(typeof topic.category, `topic ${topic.id}`).toBe("string");
      expect(topic.category.length, `topic ${topic.id}`).toBeGreaterThan(0);
      expect(LEVELS, `topic ${topic.id}`).toContain(topic.difficulty);
    }
  });

  it("CATEGORIES lists every distinct category exactly once", () => {
    const fromTopics = new Set(topics.map((t) => t.category));
    expect(new Set(CATEGORIES)).toEqual(fromTopics);
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
  });

  it("includes every required topic", () => {
    const ids = topics.map((t) => t.id);
    for (const required of REQUIRED_TOPIC_IDS) {
      expect(ids).toContain(required);
    }
  });

  it("has at least 30 content scenes", () => {
    expect(contentScenes.length).toBeGreaterThanOrEqual(30);
  });

  it("has at least 6 checkpoint scenes", () => {
    expect(checkpointScenes.length).toBeGreaterThanOrEqual(6);
  });

  it("has at least 2 examples of every scene type", () => {
    for (const type of ALL_SCENE_TYPES) {
      const count = contentScenes.filter((s) => s.sceneType === type).length;
      expect(count, `sceneType ${type}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("every topic has several scenes", () => {
    for (const topic of topics) {
      const count = contentScenes.filter((s) => s.topicId === topic.id).length;
      expect(count, `topic ${topic.id}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("every scene references a known phrase", () => {
    for (const scene of contentScenes) {
      expect(phraseById.has(scene.phraseId), `scene ${scene.id}`).toBe(true);
    }
    for (const cp of checkpointScenes) {
      expect(phraseById.has(cp.phraseId), `checkpoint ${cp.id}`).toBe(true);
    }
  });

  it("every scene shows its sticky phrase (or accepted variant) in visible text", () => {
    for (const scene of contentScenes) {
      const phrase = phraseById.get(scene.phraseId)!;
      const text = sceneVisibleText(scene);
      expect(phraseAppearsIn(text, phrase), `scene ${scene.id} must contain "${phrase.text}"`).toBe(
        true
      );
    }
  });

  it("topic preview phrases all exist", () => {
    for (const topic of topics) {
      for (const id of topic.previewPhraseIds) {
        expect(phraseById.has(id), `topic ${topic.id} preview ${id}`).toBe(true);
      }
    }
  });

  it("checkpoints have valid options and correct index", () => {
    for (const cp of checkpointScenes) {
      expect(cp.options.length).toBeGreaterThanOrEqual(2);
      expect(cp.correctIndex).toBeGreaterThanOrEqual(0);
      expect(cp.correctIndex).toBeLessThan(cp.options.length);
    }
  });

  it("in every feed, a checkpoint's phrase was seen in an earlier scene", () => {
    for (const topic of topics) {
      const feed = buildFeed(topic.id);
      feed.forEach((scene, i) => {
        if (scene.type !== "checkpoint") return;
        const seenBefore = feed
          .slice(0, i)
          .some((s) => s.type === "content" && s.phraseId === scene.phraseId);
        expect(seenBefore, `checkpoint ${scene.id} in ${topic.id}`).toBe(true);
      });
    }
  });

  it("feeds contain their topic's scenes plus checkpoint", () => {
    const feed = buildFeed("electric-scooters");
    expect(feed.some((s) => s.type === "checkpoint")).toBe(true);
    expect(feed.filter((s) => s.type === "content").length).toBeGreaterThanOrEqual(3);
  });

  it("every example (primary and alternatives) contains the phrase and is cloze-able", () => {
    for (const phrase of phrases) {
      for (const example of phraseExamples(phrase)) {
        expect(
          phraseAppearsIn(example, phrase),
          `phrase "${phrase.text}" must appear in example: ${example}`
        ).toBe(true);
        expect(
          generateCloze(phrase, example),
          `example must be cloze-able for "${phrase.text}": ${example}`
        ).not.toBeNull();
      }
    }
  });
});
