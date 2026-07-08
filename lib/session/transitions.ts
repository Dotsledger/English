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
      case "mastery":
        ids.add(card.phraseId);
        break;
    }
  }
  return [...ids];
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
