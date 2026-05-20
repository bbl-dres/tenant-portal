# Mieterportal des Bundes

<p align="center">
  <img src="assets/Social.jpg" width="100%" alt="BBL Mieterportal"/>
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

Prototype of the federal tenant portal for [Bundesamt für Bauten und Logistik (BBL)](https://www.bbl.admin.ch). The Mieterportal is the digital entry point for the administrative units (Verwaltungseinheiten) of the civilian federal administration to register space needs, track application status, manage their tenancies, report damage, and access plans + documents for the ~ 2 800 BBL-managed properties.

## Preview

**Live Demo:** https://bbl-dres.github.io/tenant-portal/

<p align="center">
  <img src="assets/Preview1.JPG" width="90%"/>
</p>

<p align="center">
  <img src="assets/Preview2.JPG" width="45%" style="vertical-align: top;"/>
  <img src="assets/Preview3.JPG" width="45%" style="vertical-align: top;"/>
</p>

## Features

### Core flows
- **5-step Bedarfsmeldung wizard** — guided application for office space, accommodation, or foreign-mission premises. Live NAW classification, m²/FTE area calculation with desk-sharing factor, attachment scan, validation checklist, draft auto-save.
- **Application inbox** — submitter's view of their own applications with status pipeline, filter chips by status, paginated table, full detail view with attachments + history tabs.
- **Reviewer queue** (GS-Prüfer/in) — keyboard-driven (`j`/`k`/`Enter`/`x`), bulk-approve modal, queue statistics strip, dense table with 25 rows per page.
- **Property portfolio** — gallery / list / map views with MapLibre GL JS, filtered by VE, exportable, with detail page per property (banner, mietverhältnis, related applications, contacts).
- **Pläne & Dokumente** — paginated documents page with type / building / text filters, simulated downloads.
- **News + Info** — long-form info page with sticky TOC scroll-spy, news overview + detail, search across all entities.
- **Role switching** — LBO (tenant), GS-Reviewer, BBL-PFM, BBL-Campus, Auditor. Each role gets a tailored nav + landing.

### Federal CD alignment
- ≈ 99 % aligned with [`swiss/designsystem`](https://github.com/swiss/designsystem) v1.0.9 — typography, color, layout, spacing, components.
- Bundled Noto Sans (Regular / Bold / Italic / Bold-Italic).
- WCAG 2.1 AA: skip-link, focus rings, `prefers-reduced-motion`, ARIA disclosure for dropdowns, semantic markup, contrast verified.
- See [`docs/CD-AUDIT.md`](docs/CD-AUDIT.md) for the full gap analysis and resolved-vs-open items.

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
| `swiss/designsystem` | v1.0.9 | CD Bund tokens + components (hand-translated) |
| Noto Sans | bundled | Federal canonical typeface |
| JSON | static | Mock data (applications, buildings, tenancies, …) |

No build tools, no package manager, no framework — pure static files.

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

## Project Structure

```
tenant-portal/
├── index.html                  # SPA entry — mounts #root, loads js/app.js as module
├── README.md
├── LICENSE
├── assets/
│   ├── Social.jpg / .png       # GitHub social-preview image
│   ├── Preview1.JPG            # README hero preview
│   ├── Preview2.JPG            # README side-by-side preview (left)
│   ├── Preview3.JPG            # README side-by-side preview (right)
│   ├── BundLogo.svg            # Federal CD wordmark
│   ├── swiss-logo-flag.svg     # CH Wappen (for YouTube channel-avatar)
│   ├── swiss-logo-name.svg     # CH lettermark
│   ├── youtube-play.svg        # YouTube play glyph
│   ├── fonts/                  # Noto Sans (bundled per CD Bund)
│   └── images/                 # Explainer video thumbnail, etc.
├── css/
│   ├── tokens.css              # Design tokens — CD Bund canonical
│   └── styles.css              # Federal chrome + app components
├── js/
│   ├── app.js                  # Router, views, role logic, wizard handlers
│   ├── shell.js                # Federal chrome (top-bar, navbar, breadcrumb, footer)
│   ├── wizard.js               # 5-step Bedarfsmeldung — calcWizard, deriveNawClass
│   ├── state.js                # State singleton + loadData
│   └── lib.js                  # Pure helpers, icons, toast, modal, pipeline
├── data/
│   ├── applications.json       # Application records
│   ├── buildings.geojson       # Building inventory (GeoJSON FeatureCollection)
│   ├── tenancies.json          # Mietverhältnisse
│   ├── documents.json          # Document records (per § 6.2)
│   ├── downloads.json          # UI download lists
│   ├── news.json               # News items
│   ├── users.json              # Demo users + role mapping
│   └── reference-data.json     # NAW classes, desk-sharing factor, etc.
└── docs/
    ├── REQUIREMENTS.md         # Functional + non-functional requirements
    ├── DATAMODEL.md            # Canonical schema (Tidy-data principles)
    ├── DESIGNGUIDE.md          # CD Bund mapping, BEM conventions, authoring rules
    ├── CD-AUDIT.md             # CD Bund vs app gap analysis (≈ 99 % aligned)
    ├── IDEATE-WIREFRAMES.md    # Wireframe sketches per route
    ├── RESEARCH-EXAMPLES.md    # Federal-site references (swisstopo, kbob, armasuisse)
    └── RESEARCH-MARKET.md      # Market screening notes
```

## Deployment

**GitHub Pages:** Push to `main` deploys automatically.

**Alternatives:** Netlify, Vercel, CloudFlare Pages, or any static file server.

## License

Licensed under [MIT](https://opensource.org/licenses/MIT)

---

> [!CAUTION]
> **This is an unofficial mockup for demonstration purposes only.**
> All data is fictional. Not all features are fully functional. This project serves as a visual and conceptual prototype — it is not intended for production use.
