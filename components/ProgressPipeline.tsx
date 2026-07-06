"use client";

import { useActivity, useDeck } from "@/components/AppStateProvider";
import { datesOfWeek } from "@/lib/dates";

/** Honest pipeline counts + weekly active days. Counters that are 0 are
 * hidden; the weekly indicator is dots (never a fraction) and never
 * frames absence as a loss. */
export function ProgressPipeline() {
  const deck = useDeck();
  const activity = useActivity();
  if (!deck.ready || !activity.ready) return null;

  const entries = Object.values(deck.value).filter((e) => !e.suppressed);
  const vistas = entries.filter((e) => e.stage === "seen").length;
  const enCamino = entries.filter(
    (e) => e.stage === "recognised" || e.stage === "produced"
  ).length;
  const dominadas = entries.filter((e) => e.stage === "mastered").length;
  if (vistas + enCamino + dominadas === 0) return null;

  const cells = [
    { n: vistas, label: "vistas" },
    { n: enCamino, label: "en camino" },
    { n: dominadas, label: "dominadas" },
  ].filter((c) => c.n > 0);

  const week = datesOfWeek();
  const activeSet = new Set(week.filter((d) => activity.value[d]));

  return (
    <div data-testid="progress-pipeline" className="mb-4 flex flex-col gap-2.5">
      <div className="flex gap-2">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="flex flex-1 items-baseline justify-center gap-1.5 rounded-2xl bg-white/[0.05] px-3 py-2.5"
          >
            <span className="font-mono text-lg font-semibold text-white">{cell.n}</span>
            <span className="text-[11px] text-white/55">{cell.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] text-white/50">Esta semana</span>
        <div className="flex gap-1" role="img" aria-label={`${activeSet.size} días activos esta semana`}>
          {week.map((d) => (
            <span
              key={d}
              className={`h-2 w-2 rounded-full ${activeSet.has(d) ? "bg-emerald-400" : "bg-white/15"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
