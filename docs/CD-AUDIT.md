# CD-AUDIT.md — Corporate-Design audit (Mieterportal prototype)

Living document. Tracks deviations from the Swiss federal CD (CD Bund /
`swiss/designsystem` v1.0.9) and progress toward closing them. Reference
patterns: swisstopo.admin.ch, kbob-fdk, workspace-management.

Status legend: ◻ open · ◐ in progress · ✓ done · — won't fix (rationale)

---

## 1. Footer

| # | Finding | Severity | Status |
|---|---|---|---|
| 1.1 | `.app-footer__bottom` padding too tall — base `--space-lg` (24px) and `--space-xl` (32px) at desktop is double the CD-Bund bottom-strip cadence. | medium | ✓ |
| 1.2 | `.footer-information__heading` rendered as `--text-h3` + semibold — reads as a section title, not a footer column label. CD Bund / swisstopo use a small uppercase label (medium weight, tracked). | medium | ✓ |
| 1.3 | `.footer-information__prototype-warning` uses `#ff4444` (saturated red) on the navy footer surface — reads as a console error, not a tasteful prototype notice. Should be a soft amber or `rgba(255,255,255,0.65)` with the warning icon. | medium | ✓ |
| 1.4 | Footer link list contained `docs/REQUIREMENTS.md` and `docs/DESIGNGUIDE.md` — these are internal artefacts, not user-facing references. Replaced with a single "CD Bund" link to `github.com/swiss/designsystem` so the prototype openly cites its design source. | low | ✓ |

## 2. Cards & Lists

| # | Finding | Severity | Status |
|---|---|---|---|
| 2.1 | `.card--property__footer` adds a separator + extra row solely to host the portfolio-category chip — visually noisy, breaks the card's vertical rhythm. Chip can sit inline with `.card--property__meta` (or simply be dropped — VE is already inferable from address/portfolio context). | low | ✓ |

## 3. Pagination

| # | Finding | Severity | Status |
|---|---|---|---|
| 3.1 | `renderPagination` on `#/properties` hid the entire pagination footer when `totalPages <= 1`. Federal portfolios scale to thousands of buildings — a persistent pagination affordance signals scale and keeps muscle memory consistent across filters. Made the footer always-visible, with prev/next correctly disabled at the boundaries. | medium | ✓ |
| 3.2 | The documents-list page on `#/downloads` uses the same hide-when-`totalPages<=1` pattern (`js/app.js` ~L1999). Same fix recommended; not applied yet — out of scope for the current sweep. | low | ◻ |
| 3.3 | `.pagination` was left-aligned with no item-range label. CD Bund ships `.pagination` (left, default) and `.pagination--right` (right + generous vertical padding); centered is **not** in the design system. swisstopo / kbob-fdk both use the right-aligned variant. Switched `.pagination` to `justify-content: flex-end` with `flex-wrap` for narrow viewports. | low | ✓ |
| 3.4 | Pagination showed page-of-pages ("3 von 21 Seiten") but no item-range count. At portfolio scale ("12 of 1'247") the count is the load-bearing scale cue. Added a `.pagination__count` span ("1–12 von 247 Liegenschaften") to the left of the controls, with `margin-right: auto` pushing the chevron cluster to the right edge. Uses de-CH thousands separator. Singular / empty-state copy variants included. | low | ✓ |

## 4. Open follow-ups (not yet addressed)

- [ ] Confirm `--color-prototype-notice` is only used in the footer; if so, retire the token or repurpose it.
- [ ] Sweep all uses of `--text-h3` on dark surfaces — CD Bund typically downshifts headings on inverse backgrounds.
- [ ] Audit dropdown nav menus against swisstopo's mega-menu cadence (column gap, label size, hover affordance).
- [ ] Verify focus-ring contrast (`--color-focus` purple) on red CTA buttons — WCAG 2.2 SC 2.4.13.
- [ ] Review badge palette against CD Bund tokens (`bg-status-*`) — current values are Tailwind-derived approximations.

---

## Reference

- Design system repo: <https://github.com/swiss/designsystem>
- Storybook docs: <https://swiss.github.io/designsystem/>
- Local clone: `C:\Users\DavidRasner\Documents\GitHub\designsystem`
- Living example: <https://www.swisstopo.admin.ch/en>
