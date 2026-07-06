/** Local-timezone date helpers (UTC would flip days for evening sessions). */

export function localIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** ISO date of the Monday of this date's week — the weekly mission key. */
export function mondayOfWeek(date: Date = new Date()): string {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return localIsoDate(copy);
}

/** ISO dates (local) of the current week, Monday through Sunday. */
export function datesOfWeek(date: Date = new Date()): string[] {
  const monday = new Date(mondayOfWeek(date) + "T00:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return localIsoDate(d);
  });
}
