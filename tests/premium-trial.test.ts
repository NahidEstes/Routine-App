import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DAY_MS,
  parseTrial,
  trialStatus,
  TRIAL_DURATION_MS,
} from "../src/domain/premiumTrial";
import {
  PREMIUM_TRIAL_KEY,
  PremiumTrialStore,
  type TrialStorage,
} from "../src/storage/premiumTrial";
import { TrackerRepository } from "../src/storage/repository";
import type { Database } from "../src/storage/database";
import { createBackup } from "../src/domain/backup";
import { seeded } from "./fixtures";

const START = Date.parse("2026-10-18T09:00:00Z");
function memory() {
  const values = new Map<string, string>();
  const storage: TrialStorage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
  return { values, storage, store: new PremiumTrialStore(storage) };
}

test("new install stays Classic until trial is explicitly started; expires at exactly 168 hours", async () => {
  const { values, store } = memory();
  assert.deepEqual(trialStatus(await store.refresh(START), START), {
    active: false,
    used: false,
    remaining: 0,
    daysLeft: 0,
  });
  assert.equal(values.size, 0);
  const trial = await store.refresh(START, true);
  assert.equal(trial?.expiresAt, START + 168 * 60 * 60 * 1000);
  assert.equal(trialStatus(trial, START).daysLeft, 7);
  assert.equal(trialStatus(trial, START + DAY_MS).daysLeft, 6);
  assert.equal(trialStatus(trial, START + TRIAL_DURATION_MS - 1).active, true);
  assert.deepEqual(trialStatus(trial, START + TRIAL_DURATION_MS), {
    active: false,
    used: true,
    remaining: 0,
    daysLeft: 0,
  });
});

test("reopen, rapid double taps and starting again never extend or restart the trial", async () => {
  const { store, storage } = memory();
  const [first, second] = await Promise.all([
    store.refresh(START, true),
    store.refresh(START + 20, true),
  ]);
  assert.equal(first?.expiresAt, second?.expiresAt);
  const reopened = new PremiumTrialStore(storage);
  const active = await reopened.refresh(START + 2 * DAY_MS, true);
  assert.equal(active?.startedAt, START);
  assert.equal(trialStatus(active, START + 2 * DAY_MS).daysLeft, 5);
  const expired = await reopened.refresh(START + 8 * DAY_MS, true);
  assert.equal(expired?.expiresAt, first?.expiresAt);
  assert.equal(trialStatus(expired, START + 8 * DAY_MS).active, false);
});

test("an observed expiration remains expired after a clock rollback or application restart", async () => {
  const { store, storage } = memory();
  await store.refresh(START, true);
  await store.refresh(START + TRIAL_DURATION_MS);
  const reopened = new PremiumTrialStore(storage);
  const trial = await reopened.refresh(START + DAY_MS, true);
  assert.equal(trialStatus(trial, START + DAY_MS).active, false);
  assert.equal(trial?.lastSeenAt, START + TRIAL_DURATION_MS);
});

test("storage failures grant no trial; retry succeeds without poisoning queued writes", async () => {
  const { storage, values } = memory();
  let failing = true;
  const store = new PremiumTrialStore({
    getItem: storage.getItem,
    setItem: async (key, value) => {
      if (failing) throw new Error("Disk full");
      await storage.setItem(key, value);
    },
  });
  await assert.rejects(store.refresh(START, true), /Disk full/);
  assert.equal(values.size, 0);
  failing = false;
  assert.equal(
    trialStatus(await store.refresh(START + 50, true), START + 50).active,
    true,
  );
  const unreadable = new PremiumTrialStore({
    ...storage,
    getItem: async () => {
      throw new Error("Read failed");
    },
  });
  await assert.rejects(unreadable.refresh(START), /Read failed/);
});

test("malformed or unsupported saved records cannot start a replacement trial", async () => {
  for (const raw of [
    "bad json",
    "null",
    "{}",
    JSON.stringify({ version: 2 }),
    JSON.stringify({
      version: 1,
      startedAt: START,
      expiresAt: START + DAY_MS,
      lastSeenAt: START,
    }),
  ]) {
    const { store, values } = memory();
    values.set(PREMIUM_TRIAL_KEY, raw);
    await assert.rejects(store.refresh(START, true));
    assert.equal(values.get(PREMIUM_TRIAL_KEY), raw);
  }
  assert.equal(parseTrial(null), null);
});

test("SQLite reopen, normal habit saves and importing an old habit backup preserve the trial", async () => {
  const directory = mkdtempSync(join(tmpdir(), "routine-trial-"));
  const dbPath = join(directory, "test.db");
  let db = new DatabaseSync(dbPath);
  const adapter: Database = {
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
        await task(adapter);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const storage: TrialStorage = {
    getItem: async (key) =>
      (
        db.prepare("SELECT value FROM storage WHERE key = ?").get(key) as
          | { value: string }
          | undefined
      )?.value ?? null,
    setItem: async (key, value) => {
      db.prepare("INSERT OR REPLACE INTO storage VALUES (?, ?)").run(
        key,
        value,
      );
    },
  };
  try {
    db.exec("CREATE TABLE storage (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    const repo = new TrackerRepository(adapter);
    await repo.initialize();
    const habits = seeded();
    const backup = createBackup(habits);
    await repo.save(habits);
    const store = new PremiumTrialStore(storage);
    await store.refresh(START, true);
    await repo.save(habits);
    await repo.restore(backup);
    db.close();
    db = new DatabaseSync(dbPath);
    const reopened = new PremiumTrialStore(storage);
    const trial = await reopened.refresh(START + TRIAL_DURATION_MS);
    assert.equal(trial?.startedAt, START);
    assert.equal(trialStatus(trial, START + TRIAL_DURATION_MS).active, false);
    assert.deepEqual(await repo.load(), JSON.parse(JSON.stringify(habits)));
    assert.equal(
      trialStatus(await reopened.refresh(START + DAY_MS, true), START + DAY_MS)
        .active,
      false,
    );
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
