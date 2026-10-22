import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { habit, seeded, TODAY, mark } from "./fixtures";
import { applyAction } from "../src/domain/actions";
import { entriesForDate } from "../src/domain/schedule";
import { previousProgressAction } from "../src/presentation/habits";
import {
  habitFromTemplate,
  habitTemplates,
} from "../src/domain/habitTemplates";
import {
  elapsedTime,
  pauseTimer,
  resumeTimer,
  type FocusSession,
} from "../src/domain/focusTimer";
import {
  reminderDiff,
  reminderForEntry,
  reminderPlan,
  snoozeReminder,
} from "../src/domain/reminders";
import { progressInsights } from "../src/domain/progressInsights";
import { TrackerRepository } from "../src/storage/repository";
import { migrations } from "../src/storage/migrations";
import type { Database } from "../src/storage/database";
import { dateKey, weekDates } from "../src/utils/dates";

test("starter templates produce fresh editable drafts with no shared goals or repeat arrays", () => {
  for (const template of habitTemplates) {
    const first = habitFromTemplate(template.id, TODAY)!;
    const second = habitFromTemplate(template.id, TODAY)!;
    assert.notEqual(first.id, second.id);
    first.goal.value = 999;
    first.repeat.days.length = 0;
    assert.equal(second.goal.value, template.goal.value);
    assert.equal(second.repeat.days.length, 7);
    assert.equal(second.createdAt, TODAY);
  }
  assert.equal(habitFromTemplate("unknown", TODAY), undefined);
});

test("quick count actions increment the latest amount, retain a recorded busy goal and support exact Undo", () => {
  let state = seeded({
    goal: { type: "count", value: 8, unit: "glasses" },
    busyGoal: 3,
  });
  const action = {
    type: "increment" as const,
    id: `read:${TODAY}`,
    habitId: "read",
    date: TODAY,
    delta: 1,
    busy: true,
  };
  state = applyAction(state, action, TODAY);
  const before = entriesForDate(state, TODAY, TODAY)[0];
  state = applyAction(state, { ...action, busy: false }, TODAY);
  const after = entriesForDate(state, TODAY, TODAY)[0];
  assert.equal(after.amount, 2);
  assert.equal(after.target, 3);
  assert.equal(after.busy, true);
  state = applyAction(state, previousProgressAction(before), TODAY);
  assert.equal(entriesForDate(state, TODAY, TODAY)[0].amount, 1);
  state = applyAction(applyAction(state, action, TODAY), action, TODAY);
  assert.equal(entriesForDate(state, TODAY, TODAY)[0].status, "done");
  assert.throws(() => applyAction(state, action, TODAY), /already completed/);
});

test("new quick actions reject future, stale rescheduled, non-count and invalid increments", () => {
  const state = seeded({
    goal: { type: "count", value: 8, unit: "glasses" },
    busyGoal: null,
  });
  const action = {
    type: "increment" as const,
    id: `read:${TODAY}`,
    habitId: "read",
    date: TODAY,
    delta: 1,
    busy: false,
  };
  assert.throws(
    () =>
      applyAction(
        state,
        { ...action, date: "2026-10-15", id: "read:2026-10-15" },
        TODAY,
      ),
    /today or a past/,
  );
  assert.throws(
    () => applyAction(state, { ...action, delta: 0.5 }, TODAY),
    /whole number/,
  );
  assert.throws(() => applyAction(seeded(), action, TODAY), /count habit/);
  const moved = applyAction(
    state,
    {
      type: "reschedule",
      id: action.id,
      habitId: "read",
      sourceDate: TODAY,
      date: "2026-10-15",
      time: "10:00",
      scope: "once",
    },
    TODAY,
  );
  assert.throws(() => applyAction(moved, action, TODAY), /changed|scheduled/);
});

test("focus timer counts background time, excludes paused time and survives JSON rehydration", () => {
  const start = Date.parse("2026-10-14T08:00:00Z");
  let session: FocusSession = {
    id: "focus-1",
    entryId: `read:${TODAY}`,
    habitId: "read",
    date: TODAY,
    name: "Read",
    elapsedMs: 0,
    runningSince: start,
    busy: false,
  };
  assert.equal(elapsedTime(session, start + 30 * 60_000), 30 * 60_000);
  session = pauseTimer(session, start + 30 * 60_000);
  session = JSON.parse(JSON.stringify(session));
  assert.equal(elapsedTime(session, start + 90 * 60_000), 30 * 60_000);
  session = resumeTimer(session, start + 90 * 60_000);
  assert.equal(elapsedTime(session, start + 95 * 60_000), 35 * 60_000);
  assert.equal(elapsedTime(session, start + 80 * 60_000), 30 * 60_000);
  assert.equal(resumeTimer(session, start + 100 * 60_000), session);
});

