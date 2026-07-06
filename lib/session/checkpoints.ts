import type { CheckpointScene, Phrase } from "@/lib/types";
import type { McqExercise } from "@/lib/exercises/types";
import type { SessionCard } from "@/lib/session/types";
import { generateCheckpointMcq } from "@/lib/exercises/mcq";

/** An authored checkpoint converts 1:1 into a generated-checkpoint shape. */
export function authoredToMcq(checkpoint: CheckpointScene): McqExercise {
  return {
    type: "mcq",
    phraseId: checkpoint.phraseId,
    prompt: checkpoint.prompt,
    options: checkpoint.options,
    correctIndex: checkpoint.correctIndex,
  };
}

/**
 * Walks a card sequence and inserts a checkpoint after every 4–5 CONTENT
 * cards (reviews are already retrieval and don't advance the counter),
 * testing the oldest phrase seen earlier in the session that hasn't been
 * tested yet — oldest maximizes the retrieval gap. Authored checkpoints
 * are preferred over generated MCQs when one exists for the phrase.
 */
export function interleaveCheckpoints(
  cards: SessionCard[],
  opts: {
    authored: CheckpointScene[];
    phrases: Phrase[];
    phraseById: Map<string, Phrase>;
    index: Map<string, Set<string>>;
    rng: () => number;
    /** Maximum checkpoints to insert. */
    budget: number;
  }
): SessionCard[] {
  if (opts.budget <= 0) return cards;
  const authoredByPhrase = new Map<string, CheckpointScene>();
  for (const checkpoint of opts.authored) {
    if (!authoredByPhrase.has(checkpoint.phraseId)) {
      authoredByPhrase.set(checkpoint.phraseId, checkpoint);
    }
  }

  const result: SessionCard[] = [];
  const seenInOrder: string[] = [];
  const tested = new Set<string>();
  let inserted = 0;
  let gap = 4 + Math.floor(opts.rng() * 2); // 4 or 5
  let sinceLast = 0;

  for (const card of cards) {
    result.push(card);
    if (card.kind !== "content") continue;
    if (!seenInOrder.includes(card.scene.phraseId)) seenInOrder.push(card.scene.phraseId);
    sinceLast += 1;

    if (sinceLast < gap || inserted >= opts.budget) continue;
    const phraseId = seenInOrder.find((id) => !tested.has(id));
    if (!phraseId) continue;
    const phrase = opts.phraseById.get(phraseId);
    if (!phrase) continue;

    const authored = authoredByPhrase.get(phraseId);
    result.push(
      authored
        ? { kind: "checkpoint", exercise: authoredToMcq(authored), authoredSceneId: authored.id }
        : {
            kind: "checkpoint",
            exercise: generateCheckpointMcq(phrase, opts.phrases, opts.index, opts.rng),
          }
    );
    tested.add(phraseId);
    inserted += 1;
    sinceLast = 0;
    gap = 4 + Math.floor(opts.rng() * 2);
  }
  return result;
}
