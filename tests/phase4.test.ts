import test from "node:test";
import assert from "node:assert/strict";
import { WriteQueue } from "../src/storage/writeQueue";
import { applyAction } from "../src/domain/actions";
import { emptyState, entriesForDate, materialize } from "../src/domain/schedule";
import { completion } from "../src/domain/progress";
import { addDays, dateKey } from "../src/utils/dates";
import { habit, seeded, TODAY } from "./fixtures";

test("rapid identical taps share one pending commit, distinct actions stay ordered", async () => {
  const queue = new WriteQueue();
  const order: number[] = [];
  const busy: boolean[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const first = queue.enqueue("same", async () => { await gate; order.push(1); return true; }, (b) => busy.push(b));
  const duplicate = queue.enqueue("same", async () => { throw new Error("duplicate write"); }, (b) => busy.push(b));
  const second = queue.enqueue("different", async () => { order.push(2); return true; }, (b) => busy.push(b));
  assert.equal(first, duplicate);
  release();
  await Promise.all([first, duplicate, second]);
  assert.deepEqual(order, [1, 2]);
  assert.equal(busy.at(-1), false);
  assert.ok(busy.slice(0, -1).every(Boolean));
});

test("failed queued write does not block retry or a later action", async () => {
  const queue = new WriteQueue();
  const fail = queue.enqueue("save", async () => { throw new Error("disk full"); }, () => {});
  const after = queue.enqueue("next", async () => true, () => {});
  await assert.rejects(fail, /disk full/);
  assert.equal(await after, true);
  assert.equal(await queue.enqueue("save", async () => true, () => {}), true);
});

test("rapid on/off/on preserves the final tap instead of coalescing across another action", async () => {
  const queue = new WriteQueue();
  const values: boolean[] = [];
  const tasks = [true, false, true].map((value) => queue.enqueue(String(value), async () => { values.push(value); return true; }, () => {}));
  await Promise.all(tasks);
  assert.deepEqual(values, [true, false, true]);
});

test("stale Done after rescheduling cannot complete a future occurrence", () => {
  const moved = applyAction(seeded(), { type: "reschedule", id: `read:${TODAY}`, habitId: "read", sourceDate: TODAY, date: addDays(TODAY, 1), time: "18:00", scope: "once" }, TODAY);
  assert.throws(() => applyAction(moved, { type: "status", id: `read:${TODAY}`, habitId: "read", date: TODAY, status: "done", busy: false }, TODAY), /changed/);
  assert.equal(entriesForDate(moved, addDays(TODAY, 1), TODAY)[0].status, "pending");
  assert.throws(() => applyAction(moved, { type: "amount", id: `read:${TODAY}`, habitId: "another", date: TODAY, amount: 5, busy: true }, TODAY), /changed/);
});

test("replaying restore on an active habit cannot rewrite a historical rule", () => {
  const s = seeded();
  assert.deepEqual(applyAction(s, { type: "restoreHabit", id: "read" }, TODAY), s);
});

test("all-future time change preserves queued habit edits and earlier history", () => {
  let s = seeded();
  s = applyAction(s, { type: "saveHabit", habit: habit({ name: "Read more", goal: { type: "duration", value: 30, unit: "min" } }) }, TODAY);
  s = applyAction(s, { type: "reschedule", id: `read:${TODAY}`, habitId: "read", sourceDate: TODAY, date: TODAY, time: "18:00", scope: "future" }, TODAY);
  const tomorrow = entriesForDate(s, addDays(TODAY, 1), TODAY)[0];
  assert.equal(tomorrow.snapshot.name, "Read more");
  assert.equal(tomorrow.target, 30);
  assert.equal(tomorrow.time, "18:00");
  assert.equal(s.habits[0].name, "Read more");
  assert.equal(entriesForDate(s, "2026-10-13", TODAY)[0].snapshot.name, "Read");
});

test("closed-app catch-up across month/year keeps pending today, missed past and future separate", () => {
  let s = applyAction(emptyState(), { type: "saveHabit", habit: habit({ createdAt: "2026-12-30" }) }, "2026-12-30");
  s = materialize(s, "2027-01-03");
  assert.equal(s.occurrences.length, 5);
  assert.equal(entriesForDate(s, "2027-01-02", "2027-01-03")[0].displayStatus, "missed");
  assert.equal(entriesForDate(s, "2027-01-03", "2027-01-03")[0].displayStatus, "pending");
  assert.equal(entriesForDate(s, "2027-01-04", "2027-01-03")[0].displayStatus, "pending");
  assert.equal(completion(s, ["2027-01-02", "2027-01-03", "2027-01-04"], "2027-01-03").total, 2);
  assert.deepEqual(materialize(s, "2027-01-03"), s);
});

test("local date keys follow device timezone on both sides of UTC midnight", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "Asia/Riyadh";
    assert.equal(dateKey(new Date("2026-10-14T22:30:00Z")), "2026-10-15");
    process.env.TZ = "America/Los_Angeles";
    assert.equal(dateKey(new Date("2026-10-15T02:30:00Z")), "2026-10-14");
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test("long history materialization keeps one visible entry per habit/day on replay", () => {
  let s = emptyState();
  for (let i = 0; i < 30; i++) s = applyAction(s, { type: "saveHabit", habit: habit({ id: `h${i}`, createdAt: addDays(TODAY, -59) }) }, TODAY);
  assert.equal(s.occurrences.length, 1800);
  assert.equal(new Set(s.occurrences.map((e) => `${e.habitId}:${e.date}`)).size, 1800);
  assert.deepEqual(materialize(s, TODAY), s);
  assert.equal(completion(s, [TODAY], TODAY).total, 30);
});
