import type { Box, ContentScene, PhraseStage } from "@/lib/types";
import type { Exercise, McqExercise } from "@/lib/exercises/types";

export type SessionCard =
  /** `audioFirst` plays the sentence via TTS with text hidden until tapped. */
  | { kind: "content"; scene: ContentScene; audioFirst?: boolean }
  /** In-feed retrieval of a phrase seen earlier in this same session. */
  | { kind: "checkpoint"; exercise: McqExercise; authoredSceneId?: string }
  /** Leitner review drawn from the deck (Daily Snack). */
  | { kind: "review"; exercise: Exercise; box: Box; stage: PhraseStage }
  /** Introduces a rich "core" phrase: meaning, when-to-use, examples, mistake. */
  | { kind: "context"; phraseId: string }
  /** Real-life transfer prompt for a rich phrase → self-assessed production. */
  | { kind: "situation"; phraseId: string }
  /** Distinguishes a rich phrase from a confusable one (recognition). */
  | { kind: "contrast"; phraseId: string }
  /** Box-5 free-production gate with self-assessment (the path to MASTERED). */
  | { kind: "mastery"; phraseId: string }
  /** Opt-in level-check milestone offer (never auto-starts). */
  | { kind: "check_offer" }
  | { kind: "end" };

export type SessionPlan = {
  id: string;
  mode: "category" | "snack" | "comeback";
  /** Last card is always { kind: "end" }. */
  cards: SessionCard[];
};

export type SessionStats = {
  vistas: number;
  guardadas: number;
  recuperadas: number;
};
