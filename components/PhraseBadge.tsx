"use client";

import { useEffect, useRef, useState } from "react";
import type { Phrase, PhraseStage } from "@/lib/types";
import { isTtsAvailable, speak } from "@/lib/tts";

export type BadgeStage = PhraseStage | "new";

const stageLabel: Record<BadgeStage, string> = {
  new: "nueva",
  seen: "vista",
  recognised: "reconocida",
  produced: "producida",
  mastered: "dominada",
};

const stageColor: Record<BadgeStage, string> = {
  new: "bg-sky-400/20 text-sky-300",
  seen: "bg-violet-400/20 text-violet-300",
  recognised: "bg-amber-400/20 text-amber-300",
  produced: "bg-emerald-400/20 text-emerald-300",
  mastered: "bg-emerald-400/30 text-emerald-200",
};

export function PhraseBadge({
  phrase,
  stage,
  saved,
  onPeek,
  onSave,
  onSuppress,
}: {
  phrase: Phrase;
  stage: BadgeStage;
  saved: boolean;
  onPeek?: (ms: number) => void;
  onSave?: () => void;
  onSuppress?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const mountedAt = useRef<number | null>(null);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);
  const ttsReady = isTtsAvailable();

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    onPeek?.(mountedAt.current === null ? 0 : Date.now() - mountedAt.current);
  };

  return (
    <div
      data-testid="phrase-badge"
      className="badge-pop inline-flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-md"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Sticky phrase
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${stageColor[stage]}`}
        >
          {stageLabel[stage]}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="save-phrase"
          onClick={onSave}
          aria-pressed={saved}
          aria-label={saved ? "Guardada en tu mazo" : "Guardar en tu mazo"}
          className="flex items-center gap-2 text-left active:scale-[0.98]"
        >
          <span className="text-lg font-semibold leading-tight text-white">{phrase.text}</span>
          <span
            aria-hidden
            className={`text-base transition-transform ${saved ? "badge-pop text-rose-400" : "text-white/25"}`}
          >
            {saved ? "♥" : "♡"}
          </span>
        </button>
        {ttsReady && (
          <button
            type="button"
            data-testid="speak-phrase"
            onClick={() => speak(phrase.example)}
            aria-label="Escuchar el ejemplo"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-sm text-white/70 active:scale-90"
          >
            🔊
          </button>
        )}
      </div>

      {revealed ? (
        <span data-testid="phrase-meaning" className="badge-pop text-sm text-white/60">
          {phrase.meaningEs}
        </span>
      ) : (
        <button
          type="button"
          data-testid="reveal-meaning"
          onClick={reveal}
          className="self-start rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-xs text-white/55 active:scale-[0.97]"
        >
          ¿Qué crees que significa? Toca para comprobar
        </button>
      )}

      {onSuppress && (
        <button
          type="button"
          data-testid="suppress-phrase"
          onClick={onSuppress}
          className="self-start text-[11px] text-white/30 underline-offset-2 active:underline"
        >
          Ya la domino
        </button>
      )}
    </div>
  );
}
