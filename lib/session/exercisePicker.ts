import type { CaptureStore, DeckEntry, Phrase } from "@/lib/types";
import type { Exercise } from "@/lib/exercises/types";
import type { SessionCard } from "@/lib/session/types";
import { generateRecognitionMcq } from "@/lib/exercises/mcq";
import { generateCloze } from "@/lib/exercises/cloze";
import { generateFreeType, generateCaptureFreeType } from "@/lib/exercises/freetype";
import { pickExample } from "@/lib/exercises/examples";

export type ReviewDeps = {
  phrases: Phrase[];
  phraseById: Map<string, Phrase>;
  index: Map<string, Set<string>>;
  captures: CaptureStore;
  rng: () => number;
};

/** Boxes 1–2 recognise (MCQ), box 3 produce with scaffolding (cloze),
 * boxes 4–5 produce cold (freetype) — the two production boxes where
 * spoken production applies when the browser supports it. */
export function exerciseTypeFor(box: DeckEntry["box"]): Exercise["type"] {
  if (box <= 2) return "mcq";
  if (box === 3) return "cloze";
  return "freetype";
}

/** Whether a correct answer to this exercise counts as production. */
export function countsAsProduction(exercise: Exercise): boolean {
  return exercise.type !== "mcq";
}

/**
 * Builds the review exercise for a deck entry. Captured phrases have no
 * level/category/example, so they always review as free recall against
 * the user's own translation. Null means the entry can't be exercised
 * (deleted capture, unknown phrase) — callers skip it.
 */
export function buildReviewExercise(entry: DeckEntry, deps: ReviewDeps): Exercise | null {
  if (entry.source === "custom") {
    const capture = deps.captures[entry.phraseId];
    return capture ? generateCaptureFreeType(capture) : null;
  }
  const phrase = deps.phraseById.get(entry.phraseId);
  if (!phrase) return null;
  switch (exerciseTypeFor(entry.box)) {
    case "mcq":
      return generateRecognitionMcq(phrase, deps.phrases, deps.index, deps.rng);
    case "cloze": {
      // Rotate across the phrase's example contexts.
      const example = pickExample(phrase, deps.rng);
      return (
        generateCloze(phrase, example) ??
        generateRecognitionMcq(phrase, deps.phrases, deps.index, deps.rng)
      );
    }
    case "freetype":
      return generateFreeType(phrase);
  }
}

/**
 * Wraps a deck entry into the session card it should review as. A catalog
 * phrase at box 5 that hasn't been mastered yet gets the free-production
 * mastery gate; everything else gets a normal review exercise. Null when
 * the entry can't be exercised.
 */
export function reviewCardFor(entry: DeckEntry, deps: ReviewDeps): SessionCard | null {
  if (entry.source === "catalog" && entry.box === 5 && entry.stage !== "mastered") {
    return { kind: "mastery", phraseId: entry.phraseId };
  }
  const exercise = buildReviewExercise(entry, deps);
  return exercise ? { kind: "review", exercise, box: entry.box, stage: entry.stage } : null;
}
