# Tenant Portal — CD Bund Remediation Plan

Step-by-step plan to close the gaps identified in
[docs/design-system-audit.md](./design-system-audit.md). Each step is
self-contained: it lists the audit IDs it resolves, the files it touches,
the change in concrete terms, acceptance criteria, and risks.

Effort: XS ≤ 1 h · S = half-day · M = 1–2 days · L = ≥ 1 week.

> **Decisions required before starting** (from §6 Open Questions, audit
> document):
> - **D1** — Federal red: keep DS `#D8232A` (current) or revert to eCH
>   `#DC0018`? Default: keep DS.
> - **D2** — Mobile-menu pattern: v1 (single-level drawer) or v2
>   (multi-level slide-in)? Default: v1.
> - **D3** — Table-header case: stay sentence-case (current, reviewer-tool
>   ergonomics) or revert to DS uppercase? Default: stay sentence-case;
>   document the deviation in `tokens.css`.
> - **D4** — Language switcher mechanic: native `<select>` (DS canonical)
>   or keep ARIA listbox? Default: keep listbox.
> - **D5** — DS version pin: v1.0.5 (local clone) or v1.0.9 (claimed in
>   `tokens.css`)? Default: align comments to whatever ships in
>   `swiss/designsystem@main` HEAD today.
>
> Defaults are applied below unless the user redirects. Open Questions D1
> and D3 gate Phase 3 cosmetic items only; D2 affects Phase 1 effort
> sizing.

---

## Phase 1 — Mobile blockers & WCAG-AA criticals

Goal: every primary mobile flow (apply for space, switch role, browse
properties, view tenancy) is usable on a 375 px viewport without
horizontal scroll, with reachable touch targets, and AT-correct language
handling.

### Step 1.1 — Move the mobile-nav breakpoint to `lg` (1024 px)

