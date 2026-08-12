# Code Review — BBL Mieterportal

**Review date:** 2026-08-12 · **Method:** four parallel senior-review passes
(routing/URL-state bugs · view/component bugs · performance, with live
measurement · complexity/reuse), findings verified against the working tree,
then implemented in three batches (router core → bug batch → refactor batch)
with `npx eslint js` after every step and the Playwright suites at the end.
Line references drift with edits — findings are keyed by function/anchor.

**Verdict.** The architecture (hash router + full re-render, in-place updates
where state must survive, URL as single source of truth) is sound and mostly
consistently applied. The defects clustered where surfaces were built in
parallel (properties ↔ downloads) and where full-screen overlays or WebGL
maps outlive the `#root` re-render. Listener lifecycle discipline was already
good (the queue-shortcut teardown pattern); the fixes below extend that
contract to overlays and maps.

Criticality: **CRIT** user-visible breakage or injection surface ·
**MAJOR** wrong behavior in realistic flows / scaling cliff ·
**MINOR** edge case, hygiene, at-scale-only.

## A · Bugs — routing, URL & state

| ID | Name | Description | Crit. | Status |
|----|------|-------------|:-----:|--------|
| B1 | Native search submit | Catbar `<form>` had no submit handler without `hashFor` (downloads/inbox/queue): Enter did a native GET, dropped the fragment, reloaded the app at `#/` losing all state | CRIT | Fixed — submit always `preventDefault`s; navigates only with `hashFor` |
| B2 | Not-found before shell | Four not-found branches wrote to `#page-body` before `shell()` ran → TypeError + blank white page on cold deep links (stale bookmarks) | CRIT | Fixed — `renderNotFound()` renders chrome + message + way home; all four branches use it |
| B6 | Async route staleness | `renderPropertyDetail`/`renderFloorDetail` await a 434 KB fetch before rendering — a fast back-click let the slow handler paint the wrong page over the current one | MAJOR | Fixed — `_routeGen` generation token; handlers bail when superseded |
| B9 | Combobox drops sort | Search-combobox `commit()`/`pick()` rebuilt the hash without `sort` — Enter after typing silently reset the active sort | MAJOR | Fixed — sort passed through both paths |
| B10 | Unsorted live preview | `previewPropertiesFilter` skipped `sortTenancies` — every keystroke reshuffled results into raw fixture order (and passed the unvalidated sort onward, m8) | MAJOR | Fixed — sorted + whitelisted |
| B11 | `?page=abc` → NaN slice | Downloads page param parsed without fallback; NaN survived both clamps → empty table + «NaN–NaN von 47» | MAJOR | Fixed — `Math.max(1, parseInt(…) \|\| 1)` |
| B12 | Tree keyboard-dead after reopen | Opening the sidebar from `?sb=0` never re-ran the tab-stop syncers (both early-return while rows are `display:none`) → whole tree untabbable | MAJOR | Fixed — toggle re-syncs on open |
| B13 | Stale filter badge | Tree selection updates in place; the `props` filter badge was never synced — hiding the sidebar made the active location filter invisible | MAJOR | Fixed — `setFilterCount('props', …)` in the refresh path |
| B14 | Reset keeps selection | Properties empty-state «Filter zurücksetzen» preserved `land/region/city/obj` (defaulted from the URL) → dead end on a stale `?obj=` link | MAJOR | Fixed — passes `sel:{}` |
| B17 | Queue filter scope | `wireQueueFilters` got only the current page slice — searching a reference on page 2 said «Keine Treffer» | MAJOR | Fixed — full set passed (like inbox) |
| B19 | Malformed percent-escape | `parseHashQuery` threw `URIError` on `#/…?q=100%`, killing the route render | MINOR | Fixed — per-pair try/catch |
| m6 | Partial deep-link restore | `restoreTreeSelection` needs every ancestor attr; `?city=Bern` without `land` filters but shows no tree selection | MINOR | Open (documented) |
| m5 | `?tab=` not back-navigable | Tab switches use `replaceState` — linkable but Back exits the page; comment corrected, behavior kept deliberately | MINOR | Open (accepted) |
| m9 | `_paginationHrefBuilders` staleness | Module map never cleared; bounded key set, stale-prone only if a route reuses an input id without re-registering | MINOR | Open (documented) |

