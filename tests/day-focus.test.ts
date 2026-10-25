import assert from "node:assert/strict";
import test from "node:test";
import { habit, seeded, TODAY } from "./fixtures";
import { itemsForDate } from "../src/domain/progress";
import { selectDayFocus, timelineOrder } from "../src/presentation/dayFocus";
import type { ScheduledItem } from "../src/models/types";

function item(
  id: string,
  time: string | null,
  patch: Partial<ScheduledItem> = {},
): ScheduledItem {
  const base = itemsForDate(seeded(), TODAY, TODAY)[0];
  return {
    ...base,
    id,
    habitId: id,
    habit: habit({ id, time }),
    time,
    ...patch,
  };
}
test("focus promotes the earliest upcoming habit, not an overdue one, without mutating the list", () => {
  const items = [
    item("water", "08:00"),
    item("plan", "20:00"),
    item("read", "10:00"),
  ];
  assert.equal(selectDayFocus(items, TODAY, TODAY, "09:41")?.id, "read");
  assert.deepEqual(
    items.map((i) => i.id),
    ["water", "plan", "read"],
  );
});
test("focus follows an active session and excludes completed, skipped, paused and weekly habits", () => {
  const items = [
    item("done", "10:00", { status: "done" }),
    item("skip", "10:00", { status: "skipped" }),
    item("pause", "10:00", { paused: true }),
    item("weekly", "10:00", { weekly: true }),
    item("future", "10:00"),
    item("running", "08:00"),
  ];
  assert.equal(
    selectDayFocus(items, TODAY, TODAY, "09:41", "running")?.id,
    "running",
  );
  assert.equal(selectDayFocus(items, TODAY, TODAY, "09:41")?.id, "future");
  assert.equal(
    selectDayFocus(items.slice(0, 4), TODAY, TODAY, "09:41"),
    undefined,
  );
});
test("focus stays within the supplied filtered list and is absent on past or future dates", () => {
  const items = [item("anytime", null), item("overdue", "08:00")];
  assert.equal(
    selectDayFocus(items, TODAY, TODAY, "21:00", "filtered-out"),
    undefined,
  );
  assert.equal(selectDayFocus(items, "2026-10-13", TODAY, "09:41"), undefined);
  assert.equal(selectDayFocus(items, "2026-10-15", TODAY, "09:41"), undefined);
  assert.equal(selectDayFocus([], TODAY, TODAY, "09:41"), undefined);
});

test("no Up next highlight for only overdue or anytime tasks, including at the end of the day", () => {
  assert.equal(
    selectDayFocus([item("late", "08:00")], TODAY, TODAY, "09:00"),
    undefined,
  );
  assert.equal(
    selectDayFocus([item("flexible", null)], TODAY, TODAY, "00:00"),
    undefined,
  );
  assert.equal(
    selectDayFocus([item("last", "23:58")], TODAY, TODAY, "23:59"),
    undefined,
  );
  assert.equal(
    selectDayFocus([item("now", "09:41")], TODAY, TODAY, "09:41")?.id,
    "now",
  );
});

test("excluded and archived entries are not promoted; an active anytime timer retains its identity", () => {
  const entries = [
    item("excluded", "09:41", { excluded: true }),
    item("archived", "09:41", {
      habit: habit({ id: "archived", archivedAt: TODAY }),
    }),
    item("timer", null),
  ];
  const before = JSON.stringify(entries);
  assert.equal(selectDayFocus(entries, TODAY, TODAY, "09:41"), undefined);
  assert.equal(
    selectDayFocus(entries, TODAY, TODAY, "09:41", "timer")?.id,
    "timer",
  );
  assert.equal(JSON.stringify(entries), before);
});
test("timeline orders actual occurrence times, retains ties and puts untimed habits last", () => {
  const items = [
    item("anytime", null),
    item("late", "20:00"),
    item("first", "08:00"),
    item("tie", "08:00"),
  ];
  assert.deepEqual(
    timelineOrder(items).map((i) => i.id),
    ["first", "tie", "late", "anytime"],
  );
  assert.equal(items[0].id, "anytime");
});
