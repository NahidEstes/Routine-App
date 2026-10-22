import type { Habit } from "../models/types";
import { createId } from "../utils/id";

export const habitTemplates = [
  {
    id: "water",
    name: "Drink water",
    icon: "water-outline",
    category: "Wellbeing",
    goal: { type: "count", value: 8, unit: "glasses" },
    time: "08:00",
    busyGoal: 3,
  },
  {
    id: "read",
    name: "Read a book",
    icon: "book-outline",
    category: "Learning",
    goal: { type: "duration", value: 20, unit: "min" },
    time: "10:00",
    busyGoal: 5,
  },
  {
    id: "walk",
    name: "Go for a walk",
    icon: "walk-outline",
    category: "Movement",
    goal: { type: "duration", value: 15, unit: "min" },
    time: "18:00",
    busyGoal: 5,
  },
  {
    id: "exercise",
    name: "Exercise",
    icon: "barbell-outline",
    category: "Movement",
    goal: { type: "duration", value: 20, unit: "min" },
    time: "07:30",
    busyGoal: 5,
  },
  {
    id: "plan",
    name: "Plan tomorrow",
    icon: "document-text-outline",
    category: "Mindfulness",
    goal: { type: "boolean", value: 1, unit: "" },
    time: "21:00",
    busyGoal: null,
  },
] satisfies {
  id: string;
  name: string;
  icon: Habit["icon"];
  category: Habit["category"];
  goal: Habit["goal"];
  time: string;
  busyGoal: number | null;
}[];

export function habitFromTemplate(
  id: string,
  today: string,
): Habit | undefined {
  const template = habitTemplates.find((t) => t.id === id);
  if (!template) return;
  return {
    ...template,
    id: createId("habit"),
    goal: { ...template.goal },
    repeat: { type: "daily", days: [0, 1, 2, 3, 4, 5, 6], target: 7 },
    createdAt: today,
  };
}
