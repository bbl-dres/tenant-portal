# Tenant Portal Senior Engineering Code Review

## Post-Review Cleanup Note

After this review was written, the demo-hardening quick wins around repository hygiene and verification were implemented: `node_modules/`, `verify_in/`, and `verify_out/` are ignored/untracked; ad-hoc verification scripts live in `scripts/verify/`; data-generation utilities live in `scripts/data/`; research/document-ingestion helpers live in `scripts/research/`; package metadata is MIT-aligned; and `npm test` now runs syntax, domain-unit, and CD/token checks. The findings below remain useful as the original review record, but the repo hygiene/tooling items should be read with this cleanup note in mind.

## Executive Summary

- **Production boundary risk is the dominant issue.** The app is explicitly a static prototype (`README.md:21`, `README.md:72`), but it models federal workflows that require eIAM, RBAC, persistence, audit logging, malware scanning, and data residency (`docs/REQUIREMENTS.md:217`, `docs/REQUIREMENTS.md:228`, `docs/REQUIREMENTS.md:254`). None of those guarantees exist in the application runtime.
- **Authentication and authorisation are entirely client-side.** `init()` silently grants the first demo user for any non-public deep link (`js/app.js:176`, `js/app.js:187`), and `login()` picks a local JSON user (`js/app.js:129`). This is acceptable for a mockup, but a hard blocker for production reuse.
- **State and persistence are prototype-only.** Data loads from static files (`js/state.js:42`-`49`), submitted applications are pushed into an in-memory array (`js/wizard.js:816`), and drafts/roles are stored in `localStorage` (`js/state.js:84`, `js/state.js:98`).
- **The frontend is a single large, tightly coupled SPA.** `app.js` is 3,714 lines, `styles.css` is 6,042 lines, routes/views/handlers/state mutations are interleaved (`js/app.js:201`, `js/app.js:147`, `js/app.js:3547`). This will slow change and review as the prototype grows.
- **The code relies heavily on string templates and global inline handlers.** Views write `innerHTML` throughout (`js/app.js:283`, `js/wizard.js:127`), expose `window.portal` and `window.t3lite` (`js/app.js:147`, `js/app.js:3547`), and use `onclick` in generated markup (`js/shell.js:136`, `js/wizard.js:214`). Escaping is often present, but the architecture keeps XSS risk high.
- **MapLibre and basemap assets are fetched from public CDNs at runtime without SRI/CSP.** The app injects `unpkg.com` script/style tags (`js/app.js:2007`, `js/app.js:2010`) and uses Carto styles (`js/app.js:2025`), conflicting with federal data-residency/operations expectations unless explicitly approved.
- **Testing is improving but incomplete.** `a11y:responsive` and `cd:check` exist (`package.json:10`, `package.json:11`), but `npm test` intentionally fails (`package.json:12`), there are no unit/integration tests, and no CI workflow is present.
- **Repository hygiene is poor for a team repo.** `node_modules` is tracked (175 files; `git ls-files node_modules`), verification images are tracked (50 files; `git ls-files verify_out verify_in`), and `.gitignore` does not exclude either (`.gitignore:5`, `.gitignore:8`).
- **Documentation is strong for domain context but stale in places.** README references deleted/nonexistent audit docs (`README.md:53`) and says “no package manager” while the repo has `package.json` and `package-lock.json` (`README.md:72`, `package.json:1`).
- **Dependency posture is small but misclassified.** Only Playwright is installed and `npm audit` returned 0 vulnerabilities, but Playwright is under runtime `dependencies` (`package.json:17`) rather than `devDependencies`.
- **i18n is not architected.** The document is `lang="de"` (`index.html:2`), non-DE languages are disabled (`js/shell.js:300`-`303`), and UI strings are embedded directly in render functions.
- **The app has real strengths as a prototype:** domain docs are unusually detailed, data modelling is explicit, visual/a11y verification scripts exist, and recent CD-token guardrails are concrete (`scripts/check-cd-tokens.mjs:103`, `scripts/check-a11y-responsive.mjs:50`).

## Stack & Architecture Overview

