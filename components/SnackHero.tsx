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
    <div className="mb-5">
      <Link
        href="/snack"
        data-testid="daily-snack"
        className="relative block overflow-hidden rounded-[2rem] px-6 pb-6 pt-7 transition-transform active:scale-[0.99]"
        style={{
          background:
            "linear-gradient(150deg, #fdfaff 0%, #efe7ff 46%, #e4ecff 78%, #ffe9d6 130%)",
          boxShadow:
            "0 30px 60px -22px rgba(120, 90, 220, 0.7), 0 6px 16px -8px rgba(120,90,220,0.35), inset 0 1px 0 rgba(255,255,255,0.85)",
        }}
      >
        {/* Layered soft glows — decorative depth, always behind the text. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(160,120,255,0.5), transparent 68%)" }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,180,120,0.32), transparent 70%)" }}
        />

        <div className="relative flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl text-white"
            style={{
              background: "linear-gradient(140deg, #8b6cf0, #6d8bff)",
              boxShadow: "0 10px 20px -8px rgba(120,90,220,0.75)",
            }}
          >
            ✦
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7a6a9e]">
              Daily ritual
            </span>
            <span className="text-[1.7rem] font-extrabold leading-tight text-[#1c1526]">
              Today&rsquo;s Practice
            </span>
          </div>
        </div>

        <p className="relative mt-2 text-sm font-medium text-[#4a3f63]">{subtitle}</p>

        <span
          className="relative mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1c1526] px-6 py-4 text-base font-bold text-white"
          style={{ boxShadow: "0 12px 24px -10px rgba(28,21,38,0.85), inset 0 1px 0 rgba(255,255,255,0.12)" }}
        >
          Start practice <span aria-hidden>→</span>
        </span>
      </Link>
      <p className="mt-2.5 px-1.5 text-xs text-white/65">
        Start here — this reviews what&rsquo;s due today.
      </p>
    </div>
  );
}
