# Tenant Portal Design System Audit Plan

## Stack Confirmation

- Tenant Portal: static, hash-routed JavaScript application with no frontend framework or build step. Entry points are `index.html`, `js/app.js`, `js/shell.js`, `js/wizard.js`, `js/lib.js`, `js/state.js`, `css/tokens.css`, and `css/styles.css`.
- Tenant Portal CSS approach: custom CSS variables in `css/tokens.css` and handcrafted BEM-style component/layout CSS in `css/styles.css`.
- Tenant Portal component posture: local render functions create HTML strings; design-system primitives are mirrored by naming and styles rather than imported from the reference design-system repo.
- Reference Design System: PostCSS/Tailwind CSS package plus Nuxt 3 / Vue 3 Storybook app. Canonical references are `css/foundations/*`, `css/layouts/*`, `css/components/*`, `css/sections/*`, `app/tailwind.config.js`, and `app/components/ch/**`.

## Repository Inventory

Tenant Portal top-level inventory:

- Application shell: `index.html`
- Runtime code: `js/`
- Styling and tokens: `css/`
- Data fixtures: `data/`
- Assets: `assets/`
- Documentation: `docs/`
- Verification scripts and screenshots: `verify_*.mjs`, `verify_out/`, `verify_in/`
- Package metadata: `package.json`, `package-lock.json`

Reference Design System top-level inventory:

- Canonical CSS package: `css/`
- Nuxt/Vue documentation and Storybook app: `app/`
- Built assets: `dist/`
- Package metadata: `package.json`, `pnpm-lock.yaml`, `package-lock.json`, `postcss.config.js`

## Audit Method

1. Inspect tenant entry points, route registration, shell/header/footer renderers, form renderers, and CSS token/component definitions.
2. Inspect design-system canonical tokens and patterns for breakpoints, typography, color, spacing, focus, buttons, inputs, navigation, tables, mobile menu, containers, grids, and responsive media.
3. Compare tenant implementation against the design-system references using concrete `file:line` evidence from both repositories.
4. Run viewport checks at 320, 375, and 768 px where static evidence alone does not prove reflow/overflow behaviour.
5. Record unverifiable items as open questions rather than findings.

## Mobile Coverage

- Viewport meta and responsive root setup
- Breakpoint system values, naming, and alignment
- Touch target sizes for buttons, inputs, navigation, icon-only controls, pagination, chips, and compact table actions
- Mobile navigation pattern, including header, burger menu/drawer, focus trap, scroll lock, and absence/presence of bottom patterns
- Form ergonomics: input height, label/help density, `inputmode`, error placement, `aria-invalid`, and mobile keyboard hints
- Mobile typography: Noto Sans, line-height, base readable sizes, and small text usage
- Reflow and overflow at 320, 375, and 768 px
- Mobile accessibility: focus visibility, hit slop, keyboard/gesture alternatives, and ARIA state
- Image/media handling: `srcset`, `picture`, lazy/eager loading, dimensions, and aspect ratios
- Mobile performance signals: font loading, external scripts, JS/data loading, CLS risks, and large media choices

## Design System Alignment Coverage

- Color palette: primary red, secondary neutrals, text neutrals, semantic colors, and focus colors
- Typography: Noto Sans implementation, hierarchy, weights, line-height, and word spacing
- Spacing scale and layout grid/container system
- Component reuse versus local reinvention of design-system primitives
- Iconography alignment with Bund icon assets and SVG usage
- Form controls, buttons, alerts/notifications, tables, cards, and navigation conformance
- Accessibility posture per eCH-0059 / WCAG 2.1 AA: contrast, focus, ARIA, landmarks, semantics
- Internationalisation posture: `lang`, visible language switcher, DE/FR/IT/EN handling, and text expansion readiness

## Deliverable Structure

The final audit will be written to `docs/design-system-audit.md` with:

- Executive summary
- Methodology and assumptions
- Mobile findings by topic
- Design-system alignment findings by topic
- Prioritised remediation roadmap
- Open questions

Each finding will include observation, evidence from both repos, severity, and recommendation.
