import type { FrequencyBand, Phrase, VocabularyCategory } from "@/lib/types";

/**
 * Vocabulary strategy layer: transparent, deterministic helpers that let the
 * app prioritise *usable* English (reusable chunks, frames, phrasal verbs,
 * error-preventing traps) over isolated dictionary words. No data fetching, no
 * randomness — same input always yields the same score/priority.
 */

// ─── Category priority (Explore ordering) ───

/** Lower number = higher priority. Productive, high-leverage patterns first. */
const CATEGORY_PRIORITY: Record<VocabularyCategory, number> = {
  core_chunk: 1,
  sentence_frame: 2,
  high_frequency_verb_pattern: 3,
  phrasal_verb: 4,
  collocation: 5,
  discourse_marker: 6,
  spanish_speaker_trap: 7,
  work_communication: 8,
  daily_life: 9,
  emotion_opinion: 10,
  travel_social: 11,
  false_friend: 12,
  advanced_expression: 13,
};

export function getCategoryPriority(category: VocabularyCategory): number {
  return CATEGORY_PRIORITY[category];
}

// ─── Usefulness scoring ───

const FREQUENCY_BASE: Record<FrequencyBand, number> = {
  very_high: 60,
  high: 45,
  medium: 30,
  low: 15,
};

/** Category productive value — how much learning it improves real speaking. */
const CATEGORY_BOOST: Record<VocabularyCategory, number> = {
  sentence_frame: 20,
  core_chunk: 18,
  high_frequency_verb_pattern: 16,
  phrasal_verb: 14,
  collocation: 12,
  discourse_marker: 12,
  spanish_speaker_trap: 12,
  work_communication: 8,
  daily_life: 8,
  emotion_opinion: 6,
  travel_social: 6,
  false_friend: 6,
  advanced_expression: 2,
};

const DIFFICULTY_BOOST = { easy: 4, medium: 2, hard: 0 } as const;

/**
 * A 1–100 usefulness score built from strategic signals: frequency (base),
 * category productive value, whether it prevents a fossilised Spanish-speaker
 * error, high-frequency/phrasal reusability, and how producible it is
 * (easier → more likely to be actively used). Deterministic and clamped.
 *
 * Authored `usefulnessScore` on seed items may be used directly; this helper
 * lets future/unscored content be ranked consistently.
 */
export function calculateUsefulnessScore(item: Phrase): number {
  let score = FREQUENCY_BASE[item.frequencyBand ?? "medium"];
  if (item.category) score += CATEGORY_BOOST[item.category];
  if (item.isSpanishSpeakerTrap) score += 8; // prevents fossilized errors
  if (item.isHighFrequencyPattern) score += 6;
  if (item.isPhrasalVerb) score += 4; // reusable across many sentences
  score += DIFFICULTY_BOOST[item.difficulty ?? "medium"];
  return Math.max(1, Math.min(100, Math.round(score)));
}

// ─── Human-readable labels & rationale ───

const CATEGORY_LABEL: Record<VocabularyCategory, string> = {
  core_chunk: "Core chunk",
  phrasal_verb: "Phrasal verb",
  collocation: "Collocation",
  sentence_frame: "Sentence frame",
  discourse_marker: "Discourse marker",
  high_frequency_verb_pattern: "Verb pattern",
  work_communication: "Work",
  daily_life: "Daily life",
  emotion_opinion: "Emotion & opinion",
  travel_social: "Travel & social",
  false_friend: "False friend",
  spanish_speaker_trap: "Spanish-speaker trap",
  advanced_expression: "Advanced",
};

/** Short, readable label for an Explore card chip. */
export function getCategoryLabel(category: VocabularyCategory): string {
  return CATEGORY_LABEL[category];
}

/**
 * One concise line explaining why an item is worth learning, driven by its
 * strategy metadata. Null when the item has no strategy category (so plain
 * catalog phrases show nothing extra).
 */
export function getWhyThisMatters(item: Phrase): string | null {
  // Error-prevention framing wins even when the item is also a collocation.
  if (item.isSpanishSpeakerTrap || item.category === "spanish_speaker_trap" || item.category === "false_friend") {
    return "Prevents a common Spanish-to-English mistake.";
  }
  switch (item.category) {
    case "phrasal_verb":
      return "Common in natural spoken English.";
    case "collocation":
      return "Helps you avoid literal Spanish-style English.";
    case "sentence_frame":
      return "A reusable structure you can speak with.";
    case "discourse_marker":
      return "Helps your conversation flow naturally.";
    case "core_chunk":
      return "A ready-made phrase for everyday situations.";
    case "high_frequency_verb_pattern":
      return "A high-frequency pattern you'll reuse a lot.";
    case "work_communication":
      return "Useful for clear communication at work.";
    default:
      return null;
  }
}

// ─── Explore filtering ───

export type ExploreFilter =
  | "all"
  | "daily_life"
  | "work"
  | "phrasal_verbs"
  | "collocations"
  | "sentence_frames"
  | "spanish_speaker_traps";

const FILTER_MATCHERS: Record<ExploreFilter, (p: Phrase) => boolean> = {
  all: () => true,
  daily_life: (p) => p.category === "daily_life",
  work: (p) => p.category === "work_communication",
  phrasal_verbs: (p) => p.isPhrasalVerb === true || p.category === "phrasal_verb",
  collocations: (p) => p.category === "collocation",
  sentence_frames: (p) => p.category === "sentence_frame",
  spanish_speaker_traps: (p) => p.isSpanishSpeakerTrap === true || p.category === "spanish_speaker_trap",
};

/** Returns the phrases matching an Explore filter ("all" returns everything). */
export function filterPhrasesForExplore(phrases: Phrase[], filter: ExploreFilter): Phrase[] {
  return phrases.filter(FILTER_MATCHERS[filter]);
}

/** Sorts a copy by category priority, then usefulness (highest first). Handy
 * for an Explore feed that should surface high-leverage patterns first. */
export function rankForExplore(phrases: Phrase[]): Phrase[] {
  return [...phrases].sort((a, b) => {
    const pa = a.category ? getCategoryPriority(a.category) : 99;
    const pb = b.category ? getCategoryPriority(b.category) : 99;
    if (pa !== pb) return pa - pb;
    const ua = a.usefulnessScore ?? calculateUsefulnessScore(a);
    const ub = b.usefulnessScore ?? calculateUsefulnessScore(b);
    return ub - ua;
  });
}
