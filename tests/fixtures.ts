import type { Habit, TrackerState } from "../src/models/types";
import { applyAction } from "../src/domain/actions";
import { emptyState } from "../src/domain/schedule";
export const TODAY = "2026-10-14";
export function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "read",
    name: "Read",
    icon: "book-outline",
    category: "Learning",
    goal: { type: "duration", value: 15, unit: "min" },
    busyGoal: 5,
    repeat: { type: "daily", days: [0, 1, 2, 3, 4, 5, 6], target: 7 },
    time: "08:00",
    createdAt: "2026-10-12",
    ...overrides,
  };
}
export function seeded(overrides: Partial<Habit> = {}): TrackerState {
  return applyAction(
    emptyState(),
    { type: "saveHabit", habit: habit(overrides) },
    TODAY,
  );
}
export function mark(
  state: TrackerState,
  date: string,
  status: "done" | "pending" | "skipped" = "done",
  busy = false,
  today = TODAY,
) {
  return applyAction(
    state,
    { type: "status", id: `read:${date}`, habitId: "read", date, status, busy },
    today,
  );
}
