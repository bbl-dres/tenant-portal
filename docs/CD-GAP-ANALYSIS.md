# CD-Bund Design Gap Analysis — BBL Mieterportal

> **See also:** [design-alignment.md](design-alignment.md) (2026-08-21/22) —
> the three-way cross-PORTAL alignment (Mieterportal ↔ Kundenportal ↔ CD),
> shared with the sister service-portal repo, with the implemented decision
> register D1–D40.

> **SUPERSEDED (2026-08-12).** A fresh-eyes re-audit (four parallel reviews:
> component fidelity, chrome/layout fidelity, hardcoded values, CSS
> duplication) found most findings below resolved and the file/line
> references stale (they cite the pre-split `css/styles.css`). The re-audit
> was implemented directly: ~600 lines of dead CSS removed, the CD-guard
> grandfather list cleared to empty, chrome/component values realigned to
> the DS sources, and the deviations register in DESIGNGUIDE.md §5/§5a
> updated. This document is kept as an audit trail only.

**Audit date:** 2026-07-29
**Reviewed against:** official Swiss Federal Design System (CD Bund), local clone
`C:\Users\david\Documents\GitHub\designsystem` (Tailwind + PostCSS + Vue source of truth).
**Method:** eight parallel specialist reviews (one per design dimension) comparing the
portal's `css/tokens.css`, `css/styles.css` and `js/*.js` against the DS
`app/tailwind.config.js`, `css/foundations/*`, `css/components/*`, `css/sections/*`,
`css/navigations/*` and `css/layouts/*`, followed by a consolidation pass that
de-duplicated, cross-verified against the actual code, and prioritised every finding.

---

## 1. Executive summary

The BBL Mieterportal is a **high-fidelity vanilla reproduction of CD Bund**. The token
layer — the responsive type ramp, the primary/secondary 50→900 colour ramps, the radius
scale, the box-shadow scale, spacing and breakpoints — is **byte-accurate** against the DS
Tailwind config. Desktop chrome, the notification family, the modal focus-trap, the WAI-ARIA
tabs wiring and reduced-motion handling are all genuinely on-spec.

Because the fundamentals are solid, the remaining gaps are **not** the palette- or
scale-level drift an auditor usually chases. They are **structural and interactive**: a
handful of components whose DOM or behaviour model departs from the DS in ways that reach
users or fail WCAG. Three themes dominate:

1. **Mobile & accessibility structure.** The account/login control is hidden below 1024 px
   and never relocated into the burger drawer, so an authenticated phone user has no path to
   profile/logout. Collapsed accordion panels stay keyboard-focusable and AT-exposed
   (WCAG 2.4.3 / 2.4.7).
