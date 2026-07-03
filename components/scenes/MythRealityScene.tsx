import type { MythRealityScene as MythRealitySceneType } from "@/lib/types";

export function MythRealityScene({ scene }: { scene: MythRealitySceneType }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-300">
          Myth
        </span>
        <p className="mt-2 whitespace-pre-line text-xl font-semibold leading-snug text-white/90">
          {scene.myth}
        </p>
      </div>
      <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
          Reality
        </span>
        <p className="mt-2 whitespace-pre-line text-xl font-semibold leading-snug text-white">
          {scene.reality}
        </p>
      </div>
    </div>
  );
}
