"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDeck } from "@/components/AppStateProvider";
import { dueEntries } from "@/lib/session/leitner";
import { displayedDueCount } from "@/lib/session/triage";
import { SNACK_TARGET_CARDS, SNACK_DUE_SHARE } from "@/lib/session/composeSnackSession";

/** Pure subtitle math, mirroring the composer's primary split so the estimate
 * is accurate. Capped display count keeps the raw backlog hidden. */
export function snackComposition(dueCount: number): { repasos: number; nuevas: number } {
  const dueTarget = Math.round(SNACK_TARGET_CARDS * SNACK_DUE_SHARE);
  const repasos = Math.min(displayedDueCount(dueCount), dueTarget);
  const nuevas = Math.max(0, SNACK_TARGET_CARDS - repasos);
  return { repasos, nuevas };
}

/** The hero block on home: one tap into the Daily Snack, with a subtitle
 * showing today's actual composition ("N repasos + M nuevas · 2-3 min"). */
export function SnackHero() {
  const deck = useDeck();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount clock read, hydration-safe
    setNow(Date.now());
  }, []);

  let subtitle = "Repaso + algo nuevo · 2-3 min";
  if (deck.ready && now !== null) {
    const { repasos, nuevas } = snackComposition(dueEntries(deck.value, now).length);
    subtitle =
      repasos === 0
        ? `${nuevas} nuevas · 2-3 min`
        : `${repasos} repaso${repasos === 1 ? "" : "s"} + ${nuevas} nuevas · 2-3 min`;
  }

  return (
    <Link
      href="/snack"
      data-testid="daily-snack"
      className="mb-5 flex items-center justify-between rounded-3xl bg-white px-6 py-6 active:scale-[0.99]"
    >
      <div className="flex flex-col gap-1">
        <span className="text-2xl font-extrabold leading-none text-black">Daily Snack</span>
        <span className="text-sm text-black/60">{subtitle}</span>
      </div>
      <span aria-hidden className="text-2xl text-black/70">
        →
      </span>
    </Link>
  );
}
