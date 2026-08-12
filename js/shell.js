/* ==========================================================================
   SHELL.JS — federal chrome around every page.

   What lives here:
     • renderShell — top-bar / brand bar / navbar / breadcrumb (the federal
       chrome above <main>)
     • renderFooter — the bbl.admin.ch-style footer
     • renderShareBar — the small Teilen/Drucken bar above detail pages
     • Language switcher (toggleLang, pickLang) — listbox + keyboard support
     • Search header (toggleSearch, submitSearch) — collapsing search input
     • Burger menu (toggleBurger) — mobile nav toggle
     • Dropdown nav menus (toggleNavMenu) — anchored under the trigger word
     • Copy-link / fallback (copyShareLink, fallbackCopy)
     • shell() — convenience wrapper that mounts the chrome + reserves
       a #page-body container for the route renderer to fill.
     • SERVICES_MENU, INFO_LINK, publicNavItems, authNavItems — the data
       behind the navbar (kept here because they're closed-set chrome content,
       not domain data).

   Coupling notes:
     • Reads `state` from ./state.js (renderShell uses state.user for the
       auth pill; authNavItems uses state.user.activeRole).
     • Reads helpers from ./lib.js (toast, icon, renderShortcutOverlay).
     • Inline `onclick="window.portal.X()"` handlers (login, toggleLang,
       toggleNavMenu, pickLang, toggleSearch, submitSearch, toggleBurger,
       copyShareLink) keep working because app.js re-exposes shell.js's
       exports on `window.portal`. The router seam — `navigate` —
       is read off `window.portal` for the same reason; a dedicated
       router module is a future refactor.
   ========================================================================== */

import { state, t, setLang, LANGS } from './state.js';
import { toast, icon, renderShortcutOverlay, safeGet, safeSet, safeSessionGet, safeSessionSet, escapeHtml } from './lib.js';

// ── PROTOTYPE NOTICE ──────────────────────────────────────────────────────
// CD Bund `NotificationBanner` in its fixed variant — the same component the
// federal design system uses for the cookie-consent popup
// (designsystem/app/components/ch/components/NotificationBanner.vue +
// css/components/notification-banner.postcss `.notification-banner--fixed`).
// Here it carries the prototype disclaimer instead of a consent question.
//
// Variant is `notification--info` (DS bg-blue-50 / text-blue-700,
// css/components/notification.postcss:39-42), not `--warning`: nothing is
// wrong and nothing needs care — the bar states what this site is. Orange
// read as an alert and set the wrong tone on entry, and it clashed with the
// intranet skin, whose brand ramp is blue. Warning stays available for
// genuine attention states (lease expiry, open defects).
//
// Scope is deliberately SESSION, not localStorage: the disclaimer must greet
// every new visit, and it is emitted from renderShell — which every route
// mounts — so a bookmarked deep link (#/properties/T-2010-AA-01/floors/1OG)
// shows it just like the landing page does. Dismissal then holds for the rest
// of the session, across navigation.
const PROTOTYPE_NOTICE_KEY = 'mp-prototype-notice';
const CONSENT_KEY = 'mp-cookie-consent';

// In-memory mirror of the sessionStorage flag. Without it, a browser with
// storage disabled (private mode, enterprise policy) would re-show the notice
// on every single route render — annoying rather than fail-safe.
let prototypeNoticeDismissed = false;

function prototypeNoticeAcknowledged() {
  return prototypeNoticeDismissed || safeSessionGet(PROTOTYPE_NOTICE_KEY) === '1';
}

function renderPrototypeNotice() {
  if (prototypeNoticeAcknowledged()) return '';
  return `
    <aside class="notification-banner notification-banner--fixed notification notification--info prototype-notice"
           id="prototypeNotice" role="region" aria-labelledby="prototypeNoticeTitle">
      <div class="notification-banner__wrapper">
        <!-- No notification-banner__icon here (the cookie banner below keeps
             one). The disclaimer states its own status in the bold lead
             sentence, so the meaning never rests on the tint alone — the
             glyph only added weight to a bar that should read as a quiet
             note. -->
        <p class="notification-banner__text">
          <strong id="prototypeNoticeTitle">${t('proto.title')}</strong> ${t('proto.text')}
        </p>
        <div class="notification-banner__actions">
          <button class="btn btn--outline btn--sm" type="button" id="prototypeNoticeAck"
                  onclick="window.portal.dismissPrototypeNotice()">${t('proto.ack')} ${icon('check')}</button>
        </div>
      </div>
    </aside>
  `;
}

export function dismissPrototypeNotice() {
  prototypeNoticeDismissed = true;
  safeSessionSet(PROTOTYPE_NOTICE_KEY, '1');
  document.getElementById('prototypeNotice')?.remove();
  syncPrototypeNoticeOffset();
  // The cookie banner is held back while the disclaimer is up (see
  // renderConsentBanner) so a first-time visitor never faces two stacked
  // consent bars. Surface it now, in the slot renderShell would have used.
  const consent = renderConsentBanner();
  if (consent) document.querySelector('.page-container')?.insertAdjacentHTML('afterbegin', consent);
}

// The notice is `position: fixed` at the bottom edge, so it would otherwise
// cover the last footer row and any toast. Publishing its measured height as
// a custom property lets CSS reserve the space (see `.prototype-notice` in
// styles.css) without hardcoding a per-breakpoint guess — the text wraps to
// two or three lines on phones.
let _noticeResizeObserver = null;
function publishNoticeHeight() {
  const el = document.getElementById('prototypeNotice');
  document.documentElement.style.setProperty('--prototype-notice-h', el ? el.offsetHeight + 'px' : '0px');
}
function syncPrototypeNoticeOffset() {
  const el = document.getElementById('prototypeNotice');
  document.body.classList.toggle('body--prototype-notice', !!el);
  publishNoticeHeight();
  // Measuring once at render time is not enough: that happens before Noto Sans
  // has swapped in, and the fallback face wraps the copy to a different number
  // of lines. Observing the element re-publishes the height on the font swap,
  // on rotation and on any reflow — the bar is re-created by every route
  // render, so re-observe each time.
  if (!el) { _noticeResizeObserver?.disconnect(); return; }
  if (typeof ResizeObserver !== 'function') return;   // resize listener covers it
  _noticeResizeObserver ??= new ResizeObserver(publishNoticeHeight);
  _noticeResizeObserver.disconnect();
  _noticeResizeObserver.observe(el);
}
window.addEventListener('resize', syncPrototypeNoticeOffset);

