# Classic default and premium trial

The app now starts with a classic Android-inspired appearance on every installation: blue-gray title/navigation bars, neutral backgrounds, white bordered lists, square checkboxes, rectangular gray buttons and blue selection accents. Shared controls also cover habit/routine forms, details, notes, backup and sheets. Reference mockups are in `design-reference/classic-ui-2026-10-16`.

The tab order is **Today → Schedule → Progress → Settings**. Settings lives in the tab navigator at `/settings`; its former standalone stack route was moved into `src/screens/SettingsScreen.tsx` so there is only one route with that pathname. Existing Data & Backup and open-source licenses remain reachable.

Settings → **Upgrade Premium** now opens the [Premium trial offer](PREMIUM-TRIAL.md). The one-time free trial unlocks the warm rounded Premium appearance for seven days, then automatically returns to Classic. The $4.99/month plan is a demo; paid purchase still shows Coming soon. Trial availability is stored separately from tracker snapshots and backups.

The previous working design is preserved in `design-reference/premium-ui-before-classic-2026-10-16/premium-ui-source.zip`. The trial uses the shared live screens with a reactive Premium theme and the approved concepts in `design-reference/premium-trial-2026-10-18`.

No tracking rules, saved data, storage schema, backup format, completion formulas or existing features were gated or changed. Daily summary and charts still use the real completion data; streak retains its existing scheduled-day definition.

## Original Classic release verification

- TypeScript and Expo lint pass; the existing 56 Node tests pass.
- Browser preview uses the isolated `http://localhost:8092` origin. QA data is a newly created `QA Classic walk` habit in that origin's browser database, separate from native device data.
- At 360px width: four tabs appear in order; Settings opens; Upgrade Premium shows Coming soon and OK dismisses it; Data & Backup opens and Back returns to the Settings tab. A new boolean habit can be created, completed and undone. Schedule Day/Week and Progress remain interactive.
- Screenshots are saved under ignored `artifacts/classic-ui-2026-10-16`.
- The classic UI is now included in the [1.0.1 APK](APK-1.0.1.md), with successful EAS and local builds, signature/metadata verification, and standalone emulator checks. Physical phone installation remains unverified. The older 1.0.0 APK is preserved separately.
