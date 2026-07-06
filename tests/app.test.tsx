import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Home from "@/app/page";
import { Feed } from "@/components/Feed";
import { SceneRenderer } from "@/components/SceneRenderer";
import { buildFeed, contentScenes, topicIdByPhraseId } from "@/lib/data/scenes";
import { DEFAULT_TOPIC_IDS, topicById } from "@/lib/data/topics";
import { STORAGE_KEY, emptyEntry, parseStore } from "@/lib/phraseMemory";

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("home / topic grid", () => {
  it("renders the topic grid with the first 4 default topic tiles", () => {
    render(<Home />);
    expect(screen.getByTestId("topic-grid")).toBeDefined();
    expect(screen.getByText("Pick a rabbit hole")).toBeDefined();
    for (const id of DEFAULT_TOPIC_IDS.slice(0, 4)) {
      expect(screen.getByTestId(`topic-tile-${id}`)).toBeDefined();
    }
  });

  it("topic tiles link to their feed", () => {
    render(<Home />);
    const tile = screen.getByTestId("topic-tile-electric-scooters");
    expect(tile.getAttribute("href")).toBe("/feed/electric-scooters");
  });

  it("shows exactly 4 tiles by default and 4 after refresh", () => {
    render(<Home />);
    expect(screen.getAllByTestId(/^topic-tile-/)).toHaveLength(4);

    fireEvent.click(screen.getByTestId("refresh-topics"));
    expect(screen.getAllByTestId(/^topic-tile-/)).toHaveLength(4);
  });

  it("filtering by a level only shows tiles of that level", () => {
    render(<Home />);
    fireEvent.click(screen.getByTestId("filter-level-C2"));
    const tiles = screen.getAllByTestId(/^topic-tile-/);
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      const id = tile.getAttribute("data-testid")!.replace("topic-tile-", "");
      expect(topicById.get(id)!.difficulty).toBe("C2");
    }
  });

  it("filtering by a category only shows tiles of that category", () => {
    render(<Home />);
    fireEvent.click(screen.getByTestId("filter-category-travel"));
    const tiles = screen.getAllByTestId(/^topic-tile-/);
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      const id = tile.getAttribute("data-testid")!.replace("topic-tile-", "");
      expect(topicById.get(id)!.category).toBe("Travel");
    }
  });

  it("combining level + category filters narrows further", () => {
    render(<Home />);
    fireEvent.click(screen.getByTestId("filter-level-C1"));
    fireEvent.click(screen.getByTestId("filter-category-travel"));
    const tiles = screen.getAllByTestId(/^topic-tile-/);
    for (const tile of tiles) {
      const id = tile.getAttribute("data-testid")!.replace("topic-tile-", "");
      const topic = topicById.get(id)!;
      expect(topic.difficulty).toBe("C1");
      expect(topic.category).toBe("Travel");
    }
  });

  it("unselecting a filter restores more results", () => {
    render(<Home />);
    fireEvent.click(screen.getByTestId("filter-level-C2"));
    fireEvent.click(screen.getByTestId("filter-level-C2"));
    expect(screen.getAllByTestId(/^topic-tile-/)).toHaveLength(4);
  });

  it("shows no due-review strip when nothing is scheduled", () => {
    render(<Home />);
    expect(screen.queryByTestId(/^due-review-/)).toBeNull();
  });

  it("surfaces a due phrase and links it back to a feed that teaches it", async () => {
    const entry = { ...emptyEntry("not-worth-it"), nextReviewAt: Date.now() - 1000 };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ "not-worth-it": entry }));
    render(<Home />);
    const chip = await screen.findByTestId("due-review-not-worth-it");
    const topicId = topicIdByPhraseId.get("not-worth-it")!;
    expect(chip.getAttribute("href")).toBe(`/feed/${topicId}`);
  });
});

describe("scene rendering", () => {
  it("all scene types render with the phrase badge", () => {
    for (const scene of contentScenes) {
      const { unmount } = render(<SceneRenderer scene={scene} phraseStatus="new" />);
      const el = screen.getByTestId(`scene-${scene.id}`);
      expect(el.getAttribute("data-scene-type")).toBe(scene.sceneType);
      expect(screen.getByTestId("phrase-badge")).toBeDefined();
      unmount();
    }
  });
});

