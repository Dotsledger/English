"use client";

import { useState } from "react";
import type { Phrase } from "@/lib/types";
import { phrases } from "@/lib/data/phrases";
import {
  filterPhrasesForExplore,
  getCategoryLabel,
  getWhyThisMatters,
  rankForExplore,
  type ExploreFilter,
} from "@/lib/vocabStrategy";
import { useDeck } from "@/components/AppStateProvider";
import { saveToDeck } from "@/lib/deckOps";

/** Only phrases carrying strategy metadata are eligible for pattern discovery. */
const STRATEGY_PHRASES: Phrase[] = phrases.filter((p) => p.category !== undefined);

const FILTERS: { id: ExploreFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "daily_life", label: "Daily Life" },
  { id: "work", label: "Work" },
  { id: "phrasal_verbs", label: "Phrasal Verbs" },
  { id: "collocations", label: "Collocations" },
  { id: "sentence_frames", label: "Sentence Frames" },
  { id: "spanish_speaker_traps", label: "Traps" },
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

  const shown = rankForExplore(filterPhrasesForExplore(STRATEGY_PHRASES, filter)).slice(0, SHOWN);

  return (
    <section data-testid="pattern-explorer" className="mb-6">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-lg font-bold text-white">Useful patterns</h2>
        <span className="text-[11px] text-white/40">highest-value first</span>
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
  saved,
  onSave,
}: {
  phrase: Phrase;
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
        {phrase.category && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/60">
            {getCategoryLabel(phrase.category)}
          </span>
        )}
        <button
          type="button"
          data-testid={`pattern-save-${phrase.id}`}
          onClick={onSave}
          aria-pressed={saved}
          aria-label={saved ? "Saved to your deck" : "Save to your deck"}
          className={`shrink-0 text-lg leading-none transition-transform active:scale-90 ${
            saved ? "text-rose-400" : "text-white/35"
          }`}
        >
          {saved ? "♥" : "＋"}
        </button>
      </div>
      <p className="mt-1.5 text-lg font-bold text-amber-300">{phrase.text}</p>
      <p className="text-sm text-white/60">{phrase.meaningEs}</p>
      {why && <p className="mt-1 text-xs text-white/40">{why}</p>}
    </div>
  );
}
