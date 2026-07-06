import type { DecisionScene as DecisionSceneType, Phrase } from "@/lib/types";
import { HighlightPhrase } from "@/components/HighlightPhrase";

export function DecisionScene({ scene, phrase }: { scene: DecisionSceneType; phrase: Phrase }) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[1.9rem] font-bold leading-[1.15] text-white">
        <HighlightPhrase text={scene.question} phrase={phrase} />
      </h2>
      <div className="flex flex-col gap-2.5">
        {scene.options.map((option, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3.5 text-base leading-snug text-white/85"
          >
            <HighlightPhrase text={option} phrase={phrase} />
          </div>
        ))}
      </div>
      <p className="whitespace-pre-line text-lg font-semibold leading-snug text-white/90">
        <HighlightPhrase text={scene.takeaway} phrase={phrase} />
      </p>
    </div>
  );
}
