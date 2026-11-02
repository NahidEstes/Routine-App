# Routine App 1.0.2 — October 26, 2026

Canonical project: `D:\My Projects\Routine App`.

## Installable artifact

- APK: `artifacts/android/routine-app-1.0.2-preview.apk`
- Size: 73,008,557 bytes (73.0 MB).
- SHA-256: `51A14733EA2FC93F30087B867EE1C403F9B43FD96A0291113675B6D48DE4F93A`.
- Application ID: `com.nahid.steadyroutine`; version name/code: `1.0.2 / 3`.
- Android 7.0+ (API 24); ARM64 phones and x86_64 emulators. This APK does not include 32-bit ARM/x86 libraries.

Includes the current Modern Minimal Today, Schedule, Progress, Profile/activity timeline, Achievements and existing offline features from source commit `586c335`, plus version metadata updates. No database schema, business logic or stored preferences were changed for this build. The app name, icon and splash are retained.

Copy the APK to the phone and open it in the file manager. Allow installation from that source if Android requests it, then choose Install/Update. Keep the existing app installed: uninstalling deletes its local data. Expo Go and Metro are unnecessary.

## Signing and build

Local standalone release build using JDK 17, Android SDK 36, NDK 27.1.12297006 and the existing script:

```powershell
Set-Location 'D:\My Projects\Routine App'
.\scripts\build-apk.ps1 -JavaHome 'D:\My Projects\Routine App\artifacts\toolchain\jdk17\jdk-17.0.20.1+1'
```

Gradle `assembleRelease` succeeded in 18m 38s: 583 actionable tasks, including release vital lint. No cloud build, paid service or publication was used. Expo CNG regenerated native files; no native file was edited by hand.

This personal-testing APK retains the previous Expo template debug signing identity, matching both the local keystore backup and the 1.0.1 cloud APK. Certificate SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. It is not a private production signing identity. APKs, keystores and credentials remain ignored by Git.

## Checks performed

- TypeScript and Expo lint passed.
- All 103 existing tests passed; Expo Doctor passed 21/21 checks.
- `apksigner verify --verbose --print-certs` passed (v2 signature).
- `zipalign -c -P 16 4` passed.
- AAPT confirmed package/version, minimum/target SDK 24/36 and ARM64/x86_64 libraries. The release is not debuggable. The embedded Hermes bundle and assets are present.
- Final APK declares no INTERNET or ACCESS_NETWORK_STATE permission. Existing notification-related dependencies/permissions were retained; this task added no permission or feature. Complete permission output is saved with the evidence.
- API 35 Pixel 8 emulator: `adb install -r` successfully updated 1.0.1 to 1.0.2. The first-install timestamp remained October 14, 2026; the existing `QA_APK` habit and its pending state survived the update and force-stop/relaunch.
- Opened Today, Schedule, Progress, Profile and Achievements in the installed APK. Android Back returned from Achievements. Inspected the Today screenshot. No app fatal exception, missing-native-module error or React Native JS error was found in the captured app log.
- The emulator initially displayed a System UI ANR during boot; waiting resolved it before installation. No emulator wipe or app-data clear was performed. The emulator was stopped after verification.

Logs, metadata, UI XML and screenshots are under ignored `artifacts/apk-2026-10-26/`.

## Limits and phone checklist

No physical phone was attached. Native verification covered update, startup, saved-state retention and navigation; it did not re-test every feature or hardware combination. The existing automated suite covers the domain/storage regressions separately. Gradle/dependency deprecation warnings remain; they did not fail this build.

On the phone: verify the four tabs and Achievements; create/edit a test habit; try progress, Done/Undo, Skip/Undo and rescheduling; finish a routine; close/reopen and confirm saved records; check Profile activity and backup/export. Test with airplane mode, the keyboard open and a larger font setting. Use Update over the prior same-signed app rather than uninstalling.
