import {
  parseTrial,
  TRIAL_DURATION_MS,
  type PremiumTrial,
} from "../domain/premiumTrial";

export const PREMIUM_TRIAL_KEY = "routine.premium-design-trial.v1";
export interface TrialStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

// Separate from routine snapshots: importing a habit backup must not reset a trial.
export class PremiumTrialStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: TrialStorage) {}

  private serialized<T>(task: () => Promise<T>): Promise<T> {
    const pending = this.queue.then(task);
    this.queue = pending.catch(() => undefined);
    return pending;
  }

  refresh(now: number, start = false): Promise<PremiumTrial | null> {
    return this.serialized(async () => {
      const current = parseTrial(await this.storage.getItem(PREMIUM_TRIAL_KEY));
      if (!current && !start) return null;
      const next: PremiumTrial = current
        ? { ...current, lastSeenAt: Math.max(current.lastSeenAt, now) }
        : {
            version: 1,
            startedAt: now,
            expiresAt: now + TRIAL_DURATION_MS,
            lastSeenAt: now,
          };
      // Commit before granting access, including a watermark for an observed expiry.
      if (!current || current.lastSeenAt !== next.lastSeenAt)
        await this.storage.setItem(PREMIUM_TRIAL_KEY, JSON.stringify(next));
      return next;
    });
  }
}