## B · Bugs — views & components

| ID | Name | Description | Crit. | Status |
|----|------|-------------|:-----:|--------|
| B3 | Overlays survive Back | Docviewer/gallery/modal live on `<body>`, outside `#root` — browser Back left them pinned over the new route, scroll locked, capture-keydown swallowing keys | CRIT | Fixed — overlay registry in lib.js; every overlay registers its `close()`; `handleHash` closes all |
| B4 | Nav scrim survives Back | The dropdown scrim's `--open` class was only cleared via `toggleNavMenu`, which can't find the re-rendered panels → permanent click-eating layer | MAJOR | Fixed — `handleHash` strips the class |
| B5 | Logout draft leak | `logout()` nulled `state.user` before `clearDraft()` (keyed by user id) → wizard draft persisted on shared workstations; in-memory draft leaked across users | MAJOR | Fixed — reordered; `clearDraft` also drops `state.draft` |
| B7 | Leaked WebGL contexts | No map teardown on route change; leaving a map route kept context + render loop alive (measured: detached context stayed live). Chrome force-loses the oldest past ~16 → randomly blank maps | MAJOR | Fixed — `teardownMaps()` in `handleHash` |
| B8 | Facet-tab injection | Search tabs interpolated the decoded query into a JS string in `onclick` — an apostrophe broke it; crafted input could execute | MAJOR | Fixed — `escapeJs` wrap |
| B15 | Gallery focus restore | The hero-mosaic rebuild detached the opener tile; Esc dropped focus to `<body>` (WCAG 2.4.3) | MAJOR | Fixed — re-acquire tile by `data-gallery-index` |
| B16 | Floor tabs mouse-only | The floor route wired tab clicks but no roving keyboard — inactive tabs (`tabindex=-1`) were keyboard-unreachable | MAJOR | Fixed — via shared `wireTabs` (see R4) |
| B18 | Broken pill `aria-label` | A stray ASCII quote terminated the attribute early in BOTH pill builders — remove buttons never announced «entfernen» | MINOR | Fixed — quote-free label, both sites |
| B20 | Breadcrumb escaping | The one chrome interpolation without `escapeHtml` (labels incl. a raw URL path segment) | MINOR | Fixed |
| B21 | Scrollspy observer leak | One `IntersectionObserver` retained per info-page render | MINOR | Fixed — module handle + disconnect |
| B23 | Date format drift | Downloads rendered raw ISO `issuedAt` where every other surface uses `formatDate` | MINOR | Fixed — table + gallery card |
| B24 | Stacking scroll listeners | Docviewer bound one backdrop `scroll` handler per document switch | MINOR | Fixed — bound once per open |
| B25 | Dead handler | `[data-action="clear-search"]` matched nothing anywhere | MINOR | Fixed — removed |
| m2 | Quote-unsafe interpolations | `t.id`/`f.slug`/`buildingId` into `onclick`/`href` without escaping (safe with current fixtures, fragile contract) | MINOR | Fixed — escapeJs/escapeHtml/encodeURIComponent batch |
| v17 | Phantom shortcuts | Shortcut overlay advertised nine unimplemented shortcuts (incl. a conflicting duplicate `k`) | MINOR | Fixed — trimmed to `?`/Esc + the four queue keys |
| v18 | Unreachable role switcher | `openRoleMenu` had no UI entry point; multi-role demo users couldn't reach the queue | MINOR | Fixed — «Rolle wechseln» on the profile page; modal-scoped query |
| v22 | Deep-link viewer race | `?doc=` opened the viewer via `setTimeout` without checking the route was still downloads | MINOR | Fixed — route guard in callback |
| m7 | Tab-stop churn | `syncTreeCounts` moved the roving tab stop on every keystroke, yanking keyboard users to the top of the tree | MINOR | Fixed — keeps the stop while its row is visible |
| v12 | Docviewer resize | `--docviewer-bar-h`/`baseW` measured once; rotation leaves rail/zoom baseline stale | MINOR | Open (planned) |
| v19 | `modal()` raw body/title | Primitive offers no escaping to future callers; current callers pass trusted markup. Post-action focus can land on a replaced node | MINOR | Open (documented) |
| v20 | Block content in `<button>` | Doc-card previews nest `<article>`/`<h1>` inside a button — invalid but rendered; a11y name unaffected (`aria-hidden`) | MINOR | Open (accepted) |
| v21 | Half-translated surfaces | Docviewer/gallery/reviewer are ~0 % `t()`-covered; lang switch mid-view half-translates; also resets map pan/zoom | MINOR | Open (planned) |
| v10b | Inbox filter vs pagination | Inbox text filter shows all matches while the pagination footer still claims page 1 of N | MINOR | Open (planned) |

