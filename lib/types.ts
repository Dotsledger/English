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