This is a static hash-routed SPA: `index.html` loads `css/tokens.css`, `css/styles.css`, and `js/app.js` as an ES module (`index.html:7`, `index.html:8`, `index.html:23`). There is no framework, bundler, backend, API server, database, or SSR layer. The intended deployment target is static hosting/GitHub Pages per README (`README.md:106`).

Runtime data is static JSON/GeoJSON under `data/`, loaded by `loadData()` and `loadSpatialData()` (`js/state.js:40`, `js/state.js:62`). Application state is a singleton exported from `js/state.js` (`js/state.js:21`) and mutated directly by route handlers. The router is custom hash matching in `js/app.js` (`js/app.js:54`, `js/app.js:66`, `js/app.js:201`). Rendering is mostly HTML strings assigned to `innerHTML`; event handling mixes `addEventListener()` with inline `onclick`.

The module split is:

- `js/app.js`: bootstrap, router, global bridges, and most route views.
- `js/shell.js`: federal chrome, nav, footer, language switcher, search, burger menu.
- `js/lib.js`: formatters, escaping, icons, toast, modal, status/pipeline primitives.
- `js/state.js`: singleton state, static data loading, localStorage helpers.
- `js/wizard.js`: demand-registration wizard, validation, draft persistence, submission.

Upstream reference note: `https://github.com/bbl-dres/tenant-portal` was checked but not reachable/discoverable from the available web search/open result, so this review treats the local repo as authoritative.

## Methodology

Inspected top-level layout, package metadata, lockfile, `.gitignore`, README, docs, scripts, `js/`, `css/`, `data/`, assets, git status/history signals, and local verification commands. Traced these flows end to end:

1. Auth/role-gated home: `index.html` -> `init()` -> demo login/deep-link auto-login -> `renderHome()`.
2. Space-needs wizard: `#/wizard/:step` -> `renderWizard()` -> step wiring -> `persistDraft()` -> `submitDraft()` -> inbox detail.
3. Property portfolio/detail/floor map: `#/properties` -> URL filters -> MapLibre load -> property detail -> `loadSpatialData()` -> floor map popup.

Commands run: `npm test` failed as configured; `npm audit --audit-level=low` passed with 0 vulnerabilities; `npm run cd:check` and `npm run a11y:responsive` had passed immediately before this review, with `a11y:responsive` showing 0 failures and existing notices for external-resource blocking/touch-target heuristics.

## Strengths

- **Clear prototype boundary.** README says the project is unofficial, fictional, and not production-intended (`README.md:21`).
- **Good domain modelling effort.** Data-model comments in `state.js` map JSON to canonical schema concepts (`js/state.js:9`), and `docs/DATAMODEL.md` is substantial.
- **Useful shared primitives exist.** Escapers, formatters, icon mapping, status badges, modal, and pipeline rendering live in `lib.js` (`js/lib.js:23`, `js/lib.js:209`, `js/lib.js:432`).
- **Verification scripts are more than cosmetic.** The responsive script checks multiple viewports and flows (`scripts/check-a11y-responsive.mjs:50`, `scripts/check-a11y-responsive.mjs:58`) and exits non-zero on failures (`scripts/check-a11y-responsive.mjs:325`).
- **Recent CD-token guardrails reduce drift.** `cd:check` compares primary/secondary design-system token values and rejects hardcoded CSS colors/inline styles (`scripts/check-cd-tokens.mjs:103`, `scripts/check-cd-tokens.mjs:117`, `scripts/check-cd-tokens.mjs:122`).
- **Local storage is wrapped defensively.** Safari/private-mode failures are caught in `safeGet`/`safeSet`/`safeRemove` (`js/lib.js:150`, `js/lib.js:154`, `js/lib.js:156`).

## Findings by Topic

### 1. Architecture & Design

**A1 — Production architecture is absent, not merely incomplete.**  
Observation: The runtime is static files plus mock data; README confirms “pure static files” and no framework/build (`README.md:72`), while production requirements call for RHOS/BIT operations, managed persistence, object storage, eIAM, WAF, and audit trails (`docs/REQUIREMENTS.md:217`, `docs/REQUIREMENTS.md:228`, `docs/REQUIREMENTS.md:254`). Severity: Critical if this is promoted beyond prototype; Low within prototype. Impact: Any production pilot would need a new backend/security architecture, not a hardening pass. Recommendation: Treat this repo as a UX/reference prototype; start a production architecture track with backend/API/auth/persistence boundaries before adding more workflow logic.

