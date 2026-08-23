/* ==========================================================================
   CASE-VIEW.JS — one anatomy for every Vorgang.

   A Vorgang is process-dependent in its CONTENT and process-independent in
   its LAYOUT. Before this module the two were the same thing: the
   Bedarfsmeldung, which carries a typed record, got four to six hand-written
   sections, while every other process (Schadensmeldung, Umzug,
   Sonderreinigung, Möbelbestellung) got a single «Angaben» list built from a
   flat `data` map. Adding a process therefore meant adding either a layout or
   an entry in the thin generic case, and the two prototypes drift apart at
   exactly that seam.

   So the overview is a DESCRIPTOR plus a renderer. A process contributes

       [{ title, rows: [{ label, value }], wide? }]

   and nothing else; `caseOverview` decides how that lands on the page. This
   file is the byte-for-byte counterpart of the service-portal's
   `js/ui/case-view.js` — see docs/case-view-alignment.md § 2.

   The frame is `.detail-layout` — a reading column of titled sections on the
   left, a 22rem rail of cards on the right (929 / 48 / 352 at 1440 px). THE
   SPLIT RULE: the main column is what you READ, the rail is what you ACT ON or
   CONTACT — which is why «Antragsteller» is a card and «Vorgangsdaten» is the
   first section.
   ========================================================================== */

import { escapeHtml as esc, icon } from './lib.js';

/** One `<dt>/<dd>` pair, or nothing when the value is empty. */
export function caseRow(label, value, { html = false } = {}) {
  if (value === null || value === undefined || value === '') return null;
  return { label: String(label), value: html ? String(value) : esc(String(value)) };
}

/**
 * A titled block of key/value rows. `rows` may contain nulls, so a caller can
 * list every possible row and let the empty ones disappear.
 * `body` is ready HTML for a section that is not a key/value list (an Auflagen
 * checklist).
 */
export function caseSection(title, rows, { body = '', iconName = '' } = {}) {
  const kept = (rows || []).filter(Boolean);
  if (!kept.length && !body) return null;
  return { title, rows: kept, body, iconName };
}

/**
 * Folds sections that carry the same title into one, in first-seen order.
 *
 * A Vorgang describes its location twice: once through the building it is
 * linked to (Objekt, Adresse, WE, EGID) and once through the fields the form
 * submitted (Gebäude, Raum, Geschoss). Rendered as «Standort» and «Ort» those
 * were two headings over the same subject, with the building name printed
 * under both.
 *
 * A row is dropped when its LABEL is already present or when its VALUE is —
 * «Objekt: Verwaltungsgebäude Liebefeld» and «Gebäude: Verwaltungsgebäude
 * Liebefeld» are the same statement under two names, and only the first
 * survives.
 */
export function mergeSections(sections) {
  const out = [];
  const byTitle = new Map();
  for (const section of (sections || []).filter(Boolean)) {
    const seen = byTitle.get(section.title);
    if (!seen) {
      const copy = { ...section, rows: [...section.rows] };
      byTitle.set(section.title, copy);
      out.push(copy);
      continue;
    }
    for (const row of section.rows) {
      if (seen.rows.some((r) => r.label === row.label || r.value === row.value)) continue;
      seen.rows.push(row);
    }
    if (section.body) seen.body = (seen.body || '') + section.body;
    if (!seen.iconName && section.iconName) seen.iconName = section.iconName;
  }
  return out;
}

/**
 * The Übersicht panel: sections left, `aside` (ready HTML) right.
 *
 * ONLY this tab is two-column. The other three carry one full-width surface
 * each — a table, a timeline, a comment list — and a 352px rail beside a table
 * would take the width the table needs. The rail is also why the actions sit
 * here at all: Übersicht is the default tab, so it is what a reader lands on.
 */
