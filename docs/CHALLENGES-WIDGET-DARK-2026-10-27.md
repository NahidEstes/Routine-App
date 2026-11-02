# Challenges, achievements, Android widget and dark mode

Canonical project: `D:\My Projects\Routine App`. No APK, native compilation, cloud build or publication was started for this update. The existing 1.0.2 APK is unchanged; these additions require a later build to appear in that installation.

## Features

**Challenges:** Today and Profile → Your challenges. Create a named challenge linked to one existing habit, with a date picker, an inclusive 1–90 day period and a completed-day target. Current/Finished/Archived views, detail links to contributing records, rename/edit, archive/restore and archive Undo are provided. Upcoming challenges can change their rules; started challenges keep their habit, period and target. Starting a repeat creates a separate attempt beginning tomorrow, so today's completion is not reused accidentally. New targets must fit the habit's current schedule and remaining weekly credits. Later schedule edits and pauses do not extend a challenge automatically.

Progress is derived from existing saved completions, once per habit/local date: full and reduced Busy goals count; partial, skipped, excluded and future records do not. Reschedules count at their destination. Correcting/undoing a record updates challenge progress. No second completion counter, recurring engine or modified streak rule was introduced.

**Achievements:** The original 1/10/50 total completions and 7/30 scheduled-day best-streak thresholds remain. Four additional badges recognize:

- Welcome back: a daily habit completed after at least two missed scheduled days following earlier effort. Off-days and pauses do not create a break.
- Small is enough: a completed Busy goal genuinely smaller than the full goal.
- Your own pace: a new run beating an earlier finished streak of at least three scheduled days for the same daily habit.
- A promise to yourself: a completed personal challenge.

Details show contributing habit/challenge records and the earned local day where evidence exists, with working navigation. No exact completion timestamps are fabricated. Best streak and retained history preserve badges through later breaks; correcting supporting history still updates eligibility. Each challenge has its own small celebration, acknowledged atomically with progress. Undo/re-completion and reopening do not repeatedly celebrate the same challenge. Existing celebration preference, reduced motion and screen-reader behavior remain.

**Dark mode:** Profile → Settings → Appearance → System / Light / Dark. Available independently of the existing Premium trial, including both presentation styles. The shared palette covers screens, forms, date fields, sheets, tabs, primary buttons and status-bar foreground. Native app appearance and root background follow the selected mode. The versioned device preference survives reload and has save/load error feedback.

**Android home-screen widget:** Profile → Settings → Home-screen widget includes a live in-app preview and launcher instructions/pinning when supported. The native `RoutineToday` widget provides today's dated daily summary, timed/anytime/flexible weekly items, Boolean Done, Count +1, available completed-row Undo and duration/detail links. Its light/dark representations honor the saved preference. Refresh recomputes the local date; Android's periodic updates can be delayed. The date is visible and stale actions refresh rather than writing yesterday's work.

The widget uses `react-native-android-widget` 0.24.0 and its Expo config plugin, with Android-only headless registration in the custom entry file. Web and installations lacking the native widget module remain usable. The native module is absent in Expo Go and the previously built APK. Widget host rendering, pinning, resize/font handling and headless execution on Android have **not** been tested in a new binary, following the instruction not to build.

## Storage and concurrency

Challenge records and celebration acknowledgements extend the existing `habitFeatures` JSON in SQLite. Existing schema version 5 and historical entry snapshots are retained. Legacy feature rows receive empty defaults at read time without destructive migration. Backup exports now use format 3 and include challenges; formats 1 and 2 still import. The backup UI explains that profile/theme/reminder preferences and live timers remain device-local.

App commits and headless widget tasks share `trackerChannel` and the existing serialized write queue. A committed widget change updates the foreground provider before its next write. Widget count intents compare entry/date/status/amount/goal before applying the existing action; duplicate/stale taps cannot add twice or affect a moved occurrence. Reads do not publish unchanged state, avoiding a widget refresh loop. Shared busy subscriptions release the app's saving indicator even when a headless task finishes last. Failed saves do not publish uncommitted state.

## Verification

- TypeScript and Expo lint passed.
- All **121** Node tests passed, including 18 added challenge/widget/theme regression tests. Existing storage, migration, backup, schedule, timer, routine, streak and reminder tests remain enabled.
- Expo Doctor: **21/21 passed**.
- Expo config introspection passed with automatic appearance and the Android widget plugin. No generated native source was edited by hand.
- Android production JavaScript/Hermes bundle export passed. This verifies bundling, **not native compilation or installation**.
- Browser QA used the separate `127.0.0.1:8081` origin and existing QA fixtures. The user's `localhost` browser database and Android app data were not used for destructive tests.
- Checked challenge blank-name validation, create, completion/celebration, Undo/redo, suppressed repeat celebration, archive/restore, loaded edit values and cancel/keep-editing/save. Badge evidence opened the correct dated habit record. Widget preview Count +1 and exact Undo shared the same saved progress. Dark mode survived page reload.
- At 320×640, the widget setup/preview had no horizontal document overflow and all measured visible buttons met 48×48 CSS pixels. 360px browser screenshots are saved with the evidence. These browser checks do not establish native device accessibility/font behavior.
- Captured browser warning/error logs were empty during the checked flow. Evidence and command logs are in ignored `artifacts/challenges-widget-dark-2026-10-27/`.

## Preview and remaining checks

```powershell
Set-Location 'D:\My Projects\Routine App'
npm run web
```

Open `http://127.0.0.1:8081/` for the existing QA preview. Inspect Today/Profile → Your challenges, Profile → Achievements, and Profile → Settings → Appearance / Home-screen widget. Do not run `npm run android` merely to preview this update; that invokes a native build.

When an Android build is explicitly requested later, verify widget pinning and multiple copies, cold/background actions, update/Undo consistency with the app open, date rollover/timezone changes, expired intents, large fonts/resizing, launcher-specific rendering, and native date/time dialogs/system bars in each appearance mode. Native rendering/battery scheduling varies by launcher; the system can defer periodic refreshes. No physical device or new emulator binary was tested in this update.

References consulted: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [color themes](https://docs.expo.dev/develop/user-interface/color-themes/), [Android widget setup](https://saleksovski.github.io/react-native-android-widget/docs/tutorial/register-widget-expo), [widget actions](https://saleksovski.github.io/react-native-android-widget/docs/handling-clicks).
