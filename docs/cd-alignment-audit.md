# Tenant Portal - Swiss Federal Corporate Design Alignment Audit

Audit date: 2026-05-22

Tenant portal repo: `C:\Users\DavidRasner\Documents\GitHub\tenant-portal`

Reference design system repo: `C:\Users\DavidRasner\Documents\GitHub\designsystem`

## Executive Summary

- Critical: the footer omits required legal destinations in the implemented chrome: `Datenschutz` and `Impressum` are not rendered, while the design system exposes `Rechtliches`, `Datenschutz`, `Kontakt`, and `Impressum` footer patterns.
- Critical: the cookie/privacy consent banner is absent from the rendered app although the tenant portal requirements and design-system Storybook both define the pattern and first-focus DOM placement.
- High: the portal does not consume the Swiss Design System as a package, submodule, or built CSS artifact. It reimplements tokens and components locally, increasing drift risk.
- High: color implementation is mixed. `css/tokens.css` mirrors many DS tokens, but floor-plan rendering and MapLibre layers use hardcoded hex colors in JavaScript.
- High: language switcher chrome lists DE/FR/IT/EN, but FR/IT are disabled in profile settings and `pickLang()` only changes `html lang`, then warns that localization is not implemented.
- Medium: typography is mostly aligned to DS Noto Sans and responsive type classes, but the portal redefines `NotoSans` rather than consuming DS `Font-Regular`/`Font-Bold`, and multiple local letter-spacing overrides drift from the DS scale.
- Medium: interaction primitives are local hybrids: buttons, inputs, modal, accordion, pagination, tabs, notifications, and tables use DS-like class names but not DS Vue components or generated CSS.
- Medium: accessibility foundations are present: skip link, landmarks, focus-visible, live toasts, field error association, and modal focus trapping. Remaining risks are local accordion semantics, language parity, and map/canvas operability.
- Medium: responsive breakpoints and container widths largely match the DS, but the app has many literal dimensions and separate mobile-navigation logic that must be regression-tested at the required widths.
- Low/Medium: imagery uses real images with dimensions, `loading`, and `decoding`; several decorative card images intentionally use empty `alt`, which is acceptable only if their adjacent text names the same content.

## Repository Inventory And Stack Confirmation

Tenant portal root listing: `.claude/`, `.git/`, `assets/`, `css/`, `data/`, `docs/`, `js/`, `node_modules/`, `scripts/`, `verify_in/`, `verify_out/`, `.gitignore`, `index.html`, `LICENSE`, `package-lock.json`, `package.json`, `README.md`, and multiple `verify_*.mjs` scripts.

Tenant portal contents inspected: root static app files (`index.html`, `css/`, `js/`, `assets/`, `data/`), docs, verification scripts, and npm metadata. The tenant `package.json` declares only `playwright` as a dependency (`package.json:15-16`), and `index.html` directly loads `css/tokens.css`, `css/styles.css`, and `js/app.js` (`index.html:6-7`, `index.html:21`).

Reference design-system root listing: `.git/`, `.github/`, `app/`, `css/`, `dist/`, `node_modules/`, `.gitignore`, `.nvmrc`, `LICENSE`, `package-lock.json`, `package.json`, `pnpm-lock.yaml`, `postcss.config.js`, `publiccode.yml`, and `README.md`.

Reference design system contents inspected: root PostCSS/Tailwind source (`css/`), generated `dist/`, and Nuxt/Vue/Storybook app (`app/`). The design-system root package is `designsystem` version `1.0.5` (`designsystem/package.json:2-3`), builds PostCSS into `dist` (`designsystem/package.json:10`, `designsystem/package.json:15`), and its documentation app uses Nuxt/Vue/Storybook (`designsystem/app/package.json:20-26`, `designsystem/app/package.json:58-67`).

Confirmed tenant stack: static HTML + vanilla JS modules + local CSS custom properties. There is no Tailwind config, Vite/Next framework entry, CSS modules, Sass, styled-components, or DS package dependency in the tenant repo. Design-system consumption is by local copy/reimplementation: `assets/icons/*`, `assets/fonts/*`, `assets/swiss-logo-*`, `css/tokens.css`, and DS-like component class names.

## Methodology

Inspected:

- Tenant entry point, manifests, local tokens, main stylesheet, router/rendering modules, shell/header/footer, form helpers, modal/toast helpers, wizard, property/floor-map UI, document tables, profile language settings, and local docs.
- Reference design-system Tailwind tokens, default skin variables, foundation typography/font-face/container files, core component CSS, Vue components for logo/language/header/footer/modal/forms/buttons, and Storybook MDX where it documents cookie-banner behavior.

Not inspected:

- Pixel screenshots or automated browser reflow at 320/375/768/1024/1440.
- Runtime contrast audit over every page state.
- Upstream GitHub HEAD beyond the local `designsystem` checkout.

Assumptions:

- The local `designsystem` repo is the canonical project reference for this audit.
- Where the local DS is silent, Webguidelines Bund V04.00 conventions are treated as authoritative and placed in recommendations or open questions if no repo evidence exists.
- Because this is a written audit request, no application source files were modified.

## Findings By Topic

### 1. Brand Identity

**Finding BI-1: Footer legal links are incomplete.**

