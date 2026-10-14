export type DateKey = string;
export type HabitIcon =
  | "water-outline"
  | "barbell-outline"
  | "book-outline"
  | "walk-outline"
  | "document-text-outline"
  | "leaf-outline"
  | "sunny-outline"
  | "heart-outline";
export type Category = "Wellbeing" | "Movement" | "Learning" | "Mindfulness";
export type Goal = {
  type: "boolean" | "duration" | "count";
  value: number;
  unit: string;
};
export type Repeat = {
  type: "daily" | "days" | "weekly";
  days: number[];
  target: number;
};
export interface Habit {
  id: string;
  name: string;
  icon: HabitIcon;
  category: Category;
  goal: Goal;
  repeat: Repeat;
  time: string | null;
  busyGoal: number | null;
  createdAt: DateKey;
}
export type Status = "pending" | "done" | "skipped";
export interface Occurrence {
  id: string;
  habitId: string;
  date: DateKey;
  time: string | null;
  status: Status;
}
export interface RoutineStep {
  id: string;
  name: string;
  icon: HabitIcon;
  minutes: number;
  busyMinutes: number;
}
export interface Routine {
  id: string;
  name: string;
  subtitle: string;
  time: string;
  days: number[];
  steps: RoutineStep[];
}
export interface DemoState {
  habits: Habit[];
  occurrences: Occurrence[];
  routines: Routine[];
}
export type ScheduledItem = Occurrence & { habit: Habit };
