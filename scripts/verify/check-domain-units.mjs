// Pure-function unit checks: wizard domain maths (NAW classification,
// area/cost calculation) plus the security-critical string helpers —
// escapeHtml/escapeJs are the XSS choke-points of an innerHTML-rendered
// app — and the locale formatters.
//
// ORDERING IS LOAD-BEARING: the app modules are browser ESM and some
// register document/window listeners at import time. The stubs below
// must exist BEFORE any app module loads, which is why every js/* import
// is a dynamic `await import(...)` placed after the stubs. Do not
// convert them to static imports — static imports are hoisted above
// this setup code and would crash with a confusing "document is not
// defined".
import assert from 'node:assert/strict';

globalThis.document = {
  addEventListener() {},
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getElementById() { return null; },
  body: { classList: { remove() {}, toggle() {} } },
};
globalThis.window = {
  addEventListener() {},
  portal: {},
};

const { state } = await import('../../js/state.js');
const { calcWizard, deriveNawClass } = await import('../../js/wizard.js');
const { escapeHtml, escapeJs, formatChf, formatDate } = await import('../../js/lib.js');

// ── Wizard domain maths ───────────────────────────────────────────────────
state.referenceData = {
  nawClasses: [
    { name: 'Konzentriert-Einzel', hnf2PerFte: 15, gfPerFte: 28 },
    { name: 'Konzentriert-Gruppe', hnf2PerFte: 13, gfPerFte: 25 },
    { name: 'Kollaborativ-Standard', hnf2PerFte: 12, gfPerFte: 24 },
    { name: 'Kollaborativ-Open', hnf2PerFte: 10, gfPerFte: 21 },
    { name: 'Hybrid-Activity-Based', hnf2PerFte: 9, gfPerFte: 20 },
    { name: 'Sicherheit-Labor', hnf2PerFte: 18, gfPerFte: 34 },
  ],
  deskSharingFactor: 0.8,
  furnitureBudgetPerSqm: 650,
  operatingCostCeilingPerSqmGf: 60,
  operatingCostHardBlockMultiplier: 1.2,
};

const standard = calcWizard({ nawClass: 'Kollaborativ-Standard', fte: 8 });
assert.equal(standard.arbeitsplaetze, 7);
assert.equal(standard.hnf2, 77);
assert.equal(standard.gf, 154);
assert.equal(standard.ukKosten, 462000);
assert.equal(standard.moeblierung, 50050);
assert.equal(standard.overBudget, true);
assert.equal(standard.hardBlocked, true);

const fallback = calcWizard({ nawClass: 'Unknown', fte: 1 });
assert.equal(fallback.nawClassName, 'Kollaborativ-Standard');

assert.equal(
  deriveNawClass({ specials: ['Labor'] }).name,
  'Sicherheit-Labor',
);
assert.equal(
  deriveNawClass({ focus: 'Konzentriert', confidentiality: 'hoch' }).name,
  'Konzentriert-Einzel',
);
assert.equal(
  deriveNawClass({ remoteShare: 40 }).name,
  'Hybrid-Activity-Based',
);
assert.equal(
  deriveNawClass({ publicContact: 'regelmaessig' }).name,
  'Kollaborativ-Open',
);
assert.equal(
  deriveNawClass({}).name,
  'Kollaborativ-Standard',
);

// ── escapeHtml — HTML-context escaping (XSS guard) ────────────────────────
assert.equal(
  escapeHtml('<img src=x onerror=alert(1)>'),
  '&lt;img src=x onerror=alert(1)&gt;',
);
assert.equal(
  escapeHtml('"with" \'quotes\' & <tags>'),
  '&quot;with&quot; &#39;quotes&#39; &amp; &lt;tags&gt;',
);
assert.equal(escapeHtml(null), '');
assert.equal(escapeHtml(undefined), '');
assert.equal(escapeHtml(42), '42');
// Invariant: output never contains an unescaped HTML metacharacter.
assert.doesNotMatch(escapeHtml('<script>"x"&\'y\'</script>'), /[<>"']/);

// ── escapeJs — JS-string-literal-in-HTML-attribute escaping ──────────────
assert.equal(escapeJs('\\'), '\\\\');
assert.equal(escapeJs("o'brien"), "o\\'brien");
assert.equal(escapeJs('say "hi"'), 'say \\"hi\\"');
assert.equal(escapeJs('</script>'), '\\x3C/script\\x3E');
assert.equal(escapeJs('a&b'), 'a\\x26b');
assert.equal(escapeJs('line1\nline2\r'), 'line1\\nline2\\r');
assert.equal(escapeJs('p\u2028s\u2029'), 'p\\u2028s\\u2029');
// Invariant: HTML metacharacters and line terminators are REPLACED, so
// none survives raw in the output. Quotes remain but always backslash-
// escaped — covered by the exact-value asserts above.
const hostile = '\'";</script><img src=x onerror=alert(1)>\n\u2028';
assert.doesNotMatch(escapeJs(hostile), /[<>&\r\n\u2028\u2029]/);

// ── Formatters (de-CH locale) ─────────────────────────────────────────────
assert.equal(formatChf(null), 'CHF –');
assert.equal(formatChf(undefined), 'CHF –');
assert.equal(formatChf('not-a-number'), 'CHF –');
// Grouping char varies by ICU build (’ vs '): compose the expectation
// from the same locale call instead of hardcoding it.
assert.equal(formatChf(1140000), 'CHF ' + Number(1140000).toLocaleString('de-CH'));
assert.equal(formatDate(''), '');
assert.equal(formatDate(null), '');
assert.match(formatDate('2018-01-01'), /^\d{2}\.\d{2}\.\d{4}$/);
assert.equal(
  formatDate('2018-01-01'),
  new Date('2018-01-01').toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
);

console.log('Domain unit checks passed.');