function renderConsentBanner() {
  if (safeGet(CONSENT_KEY)) return '';
  // Sequenced behind the prototype disclaimer — see dismissPrototypeNotice.
  if (!prototypeNoticeAcknowledged()) return '';
  return `
    <aside class="notification-banner notification notification--info cookie-banner" id="cookieBanner" role="region" aria-label="Datenschutz und Cookies">
      <div class="notification-banner__wrapper">
        <span class="notification-banner__icon" aria-hidden="true">${icon('info')}</span>
        <p class="notification-banner__text">
          Dieses Portal speichert technisch notwendige Einstellungen lokal im Browser. Optionale Analyse-Cookies werden erst nach Zustimmung aktiviert.
          <a href="https://www.admin.ch/gov/de/start/rechtliches.html#datenschutzerkl%C3%A4rung" target="_blank" rel="noopener">Datenschutzerklärung</a>
        </p>
        <div class="notification-banner__actions">
          <button class="btn btn--bare btn--sm" type="button" onclick="window.portal.acceptCookieConsent('necessary')">Nur notwendige ${icon('x')}</button>
          <button class="btn btn--outline btn--sm" type="button" onclick="window.portal.acceptCookieConsent('all')">Alle akzeptieren ${icon('check')}</button>
        </div>
      </div>
    </aside>
  `;
}

export function acceptCookieConsent(mode = 'necessary') {
  safeSet(CONSENT_KEY, JSON.stringify({
    mode: mode === 'all' ? 'all' : 'necessary',
    acceptedAt: new Date().toISOString()
  }));
  document.getElementById('cookieBanner')?.remove();
  toast(mode === 'all' ? 'Cookie-Einstellungen gespeichert.' : 'Nur notwendige Cookies gespeichert.', 'success');
}

// ── NAV-MENU CONTENT (closed-set chrome data — not domain data) ───────────
// Canonical service catalogue — all BBL services tenants can request.
// Surface: the "Dienstleistungen" nav-menu dropdown.
// Source: REQUIREMENTS.md §1.3 pilot + §4.1 Case A roadmap (REQ-FA-*) +
// FUNC-LP-007 self-service downloads / training.
// Shown in both the authenticated and the logged-out nav; the individual
// service routes require login and render the login gate for visitors.
// Exported so #/services can also render this list as a card grid via
// `renderServicesOverview` in app.js without duplicating the catalogue.
// A function (not a const) so labels translate against the active language at
// render time. Also consumed by #/services (renderServicesOverview in app.js).
// Resolve one record from data/services.json into the shape the chrome and the
// views consume. Kept here (not in a view) because the nav dropdown, the
// services overview, the front-page tiles and the search index all need the
// SAME resolution — a service's label, blurb and destination must not depend
// on which surface is rendering it.
//
// `titleKey` / `shortKey` hold i18n keys rather than literal strings: this is
// the one deliberate divergence from the sister portal's services.json, which
// inlines German because it ships one language. Everything else — serviceId,
// type, popular, target { kind, href } — carries the sister portal's names.
export function resolveService(s) {
  const target = s.target || {};
  return {
    id: s.serviceId,
    href: target.href || '#/',
    label: t(s.titleKey),
    desc: t(s.shortKey),
    external: target.kind === 'external',
    type: s.type,
    popular: s.popular,
  };
}

// The nav dropdown shows the entries flagged `inMenu`. Services that own a
// top-level nav entry already (Liegenschaften, Pläne & Dokumente) or live
// inside another page (Schulungen) are catalogued but not repeated here.
export function servicesMenu() {
  return {
    id: 'services',
    label: t('nav.services'),
    type: 'dropdown',
    items: (state.services || []).filter(s => s.inMenu).map(resolveService),
  };
}

// The «Wissen und Hilfsmittel» area: an overview page plus four topic pages.
// Declared here, not in app.js, because THREE surfaces consume the same list
// — the nav drawer, the overview page's topic cards and the search index —
// and a menu that drifts from the pages behind it is exactly the failure mode
// servicesMenu was moved here to prevent.
//
// These are pages, not in-page anchors. Until now the whole area was one
// route with eight anchors and a table of contents; the CD's second level is
// a list of PAGES (designsystem app/components/ch/navigations/
// MainNavigation.vue), and eight sections of very unequal weight on one
// scroll is a document, not an information architecture.
export const INFO_PAGES = [
  { href: '#/info/ablauf',     titleKey: 'info.ablauf',     descKey: 'info.ablauf.desc' },
  { href: '#/info/faq',        titleKey: 'info.faq',        descKey: 'info.faq.desc' },
  { href: '#/info/vorgaben',   titleKey: 'info.vorgaben',   descKey: 'info.vorgaben.desc' },
  { href: '#/info/schulungen', titleKey: 'info.schulungen', descKey: 'info.schulungen.desc' },
];

// Opened by an «Übersicht» row pointing at the parent page — the CD idiom for
// a nav item that is both a drawer and a destination.
//
// News rides in this drawer instead of taking a top-level slot. The sister
// portal keeps News at L1 on the reasoning that a news item is read once
// while a tool is reused; that holds, but its nav row has no Liegenschaften
// and no Pläne & Dokumente to pay for. Here a sixth L1 entry would push the
// row past the CD's «limit to five» guidance, and News currently has no nav
// home at all — reachable only from the landing page and from search.
export function infoMenu() {
  return {
    id: 'info',
    label: t('nav.info'),
    type: 'dropdown',
    items: [
      { href: '#/info', label: t('info.overview') },
      ...INFO_PAGES.map(p => ({ href: p.href, label: t(p.titleKey) })),
      { href: '#/news', label: t('nav.news') },
    ],
  };
}

