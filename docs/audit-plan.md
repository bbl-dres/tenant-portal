# Audit Plan — Tenant Portal vs. Swiss Federal Design System

Plan precedes findings. The deliverable is `docs/design-system-audit.md`; this file
fixes scope, sources of truth, and the rubric used to grade each finding.

## Scope

- **Subject:** `c:\Users\DavidRasner\Documents\GitHub\tenant-portal`
  (vanilla ES-module SPA, no build, single `css/tokens.css` + `css/styles.css`,
  routed via `js/app.js` with shell + wizard partials).
- **Reference:** `C:\Users\DavidRasner\Documents\GitHub\designsystem`
  (Nuxt + Storybook + PostCSS/Tailwind v3.4; canonical source for
  `swiss/designsystem` v1.0.x). Upstream `https://github.com/swiss/designsystem`
  read-only.
- **Primary lens:** mobile + responsive behaviour. Design-system alignment is
  cross-cutting.
- **Out of scope:** functional correctness of business logic (NAW, SAP keys,
  wizard rules), data-model issues, server-side concerns. README's badge
  status ("prototype") is acknowledged but does not lower the rubric.

## Sources of truth (canonical token references)

| Topic | Canonical file in `designsystem` |
|---|---|
| Breakpoints + container widths | [app/tailwind.config.js](C:/Users/DavidRasner/Documents/GitHub/designsystem/app/tailwind.config.js) `screens` (lines 20–28), `container` (29–32) |
| Color palette (primary/secondary/text/accents) | `app/tailwind.config.js` `colors` (37–198) |
| Font scale | `app/tailwind.config.js` `fontSize` (204–218); `css/foundations/typography.postcss` `.text--Nxl` (lines 18–57) |
| Font families/weights | `app/tailwind.config.js` `fontFamily` (219–224), `fontWeight` (200–203) |
| Border radius | `app/tailwind.config.js` `borderRadius` (236–249) |
| Shadows | `app/tailwind.config.js` `boxShadow` (225–235) |
| Buttons | `css/components/btn.postcss` (sizes 113–129; variants 16–110) |
| Inputs + checkbox/radio | `css/components/input.postcss` (min-height 1–4; radio/checkbox 80–151) |
| Form layout | `css/components/form.postcss` |
| Navigation (desktop) | `css/navigations/main-navigation.postcss` (lg-only via `hidden lg:flex` line 14) |
| Mobile menu | `css/sections/mobile-menu.postcss`; burger `css/components/burger.postcss` |
| Top bar | `css/sections/top-bar.postcss` |
| Language switcher | `css/components/language-switcher.postcss` |
| Table | `css/components/table.postcss` |
| Modal | `css/components/modal.postcss` |
| Step indicator | `css/components/step-indicator.postcss` |
| Notification banner | `css/components/notification-banner.postcss` |
| Global / focus / skip-link | `css/foundations/global.postcss` (focus 75–86; skip-link 63–73) |
| Vertical spacing | `css/foundations/spacings.postcss` |

## Tenant-portal files inspected (representative)

- `index.html` — viewport, lang attribute, asset wiring.
- `css/tokens.css` — color/spacing/typography/radius/breakpoint tokens.
- `css/styles.css` — every component, layout, responsive rule (5001 lines).
- `js/shell.js` — top-bar, brand bar, navbar, dropdowns, burger, language
  switcher, search.
- `js/wizard.js` — form patterns (5-step wizard).
- `js/app.js` — route views (queue, inbox, properties, downloads, profile,
  damage-report, news, search, etc.); spot-checked for input types,
  ARIA, image attributes.
- `assets/fonts/` — bundled Noto Sans TTF (Regular/Bold/Italic/Bold-Italic).

## Audit topics (matches deliverable rubric)

### A. Mobile (primary)
- A1. Viewport / `lang` / responsive root.
- A2. Breakpoint system — values + naming + mobile-nav breakpoint.
- A3. Touch targets (≥ 44 × 44 px) on buttons, inputs, nav, icon-only
  controls, badges with close, filter pills, share bar, language chip.
- A4. Mobile navigation pattern — burger, list reveal, focus trap, scroll
  lock, body class toggle, nav-dropdown behaviour on small screens.
- A5. Form ergonomics — input height, `inputmode`, `autocomplete`, error
  placement, label/help density, sticky footer behaviour.
- A6. Typography on mobile — Noto Sans loading, base 16 px, minimum 12 px,
  line-height, word-spacing for German compounds.
- A7. Reflow / overflow / horizontal scroll at 320 / 375 / 768 px — wrap
  rules on top-bar, share-bar, breadcrumb, tables, pipeline,
  step-indicator, property toolbar, history list.
