"use client";

import Link from "next/link";
import type { LevelState } from "@/lib/types";
import { formatLevel } from "@/lib/level";

/** Always forward-framed — advancement is celebrated, a flat result is
 * encouragement, never failure. */
export function CheckResult({
  before,
  after,
  score,
  stretchCorrect = 0,
}: {
  before: LevelState;
  after: LevelState;
  score: number;
  /** Correct next-band ("Extra") items — only ever mentioned when > 0. */
  stretchCorrect?: number;
}) {
  const advanced = formatLevel(before) !== formatLevel(after);

  return (
    <div
      data-testid="check-result"
      className="flex h-dvh flex-col justify-center gap-6 bg-[#0b0b12] px-6 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/80">
        Level check
      </p>

      {advanced ? (
        <>
          <h2 className="text-4xl font-extrabold leading-tight text-white">
            You’re moving up to {formatLevel(after)}! 🎉
          </h2>
          <p className="text-base text-white/70">
            {score >= 85
              ? "Solid retention and production — the jump shows."
              : "You're locking in what you've learned. Good pace."}
          </p>
        </>
      ) : (
        <>
          <h2 className="text-3xl font-bold leading-tight text-white">
            Still at {formatLevel(after)}
          </h2>
          <p className="text-base text-white/70">A little more and you’ll move up. You’re on track.</p>
        </>
      )}

      <div className="flex items-baseline gap-2 rounded-2xl bg-white/[0.05] px-4 py-3">
        <span className="font-mono text-2xl font-semibold text-white">{score}%</span>
        <span className="text-sm text-white/50">on this check</span>
      </div>

      {stretchCorrect > 0 && (
        <p data-testid="stretch-bonus-note" className="text-sm text-amber-300">
          {stretchCorrect === 1
            ? "🎯 And you got 1 extra from the next level — you're ahead."
            : `🎯 And you got ${stretchCorrect} extras from the next level — you're ahead.`}
        </p>
      )}

      <Link
        href="/"
        data-testid="check-done"
        className="mt-2 rounded-2xl bg-white px-6 py-4 text-center text-base font-semibold text-black active:scale-[0.98]"
      >
        Continue
      </Link>
    </div>
  );
}
