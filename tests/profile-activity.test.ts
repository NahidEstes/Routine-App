import test from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "../src/domain/actions";
import { createBackup, parseBackup } from "../src/domain/backup";
import { achievements, baselineAchievements } from "../src/domain/achievements";
import {
  activityTimeline,
  profileSummary,
  finishedRoutine,
} from "../src/presentation/activity";
import {
  achievementHint,
  nextAchievement,
} from "../src/presentation/achievements";
import { defaultProfile, validateProfile } from "../src/domain/profile";
import { mark, seeded, habit, TODAY } from "./fixtures";
import type { RoutineSession } from "../src/models/types";

test("profile views preserve snapshots, weekly credits and the complete backup byte-for-byte", () => {
  let s = mark(seeded(), TODAY, "done", true);
  s = applyAction(
    s,
    {
      type: "saveHabit",
      habit: habit({
        name: "Read more",
        goal: { type: "duration", value: 30, unit: "min" },
      }),
    },
    TODAY,
  );
  s = applyAction(s, { type: "deleteHabit", id: "read" }, TODAY);
  const before = JSON.stringify(s);
  const feed = activityTimeline(s, TODAY);
  assert.equal(feed[0].title, "Read");
  assert.equal(feed[0].detail, "Completed · 5/5 min · Busy goal");
  assert.equal(profileSummary(s, TODAY).completions, 1);
  assert.equal(achievements(s, TODAY)[0].current, 1);
  assert.equal(JSON.stringify(s), before);
  assert.deepEqual(
    parseBackup(JSON.stringify(createBackup(s))).data,
    JSON.parse(before),
  );
});

test("Undo removes the completion from timeline and summary without replaying a seen achievement", () => {
  const s = baselineAchievements(mark(seeded(), TODAY), TODAY);
  assert.equal(activityTimeline(s, TODAY).length, 1);
  const undo = mark(s, TODAY, "pending");
  assert.equal(profileSummary(undo, TODAY).completions, 0);
  assert.equal(activityTimeline(undo, TODAY).length, 0);
  assert.equal(achievements(undo, TODAY)[0].earned, false);
  const again = mark(undo, TODAY);
  assert.deepEqual(
    achievements(again, TODAY).filter(
      (b) => b.earned && !again.features.seenAchievements.includes(b.id),
    ),
    [],
  );
});

test("timeline distinguishes skipped/partial work, excludes future and excluded work, and deduplicates completions", () => {
  const partial = applyAction(
    seeded(),
    {
      type: "amount",
      id: `read:${TODAY}`,
      habitId: "read",
      date: TODAY,
      amount: 3,
      busy: false,
    },
    TODAY,
  );
  assert.equal(activityTimeline(partial, TODAY)[0].status, "partial");
  assert.equal(profileSummary(partial, TODAY).completions, 0);
  const skipped = mark(partial, TODAY, "skipped");
  assert.equal(activityTimeline(skipped, TODAY)[0].status, "skipped");
  const done = mark(seeded(), TODAY);
  const entry = done.occurrences.find((e) => e.date === TODAY)!;
  done.occurrences.push(
    { ...entry, id: "duplicate" },
    { ...entry, id: "future", date: "2026-10-15" },
    { ...entry, id: "excluded", excluded: true, date: "2026-10-13" },
  );
  assert.equal(activityTimeline(done, TODAY).length, 1);
  assert.equal(profileSummary(done, TODAY).completions, 1);
});

test("rescheduled records appear only at their destination and retain the stable details target", () => {
  let s = applyAction(
    seeded(),
    {
      type: "reschedule",
      id: `read:${TODAY}`,
      habitId: "read",
      sourceDate: TODAY,
      date: "2026-10-15",
      time: "10:00",
      scope: "once",
    },
    TODAY,
  );
  const moved = s.occurrences.find((e) => e.id === `read:${TODAY}`)!;
  s = applyAction(
    s,
    {
      type: "status",
      id: moved.id,
      habitId: "read",
      date: moved.date,
      status: "done",
      busy: false,
    },
    "2026-10-15",
  );
  const feed = activityTimeline(s, "2026-10-15");
  assert.equal(feed.length, 1);
  assert.equal(feed[0].date, "2026-10-15");
  assert.match(feed[0].detail, /Moved from 2026-10-14/);
  assert.deepEqual(feed[0].target, {
    kind: "habit",
    entryId: `read:${TODAY}`,
    habitId: "read",
    date: "2026-10-15",
  });
});

