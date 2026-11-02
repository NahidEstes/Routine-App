import type { ScheduledItem, TrackerState } from "../models/types";
import { completion } from "./progress";
import { entriesForDate } from "./schedule";
import { entryAccess, entryTarget } from "../presentation/habits";
import { formatTime } from "../utils/dates";
import type { Action } from "./actions";
export type WidgetRow = {
  id: string;
  habitId: string;
  date: string;
  name: string;
  detail: string;
  label: string;
  action: "done" | "undo" | "add" | "open";
  amount: number;
  target: number;
  busy: boolean;
  status: string;
  uri: string;
};
export function widgetModel(state: TrackerState, today: string, time: string) {
  const busy = state.busyDates.includes(today);
  const items = entriesForDate(state, today, today).filter(
    (i) =>
      !i.paused &&
      !i.excluded &&
      !state.habits.find((h) => h.id === i.habitId)?.archivedAt,
  );
  const pending = items
    .filter((i) => i.status === "pending")
    .sort(
      (a, b) =>
        (a.time ?? "24:00").localeCompare(b.time ?? "24:00") ||
        a.id.localeCompare(b.id),
    );
  const next = pending.find((i) => !!i.time && i.time >= time);
  const ordered = [
    ...(next ? [next] : []),
    ...pending.filter((i) => i.id !== next?.id),
    ...items.filter((i) => i.status === "done").slice(-1),
  ];
  const rows = ordered.slice(0, 2).map((item): WidgetRow => {
    const target = entryTarget(item, busy);
    const action =
      item.status === "done"
        ? "undo"
        : item.habit.goal.type === "boolean"
          ? "done"
          : item.habit.goal.type === "count"
            ? "add"
            : "open";
    return {
      id: item.id,
      habitId: item.habitId,
      date: today,
      name: item.habit.name,
      amount: item.amount,
      target,
      busy: item.amount > 0 || item.status === "done" ? item.busy : busy,
      status: item.status,
      detail: [
        item.status === "done" ? "Completed" : formatTime(item.time),
        item.habit.goal.type === "boolean"
          ? ""
          : `${item.amount}/${target} ${item.habit.goal.unit}`,
        item.weekly ? "Weekly goal" : "",
      ]
        .filter(Boolean)
        .join(" · "),
      label:
        action === "undo"
          ? "Undo"
          : action === "done"
            ? "Done"
            : action === "add"
              ? "+1"
              : "Open",
      action,
      uri: `steady-routine://habit-details?id=${encodeURIComponent(item.habitId)}&entryId=${encodeURIComponent(item.id)}&date=${today}`,
    };
  });
  const summary = completion(state, [today], today);
  return {
    date: today,
    summary,
    rows,
    nextId: next?.id,
    busy,
    pending: pending.length,
  };
}
/** Compare-and-set: stale/double-tapped widget intents cannot change another day/goal or add twice. */
export function actionFromWidget(
  state: TrackerState,
  data: Record<string, unknown>,
  today: string,
): Action | null {
  if (
    data.date !== today ||
    typeof data.id !== "string" ||
    typeof data.habitId !== "string"
  )
    return null;
  const item: ScheduledItem | undefined = entriesForDate(
    state,
    today,
    today,
  ).find((i) => i.id === data.id && i.habitId === data.habitId);
  if (
    !item ||
    !entryAccess(item, state, today).record ||
    entryAccess(item, state, today).archived ||
    item.amount !== data.amount ||
    item.status !== data.status
  )
    return null;
  const busy = state.busyDates.includes(today);
  if (
    entryTarget(item, busy) !== data.target ||
    (item.amount === 0 && item.status === "pending" && busy !== data.busy)
  )
    return null;
  if (data.action === "undo" && item.status === "done")
    return {
      type: "status",
      id: item.id,
      habitId: item.habitId,
      date: today,
      status: "pending",
      busy: item.busy,
    };
  if (item.status !== "pending") return null;
  if (data.action === "done" && item.habit.goal.type === "boolean")
    return {
      type: "status",
      id: item.id,
      habitId: item.habitId,
      date: today,
      status: "done",
      busy,
    };
  if (data.action === "add" && item.habit.goal.type === "count")
    return {
      type: "amount",
      id: item.id,
      habitId: item.habitId,
      date: today,
      amount: Math.min(item.amount + 1, entryTarget(item, busy)),
      busy: item.amount > 0 ? item.busy : busy,
    };
  return null;
}
