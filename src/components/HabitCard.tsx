import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { ScheduledItem } from "../models/types";
import { useDemo } from "../state/DemoProvider";
import { formatTime } from "../utils/dates";
import { colors, ui } from "../theme";
import { Icon, IconBubble } from "./ui";

export function goalLabel(item: ScheduledItem, busy: boolean) {
  const goal = item.habit.goal;
  if (goal.type === "boolean") return "Done / Not done";
  return `${busy && item.habit.busyGoal !== null ? item.habit.busyGoal : goal.value} ${goal.unit}`;
}
export function HabitCard({
  item,
  schedule = false,
  onReschedule,
}: {
  item: ScheduledItem;
  schedule?: boolean;
  onReschedule: () => void;
}) {
  const { dispatch, busy } = useDemo();
  return (
    <View
      style={[
        ui.card,
        schedule && {
          backgroundColor:
            item.habit.category === "Learning" ||
            item.habit.category === "Mindfulness"
              ? colors.amberLight
              : colors.sage,
          borderWidth: 0,
        },
      ]}
    >
      <View style={ui.row}>
        <IconBubble name={item.habit.icon} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.habit.name}`}
          onPress={() =>
            router.push({ pathname: "/habit", params: { id: item.habitId } })
          }
          style={ui.grow}
        >
          <Text style={[ui.label, { fontSize: 16 }]}>{item.habit.name}</Text>
          <Text style={ui.small}>
            {formatTime(item.time)} · {goalLabel(item, busy)}
          </Text>
        </Pressable>
        <Icon
          name={
            schedule
              ? "repeat-outline"
              : item.status === "done"
                ? "checkmark-circle"
                : item.status === "skipped"
                  ? "remove-circle-outline"
                  : "ellipse-outline"
          }
          size={26}
          color={item.status === "skipped" ? colors.muted : colors.green}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {!schedule && (
          <>
            <Action
              label={item.status === "done" ? "Undo done" : "Done"}
              icon="checkmark"
              selected={item.status === "done"}
              onPress={() =>
                dispatch({
                  type: "status",
                  id: item.id,
                  status: item.status === "done" ? "pending" : "done",
                })
              }
            />
            <Action
              label={item.status === "skipped" ? "Undo skip" : "Skip"}
              icon="play-skip-forward-outline"
              selected={item.status === "skipped"}
              onPress={() =>
                dispatch({
                  type: "status",
                  id: item.id,
                  status: item.status === "skipped" ? "pending" : "skipped",
                })
              }
            />
          </>
        )}
        <Action label="Reschedule" icon="time-outline" onPress={onReschedule} />
      </View>
    </View>
  );
}
function Action({
  label,
  icon,
  onPress,
  selected,
}: {
  label: string;
  icon: "checkmark" | "play-skip-forward-outline" | "time-outline";
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 44,
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        backgroundColor: selected ? colors.sage : "transparent",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} size={15} />
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.green }}>
        {label}
      </Text>
    </Pressable>
  );
}
