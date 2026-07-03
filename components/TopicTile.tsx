import Link from "next/link";
import type { TopicTile as TopicTileType } from "@/lib/types";
import { getPhrase } from "@/lib/data/phrases";

const tileBackground: Record<string, string> = {
  urban: "scene-bg-scooter",
  tech: "scene-bg-editorial",
  neon: "scene-bg-cosmic",
  editorial: "scene-bg-editorial",
  cosmic: "scene-bg-cosmic",
  travel: "scene-bg-travel",
  money: "scene-bg-travel",
  gadget: "scene-bg-scooter",
};

export function TopicTile({ topic }: { topic: TopicTileType }) {
  const previews = topic.previewPhraseIds.slice(0, 2).map((id) => getPhrase(id));

  return (
    <Link
      href={`/feed/${topic.id}`}
      data-testid={`topic-tile-${topic.id}`}
      className={`group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-3xl border border-white/10 p-4 transition-transform active:scale-[0.97] ${
        tileBackground[topic.visualStyle] ?? "scene-bg-editorial"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/60">
          {topic.difficulty}
        </span>
        {topic.badge && (
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
            {topic.badge}
          </span>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold leading-snug text-white">{topic.title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-white/55">{topic.subtitle}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {previews.map((p) => (
            <span
              key={p.id}
              className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[11px] text-white/70"
            >
              {p.text}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
