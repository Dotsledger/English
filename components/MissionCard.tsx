"use client";

import { useEffect } from "react";
import { useDeck, useMission } from "@/components/AppStateProvider";
import { phraseById } from "@/lib/data/phrases";
import { mondayOfWeek } from "@/lib/dates";
import { checkOffMission, currentMission } from "@/lib/mission";
import { jumpBox } from "@/lib/session/leitner";

/** Weekly mission: use 3 PRODUCED phrases in a real conversation. Manual
 * check-off gives the phrase a one-box SRS boost. Hidden until something
 * reaches PRODUCED. */
export function MissionCard() {
  const deck = useDeck();
  const mission = useMission();
  const weekKey = mondayOfWeek();

  const active = mission.ready && deck.ready ? currentMission(mission.value, deck.value, weekKey) : null;

  // Persist a freshly-built (or rolled-over) mission so check-offs survive.
  useEffect(() => {
    if (!mission.ready || !deck.ready) return;
    if (active && (!mission.value || mission.value.weekKey !== active.weekKey)) {
      mission.update(() => active);
    }
  }, [mission, deck.ready, active]);

  if (!active) return null;
  const phrases = active.phraseIds
    .map((id) => phraseById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  if (phrases.length === 0) return null;

  return (
    <div
      data-testid="mission-card"
      className="mb-4 flex flex-col gap-2.5 rounded-2xl border border-violet-400/25 bg-violet-400/10 px-4 py-3.5"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
        Mission of the week
      </p>
      <p className="text-sm text-white/70">Use them in a real conversation this week:</p>
      <div className="flex flex-col gap-1.5">
        {phrases.map((phrase) => {
          const done = active.done[phrase.id] === true;
          return (
            <button
              key={phrase.id}
              type="button"
              data-testid={`mission-${phrase.id}`}
              disabled={done}
              onClick={() => {
                mission.update((prev) =>
                  prev && prev.weekKey === active.weekKey
                    ? checkOffMission(prev, phrase.id)
                    : checkOffMission(active, phrase.id)
                );
                deck.update((prev) =>
                  prev[phrase.id] ? { ...prev, [phrase.id]: jumpBox(prev[phrase.id], Date.now()) } : prev
                );
              }}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                done
                  ? "bg-emerald-400/15 text-emerald-200"
                  : "bg-white/[0.06] text-white active:scale-[0.99]"
              }`}
            >
              <span className="font-medium">{phrase.text}</span>
              <span className="text-xs">{done ? "✓ used" : "mark"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
