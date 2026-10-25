import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ScheduledItem } from "../models/types";
import { createId } from "../utils/id";
import {
  pauseTimer,
  resumeTimer,
  type FocusSession,
} from "../domain/focusTimer";
import {
  defaultPreferences,
  loadFocusSession,
  loadPreferences,
  saveFocusSession,
  savePreferences,
  type LocalPreferences,
} from "../storage/localFeatures";
import { useTracker } from "./TrackerProvider";

type Features = {
  preferences: LocalPreferences;
  preferencesReady: boolean;
  preferenceError: string;
  timer: FocusSession | null;
  timerError: string;
  timerReady: boolean;
  timerBusy: boolean;
  timerPanelOpen: boolean;
  setTimerPanelOpen: (open: boolean) => void;
  timerDockHeight: number;
  setTimerDockHeight: (height: number) => void;
  updatePreferences: (
    change: (previous: LocalPreferences) => LocalPreferences,
  ) => Promise<boolean>;
  startTimer: (item: ScheduledItem, busy: boolean) => Promise<boolean>;
  pause: () => Promise<boolean>;
  resume: () => Promise<boolean>;
  discard: () => Promise<boolean>;
  record: (minutes: number) => Promise<boolean>;
  reload: () => Promise<void>;
};
const Context = createContext<Features | null>(null);
export function LocalFeaturesProvider({ children }: React.PropsWithChildren) {
  const { dispatch, today } = useTracker();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const prefsRef = useRef(preferences);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [preferenceError, setPreferenceError] = useState("");
  const prefsQueue = useRef<Promise<unknown>>(Promise.resolve());
  const [timer, setTimer] = useState<FocusSession | null>(null);
  const timerRef = useRef(timer);
  const [timerReady, setTimerReady] = useState(false);
  const [timerError, setTimerError] = useState("");
  const [timerBusy, setTimerBusy] = useState(false);
  // Presentation only: neither field is persisted or changes timer accounting.
  const [timerPanelOpen, setTimerPanelOpen] = useState(false);
  const [timerDockHeight, setTimerDockHeight] = useState(96);
  const timerLock = useRef(false);
  const reload = useCallback(async () => {
    await Promise.all([
      loadPreferences()
        .then((value) => {
          prefsRef.current = value;
          setPreferences(value);
          setPreferenceError("");
          setPreferencesReady(true);
        })
        .catch((e) =>
          setPreferenceError(String(e instanceof Error ? e.message : e)),
        ),
      loadFocusSession()
        .then((value) => {
          timerRef.current = value;
          setTimer(value);
          setTimerError("");
          setTimerReady(true);
        })
        .catch((e) =>
          setTimerError(String(e instanceof Error ? e.message : e)),
        ),
    ]);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);

  const updatePreferences = (
    change: (previous: LocalPreferences) => LocalPreferences,
  ) => {
    const task = prefsQueue.current.then(async () => {
      try {
        if (!preferencesReady || preferenceError)
          throw new Error("Retry loading preferences before making changes.");
        const next = change(prefsRef.current);
        await savePreferences(next);
        prefsRef.current = next;
        setPreferences(next);
        setPreferenceError("");
        return true;
      } catch (e) {
        setPreferenceError(
          e instanceof Error ? e.message : "Could not save preferences.",
        );
        return false;
      }
    });
    prefsQueue.current = task;
    return task;
  };
  async function mutateTimer(
    change: (current: FocusSession | null) => FocusSession | null,
  ) {
    if (timerLock.current) return false;
    timerLock.current = true;
    setTimerBusy(true);
    try {
      if (!timerReady) throw new Error("Retry loading the saved timer first.");
      const next = change(timerRef.current);
      await saveFocusSession(next);
      timerRef.current = next;
      setTimer(next);
      setTimerError("");
      return true;
    } catch (e) {
      setTimerError(
        e instanceof Error ? e.message : "Could not save your timer.",
      );
      return false;
    } finally {
      timerLock.current = false;
      setTimerBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        preferences,
        preferencesReady,
        preferenceError,
        timer,
        timerError,
        timerReady,
        timerPanelOpen,
        setTimerPanelOpen,
        timerDockHeight,
        setTimerDockHeight,
        timerBusy,
        updatePreferences,
        reload,
        startTimer: (item, busy) =>
          mutateTimer((current) => {
            if (current)
              throw new Error(
                "A focus timer is already open. Finish or discard it before starting another.",
              );
            if (
              item.date !== today ||
              item.status !== "pending" ||
              item.habit.goal.type !== "duration"
            )
              throw new Error(
                "Start a timer for a pending duration habit scheduled today.",
              );
            return {
              id: createId("focus"),
              entryId: item.id,
              habitId: item.habitId,
              date: item.date,
              name: item.habit.name,
              elapsedMs: 0,
              runningSince: Date.now(),
              busy,
            };
          }),
        pause: () =>
          mutateTimer((current) =>
            current ? pauseTimer(current, Date.now()) : null,
          ),
        resume: () =>
          mutateTimer((current) =>
            current ? resumeTimer(current, Date.now()) : null,
          ),
        discard: () => mutateTimer(() => null),
        record: async (minutes) => {
          if (timerLock.current || !timerRef.current) return false;
          timerLock.current = true;
          setTimerBusy(true);
          const session = timerRef.current;
          try {
            if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440)
              throw new Error("Enter minutes between 0 and 1,440.");
            const success = await dispatch({
              type: "timerAmount",
              id: session.entryId,
              habitId: session.habitId,
              date: session.date,
              delta: minutes,
              busy: session.busy,
              sessionId: session.id,
            });
            if (!success) return false;
            // If clearing fails after the transaction, its receipt prevents a second credit.
            await saveFocusSession(null);
            timerRef.current = null;
            setTimer(null);
            setTimerError("");
            return true;
          } catch (e) {
            setTimerError(
              e instanceof Error
                ? e.message
                : "Could not save your focus session.",
            );
            return false;
          } finally {
            timerLock.current = false;
            setTimerBusy(false);
          }
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLocalFeatures() {
  const value = useContext(Context);
  if (!value) throw new Error("LocalFeaturesProvider missing");
  return value;
}