- Severity: Critical
- Gap type: Implementation gap
- Observation: The tenant footer renders `Allgemeine Geschaeftsbedingungen des Bundes`, `Rechtliches`, and `Barrierefreiheit`, but not `Datenschutz` or `Impressum`.
- Tenant evidence: `js/shell.js:399-403`.
- DS evidence: `designsystem/app/components/ch/sections/FooterNavigation.vue:3-10` provides footer `Rechtliches` and `Datenschutz`; `designsystem/app/components/ch/sections/FooterInformation.vue:67-70` provides `Kontakt`; `designsystem/app/components/ch/sections/FooterInformation.vue:88-94` provides `Impressum`.
- Canonical DS reference: `FooterInformation`, `FooterNavigation`, `.footer__link`.
- Recommendation: Add official footer destinations for `Datenschutz` and `Impressum`, and keep `Kontakt` visible in both meta nav and footer.

**Finding BI-2: Header logo is locally reconstructed, not the canonical Logo component.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: The app uses two local image files for the flag and wordmark plus local department text, rather than DS `Logo.vue` or DS logo CSS sizing.
- Tenant evidence: `js/shell.js:283-292`.
- DS evidence: `designsystem/app/components/ch/components/Logo.vue:1-17`, `designsystem/app/components/ch/components/Logo.vue:279-292`; DS sizing is in `designsystem/css/components/logo.postcss:50-74`.
- Canonical DS reference: `Logo`, `.logo`, `.logo__flag`, `.logo__name`, `.logo__separator`.
- Recommendation: Either consume the DS `Logo` markup/CSS exactly or add a documented local adapter with DS dimensions and clear-space tests.

**Finding BI-3: Language switcher order is aligned, but the pattern is locally custom and lacks RM.**

- Severity: Low
- Gap type: Implementation gap / possible product decision
- Observation: Tenant top bar lists `DE`, `FR`, `IT`, `EN` as a custom listbox. DS `LanguageSwitcher` lists `DE`, `FR`, `IT`, disabled `RM`, then `EN`.
- Tenant evidence: `js/shell.js:260-270`.
- DS evidence: `designsystem/app/components/ch/components/LanguageSwitcher.vue:3-10`.
- Canonical DS reference: `LanguageSwitcher`, `.language-switcher`.
- Recommendation: Decide whether Romansh-disabled (`RM`) must appear in federal chrome for this product. If yes, add disabled `RM` in the same DS order.

**Finding BI-4: Cookie/privacy consent pattern is missing from runtime chrome.**

- Severity: Critical
- Gap type: Implementation gap
- Observation: The app defines notification-banner styles and uses them for warnings/status messages, but no cookie/privacy banner is rendered at the top of the DOM.
- Tenant evidence: rendered notification usages are page-level only in `js/app.js:914-919` and `js/app.js:1213-1218`; tenant requirements call for a cookie/Datenschutz banner in `docs/IDEATE-WIREFRAMES.md:86-94`.
- DS evidence: Storybook says `Notification Banner` is used for cookie consent and must be the first focusable content before skip link/navigation (`designsystem/app/components/stories/components/NotificationBanner.mdx:8-12`); DS cookie text styling exists in `designsystem/css/components/notification.postcss:94-96`.
- Canonical DS reference: `NotificationBanner`, `.notification-banner`, `.cookie-banner`.
- Recommendation: Implement a non-blocking DSG consent banner before the skip link, with `Nur notwendige`, `Alle akzeptieren`, and `Datenschutz` link, or document why no consent is legally needed.

### 2. Color

**Finding C-1: App primary ramp mirrors DS, but the requested audit target `#DC0018` conflicts with the local DS token.**

- Severity: Medium
- Gap type: Design-system gap / governance question
- Observation: Tenant and DS both use `#D8232A` for `--color-primary-600` / `red.600`, not `#DC0018`.
- Tenant evidence: `css/tokens.css:76-86`, especially `css/tokens.css:82`.
- DS evidence: `designsystem/css/skins/default.postcss:7-16`, especially `designsystem/css/skins/default.postcss:13`; Tailwind canonical `red.600` is `designsystem/app/tailwind.config.js:148-156`.
- Canonical DS reference: `--color-primary-600`, `colors.red.600`.
- Recommendation: Resolve whether Webguidelines Bund V04.00 `#DC0018` overrides the current DS token. If yes, update DS first; if not, keep `#D8232A` and document the decision.

**Finding C-2: Runtime floor-map colors bypass CSS tokens.**

- Severity: High
- Gap type: Implementation gap
- Observation: Map and floor-plan color palettes are hardcoded in JS instead of using `--color-floor-*`, `red.*`, `gray.*`, or DS Tailwind tokens.
- Tenant evidence: `js/app.js:2431`, `js/app.js:2446`, `js/app.js:2451-2452`, `js/app.js:2455-2471`, `js/app.js:2795`, `js/app.js:2823-2864`.
- DS evidence: canonical color tokens are exposed as Tailwind `colors` in `designsystem/app/tailwind.config.js:37-199`; tenant local floor tokens already exist at `css/tokens.css:188-196`.
- Canonical DS reference: `colors.blue.200`, `colors.yellow.200`, `colors.gray.200`, `colors.purple.200`, `--color-floor-*`.
- Recommendation: Move floor-map and MapLibre paint colors to named CSS/JS token exports, with one mapping table sourced from tokens.

