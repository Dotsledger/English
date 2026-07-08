"use client";

import { useState } from "react";
import type { Phrase } from "@/lib/types";
import { gradeAnswer, type GradeResult } from "@/lib/exercises/grade";
import { SparkBurst } from "@/components/SparkBurst";

/**
 * Typed correction — a stronger, production-style correction. The learner is
 * shown a wrong Spanish-style form and must TYPE the natural English form,
 * not just pick it. Recall/correction-grade evidence (harder than choice
 * correction, easier than open situation production). Normalised comparison
 * via the shared gradeAnswer (case / spacing / punctuation, one-typo tolerant).
 */
export function TypedCorrectionCard({
  phrase,
  wrongForm,
  previousCorrect,
  onResult,
}: {
  phrase: Phrase;
  wrongForm: string;
  /** Non-null when already answered (back-navigation). */
  previousCorrect: boolean | null;
  onResult: (correct: boolean) => void;
}) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const answered = result !== null || previousCorrect !== null;
  const canonical = phrase.text;
  const explanation = phrase.contrastWith?.[0]?.explanationEs;

  const submit = () => {
    if (answered || input.trim().length === 0) return;
    const graded = gradeAnswer(input, [phrase.text, ...(phrase.variants ?? [])]);
    setResult(graded);
    onResult(graded.verdict !== "wrong");
  };

  const correct = result ? result.verdict !== "wrong" : previousCorrect === true;

  return (
    <div
      data-testid={`typed-correction-${phrase.id}`}
      className="flex h-full flex-col justify-center gap-5 px-6 pb-6"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
        Correct the English
      </span>
      <div>
        <p className="text-sm text-white/50">This is wrong — write it correctly:</p>
        <p className="mt-1 text-[1.7rem] font-bold leading-tight text-rose-300 line-through decoration-rose-400/50">
          {wrongForm}
        </p>
      </div>

      {!answered && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-2.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write the natural English…"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            data-testid="typed-correction-input"
            className="min-h-14 rounded-2xl border border-white/12 bg-white/[0.06] px-5 py-4 text-lg text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
          />
          <button
            type="submit"
            data-testid="typed-correction-submit"
            className="min-h-12 rounded-2xl bg-white px-5 py-3 text-base font-semibold text-black active:scale-[0.98] disabled:opacity-40"
            disabled={input.trim().length === 0}
          >
            Check
          </button>
        </form>
      )}

      {answered && (
        <div className="badge-pop relative flex flex-col gap-1 rounded-2xl bg-white/[0.06] px-4 py-3">
          {correct && <SparkBurst />}
          <p className={`text-base font-medium ${correct ? "text-emerald-300" : "text-white/80"}`}>
            {correct ? "That's it." : `It's “${canonical}”.`}
          </p>
          <p className="text-sm text-white/55">
            {phrase.text} · {phrase.meaningEs}
          </p>
          {explanation && <p className="text-sm text-white/45">{explanation}</p>}
        </div>
      )}
    </div>
  );
}
