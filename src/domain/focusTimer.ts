export type FocusSession = {
  id: string;
  entryId: string;
  habitId: string;
  date: string;
  name: string;
  elapsedMs: number;
  runningSince: number | null;
  busy: boolean;
};
export function elapsedTime(session: FocusSession, now: number) {
  return (
    session.elapsedMs +
    (session.runningSince === null
      ? 0
      : Math.max(0, now - session.runningSince))
  );
}
export function pauseTimer(session: FocusSession, now: number): FocusSession {
  return {
    ...session,
    elapsedMs: elapsedTime(session, now),
    runningSince: null,
  };
}
export function resumeTimer(session: FocusSession, now: number): FocusSession {
  return session.runningSince === null
    ? { ...session, runningSince: now }
    : session;
}
export function timerDisplay(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