// Nav items are built per render so labels follow the active language.
// Arbeitsinstrumente / Pläne & Dokumente are inlined here for the same reason.
// Logged-out visitors see the FULL tenant navigation (same entries as the
// LBO role) so the portal's scope is discoverable before login — user
// feedback showed visitors did not realise more content exists behind the
// mock login. Protected routes render the central login gate instead of
// content (renderLoginGate via handleHash in app.js).
// «Meine Vorgänge» sits LAST in the row throughout. The entries before it are
// the portal's offer — what you can do and look at, browsed left to right;
// the case list is the reader's own workspace, and parking it at the end of
// the row keeps it in one predictable place across every role's navigation.
export function publicNavItems() {
  return [
    { id: 'start', href: '#/', label: t('nav.start') },
    servicesMenu(),
    { id: 'properties', href: '#/properties', label: t('nav.properties') },
    { id: 'downloads', href: '#/downloads', label: t('nav.downloads') },
    infoMenu(),
    { id: 'inbox', href: '#/inbox', label: t('nav.inbox') },
  ];
}

export function authNavItems() {
  const role = state.user.activeRole;
  const downloads = { id: 'downloads', href: '#/downloads', label: t('nav.downloads') };
  const info = infoMenu();
  if (role === 'GS-Reviewer') {
    return [
      { id: 'queue', href: '#/queue', label: t('nav.queue') },
      servicesMenu(),
      downloads,
      info,
      { id: 'inbox', href: '#/inbox', label: t('nav.inboxVe') },
    ];
  }
  // No "home" entry: the signed-in overview lives on the front page now, and
  // the logo lockup is the way there — the same rule that keeps "Start" out of
  // the nav row and out of the breadcrumb.
  if (role === 'LBO' || !role) {
    return [
      servicesMenu(),
      { id: 'properties', href: '#/properties', label: t('nav.properties') },
      downloads,
      info,
      { id: 'inbox',      href: '#/inbox',      label: t('nav.inbox') },
    ];
  }
  return [
    servicesMenu(),
    downloads,
    info,
  ];
}


