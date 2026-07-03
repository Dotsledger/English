import type { MiniStoryScene as MiniStorySceneType } from "@/lib/types";

export function MiniStoryScene({ scene }: { scene: MiniStorySceneType }) {
  const last = scene.beats.length - 1;

  return (
    <div className="flex flex-1 flex-col justify-center gap-7">
      {scene.beats.map((beat, i) => (
        <p
          key={i}
          className={`whitespace-pre-line leading-snug ${
            i === last
              ? "text-2xl font-bold text-amber-200"
              : "text-xl font-medium text-white/85"
          }`}
          style={{ paddingLeft: `${i * 12}px` }}
        >
          {beat}
        </p>
      ))}
    </div>
  );
}
