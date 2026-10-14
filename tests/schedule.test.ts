import assert from "node:assert/strict";
import test from "node:test";
import { applyAction } from "../src/domain/actions";
import {
  entriesForDate,
  materialize,
  weeklyCompleted,
  weeklyPlan,
} from "../src/domain/schedule";
import {
  bestStreak,
  completion,
  habitConsistency,
  periodWeeklyPlans,
} from "../src/domain/progress";
import {
  addDays,
  dateKey,
  daysApart,
  localToday,
  validDate,
  validTime,
  weekDates,
} from "../src/utils/dates";
import { habit, mark, seeded, TODAY } from "./fixtures";

test("daily recurrence extends across months and years; materialization is idempotent", () => {
  const s = seeded();
  assert.equal(entriesForDate(s, "2027-01-01", TODAY).length, 1);
  const a = materialize(s, "2026-11-01");
  assert.deepEqual(materialize(a, "2026-11-01"), a);
  assert.equal(
    new Set(a.occurrences.map((e) => e.id)).size,
    a.occurrences.length,
  );
});
test("weekday recurrence creates no obligations on off-days", () => {
  const s = seeded({ repeat: { type: "days", days: [1, 3, 5], target: 3 } });
  assert.equal(entriesForDate(s, "2026-10-13", TODAY).length, 0);
  assert.equal(entriesForDate(s, TODAY, TODAY).length, 1);
});
test("pending today becomes missed only after date rollover; future excluded from progress", () => {
  const s = seeded();
  assert.equal(entriesForDate(s, TODAY, TODAY)[0].displayStatus, "pending");
  assert.equal(
    entriesForDate(s, TODAY, "2026-10-15")[0].displayStatus,
    "missed",
  );
  assert.equal(completion(s, ["2026-10-15"], TODAY).total, 0);
});
test("duration/count recording, target completion, corrections and Undo persist goal semantics", () => {
  let s = seeded();
  s = applyAction(
    s,
    {
      type: "amount",
      id: `read:${TODAY}`,
      habitId: "read",
      date: TODAY,
      amount: 5,
      busy: true,
    },
    TODAY,
  );
  assert.equal(completion(s, [TODAY], TODAY).done, 1);
  assert.equal(completion(s, [TODAY], TODAY).busy, 1);
  s = applyAction(
    s,
    {
      type: "amount",
      id: `read:${TODAY}`,
      habitId: "read",
      date: TODAY,
      amount: 3,
      busy: true,
    },
    TODAY,
  );
  assert.equal(completion(s, [TODAY], TODAY).done, 0);
  s = mark(s, TODAY, "pending");
  assert.equal(entriesForDate(s, TODAY, TODAY)[0].amount, 0);
  const count = seeded({
    goal: { type: "count", value: 2, unit: "glasses" },
    busyGoal: 1,
  });
  assert.throws(() =>
    applyAction(
      count,
      {
        type: "amount",
        id: `read:${TODAY}`,
        habitId: "read",
        date: TODAY,
        amount: 1.5,
        busy: false,
      },
      TODAY,
    ),
  );
});
test("Skip is separate, remains incomplete, and Undo restores pending", () => {
  const s = mark(seeded(), TODAY, "skipped");
  assert.equal(completion(s, [TODAY], TODAY).skipped, 1);
  assert.equal(completion(s, [TODAY], TODAY).done, 0);
  assert.equal(
    entriesForDate(mark(s, TODAY, "pending"), TODAY, TODAY)[0].displayStatus,
    "pending",
  );
});
test("one-day reschedule removes source, merges empty target, preserves repeat rule and later times", () => {
  const s = seeded();
  const moved = applyAction(
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
  );
  assert.equal(entriesForDate(moved, TODAY, TODAY).length, 0);
  assert.equal(entriesForDate(moved, "2026-10-15", TODAY).length, 1);
  assert.equal(entriesForDate(moved, "2026-10-15", TODAY)[0].time, "18:00");
  assert.equal(entriesForDate(moved, "2026-10-16", TODAY)[0].time, "08:00");
  assert.equal(moved.versions.length, s.versions.length);
  assert.equal(
    materialize(moved, "2026-10-16").occurrences.filter(
      (e) => e.date === "2026-10-15" && !e.excluded,
    ).length,
    1,
  );
});
test("future reschedule changes times and weekday alignment from selected day without altering prior snapshots", () => {
  let s = seeded({ repeat: { type: "days", days: [1, 3, 5], target: 3 } });
  s = mark(s, "2026-10-12");
  const old = s.occurrences.find((e) => e.date === "2026-10-12");
  const moved = applyAction(
    s,
    {
      type: "reschedule",
      id: `read:${TODAY}`,
      habitId: "read",
      sourceDate: TODAY,
      date: "2026-10-15",
      time: "20:00",
      scope: "future",
    },
    TODAY,
  );
  assert.deepEqual(
    moved.occurrences.find((e) => e.date === "2026-10-12"),
    old,
  );
  assert.equal(entriesForDate(moved, "2026-10-16", TODAY).length, 0);
  assert.equal(entriesForDate(moved, "2026-10-17", TODAY)[0].time, "20:00");
});
test("recorded destinations are never overwritten and future actions cannot complete early", () => {
  let s = mark(seeded(), TODAY);
  assert.throws(() =>
    applyAction(
      s,
      {
        type: "reschedule",
        id: "read:2026-10-13",
        habitId: "read",
        sourceDate: "2026-10-13",
        date: TODAY,
        time: "17:00",
        scope: "once",
      },
      TODAY,
    ),
  );
  assert.throws(() => mark(s, "2026-10-15"));
});
test("historical names/goals/schedules survive edits and archival", () => {
  let s = mark(seeded(), "2026-10-12", "done", true);
  const old = entriesForDate(s, "2026-10-12", TODAY)[0];
  s = applyAction(
    s,
    {
      type: "saveHabit",
      habit: habit({
        name: "New name",
        goal: { type: "duration", value: 30, unit: "min" },
        time: "09:30",
      }),
    },
    TODAY,
  );
  assert.equal(
    entriesForDate(s, "2026-10-15", TODAY)[0].habit.name,
    "New name",
  );
  assert.deepEqual(entriesForDate(s, "2026-10-12", TODAY)[0], old);
  s = applyAction(s, { type: "deleteHabit", id: "read" }, TODAY);
  assert.equal(entriesForDate(s, "2026-10-15", TODAY).length, 0);
  assert.deepEqual(entriesForDate(s, "2026-10-12", TODAY)[0], old);
  assert.equal(completion(s, ["2026-10-12"], TODAY).busy, 1);
});
test("restore creates no missed obligations through archived gap", () => {
  let s = applyAction(seeded(), { type: "deleteHabit", id: "read" }, TODAY);
  s = applyAction(s, { type: "restoreHabit", id: "read" }, "2026-10-20");
  assert.equal(entriesForDate(s, "2026-10-17", "2026-10-20").length, 0);
  assert.equal(entriesForDate(s, "2026-10-20", "2026-10-20").length, 1);
});
test("weekly target is 3 credits, not seven required daily tasks; same day cannot earn twice", () => {
  let s = seeded({ repeat: { type: "weekly", days: [], target: 3 } });
  assert.equal(completion(s, weekDates(TODAY), TODAY).total, 0);
  assert.equal(s.occurrences.length, 0);
  const p = weeklyPlan(s, "read", "2026-10-12")!;
  assert.equal(p.target, 3);
  s = mark(mark(s, "2026-10-12"), "2026-10-12");
  assert.equal(weeklyCompleted(s, p), 1);
  s = mark(mark(s, "2026-10-13"), TODAY);
  assert.equal(weeklyCompleted(s, p), 3);
  assert.equal(entriesForDate(s, "2026-10-15", TODAY).length, 0);
  assert.equal(
    habitConsistency(s, "read", weekDates(TODAY), TODAY).percent,
    100,
  );
});
test("weekly missed credits only close after Sunday; target edits apply next week", () => {
  let s = seeded({ repeat: { type: "weekly", days: [], target: 3 } });
  assert.equal(periodWeeklyPlans(s, weekDates(TODAY), TODAY)[0].closed, false);
  s = applyAction(
    s,
    {
      type: "saveHabit",
      habit: habit({ repeat: { type: "weekly", days: [], target: 5 } }),
    },
    TODAY,
  );
  assert.equal(weeklyPlan(s, "read", "2026-10-12")!.target, 3);
  assert.equal(weeklyPlan(s, "read", "2026-10-19")!.target, 5);
  assert.equal(
    periodWeeklyPlans(s, weekDates(TODAY), "2026-10-19")[0].closed,
    true,
  );
});
test("partial first weekly target capped to available days", () => {
  const s = seeded({
    createdAt: "2026-10-17",
    repeat: { type: "weekly", days: [], target: 3 },
  });
  assert.equal(weeklyPlan(s, "read", "2026-10-12")!.target, 2);
});
test("streak ignores unscheduled dates; skipped scheduled day breaks it", () => {
  let s = seeded({ repeat: { type: "days", days: [1, 3, 5], target: 3 } });
  s = mark(mark(s, "2026-10-12"), TODAY);
  assert.equal(bestStreak(s, TODAY), 2);
  s = mark(s, TODAY, "skipped");
  assert.equal(bestStreak(s, TODAY), 1);
});
test("routine-linked completion is idempotent with Today and session step replay", () => {
  let s = seeded();
  s = applyAction(
    s,
    {
      type: "saveRoutine",
      routine: {
        id: "morning",
        name: "Morning",
        subtitle: "",
        time: "07:00",
        days: [1, 3],
        steps: [
          {
            id: "step",
            name: "Read",
            icon: "book-outline",
            minutes: 15,
            busyMinutes: 5,
            habitId: "read",
          },
        ],
      },
    },
    TODAY,
  );
  s = applyAction(
    s,
    { type: "startRoutine", id: "morning", date: TODAY, busy: true },
    TODAY,
  );
  s = applyAction(
    s,
    { type: "completeStep", sessionId: s.sessions[0].id, stepId: "step" },
    TODAY,
  );
  s = applyAction(
    s,
    { type: "completeStep", sessionId: s.sessions[0].id, stepId: "step" },
    TODAY,
  );
  assert.equal(completion(s, [TODAY], TODAY).done, 1);
  assert.equal(s.sessions[0].completed.length, 1);
  s = mark(s, TODAY, "done", true);
  assert.equal(completion(s, [TODAY], TODAY).done, 1);
  assert.equal(s.occurrences.filter((e) => e.date === TODAY).length, 1);
});
test("local calendar math handles DST, month/year rollover and invalid input", () => {
  const previous = process.env.TZ;
  for (const zone of ["Asia/Riyadh", "America/New_York", "Pacific/Auckland"]) {
    process.env.TZ = zone;
    assert.equal(dateKey(new Date(2026, 9, 14, 0, 5)), TODAY);
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(addDays("2026-03-08", 1), "2026-03-09");
    assert.equal(daysApart("2026-03-07", "2026-03-09"), 2);
    assert.equal(localToday(), dateKey(new Date()));
  }
  if (previous === undefined) delete process.env.TZ;
  else process.env.TZ = previous;
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validTime("24:00"), false);
});
