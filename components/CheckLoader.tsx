"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LevelState } from "@/lib/types";
import { phrases, phraseById } from "@/lib/data/phrases";
import { phraseCategoryIndex } from "@/lib/exercises/phraseIndex";
import { composeCheck, type CheckItem } from "@/lib/checkSession";
import { applyCheckResult } from "@/lib/level";
import { useDeck, useLevel } from "@/components/AppStateProvider";
import { CheckPlayer } from "@/components/CheckPlayer";
import { CheckResult } from "@/components/CheckResult";

/** Composes the check once state hydrates, runs it, then applies the
 * result to the level score and shows the forward-framed outcome. */
export function CheckLoader() {
  const deck = useDeck();
  const level = useLevel();
  const [items, setItems] = useState<CheckItem[] | null>(null);
  const [result, setResult] = useState<{ before: LevelState; after: LevelState; score: number } | null>(
    null
  );

  const ready = deck.ready && level.ready;

  useEffect(() => {
    if (!ready || items) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time composition once storage hydrates
    setItems(
      composeCheck({
        deck: deck.value,
        level: level.value,
        phrases,
        phraseById,
        index: phraseCategoryIndex,
      }).items
    );
  }, [ready, items, deck.value, level.value]);

  if (result) {
    return <CheckResult before={result.before} after={result.after} score={result.score} />;
  }

  if (!items) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#0b0b12]">
        <span className="text-sm text-white/40">Preparando el chequeo…</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-[#0b0b12] px-6 text-center">
        <p className="text-sm text-white/60">Aún no hay bastante material para un chequeo.</p>
        <Link href="/" className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <CheckPlayer
      items={items}
      onComplete={(score) => {
        const before = level.value;
        const after = applyCheckResult(before, score, Date.now());
        level.update(() => after);
        setResult({ before, after, score });
      }}
    />
  );
}
