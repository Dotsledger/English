import Link from "next/link";
import type { TopicTile as TopicTileType } from "@/lib/types";
import { getPhrase } from "@/lib/data/phrases";
import { CategoryIcon } from "@/components/CategoryIcon";
import { categoryAccent } from "@/lib/categoryStyle";

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

export function TopicTile({
  topic,
  completed = false,
  previewPhraseIds,
}: {
  topic: TopicTileType;
  completed?: boolean;
  /** Overrides which preview phrases to show (used to dedupe across covers). */
  previewPhraseIds?: string[];
}) {
  const previews = (previewPhraseIds ?? topic.previewPhraseIds.slice(0, 2)).map((id) =>
    getPhrase(id)
  );
  const accent = categoryAccent(topic.category);

  return (
    <Link
      href={`/feed/${topic.id}`}
      data-testid={`topic-tile-${topic.id}`}
      className={`group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-3xl border border-white/10 p-4 transition-transform active:scale-[0.97] ${
        completed ? "opacity-70" : ""
      } ${tileBackground[topic.visualStyle] ?? "scene-bg-editorial"}`}
    >
      {/* Per-category accent bar down the left edge. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-black/30"
            style={{ color: accent }}
          >
            <CategoryIcon category={topic.category} className="h-3.5 w-3.5" />
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/60">
            {topic.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {completed && (
            <span
              data-testid="topic-completed-badge"
              aria-label="Completed"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/90 text-[10px] font-bold text-black"
            >
              ✓
            </span>
          )}
          {topic.badge && (
            <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
              {topic.badge}
            </span>
          )}
        </div>
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
