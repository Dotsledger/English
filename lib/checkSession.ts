import type { DeckStore, LevelState, Phrase } from "@/lib/types";
import type { McqExercise, ClozeExercise } from "@/lib/exercises/types";
import { generateRecognitionMcq } from "@/lib/exercises/mcq";
import { generateCloze } from "@/lib/exercises/cloze";
import { pickExample } from "@/lib/exercises/examples";
import { nextBand } from "@/lib/level";

export type CheckSource = "retention" | "production" | "stretch";
export type CheckItem = {
  id: string;
  exercise: McqExercise | ClozeExercise;
  source: CheckSource;
};

const TOTAL = 10;
const RETENTION = 4;
const PRODUCTION = 4;

function shuffle<T>(list: T[], rng: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Draws up to `count` distinct phrase ids across the prioritized pools. */
function takeDistinct(
  pools: string[][],
  count: number,
  used: Set<string>,
  rng: () => number
): string[] {
  const out: string[] = [];
  for (const pool of pools) {
    for (const id of shuffle(pool.filter((x) => !used.has(x)), rng)) {
      if (out.length >= count) return out;
      out.push(id);
      used.add(id);
    }
  }
  return out;
}

/**
 * Builds an 8–10 item level check (zero AI, existing exercise types):
 * ~40% recognition MCQ from MASTERED phrases, ~40% cloze from PRODUCED,
 * ~20% stretch (recognition of next-band phrases the user hasn't studied).
 * Thin pools fall back to lower stages so a check is always composable
 * once the milestone (≈50+ seen cards) is reached. Never mutates the deck.
 */
export function composeCheck(opts: {
  deck: DeckStore;
  level: LevelState;
  phrases: Phrase[];
  phraseById: Map<string, Phrase>;
  index: Map<string, Set<string>>;
  rng?: () => number;
}): { items: CheckItem[] } {
  const rng = opts.rng ?? Math.random;
  const { deck, phrases, phraseById, index } = opts;

  const byStage = (stage: string) =>
    Object.values(deck)
      .filter((e) => !e.suppressed && e.source === "catalog" && e.stage === stage && phraseById.has(e.phraseId))
      .map((e) => e.phraseId);
  const mastered = byStage("mastered");
  const usable = byStage("usable");
  const recalled = byStage("recalled");
  const recognised = byStage("recognised");
  const seen = byStage("seen");

  // Stretch: next-band phrases the user hasn't studied at all.
  const target = nextBand(opts.level.band) ?? opts.level.band;
  const studied = new Set(
    Object.values(deck)
      .filter((e) => e.inDeck || e.timesSeen > 0)
      .map((e) => e.phraseId)
  );
  const stretchPool = phrases
    .filter((p) => p.level === target && !studied.has(p.id))
    .map((p) => p.id);

  const used = new Set<string>();
  const items: CheckItem[] = [];

  const addMcq = (phraseId: string, source: CheckSource) => {
    const phrase = phraseById.get(phraseId);
    if (!phrase) return;
    items.push({
      id: `check-${items.length}`,
      exercise: generateRecognitionMcq(phrase, phrases, index, rng),
      source,
    });
  };
  const addCloze = (phraseId: string, source: CheckSource) => {
    const phrase = phraseById.get(phraseId);
    if (!phrase) return;
    const cloze = generateCloze(phrase, pickExample(phrase, rng));
    if (cloze) items.push({ id: `check-${items.length}`, exercise: cloze, source });
    else addMcq(phraseId, source); // unclozeable → recognition instead
  };

  // Retention: recognition MCQ, most-advanced first.
  for (const id of takeDistinct([mastered, usable, recalled, recognised, seen], RETENTION, used, rng)) {
    addMcq(id, "retention");
  }
  // Production: cloze, phrases you can already recall first.
  for (const id of takeDistinct([recalled, usable, recognised, seen, mastered], PRODUCTION, used, rng)) {
    addCloze(id, "production");
  }
  // Stretch: recognition of unseen next-band phrases.
  const stretchCount = Math.max(0, TOTAL - items.length);
  for (const id of takeDistinct([stretchPool], stretchCount, used, rng)) {
    addMcq(id, "stretch");
  }
  // Top up to TOTAL from anything remaining studied, if pools were thin.
  if (items.length < TOTAL) {
    for (const id of takeDistinct([seen, recognised, recalled, usable, mastered], TOTAL - items.length, used, rng)) {
      addMcq(id, "retention");
    }
  }

  return { items };
}

/** Percentage score for a set of correct/total answers. */
export function scoreCheck(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}
