import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  DateStrip,
  EmptyState,
  Header,
  Icon,
  IconButton,
  ProgressRing,
  Screen,
} from "../../components/ui";
import { HabitCard } from "../../components/EntryCard";
import { RescheduleModal } from "../../components/RescheduleModal";
import { useTracker } from "../../state/TrackerProvider";
import { completion, itemsForDate } from "../../domain/progress";
import type { ScheduledItem } from "../../models/types";
import { longDate } from "../../utils/dates";
import { WeeklyGoals } from "../../components/WeeklyGoals";
import { colors, ui } from "../../theme";

export default function Today() {
  const { state, selectedDate, setSelectedDate, busy, setBusy, today } =
    useTracker();
  const [reschedule, setReschedule] = useState<ScheduledItem | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const items = itemsForDate(state, selectedDate, today).filter(
    (i) => !i.weekly,
  );
  const stats = {
    ...completion(state, [selectedDate]),
    ...(selectedDate > today ? { total: items.length } : {}),
  };
  const groups = [
    {
      title: "Morning",
      icon: "sunny-outline" as const,
      items: items.filter((i) => i.time && i.time < "12:00"),
    },
    {
      title: "Afternoon",
      icon: "partly-sunny-outline" as const,
      items: items.filter(
        (i) => i.time && i.time >= "12:00" && i.time < "17:00",
      ),
    },
    {
      title: "Evening",
      icon: "moon-outline" as const,
      items: items.filter((i) => i.time && i.time >= "17:00"),
    },
    {
      title: "Anytime",
      icon: "leaf-outline" as const,
      items: items.filter((i) => !i.time),
    },
  ];
  return (
    <Screen>
      <Text style={ui.subtitle}>Make a little room for yourself</Text>
      <Header
        title="Today"
        subtitle={longDate(selectedDate)}
        action={
          <IconButton
            name="add"
            label="Add a habit"
            onPress={() => router.push("/habit")}
          />
        }
      />
      <DateStrip value={selectedDate} onChange={setSelectedDate} />
      {selectedDate !== today && (
        <Button
          label="Back to today"
          secondary
          onPress={() => setSelectedDate(today)}
        />
      )}
      <View style={[ui.sageCard, ui.between]}>
        <View style={ui.grow}>
          <Text style={ui.heading}>Small steps, steady progress</Text>
          <Text style={[ui.subtitle, { marginTop: 6 }]}>
            {stats.done} of {stats.total} daily tasks completed
          </Text>
          <Text style={ui.small}>
            {items.filter((i) => i.status === "skipped").length} skipped ·{" "}
            {items.filter((i) => i.displayStatus === "pending").length}{" "}
            remaining
            {" · "}
            {stats.missed} missed · {stats.busy} busy goals
          </Text>
        </View>
        <ProgressRing percent={stats.percent} />
      </View>
      <View
        style={[
          ui.card,
          ui.between,
          { backgroundColor: busy ? colors.amberLight : colors.card },
        ]}
      >
        <View style={[ui.row, ui.grow]}>
          <Icon name="flash-outline" color={colors.amber} />
          <View style={ui.grow}>
            <Text style={ui.label}>Busy day mode</Text>
            <Text style={ui.small}>Smaller goals still count.</Text>
          </View>
        </View>
        <Switch
          accessibilityLabel="Busy day mode"
          value={busy}
          onValueChange={setBusy}
          trackColor={{ false: "#D5D9D0", true: colors.green }}
          thumbColor="white"
        />
      </View>
      {!items.length ? (
        <EmptyState
          title="A little breathing room"
          message="No daily tasks planned for this day. Add one or choose another date."
          action="Add a habit"
          onPress={() => router.push("/habit")}
        />
      ) : (
        groups
          .filter((g) => g.items.length || g.title === "Afternoon")
          .map((group) => (
            <View key={group.title} style={{ gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Toggle ${group.title}`}
                accessibilityState={{
                  expanded: !collapsed.includes(group.title),
                }}
                onPress={() =>
                  setCollapsed(
                    collapsed.includes(group.title)
                      ? collapsed.filter((g) => g !== group.title)
                      : [...collapsed, group.title],
                  )
                }
                style={[ui.between, { minHeight: 44 }]}
              >
                <View style={ui.row}>
                  <Icon name={group.icon} color={colors.amber} />
                  <Text style={ui.heading}>{group.title}</Text>
                  <Text style={ui.small}>{group.items.length}</Text>
                </View>
                <Icon
                  name={
                    collapsed.includes(group.title)
                      ? "chevron-down"
                      : "chevron-up"
                  }
                  size={20}
                />
              </Pressable>
              {!collapsed.includes(group.title) &&
                (group.items.length ? (
                  group.items.map((item) => (
                    <HabitCard
                      key={item.id}
                      item={item}
                      onReschedule={() => setReschedule(item)}
                    />
                  ))
                ) : (
                  <Text style={[ui.small, { paddingLeft: 34 }]}>
                    Nothing planned. Enjoy the pause.
                  </Text>
                ))}
            </View>
          ))
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/routines")}
        style={[ui.sageCard, ui.between]}
      >
        <View style={[ui.row, ui.grow]}>
          <Icon name="sunny-outline" color={colors.amber} />
          <View style={ui.grow}>
            <Text style={ui.heading}>Your routines</Text>
            <Text style={ui.small}>
              {state.routines.filter((r) => !r.archivedAt).length} mindful ways
              to start and unwind
            </Text>
          </View>
        </View>
        <Icon name="chevron-forward" />
      </Pressable>
      <Button
        label="Add a new habit"
        icon="add"
        onPress={() => router.push("/habit")}
      />
      <WeeklyGoals date={selectedDate} onReschedule={setReschedule} />
      <Button
        label="Manage habits & archive"
        secondary
        onPress={() => router.push("/habits")}
      />
      <Text style={[ui.small, { textAlign: "center" }]}>
        Saved locally · Works offline
      </Text>
      <RescheduleModal item={reschedule} onClose={() => setReschedule(null)} />
    </Screen>
  );
}
