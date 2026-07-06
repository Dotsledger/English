"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeedScene, TopicTile } from "@/lib/types";
import { getPhrase } from "@/lib/data/phrases";
import { usePhraseMemory } from "@/lib/usePhraseMemory";
import { useTopicProgress } from "@/lib/useTopicProgress";
import { FeedProgress } from "@/components/FeedProgress";
import { SceneRenderer, sceneBackgroundClass } from "@/components/SceneRenderer";
import { CheckpointCard } from "@/components/CheckpointCard";

const SWIPE_THRESHOLD = 48;

export function Feed({ topic, scenes }: { topic: TopicTile; scenes: FeedScene[] }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const { markSeen, markAttempt, getStatus } = usePhraseMemory();
  const { markTopicCompleted } = useTopicProgress();

  const scene = scenes[index];
  const isCheckpoint = scene?.type === "checkpoint";
  const checkpointAnswered = isCheckpoint && answers[scene.id] !== undefined;
  const canGoNext = !isCheckpoint || checkpointAnswered;

  useEffect(() => {
    if (scene && scene.type === "content") {
      markSeen(scene.phraseId, scene.id);
    }
  }, [scene, markSeen]);

  useEffect(() => {
    if (finished) markTopicCompleted(topic.id);
  }, [finished, markTopicCompleted, topic.id]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    if (index < scenes.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setFinished(true);
    }
  }, [canGoNext, index, scenes.length]);

  const goPrev = useCallback(() => {
    if (finished) {
      setFinished(false);
      return;
    }
    setIndex((i) => Math.max(0, i - 1));
  }, [finished]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
    if (Math.abs(dy) >= Math.abs(dx)) {
      if (dy < 0) goNext();
      else goPrev();
    } else {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const selectAnswer = (checkpointId: string, phraseId: string, i: number, correct: boolean) => {
    setAnswers((prev) => ({ ...prev, [checkpointId]: i }));
    markAttempt(phraseId, correct);
  };

  const seenPhrases = useMemo(() => {
    const ids = new Set<string>();
    for (const s of scenes) ids.add(s.phraseId);
    return [...ids].map((id) => getPhrase(id));
  }, [scenes]);

  const backgroundClass =
    !finished && scene?.type === "content" ? sceneBackgroundClass(scene) : "";

  return (
    <div
      data-testid="feed"
      className={`relative flex h-dvh flex-col overflow-hidden ${backgroundClass || "bg-[#0b0b12]"}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative z-10 flex items-center gap-2">
        <Link
          href="/"
          aria-label="Back to topics"
          className="ml-2 mt-[max(0.6rem,env(safe-area-inset-top))] flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/60"
        >
          ←
        </Link>
        <div className="flex-1 pr-2">
          <FeedProgress current={Math.min(index, scenes.length - 1)} total={scenes.length} />
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-hidden">
        {finished ? (
          <div className="scene-enter flex h-full flex-col justify-center gap-6 px-6 pb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
              {topic.title}
            </p>
            <h2 className="text-3xl font-bold leading-tight text-white">
              That&apos;s the rabbit hole.
            </h2>
            <div className="flex flex-col gap-2">
              {seenPhrases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-baseline justify-between rounded-2xl bg-white/[0.06] px-4 py-3"
                >
                  <span className="font-semibold text-white">{p.text}</span>
                  <span className="text-sm text-white/50">{p.meaningEs}</span>
                </div>
              ))}
            </div>
            <Link
              href="/"
              className="mt-2 rounded-2xl bg-white px-6 py-4 text-center text-base font-semibold text-black active:scale-[0.98]"
            >
              Pick another rabbit hole
            </Link>
          </div>
        ) : scene.type === "content" ? (
          <div key={scene.id} className="scene-enter h-full">
            <SceneRenderer scene={scene} phraseStatus={getStatus(scene.phraseId)} />
          </div>
        ) : (
          <div key={scene.id} className="scene-enter h-full">
            <CheckpointCard
              scene={scene}
              selectedIndex={answers[scene.id] ?? null}
              onSelect={(i) =>
                selectAnswer(scene.id, scene.phraseId, i, i === scene.correctIndex)
              }
            />
          </div>
        )}
      </div>

      {!finished && (
        <div className="relative z-10 flex items-center justify-between px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <span className="swipe-hint text-xs text-white/45">
            {canGoNext ? "Swipe up ↑" : "Answer to continue"}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Previous"
              onClick={goPrev}
              disabled={index === 0}
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-white/35 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={goNext}
              disabled={!canGoNext}
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-white/35 disabled:opacity-30"
            >
              ↓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
