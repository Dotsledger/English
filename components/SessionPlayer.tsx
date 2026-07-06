"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { SessionPlan } from "@/lib/session/types";
import { phraseById } from "@/lib/data/phrases";
import {
  useActivity,
  useCompletedTopics,
  useDeck,
  useSentences,
  useTriage,
} from "@/components/AppStateProvider";
import { reconcileTriage } from "@/lib/session/triage";
import {
  appendSentence,
  markSeen,
  recordCheckpointResult,
  recordMasteryResult,
  recordPeek,
  recordReviewResult,
  saveToDeck,
  suppressPhrase,
  unsuppressPhrase,
  type MasteryVerdict,
} from "@/lib/deckOps";
import { localIsoDate } from "@/lib/dates";
import {
  computeStats,
  initSessionRun,
  isFinished,
  sessionReducer,
} from "@/lib/session/runReducer";
import { countsAsProduction } from "@/lib/session/exercisePicker";
import { useSpeechAvailable } from "@/components/useSpeechAvailable";
import { FeedProgress } from "@/components/FeedProgress";
import { SceneRenderer, sceneBackgroundClass } from "@/components/SceneRenderer";
import { SessionEnd } from "@/components/SessionEnd";
import { McqCard } from "@/components/exercises/McqCard";
import { TypedAnswerCard } from "@/components/exercises/TypedAnswerCard";
import { SpokenAnswerCard } from "@/components/exercises/SpokenAnswerCard";
import { MasteryCard } from "@/components/exercises/MasteryCard";

const SWIPE_THRESHOLD = 48;

