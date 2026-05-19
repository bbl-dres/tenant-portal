# tenant-portal

BBL Mieterportal — vanilla HTML/CSS/JS prototype of the federal tenant portal
for [Bundesamt für Bauten und Logistik](https://www.bbl.admin.ch).
Demonstration only — all data is mock, many actions are stubbed.

## Run

`fetch()` against the JSON mocks needs HTTP, so serve the directory rather
than opening `index.html` via `file://`:

```
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Layout

- `index.html` — single-page app entry
- `css/tokens.css` — design tokens extracted from
  [`swiss/designsystem`](https://github.com/swiss/designsystem) v1.0.9 (MIT)
- `css/styles.css` — federal chrome + app components
- `js/app.js` — router, state, views (hash-based, no framework, no build step)
- `data/*.json` — mock data (applications, buildings, users, tenancies, news, master-data)
- `assets/BundLogo.svg` — federal CD logo
- `docs/` — [REQUIREMENTS.md](docs/REQUIREMENTS.md), [WIREFRAMES.md](docs/WIREFRAMES.md), [MARKET-SCREENING.md](docs/MARKET-SCREENING.md)

Drafts and the active role persist via `localStorage`. Press <kbd>?</kbd>
in-app for keyboard shortcuts.
