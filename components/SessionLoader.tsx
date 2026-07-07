"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionPlan } from "@/lib/session/types";
import { topics } from "@/lib/data/topics";
import { contentScenes, checkpointScenes } from "@/lib/data/scenes";
import { phrases, phraseById } from "@/lib/data/phrases";
import { phraseCategoryIndex } from "@/lib/exercises/phraseIndex";
import {
  composeCategorySession,
  type ComposerContent,
} from "@/lib/session/composeCategorySession";
import { composeSnackSession } from "@/lib/session/composeSnackSession";
import { composeComebackSession } from "@/lib/session/composeComebackSession";
import { shouldOfferCheck } from "@/lib/level";
import { useCaptures, useCompletedTopics, useDeck, useLevel } from "@/components/AppStateProvider";
import { SessionPlayer } from "@/components/SessionPlayer";

const CONTENT: ComposerContent = {
  topics,
  scenes: contentScenes,
  authoredCheckpoints: checkpointScenes,
  phrases,
  phraseById,
  index: phraseCategoryIndex,
};

export type SessionMode =
  | { kind: "category"; seedTopicId: string }
  | { kind: "snack" }
  | { kind: "comeback" };

/**
 * Composes a session plan once the persisted state has hydrated (the plan
 * must respect suppressed phrases, completed topics and the due queue),
 * then hands it to the player. "Otra ronda" recomposes against the
 * now-updated deck.
 */
export function SessionLoader({ mode, title }: { mode: SessionMode; title: string }) {
  const deck = useDeck();
  const completedTopics = useCompletedTopics();
  const captures = useCaptures();
  const level = useLevel();
  const [plan, setPlan] = useState<SessionPlan | null>(null);

  const ready = deck.ready && completedTopics.ready && captures.ready && level.ready;

  const compose = useCallback((): SessionPlan => {
    const completedIds = new Set(Object.keys(completedTopics.value));
    let composed: SessionPlan;
    if (mode.kind === "category") {
      const suppressed = new Set(
        Object.values(deck.value)
          .filter((e) => e.suppressed)
          .map((e) => e.phraseId)
      );
      composed = composeCategorySession({
        seedTopicId: mode.seedTopicId,
        content: CONTENT,
        completedTopicIds: completedIds,
        suppressedPhraseIds: suppressed,
      });
    } else if (mode.kind === "comeback") {
      composed = composeComebackSession({
        deck: deck.value,
        captures: captures.value,
        content: CONTENT,
        now: Date.now(),
      });
    } else {
      composed = composeSnackSession({
        deck: deck.value,
        captures: captures.value,
        content: CONTENT,
        completedTopicIds: completedIds,
        now: Date.now(),
        band: level.value.band,
      });
    }
    // Offer the level check as an opt-in first card in normal feeds (not in
    // the focused comeback micro-session). Suppressed for the rest of the day
    // after an "Ahora no".
    if (mode.kind !== "comeback" && shouldOfferCheck(level.value, Date.now())) {
      composed = { ...composed, cards: [{ kind: "check_offer" }, ...composed.cards] };
    }
    return composed;
  }, [deck.value, completedTopics.value, captures.value, level.value, mode]);

  useEffect(() => {
    if (!ready || plan) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time composition once storage hydrates
    setPlan(compose());
  }, [ready, plan, compose]);

  if (!plan) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#0b0b12]">
        <span className="text-sm text-white/40">Preparando la sesión…</span>
      </div>
    );
  }

  return (
    <SessionPlayer
      key={plan.id}
      title={title}
      plan={plan}
      onAnotherRound={() => setPlan(compose())}
    />
  );
}
