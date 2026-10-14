# Phase 2 + Phase 3 implementation

The Phase 1 React Native UI, palette, cards and Expo Router navigation have been retained. The October mock fixture and in-memory reducer have been replaced by a local schedule engine and SQLite repository. A fresh installation starts empty. No sample records are automatically inserted.

## Run

```powershell
npm ci
npm start
```

Use an SDK 57-compatible Expo Go on Android. Expo SQLite is bundled in Expo Go. Connect the phone to the same LAN and scan the QR code. `npm run android` opens a connected emulator/device. `npm run web` starts a browser preview using SQLite WASM/OPFS, with the required headers supplied by `metro.config.js`. Android is the supported product target; browser SQLite is an optional development preview. Keep only one browser preview tab open: OPFS takes an exclusive access handle for its database.

```powershell
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

## Functionality

- Create/edit/archive/restore habits with icon/category, boolean, duration or count goals, busy goals, start date, daily/weekday/weekly repeats, and specific time or Anytime.
- Record an absolute amount for duration/count, edit it up or down, mark done, skip, or undo. Completion follows the recorded goal threshold.
- Today/Schedule generate the selected local calendar day's records beyond any sample month. Future completion/skip is disabled. Background/foreground and a 30-second foreground poll update the local day after midnight; selecting past history is preserved during rollover.
- Today only reschedule stores an occurrence override. All future days creates a schedule revision effective from the selected occurrence. Moving chosen weekdays shifts them by the calendar-day difference; every-day habits remain daily. The changed schedule begins on the destination date. Earlier records retain their snapshots.
- A source disappears when moved. An empty destination slot for the same habit is merged into it; a destination containing completion, skip or progress is protected and the user must choose another date. Completed/skipped/partly recorded sources must be undone before moving. Moving one instance never modifies the repeat rule.
- Pending future overrides retain their chosen date/time but adopt edits to the future goal/repeat definition. Habit edits apply tomorrow; edits involving weekly repeat/target apply next Monday to keep an ongoing week's target stable. Each record snapshots its name, icon, goal, busy goal and repeat/time meaning. Archive stops future daily tasks after today, preserves history/current weekly commitments, and restore does not backfill obligations during the archived gap.
- Routine create/edit/archive/restore, add/remove/reorder steps, optional habit links, full/busy mode, persistent step sessions, resume and finish. Standalone steps have full/busy durations and are completed manually. Linked steps meet the habit's applicable goal on the routine date. They use the same habit/date entry as Today; repeated step or Today completion earns no second credit. A linked habit must be scheduled/available that day. Starting another session retains earlier ended sessions.
- Week/Month progress, daily chart, habit consistency, daily habit streaks, weekly streaks, day history links and routine session history. Archive retains historical contributions.

## Final counting rules

1. **Daily rate:** completed scheduled daily/weekday entries divided by all such entries through today, including today's pending and skips. Future days are excluded. Daily chart and daily summary use this identical rule. Off-days and explicitly moved-away/replaced entries do not create obligations.
2. **Pending/missed:** today's incomplete daily tasks are pending until the local day ends. Earlier incomplete daily tasks are missed. Skipped tasks are explicitly skipped, never completed or silently relabeled missed. Correcting progress on an earlier day can repair history.
3. **Weekly goal:** one credit per completed calendar day, capped at the frozen Monday–Sunday target. Flexible opportunities appear separately and are never added to the daily denominator. The first partial week's target is capped at the number of available active days. Current weeks remain open; missing credits are counted only after Sunday. Month view displays complete weekly targets for every week touching the selected month, including boundary weeks; it does not prorate a weekly target into daily obligations.
4. **Consistency:** daily completed/planned counts plus weekly earned/target credits for the selected period. Switching repeat type therefore preserves both historical meanings. Weekly consistency is target-based, not a seven-day checklist.
5. **Streak:** a daily habit's consecutive completed scheduled entries; unscheduled dates pause rather than break it. A skipped or missed scheduled entry breaks the run. Today's pending entry does not break it before day-end. The dashboard shows the best such run for one habit, in scheduled days. Weekly streaks count consecutive target-met active weeks; inactive weeks pause and an ended, unmet week breaks the run.
6. **Busy day:** each progress record stores the actual full/busy threshold used. A busy goal completion earns one completion/credit and is separately labeled/countable in history. Toggling the mode later does not rewrite an existing completion. Habits without a busy goal retain their full threshold.
7. **Routines:** standalone steps count in routine history only. Linked steps update an existing habit/day record, never an extra completion source. A linked weekly target that is already met lets the routine step finish without another credit. Routine sessions and habit rates are displayed separately.

## Storage and code

- `src/domain/`: pure schedule projection, snapshots, actions, weekly targets and metrics.
- `src/storage/`: Expo SQLite adapter, typed SQL interface, repository, and two versioned transactional migrations using `PRAGMA user_version`.
- SQLite tables store habits, effective schedule versions, daily entry snapshots/amounts/overrides, routines, weekly commitments, settings and routine sessions. Foreign keys and unique indexes protect identities and ensure one visible habit/day row.
- Multi-record writes commit atomically. The provider serializes writes, publishes only after a successful save, and shows loading/error/retry/saving feedback. Failed writes preserve the last committed state. Saves currently write a complete atomic snapshot; incremental writes may be useful for very large histories.
- `src/screens/` and `src/components/`: UI using the same existing warm ivory/forest green/sage/amber theme.
- No notifications, reminders, snooze, runtime notification permissions, login, cloud sync or backend. No Phase 4 release or publication steps.

## Verification and practical limits

Meaningful tests cover recurrence beyond a month, weekday exclusions, local calendar/DST/year rollover, full/busy thresholds, skip/undo, one-day/future reschedule, collision protection, immutable past snapshots, archive/restore gaps, weekly targets and streaks, routine deduplication, real SQLite close/reopen, v1→v2 migration, future-schema protection and atomic rollback.

31 Node tests pass, including four tests against real SQLite databases through the production repository. TypeScript, Expo lint and all 21 Expo Doctor checks pass. Browser preview checks use persisted data in an actual WASM SQLite database, not a mock storage adapter: create → busy progress → reload, Undo → reschedule → destination schedule, weekly goal creation/completion, linked routine completion → Today → Progress/history. Browser test habit names start with “Demo” and were entered once through the UI; Android has its own database. Physical Android keyboard, system inset and hardware Back checks have not been verified. The emulator was launched but did not complete the app loading/storage contract check; no native check pass is claimed.

An opt-in native storage contract check is included for Expo development. It uses **steady-storage-validation.db**, never the user's **steady-routine.db**:

```powershell
$env:EXPO_PUBLIC_STORAGE_CHECK = '1'
npm run android
# Look for STEADY_SQLITE_CHECK_PASS / STEADY_SQLITE_CHECK_FAIL in Metro logs.
# Remove the flag for normal usage:
Remove-Item Env:EXPO_PUBLIC_STORAGE_CHECK
```

The existing SDK-compatible dependency tree still reports 28 npm audit advisories (18 high, 10 moderate); incompatible forced Expo/React Native changes were not applied. Browser SQLite support is experimental upstream. There is no automatic routine timer: step completion is manual.
