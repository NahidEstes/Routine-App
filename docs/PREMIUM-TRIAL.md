# Premium design trial

New installations use Classic. Settings → Upgrade Premium opens a warm ivory/sage/forest-green offer page with a sample preview, $4.99/month demo price and Start 7-day free trial. Starting the trial persists its timestamps before unlocking Premium, then opens Today. Existing habits, routines, progress, forms and backups remain available in both appearances.

The trial lasts exactly 168 hours from activation, independently of local midnight, timezone or daylight-saving changes. The shared theme updates existing screens without replacing the tracker state. Today shows a trial banner; Settings shows rounded-up days remaining and the exact local expiry date/time. A foreground timer checks once a minute and schedules the final check at expiry. AppState active and cold launch also refresh the status. At expiry the global theme returns to Classic, and Settings explains the trial has ended. There is no second free trial in the same app storage.

The $4.99/month plan is a demo. Paid Upgrade Premium shows Coming soon, does not start a subscription, and does not take payment. A trial never converts into a paid plan automatically.

## Persistence and failure handling

`src/storage/appearance.ts` uses the already-installed Expo SQLite key-value store. It is separate from the routine repository and its snapshot settings table: normal saves, exports and importing older backups cannot erase or restart the trial. No tracker schema or backup format changed. Reads and writes are serialized to prevent rapid taps from extending the expiry. Malformed records and storage errors leave the app in Classic with a retry action; failed writes never grant Premium.

This is an offline demo entitlement on one installation, using the device clock. A persisted last-observed timestamp prevents a previously observed expiry from being undone by moving the clock backwards. It is not a server-verified billing entitlement: clearing app data or uninstalling can remove the trial record, and unobserved clock manipulation is not securely detectable offline. Real paid subscriptions will require store billing and verified entitlements.

## Validation

- Expo lint and TypeScript checks.
- Android production bundle export succeeds (1,530 modules); this verifies bundling, not a newly built APK or physical phone run.
- 62 Node tests, including exact expiry boundary, initial Classic state, countdown, reopen, concurrent activation, no restart after expiry, clock rollback after observed expiry, invalid records, failed reads/writes, retry, and SQLite save/restore independence.
- Browser runtime checks at mobile widths cover Classic default, offer, activation to Premium Today, trial status in Settings, persistence after reload, and the paid-plan Coming soon flow. Expiry is covered by deterministic timestamp tests rather than waiting seven days.

The previously shared 1.0.1 APK predates this feature. Rebuild an APK to install the trial feature on a phone.
