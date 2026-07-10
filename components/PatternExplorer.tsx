"use client";

import { useEffect, useMemo, useState } from "react";
import type { Phrase } from "@/lib/types";
import { phrases } from "@/lib/data/phrases";
import {
  batchOf,
  diversifyTop,
  filterPhrasesForExplore,
  getExploreChipLabel,
  getWhyThisMatters,
  orderTrapsFirst,
  rankForExplore,
  type ExploreFilter,
} from "@/lib/vocabStrategy";
import { useDeck, useDismissedPatterns } from "@/components/AppStateProvider";
import { saveToDeck } from "@/lib/deckOps";
import { addedOnCount } from "@/lib/notebook";
import { localIsoDate } from "@/lib/dates";
import type { VocabularyCategory } from "@/lib/types";

const ADD_PER_DAY = 2;

/** Subtle per-category accent (a small dot + tinted chip). Kept restrained —
 * never a full card background. Falls back to lavender. */
const CATEGORY_ACCENT: Partial<Record<VocabularyCategory, string>> = {
  phrasal_verb: "var(--accent-blue)",
  collocation: "var(--accent-amber)",
  sentence_frame: "var(--accent-mint)",
  spanish_speaker_trap: "var(--accent-coral)",
  false_friend: "var(--accent-coral)",
  work_communication: "var(--accent-blue)",
  daily_life: "var(--accent-lavender)",
  core_chunk: "var(--accent-lavender)",
};
const accentFor = (c: VocabularyCategory | undefined): string =>
  (c && CATEGORY_ACCENT[c]) || "var(--accent-lavender)";

/** Only phrases carrying strategy metadata are eligible for pattern discovery. */
const STRATEGY_PHRASES: Phrase[] = phrases.filter((p) => p.category !== undefined);

// Short visible labels (fit the scroll row); `long` is the accessible name.
const FILTERS: { id: ExploreFilter; label: string; long: string }[] = [
  { id: "all", label: "All", long: "All patterns" },
  { id: "daily_life", label: "Daily", long: "Daily life" },
  { id: "work", label: "Work", long: "Work" },
  { id: "phrasal_verbs", label: "Phrasals", long: "Phrasal verbs" },
  { id: "collocations", label: "Collocations", long: "Collocations" },
  { id: "sentence_frames", label: "Frames", long: "Sentence frames" },
  { id: "spanish_speaker_traps", label: "Traps", long: "Spanish-speaker traps" },
];

const SHOWN = 8;

/**
 * Explore = discovery. A ranked, filterable strip of high-value reusable
 * English patterns (chunks, frames, phrasal verbs, traps…). Tapping a card
 * saves it to the deck so Review picks it up later — this never touches the
 * due-selection logic, so the Explore filter can't hide a due review.
 */
