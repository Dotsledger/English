import type { PhraseMemoryEntry, PhraseMemoryStore, PhraseStatus } from "@/lib/types";

export const STORAGE_KEY = "sticky-english.phrase-memory.v1";

const DAY = 24 * 60 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;

export function emptyEntry(phraseId: string): PhraseMemoryEntry {
  return {
    phraseId,
    timesSeen: 0,
    timesRecalled: 0,
    correctCount: 0,
    wrongCount: 0,
    lastSeenAt: null,
    lastAttemptAt: null,
    nextReviewAt: null,
    confidenceScore: 0,
    status: "new",
  };
}

function isValidEntry(value: unknown): value is PhraseMemoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.phraseId === "string" &&
    typeof e.timesSeen === "number" &&
    typeof e.timesRecalled === "number" &&
    typeof e.correctCount === "number" &&
    typeof e.wrongCount === "number" &&
    typeof e.confidenceScore === "number" &&
    typeof e.status === "string"
  );
}

/** Parses raw localStorage content; corrupted data falls back to an empty store. */
export function parseStore(raw: string | null): PhraseMemoryStore {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const store: PhraseMemoryStore = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isValidEntry(value)) store[key] = value;
    }
    return store;
  } catch {
    return {};
  }
}

export function loadStore(): PhraseMemoryStore {
  if (typeof window === "undefined") return {};
  try {
    return parseStore(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}

export function saveStore(store: PhraseMemoryStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full or unavailable — memory is a nice-to-have, never crash the feed
  }
}

function deriveStatus(e: PhraseMemoryEntry): PhraseStatus {
  if (e.correctCount >= 3 && e.confidenceScore >= 3) return "strong";
  if (e.correctCount >= 2) return "familiar";
  if (e.timesRecalled >= 1) return "learning";
  if (e.timesSeen >= 1) return "seen";
  return "new";
}

/**
 * Records that a phrase was seen in a scene. `seenSceneIds` dedupes per
 * browser session so re-swiping the same scene doesn't inflate counts.
 */
export function recordSeen(
  store: PhraseMemoryStore,
  phraseId: string,
  sceneId: string,
  seenSceneIds: Set<string>,
  now: number = Date.now()
): PhraseMemoryStore {
  if (seenSceneIds.has(sceneId)) return store;
  seenSceneIds.add(sceneId);
  const entry = { ...(store[phraseId] ?? emptyEntry(phraseId)) };
  entry.timesSeen += 1;
  entry.lastSeenAt = now;
  entry.status = deriveStatus(entry);
  return { ...store, [phraseId]: entry };
}

/** Records a checkpoint attempt and schedules the next review. */
export function recordAttempt(
  store: PhraseMemoryStore,
  phraseId: string,
  correct: boolean,
  now: number = Date.now()
): PhraseMemoryStore {
  const entry = { ...(store[phraseId] ?? emptyEntry(phraseId)) };
  entry.timesRecalled += 1;
  entry.lastAttemptAt = now;
  if (correct) {
    entry.correctCount += 1;
    entry.confidenceScore += 1;
    const interval =
      entry.correctCount === 1 ? 1 * DAY : entry.correctCount === 2 ? 3 * DAY : 7 * DAY;
    entry.nextReviewAt = now + interval;
  } else {
    entry.wrongCount += 1;
    entry.confidenceScore = Math.max(0, entry.confidenceScore - 1);
    entry.nextReviewAt = now + FIVE_MINUTES;
  }
  entry.status = deriveStatus(entry);
  return { ...store, [phraseId]: entry };
}

export function statusOf(store: PhraseMemoryStore, phraseId: string): PhraseStatus {
  return store[phraseId]?.status ?? "new";
}
