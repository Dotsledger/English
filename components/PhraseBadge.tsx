import type { Phrase, PhraseStatus } from "@/lib/types";

const statusLabel: Record<PhraseStatus, string> = {
  new: "new",
  seen: "seen",
  learning: "learning",
  familiar: "familiar",
  strong: "strong",
};

const statusColor: Record<PhraseStatus, string> = {
  new: "bg-sky-400/20 text-sky-300",
  seen: "bg-violet-400/20 text-violet-300",
  learning: "bg-amber-400/20 text-amber-300",
  familiar: "bg-emerald-400/20 text-emerald-300",
  strong: "bg-emerald-400/30 text-emerald-200",
};

export function PhraseBadge({
  phrase,
  status,
}: {
  phrase: Phrase;
  status: PhraseStatus;
}) {
  return (
    <div
      data-testid="phrase-badge"
      className="badge-pop inline-flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-md"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Sticky phrase
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColor[status]}`}
        >
          {statusLabel[status]}
        </span>
      </div>
      <span className="text-lg font-semibold leading-tight text-white">{phrase.text}</span>
      <span className="text-sm text-white/60">{phrase.meaningEs}</span>
    </div>
  );
}
