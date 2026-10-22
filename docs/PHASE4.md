# Android first build

The canonical project is `D:\My Projects\Routine App`. Android is the supported product. Browser preview is a development convenience.

## Identity and scope

Temporary name: **Routine App**, version **1.0.0 / 1**, package **com.nahid.steadyroutine**. No final icon/splash assets existed, so this build uses a temporary ivory/sage/forest-green leaf with an amber accent. `assets/icon.svg` is its editable source; `assets/icon.png` is the native asset. The existing database name and application ID are retained.

Fresh installs show empty states. No demo seed, account, notification, reminder, snooze, cloud sync, backend, or store submission is included. Archive is the supported removal action; it requires confirmation and preserves history. Standalone routine step completion is manual, not a timer.

## Fixes

- A habit draft keeps one ID. Save buttons latch immediately; the serialized write queue coalesces identical pending actions and keeps the saving state active until all queued writes finish. Failed writes leave committed data intact and do not block later retries.
- Stale actions after a reschedule cannot mark a moved future entry complete or change another habit. Reschedule is disabled until progress/skip/completion has been undone.
- All-future schedule changes preserve queued name/goal/rule revisions instead of reverting them to the selected occurrence's older snapshot.
- Replaying restore on an active habit cannot rewrite its versions. Repeated archive retains the original boundary. A failed database initialization closes its connection before retry.
- Routine details follow a new local day for new runs while retaining unfinished sessions on their recorded date, including reopening an unfinished session after a later-day launch.
- Date selectors scroll at narrow widths/large font sizes. Segmented controls stack with large fonts on small screens. Button labels wrap; icon targets are 48 dp; tabs have meaningful accessibility labels and accommodate larger text. Routine reorder/archive controls respect saving state.
- Materialization uses indexed occupied-day checks and skips already captured daily records, reducing repeated scans through long histories.

## Preview

```powershell
Set-Location 'D:\My Projects\Routine App'
npm ci
npm start
# Optional browser preview
npm run web
```

For an Android emulator whose adb reverse tunnel cannot connect to an IPv6-only localhost listener:

```powershell
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
npx expo start --android --localhost --port 8084
```

Expo Go/development testing and APK testing are separate verification targets.

## Rebuild the standalone APK

Requires JDK 17, Android SDK (platform 36/build tools 36), NDK 27.1.12297006, CMake 3.22.1, Node and installed npm dependencies. Initial Gradle builds download missing SDK/Maven components and can take considerable time. This environment's Java 25 failed native CMake configuration; Java 17 is the validated toolchain. A checksum-verified Temurin 17 download is available locally under ignored `artifacts/toolchain/jdk17`. The script uses the installed SDK 36 AAPT2 to avoid a Google Maven DNS failure encountered during this build.

```powershell
.\scripts\build-apk.ps1 -JavaHome 'D:\My Projects\Routine App\artifacts\toolchain\jdk17\jdk-17.0.20.1+1'
```

The script generates Android with Expo CNG and builds `assembleRelease` for **arm64-v8a** phones and **x86_64** emulators. It copies the APK to `artifacts/android/routine-app-1.0.0-preview.apk` and prints its SHA-256. It never edits generated native files by hand. The offline build config removes INTERNET, network-state, notification/alarm, external storage, overlay and vibration permissions. Normal development configuration retains Metro connectivity. Android backup is disabled; SQLite remains inside the app sandbox.

This is a personal testing build: release variant with embedded Hermes JS, signed using Expo's template debug certificate. It is not a store release or a private production signing identity. Generated native files and all keystores/APKs are ignored by Git. Use a privately managed signing identity before distributing a final release; keep the same package/signature to update without losing local data. Uninstalling removes local SQLite data; do not uninstall as an update step.

Install the APK from a file manager on an Android 7+ **64-bit ARM** phone, or use USB debugging:

```powershell
adb install -r '.\artifacts\android\routine-app-1.0.0-preview.apk'
```

No cloud account, paid build service, or Play Store publication is used.

## Verification record

Automated checks passed: **40 Node tests**, TypeScript, lint, and **Expo Doctor 21/21**. The native Expo SQLite isolated contract check passed v1→v2 migration, creation, busy progress, reschedule, close/reopen, history and transaction rollback in `steady-storage-validation.db`; the user's `steady-routine.db` is never reset by this check. Native UI QA records use explicit `QA` names entered only on the emulator.

