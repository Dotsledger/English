"use client";

import type { Phrase } from "@/lib/types";
import { SparkBurst } from "@/components/SparkBurst";

/**
 * Contrast card (avoid confusion): the phrase against a confusable one. The
 * learner picks which one expresses the target meaning; the explanation of
 * the difference is revealed afterward. A recognition-grade result.
 */
export function ContrastCard({
  phrase,
  selectedText,
  onSelect,
}: {
  phrase: Phrase;
  /** The option text already chosen (back-navigation), or null. */
  selectedText: string | null;
  onSelect: (correct: boolean) => void;
}) {
  const contrast = phrase.contrastWith?.[0];
  const other = contrast?.phrase ?? "";
  // Deterministic option order (phrase id parity) so it's stable across renders.
  const phraseFirst = phrase.id.charCodeAt(0) % 2 === 0;
  const options = phraseFirst ? [phrase.text, other] : [other, phrase.text];
  const answered = selectedText !== null;

  return (
    <div
      data-testid={`contrast-${phrase.id}`}
      className="flex h-full flex-col justify-center gap-6 px-6 pb-6"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
        Easy to mix up
      </span>
      <p className="text-[1.5rem] font-bold leading-snug text-white">
        To say “{phrase.meaningEs}”, which one?
      </p>

      <div className="flex flex-col gap-2.5" role="group">
        {options.map((option) => {
          const isCorrect = option === phrase.text;
          const isSelected = selectedText === option;
          let style = "border-white/12 bg-white/[0.06] text-white/90 active:scale-[0.98]";
          if (answered && isCorrect) {
            style = "border-emerald-400/50 bg-emerald-500/15 text-emerald-200";
          } else if (answered && isSelected) {
            style = "border-white/25 bg-white/10 text-white/60";
          } else if (answered) {
            style = "border-white/8 bg-white/[0.03] text-white/40";
          }
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => onSelect(isCorrect)}
              className={`min-h-14 rounded-2xl border px-5 py-4 text-left text-lg leading-snug transition-all ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div className="badge-pop relative flex flex-col gap-1 rounded-2xl bg-white/[0.06] px-4 py-3">
          {selectedText === phrase.text && <SparkBurst />}
          <p
            className={`text-base font-medium ${
              selectedText === phrase.text ? "text-emerald-300" : "text-white/80"
            }`}
          >
            {selectedText === phrase.text ? "That's it." : `It's “${phrase.text}”.`}
          </p>
          {contrast && <p className="text-sm text-white/55">{contrast.explanationEs}</p>}
        </div>
      ) : (
        <p className="text-sm text-white/40">One expresses that meaning — the other is close.</p>
      )}
    </div>
  );
}
