/* ==========================================================================
   WIZARD.JS — 5-step Bedarfsmeldung (demand-application) wizard.

   The wizard is the portal's single largest piece of business logic and the
   only one that mutates state.applications (via submitDraft). It earns its
   own module because:
     • it's self-contained — only the wizard's renderers and wires touch
       step state via `draft`; nothing outside the wizard reads draft state.
     • it has its own pure calculation engine — calcWizard (HNF2/GF/UK)
       and deriveNawClass (questionnaire → NAW class) — that future tests
       can target without spinning up the DOM.

   Routes wired up by app.js: #/wizard/:step. Inline event-handler bridge
   (window.t3lite.saveDraft / fakeUpload / suggestDates) lives in app.js.
   ========================================================================== */

import { state, persistDraft, loadDraft, clearDraft } from './state.js';
import {
  escapeHtml, escapeJs, formatChf, icon, toast, modal,
  renderStepIndicator, formatAssetKey, attachmentLi,
} from './lib.js';
import { shell } from './shell.js';

// ── WIZARD CALCULATION (FUNC-AU-014/-015 — see WIREFRAMES.md §8.1) ─────
export function calcWizard(fields) {
  if (!state.referenceData) return null;
  const naw = state.referenceData.nawClasses.find(n => n.name === fields.nawClass)
            || state.referenceData.nawClasses.find(n => n.name === 'Kollaborativ-Standard');
  const ds  = state.referenceData.deskSharingFactor;       // fixed 0.8
  const fte = Number(fields.fte) || 0;

  const arbeitsplaetze = Math.ceil(fte * ds);            // FTE × 0.8
  const hnf2 = Math.round(naw.hnf2PerFte * fte * ds);
  const gf   = Math.round(naw.gfPerFte * fte * ds);

  // UK-Kosten: master data has CHF per m² GF; placeholder calculation
  const ukKosten = Math.round(gf * 3000);                // illustrative
  const moeblierung = Math.round(hnf2 * state.referenceData.furnitureBudgetPerSqm);
  const betriebskostenProM2Gf = state.referenceData.operatingCostCeilingPerSqmGf;
  const hardBlockMultiplier   = state.referenceData.operatingCostHardBlockMultiplier;
  const ukProM2Gf = gf > 0 ? Math.round(ukKosten / gf / 12) : 0; // monthly

  return {
    nawClassName: naw.name,
    nawHnf2: naw.hnf2PerFte,
    nawGf:   naw.gfPerFte,
    deskSharingFactor: ds,
    fte, arbeitsplaetze,
    hnf2, gf, ukKosten, moeblierung,
    ukProM2Gf, betriebskostenProM2Gf, hardBlockMultiplier,
    overBudget: ukProM2Gf > betriebskostenProM2Gf,
    overBudgetPercent: ukProM2Gf > 0 ? Math.round((ukProM2Gf / betriebskostenProM2Gf - 1) * 100) : 0,
    hardBlocked: ukProM2Gf > betriebskostenProM2Gf * hardBlockMultiplier,
  };
}

// ── NAW QUESTIONNAIRE → CLASS ────────────────────────────────────────────
export function deriveNawClass(answers) {
  // Simplistic mapping for prototype:
  // - "Labor" specialEquipment → Sicherheit-Labor
  // - High concentration → Konzentriert-Einzel/Gruppe
  // - Open/collab → Kollaborativ-Standard / Open
  // - High remote share → Hybrid-Activity-Based
  const specials = answers.specials || [];
  if (specials.includes('Labor') || specials.includes('Sicherheitsbereich')) {
    return { name: 'Sicherheit-Labor', confidence: 0.85, alternative: null };
  }
  if (answers.focus === 'Konzentriert') {
    const variant = answers.confidentiality === 'hoch' ? 'Konzentriert-Einzel' : 'Konzentriert-Gruppe';
    return { name: variant, confidence: 0.78, alternative: { name: 'Kollaborativ-Standard', confidence: 0.15 } };
  }
  if (Number(answers.remoteShare) >= 40) {
    return { name: 'Hybrid-Activity-Based', confidence: 0.72, alternative: { name: 'Kollaborativ-Open', confidence: 0.20 } };
  }
  if (answers.publicContact === 'regelmaessig') {
    return { name: 'Kollaborativ-Open', confidence: 0.68, alternative: { name: 'Kollaborativ-Standard', confidence: 0.25 } };
  }
  return { name: 'Kollaborativ-Standard', confidence: 0.84, alternative: { name: 'Hybrid-Activity-Based', confidence: 0.12 } };
}


// ── 4. WIZARD ────────────────────────────────────────────────────────────
const WIZARD_STEPS = ['Basis', 'Fläche / NAW', 'Anhänge', 'Detail (Grossantrag)', 'Prüfen & Senden'];

export function ensureDraft() {
  if (!state.draft) {
    const persisted = loadDraft();
    state.draft = persisted || {
      id: 'BE-2026-DRAFT-' + Math.floor(Math.random() * 900 + 100),
      type: 'Kleinantrag',
      ve: state.user.ve,
      dep: state.user.dep,
      address: '',
      sap: null,
      egid: null,
      pipelineVariant: 'standard',
      bk1086Ok: null,
      greenfield: false,
      nawAnswers: { focus: 'Kollaborativ', remoteShare: 30, confidentiality: 'mittel', publicContact: 'gelegentlich', specials: [] },
      nawClass: null,
      fte: 8,
      attachments: [],
      confirmCorrect: false,
      confirmIsg: false,
    };
  }
  return state.draft;
}

