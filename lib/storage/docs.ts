import type {
  ActivityStore,
  Box,
  CapturedPhrase,
  CaptureStore,
  DeckEntry,
  DeckStore,
  CefrBand,
  LevelState,
  MissionStore,
  PhraseStage,
  SentenceStore,
  TriageStore,
} from "@/lib/types";
import { initialLevel } from "@/lib/level";

/**
 * Corruption-safe parsers for every v2 document. Same philosophy as v1's
 * parseStore: bad JSON or malformed entries fall back to empty, never throw.
 */

const STAGES: PhraseStage[] = ["new", "seen", "recognised", "recalled", "usable", "mastered"];
/** Stages accepted on load: the current set plus the legacy "produced"
 * (migrated to "recalled" in parseDeck). Keeps old records from being
 * dropped as corrupt. */
const LEGACY_STAGE_VALUES = new Set<string>([...STAGES, "produced"]);
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
    typeof e.stage === "string" &&
    LEGACY_STAGE_VALUES.has(e.stage) &&
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
    isNumberOrNull(e.addedToDeckAt) &&
    // Optional v3 fields: absent is fine; present must be well-typed.
    (e.frozen === undefined || typeof e.frozen === "boolean") &&
    (e.producedAt === undefined || isNumberOrNull(e.producedAt))
  );
}

export function parseDeck(raw: string | null): DeckStore {
  const parsed = safeParse(raw);
  if (!parsed) return {};
  const store: DeckStore = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (isValidDeckEntry(value)) {
      // Migrate the legacy "produced" stage → "recalled" (same rank position).
      store[key] =
        (value.stage as string) === "produced" ? { ...value, stage: "recalled" } : value;
    }
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

/** Skipped-suggestion IDs. Any non-string key / non-true value is dropped. */
export function parseDismissed(raw: string | null): Record<string, true> {
  const parsed = safeParse(raw);
  if (!parsed) return {};
  const store: Record<string, true> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value === true) store[key] = true;
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

export function parseTriage(raw: string | null): TriageStore {
  const parsed = safeParse(raw);
  if (
    !parsed ||
    typeof parsed.lastThawDate !== "string" ||
    typeof parsed.thawedToday !== "number"
  ) {
    return { lastThawDate: "", thawedToday: 0 };
  }
  const store: TriageStore = { lastThawDate: parsed.lastThawDate, thawedToday: parsed.thawedToday };
  if (typeof parsed.recapAckedWeek === "string") store.recapAckedWeek = parsed.recapAckedWeek;
  return store;
}

export function parseSentences(raw: string | null): SentenceStore {
  const parsed = safeParse(raw);
  if (!parsed) return {};
  const store: SentenceStore = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!Array.isArray(value)) continue;
    const list = value.filter(
      (s): s is { text: string; createdAt: number } =>
        isRecord(s) && typeof s.text === "string" && typeof s.createdAt === "number"
    );
    if (list.length > 0) store[key] = list;
  }
  return store;
}

const BANDS: CefrBand[] = ["B2", "C1", "C2"];

/** Corruption-safe: any malformed field falls back to a fresh B2.0 state. */
export function parseLevel(raw: string | null): LevelState {
  const parsed = safeParse(raw);
  const fresh = initialLevel();
  if (!parsed) return fresh;
  const band = BANDS.includes(parsed.band as CefrBand) ? (parsed.band as CefrBand) : fresh.band;
  const sub =
    typeof parsed.sub === "number" && parsed.sub >= 0 && parsed.sub <= 10 ? parsed.sub : fresh.sub;
  const cardsSinceCheck =
    typeof parsed.cardsSinceCheck === "number" && parsed.cardsSinceCheck >= 0
      ? parsed.cardsSinceCheck
      : 0;
  const checkThreshold =
    typeof parsed.checkThreshold === "number" && parsed.checkThreshold > 0
      ? parsed.checkThreshold
      : fresh.checkThreshold;
  const history = Array.isArray(parsed.history)
    ? parsed.history.filter(
        (h): h is LevelState["history"][number] =>
          isRecord(h) &&
          BANDS.includes(h.band as CefrBand) &&
          typeof h.sub === "number" &&
          typeof h.score === "number" &&
          typeof h.at === "number"
      )
    : [];
  return {
    band,
    sub,
    cardsSinceCheck,
    checkThreshold,
    history,
    tooltipSeen: parsed.tooltipSeen === true,
    lastDismissedAt: typeof parsed.lastDismissedAt === "number" ? parsed.lastDismissedAt : null,
  };
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
