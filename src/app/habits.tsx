import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useTracker } from "../state/TrackerProvider";
import {
  Button,
  EmptyState,
  Header,
  IconBubble,
  Screen,
} from "../components/ui";
import { ui } from "../theme";
export default function Habits() {
  const { state, dispatch, saving } = useTracker();
  return (
    <Screen>
      <Header back title="Your habits" />
      <Text style={ui.subtitle}>
        Keep what matters. Archived habits retain their history.
      </Text>
      {!state.habits.length && (
        <EmptyState
          title="One small beginning"
          message="Create your first habit to start building a rhythm."
        />
      )}
      {state.habits.map((h) => (
        <View key={h.id} style={ui.card}>
          <View style={ui.row}>
            <IconBubble name={h.icon} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${h.name}`}
              disabled={!!h.archivedAt}
              style={ui.grow}
              onPress={() =>
                router.push({ pathname: "/habit", params: { id: h.id } })
              }
            >
              <Text style={ui.heading}>{h.name}</Text>
              <Text style={ui.small}>
                {h.archivedAt
                  ? "Archived · history preserved"
                  : h.repeat.type === "weekly"
                    ? `${h.repeat.target} days per week`
                    : h.category}
              </Text>
            </Pressable>
          </View>
          {h.archivedAt && (
            <Button
              label={`Restore ${h.name}`}
              disabled={saving}
              secondary
              onPress={() => {
                void dispatch({ type: "restoreHabit", id: h.id });
              }}
            />
          )}
        </View>
      ))}
      <Button
        label="Create habit"
        icon="add"
        onPress={() => router.push("/habit")}
      />
    </Screen>
  );
}
