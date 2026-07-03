"use client";

import { useState } from "react";
import type { Level, TopicTile as TopicTileType } from "@/lib/types";
import { CATEGORIES, DEFAULT_TOPIC_IDS, LEVELS, topicById, topics } from "@/lib/data/topics";
import { pickRandomTopics } from "@/lib/pickTopics";
import { TopicTile } from "@/components/TopicTile";

const SHOWN_COUNT = 4;
const DEFAULT_TOPICS = DEFAULT_TOPIC_IDS.slice(0, SHOWN_COUNT).map((id) => topicById.get(id)!);

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function computePool(levels: Level[], categories: string[]): TopicTileType[] {
  return topics.filter(
    (t) =>
      (levels.length === 0 || levels.includes(t.difficulty)) &&
      (categories.length === 0 || categories.includes(t.category))
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function TopicGrid() {
  // Deterministic on first render (server + client) so hydration never
  // mismatches — filtering/shuffling only happens after a user interaction.
  const [selectedLevels, setSelectedLevels] = useState<Level[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [shown, setShown] = useState<TopicTileType[]>(DEFAULT_TOPICS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const applyFilters = (levels: Level[], categories: string[]) => {
    const pool = computePool(levels, categories);
    setShown(pickRandomTopics(pool, SHOWN_COUNT));
    setRefreshKey((k) => k + 1);
  };

  const handleToggleLevel = (level: Level) => {
    const next = toggle(selectedLevels, level);
    setSelectedLevels(next);
    applyFilters(next, selectedCategories);
  };

  const handleToggleCategory = (category: string) => {
    const next = toggle(selectedCategories, category);
    setSelectedCategories(next);
    applyFilters(selectedLevels, next);
  };

  const handleRefresh = () => {
    setSpinning(true);
    applyFilters(selectedLevels, selectedCategories);
    window.setTimeout(() => setSpinning(false), 500);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="mb-4 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
          Sticky English
        </p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-3xl font-bold leading-tight text-white">Pick a rabbit hole</h1>
          <button
            type="button"
            onClick={handleRefresh}
            data-testid="refresh-topics"
            aria-label="Show new topics"
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-lg text-white/70 active:scale-90"
          >
            <span className={spinning ? "inline-block animate-spin" : "inline-block"}>↻</span>
          </button>
        </div>
        <p className="mt-1 text-sm text-white/50">
          Scroll something interesting. The English sticks on its own.
        </p>
      </header>

      <div className="mb-3 flex gap-1.5 px-1" role="group" aria-label="Filter by level">
        {LEVELS.map((level) => {
          const active = selectedLevels.includes(level);
          return (
            <button
              key={level}
              type="button"
              onClick={() => handleToggleLevel(level)}
              aria-pressed={active}
              data-testid={`filter-level-${level}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-white bg-white text-black"
                  : "border-white/15 bg-white/[0.05] text-white/60"
              }`}
            >
              {level}
            </button>
          );
        })}
      </div>

      <div
        className="mb-5 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1"
        role="group"
        aria-label="Filter by category"
      >
        {CATEGORIES.map((category) => {
          const active = selectedCategories.includes(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => handleToggleCategory(category)}
              aria-pressed={active}
              data-testid={`filter-category-${slugify(category)}`}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-sky-400/60 bg-sky-500/20 text-sky-200"
                  : "border-white/12 bg-white/[0.04] text-white/55"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="px-1 text-sm text-white/50">
          No topics match these filters yet — try clearing one.
        </p>
      ) : (
        <div
          key={refreshKey}
          data-testid="topic-grid"
          className="scene-enter grid grid-cols-2 gap-3"
        >
          {shown.map((topic) => (
            <TopicTile key={topic.id} topic={topic} />
          ))}
        </div>
      )}
    </main>
  );
}
