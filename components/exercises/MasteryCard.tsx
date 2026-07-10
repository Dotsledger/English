"use client";

import { useRef, useState } from "react";
import type { Phrase, UserSentence } from "@/lib/types";
import type { MasteryVerdict } from "@/lib/deckOps";
import { recognizeOnce } from "@/lib/speech";

/**
 * The MASTERED gate (Feature 3): free production of the user's own sentence,
 * then a side-by-side model, then honest self-assessment. No auto-grading —
 * the three buttons drive the Leitner move. The attempt is saved to the
 * user's personal corpus.
 */
export function MasteryCard({
  phrase,
  pastSentences,
  speechAvailable,
  alreadyAnswered,
  onGrade,
}: {
  phrase: Phrase | null;
  pastSentences: UserSentence[];
  speechAvailable: boolean;
  alreadyAnswered: boolean;
  onGrade: (verdict: MasteryVerdict, sentence: string) => void;
}) {
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(alreadyAnswered);
  const [listening, setListening] = useState(false);
  const handleRef = useRef<{ cancel: () => void } | null>(null);

  if (!phrase) return null;
  const models = [phrase.example, ...(phrase.examples ?? [])].slice(0, 2);

  const dictate = () => {
    if (listening) return;
    setListening(true);
    handleRef.current = recognizeOnce({
      lang: "en-GB",
      onResult: (t) => {
        setListening(false);
        setText((prev) => (prev ? `${prev} ${t}` : t));
      },
      onError: () => setListening(false),
    });
  };

  const grade = (verdict: MasteryVerdict) => onGrade(verdict, text);

  return (
    <div
      data-testid={`mastery-${phrase.id}`}
      className="flex h-full flex-col justify-center gap-5 px-6 pb-6"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
        Use it in your own sentence
      </span>
      <p className="text-2xl font-bold leading-tight text-white">{phrase.text}</p>

      {!revealed ? (
        <div className="flex flex-col gap-2.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Write a sentence with this expression…"
            data-testid="mastery-input"
            autoCapitalize="sentences"
            className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-lg text-white placeholder:text-white/30 focus:border-violet-400/60 focus:outline-none"
          />
          <div className="flex gap-2">
            {speechAvailable && (
              <button
                type="button"
                data-testid="mastery-mic"
                onClick={dictate}
                disabled={listening}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl ${
                  listening
                    ? "border-violet-400/70 bg-violet-500/20"
                    : "border-white/12 bg-white/[0.06]"
                }`}
                aria-label="Dictate"
              >
                🎤
              </button>
            )}
            <button
              type="button"
              data-testid="mastery-reveal"
              onClick={() => setRevealed(true)}
              disabled={text.trim().length === 0}
              className="btn-primary min-h-12 flex-1 px-5 py-3 text-base disabled:opacity-40"
            >
              See a model
            </button>
          </div>
        </div>
      ) : (
        <>
          {text.trim().length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Your sentence
              </p>
              <p className="mt-1 text-base text-white/90">{text.trim()}</p>
            </div>
          )}
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
              Model
            </p>
            {models.map((m, i) => (
              <p key={i} className="mt-1 text-base text-white/80">
                {m}
              </p>
            ))}
          </div>

          {!alreadyAnswered && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-white/50">How did it go?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="mastery-me-salio"
                  onClick={() => grade("me_salio")}
                  className="flex-1 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-3 text-sm font-semibold text-emerald-200 active:scale-[0.98]"
                >
                  Nailed it
                </button>
                <button
                  type="button"
                  data-testid="mastery-regular"
                  onClick={() => grade("regular")}
                  className="flex-1 rounded-2xl border border-white/15 bg-white/[0.06] px-3 py-3 text-sm font-medium text-white/80 active:scale-[0.98]"
                >
                  So-so
                </button>
                <button
                  type="button"
                  data-testid="mastery-no"
                  onClick={() => grade("no_me_salio")}
                  className="flex-1 rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-3 text-sm font-medium text-white/60 active:scale-[0.98]"
                >
                  Didn’t get it
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {pastSentences.length > 0 && (
        <div className="mt-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            Your earlier sentences
          </p>
          <ul className="mt-1 flex flex-col gap-1">
            {pastSentences.slice(-3).map((s, i) => (
              <li key={i} className="text-sm text-white/45">
                “{s.text}”
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
