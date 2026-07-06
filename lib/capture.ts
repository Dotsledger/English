import type { CapturedPhrase } from "@/lib/types";

/** "+" quick capture: a phrase heard in real life, into the deck in <10s. */
export function createCapture(
  text: string,
  note: string,
  meaningEs: string,
  now: number
): CapturedPhrase {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);
  return {
    id: `capture-${now}-${slug}`,
    text: text.trim(),
    note: note.trim(),
    meaningEs: meaningEs.trim(),
    createdAt: now,
  };
}

/**
 * v1 stub — captures are stored as typed. A future version can call a
 * server-side model here to add a translation, register and an example
 * before the capture enters the deck.
 */
export async function enrichCapture(capture: CapturedPhrase): Promise<CapturedPhrase> {
  return capture;
}
