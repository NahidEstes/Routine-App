import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { ScheduledItem } from "../models/types";
import { useEntryActions } from "../hooks/useEntryActions";
import { entryStatus, entryTarget } from "../presentation/habits";
import { formatTime } from "../utils/dates";
import { useTheme } from "../theme";
import { useLocalFeatures } from "../state/LocalFeaturesProvider";
import { Button, Icon, IconBubble, IconButton } from "./ui";
import { HabitActions, ProgressEditor } from "./HabitInteractions";
import { useTracker } from "../state/TrackerProvider";
import { organizationFor } from "../domain/organization";

export function HabitCard({
  item,
  schedule = false,
  onReschedule,
}: {
  item: ScheduledItem;
  schedule?: boolean;
  onReschedule: () => void;
}) {
  const { colors, ui } = useTheme();
  const actions = useEntryActions(item);
  const { state } = useTracker();
  const organization = organizationFor(state, item.habitId);
  const { startTimer, timer, timerBusy, timerReady } = useLocalFeatures();
  const [menu, setMenu] = useState(false);
  const [progress, setProgress] = useState(false);
  const done = item.status === "done",
    skipped = item.status === "skipped";
  const target = entryTarget(item, actions.busy);
  const amountGoal = item.habit.goal.type !== "boolean";
  const singular =
    (
      {
        glasses: "glass",
        pages: "page",
        times: "time",
        steps: "step",
      } as Record<string, string>
    )[item.habit.goal.unit] ?? item.habit.goal.unit;
  const disabled = actions.saving || !actions.access.record;
  return (
    <View style={[ui.card, { gap: 12 }]}>
      <View style={[ui.row, { alignItems: "flex-start" }]}>
        <IconBubble name={item.habit.icon} size={40} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Details for ${item.habit.name}${actions.access.hasNote ? ", has note" : ""}`}
          style={[ui.grow, { minHeight: 48, justifyContent: "center", gap: 4 }]}
          onPress={() =>
            router.push({
              pathname: "/habit-details",
              params: { id: item.habitId, date: item.date, entryId: item.id },
            })
          }
        >
          <Text style={[ui.label, { fontSize: 17 }]}>{item.habit.name}</Text>
          {(organization.pinned || organization.priority !== "normal") && (
            <Text style={ui.small}>
              {organization.pinned ? "Pinned · " : ""}
              {organization.priority[0].toUpperCase() +
                organization.priority.slice(1)}{" "}
              priority
            </Text>
          )}
          <Text style={ui.small}>
            {formatTime(item.time)}
            {amountGoal
              ? ` · ${item.amount} of ${target} ${item.habit.goal.unit}`
              : ""}
          </Text>
          {(done ||
            skipped ||
            item.amount > 0 ||
            actions.access.future ||
            item.displayStatus === "missed" ||
            actions.access.hasNote ||
            schedule) && (
            <Text
              style={[
                ui.small,
                item.displayStatus === "missed" && { color: colors.danger },
              ]}
            >
              {entryStatus(item, actions.today)}
              {actions.access.hasNote ? " · Note" : ""}
              {item.rescheduled ? " · Moved" : ""}
              {actions.access.archived ? " · Archived" : ""}
            </Text>
          )}
        </Pressable>
        <IconButton
          plain
          name="ellipsis-horizontal"
          label={`Options for ${item.habit.name}`}
          onPress={() => setMenu(true)}
        />
      </View>
      {amountGoal && (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`${item.amount} of ${target} ${item.habit.goal.unit}`}
          accessibilityValue={{
            min: 0,
            max: target,
            now: Math.min(target, item.amount),
          }}
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.track,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 6,
              width: `${Math.min(100, (item.amount / target) * 100)}%`,
              backgroundColor: colors.green,
            }}
          />
        </View>
      )}
      {item.paused ? (
        <Text style={ui.small}>
          Paused · Your recorded history is preserved.
        </Text>
      ) : done || skipped ? (
        <Button
          label={done ? "Undo completion" : "Undo skip"}
          secondary
          icon="arrow-undo-outline"
          disabled={disabled}
          onPress={actions.undo}
        />
      ) : item.habit.goal.type === "boolean" ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Complete ${item.habit.name}`}
          accessibilityState={{ checked: false, disabled }}
          disabled={disabled}
          onPress={() => void actions.done()}
          style={[ui.row, { minHeight: 48, opacity: disabled ? 0.45 : 1 }]}
        >
          <Icon name="square-outline" color={colors.muted} size={28} />
          <Text style={ui.label}>
            {actions.access.future ? "Planned" : "Mark as done"}
          </Text>
        </Pressable>
      ) : item.habit.goal.type === "count" ? (
        <Button
          label={`+1 ${singular}`}
          disabled={disabled}
          onPress={actions.increment}
        />
      ) : (
        <Button
          label={
            timer?.entryId === item.id ? "Timer in progress" : "Start timer"
          }
          icon="timer-outline"
          disabled={
            disabled ||
            item.date !== actions.today ||
            !!timer ||
            timerBusy ||
            !timerReady
          }
          onPress={() => startTimer(item, actions.busy)}
        />
      )}
      {amountGoal && !done && !skipped && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit recorded progress for ${item.habit.name}`}
          disabled={disabled}
          onPress={() => setProgress(true)}
          style={{
            minHeight: 48,
            justifyContent: "center",
            opacity: disabled ? 0.45 : 1,
          }}
        >
          <Text
            style={[ui.small, { color: colors.green, textAlign: "center" }]}
          >
            {item.habit.goal.type === "duration"
              ? "Log time manually"
              : "Edit progress"}
          </Text>
        </Pressable>
      )}
      {menu && (
        <HabitActions
          item={item}
          onClose={() => setMenu(false)}
          onReschedule={onReschedule}
          onProgress={() => setProgress(true)}
        />
      )}
      {progress && (
        <ProgressEditor
          key={item.id}
          item={item}
          onClose={() => setProgress(false)}
        />
      )}
    </View>
  );
}
