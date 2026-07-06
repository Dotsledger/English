import type { Box } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

/** Days until the next review for each Leitner box (index = box - 1). */
export const BOX_INTERVALS_DAYS = [1, 3, 7, 16, 35] as const;

export function intervalForBox(box: Box): number {
  return BOX_INTERVALS_DAYS[box - 1] * DAY;
}