2. **Off-model components.** The toast was reinvented as a colour-only dark snackbar with no
   status icon (WCAG 1.4.1, and it contradicts the portal's own "colour is never the only
   signal" policy); the native `<select>` drops the DS's signature bordered-chevron column;
   default tables render as borderless rule-lists instead of the bordered/elevated DS block;
   a duplicate `.card__title` rule silently shrinks card titles below the DS 18 px floor.
3. **Documentation drift.** Several `DESIGNGUIDE.md` §5 "intentional deviations" (softer
   shadows, wider button padding) describe code that has since been corrected to match the DS
   exactly, so a reviewer reading the guide would mis-audit.

Most fixes are S/M effort. This document records every finding, then implements the
well-justified ones (see the status column and §6).

### Dimension scorecard

| # | Dimension | Score | Headline |
|---|-----------|:-----:|----------|
| 1 | Colour & theming | **82** | Ramps byte-exact; only semantic-mapping slips (warning badge renders yellow vs DS orange). |
| 2 | Typography | **82** | Type ramp faithful; `h3` leading and the canonical U+202F required-asterisk pattern are off-spec/unwired. |
| 3 | Spacing & layout | **80** | Container/section rhythm on-spec, but max-width never widens to the DS 1676 px cap at 3xl; gutters are ad-hoc. |
| 4 | Buttons & forms | **77** | Tokens/structure strong; select loses the bordered chevron, disabled uses `opacity`, input focus is a weak tint. |
| 5 | Cards & data display | **78** | Badges/chips faithful; tables lack border+shadow and a duplicate rule shrinks card titles below spec. |
| 6 | Navigation & chrome | **80** | Excellent desktop parity; one high-impact defect — the account control vanishes on mobile. |
| 7 | Feedback & overlays | **75** | Notifications/modal solid; toast is an off-brand colour-only snackbar with no status icon. |
| 8 | A11y, motion & icons | **74** | Focus tokens correct, but the accordion keyboard-trap, corner skip-link and missing focus `z-index` are eCH-0059 flags. |

**Overall: ~78/100** — strong brand fidelity, with a concentrated set of structural and
accessibility corrections that lift it toward the mid-90s.

---

## 2. High-priority findings (user-visible / WCAG)

### H1 · Account/login control disappears on mobile · `navigation-chrome` · effort M
On phones/tablets there is no chrome affordance for the user account: an authenticated user
cannot reach profile or logout, and a logged-out user on any interior/deep-linked route has
no chrome login (only the landing hero CTA offers one). The language switcher is additionally
dropped the instant the burger drawer opens.
- **Portal:** `css/styles.css:3527` hides `.top-bar__link--user`; the mobile-meta block
  (`styles.css:3691`) carries no account entry.
- **DS:** `MobileMenu.vue` / `mobile-menu.postcss` keep meta navigation (account + language) at
  the foot of the drawer.
- **Fix:** relocate the auth pill (and language switcher) into `main-navigation__mobile-meta`
  at the foot of the burger drawer, reusing the existing dark meta styling.
- **Status:** ✅ implemented.

### H2 · Toast is a colour-only dark snackbar with no status icon (WCAG 1.4.1) · `feedback-overlays` · effort M
The toast bears no resemblance to the DS floating Notification and drops the status icon, so
success vs danger differ **only by hue** — a use-of-colour failure that also contradicts the
portal's own policy (`styles.css:2119`, "colour is never the only signal").
- **Portal:** `css/styles.css:2636` dark/coloured fills; `js/lib.js:409` `toast()` builds no icon.
- **DS:** `ToastMessage.vue` renders a `.notification` card with a status glyph.
- **Fix:** render toasts as tinted `.notification--success/--error/--info` cards with a
  `P.icon()` status glyph; keep the dismiss button; `role="alert"` for danger.
- **Status:** ✅ implemented.

### H3 · Collapsed accordion panel is keyboard-focusable & AT-exposed · `a11y` · effort M
Keyboard users Tab into invisible collapsed links (the page scrolls to a focus ring on
nothing) — WCAG 2.4.3 / 2.4.7 — and screen readers announce collapsed content; the trigger
also lacks the DS `aria-controls` association.
- **Portal:** `js/app.js:571` the panel has no id/`aria-hidden` and links stay in the DOM under
  a CSS-only `max-height` collapse.
- **DS:** `accordion.postcss` + `Accordion.vue` associate trigger↔panel and remove collapsed
  content from the a11y tree.
- **Fix:** collapse the panel with `visibility:hidden` (removes it from tab order and the a11y
  tree while preserving the `max-height` reveal animation); add `aria-controls`/panel `id` and
  toggle `aria-hidden`.
- **Status:** ✅ implemented.

---

## 3. Medium-priority findings

### M1 · `.badge--warning` renders yellow; DS makes it an alias of orange · `colour` · effort S
Same class name, different hue than the DS (yellow vs orange), and it makes the portal's own
"warning" semantic read as **three hues** — orange in notifications, amber in the pipeline,
yellow in badges.
- **Portal:** `styles.css:1569` warning→yellow tokens; **DS** `badge.postcss:34` `.badge--warning`
  aliases `.badge--orange` (`bg-orange-100`/`text-orange-800`).
- **Fix:** remap `.badge--warning` to the orange tokens; add an explicit `.badge--yellow` for
  any future yellow status. All 6 call sites ("offen", lease-expiry, fixed-term) are genuine
  attention states → orange is correct.
- **Status:** ✅ implemented.

### M2 · Tables drop the DS outer border + shadow and use half the DS cell padding · `component` · effort S
Portal tables read as a loose stack of underlined rows rather than the contained DS table
object; default vertical padding (8 px) is ~half the DS default (16 px).
- **Portal:** `styles.css:2309/2322` no border/shadow, `space-sm space-md` cell padding.
- **DS:** `table.postcss:19-23` `border border-text-200` + `shadow-md`; `th/td` `px-6 py-4`;
  `.table--compact` removes border+shadow.
- **Fix:** add `border` + `box-shadow` to `.table`, raise default padding, and make
  `.table--compact` `border:0; box-shadow:none` per DS. Correct the misleading "headers are
  sentence-case by default in DS" comment (DS default is uppercase; sentence-case is our
  deliberate deviation).
