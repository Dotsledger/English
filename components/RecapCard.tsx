"use client";

import { useEffect, useState } from "react";
import { useActivity, useDeck, useTriage } from "@/components/AppStateProvider";
import { phraseCategoryIndex } from "@/lib/exercises/phraseIndex";
import { buildRecap, shouldShowRecap } from "@/lib/recap";

/**
 * Monday-only weekly recap (Feature 6). Positive framing only — active
 * days, phrases produced, top category — no comparisons, no shortfalls.
 * Dismissing it records the week so it shows once. Reuses the deck,
 * activity and triage docs; no new storage.
 */
export function RecapCard() {
  const deck = useDeck();
  const activity = useActivity();
  const triage = useTriage();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount clock read, hydration-safe
    setNow(Date.now());
  }, []);

  if (!deck.ready || !activity.ready || !triage.ready || now === null) return null;

  const recap = buildRecap(deck.value, activity.value, phraseCategoryIndex, now);
  if (!shouldShowRecap(recap, triage.value.recapAckedWeek, now)) return null;

  const lines: string[] = [];
  lines.push(
    recap.activeDays === 1 ? "1 active day last week" : `${recap.activeDays} active days last week`
  );
  if (recap.produced > 0) {
    lines.push(
      recap.produced === 1 ? "1 new phrase you can now recall" : `${recap.produced} new phrases you can now recall`
    );
  }
  if (recap.topCategory) lines.push(`What you practised most: ${recap.topCategory}`);

  return (
    <div
      data-testid="recap-card"
      className="mb-4 flex flex-col gap-2.5 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3.5"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
          Your week
        </p>
        <button
          type="button"
          data-testid="recap-dismiss"
          onClick={() =>
            triage.update((prev) => ({ ...prev, recapAckedWeek: recap.weekKey }))
          }
          aria-label="Close recap"
          className="text-sm text-white/40 active:scale-90"
        >
          ✕
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {lines.map((line, i) => (
          <li key={i} className="text-sm text-white/80">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
