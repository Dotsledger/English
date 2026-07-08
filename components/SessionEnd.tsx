"use client";

import Link from "next/link";
import type { SessionRecap } from "@/lib/session/transitions";
import { recapHasTransitions } from "@/lib/session/transitions";

/**
 * Learning-framed session recap: what moved forward (Seen → Recognised →
 * Recalled → Usable → Mastered) and what's coming back — not "you viewed N
 * cards". A session with no state change still closes warmly.
 */
export function SessionEnd({
  title,
  recap,
  saved,
  onAnotherRound,
}: {
  title: string;
  recap: SessionRecap;
  saved: number;
  onAnotherRound: () => void;
}) {
  const lines: string[] = [];
  if (recap.toMastered > 0)
    lines.push(recap.toMastered === 1 ? "1 phrase mastered 🎉" : `${recap.toMastered} phrases mastered 🎉`);
  if (recap.toUsable > 0)
    lines.push(recap.toUsable === 1 ? "1 phrase is now usable" : `${recap.toUsable} phrases are now usable`);
  if (recap.toRecalled > 0)
    lines.push(recap.toRecalled === 1 ? "1 phrase moved to recalled" : `${recap.toRecalled} phrases moved to recalled`);
  if (recap.toRecognised > 0)
    lines.push(
      recap.toRecognised === 1 ? "1 phrase moved to recognised" : `${recap.toRecognised} phrases moved to recognised`
    );
  if (recap.metNew > 0)
    lines.push(recap.metNew === 1 ? "1 new phrase met" : `${recap.metNew} new phrases met`);
  if (saved > 0) lines.push(saved === 1 ? "1 saved to practise" : `${saved} saved to practise`);

  const headline = recapHasTransitions(recap) ? "Nice progress ✓" : "Session done ✓";

  return (
    <div
      data-testid="session-end"
      className="scene-enter flex h-full flex-col justify-center gap-6 px-6 pb-10"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">{title}</p>
      <h2 className="text-3xl font-bold leading-tight text-white">{headline}</h2>

      {lines.length > 0 ? (
        <ul data-testid="recap-lines" className="flex flex-col gap-2">
          {lines.map((line) => (
            <li
              key={line}
              className="flex items-center gap-2.5 rounded-2xl bg-white/[0.06] px-4 py-3 text-base text-white/85"
            >
              <span aria-hidden className="text-emerald-400">
                ↑
              </span>
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-white/60">Every rep counts — see you in the next one.</p>
      )}

      {recap.dueTomorrow > 0 && (
        <p data-testid="due-tomorrow" className="text-sm text-white/50">
          {recap.dueTomorrow === 1
            ? "1 phrase coming back tomorrow"
            : `${recap.dueTomorrow} phrases coming back tomorrow`}
        </p>
      )}

      <button
        type="button"
        data-testid="another-round"
        onClick={onAnotherRound}
        className="rounded-2xl bg-white px-6 py-4 text-center text-base font-semibold text-black active:scale-[0.98]"
      >
        Another round
      </button>
      <Link href="/" className="text-center text-sm text-white/50 underline-offset-4 active:underline">
        Back to home
      </Link>
    </div>
  );
}
