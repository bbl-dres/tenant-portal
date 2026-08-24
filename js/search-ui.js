/* ==========================================================================
   SEARCH-UI.JS — the two search surfaces the landing page and the results
   page share: the source selection beside the field, and the answer block
   above the results.

   They live here rather than in app.js because BOTH pages need the first one
   and it has to look and behave identically in the two places. A copy next to
   one field grows the layout rhythm of that field's surroundings and reads as a
   different control on the other page.

   TEXT BY DEFAULT: everything interpolated is escaped through `escapeHtml`, and
   the only hrefs are search routes built here from an encoded query.

   Wiring follows the app's own idiom — inline `onclick` calling through
   `window.portal` — rather than addEventListener, because these fragments are
   re-rendered wholesale by the router and would otherwise need a re-binding
   pass that nothing else in this app has.
   ========================================================================== */

import { escapeHtml, escapeJs, icon } from './lib.js';
import { KINDS, ANSWERS, isOn, offKinds, onKinds, noneSelected, allSelected, answersAllowed } from './search-sources.js';
import { insightBody } from './search-insights.js';

/* Example questions offered where somebody has not asked one yet. REAL ones:
   each is answered by this portal's own records, and an example that leads
   nowhere would be worse than none.

   SIX, AND DELIBERATELY OF THREE DIFFERENT SHAPES. The list used to hold four
   workflow questions, and four questions with one answer shape teach that the
   portal has one answer shape. It does not: the answer to «Wie kann ich
   Raumbedarf melden?» is a link into the case, the answer to «Wieviel m2
   Bürofläche belegen die Ämter im UVEK?» is an aggregate that exists in no
   record until it is computed from the room data, and the answer to «Wo liegen
   unsere Liegenschaften?» is a map.

   The ORDER is the balance: the three questions that lead straight into a case
   come first, because that is still what most people come here to do; the two
   computed answers and the map follow as what is also possible.

   `skill` names the SHAPE OF THE ANSWER, not a function. «Dashboard» and
   «Karte» are skills in search-insights.js; «Direktlink» is not — those three
   questions are answered by the cited paragraph of search-answer.js, whose
   numbered sources link straight into the case. The label is shown beside the
   example so the list teaches what a question can come back as, and it is the
   first thing to check when a skill stops matching, because the label and the
   behaviour are then visibly apart. */
export const EXAMPLE_QUESTIONS = [
  { text: 'Wie kann ich Raumbedarf melden?', skill: 'Direktlink' },
  { text: 'Wie melde ich einen Schaden?', skill: 'Direktlink' },
  { text: 'Wo finde ich den Grundriss meiner Fläche?', skill: 'Direktlink' },
  { text: 'Wieviel m² Bürofläche belegen die Ämter im UVEK?', skill: 'Dashboard' },
  { text: 'Wie hoch sind die Kosten der Liegenschaft Worblentalstrasse 68?', skill: 'Dashboard' },
  { text: 'Wo liegen unsere Liegenschaften?', skill: 'Karte' },
];

export const searchHref = (query) => `#/search?q=${encodeURIComponent(query)}`;

/* ============================================================== SOURCES == */

// The panel keeps its open state across a re-render: the router redraws the
// whole page on every change, so without this the selection would close on
// every tick and have to be reopened for each kind.
let panelOpen = false;

export function setSourcesPanelOpen(open) { panelOpen = !!open; }
export function sourcesPanelOpen() { return panelOpen; }

const MAX_NAMED = 3;
const nameList = (list) => (list.length <= MAX_NAMED
  ? escapeHtml(list.join(', '))
  : `${escapeHtml(list.slice(0, MAX_NAMED).join(', '))} und ${list.length - MAX_NAMED} weitere`);

/**
 * The line under the field. It CHANGES DIRECTION, and that is the point: below
 * half selected somebody means «only these», not «without those», and naming
 * the four that are off to describe the one that is on reads as a fault.
 *
 * The empty state matters most — «nothing selected» MUST say that everything is
 * still searched, or the intermediate step of changing the selection looks
 * broken.
 */
