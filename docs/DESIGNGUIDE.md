# BBL Mieterportal — Design Guide

How this prototype maps to the official **Swiss Federal Design System** (CD-Bund)
at <https://github.com/swiss/designsystem> (MIT). When in doubt, the source-of-truth
is the design system; this guide records the working subset and intentional deviations.

Reference repo locally: `C:\Users\DavidRasner\Documents\GitHub\designsystem`.

## 1. Anatomy of the design system

| Folder                          | What lives there                                          |
| ------------------------------- | --------------------------------------------------------- |
| `css/foundations/`              | Type scale, color system, spacing rules, icons, fonts     |
| `css/skins/default.postcss`     | The federal primary/secondary 10-stop color palettes      |
| `css/components/*.postcss`      | Button, card, badge, modal, accordion, step-indicator …   |
| `css/sections/*.postcss`        | Top-bar, top-header, hero, footer, breadcrumb …           |
| `css/navigations/*.postcss`     | Main navigation, meta navigation, top-bar navigation      |
| `app/tailwind.config.js`        | Canonical scales (fontSize, borderRadius, breakpoints …)  |
| `app/components/ch/*.vue`       | Vue reference implementations                             |
| `app/pages/*.vue`               | Example page assemblies                                   |

Our prototype implements a subset in vanilla CSS/JS — no Tailwind, no Vue. The
intent is to **match visual fidelity**, not framework choice.

## 2. Foundation — tokens

All tokens live in [`css/tokens.css`](../css/tokens.css).

### 2.1 Color

Source: `designsystem/css/skins/default.postcss`. Ten-stop ramps `50..900` for
both `primary` (federal red — `#D8232A` at 600) and `secondary` (blue-gray
chrome). Plus a derived gray/text scale matching Tailwind defaults.

```
--color-primary-600: #D8232A    /* federal red, brand */
--color-secondary-600: #2F4356  /* top-bar dark, footer */
--color-text-primary: #1F2937   /* gray-800 */
```

**Semantic aliases** (`--color-text-primary`, `--color-bg-alt`, etc.) wrap
ramp values for component use; never `#hex` a color inside a component.

### 2.2 Typography

| Token             | Mobile | lg (1024) | xl (1280) | 3xl (1920) |
| ----------------- | ------ | --------- | --------- | ---------- |
| `--text-display`  | 2rem   | 2.5rem    | 3rem      | 3.5rem     |
| `--text-h1`       | 1.625  | 2         | 2.5       | 3          |
| `--text-h2`       | 1.375  | 1.625     | 2         | 2.25       |
| `--text-h3`       | 1.25   | 1.375     | 1.5       | 1.75       |
| `--text-h4`       | 1.125  | 1.25      | 1.25      | 1.5        |
| `--text-body`     | 1                                              |
| `--text-body-sm`  | 0.875                                          |
| `--text-body-xs`  | 0.75                                           |

Scale follows DS's `.text--Nxl` responsive chain. Font family: **NotoSans**
(DS uses Hind — see §5).

### 2.3 Spacing

4 px base, geometric scale: `xs:4 / sm:8 / md:16 / lg:24 / xl:32 / 2xl:48 / 3xl:64 / 4xl:80`.

Aligns 1:1 with Tailwind defaults.

### 2.4 Breakpoints

Identical to DS:

```
xs:  480  sm:  640  md:  768  lg: 1024
xl: 1280  2xl:1544  3xl:1920
```

CSS variables can't appear inside `@media`, so the numbers are documented in
the bottom of [`css/tokens.css`](../css/tokens.css) and used literally in `@media` rules.

### 2.5 Container

Max-width **1544 px** (DS `2xl`). Container padding scales `16 → 28 → 36 → 40 →
48 → 64 px` across the breakpoint cascade.

### 2.6 Border radius

Now mirrors DS Tailwind config (`borderRadius` in `app/tailwind.config.js`):

```
xs:1  sm:2  default:3  lg:5  xl:6  2xl:8  3xl:10  4xl:12  5xl:15  6xl:24
```

Components default to `var(--radius)` (3 px). Pills use `--radius-full`.

### 2.7 Shadows

Three depths: `--shadow-sm`, `--shadow`, `--shadow-lg`, plus a portal-specific
`--shadow-card / --shadow-card-hover` pair. DS has 6 depths; we use the subset
we actually need.

## 3. Components — what we ship

Defined in [`css/styles.css`](../css/styles.css) ordered by the TOC banner at
the top of the file. Each block follows BEM (`block__element--modifier`).

