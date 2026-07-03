import type { RedFlagScene as RedFlagSceneType } from "@/lib/types";

export function RedFlagScene({ scene }: { scene: RedFlagSceneType }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <div className="inline-flex items-center gap-2 self-start rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1.5">
        <span aria-hidden className="text-base">🚩</span>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
          Red flag
        </span>
      </div>
      <p className="whitespace-pre-line text-[1.8rem] font-bold leading-[1.15] text-white">
        {scene.flag}
      </p>
      <p className="whitespace-pre-line border-l-2 border-red-400/40 pl-4 text-lg leading-relaxed text-white/70">
        {scene.detail}
      </p>
    </div>
  );
}
