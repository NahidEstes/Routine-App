import type { ScheduledItem } from "../models/types";
import type { Action } from "../domain/actions";
import { entryAccess, previousProgressAction } from "../presentation/habits";
import { useTracker } from "../state/TrackerProvider";
export function useEntryActions(item: ScheduledItem) {
  const { state, dispatch, today, saving, notify } = useTracker();
  const access = entryAccess(item, state, today);
  const busy =
    item.amount > 0 || item.status === "done"
      ? item.busy
      : state.busyDates.includes(item.date);
  const base = { id: item.id, habitId: item.habitId, date: item.date };
  async function commit(action: Action, message: string) {
    if (saving) return false;
    const ok = await dispatch(action);
    if (ok)
      notify(`${item.habit.name}: ${message}`, previousProgressAction(item));
    return ok;
  }
  return {
    access,
    busy,
    saving,
    today,
    done: () =>
      commit({ type: "status", ...base, status: "done", busy }, "completed"),
    skip: () =>
      commit(
        { type: "status", ...base, status: "skipped", busy: false },
        "skipped",
      ),
    undo: () =>
      commit(
        { type: "status", ...base, status: "pending", busy: false },
        "progress cleared",
      ),
    amount: (amount: number, useBusy: boolean) =>
      commit(
        { type: "amount", ...base, amount, busy: useBusy },
        "progress saved",
      ),
    increment: () => commit({ type: "increment", ...base, delta: 1, busy }, "added 1"),
  };
}
