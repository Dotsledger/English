"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { VocabularyCategory } from "@/lib/types";
import { useCaptures, useDeck } from "@/components/AppStateProvider";
import { phraseById } from "@/lib/data/phrases";
import { getCategoryLabel } from "@/lib/vocabStrategy";
import { removeFromDeck } from "@/lib/deckOps";
import { notebookGroups, type NotebookItem } from "@/lib/notebook";

/** What a notebook row needs to render — resolved from the catalog OR from the
 * user's own captured phrases. */
type Display = { text: string; meaningEs: string; category?: VocabularyCategory };

/**
 * "My phrases" — a read-only vocabulary notebook. It shows what the user has
 * met and saved, grouped by learning stage, with when each phrase is next
 * coming back. It is a visibility layer only: no "review now", no manual
 * cramming — Today's Practice remains the single review engine.
 */
export function Notebook() {
  const deck = useDeck();
  const captures = useCaptures();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount clock read
    setNow(Date.now());
  }, []);

  // Resolve a deck id to displayable text. Catalog phrases come from the
  // registry; the user's "+" captures are their own phrases (not in the
  // catalog). Anything we can't resolve (e.g. a stale id) is skipped rather
  // than crashing the page — getPhrase used to throw on unknown ids.
  const resolve = (id: string): Display | null => {
    const p = phraseById.get(id);
    if (p) return { text: p.text, meaningEs: p.meaningEs, category: p.category };
    const c = captures.value[id];
    if (c) return { text: c.text, meaningEs: c.meaningEs };
    return null;
  };

  const ready = deck.ready && captures.ready && now !== null;
  const groups = ready
    ? notebookGroups(deck.value, now).map((g) => ({
        ...g,
        rows: g.items
          .map((item) => ({ item, display: resolve(item.phraseId) }))
          .filter((r): r is { item: NotebookItem; display: Display } => r.display !== null),
      }))
    : [];
  const visibleGroups = groups.filter((g) => g.rows.length > 0);
  const total = visibleGroups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
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

      <p className="px-1 text-xs text-white/60">
        Today&rsquo;s Practice decides when to review these. This list is just your notebook.
      </p>

      {!ready ? (
        <p className="px-1 text-sm text-white/50">Loading…</p>
      ) : total === 0 ? (
        <div data-testid="notebook-empty" className="soft-card px-4 py-8 text-center">
          <p className="text-sm text-white/70">No phrases yet.</p>
          <p className="mt-1 text-xs text-white/55">
            Add a few from &ldquo;Add patterns to learn&rdquo;, then practise them here in Today&rsquo;s
            Practice.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5" data-testid="notebook-groups">
          {visibleGroups.map((group) => (
            <section key={group.stage} data-testid={`notebook-stage-${group.stage}`}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold text-white/80">{group.label}</h2>
                <span className="text-xs text-white/40">{group.rows.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {group.rows.map(({ item, display }) => (
                  <NotebookRow
                    key={item.phraseId}
                    item={item}
                    display={display}
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

function NotebookRow({
  item,
  display,
  onRemove,
}: {
  item: NotebookItem;
  display: Display;
  onRemove: () => void;
}) {
  const category = display.category ? getCategoryLabel(display.category) : null;
  return (
    <div
      data-testid={`notebook-phrase-${item.phraseId}`}
      className="soft-card px-4 py-3.5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-semibold text-amber-300">{display.text}</p>
        {item.reviewLabel && (
          <span
            data-testid={`notebook-review-${item.phraseId}`}
            className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={
              item.reviewState === "due"
                ? { background: "rgba(127,227,196,0.16)", color: "var(--accent-mint)" }
                : { background: "var(--surface-2)", color: "rgba(255,255,255,0.6)" }
            }
          >
            {item.reviewLabel}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-white/70">{display.meaningEs}</p>
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
            aria-label={`Remove ${display.text} from practice`}
            title="Remove from practice (keeps your progress; you can add it again)"
            className="shrink-0 text-xs text-white/55 underline-offset-4 active:underline"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
