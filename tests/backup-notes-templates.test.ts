import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Database } from "../src/storage/database";
import { TrackerRepository } from "../src/storage/repository";
import { migrations } from "../src/storage/migrations";
import { applyAction } from "../src/domain/actions";
import {
  createBackup,
  parseBackup,
  validateBackup,
  prepareRestore,
} from "../src/domain/backup";
import {
  duplicateRoutine,
  routineFromTemplate,
  routineTemplates,
} from "../src/domain/routineTemplates";
import { completion } from "../src/domain/progress";
import { emptyState, entriesForDate } from "../src/domain/schedule";
import type { TrackerState } from "../src/models/types";
import { seeded, mark, TODAY } from "./fixtures";

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
const stamp = "2026-10-14T12:00:00.000Z";
function note(
  state: TrackerState,
  day: string,
  text: string,
  id = `read:${day}`,
) {
  return applyAction(
    state,
    {
      type: "saveNote",
      id,
      habitId: "read",
      date: day,
      text,
      updatedAt: stamp,
    },
    TODAY,
  );
}
function completeData() {
  let s = mark(seeded(), "2026-10-12", "done", true);
  s = mark(s, "2026-10-13", "skipped");
  s = note(s, "2026-10-12", "A quieter morning.\nনিজের জন্য একটু সময়।");
  s = note(s, "2026-10-13", "Rested instead.");
  s = note(s, TODAY, "Move this thought with its record.");
  s = applyAction(
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
  s = applyAction(
    s,
    {
      type: "saveHabit",
      habit: {
        ...s.habits[0],
        name: "Read tomorrow",
        goal: { type: "count", value: 2, unit: "pages" },
        busyGoal: 1,
      },
    },
    TODAY,
  );
  s = applyAction(
    s,
    {
      type: "saveHabit",
      habit: {
        ...s.habits[0],
        id: "weekly",
        name: "Weekly",
        createdAt: TODAY,
        repeat: { type: "weekly", days: [0, 1, 2, 3, 4, 5, 6], target: 3 },
      },
    },
    TODAY,
  );
  s = applyAction(
    s,
    {
      type: "status",
      id: `weekly:${TODAY}`,
      habitId: "weekly",
      date: TODAY,
      status: "done",
      busy: false,
    },
    TODAY,
  );
  const routine = routineFromTemplate(routineTemplates[0]);
  routine.steps[0].habitId = "read";
  s = applyAction(s, { type: "saveRoutine", routine }, TODAY);
  s = applyAction(
    s,
    { type: "startRoutine", id: routine.id, date: TODAY, busy: true },
    TODAY,
  );
  s = applyAction(
    s,
    { type: "endRoutine", sessionId: s.sessions[0].id },
    TODAY,
  );
  s = applyAction(s, { type: "busy", date: TODAY, value: true }, TODAY);
  return s;
}

test("backup round-trip retains all relationships, revisions, overrides, notes, commitments, sessions and progress", () => {
  const state = completeData();
  const backup = createBackup(state, stamp);
  const loaded = parseBackup(JSON.stringify(backup));
  assert.deepEqual(loaded.data, JSON.parse(JSON.stringify(state)));
  assert.deepEqual(
    completion(loaded.data, ["2026-10-12", "2026-10-13", TODAY]),
    completion(state, ["2026-10-12", "2026-10-13", TODAY]),
  );
  assert.equal(
    loaded.data.notes.find((n) => n.entryId === `read:${TODAY}`)?.text,
    "Move this thought with its record.",
  );
  assert.equal(
    loaded.data.occurrences.find((e) => e.id === `read:${TODAY}`)?.date,
    "2026-10-15",
  );
  loaded.data.habits[0].name = "Changed imported copy";
  assert.notEqual(loaded.data.habits[0].name, state.habits[0].name);
});

test("backup rejects corrupt, unsupported, wrong types, duplicate IDs and broken relationships without touching SQLite", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    const repo = new TrackerRepository(adapter(db));
    await repo.initialize();
    await repo.save(seeded());
    const before = await repo.load();
    assert.throws(() => parseBackup("{broken"), /not valid JSON/);
    const valid = createBackup(completeData(), stamp);
    const mutations: ((b: Record<string, any>) => void)[] = [
      (b) => (b.formatVersion = 99),
      (b) => b.data.habits.push(b.data.habits[0]),
      (b) => (b.data.versions[0].habitId = "missing"),
      (b) => (b.data.notes[0].entryId = "missing"),
      (b) => (b.data.notes[0].text = 12),
      (b) => (b.data.habits[0].goal.value = -1),
      (b) => (b.data.routines[0].steps[0].habitId = "missing"),
      (b) => (b.data.sessions[0].completed = ["unknown-step"]),
      (b) =>
        b.data.occurrences.push({
          ...b.data.occurrences[0],
          id: "another",
          sourceDate: "2026-10-01",
        }),
      (b) => (b.data.busyDates = [false]),
      (b) => b.data.notes.push(b.data.notes[0]),
      (b) => (b.privateSigningKey = "must not be accepted"),
    ];
    for (const mutate of mutations) {
      const invalid = JSON.parse(JSON.stringify(valid));
      mutate(invalid);
      await assert.rejects(repo.restore(invalid));
      assert.deepEqual(await repo.load(), before);
    }
  } finally {
    db.close();
  }
});

