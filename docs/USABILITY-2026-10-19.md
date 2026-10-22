# Routine App usability update

The existing project now uses English for all application copy. No new project, APK, native checkout, release, or deployment was created by this task.

## Everyday screens

- Classic remains the default. Its gray/blue Android-inspired appearance has clearer headings, slightly softened cards and larger secondary text. Premium retains ivory, sage, forest green and rounded cards.
- Both themes now use the same screen structure and action locations. Today groups pending daily habits into Morning, Afternoon, Evening and Anytime; Completed and Skipped expand independently. It shows real daily completion, remaining work, a small trial-status link, Add habit, weekly goals, routines and Busy day mode.
- Habit cards expose a boolean checkbox, a direct count increment, or a focus timer plus manual time entry. Details and secondary actions remain available. Changes retain Undo, including exact prior partial progress.
- Schedule retains Day/Week, real agenda sections, rescheduling and weekly goals. Rescheduling labels now distinguish “This occurrence” from “All future days.”
- Progress starts with a plain-language summary and daily habit highlights. Detailed charts, daily/weekly history, notes and statistics remain under View details and history. Weekly credits stay separate from daily completion. Comparisons use equal calendar spans, truncate a longer month to the shorter comparable span, and explain missing history. Most-consistent daily habits require at least three scheduled observations and one completion.

## Templates and onboarding

Five original templates cover water, reading, walking, exercise and planning. Template selection creates an editable draft and never writes a habit automatically. A new empty installation can select up to three starters and review/save their forms in sequence, create a custom habit or skip setup. Existing users with saved habits/routines are not forced into setup. Settings provides a Getting started link for later use. The guide explains habits versus routines.

## Focus timer

One persisted focus session can run at a time. It supports pause/resume, finishing with an editable confirmation amount, and explicit discard. It uses saved timestamps and accrued milliseconds, so backgrounding and reopening do not depend on interval ticks. Manual duration entry remains available. A session belongs to its original habit occurrence, including when it crosses midnight.

SQLite schema v4 adds only `timer_receipts`. Existing tracker records and backup format remain unchanged. Confirming time commits the progress snapshot and the unique session receipt in the same transaction. Retry after a crash or failure to clear the separate timer cannot credit that session twice. Receipt rows survive normal saves and imports; applying an old backup does not make an already-recorded timer replayable. Timer recording preserves previously recorded busy-goal semantics. Invalid, moved, completed or skipped occurrences fail visibly rather than silently rewriting them.

The active stopwatch UI updates once a second, while elapsed time is reconstructed from timestamps. A long-running session requires the user to review its amount; one confirmation accepts up to 1,440 minutes. Device clock changes are not trusted timekeeping.

## Local reminders

`expo-notifications ~57.0.23` was installed using Expo's SDK-compatible installer. The app config includes its plugin and the Android notification permission; the previous POST_NOTIFICATIONS block was removed. No push token, account, cloud service, exact-alarm permission or billing integration was added.

Settings → Reminders → Manage habit reminders lets users enable/disable each habit and choose a fixed custom time or follow the habit's schedule. Permission is requested only on Enable reminder. Denial leaves the habit usable and provides device-settings guidance. Browser preview explicitly reports reminders as unavailable.

The scheduler uses actual planned occurrences, including recurrence versions and one-off moves. It removes notifications for completed/skipped/archived tasks and reconciles owned identifiers without duplicating unchanged reminders. Fixed custom reminder times remain fixed during rescheduling; following the habit uses each occurrence's current time. Resuming the app rebuilds timestamps for the current timezone, and DST boundaries use local calendar construction.

Notifications offer “Snooze 10 min” where supported. It opens the app to process the action. Repeated snoozes replace one stable identifier, including across midnight, and stale schedule signatures cannot snooze changed tasks.

The rolling queue covers the next 30 calendar days, capped at 60 total scheduled reminders including retained snoozes. It refreshes on state/preference changes, app resume and while the app is active. The Settings message shows the last covered date and asks users to open the app regularly. If many habits fill the queue, coverage can be shorter than 30 days. Android battery restrictions can delay inexact reminders. Real delivery and notification-action behavior still need a native device test after the user's next build.

## Storage and trial

Onboarding, reminder preferences and the active timer use separate namespaced Expo SQLite key-value records. Habit backup imports do not reset these device preferences or the trial. These preferences and the active timer are not part of a portable habit backup. Storage failures show retry actions and do not silently reset a saved timer or preferences.

The existing seven-day trial remains one-time per app storage, lasts 168 hours and returns automatically to Classic. The $4.99/month plan remains a demo; paid upgrade remains Coming soon. Core features and saved data are available in both themes.

## Validation

- Expo lint and TypeScript checks pass.
- 73 Node tests pass, including existing schedules, history, notes, backups and trial tests. New tests cover template isolation, quick increments/Undo, stale actions, timer reconstruction, atomic receipt rollback/reopen/replay, v3 migration, reminder opt-in/cancellation/diffing, rescheduling, custom times, weekday rules, queue bounds, DST, snooze across midnight and comparable progress periods.
- Expo Doctor: 21/21 checks passed. Resolved public config confirms the notifications plugin and POST_NOTIFICATIONS permission, with exact-alarm permissions still blocked.
- Browser checks use isolated QA data on `http://127.0.0.1:8092`, separate from prior localhost and native data. Fresh Classic setup, sequential template drafts, quick increment/Undo, timer reload/review/save/Undo, Progress details and Premium activation were exercised at 360px/320px widths.
- No APK was built, as requested. Physical Android notification delivery and large native system-font behavior remain to be tested after a new build. Previously shared APKs do not contain this update.
