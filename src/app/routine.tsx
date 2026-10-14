import { clone } from "../utils/clone";
import { demoId } from "../utils/id";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  Chip,
  EmptyState,
  Field,
  Header,
  Icon,
  IconBubble,
  IconButton,
  Screen,
  Segment,
  TimeField,
} from "../components/ui";
import { useDemo } from "../state/DemoProvider";
import type { Routine, RoutineStep } from "../models/types";
import { DAY_NAMES, formatTime, validTime } from "../utils/dates";
import { colors, ui } from "../theme";

export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, dispatch } = useDemo();
  const existing = state.routines.find((r) => r.id === id);
  const [draft, setDraft] = useState<Routine>(() =>
    existing
      ? clone(existing)
      : {
          id: demoId("routine"),
          name: "",
          subtitle: "A fresh start",
          time: "07:00",
          days: [1, 2, 3, 4, 5],
          steps: [],
        },
  );
  const [editing, setEditing] = useState(!existing);
  const [mode, setMode] = useState<"full" | "busy">("full");
  const [step, setStep] = useState<RoutineStep | null>(null);
  const [stepMinutes, setStepMinutes] = useState("5");
  const [stepBusyMinutes, setStepBusyMinutes] = useState("1");
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const routine = editing
    ? draft
    : (state.routines.find((r) => r.id === draft.id) ?? draft);
  const duration = routine.steps.reduce(
    (sum, s) => sum + (mode === "full" ? s.minutes : s.busyMinutes),
    0,
  );
  function saveRoutine() {
    if (!draft.name.trim() || !draft.days.length || !validTime(draft.time)) {
      setError("Add a name, valid time and at least one day.");
      return;
    }
    dispatch({
      type: "saveRoutine",
      routine: { ...draft, name: draft.name.trim() },
    });
    setEditing(false);
    setError("");
  }
  function openStep(value?: RoutineStep) {
    const next = value ?? {
      id: demoId("step"),
      name: "",
      icon: "leaf-outline" as const,
      minutes: 5,
      busyMinutes: 1,
    };
    setStep(next);
    setStepMinutes(String(next.minutes));
    setStepBusyMinutes(String(next.busyMinutes));
    setError("");
  }
  function saveStep() {
    if (!step) return;
    const minutes = Number(stepMinutes),
      busyMinutes = Number(stepBusyMinutes);
    if (
      !step.name.trim() ||
      !Number.isFinite(minutes) ||
      minutes <= 0 ||
      !Number.isFinite(busyMinutes) ||
      busyMinutes <= 0 ||
      busyMinutes > minutes
    ) {
      setError(
        "Add a step name and positive durations. Busy duration must be no larger than full duration.",
      );
      return;
    }
    const next = { ...step, name: step.name.trim(), minutes, busyMinutes };
    const updated = {
      ...routine,
      steps: routine.steps.some((s) => s.id === step.id)
        ? routine.steps.map((s) => (s.id === step.id ? next : s))
        : [...routine.steps, next],
    };
    setDraft(updated);
    if (!editing) dispatch({ type: "saveRoutine", routine: updated });
    setStep(null);
    setError("");
    setRunning(false);
    setCompleted([]);
  }
  function moveStep(index: number, delta: number) {
    const steps = [...routine.steps];
    [steps[index], steps[index + delta]] = [steps[index + delta], steps[index]];
    const updated = { ...routine, steps };
    setDraft(updated);
    if (!editing) dispatch({ type: "saveRoutine", routine: updated });
  }
  if (id && !existing)
    return (
      <Screen>
        <Header back title="Routine" />
        <EmptyState
          title="Routine unavailable"
          message="This routine has been removed."
        />
      </Screen>
    );
  return (
    <Screen form>
      <Header
        back
        title={
          editing ? (existing ? "Edit routine" : "New routine") : routine.name
        }
        action={
          !editing && !running ? (
            <IconButton
              name="pencil-outline"
              label="Edit routine"
              onPress={() => {
                setDraft(clone(routine));
                setEditing(true);
              }}
            />
          ) : undefined
        }
      />
      {editing ? (
        <>
          <Field
            label="Routine name"
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name })}
            placeholder="Morning routine"
            maxLength={60}
          />
          <Field
            label="A little intention"
            value={draft.subtitle}
            onChangeText={(subtitle) => setDraft({ ...draft, subtitle })}
            maxLength={80}
          />
          <TimeField
            value={draft.time}
            onChange={(time) => setDraft({ ...draft, time })}
          />
          <Text style={ui.label}>Repeat days</Text>
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            {DAY_NAMES.map((day, index) => (
              <Chip
                key={day}
                label={day}
                selected={draft.days.includes(index)}
                onPress={() =>
                  setDraft({
                    ...draft,
                    days: draft.days.includes(index)
                      ? draft.days.filter((d) => d !== index)
                      : [...draft.days, index],
                  })
                }
              />
            ))}
          </View>
        </>
      ) : (
        <View style={[ui.sageCard, ui.row]}>
          <IconBubble name="sunny-outline" amber size={62} />
          <View style={[ui.grow, { gap: 10 }]}>
            <Text style={ui.heading}>{routine.subtitle}</Text>
            <Text style={ui.subtitle}>
              {formatTime(routine.time)} · {duration} min
            </Text>
            <View style={[ui.row, { flexWrap: "wrap", gap: 6 }]}>
              {routine.days.map((day) => (
                <Text
                  key={day}
                  style={{
                    color: colors.green,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {DAY_NAMES[day]}
                </Text>
              ))}
            </View>
          </View>
        </View>
      )}
      <Segment
        options={[
          { value: "full", label: "Full routine" },
          { value: "busy", label: "Busy day" },
        ]}
        value={mode}
        onChange={(value) => {
          setMode(value);
          setRunning(false);
          setCompleted([]);
        }}
      />
      <View style={ui.between}>
        <Text style={ui.heading}>Your steps</Text>
        <Text style={ui.small}>{duration} min total</Text>
      </View>
      {!routine.steps.length && (
        <EmptyState
          title="Start with one small step"
          message="Add the actions you want to bring together."
        />
      )}
      {routine.steps.map((s, index) => (
        <View key={s.id} style={ui.row}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.sage,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={ui.label}>{index + 1}</Text>
          </View>
          <View style={[ui.card, ui.grow]}>
            <View style={ui.row}>
              <Icon name={s.icon} size={28} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit step ${s.name}`}
                disabled={running}
                style={ui.grow}
                onPress={() => openStep(s)}
              >
                <Text style={ui.label}>{s.name}</Text>
                <Text
                  style={{ color: colors.amber, fontSize: 13, marginTop: 4 }}
                >
                  {mode === "full" ? s.minutes : s.busyMinutes} min
                </Text>
              </Pressable>
              {running && (
                <Icon
                  name={
                    completed.includes(s.id)
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                />
              )}
            </View>
            {!running && (
              <View style={ui.row}>
                <IconButton
                  name="arrow-up"
                  label={`Move ${s.name} up`}
                  disabled={index === 0}
                  onPress={() => moveStep(index, -1)}
                />
                <IconButton
                  name="arrow-down"
                  label={`Move ${s.name} down`}
                  disabled={index === routine.steps.length - 1}
                  onPress={() => moveStep(index, 1)}
                />
                <IconButton
                  name="pencil-outline"
                  label={`Edit ${s.name} step`}
                  onPress={() => openStep(s)}
                />
              </View>
            )}
          </View>
        </View>
      ))}
      {step && (
        <View style={[ui.card, { borderColor: colors.green }]}>
          <Text style={ui.heading}>
            {routine.steps.some((s) => s.id === step.id)
              ? "Edit step"
              : "Add a step"}
          </Text>
          <Field
            label="Step name"
            value={step.name}
            onChangeText={(name) => setStep({ ...step, name })}
            maxLength={60}
          />
          <Field
            label="Full duration (minutes)"
            value={stepMinutes}
            onChangeText={setStepMinutes}
            keyboardType="numeric"
            maxLength={4}
          />
          <Field
            label="Busy duration (minutes)"
            value={stepBusyMinutes}
            onChangeText={setStepBusyMinutes}
            keyboardType="numeric"
            maxLength={4}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={ui.error}>
              {error}
            </Text>
          )}
          <Button label="Save step" onPress={saveStep} />
          <Button
            label="Cancel step"
            secondary
            onPress={() => {
              setStep(null);
              setError("");
            }}
          />
          {routine.steps.some((s) => s.id === step.id) && (
            <Button
              label="Remove step"
              danger
              secondary
              onPress={() => {
                const updated = {
                  ...routine,
                  steps: routine.steps.filter((s) => s.id !== step.id),
                };
                setDraft(updated);
                if (!editing)
                  dispatch({ type: "saveRoutine", routine: updated });
                setStep(null);
              }}
            />
          )}
        </View>
      )}
      {!running && (
        <Button
          label="Add a step"
          icon="add"
          secondary
          onPress={() => openStep()}
        />
      )}
      {!!error && !step && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      {editing ? (
        <>
          <Button
            label="Save routine"
            disabled={!!step}
            onPress={saveRoutine}
          />
          {existing && (
            <Button
              label="Cancel changes"
              secondary
              onPress={() => {
                setDraft(clone(existing));
                setEditing(false);
                setStep(null);
                setError("");
              }}
            />
          )}
        </>
      ) : running ? (
        <View style={[ui.sageCard, { gap: 14 }]}>
          <Text style={ui.heading}>
            {completed.length === routine.steps.length
              ? "A lovely little finish"
              : `Step ${completed.length + 1} of ${routine.steps.length}`}
          </Text>
          <Text style={ui.subtitle}>
            {completed.length === routine.steps.length
              ? "You made time for yourself. Well done."
              : routine.steps[completed.length]?.name}
          </Text>
          {completed.length < routine.steps.length && (
            <Button
              label="Complete this step"
              onPress={() =>
                setCompleted([...completed, routine.steps[completed.length].id])
              }
            />
          )}
          <Button
            label={
              completed.length === routine.steps.length
                ? "Finish routine"
                : "End session"
            }
            secondary
            onPress={() => {
              setRunning(false);
              setCompleted([]);
            }}
          />
          <Text style={ui.small}>
            Demo walkthrough · No timer or habit completion is recorded.
          </Text>
        </View>
      ) : (
        <Button
          label="Start routine"
          icon="play-outline"
          disabled={!routine.steps.length || !!step}
          onPress={() => {
            setRunning(true);
            setCompleted([]);
          }}
        />
      )}
      {existing &&
        !running &&
        (confirmDelete ? (
          <View style={ui.card}>
            <Text style={ui.body}>Remove this routine from the demo?</Text>
            <Button
              label="Delete routine"
              danger
              onPress={() => {
                dispatch({ type: "deleteRoutine", id: existing.id });
                if (router.canGoBack()) router.back();
                else router.replace("/routines");
              }}
            />
            <Button
              label="Keep routine"
              secondary
              onPress={() => setConfirmDelete(false)}
            />
          </View>
        ) : (
          <Button
            label="Delete routine"
            danger
            secondary
            onPress={() => setConfirmDelete(true)}
          />
        ))}
    </Screen>
  );
}
