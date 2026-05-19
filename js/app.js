/* ==========================================================================
   PORTAL.JS — BBL Mieterportal prototype shared module

   Shared between all typology SPAs. Exports:
   - state: global state object
   - bootstrap(): load mock data + wire global listeners
   - router: hash-based routing (per-typology routes registered separately)
   - renderShell(): federal CD-Bund chrome (top bar, brand bar, navbar, footer)
   - renderPipeline(application): status pipeline with three variants
   - renderStepIndicator(currentStep, steps): wizard StepIndicator
   - toast(): toast notifications
   - modal(): modal helper
   - shortcutOverlay(): "?" key overlay
   - calcWizard(): NAW × desk-sharing × FTE → HNF2/GF/UK
   - utility renderers: badge, card, application card, attachments list
   ========================================================================== */

(function (global) {
  'use strict';

  // ── STATE ────────────────────────────────────────────────────────────────
  const state = {
    user: null,                  // { id, name, ve, roles, activeRole }
    applications: [],            // loaded from data/applications.json
    masterData: null,            // loaded from data/master-data.json
    buildings: [],               // loaded from data/buildings.json
    users: [],                   // loaded from data/users.json
    page: 'home',                // current route id
    params: {},                  // route params
    draft: null,                 // current wizard draft
    pendingNotice: null,         // queued notification banner text
  };

  // ── DATA LOADING ────────────────────────────────────────────────────────
  async function loadData(basePath = 'data/') {
    const [apps, master, users, buildings, tenancies, news] = await Promise.all([
      fetch(basePath + 'applications.json').then(r => r.json()),
      fetch(basePath + 'master-data.json').then(r => r.json()),
      fetch(basePath + 'users.json').then(r => r.json()),
      fetch(basePath + 'buildings.json').then(r => r.json()),
      fetch(basePath + 'tenancies.json').then(r => r.json()).catch(() => []),
      fetch(basePath + 'news.json').then(r => r.json()).catch(() => []),
    ]);
    state.applications = apps;
    state.masterData = master;
    state.users = users;
    state.buildings = buildings;
    state.tenancies = tenancies;
    state.news = news;
  }

  // ── PERSISTENCE (localStorage) ──────────────────────────────────────────
  function persistDraft(draft) {
    if (!state.user) return;
    localStorage.setItem('mp-draft-' + state.user.id, JSON.stringify(draft));
  }
  function loadDraft() {
    if (!state.user) return null;
    const raw = localStorage.getItem('mp-draft-' + state.user.id);
    return raw ? JSON.parse(raw) : null;
  }
  function clearDraft() {
    if (!state.user) return;
    localStorage.removeItem('mp-draft-' + state.user.id);
  }
  function persistRole(role) {
    if (!state.user) return;
    localStorage.setItem('mp-active-role-' + state.user.id, role);
  }
  function loadRole() {
    if (!state.user) return null;
    return localStorage.getItem('mp-active-role-' + state.user.id);
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
    const h = location.hash || '#/';
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
                   alt="Schweizerische Eidgenossenschaft · Confédération suisse · Confederazione Svizzera · Confederaziun svizra"
                   width="259" height="64">
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
                <li><a href="https://github.com/bbl-dres/tenant-portal" target="_blank" rel="noopener">Quellcode auf GitHub <span class="footer-information__arrow" aria-hidden="true">→</span></a></li>
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
      'ILBO': 'Logistikbeauftragte',
      'GS-Prüfer/in': 'GS-Prüfer/in',
      'BBL-PFM': 'BBL Portfolio-Management',
      'BBL-Campus': 'BBL Campus',
      'Auditor': 'EFD Auditor',
    })[role] || role;
  }

  // ── STATUS PIPELINE ──────────────────────────────────────────────────────
  // Maps to §0.3 (three variants). Each step describes one transition state.
  const PIPELINE_STANDARD = ['Entwurf', 'Eingereicht', 'in GS-Prüfung', 'genehmigt', 'in ePPM', 'abgeschlossen'];
  const PIPELINE_BK       = ['Entwurf', 'Eingereicht', 'in PFM-Prüfung', 'genehmigt', 'in ePPM', 'abgeschlossen'];
  const PIPELINE_GREENFIELD = ['Entwurf', 'Eingereicht', 'in GS-Prüfung', 'genehmigt', 'WE-Anlage', 'in ePPM', 'abgeschlossen'];

  function statusKey(label) {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  }

  function renderPipeline(application) {
    let steps;
    if (application.pipelineVariant === 'bk') steps = PIPELINE_BK;
    else if (application.pipelineVariant === 'greenfield') steps = PIPELINE_GREENFIELD;
    else steps = PIPELINE_STANDARD;

    const currentIdx = steps.findIndex(s => statusKey(s) === application.status);
    const isRejected = application.status === 'abgelehnt';
    const isRueckfrage = application.status === 'rueckfrage';

    if (isRueckfrage) {
      // Show pipeline up to "in GS-Prüfung" then a "Rückfrage" bubble
      return `
        <div class="pipeline" role="list" aria-label="Statusverlauf">
          ${steps.slice(0, 3).map((s, i) => `
            <div class="pipeline__step ${i < 2 ? 'pipeline__step--done' : 'pipeline__step--rueckfrage'}" role="listitem">↻ ${s === 'in GS-Prüfung' ? 'Rückfrage' : s}</div>
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
            <div class="pipeline__step ${i < 2 ? 'pipeline__step--done' : 'pipeline__step--rejected'}" role="listitem">${i < 2 ? '✓' : '✕'} ${s}</div>
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
          return `<div class="pipeline__step ${cls}" role="listitem">${glyph}${s}</div>`;
        }).join('')}
      </div>
    `;
  }

  function renderStepIndicator(currentStep, steps) {
    return `
      <ol class="step-indicator" aria-label="Schritt-Anzeige">
        ${steps.map((label, i) => {
          const n = i + 1;
          const cls = n < currentStep ? 'step-indicator__item--done' :
                      n === currentStep ? 'step-indicator__item--active' : '';
          const glyph = n < currentStep ? '✓' : '';
          return `<li class="step-indicator__item ${cls}">${glyph} ${n}. ${label}</li>`;
        }).join('')}
      </ol>
    `;
  }

  // ── WIZARD CALCULATION (FUNC-AU-014/-015 — see WIREFRAMES.md §8.1) ─────
  function calcWizard(fields) {
    if (!state.masterData) return null;
    const naw = state.masterData.nawClasses.find(n => n.name === fields.nawClass)
              || state.masterData.nawClasses.find(n => n.name === 'Kollaborativ-Standard');
    const ds  = state.masterData.deskSharingFactor;       // fixed 0.8
    const fte = Number(fields.fte) || 0;

    const arbeitsplaetze = Math.ceil(fte * ds);            // FTE × 0.8
    const hnf2 = Math.round(naw.hnf2PerFte * fte * ds);
    const gf   = Math.round(naw.gfPerFte * fte * ds);

    // UK-Kosten: master data has CHF per m² GF; placeholder calculation
    const ukKosten = Math.round(gf * 3000);                // illustrative
    const moeblierung = Math.round(hnf2 * state.masterData.moeblierungProM2);
    const betriebskostenProM2Gf = state.masterData.ukKostenObergrenzeProM2Gf;
    const hardBlockMultiplier   = state.masterData.ukKostenHardBlockMultiplier;
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
  function modal({ title, body, actions = [], onClose = null }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    const close = () => { backdrop.remove(); if (onClose) onClose(); };
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
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
      'entwurf': { cls: 'badge', label: '◯ Entwurf' },
      'eingereicht': { cls: 'badge badge--info', label: '● Eingereicht' },
      'in_gs_pruefung': { cls: 'badge badge--warning', label: '◐ in GS-Prüfung' },
      'in_pfm_pruefung': { cls: 'badge badge--warning', label: '◐ in PFM-Prüfung' },
      'genehmigt': { cls: 'badge badge--success', label: '✓ genehmigt' },
      'in_eppm': { cls: 'badge badge--info', label: '→ in ePPM' },
      'abgeschlossen': { cls: 'badge badge--success', label: '✓ abgeschlossen' },
      'rueckfrage': { cls: 'badge badge--orange', label: '↻ Rückfrage' },
      'abgelehnt': { cls: 'badge badge--danger', label: '✕ abgelehnt' },
    };
    const b = map[status] || { cls: 'badge', label: status };
    return `<span class="${b.cls}">${b.label}</span>`;
  }

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
    statusBadge, statusKey,
    formatChf, formatDate, escapeHtml, roleLabel,
    PIPELINE_STANDARD, PIPELINE_BK, PIPELINE_GREENFIELD,
  };

})(window);
/* ============================================================================
   T3-LITE Hero-CTA prototype — single-page app, hash router.
   Routes:
     #/              — landing (public) OR home (authenticated)
     #/login         — eIAM stub
     #/home          — auth home (role-routed via state.user.activeRole)
     #/wizard/:step  — wizard step 1..5
     #/inbox         — submitter inbox of own applications
     #/inbox/:id     — application detail
     #/queue         — reviewer queue (when activeRole = GS-Prüfer/in)
     #/review/:id    — reviewer split-pane detail
     #/help          — FAQ stub
   ============================================================================ */

(function () {
  'use strict';
  const P = window.portal;
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
          <p class="section-eyebrow">Suche</p>
          <h1 class="section-heading">Suchergebnisse${query ? ` für „${P.escapeHtml(query)}"` : ''}</h1>
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
                      <strong>${t.sap}</strong> · <span class="search-results__title">${P.escapeHtml(t.buildingName)}</span>
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
    { id: 'merkblaetter',  label: 'Merkblätter & Vorlagen' },
    { id: 'schulungen',    label: 'Schulungen & Erklärvideos' },
    { id: 'glossar',       label: 'Glossar' },
    { id: 'kontakt',       label: 'Kontakt & weitere Quellen' },
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
            <p class="section-eyebrow">Öffentlich · kein Login nötig</p>
            <h1 style="font-size: var(--text-display); letter-spacing: -0.02em; margin: 0 0 var(--space-md);">Arbeitsinstrumente und Informationen</h1>
            <p style="color: var(--color-text-secondary); font-size: var(--text-body); line-height: var(--line-height-relaxed); margin: 0;">
              Erklärungen, Merkblätter, Vorlagen und Schulungsmaterial rund um das Mieterportal des BBL. Diese Inhalte sind öffentlich zugänglich und unterstützen Sie dabei, Anfragen vorzubereiten oder den BBL-Workflow zu verstehen.
            </p>
          </header>

          <div class="page-with-toc">
            <main class="page-with-toc__content">

              <article id="einfuehrung">
                <h2>Einführung</h2>
                <p>Das BBL (Bundesamt für Bauten und Logistik) bewirtschaftet rund 2'700 Bundesimmobilien für die gesamte Bundesverwaltung — von Büroflächen in Bundeshäusern über Empfangszentren des SEM bis zu Auslandvertretungen der EDA. Das Mieterportal ist die zentrale digitale Anlaufstelle für Bundes-Mietende: Bedarfsmeldung, Schadensmeldung, Statusverfolgung und Dokumentenzugriff.</p>
                <p>Diese Sammlung enthält die wichtigsten Hintergrundinformationen — bewusst öffentlich, damit Sie sich vor der Anmeldung vorbereiten oder Konzepte nachschlagen können. Für die eigentlichen Anfragen ist eine Anmeldung über eIAM erforderlich.</p>
              </article>

              <article id="faq">
                <h2>Häufige Fragen</h2>
                <div class="accordion">
                  ${faqItem('Wer kann das Mieterportal nutzen?', 'Logistikbeauftragte (ILBO) und weitere zuständige Personen der Verwaltungseinheiten des Bundes. Die Anmeldung erfolgt mit dem föderalen eIAM-Konto.')}
                  ${faqItem('Was bedeutet NAW?', 'NAW steht für „Neue Arbeitswelten" — eine föderale Klassifizierung von Büro-Arbeitsstilen (Konzentriert, Kollaborativ, Hybrid, Labor). Die Klasse bestimmt die m²/FTE-Basis für die Flächenberechnung.')}
                  ${faqItem('Wer prüft meine Bedarfsmeldung?', 'In der Regel das Generalsekretariat (GS) Ihrer Verwaltungseinheit. Ausnahme: die Bundeskanzlei (BK) hat kein GS — ihre Anträge gehen direkt an BBL Portfolio-Management.')}
                  ${faqItem('Was ist ein Greenfield-Pfad?', 'Wenn die von Ihnen angegebene Adresse noch nicht im SAP-Stammdatensatz registriert ist (z. B. eine neue Auslandvertretung), aktiviert das Portal den Greenfield-Modus. Der Antrag wird trotzdem angenommen — BBL legt die WE später an.')}
                  ${faqItem('Wie lange dauert die Bearbeitung?', 'Die Bearbeitungszeiten variieren je nach Antragstyp und beteiligten Stellen. Konkrete SLAs werden mit Ihrem GS vereinbart und im Antragsdetail angezeigt.')}
                </div>
              </article>

              <article id="workflow">
                <h2>Workflow erklärt</h2>
                <p>Eine Bedarfsmeldung durchläuft vier Hauptphasen, die im Mieterportal als Statuspipeline sichtbar sind:</p>
                <ol style="line-height: var(--line-height-relaxed); padding-left: var(--space-lg);">
                  <li><strong>Entwurf</strong> — Sie erfassen den Bedarf im fünfstufigen Wizard. Auto-Save alle 30 Sekunden.</li>
                  <li><strong>Eingereicht → in GS-Prüfung</strong> — Das Generalsekretariat Ihrer VE prüft Feld für Feld; Rückfragen können einzelne Felder betreffen.</li>
                  <li><strong>Genehmigt → in ePPM</strong> — Die genehmigte Meldung wird als Bedarfsmeldung an SAP ePPM übergeben. Sie erhalten eine Bedarfsmeldungsnummer.</li>
                  <li><strong>Abgeschlossen</strong> — Die Akte ist vollständig dokumentiert und im Audit-Log auffindbar.</li>
                </ol>
                <p>Spezialfälle: <strong>BK-Bypass</strong> überspringt den GS-Schritt (FUNC-FG-005), <strong>Greenfield</strong> ergänzt einen Schritt „WE-Anlage durch BBL" vor der ePPM-Übergabe.</p>
              </article>

              <article id="naw">
                <h2>NAW & Bürowelten erklärt</h2>
                <p>Die NAW-Klassen sind die föderale Vorgabe für die Flächenberechnung von Büroarbeitsplätzen. Jede Klasse hat eine eigene m²/FTE-Basis; multipliziert mit dem fixen Belegungsfaktor 0.8 (Desk-Sharing) ergibt sie HNF2 und GF.</p>
                <table class="table" style="margin-top: var(--space-md);">
                  <thead>
                    <tr><th>NAW-Klasse</th><th>m²/FTE HNF2</th><th>m²/FTE GF</th><th>Beschreibung</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Konzentriert-Einzel</td><td>15.0</td><td>28.0</td><td>Einzelbüros, hohe Vertraulichkeit</td></tr>
                    <tr><td>Konzentriert-Gruppe</td><td>13.0</td><td>25.0</td><td>2–4-Personen-Büros</td></tr>
                    <tr><td>Kollaborativ-Standard</td><td>12.0</td><td>24.0</td><td>Standard-Bundesbüro (Default)</td></tr>
                    <tr><td>Kollaborativ-Open</td><td>10.0</td><td>21.0</td><td>Open Space, Publikumsverkehr</td></tr>
                    <tr><td>Hybrid-Activity-Based</td><td>9.0</td><td>20.0</td><td>Activity-Based-Working ≥ 40 % Remote</td></tr>
                    <tr><td>Sicherheit-Labor</td><td>18.0</td><td>34.0</td><td>Spezialausstattung, Sicherheit, Labor</td></tr>
                  </tbody>
                </table>
              </article>

              <article id="merkblaetter">
                <h2>Merkblätter & Vorlagen</h2>
                <p>Öffentlich zugängliche Dokumente, die Sie vor oder während der Bedarfsmeldung nutzen können:</p>
                <ul class="attachment-list">
                  <li>📄 Anleitung „Antrag richtig stellen" <span class="badge badge--success">🟢 verifiziert</span> <span class="meta">PDF · 320 KB · DE/FR/IT · Stand 11.05.2026 · <a href="#" onclick="window.portal.toast('Download simuliert'); return false;">Herunterladen ↓</a></span></li>
                  <li>📄 Checkliste vor der Bedarfsmeldung <span class="badge badge--success">🟢 verifiziert</span> <span class="meta">PDF · 180 KB · DE/FR · Stand 02.05.2026 · <a href="#" onclick="window.portal.toast('Download simuliert'); return false;">Herunterladen ↓</a></span></li>
                  <li>📄 Vorlage SEM-Bedarfsmeldung <span class="badge badge--info">SEM</span> <span class="meta">DOCX · 240 KB · DE/FR · Stand 17.05.2026 · <a href="#" onclick="window.portal.toast('Download simuliert'); return false;">Herunterladen ↓</a></span></li>
                  <li>📄 EDA-Raumprogramm-Formular <span class="badge badge--info">EDA</span> <span class="meta">PDF · 410 KB · DE/FR · Stand 22.04.2026 · <a href="#" onclick="window.portal.toast('Download simuliert'); return false;">Herunterladen ↓</a></span></li>
                  <li>📄 NAW-Klassifizierung Übersicht <span class="meta">PDF · 290 KB · DE · Stand 10.01.2026 · <a href="#" onclick="window.portal.toast('Download simuliert'); return false;">Herunterladen ↓</a></span></li>
                </ul>
              </article>

              <article id="schulungen">
                <h2>Schulungen & Erklärvideos</h2>
                <p>Der BBL bietet regelmässige Schulungen für Bundes-Mietende. Aufzeichnungen ergänzen den Hybrid-Modus.</p>
                <ul style="line-height: var(--line-height-relaxed); padding-left: var(--space-lg);">
                  <li><strong>Mieterportal kompakt</strong> (60 Min., DE/FR) — Einstieg in das Portal, geeignet für neue Logistikbeauftragte. Nächste Termine: 03.06., 17.06., 02.07.2026.</li>
                  <li><strong>Bedarf richtig erfassen</strong> (Aufbaukurs, 90 Min., DE) — Vertiefung NAW-Klassifizierung, FUNC-AU-019-Felder, Anhänge-Management. Termin: 11.06.2026.</li>
                  <li><strong>SEM-Spezialschulung</strong> (45 Min., DE/FR) — Bettenplatz-Logik, Verfahrensräume, Pauschalansatz. Termin: 25.06.2026.</li>
                </ul>
                <p style="margin-top: var(--space-md);">Anmeldung über die <a href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">BBL-Geschäftsstelle</a>.</p>
              </article>

              <article id="glossar">
                <h2>Glossar</h2>
                <dl class="glossary">
                  <dt>BBL</dt><dd>Bundesamt für Bauten und Logistik.</dd>
                  <dt>BK</dt><dd>Buchungskreis — buchhalterische Organisation. BBL hat den Buchungskreis 1086; jede Immobilie im BBL-Portfolio trägt diesen BK.</dd>
                  <dt>Bundeskanzlei (BK)</dt><dd>Stabsstelle des Bundesrates. Hat keine Generalsekretariate — Anträge der BK gehen daher direkt an BBL-PFM (FUNC-FG-005).</dd>
                  <dt>eIAM</dt><dd>Föderales Identity & Access Management — Einmal-Anmeldung der Bundesverwaltung. Ab Dezember 2026 schrittweise Umstellung auf AGOV / E-ID.</dd>
                  <dt>ePPM</dt><dd>SAP Enterprise Portfolio & Project Management — föderales Projektportfoliosystem von BBL.</dd>
                  <dt>FLM</dt><dd>Flächenmanagement.</dd>
                  <dt>GS</dt><dd>Generalsekretariat einer Verwaltungseinheit. Prüft Bedarfsmeldungen vor der Übergabe an BBL.</dd>
                  <dt>ILBO</dt><dd>Logistikbeauftragte/r — Rolle in einer Verwaltungseinheit, die Bedarf erfasst und Liegenschaftsfragen koordiniert.</dd>
                  <dt>NAW</dt><dd>Neue Arbeitswelten — Klassifizierung von Bürowelten, treibt die m²/FTE-Berechnung.</dd>
                  <dt>PFM</dt><dd>Portfolio-Management (bei BBL).</dd>
                  <dt>SEM</dt><dd>Staatssekretariat für Migration — eine VE mit spezialisierten Empfangszentren.</dd>
                  <dt>VE</dt><dd>Verwaltungseinheit — Bundesamt, Sekretariat oder Departement.</dd>
                  <dt>WE</dt><dd>Wirtschaftseinheit — SAP RE-FX-Objekt-Schlüssel im Format BK/WE/Obj, z.B. 1086/2010/AA.</dd>
                </dl>
              </article>

              <article id="kontakt">
                <h2>Kontakt & weitere Quellen</h2>
                <p>Für Fragen, die diese Sammlung nicht beantwortet:</p>
                <ul style="line-height: var(--line-height-relaxed); padding-left: var(--space-lg);">
                  <li><strong>BBL Geschäftsstelle</strong> — <a href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">bbl.admin.ch/de/kontakt ↗</a></li>
                  <li><strong>BIT IT-Support</strong> (technische Fragen zum eIAM-Zugang) — service-desk@bit.admin.ch</li>
                  <li><strong>Anforderungskatalog des Prototyps</strong> — <a href="docs/REQUIREMENTS.md" target="_blank">REQUIREMENTS.md ↗</a></li>
                  <li><strong>Wireframes & Design-Studien</strong> — <a href="docs/WIREFRAMES.md" target="_blank">WIREFRAMES.md ↗</a></li>
                  <li><strong>Quellcode</strong> — <a href="https://github.com/bbl-dres/tenant-portal" target="_blank" rel="noopener">github.com/bbl-dres/tenant-portal ↗</a></li>
                </ul>
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
  // Page state lives in window for stable across re-renders.
  function renderNewsSection(items = P.state.news, perPage = 3) {
    if (!Array.isArray(items)) items = [];
    const totalPages = Math.max(1, Math.ceil(items.length / perPage));
    let page = window._newsPage = window._newsPage || 0;
    if (page >= totalPages) page = window._newsPage = 0;
    const start = page * perPage;
    const visible = items.slice(start, start + perPage);
    const prevDisabled = page === 0;
    const nextDisabled = page >= totalPages - 1;

    return `
      <section class="news-section section section--alt section--lg" aria-labelledby="newsSectionTitle">
        <div class="container">
          <h2 class="section-heading" id="newsSectionTitle">Aktuell</h2>
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
      <a class="profile-card news-card" href="#/news/${n.id}">
        <div class="profile-card__image" style="background-image:url('${n.image}');"></div>
        <div class="profile-card__body">
          <p class="profile-card__date"><strong>${P.escapeHtml(n.type)}</strong> &nbsp;|&nbsp; ${P.formatDate(n.date)}</p>
          <h3 class="profile-card__title">${P.escapeHtml(n.title)}</h3>
          <p class="profile-card__desc">${P.escapeHtml(n.lead.length > 160 ? n.lead.slice(0, 157) + '…' : n.lead)}</p>
        </div>
        ${arrowBtn('profile-card__arrow')}
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
    if (role === 'GS-Prüfer/in') {
      return [
        { id: 'queue', href: '#/queue', label: 'Pendenzen' },
        { id: 'inbox', href: '#/inbox', label: 'Anträge der VE' },
        SERVICES_MENU,
        INFO_LINK,
      ];
    }
    if (role === 'ILBO' || !role) {
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
            <div class="hero__eyebrow">Mieterportal BBL</div>
            <h1 class="hero__title">Bedarf anmelden, Status verfolgen, Dokumente herunterladen.</h1>
            <p class="hero__lead">
              Die zentrale Anlaufstelle für Bundes-Mietende — Bürofläche, Empfangs­zentren, Auslandvertretungen.
              Geführter Ablauf in fünf Schritten; Übergabe an SAP ePPM ohne Medienbruch.
            </p>
            <div class="hero__cta">
              <button class="btn btn--primary btn--lg" onclick="window.portal.login()">↗ Anmelden mit eIAM</button>
              <a href="#/help" class="btn btn--outline btn--lg">Wie funktioniert das Portal?</a>
            </div>
          </div>
          <figure class="hero__figure">
            <img src="https://images.unsplash.com/photo-1568667256549-094345857637?w=1200&q=80"
                 alt="Bundeshaus West in Bern, beispielhaft für die durch BBL bewirtschafteten Bundesimmobilien.">
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
              <p class="section-eyebrow">Erklärvideo</p>
              <h2 class="section-heading" id="explainerTitle">Mieterportal in 90 Sekunden</h2>
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
              <dt style="color: var(--color-text-secondary);">Rollen</dt><dd style="margin: 0;">Logistikbeauftragte (ILBO) · GS-Prüfer/in</dd>
            </dl>

            <button class="btn btn--primary btn--lg" style="margin-top: var(--space-lg);" onclick="window.portal.login()">Als Demo-Nutzerin anmelden</button>

            <p style="font-size: var(--text-body-xs); color: var(--color-text-secondary); margin-top: var(--space-md);">
              Für den Test der GS-Prüfer-Sicht: nach Login die URL <code>#/queue</code> aufrufen, oder direkt <a href="#/queue" onclick="window.t3lite.demoRole('GS-Prüfer/in'); return false;">hier die GS-Rolle aktivieren</a>.
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
    if (role === 'GS-Prüfer/in') return renderQueue();
    return renderSubmitterHome();
  }

  function renderSubmitterHome() {
    const main = shell({ activeNav: 'home', breadcrumb: [{ label: 'Start' }] });
    const userApps = P.state.applications
      .filter(a => a.submitterId === P.state.user.id)
      .filter(a => !['abgeschlossen', 'abgelehnt'].includes(a.status));

    const draft = P.loadDraft();

    const rueckfrage = userApps.filter(a => a.status === 'rueckfrage').length;
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
          <p class="section-eyebrow">Übersicht</p>
          <h1 class="section-heading">Häufig genutzte Dienste</h1>
          <p style="max-width: 60ch; color: var(--color-text-secondary); margin: 0 0 var(--space-2xl);">
            Anfragen, die Bundes-Mietende über das Mieterportal direkt an das BBL stellen können.
          </p>
          <div class="card-grid">
            <a href="#/wizard/1" class="quick-card quick-card--highlight">
              <p class="quick-card__title">Bedarf anmelden</p>
              <p class="quick-card__desc">Unterbringung, Bürofläche oder Auslandvertretung erfassen. Geführter Ablauf in fünf Schritten mit NAW-Klassifizierung und Übergabe an SAP ePPM.</p>
              <p class="quick-card__meta"><span>FUNC-AU-*</span></p>
              ${arrowBtn()}
            </a>
            <a href="#/repair" class="quick-card">
              <p class="quick-card__title">Schaden melden</p>
              <p class="quick-card__desc">Defekte Heizung, Wasserschaden, Beleuchtung oder Schliesssystem? Schnellmeldung an BBL-IM, koordiniert mit Ihrem zuständigen Immobilien-Manager.</p>
              <p class="quick-card__meta"><span>REQ-FA-005</span></p>
              ${arrowBtn()}
            </a>
            <a href="#/downloads" class="quick-card">
              <p class="quick-card__title">Pläne & Dokumente</p>
              <p class="quick-card__desc">Grundrisse, Merkblätter und Schulungsmaterial Ihrer Verwaltungseinheit zum Herunterladen — gefiltert nach Sichtbarkeit und Stand.</p>
              <p class="quick-card__meta"><span>FUNC-LP-007</span></p>
              ${arrowBtn()}
            </a>
            <a href="#/mobiliar" class="quick-card">
              <p class="quick-card__title">Möbel bestellen</p>
              <p class="quick-card__desc">Standard- und Spezialmobiliar via Mobiliar-Shop des Bundes bestellen — angebunden an das Schwesterprojekt „Arbeitsplatz-Management".</p>
              <p class="quick-card__meta"><span>REQ-FA-007</span></p>
              ${arrowBtn()}
            </a>
            <a href="#/moves" class="quick-card">
              <p class="quick-card__title">Umzug & Sonderreinigung</p>
              <p class="quick-card__desc">Transport- oder Reinigungsanfrage erfassen — etwa nach grösseren Reorganisationen, Veranstaltungen oder Mieterwechseln.</p>
              <p class="quick-card__meta"><span>REQ-FA-006</span></p>
              ${arrowBtn()}
            </a>
            <a href="#/training" class="quick-card">
              <p class="quick-card__title">Schulungen</p>
              <p class="quick-card__desc">„Mieterportal kompakt" (60 Min., DE/FR) und Aufbaukurse für ILBO und GS-Prüfende. Termine Q2 2026 zur Anmeldung offen.</p>
              <p class="quick-card__meta"><span>FUNC-LP-007</span></p>
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

  function arrowBtn(extraClass = 'quick-card__arrow-btn') {
    return `
      <span class="arrow-btn ${extraClass}" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </span>
    `;
  }

  function profileCard({ image, title, date, desc, role }) {
    return `
      <a href="#" class="profile-card" onclick="event.preventDefault(); window.t3lite.demoRole('${role}');">
        <div class="profile-card__image" style="background-image:url('${image}');"></div>
        <div class="profile-card__body">
          <p class="profile-card__date">${P.escapeHtml(date)}</p>
          <h3 class="profile-card__title">${P.escapeHtml(title)}</h3>
          <p class="profile-card__desc">${P.escapeHtml(desc)}</p>
        </div>
        ${arrowBtn('profile-card__arrow')}
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
    if (P.state.user.activeRole === 'GS-Prüfer/in') {
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
        <button class="btn btn--primary" id="nextStep">Weiter → Fläche / NAW</button>
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
        draft.pipelineVariant = e.target.value === 'BK' ? 'bk' : 'standard';
        P.persistDraft(draft);
        if (draft.pipelineVariant === 'bk') {
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
        draft.pipelineVariant = draft.pipelineVariant === 'bk' ? 'bk' : 'greenfield';
        draft.sap = null;
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
    draft.sap = { bk: match.bk, we: match.we, obj: match.obj };
    draft.egid = match.egid;
    draft.pipelineVariant = draft.ve === 'BK' ? 'bk' : 'standard';
    const bkOk = match.bk === P.state.masterData.buchungskreisBbl;
    draft.bk1086Ok = bkOk;
    info.innerHTML = `
      <div class="notification-banner notification-banner--${bkOk ? 'success' : 'danger'}">
        <div class="notification-banner__wrapper">
          <p class="notification-banner__text">
            <strong>Erkannt:</strong>
            SAP <code>${match.bk}/${match.we}/${match.obj}</code> · EGID <code>${match.egid}</code>
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
          <p class="form-field__hint">Belegungsfaktor (Desk-Sharing) <strong>0.8</strong> 🔒 — Bundes-Stammdatenvorgabe (FUNC-AU-014).</p>
          <div id="calcBlock"></div>
        </div>
      </div>

      <div class="wizard__sticky-footer">
        <span class="wizard__counter">Schritt 2 / 5</span>
        <button class="btn btn--outline" onclick="window.t3lite.saveDraft()">Entwurf speichern</button>
        <a class="btn btn--outline" href="#/wizard/1">← Zurück</a>
        <button class="btn btn--primary" id="nextStep">Weiter → Anhänge</button>
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
              <dd>${fte} × 0.8 = ${(fte * 0.8).toFixed(1)} → <strong>${c.arbeitsplaetze} AP</strong></dd>
              <dt>HNF2 = ${c.nawHnf2} m²/FTE × FTE × 0.8</dt>
              <dd>${c.nawHnf2} × ${fte} × 0.8 = <strong>${c.hnf2} m²</strong></dd>
              <dt>GF = ${c.nawGf} m²/FTE × FTE × 0.8</dt>
              <dd>${c.nawGf} × ${fte} × 0.8 = <strong>${c.gf} m²</strong></dd>
              <hr>
              <dt>UK-Kosten (vorl., illustrativ)</dt>
              <dd>${P.formatChf(c.ukKosten)}</dd>
              <dt>Möblierung CHF 650/m² HNF2</dt>
              <dd>${P.formatChf(c.moeblierung)}</dd>
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
        <button class="btn btn--primary" id="nextStep">Weiter → ${draft.type === 'Grossantrag' ? 'Detail' : 'Prüfen & Senden'}</button>
      </div>
    `;
  }

  function attachmentLi(a, i) {
    const badge = a.scanStatus === 'scanning'
      ? '<span class="badge badge--warning">⏳ Virenscan läuft</span>'
      : a.scanStatus === 'ok'
        ? '<span class="badge badge--success">🟢 ok</span>'
        : '<span class="badge badge--danger">✕ abgewiesen</span>';
    return `<li>📎 ${P.escapeHtml(a.name)} ${badge} <span class="meta">${P.escapeHtml(a.size)}</span></li>`;
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
          <button class="btn btn--primary" id="nextStep">Weiter → Prüfen & Senden</button>
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
          <p class="form-field__hint">Vorgeschlagene Termine basierend auf Investitionsvolumen (FUNC-AU-020): <button class="btn btn--ghost btn--sm" type="button" onclick="window.t3lite.suggestDates()">Vorschlag übernehmen</button></p>
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
        <button class="btn btn--primary" id="nextStep">Weiter → Prüfen & Senden</button>
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
        ${section('Schritt 1 — Basisangaben', `${draft.type} · ${draft.ve} · ${P.escapeHtml(draft.address)} ${draft.sap ? `· SAP ${draft.sap.bk}/${draft.sap.we}/${draft.sap.obj}` : draft.greenfield ? '· ◼ Greenfield' : ''} ${draft.egid ? `· EGID ${draft.egid}` : ''}`, true)}
        ${section('Schritt 2 — Flächenbedarf', c ? `NAW: ${draft.nawClass} · FTE ${c.fte} · HNF2 ${c.hnf2} m² · GF ${c.gf} m² · UK ${P.formatChf(c.ukKosten)}` : 'noch unvollständig', false)}
        ${section('Schritt 3 — Anhänge', (draft.attachments || []).map(a => a.name).join(' · ') || 'keine', false)}
        ${draft.type === 'Grossantrag' ? section('Schritt 4 — Detail-Felder', grossOk ? 'vollständig ausgefüllt' : 'unvollständig', false) : ''}
      </div>

      <div class="wizard__section">
        <h3>Workflow-Vorschau</h3>
        <p style="margin:0;font-size:var(--text-body-sm);">
          Nach dem Senden geht der Antrag an
          ${draft.pipelineVariant === 'bk' ? '<strong>BBL Portfolio-Management</strong> (BK-Pfad — kein GS, FUNC-FG-005)' : '<strong>GS UVEK</strong>'}
          (Bearbeitungszeit gemäss SLA). Sie erhalten eine E-Mail und sehen den Status in der Inbox (🔔, FUNC-FG-004).
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
        <button class="btn btn--primary" id="submitBtn" ${(!allRequired || !hasAtt || (c && c.hardBlocked) || (draft.type === 'Grossantrag' && !grossOk)) ? 'disabled' : ''}>Einreichen →</button>
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
    // Promote draft to a submitted application (in-memory)
    const id = 'BE-2026-' + String(Math.floor(Math.random() * 900 + 100));
    const c = P.calcWizard({ nawClass: draft.nawClass, fte: draft.fte });
    const newApp = {
      id, type: draft.type, pipelineVariant: draft.pipelineVariant,
      status: 'eingereicht',
      submitterId: P.state.user.id, submitterVe: draft.ve, submitterDep: P.state.user.dep,
      submittedAt: new Date().toISOString(),
      address: draft.address,
      sap: draft.sap, egid: draft.egid,
      naw: { class: draft.nawClass, confidence: draft.nawConfidence, answers: draft.nawAnswers },
      fte: draft.fte,
      arbeitsplaetze: c ? c.arbeitsplaetze : null,
      hnf2: c ? c.hnf2 : null, gf: c ? c.gf : null,
      ukKosten: c ? c.ukKosten : null, moeblierung: c ? c.moeblierung : null,
      attachments: draft.attachments || [],
      history: [
        { ts: new Date().toISOString(), actor: P.state.user.name, action: 'Antrag erstellt' },
        { ts: new Date().toISOString(), actor: P.state.user.name, action: 'Eingereicht' }
      ],
      _isNew: true,
    };
    P.state.applications.unshift(newApp);
    P.clearDraft();
    P.state.draft = null;
    P.toast(`Antrag ${id} eingereicht. ${draft.pipelineVariant === 'bk' ? 'Routet an BBL-PFM (BK-Bypass).' : 'Routet an GS.'}`, 'success');
    P.navigate('#/inbox/' + id);
  }

  // ── 5. SUBMITTER INBOX ───────────────────────────────────────────────────
  function renderInbox() {
    if (!P.state.user) { P.navigate('#/'); return; }
    const main = shell({ activeNav: 'inbox', breadcrumb: [{ href: '#/home', label: 'Start' }, { label: 'Meine Anträge' }] });
    const role = P.state.user.activeRole;
    const apps = role === 'GS-Prüfer/in'
      ? P.state.applications.filter(a => a.submitterVe === P.state.user.ve)
      : P.state.applications.filter(a => a.submitterId === P.state.user.id);

    const filter = (location.hash.split('?')[1] || '').split('&').reduce((o, p) => {
      const [k, v] = p.split('='); if (k) o[k] = decodeURIComponent(v || ''); return o;
    }, {});

    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container">
          <h1 style="margin-top:0;">${role === 'GS-Prüfer/in' ? 'Anträge der VE' : 'Meine Anträge'}</h1>
          <div style="display:flex;gap:var(--space-md);margin-bottom:var(--space-md);flex-wrap:wrap;">
            <select id="filterStatus" class="form-field__select" style="min-height:auto;">
              <option value="">Alle Status</option>
              <option value="entwurf">Entwurf</option>
              <option value="eingereicht">Eingereicht</option>
              <option value="in_gs_pruefung">in GS-Prüfung</option>
              <option value="in_pfm_pruefung">in PFM-Prüfung</option>
              <option value="rueckfrage">Rückfrage</option>
              <option value="in_eppm">in ePPM</option>
              <option value="abgeschlossen">Abgeschlossen</option>
            </select>
            <input id="filterText" type="search" class="form-field__input" placeholder="🔍 Suche …" style="flex:1;min-width:200px;min-height:auto;">
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
          <a href="#/wizard/1" class="btn btn--primary">+ Bedarf anmelden</a>
          <a href="#/help" class="btn btn--ghost">Wie funktioniert das Portal? ↗</a>
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
              ${a.status === 'rueckfrage' ? '<button class="btn btn--primary btn--sm" onclick="window.t3lite.startResubmit(\''+a.id+'\')">Auflagen erfüllen → Erneut einreichen</button>' : ''}
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
          ${a.sap ? `
            <p>Objekt-Schlüssel: <code>${a.sap.bk}/${a.sap.we}/${a.sap.obj}</code></p>
            <p>EGID: <code>${a.egid}</code></p>
          ` : '<p>◼ Greenfield — WE/Obj noch nicht vergeben.</p>'}
          ${a.bedarfsmeldungNr ? `<p>Bedarfsmeldung: <strong>${a.bedarfsmeldungNr}</strong></p>` : ''}
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
          <p style="margin:0;">${P.escapeHtml(a.address)}<br>${a.sap ? `<code>${a.sap.bk}/${a.sap.we}/${a.sap.obj}</code> · EGID <code>${a.egid}</code>` : '◼ Greenfield'}</p>
        </div>
        ${a.naw ? `
          <div class="card">
            <h3 class="card__title">Flächenbedarf</h3>
            <p style="margin:0;">NAW: <strong>${a.naw.class}</strong><br>FTE ${a.fte} · AP ${a.arbeitsplaetze} · HNF2 ${a.hnf2} m² · GF ${a.gf} m²<br>UK ${P.formatChf(a.ukKosten)} · Möblierung ${P.formatChf(a.moeblierung)}</p>
          </div>
        ` : a.berths ? `
          <div class="card">
            <h3 class="card__title">SEM-Variante</h3>
            <p style="margin:0;">Schlafplätze: <strong>${a.berths}</strong> (Familie ${a.berthsFamily} · Einzel ${a.berthsSingle} · Mehrbett ${a.berthsShared})<br>Investitionspauschale ${P.formatChf(a.investitionspauschale)}</p>
          </div>
        ` : ''}
        ${a.status === 'rueckfrage' && a.auflagen ? `
          <div class="card" style="grid-column: 1 / -1;border-left: 4px solid var(--color-warning);">
            <h3 class="card__title">↻ Rückfrage / Offene Auflagen</h3>
            <p style="margin:0 0 var(--space-sm);font-size:var(--text-body-sm);"><strong>Begründung GS:</strong> ${P.escapeHtml(a.reviewerBegruendung)}</p>
            <ul class="auflagen-list">
              ${a.auflagen.map((x, i) => `
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
      return ['eingereicht', 'in_gs_pruefung', 'rueckfrage'].includes(a.status)
          && a.pipelineVariant !== 'bk';
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
            <button class="btn btn--outline btn--sm" onclick="window.t3lite.openBatchApprove()">Bulk: ☑ Genehmigen</button>
            <button class="btn btn--ghost btn--sm">Bulk: Zuweisen</button>
            <button class="btn btn--ghost btn--sm">Bulk: Mehr Info anfragen</button>
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
                  ${a.sap ? `<tr><th>SAP / EGID</th><td><code>${a.sap.bk}/${a.sap.we}/${a.sap.obj}</code> · ${a.egid}</td></tr>` : ''}
                  ${a.naw ? `<tr><th>NAW-Klasse</th><td>${a.naw.class} (Konfidenz ${Math.round((a.naw.confidence || 0) * 100)} %)</td></tr>` : ''}
                  ${a.fte ? `<tr><th>FTE / AP</th><td>${a.fte} / ${a.arbeitsplaetze}</td></tr>` : ''}
                  ${a.hnf2 ? `<tr><th>HNF2 / GF</th><td>${a.hnf2} m² / ${a.gf} m²</td></tr>` : ''}
                  ${a.ukKosten ? `<tr><th>UK-Kosten</th><td>${P.formatChf(a.ukKosten)}</td></tr>` : ''}
                  ${a.berths ? `<tr><th>SEM Schlafplätze</th><td>${a.berths} (Pauschale ${P.formatChf(a.investitionspauschale)})</td></tr>` : ''}
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
                <button class="btn btn--primary btn--sm" id="saveDecision">Entscheid speichern</button>
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
        a.status = 'genehmigt';
        setTimeout(() => {
          a.status = 'in_eppm';
          a.bedarfsmeldungNr = 'BM-2026-00' + Math.floor(Math.random() * 900 + 100);
          P.toast(`ePPM-Übergabe erfolgreich: ${a.bedarfsmeldungNr}`, 'success');
        }, 2000);
      } else if (dec === 'auflage') {
        a.status = 'rueckfrage';
        a.reviewerBegruendung = begr;
        a.auflagen = a.auflagen || [{ field: 'fte', comment: begr, done: false }];
      } else {
        a.status = 'abgelehnt';
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
    // Show all tenancies for this VE (or all if user has BBL roles)
    const isBblView = ['BBL-PFM', 'BBL-Campus', 'Auditor'].includes(P.state.user.activeRole);
    const tenancies = isBblView
      ? P.state.tenancies
      : P.state.tenancies.filter(t => t.ve === ve || t.dep === ve);

    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container">
          <p class="section-eyebrow">Übersicht</p>
          <h1 class="section-heading">Liegenschaften ${isBblView ? '(BBL-Sicht)' : 'Ihrer Verwaltungs­einheit'}</h1>
          <p style="color:var(--color-text-secondary);max-width: 60ch;margin: 0 0 var(--space-xl);">
            ${isBblView
              ? 'Sie sehen alle vom BBL verwalteten Mietverhältnisse. Klicken Sie eine Liegenschaft für Mieter, Vertragslaufzeit, Anliegen und Dokumente.'
              : `Mietverhältnisse Ihrer Verwaltungs­einheit <strong>${P.escapeHtml(ve)}</strong> bei der BBL. Pro Objekt sehen Sie Ansprech­personen, Vertragsdaten und offene Anliegen.`
            }
          </p>

          ${tenancies.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state__glyph">🏛</div>
              <h2 class="empty-state__title">Keine Mietverhältnisse erfasst</h2>
              <p class="empty-state__lead">Für Ihre Verwaltungs­einheit ist im BBL-Portfolio derzeit kein Mietverhältnis hinterlegt. Wenn das ein Fehler ist, kontaktieren Sie BBL-PFM.</p>
              <div class="empty-state__cta">
                <a href="#/wizard/1" class="btn btn--primary">+ Bedarf anmelden</a>
                <a href="https://www.bbl.admin.ch/de/kontakt" target="_blank" class="btn btn--ghost">Kontakt BBL ↗</a>
              </div>
            </div>
          ` : `
            <div class="property-grid">
              ${tenancies.map(propertyCard).join('')}
            </div>
          `}
        </div>
      </section>
    `;
  }

  function propertyCard(t) {
    const issuesBadge = t.openIssues > 0
      ? `<span class="badge badge--warning">${t.openIssues} offen</span>`
      : `<span class="badge badge--success">keine offenen Anliegen</span>`;
    return `
      <a href="#/properties/${t.id}" class="property-card">
        <div class="property-card__image" style="background-image:url('${t.image}');"></div>
        <div class="property-card__body">
          <p class="property-card__sap">${t.sap} · EGID ${t.egid}</p>
          <h3 class="property-card__title">${P.escapeHtml(t.buildingName)}</h3>
          <p class="property-card__address">${P.escapeHtml(t.address)} · ${P.escapeHtml(t.floor)}</p>
          <div class="property-card__meta">
            <span>${t.hnf2} m² HNF2</span>
            <span>${t.arbeitsplaetze} AP</span>
            <span>${P.formatChf(t.yearlyCost)} / Jahr</span>
          </div>
          <div class="property-card__footer">
            ${issuesBadge}
            <span style="font-size:var(--text-body-xs);color:var(--color-text-muted);">${P.escapeHtml(t.pfmKategorie)}</span>
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
              <div style="position:absolute;inset:auto 0 0 0;background:linear-gradient(transparent,rgba(0,0,0,0.7));padding:var(--space-lg);color:#fff;">
                <p style="margin:0 0 var(--space-xs);font-size:var(--text-body-xs);text-transform:uppercase;letter-spacing:1px;opacity:0.85;">${t.sap} · EGID ${t.egid}</p>
                <h1 style="margin:0;font-size:var(--text-h1);color:#fff;">${P.escapeHtml(t.buildingName)}</h1>
                <p style="margin:var(--space-xs) 0 0;opacity:0.9;">${P.escapeHtml(t.address)} · ${P.escapeHtml(t.floor)}</p>
              </div>
            </div>
          </header>

          <div class="property-layout">
            <div>
              <section style="margin-bottom: var(--space-2xl);">
                <p class="section-eyebrow">Mietverhältnis</p>
                <h2 class="section-heading">Vertrag & Mengengerüst</h2>
                <table class="table" style="margin-top:var(--space-md);">
                  <tr><th>Mietende VE</th><td>${P.escapeHtml(t.ve)}${t.dep && t.dep !== t.ve ? ' / ' + P.escapeHtml(t.dep) : ''}</td></tr>
                  <tr><th>PFM-Kategorie</th><td>${P.escapeHtml(t.pfmKategorie)}</td></tr>
                  <tr><th>HNF2 / GF</th><td>${t.hnf2} m² / ${t.gf} m²</td></tr>
                  <tr><th>Arbeitsplätze</th><td>${t.arbeitsplaetze}</td></tr>
                  <tr><th>Mietkosten</th><td>${P.formatChf(t.yearlyCost)} / Jahr</td></tr>
                  <tr><th>Vertragslaufzeit</th><td>${P.formatDate(t.leaseStart)} – ${P.formatDate(t.leaseEnd)} ${t.leaseAuto ? '<span class="badge badge--success">automatisch verlängernd</span>' : '<span class="badge badge--warning">Festlaufzeit</span>'}</td></tr>
                  <tr><th>Restlaufzeit</th><td>~${monthsToEnd} Monate</td></tr>
                </table>
              </section>

              <section style="margin-bottom: var(--space-2xl);">
                <p class="section-eyebrow">Anliegen</p>
                <h2 class="section-heading">Anträge zu dieser Liegenschaft (${related.length})</h2>
                ${related.length === 0
                  ? `<p style="color:var(--color-text-secondary);">Keine offenen oder vergangenen Anträge zu dieser Liegenschaft.</p>`
                  : `<table class="table"><thead><tr><th>Antrag</th><th>Typ</th><th>Eingereicht</th><th>Status</th></tr></thead><tbody>
                       ${related.map(a => `<tr onclick="location.hash='#/inbox/${a.id}';"><td><strong>${a.id}</strong></td><td>${a.type}</td><td>${P.formatDate(a.submittedAt)}</td><td>${P.statusBadge(a.status)}</td></tr>`).join('')}
                     </tbody></table>`}
              </section>

              <section style="margin-bottom: var(--space-2xl);">
                <p class="section-eyebrow">Dokumente</p>
                <h2 class="section-heading">Pläne & Belege zu dieser Liegenschaft</h2>
                <ul class="attachment-list">
                  <li>📐 Grundriss ${P.escapeHtml(t.floor)} · PDF · 4.2 MB · Stand 15.03.2026 <span class="meta"><a href="#" onclick="window.portal.toast('Download simuliert'); return false;">Herunterladen ↓</a></span></li>
                  <li>📄 Mietvertrag (Auszug) · PDF · 1.1 MB · Stand 01.07.2024 <span class="meta"><a href="#" onclick="window.portal.toast('Download simuliert'); return false;">Herunterladen ↓</a></span></li>
                  <li>🛡 Sicherheits- & Brandschutzkonzept · PDF · 2.4 MB · Stand 22.11.2025 <span class="meta"><a href="#" onclick="window.portal.toast('Download simuliert'); return false;">Herunterladen ↓</a></span></li>
                </ul>
              </section>
            </div>

            <aside class="property-aside">
              <div class="card" style="margin-bottom: var(--space-lg);">
                <p class="section-eyebrow" style="margin:0 0 var(--space-sm);">Aktionen</p>
                <div style="display:flex;flex-direction:column;gap:var(--space-sm);">
                  <a href="#/repair?building=${t.buildingId}" class="btn btn--primary">🛠 Schaden / Reparatur melden</a>
                  <a href="#/wizard/1" class="btn btn--outline">+ Bedarf zu dieser Liegenschaft</a>
                  <button class="btn btn--ghost" onclick="window.portal.toast('Umzug-Workflow noch nicht implementiert')">🚚 Umzug anmelden</button>
                  <button class="btn btn--ghost" onclick="window.portal.toast('Sonderreinigung noch nicht implementiert')">🧹 Sonderreinigung anfragen</button>
                </div>
              </div>
              <div class="card">
                <p class="section-eyebrow" style="margin:0 0 var(--space-sm);">Ansprechpersonen BBL</p>
                <dl style="margin:0;display:grid;grid-template-columns:1fr;gap:var(--space-sm);">
                  <div>
                    <dt style="font-size:var(--text-body-xs);color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.4px;">Portfolio-Management</dt>
                    <dd style="margin:0;font-weight:var(--font-weight-semibold);">${P.escapeHtml(t.contacts.bblPfm)}</dd>
                  </div>
                  <div>
                    <dt style="font-size:var(--text-body-xs);color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.4px;">Immobilien-Management</dt>
                    <dd style="margin:0;font-weight:var(--font-weight-semibold);">${P.escapeHtml(t.contacts.bblIm)}</dd>
                  </div>
                  <div>
                    <dt style="font-size:var(--text-body-xs);color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.4px;">Flächenmanagement (FLM)</dt>
                    <dd style="margin:0;font-weight:var(--font-weight-semibold);">${P.escapeHtml(t.contacts.bblFlm)}</dd>
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
          <p class="section-eyebrow">Bibliothek</p>
          <h1 class="section-heading">Pläne & Dokumente</h1>
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
            <input class="form-field__input" type="search" id="filterDocText" placeholder="🔍 Suchen …" style="flex:1;min-width:200px;min-height:auto;">
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

  function sampleDocuments() {
    return [
      { title: 'Merkblatt: Antrag richtig stellen', type: 'Merkblatt', format: 'PDF', size: '320 KB', languages: 'DE · FR · IT', source: 'BBL Campus', responsible: 'E. Frey', stand: '11.05.2026', scope: 'Alle' },
      { title: 'Grundriss Bundeshaus West, 3. OG', type: 'Grundriss', format: 'PDF', size: '4.2 MB', languages: 'DE', source: 'BBL-IM', responsible: 'A. Wirz', stand: '15.03.2026', scope: 'UVEK' },
      { title: 'Schulung „Mieterportal kompakt" (60 Min.)', type: 'Schulung', format: 'MP4', size: '245 MB', languages: 'DE', source: 'BBL Campus', responsible: 'M. Diener', stand: '13.05.2026', scope: 'Alle' },
      { title: 'Vorlage: SEM-Bedarfsmeldung', type: 'Vorlage', format: 'DOCX', size: '180 KB', languages: 'DE · FR', source: 'BBL PFM', responsible: 'H. Ludwig', stand: '17.05.2026', scope: 'SEM' },
      { title: 'Sicherheits- & Brandschutzkonzept BBL', type: 'Merkblatt', format: 'PDF', size: '2.4 MB', languages: 'DE · FR · IT', source: 'BBL Campus', responsible: 'E. Frey', stand: '22.11.2025', scope: 'Alle' },
      { title: 'NAW-Klassen Übersicht (Bürowelten)', type: 'Merkblatt', format: 'PDF', size: '410 KB', languages: 'DE', source: 'BBL PFM', responsible: 'H. Ludwig', stand: '10.01.2026', scope: 'Alle' },
      { title: 'Grundriss Sulgenrain 19, EG', type: 'Grundriss', format: 'PDF', size: '3.8 MB', languages: 'DE', source: 'BBL-IM', responsible: 'H. Studer', stand: '02.04.2026', scope: 'BAFU' },
      { title: 'Vertragsvorlage Mieterportal (Bsp.)', type: 'Vertrag', format: 'PDF', size: '780 KB', languages: 'DE', source: 'BBL PFM', responsible: 'H. Ludwig', stand: '20.02.2026', scope: 'Intern' },
    ];
  }

  function documentCard(d) {
    const icon = ({ PDF: '📄', MP4: '🎥', DOCX: '📝' })[d.format] || '📎';
    return `
      <a href="#" onclick="window.portal.toast('Download simuliert: ${P.escapeHtml(d.title)}'); return false;" class="quick-card" style="min-height:auto;">
        <p class="quick-card__title">${icon} ${P.escapeHtml(d.title)}</p>
        <p class="quick-card__desc">${d.format} · ${d.size} · ${d.languages}</p>
        <p class="quick-card__meta">
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
          <p class="section-eyebrow">Schnellmeldung</p>
          <h1 class="section-heading">Schaden oder Störung melden</h1>
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
              <button type="submit" class="btn btn--primary">Schadensmeldung senden</button>
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
          <p class="section-eyebrow">Konto & Einstellungen</p>
          <h1 class="section-heading">Mein Profil</h1>

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

          <div class="card card--highlight" style="margin-bottom: var(--space-lg);">
            <h2 class="card__title">AGOV / E-ID — geplante Migration</h2>
            <p class="card__lead">Ab Dezember 2026 wird der Zugang für externe Mietende schrittweise von eIAM auf die föderale AGOV-Plattform und das E-ID umgestellt. Sie werden rechtzeitig informiert und müssen nichts vorab unternehmen. Roadmap-Eintrag <code>OP-3</code>.</p>
          </div>

          <button class="btn btn--ghost" onclick="window.portal.logout()">Abmelden</button>
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
          <p class="section-eyebrow">Übersicht</p>
          <h1 class="section-heading">Dienstleistungen des Mieterportals</h1>
          <p style="max-width:60ch;color:var(--color-text-secondary);margin: 0 0 var(--space-2xl);">
            BBL bewirtschaftet die Immobilien der Bundesverwaltung. Über das Mieterportal stellen Bundes-Mietende
            die folgenden Anfragen direkt — geführt, dokumentiert, übergabefähig an SAP ePPM.
          </p>
          <div class="card-grid">
            ${SERVICES_MENU.items.slice(1).map(svc => `
              <a href="${svc.href}" class="quick-card">
                <p class="quick-card__title">${P.escapeHtml(svc.label)}</p>
                <p class="quick-card__desc">${P.escapeHtml(svc.desc || '')}</p>
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
          <p class="section-eyebrow">${reqId}</p>
          <h1 class="section-heading">${P.escapeHtml(title)}</h1>
          <p style="color:var(--color-text-secondary);font-size: var(--text-h4);line-height: var(--line-height-relaxed);margin: 0 0 var(--space-lg);">
            ${P.escapeHtml(lead)}
          </p>
          <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;">
            ${externalUrl ? `<a href="${externalUrl}" target="_blank" rel="noopener" class="btn btn--primary">Zum Schwesterprojekt ↗</a>` : ''}
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
      window._newsPage = target;
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
      P.toast(`Schadensmeldung ${ticketId} an BBL-IM gesendet (${P.escapeHtml(building.contacts.bblIm)}).`, 'success');
      setTimeout(() => P.navigate('#/properties/' + building.id), 800);
    },
    demoRole(role) {
      // Convenience: log in as a demo user whose roles include the requested
      // role. Different profile cards demo different personas (ILBO, GS,
      // BBL-PFM, Auditor) — pick the matching user from users.json.
      const candidate = P.state.users.find(u => u.roles.includes(role));
      if (!candidate) { P.toast('Demo-Profil für ' + role + ' nicht vorhanden.'); return; }
      P.state.user = { ...candidate, activeRole: role };
      P.persistRole(role);
      P.toast(`Angemeldet als ${candidate.name} — Rolle ${P.roleLabel(role)}`, 'success');
      const landing = {
        'ILBO':           '#/home',
        'GS-Prüfer/in':   '#/queue',
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
        title: 'Bulk genehmigen', body,
        actions: [
          { label: 'Abbrechen', variant: 'btn--outline' },
          { label: 'Genehmigen', variant: 'btn--primary', onClick: () => {
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
              a.status = 'genehmigt';
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
      if (!a || !a.auflagen) return;
      a.auflagen[idx].done = !a.auflagen[idx].done;
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
          { label: 'Erneut einreichen', variant: 'btn--primary', onClick: () => {
            const a = P.state.applications.find(x => x.id === appId);
            if (a) {
              a.auflagen?.forEach(x => x.done = true);
              a.status = 'eingereicht';
              a.history.push({ ts: new Date().toISOString(), actor: P.state.user.name, action: 'Resubmission nach Auflagenerfüllung' });
              P.toast('Antrag erneut eingereicht.', 'success');
              P.handleHash();
            }
          }}
        ]
      });
    }
  };

})();
