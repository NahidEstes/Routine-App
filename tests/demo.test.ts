import assert from "node:assert/strict";
import test from "node:test";
import { createDemoState } from "../src/data/mock";
import { demoReducer } from "../src/state/demoReducer";
import { completion, itemsForDate } from "../src/state/selectors";
import {
  addDays,
  DEMO_TODAY,
  validDate,
  validTime,
  weekDates,
} from "../src/utils/dates";

test("Today and progress share the same completion data; skip and undo are reflected", () => {
  const seed = createDemoState();
  assert.deepEqual(completion(seed, [DEMO_TODAY]), {
    done: 3,
    total: 5,
    percent: 60,
  });
  const item = itemsForDate(seed, DEMO_TODAY).find(
    (i) => i.habitId === "walk",
  )!;
  const done = demoReducer(seed, {
    type: "status",
    id: item.id,
    status: "done",
  });
  assert.equal(completion(done, [DEMO_TODAY]).percent, 80);
  const skipped = demoReducer(done, {
    type: "status",
    id: item.id,
    status: "skipped",
  });
  assert.equal(completion(skipped, [DEMO_TODAY]).percent, 60);
  assert.equal(
    itemsForDate(skipped, DEMO_TODAY).find((i) => i.id === item.id)?.status,
    "skipped",
  );
  assert.equal(
    seed.occurrences.find((i) => i.id === item.id)?.status,
    "pending",
  );
});
test("one-off reschedule merges an existing target slot and preserves completion", () => {
  const seed = createDemoState();
  const source = itemsForDate(seed, DEMO_TODAY).find(
    (i) => i.habitId === "read",
  )!;
  const date = addDays(DEMO_TODAY, 1);
  const moved = demoReducer(seed, {
    type: "reschedule",
    id: source.id,
    date,
    time: "16:15",
    scope: "once",
  });
  assert.equal(itemsForDate(moved, DEMO_TODAY).length, 4);
  const target = itemsForDate(moved, date).filter((i) => i.habitId === "read");
  assert.equal(target.length, 1);
  assert.equal(target[0].status, "done");
  assert.equal(target[0].time, "16:15");
  assert.equal(
    itemsForDate(moved, addDays(date, 1)).find((i) => i.habitId === "read")
      ?.time,
    "08:00",
  );
});
test("future reschedule changes later fixture times but does not rewrite history", () => {
  const seed = createDemoState();
  const source = itemsForDate(seed, DEMO_TODAY).find(
    (i) => i.habitId === "walk",
  )!;
  const moved = demoReducer(seed, {
    type: "reschedule",
    id: source.id,
    date: DEMO_TODAY,
    time: "19:45",
    scope: "future",
  });
  assert.equal(
    itemsForDate(moved, addDays(DEMO_TODAY, 2)).find(
      (i) => i.habitId === "walk",
    )?.time,
    "19:45",
  );
  assert.equal(
    itemsForDate(moved, addDays(DEMO_TODAY, -1)).find(
      (i) => i.habitId === "walk",
    )?.time,
    "18:00",
  );
});
test("habit create, edit and delete update shared fixtures without duplicate slots", () => {
  const seed = createDemoState();
  const habit = {
    ...seed.habits[0],
    id: "new",
    name: "Journal",
    createdAt: DEMO_TODAY,
    time: null,
  };
  const created = demoReducer(seed, { type: "saveHabit", habit });
  assert.equal(itemsForDate(created, DEMO_TODAY).length, 6);
  assert.equal(itemsForDate(created, addDays(DEMO_TODAY, -1)).length, 5);
  const edited = demoReducer(created, {
    type: "saveHabit",
    habit: { ...habit, name: "Write a page", time: "22:00" },
  });
  assert.equal(
    itemsForDate(edited, DEMO_TODAY).filter((i) => i.habitId === "new").length,
    1,
  );
  assert.equal(
    itemsForDate(edited, DEMO_TODAY).find((i) => i.habitId === "new")?.habit
      .name,
    "Write a page",
  );
  const removed = demoReducer(edited, { type: "deleteHabit", id: "new" });
  assert.equal(itemsForDate(removed, DEMO_TODAY).length, 5);
});
test("routine steps remain independent and ordered across save", () => {
  const seed = createDemoState();
  const routine = seed.routines[0];
  const updated = { ...routine, steps: [...routine.steps].reverse() };
  const saved = demoReducer(seed, { type: "saveRoutine", routine: updated });
  assert.equal(saved.routines[0].steps[0].name, "Read a book");
  assert.equal(seed.routines[0].steps[0].name, "Drink water");
  assert.equal(saved.occurrences.length, seed.occurrences.length);
});
test("empty periods and invalid dates/times are handled; weeks start Monday", () => {
  const seed = createDemoState();
  assert.equal(itemsForDate(seed, "2026-11-01").length, 0);
  assert.deepEqual(completion(seed, ["2026-11-01"]), {
    done: 0,
    total: 0,
    percent: 0,
  });
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2026-10-14"), true);
  assert.equal(validTime("24:00"), false);
  assert.equal(validTime("23:59"), true);
  assert.equal(weekDates(DEMO_TODAY)[0], "2026-10-12");
});
