import type {
  HabitPause,
  HabitFeatures,
  TrackerState,
  WeeklyReview,
} from "../models/types";
import { addDays, validDate, weekDates } from "../utils/dates";

export type PlanningAction =
  | { type: "pauseHabits"; pause: HabitPause }
  | { type: "resumePause"; id: string }
  | {
      type: "organizeHabit";
      habitId: string;
      priority: "high" | "normal" | "low";
      pinned: boolean;
    }
  | { type: "moveHabit"; habitId: string; direction: -1 | 1 }
  | {
      type: "habitFilters";
      value: Partial<
        Pick<HabitFeatures, "sort" | "search" | "priorityFilter" | "typeFilter">
      >;
    }
  | { type: "saveReview"; review: WeeklyReview }
  | { type: "seenAchievements"; ids: string[] }
  | { type: "dismissReview"; week: string };

export function applyPlanningAction(
  state: TrackerState,
  action: PlanningAction,
  today: string,
): TrackerState {
  const f = state.features;
  let next = f;
  switch (action.type) {
    case "pauseHabits": {
      const p = action.pause;
      if (
        !p.id ||
        !validDate(p.start) ||
        !validDate(p.end) ||
        p.start < today ||
        p.end < p.start ||
        p.end > "9999-12-30" ||
        p.reason.length > 200 ||
        !p.habitIds.length ||
        new Set(p.habitIds).size !== p.habitIds.length ||
        p.habitIds.some(
          (id) => !state.habits.some((h) => h.id === id && !h.archivedAt),
        )
      )
        throw new Error(
          "Choose active habits and a valid pause from today or a future day.",
        );
      if (f.pauses.some((x) => x.id === p.id))
        throw new Error("This pause already exists.");
      next = {
        ...f,
        pauses: [
          ...f.pauses,
          { ...p, habitIds: [...p.habitIds], reason: p.reason.trim() },
        ],
      };
      break;
    }
    case "resumePause":
      // Keep elapsed paused dates neutral; remove future coverage only.
      next = {
        ...f,
        pauses: f.pauses.flatMap((p) =>
          p.id !== action.id
            ? [p]
            : p.start < today
              ? [{ ...p, end: p.end < today ? p.end : addDays(today, -1) }]
              : [],
        ),
      };
      break;
    case "organizeHabit":
      if (
        !state.habits.some((h) => h.id === action.habitId) ||
        !["high", "normal", "low"].includes(action.priority) ||
        typeof action.pinned !== "boolean"
      )
        throw new Error("Choose a valid habit priority.");
      next = {
        ...f,
        organization: [
          ...f.organization.filter((o) => o.habitId !== action.habitId),
          {
            habitId: action.habitId,
            priority: action.priority,
            pinned: action.pinned,
          },
        ],
      };
      break;
    case "moveHabit": {
      const order = [
        ...f.order,
        ...state.habits.map((h) => h.id).filter((id) => !f.order.includes(id)),
      ];
      const index = order.indexOf(action.habitId),
        target = index + action.direction;
      if (index >= 0 && target >= 0 && target < order.length)
        [order[index], order[target]] = [order[target], order[index]];
      next = { ...f, order, sort: "custom" };
      break;
    }
    case "habitFilters":
      next = { ...f, ...action.value };
      if (
        !["time", "priority", "custom"].includes(next.sort) ||
        !["all", "high", "normal", "low"].includes(next.priorityFilter) ||
        !["all", "boolean", "count", "duration"].includes(next.typeFilter) ||
        next.search.length > 60
      )
        throw new Error("Choose valid habit filters.");
      break;
    case "saveReview": {
      const r = action.review;
      if (
        !validDate(r.week) ||
        weekDates(r.week)[0] !== r.week ||
        r.week > weekDates(today)[0] ||
        [r.wentWell, r.obstacles, r.change].some((s) => s.length > 2000) ||
        !Number.isFinite(Date.parse(r.updatedAt))
      )
        throw new Error(
          "Choose a current or past week and keep each answer within 2,000 characters.",
        );
      if (
        r.completed &&
        ![r.wentWell, r.obstacles, r.change].every((s) => s.trim())
      )
        throw new Error(
          "Answer all three questions before finishing, or save a draft.",
        );
      next = {
        ...f,
        reviews: [...f.reviews.filter((x) => x.week !== r.week), { ...r }],
      };
      break;
    }
    case "seenAchievements":
      next = {
        ...f,
        seenAchievements: [...new Set([...f.seenAchievements, ...action.ids])],
      };
      break;
    case "dismissReview":
      next = {
        ...f,
        dismissedReviewWeeks: [
          ...new Set([...f.dismissedReviewWeeks, action.week]),
        ],
      };
      break;
  }
  return { ...state, features: next };
}
