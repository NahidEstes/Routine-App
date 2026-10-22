import { ProgressOverview } from "../components/ProgressOverview";
import { Achievements, MilestoneNotice } from "../components/Achievements";
import { WeeklyReviewCard } from "../components/WeeklyReviewCard";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
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
  DAY_NAMES,
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
  const [allHistory, setAllHistory] = useState(false),
    [focus, setFocus] = useState<string | null>(null);
  const chartDates =
    period === "week" ? weekDates(selectedDate) : monthDates(selectedDate);
  const dates = chartDates.filter((d) => d <= today),
    stats = completion(state, dates, today),
    plans = periodWeeklyPlans(state, dates, today);
  const habits = state.habits.filter(
    (h) => habitConsistency(state, h.id, dates, today).total > 0,
  );
  const history = [...dates]
    .reverse()
    .filter((d) => itemsForDate(state, d, today).some((e) => !e.optional));
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
    setFocus(null);
  }
  return (
    <Screen>
      <Header title="Progress" subtitle="See how your small steps add up." />
      <Segment
        options={[
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
        ]}
        value={period}
        onChange={(v) => {
          setPeriod(v);
          setFocus(null);
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
      <MilestoneNotice />
      <Achievements />
      <WeeklyReviewCard />
      <Button
        label={details ? "Hide details" : "View details and history"}
        secondary
        onPress={() => setDetails(!details)}
      />
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
          {!!stats.total && (
            <View style={ui.card}>
              <Text style={ui.heading}>Daily completion</Text>
              <Text style={ui.small}>
                Daily habits only; the chart and summary use the same records.
                Future and unscheduled days are unfilled.
              </Text>
              <ScrollView
                horizontal
                contentContainerStyle={{
                  flexGrow: 1,
                  gap: period === "week" ? 6 : 5,
                  paddingTop: 10,
                }}
              >
                {chartDates.map((date) => {
                  const result = completion(state, [date], today),
                    future = date > today;
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
                        {future || !result.total ? "–" : `${result.percent}%`}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${date}: ${future ? "Upcoming" : `${result.done}/${result.total} daily tasks done`}`}
                        onPress={() => setFocus(date)}
                        style={{
                          height: 120,
                          width: "100%",
                          justifyContent: "flex-end",
                          borderBottomWidth: 1,
                          borderTopWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <View
                          pointerEvents="none"
                          style={{
                            position: "absolute",
                            top: "50%",
                            width: "100%",
                            borderTopWidth: 1,
                            borderColor: colors.border,
                          }}
                        />
                        <View
                          style={{
                            height: `${Math.max(result.percent, 3)}%`,
                            backgroundColor: result.percent
                              ? focus === date || (!focus && date === today)
                                ? colors.green
                                : colors.sageDark
                              : colors.border,
                          }}
                        />
                      </Pressable>
                      <Text style={[ui.small, { fontSize: 11 }]}>
                        {period === "week"
                          ? DAY_NAMES[parseDate(date).getDay()]
                          : parseDate(date).getDate()}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
              {!!focus && (
                <Text style={ui.body}>
                  {shortDate(focus)} · {completion(state, [focus], today).done}/
                  {completion(state, [focus], today).total} daily tasks ·{" "}
                  {completion(state, [focus], today).missed} missed
                </Text>
              )}
            </View>
          )}
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
