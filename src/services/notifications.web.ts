import type { PlannedReminder, ScheduledReminder } from "../domain/reminders";
import type { ReminderResponse } from "./notifications";
export const remindersSupported = false;
export async function configureReminders() {}
export async function reminderPermission(_request = false) {
  return false;
}
export async function scheduledReminders(): Promise<ScheduledReminder[]> {
  return [];
}
export async function cancelReminder(_id: string) {}
export async function scheduleReminder(
  _value: PlannedReminder,
  _snoozed = false,
) {}
export function observeReminderResponses(
  _listener: (response: ReminderResponse) => void,
) {
  return () => {};
}
