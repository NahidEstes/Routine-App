import { clone } from "../utils/clone";
import type { DemoState, Habit, Routine } from "../models/types";
import { addDays, DEMO_TODAY, parseDate } from "../utils/dates";

const daily = {
  type: "daily" as const,
  days: [0, 1, 2, 3, 4, 5, 6],
  target: 7,
};
export const seedHabits: Habit[] = [
  {
    id: "water",
    name: "Drink water",
    icon: "water-outline",
    category: "Wellbeing",
    goal: { type: "count", value: 2, unit: "glasses" },
    repeat: daily,
    time: "07:00",
    busyGoal: 1,
    createdAt: "2026-10-01",
  },
  {
    id: "workout",
    name: "Morning workout",
    icon: "barbell-outline",
    category: "Movement",
    goal: { type: "duration", value: 20, unit: "min" },
    repeat: daily,
    time: "07:30",
    busyGoal: 5,
    createdAt: "2026-10-01",
  },
  {
    id: "read",
    name: "Read a book",
    icon: "book-outline",
    category: "Learning",
    goal: { type: "duration", value: 15, unit: "min" },
    repeat: daily,
    time: "08:00",
    busyGoal: 5,
    createdAt: "2026-10-01",
  },
  {
    id: "walk",
    name: "Go for a walk",
    icon: "walk-outline",
    category: "Movement",
    goal: { type: "duration", value: 20, unit: "min" },
    repeat: daily,
    time: "18:00",
    busyGoal: 5,
    createdAt: "2026-10-01",
  },
  {
    id: "plan",
    name: "Plan tomorrow",
    icon: "document-text-outline",
    category: "Mindfulness",
    goal: { type: "duration", value: 5, unit: "min" },
    repeat: daily,
    time: "21:30",
    busyGoal: 1,
    createdAt: "2026-10-01",
  },
];
const seedRoutines: Routine[] = [
  {
    id: "morning",
    name: "Morning routine",
    subtitle: "A fresh start",
    time: "07:00",
    days: [1, 2, 3, 4, 5],
    steps: [
      {
        id: "s1",
        name: "Drink water",
        icon: "water-outline",
        minutes: 2,
        busyMinutes: 1,
      },
      {
        id: "s2",
        name: "Stretch",
        icon: "walk-outline",
        minutes: 8,
        busyMinutes: 2,
      },
      {
        id: "s3",
        name: "Morning workout",
        icon: "barbell-outline",
        minutes: 20,
        busyMinutes: 5,
      },
      {
        id: "s4",
        name: "Read a book",
        icon: "book-outline",
        minutes: 15,
        busyMinutes: 5,
      },
    ],
  },
  {
    id: "evening",
    name: "Evening reset",
    subtitle: "Make space for tomorrow",
    time: "21:00",
    days: [0, 1, 2, 3, 4, 5, 6],
    steps: [
      {
        id: "e1",
        name: "Tidy your space",
        icon: "leaf-outline",
        minutes: 10,
        busyMinutes: 3,
      },
      {
        id: "e2",
        name: "Plan tomorrow",
        icon: "document-text-outline",
        minutes: 5,
        busyMinutes: 1,
      },
    ],
  },
];

// A finite fixture window, deliberately not a recurring schedule engine.
export function demoDates() {
  return Array.from({ length: 31 }, (_, i) => addDays("2026-10-01", i));
}
export function demoOccurrences(habit: Habit) {
  return demoDates()
    .filter(
      (date) =>
        date >= habit.createdAt &&
        (habit.repeat.type !== "days" ||
          habit.repeat.days.includes(parseDate(date).getDay())),
    )
    .map((date) => ({
      id: `${habit.id}:${date}`,
      habitId: habit.id,
      date,
      time: habit.time,
      status: "pending" as const,
    }));
}
export function createDemoState(): DemoState {
  return {
    habits: clone(seedHabits),
    routines: clone(seedRoutines),
    occurrences: seedHabits.flatMap((habit, index) =>
      demoOccurrences(habit).map((item) => ({
        ...item,
        status:
          item.date < DEMO_TODAY
            ? (parseDate(item.date).getDate() + index) % 5 === 0
              ? ("skipped" as const)
              : ("done" as const)
            : item.date === DEMO_TODAY && index < 3
              ? ("done" as const)
              : ("pending" as const),
      })),
    ),
  };
}
