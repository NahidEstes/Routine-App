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
  features: HabitFeatures;
  habits: Habit[];
  versions: HabitVersion[];
  occurrences: Entry[];
  routines: Routine[];
  weeklyPlans: WeeklyPlan[];
  sessions: RoutineSession[];
  busyDates: string[];
  notes: DailyNote[];
}
export interface DailyNote {
  entryId: string;
  habitId: string;
  text: string;
  updatedAt: string;
}
export type ScheduledItem = Entry & {
  paused?: boolean;
  habit: Habit;
  optional?: boolean;
  displayStatus: Status | "missed";
};

export type Priority = "high" | "normal" | "low";
export type HabitSort = "time" | "priority" | "custom";
export interface HabitPause {
  id: string;
  habitIds: string[];
  start: DateKey;
  end: DateKey;
  reason: string;
}
export interface WeeklyReview {
  week: DateKey;
  wentWell: string;
  obstacles: string;
  change: string;
  completed: boolean;
  updatedAt: string;
}
export interface HabitFeatures {
  pauses: HabitPause[];
  organization: { habitId: string; priority: Priority; pinned: boolean }[];
  order: string[];
  sort: HabitSort;
  search: string;
  priorityFilter: "all" | Priority;
  typeFilter: "all" | Goal["type"];
  reviews: WeeklyReview[];
  seenAchievements: string[];
  dismissedReviewWeeks: string[];
}
