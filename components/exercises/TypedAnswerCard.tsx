"use client";

import { useState } from "react";
import type { Phrase } from "@/lib/types";
import type { ClozeExercise, FreeTypeExercise } from "@/lib/exercises/types";
import { gradeAnswer, type GradeResult } from "@/lib/exercises/grade";
import { SparkBurst } from "@/components/SparkBurst";

/**
 * Shared typed-answer card for cloze (sentence with a blank, first-letter
 * hint) and free-type (Spanish prompt, produce the phrase cold). "Near"
 * (one typo) counts as correct for scheduling; the UI shows the canonical
 * form. Wrong answers get corrective, never punitive, copy.
 */
export function TypedAnswerCard({
  exercise,
  phrase,
  previousCorrect,
  onResult,
}: {
  exercise: ClozeExercise | FreeTypeExercise;
  phrase: Phrase | null;
  /** Non-null when the user already answered this card (back-navigation). */
  previousCorrect: boolean | null;
  onResult: (correct: boolean) => void;
}) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const answered = result !== null || previousCorrect !== null;
  const isCloze = exercise.type === "cloze";
  const canonical = exercise.acceptedAnswers[0];

  const submit = () => {
    if (answered || input.trim().length === 0) return;
    const graded = gradeAnswer(input, exercise.acceptedAnswers);
    setResult(graded);
    onResult(graded.verdict !== "wrong");
  };

  return (
    <div
      data-testid={`typed-${exercise.phraseId}`}
      className="flex h-full flex-col justify-center gap-6 px-6 pb-6"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
        {isCloze ? "Fill it in" : "How do you say it?"}
      </span>

      {isCloze ? (
        <p className="text-[1.45rem] font-semibold leading-[1.35] text-white">
          {exercise.before}
          <span className="mx-1 inline-block min-w-24 rounded-lg border-b-2 border-sky-400/70 bg-white/[0.06] px-2 text-sky-200">
            {answered ? exercise.answer : `${exercise.hint}…`}
          </span>
          {exercise.after}
        </p>
      ) : (
        <p className="text-[1.7rem] font-bold leading-[1.2] text-white">
          “{exercise.promptEs}”
        </p>
      )}

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
            placeholder={isCloze ? `Starts with “${exercise.hint}”…` : "Write it in English…"}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            data-testid="typed-input"
            className="min-h-14 rounded-2xl border border-white/12 bg-white/[0.06] px-5 py-4 text-lg text-white placeholder:text-white/35 focus:border-[color:var(--accent-blue)] focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[rgba(127,194,255,0.25)]"
          />
          <button
            type="submit"
            data-testid="typed-submit"
            className="btn-primary min-h-12 px-5 py-3 text-base disabled:opacity-40"
            disabled={input.trim().length === 0}
          >
            Check
          </button>
        </form>
      )}

      {answered && (
        <div className="badge-pop soft-panel relative flex flex-col gap-1 px-4 py-3">
          {(result?.verdict === "correct" ||
            result?.verdict === "near" ||
            (result === null && previousCorrect === true)) && <SparkBurst />}
          <p
            className={`text-base font-medium ${
              result?.verdict === "wrong" || previousCorrect === false
                ? "text-white/80"
                : "text-emerald-300"
            }`}
          >
            {result?.verdict === "correct" && "That's it."}
            {result?.verdict === "near" && `Almost — it's «${result.matched}».`}
            {result?.verdict === "wrong" && `It was «${canonical}». It'll be back soon.`}
            {result === null && (previousCorrect ? "That's it." : `It was «${canonical}». It'll be back soon.`)}
          </p>
          {phrase && (
            <p className="text-sm text-white/50">
              {phrase.text} · {phrase.meaningEs}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
