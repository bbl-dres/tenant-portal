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
--color-link: #D8232A           /* primary-600 — CD Bund canonical (was #1F6FAB blue) */
```

**Links** use the federal red `primary-600` per the CD Bund design
system (`.link, main a { @apply text-primary-600 ... }` in
[`link.postcss`](C:\Users\DavidRasner\Documents\GitHub\designsystem\css\components\link.postcss)).
If the project later mirrors swisstopo's blue links, use CD's `blue-700`
`#1d4ed8`, not an off-palette value.

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

Scale **approximates** DS's `.text--Nxl` responsive chain but starts one
step smaller across the breakpoints (e.g. base `--text-h1` 1.625 vs DS
`.h1`/`text--3xl` 1.875). Body text doesn't scale at `xl`/`3xl` — see
[CD-AUDIT.md §12.3](CD-AUDIT.md) for the deep-dive.

Font family: **Noto Sans** — CD Bund's canonical typeface. We bundle
all four faces (regular + bold + italic + bold-italic) from
`designsystem/css/foundations/fonts/` in `assets/fonts/` and reference
them via `url()`, with `local()` as the fast path. A `Fallback-NotoSans`
family with `advance-override`/`ascent-override` metric tuning keeps
line-box heights stable while the web font swaps in.

**Weight axis is binary** — CD Bund uses only `400` (regular) and `700`
(bold). Tokens: `--font-weight-regular` (or `--font-weight-normal`)
and `--font-weight-bold`. The legacy `--font-weight-medium` /
`--font-weight-semibold` aliases were retired in the §12.2.3 sweep.

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
`--shadow-card / --shadow-card-hover` pair tuned softer than CD's `shadow-lg`
(see [CD-AUDIT.md §1.5](CD-AUDIT.md) for the rationale). DS Tailwind config
ships 7 box-shadow tokens (`sm`, default, `md`, `lg`, `xl`, `2xl`, `none`);
we use the subset we actually need.

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
| `.table`, `.table--{zebra,rows-clickable,caps}` | `table.postcss`     | basic + zebra + hover-pointer + uppercase-headers (default is sentence-case) |
| `.table-hint`, `.table-empty` | (layout helpers)                  | helper paragraph below a table / centred empty-row cell              |
| `.tag-item[--active]`, `.filter-row`, `.filter-chips` | `tag-item.postcss` | DS filter chip (pill, 34 px tall, `aria-pressed`); chip group inside a toolbar |
| `.page-header[__title/__sub/__actions/__count]` | (layout-only)   | H1 + side-actions row used on inbox / queue / detail; replaces ad-hoc inline flex blocks |
| `.section-intro[--tight]` | (layout-only)                        | lead paragraph under a section-heading — `max-width: 60ch`, secondary text |
| `.login-page[__title/__subhead/__dl/__cta/__hint(--muted)]` | (block) | narrow centred form layout for login / contact pages                |
| `.role-switch-btn[--active]` | (block)                            | full-width modal-stack button; carries `aria-pressed`                 |
| `.notification-banner__icon` | extension on `.notification-banner` | leading icon slot for info/warning/danger/success banners            |
| `.queue-actions`     | (layout-only)                             | bulk-action toolbar below the reviewer queue table                    |
| `.checklist__item[--ok/--warn/--danger]` | (block)               | wizard step-5 pre-submission checklist with colour-tinted inline-icon prefixes |
| `.eppm-tab[--visible]` | (block)                                 | auxiliary ePPM-mapping label next to a wizard field; hidden by default |
| `.wizard__inline-toggle` | (layout-only)                         | small inline toggle inside a wizard subtitle (e.g. "Erweiterte Ansicht") |
| `.date-grid`         | (layout-only)                             | three equal-column grid for date inputs; stacks under 640 px           |
| `.card__inset`, `.card__inset-meta` | (layout-only)              | paragraphs and meta-spans living inside a `.card` (resets `<p>` margins) |
| `.card--clarification` | (block)                                | full-row Rückfrage / Auflagen card with warning left-rail              |
| `.card__justification` | (layout-only)                          | reviewer's reason paragraph inside a clarification card                |
| `.card__title--icon` | (block)                                   | card title with a leading inline-icon                                  |
| `.notification-banner__sub` | (block)                            | secondary line inside a notification-banner__text                      |
| `.pipeline__step--pending` | (block)                             | dimmed pipeline step (replaces inline `opacity:0.5`)                   |
| `.mark-button[--active-{ok,nok,comment}]` | (block)              | reviewer field-mark pill (28 px tall, hosts inline-icon + label)       |
| `.breadcrumb__list`, `.breadcrumb__item` | (layout-only)         | `<ol>`/`<li>` shells used by the new schema.org BreadcrumbList markup  |
| `.container--reading`, `.container--narrow` | (layout)           | narrower content columns (780 / 960 px) for prose and task pages       |
| `.section-intro[--tight]` | (layout)                            | (existing) lead paragraph; `--tight` halves the bottom margin          |
| `.empty-state--inset` | (modifier)                              | adds top margin when the empty state lives inside an already-padded surface |
| `.news-detail__{meta,title,image,lead,footer,back}` | (block)   | long-form news article layout                                           |
| `.news-list__{header,date,title}` | (block)                    | centred header for the news-overview page                              |
| `.search-results__{group,group-title}` | (block)                | grouped origin headings on the search results page                     |
| `.tabs` + `[role="tab"]` ARIA pattern | `tabs.postcss`         | full WAI-ARIA Tabs (roving tabindex, arrow-key nav, focus rings)        |
| `.wizard__sap-info`, `.naw-confidence__line--meta`, `.role-switch-btn__spacer` | (helpers) | single-purpose helpers that replaced inline style= declarations        |
| `.section`           | sections.postcss                          | full CD-Bund `.container--py` rhythm (56→80→96→128 px). `--py-tight` modifier for the half-scale (rare). |
| `.section--alt`      | (alt variant)                             | federal cool-blue-gray tint (`--color-secondary-50`) for alternating sections — distinct from white AND `--color-bg-surface` |
| `.section--surface`  | (alt variant)                             | warmer near-white (`--color-bg-surface`) for in-section card backings   |
| `.section--py-tight` | (modifier)                                | half-scale section padding (28→40→48→64 px) for tight rhythm strips     |
| `.option-group[--wrap]`, `.option-group__item` | DS radio/checkbox     | fieldset-based form group; each option its own row; `--wrap` rows-then-wrap for short labels |
| `.sr-only`           | utility                                   | visually-hidden text for AT (legend duplicates, header annotations)     |
| `.profile-page__{card,note,save}`, `.profile-dl` | (block)            | profile/settings page layout                                            |
| `.docs-filter-bar__{select,search}`, `.docs-table__{linked,action,download}` | (block) | downloads page filter bar + table cells          |
| `.table--documents .col-*` | (table-column-width modifiers)      | pixel-percentage column widths on the downloads table                   |
| `.checklist`, `.consent-check`, `.batch-approve__*` | (block)      | wizard step-5 validation list + bulk-approve modal                      |
| `.rule`              | utility                                   | soft horizontal rule separator inside panels and modals                 |
| `.modal__meta`, `.form-field__hint--inline`, `.reviewer-marks__actions`, `.app-detail__correlation` | (helpers) | per-view one-off helpers                                |
| `.notification-banner--page-top` | (modifier)                     | extra bottom margin when a banner sits at the top of a page body        |
| `.main-navigation__chevron` | (block)                            | dropdown trigger chevron (rotates on open)                              |
| `.service-stub__{lead,actions,hint}` | (block)                  | placeholder page for services not yet wired up (no requirements ID on UI) |
| `.info-page__{header,title}` | (block)                          | Arbeitsinstrumente long-form page header                                |
| `.page-with-toc__content .text-note` | (block)                  | secondary-text note paragraph inside an info-page article               |
| `.contact-block__note[--last]` | (block)                        | descriptive line under a `.contact-block__lead`                         |
| `.accordion--inset` | (modifier)                               | accordion with extra bottom margin inside a long-form article          |
| `.property-banner[__caption/__sap/__title/__address]` | (block) | image hero with gradient-overlay caption on the property detail page    |
| `.property-section` | (modifier)                                | section block on a property-detail page (consistent bottom margin)      |
| `.property-aside__{card,actions}` | (block)                    | aside actions stack on the property detail page                         |
| `.contact-dl[__row]` | (block)                                  | definition list of contact persons (label above name, grid-based)       |
| `.card--property__{status,status--quiet,category}` | (block)     | property-card status badge overlaying image + portfolio-category chip in body (no separate footer row — flat layout) |
| `.share-bar__back`, `.share-bar__actions` | derived from DS `.back-bar` + `.share-bar` | combined detail-page utility bar: Zurück on the left, Teilen + Drucken on the right |
| `.pagination__count`, `.pagination__controls` | derived from DS pagination | item-range line ("1–12 von 247") to the left of the chevron + page-input controls |
| `.wizard__id`, `.wizard__autosave` | (block)                   | wizard subtitle parts (ID badge + auto-save status with aria-live)      |
| `.text-secondary` | (utility)                                  | small muted-text utility for empty-state notes                          |
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
| `.badge--{verified,stale,manual,unchecked,greenfield,llm}` | (portal-specific) | data-quality dots — pure CSS, no emoji (see §6)                |

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
  <div class="top-header">        federal mark (split flag + name SVGs, name hidden < xl) + dept name + search
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

