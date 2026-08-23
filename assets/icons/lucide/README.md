# Lucide icon subset

This directory contains the 10 Lucide icons used by the portal. They are
bundled locally so navigation, status indicators, and offline use never depend
on a runtime icon CDN. The larger PascalCase set in `assets/icons/` comes from
the Swiss Confederation Design System; keep the two visual families separate
within a component.

- Upstream package: `lucide-static` 1.31.0
- Source: <https://cdn.jsdelivr.net/npm/lucide-static@1.31.0/icons/>
- Upstream release: <https://github.com/lucide-icons/lucide/tree/1.31.0>
- License: ISC, with an MIT notice for Feather-derived icons; see
  [`LICENSE.txt`](LICENSE.txt)
- Machine-readable inventory and SHA-256 hashes: [`manifest.json`](manifest.json)
- Rebuild script: `scripts/fetch-lucide-icons.mjs`

Only add an icon through the rebuild script and give it a concrete portal
consumer. `scripts/test-icon-assets.mjs` rejects undeclared, missing, unsafe,
or unreferenced SVGs.

| File | Portal use |
| --- | --- |
| `chevron-right.svg` | Tree disclosure control |
| `globe.svg` | Country level |
| `map.svg` | Canton or region level |
| `map-pin.svg` | City level |
| `folder.svg` | Business entity |
| `building.svg` | Building |
| `arrow-right.svg` | Action row — does something on this page |
| `link.svg` | Action row — leads to another page in the portal |
| `external-link.svg` | Action row — leads to another system |
| `lock.svg` | Action row — not available in the prototype |