export function renderWizard({ step }) {
  if (!state.user) { window.portal.navigate('#/login'); return; }
  const stepNum = parseInt(step, 10) || 1;
  if (stepNum < 1 || stepNum > 5) { window.portal.navigate('#/wizard/1'); return; }
  if (state.user.activeRole === 'GS-Reviewer') {
    toast('Bedarf anmelden steht nur in der Mieter-Rolle zur Verfügung. Bitte Rolle wechseln.');
    window.portal.navigate('#/queue');
    return;
  }
  const main = shell({ activeNav: 'wizard', breadcrumb: [
    { href: '#/home', label: 'Start' },
    { href: '#/wizard/1', label: 'Bedarf anmelden' },
    { label: `Schritt ${stepNum}` }
  ]});
  const draft = ensureDraft();

  document.getElementById('page-body').innerHTML = `
    <section class="section">
      <div class="container container--narrow">
        ${renderStepIndicator(stepNum, WIZARD_STEPS)}
        <div class="wizard" id="wizardBody">
          ${renderWizardStep(stepNum, draft)}
        </div>
      </div>
    </section>
  `;

  wireWizardStep(stepNum, draft);
}

function renderWizardStep(stepNum, draft) {
  switch (stepNum) {
    case 1: return renderStep1(draft);
    case 2: return renderStep2(draft);
    case 3: return renderStep3(draft);
    case 4: return renderStep4(draft);
    case 5: return renderStep5(draft);
  }
}

// -- Step 1 ----------------------------------------------------------------
function renderStep1(draft) {
  return `
    <h2 class="wizard__title">Schritt 1 von 5 — Basisangaben</h2>
    <p class="wizard__subtitle">
      <span class="wizard__id">Antrags-ID: <strong>${draft.id}</strong></span>
      <span class="wizard__autosave" aria-live="polite">${icon('check')} Auto-Save aktiv</span>
    </p>

    <div class="wizard__section">
      <h3>Antragstyp</h3>
      <div class="radio-group">
        <label><input type="radio" name="type" value="Grossantrag"  ${draft.type === 'Grossantrag'  ? 'checked' : ''}> Grossantrag</label>
        <label><input type="radio" name="type" value="Kleinantrag"  ${draft.type === 'Kleinantrag'  ? 'checked' : ''}> Kleinantrag</label>
        <label><input type="radio" name="type" value="Mobiliar"     ${draft.type === 'Mobiliar'     ? 'checked' : ''}> Mobiliar</label>
      </div>
      <p class="form-field__hint">Bei <strong>Grossantrag</strong> öffnet sich in Schritt 4 ein zusätzliches Detail-Formular.</p>
    </div>

    <div class="wizard__section">
      <h3>Verwaltungseinheit & Kontakte</h3>
      <div class="form-field">
        <label class="form-field__label">Verwaltungseinheit (VE) <span class="form-field__required">*</span></label>
        <select class="form-field__select" name="ve">
          <option value="UVEK / BAFU">UVEK / BAFU</option>
          <option value="UVEK / BAV">UVEK / BAV</option>
          <option value="UVEK / SBB">UVEK / SBB</option>
          <option value="SEM">SEM</option>
          <option value="EDA">EDA (FDFA)</option>
          <option value="BK">Bundeskanzlei (BK)</option>
        </select>
      </div>
      <p class="form-field__hint">Zuständige BBL-Kontakte: <strong>H. Ludwig (PFM)</strong> · <strong>A. Wirz (IM)</strong> — automatisch ermittelt aus VE.</p>
    </div>

    <div class="wizard__section">
      <h3>Standort</h3>
      <div class="form-field">
        <label class="form-field__label">Adresse <span class="form-field__required">*</span></label>
        <input class="form-field__input" name="address" placeholder="z. B. Eichweg 22, 3003 Bern" value="${escapeHtml(draft.address)}" autocomplete="off" list="bldList">
        <datalist id="bldList">
          ${state.buildings.map(b => `<option value="${escapeHtml(b.address)}">${escapeHtml(b.name)}</option>`).join('')}
        </datalist>
      </div>
      <div id="sapInfo" class="wizard__sap-info"></div>
    </div>

    <div class="wizard__sticky-footer">
      <span class="wizard__counter">Schritt 1 / 5</span>
      <button class="btn btn--outline" onclick="window.t3lite.saveDraft()">Entwurf speichern</button>
      <a class="btn btn--outline" href="#/home">Abbrechen</a>
      <button class="btn btn--filled" id="nextStep">Weiter → Fläche / NAW</button>
    </div>
  `;
}

