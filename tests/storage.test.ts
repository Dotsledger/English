import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { DeckEntry } from "@/lib/types";
import { normalize } from "@/lib/text";
import { createMemoryBackend, createLocalStorageBackend } from "@/lib/storage/backend";
import { queueWrite, flushWrites } from "@/lib/storage/writeQueue";
import {
  isValidDeckEntry,
  parseActivity,
  parseCaptures,
  parseDeck,
  parseMeta,
  parseMission,
  parseTopics,
} from "@/lib/storage/docs";
import { exportAll, importAll } from "@/lib/storage/exportImport";
import { getBackend } from "@/lib/storage/backend";
import { KEY_DECK, KEY_TOPICS } from "@/lib/storage/keys";

export function makeDeckEntry(overrides: Partial<DeckEntry> = {}): DeckEntry {
  return {
    phraseId: "not-worth-it",
    source: "catalog",
    stage: "seen",
    box: 1,
    inDeck: false,
    suppressed: false,
    timesSeen: 1,
    correctCount: 0,
    wrongCount: 0,
    producedCorrectAtLongBoxes: 0,
    lastSeenAt: null,
    lastAttemptAt: null,
    nextReviewAt: null,
    peekCount: 0,
    lastPeekMs: null,
    addedToDeckAt: null,
    ...overrides,
  };
}

describe("normalize", () => {
  it("lowercases, unifies apostrophes and collapses whitespace", () => {
    expect(normalize("It’s  Not\tWorth It")).toBe("it's not worth it");
  });
});

describe("memory backend", () => {
  it("round-trips values and lists keys", async () => {
    const backend = createMemoryBackend();
    await backend.set("a", "1");
    await backend.set("b", "2");
    expect(await backend.get("a")).toBe("1");
    expect(await backend.keys()).toEqual(["a", "b"]);
    await backend.remove("a");
    expect(await backend.get("a")).toBeNull();
  });
});

describe("localStorage backend", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips values", async () => {
    const backend = createLocalStorageBackend()!;
    await backend.set("k", "v");
    expect(await backend.get("k")).toBe("v");
    expect(window.localStorage.getItem("k")).toBe("v");
  });

  it("swallows setItem quota errors", async () => {
    const backend = createLocalStorageBackend()!;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    await expect(backend.set("k", "v")).resolves.toBeUndefined();
    spy.mockRestore();
  });
});

describe("writeQueue", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces rapid writes to the same key, latest wins", async () => {
    queueWrite("wq-key", "one");
    queueWrite("wq-key", "two");
    queueWrite("wq-key", "three");
    await vi.runAllTimersAsync();
    const backend = await getBackend();
    expect(await backend.get("wq-key")).toBe("three");
  });

  it("flushWrites persists immediately without waiting for the debounce", async () => {
    queueWrite("wq-flush", "now");
    await flushWrites();
    const backend = await getBackend();
    expect(await backend.get("wq-flush")).toBe("now");
  });
});

describe("deck document parsing", () => {
  it("returns empty store for null and corrupted JSON", () => {
    expect(parseDeck(null)).toEqual({});
    expect(parseDeck("{not json")).toEqual({});
    expect(parseDeck("[1,2]")).toEqual({});
  });

  it("keeps valid entries, drops malformed ones", () => {
    const good = makeDeckEntry();
    const raw = JSON.stringify({ good, bad: { phraseId: 42 } });
    const store = parseDeck(raw);
    expect(store.good).toEqual(good);
    expect(store.bad).toBeUndefined();
  });

  it("rejects out-of-range boxes and unknown stages", () => {
    expect(isValidDeckEntry(makeDeckEntry({ box: 6 as never }))).toBe(false);
    expect(isValidDeckEntry(makeDeckEntry({ stage: "wizard" as never }))).toBe(false);
  });
});

describe("other document parsers", () => {
  it("parseTopics keeps only literal-true values", () => {
    expect(parseTopics(JSON.stringify({ a: true, b: "yes" }))).toEqual({ a: true });
  });

  it("parseCaptures validates shape", () => {
    const capture = { id: "c1", text: "sort of", note: "", meaningEs: "más o menos", createdAt: 5 };
    expect(parseCaptures(JSON.stringify({ c1: capture }))).toEqual({ c1: capture });
    expect(parseCaptures(JSON.stringify({ c1: { id: "c1" } }))).toEqual({});
  });

  it("parseActivity keeps only ISO-date keys", () => {
    const raw = JSON.stringify({ "2026-07-06": true, "not-a-date": true, "2026-07-07": 1 });
    expect(parseActivity(raw)).toEqual({ "2026-07-06": true });
  });

  it("parseMission validates the doc and rejects garbage", () => {
    const mission = { weekKey: "2026-07-06", phraseIds: ["a", "b"], done: { a: true } };
    expect(parseMission(JSON.stringify(mission))).toEqual(mission);
    expect(parseMission(JSON.stringify({ weekKey: 3 }))).toBeNull();
    expect(parseMission("{oops")).toBeNull();
  });

  it("parseMeta reads the schema version", () => {
    expect(parseMeta(JSON.stringify({ schemaVersion: 2 }))).toEqual({ schemaVersion: 2 });
    expect(parseMeta(JSON.stringify({ other: true }))).toBeNull();
  });
});

describe("export / import round-trip", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips deck and topics through a bundle", async () => {
    const backend = await getBackend();
    const deck = { "not-worth-it": makeDeckEntry({ inDeck: true, box: 2 }) };
    await backend.set(KEY_DECK, JSON.stringify(deck));
    await backend.set(KEY_TOPICS, JSON.stringify({ "electric-scooters": true }));

    const bundle = await exportAll(1000);
    expect(bundle.app).toBe("sticky-english");
    expect(bundle.exportedAt).toBe(1000);

    await backend.remove(KEY_DECK);
    await backend.remove(KEY_TOPICS);

    const result = await importAll(JSON.stringify(bundle));
    expect(result.ok).toBe(true);
    expect(parseDeck(await backend.get(KEY_DECK))).toEqual(deck);
    expect(parseTopics(await backend.get(KEY_TOPICS))).toEqual({ "electric-scooters": true });
  });

  it("rejects non-JSON and foreign files", async () => {
    expect((await importAll("not json")).ok).toBe(false);
    expect((await importAll(JSON.stringify({ app: "other", data: {} }))).ok).toBe(false);
  });

  it("sanitizes malformed entries inside an otherwise valid bundle", async () => {
    const bundle = {
      app: "sticky-english",
      schemaVersion: 2,
      exportedAt: 1,
      data: {
        [KEY_DECK]: { good: makeDeckEntry(), bad: { phraseId: 42 } },
      },
    };
    const result = await importAll(JSON.stringify(bundle));
    expect(result.ok).toBe(true);
    const backend = await getBackend();
    const deck = parseDeck(await backend.get(KEY_DECK));
    expect(deck.good).toBeDefined();
    expect(deck.bad).toBeUndefined();
  });
});
