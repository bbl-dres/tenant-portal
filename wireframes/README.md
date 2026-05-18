# BBL Mieterportal — Vanilla HTML/JS Prototypes

> Working prototypes that visualise the typologies explored in
> [`docs/WIREFRAMES.md`](../docs/WIREFRAMES.md). **Demonstration only** —
> not production code. All data is mock; many actions are stubbed.

## Tech stack

- **Vanilla HTML / CSS / JavaScript** — no frameworks, no build step.
- Design tokens extracted from
  [`github.com/swiss/designsystem`](https://github.com/swiss/designsystem)
  v1.0.9 (MIT) into [`shared/tokens.css`](shared/tokens.css).
- Hash-based routing inside each typology SPA.
- Mock data as static JSON in [`shared/data/`](shared/data).
- Approach follows the sister prototype
  [`workspace-management`](https://github.com/bbl-dres/workspace-management).

## Running

Open [`index.html`](index.html) in a browser. No server required.

The typology chooser at `index.html` links to each prototype. Each
typology is a self-contained single-page app.

## First-cut typologies (v0.1 of the prototypes, 2026-05-18)

- **T3-Lite hero-CTA home** — `t3-lite/index.html`
  - Recommended pilot layout (see `docs/WIREFRAMES.md` §3.6).
  - Includes: public landing, role-routed authenticated home (submitter
    *and* reviewer queue via the role chooser), 5-step demand wizard
    with live NAW calculation, inbox, application detail, reviewer
    split-pane with per-field marks.

Planned next cuts:

- T1 spatial / map-first
- T2 role-switched portal (armasuisse style)
- T4 IWMS / KPI cockpit

## Folder layout

```
wireframes/
  README.md                 ← this file
  index.html                ← typology chooser
  shared/
    tokens.css              ← design-system tokens (#d8232a, Noto Sans, …)
    portal.css              ← shell, pipeline, cards, wizard chrome
    portal.js               ← state, router, shell + component renderers
    data/
      applications.json     ← mock applications (BE-2026-014, …)
      master-data.json      ← NAW classes, m²/FTE factors, PFM categories
      users.json            ← eIAM-stub users with roles
      buildings.json        ← federal buildings + BK/WE/Obj + EGID
    assets/
      bund-wordmark.svg     ← four-language federal wordmark
  t3-lite/
    index.html
    t3-lite.css
    t3-lite.js
```

## What works in the prototype

- 5-step wizard with NAW questionnaire → live HNF2/GF/UK calculation
- Belegungsfaktor 0.8 and NAW-class lookup from master data
- Three status-pipeline variants (Standard / BK / Greenfield)
- BK-1086 check on address (SAP-Schlüssel = `1086/2010/AA`)
- Role chooser (Andrea Muster has ILBO + GS-Prüfer/in)
- Inbox filter + sort + draft persistence (localStorage)
- Reviewer per-field marks → mandatory Begründung → overall decision
- Three responsive breakpoints
- Keyboard `?` overlay
- Skip-link, ARIA roles, focus styles

## What is stubbed

- eIAM redirect (button → "logged in" toast)
- File uploads (fake malware-scan delay)
- ePPM handover (fake "Bedarfsmeldung angelegt" after 2 s)
- Email notifications (toast only)
- LLM chat
- Master-data CRUD (read-only)

## Design system reference

Tokens resolved from `swiss/designsystem` v1.0.9 — primary red
`#d8232a` (`--color-primary-600`), Noto Sans, Swiss federal CD chrome.
The design system itself ships as Vue 3 SFC + Tailwind; we consume only
the tokens. See [`docs/REQUIREMENTS.md`](../docs/REQUIREMENTS.md) NFA-CD-001
for the consumption options discussion.
