import type { TrackerState } from "../models/types";
import { emptyState } from "../domain/schedule";
import type { Database } from "./database";
import { migrate } from "./migrations";
import { validateBackup } from "../domain/backup";
import { applyAction, type Action } from "../domain/actions";
import { baselineAchievements } from "../domain/achievements";

const tables = {
  habits: "habits",
  versions: "habit_versions",
  occurrences: "entries",
  routines: "routines",
  weeklyPlans: "weekly_plans",
  sessions: "routine_sessions",
  notes: "daily_notes",
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
        `SELECT payload FROM ${tables[key]} ORDER BY ${key === "notes" ? "entry_id" : "id"}`,
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
    const features = await this.db.getAllAsync<{ payload: string }>(
      "SELECT payload FROM settings WHERE id = 'habitFeatures'",
    );
    if (features.length) state.features = JSON.parse(features[0].payload);
    return state;
  }
  async hasTimerReceipt(id: string) {
    return (
      (
        await this.db.getAllAsync(
          "SELECT id FROM timer_receipts WHERE id = ?",
          id,
        )
      ).length > 0
    );
  }
  async recordTimer(
    state: TrackerState,
    action: Extract<Action, { type: "timerAmount" }>,
    today: string,
  ) {
    if (await this.hasTimerReceipt(action.sessionId)) return state;
    const next = baselineAchievements(applyAction(state, action, today), today);
    await this.save(next, action.sessionId);
    return next;
  }
  async save(state: TrackerState, timerReceipt?: string) {
    // A complete, atomic local snapshot. FK parents remain present after archival.
    await this.db.transaction(async (tx) => {
      for (const table of [
        "daily_notes",
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
      for (const note of state.notes)
        await tx.runAsync(
          "INSERT INTO daily_notes VALUES (?,?,?)",
          note.entryId,
          note.habitId,
          JSON.stringify(note),
        );
      await tx.runAsync(
        "INSERT INTO settings VALUES (?,?)",
        "busyDates",
        JSON.stringify(state.busyDates),
      );
      if (timerReceipt)
        await tx.runAsync(
          "INSERT INTO timer_receipts (id) VALUES (?)",
          timerReceipt,
        );
      await tx.runAsync(
        "INSERT INTO settings VALUES (?,?)",
        "habitFeatures",
        JSON.stringify(state.features),
      );
    });
  }
  async restore(backup: unknown): Promise<TrackerState> {
    const validated = validateBackup(backup);
    await this.save(validated.data);
    return validated.data;
  }
}
