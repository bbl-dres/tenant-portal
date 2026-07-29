# Federal Tenant Portal (Mieterportal des Bundes)

<p align="center">
  <img src="assets/Social.jpg" width="100%" alt="BBL Federal Tenant Portal"/>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"/></a>
  <img src="https://img.shields.io/badge/status-prototype-orange.svg" alt="Status: Prototype"/>
  <img src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white" alt="HTML5"/>
  <img src="https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white" alt="CSS3"/>
  <img src="https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript ES6+"/>
  <img src="https://img.shields.io/badge/MapLibre%20GL-396CB2?logo=maplibre&logoColor=white" alt="MapLibre GL JS"/>
  <a href="https://github.com/swiss/designsystem"><img src="https://img.shields.io/badge/CD%20Bund-aligned-D8232A.svg" alt="CD Bund aligned"/></a>
  <img src="https://img.shields.io/badge/build-none_%F0%9F%8E%89-brightgreen" alt="No Build Tools"/>
  <a href="https://bbl-dres.github.io/tenant-portal/"><img src="https://img.shields.io/badge/demo-live-brightgreen.svg" alt="Live Demo"/></a>
</p>

> [!CAUTION]
> **This is an unofficial mockup for demonstration purposes only.**
> All data is fictional. Not all features are fully functional. This project serves as a visual and conceptual prototype — it is not intended for production use.

