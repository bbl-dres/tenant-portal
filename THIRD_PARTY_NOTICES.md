# Third-party notices

The root [`LICENSE`](LICENSE) covers original tenant-portal code. It does not
relicense third-party material, and it grants no rights in Swiss Government
brand elements or in any other organisation's trademarks.

This file records what the repository bundles or loads, and on what terms. Where
the repository does not currently record a term, this file says so rather than
assuming one — see [Open items](#open-items).

## Swiss Confederation Design System

The portal's tokens, layouts and component patterns are hand-translated from the
[Swiss Confederation Design System](https://github.com/swiss/designsystem); no
upstream runtime framework is imported. The 220 PascalCase SVG icons under
[`assets/icons/`](assets/icons/) come from that design system.

`css/foundations/tokens.css` records the source as MIT-licensed and notes that
token values were resolved from the live `--color-primary-*` tokens and the
PostCSS sources; `README.md` pins the audited upstream at `1.0.9`. The upstream
project has declared different licences across releases — the sister service
portal records ISC for `1.0.5` and MIT for `1.0.45` — so the exact release and
its licence should be confirmed before redistribution.

Alignment with a federal design reference is not accreditation or endorsement,
and a software licence does not grant rights to Swiss Government branding.

## Lucide 1.31.0 icon subset

Ten SVG icons from `lucide-static` 1.31.0 are bundled under
[`assets/icons/lucide/`](assets/icons/lucide/) so navigation, status indicators
and offline use never depend on a runtime icon CDN.

- Upstream release: <https://github.com/lucide-icons/lucide/tree/1.31.0>
- Licence: ISC, retaining the MIT notice for Feather-derived icons —
  [`assets/icons/lucide/LICENSE.txt`](assets/icons/lucide/LICENSE.txt)
- Provenance and file inventory:
  [`assets/icons/lucide/README.md`](assets/icons/lucide/README.md) and
  [`manifest.json`](assets/icons/lucide/manifest.json)

## Noto Sans

The federal canonical typeface is bundled under [`assets/fonts/`](assets/fonts/)
as four faces (Regular, Bold, Italic, Bold-Italic) in WOFF2 with TTF fallbacks.
Noto Sans is published under the SIL Open Font License 1.1. The OFL text is not
currently bundled beside the fonts — see [Open items](#open-items).

## Runtime libraries loaded from unpkg.com

Both are fetched over HTTPS only when the feature that needs them is opened, and
each delivered package retains its own licence. Delivery is governed by
[unpkg's terms](https://unpkg.com/).

| Library | Version | Licence | Integrity |
| --- | --- | --- | --- |
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js/tree/v4.7.1) | `4.7.1` | [BSD-3-Clause and bundled notices](https://github.com/maplibre/maplibre-gl-js/blob/v4.7.1/LICENSE.txt) | **No Subresource Integrity** |
| [Swagger UI](https://github.com/swagger-api/swagger-ui/tree/v5.17.14) | `5.17.14` | [Apache-2.0](https://github.com/swagger-api/swagger-ui/blob/v5.17.14/LICENSE); upstream NOTICE applies | SHA-384 on both the stylesheet and the bundle |

`README.md` lists MapLibre as "v5.x"; the pinned version in `js/app.js` is
`4.7.1`, which is what actually loads.

## Basemap: CARTO Positron vector style and OpenStreetMap

Every MapLibre view loads the CARTO Positron **vector** style from
`basemaps.cartocdn.com`, which fetches its vector tiles, glyph ranges and sprite
from `tiles.basemaps.cartocdn.com`. None of the four is bundled here and none
can be covered by Subresource Integrity: they are runtime requests to a managed
service under [CARTO's terms](https://carto.com/legal/). The underlying map data
is © OpenStreetMap contributors under
[ODbL 1.0](https://www.openstreetmap.org/copyright). Rendered maps retain the
provider attribution the style declares.

CARTO's keyless **raster** endpoints are not used: they now return tiles with an
"API KEY REQUIRED" watermark rendered into the image itself.

## swisstopo / geo.admin.ch

Address and geodata search calls `api3.geo.admin.ch`, and the portal links to
`map.geo.admin.ch`. These are managed federal services under the
[Federal Spatial Data Infrastructure terms](https://www.geo.admin.ch/en/general-terms-of-use-fsdi);
no API version is pinned here.

## Video

The explainer card links out to a YouTube video
(`youtube.com/watch?v=rin3crkLpRk`) and does not embed a player; no YouTube
script or iframe is loaded. The local thumbnail and the play glyph
(`assets/youtube-play.svg`) ship with the repository. YouTube is a Google
service under [its own terms](https://www.youtube.com/t/terms); the play glyph
resembles a Google trademark and this repository claims no rights in it.

## Photographs and screenshots

- `assets/images/Bern Guisanplatz.JPG` — the landing hero, credited in the page
  itself as **© Rolf Siegenthaler**. Redistribution requires the photographer's
  permission; the repository records no licence grant.
- [`assets/images/buildings/`](assets/images/buildings/) — 21 property
  photographs referenced from `data/buildings.geojson`. No credit, source or
  licence is recorded for any of them.
- [`assets/images/market-screening/`](assets/images/market-screening/) — 53
  vendor logos and product screenshots (Aareon, Abacus, Adobe Sign, AGOV and
  others) collected during market research. These are third-party trademarks and
  copyrighted interfaces. They are referenced nowhere in the application code or
  data; only `README.md` mentions the directory.

## Reference corpus (`assets/operators/`)

[`assets/operators/`](assets/operators/) holds annual reports, strategy papers,
audit reports, BIM manuals and press releases published by other public and
private organisations — among them armasuisse, BImA, GSA, GPA UK, Senaatti,
Statsbygg, Rijksvastgoedbedrijf, Agenzia del Demanio, Kanton Zürich, Stadt Bern,
EPFL, CBRE and Siemens.

Each remains the copyright of its publisher under that publisher's own terms.
None is referenced by the application code, the data or the documentation: the
directory is background research material that happens to be checked in, not a
runtime asset.

## Development-only dependencies

Declared in `package.json` as `devDependencies` and used only by the local
verification scripts. Nothing here ships with the application.

| Package | Licence |
| --- | --- |
| [ESLint](https://github.com/eslint/eslint) and `@eslint/js` | MIT |
| [globals](https://github.com/sindresorhus/globals) | MIT |
| [Playwright](https://github.com/microsoft/playwright) | Apache-2.0 |
| [Node.js](https://nodejs.org/) (`>=22`, local server and scripts) | [MIT and bundled third-party notices](https://github.com/nodejs/node/blob/main/LICENSE) |

## Open items

This prototype is not cleared for redistribution as-is. The following need a
rights decision before the repository is copied, deployed or published beyond
its current demonstration purpose:

1. **Photograph rights.** The hero photograph is credited but carries no
   recorded licence, and the 21 building photographs carry neither.
2. **Market-screening logos and screenshots.** Third-party trademarks and
   interfaces with no recorded permission, and no consumer in the application —
   the cheapest resolution is removal.
3. **The `assets/operators/` corpus.** Third-party publications redistributed
   without a recorded licence, and likewise unreferenced.
4. **The SIL OFL 1.1 text** is not bundled with the Noto Sans faces. The licence
   requires the copyright notice and licence to travel with the fonts.
5. **The design-system release and its licence** should be confirmed against the
   version actually translated (`README.md` says `1.0.9`; `tokens.css` says MIT).
6. **MapLibre GL JS loads without Subresource Integrity**, unlike Swagger UI in
   the same file. This is a supply-chain gap rather than a licensing one.