| BEM block            | Matches DS                                | Notes                                                                |
| -------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| `.btn`, `.btn--*`    | `btn.postcss`                             | variants: filled / outline / bare; sizes: sm/lg                      |
| `.badge`, `.badge--*`| `badge.postcss`                           | colors only — **no leading icons** (status badges are textual)       |
| `.card`, `.card--*`  | `card.postcss`                            | variants: quick, profile, application, property, content, highlight, flat |
| `.modal`, `.modal--{sm,md,lg,xl,auto}` | `modal.postcss`               | naming collides with DS — display logic differs (see §5a)            |
| `.toast-host` / `.toast` | `toast-message.postcss`               | naming differs from DS `.toast__message.active` (see §5a)            |
| `.accordion__*`      | `accordion.postcss`                       | max-height animation                                                 |
| `.step-indicator`    | `step-indicator.postcss`                  | 36 px circles, gray-400 outline → confirmed green / active gray fill |
| `.pipeline`          | (no DS equivalent)                        | portal-specific status sequence                                      |
| `.form-field`        | `form.postcss`                            | layout shell for label / input / hint / error                        |
| `.input`, `.input--{sm,lg,error,disabled}` | `input.postcss`             | standalone input visuals — reusable outside `.form-field`            |
| `.table`             | `table.postcss`                           | basic — DS variants (compact/zebra/uppercase-headers) deferred       |
| `.share-bar`         | `share-bar.postcss`                       | portal-specific layout                                               |
| `.download-list`     | derived from kbob/armasuisse              | red down-arrow + title + subtitle + format \| size \| date           |
| `.contact-block`     | derived from armasuisse Immo-Portal       | two-column address + phone/email/web with red icon affordances       |
| `.link`, `.link--external` | `link.postcss`                      | external-link arrow icon via mask + DS `--icon-external-link` SVG     |
| `.h1`, `.h2`, `.h3`, `.h4`, `.h5` | `typography.postcss`           | heading-size utility classes; compose with layout (`h2 section-heading`) |
| `.legend`, `figcaption` | `typography.postcss`                   | image caption — body-xs, gray-500, top padding                       |
| `.meta-info`         | (semantic analogue)                       | small secondary text above page headings; replaces uppercase eyebrow |
| `.card__title`       | `card.postcss`                            | bold body-size heading for card-internal sub-titles                  |
| `.alert-banner`      | `alert-banner.postcss`                    | CSS shipped; **not used** — see §5 (prototype notice stays inline)   |
| `.section-heading`   | (layout-only modifier)                    | adds extra bottom margin; compose with `.h1`/`.h2` for size          |

### 3.1 Icons

A small inline-SVG library lives in `app.js` under `ICONS = { … }`, exposed
as `P.icon(name)`. Each SVG carries `class="inline-icon"` for vertical
alignment with body-sm text. Standalone icon slots (e.g. `.download-list__icon`)
get their own sizing via CSS.

Available names: `document`, `video`, `attachment`, `shield`, `ruler`, `tool`,
`truck`, `sparkles`, `download`. Add new ones to the `ICONS` map — no emoji
glyphs should appear in user-facing markup.

## 4. Page patterns

### 4.1 Federal shell

`renderShell()` in [`app.js`](../js/app.js) emits:

```
<a class="skip-to-content"> …
<header role="banner">
  <div class="top-bar">           dark navy, lang switcher, profile pill
    <span class="top-bar__prototype-notice">   centered red "Prototyp" label
  <div class="top-header">        federal mark (BundLogo) + dept name + search
  <nav class="navbar">            main navigation + dropdown menus
<nav class="breadcrumb">          when supplied
<main id="main">                  view content
```

Footer is rendered via `renderFooter()` and mirrors the bbl.admin.ch pattern
(brand column, link column, dark bottom-strip with legal links + back-to-top).

### 4.2 Long-scroll info page

`.page-with-toc` lays out a sticky right-side `Inhaltsverzeichnis`. TOC title
is `--text-h2` (matches the prominence on kbob.admin.ch and armasuisse). Each
content article gets `scroll-margin-top: 160px` so the sticky federal header
doesn't cover the heading.

### 4.3 Download lists

For grouped public documents, use `downloadList([{ title, subtitle?, format,
size, languages?, date }, …])`. Renders the KBOB / armasuisse Immo-Portal
pattern: red download icon, bold title, optional subtitle, then `format |
size | date` metadata strip. Whole row is one clickable link.

## 5. Intentional deviations from CD-Bund

