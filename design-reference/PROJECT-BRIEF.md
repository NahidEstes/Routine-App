# Routine App — agreed project brief

Build an Android daily routine and habit tracker using TypeScript, React Native, and Expo. Android is the current target; iPhone work is deferred.

Use the six PNG files in this directory as visual references. Preserve their warm ivory, forest green, sage, and amber style, rounded cards, readable typography, and spacing. These are design concepts; use coherent sample data while developing the UI.

## References

- 01-today.png: Today dashboard, scheduled habits, and completion checklist.
- 02-schedule.png: Date selection, timeline, and recurring schedules.
- 03-new-habit.png: Habit name, goal, repeat days, time, and optional busy-day goal. Omit reminder fields for the current version.
- 04-routine.png: Ordered routine steps, durations, and full/busy-day modes. Omit reminder controls for the current version.
- 05-progress.png: Weekly/monthly progress, history, and habit consistency.
- 06-reminder.png: Use only as a visual reference for rescheduling, including Today only versus All future days. Do not implement the reminder or snooze flow in this version.

## Current scope

Habit and routine creation, editing, and deletion; recurring day/time schedules; Today checklist; Done, Skip, and Reschedule; busy-day goals; SQLite persistence; history; weekly/monthly progress. Design clear rules for completion, skipping, date changes, and rescheduling so progress calculations remain consistent.

No notifications, notification permissions, reminders, or snooze in the current version. Login and cloud sync are deferred. The app should work offline and retain data after restart.

## Four large phases

1. Foundation and complete UI: Expo setup, shared design components, navigation, and all main screens with sample data. Deliver a reviewable app preview.
2. Core behavior: Habit/routine management, repeat schedules, Today items, completion/skip, and rescheduling for one day or future days. Deliver working core interactions.
3. Persistence and progress: SQLite storage, history, restart persistence, weekly/monthly metrics, and replacement of sample data with real user data. Deliver an offline usable app.
4. Android validation and first release: Real-device checks, screen/keyboard/back-button behavior, date rollover, recurring schedules, rescheduling, metric correctness, visual refinement, app identity, and an installable Android build. Prepare Play Store materials if requested; publication is not part of the current authorization.

Inspect the project and applicable repository instructions before implementing. Treat these PNGs as appearance references, not screenshots of existing implemented functionality.