- **Status:** ✅ implemented.

### M3 · Duplicate `.card__title` rule shrinks titles below the DS 18 px floor · `component` · effort S
A later `.card__title` rule (`styles.css:1517`, `text-body` = 16 px) silently overrides the
earlier one (`styles.css:1221`, `text-h4`), so every card title renders at 16–20 px — below the
DS 18 px floor — and edits to the first rule have no effect (maintenance hazard).
- **DS:** `card.postcss:216` `.card__title` is `text-lg xl:text-xl 3xl:text-2xl` (18/20/24) bold.
- **Fix:** consolidate to a single rule at `var(--text-h4)`.
- **Status:** ✅ implemented.

### M4 · Input focus is a 25 %-opacity tint, not the DS solid 2 px ring · `a11y` · effort S
The translucent glow is far lighter than the DS solid `purple-500` and is borderline for the
3:1 non-text focus-indicator contrast (WCAG 2.4.11); it is also inconsistent with the portal's
own solid-ring buttons.
- **Portal:** `styles.css:1865` `box-shadow: 0 0 0 3px var(--color-focus-tint)`.
- **Fix:** give inputs the same solid ring as buttons (`outline:2px solid var(--color-focus);
  outline-offset:2px`), keeping the border darken as a secondary cue.
- **Status:** ✅ implemented.

### M5 · Native `<select>` omits the DS bordered chevron column / divider · `component` · effort M
The DS select's characteristic segmented look — `field │ ▾` — is not reproduced (no divider,
untokenised chevron colour), so the control reads as a generic HTML select.
- **Portal:** `styles.css:1895` a floating `background-image` chevron, no divider.
- **DS:** `select.postcss` `.select__icon` — a 48 px box with `border-left` + centred chevron.
- **Fix:** reproduce the divider **without markup changes** by layering a second background
  (a 1 px `linear-gradient` rule at the chevron column edge) behind the chevron SVG, and
  tokenise the reserved column width. (Falls back cleanly where the wrapper markup is absent.)
- **Status:** ✅ implemented.

### M6 · Disabled buttons/inputs use `opacity()` instead of DS flat disabled tokens · `component` · effort M
`opacity` makes disabled controls translucent — the page background bleeds through a disabled
navy button and its shadow fades — instead of the DS flat muted fills.
- **DS:** `btn.postcss` filled-disabled → `bg-secondary-200 text-white`; outline/bare →
  `text-secondary-300`; `input.postcss` disabled → `bg-text-50 border-text-300 text-text-400`.
- **Fix:** replace `opacity` with explicit tokens per variant; keep `cursor:not-allowed`.
  (Checkbox/radio `opacity:0.4` already matches DS — left as-is.)
- **Status:** ✅ implemented.

### M7 · Container never widens to the DS 1676 px cap at 3xl · `layout` · effort S
On ≥1920 px federal workstation monitors the portal caps content at 1544 px vs the DS 1676 px
(~8 % narrower), and is internally inconsistent because padding and `section-py` already
cascade to 1920 while `max-width` freezes at the 2xl value.
- **Fix:** add `@media (min-width:1920px){ :root{ --container-max-width:1676px } }`.
- **Status:** ✅ implemented.

