import type { ScheduledItem, TrackerState } from "../models/types";
import { entriesForDate } from "./schedule";
import { addDays, dateKey, parseDate, validDate } from "../utils/dates";
import type { ReminderPreference } from "../storage/localFeatures";

export type PlannedReminder = {
  id: string;
  entryId: string;
  habitId: string;
  date: string;
  fireAt: number;
  name: string;
  signature: string;
};
export function reminderForEntry(
  item: ScheduledItem,
  preference: ReminderPreference,
): PlannedReminder | null {
  if (
    !preference.enabled ||
    item.status !== "pending" ||
    item.optional ||
    item.paused
  )
    return null;
  const time = preference.time ?? item.time;
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  const at = parseDate(item.date);
  at.setHours(hours, minutes, 0, 0);
  return {
    id: `routine.reminder.${item.id}`,
    entryId: item.id,
    habitId: item.habitId,
    date: item.date,
    fireAt: at.getTime(),
    name: item.habit.name,
    signature: JSON.stringify([
      item.id,
      item.date,
      at.getTime(),
      item.habit.name,
    ]),
  };
}
export function reminderPlan(
  state: TrackerState,
  preferences: Record<string, ReminderPreference>,
  now: number,
): PlannedReminder[] {
  const today = dateKey(new Date(now));
  const result: PlannedReminder[] = [];
  for (let offset = 0; offset < 30; offset++) {
    const date = addDays(today, offset);
    for (const item of entriesForDate(state, date, today)) {
      const preference = preferences[item.habitId];
      if (
        !preference?.enabled ||
        state.habits.find((h) => h.id === item.habitId)?.archivedAt ||
        item.status !== "pending" ||
        item.optional
      )
        continue;
      const planned = reminderForEntry(item, preference);
      if (planned && planned.fireAt > now) result.push(planned);
    }
  }
  return result
    .sort((a, b) => a.fireAt - b.fireAt || a.id.localeCompare(b.id))
    .slice(0, 60);
}
export type ScheduledReminder = {
  id: string;
  signature: string;
  snoozed?: boolean;
  entryId?: string;
  date?: string;
};
export function snoozeReminder(
  state: TrackerState,
  preferences: Record<string, ReminderPreference>,
  data: Record<string, unknown>,
  now: number,
): PlannedReminder | null {
  const today = dateKey(new Date(now));
  if (
    typeof data.date !== "string" ||
    !validDate(data.date) ||
    data.date > today ||
    data.date < addDays(today, -1) ||
    typeof data.entryId !== "string" ||
    typeof data.habitId !== "string"
  )
    return null;
  const item = entriesForDate(state, data.date, today).find(
    (entry) =>
      entry.id === data.entryId &&
      entry.habitId === data.habitId &&
      !entry.excluded,
  );
  const preference = preferences[String(data.habitId)];
  if (
    !item ||
    !preference?.enabled ||
    state.habits.find((h) => h.id === item.habitId)?.archivedAt
  )
    return null;
  const planned = reminderForEntry(item, preference);
  if (!planned || planned.signature !== data.signature) return null;
  return {
    ...planned,
    id: `routine.snooze.${item.id}`,
    fireAt: now + 10 * 60_000,
  };
}
export function reminderDiff(
  desired: PlannedReminder[],
  scheduled: ScheduledReminder[],
) {
  const existing = new Map(scheduled.map((value) => [value.id, value]));
  const wanted = new Map(desired.map((value) => [value.id, value]));
  return {
    cancel: scheduled
      .filter(
        (value) =>
          !value.snoozed &&
          (!wanted.has(value.id) ||
            wanted.get(value.id)!.signature !== value.signature),
      )
      .map((value) => value.id),
    schedule: desired.filter(
      (value) => existing.get(value.id)?.signature !== value.signature,
    ),
  };
}
