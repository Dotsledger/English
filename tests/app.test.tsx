import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import Home from "@/app/page";
import { AppStateProvider, resetMigrationForTests } from "@/components/AppStateProvider";
import { SessionPlayer } from "@/components/SessionPlayer";
import { SceneRenderer } from "@/components/SceneRenderer";
import { TopicTile } from "@/components/TopicTile";
import { contentScenes, checkpointScenes } from "@/lib/data/scenes";
import { DEFAULT_TOPIC_IDS, topicById, topics } from "@/lib/data/topics";
import { phrases, phraseById } from "@/lib/data/phrases";
import { phraseCategoryIndex } from "@/lib/exercises/phraseIndex";
import {
  composeCategorySession,
  type ComposerContent,
} from "@/lib/session/composeCategorySession";
import { STORAGE_KEY, emptyEntry } from "@/lib/phraseMemory";
import { TOPIC_PROGRESS_KEY } from "@/lib/topicProgress";
import { resetBackendForTests } from "@/lib/storage/backend";
import { flushWrites } from "@/lib/storage/writeQueue";
import { parseActivity, parseDeck, parseTopics } from "@/lib/storage/docs";
import { KEY_ACTIVITY, KEY_DECK, KEY_TOPICS } from "@/lib/storage/keys";

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
  resetBackendForTests();
  resetMigrationForTests();
});

afterEach(async () => {
  await flushWrites();
});

function seededRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CONTENT: ComposerContent = {
  topics,
  scenes: contentScenes,
  authoredCheckpoints: checkpointScenes,
  phrases,
  phraseById,
  index: phraseCategoryIndex,
};

function renderHome() {
  return render(
    <AppStateProvider>
      <Home />
    </AppStateProvider>
  );
}

describe("home / topic grid", () => {
  it("renders the topic grid with the first 4 default topic tiles", () => {
    renderHome();
    expect(screen.getByTestId("topic-grid")).toBeDefined();
    expect(screen.getByText("Pick a rabbit hole")).toBeDefined();
    for (const id of DEFAULT_TOPIC_IDS.slice(0, 4)) {
      expect(screen.getByTestId(`topic-tile-${id}`)).toBeDefined();
    }
  });

  it("topic tiles link to their feed", () => {
    renderHome();
    const tile = screen.getByTestId("topic-tile-electric-scooters");
    expect(tile.getAttribute("href")).toBe("/feed/electric-scooters");
  });

  it("shows exactly 4 tiles by default and 4 after refresh", () => {
    renderHome();
    expect(screen.getAllByTestId(/^topic-tile-/)).toHaveLength(4);

    fireEvent.click(screen.getByTestId("refresh-topics"));
    expect(screen.getAllByTestId(/^topic-tile-/)).toHaveLength(4);
  });

  it("filtering by a level only shows tiles of that level", () => {
    renderHome();
    fireEvent.click(screen.getByTestId("filter-level-C2"));
    const tiles = screen.getAllByTestId(/^topic-tile-/);
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      const id = tile.getAttribute("data-testid")!.replace("topic-tile-", "");
      expect(topicById.get(id)!.difficulty).toBe("C2");
    }
  });

  it("filtering by a category only shows tiles of that category", () => {
    renderHome();
    fireEvent.click(screen.getByTestId("filter-category-travel"));
    const tiles = screen.getAllByTestId(/^topic-tile-/);
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      const id = tile.getAttribute("data-testid")!.replace("topic-tile-", "");
      expect(topicById.get(id)!.category).toBe("Travel");
    }
  });

  it("unselecting a filter restores more results", () => {
    renderHome();
    fireEvent.click(screen.getByTestId("filter-level-C2"));
    fireEvent.click(screen.getByTestId("filter-level-C2"));
    expect(screen.getAllByTestId(/^topic-tile-/)).toHaveLength(4);
  });

  it("shows the Daily Snack button and no due CTA when nothing is due", async () => {
    renderHome();
    expect(screen.getByTestId("daily-snack").getAttribute("href")).toBe("/snack");
    await waitFor(() => {
      expect(screen.queryByTestId("due-cta")).toBeNull();
    });
  });

  it("surfaces a due CTA linking to the snack when reviews are waiting", async () => {
    // A v1 entry with a past nextReviewAt migrates into a due v2 deck entry.
    const entry = {
      ...emptyEntry("not-worth-it"),
      timesSeen: 1,
      timesRecalled: 1,
      correctCount: 1,
      confidenceScore: 1,
      nextReviewAt: Date.now() - 1000,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ "not-worth-it": entry }));
    renderHome();
    const cta = await screen.findByTestId("due-cta");
    expect(cta.getAttribute("href")).toBe("/snack");
    expect(cta.textContent).toContain("lista para repasar");
  });

  it("switches to the comeback CTA after a long absence", async () => {
    const entry = {
      ...emptyEntry("not-worth-it"),
      timesSeen: 1,
      timesRecalled: 1,
      correctCount: 1,
      confidenceScore: 1,
      nextReviewAt: Date.now() - 1000,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ "not-worth-it": entry }));
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const iso = `${fiveDaysAgo.getFullYear()}-${String(fiveDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(fiveDaysAgo.getDate()).padStart(2, "0")}`;
    window.localStorage.setItem(KEY_ACTIVITY, JSON.stringify({ [iso]: true }));
    renderHome();
    const cta = await screen.findByTestId("comeback-cta");
    expect(cta.getAttribute("href")).toBe("/comeback");
    expect(screen.queryByTestId("due-cta")).toBeNull();
  });

  it("swaps out a default topic that's already been completed", async () => {
    window.localStorage.setItem(TOPIC_PROGRESS_KEY, JSON.stringify({ "electric-scooters": true }));
    renderHome();
    await waitFor(() => {
      expect(screen.queryByTestId("topic-tile-electric-scooters")).toBeNull();
    });
    expect(screen.getAllByTestId(/^topic-tile-/)).toHaveLength(4);
  });
});