function adapter(getDb: () => DatabaseSync): Database {
  const result: Database = {
    execAsync: async (sql) => {
      getDb().exec(sql);
    },
    runAsync: async (sql, ...params) =>
      getDb()
        .prepare(sql)
        .run(...params),
    getAllAsync: async <T>(
      sql: string,
      ...params: (string | number | null)[]
    ) =>
      getDb()
        .prepare(sql)
        .all(...params) as T[],
    transaction: async (task) => {
      getDb().exec("BEGIN IMMEDIATE");
      try {
        await task(result);
        getDb().exec("COMMIT");
      } catch (e) {
        getDb().exec("ROLLBACK");
        throw e;
      }
    },
  };
  return result;
}

test("timer receipt and progress commit atomically; reopen or retry cannot credit the same session twice", async () => {
  const directory = mkdtempSync(join(tmpdir(), "routine-usability-"));
  const path = join(directory, "timer.db");
  let db = new DatabaseSync(path);
  const repository = new TrackerRepository(adapter(() => db));
  try {
    await repository.initialize();
    const state = seeded();
    await repository.save(state);
    const action = {
      type: "timerAmount" as const,
      id: `read:${TODAY}`,
      habitId: "read",
      date: TODAY,
      delta: 4.5,
      busy: false,
      sessionId: "session-1",
    };
    db.exec(
      "CREATE TRIGGER reject_receipt BEFORE INSERT ON timer_receipts BEGIN SELECT RAISE(ABORT, 'Receipt failed'); END;",
    );
    await assert.rejects(
      repository.recordTimer(state, action, TODAY),
      /Receipt failed/,
    );
    assert.equal(
      (await repository.load()).occurrences.find((e) => e.id === action.id)!
        .amount,
      0,
    );
    assert.equal(await repository.hasTimerReceipt(action.sessionId), false);
    db.exec("DROP TRIGGER reject_receipt");
    await repository.recordTimer(state, action, TODAY);
    db.close();
    db = new DatabaseSync(path);
    const loaded = await repository.load();
    const replayed = await repository.recordTimer(
      loaded,
      { ...action, delta: 9 },
      TODAY,
    );
    assert.equal(
      replayed.occurrences.find((e) => e.id === action.id)!.amount,
      4.5,
    );
    const undone = applyAction(
      replayed,
      {
        type: "amount",
        id: action.id,
        habitId: "read",
        date: TODAY,
        amount: 0,
        busy: false,
      },
      TODAY,
    );
    await repository.save(undone);
    assert.equal(
      (await repository.recordTimer(undone, action, TODAY)).occurrences.find(
        (e) => e.id === action.id,
      )!.amount,
      0,
    );
  } finally {
    db.close();
    assert.ok(directory.startsWith(join(tmpdir(), "routine-usability-")));
    rmSync(directory, { recursive: true, force: true });
  }
});

test("v3 to v4 adds timer receipts without changing any existing habit snapshot", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    for (const sql of migrations.slice(0, 3)) db.exec(sql);
    db.exec("PRAGMA user_version=3");
    const repo = new TrackerRepository(adapter(() => db));
    await repo.save(seeded());
    const before = await repo.load();
    await repo.initialize();
    assert.deepEqual(await repo.load(), before);
    assert.equal(await repo.hasTimerReceipt("none"), false);
  } finally {
    db.close();
  }
});

test("reminders are opt-in, remove completed and archived tasks, and reconcile without duplicates", () => {
  const now = new Date(`${TODAY}T07:00:00`).getTime();
  const state = seeded();
  const prefs = { read: { enabled: true, time: null } };
  assert.equal(reminderPlan(state, {}, now).length, 0);
  const desired = reminderPlan(state, prefs, now);
  assert.equal(desired[0].date, TODAY);
  assert.equal(
    reminderPlan(mark(state, TODAY), prefs, now).some(
      (item) => item.date === TODAY,
    ),
    false,
  );
  assert.equal(
    reminderPlan(
      applyAction(state, { type: "deleteHabit", id: "read" }, TODAY),
      prefs,
      now,
    ).length,
    0,
  );
  const scheduled = desired.map((item) => ({
    id: item.id,
    signature: item.signature,
  }));
  assert.deepEqual(reminderDiff(desired, scheduled), {
    cancel: [],
    schedule: [],
  });
  const disabled = reminderDiff([], scheduled);
  assert.equal(disabled.cancel.length, desired.length);
  assert.equal(new Set(desired.map((item) => item.id)).size, desired.length);
});

