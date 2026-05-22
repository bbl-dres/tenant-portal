# Tenant Portal - Swiss Federal Design System Audit

## Executive Summary

- The portal is a static, hash-routed JavaScript app with local CSS tokens and locally rendered components; it mirrors the Swiss design-system vocabulary but does not consume the Vue/PostCSS primitives directly.
- Mobile fundamentals are partly strong: the viewport meta tag is present, Noto Sans is locally loaded with `font-display: swap`, focus rings are visible, and the burger menu includes scroll lock and focus trapping.
- Highest mobile priorities are: fix `/downloads` document-level horizontal overflow, bring compact header/search/toast/reviewer controls up to 44 x 44 px targets, and associate form labels/groups with controls.
- Breakpoints mostly match the design system, but the tenant misses the `xs` 480 px container-padding step, so large phones keep narrower 16 px page gutters where the design system moves to 28 px.
- Design-system alignment is generally intentional at token level, including primary red `#d8232a`, secondary/navy ramps, Noto Sans, focus purple, and core spacing/radius scales.
- The main alignment risk is local reinvention: buttons, tables, alerts, modals, mobile navigation, icons, pagination, and form controls are hand-built, so several small deviations already exist.
- Image/media handling is inconsistent: many content images have dimensions and lazy loading, but several lack responsive `<picture>`/`srcset` and explicit dimensions.
- The language switcher changes `<html lang>` and exposes DE/FR/IT/EN choices, but non-DE content is not implemented, making i18n posture incomplete.

## Methodology

Inspected tenant entry points, routing, shell, form renderers, CSS tokens, component CSS, and data-loading paths in `tenant-portal`. Inspected the local reference design system under `designsystem`, focusing on `app/tailwind.config.js`, `css/foundations/*`, `css/layouts/*`, `css/components/*`, `css/sections/*`, and `app/components/ch/**`.

I also ran a Playwright viewport smoke check against the tenant app at 320, 375, and 768 px for `#/`, `#/home`, `#/properties`, `#/downloads`, `#/wizard/1`, and `#/repair`. The check measured `documentElement.scrollWidth` vs `clientWidth` and sampled visible interactive targets under 44 px. No application source files were modified.

Assumptions: the local `designsystem` repo is the canonical audit baseline for line-level evidence. The upstream GitHub repo was opened only for context; findings below cite local repo files as requested. Items not directly verifiable from the repos are listed under Open Questions.

## Mobile Findings

### M-01 - Responsive Root Setup Is Present

Observation: The tenant app has the required mobile viewport meta and a stable German root language. The design system sets stable app root containers for Nuxt/Vue mounts.

Evidence: tenant `index.html:2`, `index.html:5`; designsystem `css/foundations/global.postcss:12`, `css/foundations/global.postcss:16`.

Severity: Low.

Recommendation: Keep the current viewport setup. If native safe-area layouts are introduced later, evaluate `viewport-fit=cover`, but it is not required by the current repo evidence.

### M-02 - Breakpoint Alignment Misses the 480 px `xs` Padding Step

Observation: Tenant breakpoints align at 640, 768, 1024, 1280, and 1920 px, but tenant container padding jumps from 16 px to 28 px only at 640 px. The design system defines `xs: 480px` and applies `xs:px-7`, so 480-639 px devices should receive 28 px gutters.

Evidence: tenant `css/tokens.css:402`, `css/tokens.css:403`, `css/tokens.css:404`, `css/tokens.css:405`, `css/tokens.css:406`; designsystem `app/tailwind.config.js:21`, `css/layouts/container.postcss:7`.

Severity: Medium.

Recommendation: Add the 480 px container-padding step to tenant tokens, or document why the portal intentionally keeps 16 px gutters through 639 px.

### M-03 - Several Interactive Targets Fall Below 44 x 44 px

Observation: The portal defines 44 px button and input tokens, but some interactive surfaces bypass them. Playwright measured the mobile header search toggle at 92 x 36, the open search input at 140 x 39, search submit at 36 x 32, toast close at 24 x 24, and reviewer mark buttons at 36 px min-height.

Evidence: tenant `css/styles.css:489`, `css/styles.css:491`, `css/styles.css:525`, `css/styles.css:548`, `css/styles.css:2409`, `css/styles.css:2411`, `css/styles.css:2412`, `css/styles.css:4470`; designsystem `css/components/btn.postcss:112`, `css/components/btn.postcss:114`, `css/components/input.postcss:2`, `css/components/input.postcss:16`.

Severity: High.

