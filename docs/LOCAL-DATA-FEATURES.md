# Backup, routine starters and daily notes

Implemented in the canonical project, `D:\My Projects\Routine App`, using the existing Expo SDK 57 UI, schedule engine and SQLite repository. The prior Phase 4 edits are retained. No database reset, demo seed, notification, account, cloud sync, backend or publication is introduced.

## Where to use the features

- **Today → Settings (gear) → Data & Backup**: export or choose a JSON backup. Settings also contains bundled open-source license notices.
- **Today → Your routines**: “My routines” and four “Start with a template” cards. Preview a template, choose **Use template**, edit its name/steps/order/durations/schedule and save. The original starter descriptions and steps were written for this project, independently of competing apps. They are optional examples.
- **Routine detail → Routine menu (…) → Duplicate**: review the independent copy, rename it and save. Full/busy durations, order and existing habit links are copied. Each kept link is named; edit a step to unlink it or choose a different existing habit. New routine/step IDs are generated. Sessions, completions and history are not copied. Templates start with standalone steps and create no habits.
- **Habit card → ⋯ → Add a note / Edit note** in Today, Schedule or a selected history day: save/edit a plain-text daily note. A “Note” label indicates an existing note without expanding the card. **Progress → History → Daily notes** and **Manage habits → View notes** also reach notes for archived or excluded schedule records.

## Backup rules

The envelope is `{ format: "routine-app-backup", formatVersion: 1, exportedAt, appVersion, data }`. The UTC export timestamp is displayed in the device's local time. Backup format **1** and SQLite schema **3** are separate version numbers. The current supported import is format 1 only; raw SQLite files and other apps' JSON are not imports.

The snapshot contains habits (including archived ones), effective schedule revisions, occurrence snapshots/overrides/progress/skips, weekly commitments, routines and ordered steps, routine sessions and completion history, daily notes, and busy-day date settings. It contains no credentials, signing material or unrelated device metadata. The provider captures one committed snapshot after earlier queued writes; it never mixes tables from different writes.

Android export uses `Directory.pickDirectoryAsync` and writes a new JSON file inside the chosen folder. Android may ask for access to that **folder**; no broad storage permission is requested. Create/select a subfolder if Android disallows a root/Downloads directory. Restore uses the SDK 57 `File.pickFileAsync` URI grant and reads the selected document without modifying/deleting it. The native direct picker also avoids an Expo Go scoped-cache read-permission failure found with DocumentPicker cache copies. Browser preview uses a browser download and Expo DocumentPicker's web file input.

Restore validates the envelope, types, field names, dates/times, numeric values, IDs, canonical record identities, uniqueness, snapshot relationships, habit links, session steps and note ownership before any SQL mutation. It previews the export date, app/format versions and counts. Counts include archived items and excluded history/override rows. Choosing another file clears the old preview. Invalid, unsupported or cancelled input cannot replace data.

Only **Replace current data** is supported. The preview provides an **Export current data before replacing** action, then a separate destructive confirmation and cancel controls. Replacement runs in the existing atomic SQLite transaction. Failed SQL rolls back all tables; provider state is published only after commit. Successful restore clears stale navigation and refreshes local-day materialization, history, selected date and progress. An older backup therefore catches up to today using the same existing schedule rules, without inventing completions.

Limits: **20 MiB UTF-8 JSON**, and **250,000 habit-days** of calendar processing during restore to avoid blocking the app on an excessive/corrupt date range. Files are **plain text, unencrypted**; keep them in a trusted location. Replacement cannot be undone except by restoring another backup. There is no merge, automatic export, encryption or cloud destination managed by the app. Existing atomic full-snapshot SQLite persistence remains in place.

## Daily note identity and migration

SQLite migration 3 adds `daily_notes(entry_id PRIMARY KEY REFERENCES entries, habit_id REFERENCES habits, payload)` without removing existing data. One note belongs to one stable occurrence ID, not merely a date string. It moves with that record when rescheduled. A destination that already has a note/progress is protected from merging. Note-bearing excluded records remain retained through archive/restore, and the notes list can still open them.

Notes allow **2,000 JavaScript string characters** (UTF-16 units), including line breaks. Add notes on today's/past records; an existing note moved to a future date can still be edited. Editing a note does not alter amount, status, target, weekly credit or completion. A flexible weekly note captures a pending record with zero credit. Archive and habit edits retain old notes. Delete requires confirmation and deletes only note text, leaving the history record intact. Content renders through React Native Text/TextInput as plain text.

## Dependencies, content and licenses

