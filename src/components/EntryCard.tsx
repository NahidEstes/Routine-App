import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import type { ScheduledItem } from "../models/types";
import { useTracker } from "../state/TrackerProvider";
import { formatTime } from "../utils/dates";
import { colors, ui } from "../theme";
import { Button, Field, Icon, IconBubble } from "./ui";

export function HabitCard({
  item,
  schedule = false,
  onReschedule,
}: {
  item: ScheduledItem;
  schedule?: boolean;
  onReschedule: () => void;
}) {
  const { dispatch, busy, today, state, saving } = useTracker();
  const [editing, setEditing] = useState(false),
    [amount, setAmount] = useState(String(item.amount)),
    [useBusy, setUseBusy] = useState(item.amount > 0 ? item.busy : busy);
  const [error, setError] = useState("");
  const locked = item.date > today;
  const archived = !!state.habits.find((h) => h.id === item.habitId)
    ?.archivedAt;
  const target =
    item.amount > 0 || item.status === "done"
      ? item.target
      : busy && item.habit.busyGoal !== null
        ? item.habit.busyGoal
        : item.habit.goal.value;
  const action = (status: "done" | "skipped" | "pending") => {
    void dispatch({
      type: "status",
      id: item.id,
      habitId: item.habitId,
      date: item.date,
      status,
      busy,
    });
  };
  async function save() {
    if (
      !amount.trim() ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) < 0
    ) {
      setError("Enter zero or a positive amount.");
      return;
    }
    if (
      await dispatch({
        type: "amount",
        id: item.id,
        habitId: item.habitId,
        date: item.date,
        amount: Number(amount),
        busy: useBusy,
      })
    ) {
      setEditing(false);
      setError("");
    }
  }
  return (
    <View
      style={[
        ui.card,
        schedule && {
          backgroundColor: ["Learning", "Mindfulness"].includes(
            item.habit.category,
          )
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
          disabled={archived}
          style={ui.grow}
          onPress={() =>
            router.push({ pathname: "/habit", params: { id: item.habitId } })
          }
        >
          <Text style={[ui.label, { fontSize: 16 }]}>{item.habit.name}</Text>
          <Text style={ui.small}>
            {formatTime(item.time)} ·{" "}
            {item.habit.goal.type === "boolean"
              ? "Done / Not done"
              : `${item.amount}/${target} ${item.habit.goal.unit}`}
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
                  : item.displayStatus === "missed"
                    ? "alert-circle-outline"
                    : "ellipse-outline"
          }
        />
      </View>
      <Text
        style={[
          ui.small,
          {
            color:
              item.displayStatus === "missed" ? colors.danger : colors.muted,
          },
        ]}
      >
        {item.optional
          ? "Optional weekly opportunity"
          : item.displayStatus === "missed"
            ? "Missed · day ended"
            : item.status === "skipped"
              ? "Skipped"
              : item.status === "done"
                ? item.busy
                  ? "Completed · Busy day goal"
                  : "Completed · Full goal"
                : locked
                  ? "Upcoming"
                  : "Pending"}
        {archived ? " · Archived habit" : ""}
        {item.rescheduled ? " · Rescheduled" : ""}
      </Text>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {!schedule && (
          <>
            <Action
              label={item.status === "done" ? "Undo done" : "Done"}
              name="checkmark"
              disabled={locked || saving}
              onPress={() =>
                action(item.status === "done" ? "pending" : "done")
              }
            />
            <Action
              label={item.status === "skipped" ? "Undo skip" : "Skip"}
              name="play-skip-forward-outline"
              disabled={locked || saving}
              onPress={() =>
                action(item.status === "skipped" ? "pending" : "skipped")
              }
            />
          </>
        )}
        <Action
          label="Reschedule"
          name="time-outline"
          disabled={saving}
          onPress={onReschedule}
        />
      </View>
      {!schedule && item.habit.goal.type !== "boolean" && !locked && (
        <Button
          label={editing ? "Cancel progress edit" : "Record / edit progress"}
          secondary
          disabled={saving}
          onPress={() => {
            setAmount(String(item.amount));
            setUseBusy(item.amount > 0 ? item.busy : busy);
            setEditing(!editing);
          }}
        />
      )}
      {editing && (
        <View style={{ gap: 10 }}>
          <Field
            label={`Recorded ${item.habit.goal.unit}`}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            maxLength={8}
          />
          {item.habit.busyGoal !== null && (
            <View style={ui.between}>
              <Text style={ui.label}>Use busy day goal</Text>
              <Switch
                accessibilityLabel="Use busy day goal"
                value={useBusy}
                onValueChange={setUseBusy}
              />
            </View>
          )}
          {!!error && <Text style={ui.error}>{error}</Text>}
          <Button label="Save progress" disabled={saving} onPress={save} />
        </View>
      )}
    </View>
  );
}
function Action({
  label,
  name,
  disabled,
  onPress,
}: {
  label: string;
  name: "checkmark" | "play-skip-forward-outline" | "time-outline";
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 44,
        justifyContent: "center",
        alignItems: "center",
        gap: 3,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon name={name} size={16} />
      <Text style={{ fontSize: 11, color: colors.green, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}
