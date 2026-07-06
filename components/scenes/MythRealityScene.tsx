import type { MythRealityScene as MythRealitySceneType, Phrase } from "@/lib/types";
import { HighlightPhrase } from "@/components/HighlightPhrase";

export function MythRealityScene({
  scene,
  phrase,
}: {
  scene: MythRealitySceneType;
  phrase: Phrase;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-300">
          Myth
        </span>
        <p className="mt-2 whitespace-pre-line text-xl font-semibold leading-snug text-white/90">
          <HighlightPhrase text={scene.myth} phrase={phrase} />
        </p>
      </div>
      <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
          Reality
        </span>
        <p className="mt-2 whitespace-pre-line text-xl font-semibold leading-snug text-white">
          <HighlightPhrase text={scene.reality} phrase={phrase} />
        </p>
      </div>
    </div>
  );
}
