import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { EmptyState, Header, Icon, Screen } from "../components/ui";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";

export default function HabitNotes() {
  const { ui } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state } = useTracker();
  const entryMap = new Map(state.occurrences.map((entry) => [entry.id, entry]));
  const notes = state.notes
    .filter((n) => !id || n.habitId === id)
    .map((note) => ({
      note,
      entry: entryMap.get(note.entryId),
    }))
    .filter((n) => n.entry)
    .sort((a, b) => b.entry!.date.localeCompare(a.entry!.date));
  return (
    <Screen>
      <Header back title="Daily notes" />
      <Text style={ui.subtitle}>
        Notes stay with their original record, including archived habits and
        moved tasks.
      </Text>
      {!notes.length && (
        <EmptyState
          title="A little space to reflect"
          message="Use the note icon on a habit card in Today or day history to write your first note."
        />
      )}
      {notes.map(({ note, entry }) => (
        <Pressable
          key={note.entryId}
          accessibilityRole="button"
          accessibilityLabel={`Open note ${entry!.snapshot.name} ${entry!.date}`}
          style={[ui.card, ui.row]}
          onPress={() =>
            router.push({
              pathname: "/note",
              params: {
                entryId: note.entryId,
                habitId: note.habitId,
                date: entry!.date,
              },
            })
          }
        >
          <Icon name="document-text-outline" />
          <View style={ui.grow}>
            <Text style={ui.label}>{entry!.snapshot.name}</Text>
            <Text style={ui.small}>
              {entry!.date}
              {entry!.excluded
                ? " · Archived schedule record"
                : entry!.rescheduled
                  ? " · Rescheduled"
                  : ""}
            </Text>
          </View>
          <Icon name="chevron-forward" />
        </Pressable>
      ))}
    </Screen>
  );
}
