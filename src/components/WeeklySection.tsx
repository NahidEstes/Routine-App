import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ScheduledItem } from "../models/types";
import { weeklyPlan } from "../domain/schedule";
import { useTracker } from "../state/TrackerProvider";
import { weekDates } from "../utils/dates";
import { WeeklyGoals } from "./WeeklyGoals";
import { Icon } from "./ui";
import { useTheme } from "../theme";
export function WeeklySection({
  date,
  onReschedule,
}: {
  date: string;
  onReschedule: (item: ScheduledItem) => void;
}) {
  const { colors, ui } = useTheme();
  const { state } = useTracker();
  const [open, setOpen] = useState(false);
  const count = state.habits.filter((h) =>
    weeklyPlan(state, h.id, weekDates(date)[0]),
  ).length;
  if (!count) return null;
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Weekly goals"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={[
          ui.between,
          { minHeight: 48, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.sage, paddingHorizontal: 10 },
        ]}
      >
        <View style={[ui.row, ui.grow]}>
          <Icon name="repeat-outline" size={22} />
          <Text style={[ui.label, ui.grow]}>Weekly goals · {count}</Text>
        </View>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={20} />
      </Pressable>
      {open && (
        <>
          <Text style={ui.small}>
            Flexible opportunities for {date}. Select another day above to plan
            a different day.
          </Text>
          <WeeklyGoals date={date} onReschedule={onReschedule} />
        </>
      )}
    </View>
  );
}
