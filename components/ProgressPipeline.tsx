"use client";

import { useActivity, useDeck } from "@/components/AppStateProvider";
import { datesOfWeek } from "@/lib/dates";

/** Honest pipeline counts + weekly active days. Weekly count resets every
 * Monday and is never framed as a loss — no broken-streak copy anywhere. */
export function ProgressPipeline() {
  const deck = useDeck();
  const activity = useActivity();
  if (!deck.ready || !activity.ready) return null;

  const entries = Object.values(deck.value).filter((e) => !e.suppressed);
  const dominadas = entries.filter((e) => e.stage === "mastered").length;
  const enCamino = entries.filter(
    (e) => e.stage === "recognised" || e.stage === "produced"
  ).length;
  const vistas = entries.filter((e) => e.stage === "seen").length;
  if (dominadas + enCamino + vistas === 0) return null;

  const week = datesOfWeek();
  const activeDays = week.filter((d) => activity.value[d]).length;

  const cells = [
    { n: dominadas, label: "dominadas" },
    { n: enCamino, label: "en camino" },
    { n: vistas, label: "vistas" },
  ];

  return (
    <div data-testid="progress-pipeline" className="mb-4 flex flex-col gap-2">
      <div className="flex gap-2">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="flex flex-1 items-baseline justify-center gap-1.5 rounded-2xl bg-white/[0.05] px-3 py-2.5"
          >
            <span className="font-mono text-lg font-semibold text-white">{cell.n}</span>
            <span className="text-[11px] text-white/45">{cell.label}</span>
          </div>
        ))}
      </div>
      <p className="px-1 text-[11px] text-white/40">
        Días activos esta semana: {activeDays}/7{activeDays > 0 ? " ✓" : ""}
      </p>
    </div>
  );
}
