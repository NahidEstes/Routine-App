import type { HabitIcon, Routine } from "../models/types";
import { clone } from "../utils/clone";
import { createId } from "../utils/id";

export type RoutineTemplate = {
  id: string;
  name: string;
  description: string;
  icon: HabitIcon;
  time: string;
  steps: {
    name: string;
    minutes: number;
    busyMinutes: number;
    icon: HabitIcon;
  }[];
};
// Original, editable examples written for this project. No habits are created.
export const routineTemplates: RoutineTemplate[] = [
  {
    id: "morning-start",
    name: "Morning Start",
    icon: "sunny-outline",
    time: "07:00",
    description:
      "Clear a little space, check in with yourself and choose a gentle starting point.",
    steps: [
      {
        name: "Open the curtains and settle in",
        minutes: 2,
        busyMinutes: 1,
        icon: "sunny-outline",
      },
      {
        name: "Have some water",
        minutes: 2,
        busyMinutes: 1,
        icon: "water-outline",
      },
      {
        name: "Choose one priority for today",
        minutes: 4,
        busyMinutes: 1,
        icon: "document-text-outline",
      },
    ],
  },
  {
    id: "reading-break",
    name: "Reading Break",
    icon: "book-outline",
    time: "12:00",
    description:
      "Make a short pocket of reading time and carry one thought back into your day.",
    steps: [
      {
        name: "Choose a book and a comfortable spot",
        minutes: 2,
        busyMinutes: 1,
        icon: "book-outline",
      },
      {
        name: "Read a few pages",
        minutes: 12,
        busyMinutes: 3,
        icon: "book-outline",
      },
      {
        name: "Pause to recall one idea",
        minutes: 3,
        busyMinutes: 1,
        icon: "leaf-outline",
      },
    ],
  },
  {
    id: "desk-reset",
    name: "Desk Reset",
    icon: "document-text-outline",
    time: "17:00",
    description:
      "Give your work surface a small reset and leave a clear next step for later.",
    steps: [
      {
        name: "Return loose items to their places",
        minutes: 4,
        busyMinutes: 1,
        icon: "leaf-outline",
      },
      {
        name: "Clear the space you use most",
        minutes: 3,
        busyMinutes: 1,
        icon: "document-text-outline",
      },
      {
        name: "Write down the next useful task",
        minutes: 2,
        busyMinutes: 1,
        icon: "document-text-outline",
      },
    ],
  },
  {
    id: "evening-wrap-up",
    name: "Evening Wrap-up",
    icon: "heart-outline",
    time: "21:00",
    description:
      "Notice what happened today, leave tomorrow a small cue and ease into the evening.",
    steps: [
      {
        name: "Look back at today's tasks",
        minutes: 4,
        busyMinutes: 1,
        icon: "document-text-outline",
      },
      {
        name: "Set out one thing for tomorrow",
        minutes: 4,
        busyMinutes: 1,
        icon: "leaf-outline",
      },
      {
        name: "Take a quiet moment to unwind",
        minutes: 3,
        busyMinutes: 1,
        icon: "heart-outline",
      },
    ],
  },
];
export function routineFromTemplate(template: RoutineTemplate): Routine {
  return {
    id: createId("routine"),
    name: template.name,
    subtitle: template.description,
    time: template.time,
    days: [0, 1, 2, 3, 4, 5, 6],
    steps: template.steps.map((step) => ({ ...step, id: createId("step") })),
  };
}
export function duplicateRoutine(routine: Routine): Routine {
  const { archivedAt: _archived, ...copy } = clone(routine);
  return {
    ...copy,
    id: createId("routine"),
    name: `${routine.name} (copy)`.slice(0, 60),
    steps: copy.steps.map((step) => ({ ...step, id: createId("step") })),
  };
}
