import type { ScheduledItem } from "../models/types";

/** Operates on the already filtered display list, without changing its custom ordering. */
export function selectDayFocus(
  items: ScheduledItem[],
  date: string,
  today: string,
  time: string,
  timerEntryId?: string,
) {
  if (date !== today) return undefined;
  const pending = items.filter(
    (item) =>
      item.date === today &&
      item.status === "pending" &&
      !item.paused &&
      !item.weekly &&
      !item.excluded &&
      !item.habit.archivedAt,
  );
  const running = pending.find((item) => item.id === timerEntryId);
  if (running) return running;
  const upcoming = pending.filter((item) => item.time && item.time >= time);
  // Stable sorting retains the user's display order for ties.
  return upcoming.sort((a, b) => a.time!.localeCompare(b.time!))[0];
}

export function timelineOrder(items: ScheduledItem[]) {
  return [...items].sort((a, b) => {
    if (!a.time) return b.time ? 1 : 0;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}