function wireWizardStep(stepNum, draft) {
  const body = document.getElementById('wizardBody');
  if (!body) return;

  if (stepNum === 1) {
    body.querySelectorAll('input[name="type"]').forEach(el => {
      el.addEventListener('change', e => { draft.type = e.target.value; persistDraft(draft); });
    });
    body.querySelector('select[name="ve"]').addEventListener('change', e => {
      draft.ve = e.target.value;
      // BK detection (FUNC-FG-005)
      draft.pipelineVariant = e.target.value === 'BK' ? 'bypass' : 'standard';
      persistDraft(draft);
      if (draft.pipelineVariant === 'bypass') {
        toast('BK-Pfad erkannt: Antrag wird ohne GS-Schritt direkt an BBL-PFM geroutet.');
      }
    });
    const addr = body.querySelector('input[name="address"]');
    addr.addEventListener('input', e => {
      draft.address = e.target.value;
      updateSapInfo(draft);
      persistDraft(draft);
    });
    updateSapInfo(draft);
    body.querySelector('#nextStep').addEventListener('click', () => {
      if (!draft.address) { toast('Bitte Adresse eingeben'); return; }
      window.portal.navigate('#/wizard/2');
    });
  }
  if (stepNum === 2) wireStep2(draft);
  if (stepNum === 3) wireStep3(draft);
  if (stepNum === 4) wireStep4(draft);
  if (stepNum === 5) wireStep5(draft);
}

function updateSapInfo(draft) {
  const info = document.getElementById('sapInfo');
  if (!info) return;
  const match = state.buildings.find(b => b.address && draft.address && b.address.toLowerCase() === draft.address.toLowerCase());
  if (!match) {
    if (draft.address && draft.address.length > 5) {
      // Greenfield path (FUNC-AU-013)
      draft.greenfield = true;
      draft.pipelineVariant = draft.pipelineVariant === 'bypass' ? 'bypass' : 'greenfield';
      draft.assetKey = null;
      draft.egid = null;
      info.innerHTML = `
        <div class="notification-banner notification-banner--warning">
          <div class="notification-banner__wrapper">
            <p class="notification-banner__text">
              <strong>Greenfield erkannt:</strong> Adresse nicht im Bundes-Stammdatensatz.
              Sie können den Antrag trotzdem einreichen. BBL legt die WE im Anschluss an die Genehmigung an.
            </p>
          </div>
        </div>
      `;
    } else {
      info.innerHTML = '';
    }
    return;
  }
  draft.greenfield = false;
  draft.assetKey = { ...match.assetKey };
  draft.egid = match.egid;
  draft.pipelineVariant = draft.ve === 'BK' ? 'bypass' : 'standard';
  const bkOk = match.assetKey.bk === state.referenceData.companyCode;
  draft.bk1086Ok = bkOk;
  info.innerHTML = `
    <div class="notification-banner notification-banner--${bkOk ? 'success' : 'danger'}">
      <span class="notification-banner__icon" aria-hidden="true">${bkOk ? icon('check') : icon('alertTriangle')}</span>
      <div class="notification-banner__wrapper">
        <p class="notification-banner__text">
          <strong>Erkannt:</strong>
          SAP <code>${formatAssetKey(match.assetKey)}</code> · EGID <code>${match.egid}</code>
          <span class="notification-banner__sub">${bkOk
            ? 'BK 1086 = BBL-Portfolio — Antrag geht an BBL.'
            : 'BK ≠ 1086 — Objekt gehört nicht zu BBL. Bitte zuständige Organisation kontaktieren.'
          }</span>
        </p>
      </div>
    </div>
  `;
}

