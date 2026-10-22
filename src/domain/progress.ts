import type { TrackerState } from "../models/types";
import {
  entriesForDate,
  plannedEntry,
  weeklyCompleted,
  weeklyPlan,
} from "./schedule";
import { isPaused } from "./organization";
import { datesBetween, localToday, weekDates } from "../utils/dates";
export const itemsForDate = entriesForDate;
export function completion(
  state: TrackerState,
  dates: string[],
  today = localToday(),
) {
  const items = dates
    .filter((d) => d <= today)
    .flatMap((d) => entriesForDate(state, d, today))
    .filter((e) => !e.weekly && !e.paused);
  const done = items.filter((e) => e.status === "done").length;
  return {
    done,
    total: items.length,
    percent: items.length ? Math.round((done / items.length) * 100) : 0,
    skipped: items.filter((e) => e.status === "skipped").length,
    missed: items.filter((e) => e.displayStatus === "missed").length,
    busy: items.filter((e) => e.status === "done" && e.busy).length,
  };
}
export function periodWeeklyPlans(
  state: TrackerState,
  dates: string[],
  today = localToday(),
) {
  const weeks = [
    ...new Set(dates.filter((d) => d <= today).map((d) => weekDates(d)[0])),
  ];
  return state.habits.flatMap((h) =>
    weeks.flatMap((w) => {
      const p = weeklyPlan(state, h.id, w);
      return p
        ? [
            {
              ...p,
              done: Math.min(p.target, weeklyCompleted(state, p)),
              skipped: state.occurrences.filter(
                (e) =>
                  e.habitId === h.id &&
                  e.weekly &&
                  !e.excluded &&
                  e.status === "skipped" &&
                  weekDates(e.date)[0] === w,
              ).length,
              closed: weekDates(w)[6] < today,
            },
          ]
        : [];
    }),
  );
}
export function habitConsistency(
  state: TrackerState,
  id: string,
  dates: string[],
  today = localToday(),
) {
  const daily = dates
    .filter((d) => d <= today)
    .flatMap((d) => entriesForDate(state, d, today))
    .filter((e) => e.habitId === id && !e.weekly && !e.paused);
  const plans = periodWeeklyPlans(state, dates, today).filter(
    (p) => p.habitId === id,
  );
  const done =
    daily.filter((e) => e.status === "done").length +
    plans.reduce((sum, p) => sum + p.done, 0);
  const total = daily.length + plans.reduce((sum, p) => sum + p.target, 0);
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}
export function bestStreak(state: TrackerState, today = localToday()) {
  let best = 0;
  for (const h of state.habits) {
    let run = 0;
    for (const date of datesBetween(h.createdAt, today)) {
      const item = entriesForDate(state, date, today).find(
        (e) => e.habitId === h.id && !e.weekly,
      );
      if (!item || item.paused) continue;
      if (item.status === "done") run++;
      else if (date < today || item.status === "skipped") run = 0;
      best = Math.max(best, run);
    }
  }
  return best;
}
export function weeklyStreak(
  state: TrackerState,
  id: string,
  today = localToday(),
) {
  let best = 0,
    run = 0;
  for (const saved of state.weeklyPlans
    .filter((p) => p.habitId === id)
    .sort((a, b) => a.week.localeCompare(b.week))) {
    const p = weeklyPlan(state, id, saved.week)!;
    const eligibleDays = weekDates(p.week).filter(
      (date) => plannedEntry(state, id, date)?.weekly,
    );
    if (
      !p.target ||
      (eligibleDays.length > 0 &&
        eligibleDays.every((date) => isPaused(state, id, date)))
    )
      continue;
    if (weeklyCompleted(state, p) >= p.target) run++;
    else if (weekDates(p.week)[6] < today) run = 0;
    best = Math.max(best, run);
  }
  return best;
}
