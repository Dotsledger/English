import type { CaptureStore, DeckEntry, Phrase } from "@/lib/types";
import type { Exercise } from "@/lib/exercises/types";
import type { SessionCard } from "@/lib/session/types";
import { generateRecognitionMcq } from "@/lib/exercises/mcq";
import { generateCloze } from "@/lib/exercises/cloze";
import { generateFreeType, generateCaptureFreeType } from "@/lib/exercises/freetype";
import { pickExample } from "@/lib/exercises/examples";
import { resolvePracticeType, type PracticeType } from "@/lib/session/exercisePolicy";

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

/** Builds the {kind:"review"} card for a concrete exercise-type choice. */
function reviewExerciseCard(
  type: "recognition" | "cloze" | "reverse",
  phrase: Phrase,
  entry: DeckEntry,
  deps: ReviewDeps
): SessionCard {
  let exercise: Exercise;
  if (type === "recognition") {
    exercise = generateRecognitionMcq(phrase, deps.phrases, deps.index, deps.rng);
  } else if (type === "cloze") {
    exercise =
      generateCloze(phrase, pickExample(phrase, deps.rng)) ??
      generateRecognitionMcq(phrase, deps.phrases, deps.index, deps.rng);
  } else {
    exercise = generateFreeType(phrase);
  }
  return { kind: "review", exercise, box: entry.box, stage: entry.stage };
}

/** Maps a resolved practice type to the session card that delivers it. */
function practiceCard(
  type: PracticeType,
  phrase: Phrase,
  entry: DeckEntry,
  deps: ReviewDeps
): SessionCard {
  switch (type) {
    case "situation":
      return { kind: "situation", phraseId: entry.phraseId };
    case "contrast":
      return { kind: "contrast", phraseId: entry.phraseId };
    case "production":
      return { kind: "mastery", phraseId: entry.phraseId };
    default:
      return reviewExerciseCard(type, phrase, entry, deps);
  }
}

/**
 * Wraps a deck entry into the session card it should review as.
 *
 * Strategy phrases (those with a vocabulary `category`) route by pedagogy —
 * the practice type is chosen from the category's preference and the phrase's
 * memory stage (see exercisePolicy). Plain catalog phrases and custom captures
 * keep the original box-driven behaviour (box 5 → mastery gate, else MCQ/cloze/
 * freetype). Null when the entry can't be exercised (deleted capture, unknown
 * phrase).
 */
export function reviewCardFor(entry: DeckEntry, deps: ReviewDeps): SessionCard | null {
  if (entry.source === "custom") {
    const exercise = buildReviewExercise(entry, deps);
    return exercise ? { kind: "review", exercise, box: entry.box, stage: entry.stage } : null;
  }

  const phrase = deps.phraseById.get(entry.phraseId);
  if (!phrase) return null;

  // Pedagogy-aware routing for strategy phrases.
  if (phrase.category) {
    const type = resolvePracticeType(phrase, entry.stage);
    return practiceCard(type, phrase, entry, deps);
  }

  // Plain catalog phrases: unchanged box-driven behaviour.
  if (entry.box === 5 && entry.stage !== "mastered") {
    return { kind: "mastery", phraseId: entry.phraseId };
  }
  const exercise = buildReviewExercise(entry, deps);
  return exercise ? { kind: "review", exercise, box: entry.box, stage: entry.stage } : null;
}