describe("topic completion badge", () => {
  it("shows a checkmark for a completed topic", () => {
    const topic = topicById.get("electric-scooters")!;
    render(<TopicTile topic={topic} completed />);
    expect(screen.getByTestId("topic-completed-badge")).toBeDefined();
  });

  it("hides the checkmark for a not-yet-completed topic", () => {
    const topic = topicById.get("electric-scooters")!;
    render(<TopicTile topic={topic} />);
    expect(screen.queryByTestId("topic-completed-badge")).toBeNull();
  });
});

describe("scene rendering", () => {
  it("all scene types render with the phrase badge and hidden translation", () => {
    for (const scene of contentScenes.slice(0, 40)) {
      const { unmount } = render(<SceneRenderer scene={scene} stage="new" saved={false} />);
      const el = screen.getByTestId(`scene-${scene.id}`);
      expect(el.getAttribute("data-scene-type")).toBe(scene.sceneType);
      expect(screen.getByTestId("phrase-badge")).toBeDefined();
      expect(screen.queryByTestId("phrase-meaning")).toBeNull();
      expect(screen.getByTestId("reveal-meaning")).toBeDefined();
      unmount();
    }
  });

  it("tapping reveal shows the Spanish meaning", () => {
    const scene = contentScenes[0];
    render(<SceneRenderer scene={scene} stage="new" saved={false} />);
    fireEvent.click(screen.getByTestId("reveal-meaning"));
    expect(screen.getByTestId("phrase-meaning")).toBeDefined();
  });
});

function renderSession(seed = 3) {
  const plan = composeCategorySession({
    seedTopicId: "electric-scooters",
    content: CONTENT,
    completedTopicIds: new Set(),
    suppressedPhraseIds: new Set(),
    rng: seededRng(seed),
  });
  render(
    <AppStateProvider>
      <SessionPlayer title="Test session" plan={plan} onAnotherRound={() => {}} />
    </AppStateProvider>
  );
  return plan;
}

function sceneIdAt(plan: ReturnType<typeof composeCategorySession>, index: number): string {
  const card = plan.cards[index];
  if (card.kind !== "content") throw new Error("expected content card");
  return card.scene.id;
}