Recommendation: Route all header/search/toast/reviewer controls through the 44 px hit-target contract. For visually small icons, use pseudo-element hit slop as the tenant already does for carousel dots.

### M-04 - Mobile Navigation Is Functional but Locally Reimplemented

Observation: Tenant navigation uses a burger toggle, body scroll lock, focus trap, and `Esc` close handling. This is good, but it is a local full-width navigation implementation rather than the design system's `mobile-menu-v2` multi-level model with explicit close/back controls and level containers.

Evidence: tenant `js/shell.js:319`, `js/shell.js:320`, `js/shell.js:725`, `js/shell.js:738`, `js/shell.js:750`, `css/styles.css:3214`, `css/styles.css:3224`, `css/styles.css:3233`; designsystem `css/sections/mobile-menu.postcss:38`, `css/sections/mobile-menu.postcss:48`, `css/sections/mobile-menu.postcss:62`, `css/sections/mobile-menu.postcss:84`, `css/sections/mobile-menu.postcss:149`.

Severity: Medium.

Recommendation: Keep the existing focus/scroll safeguards. If navigation gains deeper IA than the current top-level menu, move toward `MobileMenuV2` semantics instead of extending the local drawer ad hoc.

### M-05 - Form Ergonomics Are Mixed

Observation: Tenant text inputs/selects use a 44 px min-height and validation helper wires `aria-invalid` plus `aria-describedby`. Numeric/tel fields use `inputmode`. However, some visible labels are not programmatically bound to controls, and radio/checkbox groups use visual labels instead of `fieldset`/`legend`.

Evidence: tenant `css/styles.css:1780`, `css/styles.css:1790`, `js/lib.js:137`, `js/lib.js:138`, `js/wizard.js:173`, `js/wizard.js:174`, `js/wizard.js:384`, `js/wizard.js:432`, `js/app.js:3274`; designsystem `app/components/ch/components/Input.vue:3`, `app/components/ch/components/Select.vue:3`, `app/components/ch/components/Fieldset.vue:2`, `app/components/ch/components/Fieldset.vue:3`.

Severity: Medium.

Recommendation: Give every select/input a stable `id` and matching `for`. Wrap radio/checkbox question groups in `fieldset`/`legend` equivalents, using the design-system `Fieldset` contract as the model.

### M-06 - `/downloads` Overflows the Viewport at 320, 375, and 768 px

Observation: Playwright measured document-level horizontal overflow on `#/downloads`: 1012 px scroll width at 320/375 px and 1032 px scroll width at 768 px. The tenant wraps the document table in `.docs-table-wrap`, but the page still overflows globally.

Evidence: tenant `js/app.js:2993`, `js/app.js:2994`, `css/styles.css:2235`, `css/styles.css:2236`; designsystem `css/components/table.postcss:5`, `css/components/table.postcss:6`, `app/components/ch/demo/Table.vue:2`, `app/components/ch/demo/Table.vue:3`.

Severity: Critical.

Recommendation: Contain the table's intrinsic width inside the scroll wrapper. Verify the wrapper has `max-width: 100%`, the section/card parent has `min-width: 0`, and no column-width rule forces the table beyond the wrapper at mobile/tablet widths.

### M-07 - Responsive Media Handling Is Incomplete

Observation: Some tenant images use `loading`, `decoding`, dimensions, and one hero image uses `srcset`; others lack responsive sources and/or dimensions, including the news detail image and video thumbnail assets. The design system documents responsive `<picture>` declarations and image ratio/dimension requirements.

Evidence: tenant `js/app.js:800`, `js/app.js:841`, `js/app.js:842`, `js/app.js:847`, `js/app.js:879`, `js/app.js:882`, `js/app.js:885`, `js/app.js:892`; designsystem `app/components/stories/layout/ResponsiveImages.mdx:7`, `app/components/stories/layout/ResponsiveImages.mdx:20`, `app/components/stories/layout/ResponsiveImages.mdx:22`, `app/components/stories/layout/ResponsiveImages.mdx:23`, `app/components/stories/layout/ResponsiveImages.mdx:327`, `app/components/stories/layout/ResponsiveImages.mdx:330`.

Severity: Medium.

Recommendation: Standardise content images on `<picture>`/`srcset` with declared width/height per breakpoint, especially news, video thumbnails, and property/detail media.

### M-08 - Mobile Performance Has Upfront Data and Route CDN Costs

Observation: Tenant initialisation waits for ten data files before route rendering, including maps/floors/spaces that many routes do not need. MapLibre is then loaded from `unpkg.com` at runtime for map views. The design system uses a build pipeline and documents responsive image performance; it does not require runtime CDN loading for core interaction primitives.