## C · Performance

| ID | Name | Description | Crit. | Status |
|----|------|-------------|:-----:|--------|
| P1 | Gallery per-keystroke rebuild | Downloads live search re-rendered 25 full docpage templates per keystroke (7–19 ms JS measured; 30–75 ms mid-range) | MAJOR | Fixed — 150 ms debounce + per-doc preview cache |
| P3 | Map teardown | (= B7) leaked contexts also burn GPU/CPU for the session | MAJOR | Fixed |
| P5 | Search index rebuilt per render | Every facet click re-ran `buildSearchIndex()` and defeated the engine's fold cache (5.6 ms today, ~350 ms at 100×) | MAJOR | Fixed — memoised by lang/user/role |
| P7 | Eager 434 KB geojson | `spaces.geojson` (29 % of cold payload) fetched on every boot; only the floor route needs it | MAJOR | Fixed — eager load removed; floor route awaits it |
| P8 | Eager popups per marker | Portfolio map parsed N popup fragments (+`<img>`) at load | MAJOR | Fixed — popups created lazily on first focus |
| P-CL | Marker clustering | 1 DOM marker per property is the classic MapLibre cliff at portfolio scale | MAJOR | Fixed — clustered source + canvas clusters (sister-portal port), pins only for unclustered points |
| P9/P10 | Cold-load waterfalls | Fonts at hop 4 (guaranteed FOUT), module graph discovered late | MINOR | Fixed — font preload + `modulepreload` in index.html |
| P13 | Per-card listeners | 25 gallery listeners re-attached per render | MINOR | Fixed — one delegated listener |
| P2 | Two maps per floor switch | Floor chips navigate → both detail + floor maps torn down/rebuilt (8 network requests each switch); the location map is identical across floors | MAJOR | Open (planned) — needs the hero to survive the re-render; pairs with the module split R12 |
| P4 | Basemap loaded then deleted | Floor canvas boots the full Positron style then removes ~130 layers; only the glyph endpoint is needed | MAJOR | Open (planned) — inline minimal style; verify glyph URL first |
| P6 | Tree at 1000 objects | 496 KB of mostly-hidden tree HTML per full render (107 ms measured at 1000) | MAJOR at scale | Open (planned) — lazy child rendering + route sort/view through the in-place path |
| P11 | `preserveDrawingBuffer` | Per-frame GPU cost on the floor canvas; required by the print sheet | MINOR | Open (accepted, documented) |
| P12 | Forced layouts | Notice-height measurement per `shell()`; preview `clientWidth` read after innerHTML | MINOR | Open (documented) |
| P16 | Image hygiene | Intrinsic-size attrs ≠ render box; one 1.06 MB photo outlier | MINOR | Open (planned) |
| P17 | a11y suite cost | 60 browser contexts + `networkidle` (now cheaper post-P7); reuse contexts, wait on `data-route` | MINOR | Open (planned) |
| P9b | CSS `@import` RTT | Imports fetch in parallel (verified) but cost one extra RTT vs `<link>` tags | MINOR | Open (accepted) |

