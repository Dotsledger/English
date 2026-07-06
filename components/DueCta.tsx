"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useActivity, useDeck } from "@/components/AppStateProvider";
import { dueEntries } from "@/lib/session/leitner";
import {
  COMEBACK_AFTER_DAYS,
  daysSinceLastActivity,
  displayedDueCount,
} from "@/lib/session/triage";
import { ComebackCta } from "@/components/ComebackCta";

/** Home review CTA. After a long absence it becomes the comeback prompt;
 * otherwise it shows how many phrases are ready — capped at 8, never the
 * raw backlog, and never loss-framed. Hidden when nothing is due. */
export function DueCta() {
  const deck = useDeck();
  const activity = useActivity();
  // Clock read happens post-mount: keeps render pure and hydration stable.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount clock read, same hydration-safety pattern as the storage hooks
    setNow(Date.now());
  }, []);
  if (!deck.ready || !activity.ready || now === null) return null;

  const due = dueEntries(deck.value, now);
  if (due.length === 0) return null;

  const away = daysSinceLastActivity(activity.value, now);
  if (away !== null && away >= COMEBACK_AFTER_DAYS) return <ComebackCta />;

  const shown = displayedDueCount(due.length);
  const minutes = Math.max(1, Math.round(shown / 4));
  return (
    <Link
      href="/snack"
      data-testid="due-cta"
      className="mb-3 flex items-center justify-between rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 active:scale-[0.99]"
    >
      <span className="text-sm font-medium text-sky-200">
        {shown === 1 ? "1 frase lista para repasar" : `${shown} frases listas para repasar`}
      </span>
      <span className="shrink-0 text-xs text-sky-300/70">{minutes} min</span>
    </Link>
  );
}
