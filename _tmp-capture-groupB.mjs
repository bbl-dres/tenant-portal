// Phase C design-quality capture: inbox, application detail, wizard 1-5.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startServer, loginAs, waitForRoute, suppressPrototypeNotice } from 'file:///C:/Users/david/Documents/GitHub/tenant-portal/scripts/verify/lib.mjs';

const OUT = 'C:/Users/david/AppData/Local/Temp/claude/C--Users-david-Documents-GitHub-tenant-portal/84f32c0a-e663-4eb5-9919-9bb27acb6302/scratchpad/shots';
mkdirSync(OUT, { recursive: true });

const PROBE_PROPS = [
  'fontSize','fontWeight','fontFamily','lineHeight','color','backgroundColor','borderRadius',
  'border','borderBottom','borderTop','padding','margin','gap','display','flexDirection','flexWrap',
  'justifyContent','alignItems','textAlign','whiteSpace','textTransform','letterSpacing',
  'boxShadow','outline','width','height','maxWidth','minHeight','position','overflowX','columnGap','rowGap','fontVariantNumeric','textDecorationLine'
];

async function probe(page, selectors) {
  return page.evaluate(({ selectors, props }) => {
    const out = {};
    for (const sel of selectors) {
      const els = Array.from(document.querySelectorAll(sel)).slice(0, 8);
      out[sel] = els.map(el => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const o = { rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }, text: (el.textContent || '').trim().slice(0, 80) };
        for (const p of props) o[p] = cs[p];
        return o;
      });
    }
    return out;
  }, { selectors, props: PROBE_PROPS });
}

async function shot(page, name, full = true) {
  await page.screenshot({ path: join(OUT, name + '.png'), fullPage: full });
  console.log('shot', name);
}

const { server, baseUrl } = await startServer();
const browser = await chromium.launch();

