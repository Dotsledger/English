import type { CheckpointScene, ContentScene, Phrase, TopicTile } from "@/lib/types";
import type { SessionCard, SessionPlan } from "@/lib/session/types";
import { pickRandomTopics } from "@/lib/pickTopics";
import { interleaveCheckpoints } from "@/lib/session/checkpoints";
import { markAudioFirst } from "@/lib/session/audioFirst";

export type ComposerContent = {
  topics: TopicTile[];
  scenes: ContentScene[];
  authoredCheckpoints: CheckpointScene[];
  phrases: Phrase[];
  phraseById: Map<string, Phrase>;
  index: Map<string, Set<string>>;
};

/**
 * A "rabbit hole" session: the seed topic's scenes first, then whole
 * topics from the same category chained on (unseen before completed),
 * with a checkpoint after every 4–5 content cards testing a phrase from
 * earlier in the session. 12–15 interactive cards, then the end card.
 */
/** Unseen "core" life phrases introduced per Explore feed (0 unless opted in). */
const CORE_PER_FEED = 2;

export function composeCategorySession(opts: {
  seedTopicId: string;
  content: ComposerContent;
  completedTopicIds: Set<string>;
  suppressedPhraseIds: Set<string>;
  /** Phrase ids the user has already seen. When provided, a couple of unseen
   * "core" life phrases are introduced as Context cards (discovery in Explore).
   * Omitted ⇒ no Context cards (keeps the pure-composer default unchanged). */
  seenPhraseIds?: Set<string>;
  targetCards?: number;
  rng?: () => number;
}): SessionPlan {
  const rng = opts.rng ?? Math.random;
  const target = opts.targetCards ?? 12 + Math.floor(rng() * 4);
  const checkpointBudget = Math.floor(target / 5);
  const contentBudget = target - checkpointBudget;

  const { topics, scenes } = opts.content;
  const seedTopic = topics.find((t) => t.id === opts.seedTopicId);
  const category = seedTopic?.category;

  const scenesOf = (topicId: string) =>
    scenes.filter(
      (s) => s.topicId === topicId && !opts.suppressedPhraseIds.has(s.phraseId)
    );

  const contentCards: SessionCard[] = [];
  const usedTopicIds = new Set<string>();
  const pushTopic = (topicId: string) => {
    usedTopicIds.add(topicId);
    for (const scene of scenesOf(topicId)) {
      if (contentCards.length >= contentBudget) return;
      contentCards.push({ kind: "content", scene });
    }
  };

  if (seedTopic) pushTopic(seedTopic.id);

  // After the topic the user tapped into, introduce a couple of unseen "core"
  // life phrases as Context cards — everyday-English discovery inside Explore.
  if (opts.seenPhraseIds) {
    const seen = opts.seenPhraseIds;
    let introduced = 0;
    for (const p of opts.content.phrases) {
      if (introduced >= CORE_PER_FEED || contentCards.length >= contentBudget) break;
      if (p.usageContext === undefined) continue;
      if (seen.has(p.id) || opts.suppressedPhraseIds.has(p.id)) continue;
      contentCards.push({ kind: "context", phraseId: p.id });
      introduced += 1;
    }
  }

  // Chain more topics from the same category, unseen first, then repeats.
  const categoryPool = topics.filter((t) => t.category === category);
  const fresh = categoryPool.filter((t) => !opts.completedTopicIds.has(t.id));
  const revisits = categoryPool.filter((t) => opts.completedTopicIds.has(t.id));
  const ordered = [
    ...pickRandomTopics(fresh, fresh.length, rng),
    ...pickRandomTopics(revisits, revisits.length, rng),
  ];
  for (const topic of ordered) {
    if (contentCards.length >= contentBudget) break;
    if (usedTopicIds.has(topic.id)) continue;
    pushTopic(topic.id);
  }

  const cards = markAudioFirst(
    interleaveCheckpoints(contentCards, {
      authored: opts.content.authoredCheckpoints,
      phrases: opts.content.phrases,
      phraseById: opts.content.phraseById,
      index: opts.content.index,
      rng,
      budget: checkpointBudget,
    })
  );

  cards.push({ kind: "end" });
  return { id: `s-${Math.floor(rng() * 1e9)}`, mode: "category", cards };
}
