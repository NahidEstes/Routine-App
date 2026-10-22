import { useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  EmptyState,
  Header,
  IconBubble,
  IconButton,
  Screen,
} from "../components/ui";
import { ActionFeedback } from "../components/ActionFeedback";
import { HabitActions, ProgressEditor } from "../components/HabitInteractions";
import { RescheduleModal } from "../components/RescheduleModal";
import { useTracker } from "../state/TrackerProvider";
import { useEntryActions } from "../hooks/useEntryActions";
import { entriesForDate, versionAt } from "../domain/schedule";
import { entryStatus, entryTarget, repeatLabel } from "../presentation/habits";
import { formatTime, validDate } from "../utils/dates";
import type { ScheduledItem } from "../models/types";
import { useTheme } from "../theme";
import { isPaused } from "../domain/organization";

export default function HabitDetails() {
  const { ui } = useTheme();
  const params = useLocalSearchParams<{
    id?: string;
    date?: string;
    entryId?: string;
  }>();
  const { state, selectedDate, today } = useTracker();
  const habit = state.habits.find((h) => h.id === params.id);
  const moved = state.occurrences.find(
    (e) => e.id === params.entryId && !e.excluded,
  );
  const date =
    moved?.date ??
    (params.date && validDate(params.date) ? params.date : selectedDate);
  const entry = entriesForDate(state, date, today).find((e) =>
    params.entryId ? e.id === params.entryId : e.habitId === params.id,
  );
  if (entry) return <EntryDetail key={entry.id} item={entry} />;
  const definition = habit
    ? (versionAt(state, habit.id, date)?.habit ?? habit)
    : undefined;
  return (
    <Screen>
      <Header back title="Habit details" />
      {!habit || !definition ? (
        <EmptyState
          title="Habit unavailable"
          message="Return to Today or Manage habits to choose another habit."
        />
      ) : (
        <>
          <Text style={ui.title}>{definition.name}</Text>
          <Text style={ui.subtitle}>
            {repeatLabel(definition)} · {formatTime(definition.time)}
          </Text>
          <EmptyState
            title={
              isPaused(state, habit.id, date)
                ? "Habit paused on this day"
                : "No task on this day"
            }
            message={`${date}${habit.archivedAt ? " · Archived habit" : isPaused(state, habit.id, date) ? " · Pause dates are neutral. View your pause periods to see when this habit resumes." : " · This habit is not scheduled here."}`}
          />
          {!habit.archivedAt && (
            <Button
              label="View or plan a pause"
              secondary
              onPress={() =>
                router.push({
                  pathname: "/pause-habits",
                  params: { id: habit.id },
                })
              }
            />
          )}
          {!habit.archivedAt && (
            <Button
              label="Edit habit"
              secondary
              onPress={() =>
                router.push({ pathname: "/habit", params: { id: habit.id } })
              }
            />
          )}
          <Button
            label="View habit notes"
            secondary
            onPress={() =>
              router.push({
                pathname: "/habit-notes",
                params: { id: habit.id },
              })
            }
          />
          <Button
            label="Manage habits"
            secondary
            onPress={() => router.push("/habits")}
          />
        </>
      )}
    </Screen>
  );
}
function EntryDetail({ item }: { item: ScheduledItem }) {
  const { colors, ui } = useTheme();
  const actions = useEntryActions(item);
  const [menu, setMenu] = useState(false),
    [progress, setProgress] = useState(false),
    [reschedule, setReschedule] = useState(false);
  const target = entryTarget(item, actions.busy);
  return (
    <Screen>
      <Header
        back
        title="Habit details"
        action={
          <IconButton
            plain
            name="ellipsis-horizontal"
            label={`Options for ${item.habit.name}`}
            onPress={() => setMenu(true)}
          />
        }
      />
      <View style={{ gap: 12, paddingVertical: 12 }}>
        <IconBubble name={item.habit.icon} size={56} />
        <Text style={ui.title}>{item.habit.name}</Text>
        <Text style={ui.subtitle}>
          {repeatLabel(item.habit)} · {formatTime(item.time)}
        </Text>
        <Text style={ui.small}>
          {item.date}
          {item.rescheduled ? ` · Moved from ${item.sourceDate}` : ""}
        </Text>
      </View>
      <Text style={ui.heading}>
        {item.habit.goal.type === "boolean"
          ? item.status === "done"
            ? "Checked off"
            : "Not checked off"
          : `${item.amount} of ${target} ${item.habit.goal.unit}`}
      </Text>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: target,
          now: Math.min(target, item.amount),
        }}
        style={{
          height: 8,
          backgroundColor: colors.sage,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.min(100, (item.amount / target) * 100)}%`,
            height: 8,
            backgroundColor: colors.green,
          }}
        />
      </View>
      <Text style={ui.body}>
        {entryStatus(item, actions.today)}
        {actions.access.archived ? " · Archived habit" : ""}
      </Text>
      {actions.access.record && (
        <Button
          disabled={actions.saving}
          label={
            item.status === "skipped"
              ? "Undo skip"
              : item.habit.goal.type !== "boolean"
                ? "Add / edit progress"
                : item.status === "done"
                  ? "Undo completion"
                  : "Mark complete"
          }
          onPress={() =>
            item.status === "skipped" ||
            (item.status === "done" && item.habit.goal.type === "boolean")
              ? actions.undo()
              : item.habit.goal.type === "boolean"
                ? actions.done()
                : setProgress(true)
          }
        />
      )}
      <ActionFeedback />
      {actions.access.future && (
        <Text style={ui.small}>
          Upcoming tasks can be rescheduled. Progress is available when the day
          arrives.
        </Text>
      )}
      {actions.access.hasNote && (
        <Button
          label="View daily note"
          secondary
          icon="document-text-outline"
          onPress={() =>
            router.push({
              pathname: "/note",
              params: {
                entryId: item.id,
                habitId: item.habitId,
                date: item.date,
              },
            })
          }
        />
      )}
      {menu && (
        <HabitActions
          item={item}
          onClose={() => setMenu(false)}
          onProgress={() => setProgress(true)}
          onReschedule={() => setReschedule(true)}
        />
      )}
      {progress && (
        <ProgressEditor item={item} onClose={() => setProgress(false)} />
      )}
      <RescheduleModal
        item={reschedule ? item : null}
        onClose={() => setReschedule(false)}
      />
    </Screen>
  );
}