for (const [wname, vw, vh] of [['1280', 1280, 900], ['360', 360, 780]]) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh } });
  await suppressPrototypeNotice(ctx);
  const page = await ctx.newPage();
  await loginAs(page, baseUrl, 'LBO');
  const probes = {};

  // ---- INBOX ----
  await page.goto(`${baseUrl}/#/inbox`);
  await waitForRoute(page, '#/inbox');
  await shot(page, `inbox-${wname}`);
  probes['inbox'] = await probe(page, [
    '.page-header', '.page-header__title', '.page-header__sub', '.page-header__actions .btn',
    '.filter-row', '.filter-row__search', '#filterText', '.filter-chips', '.tag-item', '.tag-item--active', '.tag-item__count',
    '.table-wrapper', '.table', '.table thead th', '.table tbody tr:first-child td', '.table tbody td .badge',
    '.table-hint', '.pagination', '.pagination__info', '.pagination__pages', '.pagination a', '.pagination input',
    '.badge'
  ]);
  // filter no-results state
  await page.fill('#filterText', 'zzzz');
  await page.waitForTimeout(120);
  await shot(page, `inbox-nohit-${wname}`, false);
  probes['inbox-nohit'] = await probe(page, ['.table-empty']);

  // ---- DETAIL Z-7-204 (clarification) all tabs ----
  for (const tab of ['daten', 'anhaenge', 'historie', 'sap']) {
    await page.goto(`${baseUrl}/#/inbox/Z-7-204${tab === 'daten' ? '' : '?tab=' + tab}`);
    await page.waitForTimeout(400);
    await shot(page, `detail-Z7204-${tab}-${wname}`);
  }
  probes['detail-sap'] = await probe(page, ['.sap-dl', '.sap-dl dt', '.sap-dl dd', '.sap-dl code', '.card']);
  await page.goto(`${baseUrl}/#/inbox/Z-7-204`);
  await page.waitForTimeout(400);
  probes['detail'] = await probe(page, [
    '.share-bar', '.share-bar a', '.page-header', '.page-header__title', '.page-header__count', '.page-header__sub',
    '.page-header__actions .btn', '.pipeline', '.pipeline__step', '.tabs', '.tab', '.tab--active',
    '.card-grid', '.card', '.card__title', '.card__inset', '.card__inset-meta', '.card--clarification',
    '.card__justification', '.auflagen-list', '.auflagen-list li', '.auflagen-list .badge'
  ]);
  // historie + anhaenge probes
  await page.goto(`${baseUrl}/#/inbox/Z-7-204?tab=historie`);
  await page.waitForTimeout(400);
  probes['detail-historie'] = await probe(page, ['.history-timeline', '.history-timeline__item', '.history-timeline__dot', '.history-timeline__time', '.history-timeline__action']);
  await page.goto(`${baseUrl}/#/inbox/Z-7-204?tab=anhaenge`);
  await page.waitForTimeout(400);
  probes['detail-anhaenge'] = await probe(page, ['.attachment-list', '.attachment-list li', '.attachment-list a', '.table-hint']);

  // plain detail (no clarification)
  await page.goto(`${baseUrl}/#/inbox/BE-2026-014`);
  await page.waitForTimeout(400);
  await shot(page, `detail-BE2026014-daten-${wname}`);
  // in_project detail sap tab
  await page.goto(`${baseUrl}/#/inbox/BE-2026-013?tab=sap`);
  await page.waitForTimeout(400);
  await shot(page, `detail-BE2026013-sap-${wname}`);

  // ---- WIZARD (Kleinantrag default path) ----
  await page.evaluate(() => { sessionStorage.removeItem('mp-draft'); localStorage.removeItem('mp-draft'); window.portal.state.draft = null; });
  await page.goto(`${baseUrl}/#/wizard/1`);
  await page.waitForTimeout(400);
  await shot(page, `wiz1-${wname}`);
  probes['wiz1'] = await probe(page, [
    '.step-indicator', '.step-indicator li', '.wizard', '.wizard__title', '.wizard__subtitle', '.wizard__id', '.wizard__autosave',
    '.wizard__section', '.wizard__section h3', '.option-group', '.option-group__item', '.form-field', '.form-field__label',
    '#wizVe', '#wizAddressInput', '.form-field__hint', '.wizard__sticky-footer', '.wizard__sticky-footer .btn',
    '.wizard__counter', '.container--narrow'
  ]);
  // error state
  await page.click('#nextStep');
  await page.waitForTimeout(250);
  await shot(page, `wiz1-error-${wname}`, false);
  probes['wiz1-error'] = await probe(page, ['.form-field__error', '#wizAddressInput']);
  // combobox open
  await page.click('#wizAddressInput');
  await page.waitForTimeout(250);
  await shot(page, `wiz1-combobox-${wname}`, false);
  probes['wiz1-combobox'] = await probe(page, ['.combobox__list', '.combobox__option', '.combobox__option-primary', '.combobox__option-secondary']);
  // pick first address
  await page.evaluate(() => {
    const opt = document.querySelector('.combobox__option');
    opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  });
  await page.waitForTimeout(200);

  // step 2
  await page.click('#nextStep');
  await page.waitForTimeout(400);
  await shot(page, `wiz2-${wname}`);
  probes['wiz2'] = await probe(page, [
    '.wizard__subtitle', '.naw-confidence', '.naw-confidence__line', '.naw-confidence__line--meta', '.naw-confidence__alt',
    '#fteInput', '.calc-block', '.calc-block dl', '.calc-block dt', '.calc-block dd', '.calc-block hr',
    '.calc-block__guardrail-warn', '.calc-block__guardrail-block', '#remoteShare'
  ]);

  // step 3 empty then upload
  await page.click('#nextStep');
  await page.waitForTimeout(400);
  await shot(page, `wiz3-empty-${wname}`);
  probes['wiz3'] = await probe(page, ['.wizard__file-label', '.wizard__attachment-list', '.wizard__counter', '.form-field__hint']);
  await page.evaluate(() => window.t3lite.fakeUpload());
  await page.waitForTimeout(300);
  await shot(page, `wiz3-scanning-${wname}`, false);
  await page.waitForTimeout(1800);
  await shot(page, `wiz3-ok-${wname}`);
  probes['wiz3-list'] = await probe(page, ['.attachment-list li', '.attachment-list .badge', '.attachment-list li span']);

  // step 4 skipped (Kleinantrag)
  await page.click('#nextStep');
  await page.waitForTimeout(400);
  await shot(page, `wiz5-kleinantrag-${wname}`);
  probes['wiz5'] = await probe(page, [
    '.checklist', '.checklist__verdict', '.checklist__verdict-icon', '.checklist__item', '.checklist__icon',
    '.checklist__label', '.checklist__detail', '.accordion', '.accordion__item', '.accordion__trigger', '.accordion__panel',
    '.wizard__workflow-line', '.consent-check', '#submitBtn', '.wizard__sticky-footer'
  ]);
  // step 4 skip screen
  await page.goto(`${baseUrl}/#/wizard/4`);
  await page.waitForTimeout(400);
  await shot(page, `wiz4-skipped-${wname}`);

  // Grossantrag: set type, go to step 4
  await page.evaluate(() => { window.portal.state.draft.type = 'Grossantrag'; });
  await page.goto(`${baseUrl}/#/wizard/4`);
  await page.reload();
  await page.waitForTimeout(600);
  // reload drops login? loginAs used demoRole persisted via persistRole probably. check
  await shot(page, `wiz4-gross-${wname}`);
  probes['wiz4'] = await probe(page, [
    '.wizard__inline-toggle', '.eppm-tab', '.form-field__textarea', '#gRecht', '.date-grid', '.date-grid input',
    '#gKosten', '#grossCounter', '.wizard__sticky-footer .btn', '.form-field__hint .btn'
  ]);
  // eppm toggle on
  const t = await page.$('#eppmToggle');
  if (t) { await t.click(); await page.waitForTimeout(200); await shot(page, `wiz4-gross-eppm-${wname}`, false); }
  // step 5 gross (incomplete)
  await page.goto(`${baseUrl}/#/wizard/5`);
  await page.waitForTimeout(400);
  await shot(page, `wiz5-gross-incomplete-${wname}`);

  writeFileSync(join(OUT, `probes-${wname}.json`), JSON.stringify(probes, null, 1));
  await ctx.close();
}

await browser.close();
server.close();
console.log('DONE');
