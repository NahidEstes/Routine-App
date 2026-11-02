import type { Entry, HabitChallenge, TrackerState } from "../models/types";
import {
  addDays,
  daysApart,
  datesBetween,
  validDate,
  weekDates,
} from "../utils/dates";
import { entriesForDate, weeklyPlan } from "./schedule";

export function availableChallengeDays(
  state: TrackerState,
  c: Pick<HabitChallenge, "habitId" | "start" | "end">,
  today: string,
) {
  if (
    !validDate(c.start) ||
    !validDate(c.end) ||
    c.end < c.start ||
    daysApart(c.start, c.end) > 89
  )
    return 0;
  let daily = 0;
  const weekly = new Map<string, number>();
  for (const date of datesBetween(c.start, c.end)) {
    const item = entriesForDate(state, date, today).find(
      (e) => e.habitId === c.habitId,
    );
    if (!item || (item.paused && item.status !== "done")) continue;
    if (!item.weekly) daily++;
    else {
      const week = weekDates(date)[0];
      weekly.set(week, (weekly.get(week) ?? 0) + 1);
    }
  }
  const done = completedDays(state.occurrences, today);
  for (const [week, days] of weekly) {
    const plan = weeklyPlan(state, c.habitId, week);
    const outside = done.filter(
      (e) =>
        e.weekly &&
        e.habitId === c.habitId &&
        weekDates(e.date)[0] === week &&
        (e.date < c.start || e.date > c.end),
    ).length;
    daily += Math.min(days, Math.max(0, (plan?.target ?? 0) - outside));
  }
  return daily;
}

/** One existing completion per local day; no parallel progress counter. */
export function completedDays(entries: Entry[], today: string) {
  const seen = new Set<string>();
  return entries
    .filter((e) => {
      const key = `${e.habitId}:${e.date}`;
      if (
        e.excluded ||
        e.date > today ||
        e.status !== "done" ||
        e.amount < e.target ||
        seen.has(key)
      )
        return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
export function challengeProgress(
  state: TrackerState,
  challenge: HabitChallenge,
  today: string,
) {
  const entries = completedDays(state.occurrences, today).filter(
    (e) =>
      e.habitId === challenge.habitId &&
      e.date >= challenge.start &&
      e.date <= challenge.end,
  );
  const current = entries.length;
  const completedOn = entries[challenge.target - 1]?.date;
  const status = completedOn
    ? "completed"
    : today < challenge.start
      ? "upcoming"
      : today > challenge.end
        ? "ended"
        : "active";
  return {
    current,
    percent: Math.min(100, Math.round((current / challenge.target) * 100)),
    completedOn,
    status,
    entries,
  };
}
export function validateChallenge(challenge: HabitChallenge) {
  if (
    !challenge.id ||
    !challenge.habitId ||
    !challenge.habitName?.trim() ||
    !challenge.name?.trim() ||
    challenge.name.length > 60
  )
    throw new Error(
      "Enter a challenge name (up to 60 characters) and choose a habit.",
    );
  if (
    !validDate(challenge.start) ||
    !validDate(challenge.end) ||
    challenge.start > challenge.end ||
    daysApart(challenge.start, challenge.end) > 89
  )
    throw new Error("Choose a challenge lasting between 1 and 90 days.");
  if (
    !Number.isInteger(challenge.target) ||
    challenge.target < 1 ||
    challenge.target > daysApart(challenge.start, challenge.end) + 1
  )
    throw new Error(
      "Target days must be a whole number within the challenge period.",
    );
  if (
    challenge.archived !== undefined &&
    typeof challenge.archived !== "boolean"
  )
    throw new Error("Invalid challenge archive status.");
  return challenge;
}
export type ChallengeAction =
  | { type: "saveChallenge"; challenge: HabitChallenge }
  | { type: "archiveChallenge"; id: string; archived: boolean };
export function nextChallengeDraft(
  previous: HabitChallenge,
  id: string,
  today: string,
): HabitChallenge {
  return {
    ...previous,
    id,
    start: addDays(today, 1),
    end: addDays(today, 1 + daysApart(previous.start, previous.end)),
    archived: false,
  };
}
export function applyChallengeAction(
  state: TrackerState,
  action: ChallengeAction,
  today: string,
): TrackerState {
  const list = state.features.challenges ?? [];
  if (action.type === "archiveChallenge") {
    if (!list.some((c) => c.id === action.id))
      throw new Error("This challenge is no longer available.");
    return {
      ...state,
      features: {
        ...state.features,
        challenges: list.map((c) =>
          c.id === action.id ? { ...c, archived: action.archived } : c,
        ),
      },
    };
  }
  const challenge = validateChallenge(action.challenge);
  const previous = list.find((c) => c.id === challenge.id);
  const rulesChanged =
    !previous ||
    previous.habitId !== challenge.habitId ||
    previous.start !== challenge.start ||
    previous.end !== challenge.end ||
    previous.target !== challenge.target;
  if (
    !previous &&
    (challenge.start < today ||
      !state.habits.some((h) => h.id === challenge.habitId && !h.archivedAt))
  )
    throw new Error("Choose an active habit and start today or later.");
  if (
    previous &&
    previous.start <= today &&
    (previous.habitId !== challenge.habitId ||
      previous.start !== challenge.start ||
      previous.end !== challenge.end ||
      previous.target !== challenge.target)
  )
    throw new Error(
      "A started challenge keeps its habit, dates and target. You can rename it or create a new challenge.",
    );
  if (
    previous &&
    previous.start > today &&
    rulesChanged &&
    (challenge.start < today ||
      !state.habits.some((h) => h.id === challenge.habitId && !h.archivedAt))
  )
    throw new Error("Choose an active habit and start today or later.");
  if (
    rulesChanged &&
    challenge.target > availableChallengeDays(state, challenge, today)
  )
    throw new Error(
      "This target exceeds the habit's scheduled days or remaining weekly credits. Choose fewer days or a longer period.",
    );
  return {
    ...state,
    features: {
      ...state.features,
      challenges: [
        ...list.filter((c) => c.id !== challenge.id),
        { ...challenge, name: challenge.name.trim() },
      ],
    },
  };
}