1. **Font family** — DS uses Hind (loaded from custom files) with all weights
   set to 400 (bold ships as a separate font-family). We use **NotoSans** as
   the system fallback; weights 400/500/600/700 render normally. Future
   iteration may bundle the federal Hind font.

2. **`.alert-banner` not used** — DS specifies a full-bleed colored alert
   banner above the shell. For the prototype warning we keep the **inline red
   text in the top-bar centre** (less vertical real estate; aligns with bbl.admin.ch).

3. **Mobile menu** — current implementation is a plain `display:none → flex`
   toggle on the main navigation. DS provides a full-screen overlay with
   animated entry; flagged for a follow-up pass.

4. **No build step** — we are vanilla HTML/CSS/JS while DS is Tailwind +
   PostCSS. Tokens are hand-translated from `app/tailwind.config.js` and
   `css/skins/default.postcss`. When DS changes, [`css/tokens.css`](../css/tokens.css) must be
   reviewed.

5. **`.tag-item` not adopted** — at first glance our `.badge--info` for
   categorical labels (SEM/EDA/BK) looked like a `.tag-item` candidate, but
   DS `.tag-item` is a 44 px-min-height **filter chip** (clickable, pill-shaped,
   active/hover states). For small inline categorical labels, our `.badge--info`
   is the correct fit. Adopt `.tag-item` when we add actual filter UIs (e.g.
   tag-based search refinement).

## 5a. Naming-collision register

Class names that exist in both codebases but with **divergent behaviour**.
Document them here so copy-paste from `swiss/designsystem` doesn't surprise.

| Class | Our behaviour | DS behaviour | Risk if mixed |
| --- | --- | --- | --- |
| `.modal` | Toggled by JS removing the surrounding `.modal-backdrop` wrapper. | Toggled via `[open='true']` attribute (Vue binding). | DS markup won't show/hide in our app. |
| `.toast` | Animated message inside a `.toast-host` region. | Wrapped as `.toast__message.active`. No `.toast-host` concept. | Markup shapes differ. |
| `.card--flat` | Borderless, no shadow. | Bottom-bordered list-item variant. | Two visually different looks under the same name. |
| `.card--highlight` | (Modifier defined but currently unused after recent edit.) | Secondary-300 backplate behind the card. | Low — we no longer apply it. |
| `.notification-banner` | Only the `--danger/--warning/--success` colour variants live in our CSS. | Full DS includes `__wrapper` + header/body grid. | Subset usage — not a collision per se. |

## 5b. Pattern-composition rules (DS-aligned)

These compose typography utility classes with layout block classes so each
contributes a single responsibility — mirrors the DS pattern in
`css/foundations/typography.postcss` (.h1..h5) + `css/sections/hero.postcss`
(`.hero__title`).

- **Headings** use `<hN class="hN block__title">` form. E.g.
  `<h1 class="h1 hero__title">` or `<h2 class="h2 section-heading">`.
  - `.hN` (h1..h5) sets size/weight/line-height/margin via tokens.
  - The block class (`hero__title`, `section-heading`) contributes only
    layout (max-width, extra margin, break-words).
- **Inline icons** use `<svg class="inline-icon">` produced by `P.icon('name')`.
- **External links** use `<a class="link link--external">` for the trailing
  arrow icon affordance (mirrors DS `link.postcss` `.link--external`).

## 6. Authoring rules

- **No `#hex` in component CSS.** All colors via `var(--color-*)`.
- **No emoji glyphs** in user-visible markup. Use `P.icon('name')`.
- **Status badges** never carry icons — pill + text label only.
- **BEM**: every modifier is `--`, every element is `__`. Card variants are
  `.card--quick`, not `.quick-card`.
- **Spacing** uses `--space-*` tokens, never raw px.
- **Type sizes** use `--text-*` tokens, never raw rem.
- **Radii** use `--radius-*`, never raw px.
- New design tokens go in `css/tokens.css` before being used.
- Inline `style="…"` is reserved for dynamic, per-instance values; recurring
  patterns become CSS classes.

## 7. When to update what

- **New color** → add to `tokens.css` under the appropriate semantic group, not
  inline in `styles.css`.
- **New component** → check DS `css/components/` first; lift the structure if it
  exists; document the CSS class in §3 of this guide.
- **New variant of an existing component** → use the `--modifier` form, not a
  new block.
- **Breaking changes to DS upstream** → re-pull the design system repo and
  diff against `css/tokens.css` + the component sections in [`css/styles.css`](../css/styles.css).
