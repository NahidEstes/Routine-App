import type { TrackerState } from "../models/types";
import { completion, itemsForDate } from "./progress";
import { addDays, dateKey, parseDate } from "../utils/dates";

export function progressInsights(
  state: TrackerState,
  dates: string[],
  period: "week" | "month",
  today: string,
) {
  const currentDates = dates.filter((date) => date <= today);
  let compareCurrent = currentDates;
  let previousDates: string[] = [];
  if (currentDates.length) {
    if (period === "week")
      previousDates = currentDates.map((date) => addDays(date, -7));
    else {
      const first = parseDate(currentDates[0]);
      const previousStart = new Date(
        first.getFullYear(),
        first.getMonth() - 1,
        1,
        12,
      );
      const previousDays = new Date(
        first.getFullYear(),
        first.getMonth(),
        0,
      ).getDate();
      compareCurrent = currentDates.slice(0, previousDays);
      previousDates = compareCurrent.map((_, index) =>
        addDays(dateKey(previousStart), index),
      );
    }
  }
  const current = completion(state, compareCurrent, today);
  const previous = completion(state, previousDates, today);
  const periodItems = currentDates
    .flatMap((date) => itemsForDate(state, date, today))
    .filter((item) => !item.weekly && !item.paused);
  const ranked = state.habits
    .map((habit) => {
      const items = periodItems.filter((item) => item.habitId === habit.id);
      const done = items.filter((item) => item.status === "done").length;
      return {
        name: habit.name,
        total: items.length,
        done,
        percent: items.length ? Math.round((done / items.length) * 100) : 0,
      };
    })
    .filter((value) => value.total >= 3 && value.done > 0)
    .sort(
      (a, b) =>
        b.percent - a.percent ||
        b.total - a.total ||
        a.name.localeCompare(b.name),
    );
  return {
    mostConsistent: ranked[0] ?? null,
    comparable: current.total > 0 && previous.total > 0,
    difference: current.percent - previous.percent,
    comparisonDays: compareCurrent.length,
    current,
    previous,
  };
}
