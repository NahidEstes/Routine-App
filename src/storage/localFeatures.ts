import Storage from "expo-sqlite/kv-store";
import type { FocusSession } from "../domain/focusTimer";
import { validDate, validTime } from "../utils/dates";
import { validateProfile, type LocalProfile } from "../domain/profile";

export type ReminderPreference = { enabled: boolean; time: string | null };
export type LocalPreferences = {
  version: 1;
  onboardingSeen: boolean;
  reminders: Record<string, ReminderPreference>;
  profile?: LocalProfile;
};
export const defaultPreferences: LocalPreferences = {
  version: 1,
  onboardingSeen: false,
  reminders: {},
};
const PREFS_KEY = "routine.local-preferences.v1";
const TIMER_KEY = "routine.focus-timer.v1";
export async function loadPreferences(): Promise<LocalPreferences> {
  const raw = await Storage.getItem(PREFS_KEY);
  if (raw === null) return { ...defaultPreferences, reminders: {} };
  const value = JSON.parse(raw) as LocalPreferences;
  if (
    value?.version !== 1 ||
    typeof value.onboardingSeen !== "boolean" ||
    !value.reminders ||
    typeof value.reminders !== "object" ||
    Array.isArray(value.reminders) ||
    Object.values(value.reminders).some(
      (p) =>
        !p ||
        typeof p.enabled !== "boolean" ||
        (p.time !== null && !validTime(p.time)),
    )
  )
    throw new Error(
      "Could not read your local preferences. Retry loading; your saved habits are unchanged.",
    );
  if (value.profile !== undefined)
    return { ...value, profile: validateProfile(value.profile) };
  return value;
}
export async function savePreferences(value: LocalPreferences) {
  if (value.profile !== undefined) validateProfile(value.profile);
  await Storage.setItem(PREFS_KEY, JSON.stringify(value));
}
export async function loadFocusSession(): Promise<FocusSession | null> {
  const raw = await Storage.getItem(TIMER_KEY);
  if (raw === null) return null;
  const value = JSON.parse(raw) as FocusSession;
  if (
    !value ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.entryId !== "string" ||
    typeof value.habitId !== "string" ||
    typeof value.name !== "string" ||
    !validDate(value.date) ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    (value.runningSince !== null &&
      (!Number.isFinite(value.runningSince) || value.runningSince <= 0)) ||
    typeof value.busy !== "boolean"
  )
    throw new Error(
      "Could not read the saved focus timer. Your habit progress is unchanged.",
    );
  return value;
}
export async function saveFocusSession(value: FocusSession | null) {
  if (value) await Storage.setItem(TIMER_KEY, JSON.stringify(value));
  else await Storage.removeItem(TIMER_KEY);
}