// -- Step 2 (NAW + calc) ---------------------------------------------------
function renderStep2(draft) {
  return `
    <h2 class="wizard__title">Schritt 2 von 5 — Flächenbedarf</h2>
    <p class="wizard__subtitle">Antragstyp: ${draft.type} · NAW-Klassifizierung treibt die m²/FTE-Basis.</p>

    <div class="wizard__section">
      <h3>NAW-Klassifizierung (Arbeitsstil)</h3>
      <div class="form-field">
        <label class="form-field__label">Schwerpunkt</label>
        <fieldset class="option-group">
          <legend class="sr-only">Schwerpunkt</legend>
          <label class="option-group__item"><input type="radio" name="focus" value="Kollaborativ" ${draft.nawAnswers.focus === 'Kollaborativ' ? 'checked' : ''}> <span>Kollaborativ</span></label>
          <label class="option-group__item"><input type="radio" name="focus" value="Konzentriert" ${draft.nawAnswers.focus === 'Konzentriert' ? 'checked' : ''}> <span>Konzentriert</span></label>
          <label class="option-group__item"><input type="radio" name="focus" value="Mix"          ${draft.nawAnswers.focus === 'Mix'          ? 'checked' : ''}> <span>Mix</span></label>
        </fieldset>
      </div>
      <div class="form-field">
        <label class="form-field__label" for="remoteShare">Anteil Remote-Arbeit</label>
        <select class="form-field__select" id="remoteShare" name="remoteShare">
          ${[0, 10, 20, 30, 40, 50, 60].map(v => `<option value="${v}" ${draft.nawAnswers.remoteShare == v ? 'selected' : ''}>${v} %</option>`).join('')}
        </select>
      </div>
      <div class="form-field">
        <label class="form-field__label">Vertraulichkeit der Arbeit</label>
        <fieldset class="option-group">
          <legend class="sr-only">Vertraulichkeit der Arbeit</legend>
          <label class="option-group__item"><input type="radio" name="confidentiality" value="niedrig" ${draft.nawAnswers.confidentiality === 'niedrig' ? 'checked' : ''}> <span>niedrig</span></label>
          <label class="option-group__item"><input type="radio" name="confidentiality" value="mittel"  ${draft.nawAnswers.confidentiality === 'mittel'  ? 'checked' : ''}> <span>mittel</span></label>
          <label class="option-group__item"><input type="radio" name="confidentiality" value="hoch"    ${draft.nawAnswers.confidentiality === 'hoch'    ? 'checked' : ''}> <span>hoch</span></label>
        </fieldset>
      </div>
      <div class="form-field">
        <label class="form-field__label">Publikumsverkehr</label>
        <fieldset class="option-group">
          <legend class="sr-only">Publikumsverkehr</legend>
          <label class="option-group__item"><input type="radio" name="publicContact" value="keiner"       ${draft.nawAnswers.publicContact === 'keiner'       ? 'checked' : ''}> <span>keiner</span></label>
          <label class="option-group__item"><input type="radio" name="publicContact" value="gelegentlich" ${draft.nawAnswers.publicContact === 'gelegentlich' ? 'checked' : ''}> <span>gelegentlich</span></label>
          <label class="option-group__item"><input type="radio" name="publicContact" value="regelmaessig" ${draft.nawAnswers.publicContact === 'regelmaessig' ? 'checked' : ''}> <span>regelmässig</span></label>
        </fieldset>
      </div>
      <div class="form-field">
        <label class="form-field__label">Spezialausstattung</label>
        <fieldset class="option-group option-group--wrap">
          <legend class="sr-only">Spezialausstattung</legend>
          <label class="option-group__item"><input type="checkbox" name="specials" value="Labor"            ${draft.nawAnswers.specials.includes('Labor')            ? 'checked' : ''}> <span>Labor</span></label>
          <label class="option-group__item"><input type="checkbox" name="specials" value="Werkstatt"        ${draft.nawAnswers.specials.includes('Werkstatt')        ? 'checked' : ''}> <span>Werkstatt</span></label>
          <label class="option-group__item"><input type="checkbox" name="specials" value="Sicherheitsbereich" ${draft.nawAnswers.specials.includes('Sicherheitsbereich') ? 'checked' : ''}> <span>Sicherheitsbereich</span></label>
        </fieldset>
      </div>
      <div id="nawConfidence"></div>
    </div>

    <div class="wizard__section">
      <h3>Mengengerüst & Berechnung</h3>
      <div class="form-field">
        <label class="form-field__label" for="fteInput">Anzahl FTE <span class="form-field__required">*</span></label>
        <input class="form-field__input" id="fteInput" type="number" min="1" max="2000" name="fte" value="${draft.fte}">
        <p class="form-field__hint">Belegungsfaktor (Desk-Sharing) <strong>0.8</strong> — Bundes-Stammdatenvorgabe.</p>
      </div>
      <div id="calcBlock"></div>
    </div>

    <div class="wizard__sticky-footer">
      <span class="wizard__counter">Schritt 2 / 5</span>
      <button class="btn btn--outline" onclick="window.t3lite.saveDraft()">Entwurf speichern</button>
      <a class="btn btn--outline" href="#/wizard/1">← Zurück</a>
      <button class="btn btn--filled" id="nextStep">Weiter → Anhänge</button>
    </div>
  `;
}

function wireStep2(draft) {
  const body = document.getElementById('wizardBody');
  const updateAll = () => {
    // Read NAW answers
    const focus = body.querySelector('input[name="focus"]:checked')?.value || draft.nawAnswers.focus;
    const remoteShare = Number(body.querySelector('select[name="remoteShare"]').value);
    const confidentiality = body.querySelector('input[name="confidentiality"]:checked')?.value || draft.nawAnswers.confidentiality;
    const publicContact = body.querySelector('input[name="publicContact"]:checked')?.value || draft.nawAnswers.publicContact;
    const specials = Array.from(body.querySelectorAll('input[name="specials"]:checked')).map(c => c.value);
    const fte = Number(body.querySelector('input[name="fte"]').value);
    draft.nawAnswers = { focus, remoteShare, confidentiality, publicContact, specials };
    draft.fte = fte;
    const naw = deriveNawClass(draft.nawAnswers);
    draft.nawClass = naw.name;
    draft.nawConfidence = naw.confidence;
    draft.nawAlternative = naw.alternative;
    persistDraft(draft);
    // Render confidence + calc
    const conf = Math.round(naw.confidence * 100);
    document.getElementById('nawConfidence').innerHTML = `
      <div class="naw-confidence">
        <div class="naw-confidence__line">
          <strong>Empfohlene NAW-Klasse:</strong>
          <span><strong>${naw.name}</strong></span>
        </div>
        <div class="naw-confidence__line naw-confidence__line--meta">
          <span>Konfidenz</span>
          <span>${conf} %</span>
        </div>
        ${naw.alternative ? `
          <div class="naw-confidence__alt">
            Alternative: <em>${naw.alternative.name}</em> (${Math.round(naw.alternative.confidence * 100)} %)
          </div>
        ` : ''}
        ${conf < 70 ? `
          <div class="calc-block__guardrail-warn">
            Niedrige Konfidenz — bitte prüfen, ob die Klasse zutrifft.
          </div>
        ` : ''}
      </div>
    `;
    // Calculation
    const c = calcWizard({ nawClass: naw.name, fte });
    if (c) {
      document.getElementById('calcBlock').innerHTML = `
        <div class="calc-block">
          <dl>
            <dt>Arbeitsplätze (AP) = FTE × 0.8</dt>
            <dd>${fte} × 0.8 = ${(fte * 0.8).toFixed(1)} → <strong>${c.workstations} AP</strong></dd>
            <dt>HNF2 = ${c.nawHnf2} m²/FTE × FTE × 0.8</dt>
            <dd>${c.nawHnf2} × ${fte} × 0.8 = <strong>${c.hnf2} m²</strong></dd>
            <dt>GF = ${c.nawGf} m²/FTE × FTE × 0.8</dt>
            <dd>${c.nawGf} × ${fte} × 0.8 = <strong>${c.gf} m²</strong></dd>
            <hr>
            <dt>UK-Kosten (vorl., illustrativ)</dt>
            <dd>${formatChf(c.operatingCosts)}</dd>
            <dt>Möblierung CHF 650/m² HNF2</dt>
            <dd>${formatChf(c.furnitureBudget)}</dd>
          </dl>
          ${c.overBudget ? `
            <div class="${c.hardBlocked ? 'calc-block__guardrail-block' : 'calc-block__guardrail-warn'}">
              ${c.hardBlocked ? icon('xCircle') : icon('alertTriangle')}
              <span>${c.hardBlocked
                ? `Betriebskosten ${c.ukProM2Gf} CHF/m² GF überschreiten die Obergrenze (${c.betriebskostenProM2Gf} CHF + 20 %). Antrag wird in Schritt 5 blockiert.`
                : `Hinweis: Betriebskosten ${c.ukProM2Gf} CHF/m² GF über Vorgabe (${c.betriebskostenProM2Gf} CHF, +${c.overBudgetPercent} %). Begründung in Schritt 5 empfohlen.`}</span>
            </div>
          ` : ''}
        </div>
      `;
    }
  };
  body.querySelectorAll('input, select').forEach(el => el.addEventListener('change', updateAll));
  body.querySelector('input[name="fte"]').addEventListener('input', updateAll);
  body.querySelector('#nextStep').addEventListener('click', () => window.portal.navigate('#/wizard/3'));
  updateAll();
}

