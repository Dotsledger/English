import type { PriceBreakdownScene as PriceBreakdownSceneType, Phrase } from "@/lib/types";
import { HighlightPhrase } from "@/components/HighlightPhrase";

export function PriceBreakdownScene({
  scene,
  phrase,
}: {
  scene: PriceBreakdownSceneType;
  phrase: Phrase;
}) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-2xl font-bold leading-snug text-white">
        <HighlightPhrase text={scene.title} phrase={phrase} />
      </h2>
      <div className="overflow-hidden rounded-3xl border border-white/10">
        {scene.rows.map((row, i) => (
          <div
            key={i}
            className={`flex items-baseline justify-between px-5 py-4 ${
              i % 2 === 0 ? "bg-white/[0.06]" : "bg-white/[0.03]"
            }`}
          >
            <span className="text-base text-white/75">{row.label}</span>
            <span className="font-mono text-lg font-semibold text-white">{row.value}</span>
          </div>
        ))}
      </div>
      <p className="whitespace-pre-line text-xl font-semibold leading-snug text-white/90">
        <HighlightPhrase text={scene.punchline} phrase={phrase} />
      </p>
    </div>
  );
}
