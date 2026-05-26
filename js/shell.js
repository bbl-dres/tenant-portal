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

import { state } from './state.js';
import { toast, icon, renderShortcutOverlay, safeGet, safeSet } from './lib.js';

const CONSENT_KEY = 'mp-cookie-consent';

function renderConsentBanner() {
  if (safeGet(CONSENT_KEY)) return '';
  return `
    <aside class="notification-banner notification-banner--info cookie-banner" id="cookieBanner" role="region" aria-label="Datenschutz und Cookies">
      <span class="notification-banner__icon" aria-hidden="true">${icon('infoCircle')}</span>
      <div class="notification-banner__wrapper">
        <p class="notification-banner__text">
          Dieses Portal speichert technisch notwendige Einstellungen lokal im Browser. Optionale Analyse-Cookies werden erst nach Zustimmung aktiviert.
          <a href="https://www.admin.ch/gov/de/start/rechtliches.html#datenschutzerkl%C3%A4rung" target="_blank" rel="noopener">Datenschutzerklaerung</a>
        </p>
        <div class="notification-banner__actions">
          <button class="btn btn--outline btn--sm" type="button" onclick="window.portal.acceptCookieConsent('necessary')">Nur notwendige</button>
          <button class="btn btn--filled btn--sm" type="button" onclick="window.portal.acceptCookieConsent('all')">Alle akzeptieren</button>
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
// Services (login required) — appear only in authenticated nav.
// Exported so #/services can also render this list as a card grid via
// `renderServicesOverview` in app.js without duplicating the catalogue.
export const SERVICES_MENU = {
  id: 'services',
  label: 'Dienstleistungen',
  type: 'dropdown',
  items: [
    { href: '#/services',  label: 'Übersicht',               desc: 'Alle Dienstleistungen im Überblick' },
    { href: '#/wizard/1',  label: 'Bedarf anmelden',         desc: 'Unterbringung, Büro, Auslandvertretung' },
    { href: '#/repair',    label: 'Schaden melden',          desc: 'Reparaturen, Sanitär, Schliesssystem' },
    { href: '#/moves',     label: 'Umzug & Sonderreinigung', desc: 'Transport- und Reinigungsanfragen' },
    { href: 'https://bbl-dres.github.io/workspace-management/', label: 'Möbel bestellen', desc: 'Standard- und Spezialmobiliar', external: true },
    { href: '#/downloads', label: 'Pläne & Dokumente',       desc: 'Grundrisse, Merkblätter, Schulungen' },
    { href: '#/training',  label: 'Schulungen',              desc: '„Mieterportal kompakt" und weitere' },
  ]
};

// Arbeitsinstrumente und Informationen (public, always visible) — single
// page at #/info with sticky TOC. Pattern: armasuisse Immo-Portal +
// kbob-fdk "Handbuch & Downloads".
const INFO_LINK = { id: 'info', href: '#/info', label: 'Arbeitsinstrumente und Informationen' };

export function publicNavItems() {
  return [
    { id: 'start', href: '#/', label: 'Start' },
    INFO_LINK,
  ];
}

export function authNavItems() {
  const role = state.user.activeRole;
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


// ── FEDERAL SHELL ──────────────────────────────────────────────────────────
export function renderShell({ deptSub = 'Mieterportal', activeNav = '', breadcrumb = [], navItems = [] } = {}) {
  // Anmelden lives in the top-bar (dark utility bar), not the brand bar.
  // Plain white text per CD pattern — not a red filled button.
  const authPill = state.user
    ? `<a class="top-bar__link top-bar__link--user" href="#/profile" aria-label="Profil von ${state.user.name}">
         ${icon('user')}
         ${state.user.name}
       </a>`
    : `<button class="top-bar__link top-bar__link--user" type="button" onclick="window.portal.login()">
         ${icon('user')}
         Anmelden
       </button>`;

  // Per CD pattern (bbl.admin.ch / geo.admin.ch): "Start" is NOT a top-nav
  // item. The federal logo at the top-left handles the "go home"
  // affordance, and the breadcrumb starts with "Start" on every sub-page.
  // The data still carries it (mobile burger menu + auth state checks),
  // we just don't render it in the desktop nav row.
  const desktopNavItems = navItems.filter(n => n.id !== 'start' && n.id !== 'home');

  const navHtml = desktopNavItems.map((item, i) => {
    const activeCls = item.id === activeNav ? 'main-navigation__link--active' : '';
    // CD mobile pattern: every top-level nav item gets a right-arrow at
    // the right edge as a tap affordance (sections/mobile-menu.postcss
    // → .mobile-menu-v2-navigation-item__has-children .icon). Shown via
    // CSS only at <1024 px; hidden on desktop.
    const mobileArrow = `<span class="main-navigation__arrow" aria-hidden="true">${icon('chevronRight')}</span>`;
    if (item.type === 'dropdown') {
      return `
        <button class="main-navigation__link main-navigation__link--has-menu ${activeCls}"
                type="button"
                aria-expanded="false"
                aria-haspopup="menu"
                aria-controls="navMenu-${item.id}"
                data-menu="${item.id}"
                onclick="window.portal.toggleNavMenu('${item.id}')">
          <span class="main-navigation__label">${item.label}</span>
          ${icon('chevronDown', 'main-navigation__chevron')}
          ${mobileArrow}
        </button>
      `;
    }
    return `<a class="main-navigation__link ${activeCls}" href="${item.href}"><span class="main-navigation__label">${item.label}</span>${mobileArrow}</a>`;
  }).join('');

  // Mobile-only meta links rendered at the foot of the burger menu so
  // Kontakt / Hilfe stay reachable when the top-header meta nav is
  // hidden at narrow widths.
  const mobileMetaHtml = `
    <div class="main-navigation__mobile-meta" aria-label="Meta-Navigation (mobil)">
      <a class="main-navigation__link" href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">Kontakt</a>
      <a class="main-navigation__link" href="#/help">Hilfe</a>
    </div>
  `;

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
  `).join('');

  // Schema.org BreadcrumbList microdata mirrors what bbl/admin.ch
  // serves publicly. Each entry is a ListItem with `position` (1-based)
  // and `name`; the anchor's `href` plays the `item` role.
  //
  // CD pattern: if a breadcrumb item corresponds to a top-level nav
  // route (e.g. "Liegenschaften" → matches one of `navItems`), surface
  // a small red-bordered chevron-down beside it. Clicking it opens a
  // 300 px drawer showing the *peer* top-nav items so the user can hop
  // sideways without going back through the menu. Matches what
  // bbl.admin.ch / geo.admin.ch do on their breadcrumbs.
  const flatNav = navItems.filter(n => n.type !== 'dropdown');
  // Home (`#/` or `#/home`) is exempt — CD pattern shows "Startseite"
  // bare, dropdown only on the next breadcrumb item that anchors a
  // top-nav route. Matches bbl.admin.ch / geo.admin.ch.
  function siblingsFor(item) {
    if (!item.href) return null;
    if (item.href === '#/' || item.href === '#/home') return null;
    const match = flatNav.find(n => n.href === item.href || (item.href.startsWith(n.href + '/')));
    if (!match) return null;
    const peers = flatNav.filter(n => n !== match);
    return peers.length > 0 ? { active: match, peers } : null;
  }
  const breadcrumbHtml = breadcrumb.length
    ? `<nav class="breadcrumb" aria-label="Brotkrumen">
         <ol class="breadcrumb__list" itemscope itemtype="https://schema.org/BreadcrumbList">
           ${breadcrumb.map((b, i, a) => {
             const isLast = i === a.length - 1;
             const sib = siblingsFor(b);
             return `
             <li class="breadcrumb__item ${sib ? 'breadcrumb__item--has-dropdown' : ''}" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
               ${isLast
                 ? `<span aria-current="page" itemprop="name">${b.label}</span>`
                 : `<a href="${b.href}" itemprop="item"><span itemprop="name">${b.label}</span></a>`}
               ${sib ? `
                 <button class="breadcrumb__dropdown-icon" type="button"
                         aria-label="Verwandte Bereiche zu ${b.label}"
                         aria-haspopup="menu"
                         aria-expanded="false"
                         aria-controls="bcDropdown-${i}"
                         onclick="window.portal.toggleBreadcrumbDropdown(${i})">
                   ${icon('chevronDown')}
                 </button>
                 <ul class="breadcrumb__dropdown" id="bcDropdown-${i}" role="menu" hidden>
                   <li class="breadcrumb__dropdown-active" role="menuitem"><span>${sib.active.label}</span></li>
                   ${sib.peers.map(p => `<li role="none"><a role="menuitem" href="${p.href}">${p.label}</a></li>`).join('')}
                 </ul>` : ''}
               ${!isLast ? icon('chevronRight', 'breadcrumb__sep') : ''}
               <meta itemprop="position" content="${i + 1}">
             </li>
           `;
           }).join('')}
         </ol>
       </nav>`
    : '';

  return `
    ${renderConsentBanner()}

    <a href="#main" class="skip-to-content">Zum Inhalt springen</a>

    <header class="site-header" role="banner">
      <div class="top-bar">
        <div class="top-bar__inner">
          <a class="top-bar__authorities" href="https://www.admin.ch/de/bundesverwaltung"
             target="_blank" rel="noopener" title="Alle Schweizer Bundesbehörden (admin.ch)">
            <span>Alle Schweizer Bundesbehörden</span>
            ${icon('external')}
          </a>
          <div class="top-bar__actions">
            <span class="top-bar__demo-chip" role="status" aria-label="Prototyp — nur zur Demonstration">Demo</span>
            ${authPill}
            <div class="language-switcher" id="langSwitch">
              <button class="top-bar__lang" aria-label="Sprache wählen" aria-haspopup="listbox" aria-expanded="false"
                      onclick="window.portal.toggleLang()">
                <span id="langCurrent">DE</span>
                ${icon('chevronDown')}
              </button>
              <ul class="language-switcher__dropdown" role="listbox" aria-label="Sprache">
                <li role="presentation"><button class="language-switcher__option language-switcher__option--active" role="option" aria-selected="true" data-lang="DE" lang="de" onclick="window.portal.pickLang('DE')">DE</button></li>
                <li role="presentation"><button class="language-switcher__option" role="option" aria-selected="false" aria-disabled="true" data-lang="FR" lang="fr" onclick="window.portal.pickLang('FR')">FR</button></li>
                <li role="presentation"><button class="language-switcher__option" role="option" aria-selected="false" aria-disabled="true" data-lang="IT" lang="it" onclick="window.portal.pickLang('IT')">IT</button></li>
                <li role="presentation"><button class="language-switcher__option" role="option" aria-selected="false" aria-disabled="true" data-lang="RM" lang="rm" onclick="window.portal.pickLang('RM')">RM</button></li>
                <li role="presentation"><button class="language-switcher__option" role="option" aria-selected="false" aria-disabled="true" data-lang="EN" lang="en" onclick="window.portal.pickLang('EN')">EN</button></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="top-header__department-strip" aria-hidden="true">
        <div class="top-header__department-strip-inner">Bundesamt für Bauten und Logistik BBL</div>
      </div>

      <div class="top-header">
        <div class="top-header__inner">
          <a class="top-header__left" href="#/"
             aria-label="Startseite — Bundesamt für Bauten und Logistik BBL · ${deptSub}">
            <span class="top-header__bundmark">
              <img class="top-header__bundmark-flag" src="assets/swiss-logo-flag.svg" alt="" aria-hidden="true">
              <img class="top-header__bundmark-name" src="assets/swiss-logo-name.svg" alt="" aria-hidden="true">
            </span>
            <span class="top-header__divider" aria-hidden="true"></span>
            <span class="top-header__dept">
              <span class="top-header__dept-name"><strong>Bundesamt für Bauten und Logistik BBL</strong></span>
              <span class="top-header__dept-sub">${deptSub}</span>
            </span>
          </a>
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
                  ${icon('search')}
                </button>
                <form class="header-search__form" id="headerSearchForm" role="search" aria-label="Portal durchsuchen"
                      onsubmit="event.preventDefault(); window.portal.submitSearch(this);">
                  <input class="header-search__input" id="headerSearchInput" type="search"
                         name="q"
                         placeholder="Suchbegriff eingeben" aria-label="Suchbegriff eingeben"
                         autocomplete="off"
                         onkeydown="if(event.key==='Escape') window.portal.toggleSearch(false);">
                  <button class="header-search__submit" type="submit" aria-label="Suchen">
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
        ${navMenus}
      </nav>
    </header>

    ${breadcrumbHtml}

    <main id="main" tabindex="-1"></main>
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
            <h2 class="footer-information__brand">Über das BBL</h2>
            <p class="footer-information__motto">
              Bundesamt für Bauten und Logistik — nachhaltig, partnerschaftlich und vorbildlich.
            </p>
            <p class="footer-information__prototype-warning" role="note">
              Diese Anwendung ist ein Prototyp. Darstellung, Funktionalität und Inhalte dienen ausschliesslich der Demonstration.
            </p>
          </div>

          <div class="footer-information__col footer-information__col--links">
            <h2 class="footer-information__heading">Weitere Informationen</h2>
            <ul class="footer-information__list">
              <li><a href="https://www.bbl.admin.ch/bbl/de/home/das-bbl/rechtliche-grundlagen.html" target="_blank" rel="noopener">Rechtliche Grundlagen ${icon('arrowRight', 'footer-information__arrow')}</a></li>
              <li><a href="https://www.bbl.admin.ch/bbl/de/home/themen/e-rechnung.html" target="_blank" rel="noopener">E-Rechnung ${icon('arrowRight', 'footer-information__arrow')}</a></li>
              <li><a href="https://www.bbl.admin.ch/de/kontakt" target="_blank" rel="noopener">Kontakt ${icon('arrowRight', 'footer-information__arrow')}</a></li>
            </ul>
          </div>

          <div class="footer-information__col footer-information__col--links">
            <h2 class="footer-information__heading">Prototyp</h2>
            <ul class="footer-information__list">
              <li><a href="https://github.com/bbl-dres/tenant-portal" target="_blank" rel="noopener">Quellcode auf GitHub ${icon('arrowRight', 'footer-information__arrow')}</a></li>
              <li><a href="https://github.com/swiss/designsystem" target="_blank" rel="noopener">CD Bund ${icon('arrowRight', 'footer-information__arrow')}</a></li>
            </ul>
          </div>

        </div>
      </div>

      <div class="app-footer__bottom">
        <div class="app-footer__bottom-inner">
          <a class="app-footer__bottom-link" href="https://www.bkb.admin.ch/bkb/de/home/themen/agb.html" target="_blank" rel="noopener">Allgemeine Geschäftsbedingungen des Bundes</a>
          <a class="app-footer__bottom-link" href="https://www.admin.ch/gov/de/start/rechtliches.html" target="_blank" rel="noopener">Rechtliches</a>
          <a class="app-footer__bottom-link" href="https://www.admin.ch/gov/de/start/rechtliches.html#datenschutzerkl%C3%A4rung" target="_blank" rel="noopener">Datenschutz</a>
          <a class="app-footer__bottom-link" href="https://www.admin.ch/gov/de/start/dokumentation/impressum.html" target="_blank" rel="noopener">Impressum</a>
          <a class="app-footer__bottom-link" href="https://www.edi.admin.ch/edi/de/home/fachstellen/ebgb/recht/schweiz/barrierefreie-bundesverwaltung.html" target="_blank" rel="noopener">Barrierefreiheit in der Bundesverwaltung</a>
        </div>
      </div>
    </footer>
  `;
}


