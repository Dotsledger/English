export type PhraseStatus = "new" | "seen" | "learning" | "familiar" | "strong";

export type Level = "B2" | "C1" | "C2";

/** Per-phrase authoring difficulty, independent of CEFR level. */
export type PhraseDifficulty = "easy" | "medium" | "hard";

/** A confusable phrase and how it differs, for Contrast cards. */
export type PhraseContrast = { phrase: string; explanationEs: string };

// ─── Vocabulary strategy layer ───
// Classifies what *kind* of usable English an item teaches, so the app can
// prioritise reusable patterns (chunks, frames, phrasal verbs) over isolated
// words. See lib/vocabStrategy.ts for scoring, priority and filtering.

export type VocabularyCategory =
  | "core_chunk"
  | "phrasal_verb"
  | "collocation"
  | "sentence_frame"
  | "discourse_marker"
  | "high_frequency_verb_pattern"
  | "work_communication"
  | "daily_life"
  | "emotion_opinion"
  | "travel_social"
  | "false_friend"
  | "spanish_speaker_trap"
  | "advanced_expression";

/** Full CEFR scale for the strategy layer (distinct from the app's internal
 * B2/C1/C2 `Level`, which drives level-weighting and stays unchanged). */
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1";

export type FrequencyBand = "very_high" | "high" | "medium" | "low";

export type Phrase = {
  id: string;
  text: string;
  meaningEs: string;
  example: string;
  level: Level;
  tags: string[];
  /** Accepted natural variants that count as the phrase appearing in scene text. */
  variants?: string[];
  /** Alternative example sentences (same phrase, different scenario). Reviews
   * and cloze rotate among [example, ...examples]. Optional/backward-compatible. */
  examples?: string[];
  // ── Rich metadata (optional; present on curated "core" life phrases) ──
  /** Literal, word-for-word Spanish gloss when it differs from the natural one. */
  literalMeaningEs?: string;
  /** When/why a native uses it — powers the Context card's "cuándo usarla". */
  usageContext?: string;
  /** Real-life prompts that should elicit this phrase — powers Situation cards. */
  situations?: string[];
  /** Words this phrase commonly combines with. */
  collocations?: string[];
  /** A common mistake or misuse to avoid (explanation, or list of wrong forms). */
  avoid?: string | string[];
  /** Confusable phrases + how they differ — powers Contrast cards. */
  contrastWith?: PhraseContrast[];
  /** Authoring difficulty, independent of CEFR `level`. */
  difficulty?: PhraseDifficulty;
  // ── Strategy layer (optional; present on curated seed items) ──
  /** What kind of usable English this item teaches. */
  category?: VocabularyCategory;
  /** Full-scale CEFR estimate for ranking (separate from internal `level`). */
  cefrLevel?: CefrLevel;
  frequencyBand?: FrequencyBand;
  /** Authored usefulness 1–100 (see calculateUsefulnessScore for the model). */
  usefulnessScore?: number;
  /** How much this pays off for *production* (speaking) 1–100. */
  productivePriority?: number;
  isPhrasalVerb?: boolean;
  isHighFrequencyPattern?: boolean;
  /** A common error Spanish speakers make — worth extra teaching weight. */
  isSpanishSpeakerTrap?: boolean;
};

export type TopicTile = {
  id: string;
  title: string;
  subtitle: string;
  badge?: "Trending" | "For you" | "New" | "Quick";
  previewPhraseIds: string[];
  difficulty: Level;
  category: string;
  visualStyle: string;
  interestScore?: number;
};

export type SceneType =
  | "hero_image"
  | "editorial_poster"
  | "chat"
  | "myth_vs_reality"
  | "price_breakdown"
  | "red_flag"
  | "mini_story"
  | "decision"
  | "checklist"
  | "news_alert";

export type BaseScene = {
  id: string;
  type: "content";
  sceneType: SceneType;
  topicId: string;
  topic: string;
  angle: string;
  phraseId: string;
  helperText?: string;
};

export type HeroImageScene = BaseScene & {
  sceneType: "hero_image";
  backgroundImage?: string;
  overlayStyle?: "dark" | "warm" | "cool";
  hook: string;
  body: string;
  payoff?: string;
};

export type EditorialPosterScene = BaseScene & {
  sceneType: "editorial_poster";
  hook: string;
  body: string;
  accent?: "violet" | "amber" | "emerald" | "rose";
};

export type ChatScene = BaseScene & {
  sceneType: "chat";
  messages: { speaker: string; text: string }[];
};

export type MythRealityScene = BaseScene & {
  sceneType: "myth_vs_reality";
  myth: string;
  reality: string;
};

export type PriceBreakdownScene = BaseScene & {
  sceneType: "price_breakdown";
  title: string;
  rows: { label: string; value: string }[];
  punchline: string;
};

export type RedFlagScene = BaseScene & {
  sceneType: "red_flag";
  flag: string;
  detail: string;
};

export type MiniStoryScene = BaseScene & {
  sceneType: "mini_story";
  beats: string[];
};

export type DecisionScene = BaseScene & {
  sceneType: "decision";
  question: string;
  options: string[];
  takeaway: string;
};

export type ChecklistScene = BaseScene & {
  sceneType: "checklist";
  title: string;
  items: string[];
};

export type NewsAlertScene = BaseScene & {
  sceneType: "news_alert";
  headline: string;
  detail: string;
  consequence: string;
};

