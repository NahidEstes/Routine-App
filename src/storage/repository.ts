import type { TrackerState } from "../models/types";
import { emptyState } from "../domain/schedule";
import type { Database } from "./database";
import { migrate } from "./migrations";

const tables = {
  habits: "habits",
  versions: "habit_versions",
  occurrences: "entries",
  routines: "routines",
  weeklyPlans: "weekly_plans",
  sessions: "routine_sessions",
} as const;
export class TrackerRepository {
  constructor(private db: Database) {}
  async initialize() {
    await migrate(this.db);
  }
  async load(): Promise<TrackerState> {
    const state = emptyState();
    for (const key of Object.keys(tables) as (keyof typeof tables)[]) {
      const rows = await this.db.getAllAsync<{ payload: string }>(
        `SELECT payload FROM ${tables[key]} ORDER BY id`,
      );
      // Tables only contain typed JSON records written by save; invalid JSON fails visibly.
      Object.assign(state, {
        [key]: rows.map((row) => JSON.parse(row.payload)),
      });
    }
    const settings = await this.db.getAllAsync<{ payload: string }>(
      "SELECT payload FROM settings WHERE id = 'busyDates'",
    );
    state.busyDates = settings.length ? JSON.parse(settings[0].payload) : [];
    return state;
  }
  async save(state: TrackerState) {
    // A complete, atomic local snapshot. FK parents remain present after archival.
    await this.db.transaction(async (tx) => {
      for (const table of [
        "routine_sessions",
        "weekly_plans",
        "entries",
        "habit_versions",
        "routines",
        "habits",
        "settings",
      ])
        await tx.execAsync(`DELETE FROM ${table}`);
      for (const h of state.habits)
        await tx.runAsync(
          "INSERT INTO habits VALUES (?,?)",
          h.id,
          JSON.stringify(h),
        );
      for (const r of state.routines)
        await tx.runAsync(
          "INSERT INTO routines VALUES (?,?)",
          r.id,
          JSON.stringify(r),
        );
      for (const v of state.versions)
        await tx.runAsync(
          "INSERT INTO habit_versions VALUES (?,?,?,?)",
          v.id,
          v.habitId,
          v.effectiveFrom,
          JSON.stringify(v),
        );
      for (const e of state.occurrences)
        await tx.runAsync(
          "INSERT INTO entries VALUES (?,?,?,?,?,?)",
          e.id,
          e.habitId,
          e.sourceDate,
          e.date,
          e.excluded ? 1 : 0,
          JSON.stringify(e),
        );
      for (const p of state.weeklyPlans)
        await tx.runAsync(
          "INSERT INTO weekly_plans VALUES (?,?,?,?)",
          p.id,
          p.habitId,
          p.week,
          JSON.stringify(p),
        );
      for (const s of state.sessions)
        await tx.runAsync(
          "INSERT INTO routine_sessions VALUES (?,?,?,?)",
          s.id,
          s.routineId,
          s.date,
          JSON.stringify(s),
        );
      await tx.runAsync(
        "INSERT INTO settings VALUES (?,?)",
        "busyDates",
        JSON.stringify(state.busyDates),
      );
    });
  }
}