test("restore SQL failure after table replacement rolls back all current data", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    const repo = new TrackerRepository(adapter(db));
    await repo.initialize();
    await repo.save(seeded());
    const before = await repo.load();
    db.exec(
      "CREATE TRIGGER fail_restore BEFORE INSERT ON daily_notes BEGIN SELECT RAISE(ABORT, 'test disk write failure'); END;",
    );
    await assert.rejects(
      repo.restore(createBackup(completeData(), stamp)),
      /test disk write failure/,
    );
    assert.deepEqual(await repo.load(), before);
    db.exec("DROP TRIGGER fail_restore");
    await repo.restore(createBackup(completeData(), stamp));
    assert.equal((await repo.load()).notes.length, 3);
  } finally {
    db.close();
  }
});

test("v2 → v3 migration preserves old history and initializes notes without reset", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    const repo = new TrackerRepository(adapter(db));
    await repo.initialize();
    await repo.save(mark(seeded(), TODAY));
    const before = await repo.load();
    db.exec("DROP TABLE daily_notes; PRAGMA user_version=2;");
    await repo.initialize();
    await repo.initialize();
    assert.deepEqual(await repo.load(), before);
    assert.equal(
      (db.prepare("PRAGMA user_version").get() as { user_version: number })
        .user_version,
      migrations.length,
    );
  } finally {
    db.close();
  }
});

test("notes save/edit/delete on done, partial, skipped and missed records never change progress", () => {
  const cases = [
    mark(seeded(), TODAY),
    mark(seeded(), TODAY, "skipped"),
    applyAction(
      seeded(),
      {
        type: "amount",
        id: `read:${TODAY}`,
        habitId: "read",
        date: TODAY,
        amount: 3,
        busy: false,
      },
      TODAY,
    ),
    seeded(),
  ];
  for (const state of cases) {
    const day = state === cases[3] ? "2026-10-12" : TODAY;
    const baseline = completion(state, ["2026-10-12", "2026-10-13", TODAY]);
    let s = note(state, day, "First\nplain <text> 😀");
    assert.deepEqual(s.occurrences, state.occurrences);
    s = note(s, day, "Edited");
    assert.equal(s.notes.length, 1);
    assert.equal(s.notes[0].text, "Edited");
    s = note(s, day, "");
    assert.deepEqual(s.notes, []);
    assert.deepEqual(
      completion(s, ["2026-10-12", "2026-10-13", TODAY]),
      baseline,
    );
  }
  assert.throws(() => note(seeded(), TODAY, "x".repeat(2001)), /2,000/);
});

test("weekly note captures one record without credit; note follows reschedule and protects destination note", () => {
  const weekly = seeded({
    repeat: { type: "weekly", days: [0, 1, 2, 3, 4, 5, 6], target: 3 },
  });
  let s = note(weekly, TODAY, "A flexible day");
  assert.equal(s.occurrences.length, 1);
  assert.equal(s.occurrences[0].amount, 0);
  assert.equal(s.occurrences[0].status, "pending");
  assert.equal(s.weeklyPlans.length, weekly.weeklyPlans.length);
  validateBackup(createBackup(s, stamp));
  s = note(seeded(), TODAY, "Destination stays safe");
  assert.throws(
    () =>
      applyAction(
        s,
        {
          type: "reschedule",
          id: "read:2026-10-13",
          habitId: "read",
          sourceDate: "2026-10-13",
          date: TODAY,
          time: "10:00",
          scope: "once",
        },
        TODAY,
      ),
    /note/,
  );
  s = applyAction(
    s,
    {
      type: "reschedule",
      id: `read:${TODAY}`,
      habitId: "read",
      sourceDate: TODAY,
      date: "2026-10-15",
      time: "18:00",
      scope: "future",
    },
    TODAY,
  );
  assert.equal(s.notes[0].entryId, `read:${TODAY}`);
  assert.equal(s.notes.length, 1);
  assert.equal(
    entriesForDate(s, "2026-10-15", TODAY)[0].id,
    s.notes[0].entryId,
  );
  s = applyAction(s, { type: "deleteHabit", id: "read" }, TODAY);
  assert.equal(s.notes[0].text, "Destination stays safe");
  validateBackup(createBackup(s, stamp));
});

