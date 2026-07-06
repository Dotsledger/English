import type { CheckpointScene, ContentScene, FeedScene } from "@/lib/types";
import { contentScenes as carsAndMobilityScenes, checkpointScenes as carsAndMobilityCheckpoints } from "@/lib/data/categories/cars-and-mobility";
import { contentScenes as homeAndRealEstateScenes, checkpointScenes as homeAndRealEstateCheckpoints } from "@/lib/data/categories/home-and-real-estate";
import { contentScenes as techAndAiScenes, checkpointScenes as techAndAiCheckpoints } from "@/lib/data/categories/tech-and-ai";
import { contentScenes as designAndUxScenes, checkpointScenes as designAndUxCheckpoints } from "@/lib/data/categories/design-and-ux";
import { contentScenes as scienceAndWeirdFactsScenes, checkpointScenes as scienceAndWeirdFactsCheckpoints } from "@/lib/data/categories/science-and-weird-facts";
import { contentScenes as travelScenes, checkpointScenes as travelCheckpoints } from "@/lib/data/categories/travel";
import { contentScenes as moneyAndHiddenCostsScenes, checkpointScenes as moneyAndHiddenCostsCheckpoints } from "@/lib/data/categories/money-and-hidden-costs";
import { contentScenes as workAndProductivityScenes, checkpointScenes as workAndProductivityCheckpoints } from "@/lib/data/categories/work-and-productivity";
import { contentScenes as healthAndWellnessScenes, checkpointScenes as healthAndWellnessCheckpoints } from "@/lib/data/categories/health-and-wellness";
import { contentScenes as socialMediaAndInternetCultureScenes, checkpointScenes as socialMediaAndInternetCultureCheckpoints } from "@/lib/data/categories/social-media-and-internet-culture";
import { contentScenes as relationshipsAndDatingScenes, checkpointScenes as relationshipsAndDatingCheckpoints } from "@/lib/data/categories/relationships-and-dating";
import { contentScenes as personalFinanceAndCryptoScenes, checkpointScenes as personalFinanceAndCryptoCheckpoints } from "@/lib/data/categories/personal-finance-and-crypto";
import { contentScenes as politicsAndSocietyScenes, checkpointScenes as politicsAndSocietyCheckpoints } from "@/lib/data/categories/politics-and-society";
import { contentScenes as sportsScenes, checkpointScenes as sportsCheckpoints } from "@/lib/data/categories/sports";
import { contentScenes as environmentAndClimateScenes, checkpointScenes as environmentAndClimateCheckpoints } from "@/lib/data/categories/environment-and-climate";
import { contentScenes as foodAndNutritionScenes, checkpointScenes as foodAndNutritionCheckpoints } from "@/lib/data/categories/food-and-nutrition";
import { contentScenes as entertainmentScenes, checkpointScenes as entertainmentCheckpoints } from "@/lib/data/categories/entertainment";
import { contentScenes as gamingScenes, checkpointScenes as gamingCheckpoints } from "@/lib/data/categories/gaming";
import { contentScenes as fashionAndBeautyScenes, checkpointScenes as fashionAndBeautyCheckpoints } from "@/lib/data/categories/fashion-and-beauty";
import { contentScenes as historyAndTrueCrimeScenes, checkpointScenes as historyAndTrueCrimeCheckpoints } from "@/lib/data/categories/history-and-true-crime";

export const contentScenes: ContentScene[] = [
  ...carsAndMobilityScenes,
  ...homeAndRealEstateScenes,
  ...techAndAiScenes,
  ...designAndUxScenes,
  ...scienceAndWeirdFactsScenes,
  ...travelScenes,
  ...moneyAndHiddenCostsScenes,
  ...workAndProductivityScenes,
  ...healthAndWellnessScenes,
  ...socialMediaAndInternetCultureScenes,
  ...relationshipsAndDatingScenes,
  ...personalFinanceAndCryptoScenes,
  ...politicsAndSocietyScenes,
  ...sportsScenes,
  ...environmentAndClimateScenes,
  ...foodAndNutritionScenes,
  ...entertainmentScenes,
  ...gamingScenes,
  ...fashionAndBeautyScenes,
  ...historyAndTrueCrimeScenes,
];

export const checkpointScenes: CheckpointScene[] = [
  ...carsAndMobilityCheckpoints,
  ...homeAndRealEstateCheckpoints,
  ...techAndAiCheckpoints,
  ...designAndUxCheckpoints,
  ...scienceAndWeirdFactsCheckpoints,
  ...travelCheckpoints,
  ...moneyAndHiddenCostsCheckpoints,
  ...workAndProductivityCheckpoints,
  ...healthAndWellnessCheckpoints,
  ...socialMediaAndInternetCultureCheckpoints,
  ...relationshipsAndDatingCheckpoints,
  ...personalFinanceAndCryptoCheckpoints,
  ...politicsAndSocietyCheckpoints,
  ...sportsCheckpoints,
  ...environmentAndClimateCheckpoints,
  ...foodAndNutritionCheckpoints,
  ...entertainmentCheckpoints,
  ...gamingCheckpoints,
  ...fashionAndBeautyCheckpoints,
  ...historyAndTrueCrimeCheckpoints,
];

const checkpointByTopic = new Map(checkpointScenes.map((c) => [c.topicId, c]));

/** First topic a phrase appears in — used to route "due for review" back into a feed. */
export const topicIdByPhraseId = new Map<string, string>();
for (const s of contentScenes) {
  if (!topicIdByPhraseId.has(s.phraseId)) topicIdByPhraseId.set(s.phraseId, s.topicId);
}

/**
 * Builds the feed for a topic: its content scenes in order, with the topic's
 * checkpoint (if any) inserted after the second scene — always after the
 * scene that introduces the checkpoint's phrase.
 */
export function buildFeed(topicId: string): FeedScene[] {
  const scenes = contentScenes.filter((s) => s.topicId === topicId);
  const checkpoint = checkpointByTopic.get(topicId);
  if (!checkpoint) return scenes;

  const feed: FeedScene[] = [];
  let inserted = false;
  for (const scene of scenes) {
    feed.push(scene);
    // insert once the phrase has been seen and at least 2 scenes have passed
    const phraseSeen = feed.some(
      (s) => s.type === "content" && s.phraseId === checkpoint.phraseId
    );
    if (!inserted && feed.length >= 2 && phraseSeen) {
      feed.push(checkpoint);
      inserted = true;
    }
  }
  if (!inserted) feed.push(checkpoint);
  return feed;
}