export function SessionPlayer({
  title,
  plan,
  onAnotherRound,
}: {
  title: string;
  plan: SessionPlan;
  onAnotherRound: () => void;
}) {
  const [state, dispatch] = useReducer(sessionReducer, plan, initSessionRun);
  const deck = useDeck();
  const activity = useActivity();
  const completedTopics = useCompletedTopics();
  const triage = useTriage();
  const sentences = useSentences();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const seenSceneIds = useRef<Set<string>>(new Set());
  const closedOut = useRef(false);
  const speechAvailable = useSpeechAvailable();
  const [speechDisabled, setSpeechDisabled] = useState(false);
  const useSpoken = speechAvailable && !speechDisabled;

  const card = state.plan.cards[state.index];
  const finished = isFinished(state);
  const needsAnswer = card?.kind === "checkpoint" || card?.kind === "review";
  const answered = state.answers[state.index] !== undefined;
  const canGoNext = !needsAnswer || answered;

  // Seen-marks commit immediately; the per-session set stops re-swipes
  // from inflating counts (same rule as v1).
  useEffect(() => {
    if (card?.kind === "content" && !seenSceneIds.current.has(card.scene.id)) {
      seenSceneIds.current.add(card.scene.id);
      const phraseId = card.scene.phraseId;
      deck.update((prev) => markSeen(prev, phraseId, Date.now()));
    }
  }, [card, deck]);

  // Session close-out: activity day + contributing topics, exactly once.
  useEffect(() => {
    if (!finished || closedOut.current) return;
    closedOut.current = true;
    activity.update((prev) => ({ ...prev, [localIsoDate()]: true as const }));
    const topicIds = new Set<string>();
    for (const c of state.plan.cards) {
      if (c.kind === "content") topicIds.add(c.scene.topicId);
    }
    completedTopics.update((prev) => {
      const next = { ...prev };
      for (const id of topicIds) next[id] = true as const;
      return next;
    });
    // Backlog freeze/thaw now that the queue has just changed.
    const reconciled = reconcileTriage(deck.value, triage.value, Date.now());
    if (reconciled.deck !== deck.value) deck.update(() => reconciled.deck);
    if (reconciled.triage !== triage.value) triage.update(() => reconciled.triage);
  }, [finished, activity, completedTopics, deck, triage, state.plan.cards]);

  const goNext = useCallback(() => {
    dispatch({ type: "advance" });
  }, []);
  const goPrev = useCallback(() => {
    dispatch({ type: "back" });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
    if (Math.abs(dy) >= Math.abs(dx)) {
      if (dy < 0) goNext();
      else goPrev();
    } else {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const answerCheckpoint = (phraseId: string, correct: boolean, selectedIndex: number) => {
    dispatch({
      type: "answer",
      cardIndex: state.index,
      phraseId,
      correct,
      produced: false,
      selectedIndex,
    });
    deck.update((prev) => recordCheckpointResult(prev, phraseId, correct, Date.now()));
  };

  const answerReview = (
    phraseId: string,
    correct: boolean,
    produced: boolean,
    selectedIndex?: number
  ) => {
    dispatch({
      type: "answer",
      cardIndex: state.index,
      phraseId,
      correct,
      produced,
      selectedIndex,
    });
    deck.update((prev) => recordReviewResult(prev, phraseId, { correct, produced }, Date.now()));
  };

  const gradeMastery = (phraseId: string, verdict: MasteryVerdict, sentence: string) => {
    dispatch({
      type: "answer",
      cardIndex: state.index,
      phraseId,
      correct: verdict !== "no_me_salio",
      produced: true,
    });
    const now = Date.now();
    deck.update((prev) => recordMasteryResult(prev, phraseId, verdict, now));
    if (sentence.trim().length > 0) {
      sentences.update((prev) => appendSentence(prev, phraseId, sentence, now));
    }
  };

  const interactionsFor = (phraseId: string) => ({
    saved: deck.value[phraseId]?.inDeck === true,
    onPeek: (ms: number) => deck.update((prev) => recordPeek(prev, phraseId, ms)),
    onSave: () => {
      dispatch({ type: "save", phraseId });
      deck.update((prev) => saveToDeck(prev, phraseId, Date.now()));
    },
    onSuppress: () => deck.update((prev) => suppressPhrase(prev, phraseId, Date.now())),
    onUndoSuppress: () => deck.update((prev) => unsuppressPhrase(prev, phraseId)),
  });

  const total = Math.max(state.plan.cards.length - 1, 1); // end card excluded
  const backgroundClass =
    !finished && card?.kind === "content" ? sceneBackgroundClass(card.scene) : "";

  return (
    <div
      data-testid="feed"
      className={`relative flex h-dvh flex-col overflow-hidden ${backgroundClass || "bg-[#0b0b12]"}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative z-10 flex items-center gap-2">
        <Link
          href="/"
          aria-label="Volver a los temas"
          className="ml-2 mt-[max(0.6rem,env(safe-area-inset-top))] flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/60"
        >
          ←
        </Link>
        <div className="flex-1 pr-2">
          <FeedProgress current={Math.min(state.index, total - 1)} total={total} />
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-hidden">
        {finished ? (
          <SessionEnd title={title} stats={computeStats(state)} onAnotherRound={onAnotherRound} />
        ) : card.kind === "content" ? (
          <div key={card.scene.id} className="scene-enter h-full">
            <SceneRenderer
              scene={card.scene}
              audioFirst={card.audioFirst}
              {...interactionsFor(card.scene.phraseId)}
            />
          </div>
        ) : card.kind === "checkpoint" ? (
          <div key={`checkpoint-${state.index}`} className="scene-enter h-full">
            <McqCard
              exercise={card.exercise}
              phrase={phraseById.get(card.exercise.phraseId) ?? null}
              kicker="¿Te suena?"
              selectedIndex={answered ? (state.answers[state.index].selectedIndex ?? null) : null}
              onSelect={(i, correct) => answerCheckpoint(card.exercise.phraseId, correct, i)}
            />
          </div>
        ) : card.kind === "review" ? (
          <div key={`review-${state.index}`} className="scene-enter h-full">
            {card.exercise.type === "mcq" ? (
              <McqCard
                exercise={card.exercise}
                phrase={phraseById.get(card.exercise.phraseId) ?? null}
                kicker="Repaso rápido"
                selectedIndex={answered ? (state.answers[state.index].selectedIndex ?? null) : null}
                onSelect={(i, correct) => answerReview(card.exercise.phraseId, correct, false, i)}
              />
            ) : useSpoken && card.exercise.type === "freetype" ? (
              <SpokenAnswerCard
                exercise={card.exercise}
                phrase={phraseById.get(card.exercise.phraseId) ?? null}
                previousCorrect={answered ? state.answers[state.index].correct : null}
                onResult={(correct) => answerReview(card.exercise.phraseId, correct, true)}
                onDisableSpeech={() => setSpeechDisabled(true)}
              />
            ) : (
              <TypedAnswerCard
                exercise={card.exercise}
                phrase={phraseById.get(card.exercise.phraseId) ?? null}
                previousCorrect={answered ? state.answers[state.index].correct : null}
                onResult={(correct) =>
                  answerReview(card.exercise.phraseId, correct, countsAsProduction(card.exercise))
                }
              />
            )}
          </div>
        ) : card.kind === "mastery" ? (
          <div key={`mastery-${state.index}`} className="scene-enter h-full">
            <MasteryCard
              phrase={phraseById.get(card.phraseId) ?? null}
              pastSentences={sentences.value[card.phraseId] ?? []}
              speechAvailable={useSpoken}
              alreadyAnswered={answered}
              onGrade={(verdict, sentence) => gradeMastery(card.phraseId, verdict, sentence)}
            />
          </div>
        ) : null}
      </div>

      {!finished && (
        <div className="relative z-10 flex items-center justify-center px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <span className="swipe-hint text-xs text-white/55">
            {canGoNext ? "Desliza hacia arriba ↑" : "Responde para seguir"}
          </span>
          {/* Arrow buttons are only useful with a mouse; on touch the swipe
              gesture is the interaction, so hide them there. */}
          <div className="fine-pointer-only absolute right-4 gap-1.5">
            <button
              type="button"
              aria-label="Anterior"
              onClick={goPrev}
              disabled={state.index === 0}
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-white/45 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              onClick={goNext}
              disabled={!canGoNext}
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-white/45 disabled:opacity-30"
            >
              ↓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
