# Soft Sage companion tabs — 2026-10-31

Generated with the built-in image_gen tool using `../design-concepts-2026-10-31/02-sage-cards.png` as the visual style reference selected by the user. These are new design preview images, not implementation changes.

- `01-schedule.png`: day/week switch, date strip, chronological habit timeline, completion/count/timer actions, routines entry point.
- `02-progress.png`: weekly summary, daily completion chart, best streak, active habits, consistency, history and achievements entry points.
- `03-profile.png`: local profile, weekly totals, next achievement, challenges, badges and recent activity.

Full prompts and reference provenance are saved in `prompts.json`.

Visual QA: all images retain sage backgrounds, forest green accents, white rounded cards, consistent typography and four-item floating navigation with the correct selected tab. Text and primary controls are visible. Example metrics are coherent: 22/30 daily completions rounds to 73%; 38/50 lifetime completions equals 76%. Sunday is shown as a future chart day. The bar heights in the generated progress chart are illustrative; any implementation must use proportional values. These sample values do not represent the user's actual data.

Validation: `npm run lint` and `npm run typecheck` both passed. No application code was changed for these images.
