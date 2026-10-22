export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export type PremiumTrial = {
  version: 1;
  startedAt: number;
  expiresAt: number;
  lastSeenAt: number;
};

export function parseTrial(raw: string | null): PremiumTrial | null {
  if (raw === null) return null;
  const value = JSON.parse(raw) as Partial<PremiumTrial> | null;
  if (
    !value ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.startedAt) ||
    value.startedAt! <= 0 ||
    !Number.isSafeInteger(value.expiresAt) ||
    value.expiresAt! - value.startedAt! !== TRIAL_DURATION_MS ||
    !Number.isSafeInteger(value.lastSeenAt) ||
    value.lastSeenAt! < value.startedAt!
  )
    throw new Error(
      "Your saved trial could not be read. Retry loading your appearance settings.",
    );
  return value as PremiumTrial;
}

export function trialStatus(trial: PremiumTrial | null, now: number) {
  if (!trial) return { active: false, used: false, remaining: 0, daysLeft: 0 };
  const remaining = Math.max(
    0,
    trial.expiresAt - Math.max(now, trial.lastSeenAt),
  );
  return {
    active: remaining > 0,
    used: true,
    remaining,
    daysLeft: Math.ceil(remaining / DAY_MS),
  };
}
