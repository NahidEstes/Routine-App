import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { completion } from "../domain/progress";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { DAY_NAMES, parseDate, shortDate } from "../utils/dates";

export function DailyCompletionChart({
  dates,
  period,
}: {
  dates: string[];
  period: "week" | "month";
}) {
  const { state, today } = useTracker();
  const { colors, ui } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [selected, setSelected] = useState<string>();
  const columns = useMemo(
    () => dates.map((date) => ({ date, ...completion(state, [date], today) })),
    [state, dates, today],
  );
  const focused = columns.find((column) => column.date === selected);
  return (
    <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.heading}>
        Daily completion
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={period === "month"}
        contentContainerStyle={{ flexGrow: 1, gap: period === "week" ? 8 : 10 }}
      >
        {columns.map((column) => {
          const future = column.date > today;
          const empty = future || column.total === 0;
          const active = selected
            ? column.date === selected
            : column.date === today;
          const description = future
            ? "Upcoming"
            : !column.total
              ? "No daily habits scheduled"
              : `${column.done} of ${column.total} completed, ${column.percent}%`;
          return (
            <Pressable
              key={column.date}
              accessibilityRole="button"
              accessibilityLabel={`${shortDate(column.date)}: ${description}`}
              accessibilityState={{ selected: column.date === selected }}
              onPress={() => setSelected(column.date)}
              style={{
                flex: period === "week" ? 1 : undefined,
                width: period === "month" ? 40 : undefined,
                minWidth: 30 * fontScale,
                alignItems: "center",
                gap: 8,
                paddingVertical: 4,
              }}
            >
              <Text style={[ui.small, { fontSize: 12 }]}>
                {empty ? "–" : `${column.percent}%`}
              </Text>
              <View
                style={{
                  height: 112,
                  width: "100%",
                  maxWidth: 44,
                  justifyContent: "flex-end",
                }}
              >
                {empty ? (
                  <View
                    style={{
                      height: "100%",
                      borderRadius: 10,
                      borderWidth: 1,
                      borderStyle: "dashed",
                      borderColor: colors.muted,
                      opacity: 0.5,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      height: `${column.percent}%`,
                      borderRadius: 10,
                      backgroundColor: active ? colors.green : colors.sageDark,
                    }}
                  />
                )}
                {!empty && column.percent === 0 && (
                  <View style={{ height: 1, backgroundColor: colors.border }} />
                )}
              </View>
              <Text
                style={[
                  ui.small,
                  {
                    fontSize: 12,
                    color: active ? colors.green : colors.muted,
                    fontWeight: active ? "700" : "400",
                  },
                ]}
              >
                {period === "week"
                  ? DAY_NAMES[parseDate(column.date).getDay()]
                  : parseDate(column.date).getDate()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text
        style={[
          ui.small,
          { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
        ]}
      >
        {focused
          ? `${shortDate(focused.date)} · ${focused.date > today ? "Upcoming" : !focused.total ? "No daily habits scheduled" : `${focused.done} of ${focused.total} completed · ${focused.missed} missed`}`
          : dates.includes(today)
            ? "Today is still in progress."
            : "Daily goals for this period."}
      </Text>
    </View>
  );
}
