import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { TrackerState } from "../models/types";
import { emptyState, materialize } from "../domain/schedule";
import { applyAction, type Action } from "../domain/actions";
import { localToday } from "../utils/dates";
import { openRepository } from "../storage/open";
import type { TrackerRepository } from "../storage/repository";
import { colors, ui } from "../theme";

type ContextValue = {
  state: TrackerState;
  dispatch: (action: Action) => Promise<boolean>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  today: string;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  saving: boolean;
  error: string;
};
const Context = createContext<ContextValue | null>(null);
export function TrackerProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState(emptyState);
  const current = useRef(state);
  const repo = useRef<TrackerRepository | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState(localToday),
    [selectedDate, setSelectedDate] = useState(localToday);
  const load = useCallback(async () => {
    try {
      const storage = await openRepository();
      const stored = await storage.load();
      const next = materialize(stored, localToday());
      if (JSON.stringify(next) !== JSON.stringify(stored))
        await storage.save(next);
      repo.current = storage;
      current.current = next;
      setState(next);
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open local data.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
    if (__DEV__ && process.env.EXPO_PUBLIC_STORAGE_CHECK === "1") {
      void import("../validation/nativeStorageCheck")
        .then(({ nativeStorageCheck }) => nativeStorageCheck())
        .catch((e) => console.error("STEADY_SQLITE_CHECK_FAIL", e));
    }
  }, [load]);
  const dispatch = useCallback((action: Action) => {
    const run = async () => {
      setSaving(true);
      try {
        if (!repo.current)
          throw new Error("Storage is unavailable. Retry loading first.");
        const next = applyAction(current.current, action, localToday());
        await repo.current.save(next);
        current.current = next;
        setState(next);
        setError("");
        return true;
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Could not save. Your previous data is unchanged.",
        );
        return false;
      } finally {
        setSaving(false);
      }
    };
    const result = queue.current.then(run, run);
    queue.current = result;
    return result;
  }, []);
  useEffect(() => {
    const refresh = () => {
      const now = localToday();
      if (now !== today) {
        setToday(now);
        setSelectedDate((previous) => (previous === today ? now : previous));
        if (repo.current)
          void dispatch({
            type: "busy",
            date: now,
            value: current.current.busyDates.includes(now),
          });
      }
    };
    const listener = AppState.addEventListener("change", (status) => {
      if (status === "active") refresh();
    });
    const timer = setInterval(refresh, 30000);
    return () => {
      listener.remove();
      clearInterval(timer);
    };
  }, [today, dispatch]);
  if (loading || !ready)
    return (
      <SafeAreaView
        style={{
          flex: 1,
          padding: 24,
          backgroundColor: colors.background,
          justifyContent: "center",
          gap: 18,
        }}
      >
        {loading ? (
          <>
            <ActivityIndicator color={colors.green} />
            <Text style={ui.heading}>Opening your local routine…</Text>
          </>
        ) : (
          <>
            <Text style={ui.heading}>Your data could not be opened</Text>
            <Text style={ui.error}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setLoading(true);
                setError("");
                void load();
              }}
              style={ui.sageCard}
            >
              <Text style={ui.label}>Retry loading</Text>
            </Pressable>
          </>
        )}
      </SafeAreaView>
    );
  return (
    <Context.Provider
      value={{
        state,
        dispatch,
        today,
        selectedDate,
        setSelectedDate,
        busy: state.busyDates.includes(selectedDate),
        setBusy: (value) => {
          void dispatch({ type: "busy", date: selectedDate, value });
        },
        saving,
        error,
      }}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {!!error && (
          <SafeAreaView
            edges={["top"]}
            style={{ backgroundColor: colors.amberLight, padding: 12 }}
          >
            <Text accessibilityRole="alert" style={ui.error}>
              {error}
            </Text>
            <Text style={ui.small}>
              The previous saved data is intact. Correct the input or retry the
              action.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => setError("")}>
              <Text style={[ui.label, { minHeight: 44, paddingTop: 12 }]}>
                Dismiss
              </Text>
            </Pressable>
          </SafeAreaView>
        )}
        {saving && (
          <View style={{ paddingHorizontal: 20, paddingVertical: 4 }}>
            <Text style={ui.small}>Saving locally…</Text>
          </View>
        )}
        {children}
      </View>
    </Context.Provider>
  );
}
export function useTracker() {
  const value = useContext(Context);
  if (!value) throw new Error("TrackerProvider missing");
  return value;
}