**Finding C-3: Color source is mixed: tokenized CSS plus raw rgba/hex in CSS.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: The stylesheet mostly uses variables, but also includes raw shadows, overlays, print colors, and comments with hardcoded colors. A scan found 7 hex and 35 `rgba/rgb` occurrences in `css/styles.css`, outside `css/tokens.css`.
- Tenant evidence: examples at `css/styles.css:291`, `css/styles.css:773`, `css/styles.css:863`, `css/styles.css:3424`, `css/styles.css:5936`.
- DS evidence: DS color system centralizes primary/secondary/text/color ramps in `designsystem/app/tailwind.config.js:37-199` and `designsystem/css/skins/default.postcss:5-28`.
- Canonical DS reference: `colors.*`, `--color-*`.
- Recommendation: Promote recurring overlay/shadow/print colors into tokens; leave one-off functional values only with comments.

**Finding C-4: No dark mode stance is implemented.**

- Severity: Low
- Gap type: Design-system gap / implementation gap
- Observation: Tenant tokens define default backgrounds and dark surfaces but no dark-mode media query or theme class. The DS local files likewise define a default skin, not a dark theme.
- Tenant evidence: `css/tokens.css:142-146`.
- DS evidence: default skin only declares primary/secondary variables under `:root` (`designsystem/css/skins/default.postcss:5-28`).
- Canonical DS reference: `default` skin, `--color-bg-*`, `--color-secondary-*`.
- Recommendation: Document "no dark mode" as product stance; do not add app-local dark mode unless DS defines a federal dark theme.

### 3. Typography

**Finding T-1: Noto Sans is loaded locally and aligned in weight count, but font-family names drift from DS.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Tenant loads Regular, Bold, Italic, BoldItalic as `NotoSans`, while DS names those faces `Font-Regular`, `Font-Bold`, `Font-Italic`, and `Font-Bold-Italic`.
- Tenant evidence: `css/tokens.css:21-55`, `css/tokens.css:229-231`.
- DS evidence: `designsystem/css/foundations/font-face.postcss:5-35`; DS font-family aliases are `designsystem/app/tailwind.config.js:219-224`.
- Canonical DS reference: `Font-Regular`, `Font-Bold`, `Font-Italic`, `Font-Bold-Italic`, `fontFamily.regular`.
- Recommendation: Either consume DS font-face names or document the alias mapping in one adapter file; keep only weights/styles actually used.

**Finding T-2: Responsive type scale is closely aligned to DS text utilities.**

- Severity: Low
- Gap type: No current gap
- Observation: Tenant maps h1-h4 to responsive values matching DS `text--3xl`, `text--2xl`, `text--xl`, and `text--lg`.
- Tenant evidence: `css/tokens.css:351-393`; `.h1-.h5` utilities at `css/styles.css:1403-1410`.
- DS evidence: DS type scale utilities are `designsystem/css/foundations/typography.postcss:18-57`, and heading helpers are `designsystem/css/foundations/typography.postcss:106-129`.
- Canonical DS reference: `.text--3xl`, `.text--2xl`, `.text--xl`, `.h1` to `.h5`.
- Recommendation: Keep this mapping, but remove negative tracking overrides not present in DS unless the visual design sign-off requires them.

**Finding T-3: Letter-spacing overrides drift from DS typography.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Tenant defines negative tracking tokens and several ad-hoc letter-spacing values; DS typography does not define negative tracking for headings.
- Tenant evidence: `css/tokens.css:255-257`, `css/styles.css:1406-1407`, `css/styles.css:3480`, `css/styles.css:4001`, `css/styles.css:4320`.
- DS evidence: heading helpers apply type and bold weight without letter-spacing at `designsystem/css/foundations/typography.postcss:106-129`.
- Canonical DS reference: `.h1`, `.h2`, `.text--*`.
- Recommendation: Remove negative tracking from federal UI headings unless a DS token is added.

**Finding T-4: Swiss numeric formatting is partially implemented, but content still mixes apostrophe thousands and narrow-space patterns.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Runtime formatters use `de-CH`, but static copy uses ASCII apostrophes for thousands and inconsistent unit spacing in several places.
- Tenant evidence: `js/lib.js:15-18`; static figures at `js/app.js:453`, `js/app.js:855-857`; narrow-space address at `js/app.js:584`.
- DS evidence: DS typography applies `word-spacing: 0.0625em` and standard body styles (`designsystem/css/foundations/typography.postcss:4-16`) but does not define domain-specific numeric microcopy rules.
- Canonical DS reference: `typography.postcss`, content guideline gap.
- Recommendation: Add a content-formatting helper for numbers, units, CHF, m2, and dates; audit static strings for Swiss typography.

### 4. Layout And Spacing

**Finding L-1: Breakpoints and container padding are intentionally aligned to DS.**

