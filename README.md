# Steady · Daily Routine & Habit Tracker

TypeScript + React Native + Expo SDK 57. Android is the product target, with an optional SQLite-backed browser preview.

Phase 2 and Phase 3 add real local habit/routine management, repeat schedules, progress recording, reschedule overrides, SQLite persistence, history and progress to the existing Phase 1 UI.

See [implementation and counting rules](docs/PHASE2-3.md) and [Android build, validation and manual checklist](docs/PHASE4.md).

Backup/Restore, original routine templates/Duplicate and daily habit notes are documented in [local data features](docs/LOCAL-DATA-FEATURES.md), with [dependency license notices](docs/THIRD-PARTY-NOTICES.md). The earlier Phase 4 APK does not contain these additions until rebuilt.

The simplified Today, habit details/actions, four-question form and agenda UI are documented in [UI changes and review checklist](docs/SIMPLIFIED-UI.md). Browser preview: `npm run web`; Android Expo Go preview: `npx expo start --android`.

The default appearance is the [classic Android-style UI](docs/CLASSIC-UI.md), with Today, Schedule, Progress and Settings tabs. Settings → Upgrade Premium now offers a [7-day Premium design trial](docs/PREMIUM-TRIAL.md), then returns automatically to Classic. The $4.99/month paid plan remains a demo with Coming soon. The previously built [1.0.1 APK](docs/APK-1.0.1.md) contains Classic and the local data features; rebuild to install the new trial feature.

The [October 19 usability update](docs/USABILITY-2026-10-19.md) adds consistent English screens in both themes, starter habit drafts and onboarding, quick count actions, a persisted focus timer, simpler progress summaries, and opt-in local reminders with snooze. Reminders require a new native build with the installed Expo Notifications module. No APK was created for this update.

```powershell
npm ci
npm start
npm run android
npm run web
```
