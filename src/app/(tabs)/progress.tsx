import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  Button,
  EmptyState,
  Header,
  IconBubble,
  IconButton,
  ProgressRing,
  Screen,
  Segment,
} from "../../components/ui";
import { useDemo } from "../../state/DemoProvider";
import { bestStreak, completion, itemsForDate } from "../../state/selectors";
import {
  addDays,
  DAY_NAMES,
  DEMO_TODAY,
  monthDates,
  parseDate,
  shortDate,
  weekDates,
} from "../../utils/dates";
import { colors, ui } from "../../theme";

export default function Progress() {
  const { state, selectedDate, setSelectedDate } = useDemo();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const dates = (
    period === "week" ? weekDates(selectedDate) : monthDates(selectedDate)
  ).filter((date) => date <= DEMO_TODAY);
  const stats = completion(state, dates);
  const active = state.habits.filter((h) =>
    state.occurrences.some((o) => o.habitId === h.id && dates.includes(o.date)),
  );
  const history = [...dates]
    .reverse()
    .filter((date) => itemsForDate(state, date).length);
  const shownUp = history.filter(
    (date) => completion(state, [date]).done > 0,
  ).length;
  const chartDates =
    period === "week" ? weekDates(selectedDate) : monthDates(selectedDate);
  function movePeriod(direction: number) {
    if (period === "week")
      setSelectedDate(addDays(selectedDate, direction * 7));
    else {
      const date = parseDate(selectedDate);
      date.setDate(1);
      date.setMonth(date.getMonth() + direction);
      setSelectedDate(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`,
      );
    }
    setFocusDate(null);
  }
  return (
    <Screen>
      <Header title="Your progress" subtitle="Consistency over perfection" />
      <Segment
        options={[
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
        ]}
        value={period}
        onChange={(value) => {
          setPeriod(value);
          setFocusDate(null);
        }}
      />
      <View style={ui.between}>
        <IconButton
          name="chevron-back"
          label="Previous period"
          onPress={() => movePeriod(-1)}
        />
        <Text style={[ui.label, ui.grow, { textAlign: "center" }]}>
          {period === "week"
            ? `${shortDate(weekDates(selectedDate)[0])} – ${shortDate(weekDates(selectedDate)[6])}`
            : parseDate(selectedDate).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
        </Text>
        <IconButton
          name="chevron-forward"
          label="Next period"
          onPress={() => movePeriod(1)}
        />
      </View>
      <View style={[ui.sageCard, ui.between]}>
        <View style={ui.grow}>
          <Text style={ui.label}>
            {period === "week" ? "This week" : "This month"}
          </Text>
          <Text
            style={{
              fontSize: 50,
              fontWeight: "800",
              color: colors.darkGreen,
              letterSpacing: -2,
            }}
          >
            {stats.percent}%
          </Text>
          <Text style={ui.subtitle}>
            {stats.done} of {stats.total} planned habits completed
          </Text>
          <Text style={ui.small}>
            Through {shortDate(DEMO_TODAY)} · Skips count as incomplete
          </Text>
        </View>
        <ProgressRing percent={stats.percent} size={90} />
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={[ui.card, ui.grow]}>
          <IconBubble name="flame-outline" amber />
          <Text style={ui.small}>Best streak · all time</Text>
          <Text style={ui.heading}>{bestStreak(state)} days</Text>
          <Text style={ui.small}>At least one habit done</Text>
        </View>
        <View style={[ui.card, ui.grow]}>
          <IconBubble name="person-outline" />
          <Text style={ui.small}>Active habits</Text>
          <Text style={ui.heading}>{active.length}</Text>
          <Text style={ui.small}>Planned in this period</Text>
        </View>
      </View>
      {!stats.total ? (
        <EmptyState
          title="Your next chapter starts here"
          message="No history in this period yet. Return to October 2026 to explore the demo."
          action="View demo week"
          onPress={() => setSelectedDate(DEMO_TODAY)}
        />
      ) : (
        <>
          <View style={ui.card}>
            <Text style={ui.heading}>Daily completion</Text>
            <Text style={ui.small}>
              Tap a bar to inspect that day. Future days are unfilled.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={period === "month"}
              contentContainerStyle={{
                flexGrow: 1,
                gap: period === "week" ? 6 : 5,
                paddingTop: 10,
              }}
            >
              {chartDates.map((date) => {
                const future = date > DEMO_TODAY;
                const value = future ? 0 : completion(state, [date]).percent;
                return (
                  <View
                    key={date}
                    style={{
                      flex: period === "week" ? 1 : undefined,
                      width: period === "month" ? 28 : undefined,
                      minWidth: 24,
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Text style={[ui.small, { fontSize: 10 }]}>
                      {future ? "–" : `${value}%`}
                    </Text>
                    <ChartBar
                      value={value}
                      selected={
                        focusDate === date ||
                        (!focusDate && date === DEMO_TODAY)
                      }
                      label={`${longChartDate(date)}: ${future ? "future" : `${value}% complete`}`}
                      onPress={() => setFocusDate(date)}
                    />
                    <Text style={[ui.small, { fontSize: 11 }]}>
                      {period === "week"
                        ? DAY_NAMES[parseDate(date).getDay()]
                        : parseDate(date).getDate()}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
            {focusDate && (
              <Text style={ui.body}>
                {shortDate(focusDate)} · {completion(state, [focusDate]).done}{" "}
                of {completion(state, [focusDate]).total} completed
                {focusDate > DEMO_TODAY ? " · Upcoming" : ""}
              </Text>
            )}
          </View>
          <View style={ui.card}>
            <Text style={ui.heading}>Habit consistency</Text>
            {active.map((habit) => {
              const entries = state.occurrences.filter(
                (o) => o.habitId === habit.id && dates.includes(o.date),
              );
              const percent = entries.length
                ? Math.round(
                    (entries.filter((o) => o.status === "done").length /
                      entries.length) *
                      100,
                  )
                : 0;
              return (
                <View key={habit.id} style={ui.row}>
                  <IconBubble name={habit.icon} size={38} />
                  <View style={[ui.grow, { gap: 6 }]}>
                    <View style={ui.between}>
                      <Text style={[ui.body, ui.grow]}>{habit.name}</Text>
                      <Text style={ui.small}>{percent}%</Text>
                    </View>
                    <View
                      style={{
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: colors.border,
                      }}
                    >
                      <View
                        style={{
                          width: `${percent}%`,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: colors.green,
                        }}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={[ui.card, { backgroundColor: colors.amberLight }]}>
            <View style={ui.row}>
              <IconBubble name="sunny-outline" amber />
              <View style={ui.grow}>
                <Text style={ui.label}>
                  You showed up {shownUp} of {history.length} days
                </Text>
                <Text style={ui.small}>
                  A missed day doesn’t erase your progress.
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
      <View style={ui.card}>
        <Text style={ui.heading}>History preview</Text>
        {history.length ? (
          (showAllHistory ? history : history.slice(0, 3)).map((date) => {
            const result = completion(state, [date]);
            const skipped = itemsForDate(state, date).filter(
              (i) => i.status === "skipped",
            ).length;
            return (
              <View key={date} style={ui.between}>
                <View>
                  <Text style={ui.label}>{shortDate(date)}</Text>
                  <Text style={ui.small}>{skipped} skipped</Text>
                </View>
                <Text style={{ color: colors.green, fontWeight: "600" }}>
                  {result.done}/{result.total} done
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={ui.subtitle}>Complete a habit to begin your story.</Text>
        )}
        {history.length > 3 && (
          <Button
            label={showAllHistory ? "Show less" : "View history"}
            secondary
            onPress={() => setShowAllHistory(!showAllHistory)}
          />
        )}
      </View>
    </Screen>
  );
}
function ChartBar({
  value,
  selected,
  label,
  onPress,
}: {
  value: number;
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        height: 120,
        width: "100%",
        minWidth: 20,
        justifyContent: "flex-end",
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          height: `${Math.max(value, 3)}%`,
          backgroundColor: value
            ? selected
              ? colors.green
              : colors.sageDark
            : colors.border,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
        }}
      />
    </Pressable>
  );
}
function longChartDate(date: string) {
  return parseDate(date).toDateString();
}
