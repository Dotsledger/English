import type { CaptureStore, DeckEntry, Phrase } from "@/lib/types";
import type { Exercise } from "@/lib/exercises/types";
import { generateRecognitionMcq } from "@/lib/exercises/mcq";
import { generateCloze } from "@/lib/exercises/cloze";
import { generateFreeType, generateCaptureFreeType } from "@/lib/exercises/freetype";

/** Boxes 1–2 recognise, 3–4 produce with scaffolding, 5 produce cold. */
export function exerciseTypeFor(box: DeckEntry["box"]): Exercise["type"] {
  if (box <= 2) return "mcq";
  if (box <= 4) return "cloze";
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
export function buildReviewExercise(
  entry: DeckEntry,
  deps: {
    phrases: Phrase[];
    phraseById: Map<string, Phrase>;
    index: Map<string, Set<string>>;
    captures: CaptureStore;
    rng: () => number;
  }
): Exercise | null {
  if (entry.source === "custom") {
    const capture = deps.captures[entry.phraseId];
    return capture ? generateCaptureFreeType(capture) : null;
  }
  const phrase = deps.phraseById.get(entry.phraseId);
  if (!phrase) return null;
  switch (exerciseTypeFor(entry.box)) {
    case "mcq":
      return generateRecognitionMcq(phrase, deps.phrases, deps.index, deps.rng);
    case "cloze":
      return (
        generateCloze(phrase) ?? generateRecognitionMcq(phrase, deps.phrases, deps.index, deps.rng)
      );
    case "freetype":
      return generateFreeType(phrase);
  }
}
