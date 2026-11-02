import { useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import { useTracker } from "../state/TrackerProvider";
import { useAppearance } from "../state/AppearanceProvider";
import { useTheme } from "../theme";
import { widgetAvailable } from "./availability";
/** Only mount in the app, never in the headless widget's render tree. */
export function WidgetSync() {
  const { state } = useTracker();
  const { colorMode } = useAppearance();
  const { ui } = useTheme();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!widgetAvailable()) return;
    let live = true;
    // Coalesce bursts of progress taps. Widget refreshes also share the commit queue.
    const refresh = () => {
      void import("./task")
        .then(({ refreshWidgets }) => refreshWidgets())
        .then(() => {
          if (live) setError("");
        })
        .catch(() => {
          if (live)
            setError(
              "Your habit is saved, but the home-screen widget could not refresh. Tap Refresh on the widget to retry.",
            );
        });
    };
    const timer = setTimeout(refresh, 500);
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") refresh();
    });
    return () => {
      live = false;
      clearTimeout(timer);
      subscription.remove();
    };
  }, [state, colorMode]);
  return error ? (
    <View style={{ padding: 12 }}>
      <Text accessibilityRole="alert" style={ui.small}>
        {error}
      </Text>
    </View>
  ) : null;
}
