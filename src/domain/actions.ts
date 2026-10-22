import type { Entry, Habit, Routine, TrackerState } from "../models/types";
import {
  addDays,
  daysApart,
  validDate,
  validTime,
  weekDates,
} from "../utils/dates";
import { clone } from "../utils/clone";
import { applyPlanningAction, type PlanningAction } from "./planningActions";
import { isPaused } from "./organization";
import {
  activeOn,
  entriesForDate,
  materialize,
  nextMonday,
  plannedEntry,
  weeklyPlan,
  weeklyCompleted,
  versionAt,
} from "./schedule";

export type Action =
  | PlanningAction
  | {
      type: "saveNote";
      id: string;
      habitId: string;
      date: string;
      text: string;
      updatedAt: string;
    }
  | { type: "saveHabit"; habit: Habit }
  | {
      type: "increment";
      id: string;
      habitId: string;
      date: string;
      delta: number;
      busy: boolean;
    }
  | {
      type: "timerAmount";
      id: string;
      habitId: string;
      date: string;
      delta: number;
      busy: boolean;
      sessionId: string;
    }
  | { type: "deleteHabit"; id: string }
  | { type: "restoreHabit"; id: string }
  | { type: "saveRoutine"; routine: Routine }
  | { type: "deleteRoutine"; id: string }
  | { type: "restoreRoutine"; id: string }
  | {
      type: "status";
      id: string;
      habitId: string;
      date: string;
      status: "done" | "pending" | "skipped";
      busy: boolean;
    }
  | {
      type: "amount";
      id: string;
      habitId: string;
      date: string;
      amount: number;
      busy: boolean;
    }
  | { type: "busy"; date: string; value: boolean }
  | {
      type: "reschedule";
      id: string;
      habitId: string;
      sourceDate: string;
      date: string;
      time: string;
      scope: "once" | "future";
    }
  | { type: "startRoutine"; id: string; date: string; busy: boolean }
  | { type: "completeStep"; sessionId: string; stepId: string }
  | { type: "endRoutine"; sessionId: string };