// ── FEDERAL SHELL ──────────────────────────────────────────────────────────
export function renderShell({ deptSub = '', activeNav = '', breadcrumb = [], navItems = [] } = {}) {
  const sub = deptSub || t('org.portal');
  // Anmelden lives in the top-bar (dark utility bar), not the brand bar.
  // Plain white text per CD pattern — not a red filled button.
  const authPill = state.user
    ? `<a class="top-bar__link top-bar__link--user" href="#/profile" aria-label="${t('top.profileAria', { name: escapeHtml(state.user.name) })}">
         ${icon('user')}
         ${escapeHtml(state.user.name)}
       </a>`
    : `<button class="top-bar__link top-bar__link--user" type="button" onclick="window.portal.login()">
         ${icon('user')}
         ${t('top.login')}
       </button>`;

  // Per CD pattern (bbl.admin.ch / geo.admin.ch): "Start" is NOT a top-nav
  // item — and, since this round, not a breadcrumb item either. The federal
  // logo lockup (`.top-header__left`, an anchor to `#/`) is the single home
  // affordance; a "Start" crumb duplicated it on every sub-page. The data
  // still carries it (mobile burger menu + auth state checks), we just don't
  // render it in the desktop nav row.
  const desktopNavItems = navItems.filter(n => n.id !== 'start' && n.id !== 'home');

  // Dropdown panels (CD Bund pattern: constrained card under the trigger,
  // single-line label rows, red left-bar on the active route). Rendered
  // directly AFTER their trigger inside .main-navigation so the mobile
  // drawer can show them as in-flow accordions under the trigger row;
  // on desktop they're position:absolute against .navbar, so their place
  // in the flow doesn't matter there.
  // Query string dropped before comparing: a row must still read as active on
  // `#/info?lang=de`, and every branch below is about the PATH.
  const currentHash = (location.hash || '#/').split('?')[0];
  const isActiveSub = (href) => {
    // Overview rows are exact matches. Without this the generic prefix rule
    // marks «Übersicht» active on every topic page underneath it.
    if (href === '#/services')  return currentHash === '#/services';
    if (href === '#/info')      return currentHash === '#/info';
    if (href === '#/wizard/1')  return currentHash.startsWith('#/wizard');
    if (href === '#/downloads') return currentHash.startsWith('#/downloads');
    return currentHash === href || currentHash.startsWith(href + '/');
  };
  const renderNavMenuPanel = (item) => `
    <div class="nav-menu" id="navMenu-${item.id}" role="region" aria-label="${item.label}" hidden>
      <div class="nav-menu__inner">
        <button class="nav-menu__close" type="button"
                aria-label="Menü schliessen"
                onclick="window.portal.toggleNavMenu('${item.id}', false)">
          <span>Schliessen</span>
          ${icon('x')}
        </button>
        <h2 class="nav-menu__heading">${item.label}</h2>
        <ul class="nav-menu__list">
          ${(item.items || []).map(sub => {
            const isExternal = sub.external === true;
            const extraAttrs = isExternal ? 'target="_blank" rel="noopener"' : '';
            const extraClass = isExternal ? 'nav-menu__link link--external' : 'nav-menu__link';
            return `
              <li class="nav-menu__item ${isActiveSub(sub.href) ? 'nav-menu__item--active' : ''}">
                <a class="${extraClass}" href="${sub.href}" ${extraAttrs}
                   onclick="window.portal.toggleNavMenu('${item.id}', false)">
                  ${sub.label}
                </a>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    </div>
  `;

  const navHtml = desktopNavItems.map((item) => {
    const activeCls = item.id === activeNav ? 'main-navigation__link--active' : '';
    // CD mobile pattern: every top-level nav item gets a right-arrow at
    // the right edge as a tap affordance (sections/mobile-menu.postcss
    // → .mobile-menu-v2-navigation-item__has-children .icon). Shown via
    // CSS only at <1024 px; hidden on desktop.
    const mobileArrow = `<span class="main-navigation__arrow" aria-hidden="true">${icon('chevronRight')}</span>`;
    if (item.type === 'dropdown') {
      // APG disclosure-navigation pattern: aria-expanded + aria-controls
      // only. No aria-haspopup="menu" — the controlled panel is a
      // role="region" with plain links, not a menu widget, so announcing
      // "menu" promises arrow-key behaviour that doesn't exist (A11Y-010).
      return `
        <button class="main-navigation__link main-navigation__link--has-menu ${activeCls}"
                type="button"
                aria-expanded="false"
                aria-controls="navMenu-${item.id}"
                data-menu="${item.id}"
                onclick="window.portal.toggleNavMenu('${item.id}')">
          <span class="main-navigation__label">${item.label}</span>
          ${icon('chevronDown', 'main-navigation__chevron')}
          ${mobileArrow}
        </button>
        ${renderNavMenuPanel(item)}
      `;
    }
    return `<a class="main-navigation__link ${activeCls}" href="${item.href}"><span class="main-navigation__label">${item.label}</span>${mobileArrow}</a>`;
  }).join('');

  // Mobile-only meta links rendered at the foot of the burger menu so
  // Kontakt / Hilfe — and, critically, the ACCOUNT + LANGUAGE controls —
  // stay reachable when the top-bar (which hosts them on desktop) is
  // hidden below 1024 px. Without this an authenticated phone user has no
  // chrome path to profile/logout, and no interior route offers a login.
  // CD Bund keeps meta navigation (account + language) at the foot of the
  // burger drawer (sections/mobile-menu.postcss / MobileMenu.vue).
  const mobileAccountHtml = state.user
    ? `<a class="main-navigation__link main-navigation__mobile-meta-account" href="#/profile" aria-label="${t('top.profileAria', { name: escapeHtml(state.user.name) })}">${icon('user')}<span>${escapeHtml(state.user.name)}</span></a>
       <button class="main-navigation__link main-navigation__mobile-meta-account" type="button" onclick="window.portal.logout()">${icon('logout')}<span>${t('top.logout')}</span></button>`
    : `<button class="main-navigation__link main-navigation__mobile-meta-account" type="button" onclick="window.portal.login()">${icon('login')}<span>${t('top.login')}</span></button>`;

  // Same language set and order as the top-bar switcher: DE FR IT EN.
  // Rumantsch is not offered — the portal carries no Rumantsch strings, and a
  // permanently disabled fifth option advertised a language it cannot serve.
  const mobileLangHtml = `
    <div class="main-navigation__mobile-lang" role="group" aria-label="${t('top.language')}">
      ${[['DE', 'de'], ['FR', 'fr'], ['IT', 'it'], ['EN', 'en']].map(([code, lang, disabled]) => {
        if (disabled) {
          return `<button class="main-navigation__mobile-lang-btn" type="button" lang="${lang}" aria-disabled="true">${code}</button>`;
        }
        const isActive = state.lang === lang;
        return `<button class="main-navigation__mobile-lang-btn${isActive ? ' main-navigation__mobile-lang-btn--active' : ''}" type="button" lang="${lang}" aria-pressed="${isActive}" onclick="window.portal.pickLang('${code}')">${code}</button>`;
      }).join('')}
    </div>
  `;

  const mobileMetaHtml = `
    <div class="main-navigation__mobile-meta" aria-label="Meta-Navigation (mobil)">
      ${mobileAccountHtml}
      <a class="main-navigation__link" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">${t('nav.contact')}</a>
      <a class="main-navigation__link" href="#/info">${t('nav.help')}</a>
      ${mobileLangHtml}
    </div>
  `;

  // Schema.org BreadcrumbList microdata mirrors what bbl/admin.ch
  // serves publicly. Each entry is a ListItem with `position` (1-based)
  // and `name`; the anchor's `href` plays the `item` role.
  //
  // No peer-navigation dropdown on the crumbs. The DS does ship
  // `.breadcrumb__dropdown-icon`, but for a different job: geo.admin.ch-style
  // deep hierarchies where each level has siblings worth hopping between. This
  // portal is two or three levels deep with a flat top nav, so the control
  // opened a drawer that merely repeated the navigation bar directly above it
  // — and on a crumb without peers it rendered as an empty bordered box.
  // Every trail opens with a link home. Both variants of the DS component
  // (app/components/ch/navigations/BreadcrumbNavigation.vue, `isSimplePage`
  // and the full one) start with a «Startseite» item, and bbl.admin.ch
  // serves it that way too — «Startseite › Arbeiten beim BBL › Vorteile und
  // Benefits». An earlier round dropped it on the reasoning that the logo
  // lockup is the home affordance; it is, but the CD carries both.
  const crumbs = breadcrumb.length
    ? [{ href: '#/', label: t('bc.home') }, ...breadcrumb]
    : [];

  const breadcrumbHtml = crumbs.length
    ? `<nav class="breadcrumb" aria-label="Brotkrumen">
         <ol class="breadcrumb__list" itemscope itemtype="https://schema.org/BreadcrumbList">
           ${crumbs.map((b, i, a) => {
             const isLast = i === a.length - 1;
             return `
             <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
               ${isLast
                 ? `<span aria-current="page" itemprop="name">${b.label}</span>`
                 : `<a href="${b.href}" itemprop="item"><span itemprop="name">${b.label}</span></a>`}
               ${!isLast ? icon('chevronRight', 'breadcrumb__sep') : ''}
               <meta itemprop="position" content="${i + 1}">
             </li>
           `;
           }).join('')}
         </ol>
       </nav>`
    : '';

  return `
    ${renderPrototypeNotice()}
    ${renderConsentBanner()}

    <a href="#main" class="skip-to-content"
       onclick="event.preventDefault(); document.getElementById('main')?.focus();">Zum Inhalt springen</a>

    <header class="site-header" role="banner">
      <div class="top-bar">
        <div class="top-bar__inner">
          <a class="top-bar__authorities" href="https://www.admin.ch/de/bundesverwaltung"
             target="_blank" rel="noopener" title="${t('top.allAuthorities')} (admin.ch)">
            <span>${t('top.allAuthorities')}</span>
            ${icon('external')}
          </a>
          <div class="top-bar__actions">
            <span class="top-bar__demo-chip" role="status" aria-label="${t('top.demoAria')}">${t('top.demo')}</span>
            ${authPill}
            <div class="language-switcher" id="langSwitch">
              <button class="top-bar__lang" aria-label="${t('lang.choose')}" aria-haspopup="listbox" aria-expanded="false"
                      onclick="window.portal.toggleLang()">
                <span id="langCurrent">${state.lang.toUpperCase()}</span>
                ${icon('chevronDown')}
              </button>
              <!-- CD order (DS LanguageSwitcher.vue) minus Rumantsch: the DS
                   lists all four national languages, but this portal has no
                   Rumantsch content, so it offers DE FR IT EN. -->
              <ul class="language-switcher__dropdown" role="listbox" aria-label="${t('lang.label')}">
                ${[['DE', 'de'], ['FR', 'fr'], ['IT', 'it'], ['EN', 'en']].map(([code, lang, disabled]) => {
                  const isActive = !disabled && state.lang === lang;
                  return `<li role="presentation"><button class="language-switcher__option${isActive ? ' language-switcher__option--active' : ''}" role="option" aria-selected="${isActive}"${disabled ? ' aria-disabled="true" tabindex="-1"' : ''} data-lang="${code}" lang="${lang}" onclick="window.portal.pickLang('${code}')">${code}</button></li>`;
                }).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="top-header__department-strip" aria-hidden="true">
        <div class="top-header__department-strip-inner">${t('org.bbl')}</div>
      </div>

      <div class="top-header">
        <div class="top-header__inner">
          <a class="top-header__left" href="#/"
             aria-label="${t('nav.start')} — ${t('org.bbl')} · ${sub} (Intranet)">
            <span class="top-header__bundmark">
              <img class="top-header__bundmark-flag" src="assets/swiss-logo-flag.svg" alt="" aria-hidden="true">
              <img class="top-header__bundmark-name" src="assets/swiss-logo-name.svg" alt="" aria-hidden="true">
            </span>
            <span class="top-header__divider" aria-hidden="true"></span>
            <span class="top-header__dept">
              <span class="top-header__dept-name"><strong>${t('org.bbl')}</strong></span>
              <span class="top-header__dept-sub">${sub}</span>
              <!-- Intranet marker. CD Bund appends it to the logo lockup in
                   the intranet skin, as a badge--blue pseudo-element on
                   .logo__title / .logo__accronym
                   (designsystem/css/skins/intranet.postcss:32-43). Real markup
                   rather than a ::after so the word is in the accessibility
                   tree and not duplicated into copied text; the anchor's
                   aria-label carries it too, since an explicit label would
                   otherwise suppress the inner text. Untranslated by design —
                   "Intranet" is the same string in DE/FR/IT/EN. -->
              <span class="badge badge--blue top-header__skin-badge">Intranet</span>
            </span>
          </a>
          <div class="top-header__right">
            <nav class="top-header__meta" aria-label="Meta-Navigation">
              <a class="top-header__meta-link" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">${t('nav.contact')}</a>
              <a class="top-header__meta-link" href="#/info">${t('nav.help')}</a>
            </nav>
            <div class="top-header__actions">
              <div class="header-search" id="headerSearch">
                <button class="header-search__toggle" type="button"
                        aria-expanded="false" aria-controls="headerSearchForm"
                        onclick="window.portal.toggleSearch(true)">
                  <span>${t('top.search')}</span>
                  ${icon('search')}
                </button>
                <form class="header-search__form" id="headerSearchForm" role="search" aria-label="${t('top.search')}"
                      onsubmit="event.preventDefault(); window.portal.submitSearch(this);">
                  <input class="header-search__input" id="headerSearchInput" type="search"
                         name="q"
                         placeholder="${t('top.searchPlaceholder')}" aria-label="${t('top.searchPlaceholder')}"
                         autocomplete="off"
                         onkeydown="if(event.key==='Escape') window.portal.toggleSearch(false);">
                  <button class="header-search__submit" type="submit" aria-label="${t('top.search')}">
                    ${icon('search')}
                  </button>
                </form>
              </div>
              <!-- CD pattern (components/burger.postcss): burger lives in
                   the top-header right-side row, to the right of search,
                   visible only below lg (1024 px). -->
              <button class="burger" type="button"
                      aria-label="Menü öffnen"
                      aria-expanded="false"
                      aria-controls="mainNavigation"
                      onclick="window.portal.toggleBurger();">
                <span class="burger__icon" aria-hidden="true">
                  <span class="burger__bar"></span>
                  <span class="burger__bar"></span>
                  <span class="burger__bar"></span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <nav class="navbar" aria-label="Hauptnavigation">
        <div class="navbar__inner">
          <div class="main-navigation" id="mainNavigation">${navHtml}${mobileMetaHtml}</div>
        </div>
      </nav>
    </header>

    ${breadcrumbHtml}

    <!-- The main landmark CONTAINS the page content: every route renders
         into #page-body, which lives inside #main so "jump to main" /
         the skip link actually land on the content (WCAG 1.3.1/2.4.1). -->
    <main id="main" tabindex="-1"><div id="page-body"></div></main>
  `;
}


// ── FOOTER ────────────────────────────────────────────────────────────────
// Content + structure matches bbl.admin.ch/de footer pattern:
// brand column (motto), Weitere Informationen (link list with arrows),
// Prototyp meta column, then a narrow darker strip with AGB / Rechtliches /
// Barrierefreiheit, plus a back-to-top button anchored top-right.
export function renderFooter() {
  return `
    <footer class="app-footer" role="contentinfo">
      <div class="footer-information">
        <div class="footer-information__inner">
          <div class="footer-information__col footer-information__col--brand">
            <h2 class="footer-information__brand">${t('footer.about')}</h2>
            <p class="footer-information__motto">
              Bundesamt für Bauten und Logistik — nachhaltig, partnerschaftlich und vorbildlich.
            </p>
            <p class="footer-information__prototype-warning" role="note">
              ${t('proto.title')} ${t('proto.text')}
            </p>
          </div>

          <div class="footer-information__col footer-information__col--links">
            <h2 class="footer-information__heading">${t('footer.moreInfo')}</h2>
            <ul class="footer-information__list">
              <li><a href="https://www.bbl.admin.ch/bbl/de/home/das-bbl/rechtliche-grundlagen.html" target="_blank" rel="noopener">${t('footer.legal')} ${icon('arrowRight', 'footer-information__arrow')}</a></li>
              <li><a href="https://www.bbl.admin.ch/de/e-rechnung" target="_blank" rel="noopener">E-Rechnung ${icon('arrowRight', 'footer-information__arrow')}</a></li>
              <li><a href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">${t('nav.contact')} ${icon('arrowRight', 'footer-information__arrow')}</a></li>
            </ul>
          </div>

          <div class="footer-information__col footer-information__col--links">
            <h2 class="footer-information__heading">${t('footer.prototype')}</h2>
            <ul class="footer-information__list">
              <li><a href="https://github.com/bbl-dres/tenant-portal" target="_blank" rel="noopener">Quellcode auf GitHub ${icon('arrowRight', 'footer-information__arrow')}</a></li>
              <li><a href="https://www.bk.admin.ch/de/webauftritt-der-bundesverwaltung" target="_blank" rel="noopener">Webauftritt der Bundesverwaltung ${icon('arrowRight', 'footer-information__arrow')}</a></li>
              <li><a href="https://bbl-dres.github.io/service-portal/" target="_blank" rel="noopener">Variante Service Portal ${icon('arrowRight', 'footer-information__arrow')}</a></li>
            </ul>
          </div>

        </div>
      </div>

      <div class="app-footer__bottom">
        <div class="app-footer__bottom-inner">
          <a class="app-footer__bottom-link" href="https://www.bkb.admin.ch/bkb/de/home/themen/agb.html" target="_blank" rel="noopener">${t('footer.terms')}</a>
          <a class="app-footer__bottom-link" href="https://www.admin.ch/gov/de/start/rechtliches.html" target="_blank" rel="noopener">${t('footer.legalShort')}</a>
          <a class="app-footer__bottom-link" href="https://www.admin.ch/gov/de/start/rechtliches.html#datenschutzerkl%C3%A4rung" target="_blank" rel="noopener">${t('footer.privacy')}</a>
          <a class="app-footer__bottom-link" href="https://www.admin.ch/gov/de/start/dokumentation/impressum.html" target="_blank" rel="noopener">${t('footer.imprint')}</a>
          <a class="app-footer__bottom-link" href="https://www.ebgb.admin.ch/de/barrierefreiheit-in-der-bundesverwaltung" target="_blank" rel="noopener">${t('footer.accessibilityFull')}</a>
        </div>
      </div>
    </footer>
  `;
}


// ── NAV-MENU DROPDOWN (anchored under trigger word) ───────────────────────

// Lazy-creates the page-darkening overlay element that sits behind the
// open nav-menu panel. DS pattern `.desktop-menu__overlay` — dark
// gradient that softens the page below the nav while a dropdown is
// open. Click-through closes the menu via the existing click-outside
// handler since the overlay is rendered ABOVE page content but the
// click bubbles up to document.
function ensureNavOverlay() {
  let overlay = document.querySelector('.main-navigation__overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'main-navigation__overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.addEventListener('click', () => {
    document.querySelectorAll('.nav-menu:not([hidden])').forEach(m => {
      const id = m.id.replace('navMenu-', '');
      toggleNavMenu(id, false);
    });
  });
  document.body.appendChild(overlay);
  return overlay;
}

// Click-outside + Esc closers + viewport-resize repositioner live as
// module-load side effects below the function. The repositioner is
// rAF-debounced so continuous-resize doesn't thrash layout.
let _navMenuRaf = null;
document.addEventListener('click', (e) => {
  // Close nav menus on click outside.
  if (!e.target.closest('.nav-menu, .main-navigation__link--has-menu')) {
    document.querySelectorAll('.nav-menu:not([hidden])').forEach(m => {
      const id = m.id.replace('navMenu-', '');
      toggleNavMenu(id, false);
    });
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.nav-menu:not([hidden])').forEach(m => {
    const id = m.id.replace('navMenu-', '');
    toggleNavMenu(id, false);
  });
});
window.addEventListener('resize', () => {
  if (_navMenuRaf) return;
  _navMenuRaf = requestAnimationFrame(() => {
    _navMenuRaf = null;
    document.querySelectorAll('.nav-menu:not([hidden])').forEach(m => {
      const id = m.id.replace('navMenu-', '');
      const trigger = document.querySelector(`[data-menu="${id}"]`);
      const navbar = trigger && trigger.closest('.navbar');
      if (!trigger || !navbar) return;
      const navRect = navbar.getBoundingClientRect();
      const tRect = trigger.getBoundingClientRect();
      const panelW = m.offsetWidth;
      let leftPx = tRect.left - navRect.left;
      if (leftPx + panelW > navRect.width - 12) {
        leftPx = Math.max(12, navRect.width - panelW - 12);
      }
      m.style.left = leftPx + 'px';
    });
  });
});
export function toggleNavMenu(id, force) {
  const panel = document.getElementById('navMenu-' + id);
  const trigger = document.querySelector(`[data-menu="${id}"]`);
  if (!panel) return;
  const isOpen = !panel.hasAttribute('hidden');
  const next = (typeof force === 'boolean') ? force : !isOpen;
  // Focus bookkeeping BEFORE the panel gets [hidden]: hiding the focused
  // subtree silently drops focus to <body> (WCAG 2.4.3), leaving keyboard
  // users at the top of the document after Esc / close button / click
  // outside. `activeElement === body` covers the outside-click path, where
  // the browser has already blurred the panel link on mousedown (a click on
  // a focusable target keeps focus there instead — never stolen). A11Y-010.
  const restoreFocus = panel.contains(document.activeElement) || document.activeElement === document.body;
  // Close any other open nav menus + drop the lift on their triggers.
  document.querySelectorAll('.nav-menu').forEach(m => {
    m.setAttribute('hidden', '');
    m.classList.remove('open');
  });
  document.querySelectorAll('.main-navigation__link--has-menu').forEach(t => {
    t.setAttribute('aria-expanded', 'false');
    t.classList.remove('main-navigation__link--clicked');
  });
  // Page overlay — dark-fade gradient behind the open panel (DS
  // `.desktop-menu__overlay`). The CSS `top` defaults to 56 px which
  // is wrong for our 3-row chrome (top-bar + brand bar + nav bar),
  // so we measure the navbar's actual bottom each time and set top
  // dynamically. Done here (not in CSS) because the chrome height
  // varies by viewport width — the brand bar's `top-header` and the
  // top-bar both have responsive heights.
  const overlay = ensureNavOverlay();
  const navbarEl = document.querySelector('.navbar');
  if (navbarEl) {
    overlay.style.top = navbarEl.getBoundingClientRect().bottom + 'px';
  }
  overlay.classList.toggle('main-navigation__overlay--open', next);
  if (next) {
    panel.removeAttribute('hidden');
    panel.classList.add('open');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
      trigger.classList.add('main-navigation__link--clicked');
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
  } else if (isOpen && restoreFocus && trigger) {
    trigger.focus();
  }
}


// ── SHARE BAR (above detail pages: Teilen + Drucken) ──────────────────────
// Optional `backTo`/`backLabel` adds a "Zurück" affordance on the left
// — CD Bund pattern (separate `.back-bar` + `.share-bar` rows, federal
// detail-page convention). We combine into one bar with
// `justify-content: space-between` so the row reads back-on-left,
// actions-on-right. Pass these from detail pages reached from a list.
export function renderShareBar({ backTo = null, backLabel = null } = {}) {
  // Canonical CD Bund back button: `.btn .btn--outline .btn--sm .btn--back`
  // with an ArrowLeft glyph — verified against the DS's own detail pages
  // (detailPressRelease/detailEvent/detailPublication*.vue all compose
  // `<Btn variant="outline" size="sm" icon="ArrowLeft" class="btn--back">`;
  // `.btn--back` itself is only the float/margin modifier,
  // btn.postcss:188-191). The full destination ("Zurück zu …") stays in
  // `aria-label` for screen-reader context; the breadcrumb above already
  // shows it visually.
  const back = backTo
    ? `<a class="btn btn--outline btn--sm btn--back" href="${backTo}" aria-label="${t('btn.back')}${backLabel ? ' – ' + escapeHtml(backLabel) : ''}">
         ${icon('arrowLeft')}
         <span>${t('btn.back')}</span>
       </a>`
    : '';
  return `
    <div class="share-bar" role="toolbar" aria-label="${t('sharebar.label')}">
      ${back}
      <div class="share-bar__actions">
        <button class="share-bar__btn" type="button" aria-label="${t('btn.print')}"
                onclick="window.print()">
          ${icon('printer')}
        </button>
        <button class="share-bar__btn" type="button" aria-label="${t('btn.copyLink')}"
                onclick="window.portal.copyShareLink()">
          ${icon('share')}
        </button>
      </div>
    </div>
  `;
}

export function copyShareLink() {
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


// ── LANGUAGE SWITCHER (top-bar listbox) ───────────────────────────────────
export function toggleLang(forceOpen) {
  const el = document.getElementById('langSwitch');
  const btn = el && el.querySelector('.top-bar__lang');
  if (!el) return;
  const willOpen = typeof forceOpen === 'boolean' ? forceOpen : !el.classList.contains('open');
  el.classList.toggle('open', willOpen);
  if (btn) btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  // When opening, move focus to the currently active option so arrow-key
  // navigation has a starting point. When closing, return focus to the
  // trigger so the keyboard user stays oriented.
  if (willOpen) {
    const active = el.querySelector('.language-switcher__option--active') || el.querySelector('.language-switcher__option');
    if (active) setTimeout(() => active.focus(), 0);
  } else if (btn && document.activeElement && el.contains(document.activeElement)) {
    btn.focus();
  }
}
export function pickLang(code) {
  const lang = String(code).toLowerCase();
  toggleLang(false);
  // Guard against a code the portal does not carry (e.g. an old RM link).
  if (!LANGS.includes(lang) || lang === state.lang) return;
  setLang(lang);   // persist + <html lang> (eCH-0059 a11y)
  // Write the choice into the URL (?lang) — the source of truth. The resulting
  // hashchange re-renders the current route in the new language.
  const full = location.hash || '#/';
  const qIdx = full.indexOf('?');
  const route = qIdx >= 0 ? full.slice(0, qIdx) : full;
  const params = new URLSearchParams(qIdx >= 0 ? full.slice(qIdx + 1) : '');
  params.set('lang', lang);
  location.hash = route + '?' + params.toString();
}

// Click-outside + Esc close + Arrow-key navigation for the language
// listbox. Keeps the dropdown reachable to keyboard-only users without
// bolting on a library. Side-effect on module load.
document.addEventListener('click', (e) => {
  const el = document.getElementById('langSwitch');
  if (!el || !el.classList.contains('open')) return;
  if (e.target.closest('#langSwitch')) return;
  toggleLang(false);
});
document.addEventListener('keydown', (e) => {
  const el = document.getElementById('langSwitch');
  if (!el || !el.classList.contains('open')) return;
  const opts = Array.from(el.querySelectorAll('.language-switcher__option:not([aria-disabled="true"])'));
  const idx = opts.indexOf(document.activeElement);
  if (e.key === 'Escape') { e.preventDefault(); toggleLang(false); return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); (opts[(idx + 1) % opts.length] || opts[0]).focus(); }
  if (e.key === 'ArrowUp')   { e.preventDefault(); (opts[(idx - 1 + opts.length) % opts.length] || opts[opts.length - 1]).focus(); }
  if (e.key === 'Home')      { e.preventDefault(); opts[0] && opts[0].focus(); }
  if (e.key === 'End')       { e.preventDefault(); opts[opts.length - 1] && opts[opts.length - 1].focus(); }
});


// ── HEADER SEARCH (collapsing) ────────────────────────────────────────────
export function submitSearch(form) {
  const q = (form.querySelector('input[name="q"]').value || '').trim();
  if (!q) return;
  toggleSearch(false);
  // Router seam: navigate lives in app.js. Read via window.portal so we
  // don't form a circular import. A dedicated router.js module is a future
  // refactor.
  window.portal.navigate('#/search?q=' + encodeURIComponent(q));
}

export function toggleSearch(open) {
  const el = document.getElementById('headerSearch');
  const toggle = document.querySelector('.header-search__toggle');
  const input = document.getElementById('headerSearchInput');
  if (!el) return;
  if (open) {
    el.classList.add('open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('tabindex', '-1');   // hide collapsed trigger from tab order while open
    }
    if (input) setTimeout(() => input.focus(), 50);
  } else {
    // Capture BEFORE collapsing: once the form goes visibility:hidden the
    // browser silently drops focus to <body>, stranding keyboard users with
    // no visible focus (A11Y-009). Esc in the input and submitSearch both
    // land here with focus still inside the widget.
    const hadFocusInside = document.activeElement && el.contains(document.activeElement);
    el.classList.remove('open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.removeAttribute('tabindex');
      if (hadFocusInside) toggle.focus();
    }
  }
}
// Click-outside collapses the open header search. Mirrors the language-
// switcher / nav-menu UX: anything that opens via a button should also
// close when the user clicks anywhere else.
document.addEventListener('click', (e) => {
  const el = document.getElementById('headerSearch');
  if (!el || !el.classList.contains('open')) return;
  if (e.target.closest('#headerSearch')) return;
  toggleSearch(false);
});


// ── BURGER MENU (mobile nav toggle) ───────────────────────────────────────
// Keep the visible icon and the aria-expanded state in sync. Returning
// focus to the burger on close mirrors the language switcher behaviour
// and keeps the keyboard user oriented.
//
// Also: body-scroll-lock via `.body--mobile-menu-is-open` (CD Bund pattern
// from designsystem/css/foundations/global.postcss:34); force-close any
// open nav-menu dropdown so the menu and a dropdown can't visually
// overlap; install a focus trap so Tab can't escape the open menu into
// the underlying page; restore focus to the burger on close.
let _trapHandler = null;
let _lastFocusBeforeMenu = null;
function _installFocusTrap(container) {
  _trapHandler = (e) => {
    if (e.key !== 'Tab') return;
    const focusables = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', _trapHandler);
}
function _removeFocusTrap() {
  if (_trapHandler) document.removeEventListener('keydown', _trapHandler);
  _trapHandler = null;
}
export function toggleBurger(forceOpen) {
  const nav = document.getElementById('mainNavigation');
  const btn = document.querySelector('.burger');
  if (!nav || !btn) {
    // Chrome was re-rendered while the drawer was open: the nav node is
    // gone, but the scroll-lock class and focus trap live on <body> /
    // document and must not leak into the new page.
    document.body.classList.remove('body--mobile-menu-is-open');
    _removeFocusTrap();
    return;
  }
  const willOpen = typeof forceOpen === 'boolean' ? forceOpen : !nav.classList.contains('open');
  nav.classList.toggle('open', willOpen);
  btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  btn.setAttribute('aria-label', willOpen ? 'Menü schliessen' : 'Menü öffnen');
  document.body.classList.toggle('body--mobile-menu-is-open', willOpen);
  // Close every open nav-menu panel on BOTH transitions — on open it keeps
  // "Dienstleistungen" from floating over the drawer list; on close it
  // resets the accordion + page overlay so they don't reappear stale the
  // next time the drawer opens without a route change in between.
  document.querySelectorAll('.nav-menu:not([hidden])').forEach(m => {
    toggleNavMenu(m.id.replace('navMenu-', ''), false);
  });
  // The CSS pins the open drawer at `inset: 72px 0 0` — correct only when
  // the brand bar sits flush at the viewport top. The cookie-consent
  // banner (or any other content above the header) pushes it down, which
  // would leave the brand bar floating over the drawer list and stealing
  // its clicks. Measure the real bottom edge instead — same trick
  // toggleNavMenu uses for the page overlay.
  const navbarEl = document.querySelector('.navbar');
  if (willOpen) {
    const topHeader = document.querySelector('.top-header');
    if (navbarEl && topHeader) {
      navbarEl.style.top = Math.max(0, topHeader.getBoundingClientRect().bottom) + 'px';
    }
    _lastFocusBeforeMenu = document.activeElement;
    _installFocusTrap(nav);
    // Move focus to the first link in the menu so keyboard users land inside.
    const firstLink = nav.querySelector('a, button');
    if (firstLink) setTimeout(() => firstLink.focus(), 0);
  } else {
    if (navbarEl) navbarEl.style.top = '';
    _removeFocusTrap();
    if (_lastFocusBeforeMenu === btn || !_lastFocusBeforeMenu) {
      btn.focus();
    } else if (_lastFocusBeforeMenu && document.body.contains(_lastFocusBeforeMenu)) {
      _lastFocusBeforeMenu.focus();
    }
    _lastFocusBeforeMenu = null;
  }
}
// Esc closes the open mobile menu — mirrors language-switcher / nav-menu UX.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const nav = document.getElementById('mainNavigation');
  if (nav && nav.classList.contains('open')) toggleBurger(false);
});
// Choosing any link inside the open drawer closes it. Links navigate via
// hashchange and the chrome re-renders, but `body--mobile-menu-is-open`
// and the focus trap live outside #root and survive the re-render —
// without this, the dead full-screen drawer stays fixed over the new
// page with scrolling locked. Delegated so it covers top-level links,
// nav-menu sub-links and the mobile meta links alike, including links
// to the CURRENT route (which fire no hashchange / re-render at all).
document.addEventListener('click', (e) => {
  if (!document.body.classList.contains('body--mobile-menu-is-open')) return;
  if (e.target.closest('#mainNavigation a[href]')) toggleBurger(false);
});
// Safety net for navigations that bypass the click path while the drawer
// is open (browser back/forward, programmatic hash changes). Runs before
// app.js's router listener (this module loads first), so the old DOM is
// still present and the close path can clean up normally.
window.addEventListener('hashchange', () => {
  if (document.body.classList.contains('body--mobile-menu-is-open')) toggleBurger(false);
});


// ── SHELL WRAPPER (mounts the chrome + reserves #page-body) ──────────────
// Called by every route renderer. Returns the <main> element so the
// renderer can use it for focus management.
export function shell({ activeNav = '', breadcrumb = [], deptSub = '' } = {}) {
  const root = document.getElementById('root');
  const navItems = state.user ? authNavItems() : publicNavItems();
  // `.page-container` is the positioning context for `.back-to-top-wrapper`
  // — it ends at the footer top so the wrapper's negative `bottom` extends
  // INTO the footer area (sibling below), not past the document. See the
  // back-to-top CSS block in styles.css for the sticky mechanism.
  root.innerHTML = '<div class="page-container">'
                 +   renderShell({ deptSub, activeNav, breadcrumb, navItems })
                 // DS BackToTopBtn.vue ships the wrapper WITHOUT aria-hidden:
                 // the link inside is focusable, and a focusable element must
                 // not sit in an aria-hidden subtree (WCAG 4.1.2). The link's
                 // own aria-label names it for AT.
                 +   '<div class="back-to-top-wrapper">'
                 +     `<a class="app-footer__top-btn" href="#" aria-label="${t('footer.backToTop')}"
                          onclick="event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' });">${icon('chevronUp')}</a>`
                 +   '</div>'
                 + '</div>'
                 + renderFooter()
                 + renderShortcutOverlay();
  // Measure after the markup is live — the notice is re-created by every
  // route render, and its height drives the bottom spacing reserved in CSS.
  syncPrototypeNoticeOffset();
  return document.getElementById('main');
}