**A2 — `app.js` has become the main architectural bottleneck.**  
Observation: `app.js` contains bootstrap, router, global API, search, home, inbox, queue, maps, downloads, repair, profile, services, and helper logic (`js/app.js:147`, `js/app.js:201`, `js/app.js:1647`, `js/app.js:3054`, `js/app.js:3547`). File length is 3,714 lines. Severity: High. Impact: Changes have high merge-conflict and regression risk; code ownership boundaries are unclear. Recommendation: Extract route modules by domain (`routes/properties`, `routes/applications`, `routes/downloads`) and keep `app.js` as bootstrap/router only.

**A3 — Data flow is implicit and globally mutable.**  
Observation: The shared singleton is exported directly (`js/state.js:21`) and route handlers mutate arrays and records directly, e.g. `state.applications.unshift(newApp)` (`js/wizard.js:816`) and status edits in reviewer actions (`js/app.js:3669`). Severity: Medium. Impact: Hard to reason about who changed state, hard to test, and no audit/event boundary. Recommendation: Introduce small domain services/actions (`submitApplication`, `approveApplications`) returning explicit results; keep direct state mutation behind those actions.

**A4 — Global bridge APIs preserve convenience at the cost of coupling.**  
Observation: `window.portal` exposes state, router, renderers, and helpers (`js/app.js:147`); `window.t3lite` exposes view-specific handlers (`js/app.js:3547`). Shell comments acknowledge this as a router seam/future refactor (`js/shell.js:24`, `js/shell.js:28`). Severity: Medium. Impact: Any template can call broad internals; testing and CSP hardening are harder. Recommendation: Replace inline global calls with delegated event listeners and route-local controllers.

### 2. Code Quality

**Q1 — Function and file sizes exceed normal reviewable units.**  
Observation: `styles.css` is 6,042 lines, `app.js` is 3,714 lines, `wizard.js` is 821 lines, `shell.js` is 834 lines. Render functions such as `renderPropertyDetail()` start at `js/app.js:2129` and emit large templates. Severity: High. Impact: Reviews become visual diff archaeology; isolated tests are hard. Recommendation: Split by route/component and move long templates to small render helpers with narrow inputs.

**Q2 — Error handling is inconsistent and sometimes swallowed.**  
Observation: Optional data fetches catch to empty arrays (`js/state.js:46`-`49`), spatial preload errors are swallowed (`js/state.js:59`), and MapLibre teardown catches empty blocks (`js/app.js:2022`, `js/app.js:2704`). Required fetches do not check `response.ok` (`js/state.js:42`-`45`). Severity: Medium. Impact: Broken data can silently remove whole features or leave users with blank/stale UI. Recommendation: Use a `fetchJson()` helper with `ok` checks, typed fallback policy, and user-visible load/error states.

**Q3 — Random IDs can collide and are not auditable.**  
Observation: Draft IDs and submitted application IDs use `Math.random()` in a 900-value space (`js/wizard.js:90`, `js/wizard.js:785`). Severity: Medium. Impact: Collisions are plausible in demos and unacceptable in persisted workflows. Recommendation: Use `crypto.randomUUID()` for prototype IDs; production IDs should come from the backend/workflow system.

**Q4 — Some user-controlled or mutable fields bypass escaping.**  
Observation: Most fields are escaped, but render paths still interpolate values directly, e.g. `a.naw.class`, `a.submitterVe`, `a.submitterDep`, and extension data in detail views (`js/app.js:1380`, `js/app.js:1545`). Severity: Medium. Impact: With localStorage/state tampering or future API data, these become XSS candidates. Recommendation: Default to escaping every data-derived scalar; only allow trusted HTML through named, reviewed helpers.

### 3. Frontend Specifics

**F1 — Rendering is string-template based, with many `innerHTML` sinks.**  
Observation: Route renderers assign `innerHTML` (`js/app.js:283`, `js/wizard.js:127`), modals inject `body` as raw HTML (`js/lib.js:475`), and MapLibre popups use `.setHTML()` (`js/app.js:2044`, `js/app.js:2881`). Severity: Medium. Impact: Security depends on every call site remembering the right escaping rule. Recommendation: For a frameworkless app, centralize safe DOM builders for repeated patterns; otherwise move to a component framework with escaped interpolation by default.

