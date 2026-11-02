import type { TrackerState } from "../models/types";
import { entriesForDate } from "./schedule";
import { datesBetween } from "../utils/dates";
import { challengeProgress, completedDays } from "./challenges";

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
  {
    id: "comeback",
    name: "Welcome back",
    description:
      "Return to a daily habit after at least two missed scheduled days following an earlier completion. Off-days and pauses are neutral.",
    target: 1,
    metric: "comeback",
  },
  {
    id: "busy",
    name: "Small is enough",
    description:
      "Complete a reduced Busy day goal. A little effort still matters.",
    target: 1,
    metric: "busy",
  },
  {
    id: "personalBest",
    name: "Your own pace",
    description:
      "Beat an earlier finished streak of at least 3 scheduled days for the same daily habit.",
    target: 1,
    metric: "personalBest",
  },
  {
    id: "challenge",
    name: "A promise to yourself",
    description:
      "Finish a personal challenge using your existing habit completions.",
    target: 1,
    metric: "challenge",
  },
] as const;
export type AchievementEvidence = {
  date: string;
  title: string;
  detail: string;
  habitId?: string;
  entryId?: string;
  challengeId?: string;
};
export function achievements(state: TrackerState, today: string) {
  const done = completedDays(state.occurrences, today);
  const streakEvidence: Record<number, AchievementEvidence[]> = {
    7: [],
    30: [],
  };
  const comeback: AchievementEvidence[] = [],
    personalBest: AchievementEvidence[] = [];
  let best = 0;
  for (const habit of state.habits) {
    let run = 0,
      closedBest = 0,
      missed = 0,
      hasEarlierCompletion = false;
    for (const date of datesBetween(habit.createdAt, today)) {
      const item = entriesForDate(state, date, today).find(
        (e) => e.habitId === habit.id && !e.weekly,
      );
      if (!item || item.paused) continue;
      if (item.status === "done") {
        run++;
        const evidence = {
          date,
          title: item.snapshot.name,
          habitId: habit.id,
          entryId: item.id,
          detail: `${run} scheduled days in a row`,
        };
        if (run === 7 || run === 30) streakEvidence[run].push(evidence);
        if (closedBest >= 3 && run === closedBest + 1)
          personalBest.push({
            ...evidence,
            detail: `${run} scheduled days, beyond your earlier best of ${closedBest}`,
          });
        if (hasEarlierCompletion && missed >= 2)
          comeback.push({
            ...evidence,
            detail: `You returned after ${missed} missed scheduled days. Your earlier effort still counts.`,
          });
        hasEarlierCompletion = true;
        missed = 0;
      } else if (date < today || item.status === "skipped") {
        closedBest = Math.max(closedBest, run);
        run = 0;
        if (hasEarlierCompletion) missed++;
      }
      best = Math.max(best, run);
    }
  }
  const busy = done
    .filter((e) => e.busy && e.target < e.snapshot.goal.value)
    .map((e) => ({
      date: e.date,
      title: e.snapshot.name,
      habitId: e.habitId,
      entryId: e.id,
      detail: `${e.amount}/${e.target} ${e.snapshot.goal.unit} · reduced Busy day goal completed`,
    }));
  const challenge = (state.features.challenges ?? []).flatMap((c) => {
    const progress = challengeProgress(state, c, today);
    return progress.completedOn
      ? [
          {
            date: progress.completedOn,
            title: c.name,
            challengeId: c.id,
            detail: `${c.target} completed days · ${c.habitName} · ${c.start} to ${c.end}`,
          },
        ]
      : [];
  });
  const allEvidence = { comeback, personalBest, busy, challenge };
  return achievementDefinitions.map((a) => {
    const evidence: AchievementEvidence[] =
      a.metric === "completions"
        ? done
            .slice(0, a.target)
            .map((e) => ({
              date: e.date,
              title: e.snapshot.name,
              habitId: e.habitId,
              entryId: e.id,
              detail: `${e.amount}/${e.target} ${e.snapshot.goal.unit}${e.busy ? " · Busy day" : ""}`,
            }))
        : a.metric === "streak"
          ? streakEvidence[a.target]
          : allEvidence[a.metric];
    const current =
      a.metric === "completions"
        ? done.length
        : a.metric === "streak"
          ? best
          : evidence.length;
    const earned = current >= a.target;
    const sorted = [...evidence].sort((x, y) => x.date.localeCompare(y.date));
    const earnedOn = earned
      ? a.metric === "completions"
        ? sorted[a.target - 1]?.date
        : sorted[0]?.date
      : undefined;
    return { ...a, current, earned, evidence: sorted, earnedOn };
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
      seenChallengeWins: [
        ...new Set([
          ...(state.features.seenChallengeWins ?? []),
          ...completedChallengeIds(state, today),
        ]),
      ],
    },
  };
}
export function completedChallengeIds(state: TrackerState, today: string) {
  return (state.features.challenges ?? [])
    .filter((c) => challengeProgress(state, c, today).status === "completed")
    .map((c) => c.id);
}
