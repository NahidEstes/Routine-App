# Modern Minimal Today · October 24, 2026

Canonical project: `D:\My Projects\Routine App`.

## Work resumed

The other chat was inspected before edits. It had already added initial Today cards, a large focus card, shared styling, floating actions and Schedule timeline code; its last report was 101 passing tests before interrupted browser verification. Those files were present locally. They were preserved, with a source snapshot and existing diff saved under ignored `artifacts/today-modern-2026-10-24/before/`.

This update finishes Today and related shared controls. It does not discard the other chat's Schedule/theme work, redesign Profile/Progress, start a new feature phase or build/publish an APK. Source reference images are saved in `design-reference/today-modern-2026-10-24/`.

## Finished UI

- Compact header, week strip and calendar sheet. The sheet contains previous/next week, selectable dates, the native/browser date field and Jump to today; selected non-today days are explicit.
- Small completion summary with one accessible progress bar. Daily counting remains separate from flexible weekly targets. Existing filters do not change the overall summary.
- Compact habit cards: count +1, boolean checkbox, duration Start/Manage, details on name tap and a visible options menu. Manual progress/correction, note, skip, reschedule, edit, priorities and pause entry points remain.
- A restrained Up next card promotes the earliest eligible timed task at/after the local display time. A current focus timer uses an explicit running/paused label. Overdue, untimed, future, excluded, paused, archived and weekly items are not incorrectly called an upcoming timed task. The highlighted occurrence is removed only from the remaining presentation list, retaining one shared record/action.
- Pending cards share one stable keyed sibling list, so changing the Up next presentation does not unmount an open menu/progress editor.
- Completed and skipped sections collapse separately, retain explicit status and allow Undo. Empty scheduled days have distinct copy. Routine, weekly goals, Busy day and habit management stay available.
- Narrow-card adjustments reduce crowding without cutting text. Large native font scales put primary actions on a separate row rather than forcing a fixed card height. Touch targets retain at least 48dp in styles.
- The floating Add habit action has bottom scroll clearance. Its timer clearance uses the dock's measured height; the timer's visibility and height are presentation-only provider state. The card's Manage action opens the same existing timer sheet. The floating action hides on native keyboard events and becomes an accessible icon button at very large native font scales.

Classic/Premium access, trial timestamps and storage are unchanged. Both existing palettes continue to apply. No new notification, snooze, permission, account, backend, billing or package was added.

## Data preservation

SQLite schema/migrations, backup formats, scheduler, recurrence, progress/streak calculations, write queue, timer receipts and achievement rules were not changed. No data reset, restore or destructive test was run against the user's database. Browser writes used the separate `127.0.0.1:8081` origin; the `localhost:8081` origin was used for read-only UI review. Opening the existing app naturally uses its unchanged date catch-up behavior.

The two timer presentation fields are not written to storage or included in backups. Timer start/pause/resume/record still use the existing functions and atomic recording flow.

## Verification

- TypeScript and lint pass.
- Expo Doctor passes all 21 checks; `git diff --check` passes. Logs are saved beside the screenshots.
- 103 automated tests pass: the prior 101 plus two focused regressions for overdue/Anytime/end-of-day exclusion, current-minute selection, archive/exclusion filtering, active Anytime timer identity and immutable input. The existing focus fallback expectation was corrected to match the requested behavior.
- The existing tests cover SQLite reopen/migrations/rollback, backup/restore, historical snapshots, weekly targets, busy goals, quick writes, exact Undo, timer receipts and reschedule scopes.
- Browser interaction checks: habit create; count progress 0→1→2; boolean Done/Undo; collapsed completed section; Skip and Undo from the expanded skipped section; Busy day changing an unrecorded duration target from 20→5 while the recorded count stays 2/8; Today-only reschedule 10:00→16:00; All future days 16:00→17:00 with the next day showing 17:00; future controls disabled; a single promoted habit card; card-name details; manual progress sheet and cancel; previous/next week and Jump to today; filter empty state and clear; routine list entry; timer Start/Manage/Pause/Resume/review/save of 0.3 minutes and exact Undo.
- A real local clock boundary was tested with a QA occurrence at 14:33. An unsaved progress draft of `3` stayed open and unchanged after 14:34 removed the Up next label and moved the card into Afternoon. The draft was canceled without recording it, and the QA schedule was returned to 17:00.
- 320px, 360px and 412px browser layouts were inspected. At 320px, the page has no horizontal document overflow and rendered button/checkbox targets measured at least 48×48 CSS pixels. Horizontal scrolling inside the week strip is intentional when seven 48dp targets cannot fit. At the end of the 412px list, the final Manage habits button ended around 741px and the floating Add habit button started around 775px, leaving the final action clear.
- With a running QA timer at 360px, the Add habit button bottom was 633px and the dock top was about 653px, leaving about 20px separation. Scroll padding permits the last rows to be brought above floating controls.

These are browser and automated checks, not a native Android pass. No physical device was connected. The existing Pixel 8 emulator was started and Expo Go launch attempted, but Android displayed `System UI isn't responding` before app flows could be verified. The emulator and its temporary Metro process were stopped without wiping data. Native keyboard, hardware Back, large system font and TalkBack remain manual checks. No native build was started.

## Preview

```powershell
cd 'D:\My Projects\Routine App'
npm run web
```

Open `http://localhost:8081/` for existing browser data. Use only one preview tab per origin because the existing SQLite web adapter can fail with `Invalid VFS state` when multiple tabs open the same database. `http://127.0.0.1:8081/` contains separate QA data and is not the user's original browser database. Android app data is separate from both.

Screenshots and check logs are in ignored `artifacts/today-modern-2026-10-24/`. The before screenshot shows the interrupted layout using existing data; demo screenshots use isolated QA data. They are not a controlled density comparison with identical habit lists.

## Remaining manual checks

- On a working Android device: small/large screens, increased system font, keyboard, native date picker cancel and hardware Back.
- TalkBack: checkbox/action labels, progress value, sheet focus and dismissal.
- All-completed and fresh-install onboarding screens with native text scaling.
- Longer routine/habit lists and background/reopen on an installed native build.
