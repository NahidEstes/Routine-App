# Profile, activity and Achievements · October 22, 2026

Implemented in `D:\My Projects\Routine App`. No account, cloud profile, new permissions, paid service, APK build or publication was introduced.

## What changed

- Navigation: Today · Schedule · Progress · **Profile**. Profile's gear opens the existing Settings screen, including backup, appearance, reminders and license notices. Progress keeps all analytics/history and links to the full Achievements collection.
- Profile: optional name, intention, five icon avatars, a celebration preference, current-week habit completions and fully finished routine sessions. Default profile works without entering a name.
- Activity: All/Habits/Routines/Notes filters, day groups, explicit completion/partial/skip status, busy and weekly labels, moved-task information, meaningful empty states and eight-at-a-time rendering. Habit and note rows open the corresponding saved record. Routine rows open recorded steps/durations/completion/mode in a dismissible sheet; removed routines do not open a blank creation form.
- Achievements: distinct illustrated medallions, earned/upcoming text and icons, accessible progress indicators, next milestone, All/Earned/Upcoming filters, badge details and an earned preview on Profile. One-column collection on narrow screens or large font scales. Both existing Classic and Premium palettes are respected.
- Celebration: one global, dismissible banner with a brief entrance and badge-details link. It respects Reduce Motion and the profile preference. No looping animation, sound, vibration or permission request. Automatic timeout uses Android's accessibility recommendation; screen-reader users can dismiss manually. If accessibility capability detection is unavailable, the conservative fallback stays static and manually dismissible.

## Data and counting guarantees

Tracker SQLite schema **4**, migration SQL, backup format **2**, schedule generation, progress/streak rules and all five achievement IDs/thresholds are unchanged. The existing saved acknowledgement prevents repeatedly celebrating old badges on restart, restore or Undo/Done. Undo still recalculates current badge eligibility and removes invalid pending celebration notices.

The three completion badges require 1, 10 and 50 unique, non-excluded completed habit/day records, including weekly and busy-goal completions. The two streak badges use the existing best-ever 7/30 scheduled-day streak for one daily habit. The UI identifies this as a best streak and does not promise that one more calendar day will complete a historic run.

Profile's weekly summary includes daily and weekly habit records up to today, deduplicated by habit/day. Routine counts require an ended session with every snapshotted step complete. Partial/early-ended sessions remain visible without being counted as finished.

The timeline is a view of retained current records, **not a new append-only audit log**: Undo removes the completion; edited notes show their latest save. Habit/routine groups use scheduled local dates. Notes use their actual latest local save date. Old data has no completion timestamp or badge-earned timestamp, so the UI does not invent times, chronological ordering within a day, or earned dates. Snapshot titles/goals and routine steps remain intact after edits/removal.

Optional profile data is added to the existing `routine.local-preferences.v1` SQLite key-value record. Old records without a profile remain valid, and queued preference writes preserve onboarding/reminder values. Profile name/avatar/intention and celebration preference stay on this device and are **not included in existing habit backups**, like other existing device preferences. This is disclosed in Edit profile.

## Validation actually performed

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: **97 passed, 0 failed**, including 8 new profile/activity regression tests.
- `npx expo install --check`: dependencies up to date.
- `npx expo-doctor`: **21/21 passed**.
- SDK-compatible patches aligned with `expo install --fix`: Expo 57.0.31, Router 57.0.29, Notifications 57.0.24. No new package was added for this feature. npm install reports 22 dependency advisories; no forced/breaking audit upgrade was applied.
- Browser QA used a separate `127.0.0.1:8081` origin, leaving the existing `localhost:8081` database intact. Verified empty profile, profile save/reload, Settings/Back, badge collection/filter/detail, first completion celebration and its details link, Undo updating totals/eligibility, Done again without replay, activity habit/note links, notes filter, Busy day routine creation/run/completion and recorded-step sheet; Escape dismisses the sheet. Saved screenshots are under ignored `artifacts/profile/`.

Android verification is **incomplete**. Initial Pixel 8/API 35 Expo Go preview (57.0.9) bundled but failed before mounting the app with `Cannot find native module 'ExpoTopicSubscriptionModule'` from the pre-existing notifications import. The official SDK 57 Expo Go download resolved to the same Go version. After compatible dependency patches, another Android launch reported no connected device/emulator. No physical device, new APK, native celebration animation, TalkBack, native keyboard, large Android font setting or hardware Back was verified. Browser preview is not an APK test. No notification shim or native-module workaround was introduced to hide the blocker.

## Preview

```powershell
cd 'D:\My Projects\Routine App'
npm run web
```

Open `http://localhost:8081/profile`. Existing browser data is origin-specific. Keep one browser preview tab per origin and navigate inside the app: opening a second tab against the same SQLite web database produced `Invalid VFS state` during review. The second tab was closed without resetting any data. This browser-preview limitation is not an Android test result. Review the Android version later with a compatible connected device and installed native development build; this change does not start a new native build.

## Short manual checklist

- Open Profile, edit/save name/avatar/intention, reopen app, then cancel another draft; saved values remain.
- Open Profile → Settings → Data & Backup/appearance; Back returns to Profile.
- Complete a habit for a new badge; dismiss or open details. Undo removes its credit. Done/reopen should not replay the same celebration.
- Check completion, partial progress, skip, weekly goal, busy goal, note and rescheduled activity. Filter each kind and open the correct record.
- Finish or end a routine early. Check the weekly finished count and the original full/busy steps in its activity sheet after editing the routine.
- Open Achievements from Profile and Progress; check all filters, criteria, next badge and modal cancel/Back.
- On Android: repeat with small screen, large text, keyboard, TalkBack and Reduce Motion. Check automatic banner timeout, celebration preference off, background/reopen and hardware Back.
