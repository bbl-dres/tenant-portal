/* ==========================================================================
   LIB.JS — pure helpers + UI primitives for the Mieterportal prototype.

   No app-state dependencies; everything in here is either:
     • pure (formatters, escapers, GeoJSON flattener),
     • a thin wrapper over the platform (localStorage primitives, toast, modal),
     • or a renderer that takes its inputs as arguments (statusBadge, pipeline,
       step indicator, shortcut overlay).

   Consumers import via `import { ... } from './lib.js'`. Side effects are
   confined to function calls — nothing happens at module load.
   ========================================================================== */

// ── FORMATTERS ─────────────────────────────────────────────────────────────
export function formatChf(n) {
  if (n == null || Number.isNaN(Number(n))) return 'CHF –';
  return 'CHF ' + Number(n).toLocaleString('de-CH');
}
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
// Use when interpolating into a JS-string literal that lives inside an
// HTML attribute (e.g. onclick="foo('${escapeJs(x)}')"). escapeHtml is
// wrong here because the browser HTML-decodes the attribute before the
// JS parser sees it, so &#39; turns back into ' and breaks the literal.
export function escapeJs(s) {
  return String(s ?? '').replace(/[\\'"<>&\r\n\u2028\u2029]/g, c => ({
    '\\': '\\\\', "'": "\\'", '"': '\\"',
    '<': '\\x3C', '>': '\\x3E', '&': '\\x26',
    '\r': '\\r', '\n': '\\n',
    '\u2028': '\\u2028', '\u2029': '\\u2029'
  }[c]));
}

// Compose the canonical scalar address fields back into a single display
// string. The on-disk schema is tidy (atomic street / houseNumber / postalCode
// / city / country) per docs/DATAMODEL.md § 1.2 Tidy-data principle; views
// expect a one-line `address` they can interpolate.
export function formatAddressLine(o) {
  if (!o || !o.street) return '';
  const num = o.houseNumber ? ' ' + o.houseNumber : '';
  return `${o.street}${num}, ${o.postalCode || ''} ${o.city || ''}`.trim().replace(/\s+,/g, ',');
}
// Asset key is an object { bk, we, obj } in-memory (per § 3.1); flatten to
// the SAP "bk/we/obj" display format.
export function formatAssetKey(ak) {
  if (!ak) return '';
  return `${ak.bk || ''}/${ak.we || ''}/${ak.obj || ''}`;
}
// Flatten a GeoJSON Point feature to the plain-object shape downstream
// code expects: properties are hoisted to the top level, and the canonical
// scalar `lng` / `lat` fields are reconstituted from `geometry.coordinates`
// per Appendix B of docs/DATAMODEL.md (logical schema is scalar; on-disk
// FeatureCollection is just the wire format).
export function flattenFeature(feature) {
  const [lng, lat] = feature.geometry?.coordinates || [];
  return { ...(feature.properties || {}), lng, lat };
}

export function roleLabel(role) {
  return ({
    'LBO': 'Logistikbeauftragte',
    'GS-Reviewer': 'GS-Prüfer/in',
    'BBL-PFM': 'BBL Portfolio-Management',
    'BBL-Campus': 'BBL Campus',
    'Auditor': 'EFD Auditor',
  })[role] || role;
}

// Canonical Document.type enum → German fallback label. Keys match the
// schema A.10 enum (canonical EN) in docs/DATAMODEL.md. UI surfaces must
// localise through the matching doctype.* keys in data/i18n.json
// (docTypeLabel in app.js) — this map stays the enum source and keeps
// lib.js free of app-state imports. A new enum value needs BOTH an entry
// here and a doctype.* key.
export const DOC_TYPE_LABEL = {
  Lease:       'Mietvertrag',
  FloorPlan:   'Grundriss',
  Permit:      'Bewilligung',
  Certificate: 'Zertifikat',
  Manual:      'Handbuch',
  Regulation:  'Verordnung',
  WiBe:        'WiBe',
  LegalBasis:  'Rechtsgrundlage',
  Attachment:  'Anhang',
  Other:       'Sonstiges',
};

