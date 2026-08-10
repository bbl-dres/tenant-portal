# Design review — CD Bund alignment register

Standing register for design reviews of the BBL Mieterportal prototype against the Swiss Confederation design system (CD Bund). Later review rounds append to the rounds table and extend the findings tables; finding IDs are stable and never reused.

## 1. Purpose and scope

Reviewed: every route and recurring UI pattern of the prototype, at the design system's breakpoints plus 320/360/390 px, including touch emulation; the CSS architecture; accessibility (WCAG 2.1 AA); CD formal elements and editorial conventions.

Excluded: JS application logic beyond what styling and semantics require; the Python utilities under `scripts/data` and `scripts/research`; content correctness of the mock data. `docs/CD-GAP-ANALYSIS.md` (round 1) was deliberately not used as an input — this round was done with fresh eyes; see section 7 for its disposition.

Normative reference: the local clone of [swiss/designsystem](https://github.com/swiss/designsystem) at git tag **v1.0.45** (HEAD `5f03f257`). The clone's `package.json` version field (1.0.5) is stale upstream and not meaningful. Where behaviour could not be verified against the clone or the hosted Storybook, the finding is marked unverified rather than asserted.

Method: computed-value comparison, not visual estimation. A Playwright harness (`scripts/review/capture-baseline.mjs`) captures every route at 12 viewport configurations (320, 360, 390, 480, 640, 768, 1024, 1280, 1544, 1920 px, plus 360/390 with touch emulation and mobile user agent) and dumps per-element computed-style hashes, full computed styles for a probe set, and full-page screenshots. Deltas against the design system are cited as file:line in the clone. Tolerances: colours, tokens, font families, weights and type sizes must match exactly; layout values deriving from different DOM structure carry a 1 px tolerance below which nothing is logged.

## 2. Review rounds

| Date | Design system version | Scope | Reviewer |
| --- | --- | --- | --- |
| 2026-08 (round 1) | claimed v1.0.9 | CD gap analysis, superseded by this register | project |
| 2026-08-10 (round 2) | v1.0.45 | Full review: architecture, alignment, responsive/mobile, a11y, polish | Claude (design-review-r2) |

## 3. Summary

Placeholder — completed at consolidation (Phase C).

## 4. Findings by category

Categories: `TOK` tokens/theming, `COL` colour, `TYP` typography, `SPC` spacing/grid/layout, `RWD` responsive and mobile, `CMP` components, `STA` states and interaction, `A11Y` accessibility and semantics, `CSS` CSS quality and naming, `CD` CD formal elements and editorial, `VER` version drift, `POL` design polish (proposals).

Priorities: `P1` accessibility blocker or user-visible CD violation; `P2` clear deviation from the design system; `P3` consistency and maintainability; `P4` cosmetic, no user-visible impact.

Statuses: `Open`, `Proposed`, `Needs decision`, `Fixed` (with commit), `Won't fix` (with reason), `Superseded`.

Placeholder — tables completed at consolidation (Phase C).

## 5. Component matrix

Verdicts: `Aligned` (no open findings above P3), `Minor deviations` (open P3 only), `Major deviations` (any open P1/P2), `No DS equivalent` (nothing comparable in the design system; the comparison basis is stated).

Placeholder — completed at consolidation (Phase C).

## 6. Appendix

### 6.1 CSS architecture (established in this round, Phase B)

`css/styles.css` (7 048 lines) and `css/tokens.css` (596 lines) were split into 24 files mirroring the design system's folder taxonomy, with a cascade-preserving import order documented in `css/main.css`. The split is provably visually neutral: a per-element computed-style hash diff over every route × viewport against the pre-split baseline reports zero differences (see 6.3).

### 6.2 Route inventory

21 routes: `#/`, `#/login`, `#/home` (role-routed: LBO, GS-Reviewer, BBL-PFM, BBL-Campus, Auditor), `#/wizard/1…5`, `#/inbox`, `#/inbox/:id`, `#/queue`, `#/review/:id`, `#/properties` (gallery/list/map), `#/properties/:id`, `#/properties/:id/floors/:slug`, `#/downloads`, `#/repair`, `#/profile`, `#/news`, `#/news/:id`, `#/services`, `#/moves`, `#/cleaning`, `#/mobiliar`, `#/info`, `#/search`.

### 6.3 Commands and artefacts

| Purpose | Command |
| --- | --- |
| Static checks + token guard | `npm test` |
| Responsive accessibility sweep | `npm run a11y:responsive` |
| Full browser verification | `npm run verify:all` |
| Baseline/state capture | `node scripts/review/capture-baseline.mjs [outDir]` |
| Computed-style diff | `node scripts/review/diff-baseline.mjs [--subset] <base> <candidate>` |

Artefacts (gitignored): `verify_out/design-review/baseline-h2` (pre-split baseline, hasher v2), `verify_out/design-review/split-check` (Phase B neutrality proof), after-state captures per implementation pass.

Breakpoints (normative, `designsystem/app/tailwind.config.js:20-28`): xs 480, sm 640, md 768, lg 1024, xl 1280, 2xl 1544, 3xl 1920 — mobile-first (`min-width`).
