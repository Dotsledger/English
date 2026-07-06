import type { ContentScene } from "@/lib/types";
import { getPhrase } from "@/lib/data/phrases";
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
  onPeek,
  onSave,
  onSuppress,
}: {
  scene: ContentScene;
  stage: BadgeStage;
  saved: boolean;
  onPeek?: (ms: number) => void;
  onSave?: () => void;
  onSuppress?: () => void;
}) {
  const phrase = getPhrase(scene.phraseId);
  const isHero = scene.sceneType === "hero_image";

  return (
    <div
      data-testid={`scene-${scene.id}`}
      data-scene-type={scene.sceneType}
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

        {sceneBody(scene)}

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
      </div>
    </div>
  );
}
