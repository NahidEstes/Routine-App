import type { Habit, ScheduledItem, TrackerState } from "../models/types";
import type { Action } from "../domain/actions";
import { DAY_NAMES, validDate, validTime } from "../utils/dates";

export function splitDay(items: ScheduledItem[]) {
  return {
    pending: items.filter((i) => i.status === "pending"),
    completed: items.filter((i) => i.status === "done"),
    skipped: items.filter((i) => i.status === "skipped"),
  };
}
export function agendaGroups(items: ScheduledItem[]) {
  return [
    {
      title: "Morning",
      items: items.filter((i) => i.time && i.time < "12:00"),
    },
    {
      title: "Afternoon",
      items: items.filter(
        (i) => i.time && i.time >= "12:00" && i.time < "17:00",
      ),
    },
    {
      title: "Evening",
      items: items.filter((i) => i.time && i.time >= "17:00"),
    },
    { title: "Anytime", items: items.filter((i) => !i.time) },
  ].filter((g) => g.items.length);
}
export function repeatLabel(habit: Habit) {
  return habit.repeat.type === "daily"
    ? "Every day"
    : habit.repeat.type === "weekly"
      ? `${habit.repeat.target} days per week`
      : [1, 2, 3, 4, 5, 6, 0]
          .filter((d) => habit.repeat.days.includes(d))
          .map((d) => DAY_NAMES[d])
          .join(", ");
}
export function entryAccess(
  item: ScheduledItem,
  state: TrackerState,
  today: string,
) {
  const archived = !!state.habits.find((h) => h.id === item.habitId)
    ?.archivedAt;
  const hasNote = state.notes.some((n) => n.entryId === item.id);
  return {
    archived,
    hasNote,
    future: item.date > today,
    record: item.date <= today && !item.excluded && !item.paused,
    note: hasNote || (item.date <= today && !item.excluded),
    reschedule:
      !archived &&
      !item.paused &&
      !item.excluded &&
      item.status === "pending" &&
      item.amount === 0,
    edit: !archived,
  };
}
export function entryTarget(item: ScheduledItem, busy: boolean) {
  return item.amount > 0 || item.status === "done"
    ? item.target
    : busy && item.habit.busyGoal !== null
      ? item.habit.busyGoal
      : item.habit.goal.value;
}
export function entryStatus(item: ScheduledItem, today: string) {
  if (item.paused) return "Paused · Recorded history preserved";
  if (item.status === "done")
    return item.busy ? "Completed · Busy goal" : "Completed";
  if (item.status === "skipped") return "Skipped";
  if (item.date > today) return "Upcoming";
  if (item.displayStatus === "missed")
    return item.amount > 0 ? "Missed · Partial progress" : "Missed";
  if (item.amount > 0) return "In progress";
  return item.optional ? "Flexible weekly goal" : "Pending";
}
/** Undo restores the actual prior amount/mode, including a partial or over-goal record. */
export function previousProgressAction(item: ScheduledItem): Action {
  const base = { id: item.id, habitId: item.habitId, date: item.date };
  return item.status === "skipped"
    ? { type: "status", ...base, status: "skipped", busy: false }
    : { type: "amount", ...base, amount: item.amount, busy: item.busy };
}

export type HabitDraft = {
  name: string;
  goalType: Habit["goal"]["type"];
  amount: string;
  unit: string;
  repeat: Habit["repeat"]["type"];
  days: number[];
  weeklyGoal: string;
  time: string;
  schedule: "time" | "anytime";
  busyEnabled: boolean;
  busyAmount: string;
  startDate: string;
};
export type FormKey =
  | "name"
  | "amount"
  | "unit"
  | "repeat"
  | "time"
  | "startDate"
  | "busyAmount";
export function validateHabitDraft(
  d: HabitDraft,
): Partial<Record<FormKey, string>> {
  const errors: Partial<Record<FormKey, string>> = {};
  if (!d.name.trim()) errors.name = "Give your habit a name.";
  const value = d.goalType === "boolean" ? 1 : Number(d.amount);
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    (d.goalType === "count" && !Number.isInteger(value))
  )
    errors.amount = "Enter a positive goal; counts use whole numbers.";
  if (d.goalType === "count" && !d.unit.trim())
    errors.unit = "What are you counting? Add a unit.";
  if (d.repeat === "days" && !d.days.length)
    errors.repeat = "Choose at least one day.";
  if (
    d.repeat === "weekly" &&
    (!Number.isInteger(Number(d.weeklyGoal)) ||
      Number(d.weeklyGoal) < 1 ||
      Number(d.weeklyGoal) > 7)
  )
    errors.repeat = "Choose 1–7 days per week.";
  if (d.schedule === "time" && !validTime(d.time))
    errors.time = "Choose a time.";
  if (!validDate(d.startDate)) errors.startDate = "Choose a valid start date.";
  const busy = d.goalType === "boolean" ? 1 : Number(d.busyAmount);
  if (
    d.busyEnabled &&
    (!Number.isFinite(busy) ||
      busy <= 0 ||
      busy > value ||
      (d.goalType === "count" && !Number.isInteger(busy)))
  )
    errors.busyAmount =
      "Use a positive busy goal no larger than the full goal.";
  return errors;
}
