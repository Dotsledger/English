import type { Phrase } from "@/lib/types";
import { locatePhrase } from "@/lib/exercises/cloze";

/**
 * Renders text with the sticky phrase highlighted in the one reserved
 * accent (yellow). Everything else stays neutral — one emphasis colour,
 * one meaning. Falls back to plain text when the phrase isn't in this
 * field (it lives in another part of the scene's visible text).
 */
export function HighlightPhrase({ text, phrase }: { text: string; phrase?: Phrase }) {
  if (!phrase) return <>{text}</>;
  const loc = locatePhrase(text, phrase);
  if (!loc) return <>{text}</>;
  return (
    <>
      {text.slice(0, loc.start)}
      <span className="text-amber-300">{loc.matched}</span>
      {text.slice(loc.end)}
    </>
  );
}
