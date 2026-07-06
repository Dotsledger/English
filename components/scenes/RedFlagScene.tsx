import type { RedFlagScene as RedFlagSceneType, Phrase } from "@/lib/types";
import { HighlightPhrase } from "@/components/HighlightPhrase";

export function RedFlagScene({ scene, phrase }: { scene: RedFlagSceneType; phrase: Phrase }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="inline-flex items-center gap-2 self-start rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1.5">
        <span aria-hidden className="text-base">🚩</span>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
          Red flag
        </span>
      </div>
      <p className="whitespace-pre-line text-[1.8rem] font-bold leading-[1.15] text-white">
        <HighlightPhrase text={scene.flag} phrase={phrase} />
      </p>
      <p className="whitespace-pre-line border-l-2 border-red-400/40 pl-4 text-lg leading-relaxed text-white/75">
        <HighlightPhrase text={scene.detail} phrase={phrase} />
      </p>
    </div>
  );
}
