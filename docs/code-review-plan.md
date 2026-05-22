# Tenant Portal Senior Engineering Code Review Plan

## Repository Tour Coverage

- Top-level layout: `index.html`, `js/`, `css/`, `data/`, `assets/`, `docs/`, `scripts/`, `.github/`.
- Package metadata: `package.json`, `package-lock.json`, dependency placement, script coverage, license metadata.
- Runtime/build: static browser ES modules, no bundler/transpiler, no framework, no backend, no server-side rendering.
- Deployment target: static hosting/GitHub Pages per `README.md`; no CI/CD workflow found under `.github/`.
- Documentation: `README.md`, `docs/DATAMODEL.md`, `docs/REQUIREMENTS.md`, `docs/DESIGNGUIDE.md`, research docs.
- Local verification: `scripts/check-cd-tokens.mjs`, `scripts/check-a11y-responsive.mjs`, and Playwright helper scripts in `scripts/verify/`.

## Architecture Mapping

- Entry point: `index.html` loads `js/app.js` as a module.
- Routing: hash router in `js/app.js` with route registration and per-route render functions.
- State: singleton exported from `js/state.js`; mutated by route handlers and helpers.
- UI shell: `js/shell.js` renders federal chrome, navigation, breadcrumbs, footer, search, language switcher, consent banner.
- Shared primitives: `js/lib.js` for formatting, escaping, icons, toast, modal, pipeline/step widgets.
- Wizard: `js/wizard.js` owns demand-registration steps, local draft persistence, validation, and submission mutation.
- Data: static JSON/GeoJSON under `data/`, loaded with `fetch()` into memory.
- Persistence: `localStorage` for draft, role choice, and consent; submitted applications exist only in memory.
- Auth model: demo login/role switch in client code, no server-side authentication or authorization.

## User-Facing Flows Traced

1. Authentication and role-gated home:
   - `index.html` -> `js/app.js:init()` -> `loadData()` -> deep-link auto-login/login stub -> `renderHome()` / role switch.
2. Space-needs application wizard:
   - `#/wizard/:step` route -> `renderWizard()` -> step wiring -> `persistDraft()` -> `submitDraft()` -> inbox detail.
3. Property portfolio, detail, and floor map:
   - `#/properties` -> URL-filtered gallery/list/map -> dynamic MapLibre loading -> `#/properties/:id` -> `loadSpatialData()` -> floor detail and room popup.

## Topic Coverage Checklist

- Architecture and design: module boundaries, coupling, state/data flow, abstractions, consistency, dead/orphaned code.
- Code quality: file/function size, readability, error handling, null discipline, async cleanup, magic values, TODO/FIXME/HACK markers.
- Frontend specifics: component/rendering approach, routing, form handling, global handlers, performance, code splitting.
- Backend/API specifics: static-data posture, absence of endpoints, request validation/persistence gaps, migration discipline.
- Security: auth/session, authorization, XSS/templating, localStorage, external CDN, CSP/SRI, dependency audit, federal privacy implications.
- Performance: eager payload, CDN/network waterfall, asset sizes, map lifecycle, event listener growth.
- Testing: script coverage, missing unit/integration/security tests, a11y responsive checks, test command behavior.
- Tooling/DX: build/lint/format/type tooling, dev setup, scripts, generated outputs.
- CI/CD and operations: workflow absence, deployment evidence, rollback/observability/health checks.
- Dependencies: dependency count, lockfile, devDependency placement, license mismatch, outdated/audit posture.
- Documentation/onboarding: README accuracy, docs quality, broken references, runbook/API/ADR gaps.
- Internationalisation/accessibility engineering: hardcoded German UI, no i18n architecture, a11y test posture.
- Git/process signals: status/history, high-churn files, generated artifacts, deleted docs, commit patterns if inspectable locally.

## Output

- Written review: `docs/code-review.md`.
- No application source changes.
- Every finding will cite `file:line` evidence or a concrete repository artifact.
