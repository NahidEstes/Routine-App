import { openDatabaseAsync } from "expo-sqlite";
import type { Database } from "./database";
import { TrackerRepository } from "./repository";

let repository: Promise<TrackerRepository> | undefined;
export function openRepository() {
  if (!repository)
    repository = (async () => {
      const db = await openDatabaseAsync("steady-routine.db");
      const adapter: Database = {
        execAsync: (sql) => db.execAsync(sql),
        runAsync: (sql, ...params) => db.runAsync(sql, ...params),
        getAllAsync: (sql, ...params) => db.getAllAsync(sql, ...params),
        // This private connection has no concurrent queries: writes are queued by
        // TrackerProvider. Keeping one connection preserves its foreign-key PRAGMA.
        transaction: (task) => db.withTransactionAsync(() => task(db)),
      };
      const result = new TrackerRepository(adapter);
      try {
        await result.initialize();
      } catch (error) {
        await db.closeAsync();
        throw error;
      }
      return result;
    })().catch((error) => {
      repository = undefined;
      throw error;
    });
  return repository;
}
