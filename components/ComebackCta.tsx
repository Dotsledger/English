"use client";

import Link from "next/link";
import { COMEBACK_SIZE } from "@/lib/session/triage";

/** Shown after ≥ 4 days away: a warm, guilt-free 90-second re-entry.
 * No backlog number, no "you lost" framing. */
export function ComebackCta() {
  return (
    <Link
      href="/comeback"
      data-testid="comeback-cta"
      className="mb-3 flex items-center justify-between rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 active:scale-[0.99]"
    >
      <span className="text-sm font-medium text-emerald-200">
        Welcome back — {COMEBACK_SIZE} phrases in 90 seconds
      </span>
      <span aria-hidden className="shrink-0 text-emerald-300/70">
        →
      </span>
    </Link>
  );
}
