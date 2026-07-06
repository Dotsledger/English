import type { TopicTile } from "@/lib/types";
import { topics as carsAndMobility } from "@/lib/data/categories/cars-and-mobility";
import { topics as homeAndRealEstate } from "@/lib/data/categories/home-and-real-estate";
import { topics as techAndAi } from "@/lib/data/categories/tech-and-ai";
import { topics as designAndUx } from "@/lib/data/categories/design-and-ux";
import { topics as scienceAndWeirdFacts } from "@/lib/data/categories/science-and-weird-facts";
import { topics as travel } from "@/lib/data/categories/travel";
import { topics as moneyAndHiddenCosts } from "@/lib/data/categories/money-and-hidden-costs";
import { topics as workAndProductivity } from "@/lib/data/categories/work-and-productivity";
import { topics as healthAndWellness } from "@/lib/data/categories/health-and-wellness";
import { topics as socialMediaAndInternetCulture } from "@/lib/data/categories/social-media-and-internet-culture";
import { topics as relationshipsAndDating } from "@/lib/data/categories/relationships-and-dating";
import { topics as personalFinanceAndCrypto } from "@/lib/data/categories/personal-finance-and-crypto";
import { topics as politicsAndSociety } from "@/lib/data/categories/politics-and-society";
import { topics as sports } from "@/lib/data/categories/sports";
import { topics as environmentAndClimate } from "@/lib/data/categories/environment-and-climate";
import { topics as foodAndNutrition } from "@/lib/data/categories/food-and-nutrition";
import { topics as entertainment } from "@/lib/data/categories/entertainment";
import { topics as gaming } from "@/lib/data/categories/gaming";
import { topics as fashionAndBeauty } from "@/lib/data/categories/fashion-and-beauty";
import { topics as historyAndTrueCrime } from "@/lib/data/categories/history-and-true-crime";

export const topics: TopicTile[] = [
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
];

export const topicById = new Map(topics.map((t) => [t.id, t]));

export const CATEGORIES = [...new Set(topics.map((t) => t.category))].sort();

export const LEVELS: TopicTile["difficulty"][] = ["B2", "C1", "C2"];

/** The original curated 10 — shown before the user ever taps "refresh". */
export const DEFAULT_TOPIC_IDS = [
  "electric-scooters",
  "smart-homes",
  "ai-tools",
  "ux-design",
  "weird-science",
  "travel-hacks",
  "hidden-costs",
  "gadgets",
  "cheap-travel",
  "bad-ux-premium",
];