1. **Softer card shadows** — `--shadow-card` is softer than DS `shadow-lg`.
   Quieter aesthetic for a dense admin UI; cards shouldn't feel "floating"
   when stacked in a property grid.

2. **Wider button padding** — `var(--space-lg)` (24 px) vs DS `px-4` (16 px).
   Better visual balance in form-heavy wizard pages.

3. **Single-level breadcrumb** — DS supports hierarchical dropdowns per level;
   we render flat. Admin tool paths are flat; hierarchical breadcrumbs add noise.

4. **6-variant badge palette** (vs DS's 10) — tuned to the application /
   tenancy status taxonomy; expand if new statuses appear.

5. **Pagination — right-align + item-range count** — adds the
   swisstopo / kbob-fdk "1–12 von 247" count line on top of DS's base
   pagination; right-aligned matches DS's `.pagination--right`.

6. **Property banner** — image-with-caption-overlay hero is a federal
   real-estate pattern (armasuisse Immo-Portal), not one of DS's six
   abstract hero variants (`.hero--default/main-image/main/hub/overview/title-only`).
   Kept as a portal-specific hero variant.

7. **`.alert-banner` not used** — DS specifies a full-bleed colored alert
   banner above the shell. For the prototype warning we keep the **inline red
   text in the top-bar centre** (less vertical real estate; aligns with
   bbl.admin.ch).

8. **Mobile menu** — current implementation is a plain `display:none → flex`
   toggle on the main navigation. DS provides a full-screen overlay with
   animated entry; flagged for a follow-up pass.

9. **No build step** — we are vanilla HTML/CSS/JS while DS is Tailwind +
   PostCSS. Tokens are hand-translated from `app/tailwind.config.js` and
   `css/skins/default.postcss`. When DS changes, [`css/tokens.css`](../css/tokens.css) must be
   reviewed.

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

- **No opaque `#hex` in component CSS.** Opaque colors via `var(--color-*)`.
  `rgba()` overlays are acceptable for one-off transparency on top of an
  underlying surface (e.g. gradient overlays, card backdrops, glassy
  pills) — prefer the `--color-white-N` / `--color-black-N` alpha
  tokens (declared in [tokens.css](../css/tokens.css)) when a value is reused.
  Exception: the federal Wappen avatar on the explainer card uses
  literal `#ff0000` because it must match the exact red of
  `assets/swiss-logo-flag.svg` to render seamlessly inside the round
  channel-avatar — documented at the rule site.
- **No emoji glyphs** in user-visible markup. Use `P.icon('name')`.
- **No requirements / traceability IDs in user-facing text.** `FUNC-*`,
  `REQ-*`, `NFA-*`, `OP-*` etc. belong in code comments, commit messages,
  and `docs/REQUIREMENTS.md` — not in card-meta, hints, modal copy, page
  leads, or anywhere a user can read them. They mean nothing to a tenant
  and crowd the UI.
- **Body copy is declarative, not UI-describing.** Don't write "Pro
  Objekt sehen Sie X, Y, Z" / "Filtern Sie nach …" / "Sie können
  zwischen … wählen" — the toolbar and the grid already say that. Each
  intro paragraph should give the user a fact they don't have, then stop.
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
