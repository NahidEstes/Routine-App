# Steady · Daily Routine & Habit Tracker

TypeScript + React Native + Expo SDK 57. Android is the product target, with an optional SQLite-backed browser preview.

Phase 2 and Phase 3 add real local habit/routine management, repeat schedules, progress recording, reschedule overrides, SQLite persistence, history and progress to the existing Phase 1 UI.

See [implementation and counting rules](docs/PHASE2-3.md) and [Android build, validation and manual checklist](docs/PHASE4.md).

Backup/Restore, original routine templates/Duplicate and daily habit notes are documented in [local data features](docs/LOCAL-DATA-FEATURES.md), with [dependency license notices](docs/THIRD-PARTY-NOTICES.md). The earlier Phase 4 APK does not contain these additions until rebuilt.

The simplified Today, habit details/actions, four-question form and agenda UI are documented in [UI changes and review checklist](docs/SIMPLIFIED-UI.md). Browser preview: `npm run web`; Android Expo Go preview: `npx expo start --android`.

The default appearance is the [classic Android-style UI](docs/CLASSIC-UI.md), with Today, Schedule, Progress and Profile tabs. Profile → Settings → Upgrade Premium offers a [7-day Premium design trial](docs/PREMIUM-TRIAL.md), then returns automatically to Classic. The $4.99/month paid plan remains a demo with Coming soon. The previously built [1.0.1 APK](docs/APK-1.0.1.md) contains Classic and the local data features; rebuild to install newer features.

The [October 19 usability update](docs/USABILITY-2026-10-19.md) adds consistent English screens in both themes, starter habit drafts and onboarding, quick count actions, a persisted focus timer, simpler progress summaries, and opt-in local reminders with snooze. Reminders require a new native build with the installed Expo Notifications module. No APK was created for this update.

The [Profile and Achievements update](docs/PROFILE-ACHIEVEMENTS-2026-10-22.md) adds a device-local profile, weekly activity summary, filterable activity timeline, badge collection/details and a small optional celebration. Settings now opens inside Profile. Existing tracker storage, backups and achievement rules are unchanged. No APK was built for this update.

The [Modern Minimal Today update](docs/TODAY-MODERN-2026-10-24.md) continues the interrupted design work with compact cards, a smaller Up next highlight, calendar/week selection and an always-available Add habit button. Existing data, timer accounting, repeat rules and Classic/Premium trial behavior are preserved. No APK was built.

```powershell
npm ci
npm start
npm run android
npm run web
```
