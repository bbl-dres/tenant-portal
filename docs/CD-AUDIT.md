# CD-AUDIT.md — Corporate-Design gap analysis (Mieterportal prototype)

Living document. Compares the BBL Mieterportal prototype against the
Swiss federal Corporate Design (CD Bund / `swiss/designsystem` v1.0.9).
Reference patterns: swisstopo.admin.ch, kbob-fdk, workspace-management.

**Sources of truth**
- CD Bund repo: `C:\Users\DavidRasner\Documents\GitHub\designsystem`
  - PostCSS rules: `css/{foundations,layouts,components,sections,navigations}/`
  - Vue components: `app/components/ch/components/`
  - Tokens (Tailwind): `app/tailwind.config.js`
- Storybook docs: <https://swiss.github.io/designsystem/>
- Living federal example: <https://www.swisstopo.admin.ch/en>

**Status legend**: ◻ open · ◐ in progress · ✓ done · — won't fix (rationale)

**Severity rubric**
- **high** — accessibility/usability regression vs. CD Bund baseline, or
  CD-Bund-mandatory element missing
- **medium** — visible drift that erodes "feels federal", or a working
  but non-canonical pattern that should be reconciled before pilot
- **low** — refinement, polish, or coverage gap that only matters when
  the prototype grows past current scope

---

## TL;DR

The prototype is now ≈ 97 % aligned with CD Bund on tokens, chrome,
typography, color, and detail-page anatomy. The biggest visible drift
items have been resolved in successive iterations:

**Resolved (cross-referenced in the relevant sections):**
- Noto Sans now bundled and loads via `url()` — was rendering in
  Verdana (§12.1.1).
- Faux-bold weights collapsed at the token level (§12.2).
- Type scale realigned: h2/h3/h4 to CD's exact values per breakpoint;
  body/body-sm/body-xs now scale at xl/3xl matching CD (§12.3).
- Link colour swapped from blue to CD canonical `primary-600` red
  (§13.3).
- Color ramps filled in: red 50→900 (was 500/600/700 only), secondary
  200/400/900 (§13.6); added `--color-success-bright` (green-500) for
  active states, wired to wizard step indicator (§13.4).
- Muted-text contrast fixed (WCAG AA pass) (§9.4).
- `prefers-reduced-motion` global rule added (WCAG 2.1) (§9.1).
- Nav-menu ARIA refined — confirmed disclosure pattern is the correct
  ARIA model for site nav; `aria-haspopup="menu"` for clearer
  popup-type signal (§3.7 / §9.2).
- Focus ring on filled buttons: white inner-ring + lighter outline
  keeps the target visible against saturated bg colours (§9.3).
- Property-banner now full-bleed of the viewport — no more left
  margin (§14.1.1).
- Share-bar gained a `Zurück` affordance on detail pages (§14.1.3).
- DESIGNGUIDE.md realigned: Hind misinfo removed, link-colour
  documented, tag-item contradiction resolved, deliberate-divergences
  list refreshed (§15.1, §15.2, §15.4, §15.5, §15.6, §15.7).

**Remaining gaps cluster in two areas:**

1. **Pagination spread + table density** (§5) — inbox, queue, news,
   search are still un-paginated; no `.table--compact` variant for the
   reviewer queue. Federal data sets scale; this is the highest-impact
   remaining work.
2. **Layout utility coverage** (§14.3) — CD ships `.vertical-spacing`,
   `.container__main` + `.container__aside`, `.container--grid` that we
   shim with one-off classes. Promote when the next layout work lands.

Everything else is cosmetic cleanup or minor coverage gaps — listed in §16.

---

## 1. Foundations (tokens)

