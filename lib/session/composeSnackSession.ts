import type { CaptureStore, DeckStore } from "@/lib/types";
import type { SessionCard, SessionPlan } from "@/lib/session/types";
import type { ComposerContent } from "@/lib/session/composeCategorySession";
import { pickRandomTopics } from "@/lib/pickTopics";
import { dueEntries, upcomingEntries } from "@/lib/session/leitner";
import { buildReviewExercise } from "@/lib/session/exercisePicker";
import { interleaveCheckpoints } from "@/lib/session/checkpoints";

const DEFAULT_TARGET = 13;
const DUE_SHARE = 0.6;
const FLOOR = 6;

/**
 * The one-tap "Daily Snack": ~60% due reviews (most overdue first, capped
 * so a big backlog never becomes a wall — Leitner tolerates lateness),
 * ~40% new content from unseen topics, interleaved ~2 reviews per content
 * chunk so it never feels like a homework block. Shortfalls lean the
 * session the other way; an empty deck plus no unseen content yields an
 * end-card-only plan ("todo al día").
 */
export function composeSnackSession(opts: {
  deck: DeckStore;
  captures: CaptureStore;
  content: ComposerContent;
  completedTopicIds: Set<string>;
  now: number;
  targetCards?: number;
  rng?: () => number;
}): SessionPlan {
  const rng = opts.rng ?? Math.random;
  const target = opts.targetCards ?? DEFAULT_TARGET;
  const { deck, now, content } = opts;

  const exerciseDeps = {
    phrases: content.phrases,
    phraseById: content.phraseById,
    index: content.index,
    captures: opts.captures,
    rng,
  };

  const toReviewCard = (entry: (typeof due)[number]): SessionCard | null => {
    const exercise = buildReviewExercise(entry, exerciseDeps);
    return exercise ? { kind: "review", exercise, box: entry.box, stage: entry.stage } : null;
  };

  const due = dueEntries(deck, now);
  const dueTarget = Math.round(target * DUE_SHARE);
  const reviewCards: SessionCard[] = [];
  for (const entry of due) {
    if (reviewCards.length >= dueTarget) break;
    const card = toReviewCard(entry);
    if (card) reviewCards.push(card);
  }

  // New content: unseen, unsuppressed phrases from not-yet-completed topics.
  const suppressed = new Set(
    Object.values(deck).filter((e) => e.suppressed).map((e) => e.phraseId)
  );
  const isNewScene = (phraseId: string) =>
    !suppressed.has(phraseId) && (deck[phraseId]?.timesSeen ?? 0) === 0;

  let contentBudget = target - reviewCards.length;
  const checkpointBudget = Math.floor(contentBudget / 6);
  contentBudget -= checkpointBudget;

  const contentCards: SessionCard[] = [];
  const freshTopics = content.topics.filter((t) => !opts.completedTopicIds.has(t.id));
  for (const topic of pickRandomTopics(freshTopics, freshTopics.length, rng)) {
    if (contentCards.length >= contentBudget) break;
    const newScenes = content.scenes.filter(
      (s) => s.topicId === topic.id && isNewScene(s.phraseId)
    );
    if (newScenes.length === 0) continue;
    for (const scene of newScenes) {
      if (contentCards.length >= contentBudget) break;
      contentCards.push({ kind: "content", scene });
    }
  }

  // Not enough new content → lean review beyond the 60% share.
  if (contentCards.length < contentBudget) {
    for (const entry of due.slice(dueTarget)) {
      if (reviewCards.length + contentCards.length >= target - checkpointBudget) break;
      const card = toReviewCard(entry);
      if (card) reviewCards.push(card);
    }
  }

  // Still thin → pull almost-due entries up to a friendly floor.
  if (reviewCards.length + contentCards.length < FLOOR) {
    const alreadyQueued = new Set(
      reviewCards.map((c) => (c.kind === "review" ? c.exercise.phraseId : ""))
    );
    for (const entry of upcomingEntries(deck, now)) {
      if (reviewCards.length + contentCards.length >= FLOOR) break;
      if (alreadyQueued.has(entry.phraseId)) continue;
      const card = toReviewCard(entry);
      if (card) reviewCards.push(card);
    }
  }

  // Interleave: ~2 reviews, then a content chunk of ~3, repeat.
  const merged: SessionCard[] = [];
  let reviewIdx = 0;
  let contentIdx = 0;
  while (reviewIdx < reviewCards.length || contentIdx < contentCards.length) {
    for (let i = 0; i < 2 && reviewIdx < reviewCards.length; i++) {
      merged.push(reviewCards[reviewIdx++]);
    }
    for (let i = 0; i < 3 && contentIdx < contentCards.length; i++) {
      merged.push(contentCards[contentIdx++]);
    }
  }

  const cards = interleaveCheckpoints(merged, {
    authored: content.authoredCheckpoints,
    phrases: content.phrases,
    phraseById: content.phraseById,
    index: content.index,
    rng,
    budget: checkpointBudget,
  });

  cards.push({ kind: "end" });
  return { id: `s-${Math.floor(rng() * 1e9)}`, mode: "snack", cards };
}
