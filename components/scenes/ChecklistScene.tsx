import type { ChecklistScene as ChecklistSceneType, Phrase } from "@/lib/types";
import { HighlightPhrase } from "@/components/HighlightPhrase";

export function ChecklistScene({ scene, phrase }: { scene: ChecklistSceneType; phrase: Phrase }) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold leading-snug text-white">
        <HighlightPhrase text={scene.title} phrase={phrase} />
      </h2>
      <ul className="flex flex-col gap-3">
        {scene.items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 rounded-2xl bg-white/[0.05] px-4 py-3.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-300">
              {i + 1}
            </span>
            <span className="text-base leading-snug text-white/85">
              <HighlightPhrase text={item} phrase={phrase} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