**F2 — Inline handlers block stricter CSP.**  
Observation: Generated markup uses inline `onclick` and `onsubmit` extensively (`js/shell.js:136`, `js/shell.js:163`, `js/wizard.js:214`, `js/app.js:3337`). Severity: Medium. Impact: A production CSP would need `unsafe-inline`, weakening XSS mitigation. Recommendation: Use event delegation keyed by `data-action` attributes.

**F3 — Queue keyboard shortcuts leak listeners on rerender.**  
Observation: `renderQueue()` calls `wireQueueShortcuts()` (`js/app.js:1496`), and `wireQueueShortcuts()` adds a document-level `keydown` listener with no cleanup/idempotence guard (`js/app.js:1500`, `js/app.js:1510`). Severity: Medium. Impact: Re-entering the queue can stack handlers, causing duplicated navigation and retained closures over old rows. Recommendation: install once with route-aware state, or remove on route transition.

**F4 — No route-level code splitting.**  
Observation: `index.html` loads all route code through one module (`index.html:23`), including maps, queue, wizard, downloads, and services (`js/app.js:201`). Severity: Low/Medium. Impact: Startup cost grows linearly with feature count. Recommendation: If staying frameworkless, use dynamic `import()` per route for heavy areas such as maps and downloads.

### 4. Backend / API Specifics

**B1 — There is no backend/API surface.**  
Observation: The “data layer” is static file fetches (`js/state.js:42`-`49`) and in-memory mutations (`js/wizard.js:816`). Requirements call for APIs, SAP integration, managed database, object storage, and notifications (`docs/REQUIREMENTS.md:240`, `docs/REQUIREMENTS.md:260`, `docs/REQUIREMENTS.md:261`). Severity: Critical for production. Impact: No authoritative validation, persistence, RBAC, audit, or integration guarantees. Recommendation: Define API contracts and persistence model before porting workflow code.

**B2 — Request validation exists only in UI event handlers.**  
Observation: Wizard confirmations are checked client-side (`js/wizard.js:771`), and bulk-approval text validation is simulated in modal code (`js/app.js:3656`-`3665`). Severity: High for production. Impact: Any user can bypass validation by mutating client state. Recommendation: Put validation in backend command handlers; keep frontend validation as UX assist only.

### 5. Security

**S1 — Demo auth bypass is intentionally built into deep links.**  
Observation: Non-public hashes auto-login as the first multi-role user (`js/app.js:187`-`193`). Login itself selects a local user record (`js/app.js:129`-`135`). Severity: Critical for production; acceptable for a clearly labelled prototype. Impact: Every protected page is accessible without credentials. Recommendation: Keep behind a prototype flag; remove from any deployable production branch and integrate eIAM/OIDC session restoration.

**S2 — No authorization enforcement layer exists.**  
Observation: Routes only check whether `state.user` exists, e.g. wizard and reviewer pages (`js/wizard.js:112`, `js/app.js:1520`); role-specific navigation is presentation logic (`js/shell.js:100`). Severity: Critical for production. Impact: Users can navigate directly to role-specific screens by hash/state manipulation. Recommendation: Enforce permissions in backend APIs and central route guards.

**S3 — LocalStorage stores sensitive workflow draft data.**  
Observation: Drafts are serialized into `localStorage` per user ID (`js/state.js:84`-`86`), and drafts include address, FTE, legal/attachment metadata, and confirmations across wizard steps (`js/wizard.js:227`, `js/wizard.js:555`, `js/wizard.js:683`). Severity: High in federal context. Impact: Draft data can persist on shared/managed browsers outside session controls. Recommendation: For production, store drafts server-side with session-bound access and retention rules; use localStorage only for non-sensitive preferences.

**S4 — External runtime assets lack supply-chain controls.**  
Observation: MapLibre script/CSS are injected from `unpkg.com` (`js/app.js:2007`, `js/app.js:2010`), basemap styles come from Carto (`js/app.js:2025`), and news images use Unsplash URLs in data (`data/news.json:10`). Severity: High for production. Impact: Availability, privacy, and integrity depend on third parties. Recommendation: Self-host approved assets or pin with SRI/CSP and route network traffic through approved federal infrastructure.

