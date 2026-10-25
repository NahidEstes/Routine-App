import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Header, Icon, Screen } from "../../components/ui";
import { DatePickerButton, DaySelector } from "../../components/DaySelector";
import { AddHabitButton } from "../../components/AddHabitButton";
import { HabitCard } from "../../components/EntryCard";
import { ActionFeedback } from "../../components/ActionFeedback";
import { RescheduleModal } from "../../components/RescheduleModal";
import { WeeklySection } from "../../components/WeeklySection";
import { GettingStarted } from "../../components/GettingStarted";
import { Sheet } from "../../components/Sheet";
import { useTracker } from "../../state/TrackerProvider";
import { useLocalFeatures } from "../../state/LocalFeaturesProvider";
import { completion, itemsForDate } from "../../domain/progress";
import { agendaGroups, splitDay } from "../../presentation/habits";
import { selectDayFocus } from "../../presentation/dayFocus";
import { useLocalClock } from "../../hooks/useLocalClock";
import type { ScheduledItem } from "../../models/types";
import { useTheme } from "../../theme";
import { longDate } from "../../utils/dates";
import { HabitListControls } from "../../components/HabitListControls";
import { PauseNotice } from "../../components/PauseNotice";
import { isPaused, matchesHabit, sortHabits } from "../../domain/organization";

