import { Text, View } from "react-native";
import { router } from "expo-router";
import { completion, periodWeeklyPlans } from "../domain/progress";
import { progressInsights } from "../domain/progressInsights";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { Button, ProgressRing } from "./ui";
export function ProgressOverview({
  dates,
  period,
}: {
  dates: string[];
  period: "week" | "month";
}) {
  const { state, today } = useTracker();
  const { ui, colors } = useTheme();
  const stats = completion(state, dates, today);
  const insight = progressInsights(state, dates, period, today);
  const plans = periodWeeklyPlans(state, dates, today);
  return (
    <>
      <View style={[ui.sageCard, ui.between]}>
        <View style={[ui.grow, { gap: 8 }]}>
          <Text style={ui.heading}>
            {stats.total
              ? `${stats.done} of ${stats.total} daily goals completed`
              : "Your progress starts here"}
          </Text>
          <Text style={ui.small}>
            {stats.total
              ? `${stats.skipped} skipped · ${stats.missed} missed`
              : "Add a habit and check it off to start seeing your progress."}
          </Text>
        </View>
        {stats.total > 0 && <ProgressRing percent={stats.percent} size={76} />}
      </View>
      {!stats.total && (
        <Button
          label="Add your first habit"
          onPress={() => router.push("/habit")}
        />
      )}
      <View style={ui.card}>
        <Text style={ui.heading}>Your daily habit highlights</Text>
        <Text style={ui.label}>
          {insight.mostConsistent
            ? `Most consistent: ${insight.mostConsistent.name}`
            : "A little more history will help"}
        </Text>
        <Text style={ui.body}>
          {insight.mostConsistent
            ? `${insight.mostConsistent.done} of ${insight.mostConsistent.total} scheduled days completed.`
            : "Complete a habit across at least three scheduled days to see your most consistent habit."}
        </Text>
        <Text style={[ui.label, { color: colors.green }]}>
          {insight.comparable
            ? insight.difference === 0
              ? "Same completion rate as the previous period"
              : `${Math.abs(insight.difference)} percentage points ${insight.difference > 0 ? "higher" : "lower"} than the previous period`
            : "No comparison yet"}
        </Text>
        <Text style={ui.small}>
          {insight.comparable
            ? `Compared with the same ${insight.comparisonDays} calendar days of the previous ${period}. ${dates.includes(today) ? "Today is still in progress." : ""}`
            : "Both periods need scheduled daily habits for a useful comparison."}
        </Text>
      </View>
      {plans.length > 0 && (
        <View style={ui.card}>
          <Text style={ui.heading}>Weekly goals</Text>
          <Text style={ui.title}>
            {plans.reduce((sum, plan) => sum + plan.done, 0)} /{" "}
            {plans.reduce((sum, plan) => sum + plan.target, 0)}
          </Text>
          <Text style={ui.small}>
            Weekly credits earned. These stay separate from your daily
            completion rate. Month view includes whole weeks touching the month.
          </Text>
        </View>
      )}
    </>
  );
}
