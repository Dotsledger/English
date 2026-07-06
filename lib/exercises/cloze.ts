import type { Phrase } from "@/lib/types";
import type { ClozeExercise } from "@/lib/exercises/types";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Finds where a phrase (or one of its variants) sits inside `text`, using
 * the same tolerance as phraseAppearsIn (case, curly apostrophes, flexible
 * whitespace) but returning the ORIGINAL substring so casing is preserved.
 */
export function locatePhrase(
  text: string,
  phrase: Phrase
): { start: number; end: number; matched: string } | null {
  const candidates = [phrase.text, ...(phrase.variants ?? [])];
  for (const candidate of candidates) {
    const pattern = escapeRegex(candidate)
      .replace(/ /g, "\\s+")
      .replace(/'/g, "[’‘']");
    const match = new RegExp(pattern, "i").exec(text);
    if (match) {
      return { start: match.index, end: match.index + match[0].length, matched: match[0] };
    }
  }
  return null;
}

/**
 * Cloze from one of the phrase's example sentences (defaults to the
 * primary; reviews pass a rotated one): the phrase is blanked and the
 * first letter shown as a hint. Null when the phrase can't be located
 * (callers fall back to MCQ; a content test keeps catalog phrases at 100%).
 */
export function generateCloze(
  phrase: Phrase,
  example: string = phrase.example
): ClozeExercise | null {
  const location = locatePhrase(example, phrase);
  if (!location) return null;
  return {
    type: "cloze",
    phraseId: phrase.id,
    before: example.slice(0, location.start),
    after: example.slice(location.end),
    hint: location.matched[0],
    answer: location.matched,
    acceptedAnswers: [phrase.text, ...(phrase.variants ?? [])],
  };
}
