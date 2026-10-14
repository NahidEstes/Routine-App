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
import { useDemo } from "../state/DemoProvider";
import { formatTime } from "../utils/dates";
import { ui } from "../theme";
export default function Routines() {
  const { state } = useDemo();
  return (
    <Screen>
      <Header back title="Your routines" />
      <Text style={ui.title}>A rhythm of your own</Text>
      <Text style={ui.subtitle}>Simple sequences to ease into your day.</Text>
      {state.routines.length ? (
        state.routines.map((routine) => (
          <Pressable
            key={routine.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${routine.name}`}
            onPress={() =>
              router.push({ pathname: "/routine", params: { id: routine.id } })
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
              {routine.steps.reduce((sum, step) => sum + step.minutes, 0)} min ·{" "}
              {routine.steps.length} steps
            </Text>
          </Pressable>
        ))
      ) : (
        <EmptyState
          title="Make your first routine"
          message="Bring a few small actions together into a rhythm that works for you."
        />
      )}
      <Button
        label="Create a routine"
        icon="add"
        onPress={() => router.push("/routine")}
      />
    </Screen>
  );
}