// Safety guard for interpolating an image URL into a CSS `url(...)`
// expression inside an inline `style="background-image:..."` attribute.
// Accepts http(s) URLs and same-origin paths under `assets/` (used for
// bundled building photos in data/buildings.geojson + data/tenancies.json).
// Rejects everything else so the result is never a CSS-injection vector,
// and replaces single / double quotes that would otherwise break out of
// the surrounding string.
export function safeImageUrl(url) {
  if (typeof url !== 'string') return '';
  if (!/^(https?:\/\/|assets\/)/i.test(url)) return '';
  return url.replace(/['"\\]/g, c => encodeURIComponent(c));
}


// ── FORM-FIELD ERROR HELPER ────────────────────────────────────────────────
// Wires the visible `.form-field__error` text up to the input via
// `aria-describedby` + `aria-invalid`, and toggles `.form-field--invalid`
// on the field wrapper. Mirrors the eCH-0059 / WCAG 2.1 SC 3.3.1 expectation
// that a screen reader announces the *reason* a field is invalid when
// focus lands on it. Audit ref: M-E5, DS-V5.
//
// Usage:
//   setFieldError(inputElement, 'Bitte Adresse eingeben');   // mark invalid
//   setFieldError(inputElement, null);                       // clear
//
// The error span is created next to the input on demand and reused on
// subsequent calls, so callers don't need to write any error markup.
export function setFieldError(input, message) {
  if (!input) return;
  const wrapper = input.closest('.form-field') || input.parentElement;
  if (!wrapper) return;
  const errorId = input.id ? `${input.id}-error`
                : input.name ? `${input.name}-error`
                : `field-error-${Math.random().toString(36).slice(2, 8)}`;
  let errorEl = wrapper.querySelector('.form-field__error');
  if (message) {
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'form-field__error';
      errorEl.id = errorId;
      errorEl.setAttribute('role', 'alert');
      wrapper.appendChild(errorEl);
    }
    errorEl.textContent = message;
    if (!errorEl.id) errorEl.id = errorId;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorEl.id);
    wrapper.classList.add('form-field--invalid');
  } else {
    if (errorEl) errorEl.remove();
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    wrapper.classList.remove('form-field--invalid');
  }
}


