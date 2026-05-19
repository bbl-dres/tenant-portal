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
  async function loadData(basePath = '../shared/data/') {
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
    const userPill = state.user
      ? `<a class="top-header__action" href="#/profile" aria-label="Profil von ${state.user.name} — Einstellungen">
           ${state.user.name}
         </a>`
      : `<button class="top-header__action top-header__action--primary" onclick="window.portal.login()">↗ Anmelden mit eIAM</button>`;

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

    // Dropdown panels for any items of type 'dropdown'
    const navMenus = navItems.filter(i => i.type === 'dropdown').map(item => `
      <div class="nav-menu" id="navMenu-${item.id}" role="region" aria-label="${item.label}" hidden>
        <div class="nav-menu__inner">
          <button class="nav-menu__close" type="button"
                  onclick="window.portal.toggleNavMenu('${item.id}', false)">
            Schliessen <span aria-hidden="true">×</span>
          </button>
          <h2 class="nav-menu__heading">${item.label}</h2>
          <ul class="nav-menu__list">
            ${(item.items || []).map((sub, i) => {
              const isFirst = i === 0;
              return `
                <li class="nav-menu__item ${isFirst ? 'nav-menu__item--first' : ''}">
                  <a class="nav-menu__link" href="${sub.href}">
                    ${sub.label}
                    ${isFirst ? '' : '<span class="nav-menu__arrow" aria-hidden="true">→</span>'}
                  </a>
                </li>
              `;
            }).join('')}
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
              <a class="top-bar__link" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">Kontakt</a>
              <a class="top-bar__link" href="#/help">Hilfe</a>
              <span class="top-bar__sep" aria-hidden="true"></span>
              <div class="language-switcher" id="langSwitch">
                <button class="top-bar__lang" aria-label="Sprache wählen" aria-haspopup="true"
                        onclick="document.getElementById('langSwitch').classList.toggle('open')">
                  DE
                  <svg viewBox="0 0 12 12" aria-hidden="true"><polyline points="2,4 6,8 10,4" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
                </button>
                <div class="language-switcher__dropdown" role="listbox">
                  <button class="language-switcher__option language-switcher__option--active" role="option">Deutsch</button>
                  <button class="language-switcher__option" role="option" onclick="window.portal.toast('FR-Lokalisation noch nicht implementiert')">Français</button>
                  <button class="language-switcher__option" role="option" onclick="window.portal.toast('IT-Lokalisation noch nicht implementiert')">Italiano</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="top-header">
          <div class="top-header__inner">
            <div class="top-header__left" onclick="window.portal.navigate('#/')" role="link" tabindex="0">
              <img class="top-header__bundmark" src="../shared/assets/BundLogo.svg"
                   alt="Schweizerische Eidgenossenschaft · Confédération suisse · Confederazione Svizzera · Confederaziun svizra"
                   width="259" height="64">
              <div class="top-header__divider" aria-hidden="true"></div>
              <div class="top-header__dept">
                <strong>Bundesamt für Bauten und Logistik BBL</strong><br>
                <span class="top-header__dept-sub">${deptSub}</span>
              </div>
            </div>
            <div class="top-header__right">
              <div class="top-header__actions">
                <div class="header-search" id="headerSearch">
                  <button class="header-search__toggle" type="button"
                          aria-expanded="false" aria-controls="headerSearchForm"
                          onclick="window.portal.toggleSearch(true)">
                    <span>Suche</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
                  </button>
                  <form class="header-search__form" id="headerSearchForm" role="search" aria-label="Portal durchsuchen"
                        onsubmit="event.preventDefault(); window.portal.toast('Suche noch nicht implementiert');">
                    <input class="header-search__input" id="headerSearchInput" type="search"
                           placeholder="Suchbegriff eingeben" aria-label="Suchbegriff eingeben"
                           autocomplete="off"
                           onblur="setTimeout(() => window.portal.toggleSearch(false), 120);"
                           onkeydown="if(event.key==='Escape') window.portal.toggleSearch(false);">
                    <button class="header-search__submit" type="submit" aria-label="Suchen">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
                    </button>
                  </form>
                </div>
                ${userPill}
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
            </div>

            <div class="footer-information__col footer-information__col--links">
              <h3 class="footer-information__heading">Weitere Informationen</h3>
              <ul class="footer-information__list">
                <li><a href="https://www.bbl.admin.ch/bbl/de/home/das-bbl/rechtliche-grundlagen.html" target="_blank" rel="noopener">Rechtliche Grundlagen <span class="footer-information__arrow" aria-hidden="true">→</span></a></li>
                <li><a href="https://www.bbl.admin.ch/bbl/de/home/themen/e-rechnung.html" target="_blank" rel="noopener">E-Rechnung <span class="footer-information__arrow" aria-hidden="true">→</span></a></li>
                <li><a href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">Kontakt <span class="footer-information__arrow" aria-hidden="true">→</span></a></li>
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
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
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
    toast, modal, toggleSearch, toggleNavMenu,
    openRoleMenu, login, logout,
    statusBadge, statusKey,
    formatChf, formatDate, escapeHtml, roleLabel,
    PIPELINE_STANDARD, PIPELINE_BK, PIPELINE_GREENFIELD,
  };

})(window);