**S5 — XSS defence is manual rather than systemic.**  
Observation: Escapers exist (`js/lib.js:23`, `js/lib.js:30`), but raw HTML sinks remain central (`js/lib.js:475`, `js/app.js:2044`). Severity: Medium. Impact: Future contributors can introduce exploitable interpolation easily. Recommendation: Add lint/static checks for unsafe sinks and require reviewed escape helpers.

**S6 — Security requirements are documented but not implemented.**  
Observation: Requirements call for WAF, central secrets, malware scanning, and audit trail (`docs/REQUIREMENTS.md:232`-`234`), while uploads are simulated client-side (`js/wizard.js:545`, `js/wizard.js:555`). Severity: High. Impact: The prototype can demonstrate the journey but not prove controls. Recommendation: Track these as architecture epics, not UI tickets.

### 6. Performance

**P1 — Heavy assets are committed and likely over-delivered.**  
Observation: `assets/` totals about 105.7 MB; largest files include operator PDFs and market-screening images. `verify_in/out` totals about 13.1 MB. Severity: Medium. Impact: Git clone and static deploy size are inflated; GitHub Pages may serve research assets not needed by the app. Recommendation: Move research PDFs/screenshots to a separate artifact store or docs repo; only ship runtime assets.

**P2 — Static spatial data is loaded client-side.**  
Observation: `spaces.geojson` is about 424 KB and is loaded by `loadSpatialData()` (`js/state.js:62`-`76`). Severity: Low/Medium. Impact: Fine for prototype scale, but not for 2,800 managed properties. Recommendation: Backend tile/query service or per-building spatial API for production.

**P3 — Map lifecycle mostly tears down instances, but async races remain possible.**  
Observation: Previous maps are removed before creating new ones (`js/app.js:2022`, `js/app.js:2370`, `js/app.js:2704`), but async `loadMapLibre().then(...)` has no route-token check before mutating the DOM (`js/app.js:2017`). Severity: Low/Medium. Impact: Fast navigation can render late map state into a stale container. Recommendation: Use route instance tokens/abort guards in async render paths.

### 7. Testing

**T1 — `npm test` is a failing placeholder.**  
Observation: The script exits 1 with “Error: no test specified” (`package.json:12`); command execution confirmed the failure. Severity: High. Impact: There is no standard test command for contributors or CI. Recommendation: Make `npm test` run the meaningful checks (`cd:check`, syntax checks, focused unit tests) and reserve e2e as a separate script if slow.

**T2 — No unit tests cover domain calculations or validation.**  
Observation: `calcWizard()` and `deriveNawClass()` are pure functions (`js/wizard.js:26`, `js/wizard.js:59`) but have no test files. Severity: Medium. Impact: Critical calculations can regress silently. Recommendation: Add a small Node test runner for pure helpers and edge cases.

**T3 — A11y/responsive coverage is useful but advisory without CI.**  
Observation: The script checks viewports and flows (`scripts/check-a11y-responsive.mjs:50`, `scripts/check-a11y-responsive.mjs:58`) and can fail (`scripts/check-a11y-responsive.mjs:325`), but no `.github` directory/workflow exists. Severity: Medium. Impact: Regressions depend on local discipline. Recommendation: Add CI workflow running `npm test`, `npm run cd:check`, and a bounded a11y smoke suite.

### 8. Tooling & Developer Experience

**D1 — No linting, formatting, or type checking exists.**  
Observation: `package.json` only defines `a11y:responsive`, `cd:check`, and failing `test` (`package.json:9`-`12`). Severity: Medium. Impact: Style, unused code, unsafe DOM sinks, and accidental globals are caught late. Recommendation: Add ESLint for browser ES modules, Prettier or style formatting, and JSDoc/TypeScript checking for data shapes.

**D2 — Dependency metadata contradicts README.**  
Observation: README says “no package manager” (`README.md:72`), but the repo has `package.json` and `package-lock.json`; Playwright is installed (`package.json:18`). Severity: Low. Impact: Onboarding confusion. Recommendation: Update README to explain npm is used for verification tooling, not app build/runtime.

