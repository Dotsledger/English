import type { EditorialPosterScene as EditorialPosterSceneType } from "@/lib/types";

const accentText: Record<string, string> = {
  violet: "text-violet-300",
  amber: "text-amber-300",
  emerald: "text-emerald-300",
  rose: "text-rose-300",
};

export function EditorialPosterScene({ scene }: { scene: EditorialPosterSceneType }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <h2 className="whitespace-pre-line text-[2.4rem] font-extrabold leading-[1.08] tracking-tight text-white">
        {scene.hook}
      </h2>
      <p
        className={`whitespace-pre-line text-[1.7rem] font-semibold leading-[1.2] ${
          accentText[scene.accent ?? "violet"]
        }`}
      >
        {scene.body}
      </p>
    </div>
  );
}