- `expo-file-system ~57.0.7`: native folder/file picker and JSON file I/O, MIT.
- `expo-document-picker ~57.0.3`: optional browser preview input, MIT.
- Both were installed using SDK-compatible `expo install`. No new artwork, font or template collection was imported. Existing Ionicons are reused via the project's existing MIT-licensed vector-icons wrapper.
- Copyright/license notices are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) and bundled in Settings. No claim of universal legal or religious assurance is made.

Official matching references: [Expo 57](https://docs.expo.dev/versions/v57.0.0/), [FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/), [DocumentPicker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/).

## Verification

Final checks passed: **51 Node tests**, TypeScript, lint without cache, and **Expo Doctor 21/21**. Automated cases cover backup round-trip/relationships, corrupt and unsupported inputs, SQL-triggered mid-restore rollback, v2→v3 migration, note save/edit/delete/reopen, note reschedule/archive retention, calendar catch-up, template IDs/independence, duplicate links/durations/history exclusion, and all existing schedule/completion/progress regressions. Tests use isolated temporary or in-memory databases.

Native opt-in validation uses **steady-storage-validation.db only**, never the main database. Its success marker includes v1→v3 migration, notes, backup round-trip, unsupported version rejection, restore rollback, close/reopen, history and reschedules. Native UI QA uses explicitly named QA records and a `Documents/QA-Routine-Backups` folder on the emulator. No user database was cleared.

**Android 15 / API 35 Pixel 8 emulator, SDK 57 Expo Go:** actual folder-picker export created a JSON document; the file picker read that same file and displayed date/version/counts; Cancel replacement and confirmed Replace both worked. The retained note opened after restore. Morning Start was previewed, renamed and reordered before saving, then duplicated and saved with a separate name; both routines appeared independently in My routines. Daily notes were saved, edited, retained across a process stop/relaunch, and deleted after testing Keep note/Confirm delete. Small-screen checks used 360×640 dp and 150% font, including native Gboard, counter/buttons and scrolling. Display size/density/font were restored after QA. Screenshots are in ignored `artifacts/features/backup-preview-native.png` and `note-keyboard-small-native.png`.

A Fast Refresh race in the opt-in validation harness was also corrected: concurrent invocations now share a runtime-wide pending promise before executing isolated destructive DDL. The final native storage check passed after this fix. No physical phone is connected; vendor-specific file providers/IME/accessibility, every template's entire edit flow and every combination of habit links still need broader phone testing. Domain invariants and failure cases above have automated coverage. The optional browser preview and its compiled JavaScript bundle both returned HTTP 200 (5,210,294-byte development bundle). An initially stalled Metro process was restarted with a cleared bundler cache and two workers; no app data was cleared. Browser UI flows were not manually re-tested in this turn; native results are from Android, not inferred from the browser.

The existing SDK-compatible dependency tree still reports **29 npm audit advisories (18 high, 11 moderate)**. No forced incompatible dependency upgrade was made.

No updated standalone APK has been built for these additions. The previous Phase 4 APK predates them. New native modules require regenerating/rebuilding the standalone binary, using the existing [Android build instructions](PHASE4.md). Expo Go checks are distinct from APK checks and from a physical phone.

## Run and quick manual check

```powershell
Set-Location 'D:\My Projects\Routine App'
npm ci
npm start
# Optional browser preview
npm run web
```

For this Windows emulator, `npx expo start --android --localhost --port 8084` with `NODE_OPTIONS=--dns-result-order=ipv4first` avoids the IPv6 listener issue encountered previously. Use an SDK 57-compatible Expo Go. For a standalone binary rebuild, follow `docs/PHASE4.md`; do not uninstall an existing app to update it.

1. Add/edit a daily note on a completed, partial, skipped or missed entry. Check the character limit, Cancel, Delete confirmation and unchanged progress; relaunch and inspect the note.
2. Move a note-bearing entry once/all future days, inspect its destination and reject a destination containing another note. Archive/restore the habit and open retained notes through History.
3. Preview each starter, use it, edit/reorder/remove a step, link an existing habit explicitly, save and verify no hidden habit/history was created.
4. Duplicate a linked routine, rename it, change/unlink/reorder a step, save and compare with the original. Old sessions remain only with the original.
5. Export to a chosen folder. Choose that file, inspect date/version/counts, cancel once, export current data from the preview, then confirm Replace. Compare notes, schedule, Progress and History after relaunch.
6. Choose corrupt JSON, an unsupported version or invalid relationships and confirm a clear error with current data intact. Destructive restore-failure tests belong in a separate database.
7. Try 360×640 dp, large system font, keyboard, Android Back and a cancelled system picker. Restore test device display settings afterwards.
