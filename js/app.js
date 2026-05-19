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
     #/home          auth home (role-routed via state.user.activeRole)
     #/wizard/:step  5-step demand wizard
     #/inbox         submitter inbox
     #/inbox/:id     application detail
     #/queue         reviewer queue (GS-Prüfer/in)
     #/review/:id    reviewer split-pane
     #/help · #/info · #/properties · #/downloads · #/news · #/search …
   ========================================================================== */

(function (global) {
  'use strict';

  // ── STATE ────────────────────────────────────────────────────────────────
  const state = {
    user: null,                  // { id, name, ve, roles, activeRole }
    applications: [],            // loaded from data/applications.json
    referenceData: null,         // loaded from data/reference-data.json
    buildings: [],               // loaded from data/buildings.json
    users: [],                   // loaded from data/users.json
    tenancies: [],               // loaded from data/tenancies.json
    news: [],                    // loaded from data/news.json
    downloads: null,             // loaded from data/downloads.json (documents, regulations, strategies, training)
    page: 'home',                // current route id
    params: {},                  // route params
    draft: null,                 // current wizard draft
    pendingNotice: null,         // queued notification banner text
  };

  // ── DATA LOADING ────────────────────────────────────────────────────────
  // On-disk JSON conforms to docs/DATAMODEL.md (canonical schema).
  // In-memory records get two convenience aliases injected here:
  //   - `id` → mirrors the entity's canonical PK (applicationId / tenancyId / …)
  //   - `address` → composed display string from the atomic fields
  //     (street / houseNumber / postalCode / city) so render code can use
  //     a single string without dragging the Tidy-data split through the UI.
  // The originals stay on the record; aliases are read-only conveniences.
  function formatAddressLine(o) {
    if (!o || !o.street) return '';
    const num = o.houseNumber ? ' ' + o.houseNumber : '';
    return `${o.street}${num}, ${o.postalCode || ''} ${o.city || ''}`.trim().replace(/\s+,/g, ',');
  }
  function formatAssetKey(ak) {
    if (!ak) return '';
    return `${ak.bk || ''}/${ak.we || ''}/${ak.obj || ''}`;
  }
  // Flatten a GeoJSON Point feature to the plain-object shape downstream
  // code expects: properties are hoisted to the top level, and the canonical
  // scalar `lng` / `lat` fields are reconstituted from `geometry.coordinates`
  // per Appendix B of docs/DATAMODEL.md (logical schema is scalar; on-disk
  // FeatureCollection is just the wire format).
  function flattenFeature(feature) {
    const [lng, lat] = feature.geometry?.coordinates || [];
    return { ...(feature.properties || {}), lng, lat };
  }
  async function loadData(basePath = 'data/') {
    const [apps, reference, users, buildingsFc, tenancies, news, downloads] = await Promise.all([
      fetch(basePath + 'applications.json').then(r => r.json()),
      fetch(basePath + 'reference-data.json').then(r => r.json()),
      fetch(basePath + 'users.json').then(r => r.json()),
      fetch(basePath + 'buildings.geojson').then(r => r.json()),
      fetch(basePath + 'tenancies.json').then(r => r.json()).catch(() => []),
      fetch(basePath + 'news.json').then(r => r.json()).catch(() => []),
      fetch(basePath + 'downloads.json').then(r => r.json()).catch(() => ({ documents: [], regulations: [], strategies: [], training: [] })),
    ]);
    state.applications = apps.map(a => ({ ...a, id: a.applicationId, type: a.applicationType, address: formatAddressLine(a) }));
    state.referenceData = reference;
    state.users = users.map(u => ({ ...u, id: u.userId }));
    state.buildings = (buildingsFc.features || []).map(flattenFeature).map(b => ({ ...b, id: b.buildingId, address: formatAddressLine(b) }));
    state.tenancies = tenancies.map(t => ({ ...t, id: t.tenancyId, address: formatAddressLine(t) }));
    state.news = news.map(n => ({ ...n, id: n.newsId }));
    state.downloads = downloads;
  }

  // ── PERSISTENCE (localStorage) ──────────────────────────────────────────
  // Wrapped because localStorage throws in Safari private mode, on quota,
  // and when storage is disabled by enterprise policy. Failures degrade
  // silently — drafts won't persist across reloads but the session keeps
  // working.
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* quota or disabled */ }
  }
  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch { /* nothing to do */ }
  }
  function persistDraft(draft) {
    if (!state.user) return;
    safeSet('mp-draft-' + state.user.id, JSON.stringify(draft));
  }
  function loadDraft() {
    if (!state.user) return null;
    const raw = safeGet('mp-draft-' + state.user.id);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
  function clearDraft() {
    if (!state.user) return;
    safeRemove('mp-draft-' + state.user.id);
  }
  function persistRole(role) {
    if (!state.user) return;
    safeSet('mp-active-role-' + state.user.id, role);
  }
  function loadRole() {
    if (!state.user) return null;
    const raw = safeGet('mp-active-role-' + state.user.id);
    // Migrate v0.10.x role names persisted to localStorage before the
    // schema rename pass (ILBO → LBO, GS-Prüfer/in → GS-Reviewer).
    // Drop unknown values so the user falls back to their first role.
    const migrated = ({ 'ILBO': 'LBO', 'GS-Prüfer/in': 'GS-Reviewer' })[raw] || raw;
    if (migrated && !state.user.roles.includes(migrated)) return null;
    return migrated;
  }

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
  function handleHash() {
    const full = location.hash || '#/';
    // Strip a `?query` suffix before route matching — query params (view/q/page/…)
    // are read directly from `location.hash` inside the view handler.
    const qIdx = full.indexOf('?');
    const h = qIdx >= 0 ? full.slice(0, qIdx) : full;
    for (const { re, handler } of routes) {
      const m = h.match(re);
      if (m) {
        state.params = m.groups || {};
        handler(state.params);
        return;
      }
    }
    // No match: render 404
    const app = document.getElementById('app');
    if (app) app.innerHTML = `<div class="container section"><h1>Seite nicht gefunden</h1><p><a href="#/">Zurück zur Startseite</a></p></div>`;
  }

  // ── FEDERAL SHELL ────────────────────────────────────────────────────────
  function renderShell({ deptSub = 'Mieterportal', activeNav = '', breadcrumb = [], navItems = [] } = {}) {
    // Anmelden lives in the top-bar (dark utility bar), not the brand bar.
    // Plain white text per CD pattern — not a red filled button.
    const authPill = state.user
      ? `<a class="top-bar__link top-bar__link--user" href="#/profile" aria-label="Profil von ${state.user.name}">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
           ${state.user.name}
         </a>`
      : `<button class="top-bar__link top-bar__link--user" type="button" onclick="window.portal.login()">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
           Anmelden
         </button>`;

    const navHtml = navItems.map((item, i) => {
      const activeCls = item.id === activeNav ? 'main-navigation__link--active' : '';
      if (item.type === 'dropdown') {
        return `
          <button class="main-navigation__link main-navigation__link--has-menu ${activeCls}"
                  type="button"
                  aria-expanded="false"
                  aria-haspopup="true"
                  aria-controls="navMenu-${item.id}"
                  data-menu="${item.id}"
                  onclick="window.portal.toggleNavMenu('${item.id}')">
            ${item.label}
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" style="margin-left:6px;"><polyline points="2,4 6,8 10,4" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
          </button>
        `;
      }
      return `<a class="main-navigation__link ${activeCls}" href="${item.href}">${item.label}</a>`;
    }).join('');

    // Dropdown panels (CD Bund pattern: constrained card under the trigger,
    // single-line label rows, red left-bar on the active route).
    const currentHash = location.hash || '#/';
    const isActiveSub = (href) => {
      if (href === '#/services')  return currentHash === '#/services';
      if (href === '#/wizard/1')  return currentHash.startsWith('#/wizard');
      if (href === '#/downloads') return currentHash.startsWith('#/downloads');
      return currentHash === href || currentHash.startsWith(href + '/');
    };
    const navMenus = navItems.filter(i => i.type === 'dropdown').map(item => `
      <div class="nav-menu" id="navMenu-${item.id}" role="region" aria-label="${item.label}" hidden>
        <div class="nav-menu__inner">
          <button class="nav-menu__close" type="button"
                  onclick="window.portal.toggleNavMenu('${item.id}', false)">
            Schliessen <span aria-hidden="true">×</span>
          </button>
          <h2 class="nav-menu__heading">${item.label}</h2>
          <ul class="nav-menu__list">
            ${(item.items || []).map(sub => `
              <li class="nav-menu__item ${isActiveSub(sub.href) ? 'nav-menu__item--active' : ''}">
                <a class="nav-menu__link" href="${sub.href}"
                   onclick="window.portal.toggleNavMenu('${item.id}', false)">
                  ${sub.label}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `).join('');

    const breadcrumbHtml = breadcrumb.length
      ? `<nav class="breadcrumb" aria-label="Brotkrumen">${breadcrumb.map((b, i, a) =>
          i === a.length - 1
            ? `<span aria-current="page">${b.label}</span>`
            : `<a href="${b.href}">${b.label}</a><span class="breadcrumb__sep">›</span>`
        ).join('')}</nav>`
      : '';

    return `
      <a href="#main" class="skip-to-content">Zum Inhalt springen</a>

      <header class="site-header" role="banner">
        <div class="top-bar">
          <div class="top-bar__inner">
            <button class="top-bar__authorities" aria-expanded="false">
              <span>Alle Schweizer Bundesbehörden</span>
              <svg viewBox="0 0 12 12" aria-hidden="true"><polyline points="2,4 6,8 10,4" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
            </button>
            <span class="top-bar__prototype-notice">Prototyp — nur zur Demonstration</span>
            <div class="top-bar__actions">
              ${authPill}
              <div class="language-switcher" id="langSwitch">
                <button class="top-bar__lang" aria-label="Sprache wählen" aria-haspopup="listbox" aria-expanded="false"
                        onclick="window.portal.toggleLang()">
                  <span id="langCurrent">DE</span>
                  <svg viewBox="0 0 12 12" aria-hidden="true"><polyline points="2,4 6,8 10,4" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
                </button>
                <ul class="language-switcher__dropdown" role="listbox">
                  <li><button class="language-switcher__option language-switcher__option--active" role="option" aria-selected="true" data-lang="DE" onclick="window.portal.pickLang('DE')">DE</button></li>
                  <li><button class="language-switcher__option" role="option" aria-selected="false" data-lang="FR" onclick="window.portal.pickLang('FR')">FR</button></li>
                  <li><button class="language-switcher__option" role="option" aria-selected="false" data-lang="IT" onclick="window.portal.pickLang('IT')">IT</button></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="top-header">
          <div class="top-header__inner">
            <div class="top-header__left" onclick="window.portal.navigate('#/')" role="link" tabindex="0">
              <img class="top-header__bundmark" src="assets/BundLogo.svg"
                   alt="Schweizerische Eidgenossenschaft · Confédération suisse · Confederazione Svizzera · Confederaziun svizra">
              <div class="top-header__divider" aria-hidden="true"></div>
              <div class="top-header__dept">
                <strong>Bundesamt für Bauten und Logistik BBL</strong><br>
                <span class="top-header__dept-sub">${deptSub}</span>
              </div>
            </div>
            <div class="top-header__right">
              <nav class="top-header__meta" aria-label="Meta-Navigation">
                <a class="top-header__meta-link" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">Kontakt</a>
                <a class="top-header__meta-link" href="#/help">Hilfe</a>
              </nav>
              <div class="top-header__actions">
                <div class="header-search" id="headerSearch">
                  <button class="header-search__toggle" type="button"
                          aria-expanded="false" aria-controls="headerSearchForm"
                          onclick="window.portal.toggleSearch(true)">
                    <span>Suche</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
                  </button>
                  <form class="header-search__form" id="headerSearchForm" role="search" aria-label="Portal durchsuchen"
                        onsubmit="event.preventDefault(); window.portal.submitSearch(this);">
                    <input class="header-search__input" id="headerSearchInput" type="search"
                           name="q"
                           placeholder="Suchbegriff eingeben" aria-label="Suchbegriff eingeben"
                           autocomplete="off"
                           onkeydown="if(event.key==='Escape') window.portal.toggleSearch(false);">
                    <button class="header-search__submit" type="submit" aria-label="Suchen">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav class="navbar" aria-label="Hauptnavigation">
          <div class="navbar__inner">
            <button class="burger" aria-label="Menü öffnen"
                    onclick="document.querySelector('.main-navigation').classList.toggle('open')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div class="main-navigation">${navHtml}</div>
          </div>
          ${navMenus}
        </nav>
      </header>

      ${breadcrumbHtml}

      <main id="main" tabindex="-1"></main>
    `;
  }

  function renderFooter() {
    // Content + structure matches bbl.admin.ch/de footer pattern:
    // brand column (motto), Weitere Informationen (link list with arrows),
    // Zugang zu amtlichen Dokumenten (single prominent link), then a
    // narrow darker strip with Allgemeine Geschäftsbedingungen / Rechtliches /
    // Barrierefreiheit, plus a back-to-top button anchored top-right.
    return `
      <footer class="app-footer" role="contentinfo">
        <button class="app-footer__top-btn" type="button" aria-label="Zum Seitenanfang"
                onclick="window.scrollTo({ top: 0, behavior: 'smooth' });">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 15 12 9 18 15"/></svg>
        </button>
        <div class="footer-information">
          <div class="footer-information__inner">
            <div class="footer-information__col footer-information__col--brand">
              <h3 class="footer-information__brand">BBL</h3>
              <p class="footer-information__motto">Nachhaltig, partnerschaftlich und vorbildlich</p>
              <p class="footer-information__prototype-warning" role="note">
                Diese Anwendung ist ein Prototyp. Darstellung, Funktionalität und Inhalte dienen ausschliesslich der Demonstration.
              </p>
            </div>

            <div class="footer-information__col footer-information__col--links">
              <h3 class="footer-information__heading">Weitere Informationen</h3>
              <ul class="footer-information__list">
                <li><a href="https://www.bbl.admin.ch/bbl/de/home/das-bbl/rechtliche-grundlagen.html" target="_blank" rel="noopener">Rechtliche Grundlagen <span class="footer-information__arrow" aria-hidden="true">→</span></a></li>
                <li><a href="https://www.bbl.admin.ch/bbl/de/home/themen/e-rechnung.html" target="_blank" rel="noopener">E-Rechnung <span class="footer-information__arrow" aria-hidden="true">→</span></a></li>
                <li><a href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">Kontakt <span class="footer-information__arrow" aria-hidden="true">→</span></a></li>
              </ul>
            </div>

            <div class="footer-information__col footer-information__col--links">
              <h3 class="footer-information__heading">Prototyp</h3>
              <ul class="footer-information__list">
                <li><a href="https://github.com/bbl-dres/tenant-portal" target="_blank" rel="noopener">Quellcode auf GitHub <span class="footer-information__arrow" aria-hidden="true">→</span></a></li>
                <li><a href="docs/REQUIREMENTS.md" target="_blank">Anforderungskatalog <span class="footer-information__arrow" aria-hidden="true">→</span></a></li>
                <li><a href="docs/DESIGNGUIDE.md" target="_blank">Design-Guide <span class="footer-information__arrow" aria-hidden="true">→</span></a></li>
              </ul>
            </div>

          </div>
        </div>

        <div class="app-footer__bottom">
          <div class="app-footer__bottom-inner">
            <a class="app-footer__bottom-link" href="https://www.bkb.admin.ch/bkb/de/home/themen/agb.html" target="_blank" rel="noopener">Allgemeine Geschäftsbedingungen des Bundes</a>
            <a class="app-footer__bottom-link" href="https://www.admin.ch/gov/de/start/rechtliches.html" target="_blank" rel="noopener">Rechtliches</a>
            <a class="app-footer__bottom-link" href="https://www.edi.admin.ch/edi/de/home/fachstellen/ebgb/recht/schweiz/barrierefreie-bundesverwaltung.html" target="_blank" rel="noopener">Barrierefreiheit in der Bundesverwaltung</a>
          </div>
        </div>
      </footer>
    `;
  }

  function roleLabel(role) {
    return ({
      'LBO': 'Logistikbeauftragte',
      'GS-Reviewer': 'GS-Prüfer/in',
      'BBL-PFM': 'BBL Portfolio-Management',
      'BBL-Campus': 'BBL Campus',
      'Auditor': 'EFD Auditor',
    })[role] || role;
  }

  // ── STATUS PIPELINE ──────────────────────────────────────────────────────
  // Maps to §0.3 (three variants). Each step describes one transition state.
  // Each entry is { status, label }: status matches the canonical enum
  // (docs/DATAMODEL.md Appendix A.3); label is the German display string.
  const PIPELINE_STANDARD = [
    { status: 'draft',        label: 'Entwurf' },
    { status: 'submitted',    label: 'Eingereicht' },
    { status: 'in_review_gs', label: 'in GS-Prüfung' },
    { status: 'approved',     label: 'genehmigt' },
    { status: 'in_project',   label: 'in ePPM' },
    { status: 'closed',       label: 'abgeschlossen' },
  ];
  const PIPELINE_BK = [
    { status: 'draft',         label: 'Entwurf' },
    { status: 'submitted',     label: 'Eingereicht' },
    { status: 'in_review_pfm', label: 'in PFM-Prüfung' },
    { status: 'approved',      label: 'genehmigt' },
    { status: 'in_project',    label: 'in ePPM' },
    { status: 'closed',        label: 'abgeschlossen' },
  ];
  const PIPELINE_GREENFIELD = [
    { status: 'draft',              label: 'Entwurf' },
    { status: 'submitted',          label: 'Eingereicht' },
    { status: 'in_review_gs',       label: 'in GS-Prüfung' },
    { status: 'approved',           label: 'genehmigt' },
    { status: 'asset_key_creation', label: 'WE-Anlage' },
    { status: 'in_project',         label: 'in ePPM' },
    { status: 'closed',             label: 'abgeschlossen' },
  ];

  function renderPipeline(application) {
    let steps;
    if (application.pipelineVariant === 'bypass') steps = PIPELINE_BK;
    else if (application.pipelineVariant === 'greenfield') steps = PIPELINE_GREENFIELD;
    else steps = PIPELINE_STANDARD;

    const currentIdx = steps.findIndex(s => s.status === application.status);
    const isRejected = application.status === 'rejected';
    const isRueckfrage = application.status === 'clarification';

    if (isRueckfrage) {
      // Show pipeline up to "in GS-Prüfung" then a "Rückfrage" bubble
      return `
        <div class="pipeline" role="list" aria-label="Statusverlauf">
          ${steps.slice(0, 3).map((s, i) => `
            <div class="pipeline__step ${i < 2 ? 'pipeline__step--done' : 'pipeline__step--rueckfrage'}" role="listitem">↻ ${s.status === 'in_review_gs' ? 'Rückfrage' : s.label}</div>
          `).join('')}
          <div class="pipeline__step" role="listitem" style="opacity:0.5">… genehmigt</div>
        </div>
        <p class="form-field__hint">Rückfrage offen — bitte Auflagen erfüllen und erneut einreichen.</p>
      `;
    }
    if (isRejected) {
      return `
        <div class="pipeline" role="list" aria-label="Statusverlauf">
          ${steps.slice(0, 3).map((s, i) => `
            <div class="pipeline__step ${i < 2 ? 'pipeline__step--done' : 'pipeline__step--rejected'}" role="listitem">${i < 2 ? '✓' : '✕'} ${s.label}</div>
          `).join('')}
          <div class="pipeline__step pipeline__step--rejected" role="listitem">abgelehnt</div>
        </div>
      `;
    }

    return `
      <div class="pipeline" role="list" aria-label="Statusverlauf">
        ${steps.map((s, i) => {
          const cls = i < currentIdx ? 'pipeline__step--done' :
                      i === currentIdx ? 'pipeline__step--active' : '';
          const glyph = i < currentIdx ? '✓ ' : i === currentIdx ? '◐ ' : '';
          return `<div class="pipeline__step ${cls}" role="listitem">${glyph}${s.label}</div>`;
        }).join('')}
      </div>
    `;
  }

  // Step indicator — mirrors designsystem css/components/step-indicator.postcss:
  // 36px circles, gray-400 outline → bg-gray-400 active → bg-green-500 confirmed.
  // Connectors between dots make the progression readable on wide screens.
  function renderStepIndicator(currentStep, steps) {
    const lastIdx = steps.length - 1;
    return `
      <ol class="step-indicator" aria-label="Schritt-Anzeige">
        ${steps.map((label, i) => {
          const n = i + 1;
          const confirmed = n < currentStep;
          const active = n === currentStep;
          const stepCls = confirmed
            ? 'step-indicator__step step-indicator__step--confirmed'
            : active
              ? 'step-indicator__step step-indicator__step--active'
              : 'step-indicator__step';
          const dotInner = confirmed
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`
            : String(n);
          const connector = i < lastIdx
            ? `<span class="step-indicator__connector ${confirmed ? 'step-indicator__connector--confirmed' : ''}" aria-hidden="true"></span>`
            : '';
          const ariaCurrent = active ? ' aria-current="step"' : '';
          return `
            <li class="step-indicator__item"${ariaCurrent}>
              <span class="${stepCls}">${dotInner}</span>
              <span class="step-indicator__label">${label}</span>
              ${connector}
            </li>
          `;
        }).join('')}
      </ol>
    `;
  }

  // ── WIZARD CALCULATION (FUNC-AU-014/-015 — see WIREFRAMES.md §8.1) ─────
  function calcWizard(fields) {
    if (!state.referenceData) return null;
    const naw = state.referenceData.nawClasses.find(n => n.name === fields.nawClass)
              || state.referenceData.nawClasses.find(n => n.name === 'Kollaborativ-Standard');
    const ds  = state.referenceData.deskSharingFactor;       // fixed 0.8
    const fte = Number(fields.fte) || 0;

    const arbeitsplaetze = Math.ceil(fte * ds);            // FTE × 0.8
    const hnf2 = Math.round(naw.hnf2PerFte * fte * ds);
    const gf   = Math.round(naw.gfPerFte * fte * ds);

    // UK-Kosten: master data has CHF per m² GF; placeholder calculation
    const ukKosten = Math.round(gf * 3000);                // illustrative
    const moeblierung = Math.round(hnf2 * state.referenceData.furnitureBudgetPerSqm);
    const betriebskostenProM2Gf = state.referenceData.operatingCostCeilingPerSqmGf;
    const hardBlockMultiplier   = state.referenceData.operatingCostHardBlockMultiplier;
    const ukProM2Gf = gf > 0 ? Math.round(ukKosten / gf / 12) : 0; // monthly

    return {
      nawClassName: naw.name,
      nawHnf2: naw.hnf2PerFte,
      nawGf:   naw.gfPerFte,
      deskSharingFactor: ds,
      fte, arbeitsplaetze,
      hnf2, gf, ukKosten, moeblierung,
      ukProM2Gf, betriebskostenProM2Gf, hardBlockMultiplier,
      overBudget: ukProM2Gf > betriebskostenProM2Gf,
      overBudgetPercent: ukProM2Gf > 0 ? Math.round((ukProM2Gf / betriebskostenProM2Gf - 1) * 100) : 0,
      hardBlocked: ukProM2Gf > betriebskostenProM2Gf * hardBlockMultiplier,
    };
  }

  // ── NAW QUESTIONNAIRE → CLASS ────────────────────────────────────────────
  function deriveNawClass(answers) {
    // Simplistic mapping for prototype:
    // - "Labor" specialEquipment → Sicherheit-Labor
    // - High concentration → Konzentriert-Einzel/Gruppe
    // - Open/collab → Kollaborativ-Standard / Open
    // - High remote share → Hybrid-Activity-Based
    const specials = answers.specials || [];
    if (specials.includes('Labor') || specials.includes('Sicherheitsbereich')) {
      return { name: 'Sicherheit-Labor', confidence: 0.85, alternative: null };
    }
    if (answers.focus === 'Konzentriert') {
      const variant = answers.confidentiality === 'hoch' ? 'Konzentriert-Einzel' : 'Konzentriert-Gruppe';
      return { name: variant, confidence: 0.78, alternative: { name: 'Kollaborativ-Standard', confidence: 0.15 } };
    }
    if (Number(answers.remoteShare) >= 40) {
      return { name: 'Hybrid-Activity-Based', confidence: 0.72, alternative: { name: 'Kollaborativ-Open', confidence: 0.20 } };
    }
    if (answers.publicContact === 'regelmaessig') {
      return { name: 'Kollaborativ-Open', confidence: 0.68, alternative: { name: 'Kollaborativ-Standard', confidence: 0.25 } };
    }
    return { name: 'Kollaborativ-Standard', confidence: 0.84, alternative: { name: 'Hybrid-Activity-Based', confidence: 0.12 } };
  }

  // ── TOAST ────────────────────────────────────────────────────────────────
  function ensureToastHost() {
    let host = document.getElementById('toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast-host';
      host.className = 'toast-host';
      host.setAttribute('role', 'region');
      host.setAttribute('aria-label', 'Benachrichtigungen');
      host.setAttribute('aria-live', 'polite');
      host.setAttribute('aria-atomic', 'false');
      document.body.appendChild(host);
    }
    return host;
  }
  function toast(message, variant = '') {
    const host = ensureToastHost();
    const el = document.createElement('div');
    el.className = 'toast' + (variant ? ' toast--' + variant : '');
    el.textContent = message;
    el.setAttribute('role', 'status');
    host.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 200ms'; }, 3500);
    setTimeout(() => el.remove(), 3800);
  }

  // ── MODAL ────────────────────────────────────────────────────────────────
  function modal({ title, body, actions = [], onClose = null, size = '' }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    const close = () => { backdrop.remove(); if (onClose) onClose(); };
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    const sizeCls = size ? ` modal--${size}` : '';
    backdrop.innerHTML = `
      <div class="modal${sizeCls}" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal__header">
          <h2 class="modal__title" id="modalTitle">${title}</h2>
          <button class="modal__close" aria-label="Schliessen">×</button>
        </div>
        <div class="modal__body">${body}</div>
        <div class="modal__footer">
          ${actions.map((a, i) => `<button class="btn ${a.variant || 'btn--outline'}" data-action="${i}">${a.label}</button>`).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('.modal__close').addEventListener('click', close);
    actions.forEach((a, i) => {
      backdrop.querySelector(`[data-action="${i}"]`).addEventListener('click', () => {
        const r = a.onClick ? a.onClick() : true;
        if (r !== false) close();
      });
    });
    return { close };
  }

  // ── SHORTCUT OVERLAY (§11.13) ────────────────────────────────────────────
  function renderShortcutOverlay() {
    return `
      <div class="shortcut-overlay" id="shortcutOverlay" role="dialog" aria-modal="true" aria-label="Tastatur-Kurzbefehle"
           onclick="if(event.target===this)this.classList.remove('open')">
        <div class="shortcut-overlay__inner">
          <h2 class="shortcut-overlay__title">Tastatur-Kurzbefehle</h2>
          <div class="shortcut-overlay__grid">
            <div class="shortcut-overlay__group">
              <h4>Navigation</h4>
              <dl>
                <dt>?</dt><dd>Dieses Overlay öffnen/schliessen</dd>
                <dt>g g</dt><dd>Zur Startseite</dd>
                <dt>g i</dt><dd>Zur Inbox</dd>
                <dt>g q</dt><dd>Zur Pendenzen-Queue (GS)</dd>
                <dt>Esc</dt><dd>Modal / Overlay schliessen</dd>
              </dl>
            </div>
            <div class="shortcut-overlay__group">
              <h4>Wizard</h4>
              <dl>
                <dt>Tab</dt><dd>Nächstes Feld</dd>
                <dt>Ctrl+S</dt><dd>Entwurf speichern</dd>
                <dt>Ctrl+Enter</dt><dd>Weiter / Senden</dd>
              </dl>
            </div>
            <div class="shortcut-overlay__group">
              <h4>Queue (GS-Prüfer/in)</h4>
              <dl>
                <dt>j / ↓</dt><dd>Nächste Zeile</dd>
                <dt>k / ↑</dt><dd>Vorherige Zeile</dd>
                <dt>Enter</dt><dd>Öffnen</dd>
                <dt>x</dt><dd>Markieren</dd>
              </dl>
            </div>
            <div class="shortcut-overlay__group">
              <h4>Detail</h4>
              <dl>
                <dt>a</dt><dd>OK markieren</dd>
                <dt>n</dt><dd>NoK markieren</dd>
                <dt>k</dt><dd>OK mit Kommentar</dd>
                <dt>s</dt><dd>Entscheid speichern</dd>
              </dl>
            </div>
          </div>
          <p style="margin-top:var(--space-md); font-size: var(--text-body-sm); color: var(--color-text-secondary);">
            Drücken Sie <kbd>?</kbd> erneut zum Schliessen oder klicken Sie ausserhalb.
          </p>
        </div>
      </div>
    `;
  }

  function wireGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        document.getElementById('shortcutOverlay')?.classList.toggle('open');
      } else if (e.key === 'Escape') {
        document.getElementById('shortcutOverlay')?.classList.remove('open');
      }
    });
  }

  // ── ROLE CHOOSER (§2.1) ──────────────────────────────────────────────────
  function openRoleMenu() {
    if (!state.user || state.user.roles.length < 2) {
      toast('Sie haben nur eine Rolle in diesem Profil.');
      return;
    }
    const body = `
      <p>Wechseln Sie zwischen Ihren Rollen. Die Inhaltsbereiche und Standard-Startseite passen sich an.</p>
      <div class="stack">
        ${state.user.roles.map(r => `
          <button class="btn btn--outline btn--lg" data-role="${r}" style="width:100%;justify-content:flex-start;">
            ${r === state.user.activeRole ? '✓ ' : ''}<strong>${roleLabel(r)}</strong>
          </button>
        `).join('')}
      </div>
    `;
    const m = modal({
      title: 'Rolle wechseln',
      body,
      actions: [{ label: 'Abbrechen', variant: 'btn--outline' }]
    });
    document.querySelectorAll('[data-role]').forEach(btn => {
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
  function login() {
    // For the prototype, log in as the first user with multiple roles (Andrea Muster).
    const user = state.users.find(u => u.roles.length > 1) || state.users[0];
    if (!user) return;
    state.user = { ...user };
    const persistedRole = loadRole();
    state.user.activeRole = persistedRole || user.roles[0];
    toast('Angemeldet als ' + user.name, 'success');
    navigate('#/home');
  }
  function logout() {
    state.user = null;
    clearDraft();
    toast('Abgemeldet.');
    navigate('#/');
  }

  // ── BADGE / CARD UTILITIES ───────────────────────────────────────────────
  function statusBadge(status) {
    const map = {
      'draft':         { cls: 'badge',                  label: 'Entwurf' },
      'submitted':     { cls: 'badge badge--info',      label: 'Eingereicht' },
      'in_review_gs':  { cls: 'badge badge--warning',   label: 'in GS-Prüfung' },
      'in_review_pfm': { cls: 'badge badge--warning',   label: 'in PFM-Prüfung' },
      'approved':      { cls: 'badge badge--success',   label: 'genehmigt' },
      'in_project':    { cls: 'badge badge--info',      label: 'in ePPM' },
      'closed':        { cls: 'badge badge--success',   label: 'abgeschlossen' },
      'clarification': { cls: 'badge badge--orange',    label: 'Rückfrage' },
      'rejected':      { cls: 'badge badge--danger',    label: 'abgelehnt' },
    };
    const b = map[status] || { cls: 'badge', label: status };
    return `<span class="${b.cls}">${b.label}</span>`;
  }

  // Inline-SVG icon set. Single source for the small handful of icons used
  // across views — replaces ad-hoc emoji glyphs (📄/🎥/📎/🛠/…) so the UI
  // doesn't depend on the user's emoji font for visual chrome.
  const ICONS = {
    document:   '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    video:      '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
    attachment: '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 12-8.5 8.5a5 5 0 0 1-7-7L14 5a3.5 3.5 0 1 1 5 5l-8.5 8.5a2 2 0 0 1-3-3l7.5-7.5"/></svg>',
    shield:     '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    ruler:      '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0L2.7 16.7a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/></svg>',
    tool:       '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/></svg>',
    truck:      '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    sparkles:   '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 1.9 5.8L20 11l-6.1 1.7L12 19l-1.9-6.3L4 11l6.1-2.2z"/></svg>',
    download:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    grid:       '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    list:       '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    map:        '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
    search:     '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>',
    chevronLeft: '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>',
    chevronRight:'<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>',
    x:          '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  };
  function icon(name) { return ICONS[name] || ''; }

  function formatChf(n) {
    return 'CHF ' + n.toLocaleString('de-CH');
  }
  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
  // Use when interpolating into a JS-string literal that lives inside an
  // HTML attribute (e.g. onclick="foo('${escapeJs(x)}')"). escapeHtml is
  // wrong here because the browser HTML-decodes the attribute before the
  // JS parser sees it, so &#39; turns back into ' and breaks the literal.
  function escapeJs(s) {
    return String(s ?? '').replace(/[\\'"<>&\r\n\u2028\u2029]/g, c => ({
      '\\': '\\\\', "'": "\\'", '"': '\\"',
      '<': '\\x3C', '>': '\\x3E', '&': '\\x26',
      '\r': '\\r', '\n': '\\n',
      '\u2028': '\\u2028', '\u2029': '\\u2029'
    }[c]));
  }

  function toggleNavMenu(id, force) {
    const panel = document.getElementById('navMenu-' + id);
    const trigger = document.querySelector(`[data-menu="${id}"]`);
    if (!panel) return;
    const isOpen = !panel.hasAttribute('hidden');
    const next = (typeof force === 'boolean') ? force : !isOpen;
    // Close any other open nav menus
    document.querySelectorAll('.nav-menu').forEach(m => {
      m.setAttribute('hidden', '');
      m.classList.remove('open');
    });
    document.querySelectorAll('.main-navigation__link--has-menu').forEach(t => t.setAttribute('aria-expanded', 'false'));
    if (next) {
      panel.removeAttribute('hidden');
      panel.classList.add('open');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'true');
        // Anchor the dropdown panel under the trigger word, like swisstopo.
        // The .navbar is position:relative, so we offset from its left edge.
        const navbar = trigger.closest('.navbar');
        if (navbar) {
          const navRect = navbar.getBoundingClientRect();
          const tRect = trigger.getBoundingClientRect();
          const panelW = panel.offsetWidth;
          let leftPx = tRect.left - navRect.left;
          // Clamp so the panel never goes past the navbar right edge
          if (leftPx + panelW > navRect.width - 12) {
            leftPx = Math.max(12, navRect.width - panelW - 12);
          }
          panel.style.left = leftPx + 'px';
          panel.style.right = 'auto';
        }
      }
    }
  }

  // Click-outside / Esc to close nav menus
  document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-menu, .main-navigation__link--has-menu')) return;
    document.querySelectorAll('.nav-menu:not([hidden])').forEach(m => {
      const id = m.id.replace('navMenu-', '');
      toggleNavMenu(id, false);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.nav-menu:not([hidden])').forEach(m => {
      const id = m.id.replace('navMenu-', '');
      toggleNavMenu(id, false);
    });
  });

  // ── SHARE-BAR (detail pages) ─────────────────────────────────────────────
  function renderShareBar() {
    return `
      <div class="share-bar" role="toolbar" aria-label="Seite teilen oder drucken">
        <button class="share-bar__btn" type="button" aria-label="Link kopieren"
                onclick="window.portal.copyShareLink()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span>Teilen</span>
        </button>
        <button class="share-bar__btn" type="button" aria-label="Seite drucken"
                onclick="window.print()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          <span>Drucken</span>
        </button>
      </div>
    `;
  }

  function copyShareLink() {
    const url = location.href;
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  }
  function fallbackCopy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => toast('Link kopiert: ' + text, 'success'),
        () => toast('Kopieren nicht möglich — bitte Adresse manuell aus dem Browser kopieren.')
      );
    } else {
      toast('Link: ' + text);
    }
  }

  function toggleLang() {
    const el = document.getElementById('langSwitch');
    const btn = el && el.querySelector('.top-bar__lang');
    if (!el) return;
    const isOpen = el.classList.toggle('open');
    if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
  function pickLang(code) {
    document.querySelectorAll('.language-switcher__option').forEach(o => {
      const isActive = o.getAttribute('data-lang') === code;
      o.classList.toggle('language-switcher__option--active', isActive);
      o.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    const current = document.getElementById('langCurrent');
    if (current) current.textContent = code;
    toggleLang();
    if (code !== 'DE') {
      toast(`${code}-Lokalisation noch nicht implementiert — Anzeige bleibt auf DE.`, '');
    }
  }

  function submitSearch(form) {
    const q = (form.querySelector('input[name="q"]').value || '').trim();
    if (!q) return;
    toggleSearch(false);
    navigate('#/search?q=' + encodeURIComponent(q));
  }

  function toggleSearch(open) {
    const el = document.getElementById('headerSearch');
    const toggle = document.querySelector('.header-search__toggle');
    const input = document.getElementById('headerSearchInput');
    if (!el) return;
    if (open) {
      el.classList.add('open');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      if (input) setTimeout(() => input.focus(), 50);
    } else {
      el.classList.remove('open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
  }

  // ── EXPORT ───────────────────────────────────────────────────────────────
  global.portal = {
    state, loadData,
    persistDraft, loadDraft, clearDraft, persistRole, loadRole,
    registerRoute, navigate, handleHash,
    renderShell, renderFooter, renderShortcutOverlay, wireGlobalShortcuts,
    renderPipeline, renderStepIndicator,
    calcWizard, deriveNawClass,
    toast, modal, toggleSearch, toggleNavMenu, renderShareBar, copyShareLink, submitSearch, toggleLang, pickLang,
    openRoleMenu, login, logout,
    statusBadge,
    formatChf, formatDate, escapeHtml, escapeJs, roleLabel, icon,
    PIPELINE_STANDARD, PIPELINE_BK, PIPELINE_GREENFIELD,
  };

  // ── VIEWS ───────────────────────────────────────────────────────────────
  // Per-route renderers. They use the helpers above via local alias `P`
  // (kept so the existing inline-handler call sites — window.portal.x —
  // keep working without rewriting every view).
  const P = global.portal;
  const root = document.getElementById('root');

  // ── BOOTSTRAP ────────────────────────────────────────────────────────────
  init();

  async function init() {
    await P.loadData('data/');
    P.wireGlobalShortcuts();
    registerRoutes();
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
    P.registerRoute('#/help',        renderHelp);
    P.registerRoute('#/properties',  renderProperties);
    P.registerRoute('#/properties/:id', renderPropertyDetail);
    P.registerRoute('#/downloads',   renderDownloads);
    P.registerRoute('#/repair',      renderRepairQuickForm);
    P.registerRoute('#/profile',     renderProfile);
    P.registerRoute('#/news',        renderNewsList);
    P.registerRoute('#/news/:id',    renderNewsDetail);
    P.registerRoute('#/services',    renderServicesOverview);
    P.registerRoute('#/moves',       () => renderServiceStub('Umzug & Sonderreinigung', 'REQ-FA-006', 'Transport, Umzug innerhalb einer Liegenschaft und Sonderreinigungsanfragen werden in einer der nächsten Iterationen des Mieterportals freigeschaltet.'));
    P.registerRoute('#/mobiliar',    () => renderServiceStub('Möbel bestellen', 'REQ-FA-007', 'Der föderale Mobiliar-Shop läuft im Schwesterprojekt „Arbeitsplatz-Management" — Sie werden in der Produktivversion direkt dorthin verknüpft.', 'https://bbl-dres.github.io/workspace-management/'));
    P.registerRoute('#/training',    () => renderServiceStub('Schulungen', 'FUNC-LP-007', 'Aktuelle Schulungen wie „Mieterportal kompakt" (60 Min.) und Aufbaukurse sind hier verlinkt — Termin-Buchung folgt in v0.4.'));
    // Arbeitsinstrumente und Informationen — single long-scroll page (public)
    P.registerRoute('#/info',                renderInfoPage);
    P.registerRoute('#/search',              renderSearchResults);
  }

  // ── GLOBAL SEARCH RESULTS ────────────────────────────────────────────────
  function renderSearchResults() {
    shell({ breadcrumb: [{ href: '#/', label: 'Start' }, { label: 'Suchergebnisse' }] });
    const q = (location.hash.split('?q=')[1] || '').replace(/^=/, '');
    const query = decodeURIComponent(q || '').toLowerCase().trim();

    const matches = {
      news:        [],
      applications: [],
      properties:  [],
      info:        [],
    };

    if (query) {
      matches.news = (P.state.news || []).filter(n =>
        n.title.toLowerCase().includes(query) || n.lead.toLowerCase().includes(query));
      matches.applications = (P.state.applications || []).filter(a => {
        if (!P.state.user) return false;
        const mine = a.submitterId === P.state.user.id || a.submitterVe === P.state.user.ve;
        if (!mine) return false;
        return a.id.toLowerCase().includes(query) || (a.address || '').toLowerCase().includes(query);
      });
      matches.properties = (P.state.tenancies || []).filter(t =>
        t.buildingName.toLowerCase().includes(query) || t.address.toLowerCase().includes(query));
      // Search the info-page section headings as a simple proxy
      matches.info = INFO_TOC.filter(it => it.label.toLowerCase().includes(query) || query.includes(it.id));
    }

    const total = matches.news.length + matches.applications.length + matches.properties.length + matches.info.length;

    document.getElementById('page-body').innerHTML = `
      ${P.renderShareBar()}
      <section class="section">
        <div class="container" style="max-width: 960px;">
          <h1 class="h1 section-heading">Suchergebnisse${query ? ` für „${P.escapeHtml(query)}"` : ''}</h1>
          ${!query ? `
            <p style="color: var(--color-text-secondary);">Bitte geben Sie einen Suchbegriff in der Suchleiste oben ein.</p>
          ` : total === 0 ? `
            <div class="empty-state">
              <div class="empty-state__glyph">🔍</div>
              <h2 class="empty-state__title">Keine Treffer</h2>
              <p class="empty-state__lead">Versuchen Sie es mit anderen Schlüsselwörtern oder durchsuchen Sie die <a href="#/info">Arbeitsinstrumente und Informationen</a>.</p>
            </div>
          ` : `
            <p style="color: var(--color-text-secondary); margin: 0 0 var(--space-2xl);">${total} Treffer in ${[matches.news.length && 'Aktuell', matches.applications.length && 'Anträge', matches.properties.length && 'Liegenschaften', matches.info.length && 'Arbeitsinstrumente'].filter(Boolean).join(', ')}.</p>

            ${matches.news.length ? `
              <section style="margin-bottom: var(--space-2xl);">
                <h2 style="font-size: var(--text-h3); margin: 0 0 var(--space-md);">Aktuell (${matches.news.length})</h2>
                <ul class="search-results">
                  ${matches.news.map(n => `
                    <li><a href="#/news/${n.id}">
                      <strong>${P.escapeHtml(n.type)}</strong> · ${P.formatDate(n.date)} · <span class="search-results__title">${P.escapeHtml(n.title)}</span>
                      <p class="search-results__lead">${P.escapeHtml(n.lead.slice(0, 160))}…</p>
                    </a></li>
                  `).join('')}
                </ul>
              </section>
            ` : ''}

            ${matches.applications.length ? `
              <section style="margin-bottom: var(--space-2xl);">
                <h2 style="font-size: var(--text-h3); margin: 0 0 var(--space-md);">Anträge (${matches.applications.length})</h2>
                <ul class="search-results">
                  ${matches.applications.map(a => `
                    <li><a href="#/inbox/${a.id}">
                      <strong>${a.id}</strong> · ${a.type} · <span class="search-results__title">${P.escapeHtml(a.address)}</span>
                      <p class="search-results__lead">Eingereicht ${P.formatDate(a.submittedAt)} · ${P.statusBadge(a.status)}</p>
                    </a></li>
                  `).join('')}
                </ul>
              </section>
            ` : ''}

            ${matches.properties.length ? `
              <section style="margin-bottom: var(--space-2xl);">
                <h2 style="font-size: var(--text-h3); margin: 0 0 var(--space-md);">Liegenschaften (${matches.properties.length})</h2>
                <ul class="search-results">
                  ${matches.properties.map(t => `
                    <li><a href="#/properties/${t.id}">
                      <strong>${formatAssetKey(t.assetKey)}</strong> · <span class="search-results__title">${P.escapeHtml(t.buildingName)}</span>
                      <p class="search-results__lead">${P.escapeHtml(t.address)} · ${t.hnf2} m² HNF2</p>
                    </a></li>
                  `).join('')}
                </ul>
              </section>
            ` : ''}

            ${matches.info.length ? `
              <section style="margin-bottom: var(--space-2xl);">
                <h2 style="font-size: var(--text-h3); margin: 0 0 var(--space-md);">Arbeitsinstrumente und Informationen (${matches.info.length})</h2>
                <ul class="search-results">
                  ${matches.info.map(it => `
                    <li><a href="#/info" onclick="setTimeout(() => window.t3lite.scrollToInfo('${it.id}'), 100);">
                      <span class="search-results__title">${P.escapeHtml(it.label)}</span>
                      <p class="search-results__lead">Abschnitt auf der Info-Seite öffnen.</p>
                    </a></li>
                  `).join('')}
                </ul>
              </section>
            ` : ''}
          `}
        </div>
      </section>
    `;
  }

  // ── ARBEITSINSTRUMENTE UND INFORMATIONEN ─────────────────────────────────
  // Single long-scroll page with a sticky Inhaltsverzeichnis on the right
  // (kbob-fdk Handbuch & Downloads pattern; armasuisse Immo-Portal layout).
  // Public — no login required.

  const INFO_TOC = [
    { id: 'einfuehrung',   label: 'Einführung' },
    { id: 'faq',           label: 'Häufige Fragen' },
    { id: 'workflow',      label: 'Workflow erklärt' },
    { id: 'naw',           label: 'NAW & Bürowelten' },
    { id: 'verordnungen',  label: 'Verordnungen, Weisungen und Vorgaben' },
    { id: 'strategien',    label: 'Strategien und Konzepte' },
    { id: 'schulungen',    label: 'Schulungen' },
    { id: 'kontakt',       label: 'Kontakt' },
  ];

  function renderInfoPage() {
    shell({ activeNav: 'info', breadcrumb: [
      { href: '#/', label: 'Start' },
      { label: 'Arbeitsinstrumente und Informationen' }
    ]});

    document.getElementById('page-body').innerHTML = `
      ${P.renderShareBar()}
      <section class="section">
        <div class="container">
          <header style="max-width: 60ch; margin-bottom: var(--space-2xl);">
            <p class="meta-info">Öffentlich · kein Login nötig</p>
            <h1 style="font-size: var(--text-display); letter-spacing: -0.02em; margin: 0 0 var(--space-md);">Arbeitsinstrumente und Informationen</h1>
            <p style="color: var(--color-text-secondary); font-size: var(--text-body); line-height: var(--line-height-relaxed); margin: 0;">
              Erklärungen, Merkblätter, Vorlagen und Schulungsmaterial rund um das Mieterportal des BBL. Diese Inhalte sind öffentlich zugänglich und unterstützen Sie dabei, Anfragen vorzubereiten oder den BBL-Workflow zu verstehen.
            </p>
          </header>

          <div class="page-with-toc">
            <main class="page-with-toc__content">

              <article id="einfuehrung">
                <h2>Einführung</h2>
                <p>Das Bundesamt für Bauten und Logistik (BBL) bewirtschaftet als Eigentümervertretung rund 2'800 Liegenschaften der zivilen Bundesverwaltung — überwiegend Büroflächen in Bundeshäusern und Departementssitzen, dazu spezialisierte Objekte wie die Empfangs- und Verfahrenszentren des SEM. Die Liegenschaften des VBS (armasuisse Immobilien) und die Auslandvertretungen der EDA sind nicht Teil des BBL-Portfolios.</p>
                <p>Das Mieterportal ist die zentrale digitale Anlaufstelle für die Verwaltungseinheiten als Mietende: Bedarfsmeldung, Schadensmeldung, Statusverfolgung und Zugriff auf Dokumente zu Ihren Liegenschaften. Die hier zusammengetragenen Informationen sind öffentlich zugänglich; für eigentliche Anträge ist eine Anmeldung mit dem föderalen eIAM-Konto erforderlich.</p>
              </article>

              <article id="faq">
                <h2>Häufige Fragen</h2>
                <div class="accordion">
                  ${faqItem('Wer kann das Mieterportal nutzen?', 'Hauptnutzergruppe sind die Logistikbeauftragten (LBO) der Verwaltungseinheiten der zivilen Bundesverwaltung. Daneben haben Generalsekretariate (GS) sowie das Portfolio-Management des BBL Zugriff auf die jeweils zuständigen Sichten. Die Anmeldung erfolgt mit dem föderalen eIAM-Konto.')}
                  ${faqItem('Was bedeutet NAW?', 'NAW steht für „Neue Arbeitswelten" — die föderale Vorgabe für die Klassifizierung von Büroarbeitsplätzen. Jede Klasse hat eine eigene m²/FTE-Basis; zusammen mit dem fixen Belegungsfaktor 0.8 (Desk-Sharing) ergibt sie die HNF2 und die Geschossfläche.')}
                  ${faqItem('Wer prüft meine Bedarfsmeldung?', 'In der Regel das Generalsekretariat (GS) Ihres Departements. Die Bundeskanzlei nimmt selbst Generalsekretariats-Funktion wahr — Anträge aus der BK gehen daher ohne zusätzliche GS-Prüfung direkt an das BBL Portfolio-Management.')}
                  ${faqItem('Was ist ein Greenfield-Pfad?', 'Wenn die angegebene Adresse noch nicht im SAP RE-FX-Stammdatensatz registriert ist — etwa weil ein Neubau- oder Anmietungsprojekt gerade erst geplant wird — aktiviert das Portal den Greenfield-Modus. Der Antrag wird trotzdem entgegengenommen; BBL legt die Wirtschaftseinheit (WE) im weiteren Verlauf an.')}
                  ${faqItem('Wie geht es nach der Genehmigung weiter?', 'Genehmigte Bedarfsmeldungen werden automatisch an SAP ePPM übergeben, wo die zugehörige Projektakte mit einer Bedarfsmeldungs-Nummer eröffnet wird. Sie erhalten eine Eingangsbestätigung sowie die ePPM-Nummer als Referenz für die weitere Korrespondenz.')}
                  ${faqItem('Wie lange dauert die Bearbeitung?', 'Die Bearbeitungszeit hängt vom Antragstyp ab. Kleinanträge (z. B. punktuelle Anpassungen, Mobiliarbestellungen) werden in der Regel innerhalb von 10 Arbeitstagen entschieden, Grossanträge mit Projekteröffnung benötigen mehrere Wochen. Die konkrete Frist sehen Sie im Antragsdetail.')}
                  ${faqItem('Wer ist während der Bauphase mein Ansprechpartner?', 'Sobald der Antrag in ePPM überführt ist, übernimmt der BBL-Bauherrenvertretung / -Projektmanagement die Leitung. Im Portal sehen Sie die zuständige Kontaktperson in der Antragsdetail-Sicht. Die LBO bleibt während der gesamten Laufzeit die mieterseitige Anlaufstelle.')}
                </div>
              </article>

              <article id="workflow">
                <h2>Workflow erklärt</h2>
                <p>Eine Bedarfsmeldung durchläuft vier Hauptphasen, die im Mieterportal als Statuspipeline sichtbar sind:</p>
                <ol style="line-height: var(--line-height-relaxed); padding-left: var(--space-lg);">
                  <li><strong>Entwurf</strong> — Sie erfassen den Bedarf im fünfstufigen Wizard. Eingaben werden automatisch zwischengespeichert; Sie können jederzeit unterbrechen und später weiterarbeiten.</li>
                  <li><strong>Eingereicht → in GS-Prüfung</strong> — Das Generalsekretariat Ihres Departements prüft die Angaben feldweise auf Vollständigkeit und Plausibilität. Rückfragen können einzelne Felder betreffen; Sie erhalten in diesem Fall einen kommentierten Auflagenkatalog zur Nachbearbeitung.</li>
                  <li><strong>Genehmigt → in ePPM</strong> — Die freigegebene Meldung wird automatisch an SAP ePPM (Enterprise Portfolio &amp; Project Management) übergeben. Dort eröffnet das BBL-Portfolio-Management die Projektakte und vergibt eine Bedarfsmeldungs-Nummer, die als zukünftige Referenz dient.</li>
                  <li><strong>Abgeschlossen</strong> — Nach Umsetzung und Übergabe an die Mietenden gilt die Akte als abgeschlossen. Die Historie bleibt im Mieterportal abrufbar und ist gemäss BBL-Aktenführung archiviert.</li>
                </ol>
                <p>Zwei Spezialfälle:</p>
                <ul style="line-height: var(--line-height-relaxed); padding-left: var(--space-lg);">
                  <li><strong>Bundeskanzlei-Pfad</strong> — Anträge der Bundeskanzlei werden ohne separate GS-Prüfung direkt dem BBL Portfolio-Management vorgelegt.</li>
                  <li><strong>Greenfield-Pfad</strong> — Wenn das Objekt noch keinen SAP RE-FX-Eintrag hat, ergänzt BBL vor der ePPM-Übergabe einen zusätzlichen Schritt „Wirtschaftseinheit anlegen".</li>
                </ul>
              </article>

              <article id="naw">
                <h2>NAW & Bürowelten erklärt</h2>
                <p>Die NAW-Klassen sind die föderale Vorgabe für die Flächenberechnung von Büroarbeitsplätzen. Jede Klasse hat eine eigene m²/FTE-Basis; multipliziert mit dem fixen Belegungsfaktor 0.8 (Desk-Sharing) ergibt sie HNF2 und GF.</p>
                <table class="table" style="margin-top: var(--space-md);">
                  <thead>
                    <tr><th>NAW-Klasse</th><th>m²/FTE HNF2</th><th>m²/FTE GF</th><th>Beschreibung</th></tr>
                  </thead>
                  <tbody>
                    ${(P.state.referenceData?.nawClasses || []).map(nc => `
                      <tr><td>${P.escapeHtml(nc.name)}</td><td>${nc.hnf2PerFte.toFixed(1)}</td><td>${nc.gfPerFte.toFixed(1)}</td><td>${P.escapeHtml(nc.description)}</td></tr>
                    `).join('')}
                  </tbody>
                </table>
              </article>

              <article id="verordnungen">
                <h2>Verordnungen, Weisungen und Vorgaben</h2>
                <p>Rechtsgrundlagen und föderale Vorgaben, die für die Bewirtschaftung von Bundes-Immobilien und die Einreichung von Bedarfsmeldungen massgebend sind.</p>
                ${downloadList(P.state.downloads?.regulations || [])}
              </article>

              <article id="strategien">
                <h2>Strategien und Konzepte</h2>
                <p>Übergeordnete Strategien des BBL und des Bundes, die das Mieterportal und die zugrunde liegenden Flächenentscheide prägen.</p>
                ${downloadList(P.state.downloads?.strategies || [])}
                <p style="margin-top: var(--space-md); color: var(--color-text-secondary); font-size: var(--text-body-sm);">
                  <strong>Hinweis:</strong> Formulare und Checklisten zur Bedarfsmeldung werden direkt im Mieterportal geführt
                  (5-Schritte-Wizard, Wirtschaftlichkeitsbetrachtung, Anhänge-Management) — es ist kein Download von Vorlagen mehr nötig.
                </p>
              </article>

              <article id="schulungen">
                <h2>Ausbildung</h2>
                <p>Hier finden Sie aktuelle Informationen zu den Ausbildungen rund um das Mieterportal des BBL. Logistikbeauftragte und weitere am Bedarfsprozess beteiligte Personen werden stufengerecht geschult und damit befähigt, ihre Rolle effizient wahrzunehmen.</p>

                <h3 style="margin-top: var(--space-xl);">Anmeldungen Ausbildung Mieterportal</h3>
                <div class="accordion" style="margin-bottom: var(--space-xl);">
                  <div class="accordion__item accordion__item--open">
                    <button class="accordion__trigger" type="button" onclick="this.parentElement.classList.toggle('accordion__item--open')">
                      <span>Für Ausbildungen anmelden</span>
                      <span class="accordion__icon" aria-hidden="true"></span>
                    </button>
                    <div class="accordion__panel">
                      <ul class="link-list">
                        <li><a class="link link--external" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">Grundausbildung Mieterportal BBL</a></li>
                        <li><a class="link link--external" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">Spezialmodul Bedarfserfassung & NAW-Klassifizierung</a></li>
                        <li><a class="link link--external" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">Spezialmodul Greenfield- und Auslandfälle</a></li>
                        <li><a class="link link--external" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">Spezialmodul Reviewer GS / BBL-PFM</a></li>
                      </ul>
                    </div>
                  </div>
                  <div class="accordion__item">
                    <button class="accordion__trigger" type="button" onclick="this.parentElement.classList.toggle('accordion__item--open')">
                      <span>Lernvideos</span>
                      <span class="accordion__icon" aria-hidden="true"></span>
                    </button>
                    <div class="accordion__panel">
                      <ul class="link-list">
                        <li><a class="link link--external" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">Mieterportal in fünf Minuten — Überblick</a></li>
                        <li><a class="link link--external" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">Bedarfsmeldung Schritt für Schritt</a></li>
                        <li><a class="link link--external" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">NAW-Klassifizierung erklärt</a></li>
                        <li><a class="link link--external" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">Greenfield-Pfad und Stammdatenanlage</a></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <h3>Ausbildungsunterlagen</h3>
                ${downloadList(P.state.downloads?.training || [])}
              </article>

<article id="kontakt">
                <h2>BBL Bundesamt für Bauten und Logistik</h2>
                <div class="contact-block">
                  <div class="contact-block__col">
                    <p class="contact-block__address">
                      Fellerstrasse 21<br>
                      CH-3003 Bern
                    </p>
                    <p class="contact-block__row">
                      <a class="contact-block__link" href="tel:+41584655000">
                        <svg class="contact-block__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        +41 58 465 50 00
                      </a>
                    </p>
                    <p class="contact-block__row">
                      <a class="contact-block__link" href="mailto:info@bbl.admin.ch">
                        <svg class="contact-block__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        info@bbl.admin.ch
                      </a>
                    </p>
                    <p class="contact-block__row">
                      <a class="contact-block__link" href="https://www.bbl.admin.ch" target="_blank" rel="noopener">
                        <svg class="contact-block__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        www.bbl.admin.ch
                      </a>
                    </p>
                  </div>
                  <div class="contact-block__col">
                    <p class="contact-block__lead"><strong>Geschäftsstelle Portfolio-Management</strong></p>
                    <p style="color: var(--color-text-secondary); font-size: var(--text-body-sm); margin: 0 0 var(--space-md);">
                      Für Fragen zum Mieterportal, zu Bedarfsmeldungen, zu Flächenstandards (NAW) oder zur Übergabe an SAP ePPM.
                      Bei dringenden technischen Problemen mit dem eIAM-Zugang wenden Sie sich an den BIT IT-Support.
                    </p>
                    <p class="contact-block__lead"><strong>BIT IT-Support — eIAM</strong></p>
                    <p style="color: var(--color-text-secondary); font-size: var(--text-body-sm); margin: 0;">
                      <a href="mailto:service-desk@bit.admin.ch">service-desk@bit.admin.ch</a>
                    </p>
                  </div>
                </div>
              </article>

            </main>

            <aside class="page-with-toc__toc" aria-label="Inhaltsverzeichnis">
              <h2 class="page-with-toc__toc-title">Inhaltsverzeichnis</h2>
              <ul class="page-with-toc__toc-list">
                ${INFO_TOC.map((it, i) => `
                  <li class="page-with-toc__toc-item ${i === 0 ? 'page-with-toc__toc-item--active' : ''}">
                    <a class="page-with-toc__toc-link" href="#${it.id}"
                       onclick="event.preventDefault(); window.t3lite.scrollToInfo('${it.id}');">
                      ${P.escapeHtml(it.label)}
                    </a>
                  </li>
                `).join('')}
              </ul>
            </aside>
          </div>
        </div>
      </section>
    `;

    wireInfoScrollSpy();
  }

  function faqItem(question, answer) {
    return `
      <div class="accordion__item">
        <button class="accordion__trigger" type="button" onclick="this.parentElement.classList.toggle('accordion__item--open')">
          <span>${P.escapeHtml(question)}</span>
          <span class="accordion__icon" aria-hidden="true"></span>
        </button>
        <div class="accordion__panel"><p>${P.escapeHtml(answer)}</p></div>
      </div>
    `;
  }

  function wireInfoScrollSpy() {
    const articles = document.querySelectorAll('.page-with-toc__content > article[id]');
    const items = document.querySelectorAll('.page-with-toc__toc-item');
    if (!articles.length || !items.length) return;

    const setActive = (id) => {
      items.forEach(item => {
        const href = item.querySelector('a')?.getAttribute('href');
        item.classList.toggle('page-with-toc__toc-item--active', href === '#' + id);
      });
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-30% 0% -55% 0%', threshold: 0 });

    articles.forEach(a => observer.observe(a));
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div class="news-section__track" id="newsTrack">
              ${visible.map(newsCard).join('')}
            </div>
            <button class="news-section__nav news-section__nav--next" type="button" aria-label="Nächste Nachrichten"
                    onclick="window.t3lite.newsPage(${page + 1})" ${nextDisabled ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
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
            <a class="news-section__more" href="#/news">Weitere News <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </section>
    `;
  }

  function newsCard(n) {
    return `
      <a class="card--profile news-card" href="#/news/${n.id}">
        <div class="card--profile__image" style="background-image:url('${n.image}');"></div>
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
  function renderNewsList() {
    shell({ breadcrumb: [{ href: '#/', label: 'Start' }, { label: 'News-Übersicht' }] });
    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container" style="max-width: 1024px;">
          <div style="text-align:center;margin-bottom: var(--space-2xl);">
            <p style="margin:0 0 var(--space-xs); color: var(--color-text-secondary); font-size: var(--text-body-sm);">Veröffentlicht am ${P.formatDate(new Date().toISOString())}</p>
            <h1 style="margin:0;font-size: var(--text-display);font-weight: var(--font-weight-bold); letter-spacing: -0.02em;">News-Übersicht</h1>
          </div>
          <ul class="news-list">
            ${P.state.news.map(newsListRow).join('')}
          </ul>
        </div>
      </section>
    `;
  }

  function newsListRow(n) {
    return `
      <li class="news-list__item">
        <a class="news-list__link" href="#/news/${n.id}">
          <div class="news-list__body">
            <p class="news-list__meta"><strong>${P.escapeHtml(n.type)}</strong> &nbsp;|&nbsp; ${P.formatDate(n.date)}</p>
            <h2 class="news-list__title">${P.escapeHtml(n.title)}</h2>
            <p class="news-list__lead">${P.escapeHtml(n.lead)}</p>
          </div>
          <div class="news-list__image" style="background-image:url('${n.image}');"></div>
        </a>
      </li>
    `;
  }

  function renderNewsDetail({ id }) {
    const n = P.state.news.find(x => x.id === id);
    if (!n) { shell(); document.getElementById('page-body').innerHTML = '<div class="container section"><p>Nachricht nicht gefunden.</p></div>'; return; }
    shell({ breadcrumb: [{ href: '#/', label: 'Start' }, { href: '#/news', label: 'News-Übersicht' }, { label: n.title }] });
    document.getElementById('page-body').innerHTML = `
      ${P.renderShareBar()}
      <article class="section">
        <div class="container" style="max-width: 780px;">
          <p style="color: var(--color-text-secondary); font-size: var(--text-body-sm); margin: 0 0 var(--space-sm);"><strong>${P.escapeHtml(n.type)}</strong> &nbsp;|&nbsp; ${P.formatDate(n.date)}</p>
          <h1 style="margin: 0 0 var(--space-lg); font-size: var(--text-display); letter-spacing: -0.02em;">${P.escapeHtml(n.title)}</h1>
          <img src="${n.image}" alt="" style="width:100%; aspect-ratio: 16/9; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: var(--space-xl);">
          <p style="font-size: var(--text-h4); color: var(--color-text-primary); line-height: var(--line-height-relaxed); margin: 0 0 var(--space-lg);">${P.escapeHtml(n.lead)}</p>
          <p style="color: var(--color-text-secondary); font-size: var(--text-body-sm); margin: 0; padding-top: var(--space-md); border-top: 1px solid var(--color-border);">
            Quelle: ${P.escapeHtml(n.source)} · Verantwortlich: ${P.escapeHtml(n.responsible)} · Stand: ${P.formatDate(n.date)} · DE
          </p>
          <p style="margin-top: var(--space-xl);"><a href="#/news" class="btn btn--outline">← Zur News-Übersicht</a></p>
        </div>
      </article>
    `;
  }

  function renderRoot() {
    if (P.state.user) {
      P.navigate('#/home');
    } else {
      renderLanding();
    }
  }

  // ── SHELL HELPERS ────────────────────────────────────────────────────────
  function shell({ activeNav = '', breadcrumb = [], deptSub = 'Mieterportal' } = {}) {
    const navItems = P.state.user ? authNavItems() : publicNavItems();
    root.innerHTML = P.renderShell({ deptSub, activeNav, breadcrumb, navItems })
                   + '<div id="page-body"></div>'
                   + P.renderFooter()
                   + P.renderShortcutOverlay();
    return document.getElementById('main');
  }

  // Canonical service catalogue — all BBL services tenants can request.
  // Surface: the "Dienstleistungen" nav-menu dropdown.
  // Source: REQUIREMENTS.md §1.3 pilot + §4.1 Case A roadmap (REQ-FA-*) +
  // FUNC-LP-007 self-service downloads / training.
  // Services (login required) — appear only in authenticated nav.
  // Source: REQUIREMENTS.md §2.x pilot + §4.1 Case A roadmap.
  const SERVICES_MENU = {
    id: 'services',
    label: 'Dienstleistungen',
    type: 'dropdown',
    items: [
      { href: '#/services',  label: 'Übersicht',               desc: 'Alle Dienstleistungen im Überblick' },
      { href: '#/wizard/1',  label: 'Bedarf anmelden',         desc: 'Unterbringung, Büro, Auslandvertretung' },
      { href: '#/repair',    label: 'Schaden melden',          desc: 'Reparaturen, Sanitär, Schliesssystem' },
      { href: '#/moves',     label: 'Umzug & Sonderreinigung', desc: 'Transport- und Reinigungsanfragen' },
      { href: '#/mobiliar',  label: 'Möbel bestellen',         desc: 'Standard- und Spezialmobiliar' },
      { href: '#/downloads', label: 'Pläne & Dokumente',       desc: 'Grundrisse, Merkblätter, Schulungen' },
      { href: '#/training',  label: 'Schulungen',              desc: '„Mieterportal kompakt" und weitere' },
    ]
  };

  // Arbeitsinstrumente und Informationen (public, always visible) — single
  // page at #/info with sticky TOC. Pattern: armasuisse Immo-Portal +
  // kbob-fdk "Handbuch & Downloads".
  const INFO_LINK = { id: 'info', href: '#/info', label: 'Arbeitsinstrumente und Informationen' };

  function publicNavItems() {
    return [
      { id: 'start', href: '#/', label: 'Start' },
      INFO_LINK,
    ];
  }

  function authNavItems() {
    const role = P.state.user.activeRole;
    if (role === 'GS-Reviewer') {
      return [
        { id: 'queue', href: '#/queue', label: 'Pendenzen' },
        { id: 'inbox', href: '#/inbox', label: 'Anträge der VE' },
        SERVICES_MENU,
        INFO_LINK,
      ];
    }
    if (role === 'LBO' || !role) {
      return [
        { id: 'home',       href: '#/home',       label: 'Start' },
        SERVICES_MENU,
        { id: 'properties', href: '#/properties', label: 'Liegenschaften' },
        { id: 'inbox',      href: '#/inbox',      label: 'Meine Anträge' },
        INFO_LINK,
      ];
    }
    return [
      { id: 'home', href: '#/home', label: 'Start' },
      SERVICES_MENU,
      INFO_LINK,
    ];
  }

  // ── 1. LANDING (public, T3-Lite §3.6.1) ──────────────────────────────────
  function renderLanding() {
    const main = shell({ activeNav: 'start' });
    document.getElementById('page-body').innerHTML = `
      <section class="hero hero--wide hero--split">
        <div class="hero__inner hero__inner--split">
          <div>
            <h1 class="h1 hero__title">Bedarf anmelden, Status verfolgen, Dokumente herunterladen.</h1>
            <p class="hero__lead">
              Die zentrale Anlaufstelle für Bundes-Mietende — Bürofläche, Empfangs­zentren, Auslandvertretungen.
              Geführter Ablauf in fünf Schritten; Übergabe an SAP ePPM ohne Medienbruch.
            </p>
            <div class="hero__cta">
              <button class="btn btn--filled btn--lg" onclick="window.portal.login()">↗ Anmelden mit eIAM</button>
              <a href="#/help" class="btn btn--outline btn--lg">Wie funktioniert das Portal?</a>
            </div>
          </div>
          <figure class="hero__figure">
            <img src="https://images.unsplash.com/photo-1662119429110-e771f0f72364?w=1200&q=80"
                 alt="Bundeshaus in Bern — Sitz der Bundesversammlung und Symbol der durch BBL bewirtschafteten Bundesimmobilien.">
          </figure>
        </div>
      </section>

      <section class="portfolio-stats">
        <div class="container">
          <div class="portfolio-stats__grid">
            <div><strong>~2'700</strong><span>Immobilien im Portfolio</span></div>
            <div><strong>~6'500</strong><span>Mietverhältnisse</span></div>
            <div><strong>~38'000</strong><span>Arbeitsplätze Bundes­verwaltung</span></div>
            <div><strong>26</strong><span>Verwaltungs­einheiten</span></div>
          </div>
        </div>
      </section>

      <section class="section explainer-section" aria-labelledby="explainerTitle">
        <div class="container">
          <div class="explainer-section__grid">
            <div class="explainer-section__copy">
              <h2 class="h2 section-heading" id="explainerTitle">Mieterportal in 90 Sekunden</h2>
              <p style="color: var(--color-text-secondary); font-size: var(--text-body); line-height: var(--line-height-relaxed); margin: 0 0 var(--space-lg);">
                Bedarfsmeldung, Statusverfolgung, Pläne und Dokumente — alles an einem Ort.
                Sehen Sie in 90 Sekunden, wie das Mieterportal Bundes-Mietenden den Alltag
                erleichtert und welche Anfragen Sie direkt an das BBL stellen können.
              </p>
              <a href="#/help" class="btn btn--outline">Häufige Fragen ansehen</a>
            </div>
            <div class="video-embed">
              <iframe
                src="https://www.youtube-nocookie.com/embed/rin3crkLpRk?si=P1B2d_YofDZNkdOG"
                title="Erklärvideo Mieterportal (Platzhalter — Video der Stadt Zürich)"
                loading="lazy"
                referrerpolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen></iframe>
            </div>
          </div>
        </div>
      </section>

      ${renderNewsSection()}
    `;
  }

  // ── 2. LOGIN STUB ────────────────────────────────────────────────────────
  function renderLogin() {
    const main = shell();
    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container" style="max-width:640px;">
          <div class="notification-banner notification-banner--warning" style="margin-bottom: var(--space-lg);">
            <div class="notification-banner__wrapper">
              <p class="notification-banner__text">
                <strong>Prototyp-Anmeldung — kein echtes eIAM.</strong> Diese Seite simuliert den Login. Es wird keine Verbindung zu <code>login.eiam.admin.ch</code> hergestellt.
              </p>
            </div>
          </div>
          <div class="card">
            <h1 class="card__title" style="font-size: var(--text-h2);">Demo-Anmeldung</h1>
            <p class="card__lead">In der Produktivversion würden Sie zu <code>login.eiam.admin.ch</code> umgeleitet. Im Prototyp melden Sie sich mit einem voreingestellten Demo-Konto an.</p>

            <h2 style="font-size: var(--text-h4); margin: var(--space-md) 0 var(--space-sm);">Demo-Konto</h2>
            <dl style="margin: 0; display: grid; grid-template-columns: 140px 1fr; gap: var(--space-xs); font-size: var(--text-body-sm);">
              <dt style="color: var(--color-text-secondary);">Name</dt><dd style="margin: 0;">Andrea Muster</dd>
              <dt style="color: var(--color-text-secondary);">Verwaltung</dt><dd style="margin: 0;">UVEK / BAFU</dd>
              <dt style="color: var(--color-text-secondary);">Rollen</dt><dd style="margin: 0;">Logistikbeauftragte (LBO) · GS-Prüfer/in</dd>
            </dl>

            <button class="btn btn--filled btn--lg" style="margin-top: var(--space-lg);" onclick="window.portal.login()">Als Demo-Nutzerin anmelden</button>

            <p style="font-size: var(--text-body-xs); color: var(--color-text-secondary); margin-top: var(--space-md);">
              Für den Test der GS-Prüfer-Sicht: nach Login die URL <code>#/queue</code> aufrufen, oder direkt <a href="#/queue" onclick="window.t3lite.demoRole('GS-Reviewer'); return false;">hier die GS-Rolle aktivieren</a>.
            </p>
            <p style="font-size: var(--text-body-xs); color: var(--color-text-muted); margin-top: var(--space-sm);">
              Hinweis: Die Produktivversion plant ab Dezember 2026 den schrittweisen Übergang von eIAM auf AGOV / E-ID (REQUIREMENTS.md OP-3).
            </p>
          </div>
        </div>
      </section>
    `;
  }

  // ── 3. AUTH HOME ─────────────────────────────────────────────────────────
  function renderHome() {
    if (!P.state.user) { P.navigate('#/'); return; }
    const role = P.state.user.activeRole;
    if (role === 'GS-Reviewer') return renderQueue();
    return renderSubmitterHome();
  }

  function renderSubmitterHome() {
    const main = shell({ activeNav: 'home', breadcrumb: [{ label: 'Start' }] });
    const userApps = P.state.applications
      .filter(a => a.submitterId === P.state.user.id)
      .filter(a => !['closed', 'rejected'].includes(a.status));

    const draft = P.loadDraft();

    const rueckfrage = userApps.filter(a => a.status === 'clarification').length;
    const greeting = greetingFor(new Date().getHours());

    document.getElementById('page-body').innerHTML = `
      <section class="section section--surface">
        <div class="container">
          <p class="greeting-strip">
            ${greeting}, <strong>${P.escapeHtml(P.state.user.name.split(' ')[0])}</strong>.
            ${userApps.length
              ? `Sie haben <a href="#/inbox" class="greeting-strip__count"><strong>${userApps.length} offene Anliegen</strong></a>${rueckfrage ? `, <strong>${rueckfrage}</strong> mit Rückfrage` : ''}.`
              : `Sie haben derzeit keine offenen Anliegen.`}
            ${draft ? `<span class="greeting-strip__draft"> · <a href="#" onclick="event.preventDefault(); window.t3lite.continueDraft();">Entwurf fortsetzen</a></span>` : ''}
          </p>
          <h1 class="h1 section-heading">Häufig genutzte Dienste</h1>
          <p style="max-width: 60ch; color: var(--color-text-secondary); margin: 0 0 var(--space-2xl);">
            Anfragen, die Bundes-Mietende über das Mieterportal direkt an das BBL stellen können.
          </p>
          <div class="card-grid">
            <a href="#/wizard/1" class="card--quick">
              <p class="card--quick__title">Bedarf anmelden</p>
              <p class="card--quick__desc">Unterbringung, Bürofläche oder Auslandvertretung erfassen. Geführter Ablauf in fünf Schritten mit NAW-Klassifizierung und Übergabe an SAP ePPM.</p>
              <p class="card--quick__meta"><span>FUNC-AU-*</span></p>
              ${arrowBtn()}
            </a>
            <a href="#/properties" class="card--quick">
              <p class="card--quick__title">Liegenschaften Inventar</p>
              <p class="card--quick__desc">Übersicht der von Ihrer Verwaltungseinheit belegten Liegenschaften — Adresse, Fläche, Belegung, Vertragslaufzeit und zuständige BBL-Ansprechpersonen.</p>
              <p class="card--quick__meta"><span>FUNC-LP-001</span></p>
              ${arrowBtn()}
            </a>
            <a href="#/repair" class="card--quick">
              <p class="card--quick__title">Schaden melden</p>
              <p class="card--quick__desc">Defekte Heizung, Wasserschaden, Beleuchtung oder Schliesssystem? Schnellmeldung an BBL-IM, koordiniert mit Ihrem zuständigen Immobilien-Manager.</p>
              <p class="card--quick__meta"><span>REQ-FA-005</span></p>
              ${arrowBtn()}
            </a>
            <a href="#/downloads" class="card--quick">
              <p class="card--quick__title">Pläne & Dokumente</p>
              <p class="card--quick__desc">Grundrisse, Merkblätter und Schulungsmaterial Ihrer Verwaltungseinheit zum Herunterladen — gefiltert nach Sichtbarkeit und Stand.</p>
              <p class="card--quick__meta"><span>FUNC-LP-007</span></p>
              ${arrowBtn()}
            </a>
            <a href="#/mobiliar" class="card--quick">
              <p class="card--quick__title">Möbel bestellen</p>
              <p class="card--quick__desc">Standard- und Spezialmobiliar via Mobiliar-Shop des Bundes bestellen — angebunden an das Schwesterprojekt „Arbeitsplatz-Management".</p>
              <p class="card--quick__meta"><span>REQ-FA-007</span></p>
              ${arrowBtn()}
            </a>
            <a href="#/moves" class="card--quick">
              <p class="card--quick__title">Umzug & Sonderreinigung</p>
              <p class="card--quick__desc">Transport- oder Reinigungsanfrage erfassen — etwa nach grösseren Reorganisationen, Veranstaltungen oder Mieterwechseln.</p>
              <p class="card--quick__meta"><span>REQ-FA-006</span></p>
              ${arrowBtn()}
            </a>
            <a href="#/training" class="card--quick">
              <p class="card--quick__title">Schulungen</p>
              <p class="card--quick__desc">„Mieterportal kompakt" (60 Min., DE/FR) und Aufbaukurse für LBO und GS-Prüfende. Termine Q2 2026 zur Anmeldung offen.</p>
              <p class="card--quick__meta"><span>FUNC-LP-007</span></p>
              ${arrowBtn()}
            </a>
          </div>
        </div>
      </section>

      ${renderNewsSection()}
    `;
  }

  function greetingFor(hour) {
    if (hour < 11) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  }

  function arrowBtn(extraClass = 'card--quick__arrow-btn') {
    return `
      <span class="arrow-btn ${extraClass}" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </span>
    `;
  }

  function profileCard({ image, title, date, desc, role }) {
    return `
      <a href="#" class="card--profile" onclick="event.preventDefault(); window.t3lite.demoRole('${role}');">
        <div class="card--profile__image" style="background-image:url('${image}');"></div>
        <div class="card--profile__body">
          <p class="card--profile__date">${P.escapeHtml(date)}</p>
          <h3 class="card--profile__title">${P.escapeHtml(title)}</h3>
          <p class="card--profile__desc">${P.escapeHtml(desc)}</p>
        </div>
        ${arrowBtn('card--profile__arrow')}
      </a>
    `;
  }

  // ── 4. WIZARD ────────────────────────────────────────────────────────────
  const WIZARD_STEPS = ['Basis', 'Fläche / NAW', 'Anhänge', 'Detail (Grossantrag)', 'Prüfen & Senden'];

  function ensureDraft() {
    if (!P.state.draft) {
      const persisted = P.loadDraft();
      P.state.draft = persisted || {
        id: 'BE-2026-DRAFT-' + Math.floor(Math.random() * 900 + 100),
        type: 'Kleinantrag',
        ve: P.state.user.ve,
        dep: P.state.user.dep,
        address: '',
        sap: null,
        egid: null,
        pipelineVariant: 'standard',
        bk1086Ok: null,
        greenfield: false,
        nawAnswers: { focus: 'Kollaborativ', remoteShare: 30, confidentiality: 'mittel', publicContact: 'gelegentlich', specials: [] },
        nawClass: null,
        fte: 8,
        attachments: [],
        confirmCorrect: false,
        confirmIsg: false,
      };
    }
    return P.state.draft;
  }

  function renderWizard({ step }) {
    if (!P.state.user) { P.navigate('#/login'); return; }
    const stepNum = parseInt(step, 10) || 1;
    if (stepNum < 1 || stepNum > 5) { P.navigate('#/wizard/1'); return; }
    if (P.state.user.activeRole === 'GS-Reviewer') {
      P.toast('Bedarf anmelden steht nur in der Mieter-Rolle zur Verfügung. Bitte Rolle wechseln.');
      P.navigate('#/queue');
      return;
    }
    const main = shell({ activeNav: 'wizard', breadcrumb: [
      { href: '#/home', label: 'Start' },
      { href: '#/wizard/1', label: 'Bedarf anmelden' },
      { label: `Schritt ${stepNum}` }
    ]});
    const draft = ensureDraft();

    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container" style="max-width: 960px;">
          ${P.renderStepIndicator(stepNum, WIZARD_STEPS)}
          <div class="wizard" id="wizardBody">
            ${renderWizardStep(stepNum, draft)}
          </div>
        </div>
      </section>
    `;

    wireWizardStep(stepNum, draft);
  }

  function renderWizardStep(stepNum, draft) {
    switch (stepNum) {
      case 1: return renderStep1(draft);
      case 2: return renderStep2(draft);
      case 3: return renderStep3(draft);
      case 4: return renderStep4(draft);
      case 5: return renderStep5(draft);
    }
  }

  // -- Step 1 ----------------------------------------------------------------
  function renderStep1(draft) {
    return `
      <h2 class="wizard__title">Schritt 1 von 5 — Basisangaben</h2>
      <p class="wizard__subtitle">Antrags-ID: <strong>${draft.id}</strong> · Auto-Save aktiv</p>

      <div class="wizard__section">
        <h3>Antragstyp</h3>
        <div class="radio-group">
          <label><input type="radio" name="type" value="Grossantrag"  ${draft.type === 'Grossantrag'  ? 'checked' : ''}> Grossantrag</label>
          <label><input type="radio" name="type" value="Kleinantrag"  ${draft.type === 'Kleinantrag'  ? 'checked' : ''}> Kleinantrag</label>
          <label><input type="radio" name="type" value="Mobiliar"     ${draft.type === 'Mobiliar'     ? 'checked' : ''}> Mobiliar</label>
        </div>
        <p class="form-field__hint">Bei <strong>Grossantrag</strong> öffnet sich in Schritt 4 ein Detail-Formular (FUNC-AU-019, v0.5: 6 mandatory free-text + 4 strukturiert + 1 optional).</p>
      </div>

      <div class="wizard__section">
        <h3>Verwaltungseinheit & Kontakte</h3>
        <div class="form-field">
          <label class="form-field__label">Verwaltungseinheit (VE) <span class="form-field__required">*</span></label>
          <select class="form-field__select" name="ve">
            <option value="UVEK / BAFU">UVEK / BAFU</option>
            <option value="UVEK / BAV">UVEK / BAV</option>
            <option value="UVEK / SBB">UVEK / SBB</option>
            <option value="SEM">SEM</option>
            <option value="EDA">EDA (FDFA)</option>
            <option value="BK">Bundeskanzlei (BK)</option>
          </select>
        </div>
        <p class="form-field__hint">Zuständige BBL-Kontakte (FUNC-AU-001): <strong>H. Ludwig (PFM)</strong> · <strong>A. Wirz (IM)</strong> — automatisch ermittelt aus VE.</p>
      </div>

      <div class="wizard__section">
        <h3>Standort</h3>
        <div class="form-field">
          <label class="form-field__label">Adresse <span class="form-field__required">*</span></label>
          <input class="form-field__input" name="address" placeholder="z. B. Eichweg 22, 3003 Bern" value="${P.escapeHtml(draft.address)}" autocomplete="off" list="bldList">
          <datalist id="bldList">
            ${P.state.buildings.map(b => `<option value="${P.escapeHtml(b.address)}">${P.escapeHtml(b.name)}</option>`).join('')}
          </datalist>
        </div>
        <div id="sapInfo" style="margin-top: var(--space-sm);"></div>
      </div>

      <div class="wizard__sticky-footer">
        <span class="wizard__counter">Schritt 1 / 5</span>
        <button class="btn btn--outline" onclick="window.t3lite.saveDraft()">Entwurf speichern</button>
        <a class="btn btn--outline" href="#/home">Abbrechen</a>
        <button class="btn btn--filled" id="nextStep">Weiter → Fläche / NAW</button>
      </div>
    `;
  }

  function wireWizardStep(stepNum, draft) {
    const body = document.getElementById('wizardBody');
    if (!body) return;

    if (stepNum === 1) {
      body.querySelectorAll('input[name="type"]').forEach(el => {
        el.addEventListener('change', e => { draft.type = e.target.value; P.persistDraft(draft); });
      });
      body.querySelector('select[name="ve"]').addEventListener('change', e => {
        draft.ve = e.target.value;
        // BK detection (FUNC-FG-005)
        draft.pipelineVariant = e.target.value === 'BK' ? 'bypass' : 'standard';
        P.persistDraft(draft);
        if (draft.pipelineVariant === 'bypass') {
          P.toast('BK-Pfad erkannt: Antrag wird ohne GS-Schritt direkt an BBL-PFM geroutet (FUNC-FG-005).');
        }
      });
      const addr = body.querySelector('input[name="address"]');
      addr.addEventListener('input', e => {
        draft.address = e.target.value;
        updateSapInfo(draft);
        P.persistDraft(draft);
      });
      updateSapInfo(draft);
      body.querySelector('#nextStep').addEventListener('click', () => {
        if (!draft.address) { P.toast('Bitte Adresse eingeben'); return; }
        P.navigate('#/wizard/2');
      });
    }
    if (stepNum === 2) wireStep2(draft);
    if (stepNum === 3) wireStep3(draft);
    if (stepNum === 4) wireStep4(draft);
    if (stepNum === 5) wireStep5(draft);
  }

  function updateSapInfo(draft) {
    const info = document.getElementById('sapInfo');
    if (!info) return;
    const match = P.state.buildings.find(b => b.address && draft.address && b.address.toLowerCase() === draft.address.toLowerCase());
    if (!match) {
      if (draft.address && draft.address.length > 5) {
        // Greenfield path (FUNC-AU-013)
        draft.greenfield = true;
        draft.pipelineVariant = draft.pipelineVariant === 'bypass' ? 'bypass' : 'greenfield';
        draft.assetKey = null;
        draft.egid = null;
        info.innerHTML = `
          <div class="notification-banner notification-banner--warning">
            <div class="notification-banner__wrapper">
              <p class="notification-banner__text">
                <strong>◼ Greenfield erkannt:</strong> Adresse nicht im Bundes-Stammdatensatz.
                Sie können den Antrag trotzdem einreichen. BBL legt die WE im Anschluss an die Genehmigung an (FUNC-AU-013).
              </p>
            </div>
          </div>
        `;
      } else {
        info.innerHTML = '';
      }
      return;
    }
    draft.greenfield = false;
    draft.assetKey = { ...match.assetKey };
    draft.egid = match.egid;
    draft.pipelineVariant = draft.ve === 'BK' ? 'bypass' : 'standard';
    const bkOk = match.assetKey.bk === P.state.referenceData.companyCode;
    draft.bk1086Ok = bkOk;
    info.innerHTML = `
      <div class="notification-banner notification-banner--${bkOk ? 'success' : 'danger'}">
        <div class="notification-banner__wrapper">
          <p class="notification-banner__text">
            <strong>Erkannt:</strong>
            SAP <code>${formatAssetKey(match.assetKey)}</code> · EGID <code>${match.egid}</code>
            ${bkOk
              ? '<br><span style="font-size:var(--text-body-xs);">✓ BK 1086 = BBL-Portfolio — Antrag geht an BBL.</span>'
              : '<br><span style="font-size:var(--text-body-xs);">⚠ BK ≠ 1086 — Objekt gehört nicht zu BBL. Bitte zuständige Organisation kontaktieren.</span>'
            }
          </p>
        </div>
      </div>
    `;
  }

  // -- Step 2 (NAW + calc) ---------------------------------------------------
  function renderStep2(draft) {
    return `
      <h2 class="wizard__title">Schritt 2 von 5 — Flächenbedarf</h2>
      <p class="wizard__subtitle">Antragstyp: ${draft.type} · NAW-Klassifizierung treibt die m²/FTE-Basis.</p>

      <div class="wizard-two-col">
        <div class="wizard__section">
          <h3>NAW-Klassifizierung (Arbeitsstil)</h3>
          <div class="form-field">
            <label class="form-field__label">1. Schwerpunkt</label>
            <div class="radio-group">
              <label><input type="radio" name="focus" value="Kollaborativ" ${draft.nawAnswers.focus === 'Kollaborativ' ? 'checked' : ''}> Kollaborativ</label>
              <label><input type="radio" name="focus" value="Konzentriert" ${draft.nawAnswers.focus === 'Konzentriert' ? 'checked' : ''}> Konzentriert</label>
              <label><input type="radio" name="focus" value="Mix"          ${draft.nawAnswers.focus === 'Mix'          ? 'checked' : ''}> Mix</label>
            </div>
          </div>
          <div class="form-field">
            <label class="form-field__label">2. Anteil Remote-Arbeit</label>
            <select class="form-field__select" name="remoteShare">
              ${[0, 10, 20, 30, 40, 50, 60].map(v => `<option value="${v}" ${draft.nawAnswers.remoteShare == v ? 'selected' : ''}>${v} %</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label class="form-field__label">3. Vertraulichkeit der Arbeit</label>
            <div class="radio-group">
              <label><input type="radio" name="confidentiality" value="niedrig" ${draft.nawAnswers.confidentiality === 'niedrig' ? 'checked' : ''}> niedrig</label>
              <label><input type="radio" name="confidentiality" value="mittel"  ${draft.nawAnswers.confidentiality === 'mittel'  ? 'checked' : ''}> mittel</label>
              <label><input type="radio" name="confidentiality" value="hoch"    ${draft.nawAnswers.confidentiality === 'hoch'    ? 'checked' : ''}> hoch</label>
            </div>
          </div>
          <div class="form-field">
            <label class="form-field__label">4. Publikumsverkehr</label>
            <div class="radio-group">
              <label><input type="radio" name="publicContact" value="keiner"       ${draft.nawAnswers.publicContact === 'keiner'       ? 'checked' : ''}> keiner</label>
              <label><input type="radio" name="publicContact" value="gelegentlich" ${draft.nawAnswers.publicContact === 'gelegentlich' ? 'checked' : ''}> gelegentlich</label>
              <label><input type="radio" name="publicContact" value="regelmaessig" ${draft.nawAnswers.publicContact === 'regelmaessig' ? 'checked' : ''}> regelmässig</label>
            </div>
          </div>
          <div class="form-field">
            <label class="form-field__label">5. Spezialausstattung</label>
            <div class="checkbox-group">
              <label><input type="checkbox" name="specials" value="Labor"            ${draft.nawAnswers.specials.includes('Labor')            ? 'checked' : ''}> Labor</label>
              <label><input type="checkbox" name="specials" value="Werkstatt"        ${draft.nawAnswers.specials.includes('Werkstatt')        ? 'checked' : ''}> Werkstatt</label>
              <label><input type="checkbox" name="specials" value="Sicherheitsbereich" ${draft.nawAnswers.specials.includes('Sicherheitsbereich') ? 'checked' : ''}> Sicherheitsbereich</label>
            </div>
          </div>
          <div id="nawConfidence"></div>
        </div>

        <div class="wizard__section">
          <h3>Mengengerüst & Berechnung</h3>
          <div class="form-field">
            <label class="form-field__label">Anzahl FTE <span class="form-field__required">*</span></label>
            <input class="form-field__input" type="number" min="1" max="2000" name="fte" value="${draft.fte}">
          </div>
          <p class="form-field__hint">Belegungsfaktor (Desk-Sharing) <strong>0.8</strong> — Bundes-Stammdatenvorgabe (FUNC-AU-014).</p>
          <div id="calcBlock"></div>
        </div>
      </div>

      <div class="wizard__sticky-footer">
        <span class="wizard__counter">Schritt 2 / 5</span>
        <button class="btn btn--outline" onclick="window.t3lite.saveDraft()">Entwurf speichern</button>
        <a class="btn btn--outline" href="#/wizard/1">← Zurück</a>
        <button class="btn btn--filled" id="nextStep">Weiter → Anhänge</button>
      </div>
    `;
  }

  function wireStep2(draft) {
    const body = document.getElementById('wizardBody');
    const updateAll = () => {
      // Read NAW answers
      const focus = body.querySelector('input[name="focus"]:checked')?.value || draft.nawAnswers.focus;
      const remoteShare = Number(body.querySelector('select[name="remoteShare"]').value);
      const confidentiality = body.querySelector('input[name="confidentiality"]:checked')?.value || draft.nawAnswers.confidentiality;
      const publicContact = body.querySelector('input[name="publicContact"]:checked')?.value || draft.nawAnswers.publicContact;
      const specials = Array.from(body.querySelectorAll('input[name="specials"]:checked')).map(c => c.value);
      const fte = Number(body.querySelector('input[name="fte"]').value);
      draft.nawAnswers = { focus, remoteShare, confidentiality, publicContact, specials };
      draft.fte = fte;
      const naw = P.deriveNawClass(draft.nawAnswers);
      draft.nawClass = naw.name;
      draft.nawConfidence = naw.confidence;
      draft.nawAlternative = naw.alternative;
      P.persistDraft(draft);
      // Render confidence + calc
      const conf = Math.round(naw.confidence * 100);
      document.getElementById('nawConfidence').innerHTML = `
        <div class="naw-confidence">
          <div class="naw-confidence__line">
            <strong>Empfohlene NAW-Klasse:</strong>
            <span><strong>${naw.name}</strong></span>
          </div>
          <div class="naw-confidence__line">
            <span style="font-size:var(--text-body-xs);color:var(--color-text-secondary);">Konfidenz</span>
            <span style="font-size:var(--text-body-xs);color:var(--color-text-secondary);">${conf} %</span>
          </div>
          ${naw.alternative ? `
            <div class="naw-confidence__alt">
              Alternative: <em>${naw.alternative.name}</em> (${Math.round(naw.alternative.confidence * 100)} %)
            </div>
          ` : ''}
          ${conf < 70 ? `
            <div class="calc-block__guardrail-warn" style="margin-top:var(--space-sm);">
              Niedrige Konfidenz — bitte prüfen, ob die Klasse zutrifft.
            </div>
          ` : ''}
        </div>
      `;
      // Calculation
      const c = P.calcWizard({ nawClass: naw.name, fte });
      if (c) {
        document.getElementById('calcBlock').innerHTML = `
          <div class="calc-block">
            <dl>
              <dt>Arbeitsplätze (AP) = FTE × 0.8</dt>
              <dd>${fte} × 0.8 = ${(fte * 0.8).toFixed(1)} → <strong>${c.workstations} AP</strong></dd>
              <dt>HNF2 = ${c.nawHnf2} m²/FTE × FTE × 0.8</dt>
              <dd>${c.nawHnf2} × ${fte} × 0.8 = <strong>${c.hnf2} m²</strong></dd>
              <dt>GF = ${c.nawGf} m²/FTE × FTE × 0.8</dt>
              <dd>${c.nawGf} × ${fte} × 0.8 = <strong>${c.gf} m²</strong></dd>
              <hr>
              <dt>UK-Kosten (vorl., illustrativ)</dt>
              <dd>${P.formatChf(c.operatingCosts)}</dd>
              <dt>Möblierung CHF 650/m² HNF2</dt>
              <dd>${P.formatChf(c.furnitureBudget)}</dd>
            </dl>
            ${c.overBudget ? `
              <div class="${c.hardBlocked ? 'calc-block__guardrail-block' : 'calc-block__guardrail-warn'}">
                ${c.hardBlocked
                  ? `❌ Betriebskosten ${c.ukProM2Gf} CHF/m² GF überschreiten die Obergrenze (${c.betriebskostenProM2Gf} CHF + 20 %). Antrag wird in Schritt 5 blockiert.`
                  : `⚠ Hinweis: Betriebskosten ${c.ukProM2Gf} CHF/m² GF über Vorgabe (${c.betriebskostenProM2Gf} CHF, +${c.overBudgetPercent} %). Begründung in Schritt 5 empfohlen.`}
              </div>
            ` : ''}
          </div>
        `;
      }
    };
    body.querySelectorAll('input, select').forEach(el => el.addEventListener('change', updateAll));
    body.querySelector('input[name="fte"]').addEventListener('input', updateAll);
    body.querySelector('#nextStep').addEventListener('click', () => P.navigate('#/wizard/3'));
    updateAll();
  }

  // -- Step 3 Anhänge --------------------------------------------------------
  function renderStep3(draft) {
    return `
      <h2 class="wizard__title">Schritt 3 von 5 — Anhänge</h2>
      <p class="wizard__subtitle">Cost-Benefit-Beleg (WiBe) und Rechtsgrundlage-Beleg (FUNC-AU-006/-007).</p>

      <div class="wizard__section">
        <h3>Dateien hochladen</h3>
        <p class="form-field__hint">Erlaubt: PDF, DOCX, XLSX, JPG, PNG · max. 25 MB · max. 10 Dateien · jede Datei wird auf Schadsoftware geprüft (NFA-SEC-003).</p>
        <input type="file" id="filePicker" multiple style="margin: var(--space-md) 0;">
        <button class="btn btn--outline btn--sm" onclick="window.t3lite.fakeUpload()">Beispieldateien hochladen (Demo)</button>
        <ul class="attachment-list" id="attachmentList" style="margin-top: var(--space-md);">
          ${(draft.attachments || []).map((a, i) => attachmentLi(a, i)).join('')}
        </ul>
      </div>

      <div class="wizard__sticky-footer">
        <span class="wizard__counter">Schritt 3 / 5 · ${(draft.attachments || []).length} Dateien</span>
        <button class="btn btn--outline" onclick="window.t3lite.saveDraft()">Entwurf speichern</button>
        <a class="btn btn--outline" href="#/wizard/2">← Zurück</a>
        <button class="btn btn--filled" id="nextStep">Weiter → ${draft.type === 'Grossantrag' ? 'Detail' : 'Prüfen & Senden'}</button>
      </div>
    `;
  }

  function attachmentLi(a, i) {
    const badge = a.scanStatus === 'scanning'
      ? '<span class="badge badge--warning">Virenscan läuft</span>'
      : a.scanStatus === 'ok'
        ? '<span class="badge badge--success">ok</span>'
        : '<span class="badge badge--danger">abgewiesen</span>';
    return `<li>${P.icon('attachment')}${P.escapeHtml(a.name)} ${badge} <span class="meta">${P.escapeHtml(a.size)}</span></li>`;
  }

  function wireStep3(draft) {
    const body = document.getElementById('wizardBody');
    body.querySelector('#filePicker').addEventListener('change', e => {
      const files = Array.from(e.target.files || []);
      files.forEach(f => {
        const att = { name: f.name, size: (f.size / 1024).toFixed(0) + ' KB', scanStatus: 'scanning' };
        draft.attachments = draft.attachments || [];
        draft.attachments.push(att);
        setTimeout(() => {
          att.scanStatus = 'ok';
          P.persistDraft(draft);
          refreshAttachmentList(draft);
          P.toast('Virenscan ok: ' + att.name, 'success');
        }, 1500);
      });
      P.persistDraft(draft);
      refreshAttachmentList(draft);
    });
    body.querySelector('#nextStep').addEventListener('click', () => {
      const next = draft.type === 'Grossantrag' ? 4 : 5;
      P.navigate('#/wizard/' + next);
    });
  }

  function refreshAttachmentList(draft) {
    const ul = document.getElementById('attachmentList');
    if (ul) ul.innerHTML = (draft.attachments || []).map((a, i) => attachmentLi(a, i)).join('');
  }

  // -- Step 4 Grossantrag (v0.5 narrowed: 6 free-text + 4 structured + 1 optional) --
  function renderStep4(draft) {
    if (draft.type !== 'Grossantrag') {
      return `
        <h2 class="wizard__title">Schritt 4 von 5 — Detail-Felder</h2>
        <p class="wizard__subtitle">Entfällt für Antragstyp "${draft.type}". Sie können direkt zu Schritt 5 weiter.</p>
        <div class="wizard__sticky-footer">
          <span class="wizard__counter">Schritt 4 (übersprungen)</span>
          <a class="btn btn--outline" href="#/wizard/3">← Zurück</a>
          <button class="btn btn--filled" id="nextStep">Weiter → Prüfen & Senden</button>
        </div>
      `;
    }
    const f = draft.grossantrag = draft.grossantrag || { _eppmToggle: false };
    return `
      <h2 class="wizard__title">Schritt 4 von 5 — Grossantrag: Pflichtfelder (v0.5)</h2>
      <p class="wizard__subtitle">6 mandatory Freitext + 4 strukturierte + 1 optional (FUNC-AU-019 v0.5). <label style="font-size:var(--text-body-xs);"><input type="checkbox" id="eppmToggle" ${f._eppmToggle ? 'checked' : ''}> Erweiterte Ansicht (ePPM-Mapping)</label></p>

      <div class="wizard__section">
        <h3>Sektion A · Bedarf & Zielzustand</h3>
        <div class="form-field">
          <label class="form-field__label">4.1 Kurzbeschreibung <span class="form-field__required">*</span> <span class="eppm-tab" style="display:${f._eppmToggle ? 'inline' : 'none'};color:var(--color-text-muted);font-size:var(--text-body-xs);">→ ePPM "Antrag"</span></label>
          <textarea class="form-field__textarea" name="g_kurz" maxlength="500">${P.escapeHtml(f.kurz || '')}</textarea>
        </div>
        <div class="form-field">
          <label class="form-field__label">4.2 Defizite in der aktuellen Situation <span class="form-field__required">*</span> <span class="eppm-tab" style="display:${f._eppmToggle ? 'inline' : 'none'};color:var(--color-text-muted);font-size:var(--text-body-xs);">→ ePPM "Defizit"</span></label>
          <textarea class="form-field__textarea" name="g_defizit">${P.escapeHtml(f.defizit || '')}</textarea>
        </div>
        <div class="form-field">
          <label class="form-field__label">4.4 Zielzustand / Operative Ziele <span class="form-field__required">*</span> <span class="eppm-tab" style="display:${f._eppmToggle ? 'inline' : 'none'};color:var(--color-text-muted);font-size:var(--text-body-xs);">→ ePPM "Ziele/Soll"</span></label>
          <textarea class="form-field__textarea" name="g_ziel">${P.escapeHtml(f.ziel || '')}</textarea>
          <p class="form-field__hint">v0.5: zusammengefasst aus den vorigen Feldern „Operative Ziele" und „Zielzustand".</p>
        </div>
      </div>

      <div class="wizard__section">
        <h3>Sektion B · Recht, Alternativen, Planung</h3>
        <div class="form-field">
          <label class="form-field__label">4.3 Rechtsgrundlage <span class="form-field__required">*</span> <span class="eppm-tab" style="display:${f._eppmToggle ? 'inline' : 'none'};color:var(--color-text-muted);font-size:var(--text-body-xs);">→ ePPM "Recht"</span></label>
          <input class="form-field__input" type="text" name="g_recht" value="${P.escapeHtml(f.recht || '')}" placeholder="Verweis auf Upload aus Schritt 3 oder URL">
        </div>
        <div class="form-field">
          <label class="form-field__label">4.5 Geprüfte Alternativen <span class="form-field__required">*</span> <span class="eppm-tab" style="display:${f._eppmToggle ? 'inline' : 'none'};color:var(--color-text-muted);font-size:var(--text-body-xs);">→ ePPM "Alt"</span></label>
          <textarea class="form-field__textarea" name="g_alt">${P.escapeHtml(f.alt || '')}</textarea>
        </div>
        <div class="form-field">
          <label class="form-field__label">4.8 Planungsabhängigkeiten <span class="form-field__required">*</span> <span class="eppm-tab" style="display:${f._eppmToggle ? 'inline' : 'none'};color:var(--color-text-muted);font-size:var(--text-body-xs);">→ ePPM "Abhäng."</span></label>
          <textarea class="form-field__textarea" name="g_abh">${P.escapeHtml(f.abh || '')}</textarea>
        </div>
      </div>

      <div class="wizard__section">
        <h3>Sektion C · Termine, Kosten, FTE/AP (strukturiert)</h3>
        <div class="form-field">
          <label class="form-field__label">4.9 Terminplan <span class="form-field__required">*</span></label>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-sm);">
            <input class="form-field__input" type="date" name="g_termin_start" value="${f.terminStart || ''}">
            <input class="form-field__input" type="date" name="g_termin_milestone" value="${f.terminMilestone || ''}">
            <input class="form-field__input" type="date" name="g_termin_end" value="${f.terminEnd || ''}">
          </div>
          <p class="form-field__hint">Vorgeschlagene Termine basierend auf Investitionsvolumen (FUNC-AU-020): <button class="btn btn--bare btn--sm" type="button" onclick="window.t3lite.suggestDates()">Vorschlag übernehmen</button></p>
        </div>
        <div class="form-field">
          <label class="form-field__label">4.10 Kostenerwartung gesamt (CHF) <span class="form-field__required">*</span></label>
          <input class="form-field__input" type="number" name="g_kosten" value="${f.kosten || ''}" placeholder="z. B. 19200000">
        </div>
      </div>

      <div class="wizard__section">
        <h3>Sektion D · Nutzen-Kosten (optional, wenn WiBe vorhanden)</h3>
        <p class="form-field__hint">${draft.attachments && draft.attachments.some(a => /wibe/i.test(a.name)) ? '✓ WiBe.pdf erkannt — Feld optional.' : 'Keine WiBe-Datei hochgeladen → dieses Feld wird zur Pflicht.'}</p>
        <div class="form-field">
          <label class="form-field__label">4.6 Nutzen-Kosten-Begründung</label>
          <textarea class="form-field__textarea" name="g_nk">${P.escapeHtml(f.nk || '')}</textarea>
        </div>
      </div>

      <div class="wizard__sticky-footer">
        <span class="wizard__counter" id="grossCounter">0 / 7 Pflichtfelder ausgefüllt</span>
        <button class="btn btn--outline" onclick="window.t3lite.saveDraft()">Entwurf speichern</button>
        <a class="btn btn--outline" href="#/wizard/3">← Zurück</a>
        <button class="btn btn--filled" id="nextStep">Weiter → Prüfen & Senden</button>
      </div>
    `;
  }

  function wireStep4(draft) {
    const body = document.getElementById('wizardBody');
    if (!body) return;
    if (draft.type !== 'Grossantrag') {
      body.querySelector('#nextStep')?.addEventListener('click', () => P.navigate('#/wizard/5'));
      return;
    }
    const f = draft.grossantrag = draft.grossantrag || {};
    const toggle = body.querySelector('#eppmToggle');
    if (toggle) toggle.addEventListener('change', () => {
      f._eppmToggle = toggle.checked;
      P.persistDraft(draft);
      body.querySelectorAll('.eppm-tab').forEach(el => el.style.display = toggle.checked ? 'inline' : 'none');
    });
    const fieldMap = {
      g_kurz: 'kurz', g_defizit: 'defizit', g_ziel: 'ziel',
      g_recht: 'recht', g_alt: 'alt', g_abh: 'abh',
      g_termin_start: 'terminStart', g_termin_milestone: 'terminMilestone', g_termin_end: 'terminEnd',
      g_kosten: 'kosten', g_nk: 'nk',
    };
    Object.entries(fieldMap).forEach(([name, key]) => {
      const el = body.querySelector(`[name="${name}"]`);
      if (!el) return;
      el.addEventListener('input', () => { f[key] = el.value; P.persistDraft(draft); updateGrossCounter(draft); });
    });
    body.querySelector('#nextStep')?.addEventListener('click', () => P.navigate('#/wizard/5'));
    updateGrossCounter(draft);
  }

  function updateGrossCounter(draft) {
    const f = draft.grossantrag || {};
    const required = ['kurz', 'defizit', 'ziel', 'recht', 'alt', 'abh'];
    const structured = ['terminStart', 'kosten']; // simplified — terminStart represents the date block
    const filled = required.filter(k => f[k] && f[k].trim()).length
                 + structured.filter(k => f[k]).length;
    const counter = document.getElementById('grossCounter');
    if (counter) counter.textContent = `${filled} / ${required.length + structured.length} Pflichtfelder ausgefüllt`;
  }

  // -- Step 5 Prüfen & Senden ------------------------------------------------
  function renderStep5(draft) {
    const c = P.calcWizard({ nawClass: draft.nawClass, fte: draft.fte });
    const allRequired = !!(draft.address && draft.fte && draft.nawClass);
    const grossOk = draft.type !== 'Grossantrag' || (
      draft.grossantrag && draft.grossantrag.kurz && draft.grossantrag.defizit && draft.grossantrag.ziel
      && draft.grossantrag.recht && draft.grossantrag.alt && draft.grossantrag.abh
      && draft.grossantrag.terminStart && draft.grossantrag.kosten
    );
    const hasAtt = (draft.attachments || []).length > 0;
    return `
      <h2 class="wizard__title">Schritt 5 von 5 — Prüfen & Senden</h2>
      <p class="wizard__subtitle">Antrags-ID: <strong>${draft.id}</strong></p>

      <div class="wizard__section">
        <h3>Validierungs-Übersicht</h3>
        <ul style="margin:0;padding-left:var(--space-md);">
          <li>${allRequired ? '✓' : '⚠'} Pflichtfelder Basis & Fläche</li>
          <li>${hasAtt ? '✓' : '⚠'} Anhänge ${hasAtt ? `(${draft.attachments.length})` : 'fehlen'}</li>
          ${draft.type === 'Grossantrag' ? `<li>${grossOk ? '✓' : '⚠'} Grossantrag-Pflichtfelder</li>` : ''}
          ${c && c.overBudget ? `<li>${c.hardBlocked ? '❌' : '⚠'} Betriebskosten ${c.ukProM2Gf} CHF/m² GF ${c.hardBlocked ? '> +20 % — Einreichung blockiert' : `+${c.overBudgetPercent} % über Vorgabe — Begründung empfohlen`}</li>` : ''}
        </ul>
      </div>

      <div class="accordion">
        ${section('Schritt 1 — Basisangaben', `${draft.type} · ${draft.ve} · ${P.escapeHtml(draft.address)} ${draft.assetKey ? `· SAP ${draft.assetKey.bk}/${draft.assetKey.we}/${draft.assetKey.obj}` : draft.greenfield ? '· ◼ Greenfield' : ''} ${draft.egid ? `· EGID ${draft.egid}` : ''}`, true)}
        ${section('Schritt 2 — Flächenbedarf', c ? `NAW: ${draft.nawClass} · FTE ${c.fte} · HNF2 ${c.hnf2} m² · GF ${c.gf} m² · UK ${P.formatChf(c.operatingCosts)}` : 'noch unvollständig', false)}
        ${section('Schritt 3 — Anhänge', (draft.attachments || []).map(a => a.name).join(' · ') || 'keine', false)}
        ${draft.type === 'Grossantrag' ? section('Schritt 4 — Detail-Felder', grossOk ? 'vollständig ausgefüllt' : 'unvollständig', false) : ''}
      </div>

      <div class="wizard__section">
        <h3>Workflow-Vorschau</h3>
        <p style="margin:0;font-size:var(--text-body-sm);">
          Nach dem Senden geht der Antrag an
          ${draft.pipelineVariant === 'bypass' ? '<strong>BBL Portfolio-Management</strong> (BK-Pfad — kein GS, FUNC-FG-005)' : '<strong>GS UVEK</strong>'}
          (Bearbeitungszeit gemäss SLA). Sie erhalten eine E-Mail und sehen den Status in der Inbox (FUNC-FG-004).
        </p>
        ${draft.greenfield ? '<p style="margin:var(--space-sm) 0 0;font-size:var(--text-body-xs);color:var(--color-text-secondary);">Greenfield-Pfad: nach Genehmigung legt BBL-IM die WE im SAP an, danach ePPM-Übergabe.</p>' : ''}
      </div>

      <div class="wizard__section">
        <h3>Datenschutz & Klassifizierung</h3>
        <label style="display:block;margin-bottom:var(--space-sm);"><input type="checkbox" id="confirmCorrect" ${draft.confirmCorrect ? 'checked' : ''}> Ich bestätige, dass die Angaben korrekt und vollständig sind.</label>
        <label style="display:block;"><input type="checkbox" id="confirmIsg" ${draft.confirmIsg ? 'checked' : ''}> Ich kenne die ISG-Klassifizierung „INTERN" und werde keine sensiblen personenbezogenen Daten in Freitextfeldern eintragen.</label>
      </div>

      <div class="wizard__sticky-footer">
        <span class="wizard__counter">Schritt 5 / 5</span>
        <button class="btn btn--outline" onclick="window.t3lite.saveDraft()">Entwurf speichern</button>
        <a class="btn btn--outline" href="#/wizard/${draft.type === 'Grossantrag' ? '4' : '3'}">← Zurück</a>
        <button class="btn btn--filled" id="submitBtn" ${(!allRequired || !hasAtt || (c && c.hardBlocked) || (draft.type === 'Grossantrag' && !grossOk)) ? 'disabled' : ''}>Einreichen →</button>
      </div>
    `;
  }

  function section(title, summary, open) {
    return `
      <div class="accordion__item ${open ? 'accordion__item--open' : ''}">
        <button class="accordion__trigger" type="button" onclick="this.parentElement.classList.toggle('accordion__item--open')">
          <span>${title}</span>
          <span class="accordion__icon"></span>
        </button>
        <div class="accordion__panel">${P.escapeHtml(summary)}</div>
      </div>
    `;
  }

  function wireStep5(draft) {
    const body = document.getElementById('wizardBody');
    body.querySelector('#confirmCorrect')?.addEventListener('change', e => { draft.confirmCorrect = e.target.checked; P.persistDraft(draft); });
    body.querySelector('#confirmIsg')?.addEventListener('change', e => { draft.confirmIsg = e.target.checked; P.persistDraft(draft); });
    body.querySelector('#submitBtn')?.addEventListener('click', () => {
      if (!draft.confirmCorrect || !draft.confirmIsg) {
        P.toast('Bitte beide Bestätigungen ankreuzen.');
        return;
      }
      submitDraft(draft);
    });
  }

  function submitDraft(draft) {
    // Promote draft to a submitted application (in-memory).
    // Schema-canonical fields per docs/DATAMODEL.md §4.1. The `id` and
    // `address` aliases mirror what loadData() injects so render code
    // doesn't have to distinguish freshly-submitted from loaded records.
    const applicationId = 'BE-2026-' + String(Math.floor(Math.random() * 900 + 100));
    const c = P.calcWizard({ nawClass: draft.nawClass, fte: draft.fte });
    // Pull atomic address fields from the matched Building when one exists;
    // greenfield drafts keep the free-text only.
    const match = P.state.buildings.find(b => b.address && draft.address && b.address.toLowerCase() === draft.address.toLowerCase());
    const ts = new Date().toISOString();
    const newApp = {
      applicationId, applicationType: draft.type, pipelineVariant: draft.pipelineVariant,
      status: 'submitted',
      submitterId: P.state.user.id, submitterVe: draft.ve, submitterDep: P.state.user.dep,
      buildingId: match ? match.buildingId : null,
      submittedAt: ts,
      street: match ? match.street : '', houseNumber: match ? match.houseNumber : '',
      postalCode: match ? match.postalCode : '', city: match ? match.city : '', country: 'CH',
      assetKey: draft.assetKey, egid: draft.egid,
      naw: { class: draft.nawClass, confidence: draft.nawConfidence, answers: draft.nawAnswers },
      fte: draft.fte,
      workstations: c ? c.workstations : null,
      hnf2: c ? c.hnf2 : null, gf: c ? c.gf : null,
      operatingCosts: c ? c.operatingCosts : null, furnitureBudget: c ? c.furnitureBudget : null,
      attachments: draft.attachments || [],
      history: [
        { ts, actor: P.state.user.name, eventType: 'ApplicationAdded',     action: 'Antrag erstellt' },
        { ts, actor: P.state.user.name, eventType: 'ApplicationSubmitted', action: 'Eingereicht' }
      ],
      _isNew: true,
      // Aliases mirroring loadData() normalisation
      id: applicationId,
      type: draft.type,
      address: draft.address,
    };
    P.state.applications.unshift(newApp);
    P.clearDraft();
    P.state.draft = null;
    P.toast(`Antrag ${applicationId} eingereicht. ${draft.pipelineVariant === 'bypass' ? 'Routet an BBL-PFM (BK-Bypass).' : 'Routet an GS.'}`, 'success');
    P.navigate('#/inbox/' + applicationId);
  }

  // ── 5. SUBMITTER INBOX ───────────────────────────────────────────────────
  function renderInbox() {
    if (!P.state.user) { P.navigate('#/'); return; }
    const main = shell({ activeNav: 'inbox', breadcrumb: [{ href: '#/home', label: 'Start' }, { label: 'Meine Anträge' }] });
    const role = P.state.user.activeRole;
    const apps = role === 'GS-Reviewer'
      ? P.state.applications.filter(a => a.submitterVe === P.state.user.ve)
      : P.state.applications.filter(a => a.submitterId === P.state.user.id);

    const filter = (location.hash.split('?')[1] || '').split('&').reduce((o, p) => {
      const [k, v] = p.split('='); if (k) o[k] = decodeURIComponent(v || ''); return o;
    }, {});

    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container">
          <h1 style="margin-top:0;">${role === 'GS-Reviewer' ? 'Anträge der VE' : 'Meine Anträge'}</h1>
          <div style="display:flex;gap:var(--space-md);margin-bottom:var(--space-md);flex-wrap:wrap;">
            <select id="filterStatus" class="form-field__select" style="min-height:auto;">
              <option value="">Alle Status</option>
              <option value="draft">Entwurf</option>
              <option value="submitted">Eingereicht</option>
              <option value="in_review_gs">in GS-Prüfung</option>
              <option value="in_review_pfm">in PFM-Prüfung</option>
              <option value="clarification">Rückfrage</option>
              <option value="in_project">in ePPM</option>
              <option value="closed">Abgeschlossen</option>
            </select>
            <input id="filterText" type="search" class="form-field__input" placeholder="Suche …" style="flex:1;min-width:200px;min-height:auto;">
          </div>

          ${apps.length === 0 ? renderInboxEmptyState() : `
            <table class="table" aria-label="Anträge">
              <thead>
                <tr>
                  <th>Antrag</th><th>Objekt</th><th>Typ</th><th>Eingereicht</th><th>Status</th>
                </tr>
              </thead>
              <tbody id="inboxTbody">
                ${apps.map(rowHtml).join('')}
              </tbody>
            </table>
            <p style="font-size:var(--text-body-xs);color:var(--color-text-muted);margin-top:var(--space-md);">Klicken Sie eine Zeile, um Details zu öffnen.</p>
          `}
        </div>
      </section>
    `;
    wireInboxFilters(apps);
  }

  function renderInboxEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state__glyph" aria-hidden="true">📭</div>
        <h2 class="empty-state__title">Noch keine Anträge</h2>
        <p class="empty-state__lead">Sie haben derzeit keine Anträge in Bearbeitung. Beginnen Sie mit einer Bedarfsanmeldung, um Bürofläche, Übernachtungsplätze oder eine Auslandvertretung zu beantragen.</p>
        <div class="empty-state__cta">
          <a href="#/wizard/1" class="btn btn--filled">+ Bedarf anmelden</a>
          <a href="#/help" class="btn btn--bare">Wie funktioniert das Portal? ↗</a>
        </div>
      </div>
    `;
  }

  function rowHtml(a) {
    return `
      <tr data-app-id="${a.id}" onclick="location.hash='#/inbox/${a.id}';">
        <td><strong>${a.id}</strong></td>
        <td>${P.escapeHtml(a.address)}</td>
        <td>${a.type}</td>
        <td>${P.formatDate(a.submittedAt)}</td>
        <td>${P.statusBadge(a.status)}</td>
      </tr>
    `;
  }

  function wireInboxFilters(apps) {
    const filterStatus = document.getElementById('filterStatus');
    const filterText = document.getElementById('filterText');
    const apply = () => {
      const s = filterStatus.value;
      const t = filterText.value.toLowerCase();
      const filtered = apps.filter(a =>
        (!s || a.status === s) &&
        (!t || a.id.toLowerCase().includes(t) || (a.address || '').toLowerCase().includes(t))
      );
      document.getElementById('inboxTbody').innerHTML = filtered.map(rowHtml).join('') || `<tr><td colspan="5" style="text-align:center;padding:var(--space-xl);color:var(--color-text-muted);">Keine Treffer.</td></tr>`;
    };
    filterStatus.addEventListener('change', apply);
    filterText.addEventListener('input', apply);
  }

  // ── 6. APPLICATION DETAIL (submitter view) ───────────────────────────────
  function renderApplicationDetail({ id }) {
    if (!P.state.user) { P.navigate('#/'); return; }
    const a = P.state.applications.find(x => x.id === id);
    if (!a) { document.getElementById('page-body').innerHTML = '<div class="container section"><p>Antrag nicht gefunden.</p></div>'; return; }
    const main = shell({ activeNav: 'inbox', breadcrumb: [{ href: '#/home', label: 'Start' }, { href: '#/inbox', label: 'Meine Anträge' }, { label: a.id }] });
    const tab = (location.hash.split('?tab=')[1] || 'daten');

    document.getElementById('page-body').innerHTML = `
      ${P.renderShareBar()}
      <section class="section">
        <div class="container">
          ${a._isNew ? `
            <div class="notification-banner notification-banner--success" role="status" style="margin-bottom: var(--space-lg);">
              <div class="notification-banner__wrapper">
                <p class="notification-banner__text">
                  <strong>Ihr Antrag ${a.id} wurde erfolgreich eingereicht.</strong>
                  Sie erhalten in Kürze eine E-Mail-Bestätigung. Status: <em>${({ eingereicht: 'Eingereicht', in_gs_pruefung: 'in GS-Prüfung', in_pfm_pruefung: 'in PFM-Prüfung' })[a.status] || a.status}</em>.
                </p>
              </div>
            </div>
          ` : ''}
          <div style="display:flex;justify-content:space-between;align-items:start;gap:var(--space-md);flex-wrap:wrap;">
            <div>
              <h1 style="margin:0 0 var(--space-xs);">${a.id} <span style="font-weight:normal;font-size:var(--text-body);color:var(--color-text-secondary);">— ${P.escapeHtml(a.address)}</span></h1>
              <p style="margin:0;color:var(--color-text-secondary);">Eingereicht ${P.formatDate(a.submittedAt)} · Typ ${a.type}</p>
            </div>
            <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;">
              ${a.status === 'clarification' ? '<button class="btn btn--filled btn--sm" onclick="window.t3lite.startResubmit(\''+a.id+'\')">Auflagen erfüllen → Erneut einreichen</button>' : ''}
            </div>
          </div>

          ${P.renderPipeline(a)}

          <nav class="tabs" role="tablist" aria-label="Antrags-Tabs">
            ${tabBtn('daten', 'Daten', tab)}
            ${tabBtn('anhaenge', 'Anhänge', tab)}
            ${tabBtn('historie', 'Historie', tab)}
            ${tabBtn('sap', 'SAP / ePPM', tab)}
          </nav>

          <div id="detailTab">${renderDetailTab(a, tab)}</div>
        </div>
      </section>
    `;
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('tab--active'));
      t.classList.add('tab--active');
      const k = t.getAttribute('data-tab');
      document.getElementById('detailTab').innerHTML = renderDetailTab(a, k);
    }));
    // Clear "fresh submission" flag after first paint so reload doesn't re-show banner.
    if (a._isNew) setTimeout(() => { delete a._isNew; }, 500);
  }

  function tabBtn(key, label, active) {
    return `<button class="tab ${active === key ? 'tab--active' : ''}" data-tab="${key}">${label}</button>`;
  }

  function renderDetailTab(a, tab) {
    if (tab === 'anhaenge') {
      return `<ul class="attachment-list">${(a.attachments || []).map((x, i) => attachmentLi(x, i)).join('') || '<li>Keine Anhänge.</li>'}</ul>`;
    }
    if (tab === 'historie') {
      return `<ol class="history-list">${(a.history || []).map(h => `
        <li>
          <time>${new Date(h.ts).toLocaleString('de-CH')}</time>
          <span><strong>${P.escapeHtml(h.actor)}</strong></span>
          <span>${P.escapeHtml(h.action)}</span>
        </li>
      `).join('')}</ol>`;
    }
    if (tab === 'sap') {
      return `
        <div class="card">
          <h3 class="card__title">SAP RE-FX Integration</h3>
          ${a.assetKey ? `
            <p>Objekt-Schlüssel: <code>${a.assetKey.bk}/${a.assetKey.we}/${a.assetKey.obj}</code></p>
            <p>EGID: <code>${a.egid}</code></p>
          ` : '<p>◼ Greenfield — WE/Obj noch nicht vergeben.</p>'}
          ${a.projectNumber ? `<p>Bedarfsmeldung: <strong>${a.projectNumber}</strong></p>` : ''}
          <p style="font-size:var(--text-body-xs);color:var(--color-text-muted);">Korrelations-ID: <code>MP-${(a.id || '').slice(-4)}-Z3K9-F2M8-XQ${(Math.random() * 100 | 0)}</code></p>
        </div>
      `;
    }
    // Default: Daten
    return `
      <div class="card-grid">
        <div class="card">
          <h3 class="card__title">Antragsteller</h3>
          <p style="margin:0;">${P.escapeHtml(P.state.users.find(u => u.id === a.submitterId)?.name || a.submitterId)}<br><span style="color:var(--color-text-secondary);font-size:var(--text-body-sm);">${a.submitterVe}${a.submitterDep ? ' · ' + a.submitterDep : ''}</span></p>
        </div>
        <div class="card">
          <h3 class="card__title">Standort</h3>
          <p style="margin:0;">${P.escapeHtml(a.address)}<br>${a.assetKey ? `<code>${a.assetKey.bk}/${a.assetKey.we}/${a.assetKey.obj}</code> · EGID <code>${a.egid}</code>` : '◼ Greenfield'}</p>
        </div>
        ${a.naw ? `
          <div class="card">
            <h3 class="card__title">Flächenbedarf</h3>
            <p style="margin:0;">NAW: <strong>${a.naw.class}</strong><br>FTE ${a.fte} · AP ${a.workstations} · HNF2 ${a.hnf2} m² · GF ${a.gf} m²<br>UK ${P.formatChf(a.operatingCosts)} · Möblierung ${P.formatChf(a.furnitureBudget)}</p>
          </div>
        ` : a.extensionData?.berths ? `
          <div class="card">
            <h3 class="card__title">SEM-Variante</h3>
            <p style="margin:0;">Schlafplätze: <strong>${a.extensionData.berths}</strong> (Familie ${a.extensionData.berthsFamily} · Einzel ${a.extensionData.berthsSingle} · Mehrbett ${a.extensionData.berthsShared})<br>Investitionspauschale ${P.formatChf(a.extensionData.investmentLumpSum)}</p>
          </div>
        ` : ''}
        ${a.status === 'clarification' && a.conditions ? `
          <div class="card" style="grid-column: 1 / -1;border-left: 4px solid var(--color-warning);">
            <h3 class="card__title">↻ Rückfrage / Offene Auflagen</h3>
            <p style="margin:0 0 var(--space-sm);font-size:var(--text-body-sm);"><strong>Begründung GS:</strong> ${P.escapeHtml(a.reviewerJustification)}</p>
            <ul class="auflagen-list">
              ${a.conditions.map((x, i) => `
                <li class="${x.done ? 'done' : ''}">
                  <input type="checkbox" ${x.done ? 'checked' : ''} onclick="window.t3lite.toggleAuflage('${a.id}', ${i})">
                  <span>${P.escapeHtml(x.comment)}</span>
                  <span class="badge">${P.escapeHtml(x.field)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ── 7. REVIEWER QUEUE (when activeRole = GS-Prüfer/in) ───────────────────
  function renderQueue() {
    if (!P.state.user) { P.navigate('#/'); return; }
    const main = shell({ activeNav: 'queue', breadcrumb: [{ label: 'Pendenzen' }], deptSub: 'Mieterportal · GS-Prüfer/in' });
    const queue = P.state.applications.filter(a => {
      // Reviewers see all VE applications that are awaiting review
      return ['submitted', 'in_review_gs', 'clarification'].includes(a.status)
          && a.pipelineVariant !== 'bypass';
    });

    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container">
          <h1 style="margin-top:0;">Ihre Pendenzen <span style="color:var(--color-text-secondary);font-weight:normal;">(${queue.length})</span></h1>
          <table class="table" aria-label="Pendenzen">
            <thead>
              <tr>
                <th><input type="checkbox" id="selectAll" aria-label="Alle auswählen"></th>
                <th>Antrag</th><th>Antragsteller</th><th>Objekt</th><th>Eingereicht</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${queue.map(a => `
                <tr data-app-id="${a.id}">
                  <td onclick="event.stopPropagation();"><input type="checkbox" class="rowSel" value="${a.id}"></td>
                  <td onclick="location.hash='#/review/${a.id}';"><strong>${a.id}</strong></td>
                  <td onclick="location.hash='#/review/${a.id}';">${P.escapeHtml(P.state.users.find(u => u.id === a.submitterId)?.name || '')} (${a.submitterVe})</td>
                  <td onclick="location.hash='#/review/${a.id}';">${P.escapeHtml(a.address)}</td>
                  <td onclick="location.hash='#/review/${a.id}';">${P.formatDate(a.submittedAt)}</td>
                  <td onclick="location.hash='#/review/${a.id}';">${P.statusBadge(a.status)}</td>
                </tr>
              `).join('') || `<tr><td colspan="6" style="text-align:center;padding:var(--space-xl);color:var(--color-text-muted);">Keine offenen Pendenzen.</td></tr>`}
            </tbody>
          </table>

          <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-md);flex-wrap:wrap;">
            <button class="btn btn--outline btn--sm" onclick="window.t3lite.openBatchApprove()">Bulk genehmigen</button>
            <button class="btn btn--bare btn--sm">Bulk: Zuweisen</button>
            <button class="btn btn--bare btn--sm">Bulk: Mehr Info anfragen</button>
          </div>

          <div class="queue-stats" id="queueStats">
            <button class="queue-stats__toggle" onclick="document.getElementById('queueStats').classList.toggle('queue-stats--open');">
              <span>▸ Statistiken Ihres GS (Klick zum Aufklappen)</span>
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
    wireQueueShortcuts();
  }

  function wireQueueShortcuts() {
    const rows = Array.from(document.querySelectorAll('tbody tr[data-app-id]'));
    let idx = -1;
    const focus = (i) => {
      if (rows[idx]) rows[idx].style.outline = '';
      idx = Math.max(0, Math.min(rows.length - 1, i));
      const r = rows[idx];
      if (r) { r.style.outline = '3px solid var(--color-focus)'; r.scrollIntoView({ block: 'nearest' }); }
    };
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); focus(idx + 1); }
      if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); focus(idx - 1); }
      if ((e.key === 'Enter' || e.key === 'o') && rows[idx]) { e.preventDefault(); location.hash = '#/review/' + rows[idx].getAttribute('data-app-id'); }
      if (e.key === 'x' && rows[idx]) { const cb = rows[idx].querySelector('.rowSel'); if (cb) cb.checked = !cb.checked; }
    });
  }

  // ── 8. REVIEWER SPLIT-PANE (§9.1 / §2.5) ─────────────────────────────────
  function renderReviewerSplit({ id }) {
    if (!P.state.user) { P.navigate('#/'); return; }
    const a = P.state.applications.find(x => x.id === id);
    if (!a) { document.getElementById('page-body').innerHTML = '<div class="container section"><p>Antrag nicht gefunden.</p></div>'; return; }
    const main = shell({ activeNav: 'queue', breadcrumb: [{ href: '#/queue', label: 'Pendenzen' }, { label: a.id }], deptSub: 'Mieterportal · GS-Prüfer/in' });

    const initialMarks = a._marks || {};

    document.getElementById('page-body').innerHTML = `
      ${P.renderShareBar()}
      <section class="section">
        <div class="container">
          <h1 style="margin-top:0;">${a.id} — Prüfung <span style="font-weight:normal;color:var(--color-text-secondary);font-size:var(--text-body);">${P.escapeHtml(P.state.users.find(u => u.id === a.submitterId)?.name || '')} (${a.submitterVe}) · ${P.escapeHtml(a.address)}</span></h1>
          ${P.renderPipeline(a)}

          <div class="reviewer-split">
            <div>
              <div class="card">
                <h3 class="card__title">Formular (schreibgeschützt)</h3>
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

            <aside class="reviewer-marks" aria-label="Prüfung">
              <h3 style="margin-top:0;">Prüfung pro Feld (FUNC-FG-001)</h3>
              ${['type', 've', 'address', 'naw', 'fte', 'hnf2', 'ukKosten', 'attachments'].map(field => `
                <div class="reviewer-marks__row">
                  <span>${fieldLabel(field)}</span>
                  <div class="mark-buttons" data-field="${field}">
                    ${['ok', 'nok', 'comment'].map(m => `
                      <button class="mark-button ${initialMarks[field] === m ? 'mark-button--active-' + m : ''}" data-mark="${m}">${m === 'ok' ? '✓ OK' : m === 'nok' ? '✕ NoK' : '💬 OK mit Komm.'}</button>
                    `).join('')}
                  </div>
                </div>
              `).join('')}

              <hr style="margin: var(--space-md) 0; border:none;border-top:1px solid var(--color-border);">
              <div class="form-field">
                <label class="form-field__label">Gesamtentscheid</label>
                <div class="radio-group">
                  <label><input type="radio" name="decision" value="genehmigen"> Genehmigen</label>
                  <label><input type="radio" name="decision" value="auflage"> Mit Auflagen</label>
                  <label><input type="radio" name="decision" value="ablehnen"> Ablehnen</label>
                </div>
              </div>
              <div class="form-field">
                <label class="form-field__label">Begründung <span class="form-field__required">*</span> <span class="form-field__hint" style="font-weight:normal;">(VwVG Art. 35 — verpflichtend)</span></label>
                <textarea class="form-field__textarea" id="reviewBegr"></textarea>
              </div>

              <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-md);">
                <button class="btn btn--filled btn--sm" id="saveDecision">Entscheid speichern</button>
                <button class="btn btn--outline btn--sm">An Antragsteller zurück</button>
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
          });
        });
      });
    });
    document.getElementById('saveDecision').addEventListener('click', () => {
      const dec = document.querySelector('input[name="decision"]:checked')?.value;
      const begr = document.getElementById('reviewBegr').value.trim();
      if (!dec) { P.toast('Bitte Gesamtentscheid wählen.'); return; }
      if (!begr) { P.toast('Bitte Begründung eintragen (Pflicht).'); return; }
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
  function renderProperties() {
    if (!P.state.user) { P.navigate('#/'); return; }
    shell({ activeNav: 'properties', breadcrumb: [{ href: '#/home', label: 'Start' }, { label: 'Liegenschaften' }] });
    const ve = P.state.user.ve;
    const isBblView = ['BBL-PFM', 'BBL-Campus', 'Auditor'].includes(P.state.user.activeRole);
    const allTenancies = isBblView
      ? P.state.tenancies
      : P.state.tenancies.filter(t => t.ve === ve || t.dep === ve);

    // URL state: ?view=gallery|list|map · ?q=… · ?page=N (1-based)
    const params = parseHashQuery(location.hash);
    const view = ['gallery','list','map'].includes(params.view) ? params.view : 'gallery';
    const query = (params.q || '').toLowerCase().trim();
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);

    const filtered = filterTenancies(allTenancies, query);
    const perPage = view === 'gallery' ? 12 : view === 'list' ? 25 : Infinity;
    const totalPages = view === 'map' ? 1 : Math.max(1, Math.ceil(filtered.length / perPage));
    const safePage = Math.min(page, totalPages);
    const pageItems = view === 'map' ? filtered : filtered.slice((safePage - 1) * perPage, safePage * perPage);

    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container">
          <h1 class="h1 section-heading">Liegenschaften ${isBblView ? '(BBL-Sicht)' : 'Ihrer Verwaltungs­einheit'}</h1>
          <p style="color:var(--color-text-secondary);max-width: 60ch;margin: 0 0 var(--space-lg);">
            ${isBblView
              ? 'Sie sehen alle vom BBL verwalteten Mietverhältnisse weltweit. Filtern Sie nach Name, Adresse, SAP-WE oder EGID — wählen Sie Galerie / Liste / Karte je nach Aufgabe.'
              : `Mietverhältnisse Ihrer Verwaltungs­einheit <strong>${P.escapeHtml(ve)}</strong> bei der BBL. Pro Objekt sehen Sie Ansprech­personen, Vertragsdaten und offene Anliegen.`
            }
          </p>

          ${allTenancies.length === 0 ? `
            <div class="empty-state">
              <h2 class="empty-state__title">Keine Mietverhältnisse erfasst</h2>
              <p class="empty-state__lead">Für Ihre Verwaltungs­einheit ist im BBL-Portfolio derzeit kein Mietverhältnis hinterlegt. Wenn das ein Fehler ist, kontaktieren Sie BBL-PFM.</p>
              <div class="empty-state__cta">
                <a href="#/wizard/1" class="btn btn--filled">+ Bedarf anmelden</a>
                <a href="https://www.bbl.admin.ch/de/kontakt" target="_blank" class="btn btn--bare">Kontakt BBL ↗</a>
              </div>
            </div>
          ` : `
            ${propertiesToolbar({ view, query, count: filtered.length, total: allTenancies.length })}

            ${filtered.length === 0 ? `
              <div class="empty-state" style="margin-top: var(--space-xl);">
                <h2 class="empty-state__title">Keine Treffer für „${P.escapeHtml(query)}"</h2>
                <p class="empty-state__lead">Versuchen Sie es mit einem anderen Suchbegriff.</p>
                <div class="empty-state__cta">
                  <a href="#/properties?view=${view}" class="btn btn--outline">Filter zurücksetzen</a>
                </div>
              </div>
            ` : `
              <div class="property-view property-view--${view}">
                ${view === 'gallery' ? renderGalleryView(pageItems) : ''}
                ${view === 'list'    ? renderListView(pageItems)    : ''}
                ${view === 'map'     ? renderMapView(filtered)      : ''}
              </div>

              ${view !== 'map' ? renderPagination(safePage, totalPages, view, query) : ''}
            `}
          `}
        </div>
      </section>
    `;

    if (view === 'map') initPropertiesMap(filtered);
    wirePropertiesToolbar(view);
  }

  // Parse `?key=value&key2=value2` out of a hash like `#/properties?view=list&q=eich&page=2`.
  function parseHashQuery(hash) {
    const qIdx = hash.indexOf('?');
    if (qIdx < 0) return {};
    const out = {};
    hash.slice(qIdx + 1).split('&').forEach(pair => {
      if (!pair) return;
      const [k, v = ''] = pair.split('=');
      out[decodeURIComponent(k)] = decodeURIComponent(v);
    });
    return out;
  }
  function buildPropertiesHash({ view, q, page }) {
    const parts = [];
    if (view) parts.push('view=' + encodeURIComponent(view));
    if (q)    parts.push('q='    + encodeURIComponent(q));
    if (page && page > 1) parts.push('page=' + page);
    return '#/properties' + (parts.length ? '?' + parts.join('&') : '');
  }

  function filterTenancies(list, q) {
    if (!q) return list;
    return list.filter(t => {
      const hay = [t.buildingName, t.address, formatAssetKey(t.assetKey), t.egid, t.ve, t.dep, t.portfolioCategory]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  function propertiesToolbar({ view, query, count, total }) {
    const tab = (id, label, iconName) => `
      <button class="view-toggle__btn ${view === id ? 'view-toggle__btn--active' : ''}"
              type="button" data-view="${id}"
              aria-pressed="${view === id}" aria-label="${label}">
        ${P.icon(iconName)}<span class="view-toggle__label">${label}</span>
      </button>`;
    const countLabel = count === total
      ? `${total} Liegenschaft${total === 1 ? '' : 'en'}`
      : `${count} von ${total} Liegenschaften`;
    return `
      <div class="property-toolbar">
        <div class="property-toolbar__search">
          ${P.icon('search')}
          <input type="search" id="propertiesSearch" class="input property-toolbar__input"
                 placeholder="Suche Objekt, Adresse, SAP-WE, EGID, VE …"
                 value="${P.escapeHtml(query)}" autocomplete="off">
          ${query ? `<button type="button" class="property-toolbar__clear" aria-label="Suche löschen" data-action="clear-search">${P.icon('x')}</button>` : ''}
        </div>
        <div class="view-toggle" role="group" aria-label="Ansicht wechseln">
          ${tab('gallery', 'Galerie', 'grid')}
          ${tab('list',    'Liste',   'list')}
          ${tab('map',     'Karte',   'map')}
        </div>
        <div class="property-toolbar__count" aria-live="polite">${countLabel}</div>
      </div>
    `;
  }

  function wirePropertiesToolbar(view) {
    const input = document.getElementById('propertiesSearch');
    if (input) {
      let t = null;
      input.addEventListener('input', e => {
        clearTimeout(t);
        const value = e.target.value;
        t = setTimeout(() => {
          location.hash = buildPropertiesHash({ view, q: value.trim(), page: 1 });
        }, 220);
      });
    }
    document.querySelectorAll('.view-toggle__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextView = btn.getAttribute('data-view');
        const params = parseHashQuery(location.hash);
        location.hash = buildPropertiesHash({ view: nextView, q: params.q || '', page: 1 });
      });
    });
    const clearBtn = document.querySelector('[data-action="clear-search"]');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      location.hash = buildPropertiesHash({ view, q: '', page: 1 });
    });
  }

  function renderGalleryView(items) {
    return `<div class="property-grid">${items.map(propertyCard).join('')}</div>`;
  }

  function renderListView(items) {
    return `
      <div class="property-list-wrap">
        <table class="table property-list">
          <thead>
            <tr>
              <th>SAP-WE</th><th>EGID</th><th>Objekt</th><th>Adresse</th>
              <th class="numeric">HNF2</th><th class="numeric">AP</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(t => `
              <tr onclick="location.hash='#/properties/${t.id}'" tabindex="0"
                  onkeydown="if(event.key==='Enter')location.hash='#/properties/${t.id}'">
                <td><code>${formatAssetKey(t.assetKey)}</code></td>
                <td>${t.egid}</td>
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
        <div class="property-map__canvas" id="propertiesMap" role="region" aria-label="Karte der Liegenschaften"></div>
      </div>
    `;
  }

  function renderPagination(current, total, view, q) {
    if (total <= 1) return '';
    const link = (p, label, opts = {}) => {
      if (opts.disabled) return `<span class="pagination__btn pagination__btn--disabled" aria-disabled="true">${label}</span>`;
      const href = buildPropertiesHash({ view, q, page: p });
      const cls = opts.active ? 'pagination__btn pagination__btn--active' : 'pagination__btn';
      const aria = opts.active ? ' aria-current="page"' : '';
      return `<a class="${cls}" href="${href}"${aria}>${label}</a>`;
    };
    // Compact window: first, prev, … neighbours …, last, next
    const pages = [];
    const window = 1; // neighbours on each side
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - window && i <= current + window)) pages.push(i);
      else if (pages[pages.length - 1] !== '…') pages.push('…');
    }
    return `
      <nav class="pagination" aria-label="Seitennavigation">
        ${link(current - 1, P.icon('chevronLeft') + 'Zurück', { disabled: current === 1 })}
        <ol class="pagination__list">
          ${pages.map(p => p === '…'
            ? `<li class="pagination__ellipsis" aria-hidden="true">…</li>`
            : `<li>${link(p, String(p), { active: p === current })}</li>`).join('')}
        </ol>
        ${link(current + 1, 'Weiter' + P.icon('chevronRight'), { disabled: current === total })}
      </nav>
    `;
  }

  // MapLibre GL — loaded on demand only when the map view is active.
  let _maplibreReady = null;
  let _propertiesMap = null;
  let _propertiesMarkers = [];
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
  function initPropertiesMap(items) {
    loadMapLibre().then(maplibregl => {
      const container = document.getElementById('propertiesMap');
      if (!container) return;
      // Tear down previous instance if the user toggled views without leaving the route
      if (_propertiesMap) { try { _propertiesMap.remove(); } catch {} _propertiesMap = null; _propertiesMarkers = []; }
      const map = new maplibregl.Map({
        container,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [8.2275, 46.8182], zoom: 7,
        attributionControl: { compact: true }
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      _propertiesMap = map;
      map.on('load', () => {
        const bounds = new maplibregl.LngLatBounds();
        items.forEach(t => {
          if (typeof t.lat !== 'number' || typeof t.lng !== 'number') return;
          const el = document.createElement('button');
          el.className = 'property-marker';
          el.type = 'button';
          el.setAttribute('aria-label', t.buildingName);
          el.dataset.id = t.id;
          el.innerHTML = '<span class="property-marker__pin"></span>';
          el.addEventListener('click', () => focusPropertyOnMap(t.id));
          const popup = new maplibregl.Popup({ offset: 22, closeButton: false, maxWidth: '260px' }).setHTML(`
            <div class="property-popup">
              <p class="property-popup__title">${P.escapeHtml(t.buildingName)}</p>
              <p class="property-popup__meta">${formatAssetKey(t.assetKey)} · ${P.escapeHtml(t.address)}</p>
              <p class="property-popup__meta">${t.hnf2} m² · ${t.workstations} AP</p>
              <a class="property-popup__link" href="#/properties/${t.id}">Details öffnen →</a>
            </div>`);
          const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([t.lng, t.lat]).setPopup(popup).addTo(map);
          _propertiesMarkers.push({ id: t.id, marker, el });
          bounds.extend([t.lng, t.lat]);
        });
        if (_propertiesMarkers.length > 0) {
          map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 0 });
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
    _propertiesMarkers.forEach(m => m.el.classList.remove('property-marker--active'));
    entry.el.classList.add('property-marker--active');
    const lngLat = entry.marker.getLngLat();
    _propertiesMap.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: Math.max(_propertiesMap.getZoom(), 13), duration: 600 });
    entry.marker.togglePopup();
  }

  function propertyCard(t) {
    const issuesBadge = t.openIssues > 0
      ? `<span class="badge badge--warning">${t.openIssues} offen</span>`
      : `<span class="badge badge--success">keine offenen Anliegen</span>`;
    return `
      <a href="#/properties/${t.id}" class="card--property">
        <div class="card--property__image" style="background-image:url('${t.image}');"></div>
        <div class="card--property__body">
          <p class="card--property__sap">${formatAssetKey(t.assetKey)} · EGID ${t.egid}</p>
          <h3 class="card--property__title">${P.escapeHtml(t.buildingName)}</h3>
          <p class="card--property__address">${P.escapeHtml(t.address)} · ${P.escapeHtml(t.floorLabel)}</p>
          <div class="card--property__meta">
            <span>${t.hnf2} m² HNF2</span>
            <span>${t.workstations} AP</span>
            <span>${P.formatChf(t.yearlyCost)} / Jahr</span>
          </div>
          <div class="card--property__footer">
            ${issuesBadge}
            <span style="font-size:var(--text-body-xs);color:var(--color-text-muted);">${P.escapeHtml(t.portfolioCategory)}</span>
          </div>
        </div>
      </a>
    `;
  }

  // ── 10. LIEGENSCHAFTS-DETAIL ─────────────────────────────────────────────
  function renderPropertyDetail({ id }) {
    if (!P.state.user) { P.navigate('#/'); return; }
    const t = P.state.tenancies.find(x => x.id === id);
    if (!t) { document.getElementById('page-body').innerHTML = '<div class="container section"><p>Liegenschaft nicht gefunden.</p></div>'; return; }
    shell({ activeNav: 'properties', breadcrumb: [
      { href: '#/home', label: 'Start' },
      { href: '#/properties', label: 'Liegenschaften' },
      { label: t.buildingName }
    ]});

    const related = P.state.applications.filter(a => a.buildingId === t.buildingId);
    const today = new Date();
    const leaseEnd = new Date(t.leaseEnd);
    const monthsToEnd = Math.max(0, Math.round((leaseEnd - today) / (30 * 86400000)));

    document.getElementById('page-body').innerHTML = `
      ${P.renderShareBar()}
      <section class="section">
        <div class="container">
          <header style="display:grid;grid-template-columns:1fr;gap:var(--space-lg);margin-bottom:var(--space-xl);">
            <div style="position:relative;border-radius:var(--radius-lg);overflow:hidden;height:280px;background:url('${t.image}') center/cover;">
              <div style="position:absolute;inset:auto 0 0 0;background:linear-gradient(transparent,var(--color-black-70));padding:var(--space-lg);color:var(--color-white);">
                <p style="margin:0 0 var(--space-xs);font-size:var(--text-body-xs);text-transform:uppercase;letter-spacing:1px;opacity:0.85;">${formatAssetKey(t.assetKey)} · EGID ${t.egid}</p>
                <h1 style="margin:0;font-size:var(--text-h1);color:var(--color-white);">${P.escapeHtml(t.buildingName)}</h1>
                <p style="margin:var(--space-xs) 0 0;opacity:0.9;">${P.escapeHtml(t.address)} · ${P.escapeHtml(t.floorLabel)}</p>
              </div>
            </div>
          </header>

          <div class="property-layout">
            <div>
              <section style="margin-bottom: var(--space-2xl);">
                <h2 class="h2 section-heading">Vertrag & Mengengerüst</h2>
                <table class="table" style="margin-top:var(--space-md);">
                  <tr><th>Mietende VE</th><td>${P.escapeHtml(t.ve)}${t.dep && t.dep !== t.ve ? ' / ' + P.escapeHtml(t.dep) : ''}</td></tr>
                  <tr><th>PFM-Kategorie</th><td>${P.escapeHtml(t.portfolioCategory)}</td></tr>
                  <tr><th>HNF2 / GF</th><td>${t.hnf2} m² / ${t.gf} m²</td></tr>
                  <tr><th>Arbeitsplätze</th><td>${t.workstations}</td></tr>
                  <tr><th>Mietkosten</th><td>${P.formatChf(t.yearlyCost)} / Jahr</td></tr>
                  <tr><th>Vertragslaufzeit</th><td>${P.formatDate(t.leaseStart)} – ${P.formatDate(t.leaseEnd)} ${t.leaseAuto ? '<span class="badge badge--success">automatisch verlängernd</span>' : '<span class="badge badge--warning">Festlaufzeit</span>'}</td></tr>
                  <tr><th>Restlaufzeit</th><td>~${monthsToEnd} Monate</td></tr>
                </table>
              </section>

              <section style="margin-bottom: var(--space-2xl);">
                <h2 class="h2 section-heading">Anträge zu dieser Liegenschaft (${related.length})</h2>
                ${related.length === 0
                  ? `<p style="color:var(--color-text-secondary);">Keine offenen oder vergangenen Anträge zu dieser Liegenschaft.</p>`
                  : `<table class="table"><thead><tr><th>Antrag</th><th>Typ</th><th>Eingereicht</th><th>Status</th></tr></thead><tbody>
                       ${related.map(a => `<tr onclick="location.hash='#/inbox/${a.id}';"><td><strong>${a.id}</strong></td><td>${a.type}</td><td>${P.formatDate(a.submittedAt)}</td><td>${P.statusBadge(a.status)}</td></tr>`).join('')}
                     </tbody></table>`}
              </section>

              <section style="margin-bottom: var(--space-2xl);">
                <h2 class="h2 section-heading">Pläne & Belege zu dieser Liegenschaft</h2>
                ${downloadList((P.state.downloads?.propertyDetail || []).map(d => ({
                  ...d,
                  title: d.title || (d.titleTemplate || '').replace('{floorLabel}', t.floorLabel || ''),
                })))}
              </section>
            </div>

            <aside class="property-aside">
              <div class="card" style="margin-bottom: var(--space-lg);">
                <h3 class="card__title">Aktionen</h3>
                <div style="display:flex;flex-direction:column;gap:var(--space-sm);">
                  <a href="#/repair?building=${t.buildingId}" class="btn btn--filled">${P.icon('tool')}Schaden / Reparatur melden</a>
                  <a href="#/wizard/1" class="btn btn--outline">Bedarf zu dieser Liegenschaft</a>
                  <button class="btn btn--bare" onclick="window.portal.toast('Umzug-Workflow noch nicht implementiert')">${P.icon('truck')}Umzug anmelden</button>
                  <button class="btn btn--bare" onclick="window.portal.toast('Sonderreinigung noch nicht implementiert')">${P.icon('sparkles')}Sonderreinigung anfragen</button>
                </div>
              </div>
              <div class="card">
                <h3 class="card__title">Ansprechpersonen BBL</h3>
                <dl style="margin:0;display:grid;grid-template-columns:1fr;gap:var(--space-sm);">
                  <div>
                    <dt style="font-size:var(--text-body-sm);color:var(--color-text-secondary);font-weight:var(--font-weight-normal);">Portfolio-Management</dt>
                    <dd style="margin:0;font-weight:var(--font-weight-semibold);">${P.escapeHtml(t.contacts.pfm)}</dd>
                  </div>
                  <div>
                    <dt style="font-size:var(--text-body-sm);color:var(--color-text-secondary);font-weight:var(--font-weight-normal);">Immobilien-Management</dt>
                    <dd style="margin:0;font-weight:var(--font-weight-semibold);">${P.escapeHtml(t.contacts.im)}</dd>
                  </div>
                  <div>
                    <dt style="font-size:var(--text-body-sm);color:var(--color-text-secondary);font-weight:var(--font-weight-normal);">Flächenmanagement (FLM)</dt>
                    <dd style="margin:0;font-weight:var(--font-weight-semibold);">${P.escapeHtml(t.contacts.flm)}</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </div>
      </section>
    `;
  }

  // ── 11. DOWNLOADS ────────────────────────────────────────────────────────
  function renderDownloads() {
    if (!P.state.user) { P.navigate('#/'); return; }
    shell({ activeNav: 'downloads', breadcrumb: [{ href: '#/home', label: 'Start' }, { label: 'Pläne & Dokumente' }] });
    const docs = sampleDocuments();
    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container">
          <h1 class="h1 section-heading">Pläne & Dokumente</h1>
          <p style="color:var(--color-text-secondary);max-width:60ch;margin: 0 0 var(--space-lg);">
            Sie sehen: alle für <strong>${P.state.user.ve}</strong> freigegebenen Dateien plus öffentliche Merkblätter. Pro Datei sind Quelle, verantwortliche Person und Stand sichtbar (FUNC-LP-009).
          </p>
          <div style="display:flex;gap:var(--space-md);flex-wrap:wrap;margin-bottom:var(--space-lg);">
            <select class="form-field__select" id="filterDocType" style="min-height:auto;">
              <option value="">Alle Typen</option>
              <option value="Grundriss">Grundriss</option>
              <option value="Merkblatt">Merkblatt</option>
              <option value="Schulung">Schulung</option>
              <option value="Vorlage">Vorlage</option>
              <option value="Vertrag">Vertrag (intern)</option>
            </select>
            <input class="form-field__input" type="search" id="filterDocText" placeholder="Suchen …" style="flex:1;min-width:200px;min-height:auto;">
          </div>
          <div class="card-grid" id="docGrid">
            ${docs.map(documentCard).join('')}
          </div>
        </div>
      </section>
    `;
    const applyDocFilter = () => {
      const ty = document.getElementById('filterDocType').value;
      const tx = document.getElementById('filterDocText').value.toLowerCase();
      const filtered = docs.filter(d => (!ty || d.type === ty) && (!tx || d.title.toLowerCase().includes(tx) || (d.source || '').toLowerCase().includes(tx)));
      document.getElementById('docGrid').innerHTML = filtered.map(documentCard).join('') || `<p style="color:var(--color-text-muted);">Keine Treffer.</p>`;
    };
    document.getElementById('filterDocType').addEventListener('change', applyDocFilter);
    document.getElementById('filterDocText').addEventListener('input', applyDocFilter);
  }

  // Downloads-page content lives in data/downloads.json (loaded by loadData).
  // Returns an empty list before data has loaded so the page renders cleanly.
  function sampleDocuments() {
    return P.state.downloads?.documents || [];
  }

  // Federal-CD download list (kbob.admin.ch / armasuisse Immo-Portal pattern).
  // Each item:  red down-arrow icon | bold title | optional subtitle | format|size|date meta.
  // `items` shape: { title, subtitle?, format, size, languages?, date }
  function downloadList(items) {
    return `
      <ul class="download-list">
        ${items.map(it => `
          <li class="download-list__item">
            <a class="download-list__link" href="#"
               onclick="window.portal.toast('Download simuliert: ${P.escapeJs(it.title)}'); return false;">
              <span class="download-list__icon">${P.icon('download')}</span>
              <div class="download-list__body">
                <p class="download-list__title">${P.escapeHtml(it.title)}</p>
                ${it.subtitle ? `<p class="download-list__subtitle">${P.escapeHtml(it.subtitle)}</p>` : ''}
                <p class="download-list__meta">
                  ${it.format    ? `<span>${P.escapeHtml(it.format)}</span>`    : ''}
                  ${it.size      ? `<span>${P.escapeHtml(it.size)}</span>`      : ''}
                  ${it.languages ? `<span>${P.escapeHtml(it.languages)}</span>` : ''}
                  ${it.date      ? `<span>${P.escapeHtml(it.date)}</span>`      : ''}
                </p>
              </div>
            </a>
          </li>
        `).join('')}
      </ul>
    `;
  }

  function documentCard(d) {
    const iconName = ({ MP4: 'video' })[d.format] || 'document';
    return `
      <a href="#" onclick="window.portal.toast('Download simuliert: ${P.escapeJs(d.title)}'); return false;" class="card--quick" style="min-height:auto;">
        <p class="card--quick__title">${P.icon(iconName)}${P.escapeHtml(d.title)}</p>
        <p class="card--quick__desc">${d.format} · ${d.size} · ${d.languages}</p>
        <p class="card--quick__meta">
          <span>Quelle: ${P.escapeHtml(d.source)}</span>
          <span>${P.escapeHtml(d.responsible)}</span>
          <span>Stand ${d.stand}</span>
          <span class="badge ${d.scope === 'Alle' ? 'badge--success' : 'badge--info'}">${d.scope}</span>
        </p>
        ${arrowBtn()}
      </a>
    `;
  }

  // ── 12. SCHADENSMELDUNG (REQ-FA-005 stub) ────────────────────────────────
  function renderRepairQuickForm() {
    if (!P.state.user) { P.navigate('#/'); return; }
    shell({ activeNav: 'home', breadcrumb: [{ href: '#/home', label: 'Start' }, { label: 'Schadensmeldung' }] });

    const params = new URLSearchParams((location.hash.split('?')[1] || ''));
    const presetBuildingId = params.get('building');
    const presetTenancy = P.state.tenancies.find(t => t.buildingId === presetBuildingId);

    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container" style="max-width: 720px;">
          <h1 class="h1 section-heading">Schaden oder Störung melden</h1>
          <p style="color:var(--color-text-secondary);margin: 0 0 var(--space-lg);">
            Defekte Heizung, Wasserschaden, Beleuchtung, Schliesssystem: kurze Meldung — BBL-IM nimmt Kontakt auf und koordiniert die Behebung. Roadmap REQ-FA-005.
          </p>
          <form class="card stack" onsubmit="event.preventDefault(); window.t3lite.submitRepair(this);">
            <div class="form-field">
              <label class="form-field__label">Liegenschaft <span class="form-field__required">*</span></label>
              <select class="form-field__select" name="building">
                ${P.state.tenancies.map(t => `<option value="${t.id}" ${presetTenancy && presetTenancy.id === t.id ? 'selected' : ''}>${P.escapeHtml(t.buildingName)} — ${P.escapeHtml(t.address)}</option>`).join('')}
              </select>
            </div>
            <div class="form-field">
              <label class="form-field__label">Kategorie <span class="form-field__required">*</span></label>
              <select class="form-field__select" name="category">
                <option>Sanitär (Wasser, WC, Heizung)</option>
                <option>Elektrik & Beleuchtung</option>
                <option>Schliesssystem / Zutritt</option>
                <option>Aufzug</option>
                <option>Klima & Lüftung</option>
                <option>Sonstiges</option>
              </select>
            </div>
            <div class="form-field">
              <label class="form-field__label">Dringlichkeit <span class="form-field__required">*</span></label>
              <div class="radio-group">
                <label><input type="radio" name="urgency" value="low" checked> Niedrig (Termin in 1–2 Wochen)</label>
                <label><input type="radio" name="urgency" value="med"> Mittel (innerhalb 48 h)</label>
                <label><input type="radio" name="urgency" value="high"> Hoch (gleicher Tag)</label>
                <label><input type="radio" name="urgency" value="emergency"> Notfall (sofort, mit Telefon)</label>
              </div>
            </div>
            <div class="form-field">
              <label class="form-field__label">Beschreibung <span class="form-field__required">*</span></label>
              <textarea class="form-field__textarea" name="desc" placeholder="Wo genau (Raum, Etage), seit wann, Auswirkungen …" required></textarea>
            </div>
            <div class="form-field">
              <label class="form-field__label">Foto (optional)</label>
              <input class="form-field__input" type="file" name="photo">
              <p class="form-field__hint">Hilfreich bei sichtbaren Schäden. Wird wie alle Anhänge auf Schadsoftware geprüft (NFA-SEC-003).</p>
            </div>
            <div class="form-field">
              <label class="form-field__label">Kontakt für Rückfragen</label>
              <input class="form-field__input" type="tel" name="phone" placeholder="+41 …" value="">
              <p class="form-field__hint">Nur ausfüllen, wenn ein anderer Kontakt als Ihr eIAM-Profil zuständig ist.</p>
            </div>
            <div class="wizard__sticky-footer">
              <a class="btn btn--outline" href="#/home">Abbrechen</a>
              <button type="submit" class="btn btn--filled">Schadensmeldung senden</button>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  // ── 13. PROFILE / EINSTELLUNGEN ──────────────────────────────────────────
  function renderProfile() {
    if (!P.state.user) { P.navigate('#/'); return; }
    shell({ activeNav: '', breadcrumb: [{ href: '#/home', label: 'Start' }, { label: 'Profil' }] });
    const u = P.state.user;
    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container" style="max-width: 720px;">
          <h1 class="h1 section-heading">Mein Profil</h1>

          <div class="card" style="margin-bottom: var(--space-lg);">
            <h2 class="card__title">Identität (über eIAM)</h2>
            <dl style="margin:0;display:grid;grid-template-columns:160px 1fr;gap:var(--space-sm);">
              <dt style="color:var(--color-text-secondary);">Name</dt><dd>${P.escapeHtml(u.name)}</dd>
              <dt style="color:var(--color-text-secondary);">E-Mail</dt><dd>${P.escapeHtml(u.email)}</dd>
              <dt style="color:var(--color-text-secondary);">eIAM-Subjekt-ID</dt><dd><code>${u.id}</code></dd>
              <dt style="color:var(--color-text-secondary;">Verwaltungs­einheit</dt><dd>${P.escapeHtml(u.ve)}${u.dep ? ' / ' + P.escapeHtml(u.dep) : ''}</dd>
              <dt style="color:var(--color-text-secondary);">Aktive Rolle</dt><dd><strong>${P.roleLabel(u.activeRole)}</strong></dd>
              <dt style="color:var(--color-text-secondary);">Weitere Rollen</dt><dd>${u.roles.filter(r => r !== u.activeRole).map(P.roleLabel).join(' · ') || '—'}</dd>
            </dl>
            <p style="font-size:var(--text-body-xs);color:var(--color-text-muted);margin: var(--space-md) 0 0;">
              Diese Daten kommen aus dem föderalen eIAM-Verzeichnis und können hier nicht geändert werden. Änderungen über Ihre VE-Administration.
            </p>
          </div>

          <div class="card" style="margin-bottom: var(--space-lg);">
            <h2 class="card__title">Benachrichtigungen</h2>
            <p class="card__lead">Per E-Mail, sobald sich der Status Ihrer Anträge ändert (FUNC-FG-004).</p>
            <div class="stack">
              <label><input type="checkbox" checked> Statuswechsel meiner Anträge</label>
              <label><input type="checkbox" checked> Rückfragen / Auflagen vom GS</label>
              <label><input type="checkbox" checked> Wartungsfenster & Systemmeldungen</label>
              <label><input type="checkbox"> Tägliche Zusammenfassung statt Einzel-E-Mails</label>
            </div>
            <button class="btn btn--outline btn--sm" style="margin-top:var(--space-md);" onclick="window.portal.toast('Einstellungen gespeichert', 'success')">Einstellungen speichern</button>
          </div>

          <div class="card" style="margin-bottom: var(--space-lg);">
            <h2 class="card__title">Sprache</h2>
            <p class="card__lead">Wird in Inhalten und Benachrichtigungen verwendet, wo verfügbar (NFA-CD-003: DE/FR/IT Pflicht).</p>
            <div class="radio-group">
              <label><input type="radio" name="lang" checked> Deutsch</label>
              <label><input type="radio" name="lang" disabled> Français (Demo)</label>
              <label><input type="radio" name="lang" disabled> Italiano (Demo)</label>
            </div>
          </div>

          <button class="btn btn--bare" onclick="window.portal.logout()">Abmelden</button>
        </div>
      </section>
    `;
  }

  // ── SERVICES OVERVIEW (linked from the nav dropdown "Übersicht") ────────
  function renderServicesOverview() {
    shell({ breadcrumb: [{ href: '#/', label: 'Start' }, { label: 'Dienstleistungen' }] });
    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container">
          <h1 class="h1 section-heading">Dienstleistungen des Mieterportals</h1>
          <p style="max-width:60ch;color:var(--color-text-secondary);margin: 0 0 var(--space-2xl);">
            BBL bewirtschaftet die Immobilien der Bundesverwaltung. Über das Mieterportal stellen Bundes-Mietende
            die folgenden Anfragen direkt — geführt, dokumentiert, übergabefähig an SAP ePPM.
          </p>
          <div class="card-grid">
            ${SERVICES_MENU.items.slice(1).map(svc => `
              <a href="${svc.href}" class="card--quick">
                <p class="card--quick__title">${P.escapeHtml(svc.label)}</p>
                <p class="card--quick__desc">${P.escapeHtml(svc.desc || '')}</p>
                ${arrowBtn()}
              </a>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  }

  // ── GENERIC SERVICE STUB (for roadmap services not yet implemented) ─────
  function renderServiceStub(title, reqId, lead, externalUrl) {
    shell({ breadcrumb: [{ href: '#/', label: 'Start' }, { href: '#/services', label: 'Dienstleistungen' }, { label: title }] });
    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container" style="max-width: 720px;">
          <p class="meta-info"><code>${reqId}</code></p>
          <h1 class="h1 section-heading">${P.escapeHtml(title)}</h1>
          <p style="color:var(--color-text-secondary);font-size: var(--text-h4);line-height: var(--line-height-relaxed);margin: 0 0 var(--space-lg);">
            ${P.escapeHtml(lead)}
          </p>
          <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;">
            ${externalUrl ? `<a href="${externalUrl}" target="_blank" rel="noopener" class="btn btn--filled">Zum Schwesterprojekt ↗</a>` : ''}
            <a href="#/services" class="btn btn--outline">← Zurück zur Übersicht</a>
          </div>
          <p style="margin-top: var(--space-2xl);font-size: var(--text-body-xs);color: var(--color-text-muted);">
            Roadmap-Eintrag <code>${reqId}</code> — siehe <a href="docs/REQUIREMENTS.md">REQUIREMENTS.md</a> §4. Diese Funktion wird in einer der nächsten Iterationen freigeschaltet.
          </p>
        </div>
      </section>
    `;
  }

  // ── 14. HELP STUB ────────────────────────────────────────────────────────
  function renderHelp() {
    const main = shell({ activeNav: 'help', breadcrumb: [{ label: 'Hilfe' }] });
    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container">
          <h1>Häufige Fragen</h1>
          <div class="accordion">
            <div class="accordion__item">
              <button class="accordion__trigger" onclick="this.parentElement.classList.toggle('accordion__item--open')">
                <span>Wie melde ich einen Bedarf an?</span><span class="accordion__icon"></span>
              </button>
              <div class="accordion__panel">
                <p>Klicken Sie auf der Startseite „Bedarf anmelden →". Sie werden durch fünf Schritte geführt: Basisangaben, Flächenbedarf (NAW-Klassifizierung), Anhänge, ggf. Detail-Felder für Grossanträge, abschliessend Prüfen & Senden.</p>
                <p>Tipp: Drücken Sie <kbd>?</kbd> für eine Übersicht aller Tastatur-Kurzbefehle.</p>
              </div>
            </div>
            <div class="accordion__item">
              <button class="accordion__trigger" onclick="this.parentElement.classList.toggle('accordion__item--open')">
                <span>Was bedeutet die NAW-Klasse?</span><span class="accordion__icon"></span>
              </button>
              <div class="accordion__panel">
                <p>NAW = <em>Neue Arbeitswelten</em>. Die Klassifizierung beschreibt den Arbeitsstil Ihres Teams (Kollaborativ, Konzentriert, Hybrid, Labor) und bestimmt die m²/FTE-Basis (Standardwert 12 m²/FTE HNF2 für Kollaborativ-Standard). Der Belegungsfaktor 0.8 ist eine fixe Bundesvorgabe.</p>
              </div>
            </div>
            <div class="accordion__item">
              <button class="accordion__trigger" onclick="this.parentElement.classList.toggle('accordion__item--open')">
                <span>Greenfield-Pfad — was ist das?</span><span class="accordion__icon"></span>
              </button>
              <div class="accordion__panel">
                <p>Wenn die von Ihnen eingegebene Adresse nicht im Bundes-Stammdatensatz registriert ist (z. B. eine neue Auslandvertretung), aktiviert das Portal den Greenfield-Modus. Sie können den Antrag trotzdem einreichen — BBL-IM legt die Wirtschaftseinheit (WE) und Objektnummer im Anschluss an die Genehmigung an, danach erfolgt die ePPM-Übergabe.</p>
              </div>
            </div>
            <div class="accordion__item">
              <button class="accordion__trigger" onclick="this.parentElement.classList.toggle('accordion__item--open')">
                <span>BK-Bypass (Bundeskanzlei) — wann?</span><span class="accordion__icon"></span>
              </button>
              <div class="accordion__panel">
                <p>Die Bundeskanzlei (BK) hat kein Generalsekretariat. Anträge der BK überspringen daher den GS-Schritt und werden direkt an BBL Portfolio-Management geroutet (FUNC-FG-005). Das System erkennt dies automatisch und passt die Status-Pipeline an.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ── EXTERNAL API (used by inline event handlers) ─────────────────────────
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
    submitRepair(form) {
      const data = new FormData(form);
      const building = P.state.tenancies.find(t => t.id === data.get('building'));
      if (!building) { P.toast('Bitte Liegenschaft wählen.'); return; }
      const ticketId = 'R-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900 + 100));
      P.toast(`Schadensmeldung ${ticketId} an BBL-IM gesendet (${P.escapeHtml(building.contacts.im)}).`, 'success');
      setTimeout(() => P.navigate('#/properties/' + building.id), 800);
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
        'LBO':           '#/home',
        'GS-Reviewer':   '#/queue',
        'BBL-PFM':        '#/home',
        'BBL-Campus':     '#/home',
        'Auditor':        '#/inbox',
      };
      P.navigate(landing[role] || '#/home');
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
        <p>Sie genehmigen ${sel.length} Anträge. Pro Antrag ist eine schriftliche Begründung erforderlich (FUNC-FG-003 / VwVG Art. 35).</p>
        <div class="form-field">
          <label class="form-field__label">Optionaler Vorschlagstext (nicht voreingestellt)</label>
          <textarea class="form-field__textarea" id="batchTemplate" placeholder="z. B. Formal vollständig, Rechtsgrundlage geprüft, keine Auflagen."></textarea>
          <label style="margin-top:var(--space-xs);"><input type="checkbox" id="copyTpl"> Als Vorschlag in alle Felder einsetzen (Default: off)</label>
        </div>
        <hr style="margin: var(--space-md) 0; border:none; border-top: 1px solid var(--color-border);">
      `;
      sel.forEach(id => {
        const a = P.state.applications.find(x => x.id === id);
        if (!a) return;
        body += `
          <div class="form-field" style="margin-bottom:var(--space-sm);">
            <label class="form-field__label">${a.id} — ${P.escapeHtml(a.address)}</label>
            <textarea class="form-field__textarea batchBegr" data-id="${a.id}" placeholder="Begründung … (Pflicht)"></textarea>
          </div>
        `;
      });
      body += `
        <label><input type="checkbox" id="batchConfirm"> Ich bestätige, dass jede Begründung den jeweiligen Antrag individuell betrifft (Verwaltungsverfahrensrecht).</label>
      `;
      const m = P.modal({
        title: 'Bulk genehmigen', body, size: 'lg',
        actions: [
          { label: 'Abbrechen', variant: 'btn--outline' },
          { label: 'Genehmigen', variant: 'btn--filled', onClick: () => {
            const begrs = Array.from(document.querySelectorAll('.batchBegr')).map(t => ({ id: t.getAttribute('data-id'), text: t.value.trim() }));
            if (begrs.some(b => !b.text)) { P.toast('Alle Begründungen sind Pflicht.'); return false; }
            if (!document.getElementById('batchConfirm').checked) { P.toast('Bitte die Bestätigung ankreuzen.'); return false; }
            // Server-side identical-text check
            const counts = {};
            begrs.forEach(b => counts[b.text] = (counts[b.text] || 0) + 1);
            const duplicate = Object.entries(counts).find(([, n]) => n >= 3);
            if (duplicate) {
              P.toast('3+ Begründungen identisch — bitte präzisieren oder erläutern, warum identische Begründung sachlich passend ist.', 'danger');
              return false;
            }
            begrs.forEach(b => {
              const a = P.state.applications.find(x => x.id === b.id);
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
          document.querySelectorAll('.batchBegr').forEach(t => t.value = tpl);
        }
      });
    },
    toggleAuflage(appId, idx) {
      const a = P.state.applications.find(x => x.id === appId);
      if (!a || !a.conditions) return;
      a.conditions[idx].done = !a.conditions[idx].done;
      P.handleHash();
    },
    startResubmit(appId) {
      P.modal({
        title: 'Auflagen erfüllen & Erneut einreichen',
        body: `
          <p>In diesem Prototyp simulieren wir die erneute Einreichung. Auflagen werden als erfüllt markiert, der Status wechselt zurück zu „Eingereicht", und der GS wird benachrichtigt (FUNC-FG-004).</p>
          <p style="font-size:var(--text-body-sm);color:var(--color-text-secondary);">Die Antrags-ID ${appId} bleibt erhalten; die Historie zeichnet die Resubmission als Statusübergang auf, nicht als neuer Antrag (FUNC-AU-022).</p>
        `,
        actions: [
          { label: 'Abbrechen', variant: 'btn--outline' },
          { label: 'Erneut einreichen', variant: 'btn--filled', onClick: () => {
            const a = P.state.applications.find(x => x.id === appId);
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

})(window);
