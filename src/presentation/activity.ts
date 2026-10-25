import type { Entry, RoutineSession, TrackerState } from "../models/types";
import { dateKey, validDate, weekDates } from "../utils/dates";

export type ActivityKind = "habit" | "routine" | "note";
type HabitTarget = {
  kind: "habit";
  habitId: string;
  entryId: string;
  date: string;
};
type RoutineTarget = {
  kind: "routine";
  routineId: string;
  sessionId: string;
  date: string;
};
type NoteTarget = {
  kind: "note";
  habitId: string;
  entryId: string;
  date: string;
};
export type Activity = {
  id: string;
  kind: ActivityKind;
  date: string;
  title: string;
  detail: string;
  status: "completed" | "partial" | "skipped" | "ended" | "active" | "note";
  target: HabitTarget | RoutineTarget | NoteTarget;
};
export function completedEntry(e: Entry, today: string) {
  return (
    !e.excluded &&
    e.date <= today &&
    e.status === "done" &&
    e.amount >= e.target
  );
}
export function finishedRoutine(s: RoutineSession, today: string) {
  return (
    s.date <= today &&
    s.ended &&
    s.steps.length > 0 &&
    s.steps.every((step) => s.completed.includes(step.id))
  );
}
export function profileSummary(state: TrackerState, today: string) {
  const start = weekDates(today)[0];
  return {
    completions: new Set(
      state.occurrences
        .filter((e) => completedEntry(e, today) && e.date >= start)
        .map((e) => `${e.habitId}:${e.date}`),
    ).size,
    routines: new Set(
      state.sessions
        .filter((s) => finishedRoutine(s, today) && s.date >= start)
        .map((s) => s.id),
    ).size,
  };
}

/** Reconstruct a day-based view, never an invented log of completion timestamps. */
export function activityTimeline(
  state: TrackerState,
  today: string,
): Activity[] {
  const result: Activity[] = [];
  const seen = new Set<string>();
  for (const e of state.occurrences) {
    const key = `${e.habitId}:${e.date}`;
    if (
      e.excluded ||
      e.date > today ||
      seen.has(key) ||
      (e.status === "pending" && e.amount === 0)
    )
      continue;
    seen.add(key);
    const status = completedEntry(e, today)
      ? "completed"
      : e.status === "skipped"
        ? "skipped"
        : "partial";
    const progress =
      e.snapshot.goal.type === "boolean"
        ? ""
        : `${e.amount}/${e.target} ${e.snapshot.goal.unit}`;
    result.push({
      id: `habit:${e.id}`,
      kind: "habit",
      date: e.date,
      title: e.snapshot.name,
      status,
      detail: [
        status === "completed"
          ? "Completed"
          : status === "skipped"
            ? "Skipped"
            : "Progress recorded",
        progress,
        e.busy ? "Busy goal" : "",
        e.weekly ? "Weekly habit" : "",
        e.rescheduled ? `Moved from ${e.sourceDate}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      target: {
        kind: "habit",
        habitId: e.habitId,
        entryId: e.id,
        date: e.date,
      },
    });
  }
  const sessions = new Set<string>();
  for (const s of state.sessions) {
    if (s.date > today || sessions.has(s.id)) continue;
    sessions.add(s.id);
    const done = s.steps.filter((step) => s.completed.includes(step.id)).length;
    const finished = finishedRoutine(s, today);
    result.push({
      id: `routine:${s.id}`,
      kind: "routine",
      date: s.date,
      title:
        s.name ??
        state.routines.find((r) => r.id === s.routineId)?.name ??
        "Routine",
      status: finished ? "completed" : s.ended ? "ended" : "active",
      detail: `${finished ? "Routine completed" : s.ended ? "Routine ended" : "Routine in progress"} · ${done}/${s.steps.length} steps · ${s.busy ? "Busy day" : "Full routine"}`,
      target: {
        kind: "routine",
        routineId: s.routineId,
        sessionId: s.id,
        date: s.date,
      },
    });
  }
  const entries = new Map(state.occurrences.map((e) => [e.id, e]));
  const notes = new Set<string>();
  for (const note of state.notes) {
    const e = entries.get(note.entryId);
    const saved = new Date(note.updatedAt);
    if (!e || notes.has(note.entryId) || Number.isNaN(saved.getTime()))
      continue;
    const date = dateKey(saved);
    if (!validDate(date) || date > today) continue;
    notes.add(note.entryId);
    result.push({
      id: `note:${note.entryId}`,
      kind: "note",
      date,
      title: e.snapshot.name,
      status: "note",
      detail: `Note saved · For ${e.date}`,
      target: { kind: "note", habitId: e.habitId, entryId: e.id, date: e.date },
    });
  }
  // Dates, then a deterministic order; no assumed time ordering for old records.
  return result.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.kind.localeCompare(b.kind) ||
      a.title.localeCompare(b.title) ||
      a.id.localeCompare(b.id),
  );
}
export function groupActivities(items: Activity[]) {
  const groups = new Map<string, Activity[]>();
  for (const item of items) {
    const list = groups.get(item.date) ?? [];
    list.push(item);
    groups.set(item.date, list);
  }
  return [...groups].map(([date, items]) => ({ date, items }));
}
