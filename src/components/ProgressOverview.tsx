import { Text, View, useWindowDimensions } from "react-native";
import { useMemo } from "react";
import { router } from "expo-router";
import { bestStreak, completion, periodWeeklyPlans } from "../domain/progress";
import { progressInsights } from "../domain/progressInsights";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { Button, ProgressRing } from "./ui";
import { FeatureIcon, StatCards } from "./TabCards";

type Props = { dates: string[]; period: "week" | "month" };

export function ProgressOverview({ dates, period }: Props) {
  const { state, today } = useTracker();
  const { ui, colors } = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const stats = completion(state, dates, today);
  const hasHabits = state.habits.some((habit) => !habit.archivedAt);
  const stack = width < 360 || fontScale > 1.3;
  return (
    <>
      <View
        style={[
          ui.heroCard,
          {
            flexDirection: stack ? "column" : "row",
            alignItems: stack ? "flex-start" : "center",
            gap: 16,
          },
        ]}
      >
        <View style={{ flex: stack ? undefined : 1, gap: 8 }}>
          <Text style={[ui.heading, { color: colors.onHero, fontSize: 24 }]}>
            {period === "week"
              ? dates.includes(today)
                ? "This week"
                : "Weekly progress"
              : dates.includes(today)
                ? "This month"
                : "Monthly progress"}
          </Text>
          <Text style={[ui.heading, { color: colors.onHero, fontSize: 20 }]}>
            {stats.total
              ? `${stats.done} of ${stats.total} completed`
              : hasHabits
                ? "No daily goals in this period"
                : "Your progress starts here"}
          </Text>
          <Text style={[ui.body, { color: colors.heroMuted }]}>
            {stats.total
              ? "Daily goals"
              : hasHabits
                ? "Choose another period to see your history."
                : "Start with one small habit."}
          </Text>
        </View>
        {stats.total > 0 && (
          <ProgressRing inverted percent={stats.percent} size={76} />
        )}
      </View>
      {!stats.total && !hasHabits && (
        <Button
          label="Add your first habit"
          onPress={() => router.push("/habit")}
        />
      )}
    </>
  );
}

export function ProgressHighlights({ dates, period }: Props) {
  const { state, today } = useTracker();
  const { ui, colors } = useTheme();
  const insight = useMemo(
    () => progressInsights(state, dates, period, today),
    [state, dates, period, today],
  );
  const streak = useMemo(() => bestStreak(state, today), [state, today]);
  const consistent = insight.mostConsistent;
  const plans = periodWeeklyPlans(state, dates, today);
  return (
    <>
      <StatCards
        items={[
          {
            label: "Best streak",
            value: `${streak} days`,
            icon: "flame-outline",
          },
          {
            label: "Active habits",
            value: state.habits.filter((habit) => !habit.archivedAt).length,
            icon: "stats-chart-outline",
          },
        ]}
      />
      <View style={ui.card}>
        <Text accessibilityRole="header" style={ui.heading}>
          Most consistent
        </Text>
        {consistent ? (
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            <FeatureIcon name="ribbon-outline" />
            <View style={{ flex: 1, minWidth: 110, gap: 4 }}>
              <Text style={ui.label}>{consistent.name}</Text>
              <Text style={ui.small}>
                {consistent.done} of {consistent.total} scheduled days
              </Text>
            </View>
            <View style={{ gap: 6, minWidth: 72, flexGrow: 1, flexBasis: 72 }}>
              <Text style={[ui.heading, { color: colors.green }]}>
                {consistent.percent}%
              </Text>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={`${consistent.name} consistency`}
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: consistent.percent,
                }}
                style={{
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: colors.track,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${consistent.percent}%`,
                    height: 7,
                    backgroundColor: colors.green,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          </View>
        ) : (
          <Text style={ui.small}>
            Complete a daily habit across at least three scheduled days to see
            your most consistent habit.
          </Text>
        )}
      </View>
      {plans.length > 0 && (
        <View style={ui.card}>
          <Text style={ui.heading}>Weekly goals</Text>
          <Text style={ui.heading}>
            {plans.reduce((sum, plan) => sum + plan.done, 0)} /{" "}
            {plans.reduce((sum, plan) => sum + plan.target, 0)} credits
          </Text>
          <Text style={ui.small}>
            Weekly credits stay separate from your daily completion rate. Month
            view includes whole weeks touching the month.
          </Text>
        </View>
      )}
    </>
  );
}

export function PeriodComparison({ dates, period }: Props) {
  const { state, today } = useTracker();
  const { ui, colors } = useTheme();
  const insight = progressInsights(state, dates, period, today);
  return (
    <View style={ui.card}>
      <Text style={ui.heading}>Compared with last {period}</Text>
      <Text style={[ui.label, { color: colors.green }]}>
        {insight.comparable
          ? insight.difference === 0
            ? "Same completion rate"
            : `${Math.abs(insight.difference)} percentage points ${insight.difference > 0 ? "higher" : "lower"}`
          : "No comparison yet"}
      </Text>
      <Text style={ui.small}>
        {insight.comparable
          ? `Compared with the same ${insight.comparisonDays} calendar days of the previous ${period}.`
          : "Both periods need scheduled daily habits for a useful comparison."}
      </Text>
    </View>
  );
}