### M8 · Skip-link does not reproduce the DS federal skip-to-content pill · `component` · effort S
Colour (`gray-800` vs `secondary-900`), placement (top-left corner vs horizontally centred),
the white 2 px border, the shadow and the slide-in transition are all missing.
- **DS:** `global.postcss:63-73` centred pill, `bg-secondary-900`, white 2 px border, shadow,
  `translateY(-200%)`→`0` slide.
- **Fix:** restyle `.skip-to-content` to the centred federal pill, respecting the
  reduced-motion block.
- **Status:** ✅ implemented.

### M9 · Global `:focus-visible` omits the DS `z-10` stacking · `a11y` · effort S
In dense layouts a later-painted neighbour with its own background can overpaint the outline,
partially hiding the focus ring (WCAG 2.4.7 / 2.4.11) — exactly what the DS `z-10` prevents.
- **DS:** `global.postcss:75-76` `*:focus-visible { … z-10 }`.
- **Fix:** add `z-index:10` to the global `:focus-visible` rule (faithful to DS
  `z-10`). `position` is deliberately **not** forced — that would break sticky/
  fixed focusables (e.g. back-to-top); on static elements this is inert exactly
  as the DS `z-10` is, and it lifts the ring on already-positioned controls.
- **Status:** ✅ implemented.

### M10 · Modal scrolls as one card — header/footer not pinned · `component` · effort M
Footer action buttons can scroll off-screen on a long modal, whereas the DS keeps the footer
persistently visible; the dialog also omits an `aria-describedby` association to the body.
- **DS:** `modal.postcss` — `modal__content max-h-[80vh]` with only `modal__body` scrolling.
- **Fix:** make `.modal` a flex column capped at `max-height` with `.modal__body` as the only
  scroll region; add `aria-describedby` → body id in `lib.js modal()`.
- **Status:** ✅ implemented.

### M11 · Heading line-heights diverge from DS `leading-tight` · `typography` · effort S
Portal `.h3` renders at 1.375 where the DS explicitly applies `leading-tight` (1.25) to
`text--xl`.
- **Fix:** set `.h3` line-height to `var(--line-height-tight)`.
- **Status:** ✅ implemented.

### M12 · Ad-hoc per-grid gutters instead of a shared responsive cascade · `spacing` · effort M
`card-grid` jumps 24→48 (skipping the DS 40 step); horizontal rhythm varies page to page.
- **Fix:** introduce a `--gap-responsive` cascade (24/32/40/48 at the DS breakpoints) and apply
  it to `.card-grid` (the main offender); larger grids reviewed case-by-case.
- **Status:** ✅ implemented (card-grid); broader roll-out noted as follow-up.

### M13 · Navbar height fixed at 56 px — DS scales to 64/80 px at xl/3xl · `spacing` · effort S
The nav row reads proportionally short against the top-bar/brand-bar, which already scale.
- **Fix:** add `--nav-height` steps at 1280 px (64) and 1920 px (80).
- **Status:** ✅ implemented.

### M14 · Canonical U+202F required-asterisk defined but never wired · `typography` · effort M
The DS treatment (U+202F non-wrapping generated asterisk, inheriting label colour) ships in
CSS but renders nowhere; forms print a literal `*` after a plain space, painted danger-red.
- **Fix:** the `.form-field__label--required::after` pattern (U+202F asterisk) is the
  recommended path and stays available; the red marker is retained as a **deliberate** a11y cue,
  documented at the CSS rule site (`styles.css` FORM FIELDS). A full migration of every wizard
  label from the literal-span fallback to the class is a JS follow-up (regression-scoped).
- **Status:** ◑ partial — pattern available + colour choice documented; label migration deferred.

---

## 4. Low-priority findings

