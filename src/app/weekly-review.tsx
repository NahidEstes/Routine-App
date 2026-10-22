import { useCallback, useState } from "react";
import { BackHandler, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button, Field, Header, IconButton, Screen } from "../components/ui";
import { Sheet } from "../components/Sheet";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { addDays, validDate, weekDates } from "../utils/dates";
import { completion, periodWeeklyPlans } from "../domain/progress";
import type { WeeklyReview } from "../models/types";

export default function WeeklyReviewScreen() {
  const { week: requested } = useLocalSearchParams<{ week?: string }>();
  const { state, today } = useTracker();
  const initial =
    requested && validDate(requested) && requested <= today
      ? weekDates(requested)[0]
      : weekDates(today)[0];
  const [week, setWeek] = useState(initial);
  return (
    <ReviewEditor
      key={week}
      week={week}
      setWeek={setWeek}
      initial={state.features.reviews.find((r) => r.week === week)}
    />
  );
}
function ReviewEditor({
  week,
  setWeek,
  initial,
}: {
  week: string;
  setWeek: (week: string) => void;
  initial?: WeeklyReview;
}) {
  const { state, today, dispatch, saving } = useTracker();
  const { ui } = useTheme();
  const [wentWell, setWentWell] = useState(initial?.wentWell ?? "");
  const [obstacles, setObstacles] = useState(initial?.obstacles ?? "");
  const [change, setChange] = useState(initial?.change ?? "");
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [habitActions, setHabitActions] = useState(false);
  const dirty =
    wentWell !== (saved?.wentWell ?? "") ||
    obstacles !== (saved?.obstacles ?? "") ||
    change !== (saved?.change ?? "");
  const dates = weekDates(week).filter((d) => d <= today);
  const stats = completion(state, dates, today),
    plans = periodWeeklyPlans(state, dates, today);
  const weeklyDone = plans.reduce((sum, p) => sum + p.done, 0),
    weeklyTarget = plans.reduce((sum, p) => sum + p.target, 0);
  const leave = useCallback(
    (destination: string) => {
      if (dirty) {
        setPending(destination);
        return;
      }
      if (destination === "back") {
        if (router.canGoBack()) router.back();
        else router.replace("/progress");
      } else setWeek(destination);
    },
    [dirty, setWeek],
  );
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        leave("back");
        return true;
      });
      return () => sub.remove();
    }, [leave]),
  );
  async function save(completed: boolean) {
    const review = {
      week,
      wentWell: wentWell.trim(),
      obstacles: obstacles.trim(),
      change: change.trim(),
      completed,
      updatedAt: new Date().toISOString(),
    };
    if (await dispatch({ type: "saveReview", review })) {
      setSaved(review);
      setWentWell(review.wentWell);
      setObstacles(review.obstacles);
      setChange(review.change);
      setMessage(
        completed
          ? "Weekly review finished. You can edit it anytime."
          : "Draft saved on this device.",
      );
      return true;
    }
    return false;
  }
  function navigate(destination: string) {
    if (destination === "back") {
      if (router.canGoBack()) router.back();
      else router.replace("/progress");
    } else setWeek(destination);
  }
  return (
    <Screen form>
      <Header
        back
        title="Weekly review"
        onBack={() => leave("back")}
        backDisabled={saving}
      />
      <Text style={ui.small}>
        Weeks run Monday–Sunday, matching Schedule and Progress. Save a draft
        before leaving to keep your answers.
      </Text>
      <View style={ui.between}>
        <IconButton
          name="chevron-back"
          label="Previous review week"
          disabled={saving}
          onPress={() => leave(addDays(week, -7))}
        />
        <Text style={[ui.label, ui.grow, { textAlign: "center" }]}>
          {week} – {addDays(week, 6)}
        </Text>
        <IconButton
          name="chevron-forward"
          label="Next review week"
          disabled={saving || addDays(week, 7) > weekDates(today)[0]}
          onPress={() => leave(addDays(week, 7))}
        />
      </View>
      <View style={ui.sageCard}>
        <Text style={ui.heading}>
          {saved?.completed
            ? "Finished review"
            : saved
              ? "Saved draft"
              : "Your week at a glance"}
          {dirty ? " · Unsaved edits" : ""}
        </Text>
        <Text style={ui.body}>
          {stats.done}/{stats.total} daily habits completed
          {stats.total ? ` · ${stats.percent}%` : ""}
        </Text>
        <Text style={ui.small}>
          {stats.skipped} skipped · {stats.missed} missed · {weeklyDone}/
          {weeklyTarget} weekly credits
          {addDays(week, 6) >= today ? " · Week still open" : ""}
        </Text>
        {!stats.total && !weeklyTarget && (
          <Text style={ui.small}>
            No eligible habits in this period. You can still reflect on your
            week.
          </Text>
        )}
      </View>
      <Field
        label="What went well this week?"
        value={wentWell}
        onChangeText={setWentWell}
        multiline
        maxLength={2000}
        style={{ minHeight: 110, textAlignVertical: "top" }}
      />
      <Field
        label="What got in your way?"
        value={obstacles}
        onChangeText={setObstacles}
        multiline
        maxLength={2000}
        style={{ minHeight: 110, textAlignVertical: "top" }}
      />
      <Field
        label="What would you like to change next week?"
        value={change}
        onChangeText={setChange}
        multiline
        maxLength={2000}
        style={{ minHeight: 110, textAlignVertical: "top" }}
      />
      <Button
        label="Save draft"
        secondary
        disabled={saving}
        onPress={() => save(false)}
      />
      <Button
        label={
          saved?.completed ? "Save finished review" : "Finish weekly review"
        }
        disabled={
          saving || ![wentWell, obstacles, change].every((s) => s.trim())
        }
        onPress={() => save(true)}
      />
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={ui.body}>
          {message}
        </Text>
      )}
      <View style={ui.card}>
        <Text style={ui.heading}>One small adjustment</Text>
        <Text style={ui.small}>
          Your answers never change a habit automatically. Save this review
          first, then choose a habit to adjust its goal or schedule in the
          existing editor.
        </Text>
        <Button
          label="Adjust goal or change schedule"
          secondary
          disabled={saving || dirty || !state.habits.some((h) => !h.archivedAt)}
          onPress={() => setHabitActions(!habitActions)}
        />
        {habitActions &&
          state.habits
            .filter((h) => !h.archivedAt)
            .map((h) => (
              <Button
                key={h.id}
                label={`Edit ${h.name}`}
                secondary
                onPress={() =>
                  router.push({ pathname: "/habit", params: { id: h.id } })
                }
              />
            ))}
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Review history</Text>
        {!state.features.reviews.length && (
          <Text style={ui.small}>
            Saved drafts and finished reviews will appear here.
          </Text>
        )}
        {[...state.features.reviews]
          .sort((a, b) => b.week.localeCompare(a.week))
          .map((r) => (
            <Button
              key={r.week}
              label={`${r.week} · ${r.completed ? "Finished" : "Draft"}`}
              secondary
              disabled={saving || r.week === week}
              onPress={() => leave(r.week)}
            />
          ))}
      </View>
      {pending && (
        <Sheet title="Keep your review edits?" onClose={() => setPending(null)}>
          <Text style={ui.body}>
            Save a draft to keep your answers, or discard these unsaved edits.
          </Text>
          <Button
            label="Save draft and continue"
            disabled={saving}
            onPress={async () => {
              if (await save(false)) {
                const destination = pending;
                setPending(null);
                navigate(destination);
              }
            }}
          />
          <Button
            label="Discard edits and continue"
            secondary
            disabled={saving}
            onPress={() => {
              const destination = pending;
              setPending(null);
              navigate(destination);
            }}
          />
          <Button
            label="Keep editing"
            secondary
            onPress={() => setPending(null)}
          />
        </Sheet>
      )}
    </Screen>
  );
}
