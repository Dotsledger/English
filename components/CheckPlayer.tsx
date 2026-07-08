"use client";

import { useState } from "react";
import type { CheckItem } from "@/lib/checkSession";
import { scoreCheck } from "@/lib/checkSession";
import { phraseById } from "@/lib/data/phrases";
import { McqCard } from "@/components/exercises/McqCard";
import { TypedAnswerCard } from "@/components/exercises/TypedAnswerCard";

type Answer = { correct: boolean; selectedIndex?: number };

/** Runs a level check by reusing the exercise cards. Purely an assessment —
 * it scores answers and never writes to the deck's review schedule. */
export function CheckPlayer({
  items,
  onComplete,
}: {
  items: CheckItem[];
  /** score = CORE-only percentage; stretchCorrect = correct next-band items. */
  onComplete: (scorePct: number, stretchCorrect: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});

  const item = items[index];
  const answered = answers[index] !== undefined;
  const isLast = index === items.length - 1;

  const record = (correct: boolean, selectedIndex?: number) => {
    if (answers[index] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [index]: { correct, selectedIndex } }));
  };

  const advance = () => {
    if (!answered) return;
    if (isLast) {
      // Core score excludes stretch items; stretch only ever adds a bonus.
      let coreTotal = 0;
      let coreCorrect = 0;
      let stretchCorrect = 0;
      items.forEach((it, i) => {
        const a = answers[i];
        if (it.source === "stretch") {
          if (a?.correct) stretchCorrect += 1;
        } else {
          coreTotal += 1;
          if (a?.correct) coreCorrect += 1;
        }
      });
      onComplete(scoreCheck(coreCorrect, coreTotal), stretchCorrect);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const phrase = phraseById.get(item.exercise.phraseId) ?? null;

  return (
    <div data-testid="check-player" className="relative flex h-dvh flex-col overflow-hidden bg-[#0b0b12]">
      <div className="px-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
          Level check
        </p>
        <div className="mt-2 flex gap-1" aria-hidden>
          {items.map((_, i) => (
            <span
              key={i}
              className={`h-[3px] flex-1 rounded-full ${
                i < index ? "bg-white/80" : i === index ? "bg-white/50" : "bg-white/15"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-hidden">
        <div key={item.id} className="scene-enter h-full">
          {item.exercise.type === "mcq" ? (
            <McqCard
              exercise={item.exercise}
              phrase={phrase}
              kicker="Which one?"
              badge={item.source === "stretch" ? "🎯 Extra" : undefined}
              selectedIndex={answered ? (answers[index].selectedIndex ?? null) : null}
              onSelect={(i, correct) => record(correct, i)}
            />
          ) : (
            <TypedAnswerCard
              exercise={item.exercise}
              phrase={phrase}
              previousCorrect={answered ? answers[index].correct : null}
              onResult={(correct) => record(correct)}
            />
          )}
        </div>
      </div>

      <div className="px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <button
          type="button"
          data-testid="check-next"
          onClick={advance}
          disabled={!answered}
          className="min-h-12 w-full rounded-2xl bg-white px-5 py-3 text-base font-semibold text-black active:scale-[0.99] disabled:opacity-30"
        >
          {isLast ? "See result" : "Next"}
        </button>
      </div>
    </div>
  );
}
