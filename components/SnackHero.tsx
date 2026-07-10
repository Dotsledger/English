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

  let subtitle = "Review and learn useful phrases · 3 min";
  if (deck.ready && now !== null) {
    const { repasos, nuevas } = snackComposition(dueEntries(deck.value, now).length);
    subtitle =
      repasos === 0
        ? `Learn ${nuevas} new pattern${nuevas === 1 ? "" : "s"} · 3 min`
        : `Review ${repasos} due · learn ${nuevas} new · 3 min`;
  }

  return (
    <div className="mb-3">
      <Link
        href="/snack"
        data-testid="daily-snack"
        className="relative flex items-center justify-between gap-4 overflow-hidden rounded-[1.85rem] px-6 py-7 transition-transform active:scale-[0.99]"
        style={{
          background: "linear-gradient(135deg, #fbf7ff 0%, #f1eaff 55%, #e7edff 100%)",
          boxShadow:
            "0 22px 50px -20px rgba(120, 90, 220, 0.55), inset 0 1px 0 rgba(255,255,255,0.7)",
        }}
      >
        {/* Soft glow accent — decorative, behind the text, never over it. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(150,120,255,0.4), transparent 70%)" }}
        />
        <div className="relative flex flex-col gap-1">
          <span className="flex items-center gap-2 text-2xl font-extrabold leading-none text-[#1c1526]">
            <span aria-hidden>✦</span> Today&rsquo;s Practice
          </span>
          <span className="text-sm font-medium text-[#4a3f63]">{subtitle}</span>
        </div>
        <span
          className="relative shrink-0 rounded-full bg-[#1c1526] px-6 py-3 text-sm font-bold text-white"
          style={{ boxShadow: "0 8px 18px -8px rgba(28,21,38,0.8)" }}
        >
          Start
        </span>
      </Link>
      <p className="mt-2 px-1.5 text-xs text-white/60">
        Start here — this reviews what&rsquo;s due today.
      </p>
    </div>
  );
}
