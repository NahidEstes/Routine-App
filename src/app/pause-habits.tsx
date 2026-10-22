import { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Button, Chip, Field, Header, Screen } from "../components/ui";
import { DateTimeField } from "../components/DateTimeField";
import { Sheet } from "../components/Sheet";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { addDays, validDate } from "../utils/dates";
import { createId } from "../utils/id";
import type { HabitPause } from "../models/types";
import { useLocalFeatures } from "../state/LocalFeaturesProvider";

export default function PauseHabits() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, dispatch, today, saving } = useTracker();
  const { timer } = useLocalFeatures();
  const { ui } = useTheme();
  const active = state.habits.filter((h) => !h.archivedAt);
  const [scope, setScope] = useState<"all" | "selected">(
    id ? "selected" : "all",
  );
  const [selected, setSelected] = useState<string[]>(id ? [id] : []);
  const [start, setStart] = useState(today),
    [end, setEnd] = useState(today);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<HabitPause | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState(false);
  const pauses = state.features.pauses
    .filter((p) => history || p.end >= today)
    .sort((a, b) => b.start.localeCompare(a.start));
  return (
    <Screen form>
      <Header back title="Vacation / Pause mode" />
      <Text style={ui.body}>
        Take a break without missed days. Paused dates are neutral in statistics
        and streaks. Existing records stay saved.
      </Text>
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={ui.body}>
          {message}
        </Text>
      )}
      <Text style={ui.heading}>Your pause periods</Text>
      {!pauses.length && (
        <Text style={ui.small}>No active or upcoming pauses.</Text>
      )}
      {pauses.map((p) => (
        <View key={p.id} style={ui.card}>
          <Text style={ui.label}>
            {p.start} – {p.end}
          </Text>
          <Text style={ui.small}>
            {p.habitIds
              .map((id) => state.habits.find((h) => h.id === id)?.name)
              .join(", ")}
          </Text>
          <Text style={ui.body}>
            {p.start > today
              ? "Upcoming"
              : p.end < today
                ? "Ended"
                : "Paused now"}{" "}
            · Resumes {addDays(p.end, 1)}
          </Text>
          {!!p.reason && <Text style={ui.small}>{p.reason}</Text>}
          {p.end >= today && (
            <Button
              label={
                p.start > today
                  ? "Cancel scheduled pause"
                  : "Resume this pause today"
              }
              secondary
              disabled={saving}
              onPress={async () => {
                if (await dispatch({ type: "resumePause", id: p.id }))
                  setMessage(
                    "This pause has ended. Elapsed pause dates are preserved. Any overlapping pauses still apply.",
                  );
              }}
            />
          )}
        </View>
      ))}
      <Button
        label={history ? "Hide past pauses" : "View pause history"}
        secondary
        onPress={() => setHistory(!history)}
      />
      <View style={ui.card}>
        <Text style={ui.heading}>Plan a pause</Text>
        <View style={[ui.row, { flexWrap: "wrap" }]}>
          <Chip
            label="All active habits"
            selected={scope === "all"}
            onPress={() => setScope("all")}
          />
          <Chip
            label="Choose habits"
            selected={scope === "selected"}
            onPress={() => setScope("selected")}
          />
        </View>
        {scope === "selected" &&
          active.map((h) => (
            <Chip
              key={h.id}
              label={h.name}
              selected={selected.includes(h.id)}
              onPress={() =>
                setSelected(
                  selected.includes(h.id)
                    ? selected.filter((x) => x !== h.id)
                    : [...selected, h.id],
                )
              }
            />
          ))}
        <DateTimeField
          mode="date"
          label="Pause start date"
          value={start}
          onChange={setStart}
        />
        <DateTimeField
          mode="date"
          label="Pause end date (included)"
          value={end}
          onChange={setEnd}
        />
        <Field
          label="Reason (optional)"
          value={reason}
          maxLength={200}
          onChangeText={setReason}
          placeholder="Travel, rest, or time away"
        />
        <Text style={ui.small}>
          The end date is included. Reminders are suppressed during the pause.
          Weekly targets are rounded up in proportion to available active days,
          never below existing completion credits. A fully paused week with no
          credits is neutral.
        </Text>
        <Text style={ui.small}>
          All habits means the active habits selected now. Habits created later
          are not automatically paused. Overlapping pauses remain effective
          until every covering pause ends.
        </Text>
        {!!error && <Text style={ui.error}>{error}</Text>}
        <Button
          label="Review pause"
          disabled={saving || !active.length}
          onPress={() => {
            const habitIds =
              scope === "all"
                ? active.map((h) => h.id)
                : selected.filter((id) => active.some((h) => h.id === id));
            if (
              !validDate(start) ||
              !validDate(end) ||
              start < today ||
              end < start ||
              end > "9999-12-30" ||
              !habitIds.length
            ) {
              setError(
                "Choose at least one active habit and a date range starting today or later.",
              );
              return;
            }
            if (
              timer &&
              habitIds.includes(timer.habitId) &&
              start <= timer.date &&
              end >= timer.date
            ) {
              setError(
                "Finish and save, or discard, the active focus timer before pausing its day.",
              );
              return;
            }
            setError("");
            setConfirm({
              id: createId("pause"),
              start,
              end,
              habitIds,
              reason: reason.trim(),
            });
          }}
        />
      </View>
      {confirm && (
        <Sheet title="Confirm pause" onClose={() => setConfirm(null)}>
          <Text style={ui.heading}>
            {confirm.habitIds.length}{" "}
            {confirm.habitIds.length === 1 ? "habit" : "habits"}
          </Text>
          <Text style={ui.body}>
            {confirm.start} through {confirm.end}, including both dates.
          </Text>
          <Text style={ui.body}>
            Automatically resumes on {addDays(confirm.end, 1)}, unless another
            pause covers that date.
          </Text>
          <Text style={ui.small}>
            Existing progress and notes remain saved. Paused dates are neutral
            in daily statistics and streaks.
          </Text>
          <Button
            label="Confirm pause habits"
            disabled={saving}
            onPress={async () => {
              if (await dispatch({ type: "pauseHabits", pause: confirm })) {
                setConfirm(null);
                setReason("");
                setMessage(
                  "Pause saved. Habits resume automatically after the end date.",
                );
              }
            }}
          />
          <Button label="Cancel" secondary onPress={() => setConfirm(null)} />
        </Sheet>
      )}
    </Screen>
  );
}
