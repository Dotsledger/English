import type { Phrase } from "@/lib/types";
import { phrases as carsAndMobility } from "@/lib/data/categories/cars-and-mobility";
import { phrases as homeAndRealEstate } from "@/lib/data/categories/home-and-real-estate";
import { phrases as techAndAi } from "@/lib/data/categories/tech-and-ai";
import { phrases as designAndUx } from "@/lib/data/categories/design-and-ux";
import { phrases as scienceAndWeirdFacts } from "@/lib/data/categories/science-and-weird-facts";
import { phrases as travel } from "@/lib/data/categories/travel";
import { phrases as moneyAndHiddenCosts } from "@/lib/data/categories/money-and-hidden-costs";
import { phrases as workAndProductivity } from "@/lib/data/categories/work-and-productivity";
import { phrases as healthAndWellness } from "@/lib/data/categories/health-and-wellness";
import { phrases as socialMediaAndInternetCulture } from "@/lib/data/categories/social-media-and-internet-culture";
import { phrases as relationshipsAndDating } from "@/lib/data/categories/relationships-and-dating";
import { phrases as personalFinanceAndCrypto } from "@/lib/data/categories/personal-finance-and-crypto";
import { phrases as politicsAndSociety } from "@/lib/data/categories/politics-and-society";
import { phrases as sports } from "@/lib/data/categories/sports";
import { phrases as environmentAndClimate } from "@/lib/data/categories/environment-and-climate";
import { phrases as foodAndNutrition } from "@/lib/data/categories/food-and-nutrition";
import { phrases as entertainment } from "@/lib/data/categories/entertainment";
import { phrases as gaming } from "@/lib/data/categories/gaming";
import { phrases as fashionAndBeauty } from "@/lib/data/categories/fashion-and-beauty";
import { phrases as historyAndTrueCrime } from "@/lib/data/categories/history-and-true-crime";
import { phrases as meetingsAndLeadership } from "@/lib/data/categories/meetings-and-leadership";
import { phrases as coreLifePhrases } from "@/lib/data/categories/core-life-phrases";

export const phrases: Phrase[] = [
  ...carsAndMobility,
  ...homeAndRealEstate,
  ...techAndAi,
  ...designAndUx,
  ...scienceAndWeirdFacts,
  ...travel,
  ...moneyAndHiddenCosts,
  ...workAndProductivity,
  ...healthAndWellness,
  ...socialMediaAndInternetCulture,
  ...relationshipsAndDating,
  ...personalFinanceAndCrypto,
  ...politicsAndSociety,
  ...sports,
  ...environmentAndClimate,
  ...foodAndNutrition,
  ...entertainment,
  ...gaming,
  ...fashionAndBeauty,
  ...historyAndTrueCrime,
  ...meetingsAndLeadership,
  // Core life phrases last so plain-catalog slicing in tests/tools stays stable.
  ...coreLifePhrases,
];

export const phraseById = new Map(phrases.map((p) => [p.id, p]));

export function getPhrase(id: string): Phrase {
  const phrase = phraseById.get(id);
  if (!phrase) throw new Error(`Unknown phraseId: ${id}`);
  return phrase;
}
