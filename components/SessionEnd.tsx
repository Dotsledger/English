"use client";

import Link from "next/link";
import type { SessionStats } from "@/lib/session/types";

export function SessionEnd({
  title,
  stats,
  onAnotherRound,
}: {
  title: string;
  stats: SessionStats;
  onAnotherRound: () => void;
}) {
  const rows = [
    { n: stats.vistas, label: stats.vistas === 1 ? "frase vista" : "frases vistas" },
    { n: stats.guardadas, label: stats.guardadas === 1 ? "guardada" : "guardadas" },
    { n: stats.recuperadas, label: stats.recuperadas === 1 ? "recuperada" : "recuperadas" },
  ];

  return (
    <div
      data-testid="session-end"
      className="scene-enter flex h-full flex-col justify-center gap-6 px-6 pb-10"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">{title}</p>
      <h2 className="text-3xl font-bold leading-tight text-white">Sesión hecha ✓</h2>

      <div className="flex gap-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-1 flex-col items-center gap-1 rounded-2xl bg-white/[0.06] px-3 py-4"
          >
            <span className="font-mono text-2xl font-semibold text-white">{row.n}</span>
            <span className="text-center text-xs text-white/50">{row.label}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        data-testid="another-round"
        onClick={onAnotherRound}
        className="rounded-2xl bg-white px-6 py-4 text-center text-base font-semibold text-black active:scale-[0.98]"
      >
        Otra ronda
      </button>
      <Link href="/" className="text-center text-sm text-white/50 underline-offset-4 active:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
