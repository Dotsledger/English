"use client";

import { useEffect, useRef, useState } from "react";
import type { Phrase, PhraseStage } from "@/lib/types";
import { isTtsAvailable, speak } from "@/lib/tts";

export type BadgeStage = PhraseStage | "new";

const LONG_PRESS_MS = 500;

export function PhraseBadge({
  phrase,
  saved,
  onPeek,
  onSave,
  onSuppress,
  onUndoSuppress,
}: {
  phrase: Phrase;
  /** Lifecycle stage is internal — not shown on feed cards. */
  stage?: BadgeStage;
  saved: boolean;
  onPeek?: (ms: number) => void;
  onSave?: () => void;
  onSuppress?: () => void;
  onUndoSuppress?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [justSuppressed, setJustSuppressed] = useState(false);
  const mountedAt = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const ttsReady = isTtsAvailable();

  useEffect(() => {
    mountedAt.current = Date.now();
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    onPeek?.(mountedAt.current === null ? 0 : Date.now() - mountedAt.current);
  };

  const startLongPress = () => {
    if (!onSuppress) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setSheetOpen(true);
    }, LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const handleSave = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return; // the press became a long-press; don't also save
    }
    onSave?.();
  };

  const confirmSuppress = () => {
    setSheetOpen(false);
    setJustSuppressed(true);
    onSuppress?.();
  };

  return (
    <div
      data-testid="phrase-badge"
      className="badge-pop relative w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur-md"
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
        Sticky phrase
      </span>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <button
          type="button"
          data-testid="save-phrase"
          onClick={handleSave}
          aria-pressed={saved}
          aria-label={saved ? "Guardada en tu mazo" : "Guardar en tu mazo"}
          className="flex min-h-11 flex-1 items-center gap-2.5 text-left active:scale-[0.99]"
        >
          <span className="text-[1.65rem] font-bold leading-tight text-amber-300">
            {phrase.text}
          </span>
          <span
            aria-hidden
            className={`text-xl transition-transform ${saved ? "badge-pop text-rose-400" : "text-white/30"}`}
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-base text-white/70 active:scale-90"
          >
            🔊
          </button>
        )}
      </div>

      <button
        type="button"
        data-testid="reveal-meaning"
        onClick={reveal}
        aria-label={revealed ? undefined : "Toca para comprobar el significado"}
        className="relative mt-2 block min-h-11 w-full text-left"
      >
        <span
          data-testid="phrase-meaning"
          data-revealed={revealed}
          className={`block text-base text-white/70 transition-[filter] duration-200 ${
            revealed ? "" : "select-none blur-[6px]"
          }`}
        >
          {phrase.meaningEs}
        </span>
        {!revealed && (
          <span className="absolute inset-0 flex items-center text-sm font-medium text-white/60">
            Toca para comprobar
          </span>
        )}
      </button>

      {justSuppressed && (
        <div
          data-testid="suppress-undo"
          className="badge-pop mt-2 flex items-center justify-between rounded-xl bg-white/[0.08] px-3 py-2 text-xs text-white/70"
        >
          <span>No volverás a verla</span>
          <button
            type="button"
            data-testid="undo-suppress"
            onClick={() => {
              setJustSuppressed(false);
              onUndoSuppress?.();
            }}
            className="font-semibold text-white underline underline-offset-2 active:scale-95"
          >
            Deshacer
          </button>
        </div>
      )}

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setSheetOpen(false)}
          role="dialog"
          aria-label="Acciones de la frase"
        >
          <div
            className="w-full max-w-lg rounded-t-3xl border-t border-white/10 bg-[#14141d] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 text-base font-semibold text-white">{phrase.text}</p>
            <p className="mb-3 text-sm text-white/50">{phrase.meaningEs}</p>
            <button
              type="button"
              data-testid="suppress-phrase"
              onClick={confirmSuppress}
              className="min-h-12 w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm font-medium text-white active:scale-[0.99]"
            >
              Ya la domino
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-2 min-h-11 w-full px-4 py-2 text-sm text-white/45"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
