import type { DeckStore, PhraseStage } from "@/lib/types";
import type { SessionCard } from "@/lib/session/types";

const DAY = 24 * 60 * 60 * 1000;

const STAGE_ORDER: PhraseStage[] = [
  "new",
  "seen",
  "recognised",
  "recalled",
  "usable",
  "mastered",
];
const rank = (s: PhraseStage) => STAGE_ORDER.indexOf(s);

export type StageSnapshot = Record<string, PhraseStage>;

/** Every phrase a session touches, for the before/after stage diff. */
export function planPhraseIds(cards: SessionCard[]): string[] {
  const ids = new Set<string>();
  for (const card of cards) {
    switch (card.kind) {
      case "content":
        ids.add(card.scene.phraseId);
        break;
      case "checkpoint":
      case "review":
        ids.add(card.exercise.phraseId);
        break;
      case "context":
      case "situation":
      case "contrast":
      case "correction":
      case "typed_correction":
      case "mastery":
        ids.add(card.phraseId);
        break;
    }
  }
  return [...ids];
}

/** How a phrase was practised in a session, for the completion recap. Higher
 * rank = more effortful retrieval; when a phrase appears in several card kinds
 * we surface the most demanding one. */
const PRACTICE_LABELS: { kinds: SessionCard["kind"][]; label: string }[] = [
  { kinds: ["mastery"], label: "production" },
  { kinds: ["typed_correction"], label: "typed correction" },
  { kinds: ["correction"], label: "correction" },
  { kinds: ["situation"], label: "situation" },
  { kinds: ["contrast"], label: "contrast" },
  { kinds: ["review"], label: "review" },
  { kinds: ["checkpoint"], label: "recognition" },
  { kinds: ["context", "content"], label: "new" },
];

function practiceRank(kind: SessionCard["kind"]): number {
  const i = PRACTICE_LABELS.findIndex((p) => p.kinds.includes(kind));
  return i === -1 ? PRACTICE_LABELS.length : i;
}

function cardPhraseId(card: SessionCard): string | null {
  switch (card.kind) {
    case "content":
      return card.scene.phraseId;
    case "checkpoint":
    case "review":
      return card.exercise.phraseId;
    case "context":
    case "situation":
    case "contrast":
    case "correction":
    case "typed_correction":
    case "mastery":
      return card.phraseId;
    default:
      return null;
  }
}

export type PracticedPhrase = { phraseId: string; label: string };

/**
 * The distinct phrases a session practised, each tagged with how it was
 * practised (the most demanding card kind that touched it). Preserves first-
 * appearance order. Powers the "Today you practised…" completion list.
 */
export function practicedInSession(cards: SessionCard[]): PracticedPhrase[] {
  const best = new Map<string, number>();
  const order: string[] = [];
  for (const card of cards) {
    const id = cardPhraseId(card);
    if (id === null) continue;
    const rank = practiceRank(card.kind);
    if (!best.has(id)) order.push(id);
    const prev = best.get(id);
    if (prev === undefined || rank < prev) best.set(id, rank);
  }
  return order.map((id) => ({ phraseId: id, label: PRACTICE_LABELS[best.get(id)!].label }));
}

/** Stage of each phrase before the session (no deck entry ⇒ "new"). */
export function snapshotStages(deck: DeckStore, ids: Iterable<string>): StageSnapshot {
  const snap: StageSnapshot = {};
  for (const id of ids) snap[id] = deck[id]?.stage ?? "new";
  return snap;
}

/**
 * A learning-framed recap: how many phrases advanced INTO each stage this
 * session (bucketed by their final stage, counted once), plus how many are
 * coming back within a day. Rewards state transitions, not cards consumed.
 */
export type SessionRecap = {
  metNew: number; // new → seen
  toRecognised: number;
  toRecalled: number;
  toUsable: number;
  toMastered: number;
  dueTomorrow: number;
};

export function computeSessionRecap(
  before: StageSnapshot,
  deck: DeckStore,
  now: number
): SessionRecap {
  const recap: SessionRecap = {
    metNew: 0,
    toRecognised: 0,
    toRecalled: 0,
    toUsable: 0,
    toMastered: 0,
    dueTomorrow: 0,
  };
  for (const [id, was] of Object.entries(before)) {
    const nowStage = deck[id]?.stage ?? was;
    if (rank(nowStage) <= rank(was)) continue; // no advance (never regress)
    switch (nowStage) {
      case "seen":
        recap.metNew += 1;
        break;
      case "recognised":
        recap.toRecognised += 1;
        break;
      case "recalled":
        recap.toRecalled += 1;
        break;
      case "usable":
        recap.toUsable += 1;
        break;
      case "mastered":
        recap.toMastered += 1;
        break;
    }
  }
  for (const e of Object.values(deck)) {
    if (
      e.inDeck &&
      !e.suppressed &&
      !e.frozen &&
      e.nextReviewAt !== null &&
      e.nextReviewAt > now &&
      e.nextReviewAt <= now + DAY
    ) {
      recap.dueTomorrow += 1;
    }
  }
  return recap;
}

/** Whether the recap has anything worth showing as a state change. */
export function recapHasTransitions(r: SessionRecap): boolean {
  return r.metNew + r.toRecognised + r.toRecalled + r.toUsable + r.toMastered > 0;
}
