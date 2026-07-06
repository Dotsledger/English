import type { ContentScene, TopicTile } from "@/lib/types";
import { contentScenes } from "@/lib/data/scenes";
import { topics } from "@/lib/data/topics";

/**
 * Phrases have level and tags but no category — derive it from which
 * topics' scenes use them. A phrase reused across categories maps to all
 * of them (that's what makes cross-category distractors sensible).
 */
export function buildPhraseCategoryIndex(
  scenes: ContentScene[],
  allTopics: TopicTile[]
): Map<string, Set<string>> {
  const categoryByTopicId = new Map(allTopics.map((t) => [t.id, t.category]));
  const index = new Map<string, Set<string>>();
  for (const scene of scenes) {
    const category = categoryByTopicId.get(scene.topicId);
    if (!category) continue;
    let set = index.get(scene.phraseId);
    if (!set) {
      set = new Set();
      index.set(scene.phraseId, set);
    }
    set.add(category);
  }
  return index;
}

/** Prebuilt from the shipped content, same pattern as topicIdByPhraseId. */
export const phraseCategoryIndex = buildPhraseCategoryIndex(contentScenes, topics);