// -- Step 3 Anhänge --------------------------------------------------------
function renderStep3(draft) {
  return `
    <h2 class="wizard__title">Schritt 3 von 5 — Anhänge</h2>
    <p class="wizard__subtitle">Cost-Benefit-Beleg (WiBe) und Rechtsgrundlage-Beleg.</p>

    <div class="wizard__section">
      <h3>Dateien hochladen</h3>
      <p class="form-field__hint">Erlaubt: PDF, DOCX, XLSX, JPG, PNG · max. 25 MB · max. 10 Dateien · jede Datei wird auf Schadsoftware geprüft.</p>
      <input class="wizard__file-picker" type="file" id="filePicker" multiple>
      <button class="btn btn--outline btn--sm" type="button" onclick="window.t3lite.fakeUpload()">Beispieldateien hochladen (Demo)</button>
      <ul class="attachment-list wizard__attachment-list" id="attachmentList">
        ${(draft.attachments || []).map((a, i) => attachmentLi(a, i)).join('')}
      </ul>
    </div>

    <div class="wizard__sticky-footer">
      <span class="wizard__counter">Schritt 3 / 5 · ${(draft.attachments || []).length} Dateien</span>
      <button class="btn btn--outline" onclick="window.t3lite.saveDraft()">Entwurf speichern</button>
      <a class="btn btn--outline" href="#/wizard/2">← Zurück</a>
      <button class="btn btn--filled" id="nextStep">Weiter → ${draft.type === 'Grossantrag' ? 'Detail' : 'Prüfen & Senden'}</button>
    </div>
  `;
}

function wireStep3(draft) {
  const body = document.getElementById('wizardBody');
  body.querySelector('#filePicker').addEventListener('change', e => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => {
      const att = { name: f.name, size: (f.size / 1024).toFixed(0) + ' KB', scanStatus: 'scanning' };
      draft.attachments = draft.attachments || [];
      draft.attachments.push(att);
      setTimeout(() => {
        att.scanStatus = 'ok';
        persistDraft(draft);
        refreshAttachmentList(draft);
        toast('Virenscan ok: ' + att.name, 'success');
      }, 1500);
    });
    persistDraft(draft);
    refreshAttachmentList(draft);
  });
  body.querySelector('#nextStep').addEventListener('click', () => {
    const next = draft.type === 'Grossantrag' ? 4 : 5;
    window.portal.navigate('#/wizard/' + next);
  });
}

function refreshAttachmentList(draft) {
  const ul = document.getElementById('attachmentList');
  if (ul) ul.innerHTML = (draft.attachments || []).map((a, i) => attachmentLi(a, i)).join('');
}