- **Resolves:** M-B2, M-C6.
- **Effort:** S.
- **Files:**
  - [css/styles.css:2595](../css/styles.css#L2595) — change
    `@media (max-width: 768px) { … }` to
    `@media (max-width: 1023.98px) { … }` for the burger / nav-collapse
    block.
  - [css/styles.css:2591](../css/styles.css#L2591) — re-check the
    `@media (max-width: 1024px)` `.top-header` wrap rule; merge or order
    so the brand-bar wrap and the nav collapse share the same threshold.
  - [css/styles.css:186](../css/styles.css#L186) — re-check the
    `top-bar__prototype-notice` hide; keep at `≤ 768px` (small viewports
    only).
  - [css/styles.css:399](../css/styles.css#L399) — `.top-header__meta`
    hide rule: move from `max-width: 768px` to `max-width: 1023.98px`
    so meta links are only burger-surfaced when the burger is showing.
- **Acceptance:**
  - At 900 px width, the burger is visible; the desktop horizontal nav is
    hidden.
  - At 1024 px the burger is hidden; desktop nav appears.
  - Lighthouse mobile audit shows no horizontal scrollbar at 360/375/414
    width.
- **Risks:** desktop screenshots between 769–1023 will regress
  visually — this is the intent, but confirm the property-detail and
  reviewer-queue layouts don't lose information density at that range.

### Step 1.2 — Adopt the canonical `.mobile-menu` pattern (single-level)

- **Resolves:** M-D1, M-D3, M-D4.
- **Effort:** M.
- **Decision dependency:** D2 (default v1).
- **Files:**
  - [js/shell.js:268–278](../js/shell.js#L268) — wrap the
    `.main-navigation` (already inside `.navbar__inner`) in a
    `<div class="mobile-menu">` only at mobile widths, or render the
    mobile nav as a sibling. Two options:
    - **Light-touch (recommended):** keep current markup, rename class
      states. Add `.mobile-menu` and `.mobile-menu--is-open` modifiers to
      the existing `.main-navigation`, then port the DS CSS rules.
    - **Full DS port:** copy `designsystem/css/sections/mobile-menu.postcss`
      verbatim into `css/styles.css` under the existing federal-chrome
      section.
  - [js/shell.js:567–575](../js/shell.js#L567) — extend `toggleBurger`:
    ```js
    document.body.classList.toggle('body--mobile-menu-is-open', willOpen);
    // Close any open nav-menu dropdowns
    if (!willOpen) document.querySelectorAll('.nav-menu:not([hidden])')
      .forEach(m => toggleNavMenu(m.id.replace('navMenu-', ''), false));
    ```
  - [css/styles.css](../css/styles.css) — add `body.body--mobile-menu-is-open
    { overflow: hidden; height: 100vh; }` near the top-bar rules
    (mirrors [designsystem/css/foundations/global.postcss:34–37](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/foundations/global.postcss#L34)).
  - [js/shell.js](../js/shell.js) — add a small focus-trap helper that
    cycles Tab inside `.main-navigation` while `body--mobile-menu-is-open`
    is set; restore focus to `.burger` on close.
- **Acceptance:**
  - Opening the burger at 375 px viewport locks page scroll.
  - Closing the burger releases scroll and returns focus to the burger
    button.
  - Tab from the last menu item cycles back to the first.
  - Esc closes the menu and any open nav-menu dropdown.
- **Risks:** scroll-lock interacting with iOS Safari's address-bar
  collapse — test on a real iPhone (or BrowserStack iOS).

### Step 1.3 — Update `<html lang>` on language pick

- **Resolves:** M-A3, DS-U2.
- **Effort:** XS.
- **Files:**
  - [js/shell.js:494–506](../js/shell.js#L494) — in `pickLang(code)` add
    `document.documentElement.lang = code.toLowerCase()` as the first
    line.
- **Acceptance:**
  - Picking FR / IT / EN updates the `<html lang>` attribute (DevTools
    inspector confirms).
  - VoiceOver / NVDA switches pronunciation language on the next
    focused element.
- **Risks:** none.

### Step 1.4 — Add EN to the language switcher

- **Resolves:** DS-U1.
- **Effort:** XS.
- **Files:**
  - [js/shell.js:217–219](../js/shell.js#L217) — add a fourth `<li>` for
    `EN` with `lang="en"`. Update `toggleLang` arrow-key wrap-around
    (still works since it iterates `.language-switcher__option`).
  - [js/shell.js:503–505](../js/shell.js#L503) — keep the "noch nicht
    implementiert" toast, but make it conditional on `code !== 'DE'` (as
    already coded — no change unless we ship real translations).
- **Acceptance:** EN appears in the dropdown, picking it sets `lang="en"`
  and emits the toast.
- **Risks:** none.

### Step 1.5 — Touch targets in federal chrome

- **Resolves:** M-C2, M-C3, M-C4, M-C5, M-C9.
- **Effort:** S.
- **Files:**
  - [css/styles.css:229–242](../css/styles.css#L229) — `.top-bar__lang`:
    add `min-height: 44px`.
  - [css/styles.css:154–168](../css/styles.css#L154) — `.top-bar__authorities`:
    add `min-height: 44px; min-width: 44px`.
  - [css/styles.css:203–217](../css/styles.css#L203) — `.top-bar__link`:
    add `min-height: 44px`.
  - [css/styles.css:261–282](../css/styles.css#L261) —
    `.language-switcher__option`: add `min-height: 44px`.
  - [css/styles.css:2111–2126](../css/styles.css#L2111) — `.share-bar__btn`:
    add `min-height: 44px; min-width: 44px`.
  - [css/styles.css:1660–1680](../css/styles.css#L1660) —
    `.filter-pill__remove`: keep the 22 × 22 visual; expand the hit area
    via `padding: 11px` + a clamp on the filter-pill height; or wrap the
    button in an outer 44 × 44 absolutely-positioned hit slop.
  - [css/styles.css:1739–1758](../css/styles.css#L1739) —
    `.pagination__input`: add `min-height: var(--btn-min-h)`.
- **Acceptance:**
  - Every interactive element in the top-bar, brand-bar, share-bar, and
    filter-pill row is ≥ 44 × 44 px at 375 px viewport
    (verify in DevTools "Inspect computed").
  - No visual regression on desktop (top-bar height is already
    `var(--topbar-height)` = 46/50/56 px so it absorbs taller chips).
- **Risks:** top-bar may grow vertically by 4–8 px on phones — confirm
  the `top-bar__prototype-notice` absolute-centred caption still aligns.

### Step 1.6 — Ship woff2 web fonts

- **Resolves:** M-J1.
- **Effort:** S.
- **Files:**
  - `assets/fonts/` — add `NotoSans-{Regular,Bold,Italic,BoldItalic}.woff2`
    (generate from the existing TTFs with `woff2_compress` or `fonttools`).
  - [css/tokens.css:19–50](../css/tokens.css#L19) — change each
    `url('../assets/fonts/NotoSans-X.ttf') format('truetype')` to
    `url('../assets/fonts/NotoSans-X.woff2') format('woff2')`.
- **Acceptance:**
  - Network panel shows woff2 download size ~150 KB / face (vs.
    ~580 KB TTF).
  - No visible font shift on first paint.
- **Risks:** none — woff2 is supported in every browser back to
  Edge 14 / Safari 10.

### Step 1.7 — `inputmode` and `autocomplete` on critical inputs

- **Resolves:** M-E2, M-E3 (partial).
- **Effort:** XS.
- **Files:**
  - [js/wizard.js:347](../js/wizard.js#L347) — FTE input: add
    `inputmode="numeric"`.
  - [js/wizard.js:557](../js/wizard.js#L557) — cost input: add
    `inputmode="numeric"`.
  - [js/app.js:1933, 2994](../js/app.js#L1933) — pagination inputs: add
    `inputmode="numeric"`.
  - [js/app.js:3123](../js/app.js#L3123) — phone input: add
    `autocomplete="tel"` and `inputmode="tel"`.
- **Acceptance:** on iOS Safari and Android Chrome, the FTE and pagination
  fields open a numeric keyboard; the damage-report phone field opens the
  tel pad with system contact suggestions.
- **Risks:** none.

### Step 1.8 — Form-error a11y wiring

- **Resolves:** M-E5.
- **Effort:** S.
- **Files:**
  - [js/wizard.js](../js/wizard.js) and any view in [js/app.js](../js/app.js)
    that renders `.form-field__error` — give each error span a stable
    `id` (e.g. `${name}-error`); on the input add
    `aria-describedby="${name}-error" aria-invalid="true"` when the
    field is invalid; remove both when it validates.
  - Consider a small helper in [js/lib.js](../js/lib.js) — `setFieldError(input, msg)`
    that toggles all three (`.form-field--invalid`, the error span text,
    `aria-describedby`, `aria-invalid`).
- **Acceptance:** screen reader announces the error message when focus
  enters an invalid field.
- **Risks:** none.

**Phase 1 exit criteria:** Lighthouse mobile a11y ≥ 95; no audit-Critical
or audit-High mobile findings open; manual run-through of
`#/wizard/1 → /wizard/5` on a 375 px viewport submits without horizontal
scroll, without overflow clipping, and with reachable controls.

---

## Phase 2 — Design-system alignment

Goal: visible federal-CD fingerprint on every component a casual visitor
sees. Phase 2 closes the audit's Medium-severity items and the
remaining DS-pattern divergences.

### Step 2.1 — Button weight base

- **Resolves:** DS-M1.
- **Effort:** XS.
- **Files:**
  - [css/styles.css:749](../css/styles.css#L749) — remove
    `font-weight: var(--font-weight-bold)` from `.btn` base; the rule
    becomes weight-neutral so non-filled variants inherit the body
    `400`. Update the surrounding comment.
  - [css/styles.css:761–765](../css/styles.css#L761) — `.btn--filled`:
    add `font-weight: var(--font-weight-bold)`.
  - [css/styles.css:2100](../css/styles.css#L2100) — `.btn--back`: remove
    the explicit `font-weight: var(--font-weight-normal)` (no longer
    needed once the base is normal).
- **Acceptance:** every non-filled button (outline, bare, back, link)
  renders in regular weight; only filled CTAs are bold. Visual diff via
  Storybook-equivalent test page (`#/help` or `#/profile`).
- **Risks:** subtle visual regression — review the wizard sticky footer
  and the reviewer-queue toolbars side-by-side.

### Step 2.2 — Checkbox / radio in DS appearance-none style

- **Resolves:** DS-N1.
- **Effort:** M.
- **Files:**
  - [css/styles.css:1476–1484](../css/styles.css#L1476) — replace the
    `option-group__item input[type=…]` block (which uses native
    `accent-color`) with a port of [designsystem/css/components/input.postcss:80–151](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/input.postcss#L80):
    `appearance: none`, 0.9 rem box, embedded SVG check (`background-image: url("data:image/svg+xml,…")`),
    `border: 1px solid var(--color-border-input)`,
    `background-color: var(--color-text-primary)` on `:checked`.
  - Verify on the wizard NAW step ([js/wizard.js:300–339](../js/wizard.js#L300))
    and the damage-report form ([js/app.js:3105–3110](../js/app.js#L3105)).
- **Acceptance:** checkbox / radio render identically on Windows
  Chrome, Edge, and Safari (no native control fallback).
- **Risks:** specificity collisions with `.option-group__item input` —
  test all `.radio-group`, `.checkbox-group`, `.option-group` call sites.

### Step 2.3 — Modal focus trap + a11y

- **Resolves:** DS-Q1, M-D4 (modal part).
- **Effort:** S.
- **Files:**
  - [js/lib.js](../js/lib.js) — find the modal open helper (or add one).
    On open: record `document.activeElement`, set focus to the first
    focusable child of `.modal`, trap Tab / Shift-Tab.
    On close: restore focus to the recorded element.
  - [css/styles.css:1784–1824](../css/styles.css#L1784) — add
    `role="dialog" aria-modal="true"` to the `.modal-backdrop` /
    `.modal` markup in every view that opens one
    ([js/app.js](../js/app.js) — bulk-approve modal, role-switch modal,
    etc.).
- **Acceptance:** keyboard-only user cannot Tab out of an open modal;
  Esc closes; focus returns to trigger.
- **Risks:** existing modals that use inline `onclick="…close(this)"`
  may need to be re-bound to the central helper.

### Step 2.4 — Image lazy-loading + responsive sources

- **Resolves:** M-I1, M-I2.
- **Effort:** M.
- **Files:**
  - [js/app.js](../js/app.js) — every place that renders a property
    photo, news card photo, or hero photo as CSS `background-image`:
    consider converting to a real `<img>` with explicit
    `width`/`height`/`loading="lazy"`/`srcset`. Top candidates:
    `.card--property__image`, `.card--profile__image`,
    `.news-list__image`, `.hero__figure img`, `.property-header__image`.
  - Generate 1×/2× variants for hero and card photos; store under
    `assets/images/.../{name}@1x.jpg` + `@2x.jpg`.
- **Acceptance:** Lighthouse "Defer offscreen images" passes; LCP on
  mobile drops by 200–500 ms on the home page.
- **Risks:** background-image lets the CSS handle aspect-ratio cleanly;
  switching to `<img>` requires `aspect-ratio` CSS on the wrapper to
  prevent CLS.

### Step 2.5 — Icon set vendor-in

- **Resolves:** DS-T1.
- **Effort:** M.
- **Files:**
  - Export a deduplicated `assets/icons.svg` sprite (one `<symbol>` per
    icon) from [designsystem/app/assets/icons](C:/Users/DavidRasner/Documents/GitHub/designsystem/app/assets/icons).
  - [js/lib.js](../js/lib.js) — change `icon(name)` to return
    `<svg class="inline-icon" aria-hidden="true"><use href="assets/icons.svg#${name}"/></svg>`.
  - [js/shell.js](../js/shell.js) — replace inline SVG strings at
    `:103, 156, 188, 205, 249, 275, 300, 433, 443, 448` with
    `icon('user')`, `icon('close')`, etc.
- **Acceptance:** all glyphs share stroke-width and metaphor; bundle
  size of `js/shell.js` drops noticeably (inline SVG strings removed).
- **Risks:** the federal icon set may be missing portal-specific glyphs
  (BBL-specific actions). Keep a small `inline-icon--custom` allowlist
  for those.

### Step 2.6 — Notification-banner DS alignment (optional)

- **Resolves:** DS-R1.
- **Effort:** S.
- **Decision dependency:** product call — keep the Bootstrap-style left
  rail (current, very legible) or adopt DS's borderless variant.
- **Files:** [css/styles.css:1486–1546](../css/styles.css#L1486).
- **Acceptance:** visual diff on `#/inbox` warning banner matches the
  agreed pattern.
- **Risks:** if we keep the current pattern, document the deviation in
  the section header comment so future audits don't re-flag it.

**Phase 2 exit criteria:** zero audit-Medium DS-alignment findings
open; visual review on home, wizard, queue, properties, news pages
sign-off from a CD reviewer.

---

## Phase 3 — Polish, docs, decisions

Goal: close the long-tail.

### Step 3.1 — Required-asterisk a11y

- **Resolves:** M-E6.
- **Effort:** XS.
- **Files:** [css/styles.css:1364](../css/styles.css#L1364) — change
  `.form-field__required` to a class that uses `::after { content: '\\202F*';
  speak: none; }` (mirror [designsystem/css/foundations/typography.postcss:91–98](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/foundations/typography.postcss#L91)).
  Update wizard / form templates to use the class on the label, not on
  an inline `<span>`.
- **Acceptance:** screen readers no longer announce "star" on every
  required field.

### Step 3.2 — Animated burger

- **Resolves:** M-D2.
- **Effort:** S.
- **Files:**
  - [js/shell.js:275](../js/shell.js#L275) — replace the static SVG with
    the DS three-bar markup (three `.burger__bar` spans inside a
    `.burger__icon`).
  - [css/styles.css](../css/styles.css) — port [designsystem/css/components/burger.postcss:5–76](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/burger.postcss#L5)
    into the existing federal-chrome section.
- **Acceptance:** opening the burger animates bars into an X; respects
  `prefers-reduced-motion`.

### Step 3.3 — Table-header case decision

- **Resolves:** DS-P1.
- **Effort:** XS (decision) + XS (apply).
- **Decision dependency:** D3 (default: stay sentence-case, document).
- **Files:**
  - If reverting to uppercase: change [css/styles.css:1566–1572](../css/styles.css#L1566)
    to add `text-transform: uppercase; letter-spacing: 0.4px`; flip
    `.table--caps` to a no-op or repurpose as `.table--no-caps`.
  - If staying: tighten the existing comment block at
    [:1561–1565](../css/styles.css#L1561) so the divergence is
    immutable doc.

### Step 3.4 — Filled-button colour ramp

- **Resolves:** DS-M2.
- **Effort:** XS.
- **Files:** [css/styles.css:761–765](../css/styles.css#L761) — change
  background from `--color-secondary-600` to `--color-secondary-500`
  (and `hover` from `-700` to `-600`).
- **Acceptance:** filled buttons read slightly lighter; matches DS
  `.btn--filled`. Confirm focus-ring still contrasts.

### Step 3.5 — README + tokens.css doc cleanup

- **Resolves:** DS-W1, DS-W2.
- **Effort:** XS.
- **Files:**
  - [README.md:53](../README.md#L53) — replace the broken
    `docs/CD-AUDIT.md` link with `docs/design-system-audit.md` (the
    current audit can replace the old one) and
    `docs/remediation-plan.md` (this file).
  - [css/tokens.css:11](../css/tokens.css#L11) — update the "v1.0.9"
    claim to whatever DS version is actually being tracked (per D5).

### Step 3.6 — Open-Question follow-ups

Schedule a working session to land D1–D5. Once decided, fold the
outcomes into:
- D1 → `--color-primary-600` token rewrite (one-line change in
  [css/tokens.css:76](../css/tokens.css#L76); cascades through every
  red surface).
- D2 → reopens Step 1.2 effort estimate (v2 doubles it).
- D3 → Step 3.3.
- D4 → if native `<select>`, rewrite [js/shell.js:210–222](../js/shell.js#L210).
- D5 → Step 3.5.

**Phase 3 exit criteria:** zero audit findings open at any severity;
doc set (README, audit, remediation plan, `tokens.css` comments) tells
a consistent story about DS version, deviations, and rationale.

---

## Execution mechanics

- **One step = one PR.** Steps 1.1, 1.2 are independent of the others and
  should ship first because they unblock the rest of Phase 1.
- **Test surface per step.** Each step's "Acceptance" line is the
  manual / Lighthouse check to run before merging. There is no test
  suite in this repo today — verification is by inspection.
- **Rollback.** Every step is a pure CSS / template / JS edit with no
  data implications. `git revert` is the rollback path.
- **Browser matrix.** Verify each step on:
  - Mobile: iOS Safari (iPhone 12 / SE2), Android Chrome (Pixel 5).
  - Desktop: latest Firefox, Chrome, Edge, Safari.
  - The Surface / iPad-with-keyboard hybrid case is implicit in the
    Phase-1 a11y tests (focus rings + touch targets simultaneously).
- **Reviewer.** Each DS-alignment step (Phase 2 / 3) should be reviewed
  by someone familiar with `swiss/designsystem` Storybook before merge;
  visual side-by-side against the canonical component.

## Estimated total effort

| Phase | Steps | Sum |
|---|---|---|
| Phase 1 | 1.1 – 1.8 | ~5 dev-days |
| Phase 2 | 2.1 – 2.6 | ~6 dev-days |
| Phase 3 | 3.1 – 3.6 | ~2 dev-days |
| **Total** | 20 steps | **~13 dev-days** |

Spread over a two-developer team with one reviewer, this is a ~2-week
sprint. Phase 1 alone is the launch-blocker bundle and is achievable in
a single week if no Open Questions stall the work.