export function caseOverview(sections, aside = '') {
  const kept = (sections || []).filter(Boolean);
  if (!kept.length && !aside) return '';
  const block = (s) => `
    <section class="case-section">
      <h3 class="case-section__title">${s.iconName ? icon(s.iconName) : ''}${esc(s.title)}</h3>
      ${s.rows.length ? `<dl class="detail-list">${s.rows.map(
    (r) => `<dt>${esc(r.label)}</dt><dd>${r.value}</dd>`).join('')}</dl>` : ''}
      ${s.body || ''}
    </section>`;
  return `<div class="case-overview detail-layout"><div class="case-overview__main">${
    kept.map(block).join('')}</div>${aside}</div>`;
}

/**
 * The right rail. `cards` is ready HTML (actionCard / contactCard from lib.js),
 * so this only owns the landmark and the sticky wrapper — see the note on
 * `.detail-layout__aside-inner` in components/cards.css for why the sticky
 * cannot sit on the aside itself.
 */
export function caseAside(cards, { label = 'Aktionen und Beteiligte' } = {}) {
  const body = (cards || []).filter(Boolean).join('');
  if (!body) return '';
  return `<aside class="detail-layout__aside" aria-label="${esc(label)}">
    <div class="detail-layout__aside-inner">${body}</div>
  </aside>`;
}

/**
 * Sections derived from a flat `data` map — the fallback for every process
 * that submits fields rather than a typed record. `labels` maps a raw key to a
 * label; an unknown key keeps its own name rather than disappearing, which is
 * the point: a process that gains a field must never lose it silently.
 *
 * `groups` optionally splits the map into named sections:
 *   [{ title: 'Ort', keys: ['gebaeude', 'raum'] }]
 * Whatever no group claims lands in one final section under `restTitle`.
 */
export function sectionsFromData(data, labels = {}, { groups = [], restTitle = 'Angaben' } = {}) {
  const entries = Object.entries(data || {}).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!entries.length) return [];
  const claimed = new Set();
  const rowsFor = (keys) => keys.map((k) => {
    const hit = entries.find(([key]) => key === k);
    if (!hit) return null;
    claimed.add(k);
    return caseRow(labels[k] || k, hit[1]);
  }).filter(Boolean);

  const named = groups.map((g) => caseSection(g.title, rowsFor(g.keys))).filter(Boolean);
  const rest = entries.filter(([k]) => !claimed.has(k)).map(([k, v]) => caseRow(labels[k] || k, v));
  const restSection = caseSection(restTitle, rest);
  return named.length ? [...named, restSection] : [restSection];
}

/* ── AKTIONEN ──────────────────────────────────────────────────────────────
   What a reader can DO with this Vorgang, derived from status × capability
   rather than from a switch on the process. A new process therefore inherits
   the whole card; only a process that gains a genuinely new capability adds a
   row here (docs/case-view-alignment.md).

   HONESTY RULE: a row either works or says that it does not. `type: 'disabled'`
   renders with a lock and its own explanation, which is a truthful statement
   about a prototype; a row that looked live and did nothing would not be. */
const CLOSED = new Set(['closed', 'rejected', 'abgeschlossen', 'erledigt', 'geliefert']);

export function caseActions(instance = {}, { resubmitId = '', serviceHref = '' } = {}) {
  const closed = CLOSED.has(instance.status);
  const items = [];
  // The action that is the reason the page was opened, where it applies. It
  // leads, and it is the only row that changes with the case's state.
  if (instance.status === 'clarification' && resubmitId) {
    items.push({ type: 'button', id: 'case-resubmit',
      label: 'Auflagen erfüllen — erneut einreichen',
      description: 'Öffnet die Bedarfsmeldung mit Ihren Angaben.' });
  }
  if (!closed && serviceHref) {
    items.push({ type: 'link', href: serviceHref,
      label: 'Gleiche Dienstleistung erneut auslösen' });
  }
  items.push({ type: 'button', id: 'case-comment',
    label: 'Kommentar hinzufügen',
    description: 'Öffnet den Reiter «Kommentare».' });
  if (!closed) {
    items.push({ type: 'disabled', label: 'Weiterleiten …',
      description: 'Im Prototyp nicht verfügbar.' });
    items.push({ type: 'disabled', label: 'Vorgang zurückziehen',
      description: 'Im Prototyp nicht verfügbar.' });
  }
  items.push({ type: 'button', id: 'case-print',
    label: 'Vorgang drucken' });
  return items;
}

