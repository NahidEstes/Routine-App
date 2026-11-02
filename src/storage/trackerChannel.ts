import type { TrackerState } from "../models/types";
import { WriteQueue } from "./writeQueue";
/** App UI and Android headless widget tasks share one repository/commit lane. */
export class TrackerChannel {
  private busy = false;
  private busyListeners = new Set<(busy: boolean) => void>();
  readonly queue = new WriteQueue((busy) => {
    this.busy = busy;
    this.busyListeners.forEach((listener) => listener(busy));
  });
  private listeners = new Set<(state: TrackerState) => void>();
  subscribe(listener: (state: TrackerState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  subscribeBusy(listener: (busy: boolean) => void) {
    this.busyListeners.add(listener);
    listener(this.busy);
    return () => {
      this.busyListeners.delete(listener);
    };
  }
  publish(state: TrackerState) {
    this.listeners.forEach((listener) => listener(state));
  }
}
export const trackerChannel = new TrackerChannel();
