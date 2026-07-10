"use client";

import { useState } from "react";
import type { Phrase } from "@/lib/types";
import type { MasteryVerdict } from "@/lib/deckOps";

/**
 * Situation card (transfer to real life): a realistic prompt where the phrase
 * would fit. The learner produces it themselves, then reveals the target and
 * self-assesses. Same three-verdict self-grade as the mastery gate — this is
 * genuine production, so a "Nailed it" moves the phrase toward `usable`.
 */
export function SituationCard({
  phrase,
  alreadyAnswered,
  onGrade,
}: {
  phrase: Phrase;
  alreadyAnswered: boolean;
  onGrade: (verdict: MasteryVerdict) => void;
}) {
  const [revealed, setRevealed] = useState(alreadyAnswered);
  const situation = phrase.situations?.[0] ?? "";

  return (
    <div
      data-testid={`situation-${phrase.id}`}
      className="flex h-full flex-col justify-center gap-5 px-6 pb-6"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
        Real situation
      </span>
      <p className="text-[1.4rem] font-semibold leading-snug text-white">{situation}</p>
      <p className="text-sm text-white/50">Say something natural. What would you use?</p>

      {!revealed ? (
        <button
          type="button"
          data-testid="situation-reveal"
          onClick={() => setRevealed(true)}
          className="btn-primary min-h-12 px-5 py-3 text-base"
        >
          Show a natural answer
        </button>
      ) : (
        <>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
              A natural answer
            </p>
            <p className="mt-1 text-lg font-bold text-amber-300">{phrase.text}</p>
            <p className="mt-1 text-sm text-white/60">{phrase.meaningEs}</p>
          </div>

          {!alreadyAnswered && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-white/50">How did it go?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="situation-me-salio"
                  onClick={() => onGrade("me_salio")}
                  className="flex-1 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-3 text-sm font-semibold text-emerald-200 active:scale-[0.98]"
                >
                  Nailed it
                </button>
                <button
                  type="button"
                  data-testid="situation-regular"
                  onClick={() => onGrade("regular")}
                  className="flex-1 rounded-2xl border border-white/15 bg-white/[0.06] px-3 py-3 text-sm font-medium text-white/80 active:scale-[0.98]"
                >
                  Almost
                </button>
                <button
                  type="button"
                  data-testid="situation-no"
                  onClick={() => onGrade("no_me_salio")}
                  className="flex-1 rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-3 text-sm font-medium text-white/60 active:scale-[0.98]"
                >
                  Didn’t get it
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
