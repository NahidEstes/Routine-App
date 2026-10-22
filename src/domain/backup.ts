import type { TrackerState } from "../models/types";
import { daysApart, validDate, validTime, weekDates } from "../utils/dates";
import { clone } from "../utils/clone";
import { materialize } from "./schedule";
import { defaultFeatures } from "./organization";
import { achievementDefinitions } from "./achievements";

export const BACKUP_VERSION = 2;
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
export const NOTE_LIMIT = 2000;
function utf8Size(value: string) {
  let size = 0;
  for (const char of value) {
    const code = char.codePointAt(0)!;
    size += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return size;
}
export interface Backup {
  format: "routine-app-backup";
  formatVersion: 2;
  exportedAt: string;
  appVersion: string;
  data: TrackerState;
}
type Obj = Record<string, unknown>;
function fail(path: string): never {
  throw new Error(
    `Invalid backup: ${path}. Current data has not been changed.`,
  );
}
function obj(
  value: unknown,
  path: string,
  required: string[],
  optional: string[] = [],
): Obj {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail(path);
  const record = value as Obj;
  if (
    required.some((key) => !Object.hasOwn(record, key)) ||
    Object.keys(record).some(
      (key) => !required.includes(key) && !optional.includes(key),
    )
  )
    fail(`${path} fields`);
  return record;
}
function text(
  value: unknown,
  path: string,
  max = 1000,
  nonempty = true,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (nonempty && !value.trim())
  )
    fail(path);
}
function id(value: unknown, path: string): asserts value is string {
  text(value, path, 300);
}
function date(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !validDate(value)) fail(path);
}
function timestamp(value: unknown, path: string) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    fail(path);
}
function num(
  value: unknown,
  path: string,
  min = 0,
  integer = false,
  max = Number.MAX_SAFE_INTEGER,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    fail(path);
}
function bool(value: unknown, path: string) {
  if (typeof value !== "boolean") fail(path);
}
function one(value: unknown, allowed: readonly unknown[], path: string) {
  if (!allowed.includes(value)) fail(path);
}
function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value) || value.length > 100000) fail(path);
  return value;
}
function unique(values: unknown[], path: string) {
  if (new Set(values).size !== values.length) fail(`duplicate ${path}`);
}
const icons = [
  "water-outline",
  "barbell-outline",
  "book-outline",
  "walk-outline",
  "document-text-outline",
  "leaf-outline",
  "sunny-outline",
  "heart-outline",
];
function days(value: unknown, path: string, allowEmpty = false) {
  const list = array(value, path);
  if ((!list.length && !allowEmpty) || list.length > 7) fail(path);
  list.forEach((day) => num(day, path, 0, true, 6));
  unique(list, path);
}
function habit(value: unknown, path: string) {
  const h = obj(
    value,
    path,
    [
      "id",
      "name",
      "icon",
      "category",
      "goal",
      "repeat",
      "time",
      "busyGoal",
      "createdAt",
    ],
    ["archivedAt"],
  );
  id(h.id, path);
  text(h.name, `${path} name`, 60);
  one(h.icon, icons, `${path} icon`);
  one(
    h.category,
    ["Wellbeing", "Movement", "Learning", "Mindfulness"],
    `${path} category`,
  );
  date(h.createdAt, `${path} start date`);
  if (h.archivedAt !== undefined) date(h.archivedAt, `${path} archive date`);
  if (h.time !== null && (typeof h.time !== "string" || !validTime(h.time)))
    fail(`${path} time`);
  const goal = obj(h.goal, `${path} goal`, ["type", "value", "unit"]);
  one(goal.type, ["boolean", "duration", "count"], `${path} goal type`);
  num(
    goal.value,
    `${path} goal value`,
    Number.MIN_VALUE,
    goal.type !== "duration",
  );
  if (goal.type === "boolean" && goal.value !== 1) fail(`${path} boolean goal`);
  text(goal.unit, `${path} unit`, 100, goal.type !== "boolean");
  if (h.busyGoal !== null)
    num(
      h.busyGoal,
      `${path} busy goal`,
      Number.MIN_VALUE,
      goal.type !== "duration",
      goal.value,
    );
  const repeat = obj(h.repeat, `${path} repeat`, ["type", "days", "target"]);
  one(repeat.type, ["daily", "days", "weekly"], `${path} repeat type`);
  // Empty weekday snapshots represent an archived gap, retained by the schedule engine.
  days(repeat.days, `${path} weekdays`, repeat.type === "days");
  num(repeat.target, `${path} weekly target`, 1, true, 7);
  return h;
}
function steps(value: unknown, path: string, habits: Set<unknown>) {
  const list = array(value, path).map((item) => {
    const s = obj(
      item,
      path,
      ["id", "name", "icon", "minutes", "busyMinutes"],
      ["habitId"],
    );
    id(s.id, `${path} step ID`);
    text(s.name, `${path} step name`, 60);
    one(s.icon, icons, `${path} icon`);
    num(s.minutes, `${path} minutes`, Number.MIN_VALUE);
    num(
      s.busyMinutes,
      `${path} busy minutes`,
      Number.MIN_VALUE,
      false,
      s.minutes,
    );
    if (s.habitId !== undefined && !habits.has(s.habitId))
      fail(`${path} habit link`);
    return s;
  });
  unique(
    list.map((s) => s.id),
    `${path} step IDs`,
  );
  return list;
}

