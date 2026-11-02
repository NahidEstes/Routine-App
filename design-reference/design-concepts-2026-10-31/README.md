# Routine App design concepts — 2026-10-31

Three Today-screen visual concepts generated with the built-in image_gen tool, based on this project's brief, existing design references, Today interactions, four-tab navigation, and light/dark palettes.

- `01-ivory-minimal.png`: warm ivory, forest green, editorial heading, restrained white cards.
- `02-sage-cards.png`: sage canvas, deep green completion summary, soft rounded habit cards.
- `03-forest-dark.png`: dark forest surfaces, mint actions, clear night-mode contrast.

These are image concepts for design review. The app implementation was not changed. All screens use coherent example data: two completed habits and three remaining out of five total. Full generation prompts are preserved in `prompts.json`.

Visual review: all four navigation labels, habit actions, daily completion summary and safe areas are visible. Image 01 uses an iOS-like status-icon style despite the Android prompt; final implementation should use the native Android system status bar. Minor generated visual details are illustrative.

Validation: `npm run lint` and `npm run typecheck` passed.