// ── NAV-MENU DROPDOWN (anchored under trigger word) ───────────────────────
// Breadcrumb dropdown toggle — open/close the peer-list drawer attached
// to a breadcrumb item that matches a top-nav route. Same close-on-Esc
// / click-outside semantics as the nav-menu panels above.
export function toggleBreadcrumbDropdown(index, force) {
  const panel = document.getElementById('bcDropdown-' + index);
  const trigger = document.querySelector(`[aria-controls="bcDropdown-${index}"]`);
  if (!panel) return;
  const isOpen = !panel.hasAttribute('hidden');
  const next = (typeof force === 'boolean') ? force : !isOpen;
  // Close any other open breadcrumb dropdowns first.
  document.querySelectorAll('.breadcrumb__dropdown').forEach(p => p.setAttribute('hidden', ''));
  document.querySelectorAll('.breadcrumb__dropdown-icon').forEach(t => t.setAttribute('aria-expanded', 'false'));
  if (next) {
    panel.removeAttribute('hidden');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }
}

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
  // Close breadcrumb dropdowns on click outside.
  if (!e.target.closest('.breadcrumb__dropdown, .breadcrumb__dropdown-icon')) {
    document.querySelectorAll('.breadcrumb__dropdown:not([hidden])').forEach(p => {
      const idx = p.id.replace('bcDropdown-', '');
      toggleBreadcrumbDropdown(Number(idx), false);
    });
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.nav-menu:not([hidden])').forEach(m => {
    const id = m.id.replace('navMenu-', '');
    toggleNavMenu(id, false);
  });
  document.querySelectorAll('.breadcrumb__dropdown:not([hidden])').forEach(p => {
    const idx = p.id.replace('bcDropdown-', '');
    toggleBreadcrumbDropdown(Number(idx), false);
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
  }
}


