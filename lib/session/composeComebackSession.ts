import type { CaptureStore, DeckStore } from "@/lib/types";
import type { SessionCard, SessionPlan } from "@/lib/session/types";
import type { ComposerContent } from "@/lib/session/composeCategorySession";
import { buildReviewExercise } from "@/lib/session/exercisePicker";
import { valuableDue, COMEBACK_SIZE } from "@/lib/session/triage";

/**
 * The comeback micro-session (Feature 1): after ≥ 4 days away, a short
 * review-only run of the most valuable due items (highest box = closest to
 * being lost). No new content, no checkpoints, no backlog number, no guilt —
 * just a 90-second win to re-anchor the habit.
 */
export function composeComebackSession(opts: {
  deck: DeckStore;
  captures: CaptureStore;
  content: ComposerContent;
  now: number;
  size?: number;
  rng?: () => number;
}): SessionPlan {
  const rng = opts.rng ?? Math.random;
  const size = opts.size ?? COMEBACK_SIZE;
  const exerciseDeps = {
    phrases: opts.content.phrases,
    phraseById: opts.content.phraseById,
    index: opts.content.index,
    captures: opts.captures,
    rng,
  };

  const cards: SessionCard[] = [];
  for (const entry of valuableDue(opts.deck, opts.now, size)) {
    const exercise = buildReviewExercise(entry, exerciseDeps);
    if (exercise) cards.push({ kind: "review", exercise, box: entry.box, stage: entry.stage });
  }

  cards.push({ kind: "end" });
  return { id: `s-${Math.floor(rng() * 1e9)}`, mode: "comeback", cards };
}
