import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Header,
  Icon,
  ProgressRing,
  Screen,
} from "../../components/ui";
import { DaySelector } from "../../components/DaySelector";
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
import type { ScheduledItem } from "../../models/types";
import { useTheme } from "../../theme";
import { useAppearance } from "../../state/AppearanceProvider";
import { longDate } from "../../utils/dates";
import { HabitListControls } from "../../components/HabitListControls";
import { MilestoneNotice } from "../../components/Achievements";
import { PauseNotice } from "../../components/PauseNotice";
import { isPaused, matchesHabit, sortHabits } from "../../domain/organization";

export default function Today() {
  const { colors, ui } = useTheme();
  const { active, daysLeft } = useAppearance();
  const { preferences, preferencesReady } = useLocalFeatures();
  const { state, selectedDate, setSelectedDate, today, busy, setBusy, saving } =
    useTracker();
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
  const cards = (list: ScheduledItem[]) =>
    list.map((item) => (
      <HabitCard
        key={item.id}
        item={item}
        onReschedule={() => setReschedule(item)}
      />
    ));
  return (
    <Screen>
      <Header
        title="Today"
        subtitle={longDate(selectedDate)}
        action={
          active ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View trial status in Settings"
              onPress={() => router.navigate("/settings")}
              style={{ minHeight: 48, justifyContent: "center" }}
            >
              <Text style={[ui.small, { color: colors.toolbarText }]}>
                Trial · {daysLeft}d
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      {preferencesReady &&
        !preferences.onboardingSeen &&
        state.habits.length === 0 &&
        state.routines.length === 0 && <GettingStarted />}
      <DaySelector
        label="Choose day"
        value={selectedDate}
        onChange={setSelectedDate}
      />
      {selectedDate !== today && (
        <Button
          label="Back to today"
          secondary
          onPress={() => setSelectedDate(today)}
        />
      )}
      <View style={[ui.sageCard, ui.between]}>
        <View style={[ui.grow, { gap: 8 }]}>
          <Text style={ui.heading}>
            {selectedDate > today
              ? `${items.length} habits planned`
              : `${stats.done} of ${stats.total} completed`}
          </Text>
          <Text style={ui.small}>
            {selectedDate > today
              ? "Your upcoming day, at a glance."
              : !stats.total && pausedHabits
                ? "Take your break. Paused days are neutral."
                : !items.length
                  ? "Add a habit to shape your day."
                  : stats.done === stats.total
                    ? "All done. Enjoy a little breathing room."
                    : `${items.filter((i) => !i.paused && i.status === "pending").length} remaining${stats.skipped ? ` · ${stats.skipped} skipped` : ""}`}
          </Text>
        </View>
        {stats.total > 0 && selectedDate <= today && (
          <ProgressRing percent={stats.percent} size={76} />
        )}
      </View>
      <ActionFeedback />
      <MilestoneNotice />
      <PauseNotice date={selectedDate} />
      {state.habits.length > 0 && <HabitListControls />}
      {activeFilters && (
        <Text style={ui.small}>
          Filters affect the lists below. Your daily summary includes all
          eligible habits.
        </Text>
      )}
      {activeFilters && !visibleItems.length && (
        <Text style={ui.body}>
          No daily habits match these filters. Try another name or clear
          filters.
        </Text>
      )}
      {agendaGroups(groups.pending).map((group) => (
        <View key={group.title} style={{ gap: 12 }}>
          <View style={ui.row}>
            <Icon
              name={
                group.title === "Morning"
                  ? "sunny-outline"
                  : group.title === "Evening"
                    ? "moon-outline"
                    : "time-outline"
              }
              color={colors.amber}
            />
            <Text accessibilityRole="header" style={ui.heading}>
              {group.title}
            </Text>
          </View>
          {cards(group.items)}
        </View>
      ))}
      {!items.length && !pausedHabits && !activeFilters && (
        <View style={ui.card}>
          <Text style={ui.heading}>Start with one small habit</Text>
          <Text style={ui.body}>
            Try drinking water, reading or a short walk. Choose a template and
            make it yours.
          </Text>
          <Button
            label="Explore habit templates"
            secondary
            onPress={() => router.push("/habit")}
          />
        </View>
      )}
      {groups.completed.length > 0 && (
        <View style={{ gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Completed habits, ${groups.completed.length}`}
            accessibilityState={{ expanded: completedOpen }}
            onPress={() => setCompletedOpen(!completedOpen)}
            style={[ui.sageCard, ui.between]}
          >
            <Icon name="checkmark-circle-outline" />
            <Text style={[ui.label, ui.grow]}>
              Completed · {groups.completed.length}
            </Text>
            <Icon name={completedOpen ? "chevron-up" : "chevron-down"} />
          </Pressable>
          {completedOpen && cards(groups.completed)}
        </View>
      )}
      {groups.skipped.length > 0 && (
        <View style={{ gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Skipped habits, ${groups.skipped.length}`}
            accessibilityState={{ expanded: skippedOpen }}
            onPress={() => setSkippedOpen(!skippedOpen)}
            style={[ui.card, ui.between]}
          >
            <Text style={[ui.label, ui.grow]}>
              Skipped · {groups.skipped.length}
            </Text>
            <Icon name={skippedOpen ? "chevron-up" : "chevron-down"} />
          </Pressable>
          {skippedOpen && cards(groups.skipped)}
        </View>
      )}
      {visibleItems.some((i) => i.paused) && (
        <View style={{ gap: 12 }}>
          <Text style={ui.heading}>Recorded on paused days</Text>
          {cards(visibleItems.filter((i) => i.paused))}
        </View>
      )}
      <Button
        label="Add habit"
        icon="add"
        onPress={() => router.push("/habit")}
      />
      <WeeklySection date={selectedDate} onReschedule={setReschedule} />
      <View style={ui.card}>
        <Text style={ui.heading}>Your routines</Text>
        <Text style={ui.small}>
          A few actions that fit together. Build a morning or evening routine.
        </Text>
        <Button
          label="Browse routines"
          icon="layers-outline"
          secondary
          onPress={() => router.push("/routines")}
        />
      </View>
      <Button
        label={busy ? "Busy day mode · On" : "Busy day mode"}
        secondary
        icon="flash-outline"
        onPress={() => setOptions(true)}
      />
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