function sourcesTrigger() {
  const off = offKinds();
  const on = onKinds();
  const withoutAnswers = !answersAllowed();
  let text;
  if (noneSelected()) text = 'Keine Inhaltsart gewählt — es wird alles durchsucht.';
  else if (!off.length) text = 'Durchsucht alle Inhaltsarten.';
  else if (on.length <= off.length) text = `<strong>Nur ${nameList(on)}.</strong>`;
  else text = `<strong>${on.length} von ${KINDS.length} Inhaltsarten</strong> · ohne ${nameList(off)}.`;
  return `
    <p class="search-sources__line">
      <button type="button" class="search-sources__toggle" id="searchSourcesToggle"
              aria-expanded="${panelOpen}" aria-controls="searchSourcesPanel"
              onclick="window.portal.toggleSearchSourcesPanel()">
        <span class="search-sources__text">${text}${withoutAnswers ? ' Ohne KI-Antworten.' : ''}</span>
        ${/* Action and chevron in ONE element: as siblings the arrow wrapped to
              the next line on its own as soon as the sentence ran over. */''}
        <span class="search-sources__action">${off.length || withoutAnswers ? 'Ändern' : 'Auswählen'}${icon('chevronDown', 'search-sources__chev')}</span>
      </button>
    </p>`;
}

function sourcesPanel() {
  const boxes = KINDS.map((kind, index) => `
    <label class="search-sources__check">
      <input type="checkbox" id="searchSource${index}"${isOn(kind) ? ' checked' : ''}
             onchange="window.portal.toggleSearchSource('${escapeJs(kind)}')">
      <span>${escapeHtml(kind)}</span>
    </label>`).join('');
  // BOTH jumps, side by side, each disabled when it would do nothing. One
  // switching button would have to guess which end a partial selection meant.
  // «Alle abwählen» is the short path to ONE kind: clear, tick, done.
  const actions = `
    <div class="search-sources__actions">
      <button type="button" class="btn btn--bare btn--sm"${noneSelected() ? ' disabled' : ''}
              onclick="window.portal.clearSearchSources()">Alle abwählen</button>
      <button type="button" class="btn btn--bare btn--sm"${allSelected() ? ' disabled' : ''}
              onclick="window.portal.selectAllSearchSources()">Alle einschalten</button>
    </div>`;
  // A SECOND GROUP, not an afterthought. The answer does not belong in the list
  // above, because «unticked» means something else there: for content kinds it
  // means «everything is searched», here it means simply «no answer». The same
  // gesture with two meanings in one list is no longer a list — and the two
  // buttons above would either have to take it along (silently switching
  // answers off for somebody who only wanted to isolate a kind) or visibly skip
  // it (and look like a bug).
  const answers = `
    <fieldset class="search-sources__extra">
      <legend class="search-sources__legend">Zusätzlich</legend>
      <label class="search-sources__check">
        <input type="checkbox" id="searchSourceAnswers"${answersAllowed() ? ' checked' : ''}
               onchange="window.portal.toggleSearchSource('${escapeJs(ANSWERS)}')">
        <span>KI-Antworten anzeigen</span>
      </label>
    </fieldset>`;
  return `
    <div class="search-sources__panel" id="searchSourcesPanel"${panelOpen ? '' : ' hidden'}>
      <fieldset class="search-sources__group">
        <legend class="search-sources__legend">Welche Inhaltsarten durchsucht werden</legend>
        ${boxes}
      </fieldset>
      ${actions}${answers}
    </div>`;
}

/** Trigger and panel as ONE element, so the surrounding layout applies its
 *  spacing once to the whole control rather than separately to each half. */
export const sourcesControl = () =>
  `<div class="search-sources">${sourcesTrigger()}${sourcesPanel()}</div>`;

/* =============================================================== ANSWER == */

// The badge sits on the head and applies to EVERY state of the block, including
// the idle one where nothing has been written yet. Whoever sees the block knows
// what they are looking at before the first sentence appears.
const answerHead = (title) => `
  <p class="answer__head">
    <span class="answer__title">${escapeHtml(title)}</span>
    <span class="badge badge--info">Simuliert</span>
  </p>`;

const answerFoot = `
  <div class="answer__foot">
    <span class="answer__note">Automatisch erstellt und kann Fehler enthalten.
      Massgebend sind die verlinkten Quellen.</span>
    <button type="button" class="answer__off"
            onclick="window.portal.toggleSearchSource('${escapeJs(ANSWERS)}')">KI-Antworten ausblenden</button>
  </div>`;

/**
 * IDLE STATE. The block also stands where there is nothing to answer — on a
 * keyword search. Two reasons, and the second matters more:
 *
 *   1. It holds the place. If the block appeared only for questions, the result
 *      list would jump by its height depending on the input.
 *   2. It shows WHEN it contributes. The trigger condition (a whole question,
 *      not a keyword) is otherwise invisible: somebody who never types a
 *      question never learns they could — and that is exactly the gap this
 *      addresses.
 *
 * So it offers a way rather than an advertisement: the examples are links to
 * questions this portal really answers.
 */
