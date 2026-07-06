import type { SessionCard } from "@/lib/session/types";

/** Every Nth content card. */
const EVERY = 5;

/**
 * Marks ~1 in 5 content cards as audio-first (Feature 2): the sentence
 * plays via TTS with text hidden until tapped. Pure; returns a new array.
 * Rendering degrades to a normal card when TTS is unavailable.
 */
export function markAudioFirst(cards: SessionCard[], every: number = EVERY): SessionCard[] {
  let contentSeen = 0;
  return cards.map((card) => {
    if (card.kind !== "content") return card;
    contentSeen += 1;
    return contentSeen % every === 0 ? { ...card, audioFirst: true } : card;
  });
}
