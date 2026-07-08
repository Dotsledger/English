"use client";

import type { Phrase } from "@/lib/types";
import { correctionWrongForm } from "@/lib/session/exercisePolicy";
import { getAvoidForms } from "@/lib/vocabStrategy";
import { SparkBurst } from "@/components/SparkBurst";

/**
 * Contrast / correction card. Two framings over the same interaction — pick
 * the right English form over a confusable/wrong one:
 *  - "contrast"  (false friends): "To say «meaning», which one?" — meaning-led.
 *  - "correction" (collocations/traps): "Which is natural English?" — form-led,
 *    attacking the Spanish-style error the learner is likely to make.
 * The wrong option comes from `contrastWith` or an `avoid` wrong-form list.
 * Recognition-grade result.
 */
export function ContrastCard({
  phrase,
  mode = "contrast",
  selectedText,
  onSelect,
}: {
  phrase: Phrase;
  mode?: "contrast" | "correction";
  /** The option text already chosen (back-navigation), or null. */
  selectedText: string | null;
  onSelect: (correct: boolean) => void;
}) {
  const other = correctionWrongForm(phrase) ?? "";
  const explanation = phrase.contrastWith?.[0]?.explanationEs ?? getAvoidForms(phrase).join(" ");
  // Deterministic option order (phrase id parity) so it's stable across renders.
  const phraseFirst = phrase.id.charCodeAt(0) % 2 === 0;
  const options = phraseFirst ? [phrase.text, other] : [other, phrase.text];
  const answered = selectedText !== null;

  return (
    <div
      data-testid={`${mode}-${phrase.id}`}
      className="flex h-full flex-col justify-center gap-6 px-6 pb-6"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
        {mode === "correction" ? "Common mistake" : "Easy to mix up"}
      </span>
      <p className="text-[1.5rem] font-bold leading-snug text-white">
        {mode === "correction"
          ? "Which is natural English?"
          : `To say “${phrase.meaningEs}”, which one?`}
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
          {mode === "correction" && (
            <p className="text-sm text-white/60">
              {phrase.text} · {phrase.meaningEs}
            </p>
          )}
          {explanation && <p className="text-sm text-white/55">{explanation}</p>}
        </div>
      ) : (
        <p className="text-sm text-white/40">
          {mode === "correction"
            ? "One is natural English — the other is a Spanish-style slip."
            : "One expresses that meaning — the other is close."}
        </p>
      )}
    </div>
  );
}