// ── STORAGE PRIMITIVES ─────────────────────────────────────────────────────
// Wrapped because localStorage throws in Safari private mode, on quota,
// and when storage is disabled by enterprise policy. Failures degrade
// silently — callers don't need to special-case storage outages.
export function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* quota or disabled */ }
}
export function safeRemove(key) {
  try { localStorage.removeItem(key); } catch { /* nothing to do */ }
}
// Session-scoped twins. Used for state that must reset on every new visit
// rather than persist forever — currently the prototype disclaimer, which
// has to greet each new session (see renderPrototypeNotice in shell.js).
export function safeSessionGet(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
export function safeSessionSet(key, value) {
  try { sessionStorage.setItem(key, value); } catch { /* quota or disabled */ }
}


// ── ICON SET ───────────────────────────────────────────────────────────────
// Each icon is its own file at `assets/icons/<PascalName>.svg`, copied
// verbatim from `swiss/designsystem` (filled-glyph CD style, MIT). A
// one-time patch added `fill="currentColor"` to each root `<svg>` so
// the glyph inherits colour from the surrounding text. The portal-drawn
// `HalfCircle.svg` (pipeline in-progress) and `Sparkles.svg` (CD doesn't
// ship a sparkle glyph) live in the same folder.
//
// `ICONS` maps the camelCase ID used in JS to the PascalCase filename
// — most map 1:1, a few are intentional aliases (e.g. `x` and `xMark`
// both render the same Cancel glyph; `attachment` and `document` both
// use File). Aliasing lets callers keep semantic intent at the call
// site without bloating the icon folder.
//
// Sizing comes from the `--icon-*` tokens via `.inline-icon` and its
// `--{xs,sm,md,lg,xl,2xl}` modifiers in styles.css; colour inherits
// via `currentColor`. Audit reference: DS-T1.
export const ICONS = {
  // chrome / interactive
  search: 'Search', user: 'User', help: 'Help', info: 'Info',
  login: 'Login', logout: 'Logout', lock: 'Lock',
  share: 'Share', printer: 'Printer', external: 'External',
  download: 'Download', upload: 'Upload', maximize: 'Expand', refresh: 'Refresh',
  home: 'Home', plus: 'Plus', minus: 'Minus', compress: 'Compress',
  spinner: 'Spinner',
  // contact
  phone: 'Phone', envelope: 'Envelope', globe: 'Globe',
  // controls
  check: 'Checkmark', checkCircle: 'CheckmarkCircle',
  x: 'Cancel', xMark: 'Cancel', xCircle: 'CancelCircle',
  alertTriangle: 'Warning',
  chevronLeft: 'ChevronLeft', chevronRight: 'ChevronRight',
  chevronUp: 'ChevronUp', chevronDown: 'ChevronDown',
  arrowLeft: 'ArrowLeft', arrowRight: 'ArrowRight',
  // content / actions
  document: 'File', attachment: 'File', video: 'Video',
  image: 'Image', trash: 'Trash', link: 'Link',
  grid: 'Apps', list: 'List',
  map: 'Map', mapMarker: 'MapMarker', building: 'Building',
  tool: 'Wrench', truck: 'Truck',
  commentDots: 'SpeechBubble', return: 'Reply',
  // portal-drawn (CD doesn't ship these)
  halfCircle: 'HalfCircle', sparkles: 'Sparkles',
};
// `icon(name)` → default `<svg class="inline-icon">…</svg>` sized via
// the `--icon-base` token. Pass an extra class as the 2nd arg when a
// caller needs an additional CSS hook (rotation animations on
// nav-menu chevrons, margin tweaks on breadcrumb separators, etc.).
export function icon(name, extraClass = '') {
  const file = ICONS[name];
  if (!file) return '';
  const cls = extraClass ? `inline-icon ${extraClass}` : 'inline-icon';
  return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="assets/icons/${file}.svg"/></svg>`;
}



// ── STATUS BADGE ───────────────────────────────────────────────────────────
// Attachment list-item renderer — shared by the wizard step 3 (upload
// list, may show "Virenscan läuft" during scan) and the application
// detail page (read-only download list). Lives in lib.js so both
// modules can import without duplicating.
export function attachmentLi(a) {
  const badge = a.scanStatus === 'scanning'
    ? '<span class="badge badge--warning">Virenscan läuft</span>'
    : a.scanStatus === 'ok'
      ? '<span class="badge badge--success">ok</span>'
      : a.scanStatus
        ? '<span class="badge badge--danger">abgewiesen</span>'
        : '';
  return `<li class="attachment-list__item">
    <span class="attachment-list__icon" aria-hidden="true">${icon('attachment')}</span>
    <span class="attachment-list__name">${escapeHtml(a.name)}</span>
    ${badge ? `<span class="attachment-list__badge">${badge}</span>` : ''}
    <span class="attachment-list__size">${escapeHtml(a.size || '')}</span>
  </li>`;
}

// Maps the canonical Application.status enum (docs/DATAMODEL.md A.3) to a
// styled German display badge. Used by the inbox, queue, and detail views.
export function statusBadge(status) {
  // Palette rationale:
  //   info    (blue)   — neutral pipeline progress, no action needed
  //   success (green)  — terminal positive state
  //   orange           — call for user action (Rückfrage)
  //   danger  (red)    — hard failure only; never used for warnings/info
  //   warning (yellow) — caution states; not used for "in review" since
  //                      that's normal flow, not something to worry about.
  const map = {
    'draft':         { cls: 'badge',                  label: 'Entwurf' },
    'submitted':     { cls: 'badge badge--info',      label: 'Eingereicht' },
    'in_review_gs':  { cls: 'badge badge--info',      label: 'in GS-Prüfung' },
    'in_review_pfm': { cls: 'badge badge--info',      label: 'in PFM-Prüfung' },
    // States the operational processes add (Schadensmeldung, Umzug,
    // Sonderreinigung, Möbelbestellung — see data/process-definitions.json).
    // All neutral pipeline progress, so all `info` per the rationale above.
    'triage':             { cls: 'badge badge--info', label: 'Triage' },
    'scheduled':          { cls: 'badge badge--info', label: 'Termin fixiert' },
    'in_progress':        { cls: 'badge badge--info', label: 'in Arbeit' },
    'asset_key_creation': { cls: 'badge badge--info', label: 'WE-Anlage' },
    'approved':      { cls: 'badge badge--success',   label: 'genehmigt' },
    'in_project':    { cls: 'badge badge--info',      label: 'in ePPM' },
    'closed':        { cls: 'badge badge--success',   label: 'abgeschlossen' },
    'clarification': { cls: 'badge badge--orange',    label: 'Rückfrage' },
    'rejected':      { cls: 'badge badge--danger',    label: 'abgelehnt' },
  };
  const b = map[status] || { cls: 'badge', label: status };
  return `<span class="${b.cls}">${b.label}</span>`;
}

// Empty-state table row (review M-EMPTY) — ONE builder for the
// `.table-empty` row every filterable table falls back to, so the markup
// (full-width cell, shared styling hook) can't drift. The copy stays a
// caller argument: «Keine Treffer.» fits a filtered list, a work queue
// says what is actually empty («Keine offenen Pendenzen.»).
export function emptyRow(colspan, text = 'Keine Treffer.') {
  return `<tr><td colspan="${colspan}" class="table-empty">${text}</td></tr>`;
}


// ── STATUS PIPELINE ────────────────────────────────────────────────────────
// Maps to docs/DATAMODEL.md § 4.2 (three pipeline variants). Each step is
// { status, label }: status matches the canonical enum (Appendix A.3);
// label is the German display string.
export const PIPELINE_STANDARD = [
  { status: 'draft',        label: 'Entwurf' },
  { status: 'submitted',    label: 'Eingereicht' },
  { status: 'in_review_gs', label: 'in GS-Prüfung' },
  { status: 'approved',     label: 'genehmigt' },
  { status: 'in_project',   label: 'in ePPM' },
  { status: 'closed',       label: 'abgeschlossen' },
];
export const PIPELINE_BK = [
  { status: 'draft',         label: 'Entwurf' },
  { status: 'submitted',     label: 'Eingereicht' },
  { status: 'in_review_pfm', label: 'in PFM-Prüfung' },
  { status: 'approved',      label: 'genehmigt' },
  { status: 'in_project',    label: 'in ePPM' },
  { status: 'closed',        label: 'abgeschlossen' },
];
export const PIPELINE_GREENFIELD = [
  { status: 'draft',              label: 'Entwurf' },
  { status: 'submitted',          label: 'Eingereicht' },
  { status: 'in_review_gs',       label: 'in GS-Prüfung' },
  { status: 'approved',           label: 'genehmigt' },
  { status: 'asset_key_creation', label: 'WE-Anlage' },
  { status: 'in_project',         label: 'in ePPM' },
  { status: 'closed',             label: 'abgeschlossen' },
];

export function renderPipeline(application, explicitSteps) {
  // `explicitSteps` — the step list from data/process-definitions.json, which is
  // the source of truth now that every process (not just the Bedarfsmeldung)
  // has a pipeline. The PIPELINE_* constants below stay as the fallback for a
  // caller that has no definition to hand; they mirror the bedarfsmeldung def.
  let steps = explicitSteps;
  if (!steps) {
    if (application.pipelineVariant === 'bypass') steps = PIPELINE_BK;
    else if (application.pipelineVariant === 'greenfield') steps = PIPELINE_GREENFIELD;
    else steps = PIPELINE_STANDARD;
  }

  const currentIdx = steps.findIndex(s => s.status === application.status);
  const isRejected = application.status === 'rejected';
  const isRueckfrage = application.status === 'clarification';

  // Pipeline glyphs are inline SVGs (see ICONS map). The previous text
  // characters (✓ ✕ ◐ ↻) leaned on the system font and looked inconsistent
  // across OSes. inline-icon inherits currentColor so each glyph picks up
  // the pill's text colour (white on done/active/rejected/rueckfrage, gray
  // on pending).
  if (isRueckfrage) {
    return `
      <div class="pipeline" role="list" aria-label="Statusverlauf">
        ${steps.slice(0, 3).map((s, i) => `
          <div class="pipeline__step ${i < 2 ? 'pipeline__step--done' : 'pipeline__step--rueckfrage'}" role="listitem">${i < 2 ? icon('check') : icon('refresh')}${s.status === 'in_review_gs' ? 'Rückfrage' : s.label}</div>
        `).join('')}
        <div class="pipeline__step pipeline__step--pending" role="listitem">… genehmigt</div>
      </div>
      <p class="form-field__hint">Rückfrage offen — bitte Auflagen erfüllen und erneut einreichen.</p>
    `;
  }
  if (isRejected) {
    return `
      <div class="pipeline" role="list" aria-label="Statusverlauf">
        ${steps.slice(0, 3).map((s, i) => `
          <div class="pipeline__step ${i < 2 ? 'pipeline__step--done' : 'pipeline__step--rejected'}" role="listitem">${i < 2 ? icon('check') : icon('xMark')}${s.label}</div>
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
        const glyph = i < currentIdx ? icon('check') : i === currentIdx ? icon('halfCircle') : '';
        return `<div class="pipeline__step ${cls}" role="listitem">${glyph}${s.label}</div>`;
      }).join('')}
    </div>
  `;
}

// Step indicator — mirrors designsystem css/components/step-indicator.postcss:
// 36 px circles, gray-400 outline → bg-gray-400 active → bg-green-500 confirmed.
// DS canonical ships no connectors; the previous version did but placed them
// on grid row 2 of each item, where they rendered as a stray "bottom border"
// under every step instead of a horizontal line between dots. Removed —
// numbered circles + bold label on the active step already communicate
// progression clearly.
export function renderStepIndicator(currentStep, steps) {
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
          ? icon('check')
          : String(n);
        const ariaCurrent = active ? ' aria-current="step"' : '';
        return `
          <li class="step-indicator__item"${ariaCurrent}>
            <span class="${stepCls}">${dotInner}</span>
            <span class="step-indicator__label">${label}</span>
          </li>
        `;
      }).join('')}
    </ol>
  `;
}


// ── TAB STRIPS ─────────────────────────────────────────────────────────────
// ONE wiring for every `[role="tab"]` strip (review M-TABS): the Vorgang
// detail, the property detail and the floor-detail route all share the same
// roving-tabindex contract (A11Y-016) — click or Arrow/Home/End activates a
// tab, aria-selected and tabindex follow, and the active tab lands in the
// URL through `hashFor(key)` so the state survives a reload or a shared link.
//
// Two activation modes:
//   navigate: false → in-place panel swap: `panel.innerHTML = render(key)`,
//             panel re-labelled, focus moves onto the tab, and the hash is
//             replaced silently (a tab switch is a facet change, not a
//             navigation).
//   navigate: true  → the strip only points elsewhere (floor detail, whose
//             panel is the floor viewer): activation routes through
//             `window.portal.navigate(hashFor(key))` — no panel swap. The
//             keyboard pattern still applies, which is what makes the
//             inactive tabindex="-1" tabs reachable at all (review B16).
export function wireTabs({ rootSel, panelId = 'detailTab', render = null, hashFor, navigate = false, afterRender = null }) {
  const tabs = Array.from(document.querySelectorAll(`${rootSel} [role="tab"]`));
  const panel = document.getElementById(panelId);
  if (!tabs.length || (!navigate && !panel)) return;
  const select = (next) => {
    const key = next.getAttribute('data-tab');
    if (navigate) {
      // Full route change — the destination render rebuilds the strip, so
      // there is no aria/tabindex state worth syncing on the way out.
      window.portal.navigate(hashFor(key));
      return;
    }
    tabs.forEach(x => {
      const isActive = x === next;
      x.classList.toggle('tab--active', isActive);
      x.setAttribute('aria-selected', isActive ? 'true' : 'false');
      x.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    panel.setAttribute('aria-labelledby', 'tab-' + key);
    panel.innerHTML = render(key);
    // Every host element in the panel is brand new after that assignment, so a
    // component living inside one has to be mounted again. `render` returns a
    // string and cannot do it itself.
    if (afterRender) afterRender(key);
    next.focus();
    history.replaceState(null, '', hashFor(key));
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); select(tabs[(i + 1) % tabs.length]); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); select(tabs[(i - 1 + tabs.length) % tabs.length]); }
      else if (e.key === 'Home') { e.preventDefault(); select(tabs[0]); }
      else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1]); }
    });
  });
}


// ── TOAST ──────────────────────────────────────────────────────────────────
// Lazy-create the host so the first toast() call also creates the live
// region. Uses textContent — never innerHTML — so message content is
// always treated as a plain string.
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
// Status glyph per variant so success / error / … are distinguishable by
// SHAPE, not colour alone (WCAG 1.4.1) — mirrors the CD Bund floating
// Notification, which always carries a status icon. Default (no variant)
// gets the neutral info glyph.
const TOAST_ICON = {
  success: 'checkCircle',
  danger: 'xCircle',
  error: 'xCircle',
  warning: 'alertTriangle',
  info: 'info',
};
export function toast(message, variant = '') {
  const host = ensureToastHost();
  const el = document.createElement('div');
  el.className = 'toast' + (variant ? ' toast--' + variant : '');
  // Danger/error announce assertively; everything else politely.
  el.setAttribute('role', variant === 'danger' || variant === 'error' ? 'alert' : 'status');

  // Leading status icon — decorative (the role + text carry the meaning),
  // but its shape is the non-colour signal that satisfies WCAG 1.4.1.
  const iconEl = document.createElement('span');
  iconEl.className = 'toast__icon';
  iconEl.setAttribute('aria-hidden', 'true');
  iconEl.innerHTML = icon(TOAST_ICON[variant] || 'info');

  // Message + close affordance — CD `toast-message` ships a dismiss
  // button so users who need more reading time aren't forced to wait
  // the auto-hide out. `textContent` on the inner span keeps message
  // strings safe against HTML injection.
  const msg = document.createElement('span');
  msg.className = 'toast__message';
  msg.textContent = message;
  const close = document.createElement('button');
  close.className = 'toast__close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Benachrichtigung schliessen');
  close.innerHTML = icon('x');
  close.addEventListener('click', () => el.remove());

  el.append(iconEl, msg, close);
  host.appendChild(el);
  setTimeout(() => el.classList.add('toast--hiding'), 3500);
  setTimeout(() => el.remove(), 3800);
}


// ── OVERLAY REGISTRY ───────────────────────────────────────────────────────
// Full-screen surfaces (modal, docviewer, image gallery) append themselves
// to <body>, outside #root, so a route re-render does NOT remove them: the
// browser Back button would leave the overlay pinned over the new page with
// its capture-phase keydown still swallowing keys (review finding B3).
// Every overlay registers its close() here; the router closes them all on
// each hashchange — the same lifecycle contract as teardownQueueShortcuts.
const _overlayClosers = new Set();
export function registerOverlay(close) {
  _overlayClosers.add(close);
  return () => _overlayClosers.delete(close);
}
export function closeAllOverlays() {
  [..._overlayClosers].forEach(c => { try { c(); } catch { /* already gone */ } });
  _overlayClosers.clear();
}

// ── MODAL ──────────────────────────────────────────────────────────────────
// CD-Bund modal pattern (designsystem css/components/modal.postcss):
//   role="dialog" + aria-modal="true" + aria-labelledby
//   Esc closes, click on backdrop closes
//   Initial focus moves into the modal; focus is trapped inside;
//   focus returns to the opener element on close.
// The title id is per-instance so multiple modals don't collide.
let _modalSeq = 0;
export function modal({ title, body, actions = [], onClose = null, size = '' }) {
  const opener = document.activeElement && document.activeElement !== document.body
    ? document.activeElement
    : null;
  _modalSeq += 1;
  const titleId = 'modalTitle-' + _modalSeq;
  const bodyId = 'modalBody-' + _modalSeq;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const close = () => {
    unregister();
    document.removeEventListener('keydown', onKeydown, true);
    backdrop.remove();
    if (opener && typeof opener.focus === 'function') {
      try { opener.focus(); } catch (_) { /* element gone */ }
    }
    if (onClose) onClose();
  };
  const unregister = registerOverlay(close);

  // Focus-trap + Esc handler. Capture-phase so we win against inline
  // onkeydown handlers inside the modal body.
  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = Array.from(backdrop.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  const sizeCls = size ? ` modal--${size}` : '';
  backdrop.innerHTML = `
    <div class="modal${sizeCls}" role="dialog" aria-modal="true" aria-labelledby="${titleId}" aria-describedby="${bodyId}">
      <div class="modal__header">
        <h2 class="modal__title" id="${titleId}">${title}</h2>
        <button class="modal__close" type="button" aria-label="Schliessen">
          ${icon('x')}
        </button>
      </div>
      <div class="modal__body" id="${bodyId}">${body}</div>
      <div class="modal__footer">
        ${actions.map((a, i) => `<button class="btn ${a.variant || 'btn--outline'}" type="button" data-action="${i}">${a.label}</button>`).join('')}
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

  document.addEventListener('keydown', onKeydown, true);

  // Initial focus: prefer the first non-close interactive control inside
  // the body, fall back to the dialog itself. Defer so the browser has
  // finished painting; otherwise focus can get blown away by the
  // currently-focused-but-now-hidden trigger.
  setTimeout(() => {
    const inBody = backdrop.querySelector('.modal__body button, .modal__body a, .modal__body input, .modal__body textarea, .modal__body select');
    const target = inBody || backdrop.querySelector('.modal__close');
    if (target) target.focus();
  }, 0);

  return { close };
}


