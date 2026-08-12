/* ==========================================================================
   SEARCH-ENGINE.JS — folding, tokenising and scoring for the portal search.

   Deliberately DOM-free and state-free: it takes an index (plain objects)
   and a query string, and returns a ranked copy. That keeps it unit-testable
   from node without a browser (scripts/verify/check-domain-units.mjs), which
   is the only way ranking regressions get caught — a ranking bug is invisible
   in a screenshot and silent in a Playwright check.

   WHAT BUILDING THE INDEX IS NOT: this module never reads `state`. The view
   (renderSearchResults in app.js) decides what is searchable, what a hit is
   called and where it leads; this module only decides what matches and in
   what order.

   An index entry:
     {
       id, kind, type, title, lead, date, href, image, onclick, external,
       boost,                       // per-source nudge, see SOURCE BOOST below
       fields: { title, ref, type, lead, extra }   // raw strings to match on
     }
   ========================================================================== */

// ── FOLDING ───────────────────────────────────────────────────────────────
// Federal content is German, French and Italian: the query «schäden» must
// find «Schaden», «stoerung» must find «Störung», and «Muehlestrasse» must
// find «Mühlestrasse». Unicode NFD splits a letter from its diacritic, so
// stripping the combining marks leaves the base letter. ß→ss and the German
// ue/oe/ae transliterations are handled explicitly because they are NOT
// decompositions — no amount of normalising turns «ue» into «ü».
// The ae/oe/ue rules are lossy — they also fold «Aktuell» to «aktull» and
// «Michael» to «michal». That is deliberate and safe: folding is applied to
// the QUERY and the INDEX identically, so a symmetric mangling still matches.
// The cost is a rare collision between two genuinely different words; the
// benefit is that a Swiss keyboard-avoider typing «Muehlestrasse» finds
// «Mühlestrasse». Recall matters more than precision at this corpus size.
export function fold(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip combining diacritics
    .replace(/ß/g, 'ss')      // ß
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')       // punctuation and separators → space
    .trim();
}

export function tokenize(q) {
  const f = fold(q);
  return f ? f.split(' ').filter(Boolean) : [];
}

// ── SCORING ───────────────────────────────────────────────────────────────
// Field weights: what a match MEANS depends on where it lands. A hit in the
// title is what the user is looking for; a hit in a lead paragraph is
// context. The reference (VG-2026-0203, BE-2026-014) ranks just under the
// title because someone typing a reference wants exactly that record.
const WEIGHTS = { title: 10, ref: 8, type: 4, lead: 3, extra: 2 };

// Match quality within a field: an exact field match beats a prefix, which
// beats an occurrence somewhere in the middle. Without this, «Bern» would
// rank a property called «Bern» level with any lead mentioning Bern.
const EXACT = 3, PREFIX = 2, SUBSTRING = 1;

// Precompute the folded form of every searchable field once per entry
// instead of per query token — the index is rebuilt on each keystroke-free
// render, but scoring runs tokens × fields × entries.
export function prepare(entry) {
  const folded = {};
  for (const key in WEIGHTS) folded[key] = fold((entry.fields || {})[key]);
  return { ...entry, _folded: folded };
}

function tokenScore(folded, token) {
  let best = 0;
  for (const key in WEIGHTS) {
    const hay = folded[key];
    if (!hay) continue;
    let quality = 0;
    if (hay === token) quality = EXACT;
    else if (hay.startsWith(token)) quality = PREFIX;
    // Word-boundary aware: « wand » inside "Wandbild" is a substring hit, but
    // a token that starts a word ranks as a prefix — that is what a person
    // means by "starts with".
    else if (hay.includes(' ' + token)) quality = PREFIX;
    else if (hay.includes(token)) quality = SUBSTRING;
    if (quality) best = Math.max(best, WEIGHTS[key] * quality);
  }
  return best;
}

// AND semantics: every token must land somewhere in the entry. Previously
// the whole query string had to appear verbatim in ONE field, so a perfectly
// reasonable «bundeshaus grundriss» returned nothing at all.
export function scoreEntry(entry, tokens) {
  const folded = entry._folded || prepare(entry)._folded;
  let total = 0;
  for (const token of tokens) {
    const s = tokenScore(folded, token);
    if (!s) return 0;               // one miss disqualifies the entry
    total += s;
  }
  // SOURCE BOOST — with equal textual evidence, prefer the thing that lets
  // the user DO something. A query is usually a task ("Schaden"), so the
  // service that starts the process outranks a document that mentions it.
  return total + (entry.boost || 0);
}

// Ranked copy of `index`. Ties break on date (newest first), then title, so
// the order is stable rather than dependent on index construction order.
export function search(index, query) {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const out = [];
  for (const raw of index) {
    const entry = raw._folded ? raw : prepare(raw);
    const score = scoreEntry(entry, tokens);
    if (score > 0) out.push({ ...entry, score });
  }
  return out.sort(compareBy('relevance'));
}

// Sort comparators for the results header's sort control. `relevance` is the
// default; the others are what the CD's search page offers beside it.
export function compareBy(mode) {
  if (mode === 'date') {
    return (a, b) => String(b.date || '').localeCompare(String(a.date || ''))
      || (b.score - a.score);
  }
  if (mode === 'title') {
    return (a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'de-CH');
  }
  return (a, b) => (b.score - a.score)
    || String(b.date || '').localeCompare(String(a.date || ''))
    || String(a.title || '').localeCompare(String(b.title || ''), 'de-CH');
}
