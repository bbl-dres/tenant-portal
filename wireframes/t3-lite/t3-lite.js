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
    await P.loadData('../shared/data/');
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
  }

  // ── NEWS SECTION (swisstopo "Aktuell" carousel pattern) ─────────────────
  function renderNewsSection(items = P.state.news, max = 3) {
    const visible = items.slice(0, max);
    return `
      <section class="news-section section section--alt section--lg" aria-labelledby="newsSectionTitle">
        <div class="container">
          <h2 class="section-heading" id="newsSectionTitle">Aktuell</h2>
          <div class="news-section__viewport">
            <button class="news-section__nav news-section__nav--prev" type="button" aria-label="Vorherige Nachrichten" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div class="news-section__track">
              ${visible.map(newsCard).join('')}
            </div>
            <button class="news-section__nav news-section__nav--next" type="button" aria-label="Nächste Nachrichten">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div class="news-section__footer">
            <div class="news-section__dots" role="tablist" aria-label="Seiten">
              <button class="news-section__dot news-section__dot--active" aria-label="Seite 1, aktiv" aria-current="true"></button>
              <button class="news-section__dot" aria-label="Seite 2"></button>
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
  const SERVICES_MENU = {
    id: 'services',
    label: 'Dienstleistungen',
    type: 'dropdown',
    items: [
      { href: '#/services',  label: 'Übersicht aller Dienstleistungen' },
      { href: '#/wizard/1',  label: 'Bedarf anmelden — Unterbringung, Büro, Auslandvertretung' },
      { href: '#/repair',    label: 'Schaden melden — Reparaturen, Sanitär, Schliesssystem' },
      { href: '#/moves',     label: 'Umzug & Sonderreinigung — Transport- und Reinigungsanfragen' },
      { href: '#/mobiliar',  label: 'Möbel bestellen — Standard- und Spezialmobiliar' },
      { href: '#/downloads', label: 'Pläne & Dokumente — Grundrisse, Merkblätter, Schulungen' },
      { href: '#/training',  label: 'Schulungen — „Mieterportal kompakt" und weitere' },
    ]
  };

  function publicNavItems() {
    return [
      { id: 'start', href: '#/', label: 'Start' },
      SERVICES_MENU,
    ];
  }

  function authNavItems() {
    const role = P.state.user.activeRole;
    if (role === 'GS-Prüfer/in') {
      return [
        { id: 'queue', href: '#/queue', label: 'Pendenzen' },
        { id: 'inbox', href: '#/inbox', label: 'Anträge der VE' },
        SERVICES_MENU,
      ];
    }
    if (role === 'ILBO' || !role) {
      return [
        { id: 'home',       href: '#/home',       label: 'Start' },
        SERVICES_MENU,
        { id: 'properties', href: '#/properties', label: 'Liegenschaften' },
        { id: 'inbox',      href: '#/inbox',      label: 'Meine Anträge' },
      ];
    }
    return [
      { id: 'home', href: '#/home', label: 'Start' },
      SERVICES_MENU,
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
            <figcaption>Bundesimmobilien — Bundeshaus West, Bern. Foto Unsplash, Platzhalter für die Produktiv­version.</figcaption>
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

      <section class="section section--dark section--lg" aria-labelledby="profileChooserTitle">
        <div class="container">
          <p class="section-eyebrow">Demo-Personas</p>
          <h2 class="section-heading" id="profileChooserTitle">Wählen Sie Ihr Profil</h2>
          <p style="max-width:60ch;margin: 0 0 var(--space-2xl); color: rgba(255,255,255,0.85); font-size: var(--text-body);">
            Der Mieterportal-Prototyp zeigt vier reale Personas der föderalen Immobilien-Workflow. Wählen Sie ein Profil, um die jeweilige Sicht aus erster Hand zu erleben — Wizard, Inbox, Reviewer-Sicht oder Audit-Sicht.
          </p>
          <div class="profile-grid">
            ${profileCard({
              image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=720&q=80',
              title: 'Logistikbeauftragte',
              date: 'ILBO — Verwaltungs­einheit',
              desc: 'Sie sind Logistikbeauftragte einer Bundes-VE und melden Bedarf an. Drei laufende Anträge, ein Rückfrage-Fall.',
              cta: 'demoRole', role: 'ILBO'
            })}
            ${profileCard({
              image: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=720&q=80',
              title: 'GS-Prüfer/in',
              date: 'Generalsekretariat',
              desc: 'Sie prüfen Anträge des UVEK. Pendenzen-Queue, Feld-für-Feld-Markierungen, mandatorische Begründung.',
              cta: 'demoRole', role: 'GS-Prüfer/in'
            })}
            ${profileCard({
              image: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=720&q=80',
              title: 'BBL Portfolio-Management',
              date: 'PFM-Operations',
              desc: 'Sie übergeben genehmigte Anträge als Bedarfsmeldung an SAP ePPM. KPI-Cockpit, ePPM-Handover, Master-Daten.',
              cta: 'demoRole', role: 'BBL-PFM'
            })}
            ${profileCard({
              image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=720&q=80',
              title: 'EFD Auditor',
              date: 'Revisionsdienst',
              desc: 'Sie haben Lesezugriff über alle VE. Vollständige Audit-Spur, Diff je Feld, Korrelations-ID, Hash-Integrität.',
              cta: 'demoRole', role: 'Auditor'
            })}
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

    document.getElementById('page-body').innerHTML = `
      <section class="section">
        <div class="container">
          ${userApps.length ? `
            <div class="open-items-band">
              <div class="open-items-band__header">
                <span>Ihre offenen Anliegen (${userApps.length})</span>
                <a href="#/inbox" class="btn btn--ghost btn--sm">Alle ansehen →</a>
              </div>
              <div class="open-items-band__list">
                ${userApps.slice(0, 4).map(a => `
                  <a href="#/inbox/${a.id}" class="open-items-band__item">
                    ${P.statusBadge(a.status)} <strong>${a.id}</strong>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <section class="auth-hero" style="margin-top: var(--space-xl);">
            <div class="auth-hero__copy">
              <p class="section-eyebrow">Hauptaktion</p>
              <h2 class="auth-hero__title">Neuen Bedarf anmelden</h2>
              <p class="auth-hero__lead">
                Unterbringung, Bürofläche oder Auslandvertretung erfassen — geführter Ablauf in fünf Schritten,
                inklusive NAW-Klassifizierung, Kostenrechnung und Übergabe an SAP ePPM.
              </p>
              <div class="auth-hero__cta">
                <a href="#/wizard/1" class="btn btn--primary btn--lg">+ Bedarf starten →</a>
                ${draft ? `
                  <button class="btn btn--outline btn--lg" onclick="window.t3lite.continueDraft()">Entwurf fortsetzen</button>
                ` : `
                  <button class="btn btn--outline btn--lg" onclick="window.portal.toggleNavMenu('services')">Alle Dienstleistungen</button>
                `}
              </div>
            </div>
            <figure class="auth-hero__figure" aria-hidden="true">
              <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=720&q=80" alt="">
            </figure>
          </section>

        </div>
      </section>

      ${renderNewsSection()}
    `;
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
              <button class="btn btn--outline btn--sm" onclick="window.print()">🖨 Drucken / PDF</button>
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
                <p class="quick-card__title">${P.escapeHtml(svc.label.split(' — ')[0])}</p>
                <p class="quick-card__desc">${P.escapeHtml(svc.label.split(' — ')[1] || '')}</p>
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
            Roadmap-Eintrag <code>${reqId}</code> — siehe <a href="../../docs/REQUIREMENTS.md">REQUIREMENTS.md</a> §4. Diese Funktion wird in einer der nächsten Iterationen freigeschaltet.
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