/** Treat imports as untrusted data. Validate before any database mutation. */
export function validateBackup(value: unknown): Backup {
  const b = obj(value, "file", [
    "format",
    "formatVersion",
    "exportedAt",
    "appVersion",
    "data",
  ]);
  if (b.format !== "routine-app-backup") fail("file format");
  if (b.formatVersion !== 1 && b.formatVersion !== BACKUP_VERSION)
    throw new Error(
      "Unsupported backup version. Use an app that supports this file; current data is unchanged.",
    );
  timestamp(b.exportedAt, "export date");
  text(b.appVersion, "app version", 50);
  const d = obj(
    b.data,
    "data",
    [
      "habits",
      "versions",
      "occurrences",
      "routines",
      "weeklyPlans",
      "sessions",
      "busyDates",
      "notes",
    ],
    ["features"],
  );
  if (b.formatVersion === 2 && !d.features) fail("missing feature data");
  const hs = array(d.habits, "habits").map((h) => habit(h, "habit"));
  unique(
    hs.map((h) => h.id),
    "habit IDs",
  );
  const habitIds = new Set(hs.map((h) => h.id));
  const versions = array(d.versions, "revisions").map((item) => {
    const v = obj(item, "revision", [
      "id",
      "habitId",
      "effectiveFrom",
      "startDate",
      "habit",
    ]);
    id(v.id, "revision ID");
    if (!habitIds.has(v.habitId)) fail("revision habit");
    date(v.effectiveFrom, "revision date");
    date(v.startDate, "revision start");
    if (v.id !== `${v.habitId}:${v.effectiveFrom}`) fail("revision identity");
    if (habit(v.habit, "revision snapshot").id !== v.habitId)
      fail("revision snapshot relationship");
    return v;
  });
  unique(
    versions.map((v) => v.id),
    "revision IDs",
  );
  unique(
    versions.map((v) => JSON.stringify([v.habitId, v.effectiveFrom])),
    "habit revision dates",
  );
  const versionHabits = new Set(versions.map((v) => v.habitId));
  if (hs.some((h) => !versionHabits.has(h.id))) fail("missing habit revision");
  const entries = array(d.occurrences, "records").map((item) => {
    const e = obj(
      item,
      "record",
      [
        "id",
        "habitId",
        "date",
        "time",
        "status",
        "sourceDate",
        "snapshot",
        "amount",
        "busy",
        "target",
        "excluded",
        "rescheduled",
        "weekly",
      ],
      ["habit", "optional", "displayStatus", "paused"],
    );
    id(e.id, "record ID");
    if (!habitIds.has(e.habitId)) fail("record habit");
    date(e.date, "record date");
    date(e.sourceDate, "record source day");
    if (e.id !== `${e.habitId}:${e.sourceDate}`) fail("record identity");
    if (e.time !== null && (typeof e.time !== "string" || !validTime(e.time)))
      fail("record time");
    const h = habit(e.snapshot, "record snapshot");
    if (h.id !== e.habitId) fail("record snapshot relationship");
    // Older app versions captured these derived display fields on weekly entries.
    if (
      e.habit !== undefined &&
      habit(e.habit, "display snapshot").id !== e.habitId
    )
      fail("display habit relationship");
    if (e.optional !== undefined) bool(e.optional, "optional record");
    if (e.paused !== undefined) bool(e.paused, "paused record");
    if (e.displayStatus !== undefined)
      one(
        e.displayStatus,
        ["done", "pending", "skipped", "missed"],
        "display status",
      );
    num(e.amount, "record amount", 0, (h.goal as Obj).type !== "duration");
    num(e.target, "record target", Number.MIN_VALUE);
    ["busy", "excluded", "rescheduled", "weekly"].forEach((key) =>
      bool(e[key], `record ${key}`),
    );
    one(e.status, ["done", "pending", "skipped"], "record status");
    if (
      (e.status === "done" && e.amount < e.target) ||
      (e.status === "pending" && e.amount >= e.target) ||
      (e.status === "skipped" && e.amount !== 0)
    )
      fail("record progress/status");
    if (
      e.target !== (e.busy ? h.busyGoal : (h.goal as Obj).value) ||
      e.weekly !== ((h.repeat as Obj).type === "weekly")
    )
      fail("record goal snapshot");
    return e;
  });
  unique(
    entries.map((e) => e.id),
    "record IDs",
  );
  unique(
    entries.map((e) => JSON.stringify([e.habitId, e.sourceDate])),
    "source records",
  );
  unique(
    entries
      .filter((e) => !e.excluded)
      .map((e) => JSON.stringify([e.habitId, e.date])),
    "scheduled habit/day",
  );
  const entryMap = new Map(entries.map((e) => [e.id, e]));
  const currentStepIds: unknown[] = [];
  const routines = array(d.routines, "routines").map((item) => {
    const r = obj(
      item,
      "routine",
      ["id", "name", "subtitle", "time", "days", "steps"],
      ["archivedAt"],
    );
    id(r.id, "routine ID");
    text(r.name, "routine name", 60);
    text(r.subtitle, "routine description", 500, false);
    if (typeof r.time !== "string" || !validTime(r.time)) fail("routine time");
    days(r.days, "routine weekdays");
    if (r.archivedAt !== undefined) date(r.archivedAt, "routine archive day");
    currentStepIds.push(
      ...steps(r.steps, "routine", habitIds).map((step) => step.id),
    );
    return r;
  });
  unique(currentStepIds, "routine step IDs");
  unique(
    routines.map((r) => r.id),
    "routine IDs",
  );
  const routineIds = new Set(routines.map((r) => r.id));
  const plans = array(d.weeklyPlans, "weekly commitments").map((item) => {
    const p = obj(item, "commitment", [
      "id",
      "habitId",
      "week",
      "target",
      "snapshot",
    ]);
    id(p.id, "commitment ID");
    if (!habitIds.has(p.habitId)) fail("commitment habit");
    date(p.week, "commitment week");
    if (weekDates(p.week)[0] !== p.week) fail("commitment week start");
    if (p.id !== `${p.habitId}:${p.week}`) fail("commitment identity");
    num(p.target, "commitment target", 1, true, 7);
    const h = habit(p.snapshot, "commitment snapshot");
    if (h.id !== p.habitId || (h.repeat as Obj).type !== "weekly")
      fail("commitment snapshot relationship");
    return p;
  });
  unique(
    plans.map((p) => p.id),
    "commitment IDs",
  );
  unique(
    plans.map((p) => JSON.stringify([p.habitId, p.week])),
    "habit/week commitments",
  );
  const sessions = array(d.sessions, "sessions").map((item) => {
    const s = obj(
      item,
      "session",
      ["id", "routineId", "date", "busy", "steps", "completed", "ended"],
      ["name"],
    );
    id(s.id, "session ID");
    if (!routineIds.has(s.routineId)) fail("session routine");
    if (s.name !== undefined) text(s.name, "session name", 60);
    date(s.date, "session day");
    bool(s.busy, "session mode");
    bool(s.ended, "session state");
    const ss = steps(s.steps, "session", habitIds);
    const stepIds = new Set(ss.map((step) => step.id));
    const completed = array(s.completed, "completed steps");
    unique(completed, "completed steps");
    if (completed.some((key) => !stepIds.has(key)))
      fail("completed step relationship");
    return s;
  });
  unique(
    sessions.map((s) => s.id),
    "session IDs",
  );
  unique(
    sessions
      .filter((s) => !s.ended)
      .map((s) => JSON.stringify([s.routineId, s.date])),
    "open routine sessions",
  );
  const busy = array(d.busyDates, "busy days");
  busy.forEach((v) => date(v, "busy day"));
  unique(busy, "busy days");
  const notes = array(d.notes, "notes").map((item) => {
    const n = obj(item, "note", ["entryId", "habitId", "text", "updatedAt"]);
    id(n.entryId, "note record ID");
    text(n.text, "note text", NOTE_LIMIT);
    timestamp(n.updatedAt, "note update date");
    const entry = entryMap.get(n.entryId);
    if (!entry || entry.habitId !== n.habitId) fail("note record relationship");
    return n;
  });
  unique(
    notes.map((n) => n.entryId),
    "note record IDs",
  );
  const features =
    d.features === undefined
      ? defaultFeatures()
      : validateFeatures(d.features, habitIds);
  return clone({
    ...(value as Backup),
    formatVersion: BACKUP_VERSION,
    data: { ...(b.data as TrackerState), features },
  });
}
function validateFeatures(value: unknown, habitIds: Set<unknown>) {
  const f = obj(value, "feature data", [
    "pauses",
    "organization",
    "order",
    "sort",
    "search",
    "priorityFilter",
    "typeFilter",
    "reviews",
    "seenAchievements",
    "dismissedReviewWeeks",
  ]);
  one(f.sort, ["time", "priority", "custom"], "habit sort");
  text(f.search, "habit search", 60, false);
  one(f.priorityFilter, ["all", "high", "normal", "low"], "priority filter");
  one(f.typeFilter, ["all", "boolean", "duration", "count"], "type filter");
  const pauses = array(f.pauses, "pauses").map((item) => {
    const p = obj(item, "pause", ["id", "habitIds", "start", "end", "reason"]);
    id(p.id, "pause ID");
    date(p.start, "pause start");
    date(p.end, "pause end");
    if (
      (p.end as string) < (p.start as string) ||
      (p.end as string) > "9999-12-30"
    )
      fail("pause date range");
    text(p.reason, "pause reason", 200, false);
    const ids = array(p.habitIds, "paused habits");
    if (!ids.length || ids.some((id) => !habitIds.has(id)))
      fail("pause habit relationship");
    unique(ids, "paused habits");
    return p;
  });
  unique(
    pauses.map((p) => p.id),
    "pause IDs",
  );
  const org = array(f.organization, "habit organization").map((item) => {
    const o = obj(item, "organization", ["habitId", "priority", "pinned"]);
    if (!habitIds.has(o.habitId)) fail("organization habit relationship");
    one(o.priority, ["high", "normal", "low"], "habit priority");
    bool(o.pinned, "pinned habit");
    return o;
  });
  unique(
    org.map((o) => o.habitId),
    "habit organization",
  );
  const order = array(f.order, "habit order");
  unique(order, "habit order");
  if (order.some((id) => !habitIds.has(id))) fail("habit order relationship");
  const reviews = array(f.reviews, "weekly reviews").map((item) => {
    const r = obj(item, "weekly review", [
      "week",
      "wentWell",
      "obstacles",
      "change",
      "completed",
      "updatedAt",
    ]);
    date(r.week, "review week");
    if (weekDates(r.week as string)[0] !== r.week) fail("review week start");
    bool(r.completed, "review status");
    timestamp(r.updatedAt, "review timestamp");
    ["wentWell", "obstacles", "change"].forEach((key) =>
      text(r[key], "review answer", 2000, r.completed === true),
    );
    return r;
  });
  unique(
    reviews.map((r) => r.week),
    "review weeks",
  );
  const seen = array(f.seenAchievements, "seen achievements");
  unique(seen, "seen achievements");
  seen.forEach((id) =>
    one(
      id,
      achievementDefinitions.map((a) => a.id),
      "achievement ID",
    ),
  );
  const dismissed = array(f.dismissedReviewWeeks, "dismissed review prompts");
  unique(dismissed, "dismissed review prompts");
  dismissed.forEach((w) => {
    date(w, "review prompt week");
    if (weekDates(w as string)[0] !== w) fail("review prompt week start");
  });
  return value as TrackerState["features"];
}
export function parseBackup(json: string): Backup {
  if (json.length > MAX_BACKUP_BYTES || utf8Size(json) > MAX_BACKUP_BYTES)
    throw new Error(
      "Backup is too large (20 MB limit). Current data is unchanged.",
    );
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("This file is not valid JSON. Current data is unchanged.");
  }
  return validateBackup(parsed);
}
export function createBackup(
  state: TrackerState,
  exportedAt = new Date().toISOString(),
): Backup {
  return parseBackup(
    JSON.stringify({
      format: "routine-app-backup",
      formatVersion: BACKUP_VERSION,
      exportedAt,
      appVersion: "1.0.0",
      data: state,
    }),
  );
}
export function prepareRestore(value: unknown, today: string): Backup {
  const backup = validateBackup(value);
  const calendarDays = backup.data.habits.reduce(
    (sum, h) => sum + Math.max(0, daysApart(h.createdAt, today) + 1),
    0,
  );
  if (calendarDays > 250000)
    throw new Error(
      "This backup needs more calendar processing than this version supports (250,000 habit-days). Current data is unchanged.",
    );
  return { ...backup, data: materialize(backup.data, today) };
}
export function backupCounts(backup: Backup) {
  const d = backup.data;
  return {
    Habits: d.habits.length,
    Routines: d.routines.length,
    "Schedule revisions": d.versions.length,
    "Day records": d.occurrences.length,
    "Weekly commitments": d.weeklyPlans.length,
    "Routine sessions": d.sessions.length,
    Notes: d.notes.length,
    "Busy days": d.busyDates.length,
    "Pause periods": d.features.pauses.length,
    "Weekly reviews": d.features.reviews.length,
  };
}
