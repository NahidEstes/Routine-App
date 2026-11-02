# New habit Quick start — November 2, 2026

Implemented the approved `design-reference/quick-start-2026-11-02/01-quick-start.png` concept in the New habit form.

- Three rounded icon cards show Drink water, Read a book and Go for a walk, with their goal summaries.
- The chosen starting template has a sage fill, green outline and check badge. Its accessible label also announces selection. Form values remain editable.
- See all opens a rounded, scrollable bottom sheet containing all five existing templates. Closing the sheet preserves the draft. Choosing a non-featured template brings that choice into the third quick-card slot.
- Selection fills the draft's name, goal, units, repeat rule, time, icon, category and busy-day goal. The draft ID and selected start date are retained. Persistence still happens through Create habit.
- New reading drafts now start at 15 minutes / 9 AM and walking drafts at 20 minutes, matching the image. Existing saved habits retain their own goals and times.
- At ordinary phone font sizes, all three cards fit at 320 pixels. Larger font scales use a horizontal card strip; the picker becomes a single-column list on narrow screens or at larger font scales.
- The picker follows the existing light/dark palette. The rounded-sheet option is scoped to this picker. No dependencies or database changes were introduced.

## Validation

`npm run lint`, `npm run typecheck` and all 121 existing tests passed. Android JavaScript/Hermes export succeeded; this is not an APK or a device run.

Browser verification used a fresh `localhost:8094` test origin with synthetic data:

1. Reading selected 15 minutes at 9 AM; water selected 8 glasses with the proper unit; Plan tomorrow selected Check off.
2. Opening and closing See all preserved a customized draft name. Exercise/Plan selections closed the picker and remained visible/highlighted in Quick start.
3. A November 4 start chosen from the calendar remained November 4 after template selection.
4. Cancelling template-based drafts left the empty tracker at 0 habits.
5. A reading draft was customized to `QA Quick start`, 25 minutes, then saved. Reload showed one habit at 9 AM with a 25-minute goal. Editing retained those values and did not show Quick start.
6. Layouts were reviewed at 320 and 390 pixels. All five picker choices were reachable at 320 pixels. Dark-mode cards and the picker were reviewed as well. No errors were recorded for the new test origin.

Actual browser screenshots:

| Quick start | See all |
| --- | --- |
| ![Quick start](../artifacts/quick-start-2026-11-02/quick-start-390.jpg) | ![Template picker](../artifacts/quick-start-2026-11-02/templates-390.jpg) |

Additional narrow screenshots and command logs are in `artifacts/quick-start-2026-11-02/`. Android keyboard, system font scaling, gesture and Back behavior still need a device run.