function renderScooterFeed() {
  const topic = topicById.get("electric-scooters")!;
  const scenes = buildFeed("electric-scooters");
  render(<Feed topic={topic} scenes={scenes} />);
  return scenes;
}

describe("feed navigation", () => {
  it("shows the first scene and advances with keyboard", () => {
    const scenes = renderScooterFeed();
    expect(screen.getByTestId(`scene-${scenes[0].id}`)).toBeDefined();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByTestId(`scene-${scenes[1].id}`)).toBeDefined();
  });

  it("goes back with ArrowUp", () => {
    const scenes = renderScooterFeed();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(screen.getByTestId(`scene-${scenes[0].id}`)).toBeDefined();
  });

  it("navigates via touch swipe", () => {
    const scenes = renderScooterFeed();
    const feed = screen.getByTestId("feed");
    fireEvent.touchStart(feed, { touches: [{ clientX: 200, clientY: 600 }] });
    fireEvent.touchEnd(feed, { changedTouches: [{ clientX: 200, clientY: 200 }] });
    expect(screen.getByTestId(`scene-${scenes[1].id}`)).toBeDefined();
  });

  it("records seen phrases in localStorage", () => {
    const scenes = renderScooterFeed();
    const first = scenes[0];
    const store = parseStore(window.localStorage.getItem(STORAGE_KEY));
    expect(first.type).toBe("content");
    expect(store[first.phraseId]?.timesSeen).toBeGreaterThanOrEqual(1);
  });
});

describe("checkpoint behavior", () => {
  function goToCheckpoint(scenes: ReturnType<typeof buildFeed>) {
    const checkpointIndex = scenes.findIndex((s) => s.type === "checkpoint");
    for (let i = 0; i < checkpointIndex; i++) {
      fireEvent.keyDown(window, { key: "ArrowDown" });
    }
    return scenes[checkpointIndex] as Extract<
      (typeof scenes)[number],
      { type: "checkpoint" }
    >;
  }

  it("blocks next until an answer is selected", () => {
    const scenes = renderScooterFeed();
    const checkpoint = goToCheckpoint(scenes);
    expect(screen.getByTestId(`checkpoint-${checkpoint.id}`)).toBeDefined();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    // still on the checkpoint
    expect(screen.getByTestId(`checkpoint-${checkpoint.id}`)).toBeDefined();
  });

  it("a wrong answer unlocks next without punitive copy", () => {
    const scenes = renderScooterFeed();
    const checkpoint = goToCheckpoint(scenes);
    const wrongIndex = checkpoint.correctIndex === 0 ? 1 : 0;
    fireEvent.click(screen.getByText(checkpoint.options[wrongIndex]));
    expect(screen.getByText(checkpoint.feedbackWrong)).toBeDefined();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.queryByTestId(`checkpoint-${checkpoint.id}`)).toBeNull();
  });

  it("a correct answer unlocks next with calm reinforcement", () => {
    const scenes = renderScooterFeed();
    const checkpoint = goToCheckpoint(scenes);
    fireEvent.click(screen.getByText(checkpoint.options[checkpoint.correctIndex]));
    expect(screen.getByText(checkpoint.feedbackCorrect)).toBeDefined();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.queryByTestId(`checkpoint-${checkpoint.id}`)).toBeNull();
  });

  it("records the attempt in phrase memory", () => {
    const scenes = renderScooterFeed();
    const checkpoint = goToCheckpoint(scenes);
    fireEvent.click(screen.getByText(checkpoint.options[checkpoint.correctIndex]));
    const store = parseStore(window.localStorage.getItem(STORAGE_KEY));
    expect(store[checkpoint.phraseId]?.timesRecalled).toBeGreaterThanOrEqual(1);
    expect(store[checkpoint.phraseId]?.correctCount).toBeGreaterThanOrEqual(1);
  });

  it("survives corrupted localStorage", () => {
    window.localStorage.setItem(STORAGE_KEY, "{{{corrupted");
    const scenes = renderScooterFeed();
    expect(screen.getByTestId(`scene-${scenes[0].id}`)).toBeDefined();
  });
});