// -- Step 4 Grossantrag (v0.5 narrowed: 6 free-text + 4 structured + 1 optional) --
function renderStep4(draft) {
  if (draft.type !== 'Grossantrag') {
    return `
      <h2 class="wizard__title">Schritt 4 von 5 — Detail-Felder</h2>
      <p class="wizard__subtitle">Entfällt für Antragstyp "${draft.type}". Sie können direkt zu Schritt 5 weiter.</p>
      <div class="wizard__sticky-footer">
        <span class="wizard__counter">Schritt 4 (übersprungen)</span>
        <a class="btn btn--outline" href="#/wizard/3">← Zurück</a>
        <button class="btn btn--filled" id="nextStep">Weiter → Prüfen & Senden</button>
      </div>
    `;
  }
  const f = draft.grossantrag = draft.grossantrag || { _eppmToggle: false };
  return `
    <h2 class="wizard__title">Schritt 4 von 5 — Grossantrag: Pflichtfelder</h2>
    <p class="wizard__subtitle">Zusätzliche Pflichtfelder für Grossanträge. <label class="wizard__inline-toggle"><input type="checkbox" id="eppmToggle" ${f._eppmToggle ? 'checked' : ''}> Erweiterte Ansicht (ePPM-Mapping)</label></p>

    <div class="wizard__section">
      <h3>Sektion A · Bedarf & Zielzustand</h3>
      <div class="form-field">
        <label class="form-field__label">4.1 Kurzbeschreibung <span class="form-field__required">*</span> <span class="eppm-tab ${f._eppmToggle ? 'eppm-tab--visible' : ''}">→ ePPM "Antrag"</span></label>
        <textarea class="form-field__textarea" name="g_kurz" maxlength="500">${escapeHtml(f.kurz || '')}</textarea>
      </div>
      <div class="form-field">
        <label class="form-field__label">4.2 Defizite in der aktuellen Situation <span class="form-field__required">*</span> <span class="eppm-tab ${f._eppmToggle ? 'eppm-tab--visible' : ''}">→ ePPM "Defizit"</span></label>
        <textarea class="form-field__textarea" name="g_defizit">${escapeHtml(f.defizit || '')}</textarea>
      </div>
      <div class="form-field">
        <label class="form-field__label">4.4 Zielzustand / Operative Ziele <span class="form-field__required">*</span> <span class="eppm-tab ${f._eppmToggle ? 'eppm-tab--visible' : ''}">→ ePPM "Ziele/Soll"</span></label>
        <textarea class="form-field__textarea" name="g_ziel">${escapeHtml(f.ziel || '')}</textarea>
        <p class="form-field__hint">v0.5: zusammengefasst aus den vorigen Feldern „Operative Ziele" und „Zielzustand".</p>
      </div>
    </div>

    <div class="wizard__section">
      <h3>Sektion B · Recht, Alternativen, Planung</h3>
      <div class="form-field">
        <label class="form-field__label">4.3 Rechtsgrundlage <span class="form-field__required">*</span> <span class="eppm-tab ${f._eppmToggle ? 'eppm-tab--visible' : ''}">→ ePPM "Recht"</span></label>
        <input class="form-field__input" type="text" name="g_recht" value="${escapeHtml(f.recht || '')}" placeholder="Verweis auf Upload aus Schritt 3 oder URL">
      </div>
      <div class="form-field">
        <label class="form-field__label">4.5 Geprüfte Alternativen <span class="form-field__required">*</span> <span class="eppm-tab ${f._eppmToggle ? 'eppm-tab--visible' : ''}">→ ePPM "Alt"</span></label>
        <textarea class="form-field__textarea" name="g_alt">${escapeHtml(f.alt || '')}</textarea>
      </div>
      <div class="form-field">
        <label class="form-field__label">4.8 Planungsabhängigkeiten <span class="form-field__required">*</span> <span class="eppm-tab ${f._eppmToggle ? 'eppm-tab--visible' : ''}">→ ePPM "Abhäng."</span></label>
        <textarea class="form-field__textarea" name="g_abh">${escapeHtml(f.abh || '')}</textarea>
      </div>
    </div>

    <div class="wizard__section">
      <h3>Sektion C · Termine, Kosten, FTE/AP (strukturiert)</h3>
      <div class="form-field">
        <label class="form-field__label">4.9 Terminplan <span class="form-field__required">*</span></label>
        <div class="date-grid">
          <input class="form-field__input" type="date" name="g_termin_start" value="${f.terminStart || ''}" aria-label="Start">
          <input class="form-field__input" type="date" name="g_termin_milestone" value="${f.terminMilestone || ''}" aria-label="Meilenstein">
          <input class="form-field__input" type="date" name="g_termin_end" value="${f.terminEnd || ''}" aria-label="Ende">
        </div>
        <p class="form-field__hint">Vorgeschlagene Termine basierend auf Investitionsvolumen: <button class="btn btn--bare btn--sm" type="button" onclick="window.t3lite.suggestDates()">Vorschlag übernehmen</button></p>
      </div>
      <div class="form-field">
        <label class="form-field__label">4.10 Kostenerwartung gesamt (CHF) <span class="form-field__required">*</span></label>
        <input class="form-field__input" type="number" name="g_kosten" value="${f.kosten || ''}" placeholder="z. B. 19200000">
      </div>
    </div>

    <div class="wizard__section">
      <h3>Sektion D · Nutzen-Kosten (optional, wenn WiBe vorhanden)</h3>
      <p class="form-field__hint">${draft.attachments && draft.attachments.some(a => /wibe/i.test(a.name)) ? `${icon('check')} WiBe.pdf erkannt — Feld optional.` : 'Keine WiBe-Datei hochgeladen — dieses Feld wird zur Pflicht.'}</p>
      <div class="form-field">
        <label class="form-field__label">4.6 Nutzen-Kosten-Begründung</label>
        <textarea class="form-field__textarea" name="g_nk">${escapeHtml(f.nk || '')}</textarea>
      </div>
    </div>

    <div class="wizard__sticky-footer">
      <span class="wizard__counter" id="grossCounter">0 / 7 Pflichtfelder ausgefüllt</span>
      <button class="btn btn--outline" onclick="window.t3lite.saveDraft()">Entwurf speichern</button>
      <a class="btn btn--outline" href="#/wizard/3">← Zurück</a>
      <button class="btn btn--filled" id="nextStep">Weiter → Prüfen & Senden</button>
    </div>
  `;
}

