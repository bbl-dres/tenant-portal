/* ==========================================================================
   SEARCH-INSIGHTS.JS — the skill layer. The step that runs INSTEAD of a cited
   paragraph when the question asks for a number, a comparison or a location.

   search-answer.js can only ever repeat prose that already stands in an entry.
   That is the right answer for «Wie melde ich einen Schaden?», and it is the
   wrong shape for «Wieviel m² Bürofläche belegen die Ämter im UVEK?»: NO entry
   carries that sentence, because the answer does not exist as text anywhere —
   it has to be COMPUTED from 459 room records. Measured, the retriever returns
   nothing for that question and the block says «Keine KI-Antwort», which is
   technically correct and useless.

   So a second answer path, and the same discipline as the first:

     * EVERY number here is aggregated from this portal's own data. Nothing is
       written into this file as a value. If a dataset is empty the skill
       returns null and the ordinary answer block takes over — it never invents
       a plausible figure, which is the one failure mode a demo must not have.
     * The result names the records it counted (`basis`) and links the objects
       it counted them from (`sources`). That is the citation contract of
       search-answer.js applied to an aggregate: a sentence cites an entry, a
       number cites the records it was summed over.
     * The block SAYS which skill ran. «Dashboard», «Karte», «Direktlink» — the
       point of the mock-up is that a model does not answer everything in prose;
       it picks a tool. Where that choice is invisible, nobody can judge it.

   COST GATE, as everywhere else in this folder. `matchSkill()` is a pure
   keyword test over the raw question and touches NO data. Only a question that
   passes it loads what its skill needs — spaces.geojson is ~29 % of the cold
   payload and the search route must not pull it because somebody typed
   «Schaden» (review P7, state.js `loadSpatialData`).

   A REAL MODEL would replace `matchSkill` (intent + arguments) and keep
   everything below it: the run functions are the tools it would call, the shape
   they return is the tool result. Nothing about that contract assumes how the
   intent was recognised.

   TEXT BY DEFAULT: everything interpolated is escaped through `escapeHtml`, and
   the only hrefs are route hashes built from ids this file read out of the data.

   PARTLY TRANSLATED, deliberately. The LABELS of a result — the tool trace, the
   key figures, the chart titles, the table headers — go through `t()`, because
   they are fixed phrases and they are what a reader scans first. The two
   GENERATED SENTENCES (`lead` and `basis`) stay German: they are assembled from
   counts with number agreement («ist ein Amt» / «sind 9 Ämter»), and doing that
   correctly in four languages is a plural-rules problem, not a translation
   problem. Prototype scope — the gap is visible and intentional, and the keys
   for it would be `search.insight.*Lead`. */

import { state, loadSpatialData, t } from './state.js';
import { escapeHtml, formatChf, icon } from './lib.js';

/* ============================================================ VOCABULARY == */

/* German UI: every string a person types. Matched against the RAW question, not
   against the resolved keywords — «wo» and «wie viel» are exactly the function
   words search-query.js throws away, and they are what distinguishes a location
   question from a floor-area question. */
const AREA_WORDS = ['flaeche', 'flaechen', 'bueroflaeche', 'bueroflaechen', 'm2',
  'quadratmeter', 'hnf', 'hnf2', 'nutzflaeche', 'belegen', 'belegt'];
const ORG_WORDS = ['amt', 'aemter', 'amtes', 'departement', 'verwaltungseinheit',
  'verwaltungseinheiten', 've', 'mieter', 'nutzer', 'bundesamt'];
const COST_WORDS = ['betriebskosten', 'kosten', 'mietkosten', 'miete', 'mietzins',
  'nebenkosten', 'aufwand', 'kostet'];
const PLACE_WORDS = ['liegenschaft', 'liegenschaften', 'gebaeude', 'objekt', 'objekte',
  'immobilie', 'immobilien', 'standort', 'standorte', 'haus', 'areal', 'hauptsitz'];
const WHERE_WORDS = ['wo', 'karte', 'standort', 'standorte', 'stehen', 'liegen',
  'befinden', 'gelegen', 'verteilt', 'verteilung'];

