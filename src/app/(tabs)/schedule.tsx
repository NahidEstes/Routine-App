import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Header, Icon, Screen, Segment } from "../../components/ui";
import { DatePickerButton, DaySelector } from "../../components/DaySelector";
import { TabRow } from "../../components/TabCards";
import { AddHabitButton } from "../../components/AddHabitButton";
import { ScheduleTimeline } from "../../components/ScheduleTimeline";
import { ActionFeedback } from "../../components/ActionFeedback";
import { RescheduleModal } from "../../components/RescheduleModal";
import { WeeklySection } from "../../components/WeeklySection";
import { useTracker } from "../../state/TrackerProvider";
import { itemsForDate } from "../../domain/progress";
import type { ScheduledItem } from "../../models/types";
import { longDate, weekDates } from "../../utils/dates";
import { useTheme } from "../../theme";
import { useLocalClock } from "../../hooks/useLocalClock";
import { PauseNotice } from "../../components/PauseNotice";
import { HabitListControls } from "../../components/HabitListControls";
import { matchesHabit } from "../../domain/organization";

export default function Schedule() {
  const { ui } = useTheme();
  const { state, selectedDate, setSelectedDate, today } = useTracker();
  const clock = useLocalClock();
  const [view, setView] = useState<"day" | "week">("day");
  const [reschedule, setReschedule] = useState<ScheduledItem | null>(null);
  const dates = view === "day" ? [selectedDate] : weekDates(selectedDate);
  const filtersOn =
    !!state.features.search ||
    state.features.priorityFilter !== "all" ||
    state.features.typeFilter !== "all";
  return (
    <Screen
      tab
      compact
      fullWidthAction
      floatingAction={<AddHabitButton scheduled fullWidth />}
    >
      <Header
        title="Schedule"
        subtitle="A little structure. Room to breathe."
        action={
          state.habits.length ? (
            <HabitListControls compact timeline />
          ) : undefined
        }
      />
      <DaySelector
        stripOnly
        filled
        label="Choose schedule day"
        value={selectedDate}
        onChange={setSelectedDate}
      />
      <Segment
        options={[
          { value: "day", label: "Day" },
          { value: "week", label: "Week" },
        ]}
        value={view}
        onChange={setView}
      />
      {selectedDate !== today && (
        <Button
          compact
          label="Back to today"
          secondary
          onPress={() => setSelectedDate(today)}
        />
      )}
      <View style={ui.between}>
        <Text accessibilityRole="header" style={[ui.heading, ui.grow]}>
          {longDate(selectedDate)}
        </Text>
        <DatePickerButton
          value={selectedDate}
          onChange={setSelectedDate}
          label="Choose schedule day"
        />
      </View>
      {filtersOn && (
        <Text style={ui.small}>Chronological timeline · Filters on</Text>
      )}
      <ActionFeedback />
      {dates.map((date) => {
        const items = itemsForDate(state, date, today).filter(
          (i) => !i.weekly && matchesHabit(state, i.habit),
        );
        return (
          <View key={date} style={{ gap: 12 }}>
            <PauseNotice date={date} />
            {view === "week" && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={"Open schedule " + date}
                onPress={() => {
                  setSelectedDate(date);
                  setView("day");
                }}
                style={[ui.between, { minHeight: 48 }]}
              >
                <Text style={[ui.heading, ui.grow]}>{longDate(date)}</Text>
                <Icon name="chevron-forward" size={18} />
              </Pressable>
            )}
            {items.length ? (
              <ScheduleTimeline
                items={items}
                currentTime={date === clock.date ? clock.time : undefined}
                onReschedule={setReschedule}
              />
            ) : (
              <View style={ui.card}>
                <Text style={ui.heading}>A little breathing room</Text>
                <Text style={ui.small}>
                  No daily habits to show. Check pauses or filters, or plan a
                  new habit.
                </Text>
              </View>
            )}
            <Text style={ui.small}>
              {items.length} daily {items.length === 1 ? "habit" : "habits"}{" "}
              planned
            </Text>
          </View>
        );
      })}
      <WeeklySection date={selectedDate} onReschedule={setReschedule} />
      <TabRow
        label="Browse routines"
        icon="layers-outline"
        onPress={() => router.push("/routines")}
      />
      <RescheduleModal item={reschedule} onClose={() => setReschedule(null)} />
    </Screen>
  );
}
