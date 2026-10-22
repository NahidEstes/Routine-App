import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { PlannedReminder, ScheduledReminder } from "../domain/reminders";
export const remindersSupported = true;
export type ReminderResponse = {
  identifier: string;
  action: string;
  data: Record<string, unknown>;
};
export async function configureReminders() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("habits", {
      name: "Habit reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  await Notifications.setNotificationCategoryAsync("HABITREMINDER", [
    {
      identifier: "SNOOZE10",
      buttonTitle: "Snooze 10 min",
      options: { opensAppToForeground: true },
    },
  ]);
}
export async function reminderPermission(request = false) {
  const permission = request
    ? await Notifications.requestPermissionsAsync()
    : await Notifications.getPermissionsAsync();
  return (
    permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}
export async function scheduledReminders(): Promise<ScheduledReminder[]> {
  return (await Notifications.getAllScheduledNotificationsAsync())
    .filter((r) => r.identifier.startsWith("routine."))
    .map((r) => ({
      id: r.identifier,
      signature: String(r.content.data?.signature ?? ""),
      snoozed: r.content.data?.snoozed === true,
      entryId: String(r.content.data?.entryId ?? ""),
      date: String(r.content.data?.date ?? ""),
    }));
}
export async function cancelReminder(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}
export async function scheduleReminder(
  value: PlannedReminder,
  snoozed = false,
) {
  await Notifications.scheduleNotificationAsync({
    identifier: value.id,
    content: {
      title: value.name,
      body: "A small step for your day. Tap to view your habit.",
      categoryIdentifier: "HABITREMINDER",
      data: {
        entryId: value.entryId,
        habitId: value.habitId,
        date: value.date,
        signature: value.signature,
        snoozed,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(value.fireAt),
      channelId: "habits",
    },
  });
}
export function observeReminderResponses(
  listener: (response: ReminderResponse) => void,
) {
  const emit = (response: Notifications.NotificationResponse) =>
    listener({
      identifier: response.notification.request.identifier,
      action: response.actionIdentifier,
      data: response.notification.request.content.data ?? {},
    });
  const last = Notifications.getLastNotificationResponse();
  if (last) {
    emit(last);
    Notifications.clearLastNotificationResponse();
  }
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      emit(response);
      Notifications.clearLastNotificationResponse();
    },
  );
  return () => subscription.remove();
}
