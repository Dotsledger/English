import type { MiniStoryScene as MiniStorySceneType, Phrase } from "@/lib/types";
import { HighlightPhrase } from "@/components/HighlightPhrase";

export function MiniStoryScene({ scene, phrase }: { scene: MiniStorySceneType; phrase: Phrase }) {
  const last = scene.beats.length - 1;

  return (
    <div className="flex flex-col gap-7">
      {scene.beats.map((beat, i) => (
        <p
          key={i}
          className={`whitespace-pre-line leading-snug ${
            i === last ? "text-2xl font-bold text-white" : "text-xl font-medium text-white/85"
          }`}
          style={{ paddingLeft: `${i * 12}px` }}
        >
          <HighlightPhrase text={beat} phrase={phrase} />
        </p>
      ))}
    </div>
  );
}
