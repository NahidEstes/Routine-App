import { Text, View } from "react-native";
import { router } from "expo-router";
import { isPaused } from "../domain/organization";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { Button } from "./ui";
export function PauseNotice({ date }: { date: string }) {
  const { state } = useTracker();
  const { ui } = useTheme();
  const paused = state.habits.filter(
    (h) => !h.archivedAt && isPaused(state, h.id, date),
  );
  if (!paused.length) return null;
  return (
    <View style={ui.sageCard}>
      <Text style={ui.label}>
        {paused.length} {paused.length === 1 ? "habit" : "habits"} paused ·{" "}
        {date}
      </Text>
      <Text style={ui.small}>
        A little breathing room. Paused days are neutral; recorded history stays
        saved.
      </Text>
      <Button
        label="View or resume pauses"
        secondary
        onPress={() => router.push("/pause-habits")}
      />
    </View>
  );
}
