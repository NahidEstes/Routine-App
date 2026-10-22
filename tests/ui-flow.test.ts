import test from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "../src/domain/actions";
import { entriesForDate } from "../src/domain/schedule";
import { completion } from "../src/domain/progress";
import {
  agendaGroups,
  entryAccess,
  entryStatus,
  entryTarget,
  previousProgressAction,
  splitDay,
  validateHabitDraft,
  type HabitDraft,
} from "../src/presentation/habits";
import { habit, seeded, TODAY } from "./fixtures";

test("completing then undoing restores partial progress and busy mode exactly", () => {
  for (const [amount, busy] of [
    [3, false],
    [4, true],
    [22, false],
  ] as const) {
    let state = seeded();
    state = applyAction(
      state,
      {
        type: "amount",
        id: `read:${TODAY}`,
        habitId: "read",
        date: TODAY,
        amount,
        busy,
      },
      TODAY,
    );
    const before = entriesForDate(state, TODAY, TODAY)[0];
    const completed = applyAction(
      state,
      {
        type: "status",
        id: before.id,
        habitId: "read",
        date: TODAY,
        status: "done",
        busy,
      },
      TODAY,
    );
    const undone = applyAction(
      completed,
      previousProgressAction(before),
      TODAY,
    );
    const after = entriesForDate(undone, TODAY, TODAY)[0];
    assert.deepEqual(
      [after.amount, after.busy, after.status, after.target],
      [before.amount, before.busy, before.status, before.target],
    );
    assert.equal(
      undone.occurrences.filter((e) => e.habitId === "read" && e.date === TODAY)
        .length,
      1,
    );
  }
});

test("completed and skipped tasks remain discoverable without changing daily totals", () => {
  let state = seeded();
  for (const id of ["walk", "water"])
    state = applyAction(
      state,
      { type: "saveHabit", habit: habit({ id }) },
      TODAY,
    );
  state = applyAction(
    state,
    {
      type: "status",
      id: `walk:${TODAY}`,
      habitId: "walk",
      date: TODAY,
      status: "done",
      busy: false,
    },
    TODAY,
  );
  state = applyAction(
    state,
    {
      type: "status",
      id: `water:${TODAY}`,
      habitId: "water",
      date: TODAY,
      status: "skipped",
      busy: false,
    },
    TODAY,
  );
  const groups = splitDay(entriesForDate(state, TODAY, TODAY));
  assert.deepEqual(
    [groups.pending.length, groups.completed.length, groups.skipped.length],
    [1, 1, 1],
  );
  assert.equal(completion(state, [TODAY], TODAY).total, 3);
  const undo = applyAction(
    state,
    {
      type: "status",
      id: groups.skipped[0].id,
      habitId: "water",
      date: TODAY,
      status: "pending",
      busy: false,
    },
    TODAY,
  );
  assert.equal(splitDay(entriesForDate(undo, TODAY, TODAY)).pending.length, 2);
});

test("agenda lists real timed and anytime items, with no empty time sections", () => {
  let state = seeded({ time: "19:00" });
  state = applyAction(
    state,
    { type: "saveHabit", habit: habit({ id: "flex", time: null }) },
    TODAY,
  );
  const groups = agendaGroups(entriesForDate(state, TODAY, TODAY));
  assert.deepEqual(
    groups.map((g) => g.title),
    ["Evening", "Anytime"],
  );
  assert.equal(groups.flatMap((g) => g.items).length, 2);
  assert.deepEqual(agendaGroups([]), []);
});

test("details/menu respect future, partial, archived and historical access", () => {
  let state = seeded();
  const future = entriesForDate(state, "2026-10-15", TODAY)[0];
  assert.equal(entryStatus(future, TODAY), "Upcoming");
  assert.equal(entryAccess(future, state, TODAY).record, false);
  assert.equal(entryAccess(future, state, TODAY).reschedule, true);
  state = applyAction(
    state,
    {
      type: "amount",
      id: `read:${TODAY}`,
      habitId: "read",
      date: TODAY,
      amount: 2,
      busy: true,
    },
    TODAY,
  );
  let entry = entriesForDate(state, TODAY, TODAY)[0];
  assert.equal(entryAccess(entry, state, TODAY).reschedule, false);
  assert.equal(
    entryTarget(entry, false),
    5,
    "changing day mode cannot relabel recorded progress",
  );
  state = applyAction(state, { type: "deleteHabit", id: "read" }, TODAY);
  entry = entriesForDate(state, TODAY, TODAY)[0];
  const access = entryAccess(entry, state, TODAY);
  assert.equal(access.edit, false);
  assert.equal(access.reschedule, false);
  assert.equal(
    access.record,
    true,
    "history remains correctable after archive",
  );
  assert.equal(access.note, true);
  assert.equal(
    entryStatus(entriesForDate(seeded(), "2026-10-13", TODAY)[0], TODAY),
    "Missed",
  );
});

const draft: HabitDraft = {
  name: "Read",
  goalType: "duration",
  amount: "15",
  unit: "pages",
  repeat: "daily",
  days: [1],
  weeklyGoal: "3",
  schedule: "time",
  time: "09:00",
  busyEnabled: true,
  busyAmount: "5",
  startDate: TODAY,
};
test("form errors identify invalid visible and collapsed fields without changing draft values", () => {
  assert.deepEqual(validateHabitDraft(draft), {});
  assert.deepEqual(
    Object.keys(
      validateHabitDraft({
        ...draft,
        name: "",
        amount: "0",
        busyAmount: "20",
        repeat: "days",
        days: [],
      }),
    ),
    ["name", "amount", "repeat", "busyAmount"],
  );
  assert.ok(
    validateHabitDraft({ ...draft, goalType: "count", amount: "1.5" }).amount,
  );
  assert.ok(validateHabitDraft({ ...draft, goalType: "count", unit: "" }).unit);
  assert.ok(
    validateHabitDraft({ ...draft, repeat: "weekly", weeklyGoal: "8" }).repeat,
  );
  assert.deepEqual(
    validateHabitDraft({
      ...draft,
      schedule: "anytime",
      time: "",
      busyEnabled: false,
      busyAmount: "",
      goalType: "boolean",
      amount: "",
    }),
    {},
  );
  assert.deepEqual(draft.days, [1]);
  assert.equal(draft.busyAmount, "5");
});