/* A street name is the strongest signal that a property is meant, and it needs
   no data to recognise. Without it, every question containing «Kosten» would
   pull the tenancy register just to discover that no property was named. */
const STREET_SUFFIX = /(?:strasse|str|weg|platz|gasse|allee|ring|hof|via|center)$/;

/* The room uses that count as «Bürofläche». Deliberately broader than the single
   use type «Office»: a focus room books the same work function, and counting
   only cellular offices would understate every modern fit-out against every old
   one. The chosen set is named in the block's footnote, because a number whose
   definition is invisible cannot be checked. */
const OFFICE_USES = ['Office', 'FocusRoom'];

/* Fold a question into comparable tokens. Umlauts to their two-letter spelling
   and «m²» to «m2», so a person may type either. */
function tokens(raw) {
  return String(raw == null ? '' : raw)
    .toLowerCase()
    .replace(/²/g, '2')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
const has = (list, words) => words.some(word => list.indexOf(word) >= 0);
const round = value => Math.round(value);
const num = value => Number(value || 0).toLocaleString('de-CH');
const area = value => `${num(round(value))} m²`;

/* ============================================================== MATCHING == */

/**
 * Which skill does this question ask for, and what does it need loaded?
 *
 *   { id, skill, label, spatial: boolean }   or   null
 *
 * PURE and data-free by design — see the cost gate above. The run functions may
 * still decide the question cannot be answered once they see the records; the
 * caller then falls back to the ordinary answer block.
 */
export function matchSkill(raw) {
  const words = tokens(raw);
  if (!words.length) return null;
  const namesPlace = has(words, PLACE_WORDS) || words.some(word => STREET_SUFFIX.test(word))
    || namedTenancy(words) !== null;

  // Costs of ONE property. Requires a property to be named — «Was kostet eine
  // Bedarfsmeldung?» is a question about a service, not an aggregate over the
  // tenancy register, and must not reach here.
  if (has(words, COST_WORDS) && namesPlace) {
    return { id: 'rent-costs', skill: 'dashboard', label: 'Dashboard', spatial: false };
  }
  // Floor area per organisational unit.
  if (has(words, AREA_WORDS) && (has(words, ORG_WORDS) || findAgency(words))) {
    return { id: 'office-area', skill: 'dashboard', label: 'Dashboard', spatial: true };
  }
  // Where something stands. The location word alone is not enough: «Wo melde ich
  // einen Schaden?» is a service question, and the ordinary answer handles it
  // far better than a map with no points on it.
  if (has(words, WHERE_WORDS) && namesPlace) {
    return { id: 'property-map', skill: 'map', label: 'Karte', spatial: false };
  }
  return null;
}

/* The organisational vocabulary comes from the TENANCIES, not from a table kept
   beside them: every agency in this portal is an agency because it rents
   something, and a second list would be the copy that goes stale. */
const agencies = () => [...new Set(state.tenancies.map(t => t.dep).filter(Boolean))];
const departments = () => [...new Set(state.tenancies.map(t => t.ve).filter(Boolean))];

function findAgency(words) {
  const known = agencies();
  for (const word of words) {
    const hit = known.find(name => tokens(name).join('') === word);
    if (hit) return { type: 'agency', key: hit };
  }
  for (const word of words) {
    const hit = departments().find(name => name.toLowerCase() === word);
    if (hit) return { type: 'department', key: hit };
  }
  return null;
}

/** A tenancy named by its building name or street, or null. Longest match wins,
 *  so «Worblentalstrasse 68» beats «Worblentalstrasse». */
function namedTenancy(words) {
  const question = ` ${words.join(' ')} `;
  let best = null;
  for (const tenancy of state.tenancies) {
    const candidates = [tenancy.buildingName, tenancy.address,
      `${tenancy.street} ${tenancy.houseNumber}`, tenancy.street];
    for (const candidate of candidates) {
      const needle = tokens(candidate).join(' ');
      if (needle.length < 4) continue;
      if (question.indexOf(` ${needle} `) < 0) continue;
      if (!best || needle.length > best.length) best = { tenancy, length: needle.length };
    }
  }
  return best ? best.tenancy : null;
}

/* ================================================================ SKILLS == */

/**
 * Bürofläche per agency, from data/spaces.geojson.
 *
 * The scope decides the CUT, never the data: with one agency named, the others
 * stay on the chart beside it — a number without its neighbours cannot be
 * judged, and «is that a lot?» is the question actually being asked.
 */
function officeArea(raw) {
  const words = tokens(raw);
  const scope = findAgency(words);
  const buildingName = new Map(state.tenancies.map(t => [t.buildingId, t.buildingName]));
  const rooms = state.spaces.filter(space =>
    space.occupierDep && OFFICE_USES.indexOf(space.useType) >= 0);
  if (!rooms.length) return null;

  // One pass, two groupings, so the tiles and the bars cannot drift apart.
  const perAgency = new Map();
  const perAgencyBuilding = new Map();
  let grandTotal = 0;
  for (const room of rooms) {
    const value = Number(room.area) || 0;
    grandTotal += value;
    const entry = perAgency.get(room.occupierDep) || { value: 0, rooms: 0, buildings: new Set() };
    entry.value += value; entry.rooms += 1; entry.buildings.add(room.buildingId);
    perAgency.set(room.occupierDep, entry);
    const key = `${room.occupierDep}|${room.buildingId}`;
    const cell = perAgencyBuilding.get(key)
      || { agency: room.occupierDep, buildingId: room.buildingId, value: 0, rooms: 0 };
    cell.value += value; cell.rooms += 1;
    perAgencyBuilding.set(key, cell);
  }

  const inScope = [...perAgency.entries()].filter(([agency]) =>
    !scope || scope.type === 'department' || agency === scope.key);
  if (!inScope.length) return null;
  const scopeValue = inScope.reduce((sum, [, entry]) => sum + entry.value, 0);
  const scopeLabel = scope ? scope.key : departments()[0] || 'das Portfolio';

  const agencyRows = [...perAgency.entries()]
    .map(([agency, entry]) => ({ label: agency, value: round(entry.value),
      mark: !!scope && scope.type === 'agency' && agency === scope.key }))
    .sort((a, b) => b.value - a.value);
  const buildingRows = [...perAgencyBuilding.values()]
    .filter(cell => inScope.some(([agency]) => agency === cell.agency))
    .map(cell => ({ label: buildingName.get(cell.buildingId) || cell.buildingId,
      value: round(cell.value), agency: cell.agency, buildingId: cell.buildingId, rooms: cell.rooms }))
    .sort((a, b) => b.value - a.value);

  // Workstations come from the TENANCY, so the density figure only appears when
  // the tenancies covering these buildings are actually in the register.
  const buildingIds = new Set(buildingRows.map(row => row.buildingId));
  const workstations = state.tenancies
    .filter(t => buildingIds.has(t.buildingId) && (!scope || scope.type === 'department' || t.dep === scope.key))
    .reduce((sum, t) => sum + (Number(t.workstations) || 0), 0);

  const charts = [{
    title: t('search.chart.areaByAgency', { scope: scope && scope.type === 'agency'
      ? departments()[0] || scopeLabel : scopeLabel }),
    unit: 'm²', rows: agencyRows, format: area,
    note: `Erfasste Büroräume — ${OFFICE_USES.join(', ')} — aus dem Raumbestand des Portals.`,
  }];
  if (buildingRows.length > 1) {
    charts.push({ title: t('search.chart.areaByProperty'), unit: 'm²', format: area,
      rows: buildingRows.map(row => ({ label: row.label, value: row.value })) });
  }

  const names = inScope.map(([agency]) => agency);
  const namesText = names.length <= 3
    ? names.join(', ')
    : `${names.slice(0, 3).join(', ')} und ${names.length - 3} weitere`;

  return {
    id: 'office-area', skill: 'dashboard', skillLabel: t('search.skill.dashboard'),
    title: t('search.insight.areaTitle'),
    lead: scope && scope.type === 'agency'
      ? `${scope.key} belegt ${area(scopeValue)} Bürofläche in `
        + `${buildingRows.length} ${buildingRows.length === 1 ? 'Liegenschaft' : 'Liegenschaften'} — `
        + `${Math.round((scopeValue / grandTotal) * 100)} % der erfassten Bürofläche im ${departments()[0] || 'Portfolio'}.`
      : `Im ${scopeLabel} belegen ${names.length} Ämter zusammen ${area(scopeValue)} Bürofläche `
        + `in ${buildingRows.length} Liegenschaften: ${namesText}.`,
    kpis: [
      { label: t('search.kpi.officeArea',
        { scope: scope && scope.type === 'agency' ? scope.key : scopeLabel }),
      value: num(round(scopeValue)), unit: 'm²' },
      { label: t('search.kpi.agencies'), value: num(names.length) },
      { label: t('search.kpi.properties'), value: num(buildingRows.length) },
      ...(workstations ? [{ label: t('search.kpi.areaPerDesk'),
        value: num(Math.round((scopeValue / workstations) * 10) / 10), unit: 'm²',
        hint: t('search.kpi.workstationsHint', { n: num(workstations) }) }] : []),
    ],
    charts,
    table: {
      caption: t('search.table.areaCaption'),
      columns: [t('search.col.agency'), t('search.col.property'),
        t('search.col.rooms'), t('search.col.officeArea')],
      rows: buildingRows.map(row => [row.agency, row.label, num(row.rooms), area(row.value)]),
    },
    basis: `Aggregiert aus ${num(rooms.length)} Raumdatensätzen (${OFFICE_USES.join(', ')}) `
      + `zu ${num(buildingName.size)} Liegenschaften. Arbeitsplätze aus dem Mietverhältnis.`,
    sources: buildingRows.slice(0, 3).map(row => ({
      title: row.label, type: 'Liegenschaft', meta: `${row.agency} · ${area(row.value)}`,
      href: `#/properties/${encodeURIComponent(tenancyIdFor(row.buildingId, row.agency))}`,
    })).filter(source => source.href !== '#/properties/'),
  };
}

/** The tenancy record behind one building for one agency — the route key the
 *  property pages use. */
function tenancyIdFor(buildingId, agency) {
  const hit = state.tenancies.find(t => t.buildingId === buildingId && (!agency || t.dep === agency))
    || state.tenancies.find(t => t.buildingId === buildingId);
  return hit ? hit.id : '';
}

/**
 * The rent of ONE property, from data/tenancies.json.
 *
 * NAMED FOR WHAT THE DATA IS. The portal holds the annual rent per tenancy
 * («Mietkosten / Jahr»), not a cost register split into groups — so this answers
 * a cost question with the rent and says so, rather than labelling the rent
 * «Betriebskosten» because that is what was asked. What makes it an ANSWER
 * rather than one figure is the comparison: CHF per m² and per workstation are
 * the only numbers in it that can be held against the other tenancies.
 */
function rentCosts(raw) {
  const tenancy = namedTenancy(tokens(raw));
  if (!tenancy || !Number(tenancy.yearlyCost)) return null;

  const cost = Number(tenancy.yearlyCost);
  const perArea = Number(tenancy.hnf2) > 0 ? cost / Number(tenancy.hnf2) : null;
  const perStation = Number(tenancy.workstations) > 0 ? cost / Number(tenancy.workstations) : null;

  const comparable = state.tenancies
    .filter(t => Number(t.yearlyCost) && Number(t.hnf2))
    .map(t => ({ label: t.buildingName, value: Math.round(t.yearlyCost / t.hnf2),
      mark: t.id === tenancy.id }))
    .sort((a, b) => b.value - a.value);
  const median = comparable.length
    ? comparable[Math.floor(comparable.length / 2)].value
    : null;

  return {
    id: 'rent-costs', skill: 'dashboard', skillLabel: t('search.skill.dashboard'),
    title: t('search.insight.costTitle'),
    lead: `Für ${tenancy.buildingName} (${tenancy.address}) sind ${formatChf(cost)} Mietkosten `
      + `pro Jahr erfasst`
      + `${perArea ? `, das sind ${formatChf(Math.round(perArea))} je m² HNF2` : ''}`
      + `${perStation ? ` und ${formatChf(Math.round(perStation))} je Arbeitsplatz` : ''}. `
      + `${median && perArea ? `Der Median über alle ${comparable.length} Mietverhältnisse liegt bei `
        + `${formatChf(median)} je m².` : ''}`,
    kpis: [
      { label: t('search.kpi.rentPerYear'), value: formatChf(cost) },
      ...(perArea ? [{ label: t('search.kpi.costPerSqm'), value: formatChf(Math.round(perArea)),
        hint: `HNF2 ${area(tenancy.hnf2)}` }] : []),
      ...(perStation ? [{ label: t('search.kpi.costPerDesk'), value: formatChf(Math.round(perStation)),
        hint: t('search.kpi.workstationsHint', { n: num(tenancy.workstations) }) }] : []),
      { label: t('search.kpi.area'), value: num(tenancy.hnf2), unit: 'm² HNF2',
        hint: `GF ${area(tenancy.gf)}` },
    ],
    charts: [
      { title: t('search.chart.rentComparison'), unit: 'CHF/m²', rows: comparable,
        format: value => formatChf(value),
        note: 'Alle Mietverhältnisse des Portals; die angefragte Liegenschaft ist hervorgehoben.' },
    ],
    table: {
      caption: t('search.table.rentCaption'),
      columns: [t('search.col.property'), t('search.col.agency'), 'HNF2',
        t('search.col.rentPerYear'), t('search.col.perSqm')],
      rows: state.tenancies.filter(t => Number(t.yearlyCost))
        .sort((a, b) => b.yearlyCost - a.yearlyCost)
        .map(t => [t.buildingName, t.dep, area(t.hnf2), formatChf(t.yearlyCost),
          Number(t.hnf2) ? formatChf(Math.round(t.yearlyCost / t.hnf2)) : '—']),
    },
    basis: `Aus dem Mietverhältnis ${tenancy.id}. Das Portal führt die Mietkosten pro Jahr `
      + `je Mietverhältnis — keine Aufteilung in Kostengruppen. Vergleich über `
      + `${num(comparable.length)} Mietverhältnisse.`,
    sources: [{ title: tenancy.buildingName, type: 'Liegenschaft',
      meta: `${tenancy.dep} · ${tenancy.address}`,
      href: `#/properties/${encodeURIComponent(tenancy.id)}` }],
  };
}

/** Where properties stand, from the tenancy register's own coordinates. */
function propertyMap(raw) {
  const words = tokens(raw);
  const scope = findAgency(words);
  const named = namedTenancy(words);
  const all = state.tenancies.filter(t =>
    typeof t.lat === 'number' && typeof t.lng === 'number');
  const matches = named ? [named]
    : all.filter(t => !scope || scope.type === 'department' || t.dep === scope.key);
  if (!matches.length) return null;

  const cities = new Set(matches.map(t => t.city).filter(Boolean));
  const label = named ? named.buildingName : scope ? scope.key : departments()[0] || 'das Portfolio';

  return {
    id: 'property-map', skill: 'map', skillLabel: t('search.skill.map'),
    title: t('search.insight.mapTitle'),
    mapTitle: t('search.chart.locations', { scope: label }),
    lead: `${matches.length} ${matches.length === 1 ? 'Liegenschaft' : 'Liegenschaften'} für ${label}`
      + `${cities.size > 1 ? ` an ${cities.size} Orten` : ''} — `
      + `${matches.slice(0, 3).map(t => t.buildingName).join(', ')}`
      + `${matches.length > 3 ? ` und ${matches.length - 3} weitere` : ''}.`,
    kpis: [
      { label: t('search.kpi.properties'), value: num(matches.length) },
      { label: t('search.kpi.places'), value: num(cities.size) },
      { label: t('search.kpi.areaTotal'),
        value: num(matches.reduce((sum, item) => sum + (Number(item.hnf2) || 0), 0)),
        unit: 'm² HNF2' },
    ],
    charts: [],
    points: matches.map(t => ({ lat: t.lat, lng: t.lng, label: t.buildingName,
      sub: t.address, href: `#/properties/${encodeURIComponent(t.id)}` })),
    table: {
      caption: t('search.table.foundProperties'),
      columns: [t('search.col.property'), t('search.col.agency'), t('search.col.address')],
      rows: matches.map(t => [t.buildingName, t.dep, t.address]),
    },
    basis: `Gefiltert über ${num(all.length)} Mietverhältnisse des Portals; die Koordinaten `
      + `stammen aus dem Mietverhältnis.`,
    sources: matches.slice(0, 3).map(t => ({ title: t.buildingName, type: 'Liegenschaft',
      meta: t.address, href: `#/properties/${encodeURIComponent(t.id)}` })),
  };
}

const RUNNERS = { 'office-area': officeArea, 'rent-costs': rentCosts, 'property-map': propertyMap };

/* ================================================================ PUBLIC == */

/**
 * Build the skill result for a question, or null.
 *
 * Async because the floor-area skill loads the spatial data first. The caller
 * awaits this BEFORE rendering, so the block never appears empty and fills in
 * half a second later — that would move the result list twice.
 *
 * NULL IS THE COMMON CASE and it is not a failure: most questions are answered
 * better by the cited paragraph of search-answer.js than by anything here. There
 * was once a fourth «Direktlink» skill that fired for those — a trace line and a
 * button pointing at the service. Both were removed on review: they named the
 * entry that was already numbered in the answer's own source list, so the block
 * said the same thing three times. Where a skill has nothing to add, adding
 * nothing is the answer.
 */
export async function buildInsight(raw) {
  const match = matchSkill(raw);
  if (!match) return null;
  if (match.spatial && !state.spaces.length) {
    try { await loadSpatialData('data/'); } catch { return null; }
  }
  return RUNNERS[match.id](raw) || null;
}

/* ================================================================ MARKUP == */

/* The icon per skill. It is the fastest read of «what did it do» — before the
   word, before the numbers. */
const SKILL_ICON = { dashboard: 'chart', map: 'mapMarker', link: 'arrowRight' };

/**
 * THE TOOL TRACE. The line that says a skill ran, which one, and over what.
 *
 * This is the point of the whole addition and not decoration. A model that
 * answers everything in prose and a model that picks a tool are different
 * products, and the difference is invisible unless the choice is shown. Whoever
 * reads this line can say «wrong tool» — which is feedback nobody can give
 * about a paragraph.
 */
const skillLine = insight => `
  <p class="answer__skill">
    ${icon(SKILL_ICON[insight.skill] || 'sparkles', 'answer__skill-icon')}
    <span><span class="answer__skill-name">${escapeHtml(insight.skillLabel)}</span><span
      class="answer__skill-detail">${escapeHtml(insight.title)}</span></span>
  </p>`;

const kpiRow = kpis => (kpis && kpis.length ? `
  <div class="answer__kpis">${kpis.map(tile => `
    <div class="answer-kpi">
      <span class="answer-kpi__label">${escapeHtml(tile.label)}</span>
      <span class="answer-kpi__value">${escapeHtml(tile.value)}${tile.unit
        ? `<small>${escapeHtml(tile.unit)}</small>` : ''}</span>
      ${tile.hint ? `<span class="answer-kpi__hint">${escapeHtml(tile.hint)}</span>` : ''}
    </div>`).join('')}</div>` : '');

/**
 * A horizontal bar chart in HTML and CSS — no SVG and no chart library.
 *
 * This portal has neither, and adding one for four bars would be the largest
 * dependency in a no-build project. Bars as elements also stay legible when the
 * stylesheet does not load and print without a canvas.
 *
 * THE BAR IS DECORATION, the row is the data: every row carries its label and
 * its formatted value as text, and the track is `aria-hidden` so a screen reader
 * reads «BAFU 2'992 m²» once rather than describing a rectangle.
 */
function barChart(chart) {
  const max = chart.rows.reduce((top, row) => Math.max(top, Number(row.value) || 0), 0) || 1;
  return `
    <figure class="answer-chart">
      <figcaption class="answer-chart__title">${escapeHtml(chart.title)}</figcaption>
      <ul class="answer-bars">${chart.rows.map(row => `
        <li class="answer-bars__row${row.mark ? ' answer-bars__row--mark' : ''}">
          <span class="answer-bars__label">${escapeHtml(row.label)}</span>
          <span class="answer-bars__track" aria-hidden="true"><span class="answer-bars__fill"
            style="width:${((Number(row.value) || 0) / max * 100).toFixed(1)}%"></span></span>
          <span class="answer-bars__value">${escapeHtml(chart.format
    ? chart.format(row.value) : String(row.value))}</span>
        </li>`).join('')}</ul>
      ${chart.note ? `<p class="answer-chart__note">${escapeHtml(chart.note)}</p>` : ''}
    </figure>`;
}

const chartGrid = charts => (charts && charts.length
  ? `<div class="answer__charts">${charts.map(barChart).join('')}</div>` : '');

const mapFigure = insight => `
  <figure class="answer-chart answer-chart--map">
    <figcaption class="answer-chart__title">${escapeHtml(insight.mapTitle || insight.title)}</figcaption>
    <div class="answer-map" id="answerMap" role="group"
      aria-label="Karte der gefundenen Liegenschaften"></div>
  </figure>`;

/* COLLAPSED, and that is a decision rather than tidiness: the table repeats what
   the chart already shows, so it is the second reading of the same fact, not the
   first. It stays reachable because a number one intends to use has to be
   readable as a number. */
const dataTable = table => (table && table.rows && table.rows.length ? `
  <details class="answer__data">
    <summary class="answer__data-summary">${
  escapeHtml(t('search.insight.showValues', { caption: table.caption }))}</summary>
    <div class="table-wrapper">
      <table class="table table--compact">
        <caption class="sr-only">${escapeHtml(table.caption)}</caption>
        <thead><tr>${table.columns.map(column =>
    `<th scope="col">${escapeHtml(column)}</th>`).join('')}</tr></thead>
        <tbody>${table.rows.map(row => `<tr>${row.map((cell, index) => (index === 0
    ? `<th scope="row">${escapeHtml(cell)}</th>`
    : `<td>${escapeHtml(cell)}</td>`)).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  </details>` : '');

/* NO ACTION ROW. There was one — a button per `actions` entry — and it was
   removed on review: every link it offered already stood in the source list two
   rows below it, so the block ended with the same destination twice under two
   different labels. The sources ARE the actions here. */

/**
 * The body of the answer block for one insight. The head, the source list and
 * the foot stay with search-ui.js, which both answer paths share.
 *
 * ONE CONTAINER WITH ONE GAP, and every child's own margin switched off in the
 * stylesheet: the parts otherwise each carry the spacing of the component they
 * were modelled on, and four different distances in one block read as
 * carelessness rather than as rhythm.
 */
export function insightBody(insight) {
  return `
    <div class="answer__insight">
      ${/* The trace and the sentence are ONE thing — «Dashboard —
            Kostenauswertung» is the headline of the paragraph under it. */''}
      <div class="answer__intro">
        ${skillLine(insight)}
        ${insight.lead ? `<p class="answer__lead">${escapeHtml(insight.lead)}</p>` : ''}
      </div>
      ${kpiRow(insight.kpis)}
      ${insight.points ? mapFigure(insight) : ''}
      ${chartGrid(insight.charts)}
      ${dataTable(insight.table)}
      ${insight.basis ? `<p class="answer__basis">${escapeHtml(insight.basis)}</p>` : ''}
    </div>`;
}
