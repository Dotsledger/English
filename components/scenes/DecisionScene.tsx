import type { DecisionScene as DecisionSceneType } from "@/lib/types";

export function DecisionScene({ scene }: { scene: DecisionSceneType }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <h2 className="text-[1.9rem] font-bold leading-[1.15] text-white">{scene.question}</h2>
      <div className="flex flex-col gap-2.5">
        {scene.options.map((option, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3.5 text-base leading-snug text-white/85"
          >
            {option}
          </div>
        ))}
      </div>
      <p className="whitespace-pre-line text-lg font-semibold leading-snug text-sky-300">
        {scene.takeaway}
      </p>
    </div>
  );
}
