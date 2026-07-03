import type { HeroImageScene as HeroImageSceneType } from "@/lib/types";

export function HeroImageScene({ scene }: { scene: HeroImageSceneType }) {
  return (
    <div className="flex flex-1 flex-col justify-end gap-5 pb-2">
      <h2 className="whitespace-pre-line text-[2rem] font-bold leading-[1.15] tracking-tight text-white">
        {scene.hook}
      </h2>
      {scene.body && (
        <p className="whitespace-pre-line text-lg leading-relaxed text-white/80">{scene.body}</p>
      )}
      {scene.payoff && (
        <p className="whitespace-pre-line text-xl font-medium leading-snug text-white/90">
          {scene.payoff}
        </p>
      )}
    </div>
  );
}
