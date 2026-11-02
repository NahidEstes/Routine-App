import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { habit, mark, seeded, TODAY } from "./fixtures";
import { applyAction } from "../src/domain/actions";
import {
  challengeProgress,
  nextChallengeDraft,
} from "../src/domain/challenges";
import { achievements, baselineAchievements } from "../src/domain/achievements";
import { createBackup, parseBackup } from "../src/domain/backup";
import { entriesForDate } from "../src/domain/schedule";
import { actionFromWidget, widgetModel } from "../src/domain/widget";
import { isDarkMode, parseColorMode } from "../src/domain/colorMode";
import type { HabitChallenge } from "../src/models/types";
import { TrackerChannel } from "../src/storage/trackerChannel";
import { TrackerRepository } from "../src/storage/repository";
import type { Database } from "../src/storage/database";
import { addDays } from "../src/utils/dates";

const challenge = (
  overrides: Partial<HabitChallenge> = {},
): HabitChallenge => ({
  id: "challenge",
  name: "Read four days",
  habitId: "read",
  habitName: "Read",
  start: TODAY,
  end: "2026-10-20",
  target: 4,
  ...overrides,
});
function withChallenge(c = challenge()) {
  return applyAction(seeded(), { type: "saveChallenge", challenge: c }, TODAY);
}
const badge = (s: ReturnType<typeof seeded>, id: string, date = TODAY) =>
  achievements(s, date).find((a) => a.id === id)!;