**D3 — Runtime package metadata is inaccurate.**  
Observation: `package.json` declares `"main": "index.js"` (`package.json:5`), but no such runtime entry exists; the real entry is `index.html` -> `js/app.js` (`index.html:23`). Severity: Low. Impact: Tooling and new dev assumptions are wrong. Recommendation: Remove `main` or point metadata at the actual static entry.

### 9. CI/CD & Operations

**O1 — Deployment claim is not backed by visible pipeline config.**  
Observation: README says pushing to `main` deploys GitHub Pages automatically (`README.md:106`), but `.github/` is absent in the working tree and no workflow files were found. Severity: Medium. Impact: Merge gates, deployment provenance, and rollback story are unverifiable. Recommendation: Add a workflow or document where Pages is configured if using repository settings only.

**O2 — No observability model exists.**  
Observation: Errors go to `console.error()` in map paths (`js/app.js:2070`, `js/app.js:2393`, `js/app.js:3001`); requirements call for structured logs/correlation IDs (`docs/REQUIREMENTS.md:306`). Severity: Medium for production. Impact: Incidents cannot be traced across SAP/API/frontend. Recommendation: Define frontend error reporting and backend structured logging in the production architecture.

### 10. Dependencies

**DEP1 — `node_modules` is committed.**  
Observation: `git ls-files node_modules` reports 175 tracked files; `.gitignore` does not ignore `node_modules` (`.gitignore:5`, `.gitignore:8`). Severity: Medium. Impact: Repository noise, larger diffs, harder dependency upgrades, possible supply-chain confusion. Recommendation: Remove tracked `node_modules`, add ignore rule, rely on `package-lock.json`.

**DEP2 — Playwright belongs in devDependencies.**  
Observation: Playwright is the only dependency and is under runtime `dependencies` (`package.json:17`, `package.json:18`), but it is used for verification scripts, not app runtime. Severity: Low. Impact: Misleading production dependency surface. Recommendation: Move to `devDependencies`.

**DEP3 — License metadata conflicts.**  
Observation: README and LICENSE say MIT (`README.md:8`, `README.md:112`, `LICENSE:1`), while `package.json` and lockfile say ISC (`package.json:16`, `package-lock.json:8`). Severity: Medium in federal/procurement context. Impact: Automated license review will flag inconsistent licensing. Recommendation: Align `package.json`/lockfile with LICENSE or update all files intentionally.

**DEP4 — Audit posture is clean but shallow.**  
Observation: `npm audit --audit-level=low` returned 0 vulnerabilities; only Playwright is installed (`package-lock.json:21`, `package-lock.json:37`). Severity: Low. Impact: Low current dependency risk, but CDN runtime dependencies are outside npm audit. Recommendation: Add CDN/SRI review to dependency policy.

### 11. Documentation & Onboarding

**DOC1 — README contains stale links.**  
Observation: README links to `docs/design-system-audit.md` and `docs/remediation-plan.md` (`README.md:53`), but current `docs/` listing does not include those files. Severity: Low. Impact: New devs hit dead references. Recommendation: Update links to current audit docs or restore docs intentionally.

**DOC2 — Domain documentation is strong but operational docs are missing.**  
Observation: Requirements define platform/ops needs (`docs/REQUIREMENTS.md:254`-`262`), but repo has no runbook, deployment workflow, rollback guide, API docs, or ADRs. Severity: Medium. Impact: Production transition lacks engineering decision history. Recommendation: Add ADRs for static prototype vs. production architecture, auth, data persistence, and DS consumption.

### 12. Internationalisation & Accessibility

**I18N1 — German is hardcoded; no i18n architecture exists.**  
Observation: HTML root is `lang="de"` (`index.html:2`), language switcher disables FR/IT/RM/EN (`js/shell.js:300`-`303`), and `pickLang()` toasts that non-DE localisation is not implemented (`js/shell.js:666`-`669`). Requirements call DE/FR/IT availability as Must (`docs/REQUIREMENTS.md:321`). Severity: High for federal production. Impact: Legal/accessibility/content parity risk. Recommendation: Introduce message catalogs, locale routing/state, formatter abstraction, missing-key checks, and text-expansion tests.