// ── SHORTCUT OVERLAY (§ 11.13) ─────────────────────────────────────────────
// aria-modal dialog, so it must behave like one (A11Y-011): a real close
// button gives it a focusable control + pointer-free discovery, focus moves
// onto that button on open, is trapped inside while open, and returns to the
// opener on close — all via toggleShortcutOverlay below. Every close path
// (backdrop click, close button, «?», Esc) funnels through that function so
// no path can strand focus. Headings: h2 title → h3 groups (no h4 jump).
export function renderShortcutOverlay() {
  return `
    <div class="shortcut-overlay" id="shortcutOverlay" role="dialog" aria-modal="true" aria-label="Tastatur-Kurzbefehle"
         onclick="if(event.target===this)window.portal.toggleShortcutOverlay(false)">
      <div class="shortcut-overlay__inner">
        <div class="shortcut-overlay__header">
          <h2 class="shortcut-overlay__title">Tastatur-Kurzbefehle</h2>
          <button class="btn btn--bare shortcut-overlay__close" type="button"
                  onclick="window.portal.toggleShortcutOverlay(false)">
            <span>Schliessen</span>
            ${icon('x')}
          </button>
        </div>
        <!-- Only shortcuts that are actually wired are listed (review
             views-17): «?»/Esc live in wireGlobalShortcuts, the Prüfqueue set
             in wireQueueShortcuts. The former g-g/g-i/g-q, Ctrl+S, Ctrl+Enter
             and the a/n/k/s detail set (with its duplicate «k») were never
             implemented and promised keys that did nothing. -->
        <div class="shortcut-overlay__grid">
          <div class="shortcut-overlay__group">
            <h3>Allgemein</h3>
            <dl>
              <dt>?</dt><dd>Dieses Overlay öffnen/schliessen</dd>
              <dt>Esc</dt><dd>Modal / Overlay schliessen</dd>
            </dl>
          </div>
          <div class="shortcut-overlay__group">
            <h3>Prüfqueue</h3>
            <dl>
              <dt>j / ↓</dt><dd>Nächste Zeile</dd>
              <dt>k / ↑</dt><dd>Vorherige Zeile</dd>
              <dt>Enter</dt><dd>Öffnen</dd>
              <dt>x</dt><dd>Markieren</dd>
            </dl>
          </div>
        </div>
        <p class="shortcut-overlay__hint">
          Drücken Sie <kbd>?</kbd> erneut zum Schliessen oder klicken Sie ausserhalb.
        </p>
      </div>
    </div>
  `;
}

