import type { TrackerState } from "../models/types";
import { addDays, weekDates } from "../utils/dates";
export function reviewPromptWeek(state: TrackerState, today: string) {
  const week = addDays(weekDates(today)[0], -7);
  const hasActivity =
    state.occurrences.some(
      (e) => !e.excluded && e.date >= week && e.date <= addDays(week, 6),
    ) ||
    state.sessions.some((s) => s.date >= week && s.date <= addDays(week, 6));
  return hasActivity &&
    !state.features.reviews.some((r) => r.week === week && r.completed) &&
    !state.features.dismissedReviewWeeks.includes(week)
    ? week
    : null;
}