**A11Y1 — Accessibility testing exists but misses semantic regressions by design.**  
Observation: `check-a11y-responsive.mjs` checks layout/overflow/touch targets and console notices (`scripts/check-a11y-responsive.mjs:176`, `scripts/check-a11y-responsive.mjs:293`), but there is no axe/pa11y dependency or semantic rule engine. Severity: Medium. Impact: ARIA/name/role issues may survive. Recommendation: Add axe-core or Playwright accessibility assertions for representative flows.

### 13. Git & Process Signals

**G1 — Commit messages are not review-friendly.**  
Observation: Recent history is dominated by generic messages like “Update” (`git log --oneline -n 20`), with only occasional specific commits. Severity: Low/Medium. Impact: Archaeology and rollback become harder. Recommendation: Adopt conventional or at least descriptive commit messages.

**G2 — High churn is concentrated in the largest files.**  
Observation: `git log --name-only` shows `js/app.js` touched 43 times and `css/styles.css` 37 times, the highest-churn files. Severity: Medium. Impact: Churn plus size points to refactor candidates. Recommendation: Split these files first; use churn as the migration order.

**G3 — Generated artifacts are tracked.**  
Observation: `git ls-files verify_out verify_in` reports 50 tracked files; `verify_in/out` total about 13.1 MB. Severity: Low/Medium. Impact: Diffs and repo size are polluted by screenshots. Recommendation: Track only intentional golden baselines in a named folder; ignore transient verification outputs.

## Top 10 Issues

| Rank | Issue | Severity | Rationale |
|---:|---|---|---|
| 1 | Client-only demo auth and no authorization layer | Critical | Hard production blocker; protected workflows are hash/state gated only (`js/app.js:187`, `js/wizard.js:112`). |
| 2 | No backend/API/persistence architecture | Critical | Requirements need managed DB, object storage, SAP integration, audit; app is static JSON/in-memory (`js/state.js:42`, `js/wizard.js:816`). |
| 3 | LocalStorage stores workflow draft data | High | Federal tenant data should not persist uncontrolled in browser storage (`js/state.js:84`). |
| 4 | External CDN/runtime assets without CSP/SRI/data-residency posture | High | `unpkg`, Carto, Unsplash are runtime dependencies (`js/app.js:2007`, `data/news.json:10`). |
| 5 | `app.js`/`styles.css` are oversized high-churn files | High | Main maintainability bottleneck; 3,714 and 6,042 lines. |
| 6 | String-template rendering and inline handlers keep XSS/CSP risk high | Medium/High | Many `innerHTML`, `.setHTML`, and `onclick` sinks (`js/lib.js:475`, `js/app.js:2044`, `js/shell.js:136`). |
| 7 | Test command fails; no unit/integration CI | High | Contributors lack a standard safety net (`package.json:12`). |
| 8 | i18n architecture absent despite DE/FR/IT Must requirement | High | Federal language parity is not a later copy-edit task (`docs/REQUIREMENTS.md:321`). |
| 9 | Repository tracks `node_modules` and verification screenshots | Medium | Repo hygiene and dependency management signal (`git ls-files node_modules`, `.gitignore:5`). |
| 10 | License metadata conflict | Medium | Federal procurement/license review will flag MIT vs ISC (`LICENSE:1`, `package.json:16`). |

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner-type |
|---|---:|---:|---|---|
| Prototype code mistaken for production-ready implementation | Medium | Critical | Add explicit production-readiness checklist and architecture ADR | Tech lead / architect |
| Unauthorized access if demo auth leaks into pilot | Medium | Critical | Remove demo auth behind build flag; integrate eIAM/RBAC | Security engineer |
| Lost submitted applications on refresh | High | High | Backend persistence before real workflow trial | Backend engineer |
| XSS introduced through future template interpolation | Medium | High | DOM-safe rendering pattern, CSP, lint rules | Frontend lead |
| Third-party CDN outage or policy violation | Medium | High | Self-host approved assets; SRI/CSP | Platform/security |
| LocalStorage retention of sensitive drafts | Medium | High | Server-side drafts, retention policy, session cleanup | Security/backend |
| Regressions due to large high-churn files | High | Medium | Split route modules and add tests | Frontend lead |
| Missing language parity blocks federal acceptance | High | High | i18n architecture and translation workflow | Product/design/frontend |
| Repo bloat slows onboarding and reviews | High | Medium | Remove generated/tracked dependencies | Maintainer |
| Deployment/rollback unclear | Medium | Medium | CI/CD workflow and runbook | DevOps/platform |