test("challenge uses unique retained days: Busy counts, partial/skip/excluded/future do not; Undo corrects the result", () => {
  const c = challenge({ target: 1 });
  let s = withChallenge(c);
  assert.equal(challengeProgress(s, c, TODAY).current, 0);
  s = mark(s, TODAY, "done", true);
  const saved = s.occurrences.find((e) => e.date === TODAY)!;
  s.occurrences.push(
    { ...saved, id: "duplicate" },
    { ...saved, id: "excluded", excluded: true, date: "2026-10-15" },
    { ...saved, id: "future", date: "2026-10-16" },
  );
  assert.equal(challengeProgress(s, c, TODAY).current, 1);
  assert.equal(challengeProgress(s, c, TODAY).completedOn, TODAY);
  s.occurrences = s.occurrences.filter(
    (e) => !["duplicate", "excluded", "future"].includes(e.id),
  );
  s = mark(s, TODAY, "pending");
  assert.equal(challengeProgress(s, c, TODAY).status, "active");
  s = mark(s, TODAY, "skipped");
  assert.equal(challengeProgress(s, c, TODAY).current, 0);
});
test("challenge boundaries, future state, end state and immutable started targets", () => {
  const c = challenge({ start: "2026-10-15", end: "2026-10-17", target: 2 });
  let s = withChallenge(c);
  assert.equal(challengeProgress(s, c, TODAY).status, "upcoming");
  assert.equal(challengeProgress(s, c, "2026-10-18").status, "ended");
  s = applyAction(
    s,
    { type: "saveChallenge", challenge: { ...c, target: 1 } },
    TODAY,
  );
  assert.equal(s.features.challenges![0].target, 1);
  assert.throws(
    () =>
      applyAction(
        s,
        { type: "saveChallenge", challenge: { ...c, target: 2 } },
        "2026-10-15",
      ),
    /started/,
  );
  assert.throws(() => withChallenge(challenge({ target: 8 })), /Target/);
  assert.throws(
    () => withChallenge(challenge({ start: "2026-10-13" })),
    /today/,
  );
  assert.throws(() => withChallenge(challenge({ end: "2027-10-20" })), /90/);
  assert.throws(
    () => withChallenge(challenge({ habitId: "missing" })),
    /active habit/,
  );
});
test("challenge counts rescheduled destination, respects period, and keeps history when archived", () => {
  const c = challenge({ start: "2026-10-15", end: "2026-10-15", target: 1 });
  let s = withChallenge(c);
  s = applyAction(
    s,
    {
      type: "reschedule",
      id: `read:${TODAY}`,
      habitId: "read",
      sourceDate: TODAY,
      date: "2026-10-15",
      time: "10:00",
      scope: "once",
    },
    TODAY,
  );
  s = applyAction(
    s,
    {
      type: "status",
      id: `read:${TODAY}`,
      habitId: "read",
      date: "2026-10-15",
      status: "done",
      busy: false,
    },
    "2026-10-15",
  );
  assert.equal(challengeProgress(s, c, "2026-10-15").current, 1);
  const before = JSON.stringify(s.occurrences);
  s = applyAction(
    s,
    { type: "archiveChallenge", id: c.id, archived: true },
    "2026-10-15",
  );
  assert.equal(JSON.stringify(s.occurrences), before);
  assert.equal(badge(s, "challenge", "2026-10-15").earned, true);
  assert.equal(challengeProgress(s, c, "2026-10-21").status, "completed");
});
test("weekly habit completions count once per local day in a challenge", () => {
  let s = seeded({ repeat: { type: "weekly", days: [], target: 3 } });
  const c = challenge({ target: 1 });
  s = applyAction(s, { type: "saveChallenge", challenge: c }, TODAY);
  s = mark(s, TODAY);
  assert.equal(challengeProgress(s, c, TODAY).current, 1);
  assert.equal(badge(s, "seven").earned, false);
  assert.throws(
    () =>
      applyAction(
        s,
        {
          type: "saveChallenge",
          challenge: challenge({
            id: "too-much",
            end: "2026-10-18",
            target: 4,
          }),
        },
        TODAY,
      ),
    /scheduled days/,
  );
});
test("Busy badge requires a reduced completed goal, and records the contributing habit/day", () => {
  const s = mark(seeded(), TODAY, "done", true);
  assert.equal(badge(s, "busy").earned, true);
  assert.equal(badge(s, "busy").earnedOn, TODAY);
  assert.equal(badge(s, "busy").evidence[0].habitId, "read");
  assert.equal(badge(mark(seeded(), TODAY), "busy").earned, false);
  assert.equal(badge(mark(s, TODAY, "pending"), "busy").earned, false);
});
test("comeback requires prior effort and two missed scheduled days; off-days and pauses do not qualify", () => {
  let s = seeded({ createdAt: "2026-10-10" });
  s = mark(s, "2026-10-10");
  s = mark(s, TODAY);
  assert.equal(badge(s, "comeback").earned, true);
  assert.equal(badge(s, "comeback").earnedOn, TODAY);
  const only = mark(seeded(), TODAY);
  assert.equal(badge(only, "comeback").earned, false);
  let off = seeded({
    createdAt: "2026-10-07",
    repeat: { type: "days", days: [3], target: 1 },
  });
  off = mark(off, "2026-10-07");
  off = mark(off, TODAY);
  assert.equal(badge(off, "comeback").earned, false);
  s.features.pauses = [
    {
      id: "pause",
      habitIds: ["read"],
      start: "2026-10-11",
      end: "2026-10-13",
      reason: "",
    },
  ];
  assert.equal(badge(s, "comeback").earned, false);
});
test("personal best compares separate runs, never the first streak, and survives a later break", () => {
  let s = seeded({ createdAt: "2026-10-01" });
  for (const d of ["2026-10-01", "2026-10-02", "2026-10-03"]) s = mark(s, d);
  assert.equal(badge(s, "personalBest").earned, false);
  for (const d of ["2026-10-05", "2026-10-06", "2026-10-07"]) s = mark(s, d);
  assert.equal(badge(s, "personalBest").earned, false);
  s = mark(s, "2026-10-08");
  assert.equal(badge(s, "personalBest").earnedOn, "2026-10-08");
  assert.equal(badge(s, "personalBest", "2026-10-21").earned, true);
});
test("streak badges preserve the original thresholds and evidence after a break", () => {
  let s = seeded({ createdAt: "2026-10-01" });
  for (let n = 0; n < 7; n++) s = mark(s, addDays("2026-10-01", n));
  assert.equal(badge(s, "seven").current, 7);
  assert.equal(badge(s, "seven").earnedOn, "2026-10-07");
  assert.equal(badge(s, "thirty").earned, false);
});
test("challenge wins are acknowledged with history, persist through Undo and cannot celebrate twice", () => {
  let s = mark(withChallenge(challenge({ target: 1 })), TODAY);
  s = baselineAchievements(s, TODAY);
  assert.deepEqual(s.features.seenChallengeWins, ["challenge"]);
  s = baselineAchievements(mark(mark(s, TODAY, "pending"), TODAY), TODAY);
  assert.deepEqual(s.features.seenChallengeWins, ["challenge"]);
  assert.ok(s.features.seenAchievements.includes("challenge"));
});
test("backup format 3 round trips challenges; legacy format 2 imports defaults without changing history", () => {
  const s = baselineAchievements(
    mark(withChallenge(challenge({ target: 1 })), TODAY),
    TODAY,
  );
  const exported = createBackup(s);
  assert.equal(exported.formatVersion, 3);
  assert.deepEqual(
    parseBackup(JSON.stringify(exported)).data,
    JSON.parse(JSON.stringify(s)),
  );
  const legacy = JSON.parse(JSON.stringify(exported));
  legacy.formatVersion = 2;
  delete legacy.data.features.challenges;
  delete legacy.data.features.seenChallengeWins;
  const loaded = parseBackup(JSON.stringify(legacy));
  assert.deepEqual(loaded.data.features.challenges, []);
  assert.deepEqual(loaded.data.occurrences, s.occurrences);
  const invalid = JSON.parse(JSON.stringify(exported));
  invalid.data.features.challenges.push(invalid.data.features.challenges[0]);
  assert.throws(() => parseBackup(JSON.stringify(invalid)), /duplicate/);
  invalid.data.features.challenges.pop();
  invalid.data.features.challenges[0].habitId = "unknown";
  assert.throws(() => parseBackup(JSON.stringify(invalid)), /relationship/);
});
test("widget count compare-and-set protects against duplicate and stale taps, with exact Undo", () => {
  let s = seeded({
    goal: { type: "count", value: 8, unit: "glasses" },
    busyGoal: 2,
  });
  const row = widgetModel(s, TODAY, "07:00").rows[0];
  assert.equal(row.action, "add");
  const action = actionFromWidget(s, { ...row }, TODAY)!;
  s = applyAction(s, action, TODAY);
  assert.equal(actionFromWidget(s, { ...row }, TODAY), null);
  assert.equal(s.occurrences.find((e) => e.date === TODAY)?.amount, 1);
  assert.equal(actionFromWidget(s, { ...row }, "2026-10-15"), null);
  const shifted = applyAction(
    seeded(),
    {
      type: "reschedule",
      id: `read:${TODAY}`,
      habitId: "read",
      sourceDate: TODAY,
      date: "2026-10-15",
      time: "09:00",
      scope: "once",
    },
    TODAY,
  );
  assert.equal(
    actionFromWidget(shifted, { ...row, action: "done" }, TODAY),
    null,
  );
  let bool = seeded({
    goal: { type: "boolean", value: 1, unit: "done" },
    busyGoal: null,
  });
  const first = widgetModel(bool, TODAY, "07:00").rows[0];
  bool = applyAction(bool, actionFromWidget(bool, { ...first }, TODAY)!, TODAY);
  const undo = widgetModel(bool, TODAY, "07:00").rows[0];
  assert.equal(undo.action, "undo");
  bool = applyAction(bool, actionFromWidget(bool, { ...undo }, TODAY)!, TODAY);
  assert.equal(bool.occurrences.find((e) => e.date === TODAY)?.amount, 0);
});
test("widget refuses archived, paused, wrong habit and changed Busy goals; duration opens details", () => {
  let s = seeded({
    goal: { type: "count", value: 8, unit: "glasses" },
    busyGoal: 2,
  });
  const row = widgetModel(s, TODAY, "07:00").rows[0];
  assert.equal(
    actionFromWidget(s, { ...row, habitId: "missing" }, TODAY),
    null,
  );
  s = applyAction(s, { type: "busy", date: TODAY, value: true }, TODAY);
  assert.equal(actionFromWidget(s, { ...row }, TODAY), null);
  const busy = widgetModel(s, TODAY, "07:00").rows[0];
  assert.equal(busy.target, 2);
  s = applyAction(
    s,
    {
      type: "pauseHabits",
      pause: {
        id: "p",
        habitIds: ["read"],
        start: TODAY,
        end: TODAY,
        reason: "",
      },
    },
    TODAY,
  );
  assert.equal(actionFromWidget(s, { ...busy }, TODAY), null);
  assert.equal(widgetModel(s, TODAY, "07:00").rows.length, 0);
  assert.equal(widgetModel(seeded(), TODAY, "07:00").rows[0].action, "open");
  s = applyAction(seeded(), { type: "deleteHabit", id: "read" }, TODAY);
  assert.equal(widgetModel(s, TODAY, "07:00").rows.length, 0);
});
test("widget summary uses daily denominator and excludes flexible weekly targets", () => {
  let s = seeded();
  s = applyAction(
    s,
    {
      type: "saveHabit",
      habit: habit({
        id: "weekly",
        repeat: { type: "weekly", days: [], target: 3 },
      }),
    },
    TODAY,
  );
  const m = widgetModel(s, TODAY, "07:00");
  assert.equal(m.summary.total, 1);
  assert.equal(m.rows[0].id, `read:${TODAY}`);
});
test("shared commit channel serializes widget/app writes and publishes the last committed state", async () => {
  const channel = new TrackerChannel();
  let current = seeded({
    goal: { type: "count", value: 8, unit: "glasses" },
    busyGoal: 2,
  });
  let renders = 0;
  let saving = false;
  const offBusy = channel.subscribeBusy((busy) => {
    saving = busy;
  });
  const off = channel.subscribe((s) => {
    current = s;
    renders++;
  });
  const row = widgetModel(current, TODAY, "07:00").rows[0];
  const widget = channel.queue.enqueue(
    "widget",
    async () => {
      await Promise.resolve();
      channel.publish(
        applyAction(
          current,
          actionFromWidget(current, { ...row }, TODAY)!,
          TODAY,
        ),
      );
      return true;
    },
    () => {},
  );
  const app = channel.queue.enqueue(
    "app",
    async () => {
      channel.publish(
        applyAction(
          current,
          {
            type: "increment",
            id: row.id,
            habitId: row.habitId,
            date: TODAY,
            delta: 1,
            busy: false,
          },
          TODAY,
        ),
      );
      return true;
    },
    () => {},
  );
  await Promise.all([widget, app]);
  assert.equal(current.occurrences.find((e) => e.date === TODAY)?.amount, 2);
  assert.equal(renders, 2);
  assert.equal(saving, false);
  off();
  offBusy();
});
test("SQLite legacy feature records normalize safely and new challenges survive save/load", async () => {
  const db = new DatabaseSync(":memory:");
  const adapter: Database = {
    execAsync: async (sql) => {
      db.exec(sql);
    },
    runAsync: async (sql, ...p) => db.prepare(sql).run(...p),
    getAllAsync: async <T>(sql: string, ...p: (string | number | null)[]) =>
      db.prepare(sql).all(...p) as T[],
    transaction: async (task) => {
      db.exec("BEGIN IMMEDIATE");
      try {
        await task(adapter);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  try {
    const repository = new TrackerRepository(adapter);
    await repository.initialize();
    const saved = withChallenge();
    await repository.save(saved);
    assert.deepEqual(
      (await new TrackerRepository(adapter).load()).features,
      saved.features,
    );
    const old = { ...saved.features };
    delete old.challenges;
    delete old.seenChallengeWins;
    db.prepare("UPDATE settings SET payload=? WHERE id='habitFeatures'").run(
      JSON.stringify(old),
    );
    const loaded = await repository.load();
    assert.deepEqual(loaded.features.challenges, []);
    assert.deepEqual(loaded.occurrences, saved.occurrences);
  } finally {
    db.close();
  }
});
test("color mode validates saved values, defaults to System and resolves overrides independently of premium", () => {
  assert.equal(parseColorMode(null), "system");
  assert.equal(parseColorMode('"dark"'), "dark");
  assert.throws(() => parseColorMode('"automatic"'), /color theme/);
  assert.equal(isDarkMode("system", "dark"), true);
  assert.equal(isDarkMode("light", "dark"), false);
  assert.equal(isDarkMode("dark", "light"), true);
});
test("repeat challenge starts a fresh period tomorrow instead of reusing today's completion", () => {
  const c = challenge({ target: 1 });
  const state = mark(withChallenge(c), TODAY);
  const next = nextChallengeDraft(c, "new-attempt", TODAY);
  assert.equal(next.start, "2026-10-15");
  assert.equal(next.end, "2026-10-21");
  const saved = applyAction(
    state,
    { type: "saveChallenge", challenge: next },
    TODAY,
  );
  assert.equal(challengeProgress(saved, next, TODAY).status, "upcoming");
  assert.equal(challengeProgress(saved, next, TODAY).current, 0);
  assert.equal(challengeProgress(saved, c, TODAY).status, "completed");
});
test("a headless task finishing last releases the app saving indicator", async () => {
  const channel = new TrackerChannel();
  let saving = false;
  const events: boolean[] = [];
  const stop = channel.subscribeBusy((busy) => {
    saving = busy;
    events.push(busy);
  });
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const app = channel.queue.enqueue(
    "app",
    async () => true,
    (busy) => {
      saving = busy;
    },
  );
  const widget = channel.queue.enqueue(
    "widget",
    async () => {
      await gate;
      return true;
    },
    () => {},
  );
  await app;
  assert.equal(saving, true);
  finish();
  await widget;
  assert.equal(saving, false);
  assert.ok(events.includes(true));
  assert.equal(events.at(-1), false);
  stop();
});
