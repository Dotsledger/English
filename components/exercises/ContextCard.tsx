"use client";

import type { Phrase } from "@/lib/types";
import { getAvoidForms } from "@/lib/vocabStrategy";

/**
 * Context card (introduce a rich "core" phrase): the phrase, its natural
 * meaning, when to use it, one or two examples, and a common mistake if we
 * have one. Purely introductory — "Practice it" saves it to the deck, "Got
 * it" just marks it seen, "I already know this" suppresses it. Seeing this
 * card never advances a phrase past `seen`.
 */
export function ContextCard({
  phrase,
  saved,
  onSave,
  onDismiss,
  onSuppress,
}: {
  phrase: Phrase;
  saved: boolean;
  onSave: () => void;
  onDismiss: () => void;
  onSuppress: () => void;
}) {
  const examples = [phrase.example, ...(phrase.examples ?? [])].slice(0, 2);

  return (
    <div
      data-testid={`context-${phrase.id}`}
      className="flex h-full flex-col justify-center gap-4 px-6 pb-6"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
        New phrase
      </span>

      <div>
        <p className="text-[1.9rem] font-bold leading-tight text-amber-300">{phrase.text}</p>
        <p className="mt-1 text-base text-white/70">{phrase.meaningEs}</p>
      </div>

      {phrase.usageContext && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            When to use it
          </p>
          <p className="mt-1 text-sm text-white/75">{phrase.usageContext}</p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {examples.map((ex, i) => (
          <p key={i} className="text-sm text-white/60">
            “{ex}”
          </p>
        ))}
      </div>

      {getAvoidForms(phrase).length > 0 && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300/70">
            Common mistake
          </p>
          <p className="mt-1 text-sm text-white/70">{getAvoidForms(phrase).join(" · ")}</p>
        </div>
      )}

      <div className="mt-1 flex flex-col gap-2">
        <button
          type="button"
          data-testid="context-save"
          onClick={onSave}
          disabled={saved}
          className="btn-primary min-h-12 px-5 py-3 text-base disabled:opacity-50"
        >
          {saved ? "✓ Saved to practise" : "Practise it"}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="context-dismiss"
            onClick={onDismiss}
            className="flex-1 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/70 active:scale-[0.99]"
          >
            Got it
          </button>
          <button
            type="button"
            data-testid="context-suppress"
            onClick={onSuppress}
            className="flex-1 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/50 active:scale-[0.99]"
          >
            I already know this
          </button>
        </div>
      </div>
    </div>
  );
}
