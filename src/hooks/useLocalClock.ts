import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { dateKey } from "../utils/dates";

/** Minute-level display clock; progress and timer accounting stay in their existing providers. */
export function useLocalClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
  return {
    date: dateKey(now),
    time: String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0"),
  };
}