function answerIdle() {
  return `
    <div class="notification notification--hint answer-slot answer-slot--idle">
      ${icon('commentDots', 'notification__icon')}
      <div class="notification__content">
        ${answerHead('KI-Antwort')}
        ${/* The copy names all THREE shapes. It used to promise «jeder Satz mit
              Beleg», which describes only the cited paragraph — somebody reading
              that had no reason to expect a dashboard, and the two data examples
              below would have looked like they were going to return prose. */''}
        <p class="answer__lead">Stellen Sie eine ganze Frage. Je nachdem steht hier ein
          belegter Satz, ein direkter Link zum Vorgang, eine Auswertung aus den Daten
          des Portals oder eine Karte.</p>
        ${/* Quotation marks INSIDE the link: several underlined questions in a
              row read as one long stroke, and where one ended and the next began
              was not visible. */''}
        <p class="answer__examples">${EXAMPLE_QUESTIONS.map((example) =>
          `<a href="${escapeHtml(searchHref(example.text))}">«${escapeHtml(example.text)}»<span
            class="answer__example-skill">${escapeHtml(example.skill)}</span></a>`).join('')}</p>
        ${answerFoot}
      </div>
    </div>`;
}

/* The numbered source list. Shared by both answer paths — a cited paragraph
   numbers the entries its sentences came from, a skill result numbers the
   records its figures were computed over. The list is the same contract in both
   cases, so it is one function. */
const sourceList = sources => (sources && sources.length ? `
    <div class="answer__sources">
      <p class="answer__sources-label">Quellen</p>
      ${sources.map((source, index) => `
        <span class="answer__source">
          <span class="answer__source-n">${source.n || index + 1}</span>
          <span>
            <span class="meta-info"><span class="meta-info__item">${escapeHtml(source.type)}</span>${
  source.meta ? `<span class="meta-info__item">${escapeHtml(source.meta)}</span>` : ''}</span><br>
            <a href="${escapeHtml(source.href)}">${escapeHtml(source.title)}</a>
          </span>
        </span>`).join('')}
    </div>` : '');

/**
 * Render the answer block. `result` is what search-answer.js returned, or null
 * for a query that is not a question; `insight` is what search-insights.js
 * returned, or null.
 *
 * WHY THE SKILL WINS. For a question whose answer has to be computed, the cited
 * path has nothing to cite — measured, «Wieviel m² Bürofläche belegen die
 * Ämter im UVEK?» retrieves nothing at all, because no entry carries that
 * sentence. Showing «Keine KI-Antwort» above a block that HAS the answer would
 * be the component contradicting itself.
 *
 * The reverse never happens: where a skill has nothing to compute it returns
 * null (search-insights.js) and this path is untouched — a cited paragraph is
 * not improved by a line announcing that no tool ran.
 */
export function answerBlock(result, resultCount, insight = null) {
  if (insight) {
    return `
      <div class="notification notification--hint answer-slot answer-slot--insight">
        ${icon('commentDots', 'notification__icon')}
        <div class="notification__content">
          ${answerHead('KI-Antwort')}
          ${insightBody(insight)}
          ${sourceList(insight.sources)}
          ${answerFoot}
        </div>
      </div>`;
  }
  if (!result) return answerIdle();

  if (result.state === 'none') {
    // «No answer» is a SUCCESS state, not a failure — and the text must not
    // point at results that do not exist.
    const line = resultCount > 0
      ? 'Die Treffer unten stammen aus der Stichwortsuche.'
      : 'Auch die Stichwortsuche findet dazu nichts im Portal.';
    return `
      <div class="notification notification--hint answer-slot">
        ${icon('commentDots', 'notification__icon')}
        <div class="notification__content">
          ${answerHead('Keine KI-Antwort')}
          <p class="answer__lead">Zu dieser Frage wurde im Portal nichts Passendes gefunden. ${line}</p>
          ${answerFoot}
        </div>
      </div>`;
  }

  // A part WITHOUT a citation is not rendered. The renderer enforces it — not
  // the code that produced the part. This is the second of two independent
  // guards on the one property the component exists to demonstrate.
  const parts = result.parts.filter((part) =>
    Number.isInteger(part.cite) && part.cite > 0 && result.sources[part.cite - 1]);
  if (!parts.length) return answerBlock({ ...result, state: 'none' }, resultCount, insight);

  const sentences = parts.map((part) => `
    <p class="answer__sentence">${escapeHtml(part.text)}<a class="answer__cite"
      href="${escapeHtml(result.sources[part.cite - 1].href)}"
      aria-label="Beleg ${part.cite}">${part.cite}</a></p>`).join('');

  return `
    <div class="notification notification--hint answer-slot">
      ${icon('commentDots', 'notification__icon')}
      <div class="notification__content">
        ${answerHead('KI-Antwort')}
        ${sentences}
        ${sourceList(result.sources)}
        ${answerFoot}
      </div>
    </div>`;
}
