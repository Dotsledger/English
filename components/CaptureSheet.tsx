"use client";

import { useState } from "react";
import { useCaptures, useDeck } from "@/components/AppStateProvider";
import { createCapture } from "@/lib/capture";
import { freshEntry } from "@/lib/deckOps";
import { intervalForBox } from "@/lib/session/leitner";

/** "+" quick capture — a phrase heard in a meeting or a series, into the
 * deck (box 1) in under ten seconds. Text is the only required field. */
export function CaptureSheet({ onClose }: { onClose: () => void }) {
  const captures = useCaptures();
  const deck = useDeck();
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [meaningEs, setMeaningEs] = useState("");

  const save = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    const now = Date.now();
    const capture = createCapture(trimmed, note, meaningEs, now);
    captures.update((prev) => ({ ...prev, [capture.id]: capture }));
    deck.update((prev) => ({
      ...prev,
      [capture.id]: {
        ...freshEntry(capture.id, "custom"),
        inDeck: true,
        timesSeen: 1,
        lastSeenAt: now,
        addedToDeckAt: now,
        nextReviewAt: now + intervalForBox(1),
      },
    }));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-label="Capture a phrase"
    >
      <div
        className="w-full max-w-lg rounded-t-3xl border-t border-white/10 bg-[#14141d] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-bold text-white">Heard it somewhere?</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex flex-col gap-2.5"
        >
          <input
            autoFocus
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="The phrase in English…"
            data-testid="capture-text"
            autoComplete="off"
            className="min-h-12 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
          />
          <input
            type="text"
            value={meaningEs}
            onChange={(e) => setMeaningEs(e.target.value)}
            placeholder="Translation (optional)"
            data-testid="capture-meaning"
            autoComplete="off"
            className="min-h-12 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note — where did you hear it? (optional)"
            data-testid="capture-note"
            autoComplete="off"
            className="min-h-12 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
          />
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-white/12 px-4 py-3 text-sm font-medium text-white/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="capture-save"
              disabled={text.trim().length === 0}
              className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-40"
            >
              To deck
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
