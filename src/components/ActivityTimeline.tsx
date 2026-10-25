import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import {
  activityTimeline,
  groupActivities,
  type Activity,
  type ActivityKind,
} from "../presentation/activity";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { addDays, longDate } from "../utils/dates";
import { Button, Chip, Icon, type IconName } from "./ui";
import { Sheet } from "./Sheet";
const kindIcon: Record<ActivityKind, IconName> = {
  habit: "checkmark-circle-outline",
  routine: "list-outline",
  note: "document-text-outline",
};
export function ActivityTimeline() {
  const { state, today, setSelectedDate } = useTracker();
  const { ui, colors } = useTheme();
  const [filter, setFilter] = useState<"all" | ActivityKind>("all");
  const [limit, setLimit] = useState(8);
  const [routineSession, setRoutineSession] = useState<string>();
  const session = state.sessions.find((s) => s.id === routineSession);
  const routine = state.routines.find((r) => r.id === session?.routineId);
  const all = useMemo(() => activityTimeline(state, today), [state, today]);
  const filtered = all.filter((a) => filter === "all" || a.kind === filter);
  const groups = groupActivities(filtered.slice(0, limit));
  function open(item: Activity) {
    const target = item.target;
    if (target.kind === "routine") {
      setRoutineSession(target.sessionId);
    } else
      router.push({
        pathname: target.kind === "habit" ? "/habit-details" : "/note",
        params: {
          id: target.habitId,
          habitId: target.habitId,
          entryId: target.entryId,
          date: target.date,
        },
      });
  }
  return (
    <View style={{ gap: 14 }}>
      <Text accessibilityRole="header" style={ui.heading}>
        Your activity
      </Text>
      <Text style={ui.small}>
        Habits and routines are grouped by their scheduled day. Notes use their
        latest saved day.
      </Text>
      <View style={[ui.row, { flexWrap: "wrap" }]}>
        {(
          [
            { value: "all", label: "All" },
            { value: "habit", label: "Habits" },
            { value: "routine", label: "Routines" },
            { value: "note", label: "Notes" },
          ] as const
        ).map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            accessibilityLabel={`Activity filter: ${f.label}`}
            selected={filter === f.value}
            onPress={() => {
              setFilter(f.value);
              setLimit(8);
            }}
          />
        ))}
      </View>
      {!filtered.length && (
        <View style={ui.sageCard}>
          <Icon name="leaf-outline" />
          <Text style={ui.heading}>
            {filter === "all"
              ? "Your story starts with a small step"
              : `No ${filter === "habit" ? "habit activity" : filter === "routine" ? "routine activity" : "notes"} yet`}
          </Text>
          <Text style={ui.body}>
            Your recorded progress will find a place here as you go.
          </Text>
          {filter === "all" && (
            <Button
              label="Choose a habit for today"
              secondary
              onPress={() => {
                setSelectedDate(today);
                router.navigate("/");
              }}
            />
          )}
        </View>
      )}
      {groups.map((group) => (
        <View key={group.date} style={{ gap: 8 }}>
          <Text
            accessibilityRole="header"
            style={[ui.label, { color: colors.muted }]}
          >
            {group.date === today
              ? "Today"
              : group.date === addDays(today, -1)
                ? "Yesterday"
                : longDate(group.date)}
            {group.date.slice(0, 4) !== today.slice(0, 4)
              ? `, ${group.date.slice(0, 4)}`
              : ""}
          </Text>
          {group.items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.detail}. ${item.date}. Open ${item.kind === "note" ? "note" : item.kind === "routine" ? "routine" : "habit details"}`}
              onPress={() => open(item)}
              style={[
                ui.row,
                {
                  minHeight: 64,
                  alignItems: "flex-start",
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={{
                  width: 36,
                  minHeight: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    item.status === "completed"
                      ? colors.sage
                      : colors.background,
                }}
              >
                <Icon
                  name={
                    item.status === "skipped"
                      ? "remove-circle-outline"
                      : item.status === "partial"
                        ? "pie-chart-outline"
                        : kindIcon[item.kind]
                  }
                  size={22}
                  color={
                    item.status === "completed" ? colors.green : colors.muted
                  }
                />
              </View>
              <View style={[ui.grow, { gap: 5 }]}>
                <Text style={ui.label}>{item.title}</Text>
                <Text style={ui.small}>{item.detail}</Text>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      ))}
      {filtered.length > 0 && (
        <Text style={ui.small}>
          Showing {Math.min(limit, filtered.length)} of {filtered.length}{" "}
          {filtered.length === 1 ? "activity" : "activities"}
        </Text>
      )}
      {filtered.length > limit && (
        <Button
          label="Show more activity"
          secondary
          onPress={() => setLimit((n) => n + 8)}
        />
      )}
      {session && (
        <Sheet
          title="Routine activity"
          onClose={() => setRoutineSession(undefined)}
        >
          <Text style={ui.heading}>
            {session.name ?? routine?.name ?? "Routine"}
          </Text>
          <Text style={ui.body}>
            {longDate(session.date)} ·{" "}
            {session.busy ? "Busy day" : "Full routine"}
          </Text>
          <Text style={ui.small}>
            {session.completed.length} / {session.steps.length} steps recorded ·{" "}
            {session.ended ? "Ended" : "In progress"}
          </Text>
          {session.steps.map((step, index) => (
            <View key={step.id} style={ui.row}>
              <Icon
                name={
                  session.completed.includes(step.id)
                    ? "checkmark-circle-outline"
                    : "ellipse-outline"
                }
              />
              <View style={ui.grow}>
                <Text style={ui.label}>
                  {index + 1}. {step.name}
                </Text>
                <Text style={ui.small}>
                  {session.busy ? step.busyMinutes : step.minutes} min ·{" "}
                  {session.completed.includes(step.id)
                    ? "Completed"
                    : "Not completed"}
                </Text>
              </View>
            </View>
          ))}
          {routine ? (
            <Button
              label={session.ended ? "View routine" : "Continue routine"}
              onPress={() => {
                if (!session.ended) setSelectedDate(session.date);
                setRoutineSession(undefined);
                router.push({
                  pathname: "/routine",
                  params: { id: routine.id },
                });
              }}
            />
          ) : (
            <Text style={ui.small}>
              This routine was removed. Your recorded steps are still here.
            </Text>
          )}
          <Button
            label="Close routine activity"
            secondary
            onPress={() => setRoutineSession(undefined)}
          />
        </Sheet>
      )}
    </View>
  );
}
