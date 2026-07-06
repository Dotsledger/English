import type { HeroImageScene as HeroImageSceneType, Phrase } from "@/lib/types";
import { HighlightPhrase } from "@/components/HighlightPhrase";

export function HeroImageScene({
  scene,
  phrase,
}: {
  scene: HeroImageSceneType;
  phrase: Phrase;
}) {
  return (
    <div className="flex flex-col gap-5 pb-2">
      <h2 className="whitespace-pre-line text-[2rem] font-bold leading-[1.15] tracking-tight text-white">
        <HighlightPhrase text={scene.hook} phrase={phrase} />
      </h2>
      {scene.body && (
        <p className="whitespace-pre-line text-lg leading-relaxed text-white/80">
          <HighlightPhrase text={scene.body} phrase={phrase} />
        </p>
      )}
      {scene.payoff && (
        <p className="whitespace-pre-line text-xl font-medium leading-snug text-white/90">
          <HighlightPhrase text={scene.payoff} phrase={phrase} />
        </p>
      )}
    </div>
  );
}