| # | Finding | Dim | Effort | Status |
|---|---------|-----|:------:|:------:|
| L1 | Link hover/focus darken to `primary-700`; DS is `primary-800`, and links have no focus colour. | colour | S | ✅ |
| L2 | No global `scroll-margin-top` on `[id]` targets (DS applies `scroll-mt-8`). | a11y | S | ✅ |
| L3 | Footer link rows only lighten text on hover — DS fills the whole row background. | nav | S | ✅ |
| L4 | Default/gray badge uses neutral `gray-200`; DS `.badge--gray` uses blue-gray `secondary-100`. | colour | S | ◑ documented deviation |

---

## 5. Documentation drift & deviation register corrections

The following `DESIGNGUIDE.md` claims no longer match the code and were corrected during this
pass:

1. **§2.7 / §5.1 "softer card shadows"** — `tokens.css:422-425` are now byte-for-byte identical
   to the DS `shadow-lg`/`shadow-2xl`. The deviation no longer exists → reclassified as aligned.
2. **§5.2 "wider button padding (24 px)"** — `styles.css:1116` uses `space-md` (16 px) = DS
   `px-4`. Entry removed.
3. **§2.2 "type scale starts one step smaller than DS"** — the responsive ramp now matches DS
   `text--3xl/2xl/xl/lg` exactly. Note corrected.
4. **§5.8 "mobile menu is a plain toggle"** — `shell.js` now ships a fixed full-screen overlay
   with focus-trap, scroll-lock and Esc-close. Re-scoped: the only remaining true gap is the DS
   open/close fade + level-slide animation.
5. **Table-header casing comment (`styles.css:2331`)** — asserted DS defaults to sentence-case;
   DS actually defaults to **uppercase**. Comment corrected; sentence-case is now recorded as a
   deliberate scannability deviation.
6. **Fallback-font metric comment (`tokens.css:60`)** — `descent-override` is `25 %` where the
   DS source is `-25 %`; the "copied verbatim" claim was corrected.

**New / re-affirmed intentional deviations** (recorded in `DESIGNGUIDE.md` §5):
- 3 px focus outline on light surfaces (vs DS 2 px ring) — a WCAG-2.4.11-favourable choice;
  now made consistent (one thickness, colour-only change on dark chrome).
- Sentence-case + bold table headers — reviewer-queue scannability.
- `.overtitle` uppercase + tracking + gray-500 recolour — legibility on light card surfaces.
- Neutral gray (not blue-gray) default badge — dense data tables.
- Static-px icon scale (no DS md/lg responsive growth) — now listed explicitly.
- Prototype-notice mechanism (chip + acknowledged fixed banner, `.alert-banner` intentionally
  unused) — **verified accurate**, not drift.

---

## 6. Implementation strategy

Work was sequenced to protect the green verify suite (`npm test` = lint + domain-units +
CD-token; plus the Playwright `verify:*` checks) at every step.

- **Phase A — token & CSS quick wins** (M1–M13 CSS-only, L1–L3): pure `tokens.css`/`styles.css`
  edits, all token-based, no markup churn. Lowest risk, verified with `npm test`.
- **Phase B — structural a11y/UX** (H1–H3, M5, M10): JS + CSS changes to the accordion, toast,
  modal, mobile chrome and select. Verified with `npm test` + `verify:mobile-nav`,
  `verify:header-chrome`, `verify:a11y`.
- **Phase C — documentation**: rewrite the drifted `DESIGNGUIDE.md` §5 entries and inline
  comments; this analysis document is the standing record.

Everything above the "deferred" markers is implemented on this branch. Remaining follow-ups
(low-risk, out of scope for a single pass): full wizard required-label migration (M14), the DS
accordion open/close fade + level-slide animation, and rolling `--gap-responsive` across the
remaining ad-hoc grids (M12).

---

## 7. Verification

Baseline before changes: `npm test` green (lint + domain-units + CD-token).
After each phase the same suite plus the relevant `verify:*` Playwright checks were re-run.
Final state is recorded in the commit accompanying this document.
