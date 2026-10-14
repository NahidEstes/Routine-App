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
  archivedAt?: DateKey;
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
  habitId?: string;
}
export interface Routine {
  id: string;
  name: string;
  subtitle: string;
  time: string;
  days: number[];
  steps: RoutineStep[];
  archivedAt?: DateKey;
}
export interface HabitVersion {
  id: string;
  habitId: string;
  effectiveFrom: DateKey;
  startDate: DateKey;
  habit: Habit;
}
export interface Entry extends Occurrence {
  sourceDate: DateKey;
  snapshot: Habit;
  amount: number;
  busy: boolean;
  target: number;
  excluded: boolean;
  rescheduled: boolean;
  weekly: boolean;
}
export interface WeeklyPlan {
  id: string;
  habitId: string;
  week: DateKey;
  target: number;
  snapshot: Habit;
}
export interface RoutineSession {
  id: string;
  routineId: string;
  name?: string;
  date: DateKey;
  busy: boolean;
  steps: RoutineStep[];
  completed: string[];
  ended: boolean;
}
export interface TrackerState {
  habits: Habit[];
  versions: HabitVersion[];
  occurrences: Entry[];
  routines: Routine[];
  weeklyPlans: WeeklyPlan[];
  sessions: RoutineSession[];
  busyDates: string[];
}
export type ScheduledItem = Entry & {
  habit: Habit;
  optional?: boolean;
  displayStatus: Status | "missed";
};
