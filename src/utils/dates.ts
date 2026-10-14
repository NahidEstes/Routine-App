import type { DateKey } from "../models/types";

export const DEMO_TODAY = "2026-10-14";
export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function parseDate(key: DateKey) {
  return new Date(`${key}T12:00:00`);
}
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(key: DateKey, count: number) {
  const date = parseDate(key);
  date.setDate(date.getDate() + count);
  return dateKey(date);
}
export function weekDates(key: DateKey) {
  const start = addDays(key, -((parseDate(key).getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
export function monthDates(key: DateKey) {
  const d = parseDate(key);
  const start = `${key.slice(0, 7)}-01`;
  return Array.from(
    { length: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() },
    (_, i) => addDays(start, i),
  );
}
export function longDate(key: DateKey) {
  return parseDate(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
export function shortDate(key: DateKey) {
  return parseDate(key).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
export function formatTime(time: string | null) {
  if (!time) return "Anytime";
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parseDate(value).getTime()) &&
    dateKey(parseDate(value)) === value
  );
}
export function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
