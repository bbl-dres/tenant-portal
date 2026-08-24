/* ==========================================================================
   SEARCH-SOURCES.JS — which kinds the search looks at, and whether it may
   answer.

   NOT THE SAME THING AS THE RESULT TABS, although they look related. They
   differ in the property that is hardest to change afterwards — their lifetime:

                     Tabs (results page)          Sources (this module)
     Reach           narrow ONE result list       decide what is searched AT ALL
     Lifetime        this query                   permanent, per device
     Numbers         result counts                none (see below)
     In the address  YES, shareable               NO

   The last row is a decision, not an omission. Passing on a result link passes
   the narrowing with it — right for a tab, wrong for a personal setting.
   Otherwise the recipient silently inherits that somebody else did not want to
   see properties.

   NO CORPUS COUNTS in the selection panel. A row reading «Dokumente (42)» is
   true of the demo data and would be either wrong or an aggregate query on a
   real database — one that would run every time the panel opens. Where a number
   genuinely says something it is still there: above the result list, measured
   at query time, where it cannot go stale.

   WHAT IS STORED IS WHAT IS OFF, not what is on. A kind added to the index
   later is therefore on by default. The other way round, every new kind would
   be silently invisible to every existing device — and precisely for the people
   who ever touched this setting.

   AN EMPTY SELECTION MEANS NO RESTRICTION. Locking the last remaining kind
   would make the commonest wish expensive: «show me only services» would cost
   four clicks, because everything else has to be cleared one at a time. So
   everything can be cleared and one kind ticked, and the intermediate state is
   not broken — nothing selected means everything is searched. The line beside
   the field says so out loud rather than leaving people to infer it.
   ========================================================================== */

import { safeGet, safeSet } from './lib.js';
import { t } from './state.js';

const LS_KEY = 'mp-search-sources';

/* The kind vocabulary of buildSearchIndex(), in the order the tabs and the
   panel show it: what people come to do first, reference material last. One
   list, because the tabs, the suggestions and this panel must not drift. */
/* THE GERMAN STRING IS THE ID, not the label. It is what `entry.kind` carries
   in the index, what `RANK` orders by, and — the reason it must not change —
   what the source selection writes into localStorage. Translating this array in
   place would silently invalidate every stored selection the moment somebody
   switched language, and would reorder the facets by whatever the translated
   strings happened to sort as.

   `kindLabel()` is the display side. One line, added rather than substituted,
   so an id keeps meaning the same thing in storage forever while the label
   follows the active language. */
export const KINDS = ['Dienstleistungen', 'Liegenschaften', 'Dokumente', 'Aktuell', 'Informationen'];

const KIND_KEY = {
  'Dienstleistungen': 'search.kind.services',
  'Liegenschaften': 'search.kind.properties',
  'Dokumente': 'search.kind.documents',
  'Aktuell': 'search.kind.news',
  'Informationen': 'search.kind.info',
};

/** The display name of a content kind in the active language. An unknown kind
 *  falls back to its own id, which is German and therefore still readable. */
export const kindLabel = (kind) => (KIND_KEY[kind] ? t(KIND_KEY[kind]) : kind);

const RANK = new Map(KINDS.map((kind, index) => [kind, index]));
export const byKind = (a, b) =>
  (RANK.has(a) ? RANK.get(a) : KINDS.length) - (RANK.has(b) ? RANK.get(b) : KINDS.length);

// The generated answer is a result too. It belongs in the same selection as the
// content kinds — not because it is one (it is produced, not searched) but
// because the question is the same: what may appear in my results? Two lists
// for one question would be two places to look. In the panel it sits below
// them, set apart.
export const ANSWERS = 'answers';

const KEYS = new Set([...KINDS, ANSWERS]);

function readStored() {
  try {
    const raw = JSON.parse(safeGet(LS_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((key) => KEYS.has(key)) : [];
  } catch { return []; }
}

let off = new Set(readStored());

const persist = () => { try { safeSet(LS_KEY, JSON.stringify([...off])); } catch { /* private mode */ } };

export const isOn = (key) => !off.has(key);
export const offKinds = () => KINDS.filter((kind) => off.has(kind));
export const onKinds = () => KINDS.filter((kind) => !off.has(kind));
export const noneSelected = () => onKinds().length === 0;
export const allSelected = () => KINDS.every((kind) => !off.has(kind));
export const answersAllowed = () => isOn(ANSWERS);

export function toggle(key) {
  if (!KEYS.has(key)) return;
  if (off.has(key)) off.delete(key); else off.add(key);
  persist();
}

/* The two jumps to the ends. They sit SIDE BY SIDE rather than as one switching
   button: with a partial selection a switch would have to guess which end was
   meant, and the other direction would only be reachable by a detour.

   Both touch the content kinds ONLY, never the answer. Isolating one kind does
   not mean also wanting to lose the answers — which is why the answer sits
   below the rule these two buttons stand on. */
export function selectAllKinds() { KINDS.forEach((kind) => off.delete(kind)); persist(); }
export function clearAllKinds() { KINDS.forEach((kind) => off.add(kind)); persist(); }

/**
 * The active selection as a Set — or `null` when NOTHING is filtered. `null`
 * rather than «every kind» is deliberate: a caller should not have to tell the
 * unfiltered case apart from a filter that happens to let everything through.
 *
 * Two paths lead to `null`: everything ticked, or nothing ticked. The second is
 * the intermediate step of «clear all, then pick one» and must not produce an
 * empty result list.
 */
export function activeKinds() {
  const on = onKinds();
  if (!on.length || on.length === KINDS.length) return null;
  return new Set(on);
}

/**
 * The ONE call every search path shares — suggestions, results, answer. Applied
 * in a single place, an answer can never cite a kind somebody switched off.
 *
 * It filters BEFORE the search, not after: on a real backend this becomes a
 * WHERE clause. Searching first and discarding afterwards would mean fetching
 * the full set in order to shrink it.
 */
export function filterEntries(entries) {
  const active = activeKinds();
  return active ? entries.filter((entry) => active.has(entry.kind)) : entries;
}

/** Short form for diagnostics: «4/5», or '' when unfiltered. */
export function ratio() {
  const active = activeKinds();
  return active ? `${active.size}/${KINDS.length}` : '';
}

/** Test seam: drop the selection so a suite can start from a known state. */
export function reset() { off = new Set(); persist(); }