- A8. Mobile a11y — focus visibility on touch, hit slop, gesture
  alternatives, skip-link, `aria-live` regions for autosave / pagination.
- A9. Image/media — `srcset`, `loading="lazy"`, aspect ratios, decorative
  hero hidden on phones, map height clamps.
- A10. Performance signals — font format (TTF vs woff2), font-display, CSS/JS
  bundle size, CLS hotspots (hero figure, map containers).

### B. Design-system alignment (cross-cutting)
- B1. Color palette — federal red, neutrals, semantics, focus colour.
- B2. Typography — Noto Sans family aliasing, scale steps, weights (DS
  Tailwind uses `fontWeight.bold = 400`; tenant uses traditional 700).
- B3. Spacing scale + container + grid gutter.
- B4. Component reuse vs. local reinvention — buttons, inputs, nav menu,
  mobile menu, language switcher, modal, notification banner, table,
  step indicator, pagination.
- B5. Iconography — DS ships an icon set in
  `designsystem/app/assets/icons`; tenant ships hand-drawn inline SVGs
  via `js/lib.js#icon`.
- B6. Form controls — input/checkbox/radio rendering style (DS appearance-none
  with embedded SVG check vs. tenant native + `accent-color`).
- B7. Accessibility per eCH-0059 / WCAG 2.1 AA — focus ring colour and
  width, skip link, contrast ratios on `--color-text-muted`,
  `aria-live`, `prefers-reduced-motion`.
- B8. i18n — DE/FR/IT/EN availability, `lang` attribute on `<html>` after
  language change, text expansion handling.

## Severity rubric

| Tier | Definition |
|---|---|
| **Critical** | Blocks a primary mobile flow or fails WCAG 2.1 AA outright (e.g. unreachable tap target on a wizard "Weiter" CTA, missing viewport, focus trap absent in a modal). |
| **High** | Visible deviation from the design system on a high-traffic surface (nav-breakpoint mismatch, wrong button colour token, missing canonical mobile-menu animation, missing EN locale). |
| **Medium** | Inconsistent but functional (private icon set vs. CD canonical set, native vs. DS-styled checkbox, table header case opt-in inverted from DS default). |
| **Low** | Cosmetic or doc drift (README mentions a CD-AUDIT.md that no longer ships, stale comment, minor padding off by 2 px). |

## Method

1. Read tenant root, `index.html`, `package.json` (none — confirmed pure-static),
   `README.md`, all of `css/tokens.css`, structural skim of `css/styles.css`
   (focus on @media blocks + every component class), `js/shell.js`
   (federal chrome), spot reads of `js/wizard.js` + `js/app.js` for
   input attributes and ARIA usage.
2. Read designsystem `package.json`, `css/foundations/*`,
   `css/components/{btn,input,form,burger,table,modal,language-switcher,
   notification-banner,step-indicator}.postcss`, `css/sections/{top-bar,
   mobile-menu}.postcss`, `css/navigations/main-navigation.postcss`, and
   `app/tailwind.config.js` for the canonical token scale.
3. Grep the tenant codebase for `inputmode`, `autocomplete`, `srcset`,
   `loading="lazy"`, `aria-live`, `lang=`, `font-display`, and every
   `min-height`/`min-h` declaration to enumerate touch targets.
4. For each topic above, locate a representative `file:line` in each repo,
   compare, and grade per the rubric.

## Deliverable structure (recap)

`docs/design-system-audit.md` will contain:

1. Executive summary (5–8 bullets, mobile priorities first).
2. Methodology (what was inspected, what wasn't, assumptions).
3. Mobile findings (Topic A, each: observation, evidence, severity,
   recommendation).
4. Design-system alignment findings (Topic B, same structure).
5. Prioritised remediation roadmap (table: ID, severity, effort, phase).
6. Open questions.

## Out-of-band notes

- The task brief specifies federal red `#DC0018`. The canonical
  `swiss/designsystem` Tailwind palette uses `#d8232a` for `red.600`
  ([tailwind.config.js:155](C:/Users/DavidRasner/Documents/GitHub/designsystem/app/tailwind.config.js#L155))
  and aliases this as `primary-600`. The tenant's
  `[tokens.css:76](../css/tokens.css#L76)` follows the DS value. The
  spec value `#DC0018` is from the older eCH/CD Bund branding sheet
  ("Bundesrot"); the current DS deliberately uses `#D8232A` (per CD Bund
  CD 2018+). The audit will list this discrepancy as an Open Question
  rather than a finding, since both colours are plausibly "correct"
  depending on which guideline edition is binding.
- README references `docs/CD-AUDIT.md`; that file is not present. Doc
  drift, not a design-system issue per se. Will note under Low / Open
  Questions.
