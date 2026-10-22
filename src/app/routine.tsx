import { clone } from "../utils/clone";
import { createId } from "../utils/id";
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
import { useTracker } from "../state/TrackerProvider";
import type { Routine, RoutineStep } from "../models/types";
import { DAY_NAMES, formatTime, validTime } from "../utils/dates";
import { useTheme } from "../theme";
import {
  duplicateRoutine,
  routineFromTemplate,
  routineTemplates,
} from "../domain/routineTemplates";

export default function RoutineScreen() {
  const { colors, ui } = useTheme();
  const {
    id,
    template: templateId,
    duplicate: duplicateId,
  } = useLocalSearchParams<{
    id?: string;
    template?: string;
    duplicate?: string;
  }>();
  const { state, dispatch, selectedDate, saving, today } = useTracker();
  const [openedDate] = useState(selectedDate);
  // Keep an unfinished session on its original day; a new run follows date rollover.
  const unfinished =
    state.sessions.find(
      (s) => s.routineId === id && s.date === openedDate && !s.ended,
    ) ??
    (selectedDate === today
      ? [...state.sessions]
          .reverse()
          .find((s) => s.routineId === id && !s.ended)
      : undefined);
  const sessionDate = unfinished?.date ?? selectedDate;
  const existing = state.routines.find((r) => r.id === id);
  const template = routineTemplates.find((t) => t.id === templateId);
  const original = state.routines.find((r) => r.id === duplicateId);
  const [draft, setDraft] = useState<Routine>(() =>
    existing
      ? clone(existing)
      : original
        ? duplicateRoutine(original)
        : template
          ? routineFromTemplate(template)
          : {
              id: createId("routine"),
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
  const session = state.sessions.find(
    (s) => s.routineId === draft.id && s.date === sessionDate && !s.ended,
  );
  const running = !!session && !session.ended;
  const completed = session?.completed ?? [];
  const activeMode = running ? (session!.busy ? "busy" : "full") : mode;
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menu, setMenu] = useState(false);
  const routine = editing
    ? draft
    : {
        ...(state.routines.find((r) => r.id === draft.id) ?? draft),
        ...(running ? { steps: session!.steps } : {}),
      };
  const duration = routine.steps.reduce(
    (sum, s) => sum + (activeMode === "full" ? s.minutes : s.busyMinutes),
    0,
  );
  async function saveRoutine() {
    if (!draft.name.trim() || !draft.days.length || !validTime(draft.time)) {
      setError("Add a name, valid time and at least one day.");
      return;
    }
    if (
      !(await dispatch({
        type: "saveRoutine",
        routine: { ...draft, name: draft.name.trim() },
      }))
    )
      return;
    setEditing(false);
    setError("");
    if (!id) router.setParams({ id: draft.id });
  }
  function openStep(value?: RoutineStep) {
    const next = value ?? {
      id: createId("step"),
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
  async function saveStep() {
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
    if (
      !editing &&
      !(await dispatch({ type: "saveRoutine", routine: updated }))
    )
      return;
    setDraft(updated);
    setStep(null);
    setError("");
  }
  async function moveStep(index: number, delta: number) {
    const steps = [...routine.steps];
    [steps[index], steps[index + delta]] = [steps[index + delta], steps[index]];
    const updated = { ...routine, steps };
    if (
      !editing &&
      !(await dispatch({ type: "saveRoutine", routine: updated }))
    )
      return;
    setDraft(updated);
  }
  if (
    (id && !existing) ||
    (!id && ((templateId && !template) || (duplicateId && !original)))
  )
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
            <View style={ui.row}>
              <IconButton
                name="pencil-outline"
                label="Edit routine"
                onPress={() => {
                  setDraft(clone(routine));
                  setEditing(true);
                }}
              />
              <IconButton
                name="ellipsis-horizontal"
                label="Routine menu"
                onPress={() => setMenu(!menu)}
              />
            </View>
          ) : undefined
        }
      />
      {menu && existing && !editing && !running && (
        <View style={ui.card}>
          <Text style={ui.heading}>Routine options</Text>
          <Button
            label="Duplicate"
            secondary
            disabled={saving}
            icon="copy-outline"
            onPress={() => {
              setMenu(false);
              router.push({
                pathname: "/routine",
                params: { duplicate: existing.id },
              });
            }}
          />
          <Button
            label="Close routine menu"
            secondary
            onPress={() => setMenu(false)}
          />
        </View>
      )}
      {editing && !existing && (template || original) && (
        <View style={ui.sageCard}>
          <Text style={ui.heading}>
            {original ? `Copy of ${original.name}` : `From ${template!.name}`}
          </Text>
          <Text style={ui.body}>
            {original
              ? "Rename this independent copy and review each linked habit below. Edit a step to change or remove its link. Previous sessions and completions are not copied."
              : "Edit this example before saving. No habits, completions or history are created by using a template."}
          </Text>
          {original && (
            <Text style={ui.small}>
              Kept habit links:{" "}
              {draft.steps
                .filter((s) => s.habitId)
                .map(
                  (s) =>
                    state.habits.find((h) => h.id === s.habitId)?.name ??
                    "Unavailable habit",
                )
                .join(", ") || "None — all steps are standalone"}
            </Text>
          )}
        </View>
      )}
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
            maxLength={200}
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
      <Text style={ui.small}>
        Routine date: {sessionDate}
        {running ? " · Session saved; you can leave and resume" : ""}
      </Text>
      {!running && (
        <Segment
          options={[
            { value: "full", label: "Full routine" },
            { value: "busy", label: "Busy day" },
          ]}
          value={mode}
          onChange={(value) => {
            setMode(value);
          }}
        />
      )}
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
              borderRadius: 0,
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
                  {activeMode === "full" ? s.minutes : s.busyMinutes} min
                  {s.habitId
                    ? ` · Linked: ${state.habits.find((h) => h.id === s.habitId)?.name ?? "Unavailable habit"}`
                    : " · Standalone"}
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
                  disabled={saving || index === 0}
                  onPress={() => moveStep(index, -1)}
                />
                <IconButton
                  name="arrow-down"
                  label={`Move ${s.name} down`}
                  disabled={saving || index === routine.steps.length - 1}
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
          <Text style={ui.label}>Link an existing habit (optional)</Text>
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            <Chip
              label="Standalone step"
              selected={!step.habitId}
              onPress={() => setStep({ ...step, habitId: undefined })}
            />
            {state.habits
              .filter((h) => !h.archivedAt || h.id === step.habitId)
              .map((h) => (
                <Chip
                  key={h.id}
                  label={h.name}
                  selected={step.habitId === h.id}
                  onPress={() => {
                    setStep({
                      ...step,
                      habitId: h.id,
                      name: h.name,
                      icon: h.icon,
                    });
                    if (h.goal.type === "duration") {
                      setStepMinutes(String(h.goal.value));
                      setStepBusyMinutes(String(h.busyGoal ?? h.goal.value));
                    }
                  }}
                />
              ))}
          </View>
          {!!step.habitId && (
            <Text style={ui.small}>
              Completion meets the linked habit’s goal for this routine date.
              Today and Routine share one record; repeating the action adds no
              extra credit.
            </Text>
          )}
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
          <Button label="Save step" disabled={saving} onPress={saveStep} />
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
              disabled={saving}
              danger
              secondary
              onPress={async () => {
                const updated = {
                  ...routine,
                  steps: routine.steps.filter((s) => s.id !== step.id),
                };
                if (
                  !editing &&
                  !(await dispatch({ type: "saveRoutine", routine: updated }))
                )
                  return;
                setDraft(updated);
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
            disabled={!!step || saving}
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
              disabled={saving}
              onPress={() => {
                void dispatch({
                  type: "completeStep",
                  sessionId: session!.id,
                  stepId: routine.steps[completed.length].id,
                });
              }}
            />
          )}
          <Button
            label={
              completed.length === routine.steps.length
                ? "Finish routine"
                : "End session"
            }
            secondary
            disabled={saving}
            onPress={() => {
              void dispatch({ type: "endRoutine", sessionId: session!.id });
            }}
          />
          <Text style={ui.small}>
            Manual step completion ·{" "}
            {session?.busy ? "Busy goals" : "Full goals"} · Saved offline
          </Text>
        </View>
      ) : (
        <Button
          label="Start routine"
          icon="play-outline"
          disabled={
            !routine.steps.length ||
            !!step ||
            saving ||
            !!routine.archivedAt ||
            sessionDate > today
          }
          onPress={() => {
            void dispatch({
              type: "startRoutine",
              id: routine.id,
              date: sessionDate,
              busy: mode === "busy",
            });
          }}
        />
      )}
      {existing &&
        !running &&
        (confirmDelete ? (
          <View style={ui.card}>
            <Text style={ui.body}>
              Archive this routine? Saved sessions remain in history.
            </Text>
            <Button
              label="Confirm archive"
              danger
              disabled={saving}
              onPress={async () => {
                if (
                  !(await dispatch({ type: "deleteRoutine", id: existing.id }))
                )
                  return;
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
            label="Archive routine"
            danger
            secondary
            onPress={() => setConfirmDelete(true)}
          />
        ))}
    </Screen>
  );
}
