"use client";

import type { CheckpointScene } from "@/lib/types";
import { getPhrase } from "@/lib/data/phrases";

export function CheckpointCard({
  scene,
  selectedIndex,
  onSelect,
}: {
  scene: CheckpointScene;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const answered = selectedIndex !== null;
  const wasCorrect = answered && selectedIndex === scene.correctIndex;
  const phrase = getPhrase(scene.phraseId);

  return (
    <div
      data-testid={`checkpoint-${scene.id}`}
      className="flex h-full flex-col justify-center gap-6 px-6 pb-6"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
        {scene.kicker}
      </span>

      <p className="whitespace-pre-line text-[1.7rem] font-bold leading-[1.2] text-white">
        {scene.prompt}
      </p>

      <div className="flex flex-col gap-2.5" role="group" aria-label={scene.kicker}>
        {scene.options.map((option, i) => {
          const isSelected = selectedIndex === i;
          const isCorrectOption = i === scene.correctIndex;
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
              onClick={() => onSelect(i)}
              className={`min-h-14 rounded-2xl border px-5 py-4 text-left text-lg leading-snug transition-all ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="badge-pop soft-panel flex flex-col gap-1 px-4 py-3">
          <p
            className={`text-base font-medium ${wasCorrect ? "text-emerald-300" : "text-white/85"}`}
          >
            {wasCorrect ? scene.feedbackCorrect : scene.feedbackWrong}
          </p>
          <p className="text-sm text-white/50">
            {phrase.text} · {phrase.meaningEs}
          </p>
        </div>
      )}

      {!answered && (
        <p className="text-sm text-white/40">Tap one to continue — no stress.</p>
      )}
    </div>
  );
}
