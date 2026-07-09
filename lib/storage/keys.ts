export const KEY_DECK = "sticky-english.deck.v2";
export const KEY_TOPICS = "sticky-english.topics.v2";
export const KEY_CAPTURES = "sticky-english.captures.v2";
export const KEY_ACTIVITY = "sticky-english.activity.v2";
export const KEY_MISSION = "sticky-english.mission.v2";
export const KEY_META = "sticky-english.meta.v2";
export const KEY_TRIAGE = "sticky-english.triage.v3";
export const KEY_SENTENCES = "sticky-english.sentences.v3";
export const KEY_LEVEL = "sticky-english.level.v3";
/** Pattern suggestions the user skipped ("not for now") — a UI-only preference,
 * never part of the learning deck or memory scheduling. */
export const KEY_DISMISSED = "sticky-english.dismissed.v1";

export const ALL_KEYS = [
  KEY_DECK,
  KEY_TOPICS,
  KEY_CAPTURES,
  KEY_ACTIVITY,
  KEY_MISSION,
  KEY_META,
  KEY_TRIAGE,
  KEY_SENTENCES,
  KEY_LEVEL,
  KEY_DISMISSED,
] as const;
