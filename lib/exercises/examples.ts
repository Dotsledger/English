import type { Phrase } from "@/lib/types";

/** All example sentences for a phrase: the primary plus any alternatives. */
export function phraseExamples(phrase: Phrase): string[] {
  return [phrase.example, ...(phrase.examples ?? [])];
}

/** Picks one example at random (rng-injectable; defaults to the primary). */
export function pickExample(phrase: Phrase, rng: () => number = () => 0): string {
  const all = phraseExamples(phrase);
  return all[Math.floor(rng() * all.length)] ?? phrase.example;
}