Prototype of the federal tenant portal for the [Federal Office for Buildings and Logistics (Bundesamt für Bauten und Logistik, BBL)](https://www.bbl.admin.ch). The portal (Mieterportal) is the digital entry point for the administrative units (Verwaltungseinheiten, VE) of the civilian federal administration to register space needs, track application status, manage their tenancies (Mietverhältnisse), report damage, and access plans + documents for the ~ 2 800 BBL-managed properties.

## Preview

**Live Demo:** https://bbl-dres.github.io/tenant-portal/

<p align="center">
  <img src="assets/Preview1.JPG" width="90%"/>
</p>

<table align="center" width="90%">
  <tr>
    <td width="50%"><img src="assets/Preview2.JPG" width="100%"/></td>
    <td width="50%"><img src="assets/Preview3.JPG" width="100%"/></td>
  </tr>
</table>

## Features

### Core flows
- **5-step space-needs application wizard (Bedarfsmeldung)** — guided application for office space, accommodation, or foreign-mission premises. Live workplace-standards classification (NAW), m²/FTE area calculation with desk-sharing factor, attachment scan, validation checklist, draft auto-save.
- **Application inbox** — submitter's view of their own applications with status pipeline, filter chips by status, paginated table, full detail view with attachments + history tabs.
- **Reviewer queue** (General Secretariat reviewer, GS-Prüfer/in) — keyboard-driven (`j`/`k`/`Enter`/`x`), bulk-approve modal, queue statistics strip, dense table with 25 rows per page.
- **Property portfolio** — gallery / list / map views with MapLibre GL JS, filtered by administrative unit (VE), exportable, with detail page per property (banner, tenancy (Mietverhältnis), related applications, contacts).
- **Plans & Documents (Pläne & Dokumente)** — paginated documents page with type / building / text filters, simulated downloads.
- **News + Info** — long-form info page with sticky TOC scroll-spy, news overview + detail, search across all entities.
- **Role switching** — tenant (LBO), GS reviewer, BBL Portfolio Management (BBL-PFM), BBL Campus, Auditor. Each role gets a tailored nav + landing.

### Prototype disclosure
- **Session-scoped prototype notice** — the CD Bund `NotificationBanner` in its fixed variant (the component the design system uses for cookie consent) carries the disclaimer that this is a prototype and that the data is fictional or publicly available. It is emitted by the shell, so a bookmarked deep link discloses it just like the landing page, and it returns for every new session rather than being dismissed once and forever. The cookie banner is sequenced behind it so a first-time visitor never faces two stacked bars.

### Federal Corporate Design (CD Bund) alignment
- ≈ 99 % aligned with [`swiss/designsystem`](https://github.com/swiss/designsystem) v1.0.9 — typography, color, layout, spacing, components.
- Bundled Noto Sans (Regular / Bold / Italic / Bold-Italic).
- WCAG 2.1 AA: skip-link, focus rings, `prefers-reduced-motion`, ARIA disclosure for dropdowns, semantic markup, contrast verified.
- See [`docs/DESIGNGUIDE.md`](docs/DESIGNGUIDE.md) for the implementation rules and [`docs/code-review.md`](docs/code-review.md) for the senior engineering readiness review.

### Technical
- **Hash-routed SPA** — no framework, no build step. ES modules.
- **URL state persistence** — view mode, filters, pagination all in the URL hash.
- **`localStorage`** for wizard drafts + active-role choice (per-user-id namespaced).
- **Keyboard shortcuts** — press <kbd>?</kbd> in-app for the cheat sheet.

## Tech Stack

| Technology | Version | Usage |
|------------|---------|-------|
| Vanilla JavaScript | ES6+ ESM | Router, state, views |
| HTML5 / CSS3 | Modern | Structure + styling (Flexbox, Grid, CSS Variables) |
| MapLibre GL JS | v5.x (CDN) | Property portfolio map view |
| `swiss/designsystem` | v1.0.9 | Federal Corporate Design (CD Bund) tokens + components (hand-translated) |
| Noto Sans | bundled | Federal canonical typeface |
| JSON | static | Mock data (applications, buildings, tenancies (Mietverhältnisse), …) |

No build tools and no framework — the app itself is pure static files. `npm` is used only for local verification scripts.

## Getting Started

`fetch()` against the JSON mocks needs HTTP, so serve the directory rather than opening `index.html` via `file://`:

```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

Then open http://localhost:8000

## Verification

```bash
npm ci
npm test             # fast static + unit checks (no browser)
npm run verify:all   # Playwright browser checks (UI regressions + a11y sweep)
```

Two layers, both run by CI on every push:

- **`npm test`** — ESLint (correctness rules, no style bikeshedding), domain unit checks (wizard maths, the `escapeHtml`/`escapeJs` XSS guards, locale formatters) and the CD Bund token guard (no rogue colors or inline styles outside `css/tokens.css`).
- **`npm run verify:all`** — the Playwright checks in `scripts/verify/`, individually runnable: `verify:mobile-nav` (burger-menu behaviour), `verify:mobile-layouts` (horizontal-overflow / control-sizing at phone widths, incl. the reviewer queue), `verify:header-chrome` (split logo, breadcrumb, burger placement across breakpoints), `verify:property-images` (all imagery same-origin, nothing broken), `verify:media-viewer` (document preview: prev/next navigation, single-scroll model with sticky header, share popover + `?doc=` deep link; property image gallery: open, upload, navigate, delete, header-badge sync; plus cross-view UI consistency — the shared `.search-field` and the `.page-header` pattern), `verify:prototype-notice` (the prototype disclaimer: shows on any deep-linked URL, returns each session, CD class composition, reserved space + toast stacking, four-language copy, phone layout), `verify:a11y` (responsive accessibility sweep: landmarks, names, headings, focus management). JSON reports and screenshots land in `verify_out/` (gitignored, uploaded as a CI artifact).

The browser checks wait on a render marker (`#page-body[data-route]`, stamped by the router after each render) instead of sleeping, which keeps them deterministic.

## Project Structure

```
tenant-portal/
├── index.html             # SPA entry — mounts #root, loads js/app.js as module
├── assets/                # Logos, social previews, shared graphics
│   ├── fonts/             # Bundled Noto Sans (Regular / Bold / Italics)
│   ├── icons/             # SVG icon set
│   ├── images/            # Page imagery
│   │   ├── buildings/     # Property photos (portfolio + detail views)
│   │   └── market-screening/  # Competitor screenshots from the market research
│   └── operators/         # Operator / federal branding graphics
├── css/                   # Design tokens (CD Bund) + app stylesheet
├── js/                    # Router, shell, wizard, state, helpers (ES modules)
├── data/                  # Static JSON / GeoJSON mocks (applications, buildings, tenancies, …)
├── docs/                  # Requirements, data model, design guide, CD audit, research
├── scripts/               # Dev-only utilities (nothing here ships with the app)
│   ├── data/              # GeoJSON generation + geocoding (Python, run-once generators)
│   ├── research/          # BBL source-document conversion (Python)
│   └── verify/            # Unit/CD checks (npm test) + Playwright browser checks (npm run verify:all)
└── .github/
    └── workflows/         # CI — syntax, domain units, CD token guard, a11y sweep
```

## Deployment

**GitHub Pages / static hosting:** The app can be served from GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any static file server. If GitHub Pages deployment is enabled through repository settings, document that configuration alongside the handover notes.

**Alternatives:** Netlify, Vercel, CloudFlare Pages, or any static file server.

## License

Licensed under [MIT](https://opensource.org/licenses/MIT)
