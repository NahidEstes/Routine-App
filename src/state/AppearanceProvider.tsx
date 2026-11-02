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
  Appearance as NativeAppearance,
  AppState,
  Platform,
  View,
  useColorScheme,
} from "react-native";
import * as SystemUI from "expo-system-ui";
import { isDarkMode, type ColorMode } from "../domain/colorMode";
import { loadColorMode, saveColorMode } from "../storage/colorMode";
import { trialStatus, type PremiumTrial } from "../domain/premiumTrial";
import { premiumTrialStore } from "../storage/appearance";
import { appTheme, ThemeContext } from "../theme";

type Appearance = ReturnType<typeof trialStatus> & {
  trial: PremiumTrial | null;
  error: string;
  loading: boolean;
  startTrial: () => Promise<boolean>;
  refresh: () => Promise<boolean>;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => Promise<void>;
  colorError: string;
  retryColorMode: () => Promise<void>;
};
const Context = createContext<Appearance | null>(null);

export function AppearanceProvider({ children }: React.PropsWithChildren) {
  const system = useColorScheme();
  const [colorMode, setMode] = useState<ColorMode>("system");
  const [colorReady, setColorReady] = useState(false);
  const [colorError, setColorError] = useState("");
  const modeQueue = useRef<Promise<void>>(Promise.resolve());
  const retryColorMode = useCallback(async () => {
    try {
      setMode(await loadColorMode());
      setColorError("");
    } catch (e) {
      setColorError(
        e instanceof Error ? e.message : "Could not read color theme.",
      );
    } finally {
      setColorReady(true);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(retryColorMode);
  }, [retryColorMode]);
  const setColorMode = useCallback((mode: ColorMode) => {
    const save = async () => {
      try {
        await saveColorMode(mode);
        setMode(mode);
        setColorError("");
      } catch {
        setColorError("Could not save your color theme. Please retry.");
      }
    };
    modeQueue.current = modeQueue.current.then(save, save);
    return modeQueue.current;
  }, []);
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
  const theme = appTheme(active, isDarkMode(colorMode, system));
  useEffect(() => {
    if (Platform.OS !== "web")
      NativeAppearance.setColorScheme(
        colorMode === "system" ? "unspecified" : colorMode,
      );
  }, [colorMode]);
  useEffect(() => {
    if (Platform.OS !== "web")
      void SystemUI.setBackgroundColorAsync(theme.colors.background).catch(
        () => {},
      );
  }, [theme.colors.background]);
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
        colorMode,
        setColorMode,
        colorError,
        retryColorMode,
      }}
    >
      <ThemeContext.Provider value={theme}>
        {loading || !colorReady ? (
          <View
            style={{
              flex: 1,
              backgroundColor: theme.colors.background,
              justifyContent: "center",
            }}
          >
            <ActivityIndicator
              accessibilityLabel="Loading appearance"
              color={theme.colors.green}
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
