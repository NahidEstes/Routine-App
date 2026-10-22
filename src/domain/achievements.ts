import type { TrackerState } from "../models/types";
import { bestStreak } from "./progress";

export const achievementDefinitions = [
  {
    id: "first",
    name: "First small step",
    description: "Complete your first habit.",
    target: 1,
    metric: "completions",
  },
  {
    id: "ten",
    name: "Building momentum",
    description: "Complete habits 10 times in total.",
    target: 10,
    metric: "completions",
  },
  {
    id: "fifty",
    name: "Fifty small wins",
    description: "Complete habits 50 times in total.",
    target: 50,
    metric: "completions",
  },
  {
    id: "seven",
    name: "A steady rhythm",
    description: "Complete 7 scheduled days in a row for one daily habit.",
    target: 7,
    metric: "streak",
  },
  {
    id: "thirty",
    name: "A lasting rhythm",
    description: "Complete 30 scheduled days in a row for one daily habit.",
    target: 30,
    metric: "streak",
  },
] as const;
export function achievements(state: TrackerState, today: string) {
  const completions = new Set(
    state.occurrences
      .filter(
        (e) =>
          !e.excluded &&
          e.status === "done" &&
          e.amount >= e.target &&
          e.date <= today,
      )
      .map((e) => `${e.habitId}:${e.date}`),
  ).size;
  const streak = bestStreak(state, today);
  return achievementDefinitions.map((a) => {
    const current = a.metric === "streak" ? streak : completions;
    return { ...a, current, earned: current >= a.target };
  });
}
export function earnedAchievementIds(state: TrackerState, today: string) {
  return achievements(state, today)
    .filter((a) => a.earned)
    .map((a) => a.id);
}
export function baselineAchievements(state: TrackerState, today: string) {
  return {
    ...state,
    features: {
      ...state.features,
      seenAchievements: [
        ...new Set([
          ...state.features.seenAchievements,
          ...earnedAchievementIds(state, today),
        ]),
      ],
    },
  };
}
