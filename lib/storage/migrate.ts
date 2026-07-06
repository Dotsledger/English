import type { Box, DeckEntry, DeckStore, PhraseMemoryStore } from "@/lib/types";
import type { TopicProgressStore } from "@/lib/topicProgress";
import type { StorageBackend } from "@/lib/storage/backend";
import { parseStore, STORAGE_KEY as V1_PHRASES_KEY } from "@/lib/phraseMemory";
import { parseTopicProgress, TOPIC_PROGRESS_KEY as V1_TOPICS_KEY } from "@/lib/topicProgress";
import { intervalForBox } from "@/lib/session/leitner";
import { KEY_DECK, KEY_META, KEY_TOPICS } from "@/lib/storage/keys";
import { parseMeta } from "@/lib/storage/docs";

/**
 * Pure v1 → v2 mapping. v1 checkpoints were recognition-only MCQs, so no
 * migrated phrase is ever granted "produced"/"mastered" or a box above 3 —
 * the 16/35-day intervals require proven production.
 */
export function migrateV1(
  v1Phrases: PhraseMemoryStore,
  v1Topics: TopicProgressStore,
  now: number
): { deck: DeckStore; topics: TopicProgressStore } {
  const deck: DeckStore = {};
  for (const entry of Object.values(v1Phrases)) {
    if (entry.timesSeen === 0 && entry.correctCount === 0 && entry.timesRecalled === 0) {
      continue; // emptyEntry noise
    }
    const inDeck = entry.timesRecalled > 0;
    let box = Math.min(Math.max(entry.correctCount, 1), 3) as Box;
    if (entry.confidenceScore === 0) box = 1; // recent wrongs wiped confidence
    const migrated: DeckEntry = {
      phraseId: entry.phraseId,
      source: "catalog",
      stage: entry.correctCount > 0 ? "recognised" : "seen",
      box,
      inDeck,
      suppressed: false,
      timesSeen: entry.timesSeen,
      correctCount: entry.correctCount,
      wrongCount: entry.wrongCount,
      producedCorrectAtLongBoxes: 0,
      lastSeenAt: entry.lastSeenAt,
      lastAttemptAt: entry.lastAttemptAt,
      // Keep the real v1 schedule; if none, schedule a full interval out —
      // never `now`, or a legacy user's first v2 open is a wall of reviews.
      nextReviewAt: entry.nextReviewAt ?? (inDeck ? now + intervalForBox(box) : null),
      peekCount: 0,
      lastPeekMs: null,
      addedToDeckAt: inDeck ? (entry.lastAttemptAt ?? now) : null,
    };
    deck[entry.phraseId] = migrated;
  }
  return { deck, topics: { ...v1Topics } };
}

/**
 * Runs at most once (the meta doc is the sole gate — everything else is
 * unconditional, so a crash mid-migration simply retries next load).
 * v1 localStorage keys are kept for rollback safety.
 */
export async function ensureMigrated(
  backend: StorageBackend,
  now: number = Date.now()
): Promise<void> {
  const meta = parseMeta(await backend.get(KEY_META));
  if (meta && meta.schemaVersion >= 2) return;

  // v1 only ever lived in localStorage, regardless of the v2 backend.
  let v1PhrasesRaw: string | null = null;
  let v1TopicsRaw: string | null = null;
  if (typeof window !== "undefined") {
    try {
      v1PhrasesRaw = window.localStorage.getItem(V1_PHRASES_KEY);
      v1TopicsRaw = window.localStorage.getItem(V1_TOPICS_KEY);
    } catch {
      // unreadable v1 state migrates as empty
    }
  }

  const { deck, topics } = migrateV1(
    parseStore(v1PhrasesRaw),
    parseTopicProgress(v1TopicsRaw),
    now
  );
  await backend.set(KEY_DECK, JSON.stringify(deck));
  await backend.set(KEY_TOPICS, JSON.stringify(topics));
  // Meta written last: a crash before this line means a clean retry.
  await backend.set(KEY_META, JSON.stringify({ schemaVersion: 2, migratedFromV1At: now }));
}