## D · Complexity — merged into reusable modules

| ID | Name | Description | Crit. | Status |
|----|------|-------------|:-----:|--------|
| R1 | `filterPills` | One pill renderer (anchor mode for hash surfaces, `data-clear` buttons for in-page) replaced both builders; carries the corrected aria-label once | — | Done (catalogue-bar.js) |
| R2 | `wireSidebarToggle` | One toggle+close-delegation helper for both filter sidebars | — | Done (catalogue-bar.js) |
| R3 | `wireCheckboxGroup` | One change-wiring + `sync()` for the two downloads checkbox groups | — | Done (catalogue-bar.js) |
| R4 | `wireTabs` | One roving-tabindex tabs implementation behind case tabs, property tabs and the floor route (navigate mode) — fixed B16 as a by-product | — | Done (lib.js) |
| R5 | `trapFocus` | Five hand-rolled focus traps with four different selector lists | — | Open (planned) — behavior-sensitive, do with v12 |
| R6 | View-switch unification | `wireCatalogueBar` gained `onView` + bar-scoped queries; `setActiveView(id, view)` replaces manual aria-pressed sync | — | Done (catalogue-bar.js) |
| R7 | `wireStatusFilter` | Inbox/queue share the filter skeleton | — | Open (planned) |
| R8 | `wirePaginationInput` in-place mode | One clamp/bind path for hash + in-page pagination (clamp reads the shell's `max`) | — | Done (app.js) |
| R9 | `emptyRow` | One `table-empty` row builder; per-surface copy kept | — | Done (lib.js) |
| R11 | `presetTenancyId` reuse | Repair form re-parsed `?building=` inline | — | Done |
| R12 | Module split | `js/pages/*` split is feasible (no cycles, `window.portal` seam, ESM already); sequence after the merges so it doesn't freeze duplication | — | Open (planned, 2 commits: leaf utils → pages) |
| R13 | Params module | Three hash-parsing idioms + three hash builders; unify carefully (`+`-decoding and `lang` deltas documented) | — | Open (planned) |
| R14 | Housekeeping | `_tmp-capture-groupB.mjs` (repo root) and `scripts/verify/tmp-probe-crossview.mjs` were unreferenced scratch files | — | Done — deleted |

**Deliberate non-merges** (checked, would over-abstract): card renderers (each
maps to its own DS component), a form-field DSL beyond `presetTenancyId`
(wizard fields are imperative), the two comboboxes (different data models —
merge only the cursor later), `filterTenancies` vs `filteredDocs` (different
predicate shapes), inbox vs queue page shells, a route-state framework.

## Explicit non-findings

Verified correct during review: listener lifecycle for all document-level
handlers (queue/gallery/viewer/modal/burger all pair add/remove; burger has
its own hashchange net) · no double-wiring of view switch or filter toggle ·
`replaceState` ordering on tree clicks · no `replaceState` loop in
`applyDocState` · `lang` preservation across all builders · pagination clamps
on properties · empty-portfolio path · nullable document fields ·
`escapeHtml`/`escapeJs` primitives · search-engine correctness ·
`loadSpatialData` memoisation · `previewPropertiesFilter` debounce ·
`syncTreeCounts` cost (1.3 ms at 1021 rows) · `toast()` uses `textContent` ·
`safeImageUrl` allow-list.

## Verification

`npx eslint js` clean after every batch · `npm test` (lint + domain units +
CD guard) green · `npm run verify:all` (150 Playwright checks) green ·
browser smoke of every touched surface (downloads filters/pills/pagination/
view switch, properties sidebar/tree/search, case + property + floor tabs
incl. keyboard, repair preset) · map clustering probed headed via Playwright
(cluster hide/show sync, filter re-feed, zero console errors).
