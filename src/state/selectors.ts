import type { DemoState, ScheduledItem } from "../models/types";
import { addDays, DEMO_TODAY } from "../utils/dates";

export function itemsForDate(state: DemoState, date: string): ScheduledItem[] {
  return state.occurrences
    .filter((o) => o.date === date)
    .flatMap((o) => {
      const habit = state.habits.find((h) => h.id === o.habitId);
      return habit ? [{ ...o, habit }] : [];
    })
    .sort((a, b) => (a.time ?? "24:00").localeCompare(b.time ?? "24:00"));
}
export function completion(state: DemoState, dates: string[]) {
  const items = state.occurrences.filter((o) => dates.includes(o.date));
  const done = items.filter((o) => o.status === "done").length;
  return {
    done,
    total: items.length,
    percent: items.length ? Math.round((done / items.length) * 100) : 0,
  };
}
export function bestStreak(state: DemoState) {
  const dates = [
    ...new Set(
      state.occurrences.filter((o) => o.date <= DEMO_TODAY).map((o) => o.date),
    ),
  ].sort();
  let best = 0,
    run = 0;
  let previous: string | null = null;
  for (const date of dates) {
    if (previous && addDays(previous, 1) !== date) run = 0;
    run = state.occurrences.some((o) => o.date === date && o.status === "done")
      ? run + 1
      : 0;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}
