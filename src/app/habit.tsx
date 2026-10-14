import { useState } from "react";
import { createId } from "../utils/id";
import { Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  Chip,
  EmptyState,
  Field,
  Header,
  IconBubble,
  Screen,
  Segment,
  TimeField,
} from "../components/ui";
import { useTracker } from "../state/TrackerProvider";
import type { Category, Goal, Habit, HabitIcon, Repeat } from "../models/types";
import { colors, ui } from "../theme";
import { DAY_NAMES, validTime, validDate } from "../utils/dates";

const icons: HabitIcon[] = [
  "water-outline",
  "barbell-outline",
  "book-outline",
  "walk-outline",
  "document-text-outline",
  "leaf-outline",
  "sunny-outline",
  "heart-outline",
];
const categories: Category[] = [
  "Wellbeing",
  "Movement",
  "Learning",
  "Mindfulness",
];
export default function HabitScreen() {
  const params = useLocalSearchParams<{ id?: string; scheduled?: string }>();
  const { state, dispatch, selectedDate, today, saving } = useTracker();
  const existing = state.habits.find((h) => h.id === params.id);
  const [name, setName] = useState(existing?.name ?? "");
  const [icon, setIcon] = useState<HabitIcon>(existing?.icon ?? "book-outline");
  const [category, setCategory] = useState<Category>(
    existing?.category ?? "Learning",
  );
  const [goalType, setGoalType] = useState<Goal["type"]>(
    existing?.goal.type ?? "duration",
  );
  const [amount, setAmount] = useState(String(existing?.goal.value ?? 15));
  const [unit, setUnit] = useState(
    existing?.goal.type === "count" ? existing.goal.unit : "times",
  );
  const [repeat, setRepeat] = useState<Repeat["type"]>(
    existing?.repeat.type ?? "daily",
  );
  const [days, setDays] = useState(
    existing?.repeat.days ?? [0, 1, 2, 3, 4, 5, 6],
  );
  const [weeklyGoal, setWeeklyGoal] = useState(
    String(existing?.repeat.target ?? 3),
  );
  const [schedule, setSchedule] = useState<"time" | "anytime">(
    existing ? (existing.time ? "time" : "anytime") : "time",
  );
  const [time, setTime] = useState(existing?.time ?? "09:00");
  const [busyEnabled, setBusyEnabled] = useState(
    existing ? existing.busyGoal !== null : true,
  );
  const [busyAmount, setBusyAmount] = useState(String(existing?.busyGoal ?? 5));
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [startDate, setStartDate] = useState(
    existing?.createdAt ?? (selectedDate >= today ? selectedDate : today),
  );
  async function save() {
    if (!validDate(startDate)) {
      setError("Enter a valid start date (YYYY-MM-DD).");
      return;
    }
    const value = goalType === "boolean" ? 1 : Number(amount);
    const busyValue = goalType === "boolean" ? 1 : Number(busyAmount);
    if (!name.trim()) {
      setError("Give your habit a name.");
      return;
    }
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      (goalType === "count" && !Number.isInteger(value))
    ) {
      setError("Enter a positive goal. Count goals use whole numbers.");
      return;
    }
    if (goalType === "count" && !unit.trim()) {
      setError("Add a unit for your count goal.");
      return;
    }
    if (repeat === "days" && !days.length) {
      setError("Choose at least one day.");
      return;
    }
    if (
      repeat === "weekly" &&
      (!Number.isInteger(Number(weeklyGoal)) ||
        Number(weeklyGoal) < 1 ||
        Number(weeklyGoal) > 7)
    ) {
      setError("Weekly goal must be between 1 and 7 days.");
      return;
    }
    if (schedule === "time" && !validTime(time)) {
      setError("Use a valid 24-hour time, such as 07:30.");
      return;
    }
    if (
      busyEnabled &&
      (!Number.isFinite(busyValue) ||
        busyValue <= 0 ||
        busyValue > value ||
        (goalType === "count" && !Number.isInteger(busyValue)))
    ) {
      setError(
        "Busy day goal must be positive and no larger than the full goal.",
      );
      return;
    }
    const habit: Habit = {
      id: existing?.id ?? createId("habit"),
      name: name.trim(),
      icon,
      category,
      goal: {
        type: goalType,
        value,
        unit:
          goalType === "duration"
            ? "min"
            : goalType === "count"
              ? unit.trim()
              : "",
      },
      repeat: {
        type: repeat,
        days:
          repeat === "daily" || repeat === "weekly"
            ? [0, 1, 2, 3, 4, 5, 6]
            : days,
        target:
          repeat === "weekly"
            ? Number(weeklyGoal)
            : repeat === "days"
              ? days.length
              : 7,
      },
      time: schedule === "time" ? time : null,
      busyGoal: busyEnabled ? busyValue : null,
      createdAt: existing?.createdAt ?? startDate,
    };
    if (!(await dispatch({ type: "saveHabit", habit }))) return;
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }
  if (params.id && !existing)
    return (
      <Screen>
        <Header back title="Habit" />
        <EmptyState
          title="Habit unavailable"
          message="This habit is unavailable."
        />
      </Screen>
    );
  return (
    <Screen form>
      <Header back title={existing ? "Edit habit" : "New habit"} />
      <View style={{ alignItems: "center", gap: 12 }}>
        <IconBubble name={icon} size={90} />
        <Text style={ui.small}>Choose an icon that feels like you</Text>
      </View>
      <View style={[ui.row, { flexWrap: "wrap", justifyContent: "center" }]}>
        {icons.map((option) => (
          <Chip
            key={option}
            label={
              {
                "water-outline": "Water",
                "barbell-outline": "Workout",
                "book-outline": "Book",
                "walk-outline": "Walk",
                "document-text-outline": "Plan",
                "leaf-outline": "Leaf",
                "sunny-outline": "Sun",
                "heart-outline": "Heart",
              }[option]
            }
            selected={icon === option}
            onPress={() => setIcon(option)}
          />
        ))}
      </View>
      <Field
        label="Habit name"
        value={name}
        onChangeText={setName}
        maxLength={60}
        placeholder="Read a book"
      />
      {!existing && (
        <Field
          label="Start date (YYYY-MM-DD)"
          value={startDate}
          onChangeText={setStartDate}
          maxLength={10}
        />
      )}
      <View style={{ gap: 10 }}>
        <Text style={ui.label}>Category</Text>
        <View style={[ui.row, { flexWrap: "wrap" }]}>
          {categories.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={category === option}
              onPress={() => setCategory(option)}
            />
          ))}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Text style={ui.label}>Daily goal</Text>
        <Segment
          options={[
            { value: "boolean", label: "Done / Not done" },
            { value: "duration", label: "Duration" },
            { value: "count", label: "Count" },
          ]}
          value={goalType}
          onChange={(type) => {
            setGoalType(type);
            if (type === "count") {
              setAmount("2");
              setBusyAmount("1");
            }
            if (type === "duration") {
              setAmount("15");
              setBusyAmount("5");
            }
          }}
        />
        {goalType !== "boolean" && (
          <Field
            label={
              goalType === "duration" ? "Duration (minutes)" : "Count goal"
            }
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            maxLength={5}
          />
        )}
        {goalType === "count" && (
          <Field
            label="Count unit"
            value={unit}
            onChangeText={setUnit}
            placeholder="glasses, pages, repetitions"
            maxLength={20}
          />
        )}
      </View>
      <View style={{ gap: 12 }}>
        <Text style={ui.label}>Repeat</Text>
        <Segment
          options={[
            { value: "daily", label: "Every day" },
            { value: "days", label: "Choose days" },
            { value: "weekly", label: "Weekly goal" },
          ]}
          value={repeat}
          onChange={(value) => {
            setRepeat(value);
            if (value === "daily") setDays([0, 1, 2, 3, 4, 5, 6]);
          }}
        />
        {repeat !== "weekly" ? (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
              <Chip
                key={day}
                label={DAY_NAMES[day].slice(0, 1)}
                accessibilityLabel={DAY_NAMES[day]}
                selected={repeat === "daily" || days.includes(day)}
                onPress={() => {
                  setRepeat("days");
                  setDays(
                    days.includes(day)
                      ? days.filter((d) => d !== day)
                      : [...days, day],
                  );
                }}
              />
            ))}
          </View>
        ) : (
          <>
            <Field
              label="Days per week (1–7)"
              value={weeklyGoal}
              onChangeText={setWeeklyGoal}
              keyboardType="number-pad"
              maxLength={1}
            />
            <Text style={ui.small}>
              Choose any days to meet your weekly target. These are optional
              opportunities, not daily obligations.
            </Text>
          </>
        )}
      </View>
      <View style={{ gap: 12 }}>
        <Text style={ui.label}>Schedule</Text>
        <Segment
          options={[
            { value: "time", label: "At a specific time" },
            { value: "anytime", label: "Anytime" },
          ]}
          value={schedule}
          onChange={setSchedule}
        />
        {schedule === "time" && <TimeField value={time} onChange={setTime} />}
      </View>
      <View style={[ui.card, { backgroundColor: colors.amberLight }]}>
        <View style={ui.between}>
          <View style={ui.grow}>
            <Text style={ui.label}>Busy day goal</Text>
            <Text style={ui.small}>A smaller version for a fuller day</Text>
          </View>
          <Switch
            accessibilityLabel="Enable busy day goal"
            value={busyEnabled}
            onValueChange={setBusyEnabled}
            trackColor={{ true: colors.green }}
            thumbColor="white"
          />
        </View>
        {busyEnabled &&
          (goalType === "boolean" ? (
            <Text style={ui.small}>Simply showing up counts as done.</Text>
          ) : (
            <Field
              label={`Busy day ${goalType === "duration" ? "minutes" : unit || "count"}`}
              value={busyAmount}
              onChangeText={setBusyAmount}
              keyboardType="numeric"
              maxLength={5}
            />
          ))}
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      <Button
        label={existing ? "Save changes" : "Create habit"}
        disabled={saving || !!existing?.archivedAt}
        onPress={save}
      />
      {existing &&
        (confirmDelete ? (
          <View style={ui.card}>
            <Text style={ui.body}>
              Archive this habit? History is kept. Future tasks stop after
              today.
            </Text>
            <Button
              label="Confirm archive"
              danger
              onPress={async () => {
                if (!(await dispatch({ type: "deleteHabit", id: existing.id })))
                  return;
                if (router.canGoBack()) router.back();
                else router.replace("/");
              }}
            />
            <Button
              label="Keep habit"
              secondary
              onPress={() => setConfirmDelete(false)}
            />
          </View>
        ) : (
          <Button
            label="Archive habit"
            danger
            secondary
            onPress={() => setConfirmDelete(true)}
          />
        ))}
      <Text style={ui.small}>
        {existing
          ? "Edits apply tomorrow; weekly rule or target changes apply next Monday. Past records keep their original name and goal."
          : "Saved on this device. No account or internet connection needed."}
      </Text>
    </Screen>
  );
}
