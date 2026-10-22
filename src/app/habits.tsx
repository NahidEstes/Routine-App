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
import { useTheme } from "../theme";
import { HabitListControls } from "../components/HabitListControls";
import {
  matchesHabit,
  organizationFor,
  sortHabits,
} from "../domain/organization";
export default function Habits() {
  const { ui } = useTheme();
  const { state, dispatch, saving } = useTracker();
  return (
    <Screen>
      <Header back title="Your habits" />
      <Text style={ui.subtitle}>
        Keep what matters. Archived habits retain their history.
      </Text>
      <Button
        label="Priorities, pins & custom order"
        secondary
        onPress={() => router.push("/organize-habits")}
      />
      <Button
        label="Vacation / Pause mode"
        secondary
        onPress={() => router.push("/pause-habits")}
      />
      <HabitListControls />
      {!!state.habits.length &&
        !state.habits.some((h) => matchesHabit(state, h)) && (
          <Text style={ui.body}>
            No habits match. Try another name or clear filters.
          </Text>
        )}
      {!state.habits.length && (
        <EmptyState
          title="One small beginning"
          message="Create your first habit to start building a rhythm."
        />
      )}
      {sortHabits(
        state,
        state.habits.filter((h) => matchesHabit(state, h)),
        (h) => h.id,
        (h) => h.time,
      ).map((h) => (
        <View key={h.id} style={ui.card}>
          <View style={ui.row}>
            <IconBubble name={h.icon} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Details for ${h.name}`}
              style={ui.grow}
              onPress={() =>
                router.push({
                  pathname: "/habit-details",
                  params: { id: h.id },
                })
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
          {(organizationFor(state, h.id).pinned ||
            organizationFor(state, h.id).priority !== "normal") && (
            <Text style={ui.small}>
              {organizationFor(state, h.id).pinned ? "Pinned · " : ""}
              {organizationFor(state, h.id).priority} priority
            </Text>
          )}
          {state.notes.some((n) => n.habitId === h.id) && (
            <Button
              label={`View notes for ${h.name}`}
              secondary
              icon="document-text-outline"
              onPress={() =>
                router.push({ pathname: "/habit-notes", params: { id: h.id } })
              }
            />
          )}
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
