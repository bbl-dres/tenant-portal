# Tenant Portal — Swiss Federal Design System Audit

> Scope: alignment of `tenant-portal` against `swiss/designsystem` v1.0.x,
> primary lens **mobile + responsive behaviour**. Cites concrete `file:line`
> in both repos. No application source was modified. Plan in
> [docs/audit-plan.md](./audit-plan.md).

---

## 1. Executive summary

- **Mobile-nav breakpoint is off by 256 px.** Tenant switches to the burger
  at `max-width: 768px` ([css/styles.css:2595](../css/styles.css#L2595)); the
  design system makes desktop nav exclusive at `lg` = 1024 px
  ([designsystem/css/navigations/main-navigation.postcss:14](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/navigations/main-navigation.postcss#L14)).
  Between 768 px and 1024 px the desktop nav is on display but cramped — the
  highest-impact mobile gap.
- **No canonical mobile-menu pattern.** Tenant overloads
  `.main-navigation.open` as a vertical drop ([css/styles.css:2596–2618](../css/styles.css#L2596));
  the design system ships a full `.mobile-menu` with body-class scroll lock
  and animated reveal
  ([designsystem/css/sections/mobile-menu.postcss:5–28](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/sections/mobile-menu.postcss#L5);
  body class at [global.postcss:34–37](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/foundations/global.postcss#L34)).
  No scroll lock, no off-canvas, no animation.
- **Federal-chrome touch targets fall below 44 px.** Language chip
  ([css/styles.css:229–242](../css/styles.css#L229)), top-bar utility links
  ([:203–217](../css/styles.css#L203)), share-bar buttons ([:2111–2130](../css/styles.css#L2111)),
  and filter-pill close ([:1660–1680](../css/styles.css#L1660)) are all under
  the WCAG 2.5.5 target. The wizard CTA and primary buttons are correct
  ([:745](../css/styles.css#L745)).
- **Web fonts ship as TTF, not woff2.** Four `~580 KB` TTF files in
  [css/tokens.css:19–50](../css/tokens.css#L19) inflate first-paint cost on
  mobile by ~1.5 MB versus modern equivalent encodings. Bundle is mid-flight
  blocked behind `font-display: swap`, but on slow networks the Fallback
  layout shift is meaningful.
- **`<html lang>` does not change on language pick.** [index.html:2](../index.html#L2)
  starts at `lang="de"` and the language switcher
  ([js/shell.js:494–506](../js/shell.js#L494)) updates display text only.
  AT pronunciation stays German for FR/IT users — eCH-0059 issue.
- **English (EN) locale missing.** Tenant offers DE/FR/IT only
  ([js/shell.js:217–219](../js/shell.js#L217)); CD Bund canonically includes
  English. Even if FR/IT translation is stubbed, EN is required for federal
  parity.
- **Button weight blanket-bolds.** Tenant `.btn` defaults to
  `font-weight: bold` ([css/styles.css:749](../css/styles.css#L749)); CD Bund
  uses `font-normal` for outline/bare/link variants and only bold for filled
  ([designsystem/css/components/btn.postcss:17,27,40,74](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/btn.postcss#L17)).
  Visible in every non-filled control across the portal.
- **Doc drift.** README.md:53 links a `docs/CD-AUDIT.md` that is not present
  in the repo.

Top three remediation priorities, in order: (1) align the nav breakpoint and
adopt the canonical mobile-menu pattern; (2) repair touch-target sizes in the
top bar and share bar; (3) ship woff2 fonts and finish the EN locale + `lang`
attribute wiring.

---

## 2. Methodology

**Inspected.** Tenant `index.html`, full `css/tokens.css` (461 lines),
structural read of `css/styles.css` (5001 lines, every `@media` block and
every component class), `js/shell.js` (federal chrome, 589 lines),
spot reads of `js/wizard.js` and `js/app.js` for input attributes / ARIA /
`<img>` attributes. Designsystem `package.json`,
`css/foundations/{global,typography,spacings}.postcss`, all referenced
components (`btn`, `input`, `form`, `burger`, `table`, `modal`,
`language-switcher`, `notification-banner`, `step-indicator`),
`css/sections/{top-bar,mobile-menu}.postcss`, `css/navigations/main-navigation.postcss`,
and `app/tailwind.config.js` (canonical token scale).

**Greps run.** `inputmode`, `autocomplete`, `srcset`, `loading="lazy"`,
`aria-live`, `lang=`, `font-display`, every `min-height` / `min-h`
declaration.

**Not inspected.** The design system's Vue/Nuxt component source under
`designsystem/app/components`, Storybook stories, the icon SVG set under
`designsystem/app/assets/icons`, and the tenant's GeoJSON / mock JSON
fixtures. Functional correctness (NAW classification, SAP key derivation,
wizard flow) is explicitly out of scope. Real-device or browser screenshot
verification was not run; all severity grades are derived from source-level
evidence.

**Assumptions.** The README's "≈ 99 % aligned with `swiss/designsystem`
v1.0.9" claim is treated as marketing, not a baseline. The portal is in
prototype status (README CAUTION block); the audit still grades against the
production rubric so the prioritisation maps to real launch readiness.
The federal red value debate (`#DC0018` vs. `#D8232A`) is filed under Open
Questions because both occur in different editions of the CD guidance.

---

## 3. Mobile findings

### A. Viewport, language, and responsive root

| ID | Sev | Observation |
|---|---|---|
| **M-A1** | ✓ | `<meta name="viewport" content="width=device-width, initial-scale=1">` set in [index.html:5](../index.html#L5). Matches the DS expectation. |
| **M-A2** | ✓ | `html { font-size: 16px; -webkit-text-size-adjust: 100%; word-spacing: 0.0625em }` in [css/tokens.css:381](../css/tokens.css#L381) mirrors [designsystem/css/foundations/typography.postcss:4–10](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/foundations/typography.postcss#L4). Good for German-compound scannability on small screens. |
| **M-A3** | High | `<html lang="de">` at [index.html:2](../index.html#L2) never updates. `pickLang()` ([js/shell.js:494–506](../js/shell.js#L494)) toggles the visible code only; it does not call `document.documentElement.lang = code.toLowerCase()`. Screen readers, hyphenation engines, and spell-check stay on German for FR/IT users. **Recommendation:** in `pickLang`, set `document.documentElement.lang` to the picked code; if the locale is unsupported (current state for FR/IT), still update `lang` so the announcement is consistent, and surface a `<p lang="fr">`-style override on individual content slots that have been translated. |

### B. Breakpoint system

| ID | Sev | Observation |
|---|---|---|
| **M-B1** | ✓ | Tenant breakpoints `xs/sm/md/lg/xl/2xl/3xl = 480/640/768/1024/1280/1544/1920` ([css/tokens.css:371–373](../css/tokens.css#L371)) match DS exactly ([app/tailwind.config.js:20–28](C:/Users/DavidRasner/Documents/GitHub/designsystem/app/tailwind.config.js#L20)). Container max-width 1544 px ([tokens.css:251](../css/tokens.css#L251)) matches DS `container.2xl: 1544px`. |
| **M-B2** | **High** | Mobile-nav breakpoint mismatch. Tenant burger appears at `max-width: 768px` ([css/styles.css:2595](../css/styles.css#L2595)) and the desktop nav is exposed from 769 px upward. DS canonical desktop nav is `hidden lg:flex` — only visible at ≥ 1024 px ([designsystem/css/navigations/main-navigation.postcss:14](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/navigations/main-navigation.postcss#L14)) and `.burger` is `lg:hidden` ([designsystem/css/components/burger.postcss:6](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/burger.postcss#L6)). In the 769–1023 px window tenant displays a desktop nav that the DS would already have collapsed to a burger. The Dropdown panel "Dienstleistungen" is 480 px wide ([css/styles.css:570](../css/styles.css#L570)) — at 769 px that consumes the whole content row. **Recommendation:** change the mobile-nav guard from `max-width: 768px` to `max-width: 1023.98px` (or `not all and (min-width: 1024px)`), and re-test the burger state inside the existing `js/shell.js#toggleBurger` ([js/shell.js:567–575](../js/shell.js#L567)). |

### C. Touch targets (WCAG 2.5.5, target ≥ 44 × 44 px)

| ID | Sev | Observation |
|---|---|---|
| **M-C1** | ✓ | `.btn` enforces `min-height: var(--btn-min-h)` = 44 px ([css/styles.css:745](../css/styles.css#L745); token at [tokens.css:257](../css/tokens.css#L257)). Inputs match at 44 px ([styles.css:1400](../css/styles.css#L1400)). Matches DS `.btn` `min-h-[44px]` ([btn.postcss:114](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/btn.postcss#L114)). |
| **M-C2** | High | `.top-bar__lang` language chip ([css/styles.css:229–242](../css/styles.css#L229)) — `padding: 4px 8px`, no `min-height`. Renders at ≈ 22–26 px. The trigger lives in the dark top-bar where mobile users frequently tap to switch languages. **Recommendation:** add `min-height: 44px` to `.top-bar__lang` and the surrounding `.language-switcher__option` ([:261–282](../css/styles.css#L261)). |
| **M-C3** | High | `.top-bar__authorities` ([:154–168](../css/styles.css#L154)) and `.top-bar__link` ([:203–217](../css/styles.css#L203)) follow the same 4 px / 8 px pattern with no `min-height`. At ≤ 768 px the `.top-bar__authorities span` is hidden ([:2600](../css/styles.css#L2600)) leaving an icon-only chip with ~12 × 12 px glyph + 16 px padding — still under 44 px and ambiguous as a tap target. **Recommendation:** enforce `min-height: 44px` and `min-width: 44px` on every interactive child of `.top-bar__inner` at mobile widths. |
| **M-C4** | Medium | `.share-bar__btn` ([:2111–2126](../css/styles.css#L2111)) — `padding: 4px 8px`, label hidden below 640 px ([:2129](../css/styles.css#L2129)), only an 18 px SVG remains. Approx 26 × 26 px tap target. Used on every detail page (Liegenschaft, Antrag, News). **Recommendation:** add `min-width: 44px; min-height: 44px` to `.share-bar__btn`. |
| **M-C5** | Medium | `.filter-pill__remove` ([:1660–1680](../css/styles.css#L1660)) is exactly 22 × 22 px. Filter pills appear on `#/properties` and `#/downloads`, both mobile-relevant. **Recommendation:** wrap the X glyph in a 44 × 44 hit area (keep the 22 × 22 visual, expand the clickable region via padding + negative margin, or add an `::after` hit-slop pseudo). |
| **M-C6** | Medium | `.top-header__meta-link` ([:390–397](../css/styles.css#L390)) — `padding: 4px 0`. Hidden on mobile by `[:399–402](../css/styles.css#L399)` and replaced by `.main-navigation__mobile-meta .main-navigation__link` with `var(--space-md)` padding ([:2608–2618](../css/styles.css#L2608)) — that surface is correct. The issue is only at 769–1023 px (the same range hit by **M-B2**). Resolves with **M-B2** unification. |
| **M-C7** | Low | `.mark-button` ([:3777–3792](../css/styles.css#L3777)) — `min-height: 28px`, used in the reviewer-marks panel. Reviewer UI is desktop-first, so impact is low; still flagged. |
| **M-C8** | Low | `.news-section__dot` carousel pagers ([:3992–4003](../css/styles.css#L3992)) — 12 × 12 px. Hidden below `768 px` indirectly by the carousel layout, but if the dot row leaks at intermediate widths it is under target. |
| **M-C9** | Low | `.pagination__input` numeric box ([:1739–1758](../css/styles.css#L1739)) — width 48 px, height derived from font-size (~32 px). Below 44 px target. **Recommendation:** add `min-height: var(--btn-min-h);`. |

### D. Mobile navigation pattern

| ID | Sev | Observation |
|---|---|---|
| **M-D1** | **High** | Tenant's mobile nav is a simple `.main-navigation` flex column shown by adding `.open` ([css/styles.css:2597–2599](../css/styles.css#L2597); JS [js/shell.js:567–575](../js/shell.js#L567)). The DS canonical pattern uses `.mobile-menu` ([designsystem/css/sections/mobile-menu.postcss:5–28](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/sections/mobile-menu.postcss#L5)) with `height: calc(100vh - 65px)`, overflow-y scroll, opacity transition, plus a `body--mobile-menu-is-open` class ([designsystem/css/foundations/global.postcss:34–37](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/foundations/global.postcss#L34)) that locks page scroll. Tenant has no scroll lock — opening the menu while scrolled mid-page leaves the underlying content scrollable. **Recommendation:** adopt `.mobile-menu` markup + JS sets `document.body.classList.toggle('body--mobile-menu-is-open', willOpen)` in `toggleBurger`. |
| **M-D2** | Medium | Burger glyph is a static three-line SVG ([js/shell.js:275](../js/shell.js#L275)) without the open-state animation. DS burger animates bars into an X via three `::after` pseudo-elements ([designsystem/css/components/burger.postcss:35–76](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/burger.postcss#L35)). Visual feedback parity gap, not a functional bug. |
| **M-D3** | Medium | Nav-dropdown panel (`.nav-menu`, [js/shell.js:149–176](../js/shell.js#L149)) is 480 px wide ([css/styles.css:570](../css/styles.css#L570)) and uses JS to anchor it under the trigger ([:383–417](../js/shell.js#L383)). At ≤ 640 px the panel narrows to `100vw - 24px` ([:649–654](../css/styles.css#L649)) — good. But the panel never closes when the underlying mobile burger menu collapses; both can briefly coexist if the trigger is reachable in the mobile vertical nav. **Recommendation:** in `toggleBurger`, also force-close every open `.nav-menu` via `toggleNavMenu(id, false)`. |
| **M-D4** | Medium | No focus trap inside the open mobile nav or the nav-menu dropdown. A keyboard user tabbing past the last menu item lands on page content underneath. DS pattern (Storybook component) traps focus while the body class is set. **Recommendation:** trap focus while `document.body.classList.contains('body--mobile-menu-is-open')`. |

### E. Form ergonomics

| ID | Sev | Observation |
|---|---|---|
| **M-E1** | ✓ | Inputs hit 44 px ([css/styles.css:1400](../css/styles.css#L1400)), matching DS `--input-min-height: 44px` ([designsystem/css/components/input.postcss:1–4](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/input.postcss#L1)). |
| **M-E2** | Medium | Numeric inputs miss `inputmode`. [js/wizard.js:347](../js/wizard.js#L347) FTE field is `type="number"` with no `inputmode="numeric"`. Same at [js/wizard.js:557](../js/wizard.js#L557) (cost field) and pagination inputs [js/app.js:1933, 2994](../js/app.js#L1933). On mobile, `type="number"` opens the full numeric pad with sign/decimal; `inputmode="numeric"` opens a digits-only pad without losing the spinner. **Recommendation:** add `inputmode="numeric"` and consider `pattern="\\d*"` for integer-only fields. |
| **M-E3** | Medium | Damage-report phone input at [js/app.js:3123](../js/app.js#L3123) is `type="tel"` (good) but lacks `autocomplete="tel"`. Address input at [js/wizard.js:189](../js/wizard.js#L189) is `autocomplete="off"` — fair given it's a building-name `datalist`, but consider `autocomplete="street-address"` if free-text is ever accepted. |
| **M-E4** | ✓ | Wizard sticky footer at [css/styles.css:3574–3592](../css/styles.css#L3574) uses `flex-wrap: wrap` and small gap — survives 320 px without horizontal overflow. |
| **M-E5** | Medium | Validation errors render as `.form-field__error` ([:1429–1433](../css/styles.css#L1429)) but the audit found no `aria-describedby` linkage between `.form-field__input` and `.form-field__error`, and no `aria-invalid="true"` toggling. Screen-reader users won't be told why a field is invalid. **Recommendation:** when adding an error message, set `aria-describedby="<error-id>"` and `aria-invalid="true"` on the control; remove both when the error clears. |
| **M-E6** | Low | Required-field marker uses a bare red asterisk ([css/styles.css:1364](../css/styles.css#L1364)). DS uses `.text--asterisk::after { content: '\\202F*' }` with a narrow-no-break-space prefix and `speak: none` ([designsystem/css/foundations/typography.postcss:91–98](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/foundations/typography.postcss#L91)). Tenant's asterisk is announced as "star" by some screen readers. **Recommendation:** add `speak: none` and consider DS's NNBSP separator. |

### F. Typography on mobile

| ID | Sev | Observation |
|---|---|---|
| **M-F1** | ✓ | Base `--text-body: 1rem` (16 px) at [tokens.css:211](../css/tokens.css#L211). h1 mobile 26 px ([:209](../css/tokens.css#L209)), h2 22 px ([:210](../css/tokens.css#L210)) — matches DS `text--3xl` / `text--2xl` mobile-base ([typography.postcss:28–36](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/foundations/typography.postcss#L28)). |
| **M-F2** | ✓ | Noto Sans is preferred via `local()` first, with bundled fallback ([tokens.css:21,29,37,45](../css/tokens.css#L21)). Fallback metric overrides via `Fallback-NotoSans` ([:55–62](../css/tokens.css#L55)) match DS pattern ([font-face.postcss:37–44](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/foundations/font-face.postcss#L37)). Prevents reflow during font swap. |
| **M-F3** | Low | `--text-micro: 0.6875rem` (11 px) at [tokens.css:214](../css/tokens.css#L214) is below WCAG-comfortable size for body context. Used sparingly (badge prefixes, footer micro). Acceptable if confined to decorative meta; flag any use as primary content. |

### G. Reflow / overflow

| ID | Sev | Observation |
|---|---|---|
| **M-G1** | ✓ | `.container { overflow-x: clip }` ([css/styles.css:49](../css/styles.css#L49)) protects the page from accidental horizontal scroll. |
| **M-G2** | ✓ | Wide tables wrap in `.docs-table-wrap` ([:1692–1694](../css/styles.css#L1692)) and `.property-list-wrap` ([:4163](../css/styles.css#L4163)) — `overflow-x: auto`. |
| **M-G3** | ✓ | `.pipeline { overflow-x: auto }` ([:1197](../css/styles.css#L1197)) keeps the antrag-status chevron strip from breaking the page at narrow widths. |
| **M-G4** | ✓ | Step indicator stacks to one column at ≤ 640 px ([:1341–1344](../css/styles.css#L1341)). |
| **M-G5** | ✓ | History timeline collapses three-column grid to one column at ≤ 768 px ([:3874–3876](../css/styles.css#L3874)). |
| **M-G6** | Low | `.nav-menu` at `width: 480px` ([:570](../css/styles.css#L570)) clamps with `max-width: calc(100vw - 24px)` ([:571](../css/styles.css#L571)). Acceptable, but pair with **M-B2** so the panel never opens between 769 and 1023 px in the first place. |

### H. Mobile accessibility

| ID | Sev | Observation |
|---|---|---|
| **M-H1** | ✓ | Skip-link present at [css/tokens.css:447–460](../css/tokens.css#L447). Visible on focus. |
| **M-H2** | ✓ | `prefers-reduced-motion` block at [css/tokens.css:435–444](../css/tokens.css#L435) zeroes transitions and animations. Sound implementation. |
| **M-H3** | ✓ | `aria-live` regions on wizard autosave ([js/wizard.js:156](../js/wizard.js#L156)), pagination count ([js/app.js:1930,2990](../js/app.js#L1930)), toast host ([js/lib.js:323](../js/lib.js#L323)). |
| **M-H4** | Medium | Focus rings are visually correct (3 px purple, [css/tokens.css:421–425](../css/tokens.css#L421)) but the touch-target gaps in **M-C2/3/4/5** create a parallel a11y issue for keyboard users on touch devices (Surface, iPad-with-keyboard). Same recommendation applies. |
| **M-H5** | Medium | The dropdown nav menu (`.main-navigation__link--has-menu`) and the language switcher use `aria-expanded` and `aria-haspopup` correctly ([js/shell.js:114–127, 211–215](../js/shell.js#L114)) — good. However `aria-controls` on the burger ([js/shell.js:273](../js/shell.js#L273)) points at `#mainNavigation`, which exists in the desktop nav region. At the wider breakpoint where the burger is also rendered (current bug **M-B2**), the relationship is structurally correct but visually misleading. Resolves with **M-B2** and **M-D1**. |

### I. Image / media

| ID | Sev | Observation |
|---|---|---|
| **M-I1** | Medium | `loading="lazy"` appears only twice in `js/app.js` ([:617, :874](../js/app.js#L617)). Property photos and news cards use CSS `background-image` ([css/styles.css:4289–4294](../css/styles.css#L4289)) so they're not native-lazy. With ~2 800 BBL properties in the dataset this is a real CLS / data-cost concern on mobile. **Recommendation:** convert hero / card photos to `<img>` + `loading="lazy"` + explicit `width`/`height` so the browser reserves the slot. |
| **M-I2** | Medium | No `srcset` anywhere in the codebase (`assets/operators/*` matches are third-party HTML mirrors, not portal source). All photos are single-resolution JPGs. On a 3× DPR phone the asset is upscaled; on a low-DPR phone the asset is over-fetched. **Recommendation:** generate two responsive sizes for property + news photos and use `<img srcset="…1x.jpg 1x, …2x.jpg 2x" loading="lazy">`. |
| **M-I3** | ✓ | Map height clamps responsively. `.property-map { height: clamp(480px, 75vh, 820px) }` ([:4178–4180](../css/styles.css#L4178)) and `.property-location-map` scales 320 → 400 → 480 px across the breakpoints ([:4244–4253](../css/styles.css#L4244)). Iframe embed at [js/app.js:617](../js/app.js#L617) carries `loading="lazy"` ✓. |
| **M-I4** | Low | `.hero--split .hero__figure { display: none }` at < 480 px ([:2662–2664](../css/styles.css#L2662)) — sensible decorative-image guard. |

### J. Performance signals

| ID | Sev | Observation |
|---|---|---|
| **M-J1** | **High** | Web fonts ship as TTF ([css/tokens.css:22, 30, 38, 46](../css/tokens.css#L22)). A four-face Noto Sans bundle in TTF is roughly 2.0–2.4 MB; the equivalent woff2 is ~600 KB. `font-display: swap` ([:25,33,41,49](../css/tokens.css#L25)) masks the wait but the bandwidth cost is real on a 3G/4G mobile. **Recommendation:** ship woff2 in `assets/fonts/`, drop the TTF, update the `@font-face src` to `url(...) format('woff2')`. |
| **M-J2** | Medium | Single 5001-line `css/styles.css` is loaded synchronously before page render ([index.html:8](../index.html#L8)). The DS source is split per component; tenant chose a single file deliberately (no build). On mobile the parse cost is ~30–50 ms on mid-tier hardware. Acceptable for the prototype; flagged for production. |
| **M-J3** | Low | Inline `<style>`-free; all styling is external. ✓ |

---

## 4. Design-system alignment findings

### K. Color palette

| ID | Sev | Observation |
|---|---|---|
| **DS-K1** | Open | Federal red. Audit brief specifies `#DC0018`; tenant uses `--color-primary-600: #D8232A` ([css/tokens.css:76](../css/tokens.css#L76)). DS canonical Tailwind config uses `#d8232a` for both `red.600` and `primary-600` ([app/tailwind.config.js:155](C:/Users/DavidRasner/Documents/GitHub/designsystem/app/tailwind.config.js#L155)). The `#DC0018` value is from the older eCH-Bundesrot specification; the live `swiss/designsystem` deliberately uses `#D8232A`. Listed under Open Questions for a product decision on which guideline edition governs. |
| **DS-K2** | ✓ | Neutrals match DS `text-` ramp exactly ([css/tokens.css:98–107](../css/tokens.css#L98) ↔ [app/tailwind.config.js:64–75](C:/Users/DavidRasner/Documents/GitHub/designsystem/app/tailwind.config.js#L64)). |
| **DS-K3** | ✓ | Secondary navy palette matches DS `secondary` ramp ([css/tokens.css:112–121](../css/tokens.css#L112) ↔ [tailwind.config.js:52–63](C:/Users/DavidRasner/Documents/GitHub/designsystem/app/tailwind.config.js#L52)). |
| **DS-K4** | ✓ | Focus colour. Tenant `--color-focus: #8655F6` ([:149](../css/tokens.css#L149)); DS `purple.500: #8655F6` ([tailwind.config.js:142](C:/Users/DavidRasner/Documents/GitHub/designsystem/app/tailwind.config.js#L142)). Match. |
| **DS-K5** | Low | `--color-link: #D8232A` ([:92](../css/tokens.css#L92)) follows the DS `.link` definition ([components/link.postcss](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/link.postcss)). However the surrounding comment chain still calls out swisstopo's off-palette blue and offers it as a swap — confusing for an audit reader. Doc clarity only; behaviour is correct. |

### L. Typography

| ID | Sev | Observation |
|---|---|---|
| **DS-L1** | Low | Font weight axis. DS Tailwind sets `fontWeight: { normal: 400, bold: 400 }` ([app/tailwind.config.js:200–203](C:/Users/DavidRasner/Documents/GitHub/designsystem/app/tailwind.config.js#L200)) and uses four separate family aliases (`Font-Regular`, `Font-Italic`, `Font-Bold`, `Font-Bold-Italic`) at [:219–224](C:/Users/DavidRasner/Documents/GitHub/designsystem/app/tailwind.config.js#L219). Tenant uses a traditional one-family / two-weight axis at [css/tokens.css:236–238](../css/tokens.css#L236). Visually equivalent; DS pattern is defensive against browser faux-bold synthesis. |
| **DS-L2** | ✓ | Type scale steps mirror CD canonical: h1 26 / 32 / 40 / 48 across base / lg / xl / 3xl ([css/tokens.css:315–347](../css/tokens.css#L315)). |
| **DS-L3** | ✓ | `mark { background: var(--color-primary-200) }` ([:401–405](../css/tokens.css#L401)) matches DS `mark { @apply bg-primary-200 }` ([typography.postcss:157–159](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/foundations/typography.postcss#L157)). |
| **DS-L4** | Low | `.overtitle` uses `font-size: var(--text-body-xs)` ([:413](../css/tokens.css#L413)) and a `letter-spacing: 0.06em` track. DS uses `.overtitle` with `text-secondary-100` colour ([typography.postcss:100–104](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/foundations/typography.postcss#L100)). Tenant uses `--color-text-secondary` (gray-500) instead. Colour drift only. |

### M. Buttons

| ID | Sev | Observation |
|---|---|---|
| **DS-M1** | **Medium** | Button weight. Tenant `.btn` defaults to `font-weight: var(--font-weight-bold)` ([css/styles.css:749](../css/styles.css#L749)) with a code comment claiming "CD Bund: bold on all buttons". DS canonical is the opposite: `.btn--outline` ([btn.postcss:17](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/btn.postcss#L17)), `.btn--bare` ([:27](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/btn.postcss#L27)), `.btn--link` ([:40](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/btn.postcss#L40)), `.btn--link-negative` ([:57](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/btn.postcss#L57)) are all `font-normal`; only `.btn--filled` is `font-bold` ([:74](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/btn.postcss#L74)). Tenant's `.btn--back` ([css/styles.css:2100](../css/styles.css#L2100)) manually re-asserts normal weight to compensate. **Recommendation:** move bold off the `.btn` base and onto `.btn--filled` only; drop the local override in `.btn--back`. |
| **DS-M2** | Low | Filled-button colour off by one ramp step. Tenant `.btn--filled` uses `--color-secondary-600` (#2F4356) ([css/styles.css:761–765](../css/styles.css#L761)). DS uses `bg-secondary-500` (#46596B) ([btn.postcss:75](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/btn.postcss#L75)). Both navy; tenant is darker. Tokens comment doesn't explain the choice. |
| **DS-M3** | ✓ | Button heights scale exactly. `.btn { min-h: 44; xl: 48; 3xl: 52 }` ([css/styles.css:745–758](../css/styles.css#L745)) ↔ DS `.btn { min-h-[44px] xl:min-h-[48px] 3xl:min-h-[52px] }` ([btn.postcss:114](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/btn.postcss#L114)). |
| **DS-M4** | ✓ | Sizes `.btn--sm` 34 px and `.btn--lg` 48 px match DS ([css/styles.css:777–778](../css/styles.css#L777) ↔ [btn.postcss:119–129](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/btn.postcss#L119)). |

### N. Inputs / form controls

| ID | Sev | Observation |
|---|---|---|
| **DS-N1** | Medium | Checkbox / radio rendering. Tenant uses native controls with `accent-color: var(--color-secondary-600)` ([css/styles.css:1479](../css/styles.css#L1479)). DS uses `appearance: none` plus embedded SVG checkmark / radio dot ([input.postcss:80–151](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/input.postcss#L80)). DS pattern keeps visual fidelity on Windows where native checkboxes render in a 2007-era style; `accent-color` is widely supported but lands inconsistently across UA. Functional, not visually federal. |
| **DS-N2** | ✓ | Input height + border-radius `var(--radius)` (3 px) ([css/styles.css:1395–1396](../css/styles.css#L1395)) match DS `rounded-xs` (1 px) — slight off; DS uses `rounded-xs` ([input.postcss:13](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/input.postcss#L13)). Tenant 3 px is the DS `DEFAULT` radius. Both are "small", call it a minor cosmetic divergence. |
| **DS-N3** | Medium | Form layout. Tenant `.form-field` is a flex column with `gap: var(--space-xs)` ([:1350–1354](../css/styles.css#L1350)). DS `.form` uses `space-y-6` ([form.postcss:1–3](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/form.postcss#L1)) with `.form__group__legend { mb-2 }` ([:8–10](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/form.postcss#L8)). Class names diverge but spacing is in the same ballpark. Local invention; consider mapping `form-field*` ↔ `form__group*` for future copy-paste from DS Storybook. |

### O. Navigation patterns

| ID | Sev | Observation |
|---|---|---|
| **DS-O1** | High | Mobile menu — see **M-D1** above. Local pattern, no DS class names, no body-scroll lock. |
| **DS-O2** | Medium | Nav-menu dropdown panel. Tenant builds its own JS-anchored `.nav-menu` ([js/shell.js:149–176, 383–417](../js/shell.js#L149); CSS [css/styles.css:564–654](../css/styles.css#L564)). DS canonical is a CSS-only `desktop-menu` with nested `ul ul` ([main-navigation.postcss:23–25](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/navigations/main-navigation.postcss#L23)). Functionally similar; structurally a re-invention. Acceptable for the prototype, but if the BBL ever ports to the Nuxt DS Vue components this is a rewrite seam. |
| **DS-O3** | Medium | Burger glyph — see **M-D2**. |
| **DS-O4** | Medium | Language switcher. DS uses a native `<select>` ([language-switcher.postcss:8–22](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/language-switcher.postcss#L8)). Tenant uses an ARIA listbox of buttons ([js/shell.js:210–222, 494–527](../js/shell.js#L210)). Listbox is more flexible (per-option `lang` attribute, keyboard arrows) but the native pattern is more robust on mobile (system picker) and has cheaper a11y. Trade-off, not strictly wrong. |

### P. Tables

| ID | Sev | Observation |
|---|---|---|
| **DS-P1** | Medium | Table header case is inverted from DS default. DS `thead th` is `@apply text-text-700 uppercase text--sm` ([table.postcss:40](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/table.postcss#L40)). Tenant `.table th` is sentence-case ([css/styles.css:1566–1572](../css/styles.css#L1566)) with `.table--caps` as opt-in ([:1573–1577](../css/styles.css#L1573)). Code comment ([:1561–1565](../css/styles.css#L1561)) acknowledges the deliberate flip. Federal-design conformity question. |
| **DS-P2** | Low | `.table--compact` ([css/styles.css:1588–1592](../css/styles.css#L1588)) mirrors DS `.table--compact` padding ([:69–87](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/table.postcss#L69)). ✓ |
| **DS-P3** | Low | Zebra striping ([css/styles.css:1558](../css/styles.css#L1558)) uses `--color-bg-surface` (#F9FAFB); DS uses `bg-secondary-50` (#F0F4F7) ([table.postcss:103–108](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/table.postcss#L103)). Slight tint drift. |

### Q. Modal

| ID | Sev | Observation |
|---|---|---|
| **DS-Q1** | Medium | Tenant modal is a flex-centered card on a backdrop ([css/styles.css:1784–1824](../css/styles.css#L1784)) with `max-height: 90vh`. DS modal is a screen-wrapper with absolute backdrop, `py-[10vh]` outer padding, max content height `80vh` ([designsystem/css/components/modal.postcss](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/modal.postcss)). Visually similar; semantic structure differs. Local invention. Focus trap inside the modal is not present in either reading. **Recommendation:** ensure `js/lib.js` (or wherever modals open) traps focus and restores focus to the trigger on close. |
| **DS-Q2** | ✓ | Backdrop colour `rgba(17, 24, 39, 0.7)` ([css/tokens.css:189](../css/tokens.css#L189)) matches DS `bg-text-900/70` ([modal.postcss:27](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/modal.postcss#L27)). |

### R. Notification banner

| ID | Sev | Observation |
|---|---|---|
| **DS-R1** | Medium | Local pattern. Tenant `.notification-banner` ([css/styles.css:1486–1546](../css/styles.css#L1486)) uses a 4 px coloured left border and tight `var(--space-md)` vertical padding. DS `.notification-banner` ([notification-banner.postcss:5–11](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/notification-banner.postcss#L5)) uses no left border, `py-4 sm:py-8 lg:py-10`, no shadow, and lg-flex with a container wrapper. Functionally adequate; visually distinct from federal canonical alert. |

### S. Step indicator

| ID | Sev | Observation |
|---|---|---|
| **DS-S1** | ✓ | 36 × 36 circles, gray-400 default, green-500 confirmed ([css/styles.css:1290–1320](../css/styles.css#L1290) ↔ [step-indicator.postcss:5–22](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/components/step-indicator.postcss#L5)). Class naming diverges (`.step-indicator__step` vs `.step__indicator-step`) but visuals match. |

### T. Iconography

| ID | Sev | Observation |
|---|---|---|
| **DS-T1** | Medium | Tenant inlines hand-drawn SVG via `js/lib.js#icon` and inline strings in shell.js / app.js ([js/shell.js:103–107, 156, 188, 205, 249, 275, 300, 433, 443, 448](../js/shell.js#L103)). DS ships a canonical icon set under `designsystem/app/assets/icons` (Vue stories). Tenant glyphs can drift in stroke-width and metaphor. Not a runtime defect; a federal-look-and-feel concern. **Recommendation:** export the DS icon set as a static `<symbol>` sprite in `assets/icons.svg` and replace inline strings with `<use href="assets/icons.svg#icon-name">`. |

### U. i18n posture

| ID | Sev | Observation |
|---|---|---|
| **DS-U1** | **High** | EN locale missing. CD Bund canonically offers DE/FR/IT/EN (+ RM where relevant). Tenant offers DE/FR/IT only ([js/shell.js:217–219](../js/shell.js#L217)) — and FR/IT are stubbed (`pickLang` toasts "Lokalisation noch nicht implementiert", [:503–505](../js/shell.js#L503)). For federal parity at least the language entry must exist. |
| **DS-U2** | **High** | `<html lang>` static — see **M-A3**. |
| **DS-U3** | Medium | Per-option `lang="de|fr|it"` is set on the listbox buttons ([js/shell.js:217–219](../js/shell.js#L217)) — good, screen readers will pronounce each switcher option in its own language. But there is no `hreflang` on Kontakt / Hilfe links ([:135, 240–242](../js/shell.js#L135)) that point to language-bound external URLs (`bbl.admin.ch/de/kontakt`). Minor. |
| **DS-U4** | Low | No translation infrastructure. All strings are German literals in JS templates. For a prototype this is expected; flag as a scope-of-work item rather than a defect. |

### V. Accessibility (eCH-0059 / WCAG 2.1 AA)

| ID | Sev | Observation |
|---|---|---|
| **DS-V1** | ✓ | Focus ring 3 px purple, 2 px offset on light, white inner ring on filled / dark surfaces ([css/styles.css:785–810](../css/styles.css#L785)). Matches DS focus-visible expectation ([global.postcss:75–86](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/foundations/global.postcss#L75)). |
| **DS-V2** | ✓ | Reduced-motion respected ([css/tokens.css:435–444](../css/tokens.css#L435)). |
| **DS-V3** | ✓ | Skip link present and styled — functional simpler than DS, but compliant. |
| **DS-V4** | Medium | Contrast on `--color-text-muted`. Tenant collapses muted to gray-500 (#6B7280) ([css/tokens.css:132](../css/tokens.css#L132)) — same as `text-secondary`, computed AA on white at 4.69:1 per the comment. Confirmed AA. Any future regression to gray-400 (the previous value) would fail at 2.85:1 — leave a guard. |
| **DS-V5** | Medium | Form-error linkage — see **M-E5**. |
| **DS-V6** | Medium | Modal focus trap — see **DS-Q1**. |

### W. Documentation drift

| ID | Sev | Observation |
|---|---|---|
| **DS-W1** | Low | README.md:53 links `docs/CD-AUDIT.md` ("See `docs/CD-AUDIT.md` for the full gap analysis…"). The file is not present in the repo (`ls docs` returns only `BBL Requierements`, `CODE-REVIEW.md`, `DATAMODEL.md`, `DESIGNGUIDE.md`, `IDEATE-WIREFRAMES.md`, `REQUIREMENTS.md`, `RESEARCH-EXAMPLES.md`, `RESEARCH-MARKET.md`). **Recommendation:** either re-create the file (this audit can serve) or remove the link. |
| **DS-W2** | Low | `tokens.css` is annotated "aligned with the official Swiss Federal Design System v1.0.9"; DS `package.json` reports `1.0.5` ([designsystem/package.json:3](C:/Users/DavidRasner/Documents/GitHub/designsystem/package.json#L3)). Version drift — the cloned reference may pre-date the doc claim. Verify which DS release the team is tracking. |

---

## 5. Prioritised remediation roadmap

Phases are aligned to the prototype → MVP → production cadence; effort is
relative engineering time, not absolute hours.

| ID | Topic | Severity | Effort | Phase |
|---|---|---|---|---|
| **M-B2** | Mobile-nav breakpoint 768 → 1024 | High | S | Phase 1 — Mobile blockers |
| **M-D1** | Adopt `.mobile-menu` + body-scroll-lock | High | M | Phase 1 |
| **M-D4** | Focus trap in open mobile nav + modal | High (a11y) | M | Phase 1 |
| **M-A3** | `<html lang>` updates on language pick | High (a11y) | XS | Phase 1 |
| **DS-U1** | Add EN locale entry | High | XS | Phase 1 |
| **M-J1** | Ship woff2 fonts | High (perf) | S | Phase 1 |
| **M-C2** | Touch target on language chip | High | XS | Phase 1 |
| **M-C3** | Touch target on top-bar utility links | High | XS | Phase 1 |
| **DS-M1** | Drop blanket `bold` on `.btn` base | Medium | XS | Phase 2 — DS alignment |
| **DS-N1** | Adopt DS appearance-none checkbox / radio | Medium | M | Phase 2 |
| **DS-Q1** | Modal focus trap | Medium (a11y) | S | Phase 2 |
| **M-E5** | `aria-describedby` + `aria-invalid` on form errors | Medium (a11y) | S | Phase 2 |
| **M-E2** | `inputmode="numeric"` on numeric inputs | Medium | XS | Phase 2 |
| **M-C4** | Touch target on share-bar buttons | Medium | XS | Phase 2 |
| **M-C5** | Touch target on filter-pill remove | Medium | XS | Phase 2 |
| **M-C9** | Touch target on pagination input | Medium | XS | Phase 2 |
| **M-I1/I2** | `loading="lazy"` + `srcset` on photos | Medium (perf) | M | Phase 2 |
| **DS-T1** | Sprite from DS icon set | Medium | M | Phase 2 |
| **DS-R1** | Notification banner DS alignment | Medium | S | Phase 3 — Polish |
| **DS-P1** | Decide on table-header case (sentence vs uppercase) | Medium | XS | Phase 3 |
| **DS-M2** | `.btn--filled` colour secondary-600 → -500 | Low | XS | Phase 3 |
| **DS-W1** | Restore or remove README CD-AUDIT.md link | Low | XS | Phase 3 |
| **DS-W2** | Reconcile DS version 1.0.5 vs 1.0.9 in comments | Low | XS | Phase 3 |
| **M-D2** | Animated burger glyph | Low | S | Phase 3 |
| **M-E6** | `speak: none` on required-asterisk | Low | XS | Phase 3 |

Effort key: XS ≤ 1 h · S = half-day · M = 1–2 days · L = ≥ 1 week.

---

## 6. Open questions

1. **Federal red.** Which guideline edition governs — eCH-Bundesrot `#DC0018`
   or the live `swiss/designsystem` `#D8232A` ([app/tailwind.config.js:155](C:/Users/DavidRasner/Documents/GitHub/designsystem/app/tailwind.config.js#L155))?
   The tenant follows the live DS; the audit brief asks for `#DC0018`.
   Needs a product decision before re-styling.
2. **Mobile-menu pattern v1 vs v2.** DS ships two variants — `.mobile-menu`
   (single-level drawer, [mobile-menu.postcss:5–28](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/sections/mobile-menu.postcss#L5))
   and `.mobile-menu-v2` (multi-level slide-in,
   [:38–55](C:/Users/DavidRasner/Documents/GitHub/designsystem/css/sections/mobile-menu.postcss#L38)).
   With the BBL's nested Dienstleistungen catalogue (7 items today) v2 may
   be the better fit — but it doubles implementation effort. Needs a
   design call.
3. **Table-header case.** Tenant deliberately inverted DS uppercase to
   sentence case ([css/styles.css:1561–1572](../css/styles.css#L1561)) because
   reviewer queues read better. Is "deliberate divergence from CD Bund for
   internal-tool ergonomics" acceptable, or must the federal CI win?
4. **Checkbox / radio rendering.** DS appearance-none pattern is more
   visually federal but adds maintenance for the embedded SVG check icon.
   Is the trade-off worth ~50 lines of CSS?
5. **Language switcher mechanic.** Ship a native `<select>` (DS canonical,
   robust on mobile) or keep the ARIA listbox (current, richer keyboard
   support)?
6. **Icon set adoption.** Vendor the DS icon set as a static sprite or
   continue hand-drawing? Implication is consistent stroke-width and
   metaphor for all 30+ icons used across views.
7. **Locale coverage.** Stub FR/IT/EN with placeholder translations, or
   defer until a translator is contracted? The audit treats EN absence as
   High because the *switcher entry* must exist for federal parity even if
   the content is German fallback.
8. **DS version tracking.** Are we pinned to v1.0.5 (current cloned ref),
   v1.0.9 (claim in tokens.css comment), or rolling? Affects which
   findings remain valid if the DS itself changes.
