import type { Phrase } from "@/lib/types";
import type { McqExercise } from "@/lib/exercises/types";
import { normalize } from "@/lib/text";
import { locatePhrase } from "@/lib/exercises/cloze";

const OPTION_COUNT = 3;

function shuffle<T>(list: T[], rng: () => number): T[] {
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const wordCount = (s: string) => s.trim().split(/\s+/).length;

/**
 * Distractor ladder: same category+level → same level → any phrase.
 * Excluded everywhere: the target itself, anything normalizing to one of
 * the target's accepted answers (a second correct option), and anything
 * sharing the target's Spanish meaning (ambiguous for ES→EN prompts).
 */
function pickDistractors(
  target: Phrase,
  allPhrases: Phrase[],
  index: Map<string, Set<string>>,
  rng: () => number,
  preferWordCount?: number
): Phrase[] {
  const targetAnswers = new Set(
    [target.text, ...(target.variants ?? [])].map((t) => normalize(t))
  );
  const targetMeaning = normalize(target.meaningEs);
  const targetCategories = index.get(target.id) ?? new Set<string>();

  const eligible = allPhrases.filter(
    (p) =>
      p.id !== target.id &&
      !targetAnswers.has(normalize(p.text)) &&
      normalize(p.meaningEs) !== targetMeaning
  );

  const sharesCategory = (p: Phrase) => {
    const categories = index.get(p.id);
    if (!categories) return false;
    for (const c of categories) if (targetCategories.has(c)) return true;
    return false;
  };

  const ladder = [
    eligible.filter((p) => p.level === target.level && sharesCategory(p)),
    eligible.filter((p) => p.level === target.level),
    eligible,
  ];

  const picked: Phrase[] = [];
  const pickedIds = new Set<string>();
  for (const pool of ladder) {
    let candidates = pool.filter((p) => !pickedIds.has(p.id));
    if (preferWordCount !== undefined) {
      const similar = candidates.filter(
        (p) => Math.abs(wordCount(p.text) - preferWordCount) <= 1
      );
      if (similar.length >= OPTION_COUNT - 1 - picked.length) candidates = similar;
    }
    for (const p of shuffle(candidates, rng)) {
      if (picked.length >= OPTION_COUNT - 1) return picked;
      picked.push(p);
      pickedIds.add(p.id);
    }
  }
  return picked;
}

function buildMcq(
  phrase: Phrase,
  prompt: string,
  distractors: Phrase[],
  rng: () => number
): McqExercise {
  const options = shuffle([phrase.text, ...distractors.map((d) => d.text)], rng);
  return {
    type: "mcq",
    phraseId: phrase.id,
    prompt,
    options,
    correctIndex: options.indexOf(phrase.text),
  };
}

/** Review MCQ: Spanish meaning → pick the English phrase. */
export function generateRecognitionMcq(
  phrase: Phrase,
  allPhrases: Phrase[],
  index: Map<string, Set<string>>,
  rng: () => number = Math.random
): McqExercise {
  const distractors = pickDistractors(phrase, allPhrases, index, rng);
  return buildMcq(phrase, `“${phrase.meaningEs}”`, distractors, rng);
}

/** Session checkpoint MCQ: the phrase's example sentence with a blank. */
export function generateCheckpointMcq(
  phrase: Phrase,
  allPhrases: Phrase[],
  index: Map<string, Set<string>>,
  rng: () => number = Math.random
): McqExercise {
  const location = locatePhrase(phrase.example, phrase);
  const prompt = location
    ? `“${phrase.example.slice(0, location.start)}___${phrase.example.slice(location.end)}”`
    : `“${phrase.meaningEs}”`;
  const distractors = pickDistractors(
    phrase,
    allPhrases,
    index,
    rng,
    location ? wordCount(location.matched) : undefined
  );
  return buildMcq(phrase, prompt, distractors, rng);
}
