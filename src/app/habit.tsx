import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  Chip,
  EmptyState,
  Field,
  Header,
  Icon,
  Screen,
  Segment,
  TimeField,
} from "../components/ui";
import { DateTimeField } from "../components/DateTimeField";
import { Sheet } from "../components/Sheet";
import { useTracker } from "../state/TrackerProvider";
import type { Category, Habit, HabitIcon } from "../models/types";
import {
  validateHabitDraft,
  type FormKey,
  type HabitDraft,
} from "../presentation/habits";
import { createId } from "../utils/id";
import { DAY_NAMES } from "../utils/dates";
import { habitFromTemplate, habitTemplates } from "../domain/habitTemplates";
import { useTheme } from "../theme";

const icons: { name: HabitIcon; label: string }[] = [
  { name: "water-outline", label: "Water" },
  { name: "barbell-outline", label: "Workout" },
  { name: "book-outline", label: "Book" },
  { name: "walk-outline", label: "Walk" },
  { name: "document-text-outline", label: "Plan" },
  { name: "leaf-outline", label: "Leaf" },
  { name: "sunny-outline", label: "Sun" },
  { name: "heart-outline", label: "Heart" },
];
const categories: Category[] = [
  "Wellbeing",
  "Movement",
  "Learning",
  "Mindfulness",
];
function HabitForm() {
  const { colors, ui } = useTheme();
  const params = useLocalSearchParams<{
    id?: string;
    scheduled?: string;
    template?: string;
    nextTemplates?: string;
    setup?: string;
  }>();
  const { state, dispatch, selectedDate, today, saving, notify } = useTracker();
  const existing = state.habits.find((h) => h.id === params.id);
  const [starter] = useState(() =>
    !existing && params.template
      ? habitFromTemplate(
          params.template,
          selectedDate >= today ? selectedDate : today,
        )
      : undefined,
  );
  const initial = existing ?? starter;
  const [draftId] = useState(() => initial?.id ?? createId("habit"));
  const [draft, setDraft] = useState<HabitDraft>(() => ({
    name: initial?.name ?? "",
    goalType: initial?.goal.type ?? "boolean",
    amount: String(initial?.goal.value ?? 1),
    unit: initial?.goal.type === "count" ? initial.goal.unit : "times",
    repeat: initial?.repeat.type ?? "daily",
    days: initial?.repeat.days ?? [0, 1, 2, 3, 4, 5, 6],
    weeklyGoal: String(initial?.repeat.target ?? 3),
    schedule: initial ? (initial.time ? "time" : "anytime") : "time",
    time: initial?.time ?? "09:00",
    busyEnabled: initial ? initial.busyGoal !== null : false,
    busyAmount: String(initial?.busyGoal ?? 5),
    startDate:
      initial?.createdAt ?? (selectedDate >= today ? selectedDate : today),
  }));
  const [icon, setIcon] = useState<HabitIcon>(initial?.icon ?? "book-outline");
  const [category, setCategory] = useState<Category>(
    initial?.category ?? "Learning",
  );
  const [more, setMore] = useState(false);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({});
  const scroll = useRef<ScrollView>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const positions = useRef<Partial<Record<FormKey, number>>>({});
  const pendingFocus = useRef<FormKey | null>(null);
  const change = <K extends keyof HabitDraft>(key: K, value: HabitDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({
      ...e,
      [key]: undefined,
      ...(key === "days" || key === "weeklyGoal" ? { repeat: undefined } : {}),
    }));
  };
  const recordPosition = (key: FormKey, y: number) => {
    positions.current[key] = y;
    if (pendingFocus.current === key) {
      scroll.current?.scrollTo({
        y: Math.max(0, y - 16),
        animated: true,
      });
      pendingFocus.current = null;
    }
  };
  const error = (key: FormKey) =>
    errors[key] ? (
      <Text accessibilityRole="alert" style={ui.error}>
        {errors[key]}
      </Text>
    ) : null;
  const leave = () => {
    // A save may finish after Android Back has already left the form.
    if (!mounted.current) return;
    if (!existing && params.setup) {
      const next = (params.nextTemplates ?? "").split(",").filter(Boolean);
      if (next.length)
        router.replace({
          pathname: "/habit",
          params: {
            template: next[0],
            nextTemplates: next.slice(1).join(","),
            setup: "1",
          },
        });
      else router.replace("/");
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };
  async function save() {
    const validation = validateHabitDraft(draft);
    setErrors(validation);
    const first = Object.keys(validation)[0] as FormKey | undefined;
    if (first) {
      if (!more && (first === "busyAmount" || first === "startDate")) {
        pendingFocus.current = first;
        setMore(true);
      } else
        scroll.current?.scrollTo({
          y: Math.max(0, (positions.current[first] ?? 0) - 16),
          animated: true,
        });
      return;
    }
    const value = draft.goalType === "boolean" ? 1 : Number(draft.amount);
    const habit: Habit = {
      id: draftId,
      name: draft.name.trim(),
      icon,
      category,
      goal: {
        type: draft.goalType,
        value,
        unit:
          draft.goalType === "duration"
            ? "min"
            : draft.goalType === "count"
              ? draft.unit.trim()
              : "",
      },
      repeat: {
        type: draft.repeat,
        days: draft.repeat === "days" ? draft.days : [0, 1, 2, 3, 4, 5, 6],
        target:
          draft.repeat === "weekly"
            ? Number(draft.weeklyGoal)
            : draft.repeat === "days"
              ? draft.days.length
              : 7,
      },
      time: draft.schedule === "time" ? draft.time : null,
      busyGoal: draft.busyEnabled
        ? draft.goalType === "boolean"
          ? 1
          : Number(draft.busyAmount)
        : null,
      createdAt: existing?.createdAt ?? draft.startDate,
    };
    if (!(await dispatch({ type: "saveHabit", habit }))) return;
    notify(
      existing
        ? "Habit saved. Edits apply tomorrow; weekly rule changes next Monday."
        : "Habit created.",
    );
    leave();
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
  const repeatText =
    draft.repeat === "daily"
      ? "Every day"
      : draft.repeat === "weekly"
        ? `${draft.weeklyGoal} days per week`
        : draft.days.length
          ? [1, 2, 3, 4, 5, 6, 0]
              .filter((d) => draft.days.includes(d))
              .map((d) => DAY_NAMES[d].slice(0, 3))
              .join(", ")
          : "Choose days";
  return (
    <Screen form scrollRef={scroll}>
      <Header
        back
        backDisabled={saving}
        title={existing ? "Edit habit" : "New habit"}
      />
      {!existing && (
        <View style={ui.sageCard}>
          <Text style={ui.heading}>Start with a template</Text>
          <Text style={ui.small}>
            Choose an idea, then adjust the details below. Nothing is saved
            until you tap Create habit.
          </Text>
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            {habitTemplates.map((template) => (
              <Chip
                key={template.id}
                label={template.name}
                onPress={() => {
                  const h = habitFromTemplate(template.id, today)!;
                  setDraft((d) => ({
                    ...d,
                    name: h.name,
                    goalType: h.goal.type,
                    amount: String(h.goal.value),
                    unit: h.goal.type === "count" ? h.goal.unit : "times",
                    schedule: "time",
                    time: h.time!,
                    repeat: "daily",
                    days: [0, 1, 2, 3, 4, 5, 6],
                    weeklyGoal: "3",
                    busyEnabled: h.busyGoal !== null,
                    busyAmount: String(h.busyGoal ?? 1),
                  }));
                  setIcon(h.icon);
                  setCategory(h.category);
                  setErrors({});
                }}
              />
            ))}
          </View>
        </View>
      )}
      <View
        onLayout={(event) => recordPosition("name", event.nativeEvent.layout.y)}
        style={{ gap: 8 }}
      >
        <Field
          label="What will you do?"
          value={draft.name}
          onChangeText={(v) => change("name", v)}
          placeholder="Read a book"
          maxLength={60}
        />
        {error("name")}
      </View>
      <View
        onLayout={(event) =>
          recordPosition("amount", event.nativeEvent.layout.y)
        }
        style={{ gap: 12 }}
      >
        <Text style={ui.heading}>How much?</Text>
        <Segment
          options={[
            { value: "boolean", label: "Check off" },
            { value: "duration", label: "Minutes" },
            { value: "count", label: "Count" },
          ]}
          value={draft.goalType}
          onChange={(v) => change("goalType", v)}
        />
        {draft.goalType !== "boolean" && (
          <>
            <Field
              label={
                draft.goalType === "duration"
                  ? "Minutes per day"
                  : "Daily count"
              }
              value={draft.amount}
              onChangeText={(v) => change("amount", v)}
              keyboardType="numeric"
              maxLength={5}
            />
            {error("amount")}
          </>
        )}
        {draft.goalType === "boolean" && (
          <Text style={ui.small}>Complete it with one check.</Text>
        )}
      </View>
      {draft.goalType === "count" && (
        <View
          onLayout={(event) =>
            recordPosition("unit", event.nativeEvent.layout.y)
          }
          style={{ gap: 8 }}
        >
          <Field
            label="What are you counting?"
            value={draft.unit}
            onChangeText={(v) => change("unit", v)}
            placeholder="glasses, pages, repetitions"
            maxLength={20}
          />
          {error("unit")}
        </View>
      )}
      <View
        onLayout={(event) =>
          recordPosition("repeat", event.nativeEvent.layout.y)
        }
        style={{ gap: 10 }}
      >
        <Text style={ui.heading}>Which days?</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Repeat: ${repeatText}`}
          onPress={() => setRepeatOpen(true)}
          style={[ui.input, ui.between]}
        >
          <Text style={[ui.body, ui.grow]}>{repeatText}</Text>
          <Icon name="chevron-down" size={20} />
        </Pressable>
        {draft.repeat === "days" && (
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
              <Chip
                key={day}
                label={DAY_NAMES[day].slice(0, 3)}
                accessibilityLabel={DAY_NAMES[day]}
                selected={draft.days.includes(day)}
                onPress={() =>
                  change(
                    "days",
                    draft.days.includes(day)
                      ? draft.days.filter((d) => d !== day)
                      : [...draft.days, day],
                  )
                }
              />
            ))}
          </View>
        )}
        {draft.repeat === "weekly" && (
          <>
            <Field
              label="Days per week (1–7)"
              value={draft.weeklyGoal}
              onChangeText={(v) => change("weeklyGoal", v)}
              keyboardType="number-pad"
              maxLength={1}
            />
            <Text style={ui.small}>
              Choose any days to meet this weekly target.
            </Text>
          </>
        )}
        {error("repeat")}
      </View>
      <View
        onLayout={(event) => recordPosition("time", event.nativeEvent.layout.y)}
        style={{ gap: 12 }}
      >
        <Text style={ui.heading}>When?</Text>
        <Segment
          options={[
            { value: "time", label: "At a time" },
            { value: "anytime", label: "Anytime" },
          ]}
          value={draft.schedule}
          onChange={(v) => change("schedule", v)}
        />
        {draft.schedule === "time" && (
          <TimeField value={draft.time} onChange={(v) => change("time", v)} />
        )}
        {error("time")}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More options"
        accessibilityState={{ expanded: more }}
        onPress={() => setMore(!more)}
        style={[ui.between, { minHeight: 48 }]}
      >
        <Text style={ui.label}>More options</Text>
        <Icon name={more ? "chevron-up" : "chevron-down"} size={20} />
      </Pressable>
      {more && (
        <>
          <View style={{ gap: 10 }}>
            <Text style={ui.label}>Icon</Text>
            <View style={[ui.row, { flexWrap: "wrap" }]}>
              {icons.map((option) => (
                <Chip
                  key={option.name}
                  label={option.label}
                  selected={icon === option.name}
                  onPress={() => setIcon(option.name)}
                />
              ))}
            </View>
          </View>
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
          <View
            onLayout={(event) =>
              recordPosition("startDate", event.nativeEvent.layout.y)
            }
            style={{ gap: 8 }}
          >
            <DateTimeField
              label="Start date"
              mode="date"
              value={draft.startDate}
              onChange={(v) => change("startDate", v)}
              disabled={!!existing}
            />
            {existing && (
              <Text style={ui.small}>
                The original start date is kept with your history.
              </Text>
            )}
            {error("startDate")}
          </View>
          <View
            onLayout={(event) =>
              recordPosition("busyAmount", event.nativeEvent.layout.y)
            }
            style={{ gap: 12 }}
          >
            <View style={ui.between}>
              <View style={ui.grow}>
                <Text style={ui.label}>Busy day goal</Text>
                <Text style={ui.small}>A smaller goal for a fuller day</Text>
              </View>
              <Switch
                accessibilityLabel="Enable busy day goal"
                value={draft.busyEnabled}
                onValueChange={(v) => change("busyEnabled", v)}
                trackColor={{ true: colors.green }}
                thumbColor="white"
              />
            </View>
            {draft.busyEnabled &&
              (draft.goalType === "boolean" ? (
                <Text style={ui.small}>Showing up counts as done.</Text>
              ) : (
                <Field
                  label={
                    draft.goalType === "duration"
                      ? "Busy day minutes"
                      : "Busy day count"
                  }
                  value={draft.busyAmount}
                  onChangeText={(v) => change("busyAmount", v)}
                  keyboardType="numeric"
                  maxLength={5}
                />
              ))}
            {error("busyAmount")}
          </View>
        </>
      )}
      <Button
        label={existing ? "Save changes" : "Create habit"}
        disabled={saving || !!existing?.archivedAt}
        onPress={save}
      />
      {existing && !existing.archivedAt && (
        <Button
          label="Archive habit"
          secondary
          danger
          onPress={() => setConfirmArchive(true)}
        />
      )}
      <Text style={ui.small}>
        {existing
          ? "Edits apply tomorrow; weekly rule or target changes apply next Monday. Past records keep their original name and goal."
          : "Saved on this device. No account needed."}
      </Text>
      {repeatOpen && (
        <Sheet title="Which days?" onClose={() => setRepeatOpen(false)}>
          {(
            [
              { value: "daily", label: "Every day" },
              { value: "days", label: "Choose days" },
              { value: "weekly", label: "Weekly goal" },
            ] as const
          ).map((option) => (
            <Button
              key={option.value}
              label={option.label}
              secondary={draft.repeat !== option.value}
              onPress={() => {
                change("repeat", option.value);
                setRepeatOpen(false);
              }}
            />
          ))}
          <Button
            label="Cancel"
            secondary
            onPress={() => setRepeatOpen(false)}
          />
        </Sheet>
      )}
      {confirmArchive && (
        <Sheet title="Archive habit?" onClose={() => setConfirmArchive(false)}>
          <Text style={ui.body}>
            History and notes are kept. Future tasks stop after today.
          </Text>
          <Button
            label="Confirm archive"
            danger
            disabled={saving}
            onPress={async () => {
              if (
                existing &&
                (await dispatch({ type: "deleteHabit", id: existing.id }))
              ) {
                notify("Habit archived. History is kept.");
                leave();
              }
            }}
          />
          <Button
            label="Keep habit"
            secondary
            onPress={() => setConfirmArchive(false)}
          />
        </Sheet>
      )}
    </Screen>
  );
}

export default function HabitScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    template?: string;
    nextTemplates?: string;
  }>();
  return (
    <HabitForm
      key={`${params.id ?? "new"}:${params.template ?? "custom"}:${params.nextTemplates ?? ""}`}
    />
  );
}