| # | Finding | Severity | Status |
|---|---|---|---|
| 1.1 | Color tokens align with CD Bund federal palette (primary red, secondary blue-gray, semantic statuses). Flat CSS-var implementation vs. CD's Tailwind theme — functionally identical. | — | ✓ aligned |
| 1.2 | Type scale steps **approximate** CD Bund but start smaller (`--text-h1` 26→48 vs CD's `text--3xl` 30→60). Body text doesn't scale at `xl`/`3xl` (CD scales 16→18→20). See **§12** for the typography deep-dive. [tokens.css:134-142](../css/tokens.css#L134-L142) | medium | ◐ |
| 1.3 | Spacing scale uses the 4 px base unit. Aligned with CD Bund `tailwind.config.js`. [tokens.css:155-162](../css/tokens.css#L155-L162) | — | ✓ aligned |
| 1.4 | Focus ring uses purple-500 `#8655F6` (CD Bund eCH-0059). [tokens.css:83](../css/tokens.css#L83) | — | ✓ aligned |
| 1.5 | Shadow scale: `--shadow-card` is markedly softer than CD's `shadow-lg`. Reads as a deliberate choice for a quieter admin UI — record rationale so it's not re-flagged on every review. | low | ◻ deliberate? |
| 1.6 | Badge palette is a 6-variant subset of CD's 10 (missing indigo/pink/purple/negative). Acceptable for current taxonomy; expand if new statuses appear. | low | — won't fix yet |
| 1.7 | Custom token `--color-prototype-notice` is only used in the footer warning; redundant after softening that warning to `rgba(255,255,255,0.65)` (see §3.3). Retire the token or repurpose. | low | ◻ |

## 2. Layout & grid

| # | Finding | Severity | Status |
|---|---|---|---|
| 2.1 | `.container` max-width `1544 px` and responsive padding (16→28→36→40→48→64 px) match CD Bund container scaling. [tokens.css:164-167, 246-250](../css/tokens.css#L164-L167) | — | ✓ aligned |
| 2.2 | `--section-py` scales 56→80→96→128 px. CD Bund `container--py` is `py-14 lg:py-20 3xl:py-32` (56→80→128 px). Portal is +16 px at `2xl` (96 vs. 80). Minor — read as more breathing room on wide desktop. | low | — deliberate |
| 2.3 | Was: no `prefers-reduced-motion` handling anywhere — fails WCAG 2.1 SC 2.3.3 / SC 2.2.2. **Resolved** by adding a global `@media (prefers-reduced-motion: reduce)` block that collapses all `animation-duration` / `transition-duration` to 0.01 ms and forces `scroll-behavior: auto`. Covers toast fade, nav-menu open, accordion expand, wizard transitions, button hover transforms. [tokens.css:353-371](../css/tokens.css#L353-L371) | **high** | ✓ |

## 3. Chrome (top-bar, header, navbar, breadcrumb, footer)

| # | Finding | Severity | Status |
|---|---|---|---|
| 3.1 | `.app-footer__bottom` padding reduced from `--space-lg`/`--space-xl` to `--space-sm`/`--space-md` — now reads as a meta-line, not a second band. [styles.css:1828](../css/styles.css#L1828) | medium | ✓ |
| 3.2 | `.footer-information__heading` reworked from `--text-h3` semibold to small uppercase tracked label (CD Bund / swisstopo footer label pattern). [styles.css:1766](../css/styles.css#L1766) | medium | ✓ |
| 3.3 | `.footer-information__prototype-warning` softened from saturated `#ff4444` to `rgba(255,255,255,0.65)` normal weight — the "Prototyp" top-bar pill already carries the warning signal. [styles.css:1757](../css/styles.css#L1757) | medium | ✓ |
| 3.4 | Footer "Prototyp" column: removed `Anforderungskatalog` and `Design-Guide` internal-doc links; added "CD Bund → github.com/swiss/designsystem". [shell.js:321-324](../js/shell.js#L321-L324) | low | ✓ |
| 3.5 | Top-bar / top-header / navbar three-tier chrome mirrors the CD Bund pattern (admin.ch, swisstopo). Brand bar `.top-header__bundmark` scales 40→52→60→70 px. | — | ✓ aligned |
| 3.6 | Breadcrumb is a flat single-level list. CD Bund's `breadcrumb.postcss` supports hierarchical dropdowns per level. Acceptable simplification for a task-driven admin portal; document it as a deliberate divergence. | low | — deliberate |
| 3.7 | **Audit correction**: Dropdown nav-menus use the WAI-ARIA *disclosure* pattern (`aria-expanded` + `aria-haspopup` + `aria-controls` on the trigger button, `role="region"` on the panel). For site navigation this is the *recommended* ARIA pattern per the [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) — `role="menu"`/`menuitem` is for *application* menus and would require arrow-key navigation, wrap-around, and first-letter jumping (none of which are needed for site nav). Refined `aria-haspopup="true"` → `aria-haspopup="menu"` for clearer popup-type signal. [shell.js renderShell](../js/shell.js) | medium | ✓ |
| 3.8 | Language switcher uses `role="listbox"` + `aria-selected` — correct ARIA-1.2 pattern. [shell.js:214-218](../js/shell.js#L214-L218) | — | ✓ aligned |
| 3.9 | Header search expands on click. CD Bund `search.postcss` is a fuller search page; our expanding-header pattern is an established swisstopo variant. Aligned. | — | ✓ aligned |

## 4. Components — buttons, forms, badges, cards

| # | Finding | Severity | Status |
|---|---|---|---|
| 4.1 | `.btn` family: `--filled`/`--outline`/`--bare`/`--sm`/`--lg`/`--icon-only` all present with correct min-heights (34/44/48 px). Horizontal padding `--space-lg` (24 px) is wider than CD's `px-4` (16 px) — gives more visual weight, consistent on text-heavy forms. Minor drift, deliberate. | low | — deliberate |
| 4.2 | `.input` / `.form-field` use 44 px min-height and `--space-sm var(--space-md)` padding — pixel-match with CD Bund `input.postcss` after var resolution. Focus tint `0 0 0 3px var(--color-focus-tint)` is a portal-explicit addition; CD relies on Tailwind's defaults. | — | ✓ aligned |
| 4.3 | No multiselect component. CD Bund ships `multiselect.postcss` + `MultiSelect.vue`. Prototype doesn't currently need one; flag for follow-up if filter UIs grow. | low | ◻ deferred |
| 4.4 | Radio/checkbox sizing uses fixed 18 px. CD Bund offers `--sm`/`--lg` modifiers. Acceptable for touch targets; not blocking. | low | — won't fix |
| 4.5 | `.badge` structure (inline-flex, em-based padding) matches CD Bund. Variants `--success`/`--info`/`--warning`/`--danger`/`--orange`/`--gray` cover current status taxonomy. | — | ✓ aligned |
| 4.6 | `.card` shadow softer than CD `shadow-lg`; vertical padding 24 px tighter than CD's 40 px (`py-10`). Reads as a deliberate quieter / denser admin aesthetic — record the rationale in DESIGNGUIDE.md so the next reviewer doesn't re-raise it. | medium | ◐ document |
| 4.7 | Missing card variants from CD Bund: `.card--clickable`, `.card--list`, `.card--image-left`. The "clickable" variant in particular is useful for property-grid hover affordance — currently re-implemented inline on `.card--property:hover`. | low | ◻ |
| 4.8 | `.card--property__footer` removed — category chip now sits in the body's natural column. [styles.css ~L3760](../css/styles.css), [app.js:1744](../js/app.js#L1744) | low | ✓ |

## 5. Components — tables, lists, pagination

| # | Finding | Severity | Status |
|---|---|---|---|
| 5.1 | `.table` + `.table--zebra` + `.table--rows-clickable` align with CD Bund table base. Headers use `--color-bg-alt` (gray-100); uppercase is opt-in via `.table--caps`. | — | ✓ aligned |
| 5.2 | No `.table--compact` variant. CD Bund ships one with `px-2 py-2` cells. Reviewer queue + inbox tables hit 8+ columns and can crowd at desktop / overflow at narrow widths. | medium | ◻ |
| 5.3 | No mobile-stack / row-as-card responsive table pattern. Neither does CD Bund explicitly, but federal sites typically defer to horizontal scroll inside a `.table-wrap`. Confirm app has `.table-wrap` overflow scroll everywhere — spot-checked `.property-list-wrap`, OK. | low | ◐ spot-check rest |
| 5.4 | Pagination on `#/properties` always-visible, right-aligned, with item-range count ("1–12 von 247 Liegenschaften"). [styles.css:1555](../css/styles.css#L1555), [app.js:1624](../js/app.js#L1624) | medium | ✓ |
| 5.5 | Pagination on `#/downloads` matches the properties pattern (count + chevron-input-chevron), always visible. [app.js:1999](../js/app.js#L1999) | medium | ✓ |
| 5.6 | **Pagination spread — open** — the following surfaces still render unpaginated and need the same treatment because federal data scales: `#/inbox` (applications), `#/queue` (reviewer queue), `#/news` (news list), `#/search` (multi-section results). Detail-page sub-lists (`#/inbox/:id` attachments + history, `#/properties/:id` related applications + documents) are bounded by single-record cardinality and don't need pagination. | medium | ◻ |
| 5.7 | List density: `.attachment-list`, `.search-results`, news list all use ≥ 12 px vertical padding per row. CD Bund list pattern is similar but offers a `--compact` modifier. Not a gap; flag if rows feel airy on dense pages. | low | — won't fix yet |

## 6. Components — feedback (notifications, toasts, banners, modals)

| # | Finding | Severity | Status |
|---|---|---|---|
| 6.1 | `.notification-banner` covers success / warning / danger variants. CD Bund `notification.postcss` adds `info` and `alert` variants — `info` is genuinely missing (e.g. for "Antrag automatisch entwertet nach 30 Tagen" type notices). | low | ◻ |
| 6.2 | No `.alert-banner` component. CD Bund distinguishes `notification-banner` (in-page) from `alert-banner` (full-bleed page-top critical messages, e.g. maintenance windows). For a prototype this can wait; flag for production. | low | ◻ |
| 6.3 | `.toast` host + `toast()` API in [lib.js:262-289](../js/lib.js#L262-L289) — correct `role="region"` + `aria-live="polite"`. Variants `--success` + (implicit) error. CD Bund's `toast-message.postcss` adds an info variant. | low | ◻ |
| 6.4 | `.modal` size variants `--sm`/`--md`/`--lg`/`--xl`/`--auto` with fixed px widths. CD Bund uses `max-w-screen-*` (breakpoint-based). Portal values are more conservative — modals don't stretch on wide desktop, which suits the form-heavy content. Functionally aligned. | — | ✓ aligned |
| 6.5 | Modal focus-trap, Esc-close, restore-focus-to-opener, body-content auto-focus all implemented. [lib.js:299-378](../js/lib.js#L299-L378) | — | ✓ aligned (well above CD-Bund-baseline) |

## 7. Components — navigation patterns (accordion, step indicator, share bar, breadcrumb)

| # | Finding | Severity | Status |
|---|---|---|---|
| 7.1 | `.accordion__panel` open-state padding is `0 var(--space-sm) var(--space-md)` (≈ 8/16 px). CD Bund `.accordion__content` uses `pb-10` (40 px) — long content can feel cramped at our setting. | medium | ◻ |
| 7.2 | Accordion transition 320 ms vs. CD's 300 ms — imperceptible. Aligned. | — | ✓ |
| 7.3 | `renderStepIndicator()` in [lib.js:228](../js/lib.js#L228) implements 36 px circles with connectors, gray-400 outline → green confirmed. CD Bund confirmed uses `green-500` (`#22C55E`); we use `var(--color-success)` = `#047857` (green-700). Visibly darker — verify on the wizard. | low | ◻ |
| 7.4 | Step indicator carries `aria-current="step"` on the active item — correct ARIA. | — | ✓ aligned |
| 7.5 | `.share-bar` (utility row above detail pages) matches CD Bund pattern (`share-bar.postcss`). Aligned. | — | ✓ aligned |

## 8. Hero / page headers / landing

| # | Finding | Severity | Status |
|---|---|---|---|
| 8.1 | `.hero` + `.hero--split` two-column variant follows the kbob-fdk / swisstopo pattern referenced in code comments. Aligned. | — | ✓ aligned |
| 8.2 | No `.index-page-card` / `.index-page` patterns from CD Bund — those are content-site patterns (publication landing pages), irrelevant for a transactional portal. Skip. | — | — won't fix |

## 9. Accessibility (transverse)

| # | Finding | Severity | Status |
|---|---|---|---|
| 9.1 | Was: no `@media (prefers-reduced-motion: reduce)` rules — WCAG 2.1 SC 2.3.3 + SC 2.2.2 fail. **Resolved** at [tokens.css:353-371](../css/tokens.css#L353-L371) with a universal `*, *::before, *::after { animation-duration: 0.01ms; transition-duration: 0.01ms; scroll-behavior: auto; }` under the media query. Covers every transition and animation in the app. | **high** | ✓ |
| 9.2 | See §3.7 — audit correction: the disclosure pattern (which we use) is the **correct** ARIA model for site navigation per WAI-ARIA APG; `role="menu"` would actually be wrong here. Refined `aria-haspopup` to indicate `menu` popup type. | medium | ✓ |
| 9.3 | **Audit correction**: `.btn--filled` actually uses CD-canonical navy (secondary-600), not red (red is reserved for danger / brand accents). Purple focus on white page bg with the 3 px outline-offset works fine. **Defensive fix applied anyway**: `.btn--filled:focus-visible` now gets a white inner-ring + lighter `--color-focus-dark` outer ring — keeps the focus target visible if a future `.btn--danger` variant uses a saturated red bg, *and* improves the current navy variant by separating the focus ring from the button colour. [styles.css:752-757](../css/styles.css#L752-L757) | medium | ✓ |
| 9.4 | `--color-text-muted` was `#9CA3AF` (text-400) → 2.85:1 on white (AA fail). **Resolved**: collapsed to `#6B7280` (text-500, same as `--color-text-secondary`) → 4.69:1 (AA pass). The muted/secondary distinction is now a naming alias; for a genuinely lighter tertiary, reach for a smaller font-size. [tokens.css:64-72](../css/tokens.css#L64-L72) | **high** | ✓ |
| 9.5 | Toast host has `aria-live="polite"` + `aria-atomic="false"` — correct for non-disruptive notifications. [lib.js:272-274](../js/lib.js#L272-L274) | — | ✓ aligned |
| 9.6 | Breadcrumb uses `aria-current="page"` + Schema.org BreadcrumbList microdata — matches admin.ch SEO/a11y pattern. | — | ✓ aligned (above CD-Bund-baseline) |
| 9.7 | Skip-to-content link present and properly off-screen until focus. [tokens.css:291-305](../css/tokens.css#L291-L305) | — | ✓ aligned |
| 9.8 | Form labels: every `<input>` has either a `<label>` association or `aria-label`. Spot-checked the wizard and search form. | — | ✓ aligned |
| 9.9 | Tables: missing `<caption>` on data tables (e.g. `.property-list`, `.docs-table`). Screen-reader users get no announcement of what the table contains beyond the surrounding heading. CD Bund's `table.postcss` doesn't enforce this, but WCAG H51 recommends it. | low | ◻ |
| 9.10 | Color is sometimes the only carrier of meaning in pipeline pills (`--color-pipeline-active` etc.). The inline-SVG icons (check / half-circle / x-mark / refresh) added in [lib.js ICONS](../js/lib.js#L94) mitigate this. Aligned. | — | ✓ aligned |

## 10. Components present in CD Bund, not in app — coverage gaps

These are components the design system ships that the prototype does
not implement. **None are blocking**; they're a forward-coverage
checklist if/when the prototype expands.

| Component | CD Bund file | Used for | App needs it? |
|---|---|---|---|
| `alert-banner` | `css/components/alert-banner.postcss` | Full-bleed critical messages (maintenance, outage) | Likely yes, before production |
| `info-block` | `css/components/info-block.postcss` | Inline contextual hints, callouts | Optional — form-field hints currently shim this |
| `popover` | `css/components/popover.postcss` | Anchored tooltips with rich content | Useful for KPI hovers, term definitions |
| `progress` | `css/components/progress.postcss` | Determinate progress bar | Useful for file-upload, batch operations |
| `multiselect` | `css/components/multiselect.postcss` | Multi-value form input | Likely needed when reviewer queue gets faceted filters |
| `tag-item` | `css/components/tag-item.postcss` | Filter / facet chips | Currently shimmed with `.badge` + `aria-pressed` |
| `load-more` | `css/components/load-more.postcss` | Progressive disclosure (vs. paginate) | Alternative to pagination for news/feed surfaces |
| `meta-info` | `css/components/meta-info.postcss` | Page-meta strip (date · author · category) | Useful on `#/news/:id`, `#/info` |
| `separator` | `css/components/separator.postcss` | Section divider with optional label | Currently using `<hr>` defaults |
| `tab` / `tabs` | `css/components/tab.postcss` | Tabbed panels | Detail pages use ad-hoc segmented controls — promote |

## 11. Deliberate divergences (rationale, not bugs)

Recording these so reviewers don't repeatedly flag them.

1. **Softer card shadows** (`--shadow-card` vs CD's `shadow-lg`) — quieter aesthetic for a dense admin UI; cards should not feel "floating" when stacked in a property grid.
2. **Wider button padding** (`var(--space-lg)` = 24 px vs CD's `px-4` = 16 px) — better visual balance in form-heavy wizard pages.
3. **Compact accordion spacing** — vertical-space-first for a task-driven interface (counter-argument in §7.1 — may have gone too tight).
4. **Single-level breadcrumb** (no hierarchical dropdowns) — admin tool paths are flat; hierarchical breadcrumbs add noise.
5. **6-variant badge palette** (vs CD's 10) — tuned to the application/tenancy status taxonomy; expand if new statuses appear.
6. **Pagination with item-range count + right-align** — adds the swisstopo / kbob-fdk count line on top of CD's base pagination; right-aligned matches CD's `.pagination--right`.

## 12. Typography (deep-dive)

CD Bund typography is defined in
[`css/foundations/typography.postcss`](C:\Users\DavidRasner\Documents\GitHub\designsystem\css\foundations\typography.postcss)
+ [`font-face.postcss`](C:\Users\DavidRasner\Documents\GitHub\designsystem\css\foundations\font-face.postcss).
Our equivalents live in [tokens.css](../css/tokens.css) (`@font-face`, type
scale, weights, line-heights) + [styles.css](../css/styles.css) (`.h1`–`.h5`).

**Critical takeaway** (status now ✓ resolved): the prototype was rendering
in **Verdana** for most users — not Noto Sans — because of how we loaded
the font (see §12.1, fixed). The remaining typography issue is faux-weight
synthesis (§12.2), which is only visible because the font that's actually
rendering doesn't have the weights we're asking for.

### 12.1 Font loading

| # | Finding | Severity | Status |
|---|---|---|---|
| 12.1.1 | `@font-face` declarations use **only `local()` sources** — no `url()` fallback to bundled font files. Noto Sans is not pre-installed on Windows (the platform federal employees actually use) or stock macOS, so the cascade silently falls through to `'Hind'` (also rarely installed) → `'Verdana'` → `sans-serif`. **Resolved**: copied `NotoSans-{Regular,Bold,Italic,BoldItalic}.ttf` from `designsystem/css/foundations/fonts/` into `assets/fonts/` and added `url()` sources to the `@font-face` rules. [tokens.css:13-65](../css/tokens.css#L13-L65) | **high** | ✓ |
| 12.1.2 | Italic + bold-italic faces declared alongside the URL sources. [tokens.css:39-58](../css/tokens.css#L39-L58) | low | ✓ |
| 12.1.4 | `Fallback-NotoSans` family added with `advance-override` / `ascent-override` / `descent-override` / `line-gap-override` matching CD Bund's tuning. Threaded into `--font-family` before Verdana so line-box heights stay stable when the web font swaps in. [tokens.css:60-67](../css/tokens.css#L60-L67) | medium | ✓ |
| 12.1.2 | No italic faces declared. CD Bund ships `NotoSans-Italic.ttf` and `NotoSans-BoldItalic.ttf` so `<em>` / `<i>` / `<cite>` render as designed. Currently any italic in the prototype is browser-synthesized (slanted regular). | low | ◻ |
| 12.1.3 | CD Bund's `font-face.postcss` names the four font-families `Font-Regular`, `Font-Bold`, `Font-Italic`, `Font-Bold-Italic` (one family per face). Our pattern declares `'NotoSans'` once with `font-weight: 400` and again with `font-weight: 700` (one family, two faces). Both work; CD's split makes per-weight override explicit and matches their utility-class convention (`.font--regular` / `.font--bold`). | low | — won't fix |
| 12.1.4 | CD Bund declares a `Fallback-font` (`local(Verdana)`) with explicit `advance-override` / `ascent-override` / `descent-override` / `line-gap-override` so layout doesn't shift when the web font finishes loading (CLS / FOUT mitigation). We have no fallback-metric tuning. [font-face.postcss:37-44](C:\Users\DavidRasner\Documents\GitHub\designsystem\css\foundations\font-face.postcss) | medium | ◻ |

### 12.2 Font weights

| # | Finding | Severity | Status |
|---|---|---|---|
| 12.2.1 | Tokens declared four weights (400 / 500 / 600 / 700); **CD Bund uses only 400 and 700** (binary axis). **Resolved** by aliasing `--font-weight-medium` → 400 and `--font-weight-semibold` → 700 at the token level; all 28 call sites now snap to a CD-canonical weight without per-site editing. Added a new explicit `--font-weight-regular` alongside `--font-weight-normal` so future call sites can use the CD-canonical name. [tokens.css:149-162](../css/tokens.css#L149-L162) | **high** | ✓ |
| 12.2.2 | Was: faux-bold synthesis at every `medium`/`semibold` call site. **Resolved** by §12.2.1 — all weight references now resolve to a face the font actually ships (400 or 700). | **high** | ✓ |
| 12.2.3 | Cleanup follow-up: per-site sweep to replace `--font-weight-medium` → `--font-weight-regular` and `--font-weight-semibold` → `--font-weight-bold` in [styles.css](../css/styles.css), then retire the legacy aliases. Cosmetic only — no rendering change since §12.2.1 already resolved the visual issue. | low | ◻ |
| 12.2.4 | `.h1`–`.h5` correctly use `--font-weight-bold` (700) per CD's `.h1`–`.h5` (which apply `font-bold`). [styles.css:979-983](../css/styles.css#L979-L983) | — | ✓ aligned |

### 12.3 Type scale + line heights

| # | Finding | Severity | Status |
|---|---|---|---|
| 12.3.1 | **Audit correction**: earlier note claimed our scale started ~4 px smaller across the board. That was wrong — CD Bund **overrides** the Tailwind default `fontSize` tokens (e.g. CD's `text-3xl` is 1.625 rem / 26 px, not the Tailwind default 1.875 rem / 30 px). After comparing against CD's *overridden* scale, the actual drift was: h1 matched exactly at all breakpoints; h2 was 4 px short at 3xl; h3 was 2 + 4 px short at xl + 3xl; h4 had an lg step we'd added that CD doesn't. **Resolved**: h2/h3/h4 realigned to CD's exact values per breakpoint; h4 lg step removed. [tokens.css:222-271](../css/tokens.css#L222-L271) | low | ✓ |
| 12.3.2 | Body text was flat at 16 px across all breakpoints. CD's `text--base` scales 16→16→18→20 (and `text--sm` / `text--xs` scale in tandem). **Resolved**: `--text-body`, `--text-body-sm`, `--text-body-xs` now scale at xl/3xl matching CD. Federal users on 27" 1920-wide desktops (BBL standard issue) now get the comfort upgrade. [tokens.css:241-271](../css/tokens.css#L241-L271) | medium | ✓ |
| 12.3.3 | `--text-display` (32→40→48→56) doesn't map to any CD step — it sits between `text--3xl` (30→60) and `text--4xl` (36→72). Used only on landing-page hero / wizard step counter. Probably keep, but document. | low | — deliberate |
| 12.3.4 | Line-heights: `tight` 1.25 / `snug` 1.375 / `normal` 1.5 / `relaxed` 1.625. CD uses Tailwind defaults (`leading-tight` 1.25, `leading-normal` 1.5). Our `snug` and `relaxed` are portal additions. ≈ aligned. | — | ✓ aligned |
| 12.3.5 | `.h1` / `.h2` add `letter-spacing: -0.01em`. CD doesn't tighten heading tracking. Mild drift — barely visible but inconsistent. ~15 other letter-spacing declarations scattered across [styles.css](../css/styles.css) ranging from -0.02em to +1px — most are local component overrides (badges, kickers, brand mark). Worth a token: `--tracking-tight`, `--tracking-wide`, `--tracking-label`. | low | ◻ |
| 12.3.6 | `html { word-spacing: 0.0625em }` in CD Bund's typography foundation — subtle, but designed to ease scanning of long German compounds (Verwaltungseinheit, Bundesamt). Not in our `tokens.css`. Cheap to add. | low | ◻ |

### 12.4 Missing CD Bund typography utilities

| Class | CD Bund purpose | Used in app? | Action |
|---|---|---|---|
| `.text--{xs,sm,base,lg,xl,2xl,3xl,4xl,5xl}` | Responsive type-size utilities | No — we read `var(--text-*)` per component | Optional. Util-first matches CD but conflicts with the portal's component-CSS-only style. |
| `.font--regular` / `.font--bold` / `.font--italic` / `.font--bold-italic` | Weight utilities | No | Add if we collapse to two-weight system (§12.2.3); they make sweep edits cleaner. |
| `.overtitle` | Kicker label (`text--xs`, secondary-100, gap-2) above h1 | No | Useful on `#/news/:id`, property detail (e.g. "Liegenschaft" kicker above building name). |
| `.text--negative` / `.text--default` / `.text--light` | Inverse, default, muted colour modifiers | We use `var(--color-text-*)` directly | Optional — but `.text--light` would collide with the §9.4 muted-text contrast failure (current `gray-400` fails WCAG AA on white). Fix the token before promoting it. |
| `.text--asterisk` | Auto-append `*` for required-field labels | No — we use `<span class="form-field__required">*</span>` | Both work. Keep ours. |
| `mark` styling | `bg-primary-200` light-red highlight for search matches | No — relies on browser default (yellow) | Add — gives "Treffer hervorheben" on `#/search` a federal look. |

### 12.5 Heading classes in app: spot check

[styles.css:979-983](../css/styles.css#L979-L983) defines:

```css
.h1 { font-size: var(--text-h1); font-weight: 700; line-height: 1.25; margin: 0 0 16px; letter-spacing: -0.01em; }
.h2 { font-size: var(--text-h2); font-weight: 700; line-height: 1.25; margin: 0 0 16px; letter-spacing: -0.01em; }
.h3 { font-size: var(--text-h3); font-weight: 700; line-height: 1.375; margin: 0 0 16px; }
.h4 { font-size: var(--text-h4); font-weight: 700; line-height: 1.375; margin: 0 0 16px; }
.h5 { font-size: var(--text-body); font-weight: 700; line-height: 1.375; margin: 0 0 16px; }
```

vs. CD Bund:

```css
.h1 { @apply text--3xl font-bold mb-4; }
.h2 { @apply text--2xl font-bold mb-4; }
.h3 { @apply text--xl  font-bold mb-4; }
.h4 { @apply text--lg  font-bold mb-4; }
.h5 { @apply text--base font-bold mb-4; }
```

Structural match: weight 700, 16 px bottom margin. Drift: our sizes are
smaller (§12.3.1), our heading line-heights differ (1.25 / 1.375 vs CD
`leading-tight` 1.25 across the board on headings), our h1/h2 add
negative tracking.

---

## 13. Color (deep-dive)

CD Bund's color foundation lives in
[`css/skins/default.postcss`](C:\Users\DavidRasner\Documents\GitHub\designsystem\css\skins\default.postcss)
(primary + secondary ramps),
[`app/tailwind.config.js`](C:\Users\DavidRasner\Documents\GitHub\designsystem\app\tailwind.config.js)
(full Tailwind palette), and component-level usage in `colors.postcss`
and `link.postcss`. Compared to our [tokens.css](../css/tokens.css).

**Critical takeaway**: most color values are CD-canonical, but the
**link colour is wrong** — we use blue (`#1F6FAB`), CD Bund's design
system uses the federal red (`primary-600` = `#d8232a`). That's a
high-visibility drift on every prose page and every breadcrumb.

### 13.1 Ramps — coverage and fidelity

| Ramp | CD Bund coverage | Our coverage | Drift |
|---|---|---|---|
| **Red / primary** | 50→900 (10 shades) | 500 / 600 / 700 only (3 shades) | Values that exist match exactly. Missing 50/100/200/300/400/800/900 — needed for: `mark` highlight (200), badge-red-text (800, currently a one-off), light backgrounds, hover halos. |
| **Secondary (blue-gray)** | 50→900 (10 shades) | 50 / 100 / 300 / 500 / 600 / 700 / 800 (7 shades) | Values that exist match exactly. Missing 200 (#acb4bd), 400 (#596978), 900 (#131b22) — not currently blocking but limits design vocabulary. |
| **Text / gray** | 50→900 | 50→900 (declared as `--color-gray-*`) | ✓ Pixel-match across all 10 shades. |
| **Blue** | 50→900 | Only `--color-link: #1F6FAB` and `--color-badge-blue-bg/text` | Our `#1F6FAB` is not on CD's blue ramp (closest is blue-700 `#1d4ed8`, then blue-800 `#1e40af`). **The link colour itself isn't even a CD blue** — see §13.3. |
| **Green** | 50→900 | 500 (`--color-success-light: #D1FAE5` ≡ green-100), 700 (`--color-success: #047857`), 800 (`--color-badge-green-text: #065F46`) | Green-700 picked for success state — see §13.4. |
| **Yellow** | 50→900 | 500 (`--color-warning: #F59E0B`), 100 (`--color-warning-light`), 800 (`--color-badge-yellow-text: #92400E`) | ✓ All values CD-canonical. |
| **Orange** | 50→900 | 100 (`--color-badge-orange-bg: #FFEDD5`), 800 (`--color-badge-orange-text: #9A3412`) | ✓ Aligned. |
| **Teal** | 50→900 | Only 700 (`--color-info: #0F6B75`) | ✓ Value matches CD teal-700. Note: CD names it "teal", we name it "info" (semantic remapping). |
| **Purple** | 50→900 | Only 500 (`--color-focus: #8655F6`) | ✓ Value matches CD purple-500. |
| **Indigo / Pink** | 50→900 each | Not declared | Not needed for current scope (skip). |

### 13.2 Semantic tokens

| Token | Our value | CD Bund equivalent | Status |
|---|---|---|---|
| `--color-primary` / `--color-primary-600` | `#D8232A` | red-600 `#d8232a` | ✓ aligned |
| `--color-primary-hover` / `--color-primary-700` | `#BF1F25` | red-700 `#bf1f25` | ✓ aligned |
| `--color-danger` | `#D8232A` | red-600 | ✓ aligned (also confusingly equal to `--color-primary` — semantic alias is fine but a slip in the design language means "danger" and "brand" are the same colour) |
| `--color-success` | `#047857` (green-700) | green-700 — but CD typically uses **green-500** (`#10b981`) for active/confirmed states in the step indicator, pipeline pills, success badges | **medium drift** — see §13.4 |
| `--color-warning` | `#F59E0B` | yellow-500 | ✓ aligned |
| `--color-info` | `#0F6B75` | teal-700 | ✓ aligned (just renamed semantically) |
| `--color-focus` | `#8655F6` | purple-500 | ✓ aligned |
| `--color-link` | **`#1F6FAB`** (custom blue) | **`primary-600` = `#d8232a` (federal red)** per [link.postcss:6-7](C:\Users\DavidRasner\Documents\GitHub\designsystem\css\components\link.postcss) | **high drift** — see §13.3 |
| `--color-link-hover` | `#134A77` | `primary-800` = `#99191e` | high drift (cascades from §13.3) |
| `--color-text-primary` | `#1F2937` | text-800 | ✓ aligned |
| `--color-text-secondary` | `#6B7280` | text-500 | ✓ aligned |
| `--color-text-muted` | `#9CA3AF` (text-400) | text-400 — but **fails WCAG AA on white (2.85:1)** (cross-ref §9.4) | high — needs darker value |
| `--color-surface-dark` | `#2F4356` | secondary-600 | ✓ aligned |
| `--color-surface-darker` | `#263645` | secondary-700 | ✓ aligned |

### 13.3 Link colour — the big one

CD Bund's [link.postcss:5-10](C:\Users\DavidRasner\Documents\GitHub\designsystem\css\components\link.postcss#L5-L10):

```css
.link, main a {
  @apply text-primary-600 hover:text-primary-800 focus:text-primary-800;
  @apply underline underline-offset-2 cursor-pointer;
  @apply break-words;
}
```

**Links are federal red** (`primary-600` = `#d8232a`), hover to `primary-800` (`#99191e`), underlined with 2 px offset. This is canonical for `<a>` inside `<main>` and for any `.link` class.

We use **blue** (`#1F6FAB` → `#134A77` on hover) at [tokens.css:37-38](../css/tokens.css#L37-L38). The blue isn't even on CD's blue ramp.

| # | Finding | Severity | Status |
|---|---|---|---|
| 13.3.1 | Link colour swapped from custom blue `#1F6FAB` to CD canonical `primary-600` (`#D8232A`), hover from `#134A77` to `primary-800` (`#99191E`). Cascades through every inline `<a>`, breadcrumb links, footer links, search results, the `.greeting-strip` draft link, the language-switcher active background, and the LLM badge dot. [tokens.css:37-47](../css/tokens.css#L37-L47) | **high** | ✓ |
| 13.3.2 | Added `text-underline-offset: 2px` to the global `a` rule per CD Bund `.link, main a` pattern — prevents descender collisions. [tokens.css:287](../css/tokens.css#L287) | low | ✓ |
| 13.3.3 | If the project later decides to mirror swisstopo's blue (a deliberate divergence from the design system), the swap is one-line in [tokens.css](../css/tokens.css#L37-L47): use `blue-700` `#1d4ed8` / `blue-800` `#1e40af`. Comment in the file already documents this. | low | — deliberate (current default: red) |

### 13.4 Success / confirmed-state colour

Our `--color-success: #047857` (green-700) is correct as a CD Bund
*value*, but the design system typically reaches for **green-500
(`#10b981`)** for the "active / confirmed / done" pill or step. Green-700
is darker and reads as "completed and locked", which is fine for closed
applications but feels heavy on the active step of the wizard pipeline
and on the small "ok" badges. Cross-reference §7.3.

| # | Finding | Severity | Status |
|---|---|---|---|
| 13.4.1 | **Resolved**: added `--color-success-bright: #10B981` (green-500) for active / confirmed states; kept `--color-success: #047857` (green-700) for terminal "done". Wired to `.step-indicator__step--confirmed` + `.step-indicator__connector--confirmed`. [tokens.css:107-115](../css/tokens.css#L107-L115), [styles.css:1238-1263](../css/styles.css#L1238-L1263) | medium | ✓ |

### 13.5 Other findings

| # | Finding | Severity | Status |
|---|---|---|---|
| 13.5.1 | `--color-danger` and `--color-primary` are the same value (`#D8232A`). Semantically fine on a federal site (red is both the brand and the danger signal), but the design language conflates two meanings. CD Bund does too (uses red-600 for both); document the deliberate conflation in DESIGNGUIDE.md. | low | — deliberate |
| 13.5.2 | `--color-prototype-notice: #ff4444` — saturated red on the navy footer was already softened to `rgba(255,255,255,0.65)` (§3.3). The token itself is now unreferenced. Retire. | low | ◻ (already in §1.7) |
| 13.5.3 | `--color-focus-tint: rgba(134, 85, 246, 0.25)` — purple-500 @ 25 % used as input focus ring soft-glow. Not a CD Bund token but a sensible portal addition. | — | ✓ deliberate |
| 13.5.4 | Badge palette uses CD-canonical 100/800 pairs across all six variants (green/blue/red/yellow/orange/gray). | — | ✓ aligned |
| 13.5.5 | Alpha tokens (`--color-white-20/70/92`, `--color-black-10/40/70`, `--color-backdrop`) — portal-specific composition helpers. CD uses Tailwind's `/N` opacity syntax inline; both arrive at the same place. | — | ✓ aligned |

### 13.6 Recommended additions (CD-canonical, currently missing)

Adding these would close most of the ramp-coverage gaps:

```css
:root {
  /* Red ramp — fill in below 500 and above 700 */
  --color-primary-50:   #ffedee;
  --color-primary-100:  #fae1e2;
  --color-primary-200:  #ffccce;   /* `mark` highlight background */
  --color-primary-300:  #fa9da1;
  --color-primary-400:  #fc656b;
  --color-primary-800:  #99191e;   /* link hover, danger text-on-light */
  --color-primary-900:  #801519;

  /* Secondary ramp — fill the three gaps */
  --color-secondary-200: #acb4bd;
  --color-secondary-400: #596978;
  --color-secondary-900: #131b22;

  /* Success — bright vs deep */
  --color-success-bright: #10b981;  /* green-500: active/confirmed */
  /* keep --color-success: #047857 for terminal "done" */
}
```

---

## 14. Page layouts (deep-dive)

CD Bund ships ~15 reference page templates in
[`app/pages/`](C:\Users\DavidRasner\Documents\GitHub\designsystem\app\pages).
Each template defines: where the **hero** lives (always full-bleed
inside `<main>`), where the **share bar** lives (always inside
`<header>`, inside a `.container`), how `<section>` blocks and
`.container__center--{xs,sm,md}` are nested, and which sidebar / aside
pattern applies.

Our routes are mostly *transactional* (forms, queues, dashboards) rather
than the publishing-content shape the CD templates were designed for,
so 1:1 mapping isn't always possible — but the **anatomy** (header →
hero → sections in container) should still hold.

### 14.1 Detail-page anatomy

CD Bund canonical detail page (cross-ref [`detailPageSimple.vue`](C:\Users\DavidRasner\Documents\GitHub\designsystem\app\pages\detailPageSimple.vue) +
[`detailPageComplex.vue`](C:\Users\DavidRasner\Documents\GitHub\designsystem\app\pages\detailPageComplex.vue)):

```
<header id="main-header">
  <skip-to-content>
  <TopBar> <TopHeader> <DesktopMenu> <MobileMenu>
  <Breadcrumb>
  <div class="container">
    <ShareBar />               ← inside header, inside container
  </div>
</header>
<main id="main-content">
  <Hero type="default">         ← FULL-BLEED, first child of <main>
    <template #title>…
    <template #description>…
    <template #image>…          ← caption inside hero
    <template #cta>…
  </Hero>
  <section class="section section--default">
    <div class="container container--grid gap--responsive">
      <div class="container__center--xs vertical-spacing">
        … prose / cards / tables …
```

Our property-detail render (annotated):

```
<page-body>
  <share-bar>                   ← outside main; uses its own internal max-width
  <section class="section">
    <div class="container">      ← container with horizontal padding
      <property-banner>          ← INSIDE container ⇒ has the left/right margin
        <caption>…
      </property-banner>
      <property-layout>…</property-layout>
```

| # | Finding | Severity | Status |
|---|---|---|---|
| 14.1.1 | **Property banner has a left margin** because it's nested inside `<div class="container">`. CD Bund heroes are full-bleed siblings of `<main>` — the banner image goes edge-to-edge of the viewport (the *caption text* sits inside a container). Restructured: banner moved out of the container wrapper; a `.container` now wraps the caption inside the banner so text stays at the canonical width. [app.js:1786-1795](../js/app.js#L1786-L1795), [styles.css:3711-3744](../css/styles.css#L3711-L3744) | **high** | ✓ |
| 14.1.2 | Share bar lives in `page-body` (outside `<main>` markup-wise but visually under the breadcrumb). CD Bund puts it inside `<header>`. For our SPA where `shell()` mounts the chrome separately from each route's page body, this is acceptable — the visual position is correct. Document as deliberate. | low | — deliberate |
| 14.1.3 | Share bar lacked a "Zurück" affordance. CD Bund has a separate `.back-bar` row that pairs with `.share-bar`; common federal pattern is back-link on the left, share/print on the right. Added optional `backTo`/`backLabel` parameters to `renderShareBar()`; the three detail pages now pass their parent-list URL. Layout uses `justify-content: space-between` so back sits left, actions right. [shell.js renderShareBar](../js/shell.js), [styles.css:1873](../css/styles.css#L1873) | medium | ✓ |
| 14.1.4 | Property banner is our own pattern (`.property-banner` with absolute-positioned caption + gradient overlay) rather than one of CD's hero variants (`.hero--main-image`, `.hero--main`, `.hero--hub`). Property-image-with-caption is a federal-real-estate pattern (similar to armasuisse Immo-Portal) and not a 1:1 fit for the abstract CD heroes — kept, but document as a portal-specific hero variant in §11 + DESIGNGUIDE. | low | — deliberate |
| 14.1.5 | Application detail (`#/inbox/:id`) has no hero at all — H1 is a `.page-header__title` inside `<section>`. For a *transactional* detail page (status pipeline, tabs, forms) that's the right call — a hero photo would be incongruous. Note as deliberate. | low | — deliberate |
| 14.1.6 | News detail (`#/news/:id`) lacks the canonical `<Hero>` block — uses inline `.news-detail__title` + image. Functionally equivalent (`.container--reading` keeps text narrow), but doesn't reuse the hero vocabulary. Consider promoting to a hero variant when news/info layouts get refactored. | low | ◻ |

### 14.2 Page-type catalogue — CD presets vs our routes

| CD template | Purpose | Our equivalent route | Alignment |
|---|---|---|---|
| `detailPageSimple.vue` | Long-form content article | `#/news/:id`, `#/info` | ✓ aligned (similar shape) |
| `detailPageComplex.vue` | Article + sticky aside | `#/properties/:id` | ✓ aligned |
| `detailPageAnchorNav.vue` | Article + sticky TOC | `#/info` | ✓ aligned (`.page-with-toc`) |
| `detailPressRelease.vue` | Press release | `#/news/:id` | ≈ aligned |
| `hubPage.vue` | Topic hub with sub-area cards | `#/`, `#/home` | partial — our landing is more "dashboard" than "hub" |
| `indexPage.vue` | Index listing (catalogue) | none | n/a |
| `newsList.vue` | News overview | `#/news` | ✓ aligned |
| `eventsList.vue` | Events overview | none | n/a — no event domain |
| `searchResults.vue` | Search results | `#/search` | ✓ aligned |
| `formExample.vue` | Form page | `#/wizard/:step`, `#/repair` | ≈ aligned — wizard is a stronger multi-step variant |
| `detailEvent.vue` | Single event | none | n/a |
| `detailPublication{Catalog,Shop}.vue` | Publication / shop catalogue | none | n/a — no commerce |
| `glossar.vue` | Glossary | none | n/a |
| `detailSimpleLanguage.vue`, `overviewEasy/SignLanguage.vue` | A11y companions (Leichte Sprache, Gebärdensprache) | none | ◻ federal requirement at production; out of scope for prototype |

### 14.3 Layout utilities — CD ships, we don't use

| CD utility | Purpose | Our equivalent | Action |
|---|---|---|---|
| `.container--grid` | 12-col grid wrapper | (none — we use ad-hoc grids) | low — adopt when we add `Card` index pages |
| `.container__center--xs` / `--sm` / `--md` | Centered narrower columns (prose / form / table) | `.container--narrow`, `.container--reading` | ≈ aligned with different names; document mapping |
| `.container__main` + `.container__aside` | Two-column main + sidebar | `.property-layout` (one-off grid) | promote to `.layout--with-aside` reusable class |
| `.container__full` | Full-width inside container | (rely on max-width override) | low |
| `.container--py` / `.container--pb` / `.container--pb-half` | Vertical padding utilities | `--section-py` / `--section-py-half` (variables, not classes) | acceptable — we use them via `.section` |
| `.gap--responsive` | Responsive gap | inline `gap: var(--space-lg)` per use | low — codify if grid usage grows |
| `.vertical-spacing` | `space-y-*` rhythm on children | not declared | medium — add as utility; reduces ad-hoc `<br>` and `margin-top` |
| `.bg--secondary-50` | Secondary-tinted section | `.section--alt` | ✓ aligned (renamed) |

### 14.4 Hero variants — CD ships, we don't use

| Variant | CD purpose | Use in our app? |
|---|---|---|
| `.hero--default` | Title + description + image, content centered to xs-width, image centered to md | Could replace landing-page intro |
| `.hero--title-only` | Title + description only, narrow column | `#/help`, `#/info` page headers |
| `.hero--main-image` | 6/6 col split (text left, image right) | Could replace landing-page two-column intro |
| `.hero--main` | Large vertical padding (py-20/32/40), 12/10/8 col content | Landing hero |
| `.hero--hub` | 12/10/8 col content + aside image | Topic-hub page (not used yet) |
| `.hero--overview` | Same as hub but title has `!mb-0` | Overview pages |

Current usage: only `.hero` + `.hero--split` declared in our styles (~L673-693). Not blocking; flag for promotion when landing / home pages get redesigned.

### 14.5 Recommended fix order

1. **§14.1.1** — Pull property banner out of `.container` (done in this pass).
2. **§14.1.3** — Add `Zurück` to share bar (done in this pass).
3. **§14.1.6** — Promote news detail to a hero variant (low).
4. **§14.3 `.vertical-spacing`** — Add utility class. (Cheap; cleans up ad-hoc margins.)
5. **§14.3 `.layout--with-aside`** — Codify the property-detail aside pattern as a reusable class — reused by future "application detail with aside" or "news detail with aside-of-related" surfaces.

## 15. DESIGNGUIDE.md alignment

[`docs/DESIGNGUIDE.md`](DESIGNGUIDE.md) is currently misaligned with both
the design system and the current state of [`css/styles.css`](../css/styles.css)
on several points. The guide is the doc that future contributors will
read first, so drift here compounds.

| # | DESIGNGUIDE claim | Reality | Severity | Status |
|---|---|---|---|---|
| 15.1 | §2.2 / §5.1 claimed "DS uses Hind ... with all weights set to 400" — **wrong on both counts**. **Resolved**: §2.2 rewritten to describe Noto Sans (the actual DS typeface), the four bundled faces, the binary 400/700 weight axis, and the metric-tuned `Fallback-NotoSans`. §5.1 "Hind deviation" deleted. | medium | ✓ |
| 15.2 | §3 table listed `.card--property__footer` as a portal block. **Resolved**: row replaced with the flat-layout description (`__status`/`__category` only). | low | ✓ |
| 15.3 | §2.7 "DS has 6 depths; we use the subset we actually need" — CD Bund's `boxShadow` Tailwind tokens are actually 7 (sm, default, md, lg, xl, 2xl, none). Off-by-one; not blocking. Comparison is stale anyway (we use `--shadow-card`). | low | ◻ |
| 15.4 | §5.1 "Future iteration may bundle the federal Hind font" — obsolete after §12.1.1 fix. **Resolved**: replaced with the live list of intentional deviations (shadows, button padding, breadcrumb depth, badge palette, pagination count, property banner). | low | ✓ |
| 15.5 | §5.5 "`.tag-item` not adopted" contradicted §3 (which lists `.tag-item[--active]`). **Resolved**: §5.5 deleted; §3 row remains the source of truth. | low | ✓ |
| 15.6 | §2.1 didn't mention link colour. **Resolved**: §2.1 now includes `--color-link: #D8232A` and a paragraph citing CD Bund `link.postcss` as the canonical source + swisstopo blue fallback option. | medium | ✓ |
| 15.7 | §2.2 type-scale table didn't surface the §12.3 drift findings (scale starts smaller than CD; body doesn't scale at xl/3xl). **Resolved**: §2.2 paragraph now points to CD-AUDIT §12.3 and flags the smaller-than-CD start. The scale table itself is kept; the prose underneath documents the drift. | medium | ✓ |
| 15.8 | §3 table omitted recent blocks. **Resolved (partial)**: added `.share-bar__back`, `.share-bar__actions`, `.pagination__count`, `.pagination__controls` rows. Remaining: a future sweep for any new helpers added between audits. | medium | ◐ |
| 15.9 | §6 "No `#hex` in component CSS" — currently 60+ `rgba(...)` declarations in `styles.css` use literal hex codes for white/black overlays. Should either soften the rule ("no opaque hex; rgba overlays acceptable for one-off opacity") or move overlays to `--color-white-N` / `--color-black-N` tokens (already declared but not used everywhere). | low | ◻ |
| 15.10 | §3 table is now 60+ rows in one block — hard to scan. Reorganise by component family (chrome / form / data / feedback / utility) before adding more. | low | ◻ |

After this pass, DESIGNGUIDE.md needs a focused rewrite to:
1. Drop the Hind-vs-NotoSans deviation (resolved).
2. Drop `.card--property__footer`, add the new entries from 15.8.
3. Refresh §2.1 to mention link colour = federal red.
4. Refresh §2.2 type-scale table + add a "deviates from CD" note per §12.3.
5. Fix the §5.5 contradiction.
6. Reorganise §3 into sub-groups.

## 16. Open follow-ups (consolidated)

Resolved across iterations (cross-referenced in their respective sections):
~~font loading~~ · ~~italic faces~~ · ~~fallback-font metric overrides~~ ·
~~faux-weight collapse~~ · ~~link colour~~ · ~~underline-offset~~ ·
~~muted-text contrast~~ · ~~reduced-motion~~ · ~~property-banner full-bleed~~ ·
~~share-bar Zurück~~ · ~~DESIGNGUIDE Hind/font misinfo~~ ·
~~DESIGNGUIDE tag-item contradiction~~ ·
~~DESIGNGUIDE deliberate-divergences rewrite~~ · ~~body-text scaling at xl/3xl~~ ·
~~heading scale h2/h3/h4 aligned to CD~~ · ~~color ramps filled (red 50-900,
secondary 200/400/900)~~ · ~~success-bright variant + wired to step-indicator~~ ·
~~nav-menu ARIA refined (disclosure pattern confirmed correct)~~ ·
~~focus ring on filled buttons~~.

Remaining, highest leverage first:

**Data-density / pagination spread**
1. **Pagination spread** (§5.6) — inbox, queue, news, search still un-paginated.
2. **Table density variant** (§5.2) — add `.table--compact` for reviewer queue + inbox.

**Layout & component coverage**
3. **`.vertical-spacing` utility** (§14.3) — codify the CD utility that gives children vertical rhythm. Reduces ad-hoc `margin-top` in detail-page content blocks.
4. **`.layout--with-aside` reusable class** (§14.3) — promote the property-detail aside pattern from a one-off `.property-layout` grid.
5. **News detail hero variant** (§14.1.6) — promote the inline title + image to a `.hero--default` variant.
6. **Card variants — `--clickable`** (§4.7) — formalise the property-card hover affordance.
7. **Accordion content padding** (§7.1) — raise from `--space-md` to `--space-lg` or higher on the `__panel` open state.
8. **Info-state notification + toast variants** (§6.1 / §6.3) — add `info` semantics.

**Cosmetic / cleanup**
9. **Two-weight cleanup sweep** (§12.2.3) — replace `--font-weight-medium/-semibold` aliases with `--font-weight-regular/-bold` in the ~28 call sites, then retire the aliases.
10. **Tracking tokens** (§12.3.5) — consolidate the ~15 ad-hoc `letter-spacing` declarations into `--tracking-tight`, `--tracking-label`, `--tracking-wide`.
11. **`word-spacing: 0.0625em` on html** (§12.3.6) — German-compound scan-ability. One-line CSS change.
12. **`.overtitle` kicker class + `mark` highlight** (§12.4) — small but visible federal-pattern wins.
13. **Retire `--color-prototype-notice` token** (§1.7 / §13.5.2).

**DESIGNGUIDE.md remaining**
14. **Shadow-count fix** (§15.3) — DS has 7 box-shadow tokens, not 6.
15. **rgba/hex rule clarification** (§15.9) — soften the "no `#hex`" rule to allow `rgba()` overlays, or move overlays to `--color-white-N` / `--color-black-N` tokens.
16. **Reorganise §3 component table** (§15.10) — split into chrome / form / data / feedback / utility groups.

## Reference

- Design system repo: <https://github.com/swiss/designsystem>
- Storybook docs: <https://swiss.github.io/designsystem/>
- Local clone: `C:\Users\DavidRasner\Documents\GitHub\designsystem`
- Living example: <https://www.swisstopo.admin.ch/en>
- Federal a11y baseline: eCH-0059 v3.0 · WCAG 2.1 AA · WCAG 2.2 SC 2.4.13 (focus appearance)
