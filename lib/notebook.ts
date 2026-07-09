import type { DeckStore, PhraseStage } from "@/lib/types";

/**
 * "My phrases" (vocabulary notebook) — a pure, read-only visibility layer over
 * the deck. It never schedules, advances, or mutates anything; it only groups
 * what the user has met/saved by learning stage and reports when each phrase is
 * next coming back. Spaced repetition stays the sole review engine.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Display order + human label per stage (as the product spec lists them). */
export const NOTEBOOK_STAGES: { stage: PhraseStage; label: string }[] = [
  { stage: "new", label: "New" },
  { stage: "seen", label: "Seen" },
  { stage: "recognised", label: "Recognised" },
  { stage: "recalled", label: "Recalled" },
  { stage: "usable", label: "Usable" },
  { stage: "mastered", label: "Mastered" },
];

const STAGE_LABEL: Record<PhraseStage, string> = Object.fromEntries(
  NOTEBOOK_STAGES.map((s) => [s.stage, s.label])
) as Record<PhraseStage, string>;

export function getStageLabel(stage: PhraseStage): string {
  return STAGE_LABEL[stage];
}

export type ReviewState = "due" | "scheduled" | "unscheduled";

export type NotebookItem = {
  phraseId: string;
  stage: PhraseStage;
  /** Whether the phrase is in the active review queue. */
  inDeck: boolean;
  reviewState: ReviewState;
  /** Human label: "Due today", "Back Jul 12", or "" when unscheduled. */
  reviewLabel: string;
};

export type NotebookGroup = {
  stage: PhraseStage;
  label: string;
  items: NotebookItem[];
};

/** Short, locale-formatted date like "Jul 12" for the next-review hint. */
export function formatReviewDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function reviewInfo(
  inDeck: boolean,
  nextReviewAt: number | null,
  now: number
): { state: ReviewState; label: string } {
  if (!inDeck || nextReviewAt === null) return { state: "unscheduled", label: "" };
  if (nextReviewAt <= now) return { state: "due", label: "Due today" };
  // Anything landing inside the next day reads as "tomorrow"; else a short date.
  if (nextReviewAt <= now + DAY) return { state: "scheduled", label: "Back tomorrow" };
  return { state: "scheduled", label: `Back ${formatReviewDate(nextReviewAt)}` };
}

/**
 * Groups the deck into notebook sections by stage, newest-progress order as
 * declared in NOTEBOOK_STAGES. Includes any phrase the user has actually
 * engaged with — saved to the deck OR seen at least once — and excludes
 * suppressed ("ya la domino") phrases, which the user has explicitly retired.
 * Within a stage, due phrases lead, then the rest by phraseId for stability.
 * Empty groups are omitted.
 */
export function notebookGroups(deck: DeckStore, now: number): NotebookGroup[] {
  const byStage = new Map<PhraseStage, NotebookItem[]>();
  for (const entry of Object.values(deck)) {
    if (entry.suppressed) continue;
    if (!entry.inDeck && entry.timesSeen === 0) continue;
    const { state, label } = reviewInfo(entry.inDeck, entry.nextReviewAt, now);
    const item: NotebookItem = {
      phraseId: entry.phraseId,
      stage: entry.stage,
      inDeck: entry.inDeck,
      reviewState: state,
      reviewLabel: label,
    };
    const list = byStage.get(entry.stage) ?? [];
    list.push(item);
    byStage.set(entry.stage, list);
  }

  const groups: NotebookGroup[] = [];
  for (const { stage, label } of NOTEBOOK_STAGES) {
    const items = byStage.get(stage);
    if (!items || items.length === 0) continue;
    items.sort((a, b) => {
      if (a.reviewState === "due" && b.reviewState !== "due") return -1;
      if (b.reviewState === "due" && a.reviewState !== "due") return 1;
      return a.phraseId < b.phraseId ? -1 : a.phraseId > b.phraseId ? 1 : 0;
    });
    groups.push({ stage, label, items });
  }
  return groups;
}

/** How many phrases the user added to the deck on a given local ISO date. */
export function addedOnCount(deck: DeckStore, isoDate: string): number {
  let n = 0;
  for (const entry of Object.values(deck)) {
    if (entry.addedToDeckAt === null || entry.addedToDeckAt === undefined) continue;
    const d = new Date(entry.addedToDeckAt);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    if (iso === isoDate) n += 1;
  }
  return n;
}
