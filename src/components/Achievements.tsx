import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { achievementDefinitions, achievements } from "../domain/achievements";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { Button, Icon } from "./ui";

export function MilestoneNotice() {
  const { achievementNotice, dismissAchievements } = useTracker();
  const { ui } = useTheme();
  if (!achievementNotice.length) return null;
  return (
    <View style={ui.sageCard} accessibilityLiveRegion="polite">
      <Text style={ui.heading}>A small win worth noticing</Text>
      <Text style={ui.body}>
        {achievementDefinitions
          .filter((a) => achievementNotice.includes(a.id))
          .map((a) => a.name)
          .join(" · ")}
      </Text>
      <Button
        label="Dismiss achievement"
        secondary
        onPress={dismissAchievements}
      />
    </View>
  );
}
export function Achievements() {
  const { state, today } = useTracker();
  const { ui, colors } = useTheme();
  const [open, setOpen] = useState(false);
  const badges = useMemo(() => achievements(state, today), [state, today]);
  return (
    <View style={ui.card}>
      <View style={ui.row}>
        <Icon name="ribbon-outline" />
        <Text style={[ui.heading, ui.grow]}>
          Achievements · {badges.filter((a) => a.earned).length}/{badges.length}
        </Text>
      </View>
      <Text style={ui.small}>
        Small steps add up. Earned badges reflect your current history;
        correcting progress can change eligibility. Off-days and pauses are
        neutral in streaks. Flexible weekly habits earn total-completion badges.
      </Text>
      <Button
        label={open ? "Hide achievements" : "View earned and upcoming badges"}
        secondary
        onPress={() => setOpen(!open)}
      />
      {open &&
        badges.map((a) => (
          <View key={a.id} style={{ gap: 5, paddingVertical: 8 }}>
            <Text style={[ui.label, a.earned && { color: colors.green }]}>
              {a.earned ? "Earned" : "Upcoming"} · {a.name}
            </Text>
            <Text style={ui.small}>{a.description}</Text>
            <Text style={ui.small}>
              {Math.min(a.current, a.target)} / {a.target}
              {a.metric === "streak" ? " scheduled days" : " completions"}
            </Text>
          </View>
        ))}
    </View>
  );
}
