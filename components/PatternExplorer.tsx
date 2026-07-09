"use client";

import { useEffect, useMemo, useState } from "react";
import type { Phrase } from "@/lib/types";
import { phrases } from "@/lib/data/phrases";
import {
  diversifyTop,
  filterPhrasesForExplore,
  getExploreChipLabel,
  getWhyThisMatters,
  orderTrapsFirst,
  orderUnsavedFirst,
  rankForExplore,
  type ExploreFilter,
} from "@/lib/vocabStrategy";
import { useDeck } from "@/components/AppStateProvider";
import { saveToDeck } from "@/lib/deckOps";
import { addedOnCount } from "@/lib/notebook";
import { localIsoDate } from "@/lib/dates";

const ADD_PER_DAY = 2;

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
  const [filter, setFilter] = useState<ExploreFilter>("all");
  // Read the clock only after mount so the "added today" count is hydration-safe.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount clock read
    setNow(Date.now());
  }, []);

  // The visible set is computed once per filter (and once when saved state
  // first loads) — NOT on every save. So tapping "Add" leaves the card in
  // place showing "Added" (clear feedback), while each fresh visit or filter
  // switch re-floats not-yet-added phrases to the top: you get new suggestions
  // over time instead of staring at the same saved 8 forever. `deck.ready` in
  // the deps recomputes once persisted saves have loaded.
  const shown = useMemo(() => {
    const isSaved = (id: string) => deck.value[id]?.inDeck === true;
    let ranked = rankForExplore(filterPhrasesForExplore(STRATEGY_PHRASES, filter));
    if (filter === "spanish_speaker_traps") ranked = orderTrapsFirst(ranked);
    ranked = orderUnsavedFirst(ranked, isSaved);
    return filter === "all" ? diversifyTop(ranked, SHOWN, 2) : ranked.slice(0, SHOWN);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally NOT keyed on deck.value so saving doesn't reshuffle mid-view
  }, [filter, deck.ready]);

  const addedToday = now !== null && deck.ready ? addedOnCount(deck.value, localIsoDate(new Date(now))) : null;
  const stateLine =
    addedToday === null
      ? "Recommended: add 1–2 a day."
      : `${addedToday}/${ADD_PER_DAY} added today${addedToday >= ADD_PER_DAY ? " — nice, that's plenty" : ""}`;

  return (
    <section data-testid="pattern-explorer" className="mb-6">
      <div className="mb-2 px-1">
        <h2 className="text-lg font-bold text-white">Add patterns to learn</h2>
        <p className="mt-0.5 text-xs text-white/60">
          Pick 1–2 phrases. They&rsquo;ll appear in future practice.
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
              onClick={() => setFilter(f.id)}
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
        <p data-testid="pattern-empty" className="px-1 text-sm text-white/50">
          No phrases in this category yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((phrase) => (
            <PatternCard
              key={phrase.id}
              phrase={phrase}
              chipLabel={getExploreChipLabel(phrase, filter)}
              saved={deck.value[phrase.id]?.inDeck === true}
              onSave={() => deck.update((prev) => saveToDeck(prev, phrase.id, Date.now()))}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PatternCard({
  phrase,
  chipLabel,
  saved,
  onSave,
}: {
  phrase: Phrase;
  chipLabel: string;
  saved: boolean;
  onSave: () => void;
}) {
  const why = getWhyThisMatters(phrase);
  return (
    <div
      data-testid={`pattern-card-${phrase.id}`}
      className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3"
    >
      <div className="flex items-start justify-between gap-2">
        {chipLabel && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/60">
            {chipLabel}
          </span>
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
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors active:scale-95 ${
            saved
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
              : "border-white/20 bg-white/[0.06] text-white/80"
          }`}
        >
          {saved ? "✓ Added" : "Add"}
        </button>
      </div>
      <p className="mt-1.5 text-lg font-bold text-amber-300">{phrase.text}</p>
      <p className="text-sm text-white/70">{phrase.meaningEs}</p>
      {why && <p className="mt-1 text-xs text-white/55">{why}</p>}
    </div>
  );
}
