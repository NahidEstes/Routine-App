import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import type { ScheduledItem } from "../models/types";
import { useEntryActions } from "../hooks/useEntryActions";
import { Sheet } from "./Sheet";
import { Button, Field, Icon, type IconName } from "./ui";
import { useTheme } from "../theme";
import { entryTarget } from "../presentation/habits";

export function HabitActions({
  item,
  onClose,
  onReschedule,
  onProgress,
}: {
  item: ScheduledItem;
  onClose: () => void;
  onReschedule: () => void;
  onProgress: () => void;
}) {
  const { colors, ui } = useTheme();
  const actions = useEntryActions(item);
  const { access, saving } = actions;
  function row(
    label: string,
    icon: IconName,
    disabled: boolean,
    onPress: () => void | Promise<unknown>,
    hint?: string,
  ) {
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => void onPress()}
        style={{
          minHeight: 56,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderColor: colors.border,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <Icon name={icon} />
        <View style={ui.grow}>
          <Text style={ui.body}>{label}</Text>
          {hint && <Text style={ui.small}>{hint}</Text>}
        </View>
        <Icon name="chevron-forward" size={18} />
      </Pressable>
    );
  }
  return (
    <Sheet title="Habit options" onClose={onClose}>
      <Text style={ui.label}>
        {item.habit.name} · {item.date}
      </Text>
      {row(
        "Pause this habit",
        "pause-circle-outline",
        saving || access.archived,
        () => {
          onClose();
          router.push({
            pathname: "/pause-habits",
            params: { id: item.habitId },
          });
        },
      )}
      {row("Priority and pin", "options-outline", saving, () => {
        onClose();
        router.push("/organize-habits");
      })}
      {row(
        access.hasNote ? "Edit note" : "Add a note",
        "create-outline",
        saving || !access.note,
        () => {
          onClose();
          router.push({
            pathname: "/note",
            params: {
              entryId: item.id,
              habitId: item.habitId,
              date: item.date,
            },
          });
        },
        !access.note
          ? "Notes are available on today and past records."
          : undefined,
      )}
      {row(
        "Reschedule",
        "calendar-outline",
        saving || !access.reschedule,
        () => {
          onClose();
          onReschedule();
        },
        !access.reschedule
          ? access.archived
            ? "Restore this habit before rescheduling."
            : "Undo progress or skip before moving this task."
          : undefined,
      )}
      {row(
        item.status === "skipped" ? "Undo skip" : "Skip this day",
        "play-skip-forward-outline",
        saving || !access.record,
        async () => {
          if (
            await (item.status === "skipped" ? actions.undo() : actions.skip())
          )
            onClose();
        },
      )}
      {item.habit.goal.type !== "boolean" &&
        row(
          "Edit recorded progress",
          "add-circle-outline",
          saving || !access.record,
          () => {
            onClose();
            onProgress();
          },
        )}
      {(item.status === "done" || item.amount > 0) &&
        row(
          "Undo completion / progress",
          "arrow-undo-outline",
          saving || !access.record,
          async () => {
            if (await actions.undo()) onClose();
          },
        )}
      {row(
        "Edit habit",
        "pencil-outline",
        saving || !access.edit,
        () => {
          onClose();
          router.push({ pathname: "/habit", params: { id: item.habitId } });
        },
        !access.edit ? "This habit is archived." : undefined,
      )}
      <Button label="Cancel" secondary onPress={onClose} />
    </Sheet>
  );
}

export function ProgressEditor({
  item,
  onClose,
}: {
  item: ScheduledItem;
  onClose: () => void;
}) {
  const { ui } = useTheme();
  const actions = useEntryActions(item);
  const [value, setValue] = useState(String(item.amount));
  const [busy, setBusy] = useState(actions.busy);
  const [error, setError] = useState("");
  const target =
    busy && item.habit.busyGoal !== null
      ? item.habit.busyGoal
      : item.habit.goal.value;
  return (
    <Sheet title="Add progress" onClose={onClose}>
      <Text style={ui.heading}>{item.habit.name}</Text>
      <Text style={ui.body}>
        Recorded {item.amount} of {entryTarget(item, actions.busy)}{" "}
        {item.habit.goal.unit}.
      </Text>
      <Field
        label={`Total ${item.habit.goal.unit} for this day`}
        value={value}
        onChangeText={(text) => {
          setValue(text);
          setError("");
        }}
        keyboardType="numeric"
        maxLength={8}
        autoFocus
      />
      <Text style={ui.small}>
        Enter the total so far. You can also correct an earlier amount.
      </Text>
      <View style={[ui.row, { flexWrap: "wrap" }]}>
        <Button
          label="Add 1"
          secondary
          onPress={() => setValue(String((Number(value) || 0) + 1))}
        />
        {item.habit.goal.type === "duration" && (
          <Button
            label="Add 5 min"
            secondary
            onPress={() => setValue(String((Number(value) || 0) + 5))}
          />
        )}
        <Button
          label="Meet selected goal"
          secondary
          onPress={() => setValue(String(target))}
        />
      </View>
      {item.habit.busyGoal !== null && (
        <View style={ui.between}>
          <Text style={[ui.label, ui.grow]}>
            Use busy day goal ({item.habit.busyGoal})
          </Text>
          <Switch
            accessibilityLabel="Use busy day goal"
            value={busy}
            onValueChange={setBusy}
          />
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      <Button
        label="Save progress"
        disabled={actions.saving || !actions.access.record}
        onPress={async () => {
          if (
            !value.trim() ||
            !Number.isFinite(Number(value)) ||
            Number(value) < 0 ||
            (item.habit.goal.type === "count" &&
              !Number.isInteger(Number(value)))
          ) {
            setError(
              "Use zero or a positive amount; counts need whole numbers.",
            );
            return;
          }
          if (await actions.amount(Number(value), busy)) onClose();
        }}
      />
      <Button label="Cancel progress" secondary onPress={onClose} />
    </Sheet>
  );
}
