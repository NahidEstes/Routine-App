import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database } from "../src/storage/database";
import { TrackerRepository } from "../src/storage/repository";
import { migrations } from "../src/storage/migrations";
import { applyAction } from "../src/domain/actions";
import { entriesForDate } from "../src/domain/schedule";
import { mark, seeded, TODAY } from "./fixtures";

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
test("SQLite save → close → reopen retains habit versions, progress, skip, override, busy and routine session", async () => {
  const directory = mkdtempSync(join(tmpdir(), "steady-tests-"));
  const path = join(directory, "tracker.db");
  let db = new DatabaseSync(path);
  try {
    const repository = new TrackerRepository(adapter(db));
    await repository.initialize();
    let s = mark(seeded(), "2026-10-12", "done", true);
    s = mark(s, "2026-10-13", "skipped");
    s = applyAction(
      s,
      {
        type: "reschedule",
        id: `read:${TODAY}`,
        habitId: "read",
        sourceDate: TODAY,
        date: "2026-10-15",
        time: "19:00",
        scope: "once",
      },
      TODAY,
    );
    s = applyAction(s, { type: "busy", date: TODAY, value: true }, TODAY);
    s = applyAction(
      s,
      {
        type: "saveRoutine",
        routine: {
          id: "r",
          name: "Reset",
          subtitle: "",
          time: "07:00",
          days: [3],
          steps: [
            {
              id: "s",
              name: "Stretch",
              icon: "walk-outline",
              minutes: 5,
              busyMinutes: 1,
            },
          ],
        },
      },
      TODAY,
    );
    s = applyAction(
      s,
      { type: "startRoutine", id: "r", date: TODAY, busy: true },
      TODAY,
    );
    s = applyAction(
      s,
      { type: "completeStep", sessionId: s.sessions[0].id, stepId: "s" },
      TODAY,
    );
    await repository.save(s);
    db.close();
    db = new DatabaseSync(path);
    const reopened = new TrackerRepository(adapter(db));
    await reopened.initialize();
    const loaded = await reopened.load();
    assert.equal(entriesForDate(loaded, "2026-10-12", TODAY)[0].busy, true);
    assert.equal(
      entriesForDate(loaded, "2026-10-13", TODAY)[0].status,
      "skipped",
    );
    assert.equal(entriesForDate(loaded, "2026-10-15", TODAY)[0].time, "19:00");
    assert.equal(entriesForDate(loaded, TODAY, TODAY).length, 0);
    assert.deepEqual(loaded.busyDates, [TODAY]);
    assert.deepEqual(loaded.sessions[0].completed, ["s"]);
    assert.deepEqual(loaded.versions, JSON.parse(JSON.stringify(s.versions)));
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("v1 → current schema migration retains existing habit data, is repeatable and adds sessions/notes/indexes", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(migrations[0]);
    db.exec("PRAGMA user_version = 1");
    const s = seeded();
    db.prepare("INSERT INTO habits VALUES (?,?)").run(
      "read",
      JSON.stringify(s.habits[0]),
    );
    const repository = new TrackerRepository(adapter(db));
    await repository.initialize();
    await repository.initialize();
    assert.equal((await repository.load()).habits[0].name, "Read");
    assert.equal(
      (db.prepare("PRAGMA user_version").get() as { user_version: number })
        .user_version,
      migrations.length,
    );
    assert.equal((await repository.load()).sessions.length, 0);
  } finally {
    db.close();
  }
});
test("failed multi-table write rolls back everything, including history", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    const repo = new TrackerRepository(adapter(db));
    await repo.initialize();
    const good = seeded();
    await repo.save(good);
    const invalid = {
      ...good,
      occurrences: [
        ...good.occurrences,
        { ...good.occurrences[0], id: "duplicate" },
      ],
    };
    await assert.rejects(repo.save(invalid));
    assert.deepEqual(await repo.load(), JSON.parse(JSON.stringify(good)));
  } finally {
    db.close();
  }
});
test("newer DB schema fails safely without changing records or user_version", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA user_version = 99");
    const repo = new TrackerRepository(adapter(db));
    await assert.rejects(repo.initialize(), /newer app/);
    assert.equal(
      (db.prepare("PRAGMA user_version").get() as { user_version: number })
        .user_version,
      99,
    );
  } finally {
    db.close();
  }
});
