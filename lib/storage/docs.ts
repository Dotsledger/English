import type {
  ActivityStore,
  Box,
  CapturedPhrase,
  CaptureStore,
  DeckEntry,
  DeckStore,
  MissionStore,
  PhraseStage,
} from "@/lib/types";

/**
 * Corruption-safe parsers for every v2 document. Same philosophy as v1's
 * parseStore: bad JSON or malformed entries fall back to empty, never throw.
 */

const STAGES: PhraseStage[] = ["seen", "recognised", "produced", "mastered"];
const BOXES: Box[] = [1, 2, 3, 4, 5];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeParse(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isNumberOrNull(v: unknown): v is number | null {
  return v === null || typeof v === "number";
}

export function isValidDeckEntry(value: unknown): value is DeckEntry {
  if (!isRecord(value)) return false;
  const e = value;
  return (
    typeof e.phraseId === "string" &&
    (e.source === "catalog" || e.source === "custom") &&
    STAGES.includes(e.stage as PhraseStage) &&
    BOXES.includes(e.box as Box) &&
    typeof e.inDeck === "boolean" &&
    typeof e.suppressed === "boolean" &&
    typeof e.timesSeen === "number" &&
    typeof e.correctCount === "number" &&
    typeof e.wrongCount === "number" &&
    typeof e.producedCorrectAtLongBoxes === "number" &&
    isNumberOrNull(e.lastSeenAt) &&
    isNumberOrNull(e.lastAttemptAt) &&
    isNumberOrNull(e.nextReviewAt) &&
    typeof e.peekCount === "number" &&
    isNumberOrNull(e.lastPeekMs) &&
    isNumberOrNull(e.addedToDeckAt)
  );
}

export function parseDeck(raw: string | null): DeckStore {
  const parsed = safeParse(raw);
  if (!parsed) return {};
  const store: DeckStore = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (isValidDeckEntry(value)) store[key] = value;
  }
  return store;
}

export function parseTopics(raw: string | null): Record<string, true> {
  const parsed = safeParse(raw);
  if (!parsed) return {};
  const store: Record<string, true> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value === true) store[key] = true;
  }
  return store;
}

function isValidCapture(value: unknown): value is CapturedPhrase {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    typeof value.note === "string" &&
    typeof value.meaningEs === "string" &&
    typeof value.createdAt === "number"
  );
}

export function parseCaptures(raw: string | null): CaptureStore {
  const parsed = safeParse(raw);
  if (!parsed) return {};
  const store: CaptureStore = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (isValidCapture(value)) store[key] = value;
  }
  return store;
}

export function parseActivity(raw: string | null): ActivityStore {
  const parsed = safeParse(raw);
  if (!parsed) return {};
  const store: ActivityStore = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value === true && /^\d{4}-\d{2}-\d{2}$/.test(key)) store[key] = true;
  }
  return store;
}

export function parseMission(raw: string | null): MissionStore | null {
  const parsed = safeParse(raw);
  if (!parsed) return null;
  if (
    typeof parsed.weekKey !== "string" ||
    !Array.isArray(parsed.phraseIds) ||
    !parsed.phraseIds.every((id) => typeof id === "string") ||
    !isRecord(parsed.done)
  ) {
    return null;
  }
  const done: Record<string, true> = {};
  for (const [key, value] of Object.entries(parsed.done)) {
    if (value === true) done[key] = true;
  }
  return { weekKey: parsed.weekKey, phraseIds: parsed.phraseIds as string[], done };
}

export type MetaDoc = { schemaVersion: number; migratedFromV1At?: number };

export function parseMeta(raw: string | null): MetaDoc | null {
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed.schemaVersion !== "number") return null;
  const meta: MetaDoc = { schemaVersion: parsed.schemaVersion };
  if (typeof parsed.migratedFromV1At === "number") {
    meta.migratedFromV1At = parsed.migratedFromV1At;
  }
  return meta;
}