test("SQLite restart and backup restore retain notes; note deletion persists", async () => {
  const dir = mkdtempSync(join(tmpdir(), "routine-note-tests-"));
  const path = join(dir, "notes.db");
  let db = new DatabaseSync(path);
  try {
    let repo = new TrackerRepository(adapter(db));
    await repo.initialize();
    await repo.save(note(seeded(), TODAY, "Survives restart"));
    const backup = createBackup(await repo.load(), stamp);
    db.close();
    db = new DatabaseSync(path);
    repo = new TrackerRepository(adapter(db));
    await repo.initialize();
    assert.equal((await repo.load()).notes[0].text, "Survives restart");
    await repo.save(note(await repo.load(), TODAY, ""));
    assert.equal((await repo.load()).notes.length, 0);
    await repo.restore(parseBackup(JSON.stringify(backup)));
    assert.equal((await repo.load()).notes[0].text, "Survives restart");
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("boolean empty units and inactive archive-gap snapshots remain valid backups; excluded notes survive restore and edits", () => {
  let s = seeded({
    goal: { type: "boolean", value: 1, unit: "" },
    busyGoal: null,
  });
  validateBackup(createBackup(s, stamp));
  s = note(s, TODAY, "Keep my record");
  s = applyAction(
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
  s = applyAction(s, { type: "deleteHabit", id: "read" }, TODAY);
  s = applyAction(
    s,
    {
      type: "saveNote",
      id: `read:${TODAY}`,
      habitId: "read",
      date: "2026-10-15",
      text: "Still editable after archive",
      updatedAt: stamp,
    },
    TODAY,
  );
  const preserved = s.occurrences.find((e) => e.id === `read:${TODAY}`)!;
  assert.equal(preserved.excluded, true);
  s = applyAction(s, { type: "restoreHabit", id: "read" }, "2026-10-20");
  assert.equal(s.notes[0].text, "Still editable after archive");
  assert.ok(s.occurrences.some((e) => e.id === s.notes[0].entryId));
  validateBackup(createBackup(s, stamp));
});

test("restore catches up to the local day without losing notes and rejects excessive calendar work before a write", () => {
  const backup = createBackup(note(seeded(), TODAY, "Earlier note"), stamp);
  const next = prepareRestore(backup, "2026-10-17");
  assert.equal(next.data.notes[0].text, "Earlier note");
  assert.equal(
    entriesForDate(next.data, "2026-10-17", "2026-10-17")[0].status,
    "pending",
  );
  assert.equal(backup.data.occurrences.length, 3);
  const excessive = JSON.parse(JSON.stringify(backup));
  excessive.data.habits[0].createdAt = "1000-01-01";
  assert.throws(() => prepareRestore(excessive, TODAY), /250,000 habit-days/);
});

test("four original templates produce independent editable drafts with fresh routine/step IDs and no hidden data", () => {
  assert.equal(routineTemplates.length, 4);
  const ids: string[] = [];
  for (const template of routineTemplates) {
    const a = routineFromTemplate(template),
      b = routineFromTemplate(template);
    ids.push(
      a.id,
      b.id,
      ...a.steps.map((s) => s.id),
      ...b.steps.map((s) => s.id),
    );
    assert.ok(a.steps.every((s) => !s.habitId));
    a.steps[0].name = "My own step";
    assert.notEqual(b.steps[0].name, a.steps[0].name);
    assert.notEqual(template.steps[0].name, a.steps[0].name);
    const s = applyAction(
      emptyState(),
      { type: "saveRoutine", routine: a },
      TODAY,
    );
    assert.equal(s.routines.length, 1);
    assert.equal(s.habits.length + s.occurrences.length + s.sessions.length, 0);
  }
  assert.equal(new Set(ids).size, ids.length);
});

test("duplicate preserves links, order and full/busy durations, while editing the copy cannot change original or history", () => {
  const state = completeData(),
    original = state.routines[0];
  const copy = duplicateRoutine(original);
  assert.notEqual(copy.id, original.id);
  assert.equal(copy.steps[0].habitId, original.steps[0].habitId);
  assert.deepEqual(
    copy.steps.map(({ id: _id, ...step }) => step),
    original.steps.map(({ id: _id, ...step }) => step),
  );
  assert.ok(copy.steps.every((s, i) => s.id !== original.steps[i].id));
  copy.name = "My copy";
  copy.steps[0].name = "A different first step";
  copy.steps.reverse();
  const next = applyAction(
    state,
    { type: "saveRoutine", routine: copy },
    TODAY,
  );
  assert.deepEqual(
    next.routines.find((r) => r.id === original.id),
    original,
  );
  assert.deepEqual(next.sessions, state.sessions);
  assert.deepEqual(next.occurrences, state.occurrences);
});
