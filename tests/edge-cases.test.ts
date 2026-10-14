import test from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "../src/domain/actions";
import {
  completion,
  periodWeeklyPlans,
  weeklyStreak,
} from "../src/domain/progress";
import { emptyState } from "../src/domain/schedule";
import { monthDates } from "../src/utils/dates";
import { habit, seeded, mark, TODAY } from "./fixtures";

test("busy mode cannot relabel a full-goal habit that has no busy goal", () => {
  const s = mark(seeded({ busyGoal: null }), TODAY, "done", true);
  assert.equal(completion(s, [TODAY], TODAY).busy, 0);
  assert.equal(s.occurrences.find((e) => e.date === TODAY)?.target, 15);
});
test("ended routine sessions are retained across repeated runs and later routine name edits", () => {
  let s = seeded();
  const routine = {
    id: "r",
    name: "Original",
    subtitle: "",
    time: "07:00",
    days: [3],
    steps: [
      {
        id: "s",
        name: "Stretch",
        icon: "walk-outline" as const,
        minutes: 5,
        busyMinutes: 1,
      },
    ],
  };
  s = applyAction(s, { type: "saveRoutine", routine }, TODAY);
  s = applyAction(
    s,
    { type: "startRoutine", id: "r", date: TODAY, busy: false },
    TODAY,
  );
  s = applyAction(
    s,
    { type: "endRoutine", sessionId: s.sessions[0].id },
    TODAY,
  );
  s = applyAction(
    s,
    { type: "saveRoutine", routine: { ...routine, name: "Renamed" } },
    TODAY,
  );
  s = applyAction(
    s,
    { type: "startRoutine", id: "r", date: TODAY, busy: true },
    TODAY,
  );
  assert.equal(s.sessions.length, 2);
  assert.equal(s.sessions[0].name, "Original");
  assert.equal(s.sessions[1].name, "Renamed");
  assert.notEqual(s.sessions[0].id, s.sessions[1].id);
});
test("monthly weekly goals retain the whole target of a boundary week", () => {
  let s = applyAction(
    emptyState(),
    {
      type: "saveHabit",
      habit: habit({
        createdAt: "2026-10-01",
        repeat: { type: "weekly", days: [], target: 3 },
      }),
    },
    "2026-10-04",
  );
  s = mark(s, "2026-10-01", "done", false, "2026-10-04");
  const plans = periodWeeklyPlans(s, monthDates("2026-10-01"), "2026-10-04");
  assert.equal(plans.length, 1);
  assert.equal(plans[0].week, "2026-09-28");
  assert.equal(plans[0].done, 1);
  assert.equal(plans[0].target, 3);
});
test("weekly streak counts target-met weeks and does not break on an open week", () => {
  let s = seeded({ repeat: { type: "weekly", days: [], target: 1 } });
  s = mark(s, "2026-10-12", "done", false, "2026-10-26");
  s = mark(s, "2026-10-19", "done", false, "2026-10-26");
  assert.equal(weeklyStreak(s, "read", "2026-10-26"), 2);
  s = mark(s, "2026-10-26", "done", false, "2026-10-26");
  assert.equal(weeklyStreak(s, "read", "2026-10-26"), 3);
});

test("routine steps can finish after their linked weekly target is already met", () => {
  let s = mark(
    seeded({ repeat: { type: "weekly", days: [], target: 1 } }),
    "2026-10-13",
  );
  s = applyAction(
    s,
    {
      type: "saveRoutine",
      routine: {
        id: "r",
        name: "Routine",
        subtitle: "",
        time: "07:00",
        days: [3],
        steps: [
          {
            id: "s",
            name: "Read",
            icon: "book-outline",
            minutes: 5,
            busyMinutes: 1,
            habitId: "read",
          },
        ],
      },
    },
    TODAY,
  );
  s = applyAction(
    s,
    { type: "startRoutine", id: "r", date: TODAY, busy: false },
    TODAY,
  );
  s = applyAction(
    s,
    { type: "completeStep", sessionId: s.sessions[0].id, stepId: "s" },
    TODAY,
  );
  assert.equal(s.sessions[0].completed.length, 1);
  assert.equal(s.occurrences.filter((e) => e.status === "done").length, 1);
});
test("archived habits cannot produce new reschedule obligations", () => {
  const s = applyAction(seeded(), { type: "deleteHabit", id: "read" }, TODAY);
  assert.throws(
    () =>
      applyAction(
        s,
        {
          type: "reschedule",
          id: `read:${TODAY}`,
          habitId: "read",
          sourceDate: TODAY,
          date: "2026-10-15",
          time: "18:00",
          scope: "once",
        },
        TODAY,
      ),
    /Restore/,
  );
});

