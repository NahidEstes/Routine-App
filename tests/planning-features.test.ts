import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { applyAction } from "../src/domain/actions";
import { achievements, baselineAchievements } from "../src/domain/achievements";
import {
  createBackup,
  parseBackup,
  prepareRestore,
} from "../src/domain/backup";
import {
  defaultFeatures,
  isPaused,
  matchesHabit,
  sortHabits,
} from "../src/domain/organization";
import {
  bestStreak,
  completion,
  periodWeeklyPlans,
  weeklyStreak,
} from "../src/domain/progress";
import {
  emptyState,
  entriesForDate,
  materialize,
  weeklyPlan,
} from "../src/domain/schedule";
import {
  reminderPlan,
  snoozeReminder,
  reminderForEntry,
} from "../src/domain/reminders";
import { reviewPromptWeek } from "../src/domain/weeklyReview";
import { TrackerRepository } from "../src/storage/repository";
import { migrations } from "../src/storage/migrations";
import type { Database } from "../src/storage/database";
import type { TrackerState } from "../src/models/types";
import { addDays, datesBetween } from "../src/utils/dates";
import { habit, mark, seeded, TODAY } from "./fixtures";

function pause(
  state: TrackerState,
  start = TODAY,
  end = "2026-10-16",
  id = "pause-1",
  today = TODAY,
) {
  return applyAction(
    state,
    {
      type: "pauseHabits",
      pause: { id, start, end, reason: "Rest", habitIds: ["read"] },
    },
    today,
  );
}
test("pause dates are inclusive, resume automatically, and do not create missed obligations", () => {
  let s = mark(seeded(), "2026-10-12");
  s = mark(s, "2026-10-13");
  s = pause(s);
  assert.equal(entriesForDate(s, TODAY, "2026-10-17").length, 0);
  assert.equal(entriesForDate(s, "2026-10-16", "2026-10-17").length, 0);
  assert.equal(entriesForDate(s, "2026-10-17", "2026-10-17").length, 1);
  assert.equal(
    completion(s, datesBetween("2026-10-12", "2026-10-16"), "2026-10-17").total,
    2,
  );
  assert.equal(bestStreak(s, "2026-10-16"), 2);
  s = mark(s, "2026-10-17", "done", false, "2026-10-17");
  assert.equal(bestStreak(s, "2026-10-17"), 3);
  assert.equal(bestStreak(s, "2026-10-19"), 3);
  assert.equal(materialize(s, "2026-10-19").features.pauses.length, 1);
});
test("pause preserves completed, partial and noted history while excluding paused dates from daily metrics", () => {
  let s = applyAction(
    seeded(),
    {
      type: "amount",
      habitId: "read",
      id: `read:${TODAY}`,
      date: TODAY,
      amount: 5,
      busy: false,
    },
    TODAY,
  );
  s = pause(s);
  assert.equal(entriesForDate(s, TODAY, TODAY)[0].amount, 5);
  assert.equal(
    entriesForDate(s, TODAY, "2026-10-19")[0].displayStatus,
    "pending",
  );
  assert.equal(completion(s, [TODAY], TODAY).total, 0);
  assert.throws(() => mark(s, TODAY), /paused/);
  const completed = pause(mark(seeded(), TODAY));
  assert.equal(entriesForDate(completed, TODAY, TODAY)[0].status, "done");
  assert.equal(bestStreak(completed, TODAY), 0);
  assert.equal(achievements(completed, TODAY)[0].current, 1);
});
test("overlap is a union; resume early retains elapsed neutrality and leaves other pauses intact", () => {
  let s = pause(seeded());
  s = pause(s, "2026-10-15", "2026-10-18", "pause-2");
  s = applyAction(s, { type: "resumePause", id: "pause-1" }, "2026-10-16");
  assert.equal(s.features.pauses[0].end, "2026-10-15");
  assert.equal(isPaused(s, "read", "2026-10-14"), true);
  assert.equal(isPaused(s, "read", "2026-10-16"), true);
  s = applyAction(s, { type: "resumePause", id: "pause-2" }, "2026-10-16");
  assert.equal(isPaused(s, "read", "2026-10-16"), false);
  const cancelled = applyAction(
    pause(seeded(), "2026-10-18", "2026-10-19"),
    { type: "resumePause", id: "pause-1" },
    TODAY,
  );
  assert.equal(cancelled.features.pauses.length, 0);
});
test("pause rejects historical starts, invalid ranges, inactive and unknown habits", () => {
  assert.throws(() => pause(seeded(), "2026-10-13"), /valid pause/);
  assert.throws(
    () => pause(seeded(), "2026-10-19", "2026-10-18"),
    /valid pause/,
  );
  assert.throws(() => pause(emptyState()), /valid pause/);
  assert.throws(
    () =>
      pause(applyAction(seeded(), { type: "deleteHabit", id: "read" }, TODAY)),
    /valid pause/,
  );
});
test("pause follows the actual date of rescheduled occurrences and blocks moving into a pause", () => {
  const moved = applyAction(
    seeded(),
    {
      type: "reschedule",
      id: `read:${TODAY}`,
      habitId: "read",
      sourceDate: TODAY,
      date: "2026-10-18",
      time: "10:00",
      scope: "once",
    },
    TODAY,
  );
  const s = pause(moved, "2026-10-18", "2026-10-18");
  assert.equal(entriesForDate(s, "2026-10-18", TODAY).length, 0);
  assert.throws(
    () =>
      applyAction(
        pause(seeded(), "2026-10-18", "2026-10-18"),
        {
          type: "reschedule",
          id: `read:${TODAY}`,
          habitId: "read",
          sourceDate: TODAY,
          date: "2026-10-18",
          time: "10:00",
          scope: "once",
        },
        TODAY,
      ),
    /paused/,
  );
});
test("weekly targets scale proportionally without compounding or losing the original commitment", () => {
  const base = seeded({
    repeat: { type: "weekly", target: 3, days: [0, 1, 2, 3, 4, 5, 6] },
  });
  const s = pause(base, "2026-10-14", "2026-10-17");
  assert.equal(weeklyPlan(s, "read", "2026-10-12")!.target, 2);
  assert.equal(
    weeklyPlan(materialize(s, "2026-10-19"), "read", "2026-10-12")!.target,
    2,
  );
  assert.equal(s.weeklyPlans[0].target, 3);
  const resumed = applyAction(s, { type: "resumePause", id: "pause-1" }, TODAY);
  assert.equal(weeklyPlan(resumed, "read", "2026-10-12")!.target, 3);
});
test("fully paused weekly targets are neutral; existing credits are never discarded", () => {
  const base = seeded({
    repeat: { type: "weekly", target: 3, days: [0, 1, 2, 3, 4, 5, 6] },
  });
  let s = pause(base, "2026-10-19", "2026-10-25");
  s = materialize(s, "2026-10-26");
  const p = periodWeeklyPlans(s, ["2026-10-19"], "2026-10-26")[0];
  assert.equal(p.target, 0);
  assert.equal(p.done, 0);
  assert.equal(weeklyStreak(s, "read", "2026-10-26"), 0);
  const recorded = pause(
    mark(mark(base, "2026-10-12"), "2026-10-13"),
    TODAY,
    "2026-10-18",
  );
  assert.equal(weeklyPlan(recorded, "read", "2026-10-12")!.target, 2);
  assert.equal(
    recorded.occurrences.filter((e) => e.status === "done").length,
    2,
  );
  const wholeWeek = materialize(
    pause(
      mark(base, "2026-10-12"),
      "2026-10-12",
      "2026-10-18",
      "full",
      "2026-10-12",
    ),
    "2026-10-19",
  );
  assert.equal(weeklyPlan(wholeWeek, "read", "2026-10-12")!.target, 1);
  assert.equal(weeklyStreak(wholeWeek, "read", "2026-10-19"), 0);
});
test("pause removes native reminders and snoozes, including partially recorded tasks", () => {
  const now = new Date(`${TODAY}T07:00:00`).getTime();
  const prefs = { read: { enabled: true, time: null } };
  const base = seeded();
  const original = reminderForEntry(
    entriesForDate(base, TODAY, TODAY)[0],
    prefs.read,
  )!;
  const s = pause(base);
  const plan = reminderPlan(s, prefs, now);
  assert.equal(
    plan.some((p) => p.date <= "2026-10-16"),
    false,
  );
  assert.equal(plan[0].date, "2026-10-17");
  assert.equal(snoozeReminder(s, prefs, original, now), null);
});
test("pins precede priority, time or custom ordering with stable fallback and persisted filters", () => {
  let s = applyAction(
    seeded(),
    {
      type: "saveHabit",
      habit: habit({ id: "walk", name: "Walk", time: "09:00" }),
    },
    TODAY,
  );
  s = applyAction(
    s,
    { type: "organizeHabit", habitId: "walk", priority: "high", pinned: false },
    TODAY,
  );
  s = applyAction(
    s,
    { type: "habitFilters", value: { sort: "priority" } },
    TODAY,
  );
  const sorted = () =>
    sortHabits(
      s,
      s.habits,
      (h) => h.id,
      (h) => h.time,
    ).map((h) => h.id);
  assert.deepEqual(sorted(), ["walk", "read"]);
  s = applyAction(
    s,
    { type: "organizeHabit", habitId: "read", priority: "low", pinned: true },
    TODAY,
  );
  assert.deepEqual(sorted(), ["read", "walk"]);
  s = applyAction(
    s,
    {
      type: "habitFilters",
      value: { search: "WALK", priorityFilter: "high", typeFilter: "duration" },
    },
    TODAY,
  );
  assert.deepEqual(
    s.habits.filter((h) => matchesHabit(s, h)).map((h) => h.id),
    ["walk"],
  );
  s = applyAction(
    s,
    { type: "moveHabit", habitId: "walk", direction: -1 },
    TODAY,
  );
  assert.deepEqual(s.features.order, ["walk", "read"]);
  assert.equal(s.features.sort, "custom");
  assert.deepEqual(sorted(), ["read", "walk"]);
  assert.deepEqual(
    parseBackup(JSON.stringify(createBackup(s))).data.features,
    s.features,
  );
});
test("achievement thresholds use unique completed records, exclude partial/future/excluded records and support Undo", () => {
  let s = seeded({ createdAt: "2026-09-01" });
  s = applyAction(
    s,
    {
      type: "amount",
      id: `read:${TODAY}`,
      habitId: "read",
      date: TODAY,
      amount: 1,
      busy: false,
    },
    TODAY,
  );
  assert.equal(achievements(s, TODAY)[0].earned, false);
  for (const day of datesBetween("2026-09-01", "2026-10-14")) s = mark(s, day);
  assert.equal(achievements(s, TODAY).filter((a) => a.earned).length, 4);
  s = mark(s, TODAY);
  assert.equal(achievements(s, TODAY)[0].current, 44);
  for (const day of datesBetween("2026-09-01", "2026-09-18"))
    s = mark(s, day, "pending");
  assert.equal(
    achievements(s, TODAY).find((a) => a.id === "thirty")!.earned,
    false,
  );
  const baseline = baselineAchievements(mark(seeded(), TODAY), TODAY);
  assert.deepEqual(baseline.features.seenAchievements, ["first"]);
  const undone = mark(baseline, TODAY, "pending");
  assert.equal(achievements(undone, TODAY)[0].earned, false);
  assert.deepEqual(undone.features.seenAchievements, ["first"]);
});
test("weekly reviews are unique per Monday week, drafts editable and finished answers validated", () => {
  const review = {
    week: "2026-10-12",
    wentWell: "Read",
    obstacles: "Busy",
    change: "Earlier",
    completed: false,
    updatedAt: "2026-10-14T12:00:00.000Z",
  };
  let s = applyAction(seeded(), { type: "saveReview", review }, TODAY);
  s = applyAction(
    s,
    {
      type: "saveReview",
      review: { ...review, completed: true, change: "Lower target" },
    },
    TODAY,
  );
  assert.equal(s.features.reviews.length, 1);
  assert.equal(s.features.reviews[0].change, "Lower target");
  assert.deepEqual(s.habits, seeded().habits);
  assert.throws(
    () =>
      applyAction(
        s,
        { type: "saveReview", review: { ...review, week: "2026-10-13" } },
        TODAY,
      ),
    /current or past week/,
  );
  assert.throws(
    () =>
      applyAction(
        s,
        {
          type: "saveReview",
          review: { ...review, completed: true, obstacles: "" },
        },
        TODAY,
      ),
    /all three/,
  );
  assert.equal(reviewPromptWeek(s, "2026-10-19"), null);
  const unreviewed = seeded();
  assert.equal(reviewPromptWeek(unreviewed, "2026-10-19"), "2026-10-12");
  assert.equal(
    reviewPromptWeek(
      applyAction(
        unreviewed,
        { type: "dismissReview", week: "2026-10-12" },
        TODAY,
      ),
      "2026-10-19",
    ),
    null,
  );
});
test("linked routines and delayed focus timers cannot credit a paused day", () => {
  let s = seeded();
  s = applyAction(
    s,
    {
      type: "saveRoutine",
      routine: {
        id: "routine",
        name: "Morning",
        subtitle: "",
        time: "08:00",
        days: [3],
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
    { type: "startRoutine", id: "routine", date: TODAY, busy: false },
    TODAY,
  );
  s = pause(s);
  assert.throws(
    () =>
      applyAction(
        s,
        { type: "completeStep", sessionId: s.sessions[0].id, stepId: "step" },
        TODAY,
      ),
    /paused/,
  );
  assert.throws(
    () =>
      applyAction(
        s,
        {
          type: "timerAmount",
          id: `read:${TODAY}`,
          habitId: "read",
          date: TODAY,
          delta: 15,
          busy: false,
          sessionId: "late-timer",
        },
        TODAY,
      ),
    /paused/,
  );
});
test("50-completion milestones ignore future and excluded records and use all retained history", () => {
  let s = seeded({ createdAt: "2026-08-01" });
  for (const day of datesBetween("2026-08-01", "2026-09-19")) s = mark(s, day);
  assert.equal(
    achievements(s, TODAY).find((a) => a.id === "fifty")!.earned,
    true,
  );
  s = {
    ...s,
    occurrences: s.occurrences.map((e) =>
      e.date === "2026-08-01" ? { ...e, excluded: true } : e,
    ),
  };
  const firstDone = s.occurrences.find(
    (e) => e.status === "done" && !e.excluded,
  )!;
  s.occurrences.push({
    ...firstDone,
    id: "read:2026-12-01",
    sourceDate: "2026-12-01",
    date: "2026-12-01",
  });
  assert.equal(achievements(s, TODAY)[0].current, 49);
  assert.equal(
    achievements(s, TODAY).find((a) => a.id === "fifty")!.earned,
    false,
  );
});
test("format 1 backups load feature defaults; format 2 validates references and keeps every feature", () => {
  const b = JSON.parse(JSON.stringify(createBackup(seeded())));
  b.formatVersion = 1;
  delete b.data.features;
  assert.deepEqual(
    parseBackup(JSON.stringify(b)).data.features,
    defaultFeatures(),
  );
  assert.equal(parseBackup(JSON.stringify(b)).formatVersion, 2);
  b.formatVersion = 2;
  assert.throws(() => parseBackup(JSON.stringify(b)), /missing feature/);
  let s = pause(seeded());
  s = applyAction(
    s,
    {
      type: "saveReview",
      review: {
        week: "2026-10-12",
        wentWell: "",
        obstacles: "",
        change: "",
        completed: false,
        updatedAt: "2026-10-14T12:00:00.000Z",
      },
    },
    TODAY,
  );
  const backup = createBackup(s);
  assert.deepEqual(prepareRestore(backup, TODAY).data.features, s.features);
  const invalid = JSON.parse(JSON.stringify(backup));
  invalid.data.features.pauses[0].habitIds = ["missing"];
  assert.throws(() => parseBackup(JSON.stringify(invalid)), /relationship/);
  invalid.data.features = {
    ...backup.data.features,
    reviews: [...backup.data.features.reviews, ...backup.data.features.reviews],
  };
  assert.throws(() => parseBackup(JSON.stringify(invalid)), /duplicate review/);
});
function adapter(db: DatabaseSync): Database {
  const result: Database = {
    execAsync: async (sql) => {
      db.exec(sql);
    },
    runAsync: async (sql, ...params) => db.prepare(sql).run(...params),
    getAllAsync: async <T>(
      sql: string,
      ...params: (string | number | null)[]
    ) => db.prepare(sql).all(...params) as T[],
    transaction: async (task) => {
      db.exec("BEGIN IMMEDIATE");
      try {
        await task(result);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return result;
}
test("v4 migration and SQLite reload retain all existing records and new features atomically", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    migrations.slice(0, 4).forEach((sql) => db.exec(sql));
    db.exec("PRAGMA user_version=4");
    const repo = new TrackerRepository(adapter(db));
    const s = mark(seeded(), "2026-10-12");
    await repo.save(s);
    db.exec("DELETE FROM settings WHERE id='habitFeatures'");
    await repo.initialize();
    await repo.initialize();
    const normalized = (state: TrackerState) =>
      JSON.parse(
        JSON.stringify({
          ...state,
          occurrences: [...state.occurrences].sort((a, b) =>
            a.id.localeCompare(b.id),
          ),
        }),
      );
    assert.deepEqual(await repo.load(), normalized(s));
    let next = pause(s);
    next = applyAction(
      next,
      {
        type: "organizeHabit",
        habitId: "read",
        pinned: true,
        priority: "high",
      },
      TODAY,
    );
    next = applyAction(
      next,
      {
        type: "saveReview",
        review: {
          week: "2026-10-12",
          wentWell: "Good",
          obstacles: "Busy",
          change: "Earlier",
          completed: true,
          updatedAt: "2026-10-14T12:00:00.000Z",
        },
      },
      TODAY,
    );
    await repo.save(next);
    assert.deepEqual(await repo.load(), normalized(next));
    db.exec(
      "CREATE TRIGGER reject_features BEFORE INSERT ON settings WHEN NEW.id='habitFeatures' BEGIN SELECT RAISE(ABORT, 'Features failed'); END;",
    );
    await assert.rejects(repo.save(s), /Features failed/);
    assert.deepEqual(await repo.load(), normalized(next));
    db.exec("DROP TRIGGER reject_features");
    await repo.restore(createBackup(next));
    assert.deepEqual((await repo.load()).features, next.features);
  } finally {
    db.close();
  }
});
test("timer receipt, completion and achievement acknowledgement commit in one transaction", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    const repo = new TrackerRepository(adapter(db));
    await repo.initialize();
    const s = seeded();
    await repo.save(s);
    const action = {
      type: "timerAmount" as const,
      id: `read:${TODAY}`,
      habitId: "read",
      date: TODAY,
      delta: 15,
      busy: false,
      sessionId: "achievement-timer",
    };
    db.exec(
      "CREATE TRIGGER reject_features BEFORE INSERT ON settings WHEN NEW.id='habitFeatures' BEGIN SELECT RAISE(ABORT, 'Features failed'); END;",
    );
    await assert.rejects(repo.recordTimer(s, action, TODAY), /Features failed/);
    assert.equal(await repo.hasTimerReceipt(action.sessionId), false);
    assert.deepEqual((await repo.load()).features.seenAchievements, []);
    assert.equal(
      (await repo.load()).occurrences.find((e) => e.id === action.id)!.amount,
      0,
    );
    db.exec("DROP TRIGGER reject_features");
    await repo.recordTimer(s, action, TODAY);
    const loaded = await repo.load();
    assert.deepEqual(loaded.features.seenAchievements, ["first"]);
    assert.equal(
      (await repo.recordTimer(loaded, action, TODAY)).occurrences.find(
        (e) => e.id === action.id,
      )!.amount,
      15,
    );
  } finally {
    db.close();
  }
});
