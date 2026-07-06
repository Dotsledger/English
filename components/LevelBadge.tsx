"use client";

import { useLevel } from "@/components/AppStateProvider";
import { formatLevel, markTooltipSeen } from "@/lib/level";

/** Small, always-visible internal-progress badge (e.g. "B2.6") near the
 * pipeline. A first-time-only tooltip makes clear it is not an official
 * certification. Shows B2.0 immediately, even for brand-new users. */
export function LevelBadge() {
  const level = useLevel();
  const showTooltip = level.ready && !level.value.tooltipSeen;

  return (
    <div className="relative mb-3 flex items-center gap-2 px-1">
      <span
        data-testid="level-badge"
        className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 font-mono text-sm font-semibold text-amber-300"
      >
        {formatLevel(level.value)}
      </span>
      <span className="text-[11px] text-white/50">tu nivel en la app</span>

      {showTooltip && (
        <div
          data-testid="level-tooltip"
          className="badge-pop absolute left-1 top-full z-20 mt-1.5 max-w-xs rounded-2xl border border-white/12 bg-[#14141d] px-4 py-3 shadow-lg"
        >
          <p className="text-sm text-white/75">
            Esto mide tu progreso en la app, no es una certificación oficial de inglés.
          </p>
          <button
            type="button"
            data-testid="level-tooltip-dismiss"
            onClick={() => level.update(markTooltipSeen)}
            className="mt-2 text-xs font-semibold text-amber-300 active:scale-95"
          >
            Entendido
          </button>
        </div>
      )}
    </div>
  );
}
