"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Level, TopicTile as TopicTileType } from "@/lib/types";
import { CATEGORIES, DEFAULT_TOPIC_IDS, LEVELS, topicById, topics } from "@/lib/data/topics";
import { pickTopicsPreferringUnseen } from "@/lib/pickTopics";
import { useCompletedTopics } from "@/components/AppStateProvider";
import { useReconcileTriage } from "@/components/useReconcileTriage";
import { TopicTile } from "@/components/TopicTile";
import { DueCta } from "@/components/DueCta";
import { ProgressPipeline } from "@/components/ProgressPipeline";
import { MissionCard } from "@/components/MissionCard";
import { RecapCard } from "@/components/RecapCard";
import { CaptureSheet } from "@/components/CaptureSheet";

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
  const [capturing, setCapturing] = useState(false);
  const completedTopics = useCompletedTopics();
  const progress = completedTopics.value;
  const adjustedForProgress = useRef(false);
  useReconcileTriage();

  const applyFilters = (levels: Level[], categories: string[]) => {
    const pool = computePool(levels, categories);
    const completedIds = new Set(Object.keys(progress));
    setShown(pickTopicsPreferringUnseen(pool, SHOWN_COUNT, completedIds));
    setRefreshKey((k) => k + 1);
  };

  // Once completed-topic data loads from storage, swap out any default
  // tile the user has already finished — but only that one time, so it
  // doesn't fight the user's own filter/refresh choices afterward.
  useEffect(() => {
    if (adjustedForProgress.current || !completedTopics.ready) return;
    const completedIds = new Set(Object.keys(progress));
    if (completedIds.size === 0) return;
    adjustedForProgress.current = true;
    if (DEFAULT_TOPICS.some((t) => completedIds.has(t.id))) {
      const pool = computePool(selectedLevels, selectedCategories);
      // Same one-time-hydration pattern as the storage hooks — not a
      // derived-state anti-pattern.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(pickTopicsPreferringUnseen(pool, SHOWN_COUNT, completedIds));
      setRefreshKey((k) => k + 1);
    }
  }, [completedTopics.ready, progress, selectedLevels, selectedCategories]);

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
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
            Sticky English
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setCapturing(true)}
              data-testid="open-capture"
              aria-label="Capturar una frase que has oído"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-base text-white/70 active:scale-90"
            >
              +
            </button>
            <Link
              href="/settings"
              aria-label="Ajustes"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-sm text-white/70 active:scale-90"
            >
              ⚙
            </Link>
          </div>
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-3xl font-bold leading-tight text-white">Pick a rabbit hole</h1>
          <button
            type="button"
            onClick={handleRefresh}
            data-testid="refresh-topics"
            aria-label="Ver otros temas"
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-lg text-white/70 active:scale-90"
          >
            <span className={spinning ? "inline-block animate-spin" : "inline-block"}>↻</span>
          </button>
        </div>
        <p className="mt-1 text-sm text-white/50">
          Scroll something interesting. The English sticks on its own.
        </p>
      </header>

      <DueCta />

      <Link
        href="/snack"
        data-testid="daily-snack"
        className="mb-4 flex items-center justify-between rounded-2xl bg-white px-5 py-4 active:scale-[0.99]"
      >
        <div className="flex flex-col">
          <span className="text-base font-bold text-black">Daily Snack</span>
          <span className="text-xs text-black/55">Repaso + algo nuevo · 3-5 min</span>
        </div>
        <span aria-hidden className="text-xl text-black/70">
          →
        </span>
      </Link>

      <ProgressPipeline />
      <RecapCard />
      <MissionCard />

      <div className="mb-3 flex gap-1.5 px-1" role="group" aria-label="Filtrar por nivel">
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
        aria-label="Filtrar por categoría"
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
          Ningún tema con esos filtros — prueba a quitar alguno.
        </p>
      ) : (
        <div
          key={refreshKey}
          data-testid="topic-grid"
          className="scene-enter grid grid-cols-2 gap-3"
        >
          {shown.map((topic) => (
            <TopicTile key={topic.id} topic={topic} completed={progress[topic.id] === true} />
          ))}
        </div>
      )}

      {capturing && <CaptureSheet onClose={() => setCapturing(false)} />}
    </main>
  );
}