The release APK build completed successfully (544 Gradle tasks, including release lint). `apksigner verify` passed with v2 signing. APK metadata confirms version 1.0.0/1, Android 7+ and ARM64/x86_64; only the app's signature-level dynamic-receiver permission is present. Size: **71,027,861 bytes**. SHA-256: `82C28AD5BB3C0052AED45766B636DF83E21BE84AD9CF0632E5FF0E03407C4F21`. Installation on the API 35 Pixel 8 emulator succeeded.

Native Expo Go UI checks passed habit creation (duration and weekly count), busy completion, Done/Undo/Skip/Undo skip, one-day and all-future rescheduling, routine creation and full/busy completion, navigation back, and Progress/History consistency. Two linked routine sessions earned one weekly habit credit. These development-client results are distinct from standalone APK verification below.

**Standalone APK on the API 35 emulator:** launched with Metro stopped; fresh empty state; boolean habit creation; Done/Undo/Skip/Undo skip; reschedule modal opened and dismissed with Android Back; native Gboard keyboard and resized form; blank-name validation; habit day-rule edit; archive confirmation and restore; Today/Schedule/Progress navigation; process stop/relaunch and same-APK `install -r` preserved the saved completion. Small-screen checks used 360×640 dp and 150% system font: horizontal date scrolling, stacked segmented controls, reachable bottom form controls and readable tabs. Display size, density and font settings were restored afterwards. No notification/permission prompt appeared. The temporary system-UI ANR during emulator boot was resolved by waiting; it was not an application crash. Final runtime UI checks used Android SDK UI automation after the optional agent-device helper's daemon failed to reconnect.

Evidence is local and ignored: `artifacts/phase4/apk-today.png`, `apk-small-largefont.png`, `apk-keyboard-native.png`, and UI XML snapshots. Screenshots establish only their captured states. A physical phone, every routine step-editing combination, and a live device-clock midnight transition have not been exhaustively exercised; the latter calendar/session cases have automated coverage.

## Remaining limits

- No physical Android phone is connected; real-device keyboard/IME, vendor battery behavior and device-specific font/inset checks require a phone.
- SQLite saves are atomic full snapshots. Very large multi-year histories may benefit from incremental persistence later; this build does not replace that architecture.
- The SDK-compatible dependency audit currently reports 29 advisories (18 high, 11 moderate), including development/transitive packages. No incompatible forced SDK downgrade/major upgrade has been applied. Raw report: ignored `artifacts/phase4-audit.json`.
- Native UI testing does not establish every hardware/font/timezone combination. Automated calendar tests cover local dates, DST, month/year catch-up, off-day streaks, weekly target boundaries, future exclusion and immutable history.

## Manual phone checklist

1. Fresh install: verify the empty Today/Schedule/Progress screens, leaf icon, ivory splash and no permission prompts. Use airplane mode for the rest of the checklist.
2. Create a boolean weekday habit, a daily duration habit, and a weekly count habit; reject blank/invalid name, count, date, time and busy-goal inputs. Edit a habit, verify the stated effective date and unchanged earlier history.
3. Record partial/full/busy amounts; test Done, Undo, Skip and Undo skip. Rapidly tap Save/Done and verify one habit and one completion per habit/day.
4. Move one occurrence from Today and inspect its destination in Schedule. Change all future schedules from Schedule. Confirm no duplicate source/destination, unchanged earlier records, and disabled future completion.
5. Create a routine with a standalone and a linked step; edit/reorder/remove steps, cancel editing, run full/busy sessions, leave/resume and finish. Verify a linked goal earns no duplicate Today credit.
6. Archive/cancel/restore a habit and a routine. Verify old history and completed routine sessions survive. Relaunch the app, background/foreground it, and install the same-signed APK over it with `adb install -r`; retain records.
7. Compare daily totals, weekly credits, chart, history and streaks. Inspect a past day, a future day, next week and next month. With a separate test device/data, cross midnight and several closed-app days; restore the device clock/timezone after testing.
8. Try a small screen and large system font, long names/lists, keyboard at the bottom of a form, hardware Back from details/modal/keyboard, and modal Cancel. Confirm all controls remain reachable and no text overlaps.
