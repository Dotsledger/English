import type { ChecklistScene as ChecklistSceneType } from "@/lib/types";

export function ChecklistScene({ scene }: { scene: ChecklistSceneType }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <h2 className="text-2xl font-bold leading-snug text-white">{scene.title}</h2>
      <ul className="flex flex-col gap-3">
        {scene.items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-2xl bg-white/[0.05] px-4 py-3.5"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-300">
              {i + 1}
            </span>
            <span className="text-base leading-snug text-white/85">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
