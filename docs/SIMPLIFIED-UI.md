# Simplified UI · 16 October 2026

Work lives in `D:\My Projects\Routine App`. All four PNGs in `design-reference/ui-simplified-2026-10-16` were opened and used as hierarchy/appearance references. Screens use React Native components, not screenshot backgrounds.

## What changed

- Today: compact date/week selection and completion bar, pending first, separate collapsible Completed and Skipped lists, one New habit button, routine entry, weekly-goal disclosure and a small Busy day / Day options entry.
- Habit rows: name opens details, checkbox for check-off goals, explicit Add progress for minutes/counts, visible ellipsis for Note, Reschedule, Skip, progress correction and Edit. Text and icons distinguish completed, skipped, missed and upcoming records.
- Details: the selected occurrence's repeat rule, date/time, recorded goal/progress and appropriate primary action. A moved occurrence follows its stable ID. Archived/off-day states have explicit explanations; existing archive/future/progress restrictions remain.
- Form: What will you do / How much / Which days / When first. More options retains icon, category, original start date and Busy day values while collapsed. All repeat/goal types remain. Validation appears beside its field and scrolls to it; hidden invalid options expand. Dates and times use Android pickers (browser inputs in web preview).
- Schedule: actual items grouped into nonempty agenda sections; no empty hourly grid. Day and Week remain interactive, with Anytime and selected-day flexible weekly goals reachable.
- Shared bottom sheets handle Android Back, close, backdrop cancel, scrolling, safe area and keyboard. New controls use at least 48dp touch targets. Habit rows move their primary action below the name at larger font scales. Completion/skip/progress feedback includes an Undo that restores the exact previous amount and recorded busy mode.

No SQLite schema, repository, backup format, recurring engine or progress formula was changed by this UI work. Existing notes, backup/restore, routine templates/duplicate, history and progress remain reachable. Tests use fixtures or separate test databases; existing user data was not reset. QA entries are confined to the emulator.

## Preview

```powershell
cd 'D:\My Projects\Routine App'
npm run web
# Android emulator / connected phone with compatible Expo Go:
npx expo start --android
```

During review, web runs at `http://localhost:8081` and Android Metro at `exp://127.0.0.1:8084`. Web SQLite data and the emulator's SQLite data are separate. The browser is a review preview, not an APK test. Existing APK artifacts predate this UI; this task does not build or publish an APK.

## Validation record

- TypeScript and Expo lint pass.
- 56 Node tests pass (51 existing + 5 UI interaction/presentation regressions). Coverage includes exact partial/over-goal/busy Undo, completed/skipped discoverability, agenda grouping, action availability, inline form validation, and the existing scheduling, notes, backup, migration and SQLite rollback/reopen cases.
- Expo Doctor: 21/21 checks pass. Expo dependency compatibility check passes after SDK 57 patch alignment (`expo ~57.0.30`, `expo-router ~57.0.28`). Android date/time picker 9.1.0 was installed with `expo install`; license notice is bundled in Settings and documented in THIRD-PARTY-NOTICES.
- Android 15 / API 35 Pixel_8 emulator using Expo Go: habit name → details; duration progress save and Undo; skip and Undo; boolean habit creation/completion; Completed expansion and card Undo; icon persistence through More options collapse; existing duration edit values; routine entry; Day/Week switching and Anytime agenda; date/time pickers; one-occurrence reschedule and all-future time change (including the following day's new time); upcoming progress disabled; hidden Busy day validation expands and scrolls into view.
- Browser entry HTML returns HTTP 200 and the web bundle compiles. Full browser interaction parity is not claimed.
- Small Android check: emulator at 720×1280 / 320dpi (360dp width), system font 150%. Today rows and tabs remain readable; the primary action moves to a second line. Progress sheet works with the numeric keyboard, scrolls to its lower controls, saves a Count busy-goal completion and earns one weekly credit. Hardware Back dismisses the action sheet. Count/weekly habit survives process restart. Emulator size, density and font were restored afterwards.
- Additional native regression: ellipsis opens and saves a daily note on a completed weekly record. Count/weekly edit loads the saved goal/unit/target; saving a renamed habit and reopening Edit loads the new name while the completed record for today keeps its original name, amount, busy goal, weekly credit and note. Save feedback explains the existing tomorrow/next-Monday rule.
- Final native checks: the compact completion feedback Undo returns the daily habit to pending and resets the completion summary. Today also opens the shared Reschedule sheet and Cancel closes it without changing the Anytime task. Progress tab and its Month selector remain functional.
- Physical Android phone and standalone APK testing remain unverified. No build/publication was started. `npm audit` still reports 30 dependency advisories (11 moderate, 19 high) in the existing Expo dependency tree; no incompatible force-upgrade was applied.

## Manual review checklist

1. On Today, check off a habit, expand Completed, undo it; skip from ellipsis, expand Skipped and undo. Confirm the summary follows the actual data.
2. Add minutes/count progress, correct a partial amount and use feedback Undo. Toggle Busy day; existing progress must keep its recorded goal.
3. Create/edit each goal type and daily/chosen-days/weekly repeats. Expand/collapse More options and reopen the saved edit form; confirm values. Try an empty name, no chosen days, invalid count and Busy goal larger than the full goal.
4. Open a name → details → ellipsis. Open/save a note, edit, cancel a sheet with Back, and verify future/archived restrictions.
5. In Schedule switch Day/Week, choose another day and inspect Anytime/weekly goals. Reschedule one occurrence and then a future rule; check source/destination and the next day. Existing history must remain unchanged.
6. Open routines/templates, History/Progress and Settings → Data & Backup. Review on a small screen with large system font, keyboard open and long names. Repeat on a physical Android phone before distributing a later build.
