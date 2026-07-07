"use client";

import type { Phrase } from "@/lib/types";
import type { McqExercise } from "@/lib/exercises/types";
import { SparkBurst } from "@/components/SparkBurst";

/** Same visual language as the authored CheckpointCard — kicker, prompt,
 * options, calm feedback. One exercise per card. */
export function McqCard({
  exercise,
  phrase,
  kicker,
  badge,
  selectedIndex,
  onSelect,
}: {
  exercise: McqExercise;
  phrase: Phrase | null;
  kicker: string;
  /** Optional pill shown next to the kicker (e.g. "🎯 Extra" for stretch items). */
  badge?: string;
  selectedIndex: number | null;
  onSelect: (index: number, correct: boolean) => void;
}) {
  const answered = selectedIndex !== null;
  const wasCorrect = answered && selectedIndex === exercise.correctIndex;

  return (
    <div
      data-testid={`mcq-${exercise.phraseId}`}
      className="flex h-full flex-col justify-center gap-6 px-6 pb-6"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
          {kicker}
        </span>
        {badge && (
          <span
            data-testid="mcq-badge"
            className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300"
          >
            {badge}
          </span>
        )}
      </div>

      <p className="whitespace-pre-line text-[1.7rem] font-bold leading-[1.2] text-white">
        {exercise.prompt}
      </p>

      <div className="flex flex-col gap-2.5" role="group" aria-label={kicker}>
        {exercise.options.map((option, i) => {
          const isSelected = selectedIndex === i;
          const isCorrectOption = i === exercise.correctIndex;
          let style = "border-white/12 bg-white/[0.06] text-white/90 active:scale-[0.98]";
          if (answered && isCorrectOption) {
            style = "border-emerald-400/50 bg-emerald-500/15 text-emerald-200";
          } else if (answered && isSelected) {
            style = "border-white/25 bg-white/10 text-white/60";
          } else if (answered) {
            style = "border-white/8 bg-white/[0.03] text-white/40";
          }
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => onSelect(i, i === exercise.correctIndex)}
              className={`min-h-14 rounded-2xl border px-5 py-4 text-left text-lg leading-snug transition-all ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div className="badge-pop relative flex flex-col gap-1 rounded-2xl bg-white/[0.06] px-4 py-3">
          {wasCorrect && <SparkBurst />}
          <p className={`text-base font-medium ${wasCorrect ? "text-emerald-300" : "text-white/80"}`}>
            {wasCorrect ? "Eso es." : "Todo bien — volverá pronto."}
          </p>
          {phrase && (
            <p className="text-sm text-white/50">
              {phrase.text} · {phrase.meaningEs}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-white/40">Toca una para seguir — sin presión.</p>
      )}
    </div>
  );
}
