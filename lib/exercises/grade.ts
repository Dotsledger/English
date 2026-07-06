import { normalize } from "@/lib/text";

export type GradeResult =
  | { verdict: "correct"; matched: string }
  /** One typo away — counts as correct for scheduling; UI shows the canonical form. */
  | { verdict: "near"; matched: string }
  | { verdict: "wrong" };

/** Grading normalization: shared normalize() plus trim and trailing punctuation. */
export const cleanAnswer = (s: string) => normalize(s).trim().replace(/[.,!?;:]+$/, "");

/**
 * True if the strings are within Damerau–Levenshtein distance 1
 * (one substitution, insertion, deletion, or adjacent transposition).
 */
export function withinEditDistance1(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  const min = Math.min(a.length, b.length);
  while (i < min && a[i] === b[i]) i++;
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true; // substitution
    return (
      i + 1 < a.length &&
      a[i] === b[i + 1] &&
      a[i + 1] === b[i] &&
      a.slice(i + 2) === b.slice(i + 2) // transposition
    );
  }
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  return shorter.slice(i) === longer.slice(i + 1); // insertion/deletion
}

/**
 * Grades a typed answer. Typo tolerance (distance 1) only applies to
 * accepted answers of 5+ characters, and never when the input is also one
 * typo away from a *different* phrase's answer (`conflictingAnswers`) —
 * ambiguity gets no credit.
 */
export function gradeAnswer(
  input: string,
  acceptedAnswers: string[],
  conflictingAnswers: string[] = []
): GradeResult {
  const typed = cleanAnswer(input);
  if (typed.length === 0) return { verdict: "wrong" };

  for (const accepted of acceptedAnswers) {
    if (typed === cleanAnswer(accepted)) return { verdict: "correct", matched: accepted };
  }

  for (const accepted of acceptedAnswers) {
    const target = cleanAnswer(accepted);
    // Letters only — "as of" is 5 chars but 4 letters, too short to forgive.
    if (target.replace(/[^a-z0-9]/g, "").length < 5) continue;
    if (withinEditDistance1(typed, target)) {
      const ambiguous = conflictingAnswers.some((other) =>
        withinEditDistance1(typed, cleanAnswer(other))
      );
      if (ambiguous) return { verdict: "wrong" };
      return { verdict: "near", matched: accepted };
    }
  }
  return { verdict: "wrong" };
}

/**
 * Grades a spoken utterance against a target phrase. Speech recognition
 * drops punctuation and rewords freely, and the target usually sits inside
 * a longer sentence, so we slide the target's token window across the
 * transcript and accept when ≥ 80% of the target tokens match (each token
 * exact or one typo away). Any accepted answer (text or variant) can match.
 */
export function matchesSpokenTarget(transcript: string, acceptedAnswers: string[]): boolean {
  const spokenTokens = cleanAnswer(transcript).split(" ").filter(Boolean);
  if (spokenTokens.length === 0) return false;

  for (const accepted of acceptedAnswers) {
    const target = cleanAnswer(accepted).split(" ").filter(Boolean);
    if (target.length === 0) continue;
    const need = Math.ceil(target.length * 0.8);
    // Try every window of the transcript the width of the target phrase.
    for (let start = 0; start + target.length <= spokenTokens.length; start++) {
      let hits = 0;
      for (let i = 0; i < target.length; i++) {
        const a = target[i];
        const b = spokenTokens[start + i];
        if (a === b || withinEditDistance1(a, b)) hits += 1;
      }
      if (hits >= need) return true;
    }
    // Single-token targets that appear anywhere also count.
    if (target.length === 1 && spokenTokens.some((t) => t === target[0] || withinEditDistance1(t, target[0]))) {
      return true;
    }
  }
  return false;
}
