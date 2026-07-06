export type PhraseStatus = "new" | "seen" | "learning" | "familiar" | "strong";

export type Level = "B2" | "C1" | "C2";

export type Phrase = {
  id: string;
  text: string;
  meaningEs: string;
  example: string;
  level: Level;
  tags: string[];
  /** Accepted natural variants that count as the phrase appearing in scene text. */
  variants?: string[];
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

/** Lifecycle stage — only ever advances, and only through retrieval. */
export type PhraseStage = "seen" | "recognised" | "produced" | "mastered";

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
};

export type DeckStore = Record<string, DeckEntry>;

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

export type MissionStore = {
  /** ISO Monday of the mission week, e.g. "2026-07-06". */
  weekKey: string;
  phraseIds: string[];
  done: Record<string, true>;
};
