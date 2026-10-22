import type { Habit, HabitFeatures, TrackerState } from "../models/types";

export function defaultFeatures(): HabitFeatures {
  return {
    pauses: [],
    organization: [],
    order: [],
    sort: "time",
    search: "",
    priorityFilter: "all",
    typeFilter: "all",
    reviews: [],
    seenAchievements: [],
    dismissedReviewWeeks: [],
  };
}
export function isPaused(state: TrackerState, habitId: string, date: string) {
  return state.features.pauses.some(
    (p) => p.habitIds.includes(habitId) && p.start <= date && date <= p.end,
  );
}
export function organizationFor(state: TrackerState, habitId: string) {
  return (
    state.features.organization.find((p) => p.habitId === habitId) ?? {
      habitId,
      priority: "normal" as const,
      pinned: false,
    }
  );
}
export function matchesHabit(state: TrackerState, habit: Habit) {
  const f = state.features;
  return (
    habit.name.toLowerCase().includes(f.search.trim().toLowerCase()) &&
    (f.priorityFilter === "all" ||
      organizationFor(state, habit.id).priority === f.priorityFilter) &&
    (f.typeFilter === "all" || habit.goal.type === f.typeFilter)
  );
}
export function sortHabits<T>(
  state: TrackerState,
  items: T[],
  habitId: (item: T) => string,
  time: (item: T) => string | null,
): T[] {
  const ranks = { high: 0, normal: 1, low: 2 };
  const order = new Map(state.features.order.map((id, index) => [id, index]));
  const fallback = new Map(state.habits.map((h, index) => [h.id, index]));
  return [...items].sort((a, b) => {
    const aid = habitId(a),
      bid = habitId(b);
    const ao = organizationFor(state, aid),
      bo = organizationFor(state, bid);
    const pinned = Number(bo.pinned) - Number(ao.pinned);
    if (pinned) return pinned;
    const custom =
      (order.get(aid) ??
        state.features.order.length + (fallback.get(aid) ?? 0)) -
      (order.get(bid) ??
        state.features.order.length + (fallback.get(bid) ?? 0));
    if (state.features.sort === "custom")
      return custom || aid.localeCompare(bid);
    if (state.features.sort === "priority") {
      const priority = ranks[ao.priority] - ranks[bo.priority];
      if (priority) return priority;
    }
    return (
      (time(a) ?? "24:00").localeCompare(time(b) ?? "24:00") ||
      custom ||
      aid.localeCompare(bid)
    );
  });
}
