import { getBackend } from "@/lib/storage/backend";
import { flushWrites } from "@/lib/storage/writeQueue";
import {
  KEY_ACTIVITY,
  KEY_CAPTURES,
  KEY_DECK,
  KEY_DISMISSED,
  KEY_LEVEL,
  KEY_META,
  KEY_MISSION,
  KEY_SENTENCES,
  KEY_TOPICS,
} from "@/lib/storage/keys";
import {
  parseActivity,
  parseCaptures,
  parseDeck,
  parseDismissed,
  parseLevel,
  parseMeta,
  parseMission,
  parseSentences,
  parseTopics,
} from "@/lib/storage/docs";

const EXPORTED_KEYS = [
  KEY_DECK,
  KEY_TOPICS,
  KEY_CAPTURES,
  KEY_ACTIVITY,
  KEY_MISSION,
  KEY_SENTENCES,
  KEY_LEVEL,
  KEY_DISMISSED,
];

export type ExportBundle = {
  app: "sticky-english";
  schemaVersion: 2;
  exportedAt: number;
  data: Record<string, unknown>;
};

export async function exportAll(now: number = Date.now()): Promise<ExportBundle> {
  await flushWrites();
  const backend = await getBackend();
  const data: Record<string, unknown> = {};
  for (const key of EXPORTED_KEYS) {
    const raw = await backend.get(key);
    if (raw !== null) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        // skip corrupted docs — the export should always succeed
      }
    }
  }
  return { app: "sticky-english", schemaVersion: 2, exportedAt: now, data };
}

/**
 * Validates every document through its corruption-safe parser before
 * writing (never trust the file). The caller must reload the page
 * afterwards so React state re-hydrates from storage.
 */
export async function importAll(
  raw: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  let bundle: unknown;
  try {
    bundle = JSON.parse(raw);
  } catch {
    return { ok: false, error: "El archivo no es JSON válido." };
  }
  if (
    typeof bundle !== "object" ||
    bundle === null ||
    (bundle as Record<string, unknown>).app !== "sticky-english" ||
    typeof (bundle as Record<string, unknown>).data !== "object" ||
    (bundle as Record<string, unknown>).data === null
  ) {
    return { ok: false, error: "El archivo no es una copia de Sticky English." };
  }
  const data = (bundle as { data: Record<string, unknown> }).data;

  const reserialize = (key: string): string | null => {
    if (!(key in data)) return null;
    const raw = JSON.stringify(data[key]);
    switch (key) {
      case KEY_DECK:
        return JSON.stringify(parseDeck(raw));
      case KEY_TOPICS:
        return JSON.stringify(parseTopics(raw));
      case KEY_CAPTURES:
        return JSON.stringify(parseCaptures(raw));
      case KEY_ACTIVITY:
        return JSON.stringify(parseActivity(raw));
      case KEY_MISSION: {
        const mission = parseMission(raw);
        return mission ? JSON.stringify(mission) : null;
      }
      case KEY_SENTENCES:
        return JSON.stringify(parseSentences(raw));
      case KEY_LEVEL:
        return JSON.stringify(parseLevel(raw));
      case KEY_DISMISSED:
        return JSON.stringify(parseDismissed(raw));
      default:
        return null;
    }
  };

  const backend = await getBackend();
  for (const key of EXPORTED_KEYS) {
    const validated = reserialize(key);
    if (validated !== null) await backend.set(key, validated);
  }
  const existingMeta = parseMeta(await backend.get(KEY_META));
  if (!existingMeta || existingMeta.schemaVersion < 2) {
    await backend.set(KEY_META, JSON.stringify({ schemaVersion: 2 }));
  }
  return { ok: true };
}