- Severity: Low
- Gap type: No current gap
- Observation: Tenant breakpoint comments and responsive container padding match DS `xs/sm/md/lg/xl/2xl/3xl` and container max-width intent.
- Tenant evidence: `css/tokens.css:296-299`, `css/tokens.css:401-423`.
- DS evidence: `designsystem/app/tailwind.config.js:20-32`; DS container is `designsystem/css/layouts/container.postcss:5-17`.
- Canonical DS reference: `screens.xs` through `screens.3xl`, `.container`.
- Recommendation: Preserve exact DS breakpoints and add a visual regression matrix for the specified widths.

**Finding L-2: App uses local page templates rather than DS page examples/components.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Tenant has custom `section`, `page-header`, `hero`, `property-layout`, and wizard layouts; DS provides container/grid primitives and page examples in Storybook but these are not consumed.
- Tenant evidence: local section/container styles at `css/styles.css:105-136`, property layout at `css/styles.css:5496-5502`.
- DS evidence: DS 12-column container primitives at `designsystem/css/layouts/container.postcss:51-124`.
- Canonical DS reference: `.container--grid`, `.container__main`, `.container__aside`.
- Recommendation: Map each portal page template to DS layout primitives in documentation and remove bespoke grid variants where the DS grid covers the case.

**Finding L-3: Spacing source is mixed.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Tenant defines a 4px spacing token scale, but CSS still contains many literal dimensions for fixed UI, icons, maps, images, and typography. A scan found 499 raw `px/rem` occurrences in `css/styles.css`.
- Tenant evidence: spacing scale at `css/tokens.css:270-278`; literal examples at `css/styles.css:650`, `css/styles.css:833`, `css/styles.css:5808-5810`, `css/styles.css:5835`.
- DS evidence: DS container spacing uses Tailwind scale primitives at `designsystem/css/layouts/container.postcss:27-49`.
- Canonical DS reference: `.container--py`, `.container--py-half`, Tailwind spacing scale.
- Recommendation: Keep fixed dimensions only for intrinsic UI formats; otherwise replace with `--space-*` or DS layout classes.

### 5. Iconography And Imagery

**Finding I-1: Icon source is aligned by vendoring the DS icon set, but it is not versioned as a dependency.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Tenant `icon()` renders SVG `<use>` references from `assets/icons/*.svg`; DS stores the same icon library under `app/assets/icons`.
- Tenant evidence: `js/lib.js:191-212`.
- DS evidence: `designsystem/app/components/ch/components/SvgIcon.vue` is consumed throughout DS components; examples include footer icons at `designsystem/app/components/ch/sections/FooterInformation.vue:18-35`.
- Canonical DS reference: `SvgIcon`, `app/assets/icons/*`.
- Recommendation: Track the icon asset version or replace vendored icons with DS package/static asset imports.

**Finding I-2: Image implementation is generally strong but relies on decorative empty alt text.**

- Severity: Low
- Gap type: Implementation nuance
- Observation: Images set dimensions, `loading`, and `decoding`; some cards use empty `alt` while adjacent text names the item.
- Tenant evidence: news/property card images at `js/app.js:719`, `js/app.js:1043`, `js/app.js:2081`; hero image with meaningful `alt` and `figcaption` at `js/app.js:839-847`.
- DS evidence: DS figcaption uses `.legend` (`designsystem/css/foundations/typography.postcss:131-137`); DS card docs state image is mandatory for default cards (`designsystem/app/components/stories/components/Card.mdx:21`).
- Canonical DS reference: `Card`, `figcaption`, `.legend`.
- Recommendation: Keep empty `alt` only when the adjacent card title fully identifies the image; add alt text rules to content governance.

**Finding I-3: Floor-plan swatches use inline styles.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Legend swatches inject background colors inline from runtime groups.
- Tenant evidence: `js/app.js:2705`.
- DS evidence: DS color tokens are available in `designsystem/app/tailwind.config.js:37-199`; tenant has local floor tokens at `css/tokens.css:188-196`.
- Canonical DS reference: `colors.*`, `--color-floor-*`.
- Recommendation: Emit token class names or CSS custom-property references instead of inline color strings.

### 6. Components

**Finding CMP-1: Buttons are local CSS clones with DS-like variants.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Tenant defines `.btn`, `.btn--filled`, `.btn--outline`, `.btn--bare`, icon-only, and back variants locally.
- Tenant evidence: `css/styles.css:1071-1128`, icon-only at `css/styles.css:2344-2350`.
- DS evidence: DS button variants and sizes are `designsystem/css/components/btn.postcss:6-19`, `designsystem/css/components/btn.postcss:27-84`, `designsystem/css/components/btn.postcss:111-166`.
- Canonical DS reference: `Btn`, `.btn--filled`, `.btn--outline`, `.btn--bare`, `.btn--icon-only`.
- Recommendation: Treat tenant button CSS as an adapter and add snapshot/visual checks against DS Storybook examples.

