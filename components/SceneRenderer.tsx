"use client";

import { useEffect, useState } from "react";
import type { ContentScene, Phrase } from "@/lib/types";
import { getPhrase } from "@/lib/data/phrases";
import { isTtsAvailable, speak } from "@/lib/tts";
import { PhraseBadge } from "@/components/PhraseBadge";
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

function sceneBody(scene: ContentScene, phrase: Phrase) {
  switch (scene.sceneType) {
    case "hero_image":
      return <HeroImageScene scene={scene} phrase={phrase} />;
    case "editorial_poster":
      return <EditorialPosterScene scene={scene} phrase={phrase} />;
    case "chat":
      return <ChatScene scene={scene} phrase={phrase} />;
    case "myth_vs_reality":
      return <MythRealityScene scene={scene} phrase={phrase} />;
    case "price_breakdown":
      return <PriceBreakdownScene scene={scene} phrase={phrase} />;
    case "red_flag":
      return <RedFlagScene scene={scene} phrase={phrase} />;
    case "mini_story":
      return <MiniStoryScene scene={scene} phrase={phrase} />;
    case "decision":
      return <DecisionScene scene={scene} phrase={phrase} />;
    case "checklist":
      return <ChecklistScene scene={scene} phrase={phrase} />;
    case "news_alert":
      return <NewsAlertScene scene={scene} phrase={phrase} />;
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
  saved,
  audioFirst = false,
  onPeek,
  onSave,
  onSuppress,
  onUndoSuppress,
}: {
  scene: ContentScene;
  saved: boolean;
  /** Play the sentence via TTS with the text hidden until tapped. */
  audioFirst?: boolean;
  onPeek?: (ms: number) => void;
  onSave?: () => void;
  onSuppress?: () => void;
  onUndoSuppress?: () => void;
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
        {/* Context chip + body centre as one unit — no dead gap above the
            headline. Hero scenes stay bottom-weighted. */}
        <div
          className={`flex min-h-0 flex-1 flex-col gap-4 ${
            isHero ? "justify-end" : "justify-center"
          }`}
        >
          <div>
            <span className="inline-flex rounded-full border border-white/12 bg-black/25 px-3 py-1 text-[11px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
              {scene.topic} · {scene.angle}
            </span>
          </div>

          {showBody ? (
            sceneBody(scene, phrase)
          ) : (
            // Reveal and Replay are independent actions, so they must be
            // sibling buttons — a <button> can't legally nest inside another.
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
              <button
                type="button"
                data-testid="audio-first-reveal"
                onClick={() => setTextRevealed(true)}
                className="flex w-full flex-col items-center gap-4 active:scale-[0.99]"
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/15 text-3xl">
                  🔊
                </span>
                <span className="text-lg font-semibold text-white">Listen to the phrase</span>
                <span className="text-sm text-white/60">Tap to see the text</span>
              </button>
              <button
                type="button"
                data-testid="audio-first-replay"
                onClick={() => speak(phrase.example)}
                className="mt-1 rounded-full border border-white/12 bg-white/[0.06] px-4 py-1.5 text-xs text-white/70"
              >
                Replay audio
              </button>
            </div>
          )}
        </div>

        {showBody && (
          <div className="mt-5 shrink-0">
            <PhraseBadge
              phrase={phrase}
              saved={saved}
              onPeek={onPeek}
              onSave={onSave}
              onSuppress={onSuppress}
              onUndoSuppress={onUndoSuppress}
            />
          </div>
        )}
      </div>
    </div>
  );
}
