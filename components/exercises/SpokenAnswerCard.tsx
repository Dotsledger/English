"use client";

import { useEffect, useRef, useState } from "react";
import type { Phrase } from "@/lib/types";
import type { FreeTypeExercise } from "@/lib/exercises/types";
import { matchesSpokenTarget } from "@/lib/exercises/grade";
import { recognizeOnce, type SpeechHandle } from "@/lib/speech";
import { TypedAnswerCard } from "@/components/exercises/TypedAnswerCard";

const SOFT_TIMER_MS = 10_000;

/**
 * Spoken production for boxes 4–5 (Feature 2): show the Spanish prompt, tap
 * the mic, say the English phrase; graded by fuzzy token match. A subtle
 * 10-second soft timer simulates conversational pressure (visual only — no
 * failure on timeout). Any recognition failure or mic denial silently hands
 * off to the typed card and disables speech for the rest of the session.
 */
export function SpokenAnswerCard({
  exercise,
  phrase,
  previousCorrect,
  onResult,
  onDisableSpeech,
}: {
  exercise: FreeTypeExercise;
  phrase: Phrase | null;
  /** Non-null when this card was already answered (back-navigation). */
  previousCorrect: boolean | null;
  onResult: (correct: boolean) => void;
  /** Called on mic denial/unsupported so the session stays typed. */
  onDisableSpeech: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "listening" | "answered">(
    previousCorrect === null ? "idle" : "answered"
  );
  const [fallback, setFallback] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [correct, setCorrect] = useState(previousCorrect === true);
  const handleRef = useRef<SpeechHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => {
    return () => {
      handleRef.current?.cancel();
      stopTimer();
    };
  }, []);

  const canonical = exercise.acceptedAnswers[0];

  const listen = () => {
    if (phase === "listening" || phase === "answered") return;
    setPhase("listening");
    handleRef.current = recognizeOnce({
      lang: "en-GB",
      onResult: (t) => {
        stopTimer();
        const ok = matchesSpokenTarget(t, exercise.acceptedAnswers);
        setTranscript(t);
        setCorrect(ok);
        setPhase("answered");
        onResult(ok);
      },
      onError: (err) => {
        stopTimer();
        // No-speech / abort → let them try again; denial/unsupported → typed.
        if (err === "no-speech" || err === "aborted") {
          setPhase("idle");
          return;
        }
        setFallback(true);
        onDisableSpeech();
      },
    });
    // Soft timer: stop listening after 10s, no failure — just reset to idle.
    timerRef.current = setTimeout(() => {
      handleRef.current?.cancel();
      setPhase((p) => (p === "listening" ? "idle" : p));
    }, SOFT_TIMER_MS);
  };

  if (fallback) {
    return (
      <TypedAnswerCard exercise={exercise} phrase={phrase} previousCorrect={null} onResult={onResult} />
    );
  }

  return (
    <div
      data-testid={`spoken-${exercise.phraseId}`}
      className="flex h-full flex-col justify-center gap-6 px-6 pb-6"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
        Dilo en voz alta
      </span>
      <p className="text-[1.7rem] font-bold leading-[1.2] text-white">“{exercise.promptEs}”</p>

      {phase !== "answered" && (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            data-testid="mic-button"
            onClick={listen}
            disabled={phase === "listening"}
            aria-label="Hablar"
            className={`flex h-20 w-20 items-center justify-center rounded-full border text-3xl transition-colors ${
              phase === "listening"
                ? "border-sky-400/70 bg-sky-500/20 text-sky-200"
                : "border-white/15 bg-white/[0.06] text-white/80 active:scale-95"
            }`}
          >
            🎤
          </button>
          {phase === "listening" ? (
            <>
              <span className="text-sm text-sky-200/80">Escuchando…</span>
              <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
                <div className="soft-timer h-full bg-sky-400/70" />
              </div>
            </>
          ) : (
            <span className="text-sm text-white/40">Toca y dilo — sin prisa</span>
          )}
          <button
            type="button"
            onClick={() => setFallback(true)}
            className="text-[11px] text-white/30 underline-offset-2 active:underline"
          >
            Prefiero escribirla
          </button>
        </div>
      )}

      {phase === "answered" && (
        <div className="badge-pop flex flex-col gap-1 rounded-2xl bg-white/[0.06] px-4 py-3">
          <p className={`text-base font-medium ${correct ? "text-emerald-300" : "text-white/80"}`}>
            {correct ? "Eso es." : `Casi — era «${canonical}». Volverá pronto.`}
          </p>
          {transcript && <p className="text-sm text-white/40">Te oí: “{transcript}”</p>}
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
