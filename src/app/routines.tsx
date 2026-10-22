import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  EmptyState,
  Header,
  Icon,
  IconBubble,
  Screen,
} from "../components/ui";
import { useTracker } from "../state/TrackerProvider";
import { formatTime } from "../utils/dates";
import { useTheme } from "../theme";
import { routineTemplates } from "../domain/routineTemplates";
export default function Routines() {
  const { ui } = useTheme();
  const { state, dispatch, saving } = useTracker();
  return (
    <Screen>
      <Header back title="Your routines" />
      <Text style={ui.title}>A rhythm of your own</Text>
      <Text style={ui.subtitle}>Simple sequences to ease into your day.</Text>
      <Text style={ui.heading}>My routines</Text>
      {state.routines.filter((r) => !r.archivedAt).length ? (
        state.routines
          .filter((r) => !r.archivedAt)
          .map((routine) => (
            <Pressable
              key={routine.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${routine.name}`}
              onPress={() =>
                router.push({
                  pathname: "/routine",
                  params: { id: routine.id },
                })
              }
              style={ui.sageCard}
            >
              <View style={ui.row}>
                <IconBubble
                  name={
                    routine.id === "evening" ? "moon-outline" : "sunny-outline"
                  }
                  amber
                />
                <View style={ui.grow}>
                  <Text style={ui.heading}>{routine.name}</Text>
                  <Text style={ui.small}>{routine.subtitle}</Text>
                </View>
                <Icon name="chevron-forward" />
              </View>
              <Text style={ui.subtitle}>
                {formatTime(routine.time)} ·{" "}
                {routine.steps.reduce((sum, step) => sum + step.minutes, 0)} min
                · {routine.steps.length} steps
              </Text>
            </Pressable>
          ))
      ) : (
        <EmptyState
          title="Make your first routine"
          message="Bring a few small actions together into a rhythm that works for you."
        />
      )}
      {state.routines
        .filter((r) => !!r.archivedAt)
        .map((r) => (
          <View key={r.id} style={ui.card}>
            <Text style={ui.heading}>{r.name} · Archived</Text>
            <Button
              label={`Restore ${r.name}`}
              disabled={saving}
              secondary
              onPress={() => {
                void dispatch({ type: "restoreRoutine", id: r.id });
              }}
            />
          </View>
        ))}
      <Button
        label="Create a routine"
        icon="add"
        onPress={() => router.push("/routine")}
      />
      <Text style={ui.heading}>Start with a template</Text>
      <Text style={ui.small}>
        Original starter examples. Make them your own before saving.
      </Text>
      {routineTemplates.map((template) => (
        <Pressable
          key={template.id}
          accessibilityRole="button"
          accessibilityLabel={`Preview ${template.name}`}
          style={ui.card}
          onPress={() =>
            router.push({
              pathname: "/routine-template",
              params: { id: template.id },
            })
          }
        >
          <View style={ui.row}>
            <IconBubble name={template.icon} amber />
            <View style={ui.grow}>
              <Text style={ui.heading}>{template.name}</Text>
              <Text style={ui.small}>
                {template.steps.length} steps ·{" "}
                {template.steps.reduce((sum, step) => sum + step.minutes, 0)}{" "}
                min
              </Text>
            </View>
            <Icon name="chevron-forward" />
          </View>
          <Text style={ui.body}>{template.description}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
