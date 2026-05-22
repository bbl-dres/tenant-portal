import assert from 'node:assert/strict';

import { state } from '../js/state.js';

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

const { calcWizard, deriveNawClass } = await import('../js/wizard.js');

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

console.log('Domain unit checks passed.');
