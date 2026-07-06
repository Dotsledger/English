import type { SessionPlan, SessionStats } from "@/lib/session/types";

/**
 * In-flight session state. Lives in React only — durable effects (review
 * results, saves, seen-marks) commit to the deck immediately per card, so
 * a mid-session reload loses position, never learning data.
 */
export type SessionAnswer = {
  phraseId: string;
  correct: boolean;
  produced: boolean;
  /** Which MCQ option was tapped — lets back-navigation restore the card. */
  selectedIndex?: number;
};

export type SessionRunState = {
  plan: SessionPlan;
  index: number;
  answers: Record<number, SessionAnswer>;
  savedPhraseIds: string[];
};

export type SessionAction =
  | { type: "advance" }
  | { type: "back" }
  | ({ type: "answer"; cardIndex: number } & SessionAnswer)
  | { type: "save"; phraseId: string };

export function initSessionRun(plan: SessionPlan): SessionRunState {
  return { plan, index: 0, answers: {}, savedPhraseIds: [] };
}

function isGated(state: SessionRunState): boolean {
  const card = state.plan.cards[state.index];
  if (!card) return false;
  const needsAnswer = card.kind === "checkpoint" || card.kind === "review";
  return needsAnswer && state.answers[state.index] === undefined;
}

export function sessionReducer(state: SessionRunState, action: SessionAction): SessionRunState {
  switch (action.type) {
    case "advance": {
      if (isGated(state)) return state;
      if (state.index >= state.plan.cards.length - 1) return state;
      return { ...state, index: state.index + 1 };
    }
    case "back": {
      if (state.index === 0) return state;
      return { ...state, index: state.index - 1 };
    }
    case "answer": {
      if (state.answers[action.cardIndex] !== undefined) return state; // idempotent
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.cardIndex]: {
            phraseId: action.phraseId,
            correct: action.correct,
            produced: action.produced,
            selectedIndex: action.selectedIndex,
          },
        },
      };
    }
    case "save": {
      if (state.savedPhraseIds.includes(action.phraseId)) return state;
      return { ...state, savedPhraseIds: [...state.savedPhraseIds, action.phraseId] };
    }
  }
}

export function isFinished(state: SessionRunState): boolean {
  return state.plan.cards[state.index]?.kind === "end";
}

export function computeStats(state: SessionRunState): SessionStats {
  let vistas = 0;
  for (let i = 0; i < state.index; i++) {
    if (state.plan.cards[i].kind === "content") vistas += 1;
  }
  const recuperadas = Object.values(state.answers).filter((a) => a.correct).length;
  return { vistas, guardadas: state.savedPhraseIds.length, recuperadas };
}
