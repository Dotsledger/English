"use client";

import { useEffect, useState } from "react";
import type { ContentScene } from "@/lib/types";
import { getPhrase } from "@/lib/data/phrases";
import { isTtsAvailable, speak } from "@/lib/tts";
import { PhraseBadge, type BadgeStage } from "@/components/PhraseBadge";
import { HeroImageScene } from "@/components/scenes/HeroImageScene";
import { EditorialPosterScene } from "@/components/scenes/EditorialPosterScene";
import { ChatScene } from "@/components/scenes/ChatScene";
import { MythRealityScene } from "@/components/scenes/MythRealityScene";
import { PriceBreakdownScene } from "@/components/scenes/PriceBreakdownScene";
import { RedFlagScene } from "@/components/scenes/RedFlagScene";
import { MiniStoryScene } from "@/components/scenes/MiniStoryScene";
import { DecisionScene } from "@/components/scenes/DecisionScene";
import { ChecklistScene } from "@/components/scenes/ChecklistScene";
import { NewsAlertScene } from "@/components/scenes/NewsAlertScene";

function sceneBody(scene: ContentScene) {
  switch (scene.sceneType) {
    case "hero_image":
      return <HeroImageScene scene={scene} />;
    case "editorial_poster":
      return <EditorialPosterScene scene={scene} />;
    case "chat":
      return <ChatScene scene={scene} />;
    case "myth_vs_reality":
      return <MythRealityScene scene={scene} />;
    case "price_breakdown":
      return <PriceBreakdownScene scene={scene} />;
    case "red_flag":
      return <RedFlagScene scene={scene} />;
    case "mini_story":
      return <MiniStoryScene scene={scene} />;
    case "decision":
      return <DecisionScene scene={scene} />;
    case "checklist":
      return <ChecklistScene scene={scene} />;
    case "news_alert":
      return <NewsAlertScene scene={scene} />;
  }
}

/** Full-bleed background treatment per scene. */
export function sceneBackgroundClass(scene: ContentScene): string {
  if (scene.sceneType === "hero_image") {
    return `scene-bg-${scene.backgroundImage ?? "editorial"}`;
  }
  if (scene.sceneType === "editorial_poster") return "scene-bg-editorial";
  return "";
}

export function SceneRenderer({
  scene,
  stage,
  saved,
  audioFirst = false,
  onPeek,
  onSave,
  onSuppress,
}: {
  scene: ContentScene;
  stage: BadgeStage;
  saved: boolean;
  /** Play the sentence via TTS with the text hidden until tapped. */
  audioFirst?: boolean;
  onPeek?: (ms: number) => void;
  onSave?: () => void;
  onSuppress?: () => void;
}) {
  const phrase = getPhrase(scene.phraseId);
  const isHero = scene.sceneType === "hero_image";

  // Audio-first only engages when TTS actually exists; otherwise it degrades
  // to a normal card (text visible from the start).
  const [ttsReady, setTtsReady] = useState(false);
  const gated = audioFirst && ttsReady;
  const [textRevealed, setTextRevealed] = useState(false);
  useEffect(() => {
    const available = isTtsAvailable();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time startup feature detection, hydration-safe
    setTtsReady(available);
    if (audioFirst && available) speak(phrase.example);
  }, [audioFirst, phrase.example]);

  const showBody = !gated || textRevealed;

  return (
    <div
      data-testid={`scene-${scene.id}`}
      data-scene-type={scene.sceneType}
      data-audio-first={audioFirst ? "true" : undefined}
      className="relative flex h-full flex-col"
    >
      {isHero && (
        <div
          aria-hidden
          className={`absolute inset-0 scene-overlay-${scene.overlayStyle ?? "dark"}`}
        />
      )}

      <div className="relative flex h-full flex-col px-6 pb-6 pt-2">
        <div className="mb-4">
          <span className="inline-flex rounded-full border border-white/12 bg-black/25 px-3 py-1 text-[11px] font-medium tracking-wide text-white/60 backdrop-blur-sm">
            {scene.topic} · {scene.angle}
          </span>
        </div>

        {showBody ? (
          sceneBody(scene)
        ) : (
          <button
            type="button"
            data-testid="audio-first-reveal"
            onClick={() => setTextRevealed(true)}
            className="flex flex-1 flex-col items-center justify-center gap-4 text-center active:scale-[0.99]"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/15 text-3xl">
              🔊
            </span>
            <span className="text-lg font-semibold text-white">Escucha la frase</span>
            <span className="text-sm text-white/50">Toca para ver el texto</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                speak(phrase.example);
              }}
              className="mt-1 rounded-full border border-white/12 bg-white/[0.06] px-4 py-1.5 text-xs text-white/70"
            >
              Repetir audio
            </button>
          </button>
        )}

        {showBody && (
          <div className="mt-6">
            <PhraseBadge
              phrase={phrase}
              stage={stage}
              saved={saved}
              onPeek={onPeek}
              onSave={onSave}
              onSuppress={onSuppress}
            />
          </div>
        )}
      </div>
    </div>
  );
}