export default function Today() {
  const { colors, ui } = useTheme();
  const { preferences, preferencesReady, timer } = useLocalFeatures();
  const { state, selectedDate, setSelectedDate, today, busy, setBusy, saving } =
    useTracker();
  const clock = useLocalClock();
  const [reschedule, setReschedule] = useState<ScheduledItem | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [skippedOpen, setSkippedOpen] = useState(false);
  const [options, setOptions] = useState(false);
  const items = itemsForDate(state, selectedDate, today).filter(
    (i) => !i.weekly,
  );
  const visibleItems = sortHabits(
    state,
    items.filter((i) => matchesHabit(state, i.habit)),
    (i) => i.habitId,
    (i) => i.time,
  );
  const groups = splitDay(visibleItems.filter((i) => !i.paused));
  const pausedHabits = state.habits.some((h) =>
    isPaused(state, h.id, selectedDate),
  );
  const activeFilters =
    !!state.features.search ||
    state.features.priorityFilter !== "all" ||
    state.features.typeFilter !== "all";
  const stats = completion(state, [selectedDate], today);
  const next = selectDayFocus(
    groups.pending,
    selectedDate,
    clock.date,
    clock.time,
    timer?.entryId,
  );
  const remaining = groups.pending.filter((item) => item.id !== next?.id);
  const cards = (list: ScheduledItem[]) =>
    list.map((item) => (
      <HabitCard
        key={item.id}
        item={item}
        onReschedule={() => setReschedule(item)}
      />
    ));
  // One keyed sibling list keeps open editors mounted when the display clock
  // moves a habit between Up next and its time-of-day section.
  const pendingCards = next
    ? [
        <HabitCard
          key={next.id}
          focus
          item={next}
          onReschedule={() => setReschedule(next)}
        />,
      ]
    : [];
  for (const group of agendaGroups(remaining)) {
    pendingCards.push(
      <Text
        key={`section:${group.title}`}
        accessibilityRole="header"
        style={[ui.small, { fontWeight: "600", color: colors.muted }]}
      >
        {group.title}
      </Text>,
      ...cards(group.items),
    );
  }
  return (
    <Screen compact floatingAction={<AddHabitButton />}>
      <Header
        title={selectedDate === today ? "Today" : "Your day"}
        subtitle={longDate(selectedDate)}
        action={
          <DatePickerButton value={selectedDate} onChange={setSelectedDate} />
        }
      />
      {preferencesReady &&
        !preferences.onboardingSeen &&
        state.habits.length === 0 &&
        state.routines.length === 0 && <GettingStarted />}
      <DaySelector
        stripOnly
        label="Choose day"
        value={selectedDate}
        onChange={setSelectedDate}
      />
      {selectedDate !== today && (
        <Button
          compact
          label="Back to today"
          secondary
          onPress={() => setSelectedDate(today)}
        />
      )}
      <View style={[ui.card, { padding: 12, gap: 6 }]}>
        <View style={ui.between}>
          <Text style={[ui.label, ui.grow]}>
            {selectedDate > today
              ? items.length + " habits planned"
              : stats.done + " of " + stats.total + " completed"}
          </Text>
          {stats.total > 0 && selectedDate <= today && (
            <Text style={[ui.small, { color: colors.green }]}>
              {stats.percent}%
            </Text>
          )}
        </View>
        <Text style={ui.small}>
          {selectedDate > today
            ? "Your upcoming day, at a glance."
            : !stats.total && pausedHabits
              ? "Take your break. Paused days are neutral."
              : !items.length
                ? state.habits.length
                  ? "No daily habits scheduled for this day."
                  : "Start with one small habit."
                : stats.done === stats.total
                  ? "All done. Enjoy a little breathing room."
                  : items.filter((i) => !i.paused && i.status === "pending")
                      .length +
                    " remaining" +
                    (stats.skipped ? " · " + stats.skipped + " skipped" : "")}
        </Text>
        {stats.total > 0 && selectedDate <= today && (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Daily completion"
            accessibilityValue={{ min: 0, max: 100, now: stats.percent }}
            style={{
              height: 4,
              backgroundColor: colors.track,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 4,
                width: `${stats.percent}%`,
                backgroundColor: colors.green,
              }}
            />
          </View>
        )}
      </View>
      <ActionFeedback />
      <PauseNotice date={selectedDate} />
      <View style={[ui.between, { flexWrap: "wrap", gap: 6 }]}>
        <Text
          accessibilityRole="header"
          style={[ui.heading, { flexGrow: 1, flexBasis: 64 }]}
        >
          Your habits
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={busy ? "Busy day mode, on" : "Busy day mode"}
          onPress={() => setOptions(true)}
          style={{
            minHeight: 48,
            paddingHorizontal: 12,
            borderRadius: 24,
            backgroundColor: busy ? colors.amberLight : colors.sage,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name="flash-outline" size={16} color={colors.amber} />
          <Text
            style={{ color: colors.amber, fontSize: 12, fontWeight: "600" }}
          >
            {busy ? "Busy day · On" : "Busy day"}
          </Text>
        </Pressable>
        {state.habits.length > 0 && <HabitListControls compact />}
      </View>
      {activeFilters && (
        <Text style={ui.small}>
          Filters are on. The summary includes all eligible habits; change or
          clear filters using the filter button.
        </Text>
      )}
      {activeFilters && !visibleItems.length && (
        <Text style={ui.body}>
          No daily habits match these filters. Try another name or clear
          filters.
        </Text>
      )}
      {pendingCards.length > 0 && (
        <View style={{ gap: 10 }}>{pendingCards}</View>
      )}
      {!items.length && !pausedHabits && !activeFilters && (
        <View style={ui.card}>
          <Icon name="leaf-outline" size={32} />
          <Text style={ui.heading}>
            {state.habits.length
              ? "Nothing scheduled for this day"
              : "A little progress starts here"}
          </Text>
          <Text style={ui.body}>
            {state.habits.length
              ? "Enjoy the space, choose another date, or plan a habit with the + button."
              : "Try drinking water, reading or a short walk. Choose a template and make it yours."}
          </Text>
          {!state.habits.length && (
            <Button
              label="Explore habit templates"
              secondary
              onPress={() => router.push("/getting-started")}
            />
          )}
        </View>
      )}
      {groups.completed.length > 0 && (
        <View style={{ gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={"Completed habits, " + groups.completed.length}
            accessibilityState={{ expanded: completedOpen }}
            onPress={() => setCompletedOpen(!completedOpen)}
            style={[
              ui.sageCard,
              ui.between,
              {
                minHeight: 48,
                paddingVertical: 10,
                paddingHorizontal: 12,
                gap: 8,
              },
            ]}
          >
            <Icon name="checkmark-circle" />
            <Text style={[ui.label, ui.grow]}>
              Completed · {groups.completed.length}
            </Text>
            <Icon
              name={completedOpen ? "chevron-up" : "chevron-down"}
              size={18}
            />
          </Pressable>
          {completedOpen && cards(groups.completed)}
        </View>
      )}
      {groups.skipped.length > 0 && (
        <View style={{ gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={"Skipped habits, " + groups.skipped.length}
            accessibilityState={{ expanded: skippedOpen }}
            onPress={() => setSkippedOpen(!skippedOpen)}
            style={[
              ui.card,
              ui.between,
              {
                minHeight: 48,
                paddingVertical: 10,
                paddingHorizontal: 12,
                gap: 8,
              },
            ]}
          >
            <Icon name="remove-circle-outline" color={colors.muted} />
            <Text style={[ui.label, ui.grow]}>
              Skipped · {groups.skipped.length}
            </Text>
            <Icon
              name={skippedOpen ? "chevron-up" : "chevron-down"}
              size={18}
            />
          </Pressable>
          {skippedOpen && cards(groups.skipped)}
        </View>
      )}
      {visibleItems.some((i) => i.paused) && (
        <View style={{ gap: 10 }}>
          <Text style={ui.heading}>Recorded on paused days</Text>
          {cards(visibleItems.filter((i) => i.paused))}
        </View>
      )}
      <WeeklySection date={selectedDate} onReschedule={setReschedule} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Browse routines"
        onPress={() => router.push("/routines")}
        style={[ui.card, ui.between]}
      >
        <Icon name="layers-outline" />
        <View style={[ui.grow, { gap: 4 }]}>
          <Text style={ui.label}>Your routines</Text>
          <Text style={ui.small}>A few small actions, together.</Text>
        </View>
        <Icon name="chevron-forward" size={18} />
      </Pressable>
      <Button
        label="Manage habits and archive"
        secondary
        onPress={() => router.push("/habits")}
      />
      {options && (
        <Sheet title="Busy day mode" onClose={() => setOptions(false)}>
          <Text style={ui.body}>
            Use a smaller goal on a fuller day. Already recorded progress keeps
            its original goal.
          </Text>
          <View style={ui.between}>
            <Text style={[ui.label, ui.grow]}>Use busy day goals</Text>
            <Switch
              accessibilityLabel="Busy day mode"
              disabled={saving}
              value={busy}
              onValueChange={setBusy}
            />
          </View>
          <Button label="Done" onPress={() => setOptions(false)} />
        </Sheet>
      )}
      <RescheduleModal item={reschedule} onClose={() => setReschedule(null)} />
    </Screen>
  );
}
