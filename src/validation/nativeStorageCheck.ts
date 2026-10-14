import { openDatabaseAsync } from "expo-sqlite";
import type { Database } from "../storage/database";
import { TrackerRepository } from "../storage/repository";
import { migrations } from "../storage/migrations";
import { applyAction } from "../domain/actions";
import { emptyState, entriesForDate } from "../domain/schedule";
import type { Habit } from "../models/types";
// Opt-in development check uses its own database, never the user's tracker data.
export async function nativeStorageCheck() {
  const name = "steady-storage-validation.db";
  let db = await openDatabaseAsync(name);
  const adapter = (): Database => ({
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, ...params) => db.runAsync(sql, ...params),
    getAllAsync: (sql, ...params) => db.getAllAsync(sql, ...params),
    transaction: (task) => db.withTransactionAsync(() => task(db)),
  });
  const check = (value: boolean, message: string) => {
    if (!value) throw new Error(message);
  };
  try {
    await db.execAsync(
      "PRAGMA foreign_keys=OFF; DROP TABLE IF EXISTS routine_sessions; DROP TABLE IF EXISTS weekly_plans; DROP TABLE IF EXISTS entries; DROP TABLE IF EXISTS habit_versions; DROP TABLE IF EXISTS routines; DROP TABLE IF EXISTS habits; DROP TABLE IF EXISTS settings; PRAGMA user_version=0;",
    );
    await db.execAsync(migrations[0]);
    await db.execAsync("PRAGMA user_version=1;");
    let repository = new TrackerRepository(adapter());
    await repository.initialize();
    const date = "2026-10-14";
    const h: Habit = {
      id: "validation",
      name: "Validation habit",
      icon: "book-outline",
      category: "Learning",
      goal: { type: "duration", value: 15, unit: "min" },
      busyGoal: 5,
      repeat: { type: "daily", days: [0, 1, 2, 3, 4, 5, 6], target: 7 },
      time: "07:00",
      createdAt: "2026-10-13",
    };
    let state = applyAction(
      emptyState(),
      { type: "saveHabit", habit: h },
      date,
    );
    state = applyAction(
      state,
      {
        type: "amount",
        id: "validation:2026-10-13",
        habitId: h.id,
        date: "2026-10-13",
        amount: 5,
        busy: true,
      },
      date,
    );
    state = applyAction(
      state,
      {
        type: "reschedule",
        id: `validation:${date}`,
        habitId: h.id,
        sourceDate: date,
        date: "2026-10-15",
        time: "18:00",
        scope: "once",
      },
      date,
    );
    await repository.save(state);
    await db.closeAsync();
    db = await openDatabaseAsync(name);
    repository = new TrackerRepository(adapter());
    await repository.initialize();
    const loaded = await repository.load();
    check(
      entriesForDate(loaded, "2026-10-13", date)[0].busy,
      "Busy history lost after reopen",
    );
    check(
      entriesForDate(loaded, date, date).length === 0,
      "Moved source duplicated",
    );
    check(
      entriesForDate(loaded, "2026-10-15", date)[0].time === "18:00",
      "Reschedule override lost",
    );
    let failed = false;
    try {
      await repository.save({
        ...loaded,
        occurrences: [
          ...loaded.occurrences,
          { ...loaded.occurrences[0], id: "duplicate" },
        ],
      });
    } catch {
      failed = true;
    }
    check(failed, "Unique index did not protect duplicates");
    check(
      (await repository.load()).occurrences.length ===
        loaded.occurrences.length,
      "Transaction rollback failed",
    );
    console.info(
      "STEADY_SQLITE_CHECK_PASS: v1->v2 migration, create, progress, reschedule, close/reopen, history, rollback",
    );
  } finally {
    await db.closeAsync();
  }
}