export function PatternExplorer() {
  const deck = useDeck();
  const dismissed = useDismissedPatterns();
  const [filter, setFilter] = useState<ExploreFilter>("all");
  const [batchIndex, setBatchIndex] = useState(0);
  // Read the clock only after mount so the "added today" count is hydration-safe.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount clock read
    setNow(Date.now());
  }, []);

  // The candidate pool: ranked useful patterns for this filter, minus the ones
  // the user already added (they're in practice — no action left) and minus the
  // ones they skipped ("not for now"). Recomputed only when the filter or those
  // sets change — NOT on every keystroke of deck.value — so tapping "Add" keeps
  // the just-added card in place showing "✓ Added" until the next batch. `Skip`
  // updates `dismissed`, which IS a dep, so a skipped card drops immediately.
  const pool = useMemo(() => {
    const skipped = dismissed.value;
    const isAdded = (id: string) => deck.value[id]?.inDeck === true;
    let ranked = rankForExplore(filterPhrasesForExplore(STRATEGY_PHRASES, filter));
    if (filter === "spanish_speaker_traps") ranked = orderTrapsFirst(ranked);
    ranked = ranked.filter((p) => !skipped[p.id] && !isAdded(p.id));
    // "All" spreads categories so one bucket can't dominate; the full list is
    // reordered (not capped) so "Show more" can page through everything.
    return filter === "all" ? diversifyTop(ranked, ranked.length, 2) : ranked;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deck.value read intentionally omitted so an Add doesn't reshuffle the current batch
  }, [filter, dismissed.value, dismissed.ready, deck.ready]);

  const shown = useMemo(() => batchOf(pool, batchIndex, SHOWN), [pool, batchIndex]);
  const hasMore = pool.length > SHOWN;
  const skippedCount = Object.keys(dismissed.value).length;

  const addedToday = now !== null && deck.ready ? addedOnCount(deck.value, localIsoDate(new Date(now))) : null;
  const stateLine =
    addedToday === null
      ? "Recommended: add 1–2 a day."
      : `${addedToday}/${ADD_PER_DAY} added today${addedToday >= ADD_PER_DAY ? " — nice, that's plenty" : ""}`;

  const selectFilter = (id: ExploreFilter) => {
    setFilter(id);
    setBatchIndex(0);
  };
  const skipPhrase = (id: string) =>
    dismissed.update((prev) => ({ ...prev, [id]: true as const }));
  const resetSkipped = () => {
    dismissed.update(() => ({}));
    setBatchIndex(0);
  };

  return (
    <section data-testid="pattern-explorer" className="mb-6">
      <div className="mb-2 px-1">
        <h2 className="text-lg font-bold text-white">Add patterns to learn</h2>
        <p className="mt-0.5 text-xs text-white/60">
          Pick 1–2 phrases to add. Skip the ones you don&rsquo;t want.
        </p>
        <p data-testid="add-state-line" className="mt-0.5 text-xs text-white/45">
          {stateLine}
        </p>
      </div>

      <div
        className="mb-3 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1"
        role="group"
        aria-label="Filter patterns"
      >
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => selectFilter(f.id)}
              aria-pressed={active}
              aria-label={f.long}
              title={f.long}
              data-testid={`explore-filter-${f.id}`}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-sky-400/60 bg-sky-500/20 text-sky-200"
                  : "border-white/12 bg-white/[0.04] text-white/55"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div data-testid="pattern-empty" className="soft-card px-4 py-6 text-center">
          <p className="text-sm text-white/75">
            {skippedCount > 0
              ? "You've gone through the suggestions here."
              : "No phrases in this category yet."}
          </p>
          {skippedCount > 0 && (
            <button
              type="button"
              data-testid="reset-skipped"
              onClick={resetSkipped}
              className="mt-2 text-xs font-medium text-[color:var(--accent-blue)] underline-offset-4 active:underline"
            >
              Show skipped again ({skippedCount})
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {shown.map((phrase) => (
              <PatternCard
                key={phrase.id}
                phrase={phrase}
                chipLabel={getExploreChipLabel(phrase, filter)}
                saved={deck.value[phrase.id]?.inDeck === true}
                onSave={() => deck.update((prev) => saveToDeck(prev, phrase.id, Date.now()))}
                onSkip={() => skipPhrase(phrase.id)}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            {hasMore ? (
              <button
                type="button"
                data-testid="show-more-patterns"
                onClick={() => setBatchIndex((i) => i + 1)}
                className="btn-soft px-4 py-2 text-xs"
              >
                Show more ↓
              </button>
            ) : (
              <span />
            )}
            {skippedCount > 0 && (
              <button
                type="button"
                data-testid="reset-skipped"
                onClick={resetSkipped}
                className="text-xs text-white/45 underline-offset-4 active:underline"
              >
                Reset skipped ({skippedCount})
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function PatternCard({
  phrase,
  chipLabel,
  saved,
  onSave,
  onSkip,
}: {
  phrase: Phrase;
  chipLabel: string;
  saved: boolean;
  onSave: () => void;
  onSkip: () => void;
}) {
  const why = getWhyThisMatters(phrase);
  const accent = accentFor(phrase.category);
  return (
    <div
      data-testid={`pattern-card-${phrase.id}`}
      className="soft-card relative overflow-hidden px-4 py-3.5"
    >
      {/* Thin category accent bar on the left edge — subtle identity, not a fill. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-2">
        {chipLabel && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: "var(--surface-2)", color: "rgba(255,255,255,0.72)" }}
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            {chipLabel}
          </span>
        )}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Skip = "not for now": hides the suggestion only. It never adds the
              phrase, never schedules it, never counts as a learning attempt. */}
          {!saved && (
            <button
              type="button"
              data-testid={`pattern-skip-${phrase.id}`}
              onClick={onSkip}
              aria-label="Skip this phrase for now"
              title="Not for now — hide this suggestion (doesn't add or schedule it)"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-white/50 active:scale-95"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            data-testid={`pattern-save-${phrase.id}`}
            onClick={onSave}
            aria-pressed={saved}
            aria-label={saved ? "Added to practice" : "Add to practice"}
            title={
              saved
                ? "Added — this phrase will show up in your practice"
                : "Add — this phrase will show up in future practice"
            }
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors active:scale-95 ${
              saved
                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                : "border-transparent bg-[#faf7ff] text-[#1c1526]"
            }`}
          >
            {saved ? "✓ Added" : "Add"}
          </button>
        </div>
      </div>
      <p className="mt-2 text-lg font-bold text-amber-300">{phrase.text}</p>
      <p className="text-sm text-white/75">{phrase.meaningEs}</p>
      {why && <p className="mt-1 text-xs text-white/55">{why}</p>}
    </div>
  );
}