**Finding CMP-2: Forms and validation are mostly aligned, but the controls are local.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Tenant input/select/textarea styles mirror DS base inputs; `setFieldError()` correctly sets `aria-invalid`, `aria-describedby`, and `role=alert`.
- Tenant evidence: CSS at `css/styles.css:1797-1900`; radio/checkbox at `css/styles.css:1997-2024`; error helper at `js/lib.js:119-144`.
- DS evidence: DS input base and states are `designsystem/css/components/input.postcss:1-76`; radio/checkbox states are `designsystem/css/components/input.postcss:78-152`.
- Canonical DS reference: `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `.input--error`.
- Recommendation: Keep helper behavior; add a form-component inventory so every form control is mapped to a DS primitive or documented exception.

**Finding CMP-3: Accordions use local trigger/panel markup and no `aria-controls`/`aria-expanded` state updates.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Tenant accordions toggle parent classes inline. In the visible snippets, triggers do not update `aria-expanded` or point to panels.
- Tenant evidence: `js/app.js:521-541`, `js/app.js:630-635`, `js/app.js:3407-3437`; CSS at `css/styles.css:2979-3039`.
- DS evidence: DS accordion separates button, arrow, drawer, and content classes at `designsystem/css/components/accordion.postcss:14-30`, `designsystem/css/components/accordion.postcss:50-72`.
- Canonical DS reference: `Accordion`, `AccordionItem`, `.accordion__button`, `.accordion__drawer`.
- Recommendation: Use button `aria-expanded`, `aria-controls`, stable panel IDs, and keyboard behavior matching the DS script.

**Finding CMP-4: Tables, pagination, modals, toasts, tabs, and step indicator are hybrid/local.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Tenant implements DS-like local variants for tables, compact pagination, modal focus trapping, toast live regions, tabs, and wizard steps.
- Tenant evidence: table/pagination CSS `css/styles.css:2105-2157`, `css/styles.css:2289-2337`; pagination renderer `js/app.js:1919-1958`; modal helper `js/lib.js:424-505`; tabs `js/app.js:1237`, `js/app.js:1261-1285`; step indicator `js/lib.js:350-368`.
- DS evidence: DS table at `designsystem/css/components/table.postcss:18-63`, pagination at `designsystem/css/components/pagination.postcss:5-32`, modal at `designsystem/css/components/modal.postcss:5-107`, step indicator at `designsystem/css/components/step-indicator.postcss:5-22`.
- Canonical DS reference: `.table`, `.table--zebra`, `.pagination`, `Modal`, `StepIndicator`.
- Recommendation: Decide whether the portal will remain CSS-only with local behavior or migrate to Vue/DS components; document the update path either way.

### 7. Interaction And Motion

**Finding M-1: Focus-visible is implemented globally and reinforced for key controls.**

- Severity: Low
- Gap type: No current gap
- Observation: Tenant defines a global visible focus ring and button/search focus overrides.
- Tenant evidence: `css/tokens.css:474-476`; button focus at `css/styles.css:1125-1147`; input focus at `css/styles.css:1823-1829`.
- DS evidence: DS button and input CSS suppresses browser outline and expects DS focus styling (`designsystem/css/components/btn.postcss:12`, `designsystem/css/components/input.postcss:17`).
- Canonical DS reference: focus-visible treatment for `Btn` and `Input`.
- Recommendation: Keep global focus-visible as the replacement; run keyboard walkthroughs after each component change.

**Finding M-2: Reduced motion support is better than the current DS baseline.**

- Severity: Low
- Gap type: No current gap / DS gap
- Observation: Tenant globally shortens animations/transitions under `prefers-reduced-motion: reduce`; DS has many transition durations and only a limited no-preference rule for back-to-top.
- Tenant evidence: `css/tokens.css:487-493`.
- DS evidence: DS transition examples in `designsystem/css/components/accordion.postcss:29`, `designsystem/css/components/accordion.postcss:51-62`, `designsystem/css/components/card.postcss:17-24`; reduced-motion search found `designsystem/css/components/back-to-top-btn.postcss:5`.
- Canonical DS reference: motion utilities / transition classes.
- Recommendation: Keep the tenant reduced-motion rule and consider upstreaming it to the DS.

**Finding M-3: Motion tokens are local and incomplete.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Tenant defines `--transition-fast`, `--transition`, and `--transition-slow`, but still has hardcoded durations in CSS.
- Tenant evidence: tokens at `css/tokens.css:329-331`; hardcoded examples at `css/styles.css:651`, `css/styles.css:5417`, `css/styles.css:5759`.
- DS evidence: DS uses Tailwind durations and explicit transition timings in component CSS, e.g. `designsystem/css/components/btn.postcss:151`, `designsystem/css/components/accordion.postcss:29-62`.
- Canonical DS reference: transition duration classes, component transition patterns.
- Recommendation: Normalize tenant motion to named tokens or DS Tailwind duration equivalents.

### 8. Responsive And Mobile

**Finding R-1: Viewport and responsive root are present.**

- Severity: Low
- Gap type: No current gap
- Observation: Tenant has mobile viewport meta and responsive token breakpoints.
- Tenant evidence: `index.html:5`; breakpoints at `css/tokens.css:421-423`.
- DS evidence: DS breakpoints are `designsystem/app/tailwind.config.js:20-28`.
- Canonical DS reference: `screens.*`.
- Recommendation: Add automated viewport checks for 320, 375, 768, 1024, and 1440.

**Finding R-2: Mobile navigation is local, not DS mobile menu.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Tenant builds a custom burger/focus-trapped mobile nav over the desktop nav list.
- Tenant evidence: render and toggle logic at `js/shell.js:321-341`, `js/shell.js:713-766`.
- DS evidence: DS `TopHeader` uses `Burger` and layout store at `designsystem/app/components/ch/sections/TopHeader.vue:56-63`; mobile menu transitions exist in `designsystem/css/sections/mobile-menu.postcss:104-165`.
- Canonical DS reference: `Burger`, `MobileMenu`, `MobileMenuV2`.
- Recommendation: Compare the tenant mobile menu to DS `MobileMenuV2` behavior and add keyboard/touch regression tests.

**Finding R-3: Touch targets are generally designed to 44px minimum, but small variants need review.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Tenant sets `--btn-min-h: 44px` but also has `--btn-sm-min-h: 34px`; app `.btn--sm` currently uses the 44px token.
- Tenant evidence: `css/tokens.css:302-304`; tenant `.btn--sm` at `css/styles.css:1118`.
- DS evidence: DS base buttons are 44/48/52px, but `.btn--sm` is 34/40/44px (`designsystem/css/components/btn.postcss:111-123`).
- Canonical DS reference: `.btn`, `.btn--sm`.
- Recommendation: Keep the tenant's 44px small-button choice for touch surfaces; only use smaller controls in dense non-touch tables with sufficient hit area.

### 9. Accessibility

**Finding A11Y-1: Landmarks, skip link, and main focus target are present.**

- Severity: Low
- Gap type: No current gap
- Observation: Tenant shell renders skip link, header/banner, breadcrumb nav, main, and footer/contentinfo.
- Tenant evidence: `js/shell.js:247-249`, `js/shell.js:339-349`, `js/shell.js:366-406`.
- DS evidence: DS container/header/footer components provide corresponding structural regions, e.g. `designsystem/app/components/ch/sections/TopHeader.vue:1-9` and footer nav `designsystem/app/components/ch/sections/FooterNavigation.vue:1-13`.
- Canonical DS reference: `TopHeader`, `FooterNavigation`.
- Recommendation: Keep landmarks stable across every route render.

**Finding A11Y-2: Modal helper implements key accessibility behavior.**

- Severity: Low
- Gap type: No current gap
- Observation: Tenant modal uses `role=dialog`, `aria-modal=true`, `aria-labelledby`, Escape close, focus trap, and focus restoration.
- Tenant evidence: `js/lib.js:424-429`, `js/lib.js:460-505`.
- DS evidence: DS modal uses `aria-modal`, `aria-labelledby`, `aria-describedby`, close button, and focus restoration hooks (`designsystem/app/components/ch/components/Modal.vue:1-41`, `designsystem/app/components/ch/components/Modal.vue:93-128`).
- Canonical DS reference: `Modal`.
- Recommendation: Keep this helper centralized; ban ad-hoc modals outside it.

**Finding A11Y-3: Live regions exist for toasts and pagination counts.**

- Severity: Low
- Gap type: No current gap
- Observation: Toast host uses polite live region; pagination counts update with `aria-live`.
- Tenant evidence: `js/lib.js:383-391`, `js/app.js:1951-1958`, `js/app.js:3144-3154`.
- DS evidence: DS pagination structure is `designsystem/css/components/pagination.postcss:5-15`; DS toast message pattern is `designsystem/css/components/toast-message.postcss:5-18`.
- Canonical DS reference: `.pagination`, `.toast__message`.
- Recommendation: Keep live regions polite and avoid duplicate announcements in route changes.

**Finding A11Y-4: Language attribute is updated, but untranslated content creates an accessibility mismatch.**

- Severity: High
- Gap type: Implementation gap
- Observation: `pickLang()` sets `<html lang>` to FR/IT/EN even though content remains German and a toast says localization is not implemented.
- Tenant evidence: `js/shell.js:632-645`.
- DS evidence: DS `LanguageSwitcher` exposes language options but does not implement portal localization (`designsystem/app/components/ch/components/LanguageSwitcher.vue:3-10`).
- Canonical DS reference: `LanguageSwitcher`.
- Recommendation: Do not change document language until the rendered content changes; for placeholder languages, mark options disabled or route to translated bundles.

### 10. Content, Language And Localisation

**Finding CL-1: DE/FR/IT parity is not implemented.**

- Severity: Critical
- Gap type: Implementation gap
- Observation: Profile language settings show Deutsch checked and Francais/Italiano disabled; top-bar language selection only displays a toast.
- Tenant evidence: `js/app.js:3327-3333`; `js/shell.js:641-645`.
- DS evidence: DS switcher lists selectable DE/FR/IT options (`designsystem/app/components/ch/components/LanguageSwitcher.vue:3-10`); tenant requirements make DE/FR/IT a Must (`docs/REQUIREMENTS.md:321`).
- Canonical DS reference: `LanguageSwitcher`.
- Recommendation: Implement real DE/FR/IT resource bundles before enabling the top-bar options; keep EN as optional only after a product decision.

**Finding CL-2: Tone is mostly formal German but some labels are prototype/demo oriented.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: The app uses formal administrative German in many flows, but visible UI includes `Demo`, `Demo-Anmeldung`, and prototype warnings.
- Tenant evidence: demo chip at `js/shell.js:258`; login title at `js/app.js:925`; prototype footer section at `js/shell.js:389-392`.
- DS evidence: DS top/header/footer examples are neutral official chrome, not prototype labels (`designsystem/app/components/ch/sections/TopHeader.vue:1-66`, `designsystem/app/components/ch/sections/FooterInformation.vue:47-97`).
- Canonical DS reference: official chrome components.
- Recommendation: Keep demo labels only in prototype environments; remove them for pilot/production CD acceptance.

**Finding CL-3: Text expansion headroom is unverified.**

- Severity: Medium
- Gap type: Verification gap
- Observation: Current UI strings are German-only and many buttons/toolbar items have fixed widths or compact layouts.
- Tenant evidence: compact language/profile strings at `js/app.js:3327-3333`; document filter toolbar at `js/app.js:2977-2990`; pagination at `js/app.js:3138-3154`.
- DS evidence: DS button text explicitly allows wrapping with `overflow-wrap:anywhere` (`designsystem/css/components/btn.postcss:133-143`).
- Canonical DS reference: `.btn__text`, `.btn__text-centered`.
- Recommendation: Test FR/IT strings with 20-30 percent expansion before sign-off.

### 11. Technical CD Implementation

**Finding TECH-1: No formal dependency/update path to the design system.**

- Severity: High
- Gap type: Implementation gap
- Observation: Tenant package has no DS dependency; DS package exposes version and build pipeline.
- Tenant evidence: `package.json:15-16`; app directly links local CSS at `index.html:6-7`.
- DS evidence: `designsystem/package.json:2-3`, `designsystem/package.json:10-16`, repository metadata at `designsystem/package.json:20-24`.
- Canonical DS reference: `designsystem` package, `dist/main.css`, PostCSS source.
- Recommendation: Choose one path: package dependency, git submodule/vendor with version pin, or generated CSS import; document update cadence.

**Finding TECH-2: Tokens are manually recreated rather than generated.**

- Severity: High
- Gap type: Implementation gap
- Observation: Tenant `css/tokens.css` states it is derived from the cloned DS and contains a local audit/remediation history; it is not generated from DS source.
- Tenant evidence: `css/tokens.css:7-13`, token definitions at `css/tokens.css:76-86`.
- DS evidence: DS canonical variables are in `designsystem/css/skins/default.postcss:5-28`, with Tailwind references in `designsystem/app/tailwind.config.js:37-199`.
- Canonical DS reference: `css/skins/default.postcss`, `app/tailwind.config.js`.
- Recommendation: Generate tenant tokens from the DS source or add a script/check that diffs tenant tokens against DS on CI.

**Finding TECH-3: No linting/style rules enforce token usage.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: Tenant has no Stylelint/ESLint/token scripts; package scripts only contain a placeholder test.
- Tenant evidence: the only script is the placeholder test at `package.json:9-11`, and the only dependency is Playwright at `package.json:15-17`.
- DS evidence: DS app has lint/type/format scripts (`designsystem/app/package.json:13-17`) and root build scripts (`designsystem/package.json:10-17`).
- Canonical DS reference: DS lint/build pipeline.
- Recommendation: Add a lightweight CSS/JS lint step that flags raw color literals, raw DS-tokenable spacing, and non-DS component variants.

**Finding TECH-4: Storybook/component docs are not consumed in the tenant repo.**

- Severity: Medium
- Gap type: Implementation gap
- Observation: The reference DS has Storybook docs and stories; tenant has local docs and verification scripts but no component documentation system.
- Tenant evidence: no Storybook dependency in `package.json:15-16`; local docs exist under `docs/`.
- DS evidence: Storybook scripts and dependencies in `designsystem/app/package.json:10-11`, `designsystem/app/package.json:33-44`.
- Canonical DS reference: Storybook MDX under `app/components/stories`.
- Recommendation: Add a tenant component conformance page or adopt DS Storybook examples as visual baselines.

## Token Usage Matrix

| Category | App source | Drift count | Exemplar file | DS canonical reference | Notes |
|---|---|---:|---|---|---|
| Color | Mixed: local tokens + hardcoded CSS/JS | 86 raw color literals outside `css/tokens.css` (42 CSS rgb/hex + 44 JS hex) | `js/app.js:2431`, `css/styles.css:291` | `colors.*`, `--color-primary-*`, `--color-secondary-*` | Highest drift in floor plans and map layers. |
| Typography | Mostly local tokens | At least 22 local letter-spacing declarations and several non-token font sizes | `css/tokens.css:255`, `css/styles.css:3480` | `.text--*`, `.h1-.h5`, `fontFamily.*` | Type scale aligns; tracking does not. |
| Spacing/layout | Mixed: local `--space-*` + literals | 499 raw `px/rem` matches in `css/styles.css` | `css/tokens.css:270-278`, `css/styles.css:5808` | `.container`, `.container--py`, Tailwind spacing | Many are fixed UI sizes, but no enforcement distinguishes acceptable literals. |
| Radius/shadow | Mixed | Multiple raw shadows/radii remain | `css/styles.css:773`, `css/styles.css:863` | `borderRadius`, `boxShadow` in `app/tailwind.config.js:225-248` | Promote recurring shadows to tokens. |
| Motion | Mixed | 3 explicit non-token transition-duration declarations in CSS | `css/styles.css:5417`, `css/styles.css:5759` | DS transition classes and component timings | Tenant has good reduced-motion override. |

## Component Conformance Matrix

| Component | Present | Source | Severity of deviation | Notes |
|---|---:|---|---|---|
| Federal logo/header | Yes | Local hybrid | Medium | Uses local images and markup, not DS `Logo`/`TopHeader`. |
| Language switcher | Yes | Local hybrid | High | Order mostly aligned; no real localization; RM missing. |
| Footer | Yes | Local hybrid | Critical | Missing `Datenschutz` and `Impressum`. |
| Cookie/banner | No | Missing | Critical | DS docs define `NotificationBanner` cookie pattern. |
| Buttons | Yes | Local clone | Medium | Variants mapped to DS names. |
| Inputs/select/textarea | Yes | Local clone | Medium | Good ARIA error helper; no DS component import. |
| Checkbox/radio | Yes | Local clone | Medium | Visual pattern mirrors DS input CSS. |
| Switch | Partial | Local checkbox/toggle | Medium | No canonical switch component found in DS; treat as DS gap if required. |
| File input | Yes | Native/local | Medium | Present in repair and wizard flows; no DS file primitive observed. |
| Date input | Not observed | Missing | Low | No date-control need verified in inspected UI. |
| Validation states | Yes | Local helper | Low | `setFieldError()` is strong. |
| Alerts/notifications | Yes | Local clone | Medium | Page banners and toasts exist. |
| Cards/tiles | Yes | Local clone | Medium | Uses DS-like card semantics and images. |
| Tables | Yes | Local clone | Medium | Zebra/compact/clickable variants; sorting not fully canonical. |
| Modals/dialogs | Yes | Local helper | Low | Accessibility behavior aligns well. |
| Drawers | Partial | Local nav/breadcrumb drawers | Medium | No generic drawer primitive. |
| Tooltips/popovers | Not observed | Missing/unknown | Low | DS has `Popover`; tenant usage not found. |
| Tabs | Yes | Local helper | Medium | ARIA keyboard logic exists; no DS component. |
| Accordions/disclosure | Yes | Local clone | Medium | Missing ARIA state in inline toggles. |
| Pagination/result counts | Yes | Local clone | Low | Aligns with DS compact pattern. |
| Breadcrumbs | Yes | Local hybrid | Medium | Includes schema/list and peer dropdown; local behavior. |
| Step indicators | Yes | Local clone | Medium | Mirrors DS but class names differ. |
| Empty states | Yes | Local | Low | DS gap: no canonical empty-state primitive identified. |
| Loading skeletons | Not observed | Missing | Medium | Requirements mention loading/network states; no skeleton component observed. |
| Error states | Yes | Local | Medium | Map/floor errors and table empty states exist. |

## Prioritised Remediation Roadmap

| ID | Severity | Effort | Phase | Dependency |
|---|---|---:|---|---|
| R-01 | Critical | S | Phase 0 | Add footer `Datenschutz` and `Impressum` destinations. |
| R-02 | Critical | M | Phase 0 | Implement or formally exempt cookie/Datenschutz consent banner. |
| R-03 | Critical | L | Phase 1 | Implement DE/FR/IT resource bundles before enabling language changes. |
| R-04 | High | M | Phase 1 | Choose DS consumption mechanism: package, submodule, generated CSS, or generated tokens. |
| R-05 | High | M | Phase 1 | Replace hardcoded JS map/floor colors with token source. |
| R-06 | High | M | Phase 1 | Add CI checks for token drift against DS `default.postcss` and `tailwind.config.js`. |
| R-07 | Medium | S | Phase 1 | Fix accordion ARIA state and stable panel IDs. |
| R-08 | Medium | M | Phase 2 | Create component conformance docs/visual baselines for local DS clones. |
| R-09 | Medium | M | Phase 2 | Normalize typography tracking and remove negative heading tracking unless approved. |
| R-10 | Medium | M | Phase 2 | Run responsive/keyboard/a11y verification at required viewport widths. |
| R-11 | Low | S | Phase 2 | Document no-dark-mode stance. |
| R-12 | Low | M | Phase 3 | Add content-formatting helpers for numbers, CHF, dates, units, and Swiss punctuation. |

## Open Questions

- Does Webguidelines Bund V04.00 require literal `#DC0018` for this product, or is the current Swiss Design System `--color-primary-600 = #d8232a` authoritative?
- Should disabled `RM` appear in the language switcher to match the DS component, or is DE/FR/IT/EN the approved tenant-portal language set?
- Is a cookie/consent banner legally required if the app uses only localStorage and no analytics/tracking cookies? If exempt, where should the exemption be documented?
- What is the approved production footer destination set and URL ownership for `Impressum`, `Datenschutz`, `Rechtliches`, `Barrierefreiheit`, `Kontakt`, and language pages?
- Will the production frontend remain vanilla/static, or is migration to Vue/Nuxt DS components planned?
- Which map/floor-plan colors are semantic product tokens versus visualization-only tokens?
- Are loading skeletons required by product design, or are text/error states sufficient for the pilot?
- What is the target environment distinction for prototype/demo labels versus pilot/production official chrome?
