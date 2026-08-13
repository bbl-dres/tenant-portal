/* ==========================================================================
 APP.JS — BBL Mieterportal prototype, single-page app.

 Hash-routed, no framework, no build step. Two namespaces share this file:
   - portal.*   federal chrome, router, state, formatters, helpers
                (renderShell, renderPipeline, renderStepIndicator,
                 loadData, calcWizard, toast, modal, statusBadge,
                 formatChf/Date, escapeHtml/escapeJs, …)
   - t3lite.*   inline-handler bridge for the views below
                (newsPage, scrollToInfo, submitRepair, demoRole, …)

 Routes:
   #/              landing (public) OR home (authenticated)
   #/login         eIAM stub
   #/home          redirect → #/ (the role home merged into the front page)
   #/wizard/:step  5-step demand wizard
   #/inbox         submitter inbox
   #/inbox/:id     application detail
   #/queue         reviewer queue (GS-Prüfer/in)
   #/review/:id    reviewer split-pane
   #/info · #/properties · #/downloads · #/news · #/search …
 ========================================================================== */

import {
// formatters + escapers
formatChf, formatDate, escapeHtml, escapeJs, safeImageUrl,
formatAssetKey, roleLabel,
DOC_TYPE_LABEL,
// UI primitives
toast, modal, icon, statusBadge, attachmentLi, setFieldError,
registerOverlay, closeAllOverlays,
PIPELINE_STANDARD, PIPELINE_BK, PIPELINE_GREENFIELD,
renderPipeline, renderStepIndicator,
renderShortcutOverlay, wireGlobalShortcuts, toggleShortcutOverlay,
wireTabs, emptyRow,
} from './lib.js';
import { state, loadData, loadSpatialData, t, setLang, LANGS } from './state.js';
import { treeHTML, wireTree, restoreTreeSelection, syncTreeCounts } from './spatial-tree.js';
import {
  catalogueBar, wireCatalogueBar, setFilterCount, setActiveView,
  filterPills, wireSidebarToggle, wireCheckboxGroup,
} from './catalogue-bar.js';
import { search as searchIndex, compareBy as compareSearchBy } from './search-engine.js';
import {
  renderShell, renderFooter, renderShareBar, copyShareLink,
  toggleNavMenu, toggleLang, pickLang, acceptCookieConsent, dismissPrototypeNotice, submitSearch, toggleSearch, toggleBurger,
  shell, resolveService, INFO_PAGES,
} from './shell.js';
import {
  persistDraft, loadDraft, clearDraft, persistRole, loadRole,
} from './state.js';
import {
  calcWizard, deriveNawClass, ensureDraft, renderWizard, refreshAttachmentList,
} from './wizard.js';

// ── PERSISTENCE (localStorage) ──────────────────────────────────────────

// ── ROUTER (hash-based) ──────────────────────────────────────────────────
const routes = [];
function registerRoute(pattern, handler) {
  // pattern: '#/wizard/:step' → regex
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
  routes.push({ re, handler });
}
function navigate(hash) {
  if (location.hash === hash) {
    handleHash();
  } else {
    location.hash = hash;
  }
}
// Readiness hook for the Playwright checks (scripts/verify/*): stamps the
// route the router just FINISHED handling onto #page-body, so tests can
// `waitForFunction` on it instead of sleeping. Semantics: "handleHash
// completed for this hash" — a handler that redirects (e.g. auth gate →
// navigate('#/')) still stamps its own hash first; the redirect then
// re-renders and re-stamps.
let _lastRenderedPath = null;
// ── Scroll contexts ──────────────────────────────────────────────────────
// Scroll policy: only a CONTEXT change jumps to the top of the page; every
// transition within one context keeps the reader's scroll position.
//   • context change  — different page/entity (list → detail, another
//     property, a main-nav link): top + focus #main, like a real navigation.
//   • facet change    — same content, different slice (tab, floor, filter,
//     page, language): scroll stays put; focus moves to the swapped panel.
//     Facets normally ride a ?query on the SAME path, which the path
//     comparison below already treats as "keep scroll" — child PATHS that
//     render the same scaffold as their parent must additionally declare a
//     shared context here, or the router mistakes them for new pages and
//     throws the reader back above the hero on every switch.
//   • deep links      — ?space= / scrollToInfo anchors scroll to their
//     target content ~100 ms after render and win over both cases.
const SCROLL_CONTEXTS = [
  // Floor-plan routes share the property-detail scaffold (hero + tab strip;
  // the plan viewer is just the Geschosse panel's alternate content).
  { re: /^(#\/properties\/[^/]+)\/floors\/[^/]+$/, ctx: '$1' },
];
function scrollContext(path) {
  for (const { re, ctx } of SCROLL_CONTEXTS) {
    if (re.test(path)) return path.replace(re, ctx);
  }
  return path;
}
function markRouteRendered(route) {
  const body = document.getElementById('page-body');
  if (body) body.dataset.route = route;
  // Per-route document.title (WCAG 2.4.2): «<Seitentitel> — BBL Mieterportal»,
  // derived from the rendered view's own h1 — no separate string table that
  // could drift from the visible page. Views without an h1 (or pre-shell
  // error paths) fall back to the bare product name. Runs on every render,
  // so query-driven re-renders (e.g. ?lang) refresh the title too.
  const h1 = body ? body.querySelector('h1') : null;
  const pageTitle = (h1 ? h1.textContent : '').replace(/\s+/g, ' ').trim();
  document.title = pageTitle ? pageTitle + ' — BBL Mieterportal' : 'BBL Mieterportal';
  // A new page (the scroll CONTEXT changed, not just a ?query / lang /
  // filter update or a facet sibling — see SCROLL_CONTEXTS) starts at the
  // top, like a real navigation — hash routing doesn't reset scroll on its
  // own. Same-path query changes (filters, pagination, view toggle,
  // language) and same-context path changes (property tabs ↔ floor plan)
  // keep the scroll position. Compatible with the `scrollToInfo` deep-link
  // pattern: this fires at render time, the smooth scroll-to-section fires
  // ~100 ms later and wins.
  if (route !== _lastRenderedPath) {
    const isFirstRender = _lastRenderedPath === null;
    const sameContext = !isFirstRender
      && scrollContext(route) === scrollContext(_lastRenderedPath);
    _lastRenderedPath = route;
    if (sameContext) {
      // Facet change within one context: keep the reader's scroll. The
      // full re-render still dropped focus to <body>, so hand it to the
      // swapped tab panel (ARIA tabs pattern; #detailTab carries
      // tabindex="0") — or the main landmark when no panel exists —
      // without moving the viewport.
      const panel = document.getElementById('detailTab') || document.getElementById('main');
      if (panel) {
        try { panel.focus({ preventScroll: true }); } catch { panel.focus(); }
      }
      return;
    }
    // Jump instantly to the top. `behavior: 'instant'` overrides the
    // `html { scroll-behavior: smooth }` token — which otherwise animates even
    // a direct scrollTop assignment, gliding the long page up over ~½ s.
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }
    catch { window.scrollTo(0, 0); }
    // Route-change focus hand-off: the re-render dropped focus to <body>,
    // so move it to the main landmark (shell() prepares main[tabindex="-1"]
    // for exactly this) — screen readers announce the new page, keyboard
    // users continue from the content. Context changes only; query-driven
    // re-renders keep the user's place, and the very first render must not
    // steal focus from the document.
    if (!isFirstRender) {
      const main = document.getElementById('main');
      if (main) {
        try { main.focus({ preventScroll: true }); } catch { main.focus(); }
      }
    }
  }
}
let _routeGen = 0;
// Not-found rendering that is safe on COLD deep links: #page-body only
// exists after shell() has run, so writing to it first crashed with a
// TypeError and a blank page when a stale bookmark was opened in a fresh
// session (review B2). Renders full chrome + a message + a way back.
function renderNotFound(message, { activeNav = '' } = {}) {
  shell({ activeNav, breadcrumb: [{ label: t('error.notFound') }] });
  const body = document.getElementById('page-body');
  if (body) {
    body.innerHTML = `<section class="section"><div class="container">
      <h1 class="h1 section-heading">${t('error.notFound')}</h1>
      <p>${escapeHtml(message)}</p>
      <p><a class="link" href="#/">${t('error.backHome')}</a></p>
    </div></section>`;
  }
}
async function handleHash() {
  const full = location.hash || '#/';
  // Strip a `?query` suffix before route matching — query params (view/q/page/…)
  // are read directly from `location.hash` inside the view handler.
  const qIdx = full.indexOf('?');
  const h = qIdx >= 0 ? full.slice(0, qIdx) : full;
  // STA-001: route teardown for the queue's document-level shortcut handler —
  // the analogue of the docviewer/gallery close() removing their own keydown
  // listeners. Without it the handler outlived #/queue and hijacked Enter and
  // the arrow keys on every route visited afterwards. Same-path query changes
  // (#/queue?page=2) keep it; renderQueue rewires on re-render anyway.
  if (h !== '#/queue') teardownQueueShortcuts();
  // Overlays (modal / docviewer / image gallery) live on <body>, outside
  // #root — a re-render does not remove them, so the browser Back button
  // would leave them pinned over the new route (review B3). Close them all.
  closeAllOverlays();
  // The nav-menu scrim also lives outside #root and its --open class is only
  // cleared by toggleNavMenu — which can no longer find the (re-rendered,
  // hidden) panels after a route change, leaving a click-eating layer over
  // the whole page (review B4).
  document.querySelector('.main-navigation__overlay')?.classList.remove('main-navigation__overlay--open');
  // MapLibre instances are module-referenced; #root re-render detaches their
  // canvas but keeps WebGL contexts + render loops alive (review B7/P3).
  // Each map's init tears down only its OWN previous instance, so leaving a
  // map route leaked the context until the next visit. Routes that need a
  // map re-create it in their own render.
  teardownMaps();
  // Scope hook for the floor-plan print sheet (css/foundations/print.css):
  // body.route-floor must never outlive the floor view — printing any other
  // route has to keep the federal chrome (CSS-002). Cleared on every
  // navigation; renderFloorDetail re-adds it when a plan actually renders.
  document.body.classList.remove('route-floor');
  // Language is a URL parameter and the source of truth: apply `?lang` when
  // present, otherwise re-inject the active language so every view's URL keeps
  // it (shareable + consistent across navigation). replaceState avoids a loop.
  const params = new URLSearchParams(qIdx >= 0 ? full.slice(qIdx + 1) : '');
  const urlLang = params.get('lang');
  if (urlLang && LANGS.includes(urlLang)) {
    if (urlLang !== state.lang) setLang(urlLang);
  } else {
    params.set('lang', state.lang);
    history.replaceState(null, '', h + '?' + params.toString());
  }
  // Central auth gate: logged-out visitors see the full navigation, and any
  // non-public route renders the login gate instead of content. Replaces the
  // former silent deep-link auto-login, which hid the login concept entirely
  // — visitor feedback showed nobody realised more content exists behind it.
  if (!state.user && !isPublicHash(h)) {
    renderLoginGate(h);
    markRouteRendered(h);
    return;
  }
  // Staleness guard for async handlers (review B6): a slow spatial fetch
  // must not render property A over the route the user has since navigated
  // to. Handlers that await take the generation as their 2nd argument and
  // bail if another navigation has started in the meantime.
  const gen = ++_routeGen;
  for (const { re, handler } of routes) {
    const m = h.match(re);
    if (m) {
      state.params = m.groups || {};
      await handler(state.params, gen);
      if (gen !== _routeGen) return;   // superseded while awaiting
      markRouteRendered(h);
      return;
    }
  }
  // No match: render a 404 through the shell so it has chrome. (The old code
  // targeted a nonexistent `#app`; the mount point is `#page-body`.)
  shell({ breadcrumb: [{ label: t('error.notFound') }] });
  const body = document.getElementById('page-body');
  if (body) body.innerHTML = `<section class="section"><div class="container"><h1 class="h1 section-heading">${t('error.notFound')}</h1><p><a class="link" href="#/">${t('error.backHome')}</a></p></div></section>`;
  markRouteRendered(h);
}

// ── TOAST ────────────────────────────────────────────────────────────────

// ── ROLE CHOOSER (§2.1) ──────────────────────────────────────────────────
function openRoleMenu() {
  if (!state.user || state.user.roles.length < 2) {
    toast('Sie haben nur eine Rolle in diesem Profil.');
    return;
  }
  const body = `
    <p>Wechseln Sie zwischen Ihren Rollen. Die Inhaltsbereiche und Standard-Startseite passen sich an.</p>
    <div class="stack">
      ${state.user.roles.map(r => {
        const isActive = r === state.user.activeRole;
        return `
        <button class="btn btn--outline btn--lg role-switch-btn ${isActive ? 'role-switch-btn--active' : ''}"
                type="button" data-role="${r}" aria-pressed="${isActive}">
          ${isActive
            ? P.icon('check')
            : '<span class="role-switch-btn__spacer" aria-hidden="true"></span>'}
          <strong>${roleLabel(r)}</strong>
        </button>
        `;
      }).join('')}
    </div>
  `;
  const m = modal({
    title: 'Rolle wechseln',
    body,
    actions: [{ label: P.t('btn.cancel'), variant: 'btn--outline' }]
  });
  // Scope to the modal just appended (last .modal-backdrop) — a document-wide
  // [data-role] query could also catch unrelated markup (review views-18).
  const menuEl = [...document.querySelectorAll('.modal-backdrop')].pop() || document;
  menuEl.querySelectorAll('[data-role]').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.getAttribute('data-role');
      state.user.activeRole = role;
      persistRole(role);
      m.close();
      toast('Rolle gewechselt: ' + roleLabel(role), 'success');
      // Re-render current page
      handleHash();
    });
  });
}

// ── LOGIN STUB ───────────────────────────────────────────────────────────
// `target` (optional) — hash to land on after login. The login gate passes
// the route the visitor originally requested so a shared deep link resolves
// to the intended page after one click; the top-bar Anmelden omits it and
// lands on the role home as before.
// Puts the demo session on `state` — the first user with multiple roles
// (Andrea Muster), on their persisted role if they have one. Shared by the
// explicit login stub and by the boot-time auto-login below so the two can't
// drift apart. Returns the user, or null if the fixtures are empty.
function applyDemoSession() {
  const user = state.users.find(u => u.roles.length > 1) || state.users[0];
  if (!user) return null;
  state.user = { ...user };
  state.user.activeRole = loadRole() || user.roles[0];
  return state.user;
}
function login(target) {
  const user = applyDemoSession();
  if (!user) return;
  toast('Angemeldet als ' + user.name, 'success');
  // navigate() re-runs handleHash() itself when the hash is unchanged, so
  // the gate page re-renders as the real view either way.
  navigate(typeof target === 'string' && target.startsWith('#/') ? target : '#/');
}
function logout() {
  // Order matters: clearDraft() keys the localStorage entry by state.user.id
  // and no-ops when user is already null — nulling first left the previous
  // user's wizard draft (VE, addresses, free text) on a shared federal
  // workstation after an explicit sign-out (review B5).
  clearDraft();
  state.user = null;
  toast('Abgemeldet.');
  navigate('#/');
}

// ── EXPORT ───────────────────────────────────────────────────────────────
window.portal = {
  state, loadData, loadSpatialData,
  persistDraft, loadDraft, clearDraft, persistRole, loadRole,
  registerRoute, navigate, handleHash,
  renderShell, renderFooter, renderShortcutOverlay, wireGlobalShortcuts, toggleShortcutOverlay,
  renderPipeline, renderStepIndicator,
  calcWizard, deriveNawClass,
  toast, modal, toggleSearch, toggleNavMenu, toggleBurger, renderShareBar, copyShareLink, submitSearch, toggleLang, pickLang, acceptCookieConsent, dismissPrototypeNotice,
  openRoleMenu, login, logout,
  statusBadge,
  formatChf, formatDate, escapeHtml, escapeJs, roleLabel, icon,
  t, setLang, LANGS,
  PIPELINE_STANDARD, PIPELINE_BK, PIPELINE_GREENFIELD,
};

// ── VIEWS ───────────────────────────────────────────────────────────────
// Per-route renderers. They use the helpers above via local alias `P`
// (kept so the existing inline-handler call sites — window.portal.x —
// keep working without rewriting every view).
const P = window.portal;
const root = document.getElementById('root');

// ── BOOTSTRAP ────────────────────────────────────────────────────────────
init();

// Hashes that work for an unauthenticated visitor. Every other route
// renders the login gate (renderLoginGate) while logged out; after login
// the originally requested hash resolves, so shareable deep links still
// land on the intended page — now with an explicit login step instead of
// the former silent auto-login.
// #/api-docs is public like its footer neighbours (GitHub source, Webauftritt):
// developer documentation about the prototype, not tenant data.
const PUBLIC_HASHES = new Set(['', '#', '#/', '#/login', '#/info', '#/news', '#/api-docs']);

// «Wissen und Hilfsmittel» is public as a whole, so prefixes are tested
// rather than each topic route being listed — the page list lives in
// shell.js (INFO_PAGES) and must not need a second copy here to stay public.
//
// News is public for the same reason it now sits in that drawer: the landing
// page already shows news cards to signed-out visitors, so gating the list
// and the articles behind a login contradicted the teaser that led there.
function isPublicHash(h) {
  const lower = h.toLowerCase();
  return PUBLIC_HASHES.has(lower)
    || lower.startsWith('#/info/')
    || lower.startsWith('#/news/');
}

// Best-effort label for the gated area — drives the gate's H1 + breadcrumb
// so the visitor sees where the login leads. Built per call so labels
// follow the active language. Longest-prefix entries first.
function gateLabel(h) {
  const labels = [
    ['#/queue', P.t('nav.queue')],
    ['#/review', P.t('nav.queue')],
    ['#/inbox', P.t('nav.inbox')],
    ['#/properties', P.t('nav.properties')],
    ['#/downloads', P.t('nav.downloads')],
    ['#/services', P.t('nav.services')],
    ['#/wizard', P.t('services.request')],
    ['#/repair', P.t('services.repair')],
    ['#/moves', P.t('services.move')],
    ['#/cleaning', P.t('services.cleaning')],
    ['#/mobiliar', P.t('services.furniture')],
    ['#/home', P.t('nav.start')],
    ['#/news', P.t('nav.news')],
    ['#/profile', P.t('bc.profile')],
    ['#/search', P.t('bc.search')],
  ];
  const hit = labels.find(([p]) => h === p || h.startsWith(p + '/'));
  return hit ? hit[1] : P.t('login.title');
}

// Login gate — rendered by handleHash for any protected route while logged
// out. Composition: Zurück affordance (the breadcrumb is hidden below lg,
// the gate keeps its own way back), the target area's H1, and an
// alt-surface info box with lock glyph, explanation and the eIAM login CTA.
// Pattern reference: Kundenportal BBL application gate ("Anmelden mit
// AGOV / FedLogin"), recomposed from existing portal classes.
function renderLoginGate(h) {
  const label = gateLabel(h);
  shell({ breadcrumb: [{ label }] });
  const body = document.getElementById('page-body');
  if (!body) return;
  body.innerHTML = `
    <section class="section">
      <div class="container">
        <button class="btn btn--outline btn--sm login-gate__back" type="button" onclick="history.back()">
          ${P.icon('arrowLeft')} ${P.t('btn.back')}
        </button>
        <h1 class="h1">${P.escapeHtml(label)}</h1>
        <div class="login-gate" role="region" aria-label="${P.t('login.title')}">
          <span class="login-gate__icon" aria-hidden="true">${P.icon('lock')}</span>
          <div class="login-gate__body">
            <p class="login-gate__text">
              Dieser Bereich arbeitet mit Betriebsdaten Ihrer Verwaltungseinheit und erfordert deshalb
              eine Anmeldung. Melden Sie sich mit eIAM an, um ihn zu öffnen. Frei zugänglich bleiben
              die <a href="#/">Startseite</a> sowie <a href="#/info">Arbeitsinstrumente und Informationen</a>.
            </p>
            <button class="btn btn--outline login-gate__cta" type="button"
                    onclick="window.portal.login('${P.escapeJs(h)}')">
              ${P.icon('login')} ${P.t('login.eiam')}
            </button>
          </div>
        </div>
      </div>
    </section>`;
}

async function init() {
  try {
    await P.loadData('data/');
  } catch (err) {
    // A required data file failed to load — render a static fallback rather
    // than throwing out of init() and leaving a blank page. i18n may not have
    // loaded, so this message is hardcoded German (the default language).
    console.error('[init] data load failed', err);
    if (root) root.innerHTML = '<div class="container section" role="alert"><h1 class="h1">Daten konnten nicht geladen werden</h1><p>Bitte laden Sie die Seite neu. Besteht das Problem weiterhin, kontaktieren Sie den BBL-Support.</p></div>';
    return;
  }
  P.wireGlobalShortcuts();
  registerRoutes();
  // The prototype opens ALREADY SIGNED IN as the demo user. Testers were
  // reading the logged-out landing page as the whole application and never
  // pressed the simulated eIAM button, so most of the portal went unseen.
  // Nothing about the auth model changes — this only picks the starting
  // state: `logout()` still returns to the public landing page, the login
  // gate still guards protected routes while logged out, and the top-bar
  // still names the signed-in user beside the «Demo» chip. In production
  // this is where eIAM session restore would sit instead; drop this one call
  // to put visitors back in front of the login.
  applyDemoSession();
  // Deep links then resolve straight to their page. While logged out (after
  // an explicit sign-out) they render the login gate with the requested hash
  // preserved, so the page still resolves right after login.
  window.addEventListener('hashchange', P.handleHash);
  P.handleHash();
}

// ── ROUTES ───────────────────────────────────────────────────────────────
function registerRoutes() {
  P.registerRoute('#/',            renderRoot);
  P.registerRoute('#/login',       renderLogin);
  P.registerRoute('#/home',        renderHome);
  P.registerRoute('#/wizard/:step', renderWizard);
  P.registerRoute('#/inbox',       renderInbox);
  P.registerRoute('#/inbox/:id',   renderApplicationDetail);
  P.registerRoute('#/queue',       renderQueue);
  P.registerRoute('#/review/:id',  renderReviewerSplit);
  P.registerRoute('#/properties',  renderProperties);
  P.registerRoute('#/properties/:id', renderPropertyDetail);
  P.registerRoute('#/properties/:id/floors/:floorSlug', renderFloorDetail);
  P.registerRoute('#/downloads',   renderDownloads);
  P.registerRoute('#/repair',      renderRepairQuickForm);
  P.registerRoute('#/profile',     renderProfile);
  P.registerRoute('#/news',        renderNewsList);
  P.registerRoute('#/news/:id',    renderNewsDetail);
  P.registerRoute('#/services',    renderServicesOverview);
  P.registerRoute('#/moves',       renderMoveForm);
  P.registerRoute('#/cleaning',    renderCleaningForm);
  P.registerRoute('#/mobiliar',    () => renderServiceStub('Möbel bestellen', 'REQ-FA-007', 'Der föderale Mobiliar-Shop läuft im Schwesterprojekt „Arbeitsplatz-Management" — Sie werden in der Produktivversion direkt dorthin verknüpft.', 'https://bbl-dres.github.io/workspace-management/'));
  // Arbeitsinstrumente und Informationen — single long-scroll page (public)
  P.registerRoute('#/info',                renderInfoOverview);
  P.registerRoute('#/info/ablauf',         renderInfoAblauf);
  P.registerRoute('#/info/faq',            renderInfoFaq);
  P.registerRoute('#/info/vorgaben',       renderInfoVorgaben);
  P.registerRoute('#/info/schulungen',     renderInfoSchulungen);
  P.registerRoute('#/search',              renderSearchResults);
  // Mock-Swagger docs for the portal's REST API (public, linked from the
  // footer's Prototyp column — same entry point as the sister service-portal).
  P.registerRoute('#/api-docs',            renderApiDocs);
}

// ── GLOBAL SEARCH RESULTS ────────────────────────────────────────────────
// CD anatomy (designsystem app/pages/searchResults.vue + components/
// search.postcss «SEARCH RESULTS PAGE», and the live admin.ch search page):
// a tinted hero carrying the H1 and a search--large field, then ONE ranked
// stream — not per-origin groups. The type is a FACET, not a heading, which
// is what lets sorting, filtering and pagination work across all hits at
// once. The results header carries the count on the left and the sort +
// view switch on the right.
//
// Matching and ranking live in js/search-engine.js (DOM-free, unit-tested).
// This function owns the INDEX: what is searchable, what a hit is called and
// where it leads.
const SEARCH_PAGE_SIZE = 10;

// Per-source boost, applied on top of the textual score. A query is usually a
// task, so an actionable service outranks a record that merely mentions the
// same word; a Vorgang the user owns outranks reference content.
const SEARCH_BOOST = {
  services: 6,
  cases: 4,
  properties: 2,
  buildings: 1,
  documents: 0,
  news: 0,
  info: 1,
};

// Build the index from state. Each entry declares its own display strings and
// destination, so the renderer below stays uniform across content types.
function buildSearchIndex() {
  const idx = [];

  for (const s of catalogueServices()) {
    idx.push({
      kind: 'Dienstleistungen',
      type: s.type === 'action' ? 'Dienstleistung' : 'Bereich',
      title: s.label, lead: s.desc, date: '',
      href: s.href, external: s.external,
      boost: SEARCH_BOOST.services,
      fields: { title: s.label, type: 'Dienstleistung Service', lead: s.desc },
    });
  }

  // Individual Vorgänge are deliberately NOT indexed: the global search is
  // for finding content (services, properties, documents, news, info), while
  // case work lives in «Meine Vorgänge», which has its own reference/title
  // filter. Surfacing single process instances in global results mixed two
  // mental models and cluttered the hit list (user feedback, 2026-08).

  // Tenancies = the properties this VE actually occupies.
  for (const t of getScopedTenancies()) {
    idx.push({
      kind: 'Liegenschaften',
      type: 'Liegenschaft',
      title: t.buildingName, lead: t.address, date: '',
      href: `#/properties/${t.id}`, image: t.image,
      boost: SEARCH_BOOST.properties,
      fields: { title: t.buildingName, ref: formatAssetKey(t.assetKey), type: 'Liegenschaft Mietverhältnis', lead: t.address, extra: t.floorLabel },
    });
  }

  // Buildings from the portfolio that are NOT among the user's tenancies —
  // without these, a federal property you don't rent is unfindable, which is
  // exactly the case where search is the only way in.
  const tenancyBuildingIds = new Set(getScopedTenancies().map(t => t.buildingId));
  for (const b of (P.state.buildings || [])) {
    if (tenancyBuildingIds.has(b.buildingId)) continue;
    idx.push({
      kind: 'Liegenschaften',
      type: 'Objekt im Portfolio',
      title: b.name, lead: b.address, date: '',
      // No tenancy of this user's → no detail page to open; the portfolio
      // list scoped by the query is the honest destination.
      href: `#/properties?q=${encodeURIComponent(b.name)}`,
      image: (b.images || [])[0],
      boost: SEARCH_BOOST.buildings,
      fields: { title: b.name, ref: formatAssetKey(b.assetKey), type: 'Objekt Gebäude Liegenschaft', lead: b.address, extra: b.city },
    });
  }

  // Documents — the largest content set in the portal, and the one a user is
  // most likely to search by name ("Grundriss Bundeshaus").
  for (const d of (P.state.documents || [])) {
    const typeLabel = DOC_TYPE_LABEL[d.type] || d.type;
    const linked = (d.linkedTo || []).map(l => l.entityId).join(' ');
    idx.push({
      kind: 'Dokumente',
      type: typeLabel,
      title: d.title, lead: [typeLabel, d.format, d.size].filter(Boolean).join(' · '),
      date: d.issuedAt,
      href: `#/downloads?doc=${encodeURIComponent(d.id)}`,
      boost: SEARCH_BOOST.documents,
      fields: { title: d.title, ref: d.id, type: typeLabel, lead: '', extra: linked },
    });
  }

  for (const n of (P.state.news || [])) {
    idx.push({
      kind: 'Aktuell',
      type: n.type || 'Aktuell',
      title: n.title, lead: n.lead, date: n.date,
      href: `#/news/${n.id}`, image: n.image,
      boost: SEARCH_BOOST.news,
      fields: { title: n.title, type: n.type, lead: n.lead },
    });
  }

  // Topic PAGES, not section anchors: each carries its own href, so a hit
  // lands on a page with a matching H1 and breadcrumb instead of scrolling
  // an eight-section document to an arbitrary offset.
  const infoEntries = [
    { href: '#/info', title: P.t('info.title'), lead: P.t('info.lead') },
    ...INFO_PAGES.map(p => ({ href: p.href, title: P.t(p.titleKey), lead: P.t(p.descKey) })),
  ];
  for (const it of infoEntries) {
    idx.push({
      kind: 'Informationen',
      type: 'Information',
      title: it.title, lead: it.lead, date: '',
      href: it.href,
      boost: SEARCH_BOOST.info,
      fields: { title: it.title, type: 'Information Arbeitsinstrument Wissen Hilfsmittel', lead: it.lead },
    });
  }

  // One destination, one hit. Sources legitimately overlap — Schulungen is a
  // page in this area AND a cross-link in the service catalogue — and two
  // results carrying the same href read as two different things. The
  // higher-boosted entry wins, so a hit keeps the framing of the source that
  // ranks it best.
  const byHref = new Map();
  for (const entry of idx) {
    const seen = byHref.get(entry.href);
    if (!seen || (entry.boost || 0) > (seen.boost || 0)) byHref.set(entry.href, entry);
  }
  return [...byHref.values()];
}

// Search-index memo (review P5): building the index walks every service,
// case, tenancy, building, document and news record per render — and the
// search engine attaches `_folded` fields to index entries as its own fold
// cache, which a fresh index threw away on every keystroke/paging click.
// Language, user and active role are the only inputs that change its content.
let _searchIndexCache = null;
let _searchIndexKey = '';
function getSearchIndex() {
  const key = `${P.state.lang}|${P.state.user && P.state.user.id}|${P.state.user && P.state.user.activeRole}`;
  if (!_searchIndexCache || key !== _searchIndexKey) {
    _searchIndexCache = buildSearchIndex();
    _searchIndexKey = key;
  }
  return _searchIndexCache;
}

function searchHash({ q, sort, view, kind, page }) {
  const parts = [];
  if (q) parts.push('q=' + encodeURIComponent(q));
  if (kind) parts.push('kind=' + encodeURIComponent(kind));
  if (sort && sort !== 'relevance') parts.push('sort=' + sort);
  if (view && view !== 'list') parts.push('view=' + view);
  if (page && page > 1) parts.push('page=' + page);
  return '#/search' + (parts.length ? '?' + parts.join('&') : '');
}

// One hit, list variant — meta line (type · date), title, lead, optional
// thumbnail on the right. Mirrors the CD SearchResultsList row.
function searchResultRow(r) {
  const attrs = r.external ? ' target="_blank" rel="noopener"' : '';
  const onclick = r.onclick ? ` onclick="${r.onclick}"` : '';
  return `
    <li class="search-result">
      <a class="search-result__link" href="${r.href}"${attrs}${onclick}>
        <div class="search-result__body">
          <p class="meta-info search-result__meta">
            <!-- The label is the result's CATEGORY — the same vocabulary as
                 the facet tabs above (kind), not the specific sub-type: a
                 WiBe template labels as «Dokumente», not «WiBe» (the
                 sub-type already leads the description line). -->
            <span class="meta-info__item">${P.escapeHtml(r.kind || r.type)}</span>
            ${r.date ? `<span class="meta-info__item">${P.formatDate(r.date)}</span>` : ''}
          </p>
          <h3 class="search-result__title">${P.escapeHtml(r.title)}</h3>
          ${r.lead ? `<p class="search-result__lead">${P.escapeHtml(r.lead)}</p>` : ''}
        </div>
        ${r.image ? `<img class="search-result__image" src="${safeImageUrl(r.image)}" alt="" loading="lazy" decoding="async">` : ''}
      </a>
    </li>
  `;
}

// Grid variant — the CD's second view: same content as a card, with the
// arrow affordance the portal already uses on its card grids.
function searchResultCard(r) {
  const attrs = r.external ? ' target="_blank" rel="noopener"' : '';
  const onclick = r.onclick ? ` onclick="${r.onclick}"` : '';
  return `
    <li class="search-result-card">
      <a class="search-result-card__link" href="${r.href}"${attrs}${onclick}>
        <p class="meta-info search-result__meta">
          <!-- Category = tab vocabulary (kind), matching the list row. -->
          <span class="meta-info__item">${P.escapeHtml(r.kind || r.type)}</span>
          ${r.date ? `<span class="meta-info__item">${P.formatDate(r.date)}</span>` : ''}
        </p>
        <h3 class="search-result__title">${P.escapeHtml(r.title)}</h3>
        ${r.lead ? `<p class="search-result__lead">${P.escapeHtml(r.lead)}</p>` : ''}
        ${r.image ? `<img class="search-result-card__image" src="${safeImageUrl(r.image)}" alt="" loading="lazy" decoding="async">` : ''}
        ${arrowBtn('search-result-card__arrow')}
      </a>
    </li>
  `;
}

function renderSearchResults() {
  shell({ breadcrumb: [{ label: P.t('bc.search') }] });
  // parseHashQuery splits on `&`, so it isolates `q` from the injected `lang`
  // param (a naive split('?q=') would capture "eichweg&lang=de").
  const params = parseHashQuery(location.hash);
  const query = (params.q || '').trim();
  const sort = ['relevance', 'date', 'title'].includes(params.sort) ? params.sort : 'relevance';
  const view = params.view === 'grid' ? 'grid' : 'list';
  const kind = params.kind ? decodeURIComponent(params.kind) : '';
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);

  const ranked = query ? searchIndex(getSearchIndex(), query) : [];

  // Facet counts come from the FULL result set, so switching tabs never
  // changes the other tabs' numbers.
  const kindCounts = ranked.reduce((o, r) => { o[r.kind] = (o[r.kind] || 0) + 1; return o; }, {});
  const kinds = Object.keys(kindCounts);
  const activeKind = kinds.includes(kind) ? kind : '';
  const filtered = activeKind ? ranked.filter(r => r.kind === activeKind) : ranked;
  const sorted = sort === 'relevance' ? filtered : [...filtered].sort(compareSearchBy(sort));

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = sorted.slice((safePage - 1) * SEARCH_PAGE_SIZE, safePage * SEARCH_PAGE_SIZE);

  // «Label (n)» as ONE text node — the flex .tab base treats separate text
  // nodes/spans as flex items and swallows the whitespace between them,
  // which rendered «Alle11». Same convention as the property-detail tabs.
  // escapeJs on the hash: `q` and `kind` carry user/query text into a JS
  // string literal inside an onclick attribute (review B8).
  const tab = (label, value, count) => `
    <button class="tab__control${activeKind === value ? ' tab__control--active' : ''}" type="button"
            role="tab" aria-selected="${activeKind === value}"
            onclick="location.hash='${P.escapeJs(searchHash({ q: query, sort, view, kind: value, page: 1 }))}'">
      ${P.escapeHtml(label)}&nbsp;(${count})
    </button>
  `;

  document.getElementById('page-body').innerHTML = `
    <section class="section bg--secondary-50 search-hero">
      <div class="container">
        <h1 class="h1 search-hero__title">${P.t('bc.search')}</h1>
        <form class="search-hero__form" role="search" aria-label="${P.t('landing.searchLabel')}"
              onsubmit="event.preventDefault(); const v = this.elements.q.value.trim(); location.hash = v ? '#/search?q=' + encodeURIComponent(v) : '#/search';">
          <div class="search__group">
            <label class="sr-only" for="searchPageInput">${P.t('landing.searchLabel')}</label>
            <input id="searchPageInput" type="search" name="q" class="input search-hero__input"
                   value="${P.escapeHtml(query)}"
                   placeholder="${P.t('landing.searchPlaceholder')}"
                   autocomplete="off">
            <button class="btn btn--bare search-hero__submit" type="submit" aria-label="${P.t('top.search')}">${P.icon('search')}</button>
          </div>
        </form>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="search-results" aria-live="polite">
          ${!query ? `
            <p class="section-intro">Geben Sie einen Suchbegriff ein — zum Beispiel «Schaden», «Bundeshaus» oder «Grundriss». Durchsucht werden Dienstleistungen, Liegenschaften, Dokumente, News und die Informationsseite.</p>
          ` : total === 0 && !activeKind ? renderSearchNoResults(query) : `
            ${kinds.length > 1 ? `
              <div class="tabs search-results__tabs">
                <div class="tab__controls" role="tablist" aria-label="Trefferarten">
                  ${tab('Alle', '', ranked.length)}
                  ${kinds.map(k => tab(k, k, kindCounts[k])).join('')}
                </div>
              </div>
            ` : ''}

            <div class="search-results__header">
              <div class="search-results__header__left">
                <p class="search-results__occurences">
                  <strong>${total}</strong>${total === 1 ? 'Suchergebnis' : 'Suchergebnisse'}
                </p>
              </div>
              <div class="search-results__header__right">
                <label class="sr-only" for="searchSort">Sortierung</label>
                <!-- Each option carries its own destination, so the handler is
                     a plain assignment instead of hash string-surgery. -->
                <select id="searchSort" class="input search-results__sort-select"
                        onchange="location.hash = this.value">
                  ${[['relevance', 'Nach Relevanz sortieren'],
                     ['date', 'Nach Datum sortieren (Absteigend)'],
                     ['title', 'Nach Titel sortieren (A–Z)']].map(([value, label]) => `
                    <option value="${searchHash({ q: query, sort: value, view, kind: activeKind, page: 1 })}"${sort === value ? ' selected' : ''}>${label}</option>
                  `).join('')}
                </select>
                <div class="search-results__views" role="group" aria-label="Ansicht">
                  <a class="search-results__view${view === 'list' ? ' search-results__view--active' : ''}"
                     href="${searchHash({ q: query, sort, view: 'list', kind: activeKind, page: safePage })}"
                     aria-label="Listenansicht" aria-current="${view === 'list'}">${P.icon('list')}</a>
                  <a class="search-results__view${view === 'grid' ? ' search-results__view--active' : ''}"
                     href="${searchHash({ q: query, sort, view: 'grid', kind: activeKind, page: safePage })}"
                     aria-label="Rasteransicht" aria-current="${view === 'grid'}">${P.icon('grid')}</a>
                </div>
              </div>
            </div>

            ${total === 0 ? `<p class="section-intro">Keine Treffer in diesem Bereich.</p>` : view === 'grid'
              ? `<ul class="search-results-list search-results--grid">${visible.map(searchResultCard).join('')}</ul>`
              : `<ul class="search-results-list search-results--list">${visible.map(searchResultRow).join('')}</ul>`}

            ${totalPages > 1 ? renderPagination({
              current: safePage,
              totalPages,
              from: (safePage - 1) * SEARCH_PAGE_SIZE + 1,
              to: Math.min(safePage * SEARCH_PAGE_SIZE, total),
              totalItems: total,
              entitySingular: 'Treffer',
              entityPlural: 'Treffer',
              hrefFor: (p) => searchHash({ q: query, sort, view, kind: activeKind, page: p }),
              inputId: 'searchPaginationInput',
            }) : ''}
          `}
        </div>
      </div>
    </section>
  `;

  if (totalPages > 1) wirePaginationInput('searchPaginationInput');

  // Move keyboard focus into the hero search field — most users land on
  // this page intending to refine the query.
  setTimeout(() => {
    const input = document.querySelector('.search-hero__input');
    if (input) {
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }
  }, 0);
}

// CD `.search-results__no-results` — states what was searched, then offers
// ways forward rather than a dead end.
function renderSearchNoResults(query) {
  return `
    <div class="search-results__no-results">
      <h2 class="h3">Die Suche nach <strong>„${P.escapeHtml(query)}"</strong> ergab keine Treffer.</h2>
      <ul class="search-no-results__list">
        <li>Überprüfen Sie die Schreibweise Ihres Suchbegriffs.</li>
        <li>Verwenden Sie einen anderen oder allgemeineren Begriff.</li>
        <li>Versuchen Sie es mit weniger Suchbegriffen.</li>
        <li>Durchsuchen Sie die <a href="#/info">Arbeitsinstrumente und Informationen</a>.</li>
      </ul>
      <p class="search-no-results__hint">
        Durchsucht werden Dienstleistungen, Liegenschaften des Portfolios, Dokumente, News und die Informationsseite.
      </p>
    </div>
  `;
}


// ── WISSEN UND HILFSMITTEL ───────────────────────────────────────────────
// An overview plus four topic pages, listed by INFO_PAGES in shell.js and
// opened from the nav drawer. Public — no login required.
//
// This area used to be ONE route carrying eight anchors. It is split because
// the CD's second navigation level is a list of pages, not of in-page
// anchors: every topic now has its own breadcrumb, its own search hit and a
// plain href, which retires the setTimeout(scrollToInfo) hack that every
// link into this area previously needed.
//
// Every page in this area uses the SAME layout: header, then the content
// column beside a sticky Inhaltsverzeichnis (kbob-fdk Handbuch und Downloads
// pattern; armasuisse Immo-Portal). An earlier pass varied the layout per
// page — narrow column where the TOC would have listed only two entries —
// and moving between the pages then felt like moving between three different
// sites. Consistency inside one nav item beats per-page optimisation, so
// content is grouped into at least three sections instead.

// Chrome shared by all five pages.
//
// The breadcrumb mirrors PAGE TITLES, so the parent crumb reads
// «Arbeitsinstrumente und Informationen» while the nav row carries the short
// «Wissen und Hilfsmittel». Shortening a nav label is a CD convention;
// silently renaming the page it leads to would not be.
function renderInfoShell({ titleKey, leadKey, toc, body, after = '' }) {
  const title = P.t(titleKey);
  const isOverview = titleKey === 'info.title';
  shell({
    activeNav: 'info',
    breadcrumb: isOverview
      ? [{ label: P.t('info.title') }]
      : [{ href: '#/info', label: P.t('info.title') }, { label: title }],
  });

  document.getElementById('page-body').innerHTML = `
    ${P.renderShareBar()}
    <section class="section">
      <div class="container">
        <div class="page-with-toc">
          <header class="info-page__header">
            <p class="meta-info">
              <span class="meta-info__item">Stand: ${P.formatDate(new Date().toISOString())}</span>
              <span class="meta-info__item">Öffentlich · kein Login nötig</span>
            </p>
            <h1 class="info-page__title">${P.escapeHtml(title)}</h1>
            <p class="section-intro section-intro--tight">${P.escapeHtml(P.t(leadKey))}</p>
          </header>
          <div class="page-with-toc__content info-body">${body}</div>
          ${infoTocAside(toc)}
        </div>
      </div>
    </section>
    ${after}
  `;

  wireInfoScrollSpy(toc);
}

function infoTocAside(toc) {
  return `
    <aside class="page-with-toc__toc" aria-label="Inhaltsverzeichnis">
      <h2 class="page-with-toc__toc-title">Inhaltsverzeichnis</h2>
      <ul class="page-with-toc__toc-list">
        ${toc.map((it, i) => `
          <li class="page-with-toc__toc-item ${i === 0 ? 'page-with-toc__toc-item--active' : ''}">
            <a class="page-with-toc__toc-link" href="#${it.id}"
               onclick="event.preventDefault(); window.t3lite.scrollToInfo('${it.id}');">
              <span class="page-with-toc__toc-label">${P.escapeHtml(it.label)}</span>
              ${P.icon('return', 'page-with-toc__toc-icon')}
            </a>
          </li>
        `).join('')}
      </ul>
    </aside>`;
}

// ── Übersicht ────────────────────────────────────────────────────────────
// A HUB, not a document — so it does not use renderInfoShell. Same anatomy
// as the sister portal's #/data: a white band carrying the title and lead,
// then a tinted band whose section heading sits above a fixed three-column
// card grid, one card per topic page. The topic pages behind it are the
// documents, and those all share the TOC layout.
//
// The contact block closes the area here rather than repeating on every
// topic page; the footer and the meta navigation already carry a second
// path to it. It returns to the white band so the page alternates
// white · tinted · white rather than running two tinted bands together.
function renderInfoOverview() {
  const cards = [
    ...INFO_PAGES.map(p => ({ href: p.href, label: P.t(p.titleKey), desc: P.t(p.descKey) })),
    { href: '#/news', label: P.t('nav.news'), desc: P.t('info.news.desc') },
  ];

  shell({ activeNav: 'info', breadcrumb: [{ label: P.t('info.title') }] });

  document.getElementById('page-body').innerHTML = `
    ${P.renderShareBar()}
    <section class="section">
      <div class="container">
        <header class="info-page__header">
          <p class="meta-info">
            <span class="meta-info__item">Stand: ${P.formatDate(new Date().toISOString())}</span>
            <span class="meta-info__item">Öffentlich · kein Login nötig</span>
          </p>
          <h1 class="info-page__title">${P.escapeHtml(P.t('info.title'))}</h1>
          <p class="section-intro section-intro--tight">${P.escapeHtml(P.t('info.lead'))}</p>
        </header>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container">
        <h2 class="h2 section-heading">Themen</h2>
        <div class="card-grid card-grid--cols-3">
          ${cards.map(serviceCard).join('')}
        </div>
      </div>
    </section>

    <section class="section contact-section" id="kontakt" aria-labelledby="kontakt-heading">
      <div class="container">
        <h2 class="h2 contact-section__heading" id="kontakt-heading">BBL Bundesamt für Bauten und Logistik</h2>
          <div class="contact-section__grid">
            <div class="contact-section__info">
              <p class="contact-section__subheading">Abteilung Immobilienmanagement</p>
              <p class="contact-block__address">
                Fellerstrasse 21<br>
                CH&#8201;–&#8201;3027 Bern
              </p>
              <p class="contact-block__row">
                <a class="contact-block__link" href="tel:+41584655000">
                  ${P.icon('phone')}
                  +41 58 465 50 00
                </a>
              </p>
              <p class="contact-block__row">
                <a class="contact-block__link" href="mailto:info@bbl.admin.ch">
                  ${P.icon('envelope')}
                  info@bbl.admin.ch
                </a>
              </p>
              <p class="contact-block__row">
                <a class="contact-block__link" href="https://www.bbl.admin.ch" target="_blank" rel="noopener">
                  ${P.icon('globe')}
                  www.bbl.admin.ch
                </a>
              </p>
              <p class="contact-block__note">
                Für Fragen zum Mieterportal, zu Bedarfsmeldungen, zu Flächenstandards (NAW) oder zur Übergabe an SAP ePPM.
              </p>
              <p class="contact-block__lead"><strong>BIT IT-Support — eIAM</strong></p>
              <p class="contact-block__note contact-block__note--last">
                <a href="mailto:service-desk@bit.admin.ch">service-desk@bit.admin.ch</a>
              </p>
            </div>

            <div class="contact-section__map">
              <iframe
                src="https://map.geo.admin.ch/embed.html?lang=de&topic=ech&bgLayer=ch.swisstopo.pixelkarte-farbe&E=2596141&N=1199499&zoom=10&crosshair=marker"
                title="Standort BBL Fellerstrasse 21, 3027 Bern auf swisstopo"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>
          </div>
        </div>
      </section>
  `;
}

// ── Ablauf und Flächenstandards ──────────────────────────────────────────
// Workflow, special paths and the NAW reference table on one page: the class
// table is the input to step one of the workflow, and readers move between
// the two constantly. Three sections, so it keeps the TOC.
function renderInfoAblauf() {
  renderInfoShell({
    titleKey: 'info.ablauf',
    leadKey: 'info.ablauf.desc',
    toc: [
      { id: 'workflow',      label: 'Ablauf einer Bedarfsmeldung' },
      { id: 'spezialfaelle', label: 'Spezialfälle' },
      { id: 'naw',           label: 'NAW und Flächenstandards' },
    ],
    body: `
      <article id="workflow">
        <h2>Ablauf einer Bedarfsmeldung</h2>
        <p>Eine Bedarfsmeldung durchläuft vier Hauptphasen, die im Mieterportal als Statuspipeline sichtbar sind:</p>
        <ol>
          <li><strong>Entwurf</strong> — Sie erfassen den Bedarf im fünfstufigen Wizard. Eingaben werden automatisch zwischengespeichert.</li>
          <li><strong>Eingereicht → in GS-Prüfung</strong> — Das Generalsekretariat prüft die Angaben feldweise. Bei Rückfragen erhalten Sie einen kommentierten Auflagenkatalog zur Nachbearbeitung.</li>
          <li><strong>Genehmigt → in ePPM</strong> — Die freigegebene Meldung wird automatisch an SAP ePPM übergeben. BBL-PFM eröffnet die Projektakte und vergibt eine Bedarfsmeldungs-Nummer.</li>
          <li><strong>Abgeschlossen</strong> — Nach Umsetzung gilt die Akte als abgeschlossen. Die Historie bleibt im Mieterportal abrufbar.</li>
        </ol>
      </article>

      <article id="spezialfaelle">
        <h2>Spezialfälle</h2>
        <p>Zwei Konstellationen weichen vom Standardablauf ab:</p>
        <ul>
          <li><strong>Bundeskanzlei-Pfad</strong> — Anträge der BK werden ohne GS-Prüfung direkt dem BBL Portfolio-Management vorgelegt.</li>
          <li><strong>Greenfield-Pfad</strong> — Wenn das Objekt noch keinen SAP RE-FX-Eintrag hat, ergänzt BBL vor der ePPM-Übergabe einen Schritt „Wirtschaftseinheit anlegen".</li>
        </ul>
      </article>

      <article id="naw">
        <h2>NAW und Flächenstandards</h2>
        <p>Die NAW-Klassen sind die föderale Vorgabe für die Flächenberechnung von Büroarbeitsplätzen. Jede Klasse hat eine eigene m²/FTE-Basis; multipliziert mit dem fixen Belegungsfaktor 0.8 (Desk-Sharing) ergibt sie HNF2 und GF.</p>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr><th>NAW-Klasse</th><th>m²/FTE HNF2</th><th>m²/FTE GF</th><th>Beschreibung</th></tr>
            </thead>
            <tbody>
              ${(P.state.referenceData?.nawClasses || []).map(nc => `
                <tr><td>${P.escapeHtml(nc.name)}</td><td>${nc.hnf2PerFte.toFixed(1)}</td><td>${nc.gfPerFte.toFixed(1)}</td><td>${P.escapeHtml(nc.description)}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </article>`,
  });
}

// ── Häufige Fragen ───────────────────────────────────────────────────────
// Grouped along the reader's timeline — before, during and after an
// application — rather than kept as one undifferentiated list of seven. The
// grouping is what gives this page the same three-section shape as its
// siblings, and it also answers the question a flat FAQ never does: which of
// these apply to me right now.
function renderInfoFaq() {
  renderInfoShell({
    titleKey: 'info.faq',
    leadKey: 'info.faq.desc',
    toc: [
      { id: 'faq-zugang',  label: 'Zugang und Rollen' },
      { id: 'faq-erfassen', label: 'Bedarf erfassen' },
      { id: 'faq-danach',  label: 'Nach dem Einreichen' },
    ],
    body: `
      <article id="faq-zugang">
        <h2>Zugang und Rollen</h2>
        <div class="accordion">
          ${faqItem('Wer kann das Mieterportal nutzen?', 'Hauptnutzergruppe sind die Logistikbeauftragten (LBO) der Verwaltungseinheiten der zivilen Bundesverwaltung. Daneben haben Generalsekretariate (GS) sowie das Portfolio-Management des BBL Zugriff auf die jeweils zuständigen Sichten. Die Anmeldung erfolgt mit dem föderalen eIAM-Konto.')}
          ${faqItem('Wer prüft meine Bedarfsmeldung?', 'In der Regel das Generalsekretariat (GS) Ihres Departements. Die Bundeskanzlei nimmt selbst Generalsekretariats-Funktion wahr — Anträge aus der BK gehen daher ohne zusätzliche GS-Prüfung direkt an das BBL Portfolio-Management.')}
        </div>
      </article>

      <article id="faq-erfassen">
        <h2>Bedarf erfassen</h2>
        <div class="accordion">
          ${faqItem('Was bedeutet NAW?', 'NAW steht für „Neue Arbeitswelten" — die föderale Vorgabe für die Klassifizierung von Büroarbeitsplätzen. Jede Klasse hat eine eigene m²/FTE-Basis; zusammen mit dem fixen Belegungsfaktor 0.8 (Desk-Sharing) ergibt sie die HNF2 und die Geschossfläche.')}
          ${faqItem('Was ist ein Greenfield-Pfad?', 'Wenn die angegebene Adresse noch nicht im SAP RE-FX-Stammdatensatz registriert ist — etwa weil ein Neubau- oder Anmietungsprojekt gerade erst geplant wird — aktiviert das Portal den Greenfield-Modus. Der Antrag wird trotzdem entgegengenommen; BBL legt die Wirtschaftseinheit (WE) im weiteren Verlauf an.')}
        </div>
      </article>

      <article id="faq-danach">
        <h2>Nach dem Einreichen</h2>
        <div class="accordion">
          ${faqItem('Wie geht es nach der Genehmigung weiter?', 'Genehmigte Bedarfsmeldungen werden automatisch an SAP ePPM übergeben, wo die zugehörige Projektakte mit einer Bedarfsmeldungs-Nummer eröffnet wird. Sie erhalten eine Eingangsbestätigung sowie die ePPM-Nummer als Referenz für die weitere Korrespondenz.')}
          ${faqItem('Wie lange dauert die Bearbeitung?', 'Die Bearbeitungszeit hängt vom Antragstyp ab. Kleinanträge (z. B. punktuelle Anpassungen, Mobiliarbestellungen) werden in der Regel innerhalb von 10 Arbeitstagen entschieden, Grossanträge mit Projekteröffnung benötigen mehrere Wochen. Die konkrete Frist sehen Sie im Antragsdetail.')}
          ${faqItem('Wer ist während der Bauphase mein Ansprechpartner?', 'Sobald der Antrag in ePPM überführt ist, übernimmt der BBL-Bauherrenvertretung / -Projektmanagement die Leitung. Im Portal sehen Sie die zuständige Kontaktperson in der Antragsdetail-Sicht. Die LBO bleibt während der gesamten Laufzeit die mieterseitige Anlaufstelle.')}
        </div>
      </article>`,
  });
}

// ── Vorgaben und Strategien ──────────────────────────────────────────────
// Verordnungen and Strategien were two separate anchors that differ only by
// publisher; both are documents that govern the work, so they share a page.
function renderInfoVorgaben() {
  return renderInfoShell({
    titleKey: 'info.vorgaben',
    leadKey: 'info.vorgaben.desc',
    toc: [
      { id: 'verordnungen', label: 'Verordnungen und Weisungen' },
      { id: 'strategien',   label: 'Strategien und Konzepte' },
      { id: 'vorlagen',     label: 'Formulare und Vorlagen' },
    ],
    body: `
      <article id="verordnungen">
        <h2>Verordnungen und Weisungen</h2>
        <p>Rechtsgrundlagen und föderale Vorgaben, die für die Bewirtschaftung von Bundes-Immobilien und die Einreichung von Bedarfsmeldungen massgebend sind.</p>
        ${downloadList(P.state.downloads?.regulations || [])}
      </article>

      <article id="strategien">
        <h2>Strategien und Konzepte</h2>
        <p>Übergeordnete Strategien des BBL und des Bundes, die das Mieterportal und die zugrunde liegenden Flächenentscheide prägen.</p>
        ${downloadList(P.state.downloads?.strategies || [])}
      </article>

      <article id="vorlagen">
        <h2>Formulare und Vorlagen</h2>
        <p>Formulare und Checklisten werden direkt im Mieterportal geführt — es gibt keine Vorlagen zum Herunterladen und Ausfüllen. Die geführten Erfassungsstrecken prüfen Pflichtangaben und berechnen die Flächen nach den oben verlinkten Vorgaben.</p>
        <ul class="link-list">
          <li><a class="link" href="#/wizard/1">Bedarf anmelden — geführte Erfassung</a></li>
          <li><a class="link" href="#/repair">Schaden melden</a></li>
          <li><a class="link" href="#/downloads">Pläne und Dokumente zu Ihren Liegenschaften</a></li>
        </ul>
      </article>`,
  });
}

// ── Schulungen ───────────────────────────────────────────────────────────
// The registration links and the learning videos used to sit in a two-item
// accordion. They are link lists of four entries each — collapsing them hid
// content behind a click for no gain, and as sections they give this page
// the three headings its TOC needs.
function renderInfoSchulungen() {
  const linkList = (items) => `
    <ul class="link-list">
      ${items.map(label => `
        <li><a class="link link--external" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">${P.escapeHtml(label)}</a></li>
      `).join('')}
    </ul>`;

  renderInfoShell({
    titleKey: 'info.schulungen',
    leadKey: 'info.schulungen.desc',
    toc: [
      { id: 'anmeldung',   label: 'Anmeldung zu Ausbildungen' },
      { id: 'lernvideos',  label: 'Lernvideos' },
      { id: 'unterlagen',  label: 'Ausbildungsunterlagen' },
    ],
    body: `
      <article id="anmeldung">
        <h2>Anmeldung zu Ausbildungen</h2>
        <p>Logistikbeauftragte und weitere am Bedarfsprozess beteiligte Personen werden stufengerecht geschult und damit befähigt, ihre Rolle effizient wahrzunehmen.</p>
        ${linkList([
          'Grundausbildung Mieterportal BBL',
          'Spezialmodul Bedarfserfassung & NAW-Klassifizierung',
          'Spezialmodul Greenfield- und Auslandfälle',
          'Spezialmodul Reviewer GS / BBL-PFM',
        ])}
      </article>

      <article id="lernvideos">
        <h2>Lernvideos</h2>
        <p>Kurze Aufzeichnungen zum Nachschlagen zwischen zwei Anträgen.</p>
        ${linkList([
          'Mieterportal in fünf Minuten — Überblick',
          'Bedarfsmeldung Schritt für Schritt',
          'NAW-Klassifizierung erklärt',
          'Greenfield-Pfad und Stammdatenanlage',
        ])}
      </article>

      <article id="unterlagen">
        <h2>Ausbildungsunterlagen</h2>
        <p>Die Foliensätze der Ausbildungsmodule zum Nachlesen.</p>
        ${downloadList(P.state.downloads?.training || [])}
      </article>`,
  });
}

function faqItem(question, answer) {
  return `
    <div class="accordion__item">
      <button class="accordion__trigger" type="button" aria-expanded="false" onclick="this.setAttribute('aria-expanded', this.parentElement.classList.toggle('accordion__item--open'))">
        <span>${P.escapeHtml(question)}</span>
        <span class="accordion__icon" aria-hidden="true"></span>
      </button>
      <div class="accordion__panel"><p>${P.escapeHtml(answer)}</p></div>
    </div>
  `;
}

// Scroll-spy over the anchors the page's own table of contents lists. The
// TOC is now per page, so the watch list is passed in rather than read from
// a module-level constant — each of the two pages that carry a TOC owns its
// own section ids.
// One live observer at a time: every info-page render creates a fresh spy, so
// the previous one must be disconnected or observers pile up across
// navigations, each firing on detached toc items (review B21).
let _infoObserver = null;
function wireInfoScrollSpy(toc) {
  if (_infoObserver) { _infoObserver.disconnect(); _infoObserver = null; }
  const targets = (toc || [])
    .map(it => document.getElementById(it.id))
    .filter(Boolean);
  const items = document.querySelectorAll('.page-with-toc__toc-item');
  if (!targets.length || !items.length) return;

  const setActive = (id) => {
    items.forEach(item => {
      const href = item.querySelector('a')?.getAttribute('href');
      item.classList.toggle('page-with-toc__toc-item--active', href === '#' + id);
    });
  };

  _infoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-30% 0% -55% 0%', threshold: 0 });

  targets.forEach(t => _infoObserver.observe(t));
}

// ── NEWS SECTION (swisstopo "Aktuell" carousel pattern) ─────────────────
// 10 mock items in news.json → 4 pages of 3 (last page may be partial).
// Module-scoped so paging survives re-renders without leaking to window.
let newsPage = 0;
function renderNewsSection(items = P.state.news, perPage = 3) {
  if (!Array.isArray(items)) items = [];
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  if (newsPage >= totalPages) newsPage = 0;
  const page = newsPage;
  const start = page * perPage;
  const visible = items.slice(start, start + perPage);
  const prevDisabled = page === 0;
  const nextDisabled = page >= totalPages - 1;

  return `
    <section class="news-section section section--alt section--lg" aria-labelledby="newsSectionTitle">
      <div class="container">
        <h2 class="h2 section-heading" id="newsSectionTitle">Aktuell</h2>
        <div class="news-section__viewport">
          <button class="news-section__nav news-section__nav--prev" type="button" aria-label="Vorherige Nachrichten"
                  onclick="window.t3lite.newsPage(${page - 1})" ${prevDisabled ? 'disabled' : ''}>
            ${P.icon('chevronLeft')}
          </button>
          <div class="news-section__track" id="newsTrack">
            ${visible.map(newsCard).join('')}
          </div>
          <button class="news-section__nav news-section__nav--next" type="button" aria-label="Nächste Nachrichten"
                  onclick="window.t3lite.newsPage(${page + 1})" ${nextDisabled ? 'disabled' : ''}>
            ${P.icon('chevronRight')}
          </button>
        </div>
        <div class="news-section__footer">
          <div class="news-section__dots" role="tablist" aria-label="Seiten">
            ${Array.from({ length: totalPages }, (_, i) => `
              <button class="news-section__dot ${i === page ? 'news-section__dot--active' : ''}"
                      aria-label="Seite ${i + 1}${i === page ? ', aktiv' : ''}"
                      ${i === page ? 'aria-current="true"' : ''}
                      onclick="window.t3lite.newsPage(${i})"></button>
            `).join('')}
          </div>
          <a class="news-section__more" href="#/news">Weitere News ${P.icon('arrowRight')}</a>
        </div>
      </div>
    </section>
  `;
}

function newsCard(n) {
  return `
    <a class="card--profile news-card" href="#/news/${n.id}">
      <img class="card--profile__image" src="${safeImageUrl(n.image)}" alt="" loading="lazy" decoding="async" width="400" height="200">
      <div class="card--profile__body">
        <p class="card--profile__date"><strong>${P.escapeHtml(n.type)}</strong> &nbsp;|&nbsp; ${P.formatDate(n.date)}</p>
        <h3 class="card--profile__title">${P.escapeHtml(n.title)}</h3>
        <p class="card--profile__desc">${P.escapeHtml(n.lead.length > 160 ? n.lead.slice(0, 157) + '…' : n.lead)}</p>
      </div>
      ${arrowBtn('card--profile__arrow')}
    </a>
  `;
}

// ── NEWS LIST PAGE (swisstopo News-Übersicht) ──────────────────────────
const NEWS_PAGE_SIZE = 10;
function renderNewsList() {
  // News sits inside the «Wissen und Hilfsmittel» drawer, so the parent row
  // carries the active state while you are on it.
  shell({ activeNav: 'info', breadcrumb: [{ label: P.t('bc.news') }] });
  const items = P.state.news || [];
  const params = parseHashQuery(location.hash);
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const totalPages = Math.max(1, Math.ceil(items.length / NEWS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * NEWS_PAGE_SIZE, safePage * NEWS_PAGE_SIZE);

  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container container--narrow">
        <header class="news-list__header">
          <p class="news-list__date">Veröffentlicht am ${P.formatDate(new Date().toISOString())}</p>
          <h1 class="news-overview__title">News-Übersicht</h1>
        </header>
        <ul class="news-list">
          ${pageItems.map(newsListRow).join('')}
        </ul>

        ${renderPagination({
          current: safePage,
          totalPages,
          from: items.length === 0 ? 0 : (safePage - 1) * NEWS_PAGE_SIZE + 1,
          to: Math.min(safePage * NEWS_PAGE_SIZE, items.length),
          totalItems: items.length,
          entitySingular: 'Nachricht',
          entityPlural: 'Nachrichten',
          hrefFor: (p) => '#/news' + (p > 1 ? '?page=' + p : ''),
          inputId: 'newsPaginationInput',
        })}
      </div>
    </section>
  `;
  wirePaginationInput('newsPaginationInput');
}

function newsListRow(n) {
  return `
    <li class="news-list__item">
      <a class="news-list__link" href="#/news/${n.id}">
        <div class="news-list__body">
          <p class="meta-info">
            <span class="meta-info__item"><strong>${P.escapeHtml(n.type)}</strong></span>
            <span class="meta-info__item">${P.formatDate(n.date)}</span>
          </p>
          <h2 class="news-list__title">${P.escapeHtml(n.title)}</h2>
          <p class="news-list__lead">${P.escapeHtml(n.lead)}</p>
        </div>
        <img class="news-list__image" src="${safeImageUrl(n.image)}" alt="" loading="lazy" decoding="async" width="280" height="200">
      </a>
    </li>
  `;
}

function renderNewsDetail({ id }) {
  const n = P.state.news.find(x => x.id === id);
  if (!n) { shell(); document.getElementById('page-body').innerHTML = '<div class="container section"><p>Nachricht nicht gefunden.</p></div>'; return; }
  shell({ activeNav: 'info', breadcrumb: [{ href: '#/news', label: P.t('bc.news') }, { label: n.title }] });
  document.getElementById('page-body').innerHTML = `
    ${P.renderShareBar({ backTo: '#/news', backLabel: 'News-Übersicht' })}
    <article class="section">
      <div class="container container--reading">
        <p class="overtitle">${P.escapeHtml(n.type)}</p>
        <h1 class="news-detail__title">${P.escapeHtml(n.title)}</h1>
        <p class="meta-info">
          <span class="meta-info__item">Veröffentlicht am ${P.formatDate(n.date)}</span>
        </p>
        <img class="news-detail__image" src="${safeImageUrl(n.image)}" alt="" loading="lazy" decoding="async" width="1200" height="675">
        <p class="news-detail__lead">${P.escapeHtml(n.lead)}</p>
        <p class="news-detail__footer">
          Quelle: ${P.escapeHtml(n.source)} · Verantwortlich: ${P.escapeHtml(n.responsible)} · Stand: ${P.formatDate(n.date)} · DE
        </p>
      </div>
    </article>
  `;
}

// `#/` is the portal's ONE front page. It used to forward authenticated
// visitors to a separate role home at `#/home`; that page has been merged in
// below the hero (renderOverviewBand + renderQuickServicesBand), so there is
// no second entry page to forward to and nothing that requires signing out to
// see. `#/home` remains as a redirect here for old links.
function renderRoot() {
  renderLanding();
}

// ── SHELL HELPERS ────────────────────────────────────────────────────────

// ── 1. LANDING (public, T3-Lite §3.6.1) ──────────────────────────────────
function renderLanding() {
  shell({ activeNav: 'start' });
  document.getElementById('page-body').innerHTML = `
    <section class="hero hero--wide hero--split">
      <div class="hero__inner hero__inner--split">
        <div>
          <h1 class="h1 hero__title">${P.t('landing.title')}</h1>
          <p class="hero__lead">
            ${P.t('landing.lead')}
          </p>
          <!-- The hero's action slot is the portal-wide search, not a login
               CTA: the prototype opens signed in, so "what are you looking
               for?" is the real first question. Field + labelled submit side
               by side (the sister portal's home-search row), NOT the
               results page's search--large field with the icon pinned inside
               it: on an entry page the action deserves to be named. Submits
               straight to #/search — no suggestion layer. Signing in stays
               reachable from the top bar and the burger drawer. -->
          <form class="home-search" role="search" aria-label="${P.t('landing.searchLabel')}"
                onsubmit="event.preventDefault(); const v = this.elements.q.value.trim(); location.hash = v ? '#/search?q=' + encodeURIComponent(v) : '#/search';">
            <label class="sr-only" for="homeSearchInput">${P.t('landing.searchLabel')}</label>
            <input id="homeSearchInput" type="search" name="q" class="input home-search__input"
                   placeholder="${P.t('landing.searchPlaceholder')}"
                   autocomplete="off">
            <button class="btn btn--filled btn--lg home-search__submit" type="submit">
              ${P.icon('search')}${P.t('top.search')}
            </button>
          </form>
        </div>
        <figure class="hero__figure">
          <div class="hero__figure__media">
            <img src="assets/images/Bern Guisanplatz.JPG"
                 srcset="assets/images/Bern Guisanplatz.JPG 960w"
                 sizes="(max-width: 1023px) 100vw, 50vw"
                 alt="Verwaltungszentrum am Guisanplatz in Bern."
                 loading="lazy" decoding="async" width="1200" height="675">
          </div>
          <figcaption>Bern Guisanplatz, Verwaltungszentrum &mdash; &copy; Rolf Siegenthaler</figcaption>
        </figure>
      </div>
    </section>

    ${renderOverviewBand()}
    ${renderQuickServicesBand()}

    <section class="section bg--secondary-600 explainer-section" aria-labelledby="explainerTitle">
      <div class="container">
        <div class="explainer-section__grid">
          <div class="explainer-section__copy">
            <h2 class="h2 section-heading" id="explainerTitle">${P.t('landing.explainer.title')}</h2>
            <p class="section-intro">
              ${P.t('landing.explainer.lead')}
            </p>
            <a href="#/info/faq" class="btn btn--outline">${P.t('landing.explainer.cta')}</a>
          </div>
          <a class="video-thumb"
             href="https://www.youtube.com/watch?v=rin3crkLpRk"
             target="_blank" rel="noopener noreferrer"
             aria-label="Erklärvideo „Mieterportal des Bundes" auf YouTube öffnen">
            <img class="video-thumb__image"
                 src="assets/images/Explain-Video.png"
                 alt=""
                 loading="lazy" decoding="async" width="1280" height="720">
            <div class="video-thumb__header">
              <span class="video-thumb__logo" aria-hidden="true">
                <img class="video-thumb__logo-inner" src="assets/swiss-logo-flag.svg" alt="" loading="lazy" decoding="async" width="40" height="44">
              </span>
              <div class="video-thumb__titles">
                <p class="video-thumb__title">Mieterportal des Bundes</p>
                <p class="video-thumb__author">Bundesamt für Bauten und Logistik</p>
              </div>
            </div>
            <img class="video-thumb__play" src="assets/youtube-play.svg" alt="" aria-hidden="true" loading="lazy" decoding="async" width="84" height="60">
            <span class="video-thumb__cta">
              <img class="video-thumb__cta-icon" src="assets/youtube-play.svg" alt="" aria-hidden="true" loading="lazy" decoding="async" width="24" height="24">
              <span>Watch on YouTube</span>
            </span>
          </a>
        </div>
      </div>
    </section>

    ${renderNewsSection()}
  `;
}

// ── 1a. OVERVIEW BAND (front page, signed in) ────────────────────────────
// The former `#/home` merged into the front page. An intranet portal supports
// repeated task completion rather than first-time orientation, so the first
// thing under the hero is the reader's own work — greeting, then the actual
// open items, not just a count of them. Both bands render nothing at all when
// signed out, leaving the public composition (hero → explainer → news).
const OVERVIEW_ROW_CAP = 5;

// What "my open items" means depends on the active role: a submitter's own
// applications versus everything queued for a reviewer. Returned as one shape
// so the band itself stays role-agnostic.
function overviewScope() {
  const user = P.state.user;
  if (user.activeRole === 'GS-Reviewer') {
    // An assignee's view of the same collection: the cases in their unit that
    // are waiting on someone, not on the requester.
    const rows = myCases('ve').filter(c =>
      ['submitted', 'in_review_gs', 'triage', 'in_review_pfm'].includes(c.status));
    return {
      rows,
      // «Alle Vorgänge», not «Alle Pendenzen»: this band lists cases of every
      // process, while #/queue is still the Bedarfsmeldung review desk. Point
      // at the collection that can actually show all of these rows.
      moreHref: '#/inbox',
      moreLabel: P.t('overview.allApplications'),
      sentence: rows.length
        ? `Es warten <a href="#/queue" class="greeting-strip__count"><strong>${rows.length} ${rows.length === 1 ? 'Vorgang' : 'Vorgänge'}</strong></a> auf Ihre Prüfung.`
        : 'Derzeit warten keine Vorgänge auf Ihre Prüfung.',
    };
  }
  const rows = myCases('own').filter(c => !['closed', 'rejected'].includes(c.status));
  const clarification = rows.filter(c => c.status === 'clarification').length;
  return {
    rows,
    moreHref: '#/inbox',
    moreLabel: P.t('overview.allApplications'),
    sentence: rows.length
      ? `Sie haben <a href="#/inbox" class="greeting-strip__count"><strong>${rows.length} ${rows.length === 1 ? 'laufenden Vorgang' : 'laufende Vorgänge'}</strong></a>${clarification ? `, <strong>${clarification}</strong> mit Rückfrage` : ''}.`
      : 'Sie haben derzeit keine laufenden Vorgänge.',
  };
}

function renderOverviewBand() {
  if (!P.state.user) return '';
  const scope = overviewScope();
  const draft = P.loadDraft();
  const visible = scope.rows.slice(0, OVERVIEW_ROW_CAP);
  return `
    <section class="section bg--secondary-50" aria-labelledby="overviewTitle">
      <div class="container">
        <h2 class="h2 section-heading" id="overviewTitle">${P.t('overview.title')}</h2>
        <p class="greeting-strip">
          ${greetingFor(new Date().getHours())}, <strong>${P.escapeHtml(P.state.user.name.split(' ')[0])}</strong>.
          ${scope.sentence}
          ${draft ? `<span class="greeting-strip__draft"> · <a href="#" onclick="event.preventDefault(); window.t3lite.continueDraft();">Entwurf fortsetzen</a></span>` : ''}
        </p>
        ${visible.length ? `
          <div class="table-wrapper">
            <table class="table table--zebra table--rows-clickable">
              <caption class="sr-only">${P.t('overview.tableCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col">Vorgang</th><th scope="col">Objekt</th><th scope="col">Prozess</th><th scope="col">Eingereicht</th><th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                ${visible.map(caseRowHtml).join('')}
              </tbody>
            </table>
          </div>
          <p class="section-cta">
            <a class="section-cta__link" href="${scope.moreHref}">
              ${scope.moreLabel} ${P.icon('arrowRight', 'section-cta__icon')}
            </a>
          </p>
        ` : ''}
      </div>
    </section>
  `;
}

// ── 1b. FREQUENTLY USED SERVICES (front page) ────────────────────────────
// Shown signed out as well: "häufig genutzt" describes the portal's traffic,
// not this reader's history, and the whole point of the catalogue is that a
// visitor can see what the portal is for before authenticating. The cards
// point at protected routes, which is fine — those render the login gate with
// the destination preserved, the same contract the nav already offers a
// signed-out visitor.
function renderQuickServicesBand() {
  // Which four lead the front page is a property of the SERVICE (its `popular`
  // rank in data/services.json), not of this template — the sister portal's
  // rule. Editing the catalogue reorders the front page; nothing here changes.
  const featured = catalogueServices()
    .filter(s => s.popular)
    .sort((a, b) => a.popular - b.popular);
  if (!featured.length) return '';
  return `
    <section class="section bg--white" aria-labelledby="quickServicesTitle">
      <div class="container">
        <h2 class="h2 section-heading" id="quickServicesTitle">${P.t('home.services')}</h2>
        <div class="card-grid">
          ${featured.map(serviceCard).join('')}
        </div>
        <p class="section-cta">
          <a class="section-cta__link" href="#/services">
            ${P.t('home.allServices')} ${P.icon('arrowRight', 'section-cta__icon')}
          </a>
        </p>
      </div>
    </section>
  `;
}

// ── 2. LOGIN STUB ────────────────────────────────────────────────────────
// CD pattern: alt-surface section with a narrow centred container, a
// warning banner with an inline icon, then a single card carrying the
// login form. Replaces the previous inline-styled card.
function renderLogin() {
  shell();
  document.getElementById('page-body').innerHTML = `
    <section class="section section--alt">
      <div class="container">
        <div class="login-page">
          <div class="notification notification--warning notification--page-top" role="status">
            <span class="notification__icon" aria-hidden="true">
              ${P.icon('alertTriangle')}
            </span>
            <div class="notification__content">
              <p>
                <strong>Prototyp-Anmeldung — kein echtes eIAM.</strong> Diese Seite simuliert den Login. Es wird keine Verbindung zu <code>login.eiam.admin.ch</code> hergestellt.
              </p>
            </div>
          </div>
          <div class="card">
            <h1 class="h2 login-page__title">Demo-Anmeldung</h1>
            <p class="card__lead">In der Produktivversion würden Sie zu <code>login.eiam.admin.ch</code> umgeleitet. Im Prototyp melden Sie sich mit einem voreingestellten Demo-Konto an.</p>

            <h2 class="login-page__subhead">Demo-Konto</h2>
            <dl class="login-page__dl">
              <dt>Name</dt><dd>Andrea Muster</dd>
              <dt>Verwaltung</dt><dd>UVEK / BAFU</dd>
              <dt>Rollen</dt><dd>Logistikbeauftragte (LBO) · GS-Prüfer/in</dd>
            </dl>

            <button class="btn btn--filled btn--lg login-page__cta" type="button" onclick="window.portal.login()">Als Demo-Nutzerin anmelden</button>

            <p class="login-page__hint">
              Für den Test der GS-Prüfer-Sicht: nach Login die URL <code>#/queue</code> aufrufen, oder direkt <a href="#/queue" onclick="window.t3lite.demoRole('GS-Reviewer'); return false;">hier die GS-Rolle aktivieren</a>.
            </p>
            <p class="login-page__hint login-page__hint--muted">
              Hinweis: Die Produktivversion plant ab Dezember 2026 den schrittweisen Übergang von eIAM auf AGOV / E-ID.
            </p>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ── 3. AUTH HOME → front page ────────────────────────────────────────────
// The role home was merged into the front page (renderOverviewBand +
// renderQuickServicesBand under the hero), so this route no longer renders a
// page of its own. It stays registered as a redirect: bookmarks, the reviewer
// hint on the login stub and any older link keep resolving instead of hitting
// the 404 view. GS reviewers keep their dedicated queue at #/queue, which the
// overview band links to.
function renderHome() {
  P.navigate('#/');
}

function greetingFor(hour) {
  if (hour < 11) return P.t('home.greeting.morning');
  if (hour < 18) return P.t('home.greeting.day');
  return P.t('home.greeting.evening');
}

/* `extraClass` positions the affordance per consumer (`card--quick__arrow-btn`
   for the home/services grid; `card--profile__arrow` for news cards).
   `external` swaps the rightward arrow for the DS canonical external-link
   glyph (corner-bracket-out) so cards opening in a new window get a
   distinct affordance from internal-navigation cards. */
function arrowBtn(extraClassOrOpts = 'card--quick__arrow-btn', maybeOpts = {}) {
  const extraClass = typeof extraClassOrOpts === 'string' ? extraClassOrOpts : (extraClassOrOpts.extraClass || 'card--quick__arrow-btn');
  const opts = typeof extraClassOrOpts === 'object' ? extraClassOrOpts : maybeOpts;
  const external = !!opts.external;
  const glyph = external ? P.icon('external') : P.icon('arrowRight');
  return `
    <span class="arrow-btn ${extraClass}" aria-hidden="true">
      ${glyph}
    </span>
  `;
}

// ── 5. SUBMITTER INBOX ───────────────────────────────────────────────────
// ── PROCESS INSTANCES ("Vorgänge") ───────────────────────────────────────
// The portal runs several processes — Bedarfsmeldung, Schadensmeldung, Umzug,
// Sonderreinigung, Möbelbestellung — and «Meine Vorgänge» is the collection of
// running instances of ANY of them: a customer follows status here, an
// assignee finds their tasks. The envelope (reference, process, status,
// history, assignee) is uniform in data/process-instances.json; only the
// PAYLOAD differs per process.
//
// The Bedarfsmeldung's payload stays a typed record in space-requests.json,
// referenced by `payloadRef`, because its fields are computed and unit-tested
// (NAW class, m²/FTE, budget ceilings) — flattening those into the loose
// `data` bag the other processes use would trade a schema for a convention.
//
// Statuses are the union across definitions: the pipeline enum from the
// Bedarfsmeldung plus the operational states the service processes add.
const CASE_STATUS_LABELS = {
  draft: 'Entwurf', submitted: 'Eingereicht', triage: 'Triage',
  in_review_gs: 'in GS-Prüfung', in_review_pfm: 'in PFM-Prüfung',
  clarification: 'Rückfrage', scheduled: 'Termin fixiert',
  in_progress: 'in Arbeit', approved: 'genehmigt', in_project: 'in ePPM',
  asset_key_creation: 'WE-Anlage', closed: 'abgeschlossen', rejected: 'abgelehnt'
};

function processDef(defId) {
  return (P.state.processDefs || []).find(d => d.defId === defId) || null;
}

// Steps for an instance = the variant branch of its definition. Bedarfsmeldung
// carries three (standard / bypass / greenfield); the service processes have
// one. Falls back to `standard` so a variant typo degrades to a pipeline
// instead of an empty strip.
function processSteps(inst) {
  const def = processDef(inst.defId);
  if (!def || !def.variants) return null;
  return def.variants[inst.variant] || def.variants.standard || null;
}

// One row shape for every process, whatever its payload. `object` is the thing
// the case is about — from the typed payload where there is one, otherwise the
// building the instance points at.
function resolveCase(inst) {
  const def = processDef(inst.defId);
  const payload = inst.payloadRef
    ? (P.state.spaceRequests || []).find(a => a.id === inst.payloadRef)
    : null;
  const building = inst.buildingId
    ? (P.state.buildings || []).find(b => b.id === inst.buildingId)
    : null;
  return {
    inst,
    payload,
    id: inst.instanceId,
    processName: def ? def.name : inst.defId,
    title: inst.title,
    object: payload ? payload.address : (building ? building.address : '—'),
    status: inst.status,
    submittedAt: inst.createdAt,
    // A Bedarfsmeldung opens its rich detail view (pipeline, attachments,
    // Auflagen, history tabs) keyed by the payload id; every other process
    // opens the generic case view keyed by the instance id. `#/inbox/:id`
    // resolves both — a transitional dual key, until the Bedarfsmeldung view
    // is rebuilt on the instance.
    href: payload ? `#/inbox/${payload.id}` : `#/inbox/${inst.instanceId}`,
  };
}

// `scope` — 'own' for the requester's own cases, 've' for everything raised
// inside the reviewer's administrative unit.
function myCases(scope) {
  const user = P.state.user;
  if (!user) return [];
  return (P.state.processInstances || [])
    .filter(i => scope === 've' ? i.requesterVe === user.ve : i.requesterId === user.id)
    .map(resolveCase)
    .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
}

// Start a process instance from one of the short service forms. Until this
// existed the three forms minted a ticket number, put it in a toast and threw
// it away — the Vorgang the user was told about did not exist anywhere, so it
// never appeared in «Meine Vorgänge» and had no status to follow. Now each
// form creates a real instance on the same envelope the seeded cases use, and
// lands the user on it.
//
// `spec.fields` maps the German label shown on the detail view to the form
// control's name; empty inputs are dropped rather than rendered as blank rows.
function startCase(form, spec) {
  const data = new FormData(form);
  const tenancy = P.state.tenancies.find(t => t.id === data.get('building'));
  if (!tenancy) { P.toast('Bitte Liegenschaft wählen.'); return; }
  const def = processDef(spec.defId);
  const ts = new Date().toISOString();
  const instanceId = 'VG-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000 + 1000));
  const payload = {};
  for (const label in spec.fields) {
    const v = (data.get(spec.fields[label]) || '').toString().trim();
    if (v) payload[label] = v;
  }
  const firstStep = def && def.variants && def.variants.standard ? def.variants.standard[0] : null;
  P.state.processInstances.unshift({
    instanceId, id: instanceId,
    defId: spec.defId,
    variant: 'standard',
    title: spec.title(data, tenancy),
    requesterId: P.state.user.id,
    requesterVe: P.state.user.ve,
    buildingId: tenancy.buildingId,
    tenancyId: tenancy.id,
    status: firstStep ? firstStep.status : 'submitted',
    createdAt: ts,
    updatedAt: ts,
    assignee: tenancy.contacts ? tenancy.contacts[spec.contact] : null,
    data: payload,
    history: [{ ts, actor: P.state.user.name, action: firstStep ? firstStep.label : 'Eingereicht' }],
  });
  P.toast(spec.sent(instanceId, tenancy), 'success');
  setTimeout(() => P.navigate('#/inbox/' + instanceId), 600);
}

function caseRowHtml(c) {
  // A11Y-001: the row is pure navigation, so the primary cell carries a real
  // <a href> — the only keyboard/AT-operable path into the detail view. The
  // tr onclick stays for the mouse "whole row is a target" affordance.
  return `
    <tr data-case-id="${c.id}" onclick="location.hash='${c.href}';">
      <td><a href="${c.href}"><strong>${P.escapeHtml(c.id)}</strong></a></td>
      <td>${P.escapeHtml(c.object)}</td>
      <td>${P.escapeHtml(c.processName)}</td>
      <td>${P.formatDate(c.submittedAt)}</td>
      <td>${P.statusBadge(c.status)}</td>
    </tr>
  `;
}

const INBOX_PAGE_SIZE = 25;
function renderInbox() {
  if (!P.state.user) { P.navigate('#/'); return; }
  shell({ activeNav: 'inbox', breadcrumb: [{ label: P.t('nav.inbox') }] });
  const role = P.state.user.activeRole;
  const apps = myCases(role === 'GS-Reviewer' ? 've' : 'own');

  // URL state: ?page=N (status filtering is in-page, see wireInboxFilters)
  const params = parseHashQuery(location.hash);
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const totalPages = Math.max(1, Math.ceil(apps.length / INBOX_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = apps.slice((safePage - 1) * INBOX_PAGE_SIZE, safePage * INBOX_PAGE_SIZE);

  // Filter options are built from what's actually in the
  // user's set, so we never show "Rückfrage" when there are no
  // clarification items. Counts on each chip give an at-a-glance
  // distribution (DS tag-item pattern). Counts are derived from the
  // full apps array, not the paginated slice.
  const STATUS_LABELS = CASE_STATUS_LABELS;
  const counts = apps.reduce((o, a) => { o[a.status] = (o[a.status] || 0) + 1; return o; }, {});
  const presentStatuses = Object.keys(STATUS_LABELS).filter(s => counts[s]);

  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container">
        <header class="page-header">
          <div>
            <h1 class="h1 page-header__title">${role === 'GS-Reviewer' ? P.t('nav.inboxVe') : P.t('inbox.title')}</h1>
            <p class="page-header__sub">${apps.length} ${apps.length === 1 ? 'Vorgang' : 'Vorgänge'} insgesamt</p>
          </div>
          <div class="page-header__actions">
            <!-- The button opens the SERVICE CATALOGUE, not the Bedarfsmeldung
                 wizard: this list holds every process, so "new" has to be a
                 choice of process rather than a shortcut into one of them. -->
            <a class="btn btn--filled btn--sm" href="#/services">+ ${P.t('inbox.new')}</a>
          </div>
        </header>

        ${apps.length === 0 ? renderInboxEmptyState() : `
          ${catalogueBar({
            id: 'inbox',
            search: true,
            q: '',
            searchLabel: P.t('inbox.searchLabel'),
            placeholder: P.t('inbox.searchPlaceholder'),
        
            count: `${apps.length} ${apps.length === 1 ? 'Vorgang' : 'Vorgänge'}`,
            filterLabel: P.t('props.filter'),
            filterCount: 0,
            // Status is this list's filter dimension. The counts that used to
            // sit on the chip row move onto the options, so nothing is lost by
            // folding them into the shared bar.
            panel: `
              <fieldset class="catbar__fieldset">
                <legend class="catbar__legend">Status</legend>
                <div class="catbar__options">
                  <label class="catbar__option">
                    <input type="radio" name="inbox-status" value="" checked>
                    <span>Alle (${apps.length})</span>
                  </label>
                  ${presentStatuses.map(s => `
                    <label class="catbar__option">
                      <input type="radio" name="inbox-status" value="${s}">
                      <span>${STATUS_LABELS[s]} (${counts[s]})</span>
                    </label>`).join('')}
                </div>
              </fieldset>`,
          })}

          <div class="table-wrapper">
          <table class="table table--zebra table--rows-clickable">
            <caption class="sr-only">Vorgänge mit Objekt, Prozess, Eingangsdatum und Status</caption>
            <thead>
              <tr>
                <th scope="col">Vorgang</th><th scope="col">Objekt</th><th scope="col">Prozess</th><th scope="col">Eingereicht</th><th scope="col">Status</th>
              </tr>
            </thead>
            <tbody id="inboxTbody">
              ${pageItems.map(caseRowHtml).join('')}
            </tbody>
          </table>
          </div>
          <p class="table-hint">Klicken Sie eine Zeile, um Details zu öffnen.</p>

          ${renderPagination({
            current: safePage,
            totalPages,
            from: apps.length === 0 ? 0 : (safePage - 1) * INBOX_PAGE_SIZE + 1,
            to: Math.min(safePage * INBOX_PAGE_SIZE, apps.length),
            totalItems: apps.length,
            entitySingular: 'Vorgang',
            entityPlural: 'Vorgänge',
            hrefFor: (p) => '#/inbox' + (p > 1 ? '?page=' + p : ''),
            inputId: 'inboxPaginationInput',
          })}
        `}
      </div>
    </section>
  `;
  if (apps.length > 0) {
    // The shared bar owns its filter-panel toggle; no `hashFor` here because
    // this list filters in page rather than through the URL.
    wireCatalogueBar({ id: 'inbox' });
    wireInboxFilters(apps);
    wirePaginationInput('inboxPaginationInput');
  }
}

// Text + status filtering over the rendered case rows. Operates on the
// resolved cases (not raw records) so the same row markup is reused, and
// matches the title too — the only thing that tells two Schadensmeldungen on
// one building apart.
function wireInboxFilters(cases) {
  const radios = Array.from(document.querySelectorAll('input[name="inbox-status"]'));
  const filterText = document.getElementById('inbox-q');
  const tbody = document.getElementById('inboxTbody');
  if (!tbody) return;
  let activeStatus = '';

  const apply = () => {
    const t = (filterText?.value || '').toLowerCase();
    const filtered = cases.filter(c =>
      (!activeStatus || c.status === activeStatus) &&
      (!t || c.id.toLowerCase().includes(t)
          || (c.object || '').toLowerCase().includes(t)
          || (c.title || '').toLowerCase().includes(t))
    );
    tbody.innerHTML = filtered.map(caseRowHtml).join('')
      || emptyRow(5, 'Keine Treffer.');
  };

  // Status filtering stays IN PAGE rather than routing through the hash: the
  // list re-renders its own tbody, and a navigation would close the filter
  // panel the reader just opened. The bar's filter badge tracks the choice so
  // an active filter is visible with the panel collapsed.
  radios.forEach(radio => radio.addEventListener('change', () => {
    activeStatus = radio.value || '';
    setFilterCount('inbox', activeStatus ? 1 : 0);
    apply();
  }));

  filterText?.addEventListener('input', apply);
}

function renderInboxEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__glyph" aria-hidden="true">
        ${P.icon('envelope')}
      </div>
      <h2 class="empty-state__title">Noch keine Vorgänge</h2>
      <p class="empty-state__lead">Sie haben derzeit keine laufenden Vorgänge. Beginnen Sie mit einer Bedarfsanmeldung, um Bürofläche, Übernachtungsplätze oder eine Auslandvertretung zu beantragen.</p>
      <div class="empty-state__cta">
        <a href="#/wizard/1" class="btn btn--filled">Bedarf anmelden</a>
        <a href="#/info/ablauf" class="btn btn--bare">Wie funktioniert das Portal?</a>
      </div>
    </div>
  `;
}


// Detail view for a process instance that has no typed payload — a
// Schadensmeldung, Umzug, Sonderreinigung, Möbelbestellung. Deliberately the
// same page furniture as the Bedarfsmeldung view (share bar, page header,
// pipeline, card sections) so a Vorgang reads the same whatever its process;
// only the payload block differs, rendering the instance's `data` as a
// definition list because its shape is per-process.
// ── VORGANG DETAIL ───────────────────────────────────────────────────────
// ONE detail view for every process. A Bedarfsmeldung, a Schadensmeldung, an
// Umzug and a Möbelbestellung are the same KIND of thing to a reader — a case
// with a status, a history and some paperwork — so they get the same page
// furniture and the same four tabs. Only the Übersicht panel's body varies,
// because that is the one part that genuinely differs: a Bedarfsmeldung has a
// typed, computed payload (NAW class, m²/FTE, budget ceilings) while the
// operational processes carry a loose `data` bag.
//
// The tab set is FIXED. Previously the Bedarfsmeldung view carried a
// «SAP / ePPM» tab that no other process had (and that mostly showed a
// fabricated correlation id); its two real facts — the asset key and the ePPM
// project number — now sit in Übersicht with the rest of the record. A tab
// strip that changes shape per process would make the view feel like four
// different pages.
//
// Empty is a state, not a reason to hide a tab: a process with no attachments
// shows «Anhänge (0)» and says so inside.
const CASE_TABS = ['uebersicht', 'anhaenge', 'verlauf', 'kommentare'];

// `#/inbox/:id` accepts either key: the instance id (canonical) or the id of
// a Bedarfsmeldung payload (older links, and the reviewer flow which still
// addresses space requests).
function findCase(id) {
  const insts = P.state.processInstances || [];
  return insts.find(i => i.instanceId === id) || insts.find(i => i.payloadRef === id) || null;
}

function renderApplicationDetail({ id }) {
  if (!P.state.user) { P.navigate('#/'); return; }
  const inst = findCase(id);
  if (!inst) {
    renderNotFound('Vorgang nicht gefunden.', { activeNav: 'inbox' });
    return;
  }
  renderCaseDetail(inst);
}

function renderCaseDetail(inst) {
  const c = resolveCase(inst);
  const a = c.payload;                    // typed Bedarfsmeldung payload, or null
  const steps = processSteps(inst);
  const attachments = (a && a.attachments) || inst.attachments || [];
  const comments = inst.comments || [];
  const history = (a && a.history) || inst.history || [];

  shell({ activeNav: 'inbox', breadcrumb: [
    { href: '#/inbox', label: P.t('nav.inbox') },
    { label: inst.instanceId },
  ]});

  const requested = parseHashQuery(location.hash).tab;
  const tab = CASE_TABS.includes(requested) ? requested : 'uebersicht';
  const ctx = { a, attachments, comments, history };

  const tabs = [
    ['uebersicht', P.t('case.tabOverview')],
    ['anhaenge',   `${P.t('case.tabAttachments')} (${attachments.length})`],
    ['verlauf',    P.t('case.tabHistory')],
    ['kommentare', `${P.t('case.tabComments')} (${comments.length})`],
  ];

  document.getElementById('page-body').innerHTML = `
    ${P.renderShareBar({ backTo: '#/inbox', backLabel: 'Vorgänge' })}
    <section class="section">
      <div class="container">
        ${a && a._isNew ? `
          <div class="notification notification--success app-detail__fresh-banner" role="status">
            <span class="notification__icon" aria-hidden="true">${P.icon('checkCircle')}</span>
            <div class="notification__content">
              <p>
                <strong>Ihr Antrag ${P.escapeHtml(a.id)} wurde erfolgreich eingereicht.</strong>
                Sie erhalten in Kürze eine E-Mail-Bestätigung.
              </p>
            </div>
          </div>
        ` : ''}

        <header class="page-header">
          <div>
            <p class="overtitle">${P.escapeHtml(c.processName)}</p>
            <h1 class="h1 page-header__title">${P.escapeHtml(inst.title)}</h1>
            <p class="page-header__sub">
              ${P.escapeHtml(inst.instanceId)} · ${P.escapeHtml(c.object)} · ${P.t('case.submittedOn')} ${P.formatDate(inst.createdAt)}
            </p>
          </div>
          <div class="page-header__actions">
            ${P.statusBadge(inst.status)}
            ${a && a.status === 'clarification' ? `<button class="btn btn--filled btn--sm" type="button" onclick="window.t3lite.startResubmit('${P.escapeJs(a.id)}')">${P.icon('refresh')} Auflagen erfüllen — Erneut einreichen</button>` : ''}
          </div>
        </header>

        ${P.renderPipeline(a || inst, steps)}

        <div class="tabs case-tabs" role="tablist" aria-label="${P.t('case.tabsLabel')}">
          ${tabs.map(([key, label]) => tabBtn(key, label, tab)).join('')}
        </div>
        <div id="detailTab" role="tabpanel" tabindex="0" aria-labelledby="tab-${tab}">${renderCaseTab(inst, tab, ctx)}</div>
      </div>
    </section>
  `;

  wireCaseTabs(inst, ctx);
  // Clear the "fresh submission" flag after first paint so a reload doesn't
  // re-show the banner.
  if (a && a._isNew) setTimeout(() => { delete a._isNew; }, 500);
}

function renderCaseTab(inst, tab, ctx) {
  if (tab === 'anhaenge')   return caseAttachmentsPanel(ctx);
  if (tab === 'verlauf')    return caseHistoryPanel(ctx);
  if (tab === 'kommentare') return caseCommentsPanel(ctx);
  return caseOverviewPanel(inst, ctx);
}

// Shared empty state — every tab renders one rather than disappearing, so the
// reader learns that the case HAS no attachments instead of wondering where
// they went.
function caseEmpty(text) {
  return `<p class="case-empty text-secondary">${P.escapeHtml(text)}</p>`;
}

// Übersicht as a VERTICAL stack of titled sections, each a definition list —
// the same `.detail-list` anatomy the property page uses. The previous
// four-across card grid forced every value into a ~300px column, so an
// address or a NAW line wrapped three times while the card next to it sat
// half empty; and the cards implied four peer objects where there is really
// one record described from several angles.
function caseSection(title, rows) {
  const body = rows.filter(Boolean);
  if (!body.length) return '';
  return `
    <section class="case-section">
      <h2 class="case-section__title">${P.escapeHtml(title)}</h2>
      <dl class="detail-list">${body.join('')}</dl>
    </section>`;
}
const caseRow = (label, value) => (value === null || value === undefined || value === '')
  ? '' : `<dt>${P.escapeHtml(label)}</dt><dd>${value}</dd>`;

function caseOverviewPanel(inst, { a }) {
  const c = resolveCase(inst);
  const facts = caseSection(P.t('case.caseFacts'), [
    caseRow(P.t('case.reference'), P.escapeHtml(inst.instanceId)),
    caseRow(P.t('case.process'), P.escapeHtml(c.processName)),
    caseRow(P.t('case.assignee'), P.escapeHtml(inst.assignee || '—')),
    caseRow(P.t('case.submittedOn'), P.formatDate(inst.createdAt)),
    caseRow(P.t('case.updatedOn'), P.formatDate(inst.updatedAt || inst.createdAt)),
    a && a.projectNumber ? caseRow('ePPM', `<strong>${P.escapeHtml(a.projectNumber)}</strong>`) : '',
  ]);

  // Bedarfsmeldung: the typed record, one section per group of fields.
  if (a) {
    const submitter = P.state.users.find(u => u.id === a.submitterId);
    return `
      <div class="case-overview">
        ${caseSection('Antragsteller', [
          caseRow('Name', P.escapeHtml(submitter?.name || a.submitterId)),
          caseRow('Verwaltungseinheit', P.escapeHtml(a.submitterVe) + (a.submitterDep ? ' · ' + P.escapeHtml(a.submitterDep) : '')),
        ])}
        ${caseSection('Standort', [
          caseRow('Adresse', P.escapeHtml(a.address)),
          a.assetKey
            ? caseRow('Wirtschaftseinheit (WE)', `<code>${a.assetKey.bk}/${a.assetKey.we}/${a.assetKey.obj}</code>`)
            : caseRow('Objekt', '<span class="badge badge--greenfield">Greenfield</span> — WE/Obj noch nicht vergeben'),
          a.assetKey ? caseRow('EGID', `<code>${P.escapeHtml(String(a.egid))}</code>`) : '',
        ])}
        ${a.naw ? caseSection('Flächenbedarf', [
          caseRow('NAW-Klasse', `<strong>${P.escapeHtml(a.naw.class)}</strong>`),
          caseRow('FTE', a.fte),
          caseRow('Arbeitsplätze', a.workstations),
          caseRow('HNF2', `${a.hnf2} m²`),
          caseRow('Geschossfläche (GF)', `${a.gf} m²`),
          caseRow('Unterhaltskosten', P.formatChf(a.operatingCosts)),
          caseRow('Möblierung', P.formatChf(a.furnitureBudget)),
        ]) : ''}
        ${a.extensionData?.berths ? caseSection('SEM-Variante', [
          caseRow('Schlafplätze', `<strong>${a.extensionData.berths}</strong>`),
          caseRow('davon Familie', a.extensionData.berthsFamily),
          caseRow('davon Einzel', a.extensionData.berthsSingle),
          caseRow('davon Mehrbett', a.extensionData.berthsShared),
          caseRow('Investitionspauschale', P.formatChf(a.extensionData.investmentLumpSum)),
        ]) : ''}
        ${facts}
        ${a.status === 'clarification' && a.conditions ? `
          <section class="case-section">
            <h2 class="case-section__title">${P.icon('refresh')} Rückfrage / Offene Auflagen</h2>
            <p class="case-section__note"><strong>Begründung GS:</strong> ${P.escapeHtml(a.reviewerJustification)}</p>
            <ul class="auflagen-list">
              ${a.conditions.map((x, i) => `
                <li class="${x.done ? 'done' : ''}">
                  <input type="checkbox" ${x.done ? 'checked' : ''} aria-label="Auflage erledigt: ${P.escapeHtml(x.comment)}" onclick="window.t3lite.toggleAuflage('${P.escapeJs(a.id)}', ${i})">
                  <span>${P.escapeHtml(x.comment)}</span>
                  <span class="badge">${P.escapeHtml(x.field)}</span>
                </li>
              `).join('')}
            </ul>
          </section>` : ''}
      </div>`;
  }

  // Every other process: its own submitted fields, in the same anatomy.
  const data = inst.data || {};
  const keys = Object.keys(data);
  return `
    <div class="case-overview">
      ${keys.length
        ? caseSection(P.t('case.submittedData'), keys.map(k => caseRow(k, P.escapeHtml(String(data[k])))))
        : `<section class="case-section">
             <h2 class="case-section__title">${P.t('case.submittedData')}</h2>
             ${caseEmpty(P.t('case.noData'))}
           </section>`}
      ${facts}
    </div>`;
}


function caseAttachmentsPanel({ attachments }) {
  if (!attachments.length) return caseEmpty(P.t('case.noAttachments'));
  return `
    <ul class="attachment-list" aria-label="${P.t('case.tabAttachments')}">
      ${attachments.map(x => attachmentLi(x)).join('')}
    </ul>
    <p class="table-hint">Klicken Sie ein Dokument, um es herunterzuladen. Anhänge bleiben für die Dauer der Aktenführung verfügbar.</p>`;
}

function caseHistoryPanel({ history }) {
  if (!history.length) return caseEmpty(P.t('case.noHistory'));
  // Map eventType → tone for the timeline dot. Instances from the service
  // forms carry no eventType, so the dot simply stays neutral.
  const dotTone = (eventType) => {
    if (!eventType) return '';
    if (/Added|Submitted/i.test(eventType)) return 'history-timeline__dot--info';
    if (/Approved|Closed/i.test(eventType)) return 'history-timeline__dot--success';
    if (/Rejected|Clarification/i.test(eventType)) return 'history-timeline__dot--warning';
    if (/Handover|Project|System/i.test(eventType)) return 'history-timeline__dot--neutral';
    return '';
  };
  return `
    <ol class="history-timeline" aria-label="${P.t('case.tabHistory')}">
      ${history.map(h => `
        <li class="history-timeline__item">
          <span class="history-timeline__dot ${dotTone(h.eventType)}" aria-hidden="true"></span>
          <div class="history-timeline__body">
            <time class="history-timeline__time" datetime="${P.escapeHtml(h.ts)}">${new Date(h.ts).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
            <p class="history-timeline__action"><strong>${P.escapeHtml(h.actor)}</strong> · ${P.escapeHtml(h.action)}</p>
          </div>
        </li>
      `).join('')}
    </ol>`;
}

function caseCommentsPanel({ comments }) {
  if (!comments.length) return caseEmpty(P.t('case.noComments'));
  return `
    <ul class="case-comments" aria-label="${P.t('case.tabComments')}">
      ${comments.map(k => `
        <li class="case-comment">
          <p class="case-comment__meta">
            <strong>${P.escapeHtml(k.author)}</strong>
            <time datetime="${P.escapeHtml(k.ts)}">${P.formatDate(k.ts)}</time>
          </p>
          <p class="case-comment__text">${P.escapeHtml(k.text)}</p>
        </li>
      `).join('')}
    </ul>`;
}

// Shared roving-tabindex wiring (lib.js wireTabs, A11Y-016 / review M-TABS),
// with the active tab in `?tab=` so a link into a case opens where it was
// shared from. Keep `lang` in the URL: the router treats it as the source of
// truth, so dropping it would make a copied link resolve in whatever language
// the next reader has stored rather than the one shown.
function caseTabHash(instanceId, key) {
  const current = parseHashQuery(location.hash);
  const qs = [key === 'uebersicht' ? '' : `tab=${key}`, current.lang ? `lang=${current.lang}` : '']
    .filter(Boolean).join('&');
  return `#/inbox/${instanceId}` + (qs ? '?' + qs : '');
}
function wireCaseTabs(inst, ctx) {
  wireTabs({
    rootSel: '.case-tabs',
    render: (key) => renderCaseTab(inst, key, ctx),
    hashFor: (key) => caseTabHash(inst.instanceId, key),
  });
}


function tabBtn(key, label, active) {
  const isActive = active === key;
  return `<button class="tab ${isActive ? 'tab--active' : ''}"
                  type="button"
                  role="tab"
                  id="tab-${key}"
                  data-tab="${key}"
                  aria-selected="${isActive ? 'true' : 'false'}"
                  aria-controls="detailTab"
                  tabindex="${isActive ? '0' : '-1'}">${label}</button>`;
}

// ── 7. REVIEWER QUEUE (when activeRole = GS-Prüfer/in) ───────────────────
const QUEUE_PAGE_SIZE = 25;
function renderQueue() {
  if (!P.state.user) { P.navigate('#/'); return; }
  // GS-Reviewer's landing page — no breadcrumb (same reasoning as the
  // LBO home: a single-item breadcrumb just restates the page title).
  shell({ activeNav: 'queue', breadcrumb: [], deptSub: P.t('org.portal') + ' · GS-Prüfer/in' });
  const queue = P.state.spaceRequests.filter(a => {
    // Reviewers see all VE applications that are awaiting review
    return ['submitted', 'in_review_gs', 'clarification'].includes(a.status)
        && a.pipelineVariant !== 'bypass';
  });

  const params = parseHashQuery(location.hash);
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const totalPages = Math.max(1, Math.ceil(queue.length / QUEUE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = queue.slice((safePage - 1) * QUEUE_PAGE_SIZE, safePage * QUEUE_PAGE_SIZE);

  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container">
        <header class="page-header">
          <div>
            <h1 class="h1 page-header__title">Ihre Pendenzen <span class="page-header__count">(${queue.length})</span></h1>
            <p class="page-header__sub">Vorgänge zur Prüfung in Ihrer Verwaltungseinheit</p>
          </div>
        </header>

        <!-- Same catalogue bar as every other list. The queue filters by the
             review state a reviewer actually triages by; no view switch,
             because a work queue has one useful shape. -->
        ${catalogueBar({
          id: 'queue',
          search: true,
          q: '',
          searchLabel: P.t('queue.searchLabel'),
          placeholder: P.t('queue.searchPlaceholder'),
          count: `${queue.length} ${queue.length === 1 ? 'Pendenz' : 'Pendenzen'}`,
          filterLabel: P.t('props.filter'),
          filterCount: 0,
          panel: `
            <fieldset class="catbar__fieldset">
              <legend class="catbar__legend">Status</legend>
              <div class="catbar__options">
                <label class="catbar__option">
                  <input type="radio" name="queue-status" value="" checked>
                  <span>Alle (${queue.length})</span>
                </label>
                ${['submitted', 'in_review_gs', 'clarification']
                  .filter(s => queue.some(a => a.status === s))
                  .map(s => `
                    <label class="catbar__option">
                      <input type="radio" name="queue-status" value="${s}">
                      <span>${CASE_STATUS_LABELS[s]} (${queue.filter(a => a.status === s).length})</span>
                    </label>`).join('')}
              </div>
            </fieldset>`,
        })}

        <div class="table-wrapper">
        <table class="table table--zebra table--rows-clickable table--compact">
          <caption class="sr-only">Pendenzen mit Antragsteller, Objekt, Einreichedatum und Status</caption>
          <thead>
            <tr>
              <th scope="col"><input type="checkbox" id="selectAll" aria-label="Alle auswählen"></th>
              <th scope="col">Antrag</th><th scope="col">Antragsteller</th><th scope="col">Objekt</th><th scope="col">Eingereicht</th><th scope="col">Status</th>
            </tr>
          </thead>
          <tbody id="queueTbody">
            ${pageItems.map(queueRowHtml).join('') || emptyRow(6, 'Keine offenen Pendenzen.')}
          </tbody>
        </table>
        </div>

        ${renderPagination({
          current: safePage,
          totalPages,
          from: queue.length === 0 ? 0 : (safePage - 1) * QUEUE_PAGE_SIZE + 1,
          to: Math.min(safePage * QUEUE_PAGE_SIZE, queue.length),
          totalItems: queue.length,
          entitySingular: 'Pendenz',
          entityPlural: 'Pendenzen',
          hrefFor: (p) => '#/queue' + (p > 1 ? '?page=' + p : ''),
          inputId: 'queuePaginationInput',
        })}

        <div class="queue-actions">
          <button class="btn btn--outline btn--sm" onclick="window.t3lite.openBatchApprove()">Bulk genehmigen</button>
          <button class="btn btn--bare btn--sm">Bulk: Zuweisen</button>
          <button class="btn btn--bare btn--sm">Bulk: Mehr Info anfragen</button>
        </div>

        <div class="queue-stats" id="queueStats">
          <button class="queue-stats__toggle" type="button" aria-expanded="false" onclick="(function(b){var p=b.parentElement;var open=p.classList.toggle('queue-stats--open');b.setAttribute('aria-expanded', open?'true':'false');})(this)">
            <span class="queue-stats__toggle-label">
              ${P.icon('chevronRight', 'queue-stats__chevron')}
              Statistiken Ihres GS (Klick zum Aufklappen)
            </span>
            <span>Eingang 30 d: 8 · Ø Bearbeitung 4.2 d · Offene Auflagen 2 · Schnitt 96 %</span>
          </button>
          <div class="queue-stats__body">
            <div class="queue-stats__tile"><div class="queue-stats__value">8</div><div class="queue-stats__label">Eingang 30 d</div></div>
            <div class="queue-stats__tile"><div class="queue-stats__value">4.2 d</div><div class="queue-stats__label">Ø Bearbeitung</div></div>
            <div class="queue-stats__tile"><div class="queue-stats__value">2</div><div class="queue-stats__label">Offene Auflagen</div></div>
            <div class="queue-stats__tile"><div class="queue-stats__value">96 %</div><div class="queue-stats__label">Schnitt zu BBL</div></div>
          </div>
        </div>
      </div>
    </section>
  `;
  document.getElementById('selectAll')?.addEventListener('change', e => {
    document.querySelectorAll('.rowSel').forEach(c => c.checked = e.target.checked);
  });
  wirePaginationInput('queuePaginationInput');
  wireQueueShortcuts();
  wireCatalogueBar({ id: 'queue' });
  // The FULL filtered set, not the page slice — typing must find rows on
  // other pages, exactly like renderInbox → wireInboxFilters (review B17).
  wireQueueFilters(queue);
}

let _queueKeydownHandler = null;
// STA-001: called from handleHash whenever the route path leaves #/queue, so
// the shortcut handler's lifetime matches its view (docviewer close() pattern).
function teardownQueueShortcuts() {
  if (!_queueKeydownHandler) return;
  document.removeEventListener('keydown', _queueKeydownHandler);
  _queueKeydownHandler = null;
}
// One queue row. Extracted so the catalogue bar's status filter can re-render
// the body in place, the same way the Vorgänge list does.
function queueRowHtml(a) {
  return `
    <tr data-app-id="${a.id}" tabindex="0" aria-label="Antrag ${P.escapeHtml(a.id)} öffnen">
      <td onclick="event.stopPropagation();"><input type="checkbox" class="rowSel" value="${a.id}" aria-label="Antrag ${P.escapeHtml(a.id)} auswählen"></td>
      <td onclick="location.hash='#/review/${a.id}';"><strong>${a.id}</strong></td>
      <td onclick="location.hash='#/review/${a.id}';">${P.escapeHtml(P.state.users.find(u => u.id === a.submitterId)?.name || '')} (${a.submitterVe})</td>
      <td onclick="location.hash='#/review/${a.id}';">${P.escapeHtml(a.address)}</td>
      <td onclick="location.hash='#/review/${a.id}';">${P.formatDate(a.submittedAt)}</td>
      <td onclick="location.hash='#/review/${a.id}';">${P.statusBadge(a.status)}</td>
    </tr>
  `;
}

// Text + status filtering over the rendered queue rows, in page rather than
// through the hash: the reviewer keeps their row selection and the filter
// panel stays open while they triage.
function wireQueueFilters(rows) {
  const radios = Array.from(document.querySelectorAll('input[name="queue-status"]'));
  const filterText = document.getElementById('queue-q');
  const tbody = document.getElementById('queueTbody');
  if (!tbody) return;
  let activeStatus = '';
  const apply = () => {
    const t = (filterText?.value || '').toLowerCase();
    const filtered = rows.filter(a =>
      (!activeStatus || a.status === activeStatus) &&
      (!t || a.id.toLowerCase().includes(t) || (a.address || '').toLowerCase().includes(t))
    );
    tbody.innerHTML = filtered.map(queueRowHtml).join('')
      || emptyRow(6, 'Keine Treffer.');
    // Re-rendered rows lose their keyboard/selection handlers.
    wireQueueShortcuts();
  };
  radios.forEach(r => r.addEventListener('change', () => {
    activeStatus = r.value || '';
    setFilterCount('queue', activeStatus ? 1 : 0);
    apply();
  }));
  filterText?.addEventListener('input', apply);
}

function wireQueueShortcuts() {
  const rows = Array.from(document.querySelectorAll('tbody tr[data-app-id]'));
  let idx = -1;
  // A11Y-001: the j/k cursor moves REAL DOM focus — rows carry tabindex="0"
  // (same pattern as the properties list rows), so the global :focus-visible
  // ring replaces the old style.outline paint, which drew a fake focus ring
  // on an element that was never focused and that AT could not track.
  const moveCursor = (i) => {
    idx = Math.max(0, Math.min(rows.length - 1, i));
    const r = rows[idx];
    if (r) {
      try { r.focus({ preventScroll: true }); } catch { r.focus(); }
      r.scrollIntoView({ block: 'nearest' });
    }
  };
  // Remove the previous handler so revisiting #/queue doesn't stack listeners
  // (each closing over a now-detached `rows` — drew multiple outlines + leaked).
  if (_queueKeydownHandler) document.removeEventListener('keydown', _queueKeydownHandler);
  _queueKeydownHandler = (e) => {
    // STA-001: form fields keep their keys, and buttons/links keep native
    // Enter/Space activation (previously Enter on e.g. «Bulk genehmigen» or a
    // pagination link could be hijacked into opening the cursor row).
    if (e.target.closest?.('input, textarea, select, button, a[href], [contenteditable="true"]')) return;
    // A row reached with Tab (not j/k) becomes the cursor too, so
    // Enter/Space work on whichever row actually has focus.
    const focusedRow = e.target.closest?.('tr[data-app-id]');
    if (focusedRow) idx = rows.indexOf(focusedRow);
    if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); moveCursor(idx + 1); }
    if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); moveCursor(idx - 1); }
    if ((e.key === 'Enter' || e.key === 'o') && rows[idx]) { e.preventDefault(); location.hash = '#/review/' + rows[idx].getAttribute('data-app-id'); }
    if ((e.key === 'x' || (e.key === ' ' && focusedRow)) && rows[idx]) {
      if (e.key === ' ') e.preventDefault(); // selection toggle, not page scroll
      const cb = rows[idx].querySelector('.rowSel');
      if (cb) cb.checked = !cb.checked;
    }
  };
  document.addEventListener('keydown', _queueKeydownHandler);
}

// ── 8. REVIEWER SPLIT-PANE (§9.1 / §2.5) ─────────────────────────────────
function renderReviewerSplit({ id }) {
  if (!P.state.user) { P.navigate('#/'); return; }
  const a = P.state.spaceRequests.find(x => x.id === id);
  if (!a) { renderNotFound('Antrag nicht gefunden.', { activeNav: 'queue' }); return; }
  shell({ activeNav: 'queue', breadcrumb: [{ href: '#/queue', label: P.t('nav.queue') }, { label: a.id }], deptSub: P.t('org.portal') + ' · GS-Prüfer/in' });

  const initialMarks = a._marks || {};

  document.getElementById('page-body').innerHTML = `
    ${P.renderShareBar()}
    <section class="section">
      <div class="container">
        <header class="page-header">
          <div>
            <h1 class="h1 page-header__title">${a.id} — Prüfung</h1>
            <p class="page-header__sub">${P.escapeHtml(P.state.users.find(u => u.id === a.submitterId)?.name || '')} (${a.submitterVe}) · ${P.escapeHtml(a.address)}</p>
          </div>
        </header>
        ${P.renderPipeline(a)}

        <div class="reviewer-split">
          <div>
            <div class="card">
              <h2 class="card__title">Formular (schreibgeschützt)</h2>
              <div class="table-wrapper">
                <table class="table">
                  <tr><th>Antragstyp</th><td>${a.type}</td></tr>
                  <tr><th>VE / DEP</th><td>${a.submitterVe} ${a.submitterDep ? '/ ' + a.submitterDep : ''}</td></tr>
                  <tr><th>Adresse</th><td>${P.escapeHtml(a.address)}</td></tr>
                  ${a.assetKey ? `<tr><th>SAP / EGID</th><td><code>${a.assetKey.bk}/${a.assetKey.we}/${a.assetKey.obj}</code> · ${a.egid}</td></tr>` : ''}
                  ${a.naw ? `<tr><th>NAW-Klasse</th><td>${a.naw.class} (Konfidenz ${Math.round((a.naw.confidence || 0) * 100)} %)</td></tr>` : ''}
                  ${a.fte ? `<tr><th>FTE / AP</th><td>${a.fte} / ${a.workstations}</td></tr>` : ''}
                  ${a.hnf2 ? `<tr><th>HNF2 / GF</th><td>${a.hnf2} m² / ${a.gf} m²</td></tr>` : ''}
                  ${a.operatingCosts ? `<tr><th>UK-Kosten</th><td>${P.formatChf(a.operatingCosts)}</td></tr>` : ''}
                  ${a.extensionData?.berths ? `<tr><th>SEM Schlafplätze</th><td>${a.extensionData.berths} (Pauschale ${P.formatChf(a.extensionData.investmentLumpSum)})</td></tr>` : ''}
                  <tr><th>Anhänge</th><td>${(a.attachments || []).map(x => x.name).join(' · ') || 'keine'}</td></tr>
                </table>
              </div>
            </div>
          </div>

          <aside class="reviewer-marks" aria-label="Prüfung">
            <h2 class="reviewer-marks__heading">Prüfung pro Feld</h2>
            ${['type', 've', 'address', 'naw', 'fte', 'hnf2', 'ukKosten', 'attachments'].map(field => `
              <div class="reviewer-marks__row">
                <span>${fieldLabel(field)}</span>
                <div class="mark-buttons" data-field="${field}">
                  ${['ok', 'nok', 'comment'].map(m => `
                    <button class="mark-button ${initialMarks[field] === m ? 'mark-button--active-' + m : ''}" type="button" data-mark="${m}" aria-pressed="${initialMarks[field] === m ? 'true' : 'false'}">${m === 'ok' ? P.icon('check') + ' OK' : m === 'nok' ? P.icon('xMark') + ' NoK' : P.icon('commentDots') + ' OK mit Komm.'}</button>
                  `).join('')}
                </div>
              </div>
            `).join('')}

            <hr class="rule">
            <div class="form-field">
              <label class="form-field__label">Gesamtentscheid</label>
              <fieldset class="option-group">
                <legend class="sr-only">Gesamtentscheid</legend>
                <label class="option-group__item"><input type="radio" name="decision" value="genehmigen"> <span>Genehmigen</span></label>
                <label class="option-group__item"><input type="radio" name="decision" value="auflage"> <span>Mit Auflagen</span></label>
                <label class="option-group__item"><input type="radio" name="decision" value="ablehnen"> <span>Ablehnen</span></label>
              </fieldset>
            </div>
            <div class="form-field">
              <label class="form-field__label" for="reviewBegr">Begründung <span class="form-field__required">*</span> <span class="form-field__hint--inline">(VwVG Art. 35 — verpflichtend)</span></label>
              <textarea class="form-field__textarea" id="reviewBegr" aria-required="true"></textarea>
            </div>

            <div class="reviewer-marks__actions">
              <button class="btn btn--filled btn--sm" type="button" id="saveDecision">Entscheid speichern</button>
              <button class="btn btn--outline btn--sm" type="button">An Antragsteller zurück</button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `;
  wireReviewerSplit(a);
}

function fieldLabel(f) {
  return ({
    type: 'Antragstyp', ve: 'VE / DEP', address: 'Adresse', naw: 'NAW-Klasse',
    fte: 'FTE / AP', hnf2: 'HNF2 / GF', ukKosten: 'UK-Kosten', attachments: 'Anhänge'
  })[f] || f;
}

function wireReviewerSplit(a) {
  a._marks = a._marks || {};
  document.querySelectorAll('.mark-buttons').forEach(group => {
    const field = group.getAttribute('data-field');
    group.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        const mark = b.getAttribute('data-mark');
        a._marks[field] = a._marks[field] === mark ? null : mark;
        group.querySelectorAll('button').forEach(x => {
          const m = x.getAttribute('data-mark');
          x.className = 'mark-button' + (a._marks[field] === m ? ' mark-button--active-' + m : '');
          // A11Y-012: keep the ARIA toggle state in sync with the class swap —
          // same pattern as the filter chips (aria-pressed mirrors selection).
          x.setAttribute('aria-pressed', String(a._marks[field] === m));
        });
      });
    });
  });
  // A11Y-015: clear a field's persistent error as soon as it is corrected
  // (same contract as the wizard step-1 address field).
  const decisionAnchor = () => document.querySelector('input[name="decision"]');
  document.querySelectorAll('input[name="decision"]').forEach(r => {
    r.addEventListener('change', () => setFieldError(decisionAnchor(), null));
  });
  document.getElementById('reviewBegr').addEventListener('input', e => {
    if (e.target.value.trim()) setFieldError(e.target, null);
  });
  document.getElementById('saveDecision').addEventListener('click', () => {
    const dec = document.querySelector('input[name="decision"]:checked')?.value;
    const begrEl = document.getElementById('reviewBegr');
    const begr = begrEl.value.trim();
    // A11Y-015: the toast alone vanishes after ~4 s and never referenced the
    // field. Persist the error at the control (aria-invalid + aria-describedby
    // via setFieldError) and move focus to the first invalid control.
    setFieldError(decisionAnchor(), dec ? null : 'Bitte Gesamtentscheid wählen.');
    setFieldError(begrEl, begr ? null : 'Bitte Begründung eintragen (Pflicht).');
    if (!dec) { P.toast('Bitte Gesamtentscheid wählen.'); decisionAnchor().focus(); return; }
    if (!begr) { P.toast('Bitte Begründung eintragen (Pflicht).'); begrEl.focus(); return; }
    a.history = a.history || [];
    a.history.push({ ts: new Date().toISOString(), actor: P.state.user.name, action: `Entscheid: ${dec} — "${begr}"` });
    if (dec === 'genehmigen') {
      a.status = 'approved';
      setTimeout(() => {
        a.status = 'in_project';
        a.projectNumber = 'BM-2026-00' + Math.floor(Math.random() * 900 + 100);
        P.toast(`ePPM-Übergabe erfolgreich: ${a.projectNumber}`, 'success');
      }, 2000);
    } else if (dec === 'auflage') {
      a.status = 'clarification';
      a.reviewerJustification = begr;
      a.conditions = a.conditions || [{ field: 'fte', comment: begr, done: false }];
    } else {
      a.status = 'rejected';
    }
    P.toast('Entscheid gespeichert.', 'success');
    P.navigate('#/queue');
  });
}

// ── 9. LIEGENSCHAFTEN — Meine Immobilien (list) ──────────────────────────
// Role-scoped tenancy list for the properties surface: BBL roles see the
// whole portfolio; tenant roles see only their own VE's Mietverhältnisse.
// Extracted so the live search preview can re-filter without re-deriving it.
function getScopedTenancies() {
  if (!P.state.user) return [];
  const ve = P.state.user.ve;
  const isBblView = ['BBL-PFM', 'BBL-Campus', 'Auditor'].includes(P.state.user.activeRole);
  return isBblView ? P.state.tenancies : P.state.tenancies.filter(t => t.ve === ve || t.dep === ve);
}

// Inner HTML for the #propertiesResults region (everything below the toolbar
// + filter pills). Shared by the initial render and the live search preview
// so a typed preview is pixel-identical to the committed render. Map view
// returns the canvas; initPropertiesMap wires it up separately.
function propertiesResultsHTML(view, filtered, page, query, ort, sort) {
  if (filtered.length === 0) {
    return `
      <div class="empty-state empty-state--inset">
        <h2 class="empty-state__title">Keine Treffer${query ? ` für „${P.escapeHtml(query)}"` : ''}</h2>
        <p class="empty-state__lead">Versuchen Sie es mit anderen Filtern.</p>
        <div class="empty-state__cta">
          <!-- sel: {} — the reset must also clear the tree selection, like the
               pill row's clear-all; the default keeps it (review B14). -->
          <a href="${buildPropertiesHash({ view, page: 1, sel: {} })}" class="btn btn--outline">Filter zurücksetzen</a>
        </div>
      </div>`;
  }
  if (view === 'map') return renderMapView(filtered);
  const perPage = view === 'gallery' ? 12 : 25;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = filtered.slice((safePage - 1) * perPage, safePage * perPage);
  return `
    <div class="property-view property-view--${view}">
      ${view === 'gallery' ? renderGalleryView(pageItems) : renderListView(pageItems)}
    </div>
    ${renderPagination({
      current: safePage,
      totalPages,
      from: (safePage - 1) * perPage + 1,
      to: Math.min(safePage * perPage, filtered.length),
      totalItems: filtered.length,
      entitySingular: 'Liegenschaft',
      entityPlural: 'Liegenschaften',
      hrefFor: (p) => buildPropertiesHash({ view, q: query, ort, sort, page: p }),
    })}`;
}

// Country labels for the location tree + selection pill (data carries ISO
// codes; the BBL portfolio is federal-wide, so foreign missions may appear).
const COUNTRY_NAME = {
  CH: 'Schweiz', DE: 'Deutschland', FR: 'Frankreich', IT: 'Italien',
  AT: 'Österreich', US: 'USA', BR: 'Brasilien', JP: 'Japan', AU: 'Australien',
};
// Tree selection ⇄ URL: same query keys as the sister service-portal
// (#/app/portfolio?land=CH&region=TG&city=…&obj=…) so deep links transfer
// between the two prototypes. `region` maps onto the tenancy's canton.
function parseTreeSel(params) {
  const sel = {};
  if (params.land)   sel.country = params.land;
  if (params.region) sel.region  = params.region;
  if (params.city)   sel.city    = params.city;
  if (params.obj)    sel.id      = params.obj;
  return sel;
}
// Counts reflect search + Ort facet, deliberately WITHOUT the tree selection
// itself (upstream contract in js/spatial-tree.js — otherwise a click leaves
// only the selected branch showing «1», a navigational dead end). `liveQuery`
// lets the as-you-type preview feed its uncommitted search text.
function syncPropertiesTree(liveQuery) {
  const tree = document.querySelector('.pf-tree');
  if (!tree) return;
  const p = parseHashQuery(location.hash);
  const query = liveQuery !== undefined ? liveQuery : (p.q || '').toLowerCase().trim();
  syncTreeCounts(tree,
    filterTenancies(getScopedTenancies(), query, (p.ort || '').trim()),
    (t) => [t.country, t.canton, t.city], (t) => t.id);
}
// In-place refresh after a tree click (mirrors the sister portal's
// renderMain): the URL is updated via replaceState so the tree DOM — and with
// it every expanded branch — survives; results, pills, count and tree counts
// re-render around it. Full route re-renders (back/forward, toolbar controls)
// rebuild the tree and restore the selection from the URL instead.
function refreshPropertiesResults(view) {
  const p = parseHashQuery(location.hash);
  const sel = parseTreeSel(p);
  const query = (p.q || '').toLowerCase().trim();
  const ort = (p.ort || '').trim();
  const sort = ['name','area','stations'].includes(p.sort) ? p.sort : 'name';
  const filtered = sortTenancies(filterTenancies(getScopedTenancies(), query, ort, sel), sort);
  if (view === 'map') {
    if (_propertiesMapApplyFilter) _propertiesMapApplyFilter(filtered);
  } else {
    const results = document.getElementById('propertiesResults');
    if (results) {
      results.innerHTML = propertiesResultsHTML(view, filtered, 1, p.q || '', ort, sort);
      wirePaginationInput();
    }
  }
  const pills = document.getElementById('propsActivePills');
  if (pills) pills.innerHTML = renderPropertiesFilterPills({ view, query: (p.q || '').trim(), ort, sort });
  // In-place refresh re-renders neither the bar nor its badge — keep the
  // filter count in step with the tree selection + Ort facet (review B13).
  setFilterCount('props', (Object.keys(sel).length ? 1 : 0) + (ort ? 1 : 0));
  syncPropertiesTree();
}

function renderProperties() {
  if (!P.state.user) { P.navigate('#/'); return; }
  shell({ activeNav: 'properties', breadcrumb: [{ label: P.t('nav.properties') }] });
  const ve = P.state.user.ve;
  const isBblView = ['BBL-PFM', 'BBL-Campus', 'Auditor'].includes(P.state.user.activeRole);
  const allTenancies = getScopedTenancies();

  // URL state: ?view=gallery|list|map · ?q=… · ?ort=… · ?sort=… · ?page=N
  // plus the tree selection ?land=…&region=…&city=…&obj=…
  const params = parseHashQuery(location.hash);
  const view = ['gallery','list','map'].includes(params.view) ? params.view : 'gallery';
  const query = (params.q || '').toLowerCase().trim();
  const ort = (params.ort || '').trim();
  const sort = ['name','area','stations'].includes(params.sort) ? params.sort : 'name';
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const sel = parseTreeSel(params);
  // ?sb=0 hides the location sidebar (visible by default) — carried in the
  // URL so the choice survives the full re-render every other control does.
  const sidebarVisible = params.sb !== '0';
  const filtered = sortTenancies(filterTenancies(allTenancies, query, ort, sel), sort);
  const perPage = view === 'gallery' ? 12 : view === 'list' ? 25 : Infinity;
  const totalPages = view === 'map' ? 1 : Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  // No count in the bar — the pagination footer below the results already
  // carries the «N von M» sentence, and stating it twice read as noise.

  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container">
        <header class="page-header">
          <div>
            <h1 class="h1 page-header__title">${P.t('props.title')}${isBblView ? ' (BBL)' : ''}</h1>
            <p class="page-header__sub">
              ${isBblView
                ? 'Alle vom BBL verwalteten Mietverhältnisse weltweit.'
                : `Mietverhältnisse Ihrer Verwaltungs­einheit <strong>${P.escapeHtml(ve)}</strong>.`
              }
            </p>
          </div>
        </header>

        ${allTenancies.length === 0 ? `
          <div class="empty-state">
            <h2 class="empty-state__title">Keine Mietverhältnisse erfasst</h2>
            <p class="empty-state__lead">Für Ihre Verwaltungs­einheit ist im BBL-Portfolio derzeit kein Mietverhältnis hinterlegt. Wenn das ein Fehler ist, kontaktieren Sie BBL-PFM.</p>
            <div class="empty-state__cta">
              <a href="#/wizard/1" class="btn btn--filled">Bedarf anmelden</a>
              <a href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener" class="btn btn--bare link--external">Kontakt BBL</a>
            </div>
          </div>
        ` : `
          ${propertiesToolbar({ view, query, sort, sidebarVisible,
            locFilterCount: (Object.keys(sel).length ? 1 : 0) + (ort ? 1 : 0) })}
          <div id="propsActivePills">${renderPropertiesFilterPills({ view, query, ort, sort })}</div>

          <div class="pf-layout${sidebarVisible ? '' : ' pf-layout--sidebar-hidden'}">
            <aside class="pf-sidebar" id="props-sidebar" aria-label="Standorte">
              <!-- No «Auswahl zurücksetzen» here: the tree selection appears
                   as a removable pill in the active-filter row above, which is
                   where every other filter is cleared (upstream rationale,
                   service-portal portfolio.js). -->
              <div class="pf-sidebar__head">
                <h2 class="pf-sidebar__title">Standorte</h2>
                <button type="button" class="pf-sidebar__close" aria-label="Standorte ausblenden">${P.icon('x')}</button>
              </div>
              ${treeHTML(allTenancies, {
                ariaLabel: 'Standorte',
                levels: [
                  { key: 'country', icon: 'globe', word: 'Land', label: v => COUNTRY_NAME[v] || v },
                  { key: 'canton', attr: 'region', icon: 'map', word: 'Kanton' },
                  { key: 'city', icon: 'mapMarker', word: 'Ort' },
                ],
                leaf: {
                  icon: () => 'building', word: 'Liegenschaft',
                  label: t => t.buildingName, objId: t => t.id,
                  sort: (a, b) => a.buildingName.localeCompare(b.buildingName, 'de'),
                },
              })}
            </aside>
            <div class="pf-main">
              <div id="propertiesResults">
                ${propertiesResultsHTML(view, filtered, safePage, query, ort, sort)}
              </div>
            </div>
          </div>
        `}
      </div>
    </section>
  `;

  if (view === 'map') initPropertiesMap(filtered);
  wirePropertiesToolbar(view);

  const sidebar = document.querySelector('.pf-sidebar');
  if (sidebar) {
    wireTree(sidebar, {
      onSelect: (nextSel) => {
        const p = parseHashQuery(location.hash);
        // replaceState, not location.hash: the tree DOM (expanded branches)
        // must survive a selection click — see refreshPropertiesResults.
        history.replaceState(null, '',
          buildPropertiesHash({ view, q: p.q || '', ort: p.ort || '', sort: p.sort || 'name', page: 1, sel: nextSel }));
        refreshPropertiesResults(view);
      },
    });
    restoreTreeSelection(sidebar, sel);
    syncPropertiesTree();
  }
}


// Parse `?key=value&key2=value2` out of a hash like `#/properties?view=list&q=eich&page=2`.
function parseHashQuery(hash) {
  const qIdx = hash.indexOf('?');
  if (qIdx < 0) return {};
  const out = {};
  hash.slice(qIdx + 1).split('&').forEach(pair => {
    if (!pair) return;
    const [k, v = ''] = pair.split('=');
    // A malformed escape — `#/…?q=100%` — must not take down the route:
    // skip the broken pair, keep the rest (review B19).
    try {
      out[decodeURIComponent(k)] = decodeURIComponent(v);
    } catch { /* skip malformed pair */ }
  });
  return out;
}
function buildPropertiesHash({ view, q, ort, sort, page, sel, sb }) {
  // `sel` (tree selection) and `sb` (sidebar visibility) default to whatever
  // the current URL carries, so every existing caller — pills, pagination,
  // sort, view switch — preserves them without knowing about them. Pass
  // `sel: {}` to clear the selection; `sb: true/false` to set visibility.
  const s = sel !== undefined ? sel : parseTreeSel(parseHashQuery(location.hash));
  const sbHidden = sb !== undefined ? !sb : parseHashQuery(location.hash).sb === '0';
  const parts = [];
  if (view)        parts.push('view=' + encodeURIComponent(view));
  if (q)           parts.push('q='    + encodeURIComponent(q));
  if (ort)         parts.push('ort='  + encodeURIComponent(ort));
  if (s.country)   parts.push('land='   + encodeURIComponent(s.country));
  if (s.region)    parts.push('region=' + encodeURIComponent(s.region));
  if (s.city)      parts.push('city='   + encodeURIComponent(s.city));
  if (s.id)        parts.push('obj='    + encodeURIComponent(s.id));
  if (sbHidden)    parts.push('sb=0');
  if (sort && sort !== 'name') parts.push('sort=' + encodeURIComponent(sort));
  if (page && page > 1) parts.push('page=' + page);
  parts.push('lang=' + state.lang);   // keep the active language in shareable URLs
  return '#/properties?' + parts.join('&');
}

// Ort replaces the former PFM-Kategorie as the filter dimension: the category
// was dropped from the data, and location is the axis a reader actually
// narrows a federal portfolio by.
function filterTenancies(list, q, ort, sel = {}) {
  let out = list;
  // Tree selection (country › canton › city › single object). `region` is the
  // URL/selection key for the canton level — same vocabulary as the sister
  // service-portal explorers.
  out = out.filter(t => (!sel.id || t.id === sel.id)
    && (!sel.country || t.country === sel.country)
    && (!sel.region || t.canton === sel.region)
    && (!sel.city || t.city === sel.city));
  if (ort) out = out.filter(t => t.city === ort);
  if (q) {
    out = out.filter(t => {
      const hay = [t.buildingName, t.address, formatAssetKey(t.assetKey), t.egid, t.ve, t.dep]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  return out;
}

// Sort dimensions offered by the catalogue bar. Name is the default: a
// portfolio is browsed by object, not by size.
function sortTenancies(list, sort) {
  const out = [...list];
  if (sort === 'area')     return out.sort((x, y) => (y.hnf2 || 0) - (x.hnf2 || 0));
  if (sort === 'stations') return out.sort((x, y) => (y.workstations || 0) - (x.workstations || 0));
  return out.sort((x, y) => String(x.buildingName).localeCompare(String(y.buildingName), 'de-CH'));
}

// The properties toolbar IS the shared catalogue bar (js/catalogue-bar.js):
// search · count · sort · filter · view switch, in the CD order. The one
// portal-specific part is the search field, which doubles as a swisstopo
// place combobox — passed through as extra input attributes plus the listbox
// slot, so the shared component keeps owning the row while this page keeps
// owning its suggestions.
function propertiesToolbar({ view, query, sort, sidebarVisible, locFilterCount }) {
  return catalogueBar({
    id: 'props',
    search: true,
    q: query,
    searchLabel: P.t('props.searchLabel'),
    placeholder: P.t('props.searchPlaceholder'),
    inputAttrs: 'role="combobox" aria-autocomplete="list" aria-controls="propertiesSearchOptions" aria-expanded="false"',
    searchSlot: `<ul class="combobox__list" id="propertiesSearchOptions" role="listbox" aria-label="Vorschläge" hidden></ul>`,
    sort: {
      value: sort,
      options: [
        ['name',     P.t('props.sortName')],
        ['area',     P.t('props.sortArea')],
        ['stations', P.t('props.sortStations')],
      ],
    },
    /* The filter toggle discloses the LOCATION SIDEBAR (visible by default)
       instead of opening a radio panel — the pf-tree owns location filtering,
       and a second Ort facet in a drawer duplicated it. The badge counts
       active location filters (tree selection / legacy ?ort) so a hidden
       sidebar never hides active filter state. */
    filterLabel: P.t('props.filter'),
    filterCount: locFilterCount,
    panelOpen: sidebarVisible,
    filterControls: 'props-sidebar',
    view,
    views: [
      ['gallery', P.t('props.view.gallery'), 'grid'],
      ['list',    P.t('props.view.list'),    'list'],
      ['map',     P.t('props.view.map'),     'map'],
    ],
  });
}


function renderPropertiesFilterPills({ view, query, ort, sort }) {
  const active = [];
  if (query) active.push({ key: 'q',   label: P.t('props.search'), value: query });
  if (ort)   active.push({ key: 'ort', label: P.t('props.place'),  value: ort });
  // Tree selection appears as a removable pill here — this row is where every
  // filter is cleared (the sidebar itself carries no reset control).
  const sel = parseTreeSel(parseHashQuery(location.hash));
  if (Object.keys(sel).length) {
    const obj = sel.id ? getScopedTenancies().find(x => x.id === sel.id) : null;
    const value = sel.id ? ((obj && obj.buildingName) || sel.id)
      : sel.city || sel.region || (COUNTRY_NAME[sel.country] || sel.country);
    active.push({ key: 'sel', label: 'Auswahl', value });
  }
  // Shared pill markup (catalogue-bar.js, review M-PILLS) in its
  // hash-navigated flavour: removal is an <a href> without that facet.
  const hrefWithout = (key) => {
    const params = parseHashQuery(location.hash);
    const next = { view, q: params.q || '', ort: params.ort || '', sort, page: 1 };
    if (key === 'sel') next.sel = {}; else next[key] = '';
    return buildPropertiesHash(next);
  };
  return filterPills({
    pills: active,
    hrefFor: hrefWithout,
    clearAllHref: buildPropertiesHash({ view, sort, page: 1, sel: {} }),
    clearAllLabel: P.t('props.resetFilters'),
  });
}

function wirePropertiesToolbar(view) {
  // The shared bar owns search submit, sort and the view switch; it is given
  // this route's query-parameter vocabulary through `hashFor`. Everything
  // else here is properties-specific: the swisstopo combobox and the Ort
  // radios in the filter panel.
  wireCatalogueBar({
    id: 'props',
    hashFor: (patch) => {
      const p = parseHashQuery(location.hash);
      return buildPropertiesHash({
        view: patch.view !== undefined ? patch.view : view,
        q:    patch.q    !== undefined ? patch.q    : (p.q || ''),
        ort:  patch.ort  !== undefined ? patch.ort  : (p.ort || ''),
        sort: patch.sort !== undefined ? patch.sort : (p.sort || 'name'),
        page: patch.page || 1,
      });
    },
  });
  wirePropertiesSearchCombobox(view);
  // The filter button discloses the location sidebar in place (no navigation
  // — the tree DOM and its expanded branches survive). Shared toggle + X
  // mechanics live in catalogue-bar.js (review M-SIDEBAR); replaceState here
  // keeps the visibility in the URL so it survives the next full re-render.
  wireSidebarToggle({
    buttonId: 'props-filter',
    onToggle: (open) => {
      const p = parseHashQuery(location.hash);
      history.replaceState(null, '', buildPropertiesHash({
        view, q: p.q || '', ort: p.ort || '', sort: p.sort || 'name',
        page: Math.max(1, parseInt(p.page || '1', 10) || 1), sb: open,
      }));
      // Reopening the sidebar must restore the tree's roving tab stop + counts —
      // both syncers early-return while every row is display:none (review B12).
      if (open) syncPropertiesTree();
    },
  });
  // CD Bund pagination input — generic helper picks up the hrefFor
  // closure stashed by renderPagination.
  wirePaginationInput();
}

// Live preview filter — narrows the visible results AS YOU TYPE without
// committing to the URL (the "soft filter" half of the search UX). Gallery /
// list re-render the #propertiesResults region (page 1); map view just
// toggles property-marker visibility so the basemap isn't torn down per
// keystroke. The hard filter (URL + pills) only commits on Enter / pick.
function previewPropertiesFilter(view) {
  const input = document.getElementById('props-q');
  if (!input) return;
  const queryRaw = input.value.trim();
  const query = queryRaw.toLowerCase();
  const p = parseHashQuery(location.hash);
  const ort = p.ort || '';
  // Sort the preview like the committed render — an unsorted preview visibly
  // reshuffled the list per keystroke — and whitelist p.sort so an arbitrary
  // URL value never reaches the sorter or the templates (review B10, m8).
  const sort = ['name','area','stations'].includes(p.sort) ? p.sort : 'name';
  const filtered = sortTenancies(filterTenancies(getScopedTenancies(), query, ort, parseTreeSel(p)), sort);
  // Tree counts follow the live keystroke too (they reflect search + facets,
  // never the tree's own selection).
  syncPropertiesTree(query);
  if (view === 'map') {
    if (_propertiesMapApplyFilter) _propertiesMapApplyFilter(filtered);
    return;
  }
  const results = document.getElementById('propertiesResults');
  if (results) {
    results.innerHTML = propertiesResultsHTML(view, filtered, 1, queryRaw, ort, sort);
    wirePaginationInput();
  }
}

// swisstopo location origins → short German labels for the suggestion's
// secondary line (geo.admin.ch SearchServer `origin` field).
const SWISSTOPO_ORIGIN_LABEL = {
  address: 'Adresse', gg25: 'Gemeinde', district: 'Bezirk', kantone: 'Kanton',
  zipcode: 'PLZ', gazetteer: 'Ort', parcel: 'Parzelle',
};
// Strip the HTML markup geo.admin.ch wraps around its labels (<b>, <i>) and
// decode entities — read as text only, never re-injected as HTML.
function stripHtml(s) {
  const tmp = document.createElement('div');
  tmp.innerHTML = s || '';
  return (tmp.textContent || '').replace(/\s+/g, ' ').trim();
}
// Query the public geo.admin.ch SearchServer for locations. No API key; sr=4326
// gives WGS84 lat/lon ready for MapLibre. Degrades to [] on any failure
// (offline, CORS, abort) so the DB suggestions + demo never break.
async function fetchSwisstopo(query) {
  if (!query || query.length < 2) return [];
  try {
    _swisstopoController?.abort();
    _swisstopoController = new AbortController();
    const url = 'https://api3.geo.admin.ch/rest/services/ech/SearchServer'
      + '?type=locations&sr=4326&limit=6&searchText=' + encodeURIComponent(query);
    const res = await fetch(url, { signal: _swisstopoController.signal });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .map(r => ({
        label: stripHtml(r.attrs?.label),
        origin: r.attrs?.origin || '',
        lng: r.attrs?.lon,
        lat: r.attrs?.lat,
      }))
      .filter(r => r.label && typeof r.lng === 'number' && typeof r.lat === 'number');
  } catch {
    return [];
  }
}

// Combobox controller for the properties search field. One input, two jobs:
// soft live-filter (previewPropertiesFilter) + a grouped suggestion dropdown
// (DB Liegenschaften → detail view, swisstopo Orte → map locator pin).
function wirePropertiesSearchCombobox(view) {
  const input = document.getElementById('props-q');
  const list = document.getElementById('propertiesSearchOptions');
  if (!input || !list) return;
  let dbItems = [], locItems = [], remotePending = false, activeIndex = -1;
  let tFilter = null, tRemote = null;

  const optionEls = () => Array.from(list.querySelectorAll('.combobox__option'));
  const open = () => { list.hidden = false; input.setAttribute('aria-expanded', 'true'); };
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); activeIndex = -1; input.removeAttribute('aria-activedescendant'); };

  function render() {
    const parts = [];
    if (dbItems.length) {
      parts.push('<li class="combobox__group" role="presentation">Liegenschaften</li>');
      dbItems.forEach(t => parts.push(
        `<li class="combobox__option" role="option" data-kind="property" data-id="${P.escapeHtml(t.id)}">
          <span class="combobox__option-primary">${P.escapeHtml(t.buildingName)}</span>
          <span class="combobox__option-secondary">${P.escapeHtml(t.address)} · ${formatAssetKey(t.assetKey)}</span>
        </li>`));
    }
    if (remotePending) {
      parts.push('<li class="combobox__group" role="presentation">Orte · swisstopo</li>');
      parts.push(`<li class="combobox__hint" role="presentation">${P.icon('spinner', 'combobox__spinner')} Orte werden gesucht …</li>`);
    } else if (locItems.length) {
      parts.push('<li class="combobox__group" role="presentation">Orte · swisstopo</li>');
      locItems.forEach(l => parts.push(
        `<li class="combobox__option combobox__option--location" role="option" data-kind="location" data-lng="${l.lng}" data-lat="${l.lat}" data-label="${P.escapeHtml(l.label)}">
          <span class="combobox__option-primary">${P.icon('mapMarker')} ${P.escapeHtml(l.label)}</span>
          <span class="combobox__option-secondary">${P.escapeHtml(SWISSTOPO_ORIGIN_LABEL[l.origin] || 'swisstopo')}</span>
        </li>`));
    }
    if (!parts.length) { list.innerHTML = ''; close(); return; }
    list.innerHTML = parts.join('');
    // A11Y-014: every option needs an id so aria-activedescendant can point
    // at the active one while arrowing (WAI-ARIA APG combobox pattern).
    optionEls().forEach((o, i) => { o.id = 'propertiesSearchOption-' + i; o.setAttribute('aria-selected', 'false'); });
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');
    open();
  }

  function refreshDb() {
    const q = input.value.trim().toLowerCase();
    const ort = parseHashQuery(location.hash).ort || '';
    dbItems = q ? filterTenancies(getScopedTenancies(), q, ort).slice(0, 6) : [];
  }
  async function refreshRemote() {
    const q = input.value.trim();
    if (q.length < 2) { locItems = []; remotePending = false; render(); return; }
    const results = await fetchSwisstopo(q);
    if (input.value.trim() !== q) return;   // a newer keystroke superseded this
    locItems = results;
    remotePending = false;
    render();
  }

  function pick(opt) {
    close();
    if (opt.dataset.kind === 'property') {
      P.navigate('#/properties/' + opt.dataset.id);
      return;
    }
    const lng = parseFloat(opt.dataset.lng), lat = parseFloat(opt.dataset.lat);
    const label = opt.dataset.label || '';
    if (view === 'map' && _propertiesMap) {
      input.value = '';
      // Un-filter the pins: re-run the live preview with the now-empty
      // query, which re-feeds the clustered source with the full set.
      previewPropertiesFilter(view);
      dropLocatorPin(lng, lat, label);
    } else {
      // Switch to map view, then drop the pin once the map has loaded.
      // Carry the active sort along — omitting it silently reset a
      // non-default sort on every place pick (review B9).
      _pendingLocator = { lng, lat, label };
      const p = parseHashQuery(location.hash);
      location.hash = buildPropertiesHash({ view: 'map', ort: p.ort || '', sort: p.sort || 'name' });
    }
  }

  function commit() {
    close();
    // Pass the sort through — committing a search must not reset it (review B9).
    const p = parseHashQuery(location.hash);
    location.hash = buildPropertiesHash({ view, q: input.value.trim(), ort: p.ort || '', sort: p.sort || 'name', page: 1 });
  }

  function moveActive(delta) {
    const opts = optionEls();
    if (!opts.length) return;
    if (list.hidden) open();
    activeIndex = Math.max(0, Math.min(opts.length - 1, activeIndex + delta));
    // A11Y-014: mirror the visual highlight in ARIA state — aria-selected on
    // the option, aria-activedescendant on the input — so screen readers
    // announce the option under the cursor instead of hearing nothing.
    opts.forEach((o, i) => {
      o.classList.toggle('combobox__option--active', i === activeIndex);
      o.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false');
    });
    input.setAttribute('aria-activedescendant', opts[activeIndex].id);
    opts[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', () => {
    locItems = [];                                              // drop stale place results
    remotePending = input.value.trim().length >= 2;
    clearTimeout(tFilter);
    tFilter = setTimeout(() => { previewPropertiesFilter(view); refreshDb(); render(); }, 140);
    clearTimeout(tRemote);
    tRemote = setTimeout(refreshRemote, 320);
  });
  // mousedown (not click) so the pick beats the input's blur-close.
  list.addEventListener('mousedown', e => {
    const opt = e.target.closest('.combobox__option');
    if (!opt) return;
    e.preventDefault();
    pick(opt);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown')      { e.preventDefault(); moveActive(+1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter') {
      const opts = optionEls();
      if (activeIndex >= 0 && opts[activeIndex]) { e.preventDefault(); pick(opts[activeIndex]); }
      else { e.preventDefault(); commit(); }
    } else if (e.key === 'Escape')  { close(); }
  });
  input.addEventListener('blur', () => setTimeout(close, 150));
  // Open the dropdown again if the user re-focuses a non-empty field.
  input.addEventListener('focus', () => { if (dbItems.length || locItems.length) render(); });
}

// Drop the single transient swisstopo locator pin on the portfolio map and
// fly to it. Distinct from the red property teardrop (secondary-colour pin)
// so a "place" never reads as a portfolio object. Replaces any prior pin.
function dropLocatorPin(lng, lat, label) {
  if (!_propertiesMap) return;
  loadMapLibre().then(maplibregl => {
    if (!_propertiesMap) return;
    if (_locatorMarker) { _locatorMarker.remove(); _locatorMarker = null; }
    const el = document.createElement('div');
    el.className = 'locator-marker';
    el.innerHTML = '<span class="locator-marker__pin"></span>';
    const popup = new maplibregl.Popup({ offset: 26, closeButton: true, maxWidth: '260px' })
      .setHTML(`<div class="locator-popup"><p class="locator-popup__label">${P.escapeHtml(label)}</p><p class="locator-popup__meta">swisstopo · Standort</p></div>`);
    _locatorMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lng, lat]).setPopup(popup).addTo(_propertiesMap);
    _propertiesMap.flyTo({ center: [lng, lat], zoom: 14, duration: 800 });
    _locatorMarker.togglePopup();
  });
}

function renderGalleryView(items) {
  // First 3 cards sit above the fold on a desktop 3-column grid and on
  // mobile single-column. Pass the index so `propertyCard` can flip
  // `loading="eager"` for those, sparing them the lazy-load handshake
  // and improving LCP.
  return `<div class="property-grid">${items.map((t, i) => propertyCard(t, i)).join('')}</div>`;
}

function renderListView(items) {
  return `
    <div class="property-list-wrap">
      <table class="table table--zebra table--rows-clickable property-list" aria-label="Liegenschaften">
        <thead>
          <tr>
            <th scope="col">SAP-WE</th>
            <th scope="col">Objekt</th>
            <th scope="col">Adresse</th>
            <th scope="col" class="numeric">HNF2</th>
            <th scope="col" class="numeric">AP</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(t => `
            <!-- escapeJs: t.id lands in a JS string literal inside the
                 onclick/onkeydown attributes (review m2). -->
            <tr onclick="location.hash='#/properties/${P.escapeJs(t.id)}'" tabindex="0"
                onkeydown="if(event.key==='Enter')location.hash='#/properties/${P.escapeJs(t.id)}'"
                aria-label="Mietverhältnis ${P.escapeHtml(t.buildingName)} öffnen">
              <td><code>${formatAssetKey(t.assetKey)}</code></td>
              <td><strong>${P.escapeHtml(t.buildingName)}</strong></td>
              <td>${P.escapeHtml(t.address)}</td>
              <td class="numeric">${t.hnf2}</td>
              <td class="numeric">${t.workstations}</td>
              <td>${t.openIssues > 0
                ? `<span class="badge badge--warning">${t.openIssues} offen</span>`
                : `<span class="badge badge--success">ok</span>`}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderMapView(/* items */) {
  return `
    <div class="property-map">
      <div class="property-map__canvas map-surface" id="propertiesMap" role="region" aria-label="Karte der Liegenschaften">
        ${renderMapLoading('Karte wird geladen')}
      </div>
    </div>
  `;
}

// CD Bund pagination — compact pattern from the federal design system
// (designsystem css/components/pagination.postcss, app/components/ch/components/Pagination.vue):
//   [count] [chevron-left] [page-input] von X Seiten [chevron-right]
// Anchor-based chevrons so middle-click + share + back/forward all work;
// the page-input is an editable number field — submit on Enter or blur
// to jump directly to a page (the only scalable affordance at thousands
// of pages, where a list of numbered buttons stops working).
// Rendered unconditionally — federal data sets scale to thousands of
// records, so a persistent pagination footer is a load-bearing
// affordance even when the current filter happens to return ≤ 1 page.
// Generic across routes: caller passes `hrefFor: (page) => string` to
// build URLs, plus `entitySingular`/`entityPlural` for the count label
// ("1 Antrag" / "1–12 von 247 Anträgen" / "Keine Anträge"). The de-CH
// thousands separator keeps four-digit totals legible (e.g. "1'247").
// The hrefFor closure is stashed in a module-level Map keyed by
// `inputId` so `wirePaginationInput` can navigate without round-tripping
// the URL through a fragile data-attribute template.
const _paginationHrefBuilders = new Map();
// ONE definition of the CD Bund compact pagination markup (count line ·
// chevron-prev · page input · "von X Seiten" · chevron-next), shared by every
// paginated surface so the look + pluralisation never diverge. `nav` selects
// the control mechanism:
//   { kind: 'link', hrefFor }  → <a href> prev/next  (hash-navigated lists)
//   { kind: 'button' }         → <button data-step> prev/next (in-place lists)
function paginationShell({ current, totalPages, from, to, totalItems, entitySingular, entityPlural, entityPluralDative, inputId, nav }) {
  const fmt = (n) => n.toLocaleString('de-CH');
  // German dative plural for the "von X …" count (e.g. Dokumente → Dokumenten);
  // defaults to the nominative plural for nouns that don't decline (Liegenschaften).
  const dative = entityPluralDative || entityPlural;
  const countText = totalItems === 0
    ? `Keine ${entityPlural}`
    : totalItems === 1
      ? `1 ${entitySingular}`
      : `${fmt(from)}–${fmt(to)} von ${fmt(totalItems)} ${dative}`;
  const ctrl = (step, disabled, label, iconName) => nav.kind === 'link'
    ? `<a class="btn btn--outline btn--icon-only" href="${nav.hrefFor(step < 0 ? Math.max(1, current - 1) : Math.min(totalPages, current + 1))}" aria-label="${label}"
         ${disabled ? 'aria-disabled="true" tabindex="-1"' : ''}>${P.icon(iconName)}</a>`
    : `<button class="btn btn--outline btn--icon-only" type="button" data-step="${step}" aria-label="${label}"
              ${disabled ? 'disabled' : ''}>${P.icon(iconName)}</button>`;
  return `
    <nav class="pagination" role="navigation" aria-label="Seitennavigation">
      <span class="pagination__count" aria-live="polite">${countText}</span>
      ${ctrl(-1, current <= 1, 'Vorherige Seite', 'chevronLeft')}
      <input class="pagination__input" type="number" inputmode="numeric"
             id="${inputId}" min="1" max="${totalPages}" value="${current}"
             aria-label="Seite auswählen">
      <span class="pagination__text">von ${totalPages} Seite${totalPages === 1 ? '' : 'n'}</span>
      ${ctrl(1, current >= totalPages, 'Nächste Seite', 'chevronRight')}
    </nav>
  `;
}

// Hash-navigated pagination (properties, …): the shell with <a href> controls,
// plus the hrefFor closure registered for `wirePaginationInput`.
function renderPagination({ current, totalPages, from, to, totalItems, entitySingular, entityPlural, hrefFor, inputId }) {
  const id = inputId || 'paginationInput';
  _paginationHrefBuilders.set(id, hrefFor);
  return paginationShell({ current, totalPages, from, to, totalItems, entitySingular, entityPlural, inputId: id, nav: { kind: 'link', hrefFor } });
}

// Wire a paginationShell's page-input field, in one of two modes matching
// the shell's `nav` kinds (review M-PAGING):
//   hash mode (default)     — looks up the hrefFor closure from the Map
//     populated by `renderPagination` and navigates on Enter / change.
//   in-place mode (`onPage`) — reports the clamped page number to the caller
//     instead, and also binds the <button data-step> chevrons inside the
//     same <nav>. The clamp reads the input's `max` attribute, which
//     paginationShell stamps with the totalPages of the CURRENT render —
//     re-wired per render, so it never goes stale.
function wirePaginationInput(inputId, { onPage } = {}) {
  const id = inputId || 'paginationInput';
  const el = document.getElementById(id);
  if (!el) return;
  const hrefFor = _paginationHrefBuilders.get(id);
  if (!onPage && !hrefFor) return;
  const clamp = (n) => {
    const max = parseInt(el.getAttribute('max'), 10) || 1;
    return Math.max(1, Math.min(max, n));
  };
  const commit = (page) => {
    if (onPage) onPage(page);
    else location.hash = hrefFor(page);
  };
  const go = () => commit(clamp(parseInt(el.value, 10) || 1));
  el.addEventListener('change', go);
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); go(); }
  });
  if (onPage) {
    el.closest('nav')?.querySelectorAll('button[data-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        commit(clamp((parseInt(el.value, 10) || 1) + parseInt(btn.dataset.step, 10)));
      });
    });
  }
}

// MapLibre GL — loaded on demand only when the map view is active.
let _maplibreReady = null;
let _propertiesMap = null;
let _propertiesMarkers = [];
let _locatorMarker = null;        // single transient swisstopo location pin
let _pendingLocator = null;       // {lng,lat,label} to drop after switching to map view
let _propertiesMapApplyFilter = null;  // set by initPropertiesMap; re-feeds the clustered source on in-place filtering

// Route-change teardown for ALL MapLibre instances (called from handleHash).
// Every init also tears down its own previous instance, but that only runs
// when the SAME map type is re-entered — leaving a map route otherwise
// leaked the WebGL context, render loop and resize listeners of a canvas
// that is no longer in the document (browsers force-lose the oldest context
// past ~16, which manifests as a randomly blank map).
function teardownMaps() {
  if (_propertiesMap) { try { _propertiesMap.remove(); } catch { /* context gone */ } _propertiesMap = null; }
  _propertiesMarkers = [];
  _locatorMarker = null;
  _propertiesMapApplyFilter = null;
  if (_propertyDetailMap) { try { _propertyDetailMap.remove(); } catch { /* context gone */ } _propertyDetailMap = null; }
  if (_floorMap) { try { _floorMap.remove(); } catch { /* context gone */ } _floorMap = null; }
}

// Resolve a MapLibre cluster through its exact leaves first and expansion zoom
// second — ported verbatim from the sister service-portal
// (js/map/cluster-navigation.js): fitBounds over the leaves always shows
// exactly the clustered objects, while expansion zoom only indicates when
// THIS cluster splits (for co-located points that can be never).
async function navigateCluster({ source, clusterId, feature, map, LngLatBounds, isCurrent = () => true, onFailure = () => {} }) {
  let leavesError;
  try {
    const leaves = await Promise.resolve().then(() => source.getClusterLeaves(clusterId, Infinity, 0));
    if (!leaves || !leaves.length) throw new Error('cluster has no leaves');
    const bounds = new LngLatBounds();
    leaves.forEach((leaf) => bounds.extend(leaf.geometry.coordinates));
    map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 600 });
    return 'leaves';
  } catch (error) {
    leavesError = error;
  }
  try {
    const zoom = await Promise.resolve().then(() => source.getClusterExpansionZoom(clusterId));
    map.easeTo({ center: feature.geometry.coordinates, zoom });
    return 'expansion';
  } catch (expansionError) {
    if (isCurrent()) onFailure({ clusterId, leavesError, expansionError });
    return '';
  }
}
let _swisstopoController = null;  // aborts the previous in-flight swisstopo request
function renderMapLoading(label = 'Karte wird geladen') {
  return `
    <div class="map-loading" role="status" aria-live="polite">
      ${P.icon('spinner', 'map-loading__icon')}
      <span class="sr-only">${label}</span>
    </div>
  `;
}
function clearMapLoading(container) {
  container?.querySelector('.map-loading')?.remove();
}
function loadMapLibre() {
  if (_maplibreReady) return _maplibreReady;
  _maplibreReady = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
    s.onload = () => resolve(window.maplibregl);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _maplibreReady;
}
// German texts for MapLibre's built-in UI strings — the portal UI is German
// (Swiss orthography, ss never ß); MapLibre ships English defaults only.
// Shared by all three map instances (portfolio, Standort, Grundriss), so
// every vendor-rendered control announces German: zoom buttons, attribution
// toggle, popup close, marker fallback and the cooperative-gestures scrim
// (A11Y-017). Keys match MapLibre GL JS 4.x `defaultLocale`.
const MAP_COOP_LOCALE = {
  'AttributionControl.ToggleAttribution': 'Quellenangaben ein- oder ausblenden',
  'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl + Scrollen zum Zoomen der Karte',
  'CooperativeGesturesHandler.MacHelpText': '⌘ + Scrollen zum Zoomen der Karte',
  'CooperativeGesturesHandler.MobileHelpText': 'Karte mit zwei Fingern verschieben',
  'Map.Title': 'Karte',
  'Marker.Title': 'Kartenmarkierung',
  'NavigationControl.ResetBearing': 'Ausrichtung nach Norden zurücksetzen',
  'NavigationControl.ZoomIn': 'Hineinzoomen',
  'NavigationControl.ZoomOut': 'Herauszoomen',
  'Popup.Close': 'Popup schliessen',
};
// Custom MapLibre control: a single "reset to full extent" button.
// NavigationControl ships zoom in / out but no home/reset affordance, which
// users asked for to get back to the portfolio overview after panning away.
function makeMapHomeControl(onReset) {
  return {
    onAdd() {
      const wrap = document.createElement('div');
      wrap.className = 'maplibregl-ctrl maplibregl-ctrl-group';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'map-home-btn';
      btn.setAttribute('aria-label', 'Kartenansicht zurücksetzen');
      btn.title = 'Ansicht zurücksetzen';
      btn.innerHTML = P.icon('home');
      btn.addEventListener('click', onReset);
      wrap.appendChild(btn);
      this._wrap = wrap;
      return wrap;
    },
    onRemove() { this._wrap?.remove(); },
  };
}
function initPropertiesMap(items) {
  loadMapLibre().then(maplibregl => {
    const container = document.getElementById('propertiesMap');
    if (!container) return;
    // Tear down previous instance if the user toggled views without leaving the route
    if (_propertiesMap) { try { _propertiesMap.remove(); } catch {} _propertiesMap = null; _propertiesMarkers = []; _locatorMarker = null; }
    _propertiesMapApplyFilter = null;
    const map = new maplibregl.Map({
      container,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [8.2275, 46.8182], zoom: 7,
      attributionControl: { compact: true },
      // No cooperativeGestures here: the map view IS the page content (the
      // catalogue swaps to it), so direct wheel-zoom/one-finger-pan is the
      // expected behaviour. The ctrl+zoom guard only earns its keep on maps
      // embedded in a vertically scrollable page — of the portal's three
      // maps, only the property-detail location map keeps it.
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    _propertiesMap = map;
    map.on('load', () => {
      clearMapLoading(container);
      const bounds = new maplibregl.LngLatBounds();
      items.forEach(t => {
        if (typeof t.lat !== 'number' || typeof t.lng !== 'number') return;
        const el = document.createElement('button');
        el.className = 'property-marker';
        el.type = 'button';
        el.setAttribute('aria-label', t.buildingName);
        el.dataset.id = t.id;
        // SAP asset-key label (bk/we/obj, e.g. "1086/2010/AA") above the pin.
        // Marked aria-hidden because the button already exposes the building
        // name as its aria-label — otherwise screen readers would announce both.
        el.innerHTML = `<span class="property-marker__label" aria-hidden="true">${P.escapeHtml(formatAssetKey(t.assetKey))}</span><span class="property-marker__pin"></span>`;
        // stopPropagation: markers live inside MapLibre's canvas container, so
        // without it the click bubbles up and fires a map `click` — whose
        // default closeOnClick would instantly dismiss the popup we just opened.
        // (A click on the empty basemap still closes it, which is what we want.)
        el.addEventListener('click', (e) => { e.stopPropagation(); focusPropertyOnMap(t.id); });
        // Compact info panel — deliberately minimal: photo, name, location and
        // a CTA to the detail page (the technical attributes live there).
        // Managed manually (NOT via marker.setPopup) so our click handler owns
        // open/close. `className` scopes the chrome + small-screen placement.
        // Built LAZILY: eagerly constructing a Popup per marker parsed this
        // HTML — including an <img> — for every property before any click
        // (review P8). Only the html string is prepared here; the Popup is
        // created on first focus (focusPropertyOnMap → entry.makePopup).
        const popupHtml = `
          <div class="property-popup">
            <div class="property-popup__media">
              <img class="property-popup__image" src="${safeImageUrl(t.image)}" alt="Foto: ${P.escapeHtml(t.buildingName)}" loading="lazy" decoding="async" width="288" height="112">
              <span class="property-popup__id">${P.escapeHtml(formatAssetKey(t.assetKey))}</span>
            </div>
            <div class="property-popup__body">
              <p class="property-popup__title">${P.escapeHtml(t.buildingName)}</p>
              <p class="property-popup__meta">${P.escapeHtml(t.address)}</p>
              <a class="btn btn--filled btn--sm property-popup__cta" href="#/properties/${t.id}">Details öffnen ${P.icon('arrowRight')}</a>
            </div>
          </div>`;
        const makePopup = () => {
          const popup = new maplibregl.Popup({ offset: 18, closeButton: true, maxWidth: '288px', className: 'property-map-popup' })
            .setLngLat([t.lng, t.lat])
            .setHTML(popupHtml);
          // Clear the active-pin highlight when the panel is dismissed (X
          // button or click on empty map).
          popup.on('close', () => el.classList.remove('property-marker--active'));
          return popup;
        };
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([t.lng, t.lat]).addTo(map);
        // Marker.addTo() stamps the generic locale string ('Marker.Title')
        // onto the element, replacing the per-building label set above —
        // every pin would announce identically. Re-set AFTER addTo so each
        // pin keeps its distinguishing building name (A11Y-017).
        el.setAttribute('aria-label', t.buildingName);
        // Born hidden — syncClusterMarkers below reveals exactly the pins
        // whose points are currently unclustered (prevents a flash of the
        // full marker set before the first cluster pass).
        el.style.display = 'none';
        // `popup: null` until first focus — every consumer null-checks before
        // calling remove()/isOpen(); focusPropertyOnMap creates it (review P8).
        _propertiesMarkers.push({ id: t.id, marker, el, popup: null, makePopup });
        bounds.extend([t.lng, t.lat]);
      });
      if (_propertiesMarkers.length > 0) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 0 });
      }

      // ── Marker clustering ──────────────────────────────────────────────
      // Pattern ported from the sister service-portal (js/map/
      // buildings-map.js): a clustered GeoJSON source drives navy cluster
      // circles + count glyphs on the canvas, while the CD-styled DOM
      // markers stay for UNclustered points and are shown/hidden in sync
      // with the cluster state. Keeps the map legible AND cheap once the
      // portfolio grows past a few dozen pins (BBL-wide roles).
      const clusterFC = (list) => ({
        type: 'FeatureCollection',
        features: list
          .filter(x => typeof x.lat === 'number' && typeof x.lng === 'number')
          .map(x => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [x.lng, x.lat] }, properties: { id: x.id } })),
      });
      map.addSource('properties', { type: 'geojson', data: clusterFC(items), cluster: true, clusterMaxZoom: 10, clusterRadius: 46 });
      map.addLayer({
        id: 'clusters', type: 'circle', source: 'properties', filter: ['has', 'point_count'],
        paint: {
          'circle-color': cdColor('--color-secondary-600'), 'circle-opacity': 0.85,
          'circle-stroke-color': cdColor('--color-white'), 'circle-stroke-width': 2,
          'circle-radius': ['step', ['get', 'point_count'], 16, 3, 20, 6, 26, 10, 32],
        },
      });
      // Count glyphs must come from a font the basemap style's glyph endpoint
      // actually serves — reuse the first font stack the loaded style declares
      // instead of hardcoding one that may 404.
      const styleFont = (map.getStyle().layers.find(l => l.layout && l.layout['text-font']) || { layout: {} })
        .layout['text-font'] || ['Open Sans Regular'];
      map.addLayer({
        id: 'cluster-count', type: 'symbol', source: 'properties', filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': styleFont, 'text-size': 12, 'text-allow-overlap': true },
        paint: { 'text-color': cdColor('--color-white') },
      });
      // DOM markers ↔ cluster sync: a pin is visible only while its point is
      // currently unclustered in the (possibly filtered) source.
      const syncClusterMarkers = () => {
        if (!map.getSource('properties') || !map.isSourceLoaded('properties')) return;
        const unclustered = new Set(
          map.querySourceFeatures('properties', { filter: ['!', ['has', 'point_count']] })
            .map(f => f.properties.id));
        _propertiesMarkers.forEach(m => { m.el.style.display = unclustered.has(m.id) ? '' : 'none'; });
      };
      map.on('moveend', syncClusterMarkers);
      map.on('zoomend', syncClusterMarkers);
      map.on('sourcedata', (e) => { if (e.sourceId === 'properties' && map.isSourceLoaded('properties')) syncClusterMarkers(); });
      // In-place filtering (live search / tree selection while on the map
      // view) re-feeds the source, so clusters aggregate only the filtered
      // set; pin visibility follows via the sourcedata sync above.
      _propertiesMapApplyFilter = (list) => {
        const src = map.getSource('properties');
        if (!src) return;
        const keep = new Set(list.map(x => x.id));
        src.setData(clusterFC(list));
        _propertiesMarkers.forEach(m => {
          if (!keep.has(m.id)) { m.el.style.display = 'none'; if (m.popup) m.popup.remove(); }
        });
      };
      // Cluster click → leaves-first navigation (see navigateCluster above).
      map.on('click', 'clusters', (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
        if (!f) return;
        navigateCluster({
          source: map.getSource('properties'), clusterId: f.properties.cluster_id, feature: f, map,
          LngLatBounds: maplibregl.LngLatBounds,
          isCurrent: () => _propertiesMap === map,
          onFailure: (details) => console.warn('MapLibre cluster navigation failed', details),
        });
      });
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
      // The buildingId labels turn into overlapping noise at the
      // Switzerland-wide overview, so reveal them only once the user has
      // zoomed in past LABEL_MIN_ZOOM. A single class toggle on the
      // container cascades to every label — no per-marker loop per frame.
      const LABEL_MIN_ZOOM = 10;
      const syncMarkerLabels = () =>
        container.classList.toggle('property-map--labels-hidden', map.getZoom() < LABEL_MIN_ZOOM);
      map.on('zoom', syncMarkerLabels);
      syncMarkerLabels();
      // "Home" button — fly back to the full portfolio extent (the same
      // fit-bounds used on first paint), or the Switzerland-wide default
      // when there are no markers to frame.
      const resetMapView = () => {
        if (_propertiesMarkers.length > 0) {
          map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 600 });
        } else {
          map.flyTo({ center: [8.2275, 46.8182], zoom: 7, duration: 600 });
        }
      };
      map.addControl(makeMapHomeControl(resetMapView), 'top-right');
      // A swisstopo location picked from gallery/list view switched us here —
      // drop its locator pin now that the map is ready, then consume it.
      if (_pendingLocator) {
        const loc = _pendingLocator;
        _pendingLocator = null;
        dropLocatorPin(loc.lng, loc.lat, loc.label);
      }
    });
  }).catch(err => {
    const container = document.getElementById('propertiesMap');
    if (container) {
      container.innerHTML = `<div class="property-map__error"><p><strong>Karte nicht geladen.</strong></p><p>MapLibre konnte nicht initialisiert werden. Bitte verwenden Sie vorübergehend die Galerie- oder Listenansicht.</p></div>`;
    }
    console.error(err);
  });
}
function focusPropertyOnMap(id) {
  const entry = _propertiesMarkers.find(m => m.id === id);
  if (!entry || !_propertiesMap) return;
  // First focus of this marker: create its popup now (lazy — review P8).
  if (!entry.popup && entry.makePopup) entry.popup = entry.makePopup();
  // One active marker + one open info panel at a time: clear the others.
  _propertiesMarkers.forEach(m => {
    m.el.classList.remove('property-marker--active');
    if (m !== entry && m.popup) m.popup.remove();
  });
  entry.el.classList.add('property-marker--active');
  const lngLat = entry.marker.getLngLat();
  _propertiesMap.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: Math.max(_propertiesMap.getZoom(), 13), duration: 600 });
  // Open (not toggle) so a second click re-centres without hiding the panel.
  if (!entry.popup.isOpen()) entry.popup.addTo(_propertiesMap);
}

function propertyCard(t, index = 99) {
  // Status badge moved to the top-left of the image so the body has more
  // room for SAP / address / meta lines. The warning variant calls out
  // open issues; the success variant is shown unobtrusively so an
  // all-green portfolio doesn't look like every card is shouting "ok".
  const issuesBadge = t.openIssues > 0
    ? `<span class="badge badge--warning card--property__status">${t.openIssues} offen</span>`
    : `<span class="badge badge--success card--property__status card--property__status--quiet">keine Anträge</span>`;
  // First 3 cards are above the fold on a 3-col desktop grid — eager-
  // load for faster LCP. Cards 4+ stay lazy.
  const imgLoading = index < 3 ? 'eager' : 'lazy';
  return `
    <a href="#/properties/${t.id}" class="card--property">
      <div class="card--property__image">
        <img src="${safeImageUrl(t.image)}" alt="" loading="${imgLoading}" decoding="async" width="320" height="180">
        ${issuesBadge}
      </div>
      <div class="card--property__body">
        <p class="card--property__sap">${formatAssetKey(t.assetKey)}</p>
        <h2 class="card--property__title">${P.escapeHtml(t.buildingName)}</h2>
        <p class="card--property__address">${P.escapeHtml(t.address)} · ${P.escapeHtml(t.floorLabel)}</p>
        <div class="card--property__meta">
          <span>${t.hnf2} m² HNF2</span>
          <span>${t.workstations} AP</span>
          <span>${P.formatChf(t.yearlyCost)} / Jahr</span>
        </div>
      </div>
    </a>
  `;
}

// ── 10. LIEGENSCHAFTS-DETAIL ─────────────────────────────────────────────
// Document-type labels resolve through the doctype.* keys in data/i18n.json
// (enum per DOC_TYPE_LABEL in lib.js) — shared with the downloads page so a
// Permit renders identically on both surfaces, in every language.

// Property-detail Dokumente: four buckets by user intent (not by chronology).
// Empty buckets are skipped at render time.
// Contact names link to the public federal staff directory (Staatskalender).
// Demo: every name points at the BBL organisation landing page. In production
// each person would resolve to their own Staatskalender id — possibly looked
// up via the federal IAM directory. https://www.staatskalender.admin.ch
const STAATSKALENDER_ORG_URL = 'https://www.staatskalender.admin.ch/organization/20010028';
function staffLink(name) {
  return `<a class="link link--external" href="${STAATSKALENDER_ORG_URL}" target="_blank" rel="noopener">${P.escapeHtml(name || '')}</a>`;
}

// ── PROPERTY IMAGE GALLERY ────────────────────────────────────────────────
// Resolves a gallery image source. Static building photos go through the
// shared `safeImageUrl` allow-list (assets/ or http[s]); session uploads are
// `data:` URLs read locally via FileReader, which `safeImageUrl` rejects, so
// they are passed through as-is (the file came from the user's own picker and
// is only ever assigned to an <img>.src, never reflected into markup).
function galleryImgSrc(s) {
  if (typeof s !== 'string') return '';
  if (/^data:image\//i.test(s)) return s;
  return safeImageUrl(s);
}

// (The former propertyHeaderMedia single-thumbnail header block was retired
// when the floor route adopted the property-detail scaffold — the hero
// mosaic, which also seeds t.gallery, renders on both routes now.)

// Every mosaic tile is its own gallery trigger and opens AT its own image —
// clicking the third photo should show the third photo, not restart at the
// first. The floor page's single thumbnail carries no index and falls back
// to 0, which is the same behaviour it had before.
function wirePropertyGallery(t) {
  document.querySelectorAll('[data-gallery-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.getAttribute('data-gallery-index') || '0', 10) || 0;
      openImageGallery(t, i);
    });
  });
}

// Dark full-screen image lightbox — styled to match the document viewer
// (`.docviewer`). Image name top-left, download/upload/delete top-right,
// side chevrons + a bottom-centre thumbnail strip (both shown only with 2+
// images). Upload reads files locally (FileReader → data URL); delete and
// upload mutate `t.gallery`, and the header thumbnail/count are kept in sync.
function openImageGallery(t, startIndex = 0) {
  const list = t.gallery;
  if (!Array.isArray(list) || !list.length) return;
  const opener = document.activeElement;
  // syncHeader() rebuilds the hero mosaic per upload/delete, detaching the
  // opener — remember its tile index so close() can refocus the REBUILT
  // equivalent instead of a dead node (review B15).
  const openerIndex = opener && opener.getAttribute && opener.getAttribute('data-gallery-index');
  let idx = Math.max(0, Math.min(list.length - 1, startIndex));

  const backdrop = document.createElement('div');
  backdrop.className = 'gallery';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', 'Bildergalerie: ' + (t.buildingName || ''));
  backdrop.innerHTML = `
    <div class="gallery__bar">
      <div class="gallery__heading">
        ${P.icon('image', 'gallery__heading-icon')}
        <div class="gallery__heading-text">
          <p class="gallery__name" data-gallery-name></p>
          <p class="gallery__sub" data-gallery-counter></p>
        </div>
      </div>
      <div class="gallery__actions">
        <button class="gallery__btn" type="button" data-act="download" aria-label="Herunterladen" title="Herunterladen">${P.icon('download')}</button>
        <button class="gallery__btn" type="button" data-act="upload" aria-label="Bild hochladen" title="Bild hochladen">${P.icon('upload')}</button>
        <button class="gallery__btn" type="button" data-act="delete" aria-label="Bild löschen" title="Bild löschen">${P.icon('trash')}</button>
        <button class="gallery__btn gallery__btn--close" type="button" data-act="close" aria-label="Galerie schliessen" title="Schliessen">${P.icon('x')}</button>
      </div>
    </div>
    <div class="gallery__main">
      <button class="gallery__nav gallery__nav--prev" type="button" data-act="prev" aria-label="Vorheriges Bild" title="Vorheriges Bild">${P.icon('chevronLeft')}</button>
      <div class="gallery__stage">
        <img class="gallery__image" alt="" decoding="async">
        <p class="gallery__empty" hidden>Keine Bilder vorhanden. Laden Sie ein Bild hoch.</p>
      </div>
      <button class="gallery__nav gallery__nav--next" type="button" data-act="next" aria-label="Nächstes Bild" title="Nächstes Bild">${P.icon('chevronRight')}</button>
    </div>
    <div class="gallery__thumbs" aria-label="Bildauswahl" data-gallery-thumbs></div>
    <input type="file" accept="image/*" class="gallery__file" multiple hidden>`;
  document.body.appendChild(backdrop);
  document.body.classList.add('docviewer-open');   // reuse the body scroll-lock

  const nameEl     = backdrop.querySelector('[data-gallery-name]');
  const counterEl  = backdrop.querySelector('[data-gallery-counter]');
  const mainImg    = backdrop.querySelector('.gallery__image');
  const emptyEl    = backdrop.querySelector('.gallery__empty');
  const thumbsEl   = backdrop.querySelector('[data-gallery-thumbs]');
  const prevBtn    = backdrop.querySelector('[data-act="prev"]');
  const nextBtn    = backdrop.querySelector('[data-act="next"]');
  const deleteBtn  = backdrop.querySelector('[data-act="delete"]');
  const downloadBtn = backdrop.querySelector('[data-act="download"]');
  const fileInput  = backdrop.querySelector('.gallery__file');

  // Keep the underlying header thumbnail + count chip in sync after an
  // upload/delete, so closing the lightbox lands on a consistent header
  // without a full route re-render.
  function syncHeader() {
    // Property detail: the mosaic's TILE COUNT changes with the gallery, so
    // patching one thumbnail is not enough — re-render the tiles (and only
    // the tiles; the map column beside them keeps its live MapLibre
    // instance) and re-bind their triggers.
    const hero = document.querySelector('.property-hero');
    if (hero) {
      const mosaic = hero.querySelector('.property-hero__mosaic');
      if (mosaic) mosaic.innerHTML = propertyHeroTiles(t);
      wirePropertyGallery(t);
      return;
    }
    // Floor page: a single thumbnail with a count chip.
    const btn = document.querySelector('[data-gallery-open]');
    if (!btn) return;
    const img = btn.querySelector('.property-header__image');
    if (img && list.length) img.src = galleryImgSrc(list[0].src);
    const chip = btn.querySelector('[data-gallery-count]');
    if (chip) { chip.textContent = String(list.length); chip.hidden = list.length < 2; }
    btn.setAttribute('aria-label', 'Bildergalerie öffnen' + (list.length > 1 ? ` (${list.length} Bilder)` : ''));
    btn.disabled = list.length === 0;
  }

  function render() {
    const multi = list.length > 1;
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;
    thumbsEl.hidden = !multi;

    if (!list.length) {
      mainImg.hidden = true; mainImg.removeAttribute('src');
      emptyEl.hidden = false;
      nameEl.textContent = '';
      counterEl.textContent = 'Keine Bilder';
      deleteBtn.disabled = true; downloadBtn.disabled = true;
      thumbsEl.innerHTML = '';
      syncHeader();
      return;
    }
    if (idx >= list.length) idx = list.length - 1;
    const entry = list[idx];
    deleteBtn.disabled = false; downloadBtn.disabled = false;
    emptyEl.hidden = true;
    mainImg.hidden = false;
    mainImg.src = galleryImgSrc(entry.src);
    mainImg.alt = entry.name || '';
    nameEl.textContent = entry.name || '';
    counterEl.textContent = `${idx + 1} / ${list.length}`;

    thumbsEl.innerHTML = '';
    if (multi) {
      list.forEach((im, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gallery__thumb' + (i === idx ? ' gallery__thumb--active' : '');
        b.setAttribute('aria-label', `Bild ${i + 1}${im.name ? ': ' + im.name : ''}`);
        if (i === idx) b.setAttribute('aria-current', 'true');
        const tImg = document.createElement('img');
        tImg.src = galleryImgSrc(im.src); tImg.alt = ''; tImg.loading = 'lazy'; tImg.decoding = 'async';
        b.appendChild(tImg);
        b.addEventListener('click', () => { idx = i; render(); });
        thumbsEl.appendChild(b);
      });
      const active = thumbsEl.querySelector('.gallery__thumb--active');
      if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    syncHeader();
  }

  function go(delta) {
    if (list.length < 2) return;
    idx = (idx + delta + list.length) % list.length;
    render();
  }

  function close() {
    unregisterOverlay();
    document.removeEventListener('keydown', onKeydown, true);
    backdrop.remove();
    document.body.classList.remove('docviewer-open');
    // The original opener may have been detached by syncHeader()'s mosaic
    // rebuild — fall back to the rebuilt tile at the same index, then to any
    // gallery trigger (review B15).
    const target = (opener && opener.isConnected)
      ? opener
      : document.querySelector(`[data-gallery-open][data-gallery-index="${openerIndex}"]`)
        || document.querySelector('[data-gallery-open]');
    if (target) try { target.focus(); } catch {}
  }
  // Route changes close the gallery through the shared registry (review B3).
  const unregisterOverlay = registerOverlay(close);

  function onKeydown(e) {
    const typing = document.activeElement && document.activeElement.matches && document.activeElement.matches('textarea, input');
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (!typing && e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); return; }
    if (!typing && e.key === 'ArrowRight') { e.preventDefault(); go(1);  return; }
    if (e.key !== 'Tab') return;
    const f = Array.from(backdrop.querySelectorAll('button:not([hidden]):not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  downloadBtn.addEventListener('click', () => { if (list[idx]) P.toast('Download simuliert: ' + (list[idx].name || 'Bild'), 'success'); });
  deleteBtn.addEventListener('click', () => {
    if (!list.length) return;
    const removed = list.splice(idx, 1)[0];
    if (idx >= list.length) idx = Math.max(0, list.length - 1);
    P.toast('Bild gelöscht (Demo)' + (removed && removed.name ? ': ' + removed.name : ''), 'success');
    render();
  });
  backdrop.querySelector('[data-act="upload"]').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files || []).filter(f => /^image\//.test(f.type));
    fileInput.value = '';
    if (!files.length) return;
    const firstNew = list.length;
    let pending = files.length;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        list.push({ src: reader.result, name: file.name });
        if (--pending === 0) {
          idx = firstNew;
          render();
          P.toast(files.length === 1 ? 'Bild hinzugefügt (Demo).' : `${files.length} Bilder hinzugefügt (Demo).`, 'success');
        }
      };
      reader.onerror = () => { if (--pending === 0) render(); };
      reader.readAsDataURL(file);
    });
  });
  backdrop.querySelector('[data-act="close"]').addEventListener('click', close);

  document.addEventListener('keydown', onKeydown, true);
  render();
  setTimeout(() => { try { backdrop.querySelector('[data-act="close"]').focus(); } catch {} }, 0);
}

// Shared data prep for the property-detail scaffold. Both routes that render
// it — #/properties/:id (tab view) and #/properties/:id/floors/:slug (same
// view with the floor viewer in the Geschosse panel) — need identical tab
// counts, KPIs and lease maths, so this lives in one place.
function buildPropertyContext(t) {
  // Every Vorgang that concerns this building, not just its Bedarfsmeldungen:
  // a Schadensmeldung or an Umzug on this property belongs in the same list,
  // and the process envelope makes that one query instead of five.
  const related = (P.state.processInstances || [])
    .filter(i => i.buildingId === t.buildingId)
    .map(resolveCase)
    .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
  const today = new Date();
  const leaseEnd = new Date(t.leaseEnd);
  const monthsToEnd = Math.max(0, Math.round((leaseEnd - today) / (30 * 86400000)));
  const restWarn = monthsToEnd <= 12;

  // Floors for this building, sorted by levelNumber. Empty for buildings
  // that have no floors.geojson coverage yet — section is then hidden.
  const floors = P.state.floors
    .filter(f => f.buildingId === t.buildingId)
    .sort((a, b) => a.levelNumber - b.levelNumber);

  const userVe = P.state.user.ve;
  const userDep = P.state.user.dep;

  const floorKpis = floors.map(f => {
    const spaces = P.state.spaces.filter(s => s.floorId === f.floorId);
    const rooms = spaces.filter(s => s.useType !== 'Corridor');
    const totalArea = rooms.reduce((sum, s) => sum + (s.area || 0), 0);
    const workstations = spaces
      .filter(s => s.useType === 'Office' || s.useType === 'OpenSpace')
      .reduce((sum, s) => sum + (s.capacity || 0), 0);
    const myVeCount = rooms.filter(s => s.occupierVe === userVe).length;
    return {
      ...f,
      slug: f.floorId.replace(t.buildingId + '-', ''),
      roomCount: rooms.length,
      totalArea, workstations, myVeCount,
      isYourFloor: myVeCount > 0,
    };
  });

  // Documents linked to this building or this tenancy.
  const linkedDocs = P.state.documents.filter(d =>
    (d.linkedTo || []).some(l =>
      (l.entityType === 'Building' && l.entityId === t.buildingId) ||
      (l.entityType === 'Tenancy'  && l.entityId === t.id)
    )
  );

  // Short labels on the tabs, descriptive headings inside the panels — a tab
  // strip has to stay scannable at a glance, and «Dokumente zu dieser
  // Liegenschaft (11)» as a tab pushes the strip into a scroll on a laptop.
  const propTabs = [
    { key: 'uebersicht', label: P.t('prop.tabOverview') },
    { key: 'vertraege',  label: `${P.t('prop.tabContracts')} (${(P.state.tenancies || []).filter(x => x.buildingId === t.buildingId).length})` },
    { key: 'geschosse',  label: `${P.t('prop.tabFloors')} (${floors.length})` },
    { key: 'dokumente',  label: `${P.t('prop.tabDocuments')} (${linkedDocs.length})` },
    { key: 'vorgaenge',  label: `${P.t('prop.tabCases')} (${related.length})` },
  ];

  return { related, monthsToEnd, restWarn, floors, floorKpis, linkedDocs, userVe, userDep, propTabs };
}

// Shared header block: title, address, hero mosaic and the tab strip.
// `activeTab` names the highlighted tab; the caller renders the panel.
function propertyDetailScaffold(t, ctx, activeTab, panelHtml) {
  return `
    <section class="section section--py-tight">
      <div class="container">
        <header class="property-header">
          <h1 class="h1 property-header__title">${P.escapeHtml(t.buildingName)}</h1>
          <p class="property-header__address">
            ${P.escapeHtml(t.address)}
          </p>
        </header>

        ${propertyHeroMosaic(t)}

        <div class="tabs property-tabs" role="tablist" aria-label="${P.t('prop.tabsLabel')}">
          ${ctx.propTabs.map(x => tabBtn(x.key, x.label, activeTab)).join('')}
        </div>
        <div class="property-tabpanel" id="detailTab" role="tabpanel" aria-labelledby="tab-${activeTab}" tabindex="0">
          ${panelHtml}
        </div>
      </div>
    </section>
  `;
}

async function renderPropertyDetail({ id }, gen) {
  if (!P.state.user) { P.navigate('#/'); return; }
  const t = P.state.tenancies.find(x => x.id === id);
  if (!t) { renderNotFound(P.t('prop.notFound'), { activeNav: 'properties' }); return; }
  await P.loadSpatialData('data/');
  if (gen !== undefined && gen !== _routeGen) return;   // navigated away while loading
  shell({ activeNav: 'properties', breadcrumb: [
    { href: '#/properties', label: P.t('nav.properties') },
    { label: t.buildingName }
  ]});

  const ctx = buildPropertyContext(t);

  // Tab state lives in the URL (`?tab=`) so a tab is linkable and the back
  // button steps through them — same contract as the Vorgang detail view.
  const requested = parseHashQuery(location.hash).tab;
  const activeTab = ctx.propTabs.some(x => x.key === requested) ? requested : 'uebersicht';

  document.getElementById('page-body').innerHTML = `
    ${P.renderShareBar({ backTo: '#/properties', backLabel: P.t('nav.properties') })}
    ${propertyDetailScaffold(t, ctx, activeTab, renderPropertyTab(t, activeTab, ctx))}
  `;

  wirePropertyGallery(t);
  initPropertyDetailMap(t);
  wirePropertyTabs(t, ctx);
}

// ── PROPERTY HERO ────────────────────────────────────────────────────────
// Image mosaic + location map, after the sister portal's property header:
// one large image, up to four side tiles, the map beside them. Every tile
// opens the existing fullscreen gallery, and the last real side tile carries
// the «Alle Bilder anzeigen» overlay.
//
// SOLO VARIANT: each property ships exactly one photo today, so the default
// rendering would be one image beside four «Kein Bild» boxes — a header that
// looks broken rather than sparse. With no side images the mosaic drops the
// side column entirely and the main image takes the width. Placeholders only
// appear once there IS a second image (uploads through the gallery add them),
// where they read as free slots rather than missing content.
const HERO_SIDE_SLOTS = 4;

// The tiles alone — re-rendered on their own after a gallery upload or
// delete, so the mosaic reflects the new image count without tearing down
// and re-initialising the MapLibre instance beside it.

// The tiles alone. Re-rendered on their own after a gallery upload or delete
// so the mosaic reflects the new image count WITHOUT tearing down and
// re-initialising the MapLibre instance in the column beside it.
function propertyHeroTiles(t) {
  if (!Array.isArray(t.gallery)) {
    // Seeded from the building's photo array. Uploads/deletes via the
    // lightbox mutate this array, which lives on the tenancy object so it
    // survives route re-renders within the session (not persisted to disk,
    // like the rest of the prototype's mutations).
    t.gallery = (t.images || []).map((src, i) => ({ src, name: t.buildingName + (i === 0 ? ' — Aussenansicht' : ' — Aufnahme ' + (i + 1)) }));
  }
  const items = t.gallery;
  const n = items.length;

  const cell = (item, index, cls, overlay = '') => `
    <button type="button" class="property-hero__cell ${cls}" data-gallery-open data-gallery-index="${index}"
            aria-haspopup="dialog"
            aria-label="${P.escapeHtml(item.name || t.buildingName)} — Bild ${index + 1} von ${n} in der Galerie öffnen">
      <img class="property-hero__photo" src="${galleryImgSrc(item.src)}" alt="" loading="lazy" decoding="async">
      ${overlay}
    </button>`;

  // CD `image__not-available` (designsystem css/components/
  // image-not-available.postcss + ImageNotAvailable.vue): centred glyph over
  // a caption. An empty slot is deliberately VISIBLE rather than collapsed —
  // a property with one photo should look like a property whose gallery is
  // waiting to be filled, and every slot is a live upload target.
  const empty = () => `
    <div class="property-hero__cell property-hero__cell--empty">
      <div class="image__not-available">
        ${P.icon('image')}
        <p class="image__not-available-text">${P.t('prop.noImage')}</p>
      </div>
    </div>`;

  const side = items.slice(1, 1 + HERO_SIDE_SLOTS);
  const hidden = n - (1 + side.length);
  // The overlay goes on the last REAL tile — never on a placeholder, which
  // would offer to open images that do not exist.
  const sideTiles = side.map((item, i) => {
    const isLast = i === side.length - 1;
    const overlay = isLast
      ? `<span class="property-hero__more">
           ${hidden > 0 ? `<span class="property-hero__more-num">+${hidden}</span>` : ''}
           <span class="property-hero__more-label">${P.t('prop.showAllImages')}</span>
         </span>`
      : '';
    return cell(item, i + 1, 'property-hero__cell--side', overlay);
  }).join('') + empty().repeat(Math.max(0, HERO_SIDE_SLOTS - side.length));

  const mainCell = n
    ? cell(items[0], 0, 'property-hero__cell--main', `
        <span class="property-hero__badge" data-gallery-badge>
          ${P.icon('image')}
          <span class="property-hero__badge-label">${n}&nbsp;${n === 1 ? P.t('prop.image') : P.t('prop.images')}</span>
        </span>`)
    : `<div class="property-hero__cell property-hero__cell--main property-hero__cell--empty">
         <div class="image__not-available">
           ${P.icon('image')}
           <p class="image__not-available-text">${P.t('prop.noImage')}</p>
         </div>
       </div>`;

  // The side column is ALWAYS rendered, placeholders included. An earlier
  // version collapsed it whenever a property had a single photo, on the
  // theory that four empty boxes look broken — but hiding the slots also
  // hides the invitation to fill them, and every tile here is an upload
  // target. Empty slots stay, and they read as free slots.
  return mainCell + `<div class="property-hero__side">${sideTiles}</div>`;
}

function propertyHeroMosaic(t) {
  const tiles = propertyHeroTiles(t);   // also seeds t.gallery on first render

  // Exit to Google Maps above the map. The portal map places the property in
  // its federal context; directions and street view belong to the tool already
  // on the reader's phone. The Maps `search` endpoint drops a real marker at
  // the coordinate — `@lat,lng,zoom` only moves the camera.
  const hasGeo = typeof t.lat === 'number' && typeof t.lng === 'number';
  const mapsUrl = hasGeo
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.lat + ',' + t.lng)}`
    : '';

  return `
    <div class="property-hero">
      <div class="property-hero__mosaic">
        ${tiles}
      </div>
      <div class="property-hero__mapcol">
        ${hasGeo ? `<p class="property-hero__maplink">
          <a class="link link--external" href="${mapsUrl}" target="_blank" rel="external noopener noreferrer">${P.t('prop.googleMaps')}</a>
        </p>` : ''}
        <div id="propertyLocationMap" class="property-hero__map map-surface" aria-label="${P.t('prop.location')}">
          ${renderMapLoading(P.t('prop.mapLoading'))}
        </div>
      </div>
    </div>
  `;
}

// ── PROPERTY TAB PANELS ──────────────────────────────────────────────────
function renderPropertyTab(t, tab, ctx) {
  if (tab === 'vertraege')  return propertyContractPanel(t);
  if (tab === 'geschosse')  return propertyFloorsPanel(t, ctx);
  if (tab === 'dokumente')  return propertyDocumentsPanel(t, ctx);
  if (tab === 'vorgaenge')  return propertyCasesPanel(t, ctx);
  return propertyOverviewPanel(t);
}

// Aside: actions and contacts on the grey surface. Rendered by the ÜBERSICHT
// panel only — the same rule the sister portal follows. The other tabs are
// full-width tables, and a 320px column of unrelated links beside them would
// squeeze the data without adding anything to it.
function propertyAside(t) {
  return `
    <aside class="property-aside" aria-label="${P.t('prop.actions')}">
     <div class="property-aside__inner">
      <div class="property-aside__card">
        <h2 class="property-aside__title">${P.t('prop.actions')}</h2>
        <div class="property-aside__actions">
          <a href="#/repair?building=${encodeURIComponent(t.buildingId)}" class="btn btn--bare">${P.t('prop.actionRepair')}</a>
          <a href="#/wizard/1" class="btn btn--bare">${P.t('prop.actionRequest')}</a>
          <a href="#/moves?building=${encodeURIComponent(t.buildingId)}" class="btn btn--bare">${P.t('prop.actionMove')}</a>
          <a href="#/cleaning?building=${encodeURIComponent(t.buildingId)}" class="btn btn--bare">${P.t('prop.actionCleaning')}</a>
        </div>
      </div>
      <div class="property-aside__card">
        <h2 class="property-aside__title">${P.t('prop.contactsTitle')}</h2>
        <dl class="contact-dl">
          <div class="contact-dl__row">
            <dt>${P.t('prop.contactPfm')}</dt><dd>${staffLink(t.contacts.pfm)}</dd>
          </div>
          <div class="contact-dl__row">
            <dt>${P.t('prop.contactIm')}</dt><dd>${staffLink(t.contacts.im)}</dd>
          </div>
          <div class="contact-dl__row">
            <dt>${P.t('prop.contactFlm')}</dt><dd>${staffLink(t.contacts.flm)}</dd>
          </div>
        </dl>
      </div>
     </div>
    </aside>`;
}

function propertyOverviewPanel(t) {
  return `
    <div class="property-layout">
      <div>
        <!-- No «Eckdaten» heading: the tab is already labelled Übersicht and
             the panel opens with the figures themselves, so the heading only
             restated its own container. -->
        <div class="property-stats">
          <div class="property-stats__item">
            <span class="property-stats__label">HNF2</span>
            <span class="property-stats__value">${t.hnf2.toLocaleString('de-CH')}<small> m²</small></span>
          </div>
          <div class="property-stats__item">
            <span class="property-stats__label">GF</span>
            <span class="property-stats__value">${t.gf.toLocaleString('de-CH')}<small> m²</small></span>
          </div>
          <div class="property-stats__item">
            <span class="property-stats__label">${P.t('prop.workstations')}</span>
            <span class="property-stats__value">${t.workstations}</span>
          </div>
          <div class="property-stats__item">
            <span class="property-stats__label">${P.t('prop.yearlyCost')}</span>
            <span class="property-stats__value">${P.formatChf(t.yearlyCost)}</span>
          </div>
        </div>

        <dl class="detail-list property-facts-list">
          <dt>${P.t('prop.assetKeyLabel')}</dt><dd>${formatAssetKey(t.assetKey)}</dd>
          <dt>EGID</dt><dd>${P.escapeHtml(String(t.egid))}</dd>
          <dt>${P.t('prop.addressLabel')}</dt><dd>${P.escapeHtml(t.address)}</dd>
          <dt>${P.t('prop.tenantVe')}</dt><dd>${P.escapeHtml(t.ve)}${t.dep && t.dep !== t.ve ? ' / ' + P.escapeHtml(t.dep) : ''}</dd>
          <dt>${P.t('prop.floorLabel')}</dt><dd>${P.escapeHtml(t.floorLabel || '—')}</dd>
        </dl>

      </div>
      ${propertyAside(t)}
    </div>`;
}

// Vorgänge concerning this property — its own tab rather than a block at the
// foot of Übersicht, where it competed with the key figures for the same
// glance. Same row markup as «Meine Vorgänge», so a case looks identical
// wherever it is listed.
function propertyCasesPanel(t, { related }) {
  return `
    <div>
      ${related.length === 0
        ? `<p class="text-secondary">${P.t('prop.noCases')}</p>`
        : `<div class="table-wrapper"><table class="table table--zebra table--rows-clickable" aria-label="${P.t('prop.casesSection')}">
             <thead>
               <tr>
                 <th scope="col">Vorgang</th><th scope="col">Objekt</th><th scope="col">Prozess</th><th scope="col">${P.t('prop.submitted')}</th><th scope="col">${P.t('prop.status')}</th>
               </tr>
             </thead>
             <tbody>${related.map(caseRowHtml).join('')}</tbody>
           </table></div>`}
    </div>`;
}

// A contract LIST, one row per Mietverhältnis — a building can carry several
// (different administrative units, or a lease succeeded by its renewal), so
// this is a table that grows rather than a field/value sheet describing the
// single tenancy the reader arrived through. Rows are scoped by building, so
// a second tenancy in the data appears here with no code change.
function propertyContractPanel(t) {
  const contracts = (P.state.tenancies || []).filter(x => x.buildingId === t.buildingId);
  const today = new Date();
  return `
    <div>
      <div class="table-wrapper">
        <table class="table table--zebra" aria-label="${P.t('prop.contractSection')}">
          <thead>
            <tr>
              <th scope="col">${P.t('prop.contractRef')}</th>
              <th scope="col">${P.t('prop.tenantVe')}</th>
              <th scope="col">${P.t('prop.term')}</th>
              <th scope="col">${P.t('prop.leaseType')}</th>
              <th scope="col">HNF2</th>
              <th scope="col">${P.t('prop.yearlyCost')}</th>
              <th scope="col">${P.t('prop.restTermShort')}</th>
            </tr>
          </thead>
          <tbody>
            ${contracts.map(c => {
              const months = Math.max(0, Math.round((new Date(c.leaseEnd) - today) / (30 * 86400000)));
              return `
              <tr${c.id === t.id ? ' class="table__row--current"' : ''}>
                <td><strong>${P.escapeHtml(c.id)}</strong></td>
                <td>${P.escapeHtml(c.ve)}${c.dep && c.dep !== c.ve ? ' / ' + P.escapeHtml(c.dep) : ''}</td>
                <td>${P.formatDate(c.leaseStart)} – ${P.formatDate(c.leaseEnd)}</td>
                <td>${c.leaseAuto ? `<span class="badge badge--success">${P.t('prop.autoRenew')}</span>` : `<span class="badge badge--warning">${P.t('prop.fixedTerm')}</span>`}</td>
                <td>${c.hnf2.toLocaleString('de-CH')} m²</td>
                <td>${P.formatChf(c.yearlyCost)}</td>
                <td>${P.t('prop.restTerm', { n: months })}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function propertyFloorsPanel(t, { floorKpis, userVe, userDep }) {
  // Column totals for the tfoot — DS `tfoot` treatment (2px rules) plus
  // bold cells; mirrors the service-portal Geschosse table's "Total (n)".
  const sum = (fn) => floorKpis.reduce((acc, f) => acc + fn(f), 0);
  const totals = {
    rooms: sum(f => f.roomCount),
    area: sum(f => f.totalArea),
    workstations: sum(f => f.workstations),
    myVe: sum(f => f.myVeCount),
  };
  return `
    <div>
        ${floorKpis.length === 0
          ? `<p class="text-secondary">${P.t('prop.noFloors')}</p>`
          : `<div class="table-wrapper"><table class="table table--zebra table--rows-clickable floor-list" aria-label="${P.t('prop.floorsSection')}">
              <thead>
                <tr>
                  <th scope="col">${P.t('prop.floor')}</th>
                  <th scope="col" class="floor-list__num">${P.t('prop.rooms')}</th>
                  <th scope="col" class="floor-list__num">HNF2</th>
                  <th scope="col" class="floor-list__num">${P.t('prop.workstations')}</th>
                  <th scope="col" class="floor-list__num">${P.t('prop.ofWhich')} ${P.escapeHtml(userVe)}${userDep ? ' / ' + P.escapeHtml(userDep) : ''}</th>
                  <th scope="col" aria-hidden="true" class="floor-list__chevron-th"></th>
                </tr>
              </thead>
              <tbody>
                ${floorKpis.map(f => `
                  <!-- escapeJs/escapeHtml on the ids: interpolated into a JS
                       string in an onclick and into an href (review m2). -->
                  <tr onclick="location.hash='#/properties/${P.escapeJs(t.id)}/floors/${P.escapeJs(f.slug)}';">
                    <td>
                      <a href="#/properties/${P.escapeHtml(t.id)}/floors/${P.escapeHtml(f.slug)}"><strong>${P.escapeHtml(f.name)}</strong></a>
                      ${f.isYourFloor ? ` <span class="badge badge--success">${P.t('prop.yourLocation')}</span>` : ''}
                    </td>
                    <td class="floor-list__num">${f.roomCount}</td>
                    <td class="floor-list__num">${f.totalArea.toLocaleString('de-CH')} m²</td>
                    <td class="floor-list__num">${f.workstations}</td>
                    <td class="floor-list__num">${f.myVeCount}</td>
                    <td class="floor-list__chevron">${P.icon('chevronRight')}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total (${floorKpis.length})</th>
                  <td class="floor-list__num"><strong>${totals.rooms}</strong></td>
                  <td class="floor-list__num"><strong>${totals.area.toLocaleString('de-CH')} m²</strong></td>
                  <td class="floor-list__num"><strong>${totals.workstations}</strong></td>
                  <td class="floor-list__num"><strong>${totals.myVe}</strong></td>
                  <td aria-hidden="true"></td>
                </tr>
              </tfoot>
            </table></div>`}
    </div>`;
}

// Documents as a CD table rather than the previous <details> accordion, so
// they read the same way as Geschosse — one scannable list with a row per
// record instead of collapsed groups the reader has to open to count.
function propertyDocumentsPanel(t, { linkedDocs }) {
  const docs = [...linkedDocs].sort((a, b) => (b.issuedAt || '').localeCompare(a.issuedAt || ''));
  return `
    <div>
        ${docs.length === 0
          ? `<p class="text-secondary">${P.t('prop.noDocs')}</p>`
          : `<div class="table-wrapper"><table class="table table--zebra table--rows-clickable" aria-label="${P.t('prop.docsSection')}">
              <thead>
                <tr>
                  <th scope="col">${P.t('prop.docTitle')}</th>
                  <th scope="col">${P.t('prop.type')}</th>
                  <th scope="col">${P.t('prop.format')}</th>
                  <th scope="col">${P.t('prop.date')}</th>
                </tr>
              </thead>
              <tbody>
                ${docs.map(d => `
                  <tr onclick="window.t3lite.openDocViewer('${P.escapeJs(d.id)}');">
                    <td><a href="#/downloads?doc=${encodeURIComponent(d.id)}"
                           onclick="event.preventDefault(); event.stopPropagation(); window.t3lite.openDocViewer('${P.escapeJs(d.id)}');"><strong>${P.escapeHtml(d.title)}</strong></a></td>
                    <td>${P.escapeHtml(P.t('doctype.' + d.type))}</td>
                    <td>${P.escapeHtml([d.format, d.size].filter(Boolean).join(' · '))}</td>
                    <td>${d.issuedAt ? P.formatDate(d.issuedAt) : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table></div>
            <p class="property-docs__more"><a class="link" href="#/downloads?building=${encodeURIComponent(t.buildingId)}">${P.t('prop.allDocs')} ${P.icon('arrowRight')}</a></p>`}
    </div>`;
}

// Shared roving-tabindex wiring (lib.js wireTabs, A11Y-016 / review M-TABS):
// arrow keys move between tabs, the panel is re-rendered in place, and the
// URL keeps `?tab=` (+ `lang` — the router's source of truth for language,
// see caseTabHash) so the state survives a reload or a shared link.
function propertyTabHash(propertyId, key) {
  const current = parseHashQuery(location.hash);
  const qs = [key === 'uebersicht' ? '' : `tab=${key}`, current.lang ? `lang=${current.lang}` : '']
    .filter(Boolean).join('&');
  return `#/properties/${propertyId}` + (qs ? '?' + qs : '');
}
function wirePropertyTabs(t, ctx) {
  wireTabs({
    rootSel: '.property-tabs',
    render: (key) => renderPropertyTab(t, key, ctx),
    hashFor: (key) => propertyTabHash(t.id, key),
  });
}


// `Standort` map on the property detail page — single marker on a positron
// basemap, centred on the building's lat/lng. WGS84 since the portfolio is
// federal-wide and (eventually) overseas (FDFA missions). Lazy-initialised
// MapLibre, torn down on route change.
let _propertyDetailMap = null;
function initPropertyDetailMap(t) {
  if (typeof t.lat !== 'number' || typeof t.lng !== 'number') return;
  loadMapLibre().then(maplibregl => {
    const container = document.getElementById('propertyLocationMap');
    if (!container) return;
    if (_propertyDetailMap) { try { _propertyDetailMap.remove(); } catch {} _propertyDetailMap = null; }

    const map = new maplibregl.Map({
      container,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [t.lng, t.lat],
      zoom: 17.5,
      attributionControl: { compact: true },
      // The ONE map that keeps cooperativeGestures: it sits mid-page in the
      // scrollable property-detail hero, where a bare wheel-zoom would trap
      // page scroll. The portfolio map view and the floor-plan viewer are
      // work surfaces and zoom directly.
      cooperativeGestures: true,
      locale: MAP_COOP_LOCALE,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    _propertyDetailMap = map;

    map.on('load', () => {
      clearMapLoading(container);
      const el = document.createElement('div');
      el.className = 'property-marker property-marker--static';
      el.setAttribute('aria-label', t.buildingName);
      // Same SAP asset-key label as the portfolio map — but view-only here:
      // the static marker has pointer-events:none (no select) and no popup,
      // and this single-building map never hides the label by zoom.
      el.innerHTML = `<span class="property-marker__label" aria-hidden="true">${P.escapeHtml(formatAssetKey(t.assetKey))}</span><span class="property-marker__pin"></span>`;
      new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([t.lng, t.lat])
        .addTo(map);
      // Marker.addTo() overwrites the element's aria-label with the generic
      // locale string — re-set the building name afterwards (A11Y-017).
      el.setAttribute('aria-label', t.buildingName);
    });
  }).catch(err => {
    console.error('[property location map]', err);
    const container = document.getElementById('propertyLocationMap');
    if (container) {
      container.innerHTML = `<p class="property-map__error">${P.t('prop.mapError')}</p>`;
    }
  });
}

// ── 10b. GESCHOSS-DETAIL — interaktiver Grundriss ────────────────────────
// Space useType DE labels — canonical EN keys per docs/DATAMODEL.md A.9.
const USETYPE_LABEL_DE = {
  Office:        'Büro',
  MeetingRoom:   'Sitzungszimmer',
  OpenSpace:     'Open Space',
  FocusRoom:     'Fokusraum',
  Reception:     'Empfang',
  Kitchenette:   'Teeküche',
  WC:            'WC',
  Corridor:      'Korridor',
  Storage:       'Lager',
  Archive:       'Archiv',
  TechnicalRoom: 'Technikraum',
  Cloakroom:     'Garderobe',
  PrintRoom:     'Druckerraum',
  Lounge:        'Lounge',
  Cafeteria:     'Cafeteria',
  TrainingRoom:  'Schulungsraum',
  Lab:           'Labor',
};

// MapLibre instance for the floor canvas — lazy-initialised, torn down on
// route change. The "rooms-fill" useType→colour map is shared with the legend
// styling so a future palette change touches both ends.
let _floorMap = null;
let _floorPopup = null;  // active MapLibre Popup for the clicked room

// useType → fill colour. MapLibre paint specs don't accept CSS
// variables, so this map is the runtime source of truth for the floor
// canvas. The four broad categories below are mirrored as
// `--color-floor-{work,collab,infra,special}` tokens in tokens.css for
// the static legend swatches — keep them in sync when palette changes.
// Pre-computed onto each feature property at spacesFc construction time
// so the MapLibre paint spec stays trivial — `['get', 'fillColor']`
// rather than a `match` expression.
//
// useType is further grouped into a coarser "Nutzung" bucket for the
// default legend: work / collab / infra / special. Used by
// renderFloorLegend to aggregate Σ m² across rooms with related
// useTypes (e.g. Office + OpenSpace + FocusRoom + MeetingRoom + … → work).
const USETYPE_GROUP = {
  Office: 'work', OpenSpace: 'work', FocusRoom: 'work', Reception: 'work',
  MeetingRoom: 'collab', TrainingRoom: 'collab', Lounge: 'collab', Cafeteria: 'collab',
  Corridor: 'infra', WC: 'infra', Kitchenette: 'infra', PrintRoom: 'infra',
  Cloakroom: 'infra', TechnicalRoom: 'infra',
  Storage: 'special', Archive: 'special', Lab: 'special',
};
const USETYPE_GROUP_LABEL = { work: 'Arbeitsplätze', collab: 'Zusammenarbeit', infra: 'Infrastruktur', special: 'Sonderräume' };
const CD_COLOR_FALLBACKS = {
  '--color-floor-work': '#BFDBFE',
  '--color-floor-collab': '#FDE68A',
  '--color-floor-infra': '#E5E7EB',
  '--color-floor-special': '#DDD6FE',
  '--color-floor-work-strong': '#93C5FD',
  '--color-floor-collab-strong': '#FCD34D',
  '--color-floor-infra-strong': '#D1D5DB',
  '--color-floor-special-strong': '#C4B5FD',
  '--color-floor-tenant-a': '#BFDBFE',
  '--color-floor-tenant-b': '#FCD34D',
  '--color-floor-tenant-c': '#DDD6FE',
  '--color-floor-tenant-d': '#FDA4AF',
  '--color-floor-tenant-e': '#86EFAC',
  '--color-floor-tenant-f': '#7DD3FC',
  '--color-floor-unassigned': '#F3F4F6',
  '--color-floor-invalid': '#FEE2E2',
  '--color-bg-canvas': '#FAFAFA',
  '--color-map-outline': '#6B7280',
  // Public-skin value. Skin-aware tokens resolve live from the stylesheet
  // (cdColor reads the body element), so this literal only ever applies if
  // the token itself is missing — it is not a second source of truth.
  '--color-map-selection': '#801519',
  '--color-map-text': '#1F2937',
  '--color-white': '#FFFFFF',
};

function cdColor(tokenName, seen = new Set()) {
  // Body, not documentElement — both resolve the skinned values (the skin
  // wins at :root, see css/foundations/tokens.css), but reading from the
  // element the paint actually applies to keeps this correct if a future
  // skin ever scopes tokens further down the tree.
  const styles = getComputedStyle(document.body || document.documentElement);
  let value = styles.getPropertyValue(tokenName).trim();
  if (!value) return CD_COLOR_FALLBACKS[tokenName] || CD_COLOR_FALLBACKS['--color-map-text'];
  const varMatch = value.match(/^var\((--[^),\s]+)/);
  if (varMatch && !seen.has(varMatch[1])) {
    seen.add(varMatch[1]);
    return cdColor(varMatch[1], seen);
  }
  return value;
}

const USETYPE_GROUP_SWATCH = {
  work: 'floor-legend__swatch--use-work',
  collab: 'floor-legend__swatch--use-collab',
  infra: 'floor-legend__swatch--use-infra',
  special: 'floor-legend__swatch--use-special'
};

// SIA 416 categorisation — `siaCategory` is now a first-class field on
// each Space (see docs/DATAMODEL.md § 3.3.1). Five buckets: HNF
// (Hauptnutzfläche, main usable), NNF (Nebennutzfläche, secondary), VF
// (Verkehrsfläche, circulation), FF (Funktionsfläche, function), TF
// (Technikfläche, technical).
//
// Colours: **SIA 416 doesn't prescribe a palette** — it defines the
// categorisation, not the visualisation. The Swiss official template
// (IDC's `CHE_SIA_416_Modellplan_neutral_v1.xlsx`) is explicitly
// neutral. The hues below are picked for visual distinguishability
// only — five distinct Tailwind-200/300 tones at similar luminance,
// no semantic loading. Swap them freely.
const SIA_LABEL_DE = { HNF: 'Hauptnutzfläche (HNF)', NNF: 'Nebennutzfläche (NNF)', VF: 'Verkehrsfläche (VF)', FF: 'Funktionsfläche (FF)', TF: 'Technikfläche (TF)' };
const SIA_FILL = {
  HNF: cdColor('--color-floor-work'),
  NNF: cdColor('--color-floor-special'),
  VF: cdColor('--color-floor-infra'),
  FF: cdColor('--color-floor-collab'),
  TF: cdColor('--color-floor-collab-strong')
};
const SIA_SWATCH = {
  HNF: 'floor-legend__swatch--sia-hnf',
  NNF: 'floor-legend__swatch--sia-nnf',
  VF: 'floor-legend__swatch--sia-vf',
  FF: 'floor-legend__swatch--sia-ff',
  TF: 'floor-legend__swatch--sia-tf'
};

// Tenant palette — 6 distinct hues assigned at floor-load time to the
// unique `occupierVe` values present on this floor. Wraps if there are
// more than 6 VEs (rare; federal departments per floor are ~3-5).
const TENANT_PALETTE = [
  cdColor('--color-floor-tenant-a'),
  cdColor('--color-floor-tenant-b'),
  cdColor('--color-floor-tenant-c'),
  cdColor('--color-floor-tenant-d'),
  cdColor('--color-floor-tenant-e'),
  cdColor('--color-floor-tenant-f')
];
const TENANT_SWATCH = [
  'floor-legend__swatch--tenant-a',
  'floor-legend__swatch--tenant-b',
  'floor-legend__swatch--tenant-c',
  'floor-legend__swatch--tenant-d',
  'floor-legend__swatch--tenant-e',
  'floor-legend__swatch--tenant-f'
];
const TENANT_UNASSIGNED_FILL = cdColor('--color-floor-unassigned');   // gray-100 for rooms with null occupierVe

const USETYPE_FILL = {
  Office:        cdColor('--color-floor-work'),
  OpenSpace:     cdColor('--color-floor-work'),
  FocusRoom:     cdColor('--color-floor-work-strong'),
  Reception:     cdColor('--color-floor-work'),
  MeetingRoom:   cdColor('--color-floor-collab'),
  TrainingRoom:  cdColor('--color-floor-collab'),
  Lounge:        cdColor('--color-floor-collab'),
  Cafeteria:     cdColor('--color-floor-collab-strong'),
  Corridor:      cdColor('--color-floor-infra'),
  WC:            cdColor('--color-floor-infra-strong'),
  Kitchenette:   cdColor('--color-floor-infra'),
  PrintRoom:     cdColor('--color-floor-infra'),
  Cloakroom:     cdColor('--color-floor-infra'),
  Storage:       cdColor('--color-floor-special'),
  Archive:       cdColor('--color-floor-special-strong'),
  TechnicalRoom: cdColor('--color-floor-infra-strong'),
  Lab:           cdColor('--color-floor-special'),
};

async function renderFloorDetail({ id, floorSlug }, gen) {
  if (!P.state.user) { P.navigate('#/'); return; }
  const t = P.state.tenancies.find(x => x.id === id);
  if (!t) { renderNotFound('Liegenschaft nicht gefunden.', { activeNav: 'properties' }); return; }
  await P.loadSpatialData('data/');
  if (gen !== undefined && gen !== _routeGen) return;   // navigated away while loading

  const buildingFloors = P.state.floors
    .filter(f => f.buildingId === t.buildingId)
    .sort((a, b) => a.levelNumber - b.levelNumber);
  const floor = buildingFloors.find(f => f.floorId === `${t.buildingId}-${floorSlug}`);
  if (!floor) {
    shell({ activeNav: 'properties', breadcrumb: [
      { href: '#/properties', label: P.t('nav.properties') },
      { href: `#/properties/${t.id}`, label: t.buildingName },
      { label: floorSlug }
    ]});
    document.getElementById('page-body').innerHTML = '<div class="container section"><p>Für dieses Geschoss liegt noch kein interaktiver Grundriss vor.</p></div>';
    return;
  }

  shell({ activeNav: 'properties', breadcrumb: [
    { href: '#/properties', label: P.t('nav.properties') },
    { href: `#/properties/${t.id}`, label: t.buildingName },
    { label: floor.name }
  ]});

  const spaces = P.state.spaces.filter(s => s.floorId === floor.floorId);
  const rooms = spaces.filter(s => s.useType !== 'Corridor');
  const userVe = P.state.user.ve;
  const totalArea = rooms.reduce((sum, s) => sum + (s.area || 0), 0);
  const workstations = spaces
    .filter(s => s.useType === 'Office' || s.useType === 'OpenSpace')
    .reduce((sum, s) => sum + (s.capacity || 0), 0);

  // Pre-select a room from ?space=… and the "Einfärben" colour mode from
  // ?color=… on the hash. The colour mode persists across level switches.
  const queryStr = (location.hash.split('?')[1] || '');
  const params = new URLSearchParams(queryStr);
  const initialSpaceId = params.get('space');
  const colorMode = ['none', 'useType', 'sia', 'tenant'].includes(params.get('color')) ? params.get('color') : 'none';
  const colorQuery = colorMode !== 'none' ? `?color=${colorMode}` : '';

  // Same view as #/properties/:id?tab=geschosse — identical hero header and
  // tab strip — with the floor-plan viewer in the Geschosse panel instead of
  // the floor table, plus a back affordance to the table (service-portal
  // Grundrisse pattern).
  const ctx = buildPropertyContext(t);
  const floorPanel = `
    <div class="floor-toolbar">
      <div class="floor-toolbar__group">
        <a class="btn btn--link floor-toolbar__back" href="#/properties/${t.id}?tab=geschosse">
          ${P.icon('chevronLeft')}<span>Alle Geschosse</span>
        </a>
        <div class="floor-switcher" role="tablist" aria-label="Etage wechseln">
          ${buildingFloors.map(f => {
            const slug = f.floorId.replace(t.buildingId + '-', '');
            const isActive = f.floorId === floor.floorId;
            return `<a class="floor-switcher__chip${isActive ? ' floor-switcher__chip--active' : ''}"
                      href="#/properties/${t.id}/floors/${slug}${colorQuery}"
                      ${isActive ? 'aria-current="page"' : ''}>${P.escapeHtml(f.name)}</a>`;
          }).join('')}
        </div>
      </div>

      <div class="floor-toolbar__group floor-toolbar__group--right">
        <label class="floor-toolbar__label" for="floorViewMode">Einfärben</label>
        <select id="floorViewMode" class="input input--sm">
          <option value="none"${colorMode === 'none' ? ' selected' : ''}>Keine</option>
          <option value="useType"${colorMode === 'useType' ? ' selected' : ''}>Nutzung</option>
          <option value="sia"${colorMode === 'sia' ? ' selected' : ''}>SIA 416 Kategorie</option>
          <option value="tenant"${colorMode === 'tenant' ? ' selected' : ''}>Mietende VE</option>
        </select>
        <button class="btn btn--bare btn--sm" type="button" id="floorFullscreenBtn" aria-label="Vollbild">${P.icon('maximize')}Vollbild</button>
      </div>
    </div>

    <p class="floor-header__kpis">Geschoss ${P.escapeHtml(floor.name)} · ${rooms.length} Räume · ${totalArea.toLocaleString('de-CH')} m² HNF2 · ${workstations} Arbeitsplätze</p>

    <div class="floor-viewer">
      <div id="floorCanvas" class="floor-canvas map-surface" aria-label="Interaktiver Grundriss">
        ${renderMapLoading('Grundriss wird geladen')}
      </div>
      <ul class="floor-legend" id="floorLegend" aria-label="Legende"></ul>
    </div>
  `;

  document.getElementById('page-body').innerHTML = `
    ${P.renderShareBar({ backTo: `#/properties/${t.id}?tab=geschosse`, backLabel: t.buildingName })}
    ${propertyDetailScaffold(t, ctx, 'geschosse', floorPanel)}
  `;

  // Tabs on this route navigate back to the property URL (the panel here is
  // the floor viewer, not an in-place-switchable table) — the Geschosse tab
  // itself included, which doubles as a second path back to the floor table.
  // Shared wiring in navigate mode (review M-TABS) also brings the roving
  // Arrow/Home/End pattern here — the inactive tabindex="-1" tabs were
  // keyboard-unreachable with the former click-only binding (review B16).
  wireTabs({
    rootSel: '.property-tabs',
    navigate: true,
    hashFor: (key) => propertyTabHash(t.id, key),
  });

  // Print scope: only while an actual floor plan is on screen may the print
  // stylesheet strip the federal chrome down to the bare plan sheet
  // (css/foundations/print.css). handleHash clears the class on navigation.
  document.body.classList.add('route-floor');

  wirePropertyGallery(t);
  initPropertyDetailMap(t);
  initFloorCanvas(t, floor, spaces, userVe, initialSpaceId, colorMode);

  // Vollbild toggle — fullscreens `.floor-viewer` so the legend stays
  // visible inside the fullscreen surface. After enter/leave we resize
  // the MapLibre canvas so it reflows to the new dimensions.
  const fsBtn = document.getElementById('floorFullscreenBtn');
  const viewer = document.querySelector('.floor-viewer');
  if (fsBtn && viewer) {
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        viewer.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.();
      }
    });
  }
}

// Resize the floor map whenever the fullscreen state of any element flips.
// Bound once at module load — re-binding inside renderFloorDetail would
// double-fire on every route hit.
document.addEventListener('fullscreenchange', () => {
  if (_floorMap) setTimeout(() => { try { _floorMap.resize(); } catch {} }, 60);
});

// Centroid of a polygon's outer ring (drops the closing vertex) — one label
// point per room. A point sits in exactly one vector tile, so room labels no
// longer duplicate on wide polygons (e.g. a full-width corridor) that straddle
// an internal tile boundary.
function polygonLabelPoint(geometry) {
  if (!geometry) return null;
  const ring = geometry.type === 'MultiPolygon'
    ? (geometry.coordinates[0] || [])[0]
    : geometry.coordinates && geometry.coordinates[0];
  if (!ring || !ring.length) return null;
  const last = ring.length - 1;
  const pts = (ring[0][0] === ring[last][0] && ring[0][1] === ring[last][1]) ? ring.slice(0, -1) : ring;
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  return [x / pts.length, y / pts.length];
}
function initFloorCanvas(t, floor, spaces, userVe, initialSpaceId, initialColor) {
  loadMapLibre().then(maplibregl => {
    const container = document.getElementById('floorCanvas');
    if (!container) return;
    if (_floorMap) { try { _floorMap.remove(); } catch {} _floorMap = null; }

    const floorFc = { type: 'FeatureCollection', features: [{
      type: 'Feature',
      geometry: floor.geometry,
      properties: { floorId: floor.floorId, name: floor.name }
    }]};
    // Build the tenant→colour map for this floor: assign a palette
    // entry per unique occupierVe (skipping null), wrapping if there
    // are more VEs than palette slots. Rooms with no occupierVe get
    // the dedicated "unassigned" fill so they're visually distinct
    // rather than colliding with one of the assigned hues.
    const tenantVes = [...new Set(spaces.map(s => s.occupierVe).filter(Boolean))].sort();
    const tenantColors = Object.fromEntries(tenantVes.map((ve, i) => [ve, TENANT_PALETTE[i % TENANT_PALETTE.length]]));
    const tenantSwatches = Object.fromEntries(tenantVes.map((ve, i) => [ve, TENANT_SWATCH[i % TENANT_SWATCH.length]]));

    const spacesFc = { type: 'FeatureCollection', features: spaces.map(s => {
      const useLabel = USETYPE_LABEL_DE[s.useType] || s.useType;
      // Pre-compose a three-line label (number / Nutzung / Fläche) and
      // a colour per view mode. Pre-computing client-side keeps the
      // MapLibre paint spec trivial — the active layer reads e.g.
      // `['get', 'fillUseType']` and we hot-swap which property name
      // it reads via setPaintProperty when the user changes the mode.
      const label = `${s.name}\n${useLabel}\n${s.area} m²`;
      // `siaCategory` is a first-class field on Space (docs/DATAMODEL.md
      // § 3.3.1). Fallback to NNF if a future useType lands without a
      // categorisation in the data — visible in QA as yellow tint.
      const siaCat = s.siaCategory || 'NNF';
      return {
        type: 'Feature',
        geometry: s.geometry,
        properties: {
          spaceId: s.spaceId, floorId: s.floorId, name: s.name,
          useType: s.useType, useLabel, area: s.area, label,
          capacity: s.capacity, isBookable: s.isBookable,
          occupierVe: s.occupierVe, occupierDep: s.occupierDep,
          siaCategory: siaCat,
          // Per-mode pre-computed fills. The active layer reads one of
          // these via `['get', 'fillUseType' | 'fillSia' | 'fillTenant']`.
          // `none` mode short-circuits to the canvas background colour
          // — handled in the change-listener, no fillNone property needed.
          fillUseType: USETYPE_FILL[s.useType] || cdColor('--color-floor-invalid'),
          fillSia:     SIA_FILL[siaCat]        || cdColor('--color-floor-invalid'),
          fillTenant:  s.occupierVe ? tenantColors[s.occupierVe] : TENANT_UNASSIGNED_FILL,
        }
      };
    })};

    // Labels live on their own POINT source — one per room at its centroid.
    // MapLibre tiles GeoJSON internally and a symbol layer over a polygon
    // places an anchor per tile the polygon covers, so a wide room straddling
    // a tile boundary gets labelled twice. A point sits in one tile → one label.
    const labelFc = {
      type: 'FeatureCollection',
      features: spacesFc.features.map(f => {
        const pt = polygonLabelPoint(f.geometry);
        return pt ? { type: 'Feature', geometry: { type: 'Point', coordinates: pt }, properties: { label: f.properties.label } } : null;
      }).filter(Boolean)
    };

    // Active "Einfärben" mode — drives both the MapLibre fill
    // expression and the legend rendering. Held in a closure so the
    // change handler and the legend builder can both read/update it.
    // Default `none` leaves rooms in a neutral canvas tint so the user
    // sees an architectural-style floor plan first; they opt in to a
    // colour coding by picking Nutzung / SIA 416 / Mietende VE.
    let activeMode = ['none', 'useType', 'sia', 'tenant'].includes(initialColor) ? initialColor : 'none';
    // `none` returns a flat white — rooms read as an architectural-style
    // line drawing against the canvas bg, no semantic colour cues.
    const NONE_FILL = cdColor('--color-white');
    const fillExprFor = (mode) => {
      if (mode === 'none') return NONE_FILL;
      return ['get',
        mode === 'sia' ? 'fillSia' : mode === 'tenant' ? 'fillTenant' : 'fillUseType'
      ];
    };

    // Group rooms by the active mode's category key, sum `area` per
    // group, and render the legend with `<swatch> <label> · Σ m²`.
    // Called once at map load and again on every mode change.
    function renderLegend() {
      const legendEl = document.getElementById('floorLegend');
      if (!legendEl) return;
      if (activeMode === 'none') { legendEl.innerHTML = ''; return; }
      let groups; // { key → { label, fill, area } }
      if (activeMode === 'sia') {
        groups = {};
        for (const s of spaces) {
          const cat = s.siaCategory || 'NNF';
          (groups[cat] ??= { label: SIA_LABEL_DE[cat], swatchClass: SIA_SWATCH[cat], area: 0 }).area += s.area;
        }
      } else if (activeMode === 'tenant') {
        groups = {};
        for (const s of spaces) {
          const key = s.occupierVe || '__none__';
          const label = s.occupierVe || 'Nicht zugewiesen';
          const swatchClass = s.occupierVe ? tenantSwatches[s.occupierVe] : 'floor-legend__swatch--unassigned';
          (groups[key] ??= { label, swatchClass, area: 0 }).area += s.area;
        }
      } else { // useType — aggregate into the four broad buckets
        groups = {};
        for (const s of spaces) {
          const grp = USETYPE_GROUP[s.useType] || 'special';
          (groups[grp] ??= { label: USETYPE_GROUP_LABEL[grp], swatchClass: USETYPE_GROUP_SWATCH[grp], area: 0 }).area += s.area;
        }
      }
      legendEl.innerHTML = Object.values(groups)
        .sort((a, b) => b.area - a.area)   // largest area first
        .map(g => `
          <li class="floor-legend__item">
            <span class="floor-legend__swatch ${g.swatchClass}"></span>
            <span class="floor-legend__label">${P.escapeHtml(g.label)}</span>
            <span class="floor-legend__area">${g.area.toLocaleString('de-CH')} m²</span>
          </li>`).join('');
    }

    // Wire the Ansicht dropdown to update the paint expression + legend.
    const floorSlug = floor.floorId.replace(t.buildingId + '-', '');
    const viewModeSelect = document.getElementById('floorViewMode');
    if (viewModeSelect) {
      viewModeSelect.addEventListener('change', e => {
        activeMode = e.target.value;
        if (map.getLayer('rooms-fill')) {
          map.setPaintProperty('rooms-fill', 'fill-color', fillExprFor(activeMode));
        }
        renderLegend();
        // Persist the choice in the URL without a re-render (replaceState keeps
        // zoom/popup state), and carry it onto the floor-switcher links so it
        // survives a level change.
        const base = `#/properties/${t.id}/floors/${floorSlug}`;
        const cur = parseHashQuery(location.hash);
        const qp = new URLSearchParams();
        if (cur.space) qp.set('space', cur.space);   // preserve a deep-linked room
        if (activeMode !== 'none') qp.set('color', activeMode);
        qp.set('lang', state.lang);                  // keep the active language
        history.replaceState(null, '', `${base}?${qp.toString()}`);
        document.querySelectorAll('.floor-switcher__chip').forEach(a => {
          const href = a.getAttribute('href').split('?')[0];
          a.setAttribute('href', activeMode === 'none' ? href : `${href}?color=${activeMode}`);
        });
      });
    }

    // Render the legend immediately — it reads `spaces` (already in
    // memory) and doesn't depend on MapLibre having finished loading.
    // Without this the legend stays empty for the ~1-2 s the basemap
    // CDN takes to respond.
    renderLegend();

    const coords = floor.geometry.coordinates[0];
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    // Centroid as the average of the polygon vertices — good enough for
    // the simple rectangular floors used in the mock data.
    const centerLng = lngs.reduce((s, v) => s + v, 0) / lngs.length;
    const centerLat = lats.reduce((s, v) => s + v, 0) / lats.length;

    // Mirror the working pattern from the workspace-management sample:
    // boot the map with a real basemap style (positron) and a stable
    // `center` + `zoom`, then jumpTo the floor centroid after load. An
    // inline blank style with `bounds` in the constructor pushed MapLibre
    // to auto-fit zoom ~20-21 where small fill polygons stopped rendering.
    const map = new maplibregl.Map({
      container,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [centerLng, centerLat],
      zoom: 18.5,
      attributionControl: false,
      // Cap at 20. Above this, MapLibre's internal geojson vector-tile
      // pipeline behaves inconsistently with our small room polygons —
      // matches the `fitBounds maxZoom: 20` below so the user can never
      // manually scroll back into the broken range.
      maxZoom: 20,
      preserveDrawingBuffer: true,
      // Keep the floor plan oriented like architectural drawings — north up,
      // no rotation gestures. Pinch-zoom and pan stay enabled so users can
      // get close to dense room clusters on a big floor.
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: true,
      // No cooperativeGestures: the plan viewer is the surface the reader
      // came to work in — direct zoom/pan beats the ctrl+wheel guard (kept
      // only on the property-detail location map, which sits mid-page).
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    _floorMap = map;

    function applyFilter(spaceId) {
      if (!map.getLayer('rooms-selected')) return;
      map.setFilter('rooms-selected', ['==', ['get', 'spaceId'], spaceId || '__none__']);
    }
    function closePopup() {
      if (_floorPopup) { try { _floorPopup.remove(); } catch {} _floorPopup = null; }
      applyFilter(null);
    }
    function openPopup(space, lngLat) {
      closePopup();
      applyFilter(space.spaceId);
      _floorPopup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: '280px',
        offset: 8,
        className: 'floor-popup',
      })
        .setLngLat(lngLat)
        .setHTML(buildRoomPopupHtml(t, floor, space))
        .addTo(map);
      _floorPopup.on('close', () => { applyFilter(null); _floorPopup = null; });
    }

    map.on('load', () => {
      clearMapLoading(container);
      // Strip every layer that came from positron so the basemap doesn't
      // bleed under the floor plan. We could hide them individually but a
      // sweep keeps this resilient to upstream style changes — we want
      // only our floor + room polygons visible above a clean background.
      map.getStyle().layers.forEach(l => { try { map.removeLayer(l.id); } catch {} });
      map.addLayer({ id: 'floor-bg', type: 'background', paint: { 'background-color': cdColor('--color-bg-canvas') } });

      map.addSource('floor',  { type: 'geojson', data: floorFc });
      map.addSource('spaces', { type: 'geojson', data: spacesFc });
      map.addSource('space-labels', { type: 'geojson', data: labelFc });

      // Room fills — colour is pre-computed onto each feature for all
      // three view modes (`fillUseType` / `fillSia` / `fillTenant`).
      // The active mode is picked here at load; the Ansicht dropdown's
      // change handler updates the expression via `setPaintProperty`.
      // The room polygons tile the entire floor (8 north + corridor +
      // 8 south = full coverage), so a separate floor-fill underlay is
      // redundant.
      map.addLayer({
        id: 'rooms-fill',
        type: 'fill',
        source: 'spaces',
        paint: {
          'fill-color': fillExprFor(activeMode),
          'fill-opacity': 1
        }
      });

      // Default room outlines — darker / thicker than before for a more
      // legible "every cell is a room" grid feel.
      map.addLayer({
        id: 'rooms-outline',
        type: 'line',
        source: 'spaces',
        paint: { 'line-color': cdColor('--color-map-outline'), 'line-width': 1.25 }
      });

      // Selection outline — filter set on click. Starts hidden.
      map.addLayer({
        id: 'rooms-selected',
        type: 'line',
        source: 'spaces',
        filter: ['==', ['get', 'spaceId'], '__none__'],
        paint: { 'line-color': cdColor('--color-map-selection'), 'line-width': 4 }
      });

      // Floor outline — dark, on top.
      map.addLayer({
        id: 'floor-outline',
        type: 'line',
        source: 'floor',
        paint: { 'line-color': cdColor('--color-map-text'), 'line-width': 2 }
      });

      // Room labels — three lines: room number, German useType label, area.
      // Sourced from the dedicated point layer (`space-labels`, one point per
      // room centroid) so wide polygons label exactly once. Every space gets a
      // label including corridors (Korridor). `text-allow-overlap: false` lets
      // MapLibre self-hide any label that genuinely can't fit.
      map.addLayer({
        id: 'room-labels',
        type: 'symbol',
        source: 'space-labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Regular'],
          'text-size': 11,
          'text-line-height': 1.2,
          'text-anchor': 'center',
          'text-justify': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': cdColor('--color-map-text'),
          'text-halo-color': cdColor('--color-white'),
          'text-halo-width': 1.2
        }
      });

      map.on('click', 'rooms-fill', e => {
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          const space = spaces.find(s => s.spaceId === props.spaceId);
          if (space) openPopup(space, e.lngLat);
        }
      });
      map.on('click', e => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ['rooms-fill'] });
        if (hits.length === 0) closePopup();
      });
      map.on('mouseenter', 'rooms-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'rooms-fill', () => { map.getCanvas().style.cursor = ''; });

      // Fit the floor outline into the visible canvas after every layer is
      // in place. maxZoom 20 keeps us below the level where MapLibre's
      // internal vector tile gets fussy with small fill polygons.
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 40, maxZoom: 20, animate: false }
      );

      if (initialSpaceId) {
        const initial = spaces.find(s => s.spaceId === initialSpaceId);
        if (initial) {
          // Anchor on the polygon's centre — average of its vertices.
          const ring = initial.geometry.coordinates[0];
          const cx = ring.reduce((s, c) => s + c[0], 0) / ring.length;
          const cy = ring.reduce((s, c) => s + c[1], 0) / ring.length;
          openPopup(initial, { lng: cx, lat: cy });
        }
      }
    });
  }).catch(err => {
    console.error(err);
    const container = document.getElementById('floorCanvas');
    if (container) {
      container.innerHTML = '<div class="floor-canvas__error"><p><strong>Grundriss nicht geladen.</strong></p><p>MapLibre konnte nicht initialisiert werden.</p></div>';
    }
  });
}

// HTML for the room info popup — anchored to the click point on the floor
// canvas (map-style). Replaces the prior right-side drawer. Compact: room
// number, useType, key facts, and the single most-likely follow-up action
// (Schadensmeldung). Other actions belong on the property-level page.
function buildRoomPopupHtml(t, floor, space) {
  const useLabel = USETYPE_LABEL_DE[space.useType] || space.useType;
  const subtitle = `${P.escapeHtml(useLabel)}${space.capacity > 0 ? ` · ${space.capacity} ${space.capacity === 1 ? 'Platz' : 'Plätze'}` : ''}`;
  const occupier = space.occupierVe
    ? `${P.escapeHtml(space.occupierVe)}${space.occupierDep ? ' / ' + P.escapeHtml(space.occupierDep) : ''}`
    : '<span class="text-secondary">Gemeinschaftsfläche</span>';
  const repairHref = `#/repair?building=${encodeURIComponent(t.buildingId)}&floor=${encodeURIComponent(floor.floorId)}&space=${encodeURIComponent(space.spaceId)}`;
  return `
    <div class="room-popup">
      <p class="room-popup__title">${P.escapeHtml(space.name)}</p>
      <p class="room-popup__subtitle">${subtitle}</p>
      <dl class="room-popup__facts">
        <div class="room-popup__row"><dt>Fläche</dt><dd>${space.area} m²</dd></div>
        <div class="room-popup__row"><dt>Belegt</dt><dd>${occupier}</dd></div>
        <div class="room-popup__row"><dt>Buchbar</dt><dd>${space.isBookable ? 'ja' : 'nein'}</dd></div>
      </dl>
      <a class="room-popup__action" href="${repairHref}">${P.icon('tool')}Schaden hier melden</a>
    </div>
  `;
}

// ── 11. DOWNLOADS — paginated Document table (§ 6.2) ─────────────────────
const DOCUMENT_PAGE_SIZE = 25;

// Localised Document.type label. The canonical DOC_TYPE_LABEL map in lib.js
// stays the enum source (schema A.10); every enum value carries a doctype.*
// key in data/i18n.json. Values outside the enum fall back to the raw type
// string — never to a doctype.* key name in the UI.
function docTypeLabel(type) {
  return DOC_TYPE_LABEL[type] ? P.t('doctype.' + type) : (type || '');
}

function documentLinkedLabel(d) {
  const ref = (d.linkedTo || [])[0];
  if (!ref) return '—';
  if (ref.entityType === 'Building') {
    const b = P.state.buildings.find(x => x.buildingId === ref.entityId);
    return b ? b.name : ref.entityId;
  }
  if (ref.entityType === 'Tenancy') {
    const t = P.state.tenancies.find(x => x.tenancyId === ref.entityId);
    return t ? t.buildingName : ref.entityId;
  }
  return ref.entityId;
}

// Gallery preview memo: docPageHTML(d, 1, 1) is deterministic per document id
// (docHash-seeded), yet the gallery re-built 25 full 760px sheet templates on
// every filter keystroke / sort / page change (review P1b).
const _docPreviewCache = new Map();

function renderDownloads() {
  if (!P.state.user) { P.navigate('#/'); return; }
  shell({ activeNav: 'downloads', breadcrumb: [{ label: P.t('nav.downloads') }] });

  // Filter + page state persisted in URL hash query (back/forward + shareable).
  // Both filter dimensions are MULTI-value (csv in the URL): Dokumenttyp as a
  // checkbox group, Liegenschaft through the searchable multiselect — both
  // living in the filter SIDEBAR (visible by default, ?sb=0 hides it — same
  // contract as #/properties).
  const docState = { types: [], buildings: [], q: '', page: 1, sort: 'date', view: 'list', sidebar: true };
  const initial = new URLSearchParams((location.hash.split('?')[1] || ''));
  docState.types     = (initial.get('type')     || '').split(',').filter(Boolean);
  docState.buildings = (initial.get('building') || '').split(',').filter(Boolean);
  docState.q        = initial.get('q')        || '';
  // Clamp like every other page parse — `?page=abc` yielded NaN (review B11).
  docState.page     = Math.max(1, parseInt(initial.get('page') || '1', 10) || 1);
  docState.sort     = ['date', 'title', 'doctype'].includes(initial.get('sort')) ? initial.get('sort') : 'date';
  docState.view     = initial.get('view') === 'gallery' ? 'gallery' : 'list';
  docState.sidebar  = initial.get('sb') !== '0';
  // Deep link from the viewer's share popover (`?doc=<id>`): open that
  // document once the table is rendered. Captured before applyDocState()
  // rewrites the hash (which drops the one-shot `doc` param).
  const sharedDocId = initial.get('doc');

  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container">
        <header class="page-header">
          <div>
            <h1 class="h1 page-header__title">${P.t('downloads.title')}</h1>
            <p class="page-header__sub">
              Alle für <strong>${P.escapeHtml(P.state.user.ve)}</strong> freigegebenen Dokumente plus öffentliche Merkblätter.
            </p>
          </div>
        </header>

        <!-- Same catalogue bar as the properties and Vorgänge lists. The two
             dropdowns that used to sit loose in the row are now the filter
             panel's two dimensions, so this page's toolbar has the same
             anatomy and the same control heights as every other list. -->
        ${catalogueBar({
          id: 'docs',
          search: true,
          q: docState.q,
          searchLabel: P.t('downloads.searchLabel'),
          placeholder: P.t('downloads.searchPlaceholder'),
      
          count: '',
          sort: {
            value: docState.sort,
            options: [
              ['date',    'Datum (neueste zuerst)'],
              ['title',   'Titel (A–Z)'],
              ['doctype', 'Typ (A–Z)'],
            ],
          },
          filterLabel: P.t('props.filter'),
          filterCount: docState.types.length + docState.buildings.length,
          panelOpen: docState.sidebar,
          filterControls: 'docs-sidebar',
          view: docState.view,
          views: [
            ['gallery', P.t('props.view.gallery'), 'grid'],
            ['list',    P.t('props.view.list'),    'list'],
          ],
        })}

        <div class="pf-layout${docState.sidebar ? '' : ' pf-layout--sidebar-hidden'}">
          <aside class="pf-sidebar" id="docs-sidebar" aria-label="${P.t('props.filter')}">
            <div class="pf-sidebar__head">
              <h2 class="pf-sidebar__title">${P.t('props.filter')}</h2>
              <button type="button" class="pf-sidebar__close" aria-label="${P.t('props.filter')} ausblenden">${P.icon('x')}</button>
            </div>
            <fieldset class="catbar__fieldset">
              <legend class="catbar__legend">${P.t('downloads.docType')}</legend>
              <div class="catbar__options catbar__options--stacked">
                ${Object.keys(DOC_TYPE_LABEL).map(v => `
                  <label class="catbar__option">
                    <input type="checkbox" name="docs-type" value="${v}"${docState.types.includes(v) ? ' checked' : ''}>
                    <span>${docTypeLabel(v)}</span>
                  </label>`).join('')}
              </div>
            </fieldset>
            <fieldset class="catbar__fieldset">
              <legend class="catbar__legend">${P.t('nav.properties')}</legend>
              <div class="catbar__options catbar__options--stacked">
                ${P.state.buildings.map(b => `
                  <label class="catbar__option">
                    <input type="checkbox" name="docs-building" value="${P.escapeHtml(b.buildingId)}"${docState.buildings.includes(b.buildingId) ? ' checked' : ''}>
                    <span>${P.escapeHtml(b.name)}</span>
                  </label>`).join('')}
              </div>
            </fieldset>
          </aside>
          <div class="pf-main">
            <!-- Mount only — filterPills() (catalogue-bar.js) renders the
                 .filter-pills row itself, review M-PILLS. -->
            <div id="docFilterPills" hidden></div>

            <div class="docs-table-wrap" id="docsListWrap">
              <table class="table table--zebra table--documents">
                <caption class="sr-only">Dokumente mit Typ, Liegenschaft, Format, Sprache und Download-Aktion</caption>
                <thead>
                  <tr>
                    <th scope="col" class="col-title">Titel</th>
                    <th scope="col" class="col-type">Typ</th>
                    <th scope="col" class="col-linked">Verknüpft mit</th>
                    <th scope="col" class="col-format">Format</th>
                    <th scope="col" class="col-size">Grösse</th>
                    <th scope="col" class="col-lang">Sprache</th>
                    <th scope="col" class="col-date">Stand</th>
                    <th scope="col" class="col-action"><span class="sr-only">Aktion</span></th>
                  </tr>
                </thead>
                <tbody id="docTableBody"></tbody>
              </table>
            </div>
            <div class="doc-gallery" id="docsGalleryWrap" hidden></div>

            <div id="docPagination"></div>   <!-- mount; paginationShell renders the <nav class="pagination"> -->
          </div>
        </div>
      </div>
    </section>
  `;

  function filteredDocs() {
    const q = docState.q.toLowerCase();
    const linkedToBuilding = (d, buildingId) => (d.linkedTo || []).some(r =>
      (r.entityType === 'Building' && r.entityId === buildingId) ||
      (r.entityType === 'Tenancy' && P.state.tenancies.some(t =>
        t.tenancyId === r.entityId && t.buildingId === buildingId)));
    return P.state.documents.filter(d => {
      if (docState.types.length && !docState.types.includes(d.type)) return false;
      if (docState.buildings.length && !docState.buildings.some(id => linkedToBuilding(d, id))) return false;
      if (q) {
        const hay = (d.title + ' ' + documentLinkedLabel(d)).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderDocFilterPills() {
    const pills = document.getElementById('docFilterPills');
    if (!pills) return;
    const active = [];
    docState.types.forEach(v => {
      active.push({ key: `type:${v}`, label: 'Typ', value: docTypeLabel(v) });
    });
    docState.buildings.forEach(id => {
      const b = P.state.buildings.find(x => x.buildingId === id);
      active.push({ key: `building:${id}`, label: 'Liegenschaft', value: b ? b.name : id });
    });
    if (docState.q) {
      active.push({ key: 'q', label: 'Suche', value: docState.q });
    }
    // Shared pill markup (catalogue-bar.js, review M-PILLS) in its in-page
    // flavour: <button data-clear> controls, delegated below — clearing a
    // pill writes docState, which only this page knows.
    pills.hidden = active.length === 0;
    pills.innerHTML = filterPills({ pills: active, clearAllLabel: 'Alle Filter zurücksetzen' });
    pills.querySelectorAll('[data-clear]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-clear');
        if (key === 'all') {
          docState.types = []; docState.buildings = []; docState.q = '';
          document.getElementById('docs-q').value = '';
        } else if (key.startsWith('type:')) {
          docState.types = docState.types.filter(v => v !== key.slice(5));
        } else if (key.startsWith('building:')) {
          docState.buildings = docState.buildings.filter(v => v !== key.slice(9));
        } else if (key === 'q') {
          docState.q = '';
          document.getElementById('docs-q').value = '';
        }
        docState.page = 1;
        syncPanelControls();
        applyDocState();
      });
    });
  }

  const DOC_SORTS = {
    date:    (a, b) => String(b.issuedAt || '').localeCompare(String(a.issuedAt || '')),
    title:   (a, b) => a.title.localeCompare(b.title, 'de'),
    doctype: (a, b) => docTypeLabel(a.type).localeCompare(docTypeLabel(b.type), 'de')
      || a.title.localeCompare(b.title, 'de'),
  };

  function applyDocState() {
    const all = filteredDocs();
    all.sort(DOC_SORTS[docState.sort] || DOC_SORTS.date);
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / DOCUMENT_PAGE_SIZE));
    if (docState.page > totalPages) docState.page = totalPages;
    if (docState.page < 1) docState.page = 1;
    const start = (docState.page - 1) * DOCUMENT_PAGE_SIZE;
    const slice = all.slice(start, start + DOCUMENT_PAGE_SIZE);

    renderDocFilterPills();

    // One results surface per view: the table (list, default) or the
    // preview-card gallery. Only the active one is rendered.
    const listWrap = document.getElementById('docsListWrap');
    const galleryWrap = document.getElementById('docsGalleryWrap');
    listWrap.hidden = docState.view !== 'list';
    galleryWrap.hidden = docState.view !== 'gallery';
    setActiveView('docs', docState.view);
    if (docState.view === 'gallery') {
      galleryWrap.innerHTML = slice.length === 0
        ? `<p class="table-empty">Keine Treffer für die aktuellen Filter.</p>`
        : slice.map(d => {
          // The preview sheet is deterministic per document (docHash-seeded
          // mock), so build it once and reuse across re-renders (review P1b).
          let html = _docPreviewCache.get(d.id);
          if (!html) { html = docPageHTML(d, 1, 1); _docPreviewCache.set(d.id, html); }
          return `
          <button type="button" class="doc-card" data-doc-id="${P.escapeHtml(d.id)}">
            <span class="doc-card__preview" aria-hidden="true">${html}</span>
            <span class="doc-card__body">
              <span class="badge badge--info">${P.escapeHtml(docTypeLabel(d.type))}</span>
              <span class="h4 card__title">${P.escapeHtml(d.title)}</span>
              <span class="doc-card__meta">${P.escapeHtml([documentLinkedLabel(d), d.format, d.size, d.issuedAt ? P.formatDate(d.issuedAt) : '']
                .filter(Boolean).join(' · '))}</span>
            </span>
          </button>`;
        }).join('');
      // Card clicks are handled by ONE delegated listener on #docsGalleryWrap,
      // bound once in renderDownloads (review P13).
      // The docpage template is a fixed 760px sheet; zoom to fit the card
      // width exactly (edge to edge, cropped by the preview's aspect box).
      const preview = galleryWrap.querySelector('.doc-card__preview');
      if (preview) {
        galleryWrap.style.setProperty('--preview-scale', (preview.clientWidth / 760).toFixed(4));
      }
    }
    const tbody = document.getElementById('docTableBody');
    if (docState.view !== 'list') {
      tbody.innerHTML = '';
    } else if (slice.length === 0) {
      tbody.innerHTML = emptyRow(8, 'Keine Treffer für die aktuellen Filter.');
    } else {
      tbody.innerHTML = slice.map(d => `
        <tr>
          <td>
            <a href="#" class="docs-table__title-link" data-doc-id="${P.escapeHtml(d.id)}"
               onclick="window.t3lite.openDocViewer('${P.escapeJs(d.id)}'); return false;">
              ${P.icon('document')}<span>${P.escapeHtml(d.title)}</span>
            </a>
          </td>
          <td><span class="badge badge--info">${P.escapeHtml(docTypeLabel(d.type))}</span></td>
          <td class="docs-table__linked">${P.escapeHtml(documentLinkedLabel(d))}</td>
          <td><code>${P.escapeHtml(d.format || '')}</code></td>
          <td>${P.escapeHtml(d.size || '')}</td>
          <td>${P.escapeHtml((d.languages || []).join(' · ').toUpperCase())}</td>
          <!-- Render the ISO date through formatDate, matching the property
               Dokumente panel (review B23). -->
          <td>${d.issuedAt ? P.formatDate(d.issuedAt) : '—'}</td>
          <td class="docs-table__action">
            <a href="#" class="docs-table__download" aria-label="Herunterladen: ${P.escapeHtml(d.title)}"
               onclick="window.portal.toast('Download simuliert: ${P.escapeJs(d.title)}'); return false;">${P.icon('download')}</a>
          </td>
        </tr>
      `).join('');
    }

    // In-place pagination (the live text filter must not full-re-render per
    // keystroke) — same shared markup as #/properties via paginationShell,
    // wired to re-render the table rather than hash-navigate.
    const pag = document.getElementById('docPagination');
    const from = total === 0 ? 0 : start + 1;
    const to   = Math.min(start + DOCUMENT_PAGE_SIZE, total);
    pag.innerHTML = paginationShell({
      current: docState.page, totalPages,
      from, to, totalItems: total,
      entitySingular: 'Dokument', entityPlural: 'Dokumente', entityPluralDative: 'Dokumenten',
      inputId: 'docPaginationInput',
      nav: { kind: 'button' },
    });
    // Shared clamp + bind (review M-PAGING): in-place mode drives the input
    // AND the data-step chevrons; the clamp comes from the input's max
    // attribute, which the shell above just stamped with this render's
    // totalPages.
    wirePaginationInput('docPaginationInput', {
      onPage: (p) => { docState.page = p; applyDocState(); },
    });

    // In-page filtering re-renders neither the bar nor its badge — sync it.
    setFilterCount('docs', docState.types.length + docState.buildings.length);
    const qp = new URLSearchParams();
    if (docState.types.length)     qp.set('type', docState.types.join(','));
    if (docState.buildings.length) qp.set('building', docState.buildings.join(','));
    if (docState.q)        qp.set('q', docState.q);
    if (docState.sort !== 'date')      qp.set('sort', docState.sort);
    if (docState.view === 'gallery')   qp.set('view', 'gallery');
    if (!docState.sidebar)             qp.set('sb', '0');
    if (docState.page > 1) qp.set('page', docState.page);
    qp.set('lang', state.lang);   // keep the active language in shareable URLs
    const newHash = '#/downloads?' + qp.toString();
    if (location.hash !== newHash) history.replaceState(null, '', newHash);
  }

  // This page filters/sorts/switches views IN PAGE (no hashFor): the view
  // switch goes through the bar's `onView` seam (review M-VIEWSWITCH), the
  // remaining hash-driven bindings (sort, filter toggle) are wired manually
  // below.
  wireCatalogueBar({
    id: 'docs',
    onView: (view) => {
      docState.view = view === 'gallery' ? 'gallery' : 'list';
      docState.page = 1; applyDocState();
    },
  });

  // Filter button = disclosure of the filter sidebar (hidden by default).
  // Shared toggle + sidebar-X mechanics live in catalogue-bar.js (review
  // M-SIDEBAR); the visibility persists through docState → the URL.
  wireSidebarToggle({
    buttonId: 'docs-filter',
    onToggle: (open) => { docState.sidebar = open; applyDocState(); },
  });

  const docsSort = document.getElementById('docs-sort');
  if (docsSort) docsSort.addEventListener('change', () => {
    docState.sort = docsSort.value; docState.page = 1; applyDocState();
  });

  // Dokumenttyp checkbox group (multi-value) — shared facet wiring in
  // catalogue-bar.js (review M-CHECKGROUP).
  const typeGroup = wireCheckboxGroup('docs-type', {
    get: () => docState.types,
    set: (next) => { docState.types = next; docState.page = 1; applyDocState(); },
  });

  // Liegenschaften checkbox group (multi-value). The CD multiselect
  // (multiselect.postcss; CSS ported in components/forms.css) was tried here
  // and parked — a second search input inside the filter sidebar competed
  // with the bar's main search. Revisit when the building list outgrows a
  // checkbox column.
  const buildingGroup = wireCheckboxGroup('docs-building', {
    get: () => docState.buildings,
    set: (next) => { docState.buildings = next; docState.page = 1; applyDocState(); },
  });

  // Re-sync panel controls after a pill removal (they aren't re-rendered).
  function syncPanelControls() {
    typeGroup.sync();
    buildingGroup.sync();
  }

  // 150 ms debounce — gallery view re-renders 25 full docpage templates per
  // applyDocState() call, which stuttered when run synchronously on every
  // keystroke (review P1a).
  let docsQTimer = null;
  document.getElementById('docs-q').addEventListener('input', e => {
    docState.q = e.target.value; docState.page = 1;
    clearTimeout(docsQTimer);
    docsQTimer = setTimeout(applyDocState, 150);
  });

  // ONE delegated click listener for the gallery cards, bound once per route
  // render — applyDocState() used to re-attach a listener per card on every
  // filter/sort/page change (review P13).
  document.getElementById('docsGalleryWrap').addEventListener('click', (e) => {
    const card = e.target.closest('.doc-card');
    if (card) window.t3lite.openDocViewer(card.getAttribute('data-doc-id'));
  });

  applyDocState();

  if (sharedDocId && (P.state.documents || []).some(d => d.id === sharedDocId)) {
    // Defer so the table (with its `data-doc-id` triggers) exists — the bridge
    // builds the viewer's prev/next context from it.
    setTimeout(() => {
      // The user may have navigated away within the same tick's queue —
      // never pop the viewer over another route (review views-22).
      if (!location.hash.startsWith('#/downloads')) return;
      window.t3lite.openDocViewer(sharedDocId);
    }, 0);
  }
}

// Federal-CD download list (kbob.admin.ch / armasuisse Immo-Portal pattern).
// Each item:  red down-arrow icon | bold title | optional subtitle | format|size|date meta.
// `items` shape: { title, subtitle?, format, size, languages?, date }
function downloadList(items) {
  return `
    <ul class="download-list">
      ${items.map(it => {
        // A short qualifier (SR number, publishing unit) rides in the meta
        // row rather than on a line of its own: the CD DownloadItem keeps
        // description and meta separate, but ours were one-liners, and a
        // third line pushed every row 27 px taller than the reference.
        // Items carrying a document `id` open the same preview viewer as the
        // downloads page (1:1); plain lists (regulations, strategies, training
        // modules) keep the simulated-download toast.
        const action = it.id
          ? `window.t3lite.openDocViewer('${P.escapeJs(it.id)}'); return false;`
          : `window.portal.toast('Download simuliert: ${P.escapeJs(it.title)}'); return false;`;
        return `
        <li class="download-list__item">
          <a class="download-list__link" href="#"${it.id ? ` data-doc-id="${P.escapeHtml(it.id)}"` : ''} onclick="${action}">
            <span class="download-list__icon">${P.icon(it.id ? 'document' : 'download')}</span>
            <div class="download-list__body">
              <p class="download-list__title">${P.escapeHtml(it.title)}</p>
              <p class="download-list__meta">
                ${[it.subtitle, it.format, it.size, it.languages, it.date]
                  .filter(Boolean)
                  .map(v => `<span>${P.escapeHtml(v)}</span>`).join('')}
              </p>
            </div>
          </a>
        </li>`;
      }).join('')}
    </ul>
  `;
}

// ── 12. SCHADENSMELDUNG (REQ-FA-005 stub) ────────────────────────────────
function renderRepairQuickForm() {
  if (!P.state.user) { P.navigate('#/'); return; }
  shell({ activeNav: 'home', breadcrumb: [{ label: P.t('bc.repair') }] });

  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container container--reading">
        <h1 class="h1 section-heading">Schaden oder Störung melden</h1>
        <p class="section-intro">
          Defekte Heizung, Wasserschaden, Beleuchtung, Schliesssystem: kurze Meldung — BBL Objektmanagement nimmt Kontakt auf und koordiniert die Behebung.
        </p>
        <form class="card stack" onsubmit="event.preventDefault(); window.t3lite.submitRepair(this);">
          <div class="form-field">
            <label class="form-field__label" for="repairBuilding">Liegenschaft <span class="form-field__required">*</span></label>
            <select class="form-field__select" id="repairBuilding" name="building">
              ${tenancyOptions(presetTenancyId())}
            </select>
          </div>
          <div class="form-field">
            <label class="form-field__label" for="repairCategory">Kategorie <span class="form-field__required">*</span></label>
            <select class="form-field__select" id="repairCategory" name="category">
              <option>Sanitär (Wasser, WC, Heizung)</option>
              <option>Elektrik & Beleuchtung</option>
              <option>Schliesssystem / Zutritt</option>
              <option>Aufzug</option>
              <option>Klima & Lüftung</option>
              <option>Sonstiges</option>
            </select>
          </div>
          <fieldset class="form-field option-group">
            <legend class="form-field__label">Dringlichkeit <span class="form-field__required">*</span></legend>
            <label class="option-group__item"><input type="radio" name="urgency" value="low" checked> <span>Niedrig (Termin in 1–2 Wochen)</span></label>
            <label class="option-group__item"><input type="radio" name="urgency" value="med"> <span>Mittel (innerhalb 48 h)</span></label>
            <label class="option-group__item"><input type="radio" name="urgency" value="high"> <span>Hoch (gleicher Tag)</span></label>
            <label class="option-group__item"><input type="radio" name="urgency" value="emergency"> <span>Notfall (sofort, mit Telefon)</span></label>
          </fieldset>
          <div class="form-field">
            <label class="form-field__label" for="repairDescription">Beschreibung <span class="form-field__required">*</span></label>
            <textarea class="form-field__textarea" id="repairDescription" name="desc" placeholder="Wo genau (Raum, Etage), seit wann, Auswirkungen …" required></textarea>
          </div>
          <div class="form-field">
            <label class="form-field__label" for="repairPhoto">Foto (optional)</label>
            <input class="form-field__input" id="repairPhoto" type="file" name="photo">
            <p class="form-field__hint">Hilfreich bei sichtbaren Schäden. Wird wie alle Anhänge auf Schadsoftware geprüft.</p>
          </div>
          <div class="form-field">
            <label class="form-field__label" for="repairPhone">Kontakt für Rückfragen</label>
            <input class="form-field__input" id="repairPhone" type="tel" name="phone" autocomplete="tel" inputmode="tel" placeholder="+41 …" value="">
            <p class="form-field__hint">Nur ausfüllen, wenn ein anderer Kontakt als Ihr eIAM-Profil zuständig ist.</p>
          </div>
          <div class="wizard__sticky-footer">
            <a class="btn btn--outline" href="#/">Abbrechen</a>
            <button type="submit" class="btn btn--filled">Schadensmeldung senden</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

// Shared <option> list of all tenancies for the service-request building
// pickers (Schadensmeldung / Umzug / Sonderreinigung). `presetId` pre-selects
// a building when the form was opened from a property page (?building=…).
function tenancyOptions(presetId) {
  return P.state.tenancies
    .map(t => `<option value="${t.id}"${t.id === presetId ? ' selected' : ''}>${P.escapeHtml(t.buildingName)} — ${P.escapeHtml(t.address)}</option>`)
    .join('');
}
// Resolve the ?building=BLD-xxxx query param to a tenancy id, so a form
// opened from a property page lands on that building pre-selected.
function presetTenancyId() {
  const buildingId = new URLSearchParams(location.hash.split('?')[1] || '').get('building');
  return P.state.tenancies.find(t => t.buildingId === buildingId)?.id;
}

// ── 12b. UMZUG (REQ-FA-006 — moving service) ─────────────────────────────
// Split out of the former combined "Umzug & Sonderreinigung" stub: moving
// and special cleaning are unrelated services with different intake fields,
// so each gets its own form + dropdown entry. Mockup only — submit just
// confirms with a toast and routes back to the building.
function renderMoveForm() {
  if (!P.state.user) { P.navigate('#/'); return; }
  shell({ activeNav: '', breadcrumb: [{ href: '#/services', label: P.t('nav.services') }, { label: P.t('services.move') }] });
  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container container--reading">
        <h1 class="h1 section-heading">Umzug anmelden</h1>
        <p class="section-intro">
          Umzug einzelner Arbeitsplätze, eines Teams oder einer ganzen Organisationseinheit — innerhalb einer Liegenschaft oder an einen anderen Standort. BBL Objektmanagement koordiniert Logistik, Möbel- und IT-Umzug.
        </p>
        <form class="card stack" onsubmit="event.preventDefault(); window.t3lite.submitMove(this);">
          <div class="form-field">
            <label class="form-field__label" for="moveBuilding">Aktuelle Liegenschaft <span class="form-field__required">*</span></label>
            <select class="form-field__select" id="moveBuilding" name="building">${tenancyOptions(presetTenancyId())}</select>
          </div>
          <fieldset class="form-field option-group">
            <legend class="form-field__label">Art des Umzugs <span class="form-field__required">*</span></legend>
            <label class="option-group__item"><input type="radio" name="moveType" value="internal" checked> <span>Innerhalb derselben Liegenschaft</span></label>
            <label class="option-group__item"><input type="radio" name="moveType" value="external"> <span>In eine andere Liegenschaft</span></label>
            <label class="option-group__item"><input type="radio" name="moveType" value="single"> <span>Einzelne Arbeitsplätze / Möbel</span></label>
          </fieldset>
          <div class="form-field">
            <label class="form-field__label" for="moveFrom">Von (Etage / Raum)</label>
            <input class="form-field__input" id="moveFrom" name="from" placeholder="z. B. 2. OG, Raum 214">
          </div>
          <div class="form-field">
            <label class="form-field__label" for="moveTo">Nach (Etage / Raum / Zieladresse)</label>
            <input class="form-field__input" id="moveTo" name="to" placeholder="z. B. 4. OG, Raum 410 — oder neue Adresse">
          </div>
          <div class="form-field">
            <label class="form-field__label" for="moveCount">Anzahl Arbeitsplätze <span class="form-field__required">*</span></label>
            <input class="form-field__input" id="moveCount" name="count" type="number" min="1" value="1" inputmode="numeric" required>
          </div>
          <div class="form-field">
            <label class="form-field__label" for="moveDate">Wunschtermin <span class="form-field__required">*</span></label>
            <input class="form-field__input" id="moveDate" name="date" type="date" required>
            <p class="form-field__hint">BBL bestätigt den Termin nach Prüfung der Logistik.</p>
          </div>
          <fieldset class="form-field option-group">
            <legend class="form-field__label">Zusätzlich benötigt</legend>
            <label class="option-group__item"><input type="checkbox" name="it"> <span>IT- und Telefonie-Umzug (Geräte, Telefonie, Netzwerk)</span></label>
            <label class="option-group__item"><input type="checkbox" name="furniture"> <span>Möbeltransport / -montage</span></label>
            <label class="option-group__item"><input type="checkbox" name="disposal"> <span>Entsorgung / Aktenvernichtung</span></label>
          </fieldset>
          <div class="form-field">
            <label class="form-field__label" for="moveNotes">Bemerkungen</label>
            <textarea class="form-field__textarea" id="moveNotes" name="notes" placeholder="Besonderheiten: Tresore, Grossgeräte, Zugangsbeschränkungen, gewünschte Etappierung …"></textarea>
          </div>
          <div class="form-field">
            <label class="form-field__label" for="movePhone">Kontakt für Rückfragen</label>
            <input class="form-field__input" id="movePhone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+41 …">
          </div>
          <div class="wizard__sticky-footer">
            <a class="btn btn--outline" href="#/services">Abbrechen</a>
            <button type="submit" class="btn btn--filled">Umzug anfragen</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

// ── 12c. SONDERREINIGUNG (REQ-FA-006 — special-cleaning service) ─────────
function renderCleaningForm() {
  if (!P.state.user) { P.navigate('#/'); return; }
  shell({ activeNav: '', breadcrumb: [{ href: '#/services', label: P.t('nav.services') }, { label: P.t('services.cleaning') }] });
  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container container--reading">
        <h1 class="h1 section-heading">Sonderreinigung anfragen</h1>
        <p class="section-intro">
          Reinigung ausserhalb des regulären Unterhalts: Grundreinigung, Bauschlussreinigung, Spezial- und Anlassreinigungen. Die wiederkehrende Standardreinigung ist bereits Teil Ihres Mietverhältnisses.
        </p>
        <form class="card stack" onsubmit="event.preventDefault(); window.t3lite.submitCleaning(this);">
          <div class="form-field">
            <label class="form-field__label" for="cleanBuilding">Liegenschaft <span class="form-field__required">*</span></label>
            <select class="form-field__select" id="cleanBuilding" name="building">${tenancyOptions(presetTenancyId())}</select>
          </div>
          <div class="form-field">
            <label class="form-field__label" for="cleanType">Art der Reinigung <span class="form-field__required">*</span></label>
            <select class="form-field__select" id="cleanType" name="type">
              <option>Grundreinigung</option>
              <option>Bauschlussreinigung (nach Umbau)</option>
              <option>Teppich- / Polsterreinigung</option>
              <option>Fassaden- / Glasreinigung</option>
              <option>Graffiti-Entfernung</option>
              <option>Desinfektion / Hygienereinigung</option>
              <option>Anlass- / Sonderreinigung</option>
              <option>Sonstiges</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-field__label" for="cleanArea">Bereich <span class="form-field__required">*</span></label>
            <input class="form-field__input" id="cleanArea" name="area" placeholder="z. B. 3. OG Sitzungszimmer, Eingangshalle, Tiefgarage" required>
          </div>
          <div class="form-field">
            <label class="form-field__label" for="cleanSize">Ungefähre Fläche (m²)</label>
            <input class="form-field__input" id="cleanSize" name="size" type="number" min="0" inputmode="numeric" placeholder="optional">
          </div>
          <div class="form-field">
            <label class="form-field__label" for="cleanDate">Wunschtermin <span class="form-field__required">*</span></label>
            <input class="form-field__input" id="cleanDate" name="date" type="date" required>
            <p class="form-field__hint">Sonderreinigungen finden in der Regel ausserhalb der Bürozeiten statt.</p>
          </div>
          <div class="form-field">
            <label class="form-field__label" for="cleanDesc">Beschreibung <span class="form-field__required">*</span></label>
            <textarea class="form-field__textarea" id="cleanDesc" name="desc" placeholder="Art der Verschmutzung, Zugang, Besonderheiten (empfindliche Oberflächen, Sicherheitsbereich …)" required></textarea>
          </div>
          <div class="form-field">
            <label class="form-field__label" for="cleanPhone">Kontakt für Rückfragen</label>
            <input class="form-field__input" id="cleanPhone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+41 …">
          </div>
          <div class="wizard__sticky-footer">
            <a class="btn btn--outline" href="#/services">Abbrechen</a>
            <button type="submit" class="btn btn--filled">Sonderreinigung anfragen</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

// ── 13. PROFILE / EINSTELLUNGEN ──────────────────────────────────────────
function renderProfile() {
  if (!P.state.user) { P.navigate('#/'); return; }
  shell({ activeNav: '', breadcrumb: [{ label: P.t('bc.profile') }] });
  const u = P.state.user;
  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container container--reading">
        <h1 class="h1 section-heading">Mein Profil</h1>

        <div class="card profile-page__card">
          <h2 class="card__title">Identität (über eIAM)</h2>
          <dl class="profile-dl">
            <dt>Name</dt><dd>${P.escapeHtml(u.name)}</dd>
            <dt>E-Mail</dt><dd>${P.escapeHtml(u.email)}</dd>
            <dt>eIAM-Subjekt-ID</dt><dd><code>${u.id}</code></dd>
            <dt>Verwaltungs­einheit</dt><dd>${P.escapeHtml(u.ve)}${u.dep ? ' / ' + P.escapeHtml(u.dep) : ''}</dd>
            <!-- The role menu previously had no entry point in any view —
                 openRoleMenu was only reachable from code (review views-18). -->
            <dt>Aktive Rolle</dt><dd><strong>${P.roleLabel(u.activeRole)}</strong>${u.roles.length > 1
              ? ` <button class="btn btn--outline btn--sm" type="button" onclick="window.portal.openRoleMenu()">Rolle wechseln</button>`
              : ''}</dd>
            <dt>Weitere Rollen</dt><dd>${u.roles.filter(r => r !== u.activeRole).map(P.roleLabel).join(' · ') || '—'}</dd>
          </dl>
          <p class="profile-page__note">
            Diese Daten kommen aus dem föderalen eIAM-Verzeichnis und können hier nicht geändert werden. Änderungen über Ihre VE-Administration.
          </p>
        </div>

        <div class="card profile-page__card">
          <h2 class="card__title">Benachrichtigungen</h2>
          <p class="card__lead">Per E-Mail, sobald sich der Status Ihrer Anträge ändert.</p>
          <fieldset class="option-group">
            <legend class="sr-only">Benachrichtigungs-Einstellungen</legend>
            <label class="option-group__item"><input type="checkbox" checked> <span>Statuswechsel meiner Anträge</span></label>
            <label class="option-group__item"><input type="checkbox" checked> <span>Rückfragen / Auflagen vom GS</span></label>
            <label class="option-group__item"><input type="checkbox" checked> <span>Wartungsfenster & Systemmeldungen</span></label>
            <label class="option-group__item"><input type="checkbox"> <span>Tägliche Zusammenfassung statt Einzel-E-Mails</span></label>
          </fieldset>
          <button class="btn btn--outline btn--sm profile-page__save" type="button" onclick="window.portal.toast('Einstellungen gespeichert', 'success')">Einstellungen speichern</button>
        </div>

        <div class="card profile-page__card">
          <h2 class="card__title">Sprache</h2>
          <p class="card__lead">Wird in Inhalten und Benachrichtigungen verwendet, wo verfügbar.</p>
          <fieldset class="option-group">
            <legend class="sr-only">Sprache</legend>
            <label class="option-group__item"><input type="radio" name="lang" checked> <span>Deutsch</span></label>
            <label class="option-group__item"><input type="radio" name="lang" disabled> <span>Français (noch nicht verfügbar)</span></label>
            <label class="option-group__item"><input type="radio" name="lang" disabled> <span>Italiano (noch nicht verfügbar)</span></label>
            <label class="option-group__item"><input type="radio" name="lang" disabled> <span>Rumantsch (nicht vorgesehen)</span></label>
          </fieldset>
        </div>

        <button class="btn btn--bare" type="button" onclick="window.portal.logout()">Abmelden</button>
      </div>
    </section>
  `;
}

// ── SERVICES OVERVIEW (linked from the nav dropdown "Übersicht") ────────
// One card per catalogued service. Every surface that shows services — this
// page, the front-page tiles — renders through here, so a service added to
// data/services.json appears everywhere with identical markup and affordances.
function serviceCard(svc) {
  const cls = svc.external ? 'card--quick link--external' : 'card--quick';
  const attrs = svc.external ? ' target="_blank" rel="noopener"' : '';
  return `
    <a href="${svc.href}" class="${cls}"${attrs}>
      <p class="card--quick__title">${P.escapeHtml(svc.label)}</p>
      <p class="card--quick__desc">${P.escapeHtml(svc.desc || '')}</p>
      ${arrowBtn({ external: svc.external })}
    </a>
  `;
}

// The catalogue, minus its own overview entry — that one exists so the nav
// dropdown can link back to this page, and listing it here would be a card
// pointing at the page you are on.
function catalogueServices() {
  return (P.state.services || []).filter(s => s.serviceId !== 'uebersicht').map(resolveService);
}

function renderServicesOverview() {
  shell({ breadcrumb: [{ label: P.t('nav.services') }] });
  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container">
        <h1 class="h1 section-heading">${P.t('services.title')}</h1>
        <p class="section-intro">
          BBL bewirtschaftet die Immobilien der Bundesverwaltung. Über das Mieterportal stellen Bundes-Mietende die folgenden Anfragen direkt — geführt, dokumentiert, übergabefähig an SAP ePPM.
        </p>
      </div>
    </section>
    <section class="section section--alt">
      <div class="container">
        <div class="card-grid">
          ${catalogueServices().map(serviceCard).join('')}
        </div>
      </div>
    </section>
  `;
}

// ── GENERIC SERVICE STUB (for roadmap services not yet implemented) ─────
// Placeholder for services that aren't wired up yet in the prototype.
// The `reqId` argument is preserved on the function signature so call
// sites don't change, but the value is no longer surfaced to users —
// it stays in code comments / commit history for traceability.
function renderServiceStub(title, _reqId, lead, externalUrl) {
  shell({ breadcrumb: [{ href: '#/services', label: P.t('nav.services') }, { label: title }] });
  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container container--reading">
        <h1 class="h1 section-heading">${P.escapeHtml(title)}</h1>
        <p class="service-stub__lead">${P.escapeHtml(lead)}</p>
        <div class="service-stub__actions">
          ${externalUrl ? `<a href="${externalUrl}" target="_blank" rel="noopener" class="btn btn--filled link--external">Zum Schwesterprojekt</a>` : ''}
          <a href="#/services" class="btn btn--outline">${P.icon('chevronLeft')} Zurück zur Übersicht</a>
        </div>
        <p class="service-stub__hint">
          Diese Funktion wird in einer der nächsten Iterationen freigeschaltet.
        </p>
      </div>
    </section>
  `;
}

// ── EXTERNAL API (used by inline event handlers) ─────────────────────────
// ── DOCUMENT VIEWER (Confluence-style preview) ───────────────────────────
// Full-screen dark overlay opened from a downloads row. Content is mocked
// (the prototype ships no real binaries): three page templates — text,
// floor-plan schematic, certificate — chosen by document type. Supports
// multi-page vertical scroll, width-based zoom, drag-to-pan, a mock
// comments panel, and simulated download/upload. CD-aligned: chrome uses
// the federal dark navy tokens; no raw colours (the CD guard forbids them).

// Stable pseudo-random integer from a document id — keeps page counts and
// mock labels identical across re-opens.
function docHash(id) {
  let h = 2166136261;
  const s = String(id || '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mockPageCount(doc) {
  const h = docHash(doc.documentId || doc.id);
  switch (doc.type) {
    case 'FloorPlan':            return 1 + (h % 2);   // 1–2
    case 'Certificate':
    case 'Permit':               return 1;             // 1
    case 'Manual':               return 4 + (h % 7);   // 4–10
    case 'Lease':                return 3 + (h % 4);   // 3–6
    case 'WiBe':
    case 'LegalBasis':
    case 'Regulation':           return 2 + (h % 4);   // 2–5
    default:                     return 1 + (h % 3);   // 1–3
  }
}

// German administrative filler — federal tone, deterministically composed.
const DOC_FILLER = [
  'Die vorliegende Dokumentation beschreibt die für das Mietverhältnis massgeblichen Rahmenbedingungen gemäss den Vorgaben des Bundesamtes für Bauten und Logistik.',
  'Sämtliche Angaben beziehen sich auf den zum Ausstellungszeitpunkt gültigen Stand der Bewirtschaftung und sind im Kontext der einschlägigen Verordnungen des Bundes zu lesen.',
  'Abweichungen von den hier festgehaltenen Festlegungen bedürfen der schriftlichen Zustimmung der zuständigen Stelle des BBL sowie der betroffenen Verwaltungseinheit.',
  'Die Flächen sind nach SIA 416 ermittelt; massgebend für die Verrechnung ist die Hauptnutzfläche (HNF2) gemäss dem geltenden Flächenmanagement des Bundes.',
  'Wartungs- und Unterhaltsarbeiten werden durch das Objektmanagement koordiniert und den Mietenden rechtzeitig angekündigt, sofern Betriebsabläufe betroffen sind.',
  'Im Übrigen gelten die allgemeinen Bestimmungen des Bundes über die Unterbringung der zivilen Bundesverwaltung sowie die jeweils geltenden Weisungen.',
  'Die Klassifizierung der Arbeitsplätze erfolgt nach dem Modell der Neuen Arbeitswelten unter Berücksichtigung des vorgegebenen Belegungsfaktors.',
];
function docFiller(seed, sentences) {
  const out = [];
  for (let i = 0; i < sentences; i++) out.push(DOC_FILLER[(seed + i) % DOC_FILLER.length]);
  return out.join(' ');
}
const DOC_CREST = '<img class="docpage__crest" src="assets/swiss-logo-flag.svg" alt="" aria-hidden="true">';
function docPageFooter(doc, n, total) {
  return `<footer class="docpage__footer">
    <span>${P.escapeHtml(doc.documentId || doc.id || '')}</span>
    <span>BBL Mieterportal · Mock-Vorschau</span>
    <span>Seite ${n} / ${total}</span>
  </footer>`;
}
function docPageText(doc, n, total) {
  const seed = docHash(doc.documentId || doc.id) + n;
  const paras = Array.from({ length: 4 }, (_, i) => `<p class="docpage__p">${docFiller(seed + i * 2, 3)}</p>`).join('');
  return `
    <article class="docpage docpage--text">
      ${n === 1 ? `
        <header class="docpage__letterhead">
          ${DOC_CREST}
          <span class="docpage__org">Schweizerische Eidgenossenschaft<br>Bundesamt für Bauten und Logistik BBL</span>
        </header>
        <h1 class="docpage__title">${P.escapeHtml(doc.title)}</h1>
        <dl class="docpage__metagrid">
          <div><dt>Typ</dt><dd>${P.escapeHtml(docTypeLabel(doc.type))}</dd></div>
          <div><dt>Format</dt><dd>${P.escapeHtml(doc.format || '')}</dd></div>
          <div><dt>Ausgestellt</dt><dd>${P.escapeHtml(doc.issuedAt || '—')}</dd></div>
          <div><dt>Sprachen</dt><dd>${P.escapeHtml((doc.languages || []).join(' · ').toUpperCase() || '—')}</dd></div>
        </dl>
      ` : `<h2 class="docpage__subtitle">${P.escapeHtml(doc.title)} — Fortsetzung</h2>`}
      ${paras}
      ${docPageFooter(doc, n, total)}
    </article>`;
}
function docPageCertificate(doc, n, total) {
  const kind = doc.type === 'Permit' ? 'Bewilligung' : 'Zertifikat';
  return `
    <article class="docpage docpage--cert">
      ${DOC_CREST}
      <p class="docpage__cert-org">Schweizerische Eidgenossenschaft · Bundesamt für Bauten und Logistik BBL</p>
      <p class="docpage__cert-kicker">${kind}</p>
      <h1 class="docpage__cert-title">${P.escapeHtml(doc.title)}</h1>
      <p class="docpage__cert-body">Hiermit wird bestätigt, dass die vorstehend bezeichnete Liegenschaft die Anforderungen gemäss den massgebenden Vorgaben des Bundes erfüllt. Diese ${kind} ist Bestandteil der Objektdokumentation im Mieterportal des Bundes.</p>
      <p class="docpage__cert-place">Bern, ${P.escapeHtml(doc.issuedAt || '—')}</p>
      <div class="docpage__cert-sign">
        <span class="docpage__cert-name">BBL Portfolio-Management</span>
        <span class="docpage__seal" aria-hidden="true"><span>BBL · BUND</span></span>
      </div>
      ${docPageFooter(doc, n, total)}
    </article>`;
}
const PLAN_ROOMS = ['Büro', 'Sitzung', 'Lager', 'Technik', 'Archiv', 'Teeküche', 'Empfang', 'Flur'];
function docPagePlan(doc, n, _total) {
  const h = docHash((doc.documentId || doc.id) + ':' + n);
  const room = (i) => P.escapeHtml(PLAN_ROOMS[(h + i) % PLAN_ROOMS.length]);
  return `
    <article class="docpage docpage--plan">
      <svg class="docpage__plan" viewBox="0 0 420 594" role="img" aria-label="Schematischer Grundriss (Mock-Vorschau)">
        <rect class="plan-sheet" x="2" y="2" width="416" height="590"/>
        <g class="plan-north" transform="translate(372,52)">
          <line x1="0" y1="14" x2="0" y2="-14"/><line x1="0" y1="-14" x2="-5" y2="-6"/><line x1="0" y1="-14" x2="5" y2="-6"/>
          <text class="plan-label" x="0" y="30">N</text>
        </g>
        <rect class="plan-wall" x="34" y="40" width="300" height="300"/>
        <line class="plan-wall" x1="34" y1="190" x2="334" y2="190"/>
        <line class="plan-wall" x1="150" y1="40"  x2="150" y2="190"/>
        <line class="plan-wall" x1="244" y1="40"  x2="244" y2="190"/>
        <line class="plan-wall" x1="184" y1="190" x2="184" y2="340"/>
        <line class="plan-wall" x1="184" y1="265" x2="334" y2="265"/>
        <rect class="plan-room" x="44"  y="50"  width="96"  height="130"/><text class="plan-label" x="92"  y="118">${room(0)}</text>
        <rect class="plan-room" x="160" y="50"  width="74"  height="130"/><text class="plan-label" x="197" y="118">${room(1)}</text>
        <rect class="plan-room" x="254" y="50"  width="70"  height="130"/><text class="plan-label" x="289" y="118">${room(2)}</text>
        <rect class="plan-room" x="44"  y="200" width="130" height="130"/><text class="plan-label" x="109" y="268">${room(3)}</text>
        <rect class="plan-room" x="194" y="200" width="130" height="55"/> <text class="plan-label" x="259" y="231">${room(4)}</text>
        <rect class="plan-room" x="194" y="275" width="130" height="55"/> <text class="plan-label" x="259" y="306">${room(5)}</text>
        <rect class="plan-titleblock" x="34" y="384" width="300" height="86"/>
        <text class="plan-title" x="46" y="410">${P.escapeHtml(doc.title)}</text>
        <text class="plan-meta"  x="46" y="432">Massstab 1:100 · ${P.escapeHtml(doc.issuedAt || '—')}</text>
        <text class="plan-meta"  x="46" y="452">${P.escapeHtml(doc.documentId || doc.id || '')} · Mock-Vorschau</text>
      </svg>
    </article>`;
}
function docPageHTML(doc, n, total) {
  if (doc.type === 'FloorPlan') return docPagePlan(doc, n, total);
  if (doc.type === 'Certificate' || doc.type === 'Permit') return docPageCertificate(doc, n, total);
  return docPageText(doc, n, total);
}

// Mock comment threads for the side panel.
const DOC_COMMENTS = [
  { who: 'Andrea Meier', ve: 'GS UVEK', when: 'vor 2 Tagen', text: 'Bitte prüfen, ob die Flächenangabe auf Seite 1 noch dem aktuellen Stand entspricht.' },
  { who: 'Lars Hofmann', ve: 'BBL-PFM', when: 'vor 1 Tag', text: 'Stimmt mit dem SAP-Stammblatt überein — Freigabe aus PFM-Sicht erteilt.' },
  { who: 'Nadine Frey', ve: 'BBL Objektmanagement', when: 'vor 4 Std.', text: 'Aktualisierte Version nach der Begehung folgt nächste Woche.' },
];
function docCommentsHTML() {
  const initials = (name) => name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return DOC_COMMENTS.map(c => `
    <li class="docviewer__comment">
      <span class="docviewer__avatar" aria-hidden="true">${P.escapeHtml(initials(c.who))}</span>
      <div class="docviewer__comment-body">
        <p class="docviewer__comment-head"><strong>${P.escapeHtml(c.who)}</strong> <span>${P.escapeHtml(c.ve)} · ${P.escapeHtml(c.when)}</span></p>
        <p class="docviewer__comment-text">${P.escapeHtml(c.text)}</p>
      </div>
    </li>`).join('');
}

// Full-screen document preview. `siblings` (optional) is an ordered list of
// the documents currently available in the view the user opened this from
// (the downloads table page, or a property's linked-document groups) — when
// it holds more than one entry, left/right chevrons + a "Dokument X / Y"
// indicator let the user page through them without leaving the viewer. The
// chrome (backdrop, key handler, close) persists across navigation; only the
// per-document content is re-mounted, so switching is a content swap, not a
// teardown.
function openDocumentViewer(doc, siblings) {
  if (!doc) return;
  const opener = document.activeElement;
  const docKey = d => d.documentId || d.id;
  const list = (Array.isArray(siblings) && siblings.length) ? siblings : [doc];
  let pos = list.findIndex(d => docKey(d) === docKey(doc));
  if (pos < 0) pos = 0;

  const backdrop = document.createElement('div');
  backdrop.className = 'docviewer';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  document.body.appendChild(backdrop);
  document.body.classList.add('docviewer-open');

  // Refs reassigned by mount() each time a (new) document is rendered.
  let stage, pagesEl, readout, indicator, commentsEl, commentsBtn, total, baseW;
  // Width-based zoom: scaling the page width (not a CSS transform) keeps the
  // stage natively scrollable in both axes, so pan + multi-page scroll work
  // without extra layout maths. baseW fits the page to the stage initially.
  let zoom = 1;
  function applyZoom() {
    zoom = Math.max(0.5, Math.min(3, Math.round(zoom * 100) / 100));
    if (pagesEl) pagesEl.style.setProperty('--docpage-w', Math.round(baseW * zoom) + 'px');
    if (readout) readout.textContent = Math.round(zoom * 100) + '%';
  }

  function close() {
    unregisterOverlay();
    closeShare();
    document.removeEventListener('keydown', onKeydown, true);
    backdrop.remove();
    document.body.classList.remove('docviewer-open');
    if (opener && typeof opener.focus === 'function') { try { opener.focus(); } catch {} }
  }
  // Route changes close the viewer through the shared registry (review B3).
  const unregisterOverlay = registerOverlay(close);

  // ── Share popover (Confluence-style "share this document") ──────────────
  // A light popover anchored under the share button, offering a deep link
  // that reopens the document (#/downloads?doc=…), a copy button and an
  // e-mail shortcut. Appended to the backdrop; torn down on remount/close.
  function buildShareUrl(d) {
    return `${location.origin + location.pathname}#/downloads?doc=${encodeURIComponent(docKey(d))}&lang=${P.state.lang}`;
  }
  function shareEl() { return backdrop.querySelector('.docviewer-share'); }
  function closeShare() {
    const el = shareEl();
    if (el) el.remove();
    document.removeEventListener('pointerdown', onSharePointer, true);
    const btn = backdrop.querySelector('[data-act="share"]');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
  function onSharePointer(e) {
    const el = shareEl();
    if (!el) return;
    if (el.contains(e.target) || e.target.closest('[data-act="share"]')) return;
    closeShare();
  }
  function copyShareUrl(url, btn) {
    const ok = () => {
      P.toast('Link kopiert.', 'success');
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = `${P.icon('check')} Kopiert`;
        setTimeout(() => { if (btn.isConnected) btn.innerHTML = orig; }, 1500);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(ok).catch(() => fallbackCopyShare(url, ok));
    } else { fallbackCopyShare(url, ok); }
  }
  function fallbackCopyShare(text, ok) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.setProperty('position', 'fixed'); ta.style.setProperty('opacity', '0');
      backdrop.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy'); ta.remove(); ok();
    } catch { P.toast('Kopieren nicht möglich — Link manuell kopieren.'); }
  }
  function openShare(btn) {
    closeShare();
    const d = list[pos];
    const url = buildShareUrl(d);
    const mail = `mailto:?subject=${encodeURIComponent('Dokument: ' + (d.title || ''))}&body=${encodeURIComponent((d.title || '') + '\n' + url)}`;
    const pop = document.createElement('div');
    pop.className = 'docviewer-share';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Dokument teilen');
    pop.innerHTML = `
      <p class="docviewer-share__title">Dokument teilen</p>
      <p class="docviewer-share__hint">Jede Person mit Zugriff auf das Mieterportal kann das Dokument über diesen Link öffnen.</p>
      <div class="docviewer-share__row">
        <input class="docviewer-share__input" type="text" readonly aria-label="Freigabe-Link">
        <button class="btn btn--filled btn--sm docviewer-share__copy" type="button" data-share-copy>${P.icon('link')} Kopieren</button>
      </div>
      <a class="docviewer-share__mail" href="${mail}" data-share-email>${P.icon('envelope')} Per E-Mail teilen</a>`;
    backdrop.appendChild(pop);
    // Anchor under the share button, right-aligned to it. The right offset
    // must also be clamped against the popover's own width (readable only
    // after appendChild): on narrow phones the share button sits further
    // left than the popover is wide, and an unclamped offset pushes the
    // panel past the LEFT viewport edge (RWD-007). 8px minimum inset on
    // both sides; the CSS max-width (100vw − 32px) guarantees both clamps
    // are satisfiable at once.
    const r = btn.getBoundingClientRect();
    pop.style.setProperty('top', (r.bottom + 8) + 'px');
    const right = Math.min(
      Math.max(8, window.innerWidth - r.right),
      window.innerWidth - pop.offsetWidth - 8,
    );
    pop.style.setProperty('right', right + 'px');
    btn.setAttribute('aria-expanded', 'true');
    const input = pop.querySelector('.docviewer-share__input');
    input.value = url;
    const copyBtn = pop.querySelector('[data-share-copy]');
    copyBtn.addEventListener('click', () => copyShareUrl(url, copyBtn));
    pop.querySelector('[data-share-email]').addEventListener('click', () => closeShare());
    setTimeout(() => { try { input.focus(); input.select(); } catch {} }, 0);
    // Outside-click closes (deferred so the opening click doesn't immediately close it).
    setTimeout(() => document.addEventListener('pointerdown', onSharePointer, true), 0);
  }

  // Wrap-around navigation between sibling documents; the "Dokument X / Y"
  // indicator keeps the position legible even when wrapping.
  function go(delta) {
    if (list.length < 2) return;
    pos = (pos + delta + list.length) % list.length;
    mount();
    try { stage.focus(); } catch {}
  }
  function onKeydown(e) {
    const typing = document.activeElement && document.activeElement.matches && document.activeElement.matches('textarea, input');
    if (e.key === 'Escape') {
      // A first Esc dismisses the share popover; a second closes the viewer.
      if (shareEl()) { e.preventDefault(); closeShare(); const sb = backdrop.querySelector('[data-act="share"]'); if (sb) sb.focus(); return; }
      e.preventDefault(); close(); return;
    }
    if (!typing && (e.key === '+' || e.key === '=')) { e.preventDefault(); zoom += 0.25; applyZoom(); return; }
    if (!typing && (e.key === '-' || e.key === '_')) { e.preventDefault(); zoom -= 0.25; applyZoom(); return; }
    if (!typing && e.key === '0') { e.preventDefault(); zoom = 1; applyZoom(); return; }
    if (!typing && e.key === 'ArrowLeft'  && list.length > 1) { e.preventDefault(); go(-1); return; }
    if (!typing && e.key === 'ArrowRight' && list.length > 1) { e.preventDefault(); go(1);  return; }
    if (e.key !== 'Tab') return;
    const f = Array.from(backdrop.querySelectorAll('button, a[href], textarea, input, [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function mount() {
    closeShare();   // tear down any popover before the innerHTML reset
    const doc = list[pos];
    const hasSiblings = list.length > 1;
    total = mockPageCount(doc);
    const pages = Array.from({ length: total }, (_, i) => docPageHTML(doc, i + 1, total)).join('');
    backdrop.setAttribute('aria-label', 'Dokumentvorschau: ' + (doc.title || ''));
    backdrop.innerHTML = `
    <div class="docviewer__bar">
      <div class="docviewer__heading">
        ${P.icon('document', 'docviewer__heading-icon')}
        <div class="docviewer__heading-text">
          <p class="docviewer__title">${P.escapeHtml(doc.title)}</p>
          <p class="docviewer__sub">${P.escapeHtml(docTypeLabel(doc.type))} · ${P.escapeHtml(doc.format || '')} · <span data-page-indicator>Seite 1 / ${total}</span>${hasSiblings ? ` · <span class="docviewer__docnum">Dokument ${pos + 1} / ${list.length}</span>` : ''}</p>
        </div>
      </div>
      <div class="docviewer__actions">
        <button class="docviewer__btn" type="button" data-act="download" aria-label="Herunterladen" title="Herunterladen">${P.icon('download')}</button>
        <button class="docviewer__btn" type="button" data-act="upload" aria-label="Neue Version hochladen" title="Neue Version hochladen">${P.icon('upload')}</button>
        <button class="docviewer__btn" type="button" data-act="share" aria-label="Dokument teilen" title="Teilen" aria-haspopup="dialog" aria-expanded="false">${P.icon('share')}</button>
        <button class="docviewer__btn" type="button" data-act="comments" aria-label="Kommentare anzeigen" title="Kommentare" aria-pressed="false">${P.icon('commentDots')}</button>
        <button class="docviewer__btn docviewer__btn--close" type="button" data-act="close" aria-label="Vorschau schliessen" title="Schliessen">${P.icon('x')}</button>
      </div>
    </div>
    <div class="docviewer__main">
      ${hasSiblings ? `<button class="docviewer__nav docviewer__nav--prev" type="button" data-act="prev" aria-label="Vorheriges Dokument" title="Vorheriges Dokument">${P.icon('chevronLeft')}</button>` : ''}
      <div class="docviewer__stage" tabindex="0" aria-label="Dokumentseiten">
        <div class="docviewer__pages">${pages}</div>
      </div>
      ${hasSiblings ? `<button class="docviewer__nav docviewer__nav--next" type="button" data-act="next" aria-label="Nächstes Dokument" title="Nächstes Dokument">${P.icon('chevronRight')}</button>` : ''}
      <aside class="docviewer__comments" aria-label="Kommentare" hidden>
        <h2 class="docviewer__comments-title">Kommentare</h2>
        <ul class="docviewer__comments-list">${docCommentsHTML()}</ul>
        <div class="docviewer__comments-add">
          <textarea class="form-field__textarea" rows="2" placeholder="Kommentar hinzufügen … (Demo)" aria-label="Kommentar hinzufügen"></textarea>
          <button class="btn btn--filled btn--sm" type="button" data-act="comment-send">Senden</button>
        </div>
      </aside>
    </div>
    <div class="docviewer__toolbar" role="group" aria-label="Zoom-Steuerung">
      <button class="docviewer__zoom" type="button" data-act="zoom-out" aria-label="Verkleinern" title="Verkleinern">${P.icon('minus')}</button>
      <button class="docviewer__zoom docviewer__zoom--reset" type="button" data-act="zoom-reset" aria-label="Zoom zurücksetzen" title="Zurücksetzen"><span data-zoom-readout>100%</span></button>
      <button class="docviewer__zoom" type="button" data-act="zoom-in" aria-label="Vergrössern" title="Vergrössern">${P.icon('plus')}</button>
    </div>`;

    stage = backdrop.querySelector('.docviewer__stage');
    pagesEl = backdrop.querySelector('.docviewer__pages');
    readout = backdrop.querySelector('[data-zoom-readout]');
    indicator = backdrop.querySelector('[data-page-indicator]');
    commentsEl = backdrop.querySelector('.docviewer__comments');
    commentsBtn = backdrop.querySelector('[data-act="comments"]');

    // Pin the comments rail below the sticky bar (its height is responsive).
    const barEl = backdrop.querySelector('.docviewer__bar');
    backdrop.style.setProperty('--docviewer-bar-h', barEl.offsetHeight + 'px');

    baseW = Math.max(280, Math.min(840, backdrop.clientWidth - 56));
    zoom = 1;
    applyZoom();

    // Drag-to-pan scrolls the viewer itself (handy when zoomed wider than the
    // viewport); the wheel and the page-level scrollbar work as usual too.
    let panning = false, px = 0, py = 0, sl = 0, st = 0;
    stage.addEventListener('pointerdown', e => {
      if (e.target.closest('button, a, textarea, input')) return;
      panning = true; px = e.clientX; py = e.clientY; sl = backdrop.scrollLeft; st = backdrop.scrollTop;
      stage.classList.add('docviewer__stage--grabbing');
      try { stage.setPointerCapture(e.pointerId); } catch {}
    });
    stage.addEventListener('pointermove', e => {
      if (!panning) return;
      backdrop.scrollLeft = sl - (e.clientX - px);
      backdrop.scrollTop  = st - (e.clientY - py);
    });
    const endPan = () => { panning = false; stage.classList.remove('docviewer__stage--grabbing'); };
    stage.addEventListener('pointerup', endPan);
    stage.addEventListener('pointercancel', endPan);

    backdrop.querySelector('[data-act="close"]').addEventListener('click', close);
    backdrop.querySelector('[data-act="share"]').addEventListener('click', () => {
      shareEl() ? closeShare() : openShare(backdrop.querySelector('[data-act="share"]'));
    });
    backdrop.querySelector('[data-act="download"]').addEventListener('click', () => P.toast('Download simuliert: ' + doc.title, 'success'));
    backdrop.querySelector('[data-act="upload"]').addEventListener('click', () => P.toast('Neue Version hochladen — simuliert.'));
    backdrop.querySelector('[data-act="comment-send"]').addEventListener('click', () => P.toast('Kommentar gespeichert (Demo).', 'success'));
    commentsBtn.addEventListener('click', () => {
      const open = backdrop.classList.toggle('docviewer--comments-open');
      commentsBtn.setAttribute('aria-pressed', String(open));
      commentsEl.hidden = !open;
    });
    backdrop.querySelector('[data-act="zoom-in"]').addEventListener('click', () => { zoom += 0.25; applyZoom(); });
    backdrop.querySelector('[data-act="zoom-out"]').addEventListener('click', () => { zoom -= 0.25; applyZoom(); });
    backdrop.querySelector('[data-act="zoom-reset"]').addEventListener('click', () => { zoom = 1; applyZoom(); });
    const prevBtn = backdrop.querySelector('[data-act="prev"]');
    const nextBtn = backdrop.querySelector('[data-act="next"]');
    if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => go(1));
  }

  // Page indicator follows the page nearest the viewport centre. The viewer
  // is the scroller now, so measure each page against the window. Bound ONCE
  // per viewer open — mount() re-runs per document switch and stacked a
  // fresh listener each time (review B24); the handler re-queries `.docpage`
  // and reads the mount-refreshed `indicator`/`total` refs each run anyway.
  let raf = null;
  backdrop.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      if (!indicator) return;
      const ps = backdrop.querySelectorAll('.docpage');
      const mid = window.innerHeight / 2;
      let idx = 0;
      ps.forEach((p, i) => { if (p.getBoundingClientRect().top <= mid) idx = i; });
      indicator.textContent = `Seite ${idx + 1} / ${total}`;
    });
  });

  document.addEventListener('keydown', onKeydown, true);
  mount();
  setTimeout(() => { try { stage.focus(); } catch {} }, 0);
}

window.t3lite = {
  newsPage(p) {
    const total = Math.max(1, Math.ceil((P.state.news || []).length / 3));
    const target = Math.max(0, Math.min(total - 1, p));
    newsPage = target;
    const track = document.getElementById('newsTrack');
    if (!track) { P.handleHash(); return; }
    // Re-render only the news section in place to avoid a full route re-render.
    const section = track.closest('.news-section');
    if (section) section.outerHTML = renderNewsSection();
  },
  scrollToInfo(anchorId) {
    const target = document.getElementById(anchorId);
    if (!target) return;
    // Offset for the sticky federal header (~150px)
    const offset = 160;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  },
  openDocViewer(id) {
    const docs = P.state.documents || [];
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    // Navigation context = the documents currently shown in the view this was
    // opened from (downloads table page or property doc-groups), in DOM order.
    // Collected from the `data-doc-id` triggers so the viewer's chevrons page
    // through exactly the list the user was looking at. Falls back to the lone
    // document when no such list is present.
    const seen = new Set();
    const siblings = [];
    document.querySelectorAll('[data-doc-id]').forEach(el => {
      const did = el.getAttribute('data-doc-id');
      if (!did || seen.has(did)) return;
      const d = docs.find(dd => dd.id === did);
      if (d) { seen.add(did); siblings.push(d); }
    });
    openDocumentViewer(doc, siblings.length ? siblings : [doc]);
  },
  submitRepair(form) {
    startCase(form, {
      defId: 'schadensmeldung', contact: 'im',
      title: (d, t) => `Schadensmeldung ${t.buildingName}`,
      fields: { 'Kategorie': 'category', 'Dringlichkeit': 'urgency', 'Beschreibung': 'desc', 'Telefon': 'phone' },
      sent: (id, t) => `Schadensmeldung ${id} an BBL Objektmanagement gesendet (${t.contacts.im}).`,
    });
  },
  submitMove(form) {
    startCase(form, {
      defId: 'umzug', contact: 'flm',
      title: (d, t) => `Umzug ${t.buildingName}`,
      fields: { 'Art': 'moveType', 'Von': 'from', 'Nach': 'to', 'Arbeitsplätze': 'count', 'Wunschtermin': 'date' },
      sent: (id, t) => `Umzugsanfrage ${id} an BBL Flächenmanagement gesendet (${t.contacts.flm}).`,
    });
  },
  submitCleaning(form) {
    startCase(form, {
      defId: 'sonderreinigung', contact: 'im',
      title: (d, t) => `Sonderreinigung ${t.buildingName}`,
      fields: { 'Art': 'type', 'Bereich': 'area', 'Fläche (m²)': 'size', 'Wunschtermin': 'date', 'Beschreibung': 'desc' },
      sent: (id, t) => `Reinigungsanfrage ${id} an BBL Objektmanagement gesendet (${t.contacts.im}).`,
    });
  },
  demoRole(role) {
    // Convenience: log in as a demo user whose roles include the requested
    // role. Different profile cards demo different personas (LBO,
    // GS-Reviewer, BBL-PFM, Auditor) — pick the matching user from users.json.
    const candidate = P.state.users.find(u => u.roles.includes(role));
    if (!candidate) { P.toast('Demo-Profil für ' + role + ' nicht vorhanden.'); return; }
    P.state.user = { ...candidate, activeRole: role };
    P.persistRole(role);
    P.toast(`Angemeldet als ${candidate.name} — Rolle ${P.roleLabel(role)}`, 'success');
    const landing = {
      'LBO':           '#/',
      'GS-Reviewer':   '#/queue',
      'BBL-PFM':        '#/',
      'BBL-Campus':     '#/',
      'Auditor':        '#/inbox',
    };
    P.navigate(landing[role] || '#/');
  },
  continueDraft() {
    const d = P.loadDraft();
    if (d) { P.state.draft = d; P.navigate('#/wizard/1'); }
    else { P.toast('Kein Entwurf vorhanden.'); }
  },
  saveDraft() {
    if (P.state.draft) { P.persistDraft(P.state.draft); P.toast('Entwurf gespeichert.', 'success'); }
  },
  fakeUpload() {
    const draft = ensureDraft();
    draft.attachments = draft.attachments || [];
    const samples = [
      { name: 'WiBe.pdf', size: '1.2 MB', scanStatus: 'scanning' },
      { name: 'Rechtsgrundlage.pdf', size: '220 KB', scanStatus: 'scanning' },
    ];
    samples.forEach((s, i) => {
      draft.attachments.push(s);
      setTimeout(() => { s.scanStatus = 'ok'; refreshAttachmentList(draft); P.toast(`Virenscan ok: ${s.name}`, 'success'); }, 1200 + i * 600);
    });
    P.persistDraft(draft);
    refreshAttachmentList(draft);
  },
  suggestDates() {
    const f = ensureDraft().grossantrag = ensureDraft().grossantrag || {};
    const start = new Date(); start.setMonth(start.getMonth() + 10);
    const m = new Date(start); m.setMonth(m.getMonth() + 8);
    const end = new Date(m); end.setMonth(end.getMonth() + 4);
    f.terminStart = start.toISOString().slice(0, 10);
    f.terminMilestone = m.toISOString().slice(0, 10);
    f.terminEnd = end.toISOString().slice(0, 10);
    P.persistDraft(P.state.draft);
    P.handleHash();
  },
  openBatchApprove() {
    const sel = Array.from(document.querySelectorAll('.rowSel:checked')).map(c => c.value);
    if (!sel.length) { P.toast('Bitte mindestens einen Antrag auswählen.'); return; }
    let body = `
      <p>Sie genehmigen ${sel.length} Anträge. Pro Antrag ist eine schriftliche Begründung erforderlich (VwVG Art. 35).</p>
      <div class="form-field">
        <label class="form-field__label" for="batchTemplate">Optionaler Vorschlagstext (nicht voreingestellt)</label>
        <textarea class="form-field__textarea" id="batchTemplate" placeholder="z. B. Formal vollständig, Rechtsgrundlage geprüft, keine Auflagen."></textarea>
        <label class="batch-approve__copy-toggle"><input type="checkbox" id="copyTpl"> Als Vorschlag in alle Felder einsetzen (Default: off)</label>
      </div>
      <hr class="rule">
    `;
    sel.forEach(id => {
      const a = P.state.spaceRequests.find(x => x.id === id);
      if (!a) return;
      body += `
        <div class="form-field batch-approve__field">
          <label class="form-field__label" for="batchBegr-${a.id}">${a.id} — ${P.escapeHtml(a.address)}</label>
          <textarea class="form-field__textarea batchBegr" id="batchBegr-${a.id}" data-id="${a.id}" placeholder="Begründung … (Pflicht)"></textarea>
        </div>
      `;
    });
    body += `
      <div class="form-field">
        <label><input type="checkbox" id="batchConfirm"> Ich bestätige, dass jede Begründung den jeweiligen Antrag individuell betrifft (Verwaltungsverfahrensrecht).</label>
      </div>
    `;
    P.modal({
      title: 'Bulk genehmigen', body, size: 'lg',
      actions: [
        { label: P.t('btn.cancel'), variant: 'btn--outline' },
        { label: 'Genehmigen', variant: 'btn--filled', onClick: () => {
          const begrs = Array.from(document.querySelectorAll('.batchBegr')).map(t => ({ el: t, id: t.getAttribute('data-id'), text: t.value.trim() }));
          // A11Y-015: persistent per-textarea errors + focus the first invalid
          // control — the toast alone disappears after ~4 s without naming
          // which of the N justification fields is empty.
          begrs.forEach(b => setFieldError(b.el, b.text ? null : 'Bitte Begründung eintragen (Pflicht).'));
          const confirmEl = document.getElementById('batchConfirm');
          setFieldError(confirmEl, confirmEl.checked ? null : 'Bitte die Bestätigung ankreuzen.');
          const firstEmpty = begrs.find(b => !b.text);
          if (firstEmpty) { P.toast('Alle Begründungen sind Pflicht.'); firstEmpty.el.focus(); return false; }
          if (!confirmEl.checked) { P.toast('Bitte die Bestätigung ankreuzen.'); confirmEl.focus(); return false; }
          // Server-side identical-text check
          const counts = {};
          begrs.forEach(b => counts[b.text] = (counts[b.text] || 0) + 1);
          const duplicate = Object.entries(counts).find(([, n]) => n >= 3);
          if (duplicate) {
            P.toast('3+ Begründungen identisch — bitte präzisieren oder erläutern, warum identische Begründung sachlich passend ist.', 'danger');
            return false;
          }
          begrs.forEach(b => {
            const a = P.state.spaceRequests.find(x => x.id === b.id);
            if (!a) return;
            a.status = 'approved';
            a.history = a.history || [];
            a.history.push({ ts: new Date().toISOString(), actor: P.state.user.name, action: 'Bulk-genehmigt — "' + b.text + '"' });
          });
          P.toast(`${begrs.length} Anträge genehmigt.`, 'success');
          P.handleHash();
        }}
      ]
    });
    document.getElementById('copyTpl').addEventListener('change', e => {
      if (e.target.checked) {
        const tpl = document.getElementById('batchTemplate').value;
        document.querySelectorAll('.batchBegr').forEach(t => {
          t.value = tpl;
          if (tpl.trim()) setFieldError(t, null);
        });
      }
    });
    // A11Y-015: clear persistent errors as soon as the control is corrected.
    document.querySelectorAll('.batchBegr').forEach(t => {
      t.addEventListener('input', () => { if (t.value.trim()) setFieldError(t, null); });
    });
    document.getElementById('batchConfirm').addEventListener('change', e => {
      if (e.target.checked) setFieldError(e.target, null);
    });
  },
  toggleAuflage(appId, idx) {
    const a = P.state.spaceRequests.find(x => x.id === appId);
    if (!a || !a.conditions) return;
    a.conditions[idx].done = !a.conditions[idx].done;
    P.handleHash();
  },
  startResubmit(appId) {
    P.modal({
      title: 'Auflagen erfüllen & Erneut einreichen',
      body: `
        <p>In diesem Prototyp simulieren wir die erneute Einreichung. Auflagen werden als erfüllt markiert, der Status wechselt zurück zu „Eingereicht", und der GS wird benachrichtigt.</p>
        <p class="modal__meta">Die Antrags-ID ${appId} bleibt erhalten; die Historie zeichnet die Resubmission als Statusübergang auf.</p>
      `,
      actions: [
        { label: P.t('btn.cancel'), variant: 'btn--outline' },
        { label: 'Erneut einreichen', variant: 'btn--filled', onClick: () => {
          const a = P.state.spaceRequests.find(x => x.id === appId);
          if (a) {
            a.conditions?.forEach(x => x.done = true);
            a.status = 'submitted';
            a.history.push({ ts: new Date().toISOString(), actor: P.state.user.name, action: 'Resubmission nach Auflagenerfüllung' });
            P.toast('Antrag erneut eingereicht.', 'success');
            P.handleHash();
          }
        }}
      ]
    });
  }
};


// ── API-DOKUMENTATION (#/api-docs) ───────────────────────────────────────
// Mock-Swagger docs for the portal's REST API, ported from the sister
// service-portal (js/apps/api-docs.js). The compact specification lives in
// data/api-specs.json and is converted to OpenAPI 3 at render time; the
// standard swagger-ui-dist interface renders below the portal chrome and
// loads lazily from the CDN like MapLibre (loadMapLibre above). Deep linking
// stays off because Swagger anchors would overwrite the portal hash route;
// «Try it out» also stays off because there is no live backend. Endpoints
// with a `live` key show actual portal data in their 200 response example.
const SWAGGER_VER = '5.17.14';
let _swaggerReady = null;
function loadSwaggerUI() {
  if (_swaggerReady) return _swaggerReady;
  _swaggerReady = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VER}/swagger-ui.css`;
    css.integrity = 'sha384-wxLW6kwyHktdDGr6Pv1zgm/VGJh99lfUbzSn6HNHBENZlCN7W602k9VkGdxuFvPn';
    css.crossOrigin = 'anonymous';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VER}/swagger-ui-bundle.js`;
    s.integrity = 'sha384-wmyclcVGX/WhUkdkATwhaK1X1JtiNrr2EoYJ+diV3vj4v6OC5yCeSu+yW13SYJep';
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve(window.SwaggerUIBundle);
    // Reset on failure so a page reload can retry instead of caching the error.
    s.onerror = () => { _swaggerReady = null; reject(new Error('swagger-ui-bundle.js nicht erreichbar')); };
    document.head.appendChild(s);
  });
  return _swaggerReady;
}

// RFC 9457 (Problem Details): one shape for every error in the API, built
// from the status code and the specification's own wording, so 13 resources
// do not each invent an error body. `type` is a documentation URL per code,
// which is what the RFC intends it for.
const API_PROBLEM_TITLES = {
  400: 'Ungültige Anfrage', 401: 'Nicht angemeldet', 403: 'Fehlende Berechtigung',
  404: 'Nicht gefunden', 409: 'Konflikt', 412: 'Vorbedingung fehlgeschlagen',
  422: 'Fachliche Validierung fehlgeschlagen', 428: 'Vorbedingung erforderlich',
  429: 'Zu viele Anfragen', 500: 'Interner Fehler', 503: 'Dienst nicht verfügbar',
};
function apiProblemFor(code, desc, ep) {
  const status = Number(code);
  const problem = {
    type: `https://api.bbl.admin.ch/problems/${status}`,
    title: API_PROBLEM_TITLES[status] || desc,
    status,
    detail: desc,
    instance: ep.path,
  };
  // A validation failure without field-level errors cannot be shown in a
  // form, so the one code that needs more than a sentence carries the
  // extension. The field mirrors the wizard's own validation vocabulary.
  if (status === 422) {
    problem.errors = [{ field: 'fte', code: 'out_of_range', message: 'Wert muss zwischen 1 und 2000 liegen' }];
  }
  return problem;
}

// Live examples read the same records the portal renders, so covered
// endpoints show this prototype's actual data instead of an invented list.
// Keys follow '<tag>.<endpoint>' from the specification's `live` property.
// floors/spaces guard on length: their geojson loads lazily on the
// floor-plan route only (review P7) — before that, the static example in
// data/api-specs.json (copied from the same files) answers instead.
function apiLiveExamples() {
  const S = P.state;
  const pick = (o, keys) => { const r = {}; if (o) for (const k of keys) r[k] = o[k]; return r; };
  return {
    'space-requests.list': () => S.spaceRequests.slice(0, 3).map(a => pick(a, ['spaceRequestId', 'requestType', 'status', 'submitterVe', 'buildingId', 'submittedAt'])),
    'space-requests.one': () => { const a = S.spaceRequests[0]; return a ? { ...pick(a, ['spaceRequestId', 'requestType', 'pipelineVariant', 'status', 'submitterId', 'submitterVe', 'submitterDep', 'buildingId', 'submittedAt', 'fte', 'workstations', 'hnf2', 'gf']), naw: pick(a.naw, ['class', 'confidence']) } : undefined; },
    'space-requests.history': () => ((S.spaceRequests[0] || {}).history || []).slice(0, 3),
    'process-instances.list': () => S.processInstances.slice(0, 3).map(i => pick(i, ['instanceId', 'defId', 'title', 'status', 'updatedAt'])),
    'process-instances.one': () => pick(S.processInstances[0], ['instanceId', 'defId', 'variant', 'payloadRef', 'title', 'requesterId', 'requesterVe', 'buildingId', 'status', 'createdAt', 'updatedAt', 'assignee']),
    'process-definitions.list': () => S.processDefs.slice(0, 5).map(d => ({ defId: d.defId, name: d.name, serviceId: d.serviceId, variants: Object.keys(d.variants || {}) })),
    'process-definitions.one': () => { const d = S.processDefs[0]; return d ? { defId: d.defId, name: d.name, serviceId: d.serviceId, payload: d.payload, variants: { standard: ((d.variants || {}).standard || []).slice(0, 3).map(s => pick(s, ['status', 'label', 'role', 'kind'])) } } : undefined; },
    'buildings.list': () => S.buildings.slice(0, 3).map(b => pick(b, ['buildingId', 'name', 'street', 'houseNumber', 'postalCode', 'city', 'egid'])),
    'buildings.one': () => pick(S.buildings[0], ['buildingId', 'name', 'street', 'houseNumber', 'postalCode', 'city', 'country', 'assetKey', 'egid']),
    'buildings.floors': () => S.floors.length ? S.floors.slice(0, 3).map(f => pick(f, ['floorId', 'buildingId', 'name', 'levelNumber', 'areaGross', 'floorPlanDocumentId'])) : undefined,
    'buildings.spaces': () => S.spaces.length ? S.spaces.slice(0, 3).map(s => pick(s, ['spaceId', 'floorId', 'buildingId', 'name', 'useType', 'area', 'capacity', 'isBookable', 'occupierVe', 'siaCategory'])) : undefined,
    'buildings.tenancies': () => S.tenancies.slice(0, 2).map(x => pick(x, ['tenancyId', 've', 'dep', 'buildingId', 'buildingName', 'floorLabel'])),
    'buildings.documents': () => S.documents.filter(d => (d.linkedTo || []).some(l => l.entityType === 'Building')).slice(0, 3).map(d => pick(d, ['documentId', 'type', 'title', 'format'])),
    'floors.one': () => S.floors.length ? pick(S.floors[0], ['floorId', 'buildingId', 'name', 'levelNumber', 'areaGross', 'floorPlanDocumentId']) : undefined,
    'spaces.one': () => S.spaces.length ? pick(S.spaces[0], ['spaceId', 'floorId', 'buildingId', 'name', 'useType', 'area', 'capacity', 'isBookable', 'occupierVe', 'occupierDep', 'siaCategory']) : undefined,
    'tenancies.list': () => S.tenancies.slice(0, 3).map(x => pick(x, ['tenancyId', 've', 'dep', 'buildingId', 'buildingName', 'city', 'hnf2', 'workstations'])),
    'tenancies.one': () => { const x = S.tenancies[0]; return x ? { ...pick(x, ['tenancyId', 've', 'dep', 'buildingId', 'buildingName', 'street', 'houseNumber', 'postalCode', 'city', 'hnf2', 'gf', 'workstations', 'leaseStart', 'leaseEnd', 'yearlyCost', 'openIssues']), contacts: x.contacts } : undefined; },
    'documents.list': () => S.documents.slice(0, 3).map(d => pick(d, ['documentId', 'type', 'title', 'format', 'size', 'issuedAt'])),
    'documents.one': () => pick(S.documents[0], ['documentId', 'type', 'title', 'linkedTo', 'format', 'size', 'languages', 'issuedAt', 'scanStatus']),
    'downloads.list': () => { const d = S.downloads || {}; const trim = arr => (arr || []).slice(0, 2).map(x => pick(x, ['title', 'subtitle', 'type', 'format', 'size', 'date'])); return { documents: trim(d.documents), regulations: trim(d.regulations), strategies: trim(d.strategies), training: trim(d.training) }; },
    'news.list': () => S.news.slice(0, 3).map(n => pick(n, ['newsId', 'type', 'date', 'title', 'source'])),
    'news.one': () => pick(S.news[0], ['newsId', 'type', 'date', 'title', 'lead', 'source', 'responsible']),
    'services.list': () => S.services.slice(0, 5).map(s => pick(s, ['serviceId', 'type', 'inMenu', 'target'])),
    'users.list': () => S.users.slice(0, 3).map(u => pick(u, ['userId', 'name', 'email', 've', 'dep', 'roles'])),
    'users.me': () => pick(S.user || S.users[0], ['userId', 'name', 'email', 've', 'dep', 'roles']),
    'reference-data.one': () => { const r = S.referenceData || {}; return { nawClasses: (r.nawClasses || []).slice(0, 2), deskSharingFactor: r.deskSharingFactor, furnitureBudgetPerSqm: r.furnitureBudgetPerSqm, operatingCostCeilingPerSqmGf: r.operatingCostCeilingPerSqmGf, currency: r.currency, portfolioCategories: (r.portfolioCategories || []).slice(0, 3) }; },
  };
}

// Convert the maintainable shorthand in data/api-specs.json to OpenAPI 3 at
// render time. The source file stays authoritative; live examples override
// the static ones where the portal has the data in memory.
function apiSpecToOpenApi(spec) {
  const LIVE = apiLiveExamples();
  const exampleFor = (ep) => {
    if (ep.live && LIVE[ep.live]) {
      try { const v = LIVE[ep.live](); if (v !== undefined) return v; } catch { /* fall back to the static example */ }
    }
    return ep.example;   // Undefined means the endpoint has a description only.
  };
  const paths = {};
  for (const r of spec.resources) {
    for (const ep of r.endpoints) {
      const op = {
        tags: [r.label],
        summary: ep.summary,
        parameters: (ep.params || []).map(p => ({
          name: p.name, in: p.in, required: !!p.required,
          description: p.desc || '',
          schema: { type: p.type === 'integer' ? 'integer' : 'string' },
        })),
        responses: {},
      };
      // Per-operation scopes: a write names the scope it needs, so «read» and
      // «write» are visibly different permissions on the same resource.
      if (ep.scopes && spec.scopes) op.security = [{ portalAuth: ep.scopes }];
      if (ep.body) op.requestBody = { required: true, content: { 'application/json': { example: ep.body } } };
      const codes = Object.entries(ep.responses || { 200: 'OK' });
      for (const [code, desc] of codes) {
        op.responses[code] = { description: desc };
        // 4xx/5xx carry RFC 9457 problem+json, so Swagger shows the shape a
        // client actually has to handle rather than a bare status line.
        if (Number(code) >= 400) {
          op.responses[code].content = { 'application/problem+json': { example: apiProblemFor(code, desc, ep) } };
        }
      }
      // `responseHeaders`: { code: { name: description } }. Location on a 201
      // and ETag on a read are the two halves of the optimistic-locking
      // contract, and neither is expressible as a parameter.
      for (const [code, headers] of Object.entries(ep.responseHeaders || {})) {
        if (!op.responses[code]) continue;
        op.responses[code].headers = Object.fromEntries(Object.entries(headers).map(([name, desc]) =>
          [name, { description: desc, schema: { type: 'string' } }]));
      }
      // Attach the example to the first successful response code.
      const okCode = codes[0] ? codes[0][0] : '200';
      const example = exampleFor(ep);
      if (example !== undefined) {
        op.responses[okCode] = { ...op.responses[okCode], content: { 'application/json': { example } } };
      }
      (paths[ep.path] = paths[ep.path] || {})[ep.method.toLowerCase()] = op;
    }
  }
  return {
    openapi: '3.0.3',
    info: { title: spec.title, version: spec.version, description: spec.description },
    servers: [{ url: spec.baseUrl }],
    tags: spec.resources.map(r => ({ name: r.label, description: r.description })),
    // The specification's authentication note becomes an OAuth 2 security
    // scheme (what eIAM actually speaks), so a reader can see that reading
    // the portal and changing it are not the same permission.
    components: spec.auth ? { securitySchemes: {
      portalAuth: spec.scopes
        ? { type: 'oauth2', description: spec.auth, flows: { clientCredentials: {
            tokenUrl: spec.tokenUrl || `${spec.baseUrl}/oauth2/token`, scopes: spec.scopes } } }
        : { type: 'apiKey', in: 'header', name: 'Authorization', description: spec.auth },
    } } : undefined,
    security: spec.auth ? [{ portalAuth: spec.scopes ? [Object.keys(spec.scopes)[0]] : [] }] : undefined,
    paths,
  };
}

// Swagger adds parts of its tree after onComplete and creates more controls
// when an operation expands. This adapter only supplies names and language;
// structure and behaviour remain owned by the library.
function enhanceSwagger(host) {
  host.setAttribute('lang', 'en');
  host.querySelectorAll('.authorization__btn').forEach(button => {
    button.setAttribute('aria-label', 'Authorize API access');
  });
  host.querySelectorAll('.expand-operation').forEach(button => {
    if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Expand or collapse all operations');
  });
  host.querySelectorAll('.opblock-control-arrow').forEach(button => {
    if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Expand or collapse operation');
  });
}

async function renderApiDocs(params, gen) {
  shell({ breadcrumb: [{ label: 'API-Dokumentation' }] });
  const body = document.getElementById('page-body');

  let spec = null;
  try {
    const res = await fetch('data/api-specs.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    spec = (await res.json()).mieterportal;
  } catch { /* rendered as error below */ }
  if (gen !== _routeGen) return;   // superseded while awaiting

  if (!spec) {
    body.innerHTML = `<section class="section"><div class="container">
      <h1 class="h1 section-heading">API-Dokumentation</h1>
      <div class="notification notification--error" role="alert">
        <p><strong>Die API-Spezifikation konnte nicht geladen werden.</strong> Bitte laden Sie die Seite neu.</p>
      </div>
    </div></section>`;
    return;
  }

  // Portal chrome above (it owns title, version and description — Swagger's
  // own information container stays hidden, see css/sections/api-docs.css);
  // the standard Swagger UI below. Composition mirrors the sister
  // service-portal's page: detail bar (back + share), h1, badge pills, lead.
  body.innerHTML = `
    ${P.renderShareBar({ backTo: '#/', backLabel: P.t('nav.start') })}
    <section class="section">
      <div class="container">
        <h1 class="api-docs__title">${P.escapeHtml(spec.title)}</h1>
        <p class="api-docs__badges">
          <span class="badge badge--blue">v${P.escapeHtml(spec.version)}</span>
          <span class="badge">${P.escapeHtml(spec.format || 'REST')}</span>
        </p>
        <p class="section-intro section-intro--tight section-intro--full">${P.escapeHtml(spec.description)}</p>
        <h2 class="sr-only" id="apiResourcesTitle">API-Ressourcen</h2>
        <div class="swagger-host" id="apiSwagger" aria-labelledby="apiResourcesTitle">
          <p role="status">API-Dokumentation wird geladen…</p>
        </div>
      </div>
    </section>`;

  const host = document.getElementById('apiSwagger');
  let SwaggerUIBundle;
  try {
    SwaggerUIBundle = await loadSwaggerUI();
  } catch {
    if (gen !== _routeGen) return;
    host.innerHTML = `
      <div class="notification notification--error" role="alert">
        <p><strong>Die Swagger-Oberfläche konnte nicht geladen werden.</strong>
          Sie kommt von unpkg.com und braucht Netzzugang.</p>
        <p><button class="btn btn--outline btn--sm" type="button" onclick="window.location.reload()">Seite neu laden</button></p>
      </div>`;
    return;
  }
  if (gen !== _routeGen) return;

  host.innerHTML = '';
  // A11y pass re-runs as Swagger's React tree grows. Self-cleaning: the
  // tenant router has no unmount hook, so the observer disconnects itself
  // once the host has left the document (the next route re-renders #root).
  const observer = new MutationObserver(() => {
    if (!document.body.contains(host)) { observer.disconnect(); return; }
    enhanceSwagger(host);
  });
  observer.observe(host, { childList: true, subtree: true });
  SwaggerUIBundle({
    spec: apiSpecToOpenApi(spec),
    domNode: host,
    presets: [SwaggerUIBundle.presets.apis],
    layout: 'BaseLayout',
    deepLinking: false,             // Swagger anchors would overwrite the portal hash route
    docExpansion: 'list',
    defaultModelsExpandDepth: -1,   // hide the models block — the compact spec has no schemas
    supportedSubmitMethods: [],     // there is no backend for «Try it out»
    validatorUrl: null,             // do not call Swagger's external validator
    onComplete: () => enhanceSwagger(host),
  });
}
