"use client";

import Link from "next/link";
import { getDueEntries } from "@/lib/phraseMemory";
import { usePhraseMemory } from "@/lib/usePhraseMemory";
import { getPhrase } from "@/lib/data/phrases";
import { topicIdByPhraseId } from "@/lib/data/scenes";

const MAX_SHOWN = 5;

export function DueReview() {
  const { store } = usePhraseMemory();

  const due = getDueEntries(store)
    .map((entry) => ({ entry, topicId: topicIdByPhraseId.get(entry.phraseId) }))
    .filter((d): d is { entry: typeof d.entry; topicId: string } => Boolean(d.topicId));

  if (due.length === 0) return null;

  return (
    <div className="mb-5 -mx-4 px-4">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/70">
        {due.length === 1 ? "1 phrase due for review" : `${due.length} phrases due for review`}
      </p>
      <div
        className="flex gap-1.5 overflow-x-auto pb-1"
        role="group"
        aria-label="Phrases due for review"
      >
        {due.slice(0, MAX_SHOWN).map(({ entry, topicId }) => {
          const phrase = getPhrase(entry.phraseId);
          return (
            <Link
              key={entry.phraseId}
              href={`/feed/${topicId}`}
              data-testid={`due-review-${entry.phraseId}`}
              className="shrink-0 whitespace-nowrap rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200"
            >
              {phrase.text}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