Evidence: tenant `js/app.js:176`, `js/app.js:177`, `js/state.js:40`, `js/state.js:41`, `js/state.js:50`, `js/app.js:1992`, `js/app.js:1995`; designsystem `package.json:15`, `package.json:16`, `app/package.json:7`, `app/components/stories/layout/ResponsiveImages.mdx:7`.

Severity: Medium.

Recommendation: Split route data by need, defer floor/map datasets until map/floor routes, and vendor or bundle MapLibre assets behind the app's release pipeline/CSP strategy.

## Design System Alignment Findings

### DS-01 - Color Tokens Match the Local Design System, but the Red Canonical Needs a Decision

Observation: Tenant primary red is `#D8232A`, matching the cloned design system's default skin and Tailwind red ramp. The audit prompt names Bund red `#DC0018`, but that value is not present in the local design-system repo.

Evidence: tenant `css/tokens.css:82`, `css/tokens.css:98`, `css/tokens.css:169`; designsystem `css/skins/default.postcss:13`, `app/tailwind.config.js:155`, `css/components/link.postcss:7`.

Severity: Low.

Recommendation: Treat `#d8232a` as canonical for this repo pair unless product/design explicitly decides to override the cloned design system with Webguidelines V04.00 brand red `#DC0018`.

### DS-02 - Typography Is Mostly Aligned

Observation: Tenant uses local Noto Sans faces with `font-display: swap`, fallback metrics, 16 px base type, and responsive heading/body scales. The design system also defines Noto Sans face families, `font-display: swap`, word spacing, and its Tailwind font families.

Evidence: tenant `css/tokens.css:20`, `css/tokens.css:28`, `css/tokens.css:229`, `css/tokens.css:241`, `css/tokens.css:366`, `css/tokens.css:382`; designsystem `css/foundations/font-face.postcss:6`, `css/foundations/font-face.postcss:8`, `css/foundations/typography.postcss:9`, `app/tailwind.config.js:219`, `app/tailwind.config.js:220`.

Severity: Low.

Recommendation: Keep typography tokens aligned. Avoid using the tenant-only `--text-micro` 11 px token for interactive or body content unless a specific accessible use case is documented.

### DS-03 - Component Primitives Are Recreated Locally

Observation: The tenant app renders HTML strings in plain JavaScript and implements local CSS for design-system-like components. The reference design system ships Vue components and PostCSS component styles for the same primitives.

Evidence: tenant `js/app.js:4`, `js/app.js:202`, `js/shell.js:98`, `js/shell.js:249`, `js/lib.js:431`; designsystem `app/package.json:19`, `app/package.json:31`, `app/components/ch/components/Btn.vue:1`, `app/components/ch/components/Input.vue:1`, `app/components/ch/components/Modal.vue:5`.

Severity: Medium.

Recommendation: Decide a formal consumption strategy: CSS-only with regression tests, or Vue/Nuxt component adoption. Until then, track local primitive deviations as explicit exceptions.

### DS-04 - Outline Buttons Deviate from the Canonical Primary-Red Variant

Observation: Tenant `.btn--outline` uses neutral text and input-border color. The design system's `.btn--outline` uses `text-primary-600` and `border-primary-600`. Tenant compensates for back buttons only, which creates inconsistent outline button semantics.

Evidence: tenant `css/styles.css:1084`, `css/styles.css:1086`, `css/styles.css:1087`, `css/styles.css:2681`, `css/styles.css:2693`, `css/styles.css:2694`; designsystem `css/components/btn.postcss:15`, `css/components/btn.postcss:16`, `css/components/btn.postcss:17`.

Severity: Medium.

Recommendation: Restore primary-red outline styling globally, or create a named neutral secondary-button variant and reserve `.btn--outline` for the design-system meaning.

### DS-05 - Table Semantics Are Partly Below the Design-System Recommendation

Observation: Tenant tables generally use `aria-label` and some newer tables use `scope="col"`, but no inspected table uses a `<caption>`. The design system recommends a caption immediately after `<table>` and scopes for headers.

Evidence: tenant `js/app.js:1110`, `js/app.js:1435`, `js/app.js:1877`, `js/app.js:1880`, `js/app.js:2994`, `js/app.js:2997`; designsystem `app/components/stories/components/Table.mdx:33`, `app/components/stories/components/Table.mdx:37`, `app/components/stories/components/Table.mdx:40`, `app/components/stories/components/Table.mdx:41`.

Severity: Medium.

Recommendation: Add visually hidden captions to data tables and backfill missing `scope` attributes, especially inbox/queue tables.

