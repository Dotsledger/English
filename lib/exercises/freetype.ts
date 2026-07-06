import type { CapturedPhrase, Phrase } from "@/lib/types";
import type { FreeTypeExercise } from "@/lib/exercises/types";

/** Final-box review: produce the phrase from its Spanish meaning. */
export function generateFreeType(phrase: Phrase): FreeTypeExercise {
  return {
    type: "freetype",
    phraseId: phrase.id,
    promptEs: phrase.meaningEs,
    acceptedAnswers: [phrase.text, ...(phrase.variants ?? [])],
  };
}

/**
 * Captured phrases have no level/category/example, so they review as
 * free recall against the user's own translation (or note) at every box.
 */
export function generateCaptureFreeType(capture: CapturedPhrase): FreeTypeExercise {
  return {
    type: "freetype",
    phraseId: capture.id,
    promptEs: capture.meaningEs || capture.note || "Tu frase capturada",
    acceptedAnswers: [capture.text],
  };
}
