import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import Home from "@/app/page";
import { AppStateProvider, resetMigrationForTests } from "@/components/AppStateProvider";
import { SessionPlayer } from "@/components/SessionPlayer";
import { SceneRenderer } from "@/components/SceneRenderer";
import { Notebook } from "@/components/Notebook";
import { PatternExplorer } from "@/components/PatternExplorer";
import { TopicTile } from "@/components/TopicTile";
import { freshEntry } from "@/lib/deckOps";
import { KEY_DISMISSED } from "@/lib/storage/keys";
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
import { LevelBadge } from "@/components/LevelBadge";
import { initialLevel } from "@/lib/level";
import { resetBackendForTests } from "@/lib/storage/backend";
import { flushWrites } from "@/lib/storage/writeQueue";
import { parseActivity, parseDeck, parseLevel, parseTopics } from "@/lib/storage/docs";
import { KEY_ACTIVITY, KEY_CAPTURES, KEY_DECK, KEY_LEVEL, KEY_META, KEY_TOPICS } from "@/lib/storage/keys";

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
    expect(screen.getByText("Explore topics")).toBeDefined();
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

  it("labels the three home sections clearly (IA)", () => {
    renderHome();
    expect(screen.getByText(/Today.s Practice/)).toBeDefined(); // was "Daily Snack"
    expect(screen.getByText("Add patterns to learn")).toBeDefined(); // was "Useful patterns"
    expect(screen.getByText("Explore topics")).toBeDefined(); // was "Explore"
    // Today's Practice is the primary action with a clear CTA.
    expect(screen.getByText(/Start practice/)).toBeDefined();
    // Short filter labels render with accessible long names.
    expect(screen.getByText("Phrasals")).toBeDefined();
    expect(screen.getByText("Frames")).toBeDefined();
    expect(screen.getByTestId("explore-filter-phrasal_verbs").getAttribute("aria-label")).toBe("Phrasal verbs");
    // Pattern cards use clear Add labeling.
    const add = document.querySelector('[data-testid^="pattern-save-"]');
    expect(add?.getAttribute("aria-label")).toBe("Add to practice");
    expect(add?.textContent).toBe("+ Add");
  });

  it("explains what Add patterns and Explore are for (product clarity)", () => {
    renderHome();
    // Add patterns: subtitle makes both the add and skip actions clear.
    expect(screen.getByText(/Pick 1.2 phrases to add\. Skip the ones you don.t want\./)).toBeDefined();
    // Explore: framed as optional discovery, not required.
    expect(screen.getByText(/Optional: discover phrases/)).toBeDefined();
    // A visible way into the vocabulary notebook.
    expect(screen.getByTestId("notebook-link").getAttribute("href")).toBe("/notebook");
  });

  it("shows the practice button and no due CTA when nothing is due", async () => {
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
    expect(cta.textContent).toContain("ready to review");
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

describe("level badge + first-time tooltip", () => {
  function renderBadge() {
    return render(
      <AppStateProvider>
        <LevelBadge />
      </AppStateProvider>
    );
  }

  it("shows B2.0 for a fresh user and the disclaimer tooltip once", async () => {
    renderBadge();
    expect(screen.getByTestId("level-badge").textContent).toBe("B2.0");
    const tip = await screen.findByTestId("level-tooltip");
    expect(tip.textContent).toContain("official English certification");
  });

  it("dismissing the tooltip persists and hides it", async () => {
    renderBadge();
    fireEvent.click(await screen.findByTestId("level-tooltip-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("level-tooltip")).toBeNull());
    await waitFor(async () => {
      await flushWrites();
      expect(parseLevel(window.localStorage.getItem(KEY_LEVEL)).tooltipSeen).toBe(true);
    });
  });

  it("reflects a seeded level and hides the tooltip once seen", async () => {
    window.localStorage.setItem(
      KEY_LEVEL,
      JSON.stringify({ ...initialLevel(() => 0), band: "C1", sub: 3, tooltipSeen: true })
    );
    renderBadge();
    await waitFor(() => expect(screen.getByTestId("level-badge").textContent).toBe("C1.3"));
    expect(screen.queryByTestId("level-tooltip")).toBeNull();
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
  it("all scene types render with the phrase badge and a blurred (unrevealed) translation", () => {
    for (const scene of contentScenes.slice(0, 40)) {
      const { unmount } = render(<SceneRenderer scene={scene} saved={false} />);
      const el = screen.getByTestId(`scene-${scene.id}`);
      expect(el.getAttribute("data-scene-type")).toBe(scene.sceneType);
      expect(screen.getByTestId("phrase-badge")).toBeDefined();
      // The meaning is present but blurred until the reveal button is tapped.
      expect(screen.getByTestId("phrase-meaning").getAttribute("data-revealed")).toBe("false");
      expect(screen.getByTestId("reveal-meaning")).toBeDefined();
      unmount();
    }
  });

  it("tapping reveal unblurs the Spanish meaning", () => {
    const scene = contentScenes[0];
    render(<SceneRenderer scene={scene} saved={false} />);
    expect(screen.getByTestId("phrase-meaning").getAttribute("data-revealed")).toBe("false");
    fireEvent.click(screen.getByTestId("reveal-meaning"));
    expect(screen.getByTestId("phrase-meaning").getAttribute("data-revealed")).toBe("true");
  });

  describe("audio-first scene", () => {
    // Force TTS-available so the audio-first reveal gate engages in jsdom.
    let speakCount = 0;
    let originalSynth: PropertyDescriptor | undefined;
    let originalUtterance: PropertyDescriptor | undefined;
    beforeEach(() => {
      speakCount = 0;
      originalSynth = Object.getOwnPropertyDescriptor(window, "speechSynthesis");
      originalUtterance = Object.getOwnPropertyDescriptor(window, "SpeechSynthesisUtterance");
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: { speak: () => { speakCount++; }, cancel: () => {}, getVoices: () => [] },
      });
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        configurable: true,
        value: class { constructor(public text: string) {} },
      });
    });
    afterEach(() => {
      if (originalSynth) Object.defineProperty(window, "speechSynthesis", originalSynth);
      else delete (window as unknown as Record<string, unknown>).speechSynthesis;
      if (originalUtterance) Object.defineProperty(window, "SpeechSynthesisUtterance", originalUtterance);
      else delete (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance;
    });

    it("renders reveal + replay with no nested interactive buttons", () => {
      const { container } = render(
        <SceneRenderer scene={contentScenes[0]} saved={false} audioFirst />
      );
      expect(screen.getByTestId("audio-first-reveal")).toBeDefined();
      expect(screen.getByTestId("audio-first-replay")).toBeDefined();
      // Valid HTML: no <button> may contain another <button>.
      for (const button of Array.from(container.querySelectorAll("button"))) {
        expect(button.querySelector("button")).toBeNull();
      }
    });

    it("replay plays audio without revealing the text; reveal shows the body", () => {
      render(<SceneRenderer scene={contentScenes[0]} saved={false} audioFirst />);
      // Text stays hidden until the reveal button is tapped.
      expect(screen.queryByTestId("phrase-badge")).toBeNull();
      const speaksAfterMount = speakCount;
      fireEvent.click(screen.getByTestId("audio-first-replay"));
      expect(speakCount).toBe(speaksAfterMount + 1);
      expect(screen.queryByTestId("phrase-badge")).toBeNull(); // replay does not reveal
      fireEvent.click(screen.getByTestId("audio-first-reveal"));
      expect(screen.getByTestId("phrase-badge")).toBeDefined();
    });
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
      <SessionPlayer title="Today's Practice" plan={plan} onAnotherRound={() => {}} />
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

  it("long-pressing the phrase opens the action sheet and 'I already know this' suppresses it", async () => {
    const plan = renderSession();
    const phraseId = plan.cards[0].kind === "content" ? plan.cards[0].scene.phraseId : "";
    // No visible suppress link next to the reveal button anymore.
    expect(screen.queryByTestId("suppress-phrase")).toBeNull();
    // Long-press the phrase module (>=500ms) to open the sheet.
    fireEvent.pointerDown(screen.getByTestId("phrase-badge"));
    await new Promise((r) => setTimeout(r, 600));
    fireEvent.click(await screen.findByTestId("suppress-phrase"));
    await waitFor(async () => {
      await flushWrites();
      const deck = parseDeck(window.localStorage.getItem(KEY_DECK));
      expect(deck[phraseId]?.suppressed).toBe(true);
    });
    // Inline undo is offered.
    expect(screen.getByTestId("suppress-undo")).toBeDefined();
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
    expect(screen.getByText("All good — it'll be back soon.")).toBeDefined();
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
    expect(screen.getByText("That's it.")).toBeDefined();
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
    // The practice session is titled consistently with home ("Today's Practice").
    expect(screen.getByText("Today's Practice")).toBeDefined();
    // Learning-framed recap: headline reflects whether anything advanced.
    expect(screen.getByText(/Nice progress ✓|Session done ✓/)).toBeDefined();
    // The recap answers "which phrases did I practise today?".
    expect(screen.getByTestId("practiced-today")).toBeDefined();
    expect(screen.getByText("Today you practised")).toBeDefined();
    // …and links onward to the full notebook so practised vocab is findable.
    expect(screen.getByTestId("session-end-notebook").getAttribute("href")).toBe("/notebook");

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

describe("My phrases (notebook)", () => {
  const DAY = 24 * 60 * 60 * 1000;

  it("renders saved phrases grouped by stage, with status and review state", async () => {
    const withCategory = phrases.find((p) => p.category !== undefined)!;
    const other = phrases.find((p) => p.id !== withCategory.id)!;
    const now = Date.now();
    const deck = {
      // In deck, due now → appears under its stage with a "Due today" chip.
      [withCategory.id]: {
        ...freshEntry(withCategory.id, "catalog"),
        inDeck: true,
        stage: "recognised" as const,
        timesSeen: 3,
        nextReviewAt: now - 1000,
        addedToDeckAt: now - DAY,
      },
      // In deck, scheduled ahead → a non-due review label.
      [other.id]: {
        ...freshEntry(other.id, "catalog"),
        inDeck: true,
        stage: "recalled" as const,
        timesSeen: 5,
        nextReviewAt: now + 5 * DAY,
        addedToDeckAt: now - DAY,
      },
    };
    // Seed a v2 deck directly — mark schema v2 so migration doesn't clobber it.
    window.localStorage.setItem(KEY_META, JSON.stringify({ schemaVersion: 2 }));
    window.localStorage.setItem(KEY_DECK, JSON.stringify(deck));

    render(
      <AppStateProvider>
        <Notebook />
      </AppStateProvider>
    );

    // Both phrases show, under their stage groups, with meaning + review state.
    await waitFor(() => {
      expect(screen.getByTestId(`notebook-phrase-${withCategory.id}`)).toBeDefined();
    });
    expect(screen.getByTestId("notebook-stage-recognised")).toBeDefined();
    expect(screen.getByTestId("notebook-stage-recalled")).toBeDefined();
    expect(screen.getByText(withCategory.meaningEs)).toBeDefined();
    // Due-now phrase is labelled "Due today"; scheduled one is not.
    expect(screen.getByTestId(`notebook-review-${withCategory.id}`).textContent).toBe("Due today");
    expect(screen.getByTestId(`notebook-review-${other.id}`).textContent).not.toBe("Due today");
  });

  it("shows an empty state when nothing is saved yet", async () => {
    render(
      <AppStateProvider>
        <Notebook />
      </AppStateProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("notebook-empty")).toBeDefined();
    });
  });

  it("renders a captured (custom) phrase without crashing, and skips stale ids", async () => {
    // Regression: getPhrase() throws on unknown ids. A captured phrase and a
    // stale/orphan deck id must not blow up the whole page.
    window.localStorage.setItem(KEY_META, JSON.stringify({ schemaVersion: 2 }));
    window.localStorage.setItem(
      KEY_CAPTURES,
      JSON.stringify({
        cap1: { id: "cap1", text: "circle back", note: "", meaningEs: "retomar", createdAt: 1 },
      })
    );
    window.localStorage.setItem(
      KEY_DECK,
      JSON.stringify({
        cap1: { ...freshEntry("cap1", "custom"), inDeck: true, stage: "seen", timesSeen: 2, nextReviewAt: Date.now() + DAY },
        "ghost-removed-phrase": { ...freshEntry("ghost-removed-phrase", "catalog"), inDeck: true, stage: "seen", timesSeen: 1, nextReviewAt: Date.now() + DAY },
      })
    );
    render(
      <AppStateProvider>
        <Notebook />
      </AppStateProvider>
    );
    // The captured phrase renders (resolved from the capture store)…
    await waitFor(() => {
      expect(screen.getByTestId("notebook-phrase-cap1")).toBeDefined();
    });
    expect(screen.getByText("circle back")).toBeDefined();
    // …and the unresolvable id is skipped rather than crashing the page.
    expect(screen.queryByTestId("notebook-phrase-ghost-removed-phrase")).toBeNull();
  });

  it("shows a phrase seen in Today's Practice (not manually added)", async () => {
    // markSeen from a content card: timesSeen>0, stage seen, but not inDeck.
    const seen = phrases[0];
    window.localStorage.setItem(KEY_META, JSON.stringify({ schemaVersion: 2 }));
    window.localStorage.setItem(
      KEY_DECK,
      JSON.stringify({
        [seen.id]: { ...freshEntry(seen.id, "catalog"), inDeck: false, stage: "seen", timesSeen: 1 },
      })
    );
    render(
      <AppStateProvider>
        <Notebook />
      </AppStateProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId(`notebook-phrase-${seen.id}`)).toBeDefined();
    });
    expect(screen.getByTestId("notebook-stage-seen")).toBeDefined();
  });

  it("shows added/deck phrases but not merely-skipped suggestions", async () => {
    const added = phrases[0];
    const skippedOnly = phrases[1];
    window.localStorage.setItem(KEY_META, JSON.stringify({ schemaVersion: 2 }));
    window.localStorage.setItem(
      KEY_DECK,
      JSON.stringify({
        [added.id]: { ...freshEntry(added.id, "catalog"), inDeck: true, stage: "seen", timesSeen: 1, nextReviewAt: (Date.now() + DAY) },
      })
    );
    // Skipping only records a UI dismissal — it never creates a deck entry.
    window.localStorage.setItem(KEY_DISMISSED, JSON.stringify({ [skippedOnly.id]: true }));

    render(
      <AppStateProvider>
        <Notebook />
      </AppStateProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId(`notebook-phrase-${added.id}`)).toBeDefined();
    });
    expect(screen.queryByTestId(`notebook-phrase-${skippedOnly.id}`)).toBeNull();
  });

  it("Remove takes a phrase out of the queue but keeps its history", async () => {
    const p = phrases[0];
    window.localStorage.setItem(KEY_META, JSON.stringify({ schemaVersion: 2 }));
    window.localStorage.setItem(
      KEY_DECK,
      JSON.stringify({
        [p.id]: {
          ...freshEntry(p.id, "catalog"),
          inDeck: true,
          stage: "recognised",
          box: 2,
          timesSeen: 4,
          correctCount: 2,
          nextReviewAt: (Date.now() + DAY),
          addedToDeckAt: (Date.now() + DAY) - 2 * 24 * 60 * 60 * 1000,
        },
      })
    );
    render(
      <AppStateProvider>
        <Notebook />
      </AppStateProvider>
    );
    const remove = await waitFor(() => {
      const b = document.querySelector(`[data-testid="notebook-remove-${p.id}"]`);
      if (!b) throw new Error("no remove button");
      return b as HTMLElement;
    });
    fireEvent.click(remove);
    await flushWrites();
    const deck = parseDeck(window.localStorage.getItem(KEY_DECK));
    expect(deck[p.id].inDeck).toBe(false);
    expect(deck[p.id].nextReviewAt).toBeNull();
    // History preserved.
    expect(deck[p.id].stage).toBe("recognised");
    expect(deck[p.id].box).toBe(2);
    expect(deck[p.id].timesSeen).toBe(4);
    expect(deck[p.id].correctCount).toBe(2);
  });
});

describe("Add patterns — add / skip / show more", () => {
  const idOf = (sel: string, prefix: string) =>
    document.querySelector(sel)?.getAttribute("data-testid")?.replace(prefix, "") ?? "";
  const visiblePatternIds = () =>
    [...document.querySelectorAll('[data-testid^="pattern-card-"]')].map((e) =>
      e.getAttribute("data-testid")!.replace("pattern-card-", "")
    );

  const renderExplorer = () =>
    render(
      <AppStateProvider>
        <PatternExplorer />
      </AppStateProvider>
    );

  it("Add puts the phrase into the deck for future practice", async () => {
    renderExplorer();
    const btn = await waitFor(() => {
      const b = document.querySelector('[data-testid^="pattern-save-"]');
      if (!b) throw new Error("no card yet");
      return b as HTMLElement;
    });
    const id = btn.getAttribute("data-testid")!.replace("pattern-save-", "");
    fireEvent.click(btn);
    expect(document.querySelector(`[data-testid="pattern-save-${id}"]`)?.textContent).toBe("✓ Added");
    await flushWrites();
    const deck = parseDeck(window.localStorage.getItem(KEY_DECK));
    expect(deck[id]?.inDeck).toBe(true);
  });

  it("Skip hides the suggestion without adding it or touching memory", async () => {
    renderExplorer();
    const skip = await waitFor(() => {
      const s = document.querySelector('[data-testid^="pattern-skip-"]');
      if (!s) throw new Error("no skip yet");
      return s as HTMLElement;
    });
    const id = skip.getAttribute("data-testid")!.replace("pattern-skip-", "");
    fireEvent.click(skip);
    // Removed from the suggestions immediately.
    expect(screen.queryByTestId(`pattern-card-${id}`)).toBeNull();
    await flushWrites();
    // Not added to the deck; no memory/scheduling entry created.
    expect(parseDeck(window.localStorage.getItem(KEY_DECK))[id]).toBeUndefined();
    // Recorded only as a UI dismissal.
    expect(JSON.parse(window.localStorage.getItem(KEY_DISMISSED)!)[id]).toBe(true);
  });

  it("Show more rotates to a different batch, excluding skipped and added", async () => {
    renderExplorer();
    await waitFor(() => {
      if (!document.querySelector('[data-testid^="pattern-card-"]')) throw new Error("wait");
    });
    const batch1 = visiblePatternIds();
    const addedId = idOf('[data-testid^="pattern-save-"]', "pattern-save-");
    fireEvent.click(document.querySelector(`[data-testid="pattern-save-${addedId}"]`)!);
    const skipId = visiblePatternIds().find((x) => x !== addedId)!;
    fireEvent.click(document.querySelector(`[data-testid="pattern-skip-${skipId}"]`)!);
    fireEvent.click(screen.getByTestId("show-more-patterns"));
    const batch2 = visiblePatternIds();
    expect(batch2).not.toEqual(batch1);
    expect(batch2).not.toContain(addedId);
    expect(batch2).not.toContain(skipId);
  });

  it("added and skipped state persist across a reload", async () => {
    const first = renderExplorer();
    await waitFor(() => {
      if (!document.querySelector('[data-testid^="pattern-card-"]')) throw new Error("wait");
    });
    const addedId = idOf('[data-testid^="pattern-save-"]', "pattern-save-");
    fireEvent.click(document.querySelector(`[data-testid="pattern-save-${addedId}"]`)!);
    const skipId = visiblePatternIds().find((x) => x !== addedId)!;
    fireEvent.click(document.querySelector(`[data-testid="pattern-skip-${skipId}"]`)!);
    await flushWrites();
    first.unmount();

    renderExplorer(); // fresh mount re-hydrates from storage
    await waitFor(() => {
      if (!document.querySelector('[data-testid^="pattern-card-"]')) throw new Error("wait");
    });
    // Skipped phrase stays hidden; added phrase persisted in the deck.
    expect(screen.queryByTestId(`pattern-card-${skipId}`)).toBeNull();
    expect(parseDeck(window.localStorage.getItem(KEY_DECK))[addedId]?.inDeck).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(KEY_DISMISSED)!)[skipId]).toBe(true);
  });
});
