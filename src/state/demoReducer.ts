import type { DemoState, Habit, Routine, Status } from "../models/types";
import { demoOccurrences } from "../data/mock";

export type Action =
  | { type: "status"; id: string; status: Status }
  | { type: "saveHabit"; habit: Habit }
  | { type: "deleteHabit"; id: string }
  | { type: "saveRoutine"; routine: Routine }
  | { type: "deleteRoutine"; id: string }
  | {
      type: "reschedule";
      id: string;
      date: string;
      time: string;
      scope: "once" | "future";
    };

export function demoReducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case "status":
      return {
        ...state,
        occurrences: state.occurrences.map((item) =>
          item.id === action.id ? { ...item, status: action.status } : item,
        ),
      };
    case "saveHabit": {
      const exists = state.habits.some((h) => h.id === action.habit.id);
      const fresh = demoOccurrences(action.habit);
      const previous = state.occurrences.filter(
        (item) => item.habitId === action.habit.id,
      );
      return {
        ...state,
        habits: exists
          ? state.habits.map((h) =>
              h.id === action.habit.id ? action.habit : h,
            )
          : [...state.habits, action.habit],
        occurrences: [
          ...state.occurrences.filter(
            (item) => item.habitId !== action.habit.id,
          ),
          ...fresh.map((item) => ({
            ...item,
            status:
              previous.find((old) => old.date === item.date)?.status ??
              item.status,
          })),
        ],
      };
    }
    case "deleteHabit":
      return {
        ...state,
        habits: state.habits.filter((h) => h.id !== action.id),
        occurrences: state.occurrences.filter(
          (item) => item.habitId !== action.id,
        ),
      };
    case "saveRoutine":
      return {
        ...state,
        routines: state.routines.some((r) => r.id === action.routine.id)
          ? state.routines.map((r) =>
              r.id === action.routine.id ? action.routine : r,
            )
          : [...state.routines, action.routine],
      };
    case "deleteRoutine":
      return {
        ...state,
        routines: state.routines.filter((r) => r.id !== action.id),
      };
    case "reschedule": {
      const source = state.occurrences.find((item) => item.id === action.id);
      if (!source) return state;
      const collision = state.occurrences.find(
        (item) =>
          item.habitId === source.habitId &&
          item.date === action.date &&
          item.id !== source.id,
      );
      // Moving onto an existing fixture merges the two slots; never double-count a habit/day.
      return {
        ...state,
        habits:
          action.scope === "future"
            ? state.habits.map((h) =>
                h.id === source.habitId ? { ...h, time: action.time } : h,
              )
            : state.habits,
        occurrences: state.occurrences
          .filter((item) => item.id !== collision?.id)
          .map((item) =>
            item.id === source.id
              ? { ...item, date: action.date, time: action.time }
              : action.scope === "future" &&
                  item.habitId === source.habitId &&
                  item.date > source.date &&
                  item.date >= action.date
                ? { ...item, time: action.time }
                : item,
          ),
      };
    }
  }
}
