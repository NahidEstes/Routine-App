import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import {
  reminderDiff,
  snoozeReminder,
  reminderForEntry,
  reminderPlan,
} from "../domain/reminders";
import { entriesForDate } from "../domain/schedule";
import { addDays, localToday, validDate, validTime } from "../utils/dates";
import {
  cancelReminder,
  configureReminders,
  observeReminderResponses,
  reminderPermission,
  remindersSupported,
  scheduledReminders,
  scheduleReminder,
  type ReminderResponse,
} from "../services/notifications";
import { useLocalFeatures } from "./LocalFeaturesProvider";
import { useTracker } from "./TrackerProvider";
import type { ReminderPreference } from "../storage/localFeatures";

type Reminders = {
  supported: boolean;
  allowed: boolean;
  message: string;
  error: string;
  setReminder: (
    habitId: string,
    preference: ReminderPreference,
  ) => Promise<boolean>;
  refresh: () => Promise<void>;
};
const Context = createContext<Reminders | null>(null);
export function ReminderProvider({ children }: React.PropsWithChildren) {
  const { state, setSelectedDate } = useTracker();
  const { preferences, preferencesReady, preferenceError, updatePreferences } =
    useLocalFeatures();
  const latest = useRef({ state, preferences });
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState(
    remindersSupported
      ? "Choose habits to remind you."
      : "Reminders are available in the Android app. Browser preview does not send notifications.",
  );
  const [error, setError] = useState("");
  const enqueue = useCallback((task: () => Promise<void>) => {
    const pending = queue.current
      .then(task)
      .catch((e) =>
        setError(
          e instanceof Error
            ? e.message
            : "Could not update reminders. Retry from Settings.",
        ),
      );
    queue.current = pending;
    return pending;
  }, []);
  const refresh = useCallback(
    () =>
      enqueue(async () => {
        if (!remindersSupported) return;
        await configureReminders();
        const permitted = await reminderPermission();
        setAllowed(permitted);
        const { state: current, preferences: prefs } = latest.current;
        const enabled = Object.values(prefs.reminders).some(
          (value) => value.enabled,
        );
        let desired = permitted
          ? reminderPlan(current, prefs.reminders, Date.now())
          : [];
        const scheduled = await scheduledReminders();
        let snoozes = 0;
        for (const item of scheduled.filter((item) => item.snoozed)) {
          const match =
            item.date && validDate(item.date)
              ? entriesForDate(current, item.date, localToday()).find(
                  (e) => e.id === item.entryId && e.status === "pending",
                )
              : undefined;
          const preference = match ? prefs.reminders[match.habitId] : undefined;
          if (
            !permitted ||
            !match ||
            !item.date ||
            item.date < addDays(localToday(), -1) ||
            item.date > localToday() ||
            !preference?.enabled ||
            current.habits.find((h) => h.id === match.habitId)?.archivedAt ||
            reminderForEntry(match, preference)?.signature !== item.signature
          )
            await cancelReminder(item.id);
          else snoozes++;
        }
        desired = desired.slice(0, Math.max(0, 60 - snoozes));
        const diff = reminderDiff(desired, scheduled);
        for (const id of diff.cancel) await cancelReminder(id);
        for (const item of diff.schedule) await scheduleReminder(item);
        setMessage(
          !enabled
            ? "Reminders are off. Choose a habit below to enable one."
            : !permitted
              ? "Notifications are blocked. Enable them in your device settings, then tap Refresh reminders."
              : desired.length
                ? `${desired.length} reminders scheduled through ${new Date(desired[desired.length - 1].fireAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Open the app regularly to refresh upcoming reminders.`
                : "No upcoming timed habits to remind you about. Set a reminder time for an Anytime habit.",
        );
        setError("");
      }),
    [enqueue],
  );
  useEffect(() => {
    latest.current = { state, preferences };
    if (preferencesReady && !preferenceError) void refresh();
  }, [state, preferences, preferencesReady, preferenceError, refresh]);
  useEffect(() => {
    if (!preferencesReady || preferenceError || !remindersSupported) return;
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") void refresh();
    });
    const interval = setInterval(() => void refresh(), 60_000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [preferencesReady, preferenceError, refresh]);
  useEffect(() => {
    if (!preferencesReady || preferenceError || !remindersSupported) return;
    const respond = (response: ReminderResponse) => {
      void enqueue(async () => {
        const { state: current, preferences: prefs } = latest.current;
        const { entryId, habitId, date } = response.data;
        if (
          typeof date !== "string" ||
          !validDate(date) ||
          typeof entryId !== "string" ||
          typeof habitId !== "string"
        )
          return;
        const item = entriesForDate(current, date, localToday()).find(
          (e) => e.id === entryId && e.habitId === habitId && !e.excluded,
        );
        if (!item) return;
        if (response.action === "SNOOZE10") {
          const snoozed = snoozeReminder(
            current,
            prefs.reminders,
            response.data,
            Date.now(),
          );
          if (!snoozed) return;
          await cancelReminder(snoozed.id);
          await scheduleReminder(snoozed, true);
          setMessage(`${item.habit.name}: snoozed for 10 minutes.`);
        } else {
          setSelectedDate(date);
          router.push({
            pathname: "/habit-details",
            params: { id: habitId, date, entryId },
          });
        }
      });
    };
    return observeReminderResponses(respond);
  }, [preferencesReady, preferenceError, enqueue, setSelectedDate]);
  return (
    <Context.Provider
      value={{
        supported: remindersSupported,
        allowed,
        message,
        error,
        refresh,
        setReminder: async (habitId, preference) => {
          if (!remindersSupported || !preferencesReady || preferenceError)
            return false;
          if (preference.time !== null && !validTime(preference.time)) {
            setError("Choose a valid reminder time.");
            return false;
          }
          try {
            if (preference.enabled) {
              await configureReminders();
              const permitted = await reminderPermission(true);
              setAllowed(permitted);
              if (!permitted) {
                setError(
                  "Notification permission was not granted. Your habit is still available without reminders.",
                );
                return false;
              }
            }
            return await updatePreferences((previous) => ({
              ...previous,
              reminders: { ...previous.reminders, [habitId]: preference },
            }));
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Reminders need a new app build. Your habits are unchanged.",
            );
            return false;
          }
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useReminders() {
  const value = useContext(Context);
  if (!value) throw new Error("ReminderProvider missing");
  return value;
}
