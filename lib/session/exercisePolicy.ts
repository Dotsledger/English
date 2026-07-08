import type { Phrase, PhraseStage } from "@/lib/types";
import { locatePhrase } from "@/lib/exercises/cloze";

/**
 * Pedagogy-aware exercise policy. Different vocabulary categories need
 * different retrieval: a sentence frame wants production, a trap wants
 * contrast/correction, a phrasal verb wants situation transfer. This maps a
 * phrase's strategy metadata + memory stage to the kind of practice it needs
 * today — moving the learner recognition → recall → situation → production.
 *
 * Reuses the existing cards: recognition→MCQ, cloze/reverse→typed, situation→
 * SituationCard, production→MasteryCard, contrast(=correction)→ContrastCard.
 */
export type PracticeType =
  | "recognition"
  | "cloze"
  | "reverse"
  | "situation"
  | "production"
  | "contrast";

/** Ordered preference by category — most valuable retrieval first. */
export function getPreferredExerciseTypesForPhrase(phrase: Phrase): PracticeType[] {
  switch (phrase.category) {
    case "sentence_frame":
      return ["production", "situation", "reverse", "cloze", "recognition"];
    case "phrasal_verb":
      return ["situation", "reverse", "cloze", "recognition"];
    case "collocation":
      return ["contrast", "cloze", "reverse", "recognition"];
    case "spanish_speaker_trap":
    case "false_friend":
      return ["contrast", "cloze", "reverse", "recognition"];
    case "discourse_marker":
      return ["situation", "cloze", "reverse", "recognition"];
    case "work_communication":
      return ["situation", "production", "reverse", "cloze", "recognition"];
    case "daily_life":
    case "core_chunk":
      return ["situation", "reverse", "cloze", "recognition"];
    default:
      // high_frequency_verb_pattern, emotion_opinion, travel_social, advanced…
      return ["reverse", "cloze", "recognition"];
  }
}

const STAGE_RANK: Record<PhraseStage, number> = {
  new: 0,
  seen: 1,
  recognised: 2,
  recalled: 3,
  usable: 4,
  mastered: 5,
};

/**
 * Stage acts as a floor on how demanding the retrieval can be. You must
 * recognise before recalling, recall before producing — so productive types
 * unlock as the phrase matures. Recognition/cloze/contrast stay available
 * throughout (contrast is recognition-grade correction, useful from the start).
 */
export function stageAllowsPractice(type: PracticeType, stage: PhraseStage): boolean {
  const r = STAGE_RANK[stage];
  switch (type) {
    case "recognition":
    case "cloze":
    case "contrast":
      return true;
    case "reverse":
    case "situation":
      return r >= STAGE_RANK.recognised;
    case "production":
      return r >= STAGE_RANK.recalled;
  }
}

/** Whether the required metadata exists to generate this practice type. */
export function canGeneratePractice(type: PracticeType, phrase: Phrase): boolean {
  switch (type) {
    case "recognition":
    case "reverse":
    case "production":
      return true; // MCQ / typed-from-meaning / self-assessed production always work
    case "cloze":
      return locatePhrase(phrase.example, phrase) !== null;
    case "situation":
      return (phrase.situations?.length ?? 0) > 0;
    case "contrast":
      return (phrase.contrastWith?.length ?? 0) > 0;
  }
}

/**
 * The concrete practice type for a phrase right now: walk its category
 * preference, skip any the stage doesn't allow yet or whose metadata is
 * missing, and take the first that fits. Falls back to cloze then recognition
 * so it never returns something ungeneratable — never crashes on missing
 * situations / avoid / contrastWith.
 */
export function resolvePracticeType(phrase: Phrase, stage: PhraseStage): PracticeType {
  for (const type of getPreferredExerciseTypesForPhrase(phrase)) {
    if (stageAllowsPractice(type, stage) && canGeneratePractice(type, phrase)) return type;
  }
  if (canGeneratePractice("cloze", phrase)) return "cloze";
  return "recognition";
}