// Single open/close seam for the overlay (A11Y-011). Mirrors modal()'s
// focus contract — modal() builds and destroys its own DOM per call, so its
// embedded trap isn't directly reusable for this persistent, class-toggled
// element; the Tab-wrap below is the same logic against #shortcutOverlay.
//   open:  remember the opener, move focus onto the close button, trap Tab.
//   close: release the trap, return focus to the opener.
let _shortcutOpener = null;
let _shortcutTrap = null;
export function toggleShortcutOverlay(force) {
  const overlay = document.getElementById('shortcutOverlay');
  if (!overlay) return;
  const isOpen = overlay.classList.contains('open');
  const next = typeof force === 'boolean' ? force : !isOpen;
  if (next === isOpen) return;
  if (next) {
    _shortcutOpener = document.activeElement && document.activeElement !== document.body
      ? document.activeElement
      : null;
    overlay.classList.add('open');
    // Defensive: shell() re-renders the overlay on route change, which can
    // orphan a previous trap — never stack two.
    if (_shortcutTrap) document.removeEventListener('keydown', _shortcutTrap, true);
    _shortcutTrap = (e) => {
      if (e.key !== 'Tab' || !overlay.isConnected) return;
      const focusables = Array.from(overlay.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(el => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', _shortcutTrap, true);
    const closeBtn = overlay.querySelector('.shortcut-overlay__close');
    // Defer like modal(): let the browser finish the current event first.
    if (closeBtn) setTimeout(() => closeBtn.focus(), 0);
  } else {
    overlay.classList.remove('open');
    if (_shortcutTrap) {
      document.removeEventListener('keydown', _shortcutTrap, true);
      _shortcutTrap = null;
    }
    if (_shortcutOpener && document.body.contains(_shortcutOpener)) {
      try { _shortcutOpener.focus(); } catch { /* opener unfocusable */ }
    }
    _shortcutOpener = null;
  }
}

export function wireGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      toggleShortcutOverlay();
    } else if (e.key === 'Escape') {
      toggleShortcutOverlay(false);
    }
  });
}
