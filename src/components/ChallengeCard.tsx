import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { HabitChallenge, TrackerState } from "../models/types";
import { challengeProgress } from "../domain/challenges";
import { useTheme } from "../theme";
import { Icon } from "./ui";
import { shortDate } from "../utils/dates";
export function ChallengeCard({
  challenge,
  state,
  today,
  onPress,
}: {
  challenge: HabitChallenge;
  state: TrackerState;
  today: string;
  onPress?: () => void;
}) {
  const { colors, ui } = useTheme();
  const p = challengeProgress(state, challenge, today);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${challenge.name}, ${p.current} of ${challenge.target} days, ${challenge.archived ? "archived" : p.status}`}
      onPress={
        onPress ??
        (() =>
          router.push({
            pathname: "/challenges",
            params: { challenge: challenge.id },
          }))
      }
      style={ui.card}
    >
      <View style={ui.row}>
        <Icon
          name={
            p.status === "completed"
              ? "checkmark-circle-outline"
              : "flag-outline"
          }
        />
        <Text style={[ui.heading, ui.grow]}>{challenge.name}</Text>
        <Icon name="chevron-forward" size={18} />
      </View>
      <Text style={ui.small}>
        {challenge.habitName} · {shortDate(challenge.start)} –{" "}
        {shortDate(challenge.end)}
      </Text>
      <Text style={ui.label}>
        {Math.min(p.current, challenge.target)}/{challenge.target} days ·{" "}
        {challenge.archived
          ? "Archived"
          : p.status === "completed"
            ? "Completed"
            : p.status === "ended"
              ? "Finished"
              : p.status === "upcoming"
                ? "Starts soon"
                : "In progress"}
      </Text>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${challenge.name} progress`}
        accessibilityValue={{
          min: 0,
          max: challenge.target,
          now: Math.min(challenge.target, p.current),
        }}
        style={{
          height: 7,
          backgroundColor: colors.track,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${p.percent}%`,
            height: 7,
            backgroundColor: colors.green,
          }}
        />
      </View>
      {p.status === "ended" && (
        <Text style={ui.small}>
          Every completed day still counts. Start again at your own pace.
        </Text>
      )}
    </Pressable>
  );
}
