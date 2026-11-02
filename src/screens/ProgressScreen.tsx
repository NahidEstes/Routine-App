import {
  PeriodComparison,
  ProgressHighlights,
  ProgressOverview,
} from "../components/ProgressOverview";
import { DailyCompletionChart } from "../components/DailyCompletionChart";
import { TabRow } from "../components/TabCards";
import { WeeklyReviewCard } from "../components/WeeklyReviewCard";
import { useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import {
  Button,
  EmptyState,
  Header,
  IconBubble,
  IconButton,
  Screen,
  Segment,
} from "../components/ui";
import { useTracker } from "../state/TrackerProvider";
import {
  bestStreak,
  completion,
  habitConsistency,
  itemsForDate,
  periodWeeklyPlans,
  weeklyStreak,
} from "../domain/progress";
import {
  addDays,
  monthDates,
  parseDate,
  shortDate,
  weekDates,
} from "../utils/dates";
import { useTheme } from "../theme";

export default function ProgressScreen() {
  const { colors, ui } = useTheme();
  const { state, selectedDate, setSelectedDate, today } = useTracker();
  const { width, fontScale } = useWindowDimensions();
  const stackSummary = width < 450 && fontScale > 1.3;
  const [details, setDetails] = useState(false);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [allHistory, setAllHistory] = useState(false);
  const chartDates = useMemo(
    () =>
      period === "week" ? weekDates(selectedDate) : monthDates(selectedDate),
    [period, selectedDate],
  );
  const dates = useMemo(
      () => chartDates.filter((d) => d <= today),
      [chartDates, today],
    ),
    stats = completion(state, dates, today),
    plans = periodWeeklyPlans(state, dates, today);
  const habits = details
    ? state.habits.filter(
        (h) => habitConsistency(state, h.id, dates, today).total > 0,
      )
    : [];
  const history = details
    ? [...dates]
        .reverse()
        .filter((d) => itemsForDate(state, d, today).some((e) => !e.optional))
    : [];
  function move(delta: number) {
    if (period === "week") setSelectedDate(addDays(selectedDate, delta * 7));
    else {
      const d = parseDate(selectedDate);
      d.setDate(1);
      d.setMonth(d.getMonth() + delta);
      setSelectedDate(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      );
    }
  }
  return (
    <Screen tab>
      <Header title="Progress" subtitle="See how your small steps add up." />
      <Segment
        options={[
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
        ]}
        value={period}
        onChange={(v) => {
          setPeriod(v);
        }}
      />
      <View style={ui.between}>
        <IconButton
          name="chevron-back"
          label="Previous period"
          onPress={() => move(-1)}
        />
        <Text style={[ui.label, ui.grow, { textAlign: "center" }]}>
          {period === "week"
            ? `${shortDate(chartDates[0])} – ${shortDate(chartDates[6])}`
            : parseDate(selectedDate).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
        </Text>
        <IconButton
          name="chevron-forward"
          label="Next period"
          onPress={() => move(1)}
        />
      </View>
      <ProgressOverview dates={dates} period={period} />
      <DailyCompletionChart
        key={`${period}:${chartDates[0]}`}
        dates={chartDates}
        period={period}
      />
      <ProgressHighlights dates={dates} period={period} />
      <TabRow
        label={
          details ? "Hide details and history" : "View details and history"
        }
        icon="document-text-outline"
        onPress={() => setDetails(!details)}
      />
      <TabRow
        label="View achievements"
        icon="ribbon-outline"
        onPress={() => router.push("/achievements")}
      />
      <WeeklyReviewCard />
      {details && (
        <>
          <View style={[ui.card, { gap: 12 }]}>
            <View
              style={{ flexDirection: stackSummary ? "column" : "row", gap: 8 }}
            >
              {[
                { label: "Completed", value: `${stats.done} / ${stats.total}` },
                { label: "Success rate", value: `${stats.percent}%` },
                {
                  label: "Best streak",
                  value: `${bestStreak(state, today)} days`,
                },
              ].map((item, index) => (
                <View
                  key={item.label}
                  style={{
                    flex: stackSummary ? undefined : 1,
                    gap: 8,
                    padding: 4,
                    borderLeftWidth: !stackSummary && index > 0 ? 1 : 0,
                    borderTopWidth: stackSummary && index > 0 ? 1 : 0,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={[ui.small, { textAlign: "center" }]}>
                    {item.label}
                  </Text>
                  <Text style={[ui.heading, { textAlign: "center" }]}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={ui.small}>
              Daily tasks · {stats.skipped} skipped · {stats.missed} missed ·{" "}
              {stats.busy} busy goals
            </Text>
            <Text style={ui.small}>
              {state.habits.filter((h) => !h.archivedAt).length} active habits ·
              Archived history stays included.
              {"\n"}Best streak counts scheduled days of one habit. Off-days
              pause.
            </Text>
          </View>
          {!stats.total && !plans.length && (
            <EmptyState
              title="Your next chapter starts here"
              message="No scheduled habits or history in this period yet."
              action="Create a habit"
              onPress={() => router.push("/habit")}
            />
          )}
          <PeriodComparison dates={dates} period={period} />
          {!!plans.length && (
            <View style={ui.card}>
              <Text style={ui.heading}>Weekly targets</Text>
              <Text style={ui.small}>
                Monday–Sunday. Month view includes whole weeks touching the
                month. Ongoing weeks are not missed.
              </Text>
              {plans.map((p) => (
                <View key={p.id} style={{ gap: 5 }}>
                  <Text style={ui.label}>
                    {p.snapshot.name} · {shortDate(p.week)}
                  </Text>
                  <Text style={ui.body}>
                    {p.done}/{p.target} credits · {p.skipped} skipped sessions ·{" "}
                    {p.closed
                      ? `${p.target - p.done} missed credits`
                      : "Week still open"}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {!!habits.length && (
            <View style={ui.card}>
              <Text style={ui.heading}>Habit consistency</Text>
              {habits.map((h) => {
                const result = habitConsistency(state, h.id, dates, today);
                return (
                  <View key={h.id} style={ui.row}>
                    <IconBubble name={h.icon} size={38} />
                    <View style={[ui.grow, { gap: 6 }]}>
                      <View style={ui.between}>
                        <Text style={[ui.body, ui.grow]}>
                          {h.name}
                          {h.archivedAt ? " · Archived" : ""}
                        </Text>
                        <Text style={ui.small}>{result.percent}%</Text>
                      </View>
                      <View
                        style={{
                          height: 7,
                          backgroundColor: colors.border,
                        }}
                      >
                        <View
                          style={{
                            width: `${result.percent}%`,
                            height: 7,
                            backgroundColor: colors.green,
                          }}
                        />
                      </View>
                      <Text style={ui.small}>
                        {result.done}/{result.total} goals
                        {h.repeat.type === "weekly"
                          ? ` · Best ${weeklyStreak(state, h.id, today)} weeks`
                          : ""}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          <View style={[ui.card, { backgroundColor: colors.amberLight }]}>
            <Text style={ui.label}>Small steps still matter.</Text>
            <Text style={ui.small}>
              Busy day completions count toward your goal and remain marked in
              history.
            </Text>
          </View>
          <View style={ui.card}>
            <Text style={ui.heading}>History</Text>
            <Button
              label="Daily notes"
              icon="document-text-outline"
              secondary
              onPress={() => router.push("/habit-notes")}
            />
            <Text style={ui.small}>
              Tap a day to inspect its original goals and statuses.
            </Text>
            {history.length ? (
              (allHistory ? history : history.slice(0, 3)).map((date) => {
                const result = completion(state, [date], today),
                  weekly = itemsForDate(state, date, today).filter(
                    (e) => e.weekly && !e.optional,
                  );
                return (
                  <Pressable
                    key={date}
                    accessibilityRole="button"
                    accessibilityLabel={`View history ${date}`}
                    onPress={() => {
                      setSelectedDate(date);
                      router.navigate("/");
                    }}
                    style={{ minHeight: 60, gap: 3 }}
                  >
                    <Text style={ui.label}>
                      {shortDate(date)} · {result.done}/{result.total} daily
                      done
                    </Text>
                    <Text style={ui.small}>
                      {result.skipped} skipped · {result.missed} missed ·{" "}
                      {result.busy} busy goals ·{" "}
                      {weekly.filter((e) => e.status === "done").length} weekly
                      credits
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <Text style={ui.subtitle}>Your history will appear here.</Text>
            )}
            {history.length > 3 && (
              <Button
                label={allHistory ? "Show less" : "View all days"}
                secondary
                onPress={() => setAllHistory(!allHistory)}
              />
            )}
          </View>
          <View style={ui.card}>
            <Text style={ui.heading}>Routine history</Text>
            {state.sessions.filter((s) => dates.includes(s.date)).length ? (
              state.sessions
                .filter((s) => dates.includes(s.date))
                .map((s) => (
                  <View key={s.id}>
                    <Text style={ui.label}>
                      {shortDate(s.date)} ·{" "}
                      {s.name ??
                        state.routines.find((r) => r.id === s.routineId)
                          ?.name ??
                        "Routine"}
                    </Text>
                    <Text style={ui.small}>
                      {s.completed.length}/{s.steps.length} steps ·{" "}
                      {s.busy ? "Busy day" : "Full routine"} ·{" "}
                      {s.ended ? "Ended" : "In progress"}
                    </Text>
                  </View>
                ))
            ) : (
              <Text style={ui.small}>No routine sessions in this period.</Text>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}
