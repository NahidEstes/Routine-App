# Steady · Daily Routine — Phase 1

TypeScript + React Native + Expo SDK 57. Android is the target. Web is provided only as a convenient UI preview of the same React Native components. The six supplied PNGs guide the color, typography, spacing and card treatments; no screen uses a screenshot as its UI.

## Run

Use Node 22.13 or newer (Node 24 used during development).

```powershell
npm ci
npm start
```

Open the QR code with an SDK 57-compatible Expo Go on Android. Keep the phone and computer on the same network. If LAN access is unavailable, `npm start -- --tunnel` is an optional alternative.

```powershell
npm run android    # open Expo Go on a connected device/emulator
npm run web        # browser UI preview
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

## Implemented

- Today, Schedule and Progress tabs with native stack/back navigation.
- Shared date selection, morning/afternoon/evening/anytime groups, completion ring, collapsible sections, Done/Skip/Undo and Busy day goals.
- Day timeline and a scrollable Week agenda; recurring indicators and schedule entry point.
- Habit creation/editing/deletion with icon, category, boolean/duration/count goals, repeat controls, specific time/anytime and optional busy goal; input validation.
- Routine list, detail, creation/editing/deletion, ordered steps, duration editing, add/remove/reorder, full/busy modes and a manual Start routine walkthrough.
- Weekly/monthly progress, daily chart, consistency, streak and history from the shared mock state.
- Reschedule bottom sheet from Today and Schedule, selectable day, date/time input and Today only/All future days controls.
- Empty designs for unplanned dates, empty progress periods, missing habits/routines and routines without steps.
- Accessible control labels, minimum 44px touch controls, safe area, keyboard avoidance and scrolling forms/modals.

## Demo boundaries

This is Phase 1 only. Demo Today is fixed to Wednesday, October 14, 2026 to match the supplied references. The seed schedule is a finite October 2026 fixture. Dates outside that window show empty states. All changes are in memory; reload/restart resets the fixture.

- Every day/Choose days controls populate the finite fixture. Weekly goal stores a target and makes the habit available each day in that fixture; target-based scheduling and weekly-goal accounting are deferred.
- Done means the selected goal was met; duration/count controls do not collect measurements in this phase. Skip is incomplete, and can be undone. Busy mode changes displayed goals and does not rewrite history.
- Rescheduling preserves occurrence status. Moving onto a day already holding that habit merges the slots, preventing double counting. Today only moves the selected occurrence. All future days additionally changes the time of later fixture entries and the habit's time; it preserves repeat weekdays. This is a demo interaction, not a full recurring schedule engine.
- Editing a habit rebuilds its fixture slots from the form, preserving statuses by date. One-off reschedule overrides are not retained after a habit edit.
- Progress excludes dates later than demo Today. A streak means consecutive calendar days with at least one done habit; skips stay in the completion denominator. Routine walkthrough completion is independent of habit history and has no automatic timer.
- No notifications, reminders, permission prompts, snooze, SQLite, login, cloud sync or backend were added.

## Structure

```text
src/app/          Expo Router screens and layouts
src/components/   Shared controls, habit cards and reschedule sheet
src/models/       Typed habit, occurrence, routine and demo models
src/data/         Coherent finite sample fixtures
src/state/        Context, reducer and progress selectors
src/utils/        Date validation/formatting and demo utilities
src/theme.ts      Palette and reusable visual styles
tests/            Shared-state behavior checks
design-reference/ Original brief and six references, preserved
```

## Verification

`npm run typecheck`, `npm run lint`, six state tests and all 21 Expo Doctor checks passed. Metro successfully bundled Android. Browser previews at 320px and 360px were inspected, including tabs, Done/Busy mode, rescheduling from both entry points, form create/edit, routine add/edit/reorder/start/back and Today/Progress empty periods.

Browser preview is not a substitute for native-device validation. Android hardware Back, native keyboard behavior, system insets and installation/release builds have not been verified on a physical device. No Phase 2 engine or persistence work was started.

The SDK-compatible dependency tree reports 28 npm audit advisories (18 high, 10 moderate). The reported automated fixes involve incompatible Expo/React Native version changes; no forced SDK downgrade or upgrade was applied. These advisories remain an explicit dependency limitation for release preparation.
