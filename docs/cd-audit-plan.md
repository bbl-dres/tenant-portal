# Tenant Portal CD Alignment Audit Plan

## Confirmed Repository Inventory

Tenant portal root contains a static single-page application (`index.html`, `css/`, `js/`, `assets/`, `data/`), documentation under `docs/`, verification scripts, and only `playwright` as an npm dependency.

Reference design system root contains PostCSS/Tailwind sources under `css/`, generated `dist/`, and a Nuxt/Vue/Storybook documentation app under `app/`.

## Confirmed Stack And Design-System Consumption

- Tenant portal stack: static HTML entry point with vanilla JavaScript modules and vanilla CSS custom properties. No Vite, Next, React, Vue, Tailwind config, Sass, CSS modules, or styled-components are present in the tenant-portal repo.
- Tenant portal CSS approach: local `css/tokens.css` plus local `css/styles.css`.
- Tenant portal routing/layout: hash-based client routing in `js/app.js`, with shell/layout rendering in `js/shell.js`.
- Design-system consumption: no npm/package dependency, git submodule, or import from `designsystem` is present in `package.json` or application imports. The portal appears to consume the design system by copied/vendored assets and locally recreated CSS tokens/components, including `assets/BundLogo.svg`, `assets/icons/*`, `assets/fonts/*`, `css/tokens.css`, and `css/styles.css`.
- Reference design system stack: package `designsystem` version `1.0.5`; PostCSS build pipeline; Tailwind 3 token source in `app/tailwind.config.js`; Nuxt 3/Vue 3/Storybook documentation app in `app/`.

## Audit Method

1. Inspect tenant portal entry points, routing, layout shell, token definitions, global CSS, components rendered from JS, forms, navigation, modals, tables, media usage, localization/content strings, and accessibility affordances.
2. Inspect reference design-system canonical tokens, PostCSS component classes, Vue component primitives, layout primitives, navigation/header/footer components, and Storybook MDX usage notes where needed.
3. Compare implementation to the Swiss Federal Design System files first. Where local design-system files do not define a convention, treat Webguidelines Bund V04.00 conventions as authoritative and mark the evidence as a guideline/open-question item rather than inventing a repo citation.
4. For each finding in the final audit, include observation, tenant evidence (`file:line`), reference-system evidence (`file:line`), severity, recommendation, and canonical token/component reference.
5. Distinguish implementation gaps from design-system gaps.

## Coverage Checklist

- Brand identity: federal logo, placement/scale, language switcher, official header/footer, legal links, cookie/consent.
- Color: federal red, neutrals, semantic colors, token sourcing, hardcoded colors, contrast, dark mode stance.
- Typography: Noto Sans loading, weights, type scale, semantic headings, font-display/preconnect, Swiss numeric/punctuation conventions.
- Layout and spacing: containers, grids, spacing scale, page templates, vertical rhythm.
- Iconography and imagery: icon source, sizing, labels, image ratios, alt/loading/decoding, illustration consistency.
- Components: buttons, form controls, validation, alerts, cards, tables, modals/drawers, tooltips/popovers, tabs/accordions/disclosure, pagination/result counts, breadcrumbs/steps, empty/loading/error states.
- Interaction and motion: hover/focus/active/disabled states, focus-visible, motion durations/easing, reduced motion.
- Responsive and mobile: viewport, breakpoints, touch targets, reflow viewports, mobile navigation.
- Accessibility: landmarks, headings, skip links, ARIA, keyboard support, modal focus, labels/errors, non-color state, live regions, language tagging.
- Content, language and localisation: DE/FR/IT/EN coverage, date/time/number/currency formats, address/phone formats, tone, microcopy, text expansion.
- Technical CD implementation: token consumption, source of truth, versioning/update path, bundle impact, enforcement linting, Storybook/docs.

## Deliverables

- Written audit at `docs/cd-alignment-audit.md`.
- Token usage matrix.
- Component conformance matrix.
- Prioritised remediation roadmap.
- Open questions for unverifiable or product/design decisions.
