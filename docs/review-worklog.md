# Design review worklog — round 2 (CD Bund, designsystem v1.0.45)

Branch: `design-review-r2`. One line per completed unit of work, newest last.
Format: `YYYY-MM-DD HH:MM | phase | what was completed | commit`

| Timestamp | Phase | Completed | Commit |
| --- | --- | --- | --- |
| 2026-08-10 | Setup | DS version established: git tag v1.0.45 on disk (package.json field stale at 1.0.5; README claims v1.0.9 – version drift confirmed). Breakpoints read from designsystem/app/tailwind.config.js: xs 480 / sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1544 / 3xl 1920, mobile-first. | – |
| 2026-08-10 | Setup | Branch design-review-r2 created from main (984905d, clean tree). Worklog initialised. | – |
| 2026-08-10 | A | npm test green; a11y:responsive green (0 failures) on unmodified main. | – |
| 2026-08-10 | A | Baseline capture harness written (capture-baseline.mjs) + hash diff tool (diff-baseline.mjs). Smoke run at 1280 px: 32/33 ok. | b2788dd, a30d08c |
| 2026-08-10 | A | Inventory: 21 routes, css/styles.css 7048 lines / 1438 blocks / 104 media queries / 13 !important; css/tokens.css 596 lines / 259 custom props. Full section map with line ranges recorded in split-css.mjs. | – |
| 2026-08-10 | B-prep | Split plan: 24 files (foundations 4 / layouts 1 / navigations 2 / components 8 / sections 9 + main.css), cascade-preserving import order; former RESPONSIVE block dissolved into component files; print.css imported last. Splitter run: audit clean, all 24 emitted, braces balanced. Old files still live; switch pending baseline completion. | – |
| 2026-08-10 | B-prep | check-cd-tokens.mjs extended: single token file css/foundations/tokens.css, colour literals + raw px font sizes + off-scale spacing (>2px) guarded across css/**; 23 pre-existing hits grandfathered with explicit list (each to become a TOK/SPC finding). | – |
| 2026-08-10 | A | Full baseline captured: 424 captures ok (10 desktop widths + 360/390 touch emulation + 11 interactive states), verify_out/design-review/baseline. Known gaps: state-chip-selected @360 (click timeout — chips likely not reachable at 360, follow up in Phase C); console-error tracking added to harness after the run (baseline manifest has no consoleErrors field). Phase A complete. | – |
