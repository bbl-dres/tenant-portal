/* ==========================================================================
   SEARCH-QUERY.JS — the step BEFORE the retriever.

   THE MEASURED FINDING. search-engine.js requires every token to land
   somewhere in the entry («one miss disqualifies the entry»). A whole question
   therefore returns nothing, because its function words are not in the corpus:
   «Wie melde ich einen Schaden?» fails on «wie», «ich» and «einen» before
   «Schaden» is ever scored, while «schaden» alone finds the service.

   The retriever is not weak; it is missing the step in front of it. This module
   is the smallest possible version of that step: drop function words, hand the
   rest to the unchanged engine. It is deliberately dumb — that is the point. A
   language model can replace `resolve()` later without anything around it
   changing, because the contract is a list of queries, not a promise about how
   they were produced.

   `isQuestion()` is the COST GATE, not a nicety. Only a question is worth the
   extra retrieval passes here, and only a question would be worth a model call
   later. A navigational query («schaden melden») already has its best answer in
   the first result.

   THREE LANGUAGES, ONE CORPUS. The interface runs in de/fr/it (state.js
   LANGS), the content is German. So a French or Italian speaker's question
   words are pure noise that empties the index just as the German ones do, and
   they belong in the list even though nothing will ever match them. Only
   unambiguous function words are included: anything that could also be a German
   content word is left out, because dropping a real search term is far worse
   than keeping a stray one.
   ========================================================================== */

// German function words. Deliberately short: no word with domain meaning in the
// BBL corpus. Nouns such as «Plan», «Raum» or «Bau» must never appear here —
// they are the subject of real queries, not noise around one.
const STOP_DE = [
  'wie', 'was', 'wo', 'wann', 'warum', 'wieso', 'weshalb', 'wer', 'wen', 'wem',
  'welche', 'welcher', 'welches', 'welchen', 'wohin', 'woher', 'wozu',
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'man', 'mir', 'mich', 'mein',
  'meine', 'meinen', 'meiner', 'uns', 'unser', 'unsere',
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem',
  'einer', 'eines', 'kein', 'keine',
  'und', 'oder', 'aber', 'denn', 'sondern', 'auch', 'noch', 'schon', 'nur',
  'in', 'im', 'an', 'am', 'auf', 'aus', 'bei', 'mit', 'nach', 'von', 'vom',
  'vor', 'zu', 'zum', 'zur', 'ueber', 'unter', 'fuer', 'um', 'durch', 'gegen',
  'ist', 'sind', 'war', 'waren', 'bin', 'bist', 'sein', 'hat', 'habe', 'haben',
  'hatte', 'wird', 'werden', 'wurde', 'worden',
  'kann', 'kannst', 'koennen', 'muss', 'muessen', 'darf', 'duerfen', 'soll',
  'sollen', 'will', 'wollen', 'moechte', 'brauche', 'brauchen',
  'nicht', 'als', 'wenn', 'dass', 'damit', 'ob', 'weil', 'sich', 'so', 'dann',
  'bitte', 'gibt', 'sowie', 'etwa', 'jetzt', 'hier', 'dort',
];

// French. «car», «or» and «son» are left out on purpose: they collide with
// German content words or abbreviations in this corpus.
const STOP_FR = [
  'comment', 'quoi', 'quand', 'pourquoi', 'qui', 'quel', 'quelle', 'quels',
  'quelles', 'combien', 'est-ce', 'puis', 'dois', 'faut',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'mon', 'ma', 'mes',
  'notre', 'nos', 'votre', 'vos',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'au', 'aux',
  'et', 'ou', 'mais', 'donc', 'dans', 'sur', 'sous', 'avec', 'sans', 'pour',
  'par', 'chez', 'vers', 'entre',
  'est', 'sont', 'etait', 'sera', 'avoir', 'etre', 'peut', 'doit', 'veut',
  'pas', 'plus', 'aussi', 'alors', 'ici',
];

