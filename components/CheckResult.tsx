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
        Chequeo de nivel
      </p>

      {advanced ? (
        <>
          <h2 className="text-4xl font-extrabold leading-tight text-white">
            ¡Subes a {formatLevel(after)}! 🎉
          </h2>
          <p className="text-base text-white/70">
            {score >= 85
              ? "Retención y producción sólidas — se nota el salto."
              : "Vas afianzando lo aprendido. Buen ritmo."}
          </p>
        </>
      ) : (
        <>
          <h2 className="text-3xl font-bold leading-tight text-white">
            Sigues en {formatLevel(after)}
          </h2>
          <p className="text-base text-white/70">Un poco más y subes. Vas por buen camino.</p>
        </>
      )}

      <div className="flex items-baseline gap-2 rounded-2xl bg-white/[0.05] px-4 py-3">
        <span className="font-mono text-2xl font-semibold text-white">{score}%</span>
        <span className="text-sm text-white/50">en este chequeo</span>
      </div>

      {stretchCorrect > 0 && (
        <p data-testid="stretch-bonus-note" className="text-sm text-amber-300">
          {stretchCorrect === 1
            ? "🎯 Y acertaste 1 extra del nivel siguiente — vas por delante."
            : `🎯 Y acertaste ${stretchCorrect} extras del nivel siguiente — vas por delante.`}
        </p>
      )}

      <Link
        href="/"
        data-testid="check-done"
        className="mt-2 rounded-2xl bg-white px-6 py-4 text-center text-base font-semibold text-black active:scale-[0.98]"
      >
        Seguir
      </Link>
    </div>
  );
}