## Technical Debt Inventory

| Item | Category | Effort | Interest rate |
|---|---|---:|---|
| Split `app.js` into route modules | Architecture | L | High |
| Split `styles.css` into component/section files or generated bundle | Frontend/tooling | L | High |
| Replace inline handlers with delegated listeners | Security/frontend | M | Medium |
| Replace global `window.portal/t3lite` bridge | Architecture | M | Medium |
| Add backend/API boundary for applications | Architecture/backend | L | High |
| Server-side draft persistence | Security/backend | M | High |
| Add i18n catalog and locale routing | i18n | L | High |
| Move Playwright to devDependencies | Dependencies | S | Low |
| Remove tracked `node_modules` | Repo hygiene | S | Medium |
| Remove/segregate verification screenshots | Repo hygiene | S | Medium |
| Align license metadata | Compliance | S | Medium |
| Add unit tests for wizard/domain helpers | Testing | S/M | Medium |
| Add CI workflow | CI/CD | S/M | Medium |
| Add SRI/CSP/self-hosted map asset policy | Security/ops | M | Medium |
| Add ADRs/runbook | Documentation | M | Medium |

## Remediation Roadmap

### Quick Wins (<1 week)

- Fix metadata: align license (`package.json:16`), remove bogus `main` (`package.json:5`), move Playwright to `devDependencies` (`package.json:17`).
- Update `.gitignore` to exclude `node_modules`, `verify_out`, transient screenshots; remove tracked generated/dependency artifacts.
- Make `npm test` run `node --check`, `npm run cd:check`, and a small unit-test command instead of failing.
- Fix README stale links (`README.md:53`) and clarify npm is verification tooling, not app runtime build.
- Add CI workflow for `npm ci`, `npm test`, `npm run cd:check`.

### Short-Term (1-4 weeks)

- Extract route modules from `app.js`: applications/inbox, queue/review, properties/maps, downloads, info/news.
- Add unit tests for `calcWizard()`, `deriveNawClass()`, formatters, URL builders, and filter functions.
- Add route-level listener lifecycle handling, starting with queue shortcuts (`js/app.js:1500`).
- Introduce safe DOM/render helpers or a strict templating convention; lint for raw `innerHTML`/`onclick` additions.
- Define i18n message catalog structure and migrate shell/navigation first.
- Create ADRs: prototype scope, production target architecture, auth/RBAC, persistence, external assets.

### Structural (1-3 months)

- Define production API contracts for applications, documents, properties, floor/spatial data, auth/session, audit events.
- Implement server-side validation/persistence and replace client-only submission.
- Integrate eIAM/OIDC and backend authorization checks.
- Replace localStorage drafts with backend drafts and retention policy.
- Self-host approved map/runtime assets or move to federal-approved map services and CSP.
- Add observability: structured logs, correlation IDs, frontend error reporting, health/readiness checks.
- Build full DE/FR/IT translation workflow with missing-key CI checks.

## Open Questions

- Is this repo intended to remain a UX prototype only, or is it expected to evolve into the pilot implementation?
- If it evolves, what frontend stack is preferred for production: continue frameworkless, adopt Vue/Nuxt to consume `swiss/designsystem`, or another BIT-standard stack?
- What is the authoritative production auth target: eIAM only, AGOV later, or both behind a common identity abstraction?
- Which map provider and hosting path are approved for federal internal tenant data?
- What data classification applies to drafts, attachments, floor occupancy, and tenancy documents?
- Who owns multilingual content parity and derogation approval for DE-only content?
- Should verification screenshots be treated as golden baselines, or are they transient local artifacts?
- Where is GitHub Pages deployment configured if no workflow is present?
- Should the research/operator PDFs ship with the public demo, or move to a separate research artifact store?
- What are the acceptance criteria for “prototype complete” versus “production-ready pilot”?
