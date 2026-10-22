import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { trialStatus, type PremiumTrial } from "../domain/premiumTrial";
import { premiumTrialStore } from "../storage/appearance";
import { classicTheme, premiumTheme, ThemeContext } from "../theme";

type Appearance = ReturnType<typeof trialStatus> & {
  trial: PremiumTrial | null;
  error: string;
  loading: boolean;
  startTrial: () => Promise<boolean>;
  refresh: () => Promise<boolean>;
};
const Context = createContext<Appearance | null>(null);

export function AppearanceProvider({ children }: React.PropsWithChildren) {
  const [trial, setTrial] = useState<PremiumTrial | null>(null);
  const [now, setNow] = useState(Date.now);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async (start = false) => {
    const timestamp = Date.now();
    setNow((previous) => Math.max(previous, timestamp));
    try {
      const saved = await premiumTrialStore.refresh(timestamp, start);
      setTrial(saved);
      setError("");
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save your trial. Please retry.",
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => refresh());
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const status = trialStatus(trial, now);
  useEffect(() => {
    if (!status.active || loading) return;
    // Wake exactly at expiry as well as updating the countdown once a minute.
    const timer = setTimeout(
      () => void refresh(),
      Math.min(60_000, status.remaining),
    );
    return () => clearTimeout(timer);
  }, [status.active, status.remaining, now, loading, refresh]);

  const active = status.active && !error && !loading;
  return (
    <Context.Provider
      value={{
        ...status,
        active,
        trial,
        error,
        loading,
        startTrial: () => refresh(true),
        refresh: () => refresh(),
      }}
    >
      <ThemeContext.Provider value={active ? premiumTheme : classicTheme}>
        {loading ? (
          <View
            style={{
              flex: 1,
              backgroundColor: classicTheme.colors.background,
              justifyContent: "center",
            }}
          >
            <ActivityIndicator
              accessibilityLabel="Loading appearance"
              color={classicTheme.colors.green}
            />
          </View>
        ) : (
          children
        )}
      </ThemeContext.Provider>
    </Context.Provider>
  );
}

export function useAppearance() {
  const value = useContext(Context);
  if (!value) throw new Error("AppearanceProvider missing");
  return value;
}
