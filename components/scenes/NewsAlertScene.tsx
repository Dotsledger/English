import type { NewsAlertScene as NewsAlertSceneType } from "@/lib/types";

export function NewsAlertScene({ scene }: { scene: NewsAlertSceneType }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-5">
      <div className="inline-flex items-center gap-2 self-start rounded-md bg-amber-400 px-2.5 py-1">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-black">
          Just in
        </span>
      </div>
      <h2 className="whitespace-pre-line text-[2rem] font-extrabold leading-[1.12] tracking-tight text-white">
        {scene.headline}
      </h2>
      <p className="whitespace-pre-line text-lg leading-relaxed text-white/75">{scene.detail}</p>
      <p className="whitespace-pre-line border-t border-white/15 pt-4 text-lg font-semibold leading-snug text-amber-200">
        {scene.consequence}
      </p>
    </div>
  );
}