describe("session player navigation", () => {
  it("shows the first scene and advances with keyboard", () => {
    const plan = renderSession();
    expect(screen.getByTestId(`scene-${sceneIdAt(plan, 0)}`)).toBeDefined();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByTestId(`scene-${sceneIdAt(plan, 1)}`)).toBeDefined();
  });

  it("goes back with ArrowUp", () => {
    const plan = renderSession();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(screen.getByTestId(`scene-${sceneIdAt(plan, 0)}`)).toBeDefined();
  });

  it("navigates via touch swipe", () => {
    const plan = renderSession();
    const feed = screen.getByTestId("feed");
    fireEvent.touchStart(feed, { touches: [{ clientX: 200, clientY: 600 }] });
    fireEvent.touchEnd(feed, { changedTouches: [{ clientX: 200, clientY: 200 }] });
    expect(screen.getByTestId(`scene-${sceneIdAt(plan, 1)}`)).toBeDefined();
  });

  it("records seen phrases in v2 storage", async () => {
    const plan = renderSession();
    const first = plan.cards[0];
    expect(first.kind).toBe("content");
    const phraseId = first.kind === "content" ? first.scene.phraseId : "";
    await waitFor(async () => {
      await flushWrites();
      const deck = parseDeck(window.localStorage.getItem(KEY_DECK));
      expect(deck[phraseId]?.timesSeen).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("session player interactions", () => {
  it("revealing the meaning records a peek", async () => {
    const plan = renderSession();
    const phraseId = plan.cards[0].kind === "content" ? plan.cards[0].scene.phraseId : "";
    fireEvent.click(screen.getByTestId("reveal-meaning"));
    expect(screen.getByTestId("phrase-meaning")).toBeDefined();
    await waitFor(async () => {
      await flushWrites();
      const deck = parseDeck(window.localStorage.getItem(KEY_DECK));
      expect(deck[phraseId]?.peekCount).toBeGreaterThanOrEqual(1);
    });
  });

  it("tapping the phrase saves it to the deck", async () => {
    const plan = renderSession();
    const phraseId = plan.cards[0].kind === "content" ? plan.cards[0].scene.phraseId : "";
    fireEvent.click(screen.getByTestId("save-phrase"));
    await waitFor(async () => {
      await flushWrites();
      const deck = parseDeck(window.localStorage.getItem(KEY_DECK));
      expect(deck[phraseId]?.inDeck).toBe(true);
      expect(deck[phraseId]?.nextReviewAt).not.toBeNull();
    });
  });

  it("'Ya la domino' suppresses the phrase", async () => {
    const plan = renderSession();
    const phraseId = plan.cards[0].kind === "content" ? plan.cards[0].scene.phraseId : "";
    fireEvent.click(screen.getByTestId("suppress-phrase"));
    await waitFor(async () => {
      await flushWrites();
      const deck = parseDeck(window.localStorage.getItem(KEY_DECK));
      expect(deck[phraseId]?.suppressed).toBe(true);
    });
  });
});

describe("session player checkpoints", () => {
  function goToCheckpoint(plan: ReturnType<typeof composeCategorySession>) {
    const checkpointIndex = plan.cards.findIndex((c) => c.kind === "checkpoint");
    for (let i = 0; i < checkpointIndex; i++) {
      fireEvent.keyDown(window, { key: "ArrowDown" });
    }
    const card = plan.cards[checkpointIndex];
    if (card.kind !== "checkpoint") throw new Error("no checkpoint in plan");
    return card;
  }

  it("blocks next until an answer is selected", () => {
    const plan = renderSession();
    const checkpoint = goToCheckpoint(plan);
    expect(screen.getByTestId(`mcq-${checkpoint.exercise.phraseId}`)).toBeDefined();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByTestId(`mcq-${checkpoint.exercise.phraseId}`)).toBeDefined();
  });

  it("a wrong answer shows calm copy, unlocks next, and queues the phrase", async () => {
    const plan = renderSession();
    const checkpoint = goToCheckpoint(plan);
    const wrongIndex = checkpoint.exercise.correctIndex === 0 ? 1 : 0;
    fireEvent.click(screen.getByText(checkpoint.exercise.options[wrongIndex]));
    expect(screen.getByText("Todo bien — volverá pronto.")).toBeDefined();
    await waitFor(async () => {
      await flushWrites();
      const deck = parseDeck(window.localStorage.getItem(KEY_DECK));
      expect(deck[checkpoint.exercise.phraseId]?.inDeck).toBe(true);
      expect(deck[checkpoint.exercise.phraseId]?.box).toBe(1);
    });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.queryByTestId(`mcq-${checkpoint.exercise.phraseId}`)).toBeNull();
  });

  it("a correct answer advances the phrase to recognised", async () => {
    const plan = renderSession();
    const checkpoint = goToCheckpoint(plan);
    fireEvent.click(screen.getByText(checkpoint.exercise.options[checkpoint.exercise.correctIndex]));
    expect(screen.getByText("Eso es.")).toBeDefined();
    await waitFor(async () => {
      await flushWrites();
      const deck = parseDeck(window.localStorage.getItem(KEY_DECK));
      expect(deck[checkpoint.exercise.phraseId]?.stage).toBe("recognised");
    });
  });
});

describe("session end", () => {
  it("finishing shows the end card and records activity + completed topics", async () => {
    const plan = renderSession();
    for (const card of plan.cards) {
      if (card.kind === "checkpoint") {
        fireEvent.click(screen.getByText(card.exercise.options[card.exercise.correctIndex]));
      }
      fireEvent.keyDown(window, { key: "ArrowDown" });
    }
    expect(screen.getByTestId("session-end")).toBeDefined();
    expect(screen.getByText("Sesión hecha ✓")).toBeDefined();

    const sessionTopicIds = new Set(
      plan.cards.flatMap((c) => (c.kind === "content" ? [c.scene.topicId] : []))
    );
    await waitFor(async () => {
      await flushWrites();
      const completed = parseTopics(window.localStorage.getItem(KEY_TOPICS));
      for (const id of sessionTopicIds) expect(completed[id]).toBe(true);
      const activity = parseActivity(window.localStorage.getItem(KEY_ACTIVITY));
      expect(Object.keys(activity)).toHaveLength(1);
    });
  });

  it("survives corrupted v1 localStorage", () => {
    window.localStorage.setItem(STORAGE_KEY, "{{{corrupted");
    const plan = renderSession();
    expect(screen.getByTestId(`scene-${sceneIdAt(plan, 0)}`)).toBeDefined();
  });
});