/* ── KOMMENTAR ERFASSEN ────────────────────────────────────────────────────
   The compose box that makes «Kommentar hinzufügen» a real action rather than
   a link to a read-only list. It writes into the case in memory, like every
   other demo mutation in this prototype. */
export function caseCommentForm({ id = 'case-comment-form' } = {}) {
  return `<form class="case-comment-form" id="${esc(id)}" novalidate>
    <label class="form-field__label" for="${esc(id)}-text">Kommentar hinzufügen</label>
    <textarea class="form-field__textarea" id="${esc(id)}-text" rows="3"
      placeholder="Ihre Anmerkung zu diesem Vorgang …"></textarea>
    <p class="case-comment-form__actions">
      <button type="submit" class="btn btn--filled btn--icon-left">${icon('paperPlane')}<span class="btn__text">Kommentar speichern</span></button>
    </p>
  </form>`;
}

/* ── KOPFBEREICH ───────────────────────────────────────────────────────────
   CD's Hero anatomy (`Hero.vue:9-27`): the meta strip sits ABOVE the h1, not
   below it as a lead and not beside it as an uppercase kicker. `.meta-info`
   (components/meta-info.postcss) supplies size, colour and the `|` separator,
   so process, reference, object and date read as one line of provenance
   rather than as three competing subtitles.

   `metaItems` are plain strings; `actions` is ready HTML (status badge,
   buttons). */
export function caseHeader({ metaItems = [], title, actions = '' }) {
  const meta = metaItems.filter(Boolean)
    .map((m) => `<span class="meta-info__item">${esc(m)}</span>`).join('');
  return `<header class="case-header">
    <div class="case-header__main">
      ${meta ? `<p class="meta-info case-header__meta">${meta}</p>` : ''}
      <h1 class="h1 case-header__title">${esc(title)}</h1>
    </div>
    ${actions ? `<div class="case-header__actions">${actions}</div>` : ''}
  </header>`;
}

/* ── ANHÄNGE ───────────────────────────────────────────────────────────────
   The attachment tab is a TABLE, and it stays a table when it is empty: bar,
   column headers and footer included, with the reason inside the table body.
   Every other list in this portal already works this way — `js/data-table.js`
   carries the rule in its own words — and this tab was the one that replaced
   itself with a sentence, so «Anhänge (0)» led to a panel with no visible
   columns and nothing to say what had been there.
   See docs/case-view-alignment.md § 3. */
const FILE_ICONS = { PDF: 'document', DWG: 'document', XLSX: 'document', DOCX: 'document', ZIP: 'document', JPG: 'image', PNG: 'image' };
export const attachmentIcon = (type) => FILE_ICONS[String(type || '').toUpperCase()] || 'attachment';

/** The file type a name implies, for records that carry no explicit one. */
export function attachmentType(a) {
  if (a.type) return String(a.type).toUpperCase();
  const m = /\.([a-z0-9]+)$/i.exec(a.name || '');
  return m ? m[1].toUpperCase() : '—';
}

/** The scan badge, or an em dash. Mirrors `attachmentLi`'s vocabulary. */
export function attachmentStatus(a) {
  if (a.scanStatus === 'scanning') return '<span class="badge badge--warning">Virenscan läuft</span>';
  if (a.scanStatus === 'ok') return '<span class="badge badge--success">ok</span>';
  if (a.scanStatus) return '<span class="badge badge--danger">abgewiesen</span>';
  return '—';
}

/** Column set for `mountDataTable`. `render` returns HTML. */
export function attachmentColumns({ withStatus = true } = {}) {
  const columns = [
    { key: 'name', label: 'Dokument', render: (a) => `${icon(attachmentIcon(attachmentType(a)), 'table__icon')}<span class="attachment__name">${esc(a.name)}</span>` },
    { key: 'type', label: 'Typ', render: (a) => esc(attachmentType(a)) },
    { key: 'size', label: 'Grösse', align: 'right', render: (a) => esc(a.size || '—') },
  ];
  if (withStatus) columns.push({ key: 'scanStatus', label: 'Status', render: attachmentStatus });
  return columns;
}
