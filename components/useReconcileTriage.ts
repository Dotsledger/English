"use client";

import { useEffect, useRef } from "react";
import { useDeck, useTriage } from "@/components/AppStateProvider";
import { reconcileTriage } from "@/lib/session/triage";

/**
 * Runs backlog freeze/thaw once per mount, after the deck and triage docs
 * have hydrated. Mounted on the home screen and after a session ends — the
 * two moments the backlog might have changed. Idempotent and per-day
 * budgeted, so running it more than once is harmless.
 */
export function useReconcileTriage() {
  const deck = useDeck();
  const triage = useTriage();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !deck.ready || !triage.ready) return;
    ran.current = true;
    const { deck: nextDeck, triage: nextTriage } = reconcileTriage(
      deck.value,
      triage.value,
      Date.now()
    );
    if (nextDeck !== deck.value) deck.update(() => nextDeck);
    if (nextTriage !== triage.value) triage.update(() => nextTriage);
  }, [deck, triage]);
}
