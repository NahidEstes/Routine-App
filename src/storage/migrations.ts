import type { Database } from "./database";
export const migrations = [
  `CREATE TABLE habits (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
 CREATE TABLE habit_versions (id TEXT PRIMARY KEY NOT NULL, habit_id TEXT NOT NULL REFERENCES habits(id), effective_from TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(habit_id,effective_from));
 CREATE TABLE entries (id TEXT PRIMARY KEY NOT NULL, habit_id TEXT NOT NULL REFERENCES habits(id), source_date TEXT NOT NULL, date TEXT NOT NULL, excluded INTEGER NOT NULL DEFAULT 0, payload TEXT NOT NULL, UNIQUE(habit_id,source_date));
 CREATE TABLE routines (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
 CREATE TABLE weekly_plans (id TEXT PRIMARY KEY NOT NULL, habit_id TEXT NOT NULL REFERENCES habits(id), week TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(habit_id,week));
 CREATE TABLE settings (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);`,
  `CREATE TABLE routine_sessions (id TEXT PRIMARY KEY NOT NULL, routine_id TEXT NOT NULL REFERENCES routines(id), date TEXT NOT NULL, payload TEXT NOT NULL);
 CREATE UNIQUE INDEX entry_one_per_habit_day ON entries(habit_id,date) WHERE excluded=0;
 CREATE INDEX entry_date ON entries(date);
 CREATE INDEX version_lookup ON habit_versions(habit_id,effective_from);`,
];
export async function migrate(db: Database) {
  await db.execAsync("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  const [{ user_version: version }] = await db.getAllAsync<{
    user_version: number;
  }>("PRAGMA user_version");
  if (version > migrations.length)
    throw new Error(
      "This database was created by a newer app. Please update the app; your data has not been modified.",
    );
  for (let i = version; i < migrations.length; i++)
    await db.transaction(async (tx) => {
      await tx.execAsync(migrations[i]);
      await tx.execAsync(`PRAGMA user_version = ${i + 1}`);
    });
}
