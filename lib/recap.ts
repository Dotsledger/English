import type { ActivityStore, DeckStore } from "@/lib/types";
import { datesOfWeek, mondayOfWeek } from "@/lib/dates";

export type Recap = {
  weekKey: string;
  activeDays: number;
  produced: number;
  topCategory: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * A positive-only weekly recap (Feature 6) for the week that just ended:
 * active days, phrases newly produced, and the most-practised category.
 * No week-over-week comparison, no unmet goals — just wins. `phraseCategory`
 * maps a phraseId to its category set (from phraseCategoryIndex).
 */
export function buildRecap(
  deck: DeckStore,
  activity: ActivityStore,
  phraseCategory: Map<string, Set<string>>,
  now: number
): Recap {
  // The week that just ended = the seven days before this week's Monday.
  const thisMonday = mondayOfWeek(new Date(now));
  const lastWeekAnchor = new Date(`${thisMonday}T00:00:00`).getTime() - DAY;
  const lastWeekDates = datesOfWeek(new Date(lastWeekAnchor));
  const weekKey = lastWeekDates[0];
  const start = new Date(`${lastWeekDates[0]}T00:00:00`).getTime();
  const end = new Date(`${lastWeekDates[6]}T00:00:00`).getTime() + DAY;

  const activeDays = lastWeekDates.filter((d) => activity[d]).length;

  let produced = 0;
  const categoryCounts = new Map<string, number>();
  for (const entry of Object.values(deck)) {
    if (entry.producedAt != null && entry.producedAt >= start && entry.producedAt < end) {
      produced += 1;
    }
    if (entry.lastAttemptAt != null && entry.lastAttemptAt >= start && entry.lastAttemptAt < end) {
      for (const category of phraseCategory.get(entry.phraseId) ?? []) {
        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      }
    }
  }

  let topCategory: string | null = null;
  let topCount = 0;
  for (const [category, count] of categoryCounts) {
    if (count > topCount) {
      topCount = count;
      topCategory = category;
    }
  }

  return { weekKey, activeDays, produced, topCategory };
}

/** Whether to show the recap: it's Monday and this week's recap is unseen,
 * and there's something worth celebrating. */
export function shouldShowRecap(recap: Recap, ackedWeek: string | undefined, now: number): boolean {
  const isMonday = mondayOfWeek(new Date(now)) === recapToday(now);
  if (!isMonday) return false;
  if (ackedWeek === recap.weekKey) return false;
  return recap.activeDays > 0 || recap.produced > 0;
}

function recapToday(now: number): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