function validateHabit(h: Habit) {
  if (!h.name.trim() || !validDate(h.createdAt) || h.createdAt > "9999-12-31")
    throw new Error("Enter a habit name and valid start date.");
  if (
    !Number.isFinite(h.goal.value) ||
    h.goal.value <= 0 ||
    (h.goal.type === "count" && !Number.isInteger(h.goal.value))
  )
    throw new Error("Enter a positive valid goal.");
  if (
    h.busyGoal !== null &&
    (!Number.isFinite(h.busyGoal) ||
      h.busyGoal <= 0 ||
      h.busyGoal > h.goal.value ||
      (h.goal.type === "count" && !Number.isInteger(h.busyGoal)))
  )
    throw new Error("Busy goal must be between zero and the full goal.");
  if (h.time !== null && !validTime(h.time))
    throw new Error("Enter a valid time.");
  if (
    h.repeat.type === "days" &&
    (!h.repeat.days.length ||
      h.repeat.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
  )
    throw new Error("Choose valid weekdays.");
  if (
    h.repeat.type === "weekly" &&
    (!Number.isInteger(h.repeat.target) ||
      h.repeat.target < 1 ||
      h.repeat.target > 7)
  )
    throw new Error("Weekly target must be 1–7 days.");
}
function resolveEntry(
  state: TrackerState,
  id: string,
  habitId: string,
  date: string,
  today: string,
): Entry {
  const saved = state.occurrences.find((e) => e.id === id);
  if (
    saved &&
    (saved.excluded || saved.habitId !== habitId || saved.date !== date)
  )
    throw new Error(
      "This task changed. Reopen the selected day and try again.",
    );
  const planned = plannedEntry(state, habitId, date);
  const entry =
    saved ??
    entriesForDate(state, date, today).find(
      (e) => e.id === id && e.habitId === habitId,
    ) ??
    (planned?.id === id &&
    !state.occurrences.some(
      (e) => e.habitId === habitId && e.date === date && !e.excluded,
    )
      ? planned
      : undefined);
  if (!entry || entry.excluded)
    throw new Error("This task is no longer scheduled for that day.");
  if (isPaused(state, habitId, date))
    throw new Error(
      "This habit is paused on that day. Resume it before recording or moving progress.",
    );
  return entry;
}
function replaceEntry(state: TrackerState, entry: Entry) {
  return {
    ...state,
    occurrences: [...state.occurrences.filter((e) => e.id !== entry.id), entry],
  };
}
function record(
  state: TrackerState,
  entry: Entry,
  amount: number,
  busy: boolean,
) {
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    (entry.snapshot.goal.type === "count" && !Number.isInteger(amount))
  )
    throw new Error(
      "Progress must be a non-negative number (whole numbers for counts).",
    );
  const target =
    busy && entry.snapshot.busyGoal !== null
      ? entry.snapshot.busyGoal
      : entry.snapshot.goal.value;
  return replaceEntry(state, {
    ...entry,
    amount,
    busy: busy && entry.snapshot.busyGoal !== null,
    target,
    status: amount >= target ? "done" : "pending",
  });
}
export function applyAction(
  input: TrackerState,
  action: Action,
  today: string,
): TrackerState {
  let state = materialize(input, today);
  switch (action.type) {
    case "pauseHabits":
    case "resumePause":
    case "organizeHabit":
    case "moveHabit":
    case "habitFilters":
    case "saveReview":
    case "seenAchievements":
    case "dismissReview":
      return applyPlanningAction(state, action, today);
    case "increment":
    case "timerAmount": {
      if (action.date > today)
        throw new Error("Record progress on today or a past day.");
      const entry = resolveEntry(
        state,
        action.id,
        action.habitId,
        action.date,
        today,
      );
      if (!Number.isFinite(action.delta) || action.delta <= 0)
        throw new Error("Enter a positive amount of progress.");
      if (
        action.type === "increment" &&
        (entry.snapshot.goal.type !== "count" ||
          !Number.isInteger(action.delta))
      )
        throw new Error(
          "Quick increments require a count habit and a whole number.",
        );
      if (
        action.type === "timerAmount" &&
        (entry.snapshot.goal.type !== "duration" ||
          action.delta > 1440 ||
          !action.sessionId)
      )
        throw new Error("Record up to 1,440 minutes for a duration habit.");
      if (entry.status !== "pending")
        throw new Error(
          "This task is already completed or skipped. Edit its progress from Habit options.",
        );
      const busy = entry.amount > 0 ? entry.busy : action.busy;
      return record(state, entry, entry.amount + action.delta, busy);
    }
    case "saveNote": {
      if (action.text.length > 2000)
        throw new Error("Keep your note within 2,000 characters.");
      const previous = state.notes.find(
        (n) => n.entryId === action.id && n.habitId === action.habitId,
      );
      if (action.date > today && !previous)
        throw new Error("Add a note on today or an earlier record.");
      if (!Number.isFinite(Date.parse(action.updatedAt)))
        throw new Error("Invalid note timestamp.");
      const existing = state.occurrences.find(
        (e) =>
          e.id === action.id &&
          e.habitId === action.habitId &&
          e.date === action.date,
      );
      const entry =
        previous && existing
          ? existing
          : resolveEntry(state, action.id, action.habitId, action.date, today);
      const notes = state.notes.filter((note) => note.entryId !== entry.id);
      if (!action.text.trim()) return { ...state, notes };
      // Capture flexible weekly records too, without recording any progress.
      return {
        ...(existing ? state : replaceEntry(state, entry)),
        notes: [
          ...notes,
          {
            entryId: entry.id,
            habitId: entry.habitId,
            text: action.text,
            updatedAt: action.updatedAt,
          },
        ],
      };
    }
    case "busy":
      return {
        ...state,
        busyDates: action.value
          ? [...new Set([...state.busyDates, action.date])]
          : state.busyDates.filter((d) => d !== action.date),
      };
    case "saveHabit": {
      validateHabit(action.habit);
      const existing = state.habits.find((h) => h.id === action.habit.id);
      const effectiveFrom = existing
        ? existing.repeat.type === "weekly" ||
          action.habit.repeat.type === "weekly"
          ? nextMonday(today)
          : addDays(today, 1)
        : action.habit.createdAt;
      const habit = {
        ...clone(action.habit),
        createdAt: existing?.createdAt ?? action.habit.createdAt,
        archivedAt: existing?.archivedAt,
      };
      if (existing?.archivedAt)
        throw new Error("Restore this habit before editing.");
      const version = {
        id: `${habit.id}:${effectiveFrom}`,
        habitId: habit.id,
        effectiveFrom,
        startDate: effectiveFrom,
        habit,
      };
      state = {
        ...state,
        habits: [...state.habits.filter((h) => h.id !== habit.id), habit],
        versions: [
          ...state.versions.filter(
            (v) => v.habitId !== habit.id || v.effectiveFrom < effectiveFrom,
          ),
          version,
        ],
        occurrences: state.occurrences
          .filter(
            (e) =>
              e.habitId !== habit.id ||
              e.sourceDate < effectiveFrom ||
              e.rescheduled ||
              state.notes.some((note) => note.entryId === e.id) ||
              e.amount > 0 ||
              e.status !== "pending",
          )
          .map((e) =>
            e.habitId === habit.id &&
            e.date >= effectiveFrom &&
            e.status === "pending" &&
            e.amount === 0 &&
            e.rescheduled &&
            !e.excluded
              ? {
                  ...e,
                  snapshot: clone(habit),
                  target: habit.goal.value,
                  weekly: habit.repeat.type === "weekly",
                }
              : e,
          ),
      };
      return materialize(state, today);
    }
    case "deleteHabit":
      return {
        ...state,
        habits: state.habits.map((h) =>
          h.id === action.id && !h.archivedAt
            ? { ...h, archivedAt: addDays(today, 1) }
            : h,
        ),
        occurrences: state.occurrences.map((e) =>
          e.habitId === action.id &&
          e.date > today &&
          e.status === "pending" &&
          e.amount === 0
            ? { ...e, excluded: true }
            : e,
        ),
      };
    case "restoreHabit": {
      const h = state.habits.find((h) => h.id === action.id);
      if (!h?.archivedAt) return state;
      const restored = { ...h, archivedAt: undefined };
      // A fresh version prevents generating obligations over the archived gap.
      const start = today;
      const resumeDefinition = clone(versionAt(state, h.id, today)?.habit ?? h);
      const cutoff =
        h.archivedAt && h.archivedAt < today ? h.archivedAt : today;
      const inactive = {
        ...h,
        repeat: { ...h.repeat, type: "days" as const, days: [] },
      };
      const versions = state.versions.filter(
        (v) =>
          v.habitId !== h.id ||
          v.effectiveFrom < cutoff ||
          v.effectiveFrom > today,
      );
      if (h.archivedAt && h.archivedAt < today)
        versions.push({
          id: `${h.id}:${h.archivedAt}`,
          habitId: h.id,
          effectiveFrom: h.archivedAt,
          startDate: h.archivedAt,
          habit: inactive,
        });
      versions.push({
        id: `${h.id}:${start}`,
        habitId: h.id,
        effectiveFrom: start,
        startDate: start,
        habit: { ...resumeDefinition, archivedAt: undefined },
      });
      return materialize(
        {
          ...state,
          habits: state.habits.map((x) => (x.id === h.id ? restored : x)),
          occurrences: state.occurrences.filter(
            (e) =>
              e.habitId !== h.id ||
              !e.excluded ||
              e.sourceDate < today ||
              state.notes.some((note) => note.entryId === e.id),
          ),
          versions,
        },
        today,
      );
    }
    case "saveRoutine": {
      const r = action.routine;
      if (
        !r.name.trim() ||
        !validTime(r.time) ||
        !r.days.length ||
        r.steps.some(
          (s) =>
            !s.name.trim() ||
            s.minutes <= 0 ||
            !Number.isFinite(s.minutes) ||
            !Number.isFinite(s.busyMinutes) ||
            s.busyMinutes <= 0 ||
            s.busyMinutes > s.minutes,
        )
      )
        throw new Error("Check the routine name, schedule and step durations.");
      return {
        ...state,
        routines: [
          ...state.routines.filter((r) => r.id !== action.routine.id),
          clone(action.routine),
        ],
      };
    }
    case "deleteRoutine":
      return {
        ...state,
        routines: state.routines.map((r) =>
          r.id === action.id ? { ...r, archivedAt: today } : r,
        ),
      };
    case "restoreRoutine":
      return {
        ...state,
        routines: state.routines.map((r) =>
          r.id === action.id ? { ...r, archivedAt: undefined } : r,
        ),
      };
    case "status":
    case "amount": {
      if (action.date > today)
        throw new Error(
          "Future tasks can be rescheduled, but cannot be completed or skipped yet.",
        );
      const e = resolveEntry(
        state,
        action.id,
        action.habitId,
        action.date,
        today,
      );
      if (action.type === "amount")
        return record(state, e, action.amount, action.busy);
      if (action.status === "done")
        return record(
          state,
          e,
          action.busy && e.snapshot.busyGoal !== null
            ? e.snapshot.busyGoal
            : e.snapshot.goal.value,
          action.busy,
        );
      return replaceEntry(state, {
        ...e,
        status: action.status,
        amount: 0,
        busy: false,
        target: e.snapshot.goal.value,
      });
    }
    case "reschedule": {
      if (state.habits.find((h) => h.id === action.habitId)?.archivedAt)
        throw new Error("Restore this habit before rescheduling it.");
      if (!validDate(action.date) || !validTime(action.time))
        throw new Error("Enter a valid day and time.");
      const source = resolveEntry(
        state,
        action.id,
        action.habitId,
        action.sourceDate,
        today,
      );
      if (source.status !== "pending" || source.amount > 0)
        throw new Error(
          "Undo completion, skip or recorded progress before moving this task.",
        );
      if (action.date < today) throw new Error("Choose today or a future day.");
      if (isPaused(state, source.habitId, action.date))
        throw new Error("That date is paused. Choose a day outside the pause.");
      if (action.scope === "future" && source.date < today)
        throw new Error(
          "Change future rules from today or a future occurrence. Past entries can be moved individually.",
        );
      const collision = entriesForDate(state, action.date, today).find(
        (e) => e.habitId === source.habitId && e.id !== source.id,
      );
      if (
        collision &&
        (collision.status !== "pending" ||
          collision.amount > 0 ||
          state.notes.some((note) => note.entryId === collision.id))
      )
        throw new Error(
          "That day already has progress or a note for this habit. Choose another day.",
        );
      if (collision)
        state = replaceEntry(state, { ...collision, excluded: true });
      if (action.scope === "future") {
        const current = state.habits.find((h) => h.id === source.habitId)!;
        if (!activeOn(current, source.date))
          throw new Error(
            "Restore this habit before changing future schedules.",
          );
        const delta = daysApart(source.date, action.date);
        const shiftSchedule = (definition: Habit): Habit => ({
          ...clone(definition),
          time: action.time,
          repeat: {
            ...definition.repeat,
            days: definition.repeat.days.map(
              (d) => (((d + delta) % 7) + 7) % 7,
            ),
          },
        });
        const habit = shiftSchedule(
          versionAt(state, current.id, source.date)?.habit ?? current,
        );
        state = {
          ...state,
          habits: state.habits.map((h) =>
            h.id === habit.id ? shiftSchedule(h) : h,
          ),
          versions: [
            ...state.versions.filter(
              (v) => v.habitId !== habit.id || v.effectiveFrom < source.date,
            ),
            {
              id: `${habit.id}:${source.date}`,
              habitId: habit.id,
              effectiveFrom: source.date,
              startDate: action.date,
              habit,
            },
            ...state.versions
              .filter(
                (v) => v.habitId === habit.id && v.effectiveFrom > source.date,
              )
              .map((v) => ({
                ...v,
                startDate:
                  v.startDate < action.date ? action.date : v.startDate,
                habit: shiftSchedule(v.habit),
              })),
          ],
          occurrences: state.occurrences.filter(
            (e) =>
              e.habitId !== habit.id ||
              e.id === source.id ||
              e.date < source.date ||
              e.excluded ||
              e.rescheduled ||
              state.notes.some((note) => note.entryId === e.id) ||
              e.amount > 0 ||
              e.status !== "pending",
          ),
        };
      }
      return materialize(
        replaceEntry(state, {
          ...source,
          date: action.date,
          time: action.time,
          rescheduled: true,
        }),
        today,
      );
    }
    case "startRoutine": {
      const routine = state.routines.find(
        (r) => r.id === action.id && !r.archivedAt,
      );
      if (!routine || !routine.steps.length)
        throw new Error("Add steps to an active routine first.");
      if (action.date > today)
        throw new Error("Start a routine on today or an earlier day.");
      const existing = state.sessions.find(
        (s) => s.routineId === routine.id && s.date === action.date && !s.ended,
      );
      if (existing) return state;
      const id = `${routine.id}:${action.date}:${state.sessions.filter((s) => s.routineId === routine.id && s.date === action.date).length + 1}`;
      return {
        ...state,
        sessions: [
          ...state.sessions,
          {
            id,
            routineId: routine.id,
            name: routine.name,
            date: action.date,
            busy: action.busy,
            steps: clone(routine.steps),
            completed: [],
            ended: false,
          },
        ],
      };
    }
    case "completeStep": {
      const session = state.sessions.find(
        (s) => s.id === action.sessionId && !s.ended,
      );
      const step = session?.steps.find((s) => s.id === action.stepId);
      if (!session || !step || session.completed.includes(step.id))
        return state;
      if (session.date > today)
        throw new Error("This routine date is in the future.");
      if (step.habitId) {
        if (isPaused(state, step.habitId, session.date))
          throw new Error(
            "The linked habit is paused on this routine day. Resume it or unlink this step before recording progress.",
          );
        const item = entriesForDate(state, session.date, today).find(
          (e) => e.habitId === step.habitId,
        );
        const plan = weeklyPlan(
          state,
          step.habitId,
          weekDates(session.date)[0],
        );
        if (!item && !(plan && weeklyCompleted(state, plan) >= plan.target))
          throw new Error(
            "The linked habit is not scheduled on this routine day. Choose a scheduled day or unlink the step.",
          );
        if (item && item.status !== "done")
          state = record(
            state,
            item,
            session.busy && item.snapshot.busyGoal !== null
              ? item.snapshot.busyGoal
              : item.snapshot.goal.value,
            session.busy,
          );
      }
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === session.id
            ? { ...s, completed: [...s.completed, step.id] }
            : s,
        ),
      };
    }
    case "endRoutine":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId ? { ...s, ended: true } : s,
        ),
      };
  }
}