// Italian. «da», «do» and «si» are left out for the same reason.
const STOP_IT = [
  'come', 'cosa', 'dove', 'quando', 'perche', 'chi', 'quale', 'quali', 'quanto',
  'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro', 'mio', 'mia', 'miei',
  'nostro', 'nostra', 'vostro', 'vostra',
  'il', 'lo', 'la', 'gli', 'le', 'un', 'uno', 'una', 'del', 'della', 'dei',
  'delle', 'nel', 'nella', 'sul', 'sulla',
  'con', 'per', 'tra', 'fra', 'senza', 'sopra', 'sotto',
  'sono', 'era', 'essere', 'avere', 'puo', 'deve', 'vuole',
  'non', 'anche', 'solo', 'quindi', 'qui',
];

const STOP_WORDS = new Set([...STOP_DE, ...STOP_FR, ...STOP_IT]);

// Interrogatives and modal verbs a person opens a question with, in all three
// interface languages. Built from a list rather than written as one regular
// expression so the three groups stay separately readable and editable.
const QUESTION_OPENERS = [
  'wie', 'was', 'wo', 'wann', 'warum', 'wieso', 'weshalb', 'wer', 'welche[rsn]?',
  'wohin', 'woher', 'wozu', 'kann', 'muss', 'darf', 'soll', 'gibt', 'brauche',
  'wird', 'ist', 'sind', 'hat', 'habe',
  'comment', 'quoi', 'quand', 'pourquoi', 'qui', 'quel(le)?s?', 'combien',
  'puis', 'dois', 'faut', 'est-ce',
  'come', 'cosa', 'dove', 'quando', 'perche', 'chi', 'quale', 'quanto',
];
const QUESTION_WORD = new RegExp(`^(?:${QUESTION_OPENERS.join('|')})\\b`, 'iu');

/* Splitting mirrors search-engine.js `fold()` closely enough for counting, but
   deliberately keeps the ORIGINAL letters: the stop list is written in folded
   spelling (ueber, fuer) and umlauts are normalised here the same way, so both
   sides meet. It does NOT reuse fold() because that also collapses ae/oe/ue
   inside ordinary words, which would turn «Schaden» into a different token than
   the one the list was written against. */
const words = (value) => String(value == null ? '' : value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, (mark) => (mark === '̈' ? 'e' : ''))
  .replace(/ß/g, 'ss')
  .split(/[^a-z0-9-]+/)
  .filter(Boolean);

/**
 * Does the input look like a question? Only then is the resolution below worth
 * running, and only then would a model call be worth paying for.
 */
export function isQuestion(raw) {
  const value = String(raw == null ? '' : raw).trim();
  if (!value) return false;
  if (value.endsWith('?')) return true;
  if (QUESTION_WORD.test(value)) return true;
  // Count WORDS, not fragments. A dotted reference such as «VG-2026-0203»
  // splits into pieces that are not words; without this it would count as a
  // question and trigger the answer builder, which is a model call later.
  return words(value).filter((word) => word.length > 1 && /[a-z]/i.test(word)).length >= 4;
}

/**
 * Turn a question into the keywords the retriever understands.
 *
 * Returns `{ keywords, dropped, queries }`. `queries` run against search() in
 * order: first every keyword (strict, because the engine ANDs), then shorter
 * combinations as fallbacks, so one rare word cannot empty the list.
 *
 * The fallback tiers are what make the RELEVANCE GATE in search-answer.js
 * necessary: a single-word query always finds something, because the AND no
 * longer bites. Callers must know which tier a result came from.
 */
export function resolve(raw) {
  const all = words(raw);
  const keywords = all.filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  const dropped = all.filter((word) => STOP_WORDS.has(word) || word.length <= 1);

  const queries = [];
  if (keywords.length) queries.push(keywords.join(' '));
  // Pairs, then single words — what a model does when its first query returns
  // nothing: it asks again, more narrowly.
  if (keywords.length > 2) {
    for (let i = 0; i < keywords.length - 1; i++) queries.push(`${keywords[i]} ${keywords[i + 1]}`);
  }
  if (keywords.length > 1) queries.push(...keywords);

  return { keywords, dropped, queries: [...new Set(queries)] };
}