function wireStep4(draft) {
  const body = document.getElementById('wizardBody');
  if (!body) return;
  if (draft.type !== 'Grossantrag') {
    body.querySelector('#nextStep')?.addEventListener('click', () => window.portal.navigate('#/wizard/5'));
    return;
  }
  const f = draft.grossantrag = draft.grossantrag || {};
  const toggle = body.querySelector('#eppmToggle');
  if (toggle) toggle.addEventListener('change', () => {
    f._eppmToggle = toggle.checked;
    persistDraft(draft);
    body.querySelectorAll('.eppm-tab').forEach(el => el.classList.toggle('eppm-tab--visible', toggle.checked));
  });
  const fieldMap = {
    g_kurz: 'kurz', g_defizit: 'defizit', g_ziel: 'ziel',
    g_recht: 'recht', g_alt: 'alt', g_abh: 'abh',
    g_termin_start: 'terminStart', g_termin_milestone: 'terminMilestone', g_termin_end: 'terminEnd',
    g_kosten: 'kosten', g_nk: 'nk',
  };
  Object.entries(fieldMap).forEach(([name, key]) => {
    const el = body.querySelector(`[name="${name}"]`);
    if (!el) return;
    el.addEventListener('input', () => { f[key] = el.value; persistDraft(draft); updateGrossCounter(draft); });
  });
  body.querySelector('#nextStep')?.addEventListener('click', () => window.portal.navigate('#/wizard/5'));
  updateGrossCounter(draft);
}

function updateGrossCounter(draft) {
  const f = draft.grossantrag || {};
  const required = ['kurz', 'defizit', 'ziel', 'recht', 'alt', 'abh'];
  const structured = ['terminStart', 'kosten']; // simplified — terminStart represents the date block
  const filled = required.filter(k => f[k] && f[k].trim()).length
               + structured.filter(k => f[k]).length;
  const counter = document.getElementById('grossCounter');
  if (counter) counter.textContent = `${filled} / ${required.length + structured.length} Pflichtfelder ausgefüllt`;
}

// -- Step 5 Prüfen & Senden ------------------------------------------------
function renderStep5(draft) {
  const c = calcWizard({ nawClass: draft.nawClass, fte: draft.fte });
  const allRequired = !!(draft.address && draft.fte && draft.nawClass);
  const grossOk = draft.type !== 'Grossantrag' || (
    draft.grossantrag && draft.grossantrag.kurz && draft.grossantrag.defizit && draft.grossantrag.ziel
    && draft.grossantrag.recht && draft.grossantrag.alt && draft.grossantrag.abh
    && draft.grossantrag.terminStart && draft.grossantrag.kosten
  );
  const hasAtt = (draft.attachments || []).length > 0;
  return `
    <h2 class="wizard__title">Schritt 5 von 5 — Prüfen & Senden</h2>
    <p class="wizard__subtitle">Antrags-ID: <strong>${draft.id}</strong></p>

    <div class="wizard__section">
      <h3>Validierungs-Übersicht</h3>
      <ul class="checklist">
        <li class="checklist__item ${allRequired ? 'checklist__item--ok' : 'checklist__item--warn'}">${allRequired ? icon('check') : icon('alertTriangle')} Pflichtfelder Basis & Fläche</li>
        <li class="checklist__item ${hasAtt ? 'checklist__item--ok' : 'checklist__item--warn'}">${hasAtt ? icon('check') : icon('alertTriangle')} Anhänge ${hasAtt ? `(${draft.attachments.length})` : 'fehlen'}</li>
        ${draft.type === 'Grossantrag' ? `<li class="checklist__item ${grossOk ? 'checklist__item--ok' : 'checklist__item--warn'}">${grossOk ? icon('check') : icon('alertTriangle')} Grossantrag-Pflichtfelder</li>` : ''}
        ${c && c.overBudget ? `<li class="checklist__item ${c.hardBlocked ? 'checklist__item--danger' : 'checklist__item--warn'}">${c.hardBlocked ? icon('xCircle') : icon('alertTriangle')} Betriebskosten ${c.ukProM2Gf} CHF/m² GF ${c.hardBlocked ? '> +20 % — Einreichung blockiert' : `+${c.overBudgetPercent} % über Vorgabe — Begründung empfohlen`}</li>` : ''}
      </ul>
    </div>

    <div class="accordion">
      ${section('Schritt 1 — Basisangaben', `${draft.type} · ${draft.ve} · ${escapeHtml(draft.address)} ${draft.assetKey ? `· SAP ${draft.assetKey.bk}/${draft.assetKey.we}/${draft.assetKey.obj}` : draft.greenfield ? '· Greenfield' : ''} ${draft.egid ? `· EGID ${draft.egid}` : ''}`, true)}
      ${section('Schritt 2 — Flächenbedarf', c ? `NAW: ${draft.nawClass} · FTE ${c.fte} · HNF2 ${c.hnf2} m² · GF ${c.gf} m² · UK ${formatChf(c.operatingCosts)}` : 'noch unvollständig', false)}
      ${section('Schritt 3 — Anhänge', (draft.attachments || []).map(a => a.name).join(' · ') || 'keine', false)}
      ${draft.type === 'Grossantrag' ? section('Schritt 4 — Detail-Felder', grossOk ? 'vollständig ausgefüllt' : 'unvollständig', false) : ''}
    </div>

    <div class="wizard__section">
      <h3>Workflow-Vorschau</h3>
      <p class="wizard__workflow-line">
        Nach dem Senden geht der Antrag an
        ${draft.pipelineVariant === 'bypass' ? '<strong>BBL Portfolio-Management</strong> (BK-Pfad — kein GS)' : '<strong>GS UVEK</strong>'}
        (Bearbeitungszeit gemäss SLA). Sie erhalten eine E-Mail; der Status erscheint in Ihrer Inbox.
      </p>
      ${draft.greenfield ? '<p class="wizard__workflow-note">Greenfield-Pfad: nach Genehmigung legt BBL-IM die WE im SAP an, danach ePPM-Übergabe.</p>' : ''}
    </div>

    <div class="wizard__section">
      <h3>Datenschutz & Klassifizierung</h3>
      <label class="consent-check"><input type="checkbox" id="confirmCorrect" ${draft.confirmCorrect ? 'checked' : ''}> Ich bestätige, dass die Angaben korrekt und vollständig sind.</label>
      <label class="consent-check"><input type="checkbox" id="confirmIsg" ${draft.confirmIsg ? 'checked' : ''}> Ich kenne die ISG-Klassifizierung „INTERN" und werde keine sensiblen personenbezogenen Daten in Freitextfeldern eintragen.</label>
    </div>

    <div class="wizard__sticky-footer">
      <span class="wizard__counter">Schritt 5 / 5</span>
      <button class="btn btn--outline" onclick="window.t3lite.saveDraft()">Entwurf speichern</button>
      <a class="btn btn--outline" href="#/wizard/${draft.type === 'Grossantrag' ? '4' : '3'}">← Zurück</a>
      <button class="btn btn--filled" id="submitBtn" ${(!allRequired || !hasAtt || (c && c.hardBlocked) || (draft.type === 'Grossantrag' && !grossOk)) ? 'disabled' : ''}>Einreichen →</button>
    </div>
  `;
}

