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

/** `avoid` normalised to a list, defensively (string | string[] | undefined). */
export function getAvoidForms(phrase: Phrase): string[] {
  const a = phrase.avoid;
  if (!a) return [];
  return Array.isArray(a) ? a.filter(Boolean) : [a];
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
    case "daily_life":
      return "Useful in ordinary everyday situations.";
    case "emotion_opinion":
      return "Helps you express feelings and opinions naturally.";
    case "travel_social":
      return "Useful in travel and social interactions.";
    case "advanced_expression":
      return "Adds nuance — use it once the basic pattern is solid.";
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

/**
 * Chip label for an Explore card. Display-only override: inside the Traps
 * filter, a flagged Spanish-speaker trap shows "Spanish trap" (so the learner
 * sees why it's there) even when its primary category is, say, a collocation.
 * Everywhere else the normal category label is used. Never mutates metadata.
 */
export function getExploreChipLabel(phrase: Phrase, filter: ExploreFilter): string {
  if (filter === "spanish_speaker_traps" && phrase.isSpanishSpeakerTrap) return "Spanish trap";
  return phrase.category ? getCategoryLabel(phrase.category) : "";
}

/**
 * Orders a Traps-filter list so genuine trap/false-friend items lead, then
 * flagged cross-category items. Stable — preserves the incoming rank order
 * within each group. Only used inside the Traps filter.
 */
export function orderTrapsFirst(phrases: Phrase[]): Phrase[] {
  const rank = (p: Phrase) =>
    p.category === "spanish_speaker_trap" ? 0 : p.category === "false_friend" ? 1 : 2;
  return [...phrases].sort((a, b) => rank(a) - rank(b));
}

/**
 * Stable-orders a ranked list so phrases the user hasn't saved yet lead, and
 * already-saved ones follow. Keeps saved phrases visible (less prominent, at
 * the tail) while stopping the same saved cards from occupying the top of the
 * suggestions forever — as one is added it sinks and the next-best unsaved
 * phrase surfaces. Preserves the incoming rank order within each group.
 */
export function orderUnsavedFirst(phrases: Phrase[], isSaved: (id: string) => boolean): Phrase[] {
  const unsaved: Phrase[] = [];
  const saved: Phrase[] = [];
  for (const p of phrases) (isSaved(p.id) ? saved : unsaved).push(p);
  return [...unsaved, ...saved];
}

/**
 * A `size`-length window into `list` at page `batchIndex`, wrapping around when
 * it runs off the end so a "Show more" control cycles through the ranking
 * instead of dead-ending. Deterministic; empty for an empty list; never longer
 * than the list itself.
 */
export function batchOf<T>(list: T[], batchIndex: number, size: number): T[] {
  if (list.length === 0 || size <= 0) return [];
  const start = ((batchIndex * size) % list.length + list.length) % list.length;
  const take = Math.min(size, list.length);
  const out: T[] = [];
  for (let i = 0; i < take; i++) out.push(list[(start + i) % list.length]);
  return out;
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

/**
 * Picks the top `limit` from an already-ranked list while capping how many
 * come from any one category, so a broad ("All") view can't be dominated by
 * one bucket (e.g. all core chunks). Overflow fills the tail if the diverse
 * pass leaves gaps, preserving rank order throughout. Deterministic.
 */
export function diversifyTop(ranked: Phrase[], limit: number, maxPerCategory = 2): Phrase[] {
  const counts = new Map<string, number>();
  const picked: Phrase[] = [];
  const overflow: Phrase[] = [];
  for (const p of ranked) {
    const key = p.category ?? "_";
    const n = counts.get(key) ?? 0;
    if (n < maxPerCategory) {
      picked.push(p);
      counts.set(key, n + 1);
    } else {
      overflow.push(p);
    }
    if (picked.length >= limit) return picked;
  }
  for (const p of overflow) {
    if (picked.length >= limit) break;
    picked.push(p);
  }
  return picked.slice(0, limit);
}
