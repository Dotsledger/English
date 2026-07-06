import type { DeckStore, MissionStore } from "@/lib/types";
import { seededRngFrom } from "@/lib/rng";

const MISSION_SIZE = 3;

/**
 * Weekly mission: every Monday, 3 phrases in PRODUCED state to use in a
 * real conversation. Selection is seeded by the week key so it's stable
 * across reloads. Null when there's nothing in PRODUCED state yet.
 */
export function buildMission(deck: DeckStore, weekKey: string): MissionStore | null {
  const produced = Object.values(deck)
    .filter((e) => e.stage === "produced" && !e.suppressed)
    .map((e) => e.phraseId)
    .sort(); // stable base order before the seeded shuffle
  if (produced.length === 0) return null;

  const rng = seededRngFrom(weekKey);
  const shuffled = [...produced];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { weekKey, phraseIds: shuffled.slice(0, MISSION_SIZE), done: {} };
}

/** Returns the stored mission if it's still this week's, else a fresh one. */
export function currentMission(
  stored: MissionStore | null,
  deck: DeckStore,
  weekKey: string
): MissionStore | null {
  if (stored && stored.weekKey === weekKey) return stored;
  return buildMission(deck, weekKey);
}

export function checkOffMission(mission: MissionStore, phraseId: string): MissionStore {
  if (!mission.phraseIds.includes(phraseId) || mission.done[phraseId]) return mission;
  return { ...mission, done: { ...mission.done, [phraseId]: true } };
}
