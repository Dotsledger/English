import { describe, it, expect, beforeEach } from "vitest";
import type { PhraseMemoryEntry } from "@/lib/types";
import { emptyEntry, STORAGE_KEY as V1_PHRASES_KEY } from "@/lib/phraseMemory";
import { TOPIC_PROGRESS_KEY as V1_TOPICS_KEY } from "@/lib/topicProgress";
import { migrateV1, ensureMigrated } from "@/lib/storage/migrate";
import { createMemoryBackend } from "@/lib/storage/backend";
import { parseDeck, parseMeta, parseTopics } from "@/lib/storage/docs";
import { KEY_DECK, KEY_META, KEY_TOPICS } from "@/lib/storage/keys";

const NOW = 1_750_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function v1Entry(overrides: Partial<PhraseMemoryEntry>): PhraseMemoryEntry {
  return { ...emptyEntry(overrides.phraseId ?? "p"), ...overrides };
}

describe("migrateV1 mapping", () => {
  it("drops untouched emptyEntry noise", () => {
    const { deck } = migrateV1({ p: v1Entry({}) }, {}, NOW);
    expect(deck).toEqual({});
  });

  it("seen-only phrases become stage seen, not in deck, no schedule", () => {
    const { deck } = migrateV1({ p: v1Entry({ timesSeen: 3, lastSeenAt: 123 }) }, {}, NOW);
    expect(deck.p.stage).toBe("seen");
    expect(deck.p.inDeck).toBe(false);
    expect(deck.p.nextReviewAt).toBeNull();
    expect(deck.p.timesSeen).toBe(3);
    expect(deck.p.lastSeenAt).toBe(123);
  });

  it("any correct answer grants recognised — never produced", () => {
    const { deck } = migrateV1(
      { p: v1Entry({ timesSeen: 1, timesRecalled: 5, correctCount: 5, confidenceScore: 5 }) },
      {},
      NOW
    );
    expect(deck.p.stage).toBe("recognised");
  });

  it("wrong-only attempters enter the deck at box 1", () => {
    const { deck } = migrateV1(
      { p: v1Entry({ timesSeen: 1, timesRecalled: 1, wrongCount: 1, nextReviewAt: NOW + 1 }) },
      {},
      NOW
    );
    expect(deck.p.inDeck).toBe(true);
    expect(deck.p.stage).toBe("seen");
    expect(deck.p.box).toBe(1);
  });

  it("box is clamped to 3 even for heavy correct counts", () => {
    const { deck } = migrateV1(
      { p: v1Entry({ timesSeen: 1, timesRecalled: 9, correctCount: 9, confidenceScore: 9 }) },
      {},
      NOW
    );
    expect(deck.p.box).toBe(3);
  });

  it("zero confidence demotes to box 1 despite correct answers", () => {
    const { deck } = migrateV1(
      { p: v1Entry({ timesSeen: 1, timesRecalled: 4, correctCount: 2, confidenceScore: 0 }) },
      {},
      NOW
    );
    expect(deck.p.box).toBe(1);
  });

  it("keeps a real v1 schedule, synthesizes one interval out when missing", () => {
    const scheduled = NOW + 5 * 60 * 1000;
    const { deck } = migrateV1(
      {
        a: v1Entry({ phraseId: "a", timesRecalled: 1, correctCount: 1, confidenceScore: 1, nextReviewAt: scheduled }),
        b: v1Entry({ phraseId: "b", timesRecalled: 1, correctCount: 1, confidenceScore: 1, nextReviewAt: null }),
      },
      {},
      NOW
    );
    expect(deck.a.nextReviewAt).toBe(scheduled);
    expect(deck.b.nextReviewAt).toBe(NOW + 1 * DAY); // box 1 interval, never `now`
  });

  it("carries topics through verbatim", () => {
    const { topics } = migrateV1({}, { "electric-scooters": true }, NOW);
    expect(topics).toEqual({ "electric-scooters": true });
  });
});

describe("ensureMigrated", () => {
  beforeEach(() => window.localStorage.clear());

  it("migrates v1 localStorage into the backend and writes meta", async () => {
    window.localStorage.setItem(
      V1_PHRASES_KEY,
      JSON.stringify({ p: v1Entry({ phraseId: "p", timesSeen: 2 }) })
    );
    window.localStorage.setItem(V1_TOPICS_KEY, JSON.stringify({ t: true }));
    const backend = createMemoryBackend();

    await ensureMigrated(backend, NOW);

    expect(parseDeck(await backend.get(KEY_DECK)).p.stage).toBe("seen");
    expect(parseTopics(await backend.get(KEY_TOPICS))).toEqual({ t: true });
    expect(parseMeta(await backend.get(KEY_META))).toEqual({
      schemaVersion: 2,
      migratedFromV1At: NOW,
    });
    // v1 keys are kept for rollback safety
    expect(window.localStorage.getItem(V1_PHRASES_KEY)).not.toBeNull();
  });

  it("is a no-op once meta says schemaVersion >= 2", async () => {
    const backend = createMemoryBackend();
    await backend.set(KEY_META, JSON.stringify({ schemaVersion: 2 }));
    await backend.set(KEY_DECK, JSON.stringify({}));
    window.localStorage.setItem(
      V1_PHRASES_KEY,
      JSON.stringify({ p: v1Entry({ phraseId: "p", timesSeen: 2 }) })
    );

    await ensureMigrated(backend, NOW);
    expect(parseDeck(await backend.get(KEY_DECK))).toEqual({});
  });

  it("retries cleanly after a crash that skipped the meta write", async () => {
    window.localStorage.setItem(
      V1_PHRASES_KEY,
      JSON.stringify({ p: v1Entry({ phraseId: "p", timesSeen: 2 }) })
    );
    const backend = createMemoryBackend();
    // Simulate a prior crash: deck written, meta missing.
    await backend.set(KEY_DECK, JSON.stringify({}));

    await ensureMigrated(backend, NOW);
    expect(parseDeck(await backend.get(KEY_DECK)).p).toBeDefined();
    expect(parseMeta(await backend.get(KEY_META))?.schemaVersion).toBe(2);
  });

  it("fresh user (no v1 keys) gets empty docs and meta", async () => {
    const backend = createMemoryBackend();
    await ensureMigrated(backend, NOW);
    expect(parseDeck(await backend.get(KEY_DECK))).toEqual({});
    expect(parseTopics(await backend.get(KEY_TOPICS))).toEqual({});
    expect(parseMeta(await backend.get(KEY_META))?.schemaVersion).toBe(2);
  });

  it("corrupted v1 JSON migrates as empty", async () => {
    window.localStorage.setItem(V1_PHRASES_KEY, "{{{corrupted");
    const backend = createMemoryBackend();
    await ensureMigrated(backend, NOW);
    expect(parseDeck(await backend.get(KEY_DECK))).toEqual({});
  });
});