function section(title, summary, open) {
  return `
    <div class="accordion__item ${open ? 'accordion__item--open' : ''}">
      <button class="accordion__trigger" type="button" onclick="this.parentElement.classList.toggle('accordion__item--open')">
        <span>${title}</span>
        <span class="accordion__icon"></span>
      </button>
      <div class="accordion__panel">${escapeHtml(summary)}</div>
    </div>
  `;
}

function wireStep5(draft) {
  const body = document.getElementById('wizardBody');
  body.querySelector('#confirmCorrect')?.addEventListener('change', e => { draft.confirmCorrect = e.target.checked; persistDraft(draft); });
  body.querySelector('#confirmIsg')?.addEventListener('change', e => { draft.confirmIsg = e.target.checked; persistDraft(draft); });
  body.querySelector('#submitBtn')?.addEventListener('click', () => {
    if (!draft.confirmCorrect || !draft.confirmIsg) {
      toast('Bitte beide Bestätigungen ankreuzen.');
      return;
    }
    submitDraft(draft);
  });
}

export function submitDraft(draft) {
  // Promote draft to a submitted application (in-memory).
  // Schema-canonical fields per docs/DATAMODEL.md §4.1. The `id` and
  // `address` aliases mirror what loadData() injects so render code
  // doesn't have to distinguish freshly-submitted from loaded records.
  const applicationId = 'BE-2026-' + String(Math.floor(Math.random() * 900 + 100));
  const c = calcWizard({ nawClass: draft.nawClass, fte: draft.fte });
  // Pull atomic address fields from the matched Building when one exists;
  // greenfield drafts keep the free-text only.
  const match = state.buildings.find(b => b.address && draft.address && b.address.toLowerCase() === draft.address.toLowerCase());
  const ts = new Date().toISOString();
  const newApp = {
    applicationId, applicationType: draft.type, pipelineVariant: draft.pipelineVariant,
    status: 'submitted',
    submitterId: state.user.id, submitterVe: draft.ve, submitterDep: state.user.dep,
    buildingId: match ? match.buildingId : null,
    submittedAt: ts,
    street: match ? match.street : '', houseNumber: match ? match.houseNumber : '',
    postalCode: match ? match.postalCode : '', city: match ? match.city : '', country: 'CH',
    assetKey: draft.assetKey, egid: draft.egid,
    naw: { class: draft.nawClass, confidence: draft.nawConfidence, answers: draft.nawAnswers },
    fte: draft.fte,
    workstations: c ? c.workstations : null,
    hnf2: c ? c.hnf2 : null, gf: c ? c.gf : null,
    operatingCosts: c ? c.operatingCosts : null, furnitureBudget: c ? c.furnitureBudget : null,
    attachments: draft.attachments || [],
    history: [
      { ts, actor: state.user.name, eventType: 'ApplicationAdded',     action: 'Antrag erstellt' },
      { ts, actor: state.user.name, eventType: 'ApplicationSubmitted', action: 'Eingereicht' }
    ],
    _isNew: true,
    // Aliases mirroring loadData() normalisation
    id: applicationId,
    type: draft.type,
    address: draft.address,
  };
  state.applications.unshift(newApp);
  clearDraft();
  state.draft = null;
  toast(`Antrag ${applicationId} eingereicht. ${draft.pipelineVariant === 'bypass' ? 'Routet an BBL-PFM (BK-Bypass).' : 'Routet an GS.'}`, 'success');
  window.portal.navigate('#/inbox/' + applicationId);
}
