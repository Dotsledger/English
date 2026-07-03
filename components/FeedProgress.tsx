export function FeedProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3 px-6 pt-[max(0.9rem,env(safe-area-inset-top))]">
      <div className="flex flex-1 gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-colors ${
              i <= current ? "bg-white/85" : "bg-white/20"
            }`}
          />
        ))}
      </div>
      <span data-testid="feed-progress-text" className="font-mono text-[11px] text-white/45">
        {current + 1}/{total}
      </span>
    </div>
  );
}
