"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDeck } from "@/components/AppStateProvider";
import { getPhrase } from "@/lib/data/phrases";
import { getCategoryLabel } from "@/lib/vocabStrategy";
import { removeFromDeck } from "@/lib/deckOps";
import { notebookGroups, type NotebookItem } from "@/lib/notebook";

/**
 * "My phrases" — a read-only vocabulary notebook. It shows what the user has
 * met and saved, grouped by learning stage, with when each phrase is next
 * coming back. It is a visibility layer only: no "review now", no manual
 * cramming — Today's Practice remains the single review engine.
 */
export function Notebook() {
  const deck = useDeck();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount clock read
    setNow(Date.now());
  }, []);

  const groups = now !== null ? notebookGroups(deck.value, now) : [];
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Back to home"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/60"
        >
          ←
        </Link>
        <h1 className="text-2xl font-bold text-white">My phrases</h1>
      </header>

      <p className="px-1 text-xs text-white/50">
        Today&rsquo;s Practice decides when to review these. This list is just your notebook.
      </p>

      {!deck.ready || now === null ? (
        <p className="px-1 text-sm text-white/50">Loading…</p>
      ) : total === 0 ? (
        <div data-testid="notebook-empty" className="rounded-2xl bg-white/[0.05] px-4 py-6 text-center">
          <p className="text-sm text-white/70">No phrases yet.</p>
          <p className="mt-1 text-xs text-white/45">
            Add a few from &ldquo;Add patterns to learn&rdquo;, then practise them here in Today&rsquo;s
            Practice.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5" data-testid="notebook-groups">
          {groups.map((group) => (
            <section key={group.stage} data-testid={`notebook-stage-${group.stage}`}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold text-white/80">{group.label}</h2>
                <span className="text-xs text-white/40">{group.items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <NotebookRow
                    key={item.phraseId}
                    item={item}
                    onRemove={() => deck.update((prev) => removeFromDeck(prev, item.phraseId))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function NotebookRow({ item, onRemove }: { item: NotebookItem; onRemove: () => void }) {
  const phrase = getPhrase(item.phraseId);
  const category = phrase.category ? getCategoryLabel(phrase.category) : null;
  return (
    <div
      data-testid={`notebook-phrase-${item.phraseId}`}
      className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-semibold text-amber-300">{phrase.text}</p>
        {item.reviewLabel && (
          <span
            data-testid={`notebook-review-${item.phraseId}`}
            className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
              item.reviewState === "due"
                ? "bg-emerald-400/15 text-emerald-300"
                : "bg-white/10 text-white/55"
            }`}
          >
            {item.reviewLabel}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-white/70">{phrase.meaningEs}</p>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        {category ? (
          <span className="inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/55">
            {category}
          </span>
        ) : (
          <span />
        )}
        {/* Undo an "Add": drops it from the review queue but keeps its history,
            so re-adding later resumes where it left off. */}
        {item.inDeck && (
          <button
            type="button"
            data-testid={`notebook-remove-${item.phraseId}`}
            onClick={onRemove}
            aria-label={`Remove ${phrase.text} from practice`}
            title="Remove from practice (keeps your progress; you can add it again)"
            className="shrink-0 text-xs text-white/40 underline-offset-4 active:underline"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