// ── SHARE BAR (above detail pages: Teilen + Drucken) ──────────────────────
// Optional `backTo`/`backLabel` adds a "Zurück" affordance on the left
// — CD Bund pattern (separate `.back-bar` + `.share-bar` rows, federal
// detail-page convention). We combine into one bar with
// `justify-content: space-between` so the row reads back-on-left,
// actions-on-right. Pass these from detail pages reached from a list.
export function renderShareBar({ backTo = null, backLabel = null } = {}) {
  // Canonical CD Bund back button: `.btn .btn--outline .btn--back` with an
  // ArrowLeft glyph + "Zurück" label. The full destination ("Zurück zu …")
  // stays in `aria-label` for screen-reader context; the breadcrumb above
  // already shows it visually.
  const back = backTo
    ? `<a class="btn btn--outline btn--back" href="${backTo}" aria-label="Zurück${backLabel ? ` zu ${backLabel}` : ''}">
         ${icon('chevronLeft')}
         <span>Zurück</span>
       </a>`
    : '';
  return `
    <div class="share-bar" role="toolbar" aria-label="Seite-Aktionen">
      ${back}
      <div class="share-bar__actions">
        <button class="share-bar__btn" type="button" aria-label="Link kopieren"
                onclick="window.portal.copyShareLink()">
          ${icon('share')}
          <span>Teilen</span>
        </button>
        <button class="share-bar__btn" type="button" aria-label="Seite drucken"
                onclick="window.print()">
          ${icon('printer')}
          <span>Drucken</span>
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
  if (code !== 'DE') {
    toggleLang(false);
    toast(`${code}-Lokalisation noch nicht implementiert - Anzeige bleibt auf DE.`, '');
    return;
  }
  // a11y: update <html lang> so screen readers, hyphenation, and
  // spell-check switch pronunciation/segmentation even before content
  // translations land. eCH-0059 requirement; tracked as audit M-A3.
  document.documentElement.lang = code.toLowerCase();
  document.querySelectorAll('.language-switcher__option').forEach(o => {
    const isActive = o.getAttribute('data-lang') === code;
    o.classList.toggle('language-switcher__option--active', isActive);
    o.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  const current = document.getElementById('langCurrent');
  if (current) current.textContent = code;
  toggleLang(false);
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
    el.classList.remove('open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.removeAttribute('tabindex');
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
  if (!nav || !btn) return;
  const willOpen = typeof forceOpen === 'boolean' ? forceOpen : !nav.classList.contains('open');
  nav.classList.toggle('open', willOpen);
  btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  btn.setAttribute('aria-label', willOpen ? 'Menü schliessen' : 'Menü öffnen');
  document.body.classList.toggle('body--mobile-menu-is-open', willOpen);
  if (willOpen) {
    // Close every open nav-menu panel — keeps "Dienstleistungen" from
    // floating over the mobile drop-down list at narrow widths.
    document.querySelectorAll('.nav-menu:not([hidden])').forEach(m => {
      toggleNavMenu(m.id.replace('navMenu-', ''), false);
    });
    _lastFocusBeforeMenu = document.activeElement;
    _installFocusTrap(nav);
    // Move focus to the first link in the menu so keyboard users land inside.
    const firstLink = nav.querySelector('a, button');
    if (firstLink) setTimeout(() => firstLink.focus(), 0);
  } else {
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


// ── SHELL WRAPPER (mounts the chrome + reserves #page-body) ──────────────
// Called by every route renderer. Returns the <main> element so the
// renderer can use it for focus management.
export function shell({ activeNav = '', breadcrumb = [], deptSub = 'Mieterportal' } = {}) {
  const root = document.getElementById('root');
  const navItems = state.user ? authNavItems() : publicNavItems();
  // `.page-container` is the positioning context for `.back-to-top-wrapper`
  // — it ends at the footer top so the wrapper's negative `bottom` extends
  // INTO the footer area (sibling below), not past the document. See the
  // back-to-top CSS block in styles.css for the sticky mechanism.
  root.innerHTML = '<div class="page-container">'
                 +   renderShell({ deptSub, activeNav, breadcrumb, navItems })
                 +   '<div id="page-body"></div>'
                 +   '<div class="back-to-top-wrapper" aria-hidden="true">'
                 +     `<a class="app-footer__top-btn" href="#" aria-label="Zum Seitenanfang"
                          onclick="event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' });">${icon('chevronUp')}</a>`
                 +   '</div>'
                 + '</div>'
                 + renderFooter()
                 + renderShortcutOverlay();
  return document.getElementById('main');
}