test("editing after a future override preserves its time without recreating its base slot", () => {
  let s = seeded();
  s = applyAction(
    s,
    {
      type: "reschedule",
      id: `read:${TODAY}`,
      habitId: "read",
      sourceDate: TODAY,
      date: "2026-10-15",
      time: "18:30",
      scope: "once",
    },
    TODAY,
  );
  s = applyAction(
    s,
    {
      type: "saveHabit",
      habit: habit({
        name: "Edited",
        goal: { type: "duration", value: 30, unit: "min" },
      }),
    },
    TODAY,
  );
  s = applyAction(
    s,
    { type: "busy", date: "2026-10-15", value: false },
    "2026-10-15",
  );
  const visible = s.occurrences.filter(
    (e) => e.date === "2026-10-15" && !e.excluded,
  );
  assert.equal(visible.length, 1);
  assert.equal(visible[0].time, "18:30");
  assert.equal(visible[0].snapshot.name, "Edited");
  assert.equal(visible[0].target, 30);
});
test("archiving a moved task cannot resurrect its original day", () => {
  let s = seeded();
  s = applyAction(
    s,
    {
      type: "reschedule",
      id: `read:${TODAY}`,
      habitId: "read",
      sourceDate: TODAY,
      date: "2026-10-15",
      time: "18:30",
      scope: "once",
    },
    TODAY,
  );
  s = applyAction(s, { type: "deleteHabit", id: "read" }, TODAY);
  s = applyAction(s, { type: "busy", date: TODAY, value: false }, TODAY);
  assert.equal(
    s.occurrences.filter((e) => e.date === TODAY && !e.excluded).length,
    0,
  );
  s = applyAction(s, { type: "restoreHabit", id: "read" }, "2026-10-16");
  assert.equal(
    s.occurrences.filter((e) => e.date === "2026-10-16" && !e.excluded).length,
    1,
  );
});
test("a moved weekly occurrence adopts a later daily rule before it becomes due", () => {
  let s = seeded({ repeat: { type: "weekly", days: [], target: 3 } });
  s = applyAction(
    s,
    {
      type: "reschedule",
      id: `read:${TODAY}`,
      habitId: "read",
      sourceDate: TODAY,
      date: "2026-10-19",
      time: "18:30",
      scope: "once",
    },
    TODAY,
  );
  s = applyAction(s, { type: "saveHabit", habit: habit() }, TODAY);
  s = applyAction(
    s,
    {
      type: "status",
      id: `read:${TODAY}`,
      habitId: "read",
      date: "2026-10-19",
      status: "done",
      busy: false,
    },
    "2026-10-19",
  );
  assert.equal(completion(s, ["2026-10-19"], "2026-10-19").done, 1);
  assert.equal(completion(s, ["2026-10-19"], "2026-10-19").total, 1);
});

test("a scheduled rule change inside an archived gap cannot backfill missed tasks on restore", () => {
  let s = seeded({ repeat: { type: "weekly", days: [], target: 3 } });
  s = applyAction(s, { type: "saveHabit", habit: habit() }, TODAY);
  s = applyAction(s, { type: "deleteHabit", id: "read" }, TODAY);
  s = applyAction(s, { type: "restoreHabit", id: "read" }, "2026-10-22");
  assert.equal(
    s.occurrences.filter(
      (e) => e.date >= "2026-10-15" && e.date < "2026-10-22" && !e.excluded,
    ).length,
    0,
  );
  assert.equal(
    s.occurrences.filter((e) => e.date === "2026-10-22" && !e.excluded).length,
    1,
  );
});
test("restore before a queued weekly change preserves the current rule and its future effective date", () => {
  let s = seeded({ repeat: { type: "weekly", days: [], target: 3 } });
  s = applyAction(s, { type: "saveHabit", habit: habit() }, TODAY);
  s = applyAction(s, { type: "deleteHabit", id: "read" }, TODAY);
  s = applyAction(s, { type: "restoreHabit", id: "read" }, "2026-10-16");
  assert.equal(completion(s, ["2026-10-16"], "2026-10-16").total, 0);
  s = applyAction(
    s,
    { type: "busy", date: "2026-10-19", value: false },
    "2026-10-19",
  );
  assert.equal(completion(s, ["2026-10-19"], "2026-10-19").total, 1);
});
