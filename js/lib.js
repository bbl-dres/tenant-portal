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
  return 'CHF ' + n.toLocaleString('de-CH');
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

// Single canonical Document.type → German label map. Used by the downloads
// page, the property-detail Dokumente groups, and the linked-document table
// helpers. Keys match the schema A.10 enum (canonical EN) in
// docs/DATAMODEL.md. Add a new key here whenever the enum grows — both
// consumer surfaces pick it up automatically.
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
// Returns an empty string for anything that isn't an http(s) URL (broken
// image, never a CSS-injection vector), and replaces single / double
// quotes that would otherwise break out of the surrounding string.
export function safeImageUrl(url) {
  if (typeof url !== 'string') return '';
  if (!/^https?:\/\//i.test(url)) return '';
  return url.replace(/['"\\]/g, c => encodeURIComponent(c));
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


// ── ICON SET ───────────────────────────────────────────────────────────────
// Inline-SVG icon set. Single source for the small handful of icons used
// across views — replaces ad-hoc emoji glyphs (📄/🎥/📎/🛠/…) so the UI
// doesn't depend on the user's emoji font for visual chrome.
export const ICONS = {
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
  maximize:   '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
  // Status glyphs — replace the previous text-character glyphs (✓ ✕ ◐ ◼ ❌ ⚠ ↻ 💬)
  // in pipeline / wizard summary / detail cards. currentColor lets each
  // icon inherit the colour of its containing pill/badge.
  check:      '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  xMark:      '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  halfCircle: '<svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
  square:     '<svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" fill="currentColor"/></svg>',
  alertTriangle: '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  xCircle:    '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  refresh:    '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  commentDots:'<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
};
export function icon(name) { return ICONS[name] || ''; }


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

export function renderPipeline(application) {
  let steps;
  if (application.pipelineVariant === 'bypass') steps = PIPELINE_BK;
  else if (application.pipelineVariant === 'greenfield') steps = PIPELINE_GREENFIELD;
  else steps = PIPELINE_STANDARD;

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
          <div class="pipeline__step ${i < 2 ? 'pipeline__step--done' : 'pipeline__step--rueckfrage'}" role="listitem">${i < 2 ? ICONS.check : ICONS.refresh}${s.status === 'in_review_gs' ? 'Rückfrage' : s.label}</div>
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
          <div class="pipeline__step ${i < 2 ? 'pipeline__step--done' : 'pipeline__step--rejected'}" role="listitem">${i < 2 ? ICONS.check : ICONS.xMark}${s.label}</div>
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
        const glyph = i < currentIdx ? ICONS.check : i === currentIdx ? ICONS.halfCircle : '';
        return `<div class="pipeline__step ${cls}" role="listitem">${glyph}${s.label}</div>`;
      }).join('')}
    </div>
  `;
}

// Step indicator — mirrors designsystem css/components/step-indicator.postcss:
// 36px circles, gray-400 outline → bg-gray-400 active → bg-green-500 confirmed.
// Connectors between dots make the progression readable on wide screens.
export function renderStepIndicator(currentStep, steps) {
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
export function toast(message, variant = '') {
  const host = ensureToastHost();
  const el = document.createElement('div');
  el.className = 'toast' + (variant ? ' toast--' + variant : '');
  el.setAttribute('role', 'status');

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
  close.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  close.addEventListener('click', () => el.remove());

  el.append(msg, close);
  host.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 200ms'; }, 3500);
  setTimeout(() => el.remove(), 3800);
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

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const close = () => {
    document.removeEventListener('keydown', onKeydown, true);
    backdrop.remove();
    if (opener && typeof opener.focus === 'function') {
      try { opener.focus(); } catch (_) { /* element gone */ }
    }
    if (onClose) onClose();
  };

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
    <div class="modal${sizeCls}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
      <div class="modal__header">
        <h2 class="modal__title" id="${titleId}">${title}</h2>
        <button class="modal__close" type="button" aria-label="Schliessen">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal__body">${body}</div>
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
export function renderShortcutOverlay() {
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
        <p class="shortcut-overlay__hint">
          Drücken Sie <kbd>?</kbd> erneut zum Schliessen oder klicken Sie ausserhalb.
        </p>
      </div>
    </div>
  `;
}

export function wireGlobalShortcuts() {
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
