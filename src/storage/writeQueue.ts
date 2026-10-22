/** Serialize commits and coalesce repeated taps while the same action is pending. */
export class WriteQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private pendingCount = 0;
  private last: { key: string; promise: Promise<boolean> } | undefined;

  enqueue(key: string, task: () => Promise<boolean>, onBusy: (busy: boolean) => void) {
    // Only adjacent duplicates are the same tap. A → B → A must retain the last A.
    if (this.last?.key === key) return this.last.promise;
    this.pendingCount++;
    onBusy(true);
    const result = this.tail.then(task, task).finally(() => {
      this.pendingCount--;
      if (this.last?.promise === result) this.last = undefined;
      onBusy(this.pendingCount > 0);
    });
    this.last = { key, promise: result };
    this.tail = result;
    return result;
  }
}
