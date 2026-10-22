# Pause, organization, achievements and weekly reviews

Implemented in the existing app on 20 October 2026. English remains the default. Both Classic and Premium use the same features. No APK, native build, deployment, account service or new app dependency was created.

## Where to find the features

- **Settings → Vacation / Pause mode**, or **Habit options → Pause this habit**: pause one or several habits, or all currently active habits. Existing pause periods and Resume controls appear before the new-pause form.
- **Today / Schedule / Manage habits → Search, filter & sort**: search by name, filter by priority/type and choose scheduled time, priority or custom order. Clear filters is always available when filtering is active. Summaries remain unfiltered.
- **Settings / Manage habits → Priorities, pins & custom order**: High/Normal/Low priority, pinning, and accessible Move up/Move down buttons. Pins precede other sorting. Today and Schedule preserve their time-of-day groups and completed/skipped sections.
- **Progress → Achievements**: five badges, earned/upcoming states, progress and explanations.
- **Progress → Weekly review**: editable drafts, finished reviews, previous weeks, optional habit-editor actions, and a dismissible prompt for the last completed week with activity.

## Pause rules

Start and end dates are device-local calendar dates; both are included. A new pause can start today or later. The following day is active automatically, unless another pause covers it. Overlaps are a union. All habits means the active habits selected at confirmation; later-created habits are not silently added.

Paused dates do not create missed daily obligations, lower daily completion rates, increase daily streaks or break them. Existing completed/partial/skipped records and notes stay stored and can be viewed. Daily metrics omit paused records. Unrecorded paused opportunities are hidden. Recording and rescheduling are blocked on paused dates, including linked routine credits and delayed timer saves. Finish/save or discard an active timer before pausing its day.

Resume today removes coverage from today onward while preserving already elapsed paused dates. Cancelling a future pause removes it. Ending one overlapping pause does not end the others.

Flexible weekly targets use **ceil(original target × unpaused eligible days / all eligible days)**, with a floor equal to existing recorded completion credits and a ceiling equal to the original target. A fully paused week with no credits requires zero credits. Fully paused weeks are neutral in weekly streaks. The original stored commitment is never replaced by an adjusted target, so repeated reads and restarts cannot compound reductions. Existing weekly credits remain valid.

Reminders and snoozes for paused dates are removed by the existing scheduler; later eligible dates remain scheduled. Native delivery and Android system notifications still require device verification when a new APK is built.

## Achievement rules

Badges cover first, 10 and 50 total completions, plus 7 and 30 scheduled-day streaks for one non-weekly habit. Flexible weekly habits contribute to total completions, with weekly streak reporting retained separately. Partial progress, future entries and excluded records do not earn completion credit. Editing the same entry cannot create extra credit. Busy-goal completions count, matching existing habit semantics.

Eligibility is derived from retained history, including archived habits, and recalculates after Undo or restored data. Existing eligible badges are acknowledged on upgrade/load/restore without replaying celebrations. Once acknowledged, a badge does not celebrate again after reopening or an Undo/re-completion cycle. New achievements use a small dismissible notice. Reversing eligibility also removes stale notices. Timer completion, its unique receipt and achievement acknowledgement commit in one SQLite transaction.

## Weekly review rules

Weeks run Monday–Sunday, matching existing schedule/progress rules. One review is stored per Monday date. Each answer allows up to 2,000 characters. Drafts allow empty answers; finishing requires all three answers. Current and past weeks can be reviewed. Week navigation and app Back controls offer Save draft / Discard / Keep editing for unsaved changes.

The summary uses existing daily and weekly calculations and reflects current corrections. Answers never change goals or schedules. After saving, users can choose a habit and explicitly save changes in the existing editor; its usual future-effective rules remain in force. Reviews remain editable after finishing.

## Storage and backups

SQLite schema v5 adds default feature settings without removing existing records. Pauses, organization, manual order, filters, reviews and prompt/achievement acknowledgements are saved atomically with tracker data. Timer receipts and device-only reminder/timer/trial records retain their existing behavior.

New exports use backup format 2. Formats 1 and 2 can be imported; format 1 receives empty feature defaults. New feature records, relationships, ranges, enums, week identities and duplicate IDs are validated before replacement. Old app versions cannot read format 2. Backups remain replace-only and are not merged.

## Verification

- TypeScript typecheck and Expo lint pass.
- Full test suite: 89 passing tests, including 16 new planning tests. Tests cover overlapping/inclusive pauses, automatic/early resume, daily metrics and streak neutrality, weekly proportional targets and original commitment preservation, reminders/snoozes, rescheduling, linked routines/timers, sorting/filter persistence, milestone eligibility/Undo, review validation, old/new backups, schema migration, rollback and timer receipt/achievement atomicity.
- Browser QA used isolated `127.0.0.1:8093` data with sample habits; existing user/native data was not used. Classic at 360 × 800 and Premium at 320 × 740 were inspected. Verified custom order, high priority/pin, persistent search/filter after reload, a three-day single-habit pause, correct Today denominator, first achievement, review draft/save-and-navigate protection, finished review after reload, and early resume restoring the original pinned habit and goal.
- Proof images are in `artifacts/planning-2026-10-20/`.
- APK/native device checks were intentionally not run. When building later, check Android date pickers, Back navigation, pause reminder cancellation and resumption, notifications across midnight, and existing trial expiry.