test("rescheduling moves the one-off notification; fixed reminder times and past snooze signatures remain valid", () => {
  const now = new Date(`${TODAY}T07:00:00`).getTime();
  const state = seeded();
  const prefs = { read: { enabled: true, time: null } };
  const original = reminderPlan(state, prefs, now);
  const moved = applyAction(
    state,
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
  const desired = reminderPlan(moved, prefs, now);
  assert.equal(
    desired.some((item) => item.date === TODAY),
    false,
  );
  const notification = desired.find(
    (item) => item.entryId === `read:${TODAY}`,
  )!;
  assert.equal(new Date(notification.fireAt).getHours(), 18);
  assert.equal(
    reminderDiff(
      desired,
      original.map((item) => ({ id: item.id, signature: item.signature })),
    ).cancel.includes(original[0].id),
    true,
  );
  const custom = reminderPlan(
    moved,
    { read: { enabled: true, time: "09:30" } },
    now,
  ).find((item) => item.entryId === `read:${TODAY}`)!;
  assert.equal(new Date(custom.fireAt).getHours(), 9);
  const entry = entriesForDate(state, TODAY, TODAY)[0];
  assert.equal(
    reminderForEntry(entry, prefs.read)!.signature,
    original[0].signature,
  );
  assert.equal(
    reminderDiff(
      [],
      [
        {
          id: "routine.snooze.test",
          signature: original[0].signature,
          snoozed: true,
        },
      ],
    ).cancel.length,
    0,
  );
});

test("reminder scheduling respects chosen weekdays, bounds the queue and uses local calendar times across DST", () => {
  let state = seeded({ repeat: { type: "days", days: [1, 3], target: 2 } });
  const now = new Date(`${TODAY}T07:00:00`).getTime();
  assert.ok(
    reminderPlan(state, { read: { enabled: true, time: null } }, now).every(
      (item) => [1, 3].includes(new Date(item.fireAt).getDay()),
    ),
  );
  for (let index = 0; index < 4; index++)
    state = applyAction(
      state,
      { type: "saveHabit", habit: habit({ id: `many-${index}` }) },
      TODAY,
    );
  const preferences = Object.fromEntries(
    state.habits.map((h) => [h.id, { enabled: true, time: null }]),
  );
  assert.equal(reminderPlan(state, preferences, now).length, 60);
  const previousTz = process.env.TZ;
  try {
    process.env.TZ = "America/New_York";
    const localDate = "2026-10-31";
    const fall = applyAction(
      state,
      {
        type: "saveHabit",
        habit: habit({ id: "dst", time: "09:00", createdAt: localDate }),
      },
      localDate,
    );
    const plan = reminderPlan(
      fall,
      { dst: { enabled: true, time: null } },
      new Date(`${localDate}T07:00:00`).getTime(),
    );
    assert.ok(plan.every((item) => new Date(item.fireAt).getHours() === 9));
    assert.equal(
      plan.find((item) => item.date === "2026-11-01")!.fireAt -
        plan.find((item) => item.date === localDate)!.fireAt,
      25 * 60 * 60_000,
    );
  } finally {
    if (previousTz === undefined) delete process.env.TZ;
    else process.env.TZ = previousTz;
  }
});

test("snooze replaces the same identifier, crosses midnight and rejects stale or disabled notifications", () => {
  const state = seeded({ time: "23:55" });
  const preferences = { read: { enabled: true, time: null } };
  const now = new Date(`${TODAY}T23:56:00`).getTime();
  const item = entriesForDate(state, TODAY, TODAY)[0];
  const planned = reminderForEntry(item, preferences.read)!;
  const data = {
    entryId: item.id,
    habitId: item.habitId,
    date: TODAY,
    signature: planned.signature,
  };
  const first = snoozeReminder(state, preferences, data, now)!;
  assert.equal(first.fireAt, now + 600_000);
  assert.equal(dateKey(new Date(first.fireAt)), "2026-10-15");
  const second = snoozeReminder(state, preferences, data, now + 60_000)!;
  assert.equal(second.id, first.id);
  assert.notEqual(second.fireAt, first.fireAt);
  assert.equal(
    snoozeReminder(state, { read: { enabled: false, time: null } }, data, now),
    null,
  );
  assert.equal(
    snoozeReminder(mark(state, TODAY), preferences, data, now),
    null,
  );
  assert.equal(
    snoozeReminder(
      state,
      preferences,
      { ...data, signature: "old schedule" },
      now,
    ),
    null,
  );
  assert.equal(
    snoozeReminder(state, preferences, data, now + 2 * 86_400_000),
    null,
  );
});

test("progress insights use comparable elapsed days, exclude weekly goals from daily rankings, and explain insufficient data", () => {
  let state = seeded();
  const week = weekDates(TODAY).filter((date) => date <= TODAY);
  assert.equal(progressInsights(state, week, "week", TODAY).comparable, false);
  assert.equal(
    progressInsights(state, week, "week", TODAY).mostConsistent,
    null,
  );
  state = mark(mark(state, "2026-10-12"), "2026-10-13");
  assert.equal(
    progressInsights(state, week, "week", TODAY).mostConsistent?.done,
    2,
  );
  const insight = progressInsights(state, week, "week", TODAY);
  assert.equal(insight.comparisonDays, 3);
  const future = progressInsights(state, ["2026-10-20"], "week", TODAY);
  assert.equal(future.current.total, 0);
  const month = progressInsights(
    state,
    Array.from({ length: 31 }, (_, i) => dateKey(new Date(2026, 9, i + 1))),
    "month",
    "2026-10-31",
  );
  assert.equal(month.comparisonDays, 30);
});
