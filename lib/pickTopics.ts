import type { TopicTile } from "@/lib/types";

/** Picks `count` distinct random topics from the pool (Fisher–Yates partial shuffle). */
export function pickRandomTopics(pool: TopicTile[], count: number): TopicTile[] {
  const shuffled = [...pool];
  const n = Math.min(count, shuffled.length);
  for (let i = shuffled.length - 1; i > shuffled.length - 1 - n; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(shuffled.length - n);
}
