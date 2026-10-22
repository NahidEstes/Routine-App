import type {
  Entry,
  Habit,
  HabitVersion,
  ScheduledItem,
  TrackerState,
  WeeklyPlan,
} from "../models/types";
import {
  addDays,
  datesBetween,
  localToday,
  parseDate,
  weekDates,
} from "../utils/dates";
import { clone } from "../utils/clone";
import { defaultFeatures, isPaused } from "./organization";

export function emptyState(): TrackerState {
  return {
    features: defaultFeatures(),
    habits: [],
    versions: [],
    occurrences: [],
    routines: [],
    weeklyPlans: [],
    sessions: [],
    busyDates: [],
    notes: [],
  };
}
export function versionAt(
  state: TrackerState,
  id: string,
  date: string,
): HabitVersion | undefined {
  return state.versions
    .filter((v) => v.habitId === id && v.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}
export function activeOn(habit: Habit, date: string) {
  return (
    date >= habit.createdAt && (!habit.archivedAt || date < habit.archivedAt)
  );
}
export function plannedEntry(
  state: TrackerState,
  id: string,
  date: string,
): Entry | undefined {
  const current = state.habits.find((h) => h.id === id),
    version = versionAt(state, id, date);
  if (
    !current ||
    !version ||
    !activeOn(current, date) ||
    date < version.startDate
  )
    return;
  const h = version.habit;
  if (
    h.repeat.type === "days" &&
    !h.repeat.days.includes(parseDate(date).getDay())
  )
    return;
  return {
    id: `${id}:${date}`,
    habitId: id,
    sourceDate: date,
    date,
    time: h.time,
    status: "pending",
    snapshot: clone(h),
    amount: 0,
    busy: false,
    target: h.goal.value,
    excluded: false,
    rescheduled: false,
    weekly: h.repeat.type === "weekly",
  };
}
export function weeklyPlan(
  state: TrackerState,
  id: string,
  week: string,
): WeeklyPlan | undefined {
  const saved = state.weeklyPlans.find((p) => p.id === `${id}:${week}`);
  const eligible = weekDates(week)
    .map((date) => plannedEntry(state, id, date))
    .filter((e): e is Entry => !!e && e.weekly);
  if (!eligible.length && !saved) return;
  const snapshot = saved?.snapshot ?? eligible[0].snapshot;
  const base = saved ?? {
    id: `${id}:${week}`,
    habitId: id,
    week,
    target: Math.min(snapshot.repeat.target, eligible.length),
    snapshot,
  };
  const activeDays = eligible.filter(
    (e) => !isPaused(state, id, e.date),
  ).length;
  const pausedDays = eligible.length - activeDays;
  if (!pausedDays) return base;
  // Freeze the original commitment; derive a rounded-up proportional target.
  // Recorded credits remain valid even if their date is later paused.
  const target = Math.max(
    weeklyCompleted(state, base),
    Math.ceil((base.target * activeDays) / eligible.length),
  );
  return { ...base, target: Math.min(base.target, target) };
}
export function weeklyCompleted(state: TrackerState, plan: WeeklyPlan) {
  return new Set(
    state.occurrences
      .filter(
        (e) =>
          !e.excluded &&
          e.weekly &&
          e.habitId === plan.habitId &&
          e.status === "done" &&
          weekDates(e.date)[0] === plan.week,
      )
      .map((e) => e.date),
  ).size;
}
export function entriesForDate(
  state: TrackerState,
  date: string,
  today = localToday(),
): ScheduledItem[] {
  const saved = state.occurrences.filter((e) => e.date === date && !e.excluded);
  const result: Entry[] = [...saved];
  for (const habit of state.habits) {
    if (result.some((e) => e.habitId === habit.id)) continue;
    const planned = plannedEntry(state, habit.id, date);
    if (!planned || state.occurrences.some((e) => e.id === planned.id))
      continue;
    if (planned.weekly) {
      const plan = weeklyPlan(state, habit.id, weekDates(date)[0]);
      if (date < today || !plan || weeklyCompleted(state, plan) >= plan.target)
        continue;
    }
    result.push(planned);
  }
  return result
    .filter(
      (e) =>
        !isPaused(state, e.habitId, date) ||
        e.amount > 0 ||
        e.status !== "pending" ||
        state.notes.some((n) => n.entryId === e.id),
    )
    .map(
      (e): ScheduledItem => ({
        ...e,
        habit: e.snapshot,
        paused: isPaused(state, e.habitId, date),
        optional: e.weekly && !state.occurrences.some((o) => o.id === e.id),
        displayStatus:
          e.status === "pending" &&
          date < today &&
          !e.weekly &&
          !isPaused(state, e.habitId, date)
            ? "missed"
            : e.status,
      }),
    )
    .sort((a, b) => (a.time ?? "24:00").localeCompare(b.time ?? "24:00"));
}
// Persist historical snapshots before editing rules or advancing the local date.
export function materialize(state: TrackerState, today: string): TrackerState {
  const next = {
    ...state,
    occurrences: [...state.occurrences],
    weeklyPlans: [...state.weeklyPlans],
  };
  const ids = new Set(next.occurrences.map((e) => e.id));
  const dailyIds = new Set(
    next.occurrences.filter((e) => !e.weekly).map((e) => e.id),
  );
  const occupiedDays = new Set(
    next.occurrences
      .filter((e) => !e.excluded)
      .map((e) => `${e.habitId}:${e.date}`),
  );
  const plans = new Set(next.weeklyPlans.map((p) => p.id));
  for (const h of state.habits) {
    for (const date of datesBetween(h.createdAt, today)) {
      if (dailyIds.has(`${h.id}:${date}`)) continue;
      const entry = plannedEntry(next, h.id, date);
      if (!entry) continue;
      if (!entry.weekly && !ids.has(entry.id)) {
        const occupied = occupiedDays.has(`${h.id}:${date}`);
        next.occurrences.push(occupied ? { ...entry, excluded: true } : entry);
        if (!occupied) occupiedDays.add(`${h.id}:${date}`);
        ids.add(entry.id);
      }
      if (entry.weekly) {
        const week = weekDates(date)[0];
        // Store the unadjusted commitment; pause adjustments are derived at read time.
        const plan = weeklyPlan(
          { ...next, features: { ...next.features, pauses: [] } },
          h.id,
          week,
        );
        if (plan && !plans.has(plan.id)) {
          next.weeklyPlans.push(plan);
          plans.add(plan.id);
        }
      }
    }
  }
  return next;
}
export function nextMonday(today: string) {
  return addDays(weekDates(today)[0], 7);
}