### DS-06 - Iconography Mostly Uses the Bund Icon Set, With a Few Ad-Hoc Assets

Observation: Tenant icons are mostly emitted as SVG `<use>` references into `assets/icons/<Name>.svg`, matching the Bund icon asset model. YouTube play graphics and split Swiss logo SVGs are ad-hoc assets outside the icon helper.

Evidence: tenant `js/lib.js:165`, `js/lib.js:208`, `js/lib.js:212`, `js/shell.js:282`, `js/shell.js:283`, `js/app.js:892`; designsystem `app/components/ch/components/SvgIcon.vue:6`, `app/components/ch/components/SvgIcon.vue:46`, `app/components/stories/foundations/Icons.mdx:6`, `app/components/stories/foundations/Icons.stories.js:13`.

Severity: Low.

Recommendation: Keep Bund icons for UI actions. Maintain a short exception list for brand/media assets such as the federal logo and YouTube play mark.

### DS-07 - Accessibility Patterns Are Strong but Not Complete

Observation: Tenant focus visibility, toast live regions, and modal dialog/focus handling are solid and closely match design-system patterns. Remaining gaps are mostly semantic: form grouping, table captions, and compact hit targets.

Evidence: tenant `css/tokens.css:474`, `js/lib.js:389`, `js/lib.js:390`, `js/lib.js:475`, `js/lib.js:500`, `js/lib.js:504`; designsystem `css/foundations/global.postcss:75`, `css/foundations/global.postcss:76`, `app/components/ch/components/Modal.vue:5`, `app/components/ch/components/Modal.vue:6`.

Severity: Medium.

Recommendation: Preserve current focus and modal infrastructure while fixing the semantic and touch-target issues called out in M-03, M-05, and DS-05.

### DS-08 - Internationalisation Is a Shell Stub, Not a Content System

Observation: Tenant starts with `lang="de"` and exposes DE/FR/IT/EN options; selecting a language updates `<html lang>` but toasts that localisation is not implemented and leaves content in German. The design system provides a language switcher control, but not tenant content translations.

Evidence: tenant `index.html:2`, `js/shell.js:263`, `js/shell.js:267`, `js/shell.js:270`, `js/shell.js:631`, `js/shell.js:640`, `js/shell.js:641`; designsystem `app/components/ch/components/LanguageSwitcher.vue:3`, `app/components/ch/components/LanguageSwitcher.vue:5`, `app/components/ch/components/LanguageSwitcher.vue:9`.

Severity: Medium.

Recommendation: Either label the language switcher as prototype-only or connect it to a real translation/content layer before user testing in FR/IT/EN contexts. Include text-expansion tests for navigation, tables, form labels, and cards.

## Prioritised Remediation Roadmap

| ID | Severity | Effort | Phase |
| --- | --- | --- | --- |
| M-06 | Critical | Medium | Phase 1 - Mobile blocker |
| M-03 | High | Medium | Phase 1 - Mobile blocker |
| M-05 | Medium | Medium | Phase 1 - A11y/mobile forms |
| DS-05 | Medium | Small | Phase 1 - A11y/mobile tables |
| M-02 | Medium | Small | Phase 2 - Responsive polish |
| DS-04 | Medium | Small | Phase 2 - Visual conformance |
| M-07 | Medium | Medium | Phase 2 - Media/performance |
| M-08 | Medium | Large | Phase 3 - Performance architecture |
| M-04 | Medium | Medium | Phase 3 - Navigation hardening |
| DS-03 | Medium | Large | Phase 3 - Component strategy |
| DS-08 | Medium | Large | Phase 3 - i18n/content |
| DS-01 | Low | Small | Phase 0 - Design decision |
| DS-02 | Low | Small | Ongoing |
| DS-06 | Low | Small | Ongoing |
| DS-07 | Medium | Medium | Ongoing |

## Open Questions

- Should the portal use the local cloned design-system red `#d8232a`, or should product/design mandate Webguidelines V04.00 `#DC0018` despite the local design-system tokens?
- Is the long-term implementation strategy CSS-only/static JavaScript, or should the app move toward consuming the Vue/Nuxt design-system components directly?
- Is `/downloads` expected to remain a dense desktop-style table on mobile, or should documents become cards/list rows below `md`?
- Which routes must be fully translated for pilot, and are translations source-controlled, CMS-managed, or API-delivered?
- Should MapLibre and map styles be vendored for CSP/offline federal environments, or is runtime CDN loading acceptable for the prototype?
- What are the target devices for reviewer workflows? The current 36 px reviewer mark buttons may be acceptable on desktop but do not meet the mobile touch target.