test("notes use their real local save day, retain links to moved/excluded records, and vanish on deletion", () => {
  const oldTZ = process.env.TZ;
  try {
    process.env.TZ = "Asia/Riyadh";
    const s = seeded();
    const entry = s.occurrences.find((e) => e.date === TODAY)!;
    entry.excluded = true;
    s.notes.push({
      entryId: entry.id,
      habitId: entry.habitId,
      text: "Private note",
      updatedAt: "2026-10-13T22:30:00Z",
    });
    const feed = activityTimeline(s, TODAY);
    assert.equal(feed.length, 1);
    assert.equal(feed[0].date, TODAY);
    assert.equal(feed[0].kind, "note");
    assert.equal(feed[0].target.date, entry.date);
    assert.ok(
      !JSON.stringify(feed).includes("Private note"),
      "the timeline need not expose note contents",
    );
    s.notes.length = 0;
    assert.equal(activityTimeline(s, TODAY).length, 0);
  } finally {
    if (oldTZ === undefined) delete process.env.TZ;
    else process.env.TZ = oldTZ;
  }
});

test("profile week summary includes weekly completions once and counts only fully finished routine sessions", () => {
  const s = mark(
    seeded({
      repeat: { type: "weekly", target: 3, days: [0, 1, 2, 3, 4, 5, 6] },
    }),
    TODAY,
  );
  const session: RoutineSession = {
    id: "session",
    routineId: "routine",
    name: "Original routine",
    date: TODAY,
    busy: false,
    steps: [
      {
        id: "step",
        name: "Read",
        icon: "book-outline",
        minutes: 5,
        busyMinutes: 1,
      },
    ],
    completed: ["step"],
    ended: true,
  };
  s.sessions.push(
    session,
    { ...session, id: "ended early", completed: [] },
    { ...session, id: "running", ended: false },
    { ...session, id: "future", date: "2026-10-15" },
    { ...session, id: "previous week", date: "2026-10-11" },
  );
  assert.equal(finishedRoutine(session, TODAY), true);
  assert.deepEqual(profileSummary(s, TODAY), { completions: 1, routines: 1 });
  const routines = activityTimeline(s, TODAY).filter(
    (a) => a.kind === "routine",
  );
  assert.equal(routines.length, 4);
  assert.deepEqual(
    new Set(routines.map((a) => a.status)),
    new Set(["completed", "ended", "active"]),
  );
  assert.ok(routines.every((a) => a.title === "Original routine"));
  s.routines.length = 0;
  const historical = activityTimeline(s, TODAY).find(
    (a) => a.id === "routine:session",
  )!;
  assert.equal(historical.title, "Original routine");
  assert.deepEqual(historical.target, {
    kind: "routine",
    routineId: "routine",
    sessionId: "session",
    date: TODAY,
  });
});

test("next badge uses existing eligibility and describes a best streak without promising one more calendar day", () => {
  const badges = achievements(seeded(), TODAY);
  assert.equal(nextAchievement(badges)?.id, "first");
  const progress = badges.map((b) => ({
    ...b,
    current: b.metric === "streak" ? 6 : 1,
    earned: b.id === "first",
  }));
  const next = nextAchievement(progress)!;
  assert.equal(next.id, "seven");
  assert.match(achievementHint(next), /7 scheduled-day streak/);
  assert.ok(!achievementHint(next).includes("1 more"));
  assert.equal(
    nextAchievement(badges.map((b) => ({ ...b, earned: true }))),
    null,
  );
});

test("local profile validates optional fields and preferences without sharing mutable defaults", () => {
  const profile = validateProfile({
    ...defaultProfile,
    name: " Nahid ",
    intention: " A little reading ",
    avatar: "book",
    celebrations: false,
  });
  assert.deepEqual(profile, {
    name: "Nahid",
    intention: "A little reading",
    avatar: "book",
    celebrations: false,
  });
  const restored = validateProfile(JSON.parse(JSON.stringify(profile)));
  restored.name = "Other";
  assert.equal(profile.name, "Nahid");
  assert.equal(defaultProfile.name, "");
  for (const invalid of [
    null,
    {},
    { ...profile, name: "x".repeat(41) },
    { ...profile, intention: "x".repeat(141) },
    { ...profile, avatar: "unknown" },
    { ...profile, celebrations: "true" },
  ])
    assert.throws(() => validateProfile(invalid));
});
