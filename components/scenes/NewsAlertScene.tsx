import type { NewsAlertScene as NewsAlertSceneType, Phrase } from "@/lib/types";
import { HighlightPhrase } from "@/components/HighlightPhrase";

export function NewsAlertScene({ scene, phrase }: { scene: NewsAlertSceneType; phrase: Phrase }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="inline-flex items-center gap-2 self-start rounded-md border border-white/20 bg-white/10 px-2.5 py-1">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
          Just in
        </span>
      </div>
      <h2 className="whitespace-pre-line text-[2rem] font-extrabold leading-[1.12] tracking-tight text-white">
        <HighlightPhrase text={scene.headline} phrase={phrase} />
      </h2>
      <p className="whitespace-pre-line text-lg leading-relaxed text-white/75">
        <HighlightPhrase text={scene.detail} phrase={phrase} />
      </p>
      <p className="whitespace-pre-line border-t border-white/15 pt-4 text-lg font-semibold leading-snug text-white/90">
        <HighlightPhrase text={scene.consequence} phrase={phrase} />
      </p>
    </div>
  );
}