export type ContentScene =
  | HeroImageScene
  | EditorialPosterScene
  | ChatScene
  | MythRealityScene
  | PriceBreakdownScene
  | RedFlagScene
  | MiniStoryScene
  | DecisionScene
  | ChecklistScene
  | NewsAlertScene;

export type CheckpointScene = {
  id: string;
  type: "checkpoint";
  topicId: string;
  phraseId: string;
  /** Casual intro like "Quick one" — never test/exam language. */
  kicker: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  feedbackCorrect: string;
  feedbackWrong: string;
};

export type FeedScene = ContentScene | CheckpointScene;

export type PhraseMemoryEntry = {
  phraseId: string;
  timesSeen: number;
  timesRecalled: number;
  correctCount: number;
  wrongCount: number;
  lastSeenAt: number | null;
  lastAttemptAt: number | null;
  nextReviewAt: number | null;
  confidenceScore: number;
  status: PhraseStatus;
};

export type PhraseMemoryStore = Record<string, PhraseMemoryEntry>;

// ─── v2 learning engine ───

/**
 * Lifecycle stage — only ever advances, and only through retrieval.
 *
 *   new        never meaningfully introduced (usually = no deck entry)
 *   seen       viewed, but never recalled ("seen ≠ learned")
 *   recognised recognises the meaning / picks it correctly (MCQ)
 *   recalled   can produce it with a prompt or scaffold (cloze / reverse)
 *   usable     produced it in a self-generated sentence / real situation
 *   mastered   repeated spaced production — the "fluent" tier
 *
 * Only successful active recall or production moves a phrase upward. Viewing
 * a card can move `new → seen`, never higher.
 */
export type PhraseStage = "new" | "seen" | "recognised" | "recalled" | "usable" | "mastered";

/** Leitner box. Intervals: 1, 3, 7, 16, 35 days. */
export type Box = 1 | 2 | 3 | 4 | 5;

export type DeckEntry = {
  phraseId: string;
  source: "catalog" | "custom";
  stage: PhraseStage;
  box: Box;
  /** In the Leitner review queue (saved by the user or entered via a failed checkpoint). */
  inDeck: boolean;
  /** "Ya la domino" — never shown in feeds, never queued. Wins over deck entry. */
  suppressed: boolean;
  timesSeen: number;
  correctCount: number;
  wrongCount: number;
  /** Correct production reviews while box >= 4; at 2 the phrase is mastered. */
  producedCorrectAtLongBoxes: number;
  lastSeenAt: number | null;
  lastAttemptAt: number | null;
  nextReviewAt: number | null;
  peekCount: number;
  lastPeekMs: number | null;
  addedToDeckAt: number | null;
  /** Backlog triage: overflow items parked out of every due count/queue.
   * Optional so existing v2 entries load unchanged (default false). */
  frozen?: boolean;
  /** First time this phrase reached "recalled" (self-produced with a prompt)
   * — powers the weekly recap. Optional for backward compatibility (default
   * null). Formerly stamped at the "produced" stage, now "recalled". */
  producedAt?: number | null;
};

export type DeckStore = Record<string, DeckEntry>;

/** Per-day thaw budget for backlog auto-triage (Feature 1), plus the
 * ISO-Monday of the last acknowledged weekly recap (Feature 6). */
export type TriageStore = {
  /** ISO date (local) of the last thaw. */
  lastThawDate: string;
  /** How many frozen items were thawed on lastThawDate. */
  thawedToday: number;
  /** ISO Monday of the week whose recap the user has already seen. */
  recapAckedWeek?: string;
};

/** The user's own sentences per phrase (mastery gate) — their personal corpus. */
export type UserSentence = { text: string; createdAt: number };
export type SentenceStore = Record<string, UserSentence[]>;

// ─── Level Check (internal progress milestone) ───

export type CefrBand = "B2" | "C1" | "C2";

export type LevelCheckRecord = {
  at: number;
  band: CefrBand;
  /** Sublevel 0..10 (the ".N" in "B2.4"). */
  sub: number;
  /** Check score 0..100. */
  score: number;
};

/** Internal, never-decreasing progress score. NOT a CEFR certification. */
export type LevelState = {
  band: CefrBand;
  sub: number;
  /** Content cards seen since the last check (milestone counter). */
  cardsSinceCheck: number;
  /** Cards needed to unlock the next check (~50–60, re-rolled each cycle). */
  checkThreshold: number;
  history: LevelCheckRecord[];
  /** Whether the "not an official certification" tooltip has been shown. */
  tooltipSeen: boolean;
  /** When the user last tapped "Ahora no" on an available check. The offer is
   * suppressed for the rest of that calendar day. Cleared on completion. */
  lastDismissedAt?: number | null;
};

/** A phrase the user typed in from real life ("+" quick capture). */
export type CapturedPhrase = {
  id: string;
  text: string;
  note: string;
  meaningEs: string;
  createdAt: number;
};

export type CaptureStore = Record<string, CapturedPhrase>;

/** ISO date (YYYY-MM-DD) → true, for the weekly "días activos" count. */
export type ActivityStore = Record<string, true>;

/** Phrase IDs the user skipped in "Add patterns" ("not for now"). A UI-only
 * preference: never added to the deck, never scheduled, never a learning
 * attempt — it only hides a suggestion. */
export type DismissedPatternStore = Record<string, true>;

export type MissionStore = {
  /** ISO Monday of the mission week, e.g. "2026-07-06". */
  weekKey: string;
  phraseIds: string[];
  done: Record<string, true>;
};
