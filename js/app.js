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

import {
// formatters + escapers
formatChf, formatDate, escapeHtml, escapeJs,
formatAddressLine, formatAssetKey, flattenFeature, roleLabel,
// storage primitives
safeGet, safeSet, safeRemove,
// UI primitives
toast, modal, ICONS, icon, statusBadge, attachmentLi,
PIPELINE_STANDARD, PIPELINE_BK, PIPELINE_GREENFIELD,
renderPipeline, renderStepIndicator,
renderShortcutOverlay, wireGlobalShortcuts,
} from './lib.js';
import { state, loadData } from './state.js';
import {
  renderShell, renderFooter, renderShareBar, copyShareLink,
  toggleNavMenu, toggleLang, pickLang, submitSearch, toggleSearch, toggleBurger,
  shell, publicNavItems, authNavItems, SERVICES_MENU,
} from './shell.js';
import {
  persistDraft, loadDraft, clearDraft, persistRole, loadRole,
} from './state.js';
import {
  calcWizard, deriveNawClass, ensureDraft, renderWizard, submitDraft,
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
            ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"/></svg>'
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

// ── EXPORT ───────────────────────────────────────────────────────────────
window.portal = {
  state, loadData,
  persistDraft, loadDraft, clearDraft, persistRole, loadRole,
  registerRoute, navigate, handleHash,
  renderShell, renderFooter, renderShortcutOverlay, wireGlobalShortcuts,
  renderPipeline, renderStepIndicator,
  calcWizard, deriveNawClass,
  toast, modal, toggleSearch, toggleNavMenu, toggleBurger, renderShareBar, copyShareLink, submitSearch, toggleLang, pickLang,
  openRoleMenu, login, logout,
  statusBadge,
  formatChf, formatDate, escapeHtml, escapeJs, roleLabel, icon,
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

// Hashes that work for an unauthenticated visitor. Everything else is a
// detail/list view behind the eIAM-equivalent gate and must auto-login
// first so shareable deep links resolve to the intended page.
const PUBLIC_HASHES = new Set(['', '#', '#/', '#/login', '#/info']);

async function init() {
  await P.loadData('data/');
  P.wireGlobalShortcuts();
  registerRoutes();
  // Deep-link auto-login: a user opening a shared URL like
  // `#/properties/T-2011-AA-01/floors/1OG` would otherwise be bounced to
  // `#/` because every detail handler does `if (!state.user) navigate('#/')`.
  // In production this is where eIAM session restore happens — for the
  // prototype we silently grant the first multi-role demo user so the
  // intended route renders directly. Toast + navigate() are skipped
  // because we want to land on the URL the user actually typed.
  const initialPath = (location.hash.split('?')[0] || '').toLowerCase();
  if (!state.user && !PUBLIC_HASHES.has(initialPath)) {
    const user = state.users.find(u => u.roles.length > 1) || state.users[0];
    if (user) {
      state.user = { ...user };
      const persistedRole = loadRole();
      state.user.activeRole = persistedRole || user.roles[0];
    }
  }
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
  P.registerRoute('#/properties/:id/floors/:floorSlug', renderFloorDetail);
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
// CD Bund search-results pattern caps each origin-group at a small
// number and offers a "view all in [origin]" link below. Less overwhelm
// than one mega-list, lets the user pivot to the canonical paginated
// surface (inbox / properties / news) when they want to keep digging.
const SEARCH_GROUP_CAP = 10;
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

  // Renderers for each origin-group's row. Each row uses the CD card-list
  // pattern: meta-info above title, title + lead in the body, chevron-right
  // affordance on the right. `__type` highlights the canonical entity-type
  // pill so users can scan by origin at a glance.
  const searchRow = ({ href, type, meta, title, lead, onclick }) => `
    <li class="search-results__item">
      <a class="search-results__link" href="${href}" ${onclick ? `onclick="${onclick}"` : ''}>
        <div class="search-results__body">
          <p class="meta-info search-results__meta">
            <span class="meta-info__item search-results__type">${P.escapeHtml(type)}</span>
            ${meta ? `<span class="meta-info__item">${meta}</span>` : ''}
          </p>
          <h3 class="search-results__title">${P.escapeHtml(title)}</h3>
          ${lead ? `<p class="search-results__lead">${P.escapeHtml(lead)}</p>` : ''}
        </div>
        <svg class="search-results__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="9 18 15 12 9 6"/></svg>
      </a>
    </li>
  `;

  document.getElementById('page-body').innerHTML = `
    ${P.renderShareBar()}

    <section class="section section--alt search-hero">
      <div class="container">
        <h1 class="h1 search-hero__title">Suchergebnisse${query ? ` für „${P.escapeHtml(query)}"` : ''}</h1>
        <form class="search-hero__form" role="search" aria-label="Portal durchsuchen"
              onsubmit="event.preventDefault(); const v = this.elements.q.value.trim(); if (v) location.hash = '#/search?q=' + encodeURIComponent(v);">
          <div class="search-hero__field">
            ${P.icon('search')}
            <input type="search" name="q" class="input search-hero__input"
                   value="${P.escapeHtml(query)}"
                   placeholder="Suchbegriff eingeben …"
                   aria-label="Suchbegriff"
                   autocomplete="off">
          </div>
          <button class="btn btn--filled" type="submit">Suchen</button>
        </form>
        ${query && total > 0
          ? `<p class="search-hero__meta">${total} ${total === 1 ? 'Treffer' : 'Treffer'} in ${[matches.news.length && 'Aktuell', matches.applications.length && 'Anträge', matches.properties.length && 'Liegenschaften', matches.info.length && 'Arbeitsinstrumente'].filter(Boolean).join(', ')}.</p>`
          : ''}
      </div>
    </section>

    <section class="section">
      <div class="container container--narrow">
        ${!query ? `
          <p class="section-intro">Bitte geben Sie einen Suchbegriff oben ein.</p>
        ` : total === 0 ? `
          <div class="search-no-results">
            <h2 class="h3 search-no-results__title">Die Suche nach <strong>„${P.escapeHtml(query)}"</strong> ergab keine Treffer.</h2>

            <h3 class="h4 search-no-results__heading">Tipps zur Suche</h3>
            <ul class="search-no-results__list">
              <li>Überprüfen Sie die Schreibweise Ihres Suchbegriffs.</li>
              <li>Verwenden Sie einen anderen oder allgemeineren Begriff.</li>
              <li>Versuchen Sie es mit weniger Suchbegriffen.</li>
              <li>Durchsuchen Sie die <a href="#/info">Arbeitsinstrumente und Informationen</a>.</li>
            </ul>

            <h3 class="h4 search-no-results__heading">Hinweis</h3>
            <p class="search-no-results__hint">
              Die Suche durchsucht aktuell Ihre Anträge, freigegebene Liegenschaften, News-Einträge und die Informationsseite. Erweiterte Suchfilter werden in einer späteren Iteration ergänzt.
            </p>
          </div>
        ` : `
          ${matches.news.length ? `
            <section class="search-results__group">
              <h2 class="h3 search-results__group-title">Aktuell <span class="search-results__group-count">(${matches.news.length})</span></h2>
              <ul class="search-results">
                ${matches.news.slice(0, SEARCH_GROUP_CAP).map(n => searchRow({
                  href: `#/news/${n.id}`,
                  type: n.type || 'Aktuell',
                  meta: P.formatDate(n.date),
                  title: n.title,
                  lead: n.lead.slice(0, 180) + (n.lead.length > 180 ? '…' : ''),
                })).join('')}
              </ul>
              ${matches.news.length > SEARCH_GROUP_CAP ? `<p class="search-results__more"><a href="#/news">${matches.news.length - SEARCH_GROUP_CAP} weitere in der News-Übersicht ansehen →</a></p>` : ''}
            </section>
          ` : ''}

          ${matches.applications.length ? `
            <section class="search-results__group">
              <h2 class="h3 search-results__group-title">Anträge <span class="search-results__group-count">(${matches.applications.length})</span></h2>
              <ul class="search-results">
                ${matches.applications.slice(0, SEARCH_GROUP_CAP).map(a => searchRow({
                  href: `#/inbox/${a.id}`,
                  type: a.type || 'Antrag',
                  meta: `Eingereicht ${P.formatDate(a.submittedAt)}`,
                  title: `${a.id} — ${a.address}`,
                  lead: '',
                })).join('')}
              </ul>
              ${matches.applications.length > SEARCH_GROUP_CAP ? `<p class="search-results__more"><a href="#/inbox">${matches.applications.length - SEARCH_GROUP_CAP} weitere Anträge in der Inbox →</a></p>` : ''}
            </section>
          ` : ''}

          ${matches.properties.length ? `
            <section class="search-results__group">
              <h2 class="h3 search-results__group-title">Liegenschaften <span class="search-results__group-count">(${matches.properties.length})</span></h2>
              <ul class="search-results">
                ${matches.properties.slice(0, SEARCH_GROUP_CAP).map(t => searchRow({
                  href: `#/properties/${t.id}`,
                  type: 'Liegenschaft',
                  meta: formatAssetKey(t.assetKey),
                  title: t.buildingName,
                  lead: `${t.address} · ${t.hnf2} m² HNF2`,
                })).join('')}
              </ul>
              ${matches.properties.length > SEARCH_GROUP_CAP ? `<p class="search-results__more"><a href="#/properties?q=${encodeURIComponent(query)}">${matches.properties.length - SEARCH_GROUP_CAP} weitere Liegenschaften im Portfolio →</a></p>` : ''}
            </section>
          ` : ''}

          ${matches.info.length ? `
            <section class="search-results__group">
              <h2 class="h3 search-results__group-title">Arbeitsinstrumente und Informationen <span class="search-results__group-count">(${matches.info.length})</span></h2>
              <ul class="search-results">
                ${matches.info.map(it => searchRow({
                  href: '#/info',
                  type: 'Information',
                  meta: '',
                  title: it.label,
                  lead: 'Abschnitt auf der Info-Seite öffnen.',
                  onclick: `setTimeout(() => window.t3lite.scrollToInfo('${it.id}'), 100);`,
                })).join('')}
              </ul>
            </section>
          ` : ''}

        `}
      </div>
    </section>
  `;

  // Move keyboard focus into the hero search field — most users land on
  // this page intending to refine the query.
  setTimeout(() => {
    const input = document.querySelector('.search-hero__input');
    if (input) {
      input.focus();
      // Place caret at end without selecting all
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }
  }, 0);
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
        <header class="info-page__header">
          <p class="meta-info">
            <span class="meta-info__item">Stand: ${P.formatDate(new Date().toISOString())}</span>
            <span class="meta-info__item">Öffentlich · kein Login nötig</span>
          </p>
          <h1 class="info-page__title">Arbeitsinstrumente und Informationen</h1>
          <p class="section-intro section-intro--tight">
            Erklärungen, Merkblätter, Vorlagen und Schulungsmaterial rund um das Mieterportal.
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
              <ol>
                <li><strong>Entwurf</strong> — Sie erfassen den Bedarf im fünfstufigen Wizard. Eingaben werden automatisch zwischengespeichert.</li>
                <li><strong>Eingereicht → in GS-Prüfung</strong> — Das Generalsekretariat prüft die Angaben feldweise. Bei Rückfragen erhalten Sie einen kommentierten Auflagenkatalog zur Nachbearbeitung.</li>
                <li><strong>Genehmigt → in ePPM</strong> — Die freigegebene Meldung wird automatisch an SAP ePPM übergeben. BBL-PFM eröffnet die Projektakte und vergibt eine Bedarfsmeldungs-Nummer.</li>
                <li><strong>Abgeschlossen</strong> — Nach Umsetzung gilt die Akte als abgeschlossen. Die Historie bleibt im Mieterportal abrufbar.</li>
              </ol>
              <p>Zwei Spezialfälle:</p>
              <ul>
                <li><strong>Bundeskanzlei-Pfad</strong> — Anträge der BK werden ohne GS-Prüfung direkt dem BBL Portfolio-Management vorgelegt.</li>
                <li><strong>Greenfield-Pfad</strong> — Wenn das Objekt noch keinen SAP RE-FX-Eintrag hat, ergänzt BBL vor der ePPM-Übergabe einen Schritt „Wirtschaftseinheit anlegen".</li>
              </ul>
            </article>

            <article id="naw">
              <h2>NAW & Bürowelten erklärt</h2>
              <p>Die NAW-Klassen sind die föderale Vorgabe für die Flächenberechnung von Büroarbeitsplätzen. Jede Klasse hat eine eigene m²/FTE-Basis; multipliziert mit dem fixen Belegungsfaktor 0.8 (Desk-Sharing) ergibt sie HNF2 und GF.</p>
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
              <p class="text-note">
                <strong>Hinweis:</strong> Formulare und Checklisten werden direkt im Mieterportal geführt — separate Vorlagen-Downloads entfallen.
              </p>
            </article>

            <article id="schulungen">
              <h2>Ausbildung</h2>
              <p>Hier finden Sie aktuelle Informationen zu den Ausbildungen rund um das Mieterportal des BBL. Logistikbeauftragte und weitere am Bedarfsprozess beteiligte Personen werden stufengerecht geschult und damit befähigt, ihre Rolle effizient wahrzunehmen.</p>

              <h3>Anmeldungen Ausbildung Mieterportal</h3>
              <div class="accordion accordion--inset">
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

          </main>

          <aside class="page-with-toc__toc" aria-label="Inhaltsverzeichnis">
            <h2 class="page-with-toc__toc-title">Inhaltsverzeichnis</h2>
            <ul class="page-with-toc__toc-list">
              ${INFO_TOC.map((it, i) => `
                <li class="page-with-toc__toc-item ${i === 0 ? 'page-with-toc__toc-item--active' : ''}">
                  <a class="page-with-toc__toc-link" href="#${it.id}"
                     onclick="event.preventDefault(); window.t3lite.scrollToInfo('${it.id}');">
                    <span class="page-with-toc__toc-label">${P.escapeHtml(it.label)}</span>
                    <svg class="page-with-toc__toc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="9 18 15 12 9 6"/></svg>
                  </a>
                </li>
              `).join('')}
            </ul>
          </aside>
        </div>
      </div>
    </section>

    <section class="section section--alt contact-section" id="kontakt" aria-labelledby="kontakt-heading">
      <div class="container">
        <div class="contact-section__grid">
          <div class="contact-section__info">
            <h2 class="h2 contact-section__heading" id="kontakt-heading">BBL Bundesamt für Bauten und Logistik</h2>
            <p class="contact-block__address">
              Fellerstrasse 21<br>
              CH&#8201;–&#8201;3027 Bern
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
            <p class="contact-block__lead"><strong>Abteilung Immobilienmanagement</strong></p>
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
  // Scroll-spy watches the article anchors inside the TOC content column
  // AND any top-level anchored section that the TOC lists — currently the
  // `#kontakt` block was lifted out of the grid into its own
  // `.section--alt` (federal contact pattern, mirrors armasuisse Immo).
  // Build the watch list from `INFO_TOC` ids so adding a new entry there
  // is enough — no need to keep this selector list in sync by hand.
  const targets = INFO_TOC
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

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-30% 0% -55% 0%', threshold: 0 });

  targets.forEach(t => observer.observe(t));
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
const NEWS_PAGE_SIZE = 10;
function renderNewsList() {
  shell({ breadcrumb: [{ href: '#/', label: 'Start' }, { label: 'News-Übersicht' }] });
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
          <h1 class="news-list__title">News-Übersicht</h1>
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
    ${P.renderShareBar({ backTo: '#/news', backLabel: 'News-Übersicht' })}
    <article class="section">
      <div class="container container--reading">
        <p class="overtitle">${P.escapeHtml(n.type)}</p>
        <h1 class="news-detail__title">${P.escapeHtml(n.title)}</h1>
        <p class="meta-info">
          <span class="meta-info__item">Veröffentlicht am ${P.formatDate(n.date)}</span>
        </p>
        <img class="news-detail__image" src="${n.image}" alt="">
        <p class="news-detail__lead">${P.escapeHtml(n.lead)}</p>
        <p class="news-detail__footer">
          Quelle: ${P.escapeHtml(n.source)} · Verantwortlich: ${P.escapeHtml(n.responsible)} · Stand: ${P.formatDate(n.date)} · DE
        </p>
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
          </p>
          <div class="hero__cta">
            <button class="btn btn--filled btn--lg" type="button" onclick="window.portal.login()">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>
              Anmelden mit eIAM
            </button>
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
            <p class="section-intro">
              Bedarfsmeldung, Statusverfolgung, Pläne und Dokumente — alles an einem Ort.
            </p>
            <a href="#/help" class="btn btn--outline">Häufige Fragen ansehen</a>
          </div>
          <a class="video-thumb"
             href="https://www.youtube.com/watch?v=rin3crkLpRk"
             target="_blank" rel="noopener noreferrer"
             aria-label="Erklärvideo „Mieterportal des Bundes" auf YouTube öffnen">
            <img class="video-thumb__image"
                 src="assets/images/Explain-Video.png"
                 alt=""
                 loading="lazy">
            <div class="video-thumb__header">
              <span class="video-thumb__logo" aria-hidden="true">
                <img class="video-thumb__logo-inner" src="assets/swiss-logo-flag.svg" alt="">
              </span>
              <div class="video-thumb__titles">
                <p class="video-thumb__title">Mieterportal des Bundes</p>
                <p class="video-thumb__author">Bundesamt für Bauten und Logistik</p>
              </div>
            </div>
            <img class="video-thumb__play" src="assets/youtube-play.svg" alt="" aria-hidden="true">
            <span class="video-thumb__cta">
              <img class="video-thumb__cta-icon" src="assets/youtube-play.svg" alt="" aria-hidden="true">
              <span>Watch on YouTube</span>
            </span>
          </a>
        </div>
      </div>
    </section>

    ${renderNewsSection()}
  `;
}

// ── 2. LOGIN STUB ────────────────────────────────────────────────────────
// CD pattern: alt-surface section with a narrow centred container, a
// warning banner with an inline icon, then a single card carrying the
// login form. Replaces the previous inline-styled card.
function renderLogin() {
  const main = shell();
  document.getElementById('page-body').innerHTML = `
    <section class="section section--alt">
      <div class="container">
        <div class="login-page">
          <div class="notification-banner notification-banner--warning notification-banner--page-top" role="status">
            <span class="notification-banner__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </span>
            <div class="notification-banner__wrapper">
              <p class="notification-banner__text">
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
        <div class="card-grid">
          <a href="#/wizard/1" class="card--quick">
            <p class="card--quick__title">Bedarf anmelden</p>
            <p class="card--quick__desc">Unterbringung, Bürofläche oder Auslandvertretung in fünf Schritten erfassen.</p>
            ${arrowBtn()}
          </a>
          <a href="#/properties" class="card--quick">
            <p class="card--quick__title">Liegenschaften Inventar</p>
            <p class="card--quick__desc">Von Ihrer Verwaltungseinheit belegte Liegenschaften mit Vertrags- und Belegungsdaten.</p>
            ${arrowBtn()}
          </a>
          <a href="#/repair" class="card--quick">
            <p class="card--quick__title">Schaden melden</p>
            <p class="card--quick__desc">Defekte Heizung, Wasserschaden, Beleuchtung oder Schliesssystem an BBL-IM melden.</p>
            ${arrowBtn()}
          </a>
          <a href="#/downloads" class="card--quick">
            <p class="card--quick__title">Pläne & Dokumente</p>
            <p class="card--quick__desc">Grundrisse, Merkblätter und Schulungsmaterial Ihrer Verwaltungseinheit.</p>
            ${arrowBtn()}
          </a>
          <a href="https://bbl-dres.github.io/workspace-management/" target="_blank" rel="noopener" class="card--quick link--external">
            <p class="card--quick__title">Möbel bestellen</p>
            <p class="card--quick__desc">Standard- und Spezialmobiliar über den Mobiliar-Shop des Bundes.</p>
            ${arrowBtn()}
          </a>
          <a href="#/moves" class="card--quick">
            <p class="card--quick__title">Umzug & Sonderreinigung</p>
            <p class="card--quick__desc">Transport- oder Reinigungsanfrage nach Reorganisationen oder Mieterwechseln.</p>
            ${arrowBtn()}
          </a>
          <a href="#/training" class="card--quick">
            <p class="card--quick__title">Schulungen</p>
            <p class="card--quick__desc">„Mieterportal kompakt" (60 Min., DE/FR) und Aufbaukurse. Termine Q2 2026.</p>
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

// ── 5. SUBMITTER INBOX ───────────────────────────────────────────────────
const INBOX_PAGE_SIZE = 25;
function renderInbox() {
  if (!P.state.user) { P.navigate('#/'); return; }
  const main = shell({ activeNav: 'inbox', breadcrumb: [{ href: '#/home', label: 'Start' }, { label: 'Meine Anträge' }] });
  const role = P.state.user.activeRole;
  const apps = role === 'GS-Reviewer'
    ? P.state.applications.filter(a => a.submitterVe === P.state.user.ve)
    : P.state.applications.filter(a => a.submitterId === P.state.user.id);

  // URL state: ?status=… (filter chips also write here on click) · ?page=N
  const params = parseHashQuery(location.hash);
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const totalPages = Math.max(1, Math.ceil(apps.length / INBOX_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = apps.slice((safePage - 1) * INBOX_PAGE_SIZE, safePage * INBOX_PAGE_SIZE);

  // Build status filter chips dynamically from what's actually in the
  // user's set, so we never show "Rückfrage" when there are no
  // clarification items. Counts on each chip give an at-a-glance
  // distribution (DS tag-item pattern). Counts are derived from the
  // full apps array, not the paginated slice.
  const STATUS_LABELS = {
    draft: 'Entwurf', submitted: 'Eingereicht', in_review_gs: 'in GS-Prüfung',
    in_review_pfm: 'in PFM-Prüfung', clarification: 'Rückfrage',
    approved: 'genehmigt', in_project: 'in ePPM', closed: 'abgeschlossen', rejected: 'abgelehnt'
  };
  const counts = apps.reduce((o, a) => { o[a.status] = (o[a.status] || 0) + 1; return o; }, {});
  const presentStatuses = Object.keys(STATUS_LABELS).filter(s => counts[s]);

  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container">
        <header class="page-header">
          <div>
            <h1 class="h1 page-header__title">${role === 'GS-Reviewer' ? 'Anträge der VE' : 'Meine Anträge'}</h1>
            <p class="page-header__sub">${apps.length} ${apps.length === 1 ? 'Antrag' : 'Anträge'} insgesamt</p>
          </div>
          <div class="page-header__actions">
            <a class="btn btn--filled btn--sm" href="#/wizard/1">+ Neuer Antrag</a>
          </div>
        </header>

        ${apps.length === 0 ? renderInboxEmptyState() : `
          <div class="filter-row" role="search">
            <ul class="filter-chips" role="group" aria-label="Status-Filter">
              <li><button type="button" class="tag-item tag-item--active" data-status="" aria-pressed="true">Alle <span class="tag-item__count">${apps.length}</span></button></li>
              ${presentStatuses.map(s => `
                <li><button type="button" class="tag-item" data-status="${s}" aria-pressed="false">${STATUS_LABELS[s]} <span class="tag-item__count">${counts[s]}</span></button></li>
              `).join('')}
            </ul>
            <input id="filterText" type="search" class="input filter-row__search" placeholder="Antrag oder Objekt suchen …" aria-label="Suche">
          </div>

          <table class="table table--zebra table--rows-clickable" aria-label="Anträge">
            <thead>
              <tr>
                <th>Antrag</th><th>Objekt</th><th>Typ</th><th>Eingereicht</th><th>Status</th>
              </tr>
            </thead>
            <tbody id="inboxTbody">
              ${pageItems.map(rowHtml).join('')}
            </tbody>
          </table>
          <p class="table-hint">Klicken Sie eine Zeile, um Details zu öffnen.</p>

          ${renderPagination({
            current: safePage,
            totalPages,
            from: apps.length === 0 ? 0 : (safePage - 1) * INBOX_PAGE_SIZE + 1,
            to: Math.min(safePage * INBOX_PAGE_SIZE, apps.length),
            totalItems: apps.length,
            entitySingular: 'Antrag',
            entityPlural: 'Anträge',
            hrefFor: (p) => '#/inbox' + (p > 1 ? '?page=' + p : ''),
            inputId: 'inboxPaginationInput',
          })}
        `}
      </div>
    </section>
  `;
  if (apps.length > 0) {
    wireInboxFilters(apps);
    wirePaginationInput('inboxPaginationInput');
  }
}

function renderInboxEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__glyph" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M8 28v24a4 4 0 0 0 4 4h40a4 4 0 0 0 4-4V28"/><path d="M8 28l24 14L56 28"/><path d="M16 28V14a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v14"/></svg>
      </div>
      <h2 class="empty-state__title">Noch keine Anträge</h2>
      <p class="empty-state__lead">Sie haben derzeit keine Anträge in Bearbeitung. Beginnen Sie mit einer Bedarfsanmeldung, um Bürofläche, Übernachtungsplätze oder eine Auslandvertretung zu beantragen.</p>
      <div class="empty-state__cta">
        <a href="#/wizard/1" class="btn btn--filled">Bedarf anmelden</a>
        <a href="#/help" class="btn btn--bare">Wie funktioniert das Portal?</a>
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
  const chips = Array.from(document.querySelectorAll('.filter-chips .tag-item'));
  const filterText = document.getElementById('filterText');
  const tbody = document.getElementById('inboxTbody');
  if (!tbody) return;
  let activeStatus = '';

  const apply = () => {
    const t = (filterText?.value || '').toLowerCase();
    const filtered = apps.filter(a =>
      (!activeStatus || a.status === activeStatus) &&
      (!t || a.id.toLowerCase().includes(t) || (a.address || '').toLowerCase().includes(t))
    );
    tbody.innerHTML = filtered.map(rowHtml).join('')
      || `<tr><td colspan="5" class="table-empty">Keine Treffer.</td></tr>`;
  };

  chips.forEach(chip => chip.addEventListener('click', () => {
    activeStatus = chip.getAttribute('data-status') || '';
    chips.forEach(c => {
      const isActive = c === chip;
      c.classList.toggle('tag-item--active', isActive);
      c.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    apply();
  }));

  filterText?.addEventListener('input', apply);
}

// ── 6. APPLICATION DETAIL (submitter view) ───────────────────────────────
function renderApplicationDetail({ id }) {
  if (!P.state.user) { P.navigate('#/'); return; }
  const a = P.state.applications.find(x => x.id === id);
  if (!a) { document.getElementById('page-body').innerHTML = '<div class="container section"><p>Antrag nicht gefunden.</p></div>'; return; }
  const main = shell({ activeNav: 'inbox', breadcrumb: [{ href: '#/home', label: 'Start' }, { href: '#/inbox', label: 'Meine Anträge' }, { label: a.id }] });
  const tab = (location.hash.split('?tab=')[1] || 'daten');

  document.getElementById('page-body').innerHTML = `
    ${P.renderShareBar({ backTo: '#/inbox', backLabel: 'Anträge' })}
    <section class="section">
      <div class="container">
        ${a._isNew ? `
          <div class="notification-banner notification-banner--success app-detail__fresh-banner" role="status">
            <span class="notification-banner__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </span>
            <div class="notification-banner__wrapper">
              <p class="notification-banner__text">
                <strong>Ihr Antrag ${a.id} wurde erfolgreich eingereicht.</strong>
                Sie erhalten in Kürze eine E-Mail-Bestätigung. Status: <em>${({ eingereicht: 'Eingereicht', in_gs_pruefung: 'in GS-Prüfung', in_pfm_pruefung: 'in PFM-Prüfung' })[a.status] || a.status}</em>.
              </p>
            </div>
          </div>
        ` : ''}
        <header class="page-header">
          <div>
            <h1 class="h1 page-header__title">${a.id} <span class="page-header__count">— ${P.escapeHtml(a.address)}</span></h1>
            <p class="page-header__sub">Eingereicht ${P.formatDate(a.submittedAt)} · Typ ${a.type}</p>
          </div>
          <div class="page-header__actions">
            ${a.status === 'clarification' ? `<button class="btn btn--filled btn--sm" type="button" onclick="window.t3lite.startResubmit('${P.escapeJs(a.id)}')">${P.icon('refresh')} Auflagen erfüllen — Erneut einreichen</button>` : ''}
          </div>
        </header>

        ${P.renderPipeline(a)}

        <div class="tabs" role="tablist" aria-label="Antrags-Tabs">
          ${tabBtn('daten',     'Daten',       tab)}
          ${tabBtn('anhaenge',  'Anhänge',     tab)}
          ${tabBtn('historie',  'Historie',    tab)}
          ${tabBtn('sap',       'SAP / ePPM',  tab)}
        </div>

        <div id="detailTab" role="tabpanel" tabindex="0" aria-labelledby="tab-${tab}">${renderDetailTab(a, tab)}</div>
      </div>
    </section>
  `;
  wireTabs(a);
  // Clear "fresh submission" flag after first paint so reload doesn't re-show banner.
  if (a._isNew) setTimeout(() => { delete a._isNew; }, 500);
}

// ARIA tab pattern: only one tab is in the tab order; arrow keys move
// focus between tabs and activate the focused one (auto-activation).
// Home / End jump to first / last. Matches the WAI-ARIA APG Tabs pattern
// and the modern designsystem .tabs component.
function wireTabs(a) {
  const tabs = Array.from(document.querySelectorAll('.tabs [role="tab"]'));
  if (!tabs.length) return;
  const panel = document.getElementById('detailTab');
  const select = (next) => {
    const key = next.getAttribute('data-tab');
    tabs.forEach(t => {
      const isActive = t === next;
      t.classList.toggle('tab--active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      t.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    panel.setAttribute('aria-labelledby', 'tab-' + key);
    panel.innerHTML = renderDetailTab(a, key);
    next.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        select(tabs[(i + 1) % tabs.length]);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        select(tabs[(i - 1 + tabs.length) % tabs.length]);
      } else if (e.key === 'Home') {
        e.preventDefault(); select(tabs[0]);
      } else if (e.key === 'End') {
        e.preventDefault(); select(tabs[tabs.length - 1]);
      }
    });
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

function renderDetailTab(a, tab) {
  if (tab === 'anhaenge') {
    const items = a.attachments || [];
    if (items.length === 0) {
      return `<p class="text-secondary">Keine Anhänge zu diesem Antrag.</p>`;
    }
    return `
      <ul class="attachment-list" aria-label="Anhänge zu diesem Antrag">
        ${items.map(x => attachmentLi(x)).join('')}
      </ul>
      <p class="table-hint">Klicken Sie ein Dokument, um es herunterzuladen. Anhänge bleiben für die Dauer der Aktenführung verfügbar.</p>
    `;
  }
  if (tab === 'historie') {
    // Map eventType → tone for the timeline dot. Aligned with the
    // canonical Application history events from docs/DATAMODEL.md.
    const dotTone = (eventType) => {
      if (!eventType) return '';
      if (/Added|Submitted/i.test(eventType)) return 'history-timeline__dot--info';
      if (/Approved|Closed/i.test(eventType)) return 'history-timeline__dot--success';
      if (/Rejected|Clarification/i.test(eventType)) return 'history-timeline__dot--warning';
      if (/Handover|Project|System/i.test(eventType)) return 'history-timeline__dot--neutral';
      return '';
    };
    return `
      <ol class="history-timeline" aria-label="Ereignisverlauf">
        ${(a.history || []).map(h => `
          <li class="history-timeline__item">
            <span class="history-timeline__dot ${dotTone(h.eventType)}" aria-hidden="true"></span>
            <div class="history-timeline__body">
              <time class="history-timeline__time" datetime="${P.escapeHtml(h.ts)}">${new Date(h.ts).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
              <p class="history-timeline__action"><strong>${P.escapeHtml(h.actor)}</strong> · ${P.escapeHtml(h.action)}</p>
            </div>
          </li>
        `).join('')}
      </ol>
    `;
  }
  if (tab === 'sap') {
    return `
      <div class="card">
        <h3 class="card__title">SAP RE-FX Integration</h3>
        <dl class="sap-dl">
          ${a.assetKey ? `
            <dt>Objekt-Schlüssel</dt>
            <dd><code>${a.assetKey.bk}/${a.assetKey.we}/${a.assetKey.obj}</code></dd>
            <dt>EGID</dt>
            <dd><code>${a.egid}</code></dd>
          ` : `
            <dt>Objekt-Schlüssel</dt>
            <dd><span class="badge badge--greenfield">Greenfield</span> — WE/Obj noch nicht vergeben</dd>
          `}
          ${a.projectNumber ? `
            <dt>Bedarfsmeldung (ePPM)</dt>
            <dd><strong>${P.escapeHtml(a.projectNumber)}</strong></dd>
          ` : ''}
          <dt>Korrelations-ID</dt>
          <dd><code>MP-${(a.id || '').slice(-4)}-Z3K9-F2M8-XQ${(Math.random() * 100 | 0)}</code></dd>
        </dl>
      </div>
    `;
  }
  // Default: Daten
  return `
    <div class="card-grid">
      <div class="card">
        <h3 class="card__title">Antragsteller</h3>
        <p class="card__inset">${P.escapeHtml(P.state.users.find(u => u.id === a.submitterId)?.name || a.submitterId)}<br><span class="card__inset-meta">${a.submitterVe}${a.submitterDep ? ' · ' + a.submitterDep : ''}</span></p>
      </div>
      <div class="card">
        <h3 class="card__title">Standort</h3>
        <p class="card__inset">${P.escapeHtml(a.address)}<br>${a.assetKey ? `<code>${a.assetKey.bk}/${a.assetKey.we}/${a.assetKey.obj}</code> · EGID <code>${a.egid}</code>` : '<span class="badge badge--greenfield">Greenfield</span>'}</p>
      </div>
      ${a.naw ? `
        <div class="card">
          <h3 class="card__title">Flächenbedarf</h3>
          <p class="card__inset">NAW: <strong>${a.naw.class}</strong><br>FTE ${a.fte} · AP ${a.workstations} · HNF2 ${a.hnf2} m² · GF ${a.gf} m²<br>UK ${P.formatChf(a.operatingCosts)} · Möblierung ${P.formatChf(a.furnitureBudget)}</p>
        </div>
      ` : a.extensionData?.berths ? `
        <div class="card">
          <h3 class="card__title">SEM-Variante</h3>
          <p class="card__inset">Schlafplätze: <strong>${a.extensionData.berths}</strong> (Familie ${a.extensionData.berthsFamily} · Einzel ${a.extensionData.berthsSingle} · Mehrbett ${a.extensionData.berthsShared})<br>Investitionspauschale ${P.formatChf(a.extensionData.investmentLumpSum)}</p>
        </div>
      ` : ''}
      ${a.status === 'clarification' && a.conditions ? `
        <div class="card card--clarification">
          <h3 class="card__title card__title--icon">${P.icon('refresh')} Rückfrage / Offene Auflagen</h3>
          <p class="card__justification"><strong>Begründung GS:</strong> ${P.escapeHtml(a.reviewerJustification)}</p>
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
const QUEUE_PAGE_SIZE = 25;
function renderQueue() {
  if (!P.state.user) { P.navigate('#/'); return; }
  const main = shell({ activeNav: 'queue', breadcrumb: [{ label: 'Pendenzen' }], deptSub: 'Mieterportal · GS-Prüfer/in' });
  const queue = P.state.applications.filter(a => {
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
            <p class="page-header__sub">Anträge zur Prüfung in Ihrer Verwaltungseinheit</p>
          </div>
        </header>
        <table class="table table--zebra table--rows-clickable table--compact" aria-label="Pendenzen">
          <thead>
            <tr>
              <th><input type="checkbox" id="selectAll" aria-label="Alle auswählen"></th>
              <th>Antrag</th><th>Antragsteller</th><th>Objekt</th><th>Eingereicht</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(a => `
              <tr data-app-id="${a.id}">
                <td onclick="event.stopPropagation();"><input type="checkbox" class="rowSel" value="${a.id}"></td>
                <td onclick="location.hash='#/review/${a.id}';"><strong>${a.id}</strong></td>
                <td onclick="location.hash='#/review/${a.id}';">${P.escapeHtml(P.state.users.find(u => u.id === a.submitterId)?.name || '')} (${a.submitterVe})</td>
                <td onclick="location.hash='#/review/${a.id}';">${P.escapeHtml(a.address)}</td>
                <td onclick="location.hash='#/review/${a.id}';">${P.formatDate(a.submittedAt)}</td>
                <td onclick="location.hash='#/review/${a.id}';">${P.statusBadge(a.status)}</td>
              </tr>
            `).join('') || `<tr><td colspan="6" class="table-empty">Keine offenen Pendenzen.</td></tr>`}
          </tbody>
        </table>

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
  wirePaginationInput('queuePaginationInput');
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
            <h3 class="reviewer-marks__heading">Prüfung pro Feld</h3>
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
              <textarea class="form-field__textarea" id="reviewBegr"></textarea>
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

  // URL state: ?view=gallery|list|map · ?q=… · ?cat=… · ?page=N
  const params = parseHashQuery(location.hash);
  const view = ['gallery','list','map'].includes(params.view) ? params.view : 'gallery';
  const query = (params.q || '').toLowerCase().trim();
  const category = (params.cat || '').trim();
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);

  // Available categories — derived from the actual data so the dropdown
  // never shows a value with zero matches.
  const categories = Array.from(new Set(allTenancies.map(t => t.portfolioCategory).filter(Boolean))).sort();
  const filtered = filterTenancies(allTenancies, query, category);
  const perPage = view === 'gallery' ? 12 : view === 'list' ? 25 : Infinity;
  const totalPages = view === 'map' ? 1 : Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pageItems = view === 'map' ? filtered : filtered.slice((safePage - 1) * perPage, safePage * perPage);

  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container">
        <header class="page-header">
          <div>
            <h1 class="h1 page-header__title">Liegenschaften ${isBblView ? '(BBL-Sicht)' : 'Ihrer Verwaltungs­einheit'}</h1>
            <p class="section-intro section-intro--tight">
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
          ${propertiesToolbar({ view, query, category, categories })}
          ${renderPropertiesFilterPills({ view, query, category })}

          ${filtered.length === 0 ? `
            <div class="empty-state empty-state--inset">
              <h2 class="empty-state__title">Keine Treffer${query ? ` für „${P.escapeHtml(query)}"` : ''}</h2>
              <p class="empty-state__lead">Versuchen Sie es mit anderen Filtern.</p>
              <div class="empty-state__cta">
                <a href="${buildPropertiesHash({ view, page: 1 })}" class="btn btn--outline">Filter zurücksetzen</a>
              </div>
            </div>
          ` : `
            <div class="property-view property-view--${view}">
              ${view === 'gallery' ? renderGalleryView(pageItems) : ''}
              ${view === 'list'    ? renderListView(pageItems)    : ''}
              ${view === 'map'     ? renderMapView(filtered)      : ''}
            </div>

            ${view !== 'map' ? renderPagination({
              current: safePage,
              totalPages,
              from: filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1,
              to: Math.min(safePage * perPage, filtered.length),
              totalItems: filtered.length,
              entitySingular: 'Liegenschaft',
              entityPlural: 'Liegenschaften',
              hrefFor: (page) => buildPropertiesHash({ view, q: query, cat: category, page }),
            }) : ''}
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
function buildPropertiesHash({ view, q, cat, page }) {
  const parts = [];
  if (view)        parts.push('view=' + encodeURIComponent(view));
  if (q)           parts.push('q='    + encodeURIComponent(q));
  if (cat)         parts.push('cat='  + encodeURIComponent(cat));
  if (page && page > 1) parts.push('page=' + page);
  return '#/properties' + (parts.length ? '?' + parts.join('&') : '');
}

function filterTenancies(list, q, cat) {
  let out = list;
  if (cat) out = out.filter(t => t.portfolioCategory === cat);
  if (q) {
    out = out.filter(t => {
      const hay = [t.buildingName, t.address, formatAssetKey(t.assetKey), t.egid, t.ve, t.dep, t.portfolioCategory]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  return out;
}

function propertiesToolbar({ view, query, category, categories }) {
  // Count + page-position now live in the pagination footer (CD Bund
  // pagination shows "von X Seiten"), so the toolbar only carries the
  // search field, a portfolio-category dropdown, and the view-toggle tabs.
  const tab = (id, label, iconName) => `
    <button class="view-toggle__btn ${view === id ? 'view-toggle__btn--active' : ''}"
            type="button" data-view="${id}"
            aria-pressed="${view === id}">
      ${P.icon(iconName)}<span class="view-toggle__label">${label}</span>
    </button>`;
  return `
    <div class="property-toolbar">
      <div class="property-toolbar__search">
        ${P.icon('search')}
        <input type="search" id="propertiesSearch" class="input property-toolbar__input"
               placeholder="Suche Objekt, Adresse, SAP-WE, EGID, VE …"
               value="${P.escapeHtml(query)}" autocomplete="off">
        ${query ? `<button type="button" class="property-toolbar__clear" aria-label="Suche löschen" data-action="clear-search">${P.icon('x')}</button>` : ''}
      </div>
      <select class="input property-toolbar__select" id="propertiesCategory" aria-label="Portfolio-Kategorie">
        <option value="">Alle Kategorien</option>
        ${categories.map(c => `<option value="${P.escapeHtml(c)}" ${category === c ? 'selected' : ''}>${P.escapeHtml(c)}</option>`).join('')}
      </select>
      <div class="view-toggle" role="group" aria-label="Ansicht wechseln">
        ${tab('gallery', 'Galerie', 'grid')}
        ${tab('list',    'Liste',   'list')}
        ${tab('map',     'Karte',   'map')}
      </div>
    </div>
  `;
}

function renderPropertiesFilterPills({ view, query, category }) {
  const active = [];
  if (query)    active.push({ key: 'q',   label: 'Suche',     value: query });
  if (category) active.push({ key: 'cat', label: 'Kategorie', value: category });
  if (active.length === 0) return '';
  const hrefWithout = (key) => {
    const params = parseHashQuery(location.hash);
    const next = { view, q: params.q || '', cat: params.cat || '', page: 1 };
    next[key === 'q' ? 'q' : 'cat'] = '';
    return buildPropertiesHash(next);
  };
  return `
    <div class="filter-pills" aria-label="Aktive Filter">
      ${active.map(f => `
        <span class="filter-pill">
          <span class="filter-pill__label">${f.label}:</span>
          <span class="filter-pill__value">${P.escapeHtml(f.value)}</span>
          <a class="filter-pill__remove" href="${hrefWithout(f.key)}"
             aria-label="Filter „${P.escapeHtml(f.label)}: ${P.escapeHtml(f.value)}" entfernen">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </a>
        </span>
      `).join('')}
      <a class="filter-pills__clear-all" href="${buildPropertiesHash({ view, page: 1 })}">Alle Filter zurücksetzen</a>
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
        const params = parseHashQuery(location.hash);
        location.hash = buildPropertiesHash({ view, q: value.trim(), cat: params.cat || '', page: 1 });
      }, 220);
    });
  }
  const catSelect = document.getElementById('propertiesCategory');
  if (catSelect) catSelect.addEventListener('change', e => {
    const params = parseHashQuery(location.hash);
    location.hash = buildPropertiesHash({ view, q: params.q || '', cat: e.target.value, page: 1 });
  });
  document.querySelectorAll('.view-toggle__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextView = btn.getAttribute('data-view');
      const params = parseHashQuery(location.hash);
      location.hash = buildPropertiesHash({ view: nextView, q: params.q || '', cat: params.cat || '', page: 1 });
    });
  });
  const clearBtn = document.querySelector('[data-action="clear-search"]');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    const params = parseHashQuery(location.hash);
    location.hash = buildPropertiesHash({ view, q: '', cat: params.cat || '', page: 1 });
  });
  // CD Bund pagination input — generic helper picks up the hrefFor
  // closure stashed by renderPagination.
  wirePaginationInput();
}

function renderGalleryView(items) {
  return `<div class="property-grid">${items.map(propertyCard).join('')}</div>`;
}

function renderListView(items) {
  return `
    <div class="property-list-wrap">
      <table class="table table--zebra table--rows-clickable property-list" aria-label="Liegenschaften">
        <thead>
          <tr>
            <th scope="col">SAP-WE</th>
            <th scope="col">EGID</th>
            <th scope="col">Objekt</th>
            <th scope="col">Adresse</th>
            <th scope="col" class="numeric">HNF2</th>
            <th scope="col" class="numeric">AP</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(t => `
            <tr onclick="location.hash='#/properties/${t.id}'" tabindex="0"
                onkeydown="if(event.key==='Enter')location.hash='#/properties/${t.id}'"
                aria-label="Mietverhältnis ${P.escapeHtml(t.buildingName)} öffnen">
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
function renderPagination({ current, totalPages, from, to, totalItems, entitySingular, entityPlural, hrefFor, inputId }) {
  const id = inputId || 'paginationInput';
  _paginationHrefBuilders.set(id, hrefFor);
  const prevHref = hrefFor(Math.max(1, current - 1));
  const nextHref = hrefFor(Math.min(totalPages, current + 1));
  const prevDisabled = current <= 1;
  const nextDisabled = current >= totalPages;
  const fmt = (n) => n.toLocaleString('de-CH');
  const countText = totalItems === 0
    ? `Keine ${entityPlural}`
    : totalItems === 1
      ? `1 ${entitySingular}`
      : `${fmt(from)}–${fmt(to)} von ${fmt(totalItems)} ${entityPlural}`;
  return `
    <nav class="pagination" role="navigation" aria-label="Seitennavigation">
      <span class="pagination__count" aria-live="polite">${countText}</span>
      <a class="btn btn--outline btn--icon-only" href="${prevHref}" aria-label="Vorherige Seite"
         ${prevDisabled ? 'aria-disabled="true" tabindex="-1"' : ''}>${P.icon('chevronLeft')}</a>
      <input class="pagination__input" type="number"
             id="${id}" min="1" max="${totalPages}" value="${current}"
             aria-label="Seite auswählen">
      <span class="pagination__text">von ${totalPages} Seite${totalPages === 1 ? '' : 'n'}</span>
      <a class="btn btn--outline btn--icon-only" href="${nextHref}" aria-label="Nächste Seite"
         ${nextDisabled ? 'aria-disabled="true" tabindex="-1"' : ''}>${P.icon('chevronRight')}</a>
    </nav>
  `;
}

// Wire the page-input field to navigate on Enter / blur. Looks up the
// hrefFor closure from the Map populated by `renderPagination`.
function wirePaginationInput(inputId) {
  const id = inputId || 'paginationInput';
  const el = document.getElementById(id);
  const hrefFor = _paginationHrefBuilders.get(id);
  if (!el || !hrefFor) return;
  const max = parseInt(el.getAttribute('max'), 10) || 1;
  const go = () => {
    const v = Math.max(1, Math.min(max, parseInt(el.value, 10) || 1));
    location.hash = hrefFor(v);
  };
  el.addEventListener('change', go);
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); go(); }
  });
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
        const veLine = `${P.escapeHtml(t.ve)}${t.dep && t.dep !== t.ve ? ' / ' + P.escapeHtml(t.dep) : ''}`;
        const popup = new maplibregl.Popup({ offset: 22, closeButton: true, maxWidth: '320px' }).setHTML(`
          <div class="property-popup">
            <div class="property-popup__image" role="img" aria-label="Foto: ${P.escapeHtml(t.buildingName)}" style="background-image:url('${t.image}');"></div>
            <div class="property-popup__body">
              <p class="property-popup__title">${P.escapeHtml(t.buildingName)}</p>
              <p class="property-popup__meta">${formatAssetKey(t.assetKey)} · EGID ${t.egid}</p>
              <p class="property-popup__meta">${P.escapeHtml(t.address)}</p>
              <p class="property-popup__meta">${veLine} · ${P.escapeHtml(t.portfolioCategory)}</p>
              <p class="property-popup__meta">${t.hnf2.toLocaleString('de-CH')} m² HNF2 · ${t.workstations} Arbeitsplätze</p>
              <a class="property-popup__link" href="#/properties/${t.id}">Details öffnen →</a>
            </div>
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
  // Status badge moved to the top-left of the image so the body has more
  // room for SAP / address / meta lines. The warning variant calls out
  // open issues; the success variant is shown unobtrusively so an
  // all-green portfolio doesn't look like every card is shouting "ok".
  const issuesBadge = t.openIssues > 0
    ? `<span class="badge badge--warning card--property__status">${t.openIssues} offen</span>`
    : `<span class="badge badge--success card--property__status card--property__status--quiet">ok</span>`;
  return `
    <a href="#/properties/${t.id}" class="card--property">
      <div class="card--property__image" style="background-image:url('${t.image}');">
        ${issuesBadge}
      </div>
      <div class="card--property__body">
        <p class="card--property__sap">${formatAssetKey(t.assetKey)} · EGID ${t.egid}</p>
        <h3 class="card--property__title">${P.escapeHtml(t.buildingName)}</h3>
        <p class="card--property__address">${P.escapeHtml(t.address)} · ${P.escapeHtml(t.floorLabel)}</p>
        <div class="card--property__meta">
          <span>${t.hnf2} m² HNF2</span>
          <span>${t.workstations} AP</span>
          <span>${P.formatChf(t.yearlyCost)} / Jahr</span>
        </div>
        <span class="card--property__category">${P.escapeHtml(t.portfolioCategory)}</span>
      </div>
    </a>
  `;
}

// ── 10. LIEGENSCHAFTS-DETAIL ─────────────────────────────────────────────
// Document-type labels for the grouped Dokumente section on the property
// detail page. Keys match the schema A.10 enum (canonical EN).
const DOC_TYPE_LABEL_DE = {
  Lease:       'Mietvertrag',
  FloorPlan:   'Grundriss',
  Permit:      'Bewilligung',
  Certificate: 'Zertifikat',
  Manual:      'Handbuch',
  LegalBasis:  'Rechtsgrundlage',
  WiBe:        'WiBe',
  Other:       'Sonstiges',
  Attachment:  'Anhang',
};

// Property-detail Dokumente: four buckets by user intent (not by chronology).
// Empty buckets are skipped at render time.
const PROPERTY_DOC_GROUPS = [
  { title: 'Mietvertrag & Anhänge',     types: ['Lease', 'LegalBasis'],            defaultOpen: true  },
  { title: 'Pläne als Dateien',         types: ['FloorPlan'],                       defaultOpen: false },
  { title: 'Sicherheit & Betrieb',      types: ['Certificate', 'Manual', 'Permit'], defaultOpen: false },
  { title: 'Historie & Korrespondenz',  types: ['Other', 'WiBe', 'Attachment'],     defaultOpen: false },
];

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

  const docGroupHtml = PROPERTY_DOC_GROUPS
    .map(g => {
      const items = linkedDocs
        .filter(d => g.types.includes(d.type))
        .sort((a, b) => (b.issuedAt || '').localeCompare(a.issuedAt || ''));
      if (items.length === 0) return '';
      const visible = items.slice(0, 6);
      const overflow = items.length - visible.length;
      const adapted = visible.map(d => ({
        title:    d.title,
        subtitle: DOC_TYPE_LABEL_DE[d.type] || d.type,
        format:   d.format,
        size:     d.size,
        languages: Array.isArray(d.languages) ? d.languages.map(l => l.toUpperCase()).join(' · ') : d.languages,
        date:     d.issuedAt ? P.formatDate(d.issuedAt) : undefined,
      }));
      return `
        <details class="doc-group" ${g.defaultOpen ? 'open' : ''}>
          <summary class="doc-group__summary">
            <span class="doc-group__title">${P.escapeHtml(g.title)}</span>
            <span class="doc-group__count">${items.length}</span>
          </summary>
          <div class="doc-group__body">
            ${downloadList(adapted)}
            ${overflow > 0 ? `<p class="doc-group__more"><a class="link" href="#/downloads?building=${encodeURIComponent(t.buildingId)}">… ${overflow} weitere im Dokumenten-Archiv anzeigen</a></p>` : ''}
          </div>
        </details>
      `;
    })
    .join('');

  document.getElementById('page-body').innerHTML = `
    ${P.renderShareBar({ backTo: '#/properties', backLabel: 'Liegenschaften' })}
    <section class="section section--py-tight">
      <div class="container">
        <header class="property-header">
          <div class="property-header__body">
            <p class="property-header__meta">${formatAssetKey(t.assetKey)} · EGID ${t.egid}</p>
            <h1 class="h1 property-header__title">${P.escapeHtml(t.buildingName)}</h1>
            <p class="property-header__address">${P.escapeHtml(t.address)}</p>
            <p class="property-header__chips">
              <span class="badge ${restWarn ? 'badge--warning' : 'badge--success'}">Restlaufzeit ~${monthsToEnd} Monate</span>
            </p>
          </div>
          <div class="property-header__image" role="img" aria-label="Foto: ${P.escapeHtml(t.buildingName)}" style="background-image:url('${t.image}');"></div>
        </header>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="property-layout">
          <div>
            <section class="property-section">
              <h2 class="h2 section-heading">Vertrag & Mengengerüst</h2>

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
                  <span class="property-stats__label">Arbeitsplätze</span>
                  <span class="property-stats__value">${t.workstations}</span>
                </div>
                <div class="property-stats__item">
                  <span class="property-stats__label">Mietkosten / Jahr</span>
                  <span class="property-stats__value">${P.formatChf(t.yearlyCost)}</span>
                </div>
              </div>

              <table class="table property-facts">
                <tr><th>Mietende VE</th><td>${P.escapeHtml(t.ve)}${t.dep && t.dep !== t.ve ? ' / ' + P.escapeHtml(t.dep) : ''}</td></tr>
                <tr><th>PFM-Kategorie</th><td>${P.escapeHtml(t.portfolioCategory)}</td></tr>
                <tr><th>Vertragsart</th><td>${t.leaseAuto ? '<span class="badge badge--success">automatisch verlängernd</span>' : '<span class="badge badge--warning">Festlaufzeit</span>'}</td></tr>
                <tr><th>Laufzeit</th><td>${P.formatDate(t.leaseStart)} – ${P.formatDate(t.leaseEnd)}</td></tr>
              </table>
            </section>

            <section class="property-section">
              <h2 class="h2 section-heading">Geschosse (${floors.length})</h2>
              ${floors.length === 0
                ? `<p class="text-secondary">Für diese Liegenschaft liegt noch kein interaktiver Grundriss vor.</p>`
                : `<table class="table table--zebra table--rows-clickable floor-list" aria-label="Geschosse mit interaktivem Grundriss">
                    <thead>
                      <tr>
                        <th scope="col">Etage</th>
                        <th scope="col" class="floor-list__num">Räume</th>
                        <th scope="col" class="floor-list__num">HNF2</th>
                        <th scope="col" class="floor-list__num">Arbeitsplätze</th>
                        <th scope="col" class="floor-list__num">Davon ${P.escapeHtml(userVe)}${userDep ? ' / ' + P.escapeHtml(userDep) : ''}</th>
                        <th scope="col" aria-hidden="true" class="floor-list__chevron-th"></th>
                      </tr>
                    </thead>
                    <tbody>
                      ${floorKpis.map(f => `
                        <tr onclick="location.hash='#/properties/${t.id}/floors/${f.slug}';">
                          <td>
                            <strong>${P.escapeHtml(f.name)}</strong>
                            ${f.isYourFloor ? ' <span class="badge badge--success">Ihr Standort</span>' : ''}
                          </td>
                          <td class="floor-list__num">${f.roomCount}</td>
                          <td class="floor-list__num">${f.totalArea.toLocaleString('de-CH')} m²</td>
                          <td class="floor-list__num">${f.workstations}</td>
                          <td class="floor-list__num">${f.myVeCount}</td>
                          <td class="floor-list__chevron">${P.icon('chevronRight')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>`}
            </section>

            <section class="property-section">
              <h2 class="h2 section-heading">Anträge zu dieser Liegenschaft (${related.length})</h2>
              ${related.length === 0
                ? `<p class="text-secondary">Keine offenen oder vergangenen Anträge zu dieser Liegenschaft.</p>`
                : `<table class="table table--zebra table--rows-clickable" aria-label="Anträge zu dieser Liegenschaft">
                     <thead><tr><th scope="col">Antrag</th><th scope="col">Typ</th><th scope="col">Eingereicht</th><th scope="col">Status</th></tr></thead>
                     <tbody>
                       ${related.map(a => `<tr onclick="location.hash='#/inbox/${a.id}';"><td><strong>${a.id}</strong></td><td>${a.type}</td><td>${P.formatDate(a.submittedAt)}</td><td>${P.statusBadge(a.status)}</td></tr>`).join('')}
                     </tbody>
                   </table>`}
            </section>

            <section class="property-section">
              <h2 class="h2 section-heading">Dokumente zu dieser Liegenschaft (${linkedDocs.length})</h2>
              ${linkedDocs.length === 0
                ? `<p class="text-secondary">Keine Dokumente zu dieser Liegenschaft hinterlegt.</p>`
                : `<div class="doc-groups">${docGroupHtml}</div>`}
            </section>

            <section class="property-section">
              <h2 class="h2 section-heading">Standort</h2>
              <div id="propertyLocationMap" class="property-location-map" aria-label="Karte: Standort der Liegenschaft"></div>
              <p class="property-location-meta">${P.escapeHtml(t.address)}${typeof t.lat === 'number' && typeof t.lng === 'number' ? ` · ${t.lat.toFixed(4)}°N, ${t.lng.toFixed(4)}°E` : ''}</p>
            </section>
          </div>

          <aside class="property-aside">
            <div class="card property-aside__card">
              <h3 class="card__title">Aktionen</h3>
              <div class="property-aside__actions">
                <a href="#/repair?building=${t.buildingId}" class="btn btn--bare">${P.icon('tool')}Schaden / Reparatur melden</a>
                <a href="#/wizard/1" class="btn btn--bare">${P.icon('document')}Bedarf zu dieser Liegenschaft</a>
                <button class="btn btn--bare" type="button" onclick="window.portal.toast('Umzug-Workflow noch nicht implementiert')">${P.icon('truck')}Umzug anmelden</button>
                <button class="btn btn--bare" type="button" onclick="window.portal.toast('Sonderreinigung noch nicht implementiert')">${P.icon('sparkles')}Sonderreinigung anfragen</button>
              </div>
            </div>
            <div class="card">
              <h3 class="card__title">Ansprechpersonen BBL</h3>
              <dl class="contact-dl">
                <div class="contact-dl__row">
                  <dt>Portfolio-Management</dt>
                  <dd>${P.escapeHtml(t.contacts.pfm)}</dd>
                </div>
                <div class="contact-dl__row">
                  <dt>Immobilien-Management</dt>
                  <dd>${P.escapeHtml(t.contacts.im)}</dd>
                </div>
                <div class="contact-dl__row">
                  <dt>Flächenmanagement (FLM)</dt>
                  <dd>${P.escapeHtml(t.contacts.flm)}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `;

  initPropertyDetailMap(t);
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
      zoom: 15,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    _propertyDetailMap = map;

    map.on('load', () => {
      const el = document.createElement('div');
      el.className = 'property-marker property-marker--static';
      el.setAttribute('aria-label', t.buildingName);
      el.innerHTML = '<span class="property-marker__pin"></span>';
      new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([t.lng, t.lat])
        .addTo(map);
    });
  }).catch(err => {
    console.error('[property location map]', err);
    const container = document.getElementById('propertyLocationMap');
    if (container) {
      container.innerHTML = '<p class="text-secondary" style="padding: var(--space-lg);">Karte konnte nicht geladen werden.</p>';
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

// useType → fill colour. Single source of truth, mirrored in the legend
// swatches in styles.css. Pre-computed onto each feature property at
// spacesFc construction time so the MapLibre paint spec stays trivial —
// `['get', 'fillColor']` rather than a `match` expression.
const USETYPE_FILL = {
  Office:        '#bfdbfe',
  OpenSpace:     '#bfdbfe',
  FocusRoom:     '#93c5fd',
  Reception:     '#bfdbfe',
  MeetingRoom:   '#fde68a',
  TrainingRoom:  '#fde68a',
  Lounge:        '#fde68a',
  Cafeteria:     '#fcd34d',
  Corridor:      '#e5e7eb',
  WC:            '#d1d5db',
  Kitchenette:   '#e5e7eb',
  PrintRoom:     '#e5e7eb',
  Cloakroom:     '#e5e7eb',
  Storage:       '#ddd6fe',
  Archive:       '#c4b5fd',
  TechnicalRoom: '#d1d5db',
  Lab:           '#ddd6fe',
};

function renderFloorDetail({ id, floorSlug }) {
  if (!P.state.user) { P.navigate('#/'); return; }
  const t = P.state.tenancies.find(x => x.id === id);
  if (!t) { document.getElementById('page-body').innerHTML = '<div class="container section"><p>Liegenschaft nicht gefunden.</p></div>'; return; }

  const buildingFloors = P.state.floors
    .filter(f => f.buildingId === t.buildingId)
    .sort((a, b) => a.levelNumber - b.levelNumber);
  const floor = buildingFloors.find(f => f.floorId === `${t.buildingId}-${floorSlug}`);
  if (!floor) {
    shell({ activeNav: 'properties', breadcrumb: [
      { href: '#/home', label: 'Start' },
      { href: '#/properties', label: 'Liegenschaften' },
      { href: `#/properties/${t.id}`, label: t.buildingName },
      { label: floorSlug }
    ]});
    document.getElementById('page-body').innerHTML = '<div class="container section"><p>Für dieses Geschoss liegt noch kein interaktiver Grundriss vor.</p></div>';
    return;
  }

  shell({ activeNav: 'properties', breadcrumb: [
    { href: '#/home', label: 'Start' },
    { href: '#/properties', label: 'Liegenschaften' },
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

  // Reuse the property-detail Restlaufzeit calculation so the chip stays
  // consistent across the property page and the floor page.
  const today = new Date();
  const leaseEnd = new Date(t.leaseEnd);
  const monthsToEnd = Math.max(0, Math.round((leaseEnd - today) / (30 * 86400000)));
  const restWarn = monthsToEnd <= 12;

  // Pre-select a room from ?space=… on the hash
  const queryStr = (location.hash.split('?')[1] || '');
  const initialSpaceId = new URLSearchParams(queryStr).get('space');

  document.getElementById('page-body').innerHTML = `
    ${P.renderShareBar({ backTo: `#/properties/${t.id}`, backLabel: t.buildingName })}
    <section class="section section--py-tight">
      <div class="container">
        <header class="property-header">
          <div class="property-header__body">
            <p class="property-header__meta">${formatAssetKey(t.assetKey)} · EGID ${t.egid}</p>
            <h1 class="h1 property-header__title">${P.escapeHtml(t.buildingName)}</h1>
            <p class="property-header__address">${P.escapeHtml(t.address)}</p>
            <p class="property-header__chips">
              <span class="badge ${restWarn ? 'badge--warning' : 'badge--success'}">Restlaufzeit ~${monthsToEnd} Monate</span>
            </p>
          </div>
          <div class="property-header__image" role="img" aria-label="Foto: ${P.escapeHtml(t.buildingName)}" style="background-image:url('${t.image}');"></div>
        </header>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <header class="floor-header">
          <h2 class="h2 floor-header__title">Geschoss ${P.escapeHtml(floor.name)}</h2>
          <p class="floor-header__kpis">${rooms.length} Räume · ${totalArea.toLocaleString('de-CH')} m² HNF2 · ${workstations} Arbeitsplätze</p>
        </header>
        <div class="floor-toolbar">
          <div class="floor-toolbar__group">
            <span class="floor-toolbar__label">Etage</span>
            <div class="floor-switcher" role="tablist" aria-label="Etage wechseln">
              ${buildingFloors.map(f => {
                const slug = f.floorId.replace(t.buildingId + '-', '');
                const isActive = f.floorId === floor.floorId;
                return `<a class="floor-switcher__chip${isActive ? ' floor-switcher__chip--active' : ''}"
                          href="#/properties/${t.id}/floors/${slug}"
                          ${isActive ? 'aria-current="page"' : ''}>${P.escapeHtml(f.name)}</a>`;
              }).join('')}
            </div>
          </div>

          <div class="floor-toolbar__group floor-toolbar__group--right">
            <label class="floor-toolbar__label" for="floorViewMode">Ansicht</label>
            <select id="floorViewMode" class="input input--sm">
              <option value="useType">Nutzung</option>
            </select>
            <button class="btn btn--bare btn--sm" type="button" id="floorFullscreenBtn" aria-label="Vollbild">${P.icon('maximize')}Vollbild</button>
          </div>
        </div>

        <div class="floor-stage">
          <div id="floorCanvas" class="floor-canvas" aria-label="Interaktiver Grundriss"></div>
        </div>

        <ul class="floor-legend" aria-label="Legende">
          <li class="floor-legend__item"><span class="floor-legend__swatch floor-legend__swatch--work"></span>Arbeitsplätze</li>
          <li class="floor-legend__item"><span class="floor-legend__swatch floor-legend__swatch--collab"></span>Zusammenarbeit</li>
          <li class="floor-legend__item"><span class="floor-legend__swatch floor-legend__swatch--infra"></span>Infrastruktur</li>
          <li class="floor-legend__item"><span class="floor-legend__swatch floor-legend__swatch--special"></span>Sonderräume</li>
          <li class="floor-legend__item"><span class="floor-legend__swatch floor-legend__swatch--mine"></span>${P.escapeHtml(userVe)}-Räume (rote Umrandung)</li>
        </ul>
      </div>
    </section>
  `;

  initFloorCanvas(t, floor, spaces, userVe, initialSpaceId);

  // Vollbild toggle — uses HTML5 Fullscreen API on the canvas container.
  // After entering / leaving fullscreen the MapLibre canvas needs a resize
  // tick so it reflows to the new dimensions.
  const fsBtn = document.getElementById('floorFullscreenBtn');
  const stage = document.querySelector('.floor-stage');
  if (fsBtn && stage) {
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        stage.requestFullscreen?.().catch(() => {});
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

function initFloorCanvas(t, floor, spaces, userVe, initialSpaceId) {
  loadMapLibre().then(maplibregl => {
    const container = document.getElementById('floorCanvas');
    if (!container) return;
    if (_floorMap) { try { _floorMap.remove(); } catch {} _floorMap = null; }

    const floorFc = { type: 'FeatureCollection', features: [{
      type: 'Feature',
      geometry: floor.geometry,
      properties: { floorId: floor.floorId, name: floor.name }
    }]};
    const spacesFc = { type: 'FeatureCollection', features: spaces.map(s => {
      const useLabel = USETYPE_LABEL_DE[s.useType] || s.useType;
      // Pre-compose a three-line label (number / Nutzung / Fläche) and the
      // fill colour. Pre-computing client-side keeps the MapLibre paint spec
      // trivial (`['get', 'fillColor']` instead of a `match` expression) —
      // useful both for performance and for spotting data issues quickly.
      const label = `${s.name}\n${useLabel}\n${s.area} m²`;
      const fillColor = USETYPE_FILL[s.useType] || '#ff66cc'; // bright pink = unmapped useType, visible in QA
      return {
        type: 'Feature',
        geometry: s.geometry,
        properties: {
          spaceId: s.spaceId, floorId: s.floorId, name: s.name,
          useType: s.useType, useLabel, area: s.area, label, fillColor,
          capacity: s.capacity, isBookable: s.isBookable,
          occupierVe: s.occupierVe, occupierDep: s.occupierDep,
        }
      };
    })};
    console.log('[floor canvas]', floor.floorId, 'with', spacesFc.features.length, 'space features');
    if (spacesFc.features.length > 0) {
      const sample = spacesFc.features[0];
      console.log('[floor canvas] sample feature props:', sample.properties);
      console.log('[floor canvas] sample feature geometry:', sample.geometry);
    }

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
      maxZoom: 22,
      preserveDrawingBuffer: true,
      // Keep the floor plan oriented like architectural drawings — north up,
      // no rotation gestures. Pinch-zoom and pan stay enabled so users can
      // get close to dense room clusters on a big floor.
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: true,
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
      // Strip every layer that came from positron so the basemap doesn't
      // bleed under the floor plan. We could hide them individually but a
      // sweep keeps this resilient to upstream style changes — we want
      // only our floor + room polygons visible above a clean background.
      map.getStyle().layers.forEach(l => { try { map.removeLayer(l.id); } catch {} });
      map.addLayer({ id: 'floor-bg', type: 'background', paint: { 'background-color': '#fafafa' } });

      map.addSource('floor',  { type: 'geojson', data: floorFc });
      map.addSource('spaces', { type: 'geojson', data: spacesFc });
      console.log('[floor canvas] map loaded, sources added');
      // Sanity-check: query the source to confirm features made it through
      map.once('idle', () => {
        try {
          const querySrc = map.querySourceFeatures('spaces');
          console.log('[floor canvas] spaces source contains', querySrc.length, 'queried features');
        } catch (e) {
          console.warn('[floor canvas] querySourceFeatures failed', e);
        }
      });

      // Room fills — colour is pre-computed onto each feature's `fillColor`
      // property (see USETYPE_FILL above). The room polygons tile the entire
      // floor (8 north + corridor + 8 south = full coverage), so a separate
      // floor-fill underlay is redundant. Bright pink fallback flags any
      // feature whose useType isn't in USETYPE_FILL.
      map.addLayer({
        id: 'rooms-fill',
        type: 'fill',
        source: 'spaces',
        paint: {
          'fill-color': ['coalesce', ['get', 'fillColor'], '#ff66cc'],
          'fill-opacity': 1
        }
      });
      console.log('[floor canvas] rooms-fill layer added');

      // Default room outlines — darker / thicker than before for a more
      // legible "every cell is a room" grid feel.
      map.addLayer({
        id: 'rooms-outline',
        type: 'line',
        source: 'spaces',
        paint: { 'line-color': '#6b7280', 'line-width': 1.25 }
      });

      // "My VE" outlines (federal red).
      map.addLayer({
        id: 'rooms-mine-outline',
        type: 'line',
        source: 'spaces',
        filter: ['==', ['get', 'occupierVe'], userVe],
        paint: { 'line-color': '#D8232A', 'line-width': 2.5 }
      });

      // Selection outline — filter set on click. Starts hidden.
      map.addLayer({
        id: 'rooms-selected',
        type: 'line',
        source: 'spaces',
        filter: ['==', ['get', 'spaceId'], '__none__'],
        paint: { 'line-color': '#7f1d1d', 'line-width': 4 }
      });

      // Floor outline — dark, on top.
      map.addLayer({
        id: 'floor-outline',
        type: 'line',
        source: 'floor',
        paint: { 'line-color': '#1F2937', 'line-width': 2 }
      });

      // Room labels — three lines: room number, German useType label, area.
      // Corridor is excluded to keep the central spine visually clean.
      map.addLayer({
        id: 'room-labels',
        type: 'symbol',
        source: 'spaces',
        filter: ['!=', ['get', 'useType'], 'Corridor'],
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
          'text-color': '#1F2937',
          'text-halo-color': '#ffffff',
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
// Document-type DE labels — keyed by the schema A.10 enum (canonical EN).
// Records come from data/documents.json (state.documents).
const DOCUMENT_TYPE_LABEL = {
  Lease:       'Mietvertrag',
  FloorPlan:   'Grundriss',
  Permit:      'Baubewilligung',
  Certificate: 'Zertifikat',
  Manual:      'Handbuch',
  Regulation:  'Verordnung',
  WiBe:        'WiBe',
  LegalBasis:  'Rechtsgrundlage',
  Attachment:  'Beilage',
  Other:       'Sonstiges',
};
const DOCUMENT_PAGE_SIZE = 25;

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

function renderDownloads() {
  if (!P.state.user) { P.navigate('#/'); return; }
  shell({ activeNav: 'downloads', breadcrumb: [{ href: '#/home', label: 'Start' }, { label: 'Pläne & Dokumente' }] });

  // Filter + page state persisted in URL hash query (back/forward + shareable).
  const docState = { type: '', building: '', q: '', page: 1 };
  const initial = new URLSearchParams((location.hash.split('?')[1] || ''));
  docState.type     = initial.get('type')     || '';
  docState.building = initial.get('building') || '';
  docState.q        = initial.get('q')        || '';
  docState.page     = parseInt(initial.get('page') || '1', 10);

  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container">
        <h1 class="h1 section-heading">Pläne & Dokumente</h1>
        <p class="section-intro">
          Alle für <strong>${P.escapeHtml(P.state.user.ve)}</strong> freigegebenen Dokumente plus öffentliche Merkblätter.
        </p>

        <div class="docs-filter-bar">
          <select class="input docs-filter-bar__select" id="filterDocType" aria-label="Dokumenttyp">
            <option value="">Alle Typen</option>
            ${Object.entries(DOCUMENT_TYPE_LABEL).map(([v, l]) =>
              `<option value="${v}" ${docState.type === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          <select class="input docs-filter-bar__select" id="filterDocBuilding" aria-label="Liegenschaft">
            <option value="">Alle Liegenschaften</option>
            ${P.state.buildings.map(b =>
              `<option value="${b.buildingId}" ${docState.building === b.buildingId ? 'selected' : ''}>${P.escapeHtml(b.name)}</option>`).join('')}
          </select>
          <input class="input docs-filter-bar__search" type="search" id="filterDocText"
                 placeholder="Titel oder Liegenschaft suchen …"
                 value="${P.escapeHtml(docState.q)}"
                 aria-label="Suche">
        </div>

        <div class="filter-pills" id="docFilterPills" aria-label="Aktive Filter" hidden></div>

        <div class="docs-table-wrap">
          <table class="table table--zebra table--documents" aria-label="Dokumente">
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

        <div class="pagination" id="docPagination" role="navigation" aria-label="Seitennavigation"></div>
      </div>
    </section>
  `;

  function filteredDocs() {
    const q = docState.q.toLowerCase();
    return P.state.documents.filter(d => {
      if (docState.type && d.type !== docState.type) return false;
      if (docState.building) {
        const linkedToBuilding = (d.linkedTo || []).some(r =>
          (r.entityType === 'Building' && r.entityId === docState.building) ||
          (r.entityType === 'Tenancy' && P.state.tenancies.some(t =>
            t.tenancyId === r.entityId && t.buildingId === docState.building)));
        if (!linkedToBuilding) return false;
      }
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
    if (docState.type) {
      active.push({ key: 'type', label: 'Typ', value: DOCUMENT_TYPE_LABEL[docState.type] || docState.type });
    }
    if (docState.building) {
      const b = P.state.buildings.find(x => x.buildingId === docState.building);
      active.push({ key: 'building', label: 'Liegenschaft', value: b ? b.name : docState.building });
    }
    if (docState.q) {
      active.push({ key: 'q', label: 'Suche', value: docState.q });
    }
    if (active.length === 0) {
      pills.hidden = true;
      pills.innerHTML = '';
      return;
    }
    pills.hidden = false;
    pills.innerHTML = active.map(f => `
      <span class="filter-pill">
        <span class="filter-pill__label">${f.label}:</span>
        <span class="filter-pill__value">${P.escapeHtml(f.value)}</span>
        <button class="filter-pill__remove" type="button"
                aria-label="Filter „${P.escapeHtml(f.label)}: ${P.escapeHtml(f.value)}" entfernen"
                data-clear="${f.key}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </span>
    `).join('') + `<button class="filter-pills__clear-all" type="button" data-clear="all">Alle Filter zurücksetzen</button>`;
    pills.querySelectorAll('[data-clear]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-clear');
        if (key === 'all') {
          docState.type = ''; docState.building = ''; docState.q = '';
          document.getElementById('filterDocType').value = '';
          document.getElementById('filterDocBuilding').value = '';
          document.getElementById('filterDocText').value = '';
        } else if (key === 'type') {
          docState.type = '';
          document.getElementById('filterDocType').value = '';
        } else if (key === 'building') {
          docState.building = '';
          document.getElementById('filterDocBuilding').value = '';
        } else if (key === 'q') {
          docState.q = '';
          document.getElementById('filterDocText').value = '';
        }
        docState.page = 1;
        applyDocState();
      });
    });
  }

  function applyDocState() {
    const all = filteredDocs();
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / DOCUMENT_PAGE_SIZE));
    if (docState.page > totalPages) docState.page = totalPages;
    if (docState.page < 1) docState.page = 1;
    const start = (docState.page - 1) * DOCUMENT_PAGE_SIZE;
    const slice = all.slice(start, start + DOCUMENT_PAGE_SIZE);

    renderDocFilterPills();

    const tbody = document.getElementById('docTableBody');
    if (slice.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Keine Treffer für die aktuellen Filter.</td></tr>`;
    } else {
      tbody.innerHTML = slice.map(d => `
        <tr>
          <td>
            <a href="#" class="docs-table__title-link"
               onclick="window.portal.toast('Download simuliert: ${P.escapeJs(d.title)}'); return false;">
              ${P.icon('document')}<span>${P.escapeHtml(d.title)}</span>
            </a>
          </td>
          <td><span class="badge badge--info">${P.escapeHtml(DOCUMENT_TYPE_LABEL[d.type] || d.type)}</span></td>
          <td class="docs-table__linked">${P.escapeHtml(documentLinkedLabel(d))}</td>
          <td><code>${P.escapeHtml(d.format || '')}</code></td>
          <td>${P.escapeHtml(d.size || '')}</td>
          <td>${P.escapeHtml((d.languages || []).join(' · ').toUpperCase())}</td>
          <td>${P.escapeHtml(d.issuedAt || '')}</td>
          <td class="docs-table__action">
            <a href="#" class="docs-table__download" aria-label="Herunterladen: ${P.escapeHtml(d.title)}"
               onclick="window.portal.toast('Download simuliert: ${P.escapeJs(d.title)}'); return false;">${P.icon('download')}</a>
          </td>
        </tr>
      `).join('');
    }

    // CD Bund pagination — same compact pattern as #/properties (chevron-left
    // + page-number input + "von X Seiten" + chevron-right). See
    // designsystem/css/components/pagination.postcss. Rendered unconditionally
    // (federal lists scale — the count line is the load-bearing scale cue).
    const pag = document.getElementById('docPagination');
    const fmt = (n) => n.toLocaleString('de-CH');
    const from = total === 0 ? 0 : start + 1;
    const to   = Math.min(start + DOCUMENT_PAGE_SIZE, total);
    const countText = total === 0
      ? 'Keine Dokumente'
      : total === 1
        ? '1 Dokument'
        : `${fmt(from)}–${fmt(to)} von ${fmt(total)} Dokumenten`;
    pag.innerHTML = `
      <span class="pagination__count" aria-live="polite">${countText}</span>
      <button class="btn btn--outline btn--icon-only" type="button"
              data-step="-1" aria-label="Vorherige Seite"
              ${docState.page <= 1 ? 'disabled' : ''}>${P.icon('chevronLeft')}</button>
      <input class="pagination__input" type="number"
             id="docPaginationInput" min="1" max="${totalPages}" value="${docState.page}"
             aria-label="Seite auswählen">
      <span class="pagination__text">von ${totalPages} Seite${totalPages === 1 ? '' : 'n'}</span>
      <button class="btn btn--outline btn--icon-only" type="button"
              data-step="1" aria-label="Nächste Seite"
              ${docState.page >= totalPages ? 'disabled' : ''}>${P.icon('chevronRight')}</button>
    `;
    pag.querySelectorAll('button[data-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        docState.page = Math.max(1, Math.min(totalPages, docState.page + parseInt(btn.dataset.step, 10)));
        applyDocState();
      });
    });
    const docPageInput = document.getElementById('docPaginationInput');
    const goPage = () => {
      const v = Math.max(1, Math.min(totalPages, parseInt(docPageInput.value, 10) || 1));
      docState.page = v;
      applyDocState();
    };
    docPageInput.addEventListener('change', goPage);
    docPageInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); goPage(); }
    });

    const qp = new URLSearchParams();
    if (docState.type)     qp.set('type', docState.type);
    if (docState.building) qp.set('building', docState.building);
    if (docState.q)        qp.set('q', docState.q);
    if (docState.page > 1) qp.set('page', docState.page);
    const newHash = '#/downloads' + (qp.toString() ? '?' + qp.toString() : '');
    if (location.hash !== newHash) history.replaceState(null, '', newHash);
  }

  document.getElementById('filterDocType').addEventListener('change', e => {
    docState.type = e.target.value; docState.page = 1; applyDocState();
  });
  document.getElementById('filterDocBuilding').addEventListener('change', e => {
    docState.building = e.target.value; docState.page = 1; applyDocState();
  });
  document.getElementById('filterDocText').addEventListener('input', e => {
    docState.q = e.target.value; docState.page = 1; applyDocState();
  });

  applyDocState();
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

// ── 12. SCHADENSMELDUNG (REQ-FA-005 stub) ────────────────────────────────
function renderRepairQuickForm() {
  if (!P.state.user) { P.navigate('#/'); return; }
  shell({ activeNav: 'home', breadcrumb: [{ href: '#/home', label: 'Start' }, { label: 'Schadensmeldung' }] });

  const params = new URLSearchParams((location.hash.split('?')[1] || ''));
  const presetBuildingId = params.get('building');
  const presetTenancy = P.state.tenancies.find(t => t.buildingId === presetBuildingId);

  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container container--reading">
        <h1 class="h1 section-heading">Schaden oder Störung melden</h1>
        <p class="section-intro">
          Defekte Heizung, Wasserschaden, Beleuchtung, Schliesssystem: kurze Meldung — BBL-IM nimmt Kontakt auf und koordiniert die Behebung.
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
            <p class="form-field__hint">Hilfreich bei sichtbaren Schäden. Wird wie alle Anhänge auf Schadsoftware geprüft.</p>
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
      <div class="container container--reading">
        <h1 class="h1 section-heading">Mein Profil</h1>

        <div class="card profile-page__card">
          <h2 class="card__title">Identität (über eIAM)</h2>
          <dl class="profile-dl">
            <dt>Name</dt><dd>${P.escapeHtml(u.name)}</dd>
            <dt>E-Mail</dt><dd>${P.escapeHtml(u.email)}</dd>
            <dt>eIAM-Subjekt-ID</dt><dd><code>${u.id}</code></dd>
            <dt>Verwaltungs­einheit</dt><dd>${P.escapeHtml(u.ve)}${u.dep ? ' / ' + P.escapeHtml(u.dep) : ''}</dd>
            <dt>Aktive Rolle</dt><dd><strong>${P.roleLabel(u.activeRole)}</strong></dd>
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
            <label class="option-group__item"><input type="radio" name="lang" disabled> <span>Français (Demo)</span></label>
            <label class="option-group__item"><input type="radio" name="lang" disabled> <span>Italiano (Demo)</span></label>
          </fieldset>
        </div>

        <button class="btn btn--bare" type="button" onclick="window.portal.logout()">Abmelden</button>
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
        <p class="section-intro">
          BBL bewirtschaftet die Immobilien der Bundesverwaltung. Über das Mieterportal stellen Bundes-Mietende die folgenden Anfragen direkt — geführt, dokumentiert, übergabefähig an SAP ePPM.
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
// Placeholder for services that aren't wired up yet in the prototype.
// The `reqId` argument is preserved on the function signature so call
// sites don't change, but the value is no longer surfaced to users —
// it stays in code comments / commit history for traceability.
function renderServiceStub(title, _reqId, lead, externalUrl) {
  shell({ breadcrumb: [{ href: '#/', label: 'Start' }, { href: '#/services', label: 'Dienstleistungen' }, { label: title }] });
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
              <p>Die Bundeskanzlei (BK) hat kein Generalsekretariat. Anträge der BK überspringen daher den GS-Schritt und werden direkt an BBL Portfolio-Management geroutet. Das System erkennt dies automatisch und passt die Status-Pipeline an.</p>
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
      <p>Sie genehmigen ${sel.length} Anträge. Pro Antrag ist eine schriftliche Begründung erforderlich (VwVG Art. 35).</p>
      <div class="form-field">
        <label class="form-field__label">Optionaler Vorschlagstext (nicht voreingestellt)</label>
        <textarea class="form-field__textarea" id="batchTemplate" placeholder="z. B. Formal vollständig, Rechtsgrundlage geprüft, keine Auflagen."></textarea>
        <label class="batch-approve__copy-toggle"><input type="checkbox" id="copyTpl"> Als Vorschlag in alle Felder einsetzen (Default: off)</label>
      </div>
      <hr class="rule">
    `;
    sel.forEach(id => {
      const a = P.state.applications.find(x => x.id === id);
      if (!a) return;
      body += `
        <div class="form-field batch-approve__field">
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
        <p>In diesem Prototyp simulieren wir die erneute Einreichung. Auflagen werden als erfüllt markiert, der Status wechselt zurück zu „Eingereicht", und der GS wird benachrichtigt.</p>
        <p class="modal__meta">Die Antrags-ID ${appId} bleibt erhalten; die Historie zeichnet die Resubmission als Statusübergang auf.</p>
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

