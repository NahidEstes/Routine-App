import { Text, View } from "react-native";
import { useTracker } from "../state/TrackerProvider";
import {
  entriesForDate,
  weeklyCompleted,
  weeklyPlan,
} from "../domain/schedule";
import { weekDates } from "../utils/dates";
import type { ScheduledItem } from "../models/types";
import { HabitCard } from "./EntryCard";
import { useTheme } from "../theme";
import { matchesHabit, sortHabits, isPaused } from "../domain/organization";
export function WeeklyGoals({
  date,
  onReschedule,
}: {
  date: string;
  onReschedule: (item: ScheduledItem) => void;
}) {
  const { ui } = useTheme();
  const { state, today } = useTracker();
  const week = weekDates(date)[0];
  const plans = sortHabits(
    state,
    state.habits.filter((h) => matchesHabit(state, h)),
    (h) => h.id,
    (h) => h.time,
  ).flatMap((h) => {
    const plan = weeklyPlan(state, h.id, week);
    return plan ? [plan] : [];
  });
  if (!plans.length) return null;
  const items = entriesForDate(state, date, today).filter((e) => e.weekly);
  return (
    <View style={{ gap: 12 }}>
      <Text style={ui.heading}>Flexible weekly goals</Text>
      <Text style={ui.small}>
        Choose your own days. One completed day earns one credit.
      </Text>
      {plans.map((plan) => (
        <View key={plan.id} style={ui.card}>
          <Text style={ui.label}>
            {plan.snapshot.name} ·{" "}
            {Math.min(plan.target, weeklyCompleted(state, plan))}/{plan.target}{" "}
            days this week
          </Text>
          {weekDates(date)[6] < today &&
            weeklyCompleted(state, plan) < plan.target && (
              <Text style={ui.small}>
                Week ended · {plan.target - weeklyCompleted(state, plan)}{" "}
                credits missed
              </Text>
            )}
          {items
            .filter((e) => e.habitId === plan.habitId)
            .map((item) => (
              <HabitCard
                key={item.id}
                item={item}
                onReschedule={() => onReschedule(item)}
              />
            ))}
          {!items.some((e) => e.habitId === plan.habitId) && (
            <Text style={ui.small}>
              {weeklyCompleted(state, plan) >= plan.target
                ? plan.target === 0
                  ? "Paused week · No credits required."
                  : "Weekly target met. Enjoy the space."
                : isPaused(state, plan.habitId, date)
                  ? "This habit is paused on this date."
                  : "No recorded session on this date."}
            </Text>
          )}
          {state.features.pauses.some(
            (p) =>
              p.habitIds.includes(plan.habitId) &&
              p.start <= weekDates(date)[6] &&
              p.end >= week,
          ) && (
            <Text style={ui.small}>
              Pause adjustment: weekly target × active eligible days ÷ all
              eligible days, rounded up. Existing completion credits are
              preserved.
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
