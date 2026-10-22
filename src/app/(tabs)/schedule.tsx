import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Header, Icon, Screen, Segment } from "../../components/ui";
import { DaySelector } from "../../components/DaySelector";
import { HabitCard } from "../../components/EntryCard";
import { ActionFeedback } from "../../components/ActionFeedback";
import { RescheduleModal } from "../../components/RescheduleModal";
import { WeeklySection } from "../../components/WeeklySection";
import { useTracker } from "../../state/TrackerProvider";
import { itemsForDate } from "../../domain/progress";
import { agendaGroups } from "../../presentation/habits";
import type { ScheduledItem } from "../../models/types";
import { longDate, weekDates } from "../../utils/dates";
import { useTheme } from "../../theme";
import { PauseNotice } from "../../components/PauseNotice";
import { HabitListControls } from "../../components/HabitListControls";
import { matchesHabit, sortHabits } from "../../domain/organization";

export default function Schedule() {
  const { colors, ui } = useTheme();
  const { state, selectedDate, setSelectedDate, today } = useTracker();
  const [view, setView] = useState<"day" | "week">("day");
  const [reschedule, setReschedule] = useState<ScheduledItem | null>(null);
  const dates = view === "day" ? [selectedDate] : weekDates(selectedDate);
  return (
    <Screen compact>
      <Header
        title="Schedule"
        subtitle="A little planning for the days ahead."
      />
      <DaySelector
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
      <ActionFeedback />
      {!!state.habits.length && <HabitListControls />}
      {dates.map((date) => {
        const items = sortHabits(
          state,
          itemsForDate(state, date, today).filter(
            (i) => !i.weekly && matchesHabit(state, i.habit),
          ),
          (i) => i.habitId,
          (i) => i.time,
        );
        return (
          <View key={date} style={{ gap: 12 }}>
            <PauseNotice date={date} />
            {view === "week" && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open schedule ${date}`}
                onPress={() => {
                  setSelectedDate(date);
                  setView("day");
                }}
                style={[
                  ui.between,
                  {
                    minHeight: 48,
                    borderBottomWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[ui.heading, ui.grow]}>{longDate(date)}</Text>
                <Icon name="chevron-forward" size={18} />
              </Pressable>
            )}
            {items.length ? (
              agendaGroups(items).map((group) => (
                <View key={group.title} style={{ gap: 12 }}>
                  <Text accessibilityRole="header" style={ui.heading}>
                    {group.title}
                  </Text>
                  {group.items.map((item) => (
                    <HabitCard
                      key={item.id}
                      item={item}
                      schedule
                      onReschedule={() => setReschedule(item)}
                    />
                  ))}
                </View>
              ))
            ) : (
              <Text style={[ui.subtitle, { paddingVertical: 12 }]}>
                {view === "day"
                  ? "No daily habits to show. Check pauses or active filters; flexible weekly goals are below."
                  : "No daily habits to show. Check pauses or filters."}
              </Text>
            )}
            <Text style={ui.small}>
              {items.length} daily {items.length === 1 ? "habit" : "habits"}{" "}
              planned
            </Text>
          </View>
        );
      })}
      <WeeklySection date={selectedDate} onReschedule={setReschedule} />
      <Button
        label="Plan a habit"
        icon="add"
        onPress={() =>
          router.push({ pathname: "/habit", params: { scheduled: "true" } })
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Browse routines"
        onPress={() => router.push("/routines")}
        style={{
          minHeight: 48,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={ui.small}>Browse routines</Text>
      </Pressable>
      <RescheduleModal item={reschedule} onClose={() => setReschedule(null)} />
    </Screen>
  );
}
