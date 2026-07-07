"use client";

import { useEffect, useState } from "react";
import { useActivity } from "@/components/AppStateProvider";
import { activeDaysTotal, bestStreak, currentStreak, tierForActivity, type StreakTier } from "@/lib/streak";

const TIER_LABEL: Record<StreakTier, string> = {
  bronce: "Bronce",
  plata: "Plata",
  oro: "Oro",
  platino: "Platino",
};
// Emoji carries the metallic association without adding a yellow UI accent
// (yellow stays reserved for the sticky phrase).
const TIER_MEDAL: Record<StreakTier, string> = {
  bronce: "🥉",
  plata: "🥈",
  oro: "🥇",
  platino: "💎",
};

/** Loss-free progress layer next to the level badge: lifetime tier + current
 * and best streak. Hidden until the user has any active day. Cosmetic only. */
export function StreakBadge() {
  const activity = useActivity();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount clock read, hydration-safe
    setNow(Date.now());
  }, []);

  if (!activity.ready || now === null) return null;
  if (activeDaysTotal(activity.value) === 0) return null;

  const tier = tierForActivity(activity.value);
  const current = currentStreak(activity.value, now);
  const best = bestStreak(activity.value);

  return (
    <div data-testid="streak-badge" className="mb-3 flex flex-wrap items-center gap-2 px-1">
      {tier && (
        <span
          data-testid="streak-tier"
          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-sm font-semibold text-white/85"
        >
          <span aria-hidden>{TIER_MEDAL[tier]}</span>
          {TIER_LABEL[tier]}
        </span>
      )}
      <span className="text-[11px] text-white/50">
        racha {current} · mejor {best}
      </span>
    </div>
  );
}
