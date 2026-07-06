"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDeck } from "@/components/AppStateProvider";
import { dueEntries } from "@/lib/session/leitner";

/** Home CTA: how many phrases are about to slip away. Hidden when none. */
export function DueCta() {
  const deck = useDeck();
  // Clock read happens post-mount: keeps render pure and hydration stable.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount clock read, same hydration-safety pattern as the storage hooks
    setNow(Date.now());
  }, []);
  if (!deck.ready || now === null) return null;
  const due = dueEntries(deck.value, now);
  if (due.length === 0) return null;

  const minutes = Math.max(1, Math.round(due.length / 4));
  return (
    <Link
      href="/snack"
      data-testid="due-cta"
      className="mb-3 flex items-center justify-between rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 active:scale-[0.99]"
    >
      <span className="text-sm font-medium text-amber-200">
        {due.length === 1
          ? "1 frase a punto de olvidarse"
          : `${due.length} frases a punto de olvidarse`}
      </span>
      <span className="shrink-0 text-xs text-amber-300/70">{minutes} min</span>
    </Link>
  );
}
