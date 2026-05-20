# Wireframes — BBL Tenant/Service Portal (MP)

> **As of:** 2026-05-18 (v0.3.1) · **Companion to:** [REQUIREMENTS.md](REQUIREMENTS.md) v0.5.1 · **Status:** exploration / pre-decision
>
> Seven design typologies for the BBL Mieterportal pilot, sketched side-by-side
> so they can be compared. Each typology develops the same five baseline views
> (pre-login, authenticated home, accommodation-demand wizard, inbox/queue,
> application detail) plus 1–2 typology-specific views where the concept
> demands it. Chapter 8 explores wizard variants; Chapter 9 explores reviewer
> variants; Chapter 10 is a tradeoff matrix and a recommended hybrid.
>
> ASCII sketches throughout — informal, layout-only, not visual design. The
> federal [Swiss Federal Design System](https://github.com/swiss/designsystem)
> (Noto Sans, primary red `#d8232a` resolved from the live `--color-primary-600`
> token; **Vue 3 Single-File Components + Tailwind CSS utility layer +
> Storybook**, MIT, v1.0.9) provides the components referenced in each sketch
> (e.g. `Hero`, `Card`, `StepIndicator`, `Accordion`, `Table`, `BadgeFilter`,
> `Modal`, `Pagination`, `NotificationBanner`). The design system ships
> **no** wizard container, dashboard tile, inbox, map helper, or timeline
> component — all of those are assembled from primitives in this document.
> Final frontend-framework choice (Vue/Nuxt direct vs. another stack
> consuming the design system as CSS-only via `dist/main.css`) is OP-11.

## Table of contents

- [0. Common shell](#0-common-shell-used-in-every-typology) — header, footer, breadcrumbs, login, search, status badges
- [1. T1 — Digital-twin / spatial-first](#1-t1--digital-twin--spatial-first)
- [2. T2 — Role-switched portal (armasuisse style)](#2-t2--role-switched-portal-armasuisse-style)
- [3. T3 — Service catalogue (gov.uk pattern)](#3-t3--service-catalogue-govuk-pattern)
- [4. T4 — IWMS / KPI cockpit](#4-t4--iwms--kpi-cockpit)
- [5. T5 — Service-desk / ticketing](#5-t5--service-desk--ticketing)
- [6. T6 — Document vault / e-Akte](#6-t6--document-vault--e-akte)
- [7. T7 — AI copilot / chat-first](#7-t7--ai-copilot--chat-first)
- [8. Wizard alternatives + step-by-step canonical sketches](#8-wizard-alternatives) — stepper vs. accordion vs. single-page; Step 4 Grossantrag; Step 2 SEM / FDFA / Greenfield; Step 5 Prüfen
- [9. GS reviewer alternatives](#9-gs-reviewer-alternatives) — split-pane vs. inline marks vs. checklist; batch approval; auditor view
- [10. Tradeoff matrix + recommendation](#10-tradeoff-matrix--recommendation)
- [11. Cross-cutting views](#11-cross-cutting-views) — BK bypass, admin / master-data, content editor, downloads, delegated admin, mobile, empty/error/loading states, content-metadata pattern
- [Appendix A — View → requirements traceability](#appendix-a--view--requirements-traceability)

---

## 0. Common shell (used in every typology)

The federal Corporate Design (CD Bund) chrome is identical in every concept
below; the differences are inside the content area. Specified once here, then
omitted from later sketches for brevity.

### 0.1 Federal header + footer + breadcrumbs

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Skip to content ↓]   (visually hidden — keyboard / screen reader only)         │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 🇨🇭 Schweizerische Eidgenossenschaft · Confédération suisse                     │
│      Confederazione Svizzera · Confederaziun svizra                             │
│                            DE | FR | IT      🔔 (3)  [ ↗ Anmelden mit eIAM ]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [BBL Wappen]  Mieterportal                          [ 🔍 Suchen … ]         [☰] │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Home › Bedarf › Neuer Antrag    [Andrea Muster · Logistikbeauftragte UVEK ▾ ]   │
├═════════════════════════════════════════════════════════════════════════════════┤
│                                                                                 │
│                              ── page content ──                                 │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Folgen Sie uns:  [LinkedIn]  [X]                                                │
│ Bundesamt für Bauten und Logistik (BBL) · Fellerstrasse 21 · 3003 Bern          │
│ Impressum · Rechtliches · Datenschutz · Barrierefreiheit · Sprachen · Kontakt   │
│ © Schweizerische Eidgenossenschaft                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Skip-link** — first focusable element, jumps past the chrome to `<main>`
  (NFA-CD-004 / eCH-0059 mandatory landmark + skip nav).
- **Top meta-bar** — full four-language Swiss Confederation wordmark
  (CD Bund mandates all four regardless of UI locale), language switcher
  `DE | FR | IT` (EN only when a concrete need arises — see NFA-CD-003),
  notification bell with unread badge, eIAM login. Components: `TopBar`,
  `MetaNavigation`.
- **Brand bar** — BBL Wappen, product name "Mieterportal", global search,
  hamburger for the role-aware main menu (`Logo`, `SearchMain`, `Burger`).
- **Breadcrumb bar** — `Breadcrumb` on the left; **user pill** on the
  right with name **and current role** (auto-shows "Rolle wechseln ▾" when
  the user has more than one role — see §2.1), language fallback link,
  sign-out. Hidden on the public landing.
- **Footer** — federal `FooterInformation` (postal address, social, legal
  links) + `FooterNavigation`. Required pages: Impressum, Rechtliches,
  Datenschutz, Barrierefreiheit, Sprachen, Kontakt.
- **Cookie / Datenschutz banner** — non-blocking bar on first visit per
  DSG. Two buttons (`Nur notwendige` / `Alle akzeptieren`), link to
  Datenschutz. Drawn in §11.1 (states sketches).
- **Reqs:** NFA-CD-001 (CD Bund), NFA-CD-002 (Web Guidelines vocab),
  NFA-CD-003 (DE/FR/IT), NFA-CD-004 (WCAG 2.1 AA / eCH-0059),
  NFA-IAM-001 (eIAM login), NFA-COMP-002 (DSG / cookie banner).

### 0.2 eIAM login & role context

```
┌─────────────────────── eIAM ───────────────────────┐
│                                                    │
│  Anmeldung über eIAM                               │
│                                                    │
│  Sie werden weitergeleitet zu                      │
│  login.eiam.admin.ch                               │
│                                                    │
│  [ Mit eIAM anmelden  ↗ ]                          │
│                                                    │
│  Kein eIAM-Konto? → Hilfe / IT-Support             │
│                                                    │
│  Hinweis: Ab Dezember 2026 wird der Zugang für     │
│  externe Mietende (z. B. EFV) schrittweise auf     │
│  AGOV/E-ID umgestellt — siehe Roadmap OP-3.        │
└────────────────────────────────────────────────────┘
```

- Redirect-then-return pattern. On success: token, role(s), VE/department.
- After return, the portal reads role(s) and (in T2) presents a role chooser
  if more than one applies. In all other typologies, the highest-privilege
  role wins by default with a "switch role" pill in the user menu.
- **AGOV signpost** kept in the screen so the future migration path is
  surfaced even though pilot scope is eIAM only.
- **Reqs:** NFA-IAM-001, NFA-IAM-002 (delegated admin), NFA-IAM-003 (RBAC);
  AGOV future state per OP-3.

### 0.3 Notification & status conventions (used in every typology)

```
StatusPipeline — Standardpfad (used in inbox rows and detail pages):

[ Entwurf ]→[ Eingereicht ]→[ in GS-Prüfung ]→[ genehmigt ]→[ in ePPM ]→[ abgeschlossen ]
                              │
                              ├──→ [ Rückfrage / Auflage ] ──→ (zurück an Antragsteller,
                              │                                  Re-Submit → Eingereicht)
                              │
                              └──→ [ abgelehnt ] ─────────────→ [ archiviert ]

StatusPipeline — BK-Bypass (FUNC-FG-005, wenn Antragsteller = Bundeskanzlei):

[ Entwurf ]→[ Eingereicht ]→[ in PFM-Prüfung ]→[ genehmigt ]→[ in ePPM ]→[ abgeschlossen ]
                              │
                              └──→ [ Rückfrage / Auflage ] / [ abgelehnt ]
                              (kein GS-Schritt, weil BK keine Generalsekretariate kennt)

StatusPipeline — Greenfield (FUNC-AU-013, wenn keine WE existiert):

[ Entwurf ]→[ Eingereicht ]→[ in GS-Prüfung ]→[ genehmigt ]
                                                │
                                                ├──→ [ WE-Anlage durch BBL ] ──→ [ in ePPM ]
                                                │                                  → [ abgeschlossen ]
                                                └──→ [ abgelehnt / archiviert ]


Glyph conventions — three distinct semantic families (do not mix):

  (a) Lifecycle status (drives the pipeline + status badges in lists)
      ◯ Entwurf     ◐ in Bearbeitung     ● eingereicht / aktiv
      ✓ genehmigt   ✕ abgelehnt           ⛌ archiviert
      ↻ Rückfrage / Auflage offen        ⚠ Fehler / blockiert

  (b) Data-quality badge for auto-derived fields (form / inventory)
      🟢 verifiziert       🟡 veraltet      🔴 manuell überschrieben
      ⚪ ungeprüft         ◼ Greenfield (noch nicht vergeben)
      🤖 vorgeschlagen     (LLM-Inferenz aus Nutzer-Prosa; bitte prüfen —
                          unterscheidet sich von 🟢, weil keine
                          Bundes-Stammdatenquelle hinterlegt ist)

  (c) Validation state for form fields (wizard live validation)
      ✓ ok            ! Hinweis             ⚠ Pflichtfeld fehlt
      🔒 schreibgeschützt (Rolle / BK-Pfad)

Status colours (CD Bund semantic tokens — design-system aliases):

  Erfolg     Warnung    Fehler     Info      Neutral
  --success  --warning  --danger   --info    --neutral
  #16A34A    #EAB308    #DC2626    #0EA5E9   #6B7280
```

- The pipeline is rendered as a `StepIndicator` in the row's right column or
  as a horizontal stepper at the top of the detail page. The applicant sees
  the variant pipeline (Standard / BK / Greenfield) appropriate to their
  request — never a generic one.
- A `NotificationBanner` carries top-of-page system messages (planned
  outages, e-mail-delivery failures, new BBL announcement).
- A `ToastMessage` carries inline confirmations (draft saved, file uploaded,
  status changed).
- The in-portal **notification bell** in the meta-bar (§0.1) opens a panel
  with the same items that trigger e-mail per FUNC-FG-004 — single source.
- **Reqs:** FUNC-INB-002, FUNC-FG-004 (notifications), FUNC-FG-005 (BK
  bypass), FUNC-AU-013 (greenfield), NFA-SEC-005 (audit trail).

### 0.4 SAP RE-FX object identifier convention

Every federal property is identified in SAP by a **three-part composite
key**: `Buchungskreis / Wirtschaftseinheit / Objektnummer`. The portal
must display, log, and integrate this composite — not a single opaque
number.

```
SAP RE-FX Objekt-Schlüssel:    1086 / 2010 / AA
                                │      │      │
                                │      │      └─ Objektnummer (Obj)
                                │      │         Sub-Objekt innerhalb der WE
                                │      │         (Etage, Mieteinheit, Mietobjekt)
                                │      │         Meist 2-stellig alphanumerisch.
                                │      │         Kann leer sein für Gesamtgebäude.
                                │      │
                                │      └─ Wirtschaftseinheit (WE)
                                │         Liegenschaft / Gebäude innerhalb des BK.
                                │         Typisch 4-stellig.
                                │
                                └─ Buchungskreis (BK)
                                   Buchhalterische Organisation, je Bundes-
                                   organisation eindeutig.
                                   BBL = 1086.  armasuisse = z. B. 1100.
                                   BK 1086 in jedem Mieterportal-Antrag
                                   bedeutet: Objekt im BBL-Portfolio.

Anzeige-Konventionen:
  • Kompakt (in Listen, Tags):           1086/2010/AA
  • Verbose (Detailansicht, Formulare):  BK 1086 · WE 2010 · Obj AA
  • Im Audit-Log immer voll mit Labels:  BK=1086, WE=2010, OBJ=AA

Konsequenzen für den Workflow:
  • Auto-Erkennung bei Adresseingabe:  Adresse → GWR (EGID) →
                                       SAP RE-FX → BK/WE/Obj
  • Wenn BK ≠ 1086 erkannt wird:       Antrag gehört nicht zu BBL.
                                       Nutzer wird auf die zuständige
                                       Organisation hingewiesen (z. B.
                                       armasuisse-Immo-Portal bei VBS-
                                       Objekten). Antrag wird in MP
                                       nicht angelegt.
  • Greenfield (§8.9):                 BK ist bekannt (1086), WE/Obj
                                       werden später durch BBL-IM
                                       vergeben — solange als ◼ Greenfield.
```

- **EGID** (federal Gebäudeidentifikator aus dem GWR-Register, exakt 9-
  stellig) und **SAP RE-FX-Schlüssel** sind unabhängig. EGID kommt von
  swisstopo, BK/WE/Obj aus SAP RE-FX. Beide werden im Antrag gepflegt
  (FUNC-AU-012).
- Die **WE allein** ist im BBL-Portfolio durch BK 1086 implizit eindeutig,
  aber Drittsysteme (audit, ePPM, GEVER) sollten immer den vollen Schlüssel
  führen.
- **Reqs:** FUNC-AU-012 (Adresse → SAP-Schlüssel), FUNC-PFM-001 / -002
  (ePPM-Übergabe nutzt den vollen Schlüssel), NFA-DATA-004 (Korrelations-
  ID + vollständiger Objekt-Schlüssel im Audit-Log).

---

## 1. T1 — Digital-twin / spatial-first

> **Core metaphor:** a map of Switzerland is the home. Every action starts
> from a *where* — pick a building, drill into a floor, then act.
> **Anchors:** Senaatti Senate App (FI), Spacewell Cobundu (BE), the existing
> [property-inventory](../property-inventory/prototype-main/) prototype.
> **Best fit:** exploring portfolio, occupancy review (FLM), repair on an
> existing building. **Worst fit:** filing demand for *future* space that has
> no building yet (the FDFA "new embassy in Lima" case, FUNC-AU-013).

### 1.1 Pre-login landing (T1)

```
┌─ Hero ──────────────────────────────────────────────────────────────────────────┐
│   Das Mieterportal des Bundes                                                   │
│   Anliegen rund um Ihre Bundesimmobilie an einem Ort                            │
│   [ Mit eIAM anmelden ↗ ]   [ Öffentliche Infos ]                               │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Karte (öffentlich) ────────────────────────────────────────────────────────────┐
│                                                                                 │
│                   🇨🇭   ●   ●●   ●                                              │
│            ●          ●●●         ●●                                            │
│              ●  ●●●●     ●●●                                                    │
│   MapLibre GL + swisstopo (map.geo.admin.ch) — Bundesimmobilien CH              │
│   (öffentlich sichtbar; nur ISG-freigegebene Kategorien — siehe Hinweis ↓)      │
│  [ Hintergrund ▾ ]                              [ Layer ▾ ] [ + ] [ − ] [ ⌂ ]   │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Was Sie hier tun können ──┬─────────────────────────────┬──────────────────────┐
│ Bedarf anmelden            │ Status nachverfolgen        │ Pläne herunterladen  │
└────────────────────────────┴─────────────────────────────┴──────────────────────┘
```

- Hero with two CTAs. Below, an interactive **MapLibre GL** client on
  **swisstopo tiles via map.geo.admin.ch** (W010 §2.3 — federal geodata
  source, not OSM / Mapbox) already on screen (no login required) showing
  federal buildings as markers — establishes the metaphor immediately.
- **ISG / sensitivity filter:** the public marker layer renders only
  PFM-categories pre-cleared as "publicly identifiable" (typical: office
  Hauptverwaltung, BBL service points). SEM-Empfangszentren, FDFA
  representations, security-relevant tenants (Nachrichtendienst,
  fedpol-Objekte) are **never** in the public layer and only appear after
  authentication with appropriate role — gates on OP-1 (ISG classification).
- Three task tiles under the map: hand off to demand wizard, status, downloads.
- **No metadata triplet on action tiles** (v0.5 scope, FUNC-LP-009): action
  surfaces are explicitly out of FUNC-LP-009 / NFA-UX-004 — Quelle ·
  Verantwortlich · Stand applies only to *published informational content*
  (downloads, FAQ, news banners), see §11.8.
- **Reqs:** FUNC-LP-001 (SPOC), FUNC-LP-002 (self-explanatory), FUNC-LP-008
  (responsive — three breakpoints per v0.5), NFA-COMP-002 (DSG), OP-1 (ISG).

### 1.2 Authenticated home (T1) — "your buildings on a map"

```
┌─────────────────────────────────────────────┬───────────────────────────────────┐
│                                             │  Ihre offenen Anliegen   ( 3 )    │
│                                             │  ─────────────────────────────    │
│             ●                ●●             │  ● Bedarf BE-2026-014  In GS …    │
│        ●                                    │  ● Antrag SEM-2026-002 Eingerei…  │
│                ●●●     ●●                   │  ● Reparatur Z-7-204   in Arbeit  │
│                                             │  ─────────────────────────────    │
│   Karte: Gebäude Ihres Departements (UVEK)  │                                   │
│   Filter: [Alle Status ▾] [Alle Typen ▾]    │  Schnellaktionen                  │
│                                             │  [ + Neuer Bedarf ]               │
│                                             │  [ + Reparatur melden ]           │
│   [ Hintergrund ▾ ] [ + ][ − ][ ⌂ ]         │  [ Plan herunterladen ]           │
└─────────────────────────────────────────────┴───────────────────────────────────┘
┌─ Letzte Aktivität ──────────────────────────────────────────────────────────────┐
│ 17.05.  BBL-PFM hat Antrag BE-2026-014 in Prüfung übergeben                     │
│ 14.05.  Sie haben einen Entwurf für SEM-Empfangszentrum begonnen                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Map left (~⅔), pinned applications and quick actions right (~⅓).
- Markers are colour-coded by status (pipeline colours from §0.3); clicking
  one slides up a detail card with the building + open items pinned to it.
- "Last activity" feed at bottom for catch-up after time away.
- **Reqs:** FUNC-LP-003 (role-based nav), FUNC-INB-001 (personal inbox),
  FUNC-LP-005 (dashboards), FUNC-INB-002 (status overview).

### 1.3 Building / floor / room drill-in (T1-specific)

```
┌─────────────────────────────────────────────┬───────────────────────────────────┐
│                                             │  Bundeshaus West, 3003 Bern       │
│         ┌─ Floor plan SVG ─┐                │  1086/2010/AA  ·  EGID 100123456   │
│         │                  │                │  ──────────────────────────────    │
│         │   3. OG          │                │  Übersicht | Räume | Flächen |     │
│         │   ▓▓▓▓▓▓ ▓▓▓▓▓   │                │  Anliegen | Dokumente | Kontakt    │
│         │   ▓▓▓▓▓▓ ▓▓▓▓▓   │                │  ──────────────────────────────    │
│         │   ▓▓▓ ▓▓ ▓ ▓▓▓   │                │  HNF2:    420 m²  (SIA 416)        │
│         │                  │                │  GF:      890 m²                   │
│         │ [‹ EG ] [1.OG] [2.OG] [3.OG] [‹›] │  Mieter:  UVEK  (3.OG)             │
│         └──────────────────┘                │           BAFU  (1.OG)             │
│                                             │  Status:  in Betrieb 🟢            │
│                                             │  [ + Bedarf für dieses Gebäude ]  │
└─────────────────────────────────────────────┴───────────────────────────────────┘
```

- Floor plan SVG on the left with floor selector; tabbed property detail on the
  right (Übersicht / Räume / Flächen / Anliegen / Dokumente / Kontakt — the
  7-tab pattern from property-inventory).
- The "+ Bedarf für dieses Gebäude" button pre-fills the wizard with the
  building, address, SAP-Objekt-Schlüssel (BK/WE/Obj — see §0.4) and EGID.
- **Reqs:** FUNC-AU-012 (auto-derive SAP-Schlüssel from address), FUNC-LP-007
  (download plans), FUNC-AU-013 (allow new sites — note: this path only
  works for *existing* buildings; the wizard must remain accessible without
  a starting building).

### 1.4 Demand wizard, T1 flavour (spatial entry to step 1)

```
StepIndicator:   [1•Basis] [2 Fläche] [3 Anhänge] [4 Major] [5 Prüfen]
─────────────────────────────────────────────────────────────────────────────────
Schritt 1 von 5 — Basisangaben

┌─ Linke Spalte: Karte ──────────────┬─ Rechte Spalte: Formular ──────────────────┐
│                                    │  Antragstyp                                │
│   ┌─ Adresssuche ─────────┐        │   ( ) Grossantrag                          │
│   │ 🔍 Bundeshaus West…  │        │   (●) Kleinantrag                          │
│   └──────────────────────┘        │   ( ) Mobiliar                             │
│                                    │                                            │
│      📍 Marker hier                 │  Verwaltungseinheit (VE)                   │
│                                    │  [ UVEK / BAFU            ▾ ]              │
│                                    │  Zuständige BBL-Kontakte                   │
│   Klick auf Gebäude erkennt:        │   • L. Hofmann (PFM)                        │
│   • SAP: 1086/2010/AA               │   • N. Frey (IM)                           │
│   • EGID 100123456                  │                                            │
│   • BK 1086 = BBL-Portfolio ✓       │                                            │
└────────────────────────────────────┴────────────────────────────────────────────┘
[ Entwurf speichern ]                   [ Zurück ]  [ Weiter → Fläche / NAW ]
```

- Spatial-first: pick the building on the map, the right column fills itself.
  SAP-Schlüssel (BK/WE/Obj) und EGID werden via swisstopo/GWR → SAP RE-FX
  aufgelöst — `🟢 verifiziert` badge.
- **BK-Check:** wenn der Buchungskreis nicht 1086 ist, hat BBL kein Mandat —
  der Antrag wird abgelehnt und der Nutzer wird auf die zuständige
  Organisation (z. B. armasuisse) verwiesen. Siehe §0.4.
- The same wizard runs without a starting building (for greenfield/FUNC-AU-013):
  collapse the map column and show only the form.
- **Reqs:** FUNC-AU-001 (VE → contacts), FUNC-AU-012 (address →
  SAP-Schlüssel/EGID), FUNC-AU-021 (type chooser), FUNC-LP-004 (wizard).

### 1.5 Inbox (T1) — pins on a map

```
┌─ Karte: alle Ihre Anträge ──────────────────────┬─ Liste ──────────────────────┐
│                                                  │ Status [Alle ▾] Typ [Alle ▾] │
│            🟡          🟢                        │ ────────────────────────────│
│       🟡                                         │ BE-2026-014  Bundeshaus W…  │
│              🔴                                  │   Kleinantrag · in GS-Prüf. │
│                       🟢                         │                              │
│                                                  │ SEM-2026-002 Empfang Boudry │
│  Klick auf Pin → Detail rechts                   │   Grossantrag · Eingereicht │
│                                                  │                              │
│                                                  │ Z-7-204      Reparatur      │
│  [ Hintergrund ▾ ] [ + ][ − ]                    │   Sanitär · in Arbeit       │
└──────────────────────────────────────────────────┴──────────────────────────────┘
```

- Map and list are linked: clicking a pin highlights the row and vice versa.
- Filters: status, type, time range, role (mine / where I am reviewer).
- **Reqs:** FUNC-INB-001, FUNC-INB-002, FUNC-LP-003.

### 1.6 Application detail (T1)

```
┌─ Status-Pipeline ───────────────────────────────────────────────────────────────┐
│ [Entwurf]→[Eingereicht ●]→[in GS-Prüfung ◐]→[genehmigt]→[in ePPM]→[abgeschloss.]│
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Linke Spalte: Karte + Plan ────────┬─ Rechte Spalte: Antragsdaten ─────────────┐
│                                     │  Antrag BE-2026-014                       │
│   📍 Bundeshaus W, Bern             │  Antragsteller   A. Muster (UVEK)         │
│                                     │  Eingereicht     12.05.2026                │
│   Etage 3.OG (Plan-Thumbnail)       │  Status          in GS-Prüfung 🟡          │
│   [ Plan öffnen ]                   │                                            │
│                                     │  Tabs: Daten | Anhänge | Historie | SAP    │
│                                     │  ─────────────────────────────────────    │
│                                     │  HNF2  120 m²   GF  240 m²                 │
│                                     │  UK-Kosten (vorl.) CHF 720 000              │
│                                     │  Anhänge: WiBe.pdf, Rechtsgrundlage.pdf    │
└─────────────────────────────────────┴────────────────────────────────────────────┘
```

- Spatial context kept on the left; tabbed data on the right.
- **Reqs:** FUNC-INB-002, FUNC-AU-022 (visible application ID), NFA-SEC-005
  (audit/history tab).

---

## 2. T2 — Role-switched portal (armasuisse style)

> **Core metaphor:** the user picks (or is auto-routed to) a *role-space*.
> Each role has its own home, nav, and vocabulary. **Anchor:** armasuisse
> Immo-Portal VBS (Nutzer / Mieter / Eigentümervertreter / Betreiber / IKT /
> Departementsebene). **Best fit:** strong RBAC, multi-role staff, internal
> federal idiom. **Worst fit:** a user whose role mix doesn't slot cleanly
> (e.g. BBL Campus member who also files internal demand).

### 2.1 Pre-login + post-login role chooser

```
┌─ nach eIAM-Login ───────────────────────────────────────────────────────────────┐
│  Willkommen, Andrea Muster (UVEK)                                               │
│  Sie haben Zugriff in den folgenden Rollen — bitte wählen:                      │
│                                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                       │
│  │  Mieter / ILBO          │  │  GS-Prüfer/in           │                       │
│  │  Anträge stellen,       │  │  Eingänge der VE        │                       │
│  │  Status, Dokumente      │  │  prüfen, freigeben      │                       │
│  │  [ Wählen → ]           │  │  [ Wählen → ]           │                       │
│  └─────────────────────────┘  └─────────────────────────┘                       │
│                                                                                 │
│  ☐ Diese Rolle als Standard merken                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Only shown when the user has 2+ roles. Otherwise the portal jumps straight
  into the role's home.
- "Switch role" pill stays in the user menu (`MetaNavigation`).
- **Reqs:** NFA-IAM-003 (RBAC), FUNC-LP-003 (role-based nav).

### 2.2 Authenticated home (T2) — Mieter / ILBO role

```
┌─ Mieter / ILBO  ─────────────────────────────────────────────  [ Rolle wechseln ▾ ]
├─────────────────────────────────────────────────────────────────────────────────┤
│ Hauptbereiche                                                                   │
│ ┌─ Bedarf anmelden ───────┬─ Status & Inbox ─────────┬─ Dokumente & Pläne ────┐ │
│ │  Unterbringung beantra- │  3 offene Anträge        │  Pläne, Schulungen,    │ │
│ │  gen — Bedarf erfassen  │  letzte: BE-2026-014     │  Merkblätter           │ │
│ │  und einreichen         │                          │                        │ │
│ │  [ Antrag starten → ]   │  [ Inbox öffnen → ]     │  [ Browsen → ]         │ │
│ └─────────────────────────┴──────────────────────────┴────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Selbstbedienung                                                                 │
│ ┌─ Adresse / Liegen-      ┬─ Reparatur melden      ┬─ Schulung Mieterportal ┐  │
│ │  schaft suchen          │  (REQ-FA-005)          │                        │  │
│ └────────────────────────-┴────────────────────────┴────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Nachrichten / Hinweise (Last-Updated: 17.05.2026)                               │
│ • Wartungsfenster ePPM 25.05. 18:00–22:00 — Einreichungen werden gepuffert.     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Three large `Card` tiles for the primary tasks; smaller secondary tiles
  below; a `NotificationBanner`-style news rail at the bottom.
- Vocabulary is strictly "Mieter / ILBO" oriented — different from the next
  view, which is in reviewer language.
- **Reqs:** FUNC-LP-001, FUNC-LP-003, FUNC-LP-005, FUNC-LP-009 (source +
  last-updated on every content item).

### 2.3 Authenticated home (T2) — GS-Prüfer/in role (same user, different home)

```
┌─ GS-Prüfer/in (UVEK GS) ─────────────────────────────────────  [ Rolle wechseln ▾ ]
├─────────────────────────────────────────────────────────────────────────────────┤
│ Ihre Pendenzen                                                  ( 12 )          │
│ ─────────────────────────────────────────────────────────────────────────────── │
│ □ BE-2026-014  Muster (UVEK)         Bundeshaus W      eingereicht 12.05.       │
│ □ BE-2026-013  Wirz   (BAFU)         Ittigen          eingereicht 11.05.       │
│ □ BE-2026-012  Keller (UVEK)         Bern Sulgenrain  ↻ Rückfrage 09.05.       │
│ ─────────────────────────────────────────────────────────────────────────────── │
│ Filter: [Alle Status ▾] [Alle Antragsteller ▾]   [ Bulk-Aktion ▾ ]              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ▸ Statistiken Ihres GS (eingeklappt — Klick zum Aufklappen)         [ ▾ ]       │
│   Eingang 30 d: 8 · Ø Bearbeitung 4.2 d · Offene Auflagen 2 · Schnitt 96 %      │
└─────────────────────────────────────────────────────────────────────────────────┘

Aufgeklappt (auf Klick, persistiert per Nutzer):

│ Statistiken Ihres GS                                                [ ▴ ]       │
│ ┌─ Eingang 30 d ──┬─ Bearbeitungs-Ø ─┬─ Offene Auflagen ─┬─ Schnitt zu BBL ─┐   │
│ │      8          │       4.2 d      │        2          │       96 %        │   │
│ │  ↑ +2 zu Vorm.   │  ↓ −0.3 d zur 90.│   ↓ −1            │   ↑ +1 pp         │   │
│ │  [ Trend ↗ ]     │   Perzentile      │   [ Liste → ]     │   [ Vergleich → ] │   │
│ └─────────────────┴──────────────────┴───────────────────┴───────────────────┘   │
```

- **Default state: KPI strip collapsed to a single information line.** The
  queue is the screen's primary purpose; KPIs are diagnostic. Dashboard
  fatigue (well-documented anti-pattern — Stephen Few, gov.uk performance
  team) is avoided by making the strip *opt-in*, not always-on.
- **One-line collapsed summary** carries the four numbers but no charts —
  the reviewer can decide every morning whether to expand. Per-user
  persistence (localStorage keyed by eIAM subject) keeps the preference.
- **Expanded state** adds delta indicators (↑/↓), comparison links, and
  drill-throughs to lists. This is the §11.0 "diagnostic deep-dive" path.
- **Primary metric stays the queue depth** (`Pendenzen (12)`) at the top —
  that's the one number the reviewer needs to act on first thing in the
  morning. KPIs are *supporting*, not equal-weight.
- Reviewer's home is a queue (not a tile menu).
- Bulk actions cover "approve all without conditions", "reassign", "request
  more info". Click into a row → §2.5 detail/review.
- **Reqs:** FUNC-INB-001, FUNC-FG-001 to FUNC-FG-004, FUNC-REP-001 (small
  aggregated counters — visible on demand only).

### 2.4 Demand wizard, T2 flavour (no map, role-vocab labels)

```
StepIndicator:   [1•Basis] [2 Fläche] [3 Anhänge] [4 Major] [5 Prüfen]
─────────────────────────────────────────────────────────────────────────────────
Schritt 1 von 5 — Basisangaben

┌─────────────────────────────────────────────────────────────────────────────────┐
│  Antragstyp                                                                     │
│  ( ) Grossantrag    (●) Kleinantrag    ( ) Mobiliar                              │
│                                                                                 │
│  Verwaltungseinheit (VE)         [ UVEK / BAFU                              ▾ ] │
│  Departement                       UVEK                              (auto)     │
│  Zuständige BBL-Kontakte           L. Hofmann, N. Frey                (auto)     │
│                                                                                 │
│  Adresse                         [ Eichweg 22, 3003 Bern                      ] │
│  SAP-Objekt-Schlüssel              BK 1086 · WE 2010 · Obj AA         🟢 (auto) │
│   davon Buchungskreis (BK)         1086 — BBL-Portfolio  ✓            🔒        │
│   davon Wirtschaftseinheit (WE)    2010                               🟢 (auto) │
│   davon Objektnummer (Obj)         AA                                 🟢 (auto) │
│  EGID (GWR)                        100123456                          🟢 (auto) │
│                                                                                 │
│  (i) Felder mit (auto) werden aus Bundes-Stammdaten ermittelt. Der BK wird auto-│
│      matisch geprüft: ist er ≠ 1086, gehört das Objekt nicht zu BBL — der       │
│      Antrag wird abgewiesen mit Hinweis auf die zuständige Organisation (§0.4). │
└─────────────────────────────────────────────────────────────────────────────────┘
[ Entwurf speichern ]                   [ Zurück ]  [ Weiter → Fläche / NAW ]
```

- Same logical step 1 as T1 but no map column — the form is the whole page.
- Field-quality badges (`🟢 verifiziert`) reused from property-inventory.
- Three-part SAP-Schlüssel is shown both compact (header line) and broken
  out (sub-lines). The compact form goes into the application ID,
  notifications, and the ePPM-Übergabe; the breakout helps the applicant
  understand what gets carried over.
- **Reqs:** FUNC-AU-001, FUNC-AU-012, FUNC-AU-021, NFA-IAM-003, §0.4.

### 2.5 GS reviewer detail/review (T2) — field-by-field marks

```
┌─ BE-2026-014 — A. Muster (UVEK) — Bundeshaus W ─────────────────────────────────┐
│ Status: in GS-Prüfung                                                  [ ⋯ ▾ ]  │
├──────────────────────────────────────────────┬──────────────────────────────────┤
│  Formular                                    │  Prüfung                          │
│                                              │                                  │
│  Antragstyp:    Kleinantrag                  │  [✓ OK] [ NoK ] [ OK mit Komm. ] │
│  VE:            UVEK / BAFU                  │  [✓ OK] [ NoK ] [ OK mit Komm. ] │
│  Adresse:       Eichweg 22, Bern             │  [✓ OK] [ NoK ] [ OK mit Komm. ] │
│  SAP / EGID:    1086/2010/AA · 100123456     │  [✓ OK] [ NoK ] [ OK mit Komm. ] │
│  HNF2:          120 m²                       │  [   ] [✓ NoK ] [ OK mit Komm. ] │
│                                              │   ↳ "Bitte FTE-Annahme prüfen."  │
│  Anhänge:       WiBe.pdf, Recht.pdf          │  [✓ OK]                          │
├──────────────────────────────────────────────┴──────────────────────────────────┤
│ Gesamtentscheid:   ( ) Genehmigen   (●) Mit Auflagen ablehnen   ( ) Genehmigen  │
│ Begründung*:       [ FTE-Berechnung wirkt zu hoch, bitte mit HR abgleichen.   ] │
│                    [ Auflagen-Liste …                                          ] │
│                                                                                 │
│ [ Entscheid speichern ] [ An Antragsteller zurück ]                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Two-column split: form left, mark-column right. Per-field OK / NoK / OK
  mit Kommentar + an overall decision at the bottom with a mandatory
  Begründung.
- Alternatives for this same view explored in [Chapter 9](#9-gs-reviewer-alternatives).
- **Reqs:** FUNC-FG-001 to FUNC-FG-003, NFA-COMP-003 (decision traceability),
  NFA-SEC-005 (audit trail).

---

## 3. T3 — Service catalogue (gov.uk pattern)

> **Core metaphor:** the home page is a card grid of services. Each card
> deep-links to a wizard or content. **Anchors:** Mein BImA, GSA OASIS,
> gov.uk start pages. **Best fit:** occasional users (FUNC-LP-002 — "without
> training"), federal-idiom recognisability. **Worst fit:** returning
> reviewers — their queue is one click too deep.

### 3.1 Pre-login landing (T3)

```
┌─ Hero ──────────────────────────────────────────────────────────────────────────┐
│   Mieterportal des BBL                                                          │
│   Alle Dienste rund um Ihre Bundesimmobilien                                    │
│   [ Mit eIAM anmelden ↗ ]                                                       │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Dienste (öffentlich sichtbar) ─────────────────────────────────────────────────┐
│                                                                                 │
│  ┌─ Unterbringung ────────┬─ Reparatur / Service ─┬─ Pläne & Dokumente ──────┐ │
│  │ Bedarf anmelden        │ Schaden melden        │ Grundrisse, Merkblätter,  │ │
│  │ (Büro, Wohnen, Vertret.)│ (verfügbar nach Login)│ Schulungen herunterladen │ │
│  │ Login erforderlich     │                       │ Login erforderlich        │ │
│  └────────────────────────┴───────────────────────┴───────────────────────────┘ │
│  ┌─ Status nachverfolgen ─┬─ Häufige Fragen ──────┬─ Kontakt / Hilfe ────────┐ │
│  │ Anträge & Bearbeitungs-│ Wissensbasis          │ Telefonnummern,           │ │
│  │ stand                  │                       │ Ansprechpersonen          │ │
│  └────────────────────────┴───────────────────────┴───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Six service tiles, grouped 3×2. Each is a `Card` with title, one-line
  description, "Login erforderlich" pill if applicable.
- No map, no chart, no chat — content-first.
- **Reqs:** FUNC-LP-001 (SPOC), FUNC-LP-002 (clarity), FUNC-LP-009 (source +
  last-updated on each card).

### 3.2 Authenticated home (T3) — same catalogue, role-filtered + your work band

```
┌─ Ihre offenen Anliegen ─────────────────────────────────────────────────────────┐
│ 3 Anträge in Bearbeitung    [ Inbox öffnen → ]                                  │
│  ● BE-2026-014 in GS-Prüfung    ● SEM-2026-002 eingereicht    ● Z-7-204 Repar.  │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Dienste (Ihre Rolle: Mieter / ILBO) ───────────────────────────────────────────┐
│ ┌─ Unterbringung ────────┬─ Reparatur / Service ─┬─ Pläne & Dokumente ──────┐  │
│ │ Bedarf anmelden        │ Schaden melden        │ Grundrisse herunterladen │  │
│ └────────────────────────┴───────────────────────┴──────────────────────────┘  │
│ ┌─ Status & Inbox ───────┬─ Häufige Fragen ──────┬─ Kontakt ────────────────┐  │
│ │ Meine Anträge          │ Wissensbasis          │ Ansprechpersonen          │  │
│ └────────────────────────┴───────────────────────┴───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Aktuelles ─────────────────────────────────────────────────────────────────────┐
│ 17.05.  Neue Vorlage für SEM-Anträge verfügbar                                   │
│ 13.05.  Schulung „Mieterportal kompakt" — Anmeldung offen                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- "Your open items" band only shows if the user has open work; otherwise the
  catalogue is the whole page.
- Tiles hide/reorder per role (FUNC-LP-003): GS reviewer sees a "Eingänge
  prüfen" tile at the top; BBL Campus admin sees "Inhalt verwalten".
- **Reqs:** FUNC-LP-001 to FUNC-LP-003, FUNC-LP-005, FUNC-INB-001 (the band).

### 3.3 Demand wizard, T3 flavour

Identical to the [§2.4 stepper](#24-demand-wizard-t2-flavour-no-map-role-vocab-labels) —
the wizard doesn't change between T2 and T3 because the catalogue gets out
of the way once the user starts a service. Linked-to from the
"Unterbringung → Bedarf anmelden" tile.

### 3.4 Inbox (T3)

```
┌─ Meine Anträge ─────────────────────────────────────────────────────────────────┐
│ Tabs:  [ Offen (3) ]  [ Abgeschlossen (12) ]  [ Entwürfe (1) ]                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Filter: [Status ▾] [Typ ▾] [Zeitraum ▾] [Suche … 🔍]                            │
├──────────────┬─────────────────────────┬──────────────────┬───────────────────────┤
│ Antrag       │ Objekt                   │ Eingereicht     │ Status                │
├──────────────┼─────────────────────────┼──────────────────┼───────────────────────┤
│ BE-2026-014  │ Bundeshaus W, Bern       │ 12.05.2026       │ ◐ in GS-Prüfung       │
│ SEM-2026-002 │ Empfangszentrum Boudry   │ 11.05.2026       │ ● eingereicht         │
│ Z-7-204      │ Sulgenrain 19, Bern      │ 09.05.2026       │ ◐ in Arbeit           │
└──────────────┴─────────────────────────┴──────────────────┴───────────────────────┘
[ Export CSV ] [ Spalten anpassen ]                                  Seite 1 / 1
```

- Plain federal `Table` + `BadgeFilter` + `Pagination`. Tabs for top-level
  state.
- **Reqs:** FUNC-INB-001, FUNC-INB-002, FUNC-AU-022 (visible application ID).

### 3.5 Application detail (T3)

Same content as [§1.6](#16-application-detail-t1), but **single-column** (no map).
Pipeline at top, tabbed sections (Daten / Anhänge / Historie / SAP) below.

### 3.6 T3-Lite — hero-CTA home for pilot-scale services

> **Why this exists:** T3's six-tile catalogue grid is right for portals
> with ten-plus services. The BBL pilot has two services in scope (Bedarf
> Unterbringung; Reparatur as roadmap). Six tiles for two real services
> looks empty and pushes the *one thing the user came to do* below a
> visual gallery. gov.uk research and Nielsen Norman field studies
> consistently show that for low-service-count entry pages, leading with
> the service produces faster task starts than the catalogue pattern.
> **Best fit:** the pilot (FUNC-LP-001/-002). **Outgrows itself:** as
> the portal accumulates services, evolve back to T3 catalogue.

#### 3.6.1 Pre-login landing (T3-Lite)

```
┌─ Hero ──────────────────────────────────────────────────────────────────────────┐
│   Mieterportal des BBL                                                          │
│   Bedarf anmelden — der schnelle Weg zu Bürofläche, Unterbringung und           │
│   Auslandvertretung.                                                            │
│                                                                                 │
│   ┌─ Primary CTA ───────────────────┐                                           │
│   │  [ Bedarf anmelden →  Login mit eIAM ]                                      │
│   └─────────────────────────────────┘                                           │
│                                                                                 │
│   Nicht angemeldet? In ~5 Schritten zu Ihrer Bedarfsmeldung.                    │
│   Erstmals hier? → [ Wie funktioniert das Portal? ↗ ]                           │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Weitere Dienste ───────────────────────────────────────────────────────────────┐
│  • Status & Inbox          (nach Login)                                         │
│  • Pläne & Dokumente       (nach Login)                                         │
│  • Häufige Fragen / Hilfe  (öffentlich)                                         │
│  • Kontakt zur BBL         (öffentlich)                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Aktuelles (öffentlich) ────────────────────────────────────────────────────────┐
│  • Wartungsfenster ePPM 25.05. 18:00–22:00                                      │
│    Quelle BIT Betrieb · E. Frey · Stand 17.05.2026                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **One hero CTA**, not six tiles. The primary path (Bedarf anmelden) is
  the screen's reason to exist.
- **Secondary services as a list**, not a tile grid — visually subordinate,
  unambiguous about hierarchy. As services accumulate (Reparatur,
  Umzug, Spezialreinigung), the list grows; at ~6 the layout flips back
  to T3 catalogue grid.
- **Aktuelles** is content (FAQ-class news), so it carries the FUNC-LP-009
  metadata triplet.
- **Action item carries no triplet** (v0.5 scope of FUNC-LP-009): the CTA
  and the secondary list items are action surfaces.

#### 3.6.2 Authenticated home (T3-Lite, role-filtered)

```
┌─ Ihre offenen Anliegen (band) ──────────────────────────────────────────────────┐
│  3 Anträge in Bearbeitung                                          [ Inbox → ]  │
│  ● BE-2026-014 in GS-Prüfung   ● SEM-2026-002 eingereicht  ◐ Z-7-204 in Arbeit  │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Hauptaktion ───────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   Neuen Bedarf anmelden                                                         │
│   Unterbringung, Möbel oder Bauanforderung erfassen — geführter Ablauf in 5     │
│   Schritten.                                                                    │
│                                                                                 │
│   [ + Bedarf starten → ]                  [ aus früherem Antrag ableiten ▾ ]    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Weitere Dienste (Ihre Rolle: Mieter / ILBO) ───────────────────────────────────┐
│  • Status & Inbox · 3 offen, 12 abgeschlossen          [ öffnen → ]             │
│  • Pläne & Dokumente · 23 Dateien für UVEK             [ öffnen → ]             │
│  • Häufige Fragen                                       [ öffnen → ]             │
│  • Kontakt                                              [ öffnen → ]             │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Aktuelles ─────────────────────────────────────────────────────────────────────┐
│  17.05.  Neue Vorlage für SEM-Anträge verfügbar                                 │
│          Quelle BBL PFM · L. Hofmann · Stand 17.05.2026                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Open-items band** at the top, but compact (one row, three pills) —
  doesn't dominate the screen.
- **Hero action** is the wizard launcher with two sub-options:
  fresh start, or derive from a previous application (FUNC-LP-006, Could).
- **Secondary list** with role-filtered service entries (FUNC-LP-003).
- **Aktuelles** is content (carries triplet); the service-list items
  don't.

#### 3.6.3 Reviewer / power-user override

Reviewer roles (GS-Prüfer/in, BBL-PFM ops, BBL Campus admin) **don't get
the hero-CTA home** — they land on the §2.3 queue, because their primary
task is processing, not submitting. The reviewer-vs-submitter routing
happens immediately after eIAM role resolution.

```
Role resolution after login:

   eIAM token  ──┐
                 │
   roles[ ] ──── ┼──── if "ILBO" or "Mieter":            → §3.6.2 (hero-CTA)
                 │
                 ├──── if "GS-Prüfer/in":                  → §2.3 (queue)
                 │
                 ├──── if "BBL-PFM ops":                   → §4.1 (cockpit)
                 │
                 ├──── if "BBL Campus admin":              → §11.4 (content)
                 │
                 ├──── if multiple roles:                  → §2.1 (chooser)
                 │
                 └──── if "Auditor / EFD":                 → §11.0.2 (audit)
```

- **In other typologies:**
  - **T1 spatial:** the hero CTA gets a small map preview thumbnail
    next to it (no full-screen map until the user clicks).
  - **T6 vault:** unchanged on home; tree appears on Status & Inbox click.
  - **T7 chat (lookup-only after v0.3 narrowing):** the hero CTA is
    replaced by a chat input only on the Help/FAQ surface, not the home.
- **Reqs:** FUNC-LP-001 (SPOC), FUNC-LP-002 (no training — the lead
  CTA is the obvious next step), FUNC-LP-003 (role-routed home),
  FUNC-LP-006 (suggestion from prior applications, Could).

---

## 4. T4 — IWMS / KPI cockpit

> **Core metaphor:** the home is a tiled dashboard of operational metrics —
> open work orders, occupancy, costs, compliance flags. **Anchors:** Planon
> Universe, IBM TRIRIGA, Spacewell. **Best fit:** BBL operations, PFM
> reviewers daily, ESG/VILB reporting. **Worst fit:** ILBOs who file twice a
> year (overwhelming).

### 4.1 Authenticated home (T4) — KPI cockpit

```
┌─ Cockpit · Bereich BBL-PFM ────────────────────────  [ Zeitraum: 30 Tage ▾ ]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Primärmetrik: Eingang offen / blockiert                                         │
│                                                                                 │
│   24 Anträge offen — davon  2 ePPM-Fehler ⚠ und  3 mit Auflagen                 │
│                                                                                 │
│   [ ePPM-Fehler ansehen → §4.2 ]    [ Auflagen-Liste → ]                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ▸ Sekundärmetriken (eingeklappt — pro Nutzer-Voreinstellung gespeichert)  [ ▾ ] │
│   Eingang 24 (↑ +6) · in GS 11 (Ø 4.2 d) · Bedarfsmeldungen 18                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ▸ Belegung CH · Trend Eingänge · Top-Wartezeiten · Auflagen offen          [ ▾ ]│
│   (vier Detail-Widgets, einzeln aufklappbar)                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

Aufgeklappte Sekundärmetriken (auf Klick):

│ ┌─ Eingang Anträge ─┬─ in GS-Prüfung ─┬─ Bedarfsmeldungen ─┬─ ePPM-Fehler ─────┐│
│ │      24           │      11          │     18      │       2  ⚠               ││
│ │  ↑ +6 zu Vorm.     │   Ø 4.2 d        │             │   [ §4.2 → ]             ││
│ └────────────────────┴──────────────────┴─────────────┴───────────────────────────┘│

Aufgeklappte Detail-Widgets (einzeln, jedes mit eigenem [ ▾ ] Toggle):

│ ┌─ Belegung CH (Karte) ─────────────┬─ Trend Eingänge 12 Wochen ────────────────┐│
│ │     ●  ● ●●  ●                    │      ▁▂▄▃▅▆▆▅▇▆▇█                          ││
│ │       Heatmap nach Status         │                                            ││
│ └───────────────────────────────────┴───────────────────────────────────────────┘│
│ ┌─ Top-Wartezeiten ─────────────────┬─ Auflagen offen ─────────────────────────┐ ││
│ │ BE-2026-009  18 d                 │ BE-2026-011  Rechtsgrundlage fehlt        │ ││
│ │ SEM-2026-001 14 d                 │ BE-2026-014  FTE-Annahme prüfen           │ ││
│ │ BE-2026-007  11 d                 │                                          │ ││
│ └───────────────────────────────────┴───────────────────────────────────────────┘ ││
```

- **Primary metric** is one line of human-readable summary, with two
  call-to-action buttons for the two states that need action *now*: ePPM
  failures (FUNC-PFM-004 reprocess) and open Auflagen. This is what a
  PFM-ops shift starts with.
- **Sekundärmetriken** (the four KPIs from v0.2) collapsed by default into
  one line. Click to expand the full 2×2 grid. Per-user persisted.
- **Detail widgets** (map, sparkline, two lists) each separately
  collapsible. Default state per role: all collapsed for PFM-ops (focus
  on primary), all expanded for BBL Campus (reporting view) — configurable.
- Borrows the *idea* of Planon's analytics layout but **doesn't show all
  eight widgets above the fold by default**: dashboard fatigue is a
  well-documented anti-pattern (Stephen Few; gov.uk performance team).
- **Reqs:** FUNC-REP-001 (aggregated reports), FUNC-PFM-004 (ePPM
  reprocessing entry-point), FUNC-INB-002 (status overview), NFA-COMP-007
  (VILB task clusters), W-14 (per-user widget preference store — new).

### 4.2 SAP ePPM handover panel (T4-specific)

```
┌─ ePPM-Übergaben (Bedarfsmeldungen) ─────────────────────────────────────────────┐
│ Tabs:  [ Erfolgreich (96) ]  [ Fehlgeschlagen (2) ⚠ ]  [ Warteschlange (3) ]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Antrag         Übergabe              Bedarfsmeldung-Nr.   Fehlerkennung          │
│ BE-2026-013    14.05. 09:12  ✓       BM-2026-000713        —                     │
│ BE-2026-014    14.05. 11:04  ✗       —                     FRE_RE_FX 042 — Feld  │
│                                                              IMKEY fehlt          │
│                                                              [ Erneut übergeben ↻]│
│ BE-2026-015    14.05. 11:06  ✗       —                     BUS_GW 009 — WSG-     │
│                                                              Endpunkt offline     │
│                                                              [ Erneut übergeben ↻]│
└─────────────────────────────────────────────────────────────────────────────────┘
[ Korrelations-ID kopieren ]                                   Logs → Grafana ↗
```

- Operations-grade view: failed handovers are first-class.
- Per FUNC-PFM-004, a single application can be re-triggered. Audit-trail
  entry recorded automatically.
- **Reqs:** FUNC-PFM-001 to FUNC-PFM-004, NFA-INT-005, NFA-DATA-004
  (correlation IDs).

### 4.3 Wizard + inbox + detail (T4)

Same wizard as §2.4 (cockpit users still file demand the same way); inbox is
the table from §3.4 but with extra ops columns (correlation ID, ePPM result,
SLA badge). Detail adds an "Ops" tab with raw events and a "Reprocess" action.

---

## 5. T5 — Service-desk / ticketing

> ⚠ **Not in pilot scope.** T5 is preserved as a roadmap exploration for the
> repair-notification use case (REQ-FA-005, Case A). It is **not part of
> the §10.3 v0.3 hybrid** and reviewers may skip §5.1–§5.3 on first read.
> The chapter is retained because the repair-ticket flow will need a
> typology decision when Case A scope arrives.
>
> **Core metaphor:** every interaction is a ticket on a pipeline.
> **Anchors:** Fixflo, Yarowa (CH), Plentific, ServiceNow WSD, facilioo.
> **Best fit:** the repair-notification use case (REQ-FA-005) and any
> incident workflow. **Worst fit:** the pilot accommodation-demand use case
> — an application is not a "ticket" in user vocabulary, and shoe-horning
> it into a ticketing UI hides its structure.

### 5.1 Authenticated home (T5)

```
┌─ Ihre Tickets ──────────────────────────────────────────────────────────────────┐
│ [ + Neues Ticket ▾ ]   Vorlagen:  Bedarf · Reparatur · Umzug · Sonderreinigung │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Status-Kanban                                                                   │
│ ┌─ Offen ─────────┬─ Zugewiesen ────┬─ in Arbeit ─────┬─ Wartet auf Mieter ──┐  │
│ │ T-2026-0142     │ T-2026-0139     │ T-2026-0131     │ T-2026-0128           │  │
│ │ Bedarf Bern     │ Schaden Boudry  │ Umzug Ittigen   │ Rückfrage WiBe        │  │
│ │ ──────────────  │ ──────────────  │ ──────────────  │ ──────────────       │  │
│ │ T-2026-0140     │ T-2026-0138     │                 │                       │  │
│ │ Reparatur Sulgen│                 │                 │                       │  │
│ └─────────────────┴──────────────────┴─────────────────┴──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Kanban as the home. Every demand, repair, move and cleaning request is a
  *ticket* on the same board; the type is just a label.
- Risk: forces demand and repair into the same shape, which loses information
  (a demand has fields a ticket doesn't). Counter: the "type" decides which
  detail panel shows.
- **Reqs:** FUNC-INB-001, FUNC-INB-002, REQ-FA-005 (would be a clean fit
  once repair scope arrives).

### 5.2 Ticket detail (T5) — "Bedarf" type behaves like §1.6 / §3.5

```
┌─ T-2026-0142 · Bedarf Bundeshaus W ─────────────────────────────────────────────┐
│ Erstellt 12.05. von A. Muster (UVEK)               Status: Eingereicht          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Verlauf (links)                       Antragsdaten (rechts)                     │
│                                                                                 │
│ ▸ 12.05. 14:02  Eingereicht           Tabs: Daten | Anhänge | SAP | Audit       │
│ ▸ 12.05. 14:02  Notification an GS    HNF2  120 m²  UK CHF 720 000              │
│ ▸ 14.05. 09:00  Zugewiesen J. Berger  Anhänge: WiBe.pdf …                       │
│ ▸ 16.05. 11:14  Kommentar GS …                                                  │
│                                                                                 │
│ [ Kommentar hinzufügen … ]                                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Conversation-like log on the left, structured form on the right.
- For a *repair* ticket the right column would be photos + location + work
  status instead.
- **Reqs:** NFA-SEC-005, FUNC-FG-004, FUNC-AU-022.

### 5.3 Other views (T5)

- Pre-login: lean list of services (looks like §3.1 but with "Ticket
  öffnen" CTA).
- Wizard: a single "Open a ticket" page with a type chooser → branches to a
  multi-step form for "Bedarf" (same wizard as elsewhere) or a short form
  for "Reparatur".
- Cockpit/reporting: per-status counters and SLA timers.

---

## 6. T6 — Document vault / e-Akte

> **Core metaphor:** every case is a folder of documents on a tree.
> **Anchors:** Acta Nova (federal GEVER), Fabasoft eGov, OneGov GEVER, MS
> SharePoint Online (CH region). **Best fit:** archive (FUNC-AU-023), audit
> (NFA-SEC-005), legal continuity. **Worst fit:** day-to-day tenant
> interaction — admin-flavoured UI, tree navigation is slow for casual
> users.

### 6.1 Authenticated home (T6) — file tree

```
┌─ Aktenübersicht ────────────────────────────────────────────────────────────────┐
│ Suche [ 🔍 … ]                       Filter: [Jahr ▾] [Typ ▾] [VE ▾]            │
├──────────────────────────────────────────┬──────────────────────────────────────┤
│  📁 Bedarf-Akten                          │  Geschäft BE-2026-014                │
│   📁 2026                                 │  ────────────────────────────────    │
│    📁 BE-2026-014  Bundeshaus W           │  Status      in GS-Prüfung           │
│      📄 Antragsformular                   │  Antragsteller  A. Muster (UVEK)     │
│      📄 WiBe.pdf                          │  Eingangsdatum  12.05.2026           │
│      📄 Rechtsgrundlage.pdf               │  Frist          26.05.2026           │
│      📄 Audit-Log                         │  ──────────────────────────────      │
│    📁 BE-2026-013  Ittigen                │  Aktionen                             │
│   📁 2025                                 │  [ Vorgang öffnen ] [ Export PDF ]   │
│  📁 Reparatur-Akten                       │  [ An GEVER übergeben → ]            │
│  📁 Schulungen & Vorlagen                 │                                      │
└──────────────────────────────────────────┴──────────────────────────────────────┘
```

- Two-column file-explorer pattern: tree left, metadata + actions right.
- Audit-log is itself a document in the case folder (signed/timestamped).
- **Reqs:** FUNC-AU-022 (case ID), FUNC-AU-023 (archive), NFA-SEC-005,
  NFA-DATA-002 (retention).

### 6.2 Other views (T6)

- Pre-login: same as §3.1 service catalogue (the vault metaphor only makes
  sense once you're inside a case).
- Wizard: standard stepper, but on submit the system also writes the file
  into the tree (highlight animation: 📁 BE-2026-014 appears).
- Inbox: tree + a list view ("Recent files" — Acta Nova pattern).
- Detail: as above.

---

## 7. T7 — AI copilot / chat-first

> **Core metaphor:** a chat box is the primary input; the agent routes
> requests, fills forms, finds documents. **Anchors:** Aareon CRM-Portal AI,
> casavi smartflows, Parloa, [Apertus](https://www.swiss-ai.org/) (Swiss
> Apache-2.0 LLM, Sept 2025). **Best fit:** multilingual triage (DE/FR/IT/
> Romansh natively in Apertus), FAQ, first-contact help. **Worst fit:**
> audit-critical fields, lawful decisions — the wizard still has to render
> visibly per FUNC-AU-011 ("clearly marked mandatory").

### 7.1 Authenticated home (T7)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│   👋 Guten Tag, Andrea.                                                          │
│   Wie kann ich helfen?                                                          │
│                                                                                 │
│   Häufig:  [ Bedarf anmelden ]  [ Status BE-2026-014 ]  [ Plan herunterladen ]  │
│            [ Reparatur melden ]  [ Auflage beantworten ]                        │
│                                                                                 │
│   ┌─ Eingabe ────────────────────────────────────────────────────────────────┐  │
│   │  Ich brauche zusätzliche Bürofläche in Bern für 8 FTE…                  │  │
│   │                                                            [ Senden ↗ ] │  │
│   └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│   Letzte Konversationen                                                         │
│    • 16.05.  "Wo finde ich die Grundrisse für Sulgenrain?"  [ öffnen ]          │
│    • 12.05.  "Antrag BE-2026-014 starten"                   [ öffnen ]          │
│                                                                                 │
│   Hinweis: Entscheidungen (Genehmigung, Ablehnung) werden ausschliesslich       │
│   im strukturierten Formular getroffen — nicht im Chat.                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Chat is the main affordance; quick-tap suggestion chips below the prompt.
- Disclaimer is part of the screen (NFA-COMP-003 — decisions must be made
  in a structured, auditable form, not in chat).
- **Reqs:** FUNC-LP-001, FUNC-LP-006 (suggestion from prior applications),
  NFA-CD-003 (multilingual).

### 7.2 Chat → wizard hand-off (T7-specific)

```
┌─ Chat ──────────────────────────────────────────────────────────────────────────┐
│ Sie: Ich brauche zusätzliche Bürofläche in Bern für 8 FTE.                      │
│                                                                                 │
│ MP-Assistent: Ich habe einen Entwurf vorbereitet. Bitte prüfen Sie:             │
│                                                                                 │
│   Antragstyp:    Kleinantrag      🤖 vorgeschlagen — bitte bestätigen           │
│   VE:            UVEK / BAFU      🟢 verifiziert (aus Ihrem eIAM-Profil)         │
│   Adresse:       Bern             🤖 ungenau — bitte präzisieren                 │
│   FTE:           8                🤖 aus Ihrer Eingabe entnommen                 │
│                                                                                 │
│   Geschätzte HNF2 (NAW-Klasse offen × Belegungsfaktor 0.8):                     │
│     12 m²/FTE × 8 × 0.8 = 77 m²    🤖 erst final nach §8.1                       │
│                                                                                 │
│ Hinweis: Werte mit 🤖 stammen aus dem Sprachverstehen, nicht aus dem            │
│ Bundes-Stammdatensatz. Im Formular werden sie als „manuell prüfen" markiert.   │
│                                                                                 │
│ [ Im Formular öffnen → ]   [ Adresse präzisieren ]   [ Verwerfen ]              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **🤖 badge for LLM-inferred values** (v0.3 — was 🟢 in v0.2, which is a
  badge reserved for federal-master-data-derived values). The four
  semantic badge families now read:
  - 🟢 verifiziert — system of record (master data, swisstopo, eIAM, GWR)
  - 🟡 veraltet — needs refresh from a known source
  - 🔴 manuell überschrieben — user overrode an auto-derived value
  - 🤖 vorgeschlagen — LLM inference from user prose (anchoring-bias risk
    is acknowledged; values carry this badge into §8.1 Step 2 where the
    reviewer can see what the user accepted vs. corrected)
- **Math fixed** — HNF2 is shown as `12 × 8 × 0.8 = 77 m²` (consistent
  with §8.1), not 96 m². The chat panel cannot silently drop the
  desk-sharing factor.
- **Scope reminder** — under the v0.3 narrowing (see §10.3 hybrid), the
  chat copilot remains in pilot scope for **lookup, FAQ, and structured
  intake intake**. The Apertus-fills-the-wizard pattern stays as roadmap
  pending an LLM-quality and anchoring-bias study; the sketch is
  retained so the future option is concrete, not for pilot build.
- **Agent fills the wizard from natural language; user is one click away
  from the structured form.** *Filling from chat does not constitute
  submission.* Every 🤖 field shows as 🤖 in §8.1, prompting the applicant
  to verify before advancing.
- **Reqs:** FUNC-AU-001, FUNC-AU-004 (NAW factor — initial guess),
  FUNC-LP-004 (the wizard remains the system of record).

### 7.3 Other views (T7)

- Pre-login: a public version of the chat box (FAQ-only, no auth) +
  small service tiles below.
- Wizard: identical to §2.4 — but the user arrives with most fields
  pre-filled and the `StepIndicator` jumps to the first unfilled step.
- Inbox: a chronological list of conversations + an "Anträge" tab that is
  the §3.4 table.
- Detail: §1.6/§3.5 with an extra "Konversation" tab.

---

## 8. Wizard alternatives

The same demand-submission flow can be shaped three ways. Each is shown on
**Step 2 (Fläche / NAW questionnaire)** since that's the step with the most
fields and the live cost calculator (FUNC-AU-014/-015 for office,
FUNC-AU-016 for SEM berths, FUNC-AU-017 for FDFA manual entry).

### 8.1 Linear stepper (recommended primary)

```
[1•Basis] [2•Fläche] [3 Anhänge] [4 Major] [5 Prüfen]                          ← StepIndicator
─────────────────────────────────────────────────────────────────────────────────
Schritt 2 von 5 — Flächenbedarf  (Antragstyp = Büroarbeitsplätze, Standardpfad)

┌─ A · NAW-Klassifizierung (Arbeitsstil) ─────────────────────────────────────────┐
│  Welche Arbeitsweise prägt das Team?                                            │
│   1. Schwerpunkt:                (●) Kollaborativ  ( ) Konzentriert  ( ) Mix   │
│   2. Anteil Remote-Arbeit:       [ 30 %                            ▾ ]          │
│   3. Vertraulichkeit der Arbeit: ( ) niedrig  (●) mittel  ( ) hoch              │
│   4. Empfangs-/Publikumsverkehr: ( ) keiner    (●) gelegentlich  ( ) regelm.   │
│   5. Spezialausstattung:         ☐ Labor  ☐ Werkstatt  ☐ Sicherheitsbereich     │
│                                                                                 │
│  → NAW-Klasse (auto):  **Kollaborativ-Standard**   [ Begründung ansehen ▾ ]    │
│  → m²/FTE-Basis HNF2 (aus Stammdaten):  12 m²       (FUNC-CC-001)               │
│  → m²/FTE-Basis GF   (aus Stammdaten):  24 m²       (FUNC-CC-001)               │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ B · Mengengerüst & Berechnung ─────────────────────────────────────────────────┐
│  Anzahl FTE:                                [ 8                              ] │
│  Belegungsfaktor (Desk-Sharing, fix 0.8):    0.80      🔒 Bundesvorgabe         │
│                                                                                 │
│  Berechnung (live, FUNC-AU-014/-015):                                           │
│  ─────────────────────────────────────────────────────                          │
│  Arbeitsplätze (AP) = FTE × 0.8           =      6.4   → aufgerundet 7 AP       │
│  HNF2  = 12 m² × FTE × 0.8                =     77 m²                           │
│  GF    = 24 m² × FTE × 0.8                =    154 m²                           │
│  Betriebskosten-Obergrenze: CHF 60/m² GF  ≤ CHF 9 240/Jahr  ⚠ Vorgabe           │
│  UK-Kosten (vorl., Lage Bern, Kat. III):  CHF 462 000                           │
│  Möblierung: CHF 650/m² HNF2              = CHF  50 050                         │
│  ─────────────────────────────────────────────────────                          │
│  ℹ Die NAW-Klasse beeinflusst die m²/FTE-Basis (12/24 sind Standard für         │
│    Kollaborativ-Standard). Bei abweichender Klasse passt die Basis sich an —    │
│    nicht der 0.8-Belegungsfaktor (dieser ist gesetzliche Bundesvorgabe).        │
└─────────────────────────────────────────────────────────────────────────────────┘
[ Entwurf speichern ]                   [ ← Zurück ]  [ Weiter → Anhänge ]
```

- **Two-block layout** separates the **NAW-Klasse** (working-style category
  that drives the m²/FTE base — a *categorical* lookup from BBL-PFM master
  data per FUNC-CC-001) from the **Belegungsfaktor** (the fixed federal
  desk-sharing multiplier 0.8 per FUNC-AU-014 — a *constant*, not derived
  from the questionnaire). The previous draft conflated these two.
- The questionnaire selects an NAW-Klasse name (e.g. *Kollaborativ-Standard*,
  *Konzentriert-Einzel*, *Hybrid-Open*); the class maps to an m²/FTE pair in
  centrally maintained master data (FUNC-CC-001, OP-8). The reviewer sees
  *which* class was selected and *why* via the "Begründung ansehen" disclosure.
- Belegungsfaktor 0.8 is shown 🔒 schreibgeschützt — the BBL-PFM admin can
  edit it in the master-data screen (§9.5) but the applicant cannot.
- Live operating-cost ceiling (CHF 60/m² GF per FUNC-AU-014) is displayed as
  a guardrail, not a calculation result — flags an over-budget request
  before submit.
- **Pro:** lowest cognitive load for first-time users (FUNC-LP-002 "without
  training"); explicit progress; one decision per screen; the calculation
  block is auditable line-by-line.
- **Con:** can feel slow for power users; if step N depends on step M,
  jumping back is needed.
- **Reqs:** FUNC-AU-004 (NAW questionnaire → factor), FUNC-AU-014 (office
  formula), FUNC-AU-015 (furnishing), FUNC-CC-001/-002 (master data),
  FUNC-AU-011 (Muss/Kann), FUNC-AU-010 (inline help).

### 8.2 Accordion (workspace-management style)

```
┌─ Schritt 1 ──────────────────────── Basisangaben  ────────────────────── ✓ ─ ▴ ┐
│   (zusammengeklappt — Zusammenfassung sichtbar)                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Schritt 2 ──────────────────────── Flächenbedarf ──────────────────  bearb. ▾ ┐
│   NAW-Fragebogen, FTE, HNF2/GF/UK Live-Berechnung (wie §8.1)                    │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Schritt 3 ──────────────────────── Anhänge & Recht  ───────────────  offen ▾ ─┐
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Schritt 4 (nur Grossantrag) ────── 12 Pflichtfelder ─────────────  offen ▾ ───┐
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Schritt 5 ──────────────────────── Prüfen & Senden  ───────────────  offen ▾ ─┐
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Pro:** all steps visible at once; jumping is easier; reuses the
  `Accordion` component (which the design system ships); the existing
  workspace-management prototype already has this pattern coded.
- **Con:** more visual noise; on small screens the page becomes very long;
  the `StepIndicator` and the accordion duplicate information.

### 8.3 Single-page long-form (power-user mode)

```
┌─ Bedarfsantrag ─────────────────────── linke Seite: TOC, scroll-spy ────────────┐
│  ▸ Basis                                                                        │
│  ▸ Fläche / NAW   ●                                                             │
│  ▸ Anhänge                                                                      │
│  ▸ Major                                                                        │
│  ▸ Prüfen                                                                       │
│                                                                                 │
│  → Sticky-Statusleiste rechts oben: 12/30 Pflichtfelder ausgefüllt              │
│                                                                                 │
│  [ ... alle Felder in einer langen Seite ... ]                                  │
│  [ Entwurf wird alle 30 s automatisch gespeichert ]                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Pro:** zero clicks between sections, very fast for returning users; works
  well with browser find/Strg+F; nice for printing/draft review.
- **Con:** intimidating for occasional users — the requirement
  FUNC-LP-002 strongly disfavours this; also poorer on mobile.

### 8.4 Cross-cutting: draft, save & resume

```
[ Entwurf speichern ] → Toast "Entwurf gespeichert. ID BE-2026-DRAFT-014."
                       Entwurf erscheint in "Meine Anträge" → Tab Entwürfe.
                       Auto-save alle 30 s wenn online.
                       Halbwarnung bei Verlassen ohne Speichern.
```

- Applies to all three forms above.
- **Reqs:** FUNC-AU-009 (delete draft), FUNC-AU-022 (ID at first save).

### 8.5 Recommendation for the wizard

**Primary: linear stepper (§8.1).** Reasons: matches FUNC-LP-002 (no
training), best mobile/keyboard support, the design system ships
`StepIndicator` so we're not inventing a new component. **Reserve §8.2
(accordion) for the final "Prüfen" step** — collapse-by-section is exactly
right when reviewing the whole application before submit. **Skip §8.3
(single-page)** unless a future power-user role asks for it.

Step-by-step canonical sketches follow in §8.6 (Step 4 Grossantrag),
§8.7 (Step 2 SEM), §8.8 (Step 2 FDFA), §8.9 (Step 1+2 Greenfield) and
§8.10 (Step 5 Prüfen). Each is shown in the linear-stepper flavour (the
recommendation); a short "in other typologies" note describes what
changes when the host typology shifts.

### 8.6 Wizard Step 4 — Grossantrag (FUNC-AU-019, v0.5 narrowed shape)

Shown only when **Antragstyp = Grossantrag** was chosen in Step 1
(FUNC-AU-021). The v0.5 spec narrows the field set from 12 mandatory
free-text fields to **6 mandatory free-text + 4 mandatory structured +
1 optional free-text** (see [REQUIREMENTS.md FUNC-AU-019](REQUIREMENTS.md)
note). The ePPM mapping (FUNC-PFM-002) is preserved — Operative Ziele and
Zielzustand both target the same `Ziele/Soll` tab and are merged on the
applicant side.

The SAP ePPM tab annotations are kept available but **hidden by default**
behind an "Erweiterte Ansicht" toggle — the applicant doesn't need to know
which SAP tab their text lands in; the reviewer and BBL-PFM operator do.

```
[1✓Basis] [2✓Fläche] [3✓Anhänge] [4•Major] [5 Prüfen]                           ← StepIndicator
─────────────────────────────────────────────────────────────────────────────────
Schritt 4 von 5 — Grossantrag: Pflichtfelder                 Pflicht 0 / 7 · ⏱
                                          [ ☐ Erweiterte Ansicht (ePPM-Mapping) ]

┌─ Sektion A · Bedarf & Zielzustand ────────────────────  [0 / 3 Pflicht]  ─ ▾ ──┐
│  4.1  Kurzbeschreibung *                                                       │
│       [ Erweiterung Empfangszentrum Boudry, Modulbau für …                  ] │
│       ℹ max. 500 Zeichen — wird auf der ePPM-Karte als Projektname genutzt.    │
│                                                                                │
│  4.2  Defizite in der aktuellen Situation *                                    │
│       [ Aktuell 80 Plätze, Auslastung 132 %; Hotelunterbringungen seit 2025 …] │
│                                                                                │
│  4.4  Zielzustand / Operative Ziele *  (in v0.4 zwei Felder, jetzt eines)      │
│       [ Erhöhung Kapazität auf 160 Plätze ohne erneute Hotelunterbringung …  ] │
│       ℹ Beschreiben Sie den Soll-Zustand und die operativen Ziele in einem    │
│         Abschnitt. Beides landet im ePPM-Tab "Ziele/Soll".                     │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ Sektion B · Recht, Alternativen, Nutzen ──────────────  [0 / 3 Pflicht]  ─ ▾ ─┐
│  4.3  Rechtsgrundlage *  (Verweis auf Upload aus Schritt 3)                    │
│       [ Rechtsgrundlage.pdf — Bundesratsbeschluss 2025-12-04         ▾ ]      │
│       ☐ ... oder URL eingeben: [                                            ] │
│                                                                                │
│  4.5  Geprüfte Alternativen *                                                  │
│       [ a) Erweiterung Bestand am gleichen Standort  — verworfen wegen …     ] │
│       [ b) Anmietung extern Aarau                    — verworfen wegen …     ] │
│       [ c) Modulbau Boudry                           — gewählt              ] │
│                                                                                │
│  4.8  Planungsabhängigkeiten *                                                 │
│       [ SEM-Strategie 2030; Bewilligung Kanton NE; Anschluss ÖV …           ] │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ Sektion C · Termine, Kosten, FTE/AP (strukturiert) ───  [4 / 4 Pflicht ✓] ─ ▾ ┐
│  4.9  Terminplan *   (strukturiert — Datumsfelder)                             │
│       Start:        [ 01.03.2027 ▾ ]                                           │
│       Meilenstein:  [ 01.10.2027 ▾ ]   Bezug                                   │
│       Fertigst.:    [ 31.12.2027 ▾ ]                                           │
│       ℹ Vorgeschlagene Termine ↓ basierend auf Investitionsvolumen             │
│         (FUNC-AU-020):     [ Vorschlag übernehmen ]                            │
│                                                                                │
│  4.10 Kostenerwartung (CHF) *   (strukturiert — Zahlenfelder)                  │
│       Investition gesamt: [ 19 200 000          ]                              │
│       davon Möblierung:   [    104 000          ]   🟢 auto aus §8.1            │
│       davon UK-Kosten:    [    462 000 / Jahr   ]   🟢 auto aus §8.1            │
│                                                                                │
│  4.11 FTE *   (strukturiert — Zahl)                                            │
│       [ 14 (Betreuung) + 160 (Plätze) ] — siehe Sub-Tab Mengengerüst           │
│                                                                                │
│  4.12 Anzahl Arbeitsplätze (AP) *   (strukturiert, abgeleitet)                 │
│       [ 12 ]   🟢 aus §8.1: 14 FTE × 0.8 = 11.2 → aufgerundet 12 AP             │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ Sektion D · Nutzen-Kosten (optional, wenn WiBe vorhanden) ──── [-]  ─ ▾ ──────┐
│  4.6  Nutzen-Kosten-Begründung   (optional — WiBe.pdf liegt vor)               │
│       Verweis auf WiBe (Schritt 3):                                            │
│       [ WiBe.pdf — Wirtschaftlichkeitsbetrachtung v2          ▾ ]              │
│                                                                                │
│       Wenn keine WiBe hochgeladen ist, wird dieses Feld zur Pflicht und        │
│       die Begründung muss hier manuell erfasst werden.                         │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ Sticky-Footer ────────────────────────────────────────────────────────────────┐
│  6 / 7 Pflichtfelder ausgefüllt   ⚠   Auto-Save in 24 s                         │
│  [ Entwurf speichern ]   [ ← Zurück Anhänge ]   [ Weiter → Prüfen & Senden ]   │
└────────────────────────────────────────────────────────────────────────────────┘
```

Optionaler Detailblick mit ePPM-Mapping (Toggle "Erweiterte Ansicht"):

```
4.1 Kurzbeschreibung     → ePPM "Antrag"
4.2 Defizite             → ePPM "Defizit"
4.4 Zielzustand/Ziele    → ePPM "Ziele/Soll"  (vereint)
4.3 Rechtsgrundlage      → ePPM "Recht"
4.5 Alternativen         → ePPM "Alt"
4.6 Nutzen-Kosten        → ePPM "NK"  (optional/WiBe-derived)
4.8 Planungsabhäng.      → ePPM "Abhäng."
4.9 Terminplan           → ePPM "Termin"
4.10 Kosten              → ePPM "Kosten"
4.11 FTE                 → ePPM "FTE"
4.12 AP                  → ePPM "AP"
```

- **v0.5 narrowing rationale:** the 12-field shape from v0.4 created
  duplication (Operative Ziele ≈ Zielzustand; Nutzen-Kosten free text
  duplicated the WiBe upload) and treated structured values (Termine,
  Kosten, FTE, AP) as if they were free text. The v0.5 shape preserves the
  same eleven ePPM destinations (FUNC-PFM-002 mapping unchanged) while
  cutting mandatory text from 12 to 7 fields. If the §8.6 form completion
  rate on pilot proves lower than expected, BBL PFM can flip a master-data
  flag to revert to the wider shape.
- **Four grouped sections (A/B/C/D)** as in-step `Accordion`s. Section C
  is structured (date/number inputs); Section D is optional/derived.
- **ePPM-tab annotations hidden by default** — toggle "Erweiterte Ansicht"
  re-shows them. Default applicant view is uncluttered; reviewers and PFM
  ops can flip the toggle.
- **Cross-step references** (Recht 4.3 → file from Step 3; Kosten 4.10
  → calculation from §8.1) avoid re-asking for the same value (W010 §2.2
  Once-Only).
- **Termin-Vorschlag (FUNC-AU-020)** offered as inline suggestion; user
  must explicitly *übernehmen* — no silent auto-fill of a date field.
- **Pflichtmarker `*`** + live counter "0/7" in the sticky footer
  (FUNC-AU-011 — visible mandatory marking). The counter is over 7, not
  over the full field count, because Section D is conditional.
- **Validation timing:** the counter updates on blur; `⚠` appears on a
  field only after first blur or when user tries to advance.
- **In other typologies:**
  - **T2 role-switched:** identical layout — wizard doesn't change per
    typology, only the surrounding chrome.
  - **T6 vault:** the same form, but the right-hand panel shows the
    growing folder tree (📁 BE-2026-014 → 📄 Antragsformular, 📄 WiBe.pdf,
    📄 Rechtsgrundlage.pdf) — the form fills the case folder live.
  - **T7 chat copilot:** Apertus pre-fills fields 4.1, 4.2, 4.7 from the
    chat transcript (🟡 manuell prüfen badge); the four cost/termin fields
    are not LLM-filled (NFA-COMP-003 — decisions in structured form only).
- **Reqs:** FUNC-AU-019 (12 fields), FUNC-AU-020 (deadline suggestion),
  FUNC-AU-021 (type chooser routes here), FUNC-PFM-002 (ePPM mapping),
  FUNC-AU-011 (Muss-marking), W010 §2.2 (Once-Only), NFA-DATA-004
  (correlation ID visible).

### 8.7 Wizard Step 2 — SEM-Variante (Schlafplätze, FUNC-AU-016)

Triggered automatically when **Antragsteller-VE = SEM** (Staatssekretariat
für Migration). The office formula does not apply; the calculator is
berth-based at CHF 120 000/Bettenplatz.

```
[1✓Basis] [2•Fläche] [3 Anhänge] [4 Major] [5 Prüfen]                           ← StepIndicator
─────────────────────────────────────────────────────────────────────────────────
Schritt 2 von 5 — Flächenbedarf  (SEM-Variante · Empfangs-/Bundesasylzentrum)
ℹ Erkannt: Antragsteller SEM → Bettenplatz-Logik aktiviert (FUNC-AU-016).

┌─ A · Zentrumstyp & Standort ──────────────────────────────────────────────────┐
│  Zentrumstyp *    (●) Bundesasylzentrum mit Verfahrensfunktion (BAZ-V)         │
│                   ( ) Bundesasylzentrum ohne Verfahren        (BAZ-oV)         │
│                   ( ) Besonderes Zentrum                       (BZ)             │
│                   ( ) Notunterkunft / temporär                 (NU)             │
│                                                                                │
│  Region SEM *     [ Romandie                                          ▾ ]      │
│  Betriebskonzept  [ SEM-Betriebskonzept BAZ-V 2024 v3.2 (intern)      ▾ ]      │
│                   (Stammdaten — gepflegt durch SEM, OP-8)                      │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ B · Bettenplätze & Begleitfunktionen ────────────────────────────────────────┐
│  Anzahl Schlafplätze *           [ 160                                       ] │
│   davon Familienzimmer           [  40                                       ] │
│   davon Einzelplätze             [  20                                       ] │
│   davon Mehrbettzimmer           [ 100                                       ] │
│                                                                                │
│  Betreuungs-FTE (Personal) *     [  14                                       ] │
│  Sicherheits-FTE *               [   4                                       ] │
│                                                                                │
│  Anzahl Verfahrensräume *        [   3                                       ] │
│  (wird vom SEM-Betriebskonzept abgeleitet — überschreibbar)                    │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ C · Berechnung (live, FUNC-AU-016) ──────────────────────────────────────────┐
│  Investitionspauschale: 160 Plätze × CHF 120 000              = CHF 19 200 000 │
│  ────────────────────────────────────────────────────────────────              │
│  Begleit-HNF Personal (Stammdaten):  14 × 18 m²               =       252 m²   │
│  Verfahrens-HNF:                      3 × 35 m²               =       105 m²   │
│  Schlaf-HNF:                        160 × 8 m² (Standardplatz)=     1 280 m²   │
│  Gesamt-HNF2 (vorläufig):                                       1 637 m²       │
│  ────────────────────────────────────────────────────────────────              │
│  ℹ Bauerhaltung & Sanitärquote sind im Pauschalansatz enthalten — siehe       │
│    SEM-Erlass „Standardausstattung Bundesasylzentren" (Stammdaten OP-8).       │
└────────────────────────────────────────────────────────────────────────────────┘
[ Entwurf speichern ]                   [ ← Zurück Basis ]  [ Weiter → Anhänge ]
```

- **Auto-detection:** the VE of the eIAM-authenticated user drives the
  variant. If a non-SEM user claims a SEM site (e.g. EFD oversees a SEM
  building), an admin override path applies — flagged in §11.4.
- **The pauschal-CHF 120 000/Bettenplatz is non-negotiable in the UI**
  (locked 🔒, sourced from FUNC-CC-001 / FUNC-AU-016) — only BBL-PFM admin
  can change the master-data value, audit-logged.
- **Begleit-HNF factors** (18 m²/Personal-FTE, 35 m²/Verfahrensraum, 8 m²/
  Schlafplatz) are SEM-specific and live in master data (OP-8 — to be
  pinned down with SEM during pilot).
- **Sub-totalling** mirrors federal cost-control habits: the reviewer can
  verify the maths line by line.
- **In other typologies:**
  - **T1 spatial:** the right column adds a SEM-region map overlay; the
    user picks a region from the map rather than the dropdown.
  - **T2 role:** the SEM ILBO role's wizard chrome shows "SEM" badge in
    the header — disambiguates the variant from chrome alone.
  - **T7 chat:** Apertus recognises "Empfangszentrum für 160 Personen" and
    pre-fills A and B; CHF figures stay un-LLMed.
- **Reqs:** FUNC-AU-016 (SEM pauschale), FUNC-AU-021 (type chooser),
  FUNC-CC-001 (master data), NFA-IAM-003 (VE-driven RBAC), OP-8 (SEM
  master-data ownership).

### 8.8 Wizard Step 2 — FDFA-Variante (manuelle Erfassung, FUNC-AU-017)

Triggered when **Antragsteller-VE = FDFA/EDA** (Eidg. Departement für
auswärtige Angelegenheiten). The Swiss office formula does **not** apply
abroad — values come from the FDFA's own room programme catalogue. The UI
must *forbid* auto-calculation and *force* manual entry.

```
[1✓Basis] [2•Fläche] [3 Anhänge] [4 Major] [5 Prüfen]                           ← StepIndicator
─────────────────────────────────────────────────────────────────────────────────
Schritt 2 von 5 — Flächenbedarf  (EDA/FDFA-Variante · Auslandvertretung)
ℹ Erkannt: Antragsteller EDA/FDFA → manuelle Erfassung aus Raumprogramm
   (FUNC-AU-017). Schweizer Bürowelten-Formel ist deaktiviert.

┌─ A · Vertretung & Land ───────────────────────────────────────────────────────┐
│  Gebäudetyp *                    (●) Kanzlei (Botschaftsgebäude)               │
│                                  ( ) Residenz (RE)                              │
│                                  ( ) Dienstwohnung (DW)                         │
│                                                                                │
│  Gastland *                      [ Peru                                  ▾ ]   │
│  Stadt / Posten *                [ Lima                                      ] │
│  Vertretungstyp                  ( ) Botschaft  (●) Generalkonsulat            │
│                                  ( ) Kooperationsbüro  ( ) Mission UN          │
│                                                                                │
│  Sicherheitsklassifizierung      [ Stufe B — gemäss EDA-Direktion AIO    ▾ ]   │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ B · Manuelle Flächenerfassung aus Raumprogramm ──────────────────────────────┐
│  Anwendbare Kategorie *  (für Kanzlei: nicht zutreffend; für RE: 1–5; DW: 6)   │
│  Bei Kanzlei: HNF gemäss Standard-Raumprogramm                                 │
│                                                                                │
│  HNF (m²) — Quelle: EDA-Raumprogramm 2023 *  [        420 m²                 ] │
│                                                  🔴 manuell · ⚪ ungeprüft     │
│  Anzahl Arbeitsplätze (AP) *                  [         28                   ] │
│  Anzahl Sicherheitsbereiche                   [          2                   ] │
│  Schalter-/Publikumsbereiche (m²)             [         60                   ] │
│  Wohnraum (nur RE/DW) (m²)                    [         —                    ] │
│                                                                                │
│  [ + EDA-Raumprogramm-PDF als Beleg anhängen ]      (in Schritt 3 abgelegt)    │
│                                                                                │
│  ⚠ Hinweis: automatische Berechnung ist hier deaktiviert. Werte werden          │
│     vom Antragsteller verantwortet und im Bedarfs-Audit dokumentiert.          │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ C · Kostenrahmen (manuell) ──────────────────────────────────────────────────┐
│  Vorgesehene Investition (CHF) *  [    4 200 000                              ]│
│  Lokale Mietkosten (CHF / Jahr)   [      210 000                              ]│
│  Wechselkursannahme               [ 1 CHF = 4.30 PEN   (Stichtag 17.05.2026)  ]│
│  Begründung der Annahmen *        [ basierend auf EDA-Posten-Mietspiegel … ]   │
└────────────────────────────────────────────────────────────────────────────────┘
[ Entwurf speichern ]                   [ ← Zurück Basis ]  [ Weiter → Anhänge ]
```

- **Hard-disabled automation:** the auto-calculator from §8.1 is *not*
  shown — replaced by an explicit "manuelle Erfassung" panel. A small
  warning text reminds the applicant they are responsible for the figures.
- **Data-quality stays manual:** HNF values carry the 🔴 manuell badge
  permanently; this is not an error but a fact about FDFA postings — the
  GS reviewer can see at a glance that these were not auto-derived.
- **Country picker** controls hidden downstream UX: a Schengen post vs. a
  high-risk-country post triggers different ISG-classification prompts on
  Step 5 (OP-1 dependency).
- **Currency note** is part of the form because FDFA cost figures are
  always quoted in CHF but the underlying lease/build is in local currency
  — the assumed FX rate must be auditable.
- **Three building types (Kanzlei / RE / DW)** as the top-level choice;
  each shows only its applicable HNF categories (1-5 for RE, 6 for DW).
- **In other typologies:**
  - **T1 spatial:** the map widens to a world view; user clicks on the
    posting city. No swisstopo tiles outside CH — fall back to a neutral
    OSM-tile vendor (decision required — see W-10 new).
  - **T7 chat:** Apertus drafts the Begründung text from natural language
    ("neuer Botschaftsbau Lima, 28 Diplomatenstellen") but the room-programme
    look-up must remain manual until FDFA's catalogue is API-available.
- **Reqs:** FUNC-AU-017 (FDFA manual mode), FUNC-AU-021 (type chooser
  routes here), NFA-IAM-003, OP-1 (ISG, varies by country).

### 8.9 Wizard Step 1+2 — Greenfield-Pfad (FUNC-AU-013, kein WE)

Triggered when the address-lookup at Step 1 returns *no* Wirtschaftseinheit
(WE) — the site is not yet in federal master data. The wizard does not
block; it switches into a **Greenfield-Modus** that captures enough data
for BBL master-data maintenance to create the WE later.

```
[1•Basis] [2 Fläche] [3 Anhänge] [4 Major] [5 Prüfen]                           ← StepIndicator
─────────────────────────────────────────────────────────────────────────────────
Schritt 1 von 5 — Basisangaben  (Greenfield-Pfad aktiviert)

┌─ Adresssuche & Erkennung ─────────────────────────────────────────────────────┐
│  Adresse           [ Neufeldstrasse 99, 3012 Bern                            ] │
│  WE                — keine zugeordnet                          ◼ Greenfield    │
│  EGID              — keine zugeordnet                          ◼ Greenfield    │
│                                                                                │
│  ⓘ Diese Adresse ist im Bundes-Stammdatensatz nicht registriert.              │
│     Sie können den Antrag trotzdem einreichen. BBL legt die WE im Anschluss   │
│     an die Genehmigung an (FUNC-AU-013).                                       │
│                                                                                │
│  [ Adresse präzisieren ]   [ Karte anzeigen ↗ ]   [ Trotzdem fortfahren → ]   │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ Greenfield-Erfassung (zusätzlich) ───────────────────────────────────────────┐
│  Liegenschafts-Status *                                                        │
│   ( ) Geplante Akquisition (Kauf)                                              │
│   (●) Geplante Anmietung (Markt)                                               │
│   ( ) Neubau auf Bundesgrundstück                                              │
│   ( ) Geplante Auslandvertretung (→ EDA/FDFA-Variante, §8.8)                  │
│                                                                                │
│  Voraussichtliche Inbetriebnahme *        [ Q3 2027                  ▾ ]      │
│  Voraussichtliche PFM-Kategorie *         [ Verwaltung Klasse III    ▾ ]      │
│  Verantwortlich BBL-Liegenschaftsteam     [ N. Frey (IM, Region Bern) ]       │
│                                            (auto aus Adressregion, FUNC-AU-001)│
│                                                                                │
│  [ Koordinaten von Karte übernehmen ]   (swisstopo-LV95: 2 601 320 / 1 200 410)│
│                                                                                │
│  ┌─ Folgeprozess BBL (Anzeige, nicht editierbar) ─────────────────────────┐  │
│  │  1. Antrag wird mit Status "Greenfield" gekennzeichnet                  │  │
│  │  2. Nach GS-Genehmigung legt BBL-IM die WE/EGID-Verknüpfung im SAP an   │  │
│  │  3. ePPM-Übergabe erfolgt erst nach abgeschlossener WE-Anlage           │  │
│  │     (→ erweiterter Pipeline-Schritt, siehe §0.3 Greenfield-Pipeline)    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
[ Entwurf speichern ]                              [ Weiter → Fläche ]
```

- **Soft-block, not hard-block.** Unknown WE is treated as a known-unknown
  — the user can continue, but the request is visibly flagged "Greenfield"
  through every subsequent step (badge in StepIndicator, in the inbox row,
  on the detail page).
- **Folgeprozess-Box** explains the cross-system implication up front — the
  applicant sees why their case will take a deviation in the SAP handover,
  rather than encountering a surprise "in WE-Anlage" status later.
- **Coordinate capture (swisstopo LV95)** is the federal-standard
  coordinate system; pre-population from the map preserves once-only
  collection (W010 §2.2).
- **BBL master-data trigger** is a downstream side-effect, not a portal
  responsibility — the wireframe sketches the handshake only.
- **Step 2 in Greenfield mode** behaves identically to the office-Standard
  Step 2 (§8.1) for office sites, or the SEM/FDFA variant per VE. The
  Greenfield flag only affects Step 1 metadata and the post-genehmigung
  pipeline.
- **In other typologies:**
  - **T1 spatial:** the right-side panel keeps the swisstopo map prominent
    so the user *places the pin* if there's no street address yet (the
    "embassy in Lima" case where the address may be a parcel ID, not a
    street).
  - **T6 vault:** the Greenfield case folder shows a 📁 with a special "🆕
    WE pending" icon; closes only when the WE is assigned.
  - **T7 chat:** Apertus warns the user upfront: "Diese Adresse ist neu —
    Greenfield-Antrag" before the form even renders.
- **Reqs:** FUNC-AU-013 (greenfield path), FUNC-AU-012 (auto-WE — graceful
  degradation), FUNC-AU-001 (BBL contacts still resolvable from region),
  §0.3 Greenfield pipeline.

### 8.10 Wizard Step 5 — Prüfen & Senden (accordion summary)

The final step uses §8.2 accordion intentionally — collapse-by-section is
exactly right when the user needs to *review* everything before submit.

```
[1✓Basis] [2✓Fläche] [3✓Anhänge] [4✓Major] [5•Prüfen]                           ← StepIndicator
─────────────────────────────────────────────────────────────────────────────────
Schritt 5 von 5 — Prüfen & Senden        Antrags-ID: BE-2026-DRAFT-014   ⛌ löschen

┌─ Validierungs-Übersicht ───────────────────────────────────────────────────────┐
│  ✓ Alle Pflichtfelder ausgefüllt (7 / 7 Major + 4 / 4 Basis)                   │
│  ✓ Anhänge vollständig: WiBe.pdf · Rechtsgrundlage.pdf                         │
│  ⚠ Hinweis: UK-Obergrenze CHF 60/m² GF überschritten (65 CHF — +8%).            │
│     Begründung optional, aber empfohlen ↓                                       │
│     (Harter Block erst ab +20 % über Vorgabe — siehe §11.4 Master-Daten-Schwelle)│
└────────────────────────────────────────────────────────────────────────────────┘
┌─ Schritt 1 ─ Basisangaben ────────────────────────────────────── ✓ ─ [ ▸ ] ───┐
│  Kleinantrag · UVEK · Eichweg 22, Bern · SAP 1086/2010/AA · EGID 100123456     │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ Schritt 2 ─ Flächenbedarf ───────────────────────────────────── ✓ ─ [ ▾ ] ───┐
│  NAW-Klasse  Kollaborativ-Standard  ·  FTE 8  ·  Belegungsfaktor 0.8 🔒        │
│  HNF2 77 m²  ·  GF 154 m²  ·  UK CHF 462 000  ·  Möblierung CHF 50 050         │
│  Betriebskosten 65 CHF/m² GF — ⚠ über 60 CHF Vorgabe (+8 %)                    │
│  ┌─ Begründung Überschreitung (optional) ─────────────────────────────────┐    │
│  │  [ Standortzuschlag Bern Innenstadt; vergleichbare Objekte 2024 …       ]│   │
│  └────────────────────────────────────────────────────────────────────────┘    │
│  (Harter Block würde greifen ab ≥ 72 CHF/m² GF = 60 + 20 %. Aktuell soft warn.) │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ Schritt 3 ─ Anhänge ────────────────────────────────────────── ✓ ─ [ ▸ ] ────┐
│  WiBe.pdf (1.2 MB · 🟢 Virenscan ok)   Rechtsgrundlage.pdf (220 KB · 🟢)        │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ Schritt 4 ─ Grossantrag-Pflichtfelder ──────────────────────── n / a · ▸ ────┐
│  (entfällt — Antragstyp Kleinantrag)                                           │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ Workflow-Vorschau ────────────────────────────────────────────────────────────┐
│  Nach dem Senden:                                                              │
│    [Sie] → [GS UVEK]  ────────►  ⏱ Bearbeitungszeit gemäss GS-SLA               │
│             ├─ genehmigt   → BBL PFM → SAP ePPM                                │
│             └─ Rückfrage   → zurück an Sie                                     │
│                                                                                │
│  Sie werden per E-Mail und in der Inbox (🔔) informiert. (FUNC-FG-004)         │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ Datenschutz & Klassifizierung ────────────────────────────────────────────────┐
│  ☑ Ich bestätige, dass die Angaben korrekt und vollständig sind.               │
│  ☑ Ich kenne die ISG-Klassifizierung „INTERN" und werde keine sensiblen        │
│     personenbezogenen Daten in Freitextfeldern eintragen.                       │
└────────────────────────────────────────────────────────────────────────────────┘
                          [ ← Zurück Schritt 4 ]   [ Entwurf speichern ]   [ Einreichen → ]
```

- Top **validation-overview** band gives green/red triage before any
  accordion is opened — the user sees in one glance whether they can submit.
- Each step header shows ✓ (complete) / ⚠ (issue) / `n/a` (skipped per
  type-chooser routing — FUNC-AU-021).
- A step section can be expanded inline to **edit** without leaving Step 5
  — jumping back to Step N preserves accordion state.
- **Two-tier over-budget gating** (v0.3, replacing the v0.2 hard-block-on-
  any-violation): soft warn from +0 % to +20 % above the master-data
  threshold (Begründung *optional* but encouraged); hard block at ≥ +20 %
  (Begründung mandatory, additional master-data-override path via
  §11.2). The previous "any overage requires Begründung as a hard gate"
  pattern forced master-data-maintenance to be in lockstep with reality —
  fine in principle, but federal master-data updates are slow (OP-8), so a
  small inflation gap would block every Geneva submission. The 20 %
  threshold itself is a master-data value editable by BBL-PFM admins.
- **Workflow-Vorschau** sets the applicant's expectation about what
  happens after submit (the BK-bypass variant of this preview is shown in
  §11.x BK detail; the Greenfield variant adds a "WE-Anlage durch BBL" hop).
- Two mandatory confirmations: data-correctness + ISG-awareness
  (OP-1 / NFA-SEC-004). The ISG line is templated from the master-data
  classification — if OP-1 resolves to a higher class, the wording changes.
- **In other typologies:**
  - **T6 vault:** "Einreichen" triggers an animation in the case-folder
    tree (📁 highlighted, audit-log entry written as a 📄).
  - **T3/T4/T5:** identical screen — Prüfen is a wizard step, not a
    typology surface.
  - **T7 chat:** the chat panel mirrors the validation-overview as a
    summary message ("Bereit zum Senden, ein offener Punkt: …").
- **Reqs:** FUNC-AU-009 (delete draft), FUNC-AU-011 (Muss), FUNC-AU-022
  (visible ID), FUNC-FG-004 (notification preview), NFA-SEC-004 / OP-1
  (ISG awareness), NFA-SEC-005 (Begründung audit-logged).

---

## 9. GS reviewer alternatives

The GS reviewer needs per-field marks (FUNC-FG-001), an overall decision
(FUNC-FG-002) and mandatory justification (FUNC-FG-003). Four ways to lay
this out:

### 9.1 Split-pane (form left, mark column right) — shown in §2.5

```
┌─ Antrag ─────────────────────────┬─ Prüfung ──────────────────────────────────┐
│ Feld                              │ ( ) OK ( ) NoK ( ) OK mit Kommentar       │
│ Feld                              │ ( ) OK ( ) NoK ( ) OK mit Kommentar       │
│ Feld                              │ ( ) OK ( ) NoK ( ) OK mit Kommentar       │
└──────────────────────────────────┴────────────────────────────────────────────┘
```

- **Pro:** consistent vertical alignment between field and mark; quick to
  scan; closest to a paper-checklist mental model that GS staff are used to.
- **Con:** wide screens only; on tablets the right column wraps under the
  left and breaks the alignment.

### 9.2 Inline field marks (Google Docs comments style)

```
Antragstyp:    Kleinantrag                            ✓
VE:            UVEK / BAFU                            ✓
HNF2:          120 m²                  💬             ⚠   ← Klick öffnet Kommentar
                          ↳ "FTE-Annahme prüfen"
Anhänge:       WiBe.pdf, Recht.pdf                    ✓
```

- **Pro:** very dense; reads exactly like the form does; the comment is
  attached where the eye is. Mobile-friendly.
- **Con:** the "overall decision" needs its own panel at the bottom; the
  mark icons are small and require careful affordance design.

### 9.3 Checklist column overlay (single right-rail)

```
┌─ Antrag (volle Breite, schreibgeschützt) ──────────────┐ ┌─ Prüf-Liste ──────┐
│  Antragstyp:    Kleinantrag                            │ │ ☑ Antragstyp       │
│  VE:            UVEK / BAFU                            │ │ ☑ VE                │
│  HNF2:          120 m²                                 │ │ ☒ HNF2  💬         │
│  Anhänge:       WiBe.pdf …                             │ │ ☑ Anhänge          │
│                                                        │ │ ─────────────────  │
│                                                        │ │ Gesamt: Auflagen   │
└────────────────────────────────────────────────────────┘ │ [ Speichern ]      │
                                                           └───────────────────┘
```

- **Pro:** the form is read-only and uncluttered; the right rail is the
  reviewer's "scratchpad"; very clear which fields are flagged.
- **Con:** the reviewer has to switch eye between two columns more than in
  §9.1; the rail can fill up.

### 9.4 Field-by-field stepper (one field per screen)

```
┌─ Prüfung Schritt 5 / 23 — HNF2 ─────────────────────────────────────────────────┐
│   Wert:   120 m²                                                                │
│   Quelle: Formular A. Muster                                                    │
│                                                                                 │
│   ( ) OK   (●) NoK   ( ) OK mit Kommentar                                       │
│   Begründung* [ FTE-Annahme prüfen.                                          ]  │
└─────────────────────────────────────────────────────────────────────────────────┘
[ ← Zurück ]                                                  [ Weiter → Anhänge ]
```

- **Pro:** mirrors the submitter's wizard exactly; forces the reviewer
  through every mandatory field.
- **Con:** very slow; rejected by every GS reviewer we'd interview
  (probably) because they want to see the whole application at once.

### 9.5 Recommendation for reviewer view

**Primary: §9.1 split-pane** for desktop (most reviewers will use it
that way), with §9.2 inline as the **automatic responsive fallback** below
~1024 px. §9.3 worth prototyping with a real GS reviewer. §9.4 not
recommended.

---

## 10. Tradeoff matrix + recommendation

### 10.1 Typology × persona/use case

| Typology | ILBO submitter (occasional) | GS reviewer (frequent) | BBL-PFM (operations) | Admin / BBL-Campus | Future Tenant employee |
|---|---|---|---|---|---|
| **T1 Digital-twin** | ★★ (great when building exists) | ★ | ★★ | ★ | ★★ |
| **T2 Role-switched** | ★★★ | ★★★ | ★★ | ★★★ | ★★ |
| **T3 Service catalogue** | ★★★★ | ★ | ★ | ★ | ★★★ |
| **T4 KPI cockpit** | ★ | ★★★ | ★★★★ | ★★ | ★ |
| **T5 Service-desk / tickets** | ★ | ★★ | ★★ | ★ | ★ |
| **T6 e-Akte / vault** | ★ | ★★★ | ★★ | ★★★★ | ★ |
| **T7 AI copilot** | ★★★ | ★ | ★ | ★ | ★★★ |

(`★` = 1 / 4, `★★★★` = 4 / 4 fit.)

### 10.2 Per-pilot-requirement fit

| Requirement | Naturally fits | Forced fit | Bad fit |
|---|---|---|---|
| FUNC-LP-001 SPOC | T2, T3 | T1, T4, T7 | T5, T6 |
| FUNC-LP-002 No-training | T3, T7 | T2 | T4, T5, T6 |
| FUNC-LP-004 Wizards | all | — | — |
| FUNC-AU-* Demand wizard | T2, T3, T7 | T1 (via map) | T4, T5, T6 |
| FUNC-FG-001 Per-field approval | T2 (§2.5), T6 | T3 | T1, T5, T7 |
| FUNC-PFM-* SAP handover ops | T4 | T2, T3 | T1, T5, T7 |
| FUNC-AU-023 Archive | T6 | T2, T3 | T1, T4, T5, T7 |
| FUNC-INB-001 Inbox | T2, T3 (table), T5 (kanban) | T1 (map+list), T4 (KPI) | T6, T7 |
| NFA-CD-003 DE/FR/IT | all | — | T7 (LLM quality varies) |

### 10.3 Recommended hybrid (pilot, v0.3)

> **Base for submitters: T3-Lite hero-CTA home (§3.6).** For a pilot with
> 1–2 actual services, lead with the service — a six-tile T3 catalogue
> grid for two real services looks empty and pushes the *one thing the
> user came to do* below a visual gallery. As scope grows (Reparatur,
> Umzug, Spezialreinigung), the layout evolves back toward the full T3
> catalogue.
>
> **Base for reviewers / PFM ops / admins: T2 role-routed home.** Roles
> with 4 h/day in the portal land on their queue (§2.3) or cockpit
> (§4.1), not on a catalogue. Role resolution happens immediately after
> eIAM login (see §3.6.3 routing).
>
> **Archive: T6 as deep-link to GEVER / Acta Nova** (closing W-6 toward
> the deep-link option). The in-portal vault tree from §6.1 is *not* in
> pilot scope; FUNC-AU-023 is served via a federated link to the federal
> records-management system. Saves a ~3-person-month UI build for a
> feature touched once per closed case.
>
> **Reviewer/PFM ops cockpit widgets: T4 collapsible (§4.1 v0.3).** No
> always-on KPI grid; collapsed by default; primary metric one line up
> top with two action CTAs (ePPM-Fehler, Auflagen). Dashboard fatigue
> avoided.
>
> **Secondary surfaces:** T1 spatial as a map view (§1.5 inbox-on-map,
> §1.3 building drill-in). Public pre-login map (§1.1) **statically
> rendered** — interactive marker map only after auth (pending OP-1 ISG
> classification resolution).
>
> **T7 chat: narrow scope.** Lookup, FAQ, document finding only. The
> §7.2 chat-to-wizard pre-fill is **roadmap, not pilot** (anchoring-bias
> on administrative decisions). Apertus on Swisscom Sovereign Cloud
> remains the target LLM; ISG classification gates production use.
>
> **T5 ticketing: out of pilot.** Marked deferred for the REQ-FA-005
> repair use case in Case A.

In practice that means the v0.3 pilot looks like:

- **Public landing:** T3-Lite hero CTA + small static map preview +
  Swiss Federal Hero. **No public marker map** until OP-1 closes.
- **Authenticated home (submitter):** §3.6.2 hero CTA + "your open items"
  band + secondary services list. Triplet metadata only on the news/FAQ
  band (FUNC-LP-009 v0.5 scope — action tiles plain).
- **Authenticated home (reviewer):** §2.3 queue with §2.3 collapsed KPI
  strip (Single one-line summary, expandable per-user).
- **Authenticated home (PFM ops):** §4.1 cockpit v0.3 — primary metric
  band + collapsed secondary KPIs + collapsed detail widgets.
- **Authenticated home (admin / BBL Campus):** §11.4 content editor.
- **Authenticated home (auditor):** §11.0.2 audit view.
- **Demand wizard:** stepper from §8.1 (Steps 1–3), §8.6 Step 4 with the
  v0.5-narrowed 7-field Grossantrag shape, §8.10 accordion Prüfen.
  Variants §8.7 SEM, §8.8 FDFA, §8.9 Greenfield route automatically.
- **Inbox:** table from §3.4 by default; map from §1.5 available as a
  view toggle. **Kanban (§5.1) out of pilot.**
- **Reviewer detail:** split-pane §9.1 on desktop (≥ 1280 px); inline
  §9.2 fallback on tablet; mobile reviewer surface explicitly desktop-
  only with `NotificationBanner` (v0.5 scope of FUNC-LP-008).
- **PFM ePPM handover ops:** §4.2 panel under the same shell.
- **Archive:** GEVER deep-link from §6.1; no in-portal tree.
- **Master data:** §11.2 — admin-only with four-eyes diff (§11.2 v0.3).
- **Resubmit loop:** §11.14 applicant-facing.
- **Keyboard, sessions, states:** §11.12, §11.13, §11.7.

What's explicitly **out** of the pilot:
- T1 public marker map (pending OP-1 ISG classification)
- T5 kanban — repair use case is Case A
- T6 in-portal vault tree — replaced by GEVER deep-link (W-6 leaning toward deep-link)
- T7 chat-to-wizard pre-fill — pending LLM-quality / anchoring-bias study
- §11.5.3 mobile reviewer split-pane parity — Should not Must
- §8.6 ePPM-tab annotations visible-by-default — behind toggle for reviewers/PFM only

### 10.4 Open design questions (carry into the next round)

| # | Question | Why it matters |
|---|---|---|
| W-1 | Confirm stepper as primary wizard with §8.2 accordion for "Prüfen" only | Sets the user-research target |
| W-2 | Test §9.1 vs §9.2 with two real GS reviewers | The reviewer view is the second-highest-traffic surface after the wizard |
| W-3 | Decide if T1 map is on the *authenticated home* or only a *secondary view* | If "secondary view": home stays under 5 s to render |
| W-4 | Decide if "your open items" band collapses when empty | First-time users shouldn't see an empty rail |
| W-5 | Decide whether T7 chat is in pilot scope (currently: roadmap) | ISG classification and Apertus availability gate this |
| W-6 | T6 vault: in-portal tree, or just "open in GEVER / Acta Nova" deep links? | If "deep link": one less product surface to maintain |
| W-7 | DE / FR / IT mode of language switch: per-content vs. per-user? | Federal Language Act vs. UX clarity |
| W-8 ✓ closed v0.3 | Mobile breakpoint and which views drop columns first | Three breakpoints pinned in §11.5; Must public / Should auth-mobile-likely; desk-bound surfaces may declare desktop-only with §9.2 fallback. Spec updated in REQUIREMENTS.md v0.5 FUNC-LP-008. |
| W-9 ✓ closed v0.3 | Empty-state copy for the inbox, wizard step 1, the public map | §11.7.1 pattern: glyph · headline · explanation · primary CTA · secondary CTA. |
| W-10 | Map provider outside Switzerland (FDFA/EDA postings) — swisstopo tiles only cover CH | Federal-policy and supplier-neutrality decision |
| W-11 | Greenfield "in WE-Anlage" — visible step on applicant pipeline, or hidden ops state? | Transparency vs. UX clutter |
| W-12 ✓ closed v0.3 | Bulk approval Begründung — one shared, or one per item? | §11.0.1: template optional, default off, server-side identical-text check requires explanation. |
| W-13 | Auditor / EFD role — read-only across all VEs, or scoped to one BLO? | NFA-COMP-012 audit authority scope |
| W-14 | Per-user widget preference store (cockpit §4.1 collapsible KPIs) | UX persistence vs. cross-device portability |
| W-15 | Silent eIAM token refresh — supported by BIT eIAM client library? | If not, §11.12.2 modal becomes the only path |

---

## 11. Cross-cutting views

Views that don't belong to a single typology but are needed for the pilot
to be complete: the **BK-bypass** detail variant, **admin and master-data**
surfaces, **content editor** and **downloads** self-service, **delegated
admin / substitution**, **mobile** sketches, and the **state library**
(empty / error / loading / validation / upload). Closing §11.10 is the
**content-metadata pattern** (FUNC-LP-009 — source / contact / last-updated
on every content item) referenced from every typology.

### 11.0 Reviewer batch approval & Auditor / Historie view

These are §9-family screens (reviewer surfaces) but didn't fit the four
layout-alternatives chapter. They go here because they cross multiple
typologies and roles.

#### 11.0.1 Batch approval modal (extends §2.3 queue)

A GS-Prüfer/in with 12+ pending items wants to clear obvious approvals at
once. FUNC-FG-003 requires written Begründung *per decision*; the modal
makes that explicit rather than silently sharing one Begründung across all
items.

```
┌─ Auswahl: 4 Anträge — Bulk-Aktion: „Genehmigen" ──────────────────────────────┐
│                                                                                │
│  Sie genehmigen die folgenden Anträge. Pro Antrag ist eine schriftliche        │
│  Begründung erforderlich (FUNC-FG-003 / NFA-COMP-003 / VwVG Art. 35).          │
│                                                                                │
│  Optionaler Vorschlagstext (nicht voreingestellt — Sie müssen ihn aktiv        │
│  übernehmen):                                                                  │
│  [ Formal vollständig, Rechtsgrundlage geprüft, keine Auflagen.             ]  │
│  [ ☐ als Vorschlag in alle Felder einsetzen ]   (v0.3: Default-off)            │
│                                                                                │
│  ──────────────────────────────────────────────────────────────────            │
│  BE-2026-014  Muster (UVEK)  Bundeshaus W                                      │
│  Begründung * [ leer — bitte ausfüllen                                       ] │
│                                                                                │
│  BE-2026-015  Wirz   (BAFU)  Ittigen                                           │
│  Begründung * [ leer — bitte ausfüllen                                       ] │
│                                                                                │
│  BE-2026-016  Keller (UVEK)  Bern                                              │
│  Begründung * [ leer — bitte ausfüllen                                       ] │
│                                                                                │
│  BE-2026-017  Berger (BAFU)  Ittigen                                           │
│  Begründung * [ leer — bitte ausfüllen                                       ] │
│  ──────────────────────────────────────────────────────────────────            │
│                                                                                │
│  ⚠ Server-Check vor dem Absenden: Wenn drei oder mehr Begründungen identisch   │
│    sind, fragt das System nach: „Sind diese vier Entscheide wirklich gleich   │
│    begründet? Bitte erläutern Sie kurz, warum eine identische Begründung       │
│    sachlich passend ist." Die Erläuterung wird zusätzlich auditiert.           │
│                                                                                │
│  ☐ Ich bestätige, dass jede Begründung den jeweiligen Antrag betrifft und      │
│     nicht nur eine Sammelaussage ist (Verwaltungsverfahrensrecht).             │
│                                                                                │
│           [ Abbrechen ]   [ 4 Anträge genehmigen ]                             │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **v0.3: template default-off** — the "in alle Felder einsetzen" checkbox
  is *unchecked* by default. Pre-checking it (as in v0.2) was a UX dark
  pattern that optimised reviewer throughput at the cost of the
  administrative-law standard VwVG Art. 35 demands.
- **Server-side identical-Begründung check** — if 3+ Begründungen are
  byte-identical, the server returns a soft block requiring an
  explanation ("why is the identical wording legally adequate for these
  four facts?"). The explanation is audit-logged alongside the decisions.
- **Confirmation checkbox** stays — it surfaces administrative-law
  awareness as a cognitive speed bump.
- **Reject-with-conditions bulk** is intentionally *not* offered —
  rejection has higher stakes and per-item Auflagen-Listen need individual
  attention.
- **Throughput cost** is real: a reviewer who would have approved 4 in
  90 s now spends ~5 min. That cost is the price of FUNC-FG-003 being a
  Must, not a nice-to-have.
- **Reqs:** FUNC-FG-002, FUNC-FG-003 (Begründung pro Entscheid),
  NFA-COMP-003 (administrative-law traceability), NFA-SEC-005 (audit
  trail), W-12 (closed in v0.3: keep template optional, default off, add
  server-side identical-text check).

#### 11.0.2 Auditor / Historie view (EFD audit role, NFA-COMP-012)

The auditor has read-only access across all VEs / departments per VILB
Art. 9. Filing-clerk view, no editing capability.

```
┌─ Audit-Zugang — D. Imbach (EFD Revisionsdienst)         [ Filter ▾ ] [ Export ]
├─────────────────────────────────────────────────────────────────────────────────┤
│  Suche [ 🔍 BE-2026, GS Prüfer Muster, Zeitraum 30 d                          ] │
│                                                                                 │
│  ┌─ Antrag BE-2026-014 — Bundeshaus W ──────────────────────────────────────┐  │
│  │  Status: in ePPM (Bedarfsmeldung BM-2026-000713)                          │  │
│  │  Beteiligte: A. Muster (Antrag) · J. Berger (GS UVEK) · L. Hofmann (PFM)   │  │
│  │  Korrelations-ID: MP-7Z3K-9F2M-8XQA                                            │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  Vollständige Audit-Spur (NFA-SEC-005, NFA-DATA-004)                            │
│  Zeit                       Akteur (eIAM-Sub.)       Aktion                     │
│  ──────────────────────────────────────────────────────────────────────────     │
│  12.05.2026 14:02:11        A. Muster (U.123.456)    Antrag erstellt            │
│  12.05.2026 14:02:11        System                   ID BE-2026-014 vergeben    │
│  12.05.2026 14:07:34        A. Muster (U.123.456)    Eingereicht                │
│  12.05.2026 14:07:35        System                   E-Mail GS UVEK gesendet    │
│  14.05.2026 09:00:02        J. Berger (U.654.321)    Zugewiesen                 │
│  16.05.2026 11:14:08        J. Berger (U.654.321)    Feld 4.11 FTE:             │
│                                                       Vorher 14 → Nachher 12    │
│                                                       Marker: OK mit Kommentar  │
│                                                       Begr.: "FTE-Annahme       │
│                                                              abgeglichen mit HR"│
│  16.05.2026 11:18:42        J. Berger (U.654.321)    Gesamtentscheid:           │
│                                                       Genehmigt mit Auflagen    │
│                                                       Begr.: "Klimanachweis bei │
│                                                              Anschlussantrag"   │
│  16.05.2026 11:18:43        System                   ePPM-Übergabe gestartet    │
│  16.05.2026 11:19:11        System                   ePPM ack BM-2026-000713    │
│  ──────────────────────────────────────────────────────────────────────────     │
│  Anhang-Integritäten:                                                           │
│   • WiBe.pdf                ✓ unverändert seit Einreichung   [ Hash anzeigen ▾ ]│
│   • Rechtsgrundlage.pdf     ✓ unverändert seit Einreichung   [ Hash anzeigen ▾ ]│
│   (SHA-256-Digests werden auf Klick eingeblendet und in den CSV-Export aufge-   │
│    nommen — auf dem Bildschirm wäre der Roh-Hash nur Lärm.)                     │
│                                                                                 │
│  [ Antrag als PDF herunterladen ]   [ Audit-Spur als CSV exportieren ]          │
│                                                                                 │
│  🔒 Lesezugriff. Änderungen sind im Audit-Rolle nicht möglich.                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Before/After diff per field** is the federal audit standard — not just
  "value changed" but the prior and new values, with actor and Begründung.
- **System events** (E-Mail, ePPM-Übergabe, ack) appear inline with user
  events on a single chronological spine — incident analysis works without
  cross-system grep (NFA-DATA-004 correlation ID makes this possible).
- **File integrity hashes** prove that uploaded attachments are the same
  ones the reviewer saw at decision time.
- **CSV export + PDF export** satisfy the typical audit work pattern (PDF
  to attach to the audit report, CSV for analytics).
- **Read-only chrome** — no edit buttons, no `[ ⋯ ▾ ]` menu, lock icon in
  the footer. The auditor role is a separate eIAM permission.
- **In other typologies:**
  - **T6 vault:** the Audit-Log is itself a 📄 in the case folder; opening
    it renders this same view.
  - **T4 cockpit:** the auditor view does not show KPI tiles — operational
    aggregates are out of audit scope.
- **Reqs:** NFA-COMP-012 (EFD audit), NFA-SEC-005 (audit trail),
  NFA-DATA-004 (correlation ID), FUNC-AU-022 (visible ID),
  FUNC-AU-023 (archived applications remain auditable).

### 11.1 BK bypass — applicant detail view (FUNC-FG-005)

The Federal Chancellery (BK) has no Generalsekretariat. The pipeline,
contacts, and notifications must reflect that — without the applicant ever
seeing a phantom "in GS-Prüfung" state.

```
┌─ Status-Pipeline (BK-Bypass) ──────────────────────────────────────────────────┐
│  [Entwurf]→[Eingereicht]→[in PFM-Prüfung ◐]→[genehmigt]→[in ePPM]→[abgeschl.] │
│                                                                                │
│  ℹ Da Antragsteller die Bundeskanzlei (BK) ist, entfällt der GS-Schritt        │
│    automatisch. Der Antrag liegt direkt bei BBL Portfolio-Management.          │
│    (Rechtsgrundlage: FUNC-FG-005 — BK hat keine GS.)                           │
└────────────────────────────────────────────────────────────────────────────────┘
┌─ Antrag BK-2026-007 — D. Vogel (BK)  ──────────────────────────────────────────┐
│  Eingereicht:    14.05.2026                                                    │
│  Status:         in PFM-Prüfung                                                │
│  Zugewiesen an:  L. Hofmann (BBL-PFM)         (statt GS-Prüfer/in)              │
│                                                                                │
│  Tabs: Daten | Anhänge | Historie | SAP                                        │
│  ──────────────────────────────────────────                                    │
│  Antragstyp     Kleinantrag                                                    │
│  VE / DEP       Bundeskanzlei (BK)                                             │
│  Adresse        Bundeshaus West, Bern                                          │
│  HNF2 / GF      45 m² / 90 m²                                                  │
│                                                                                │
│  Workflow-Vorschau:                                                            │
│    [Sie] → [BBL PFM]  ────────►  ⏱ Bearbeitungszeit gemäss BBL-PFM-SLA          │
│             ├─ genehmigt   → SAP ePPM                                          │
│             └─ Rückfrage   → zurück an Sie                                     │
│                                                                                │
│  (kein GS-Schritt — siehe Hinweis oben)                                        │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **Banner explains** the deviation in plain German so the BK ILBO doesn't
  experience the bypass as a bug.
- **PFM, not GS, is shown as Zuständig** — the auto-resolved contacts on
  Step 1 (FUNC-AU-001) already routed the application to BBL-PFM directly.
  No GS-Prüfer/in row exists for BK applications anywhere in the system.
- **GS reviewer queue (§2.3)** never receives BK applications — FUNC-FG-005
  enforces this at the workflow router, not just in the UI.
- **Workflow-Vorschau** uses the short two-hop chain (no GS hop).
- **In other typologies:**
  - **T6 vault:** the case folder for BK applications lacks the "GS-
    Prüfprotokoll" sub-folder (no such document exists).
  - **T4 cockpit:** BK applications appear in the PFM cockpit without
    passing through the "in GS-Prüfung" tile — useful diagnostic that the
    bypass works.
- **Reqs:** FUNC-FG-005 (BK bypass), FUNC-AU-001 (BBL contacts auto-derive
  to PFM for BK), FUNC-INB-002 (status reflects bypass), NFA-SEC-005
  (audit trail records bypass reason: "FUNC-FG-005 — BK").

### 11.2 Master-data maintenance (FUNC-CC-*)

The auto-calculations in §8.1 (HNF2/GF formulas), §8.7 (SEM berth pauschale)
and §8.8 (FDFA categories) read their numbers from master data. FUNC-CC-001/
-002/-003 require that BBL-PFM admins maintain these without an IT release.

```
┌─ Stammdaten · Bürowelten-Faktoren ─────────────────────────────────────────────┐
│ Tabs: [ NAW-Klassen ]  [ Belegungsfaktor ]  [ SEM Pauschalen ]  [ FDFA Kategorien ] │
│       [ PFM-Kategorien ]  [ UK-Kosten/m² ]  [ Möblierung CHF/m² ]                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ NAW-Klassen (FUNC-CC-001, FUNC-AU-014)                                          │
│                                                                                 │
│ Name *                       m²/FTE HNF2 *  m²/FTE GF *  Gültig ab    Aktiv     │
│ ──────────────────────────────────────────────────────────────────────────────  │
│ Konzentriert-Einzel           15.0           28.0         01.01.2025   ☑        │
│ Konzentriert-Gruppe           13.0           25.0         01.01.2025   ☑        │
│ Kollaborativ-Standard         12.0           24.0         01.01.2025   ☑        │
│ Kollaborativ-Open             10.0           21.0         01.01.2025   ☑        │
│ Hybrid-Activity-Based          9.0           20.0         01.07.2026   ☑        │
│ Sicherheit / Labor            18.0           34.0         01.01.2025   ☑        │
│ ──────────────────────────────────────────────────────────────────────────────  │
│ [ + Neue NAW-Klasse ]   [ Historie / Versionen ↗ ]                              │
│                                                                                 │
│ ⚠ Änderungen wirken auf alle neuen Anträge ab dem Speicherzeitpunkt; laufende   │
│   Entwürfe behalten ihre erfasste Klasse, bis der Antragsteller Schritt 2       │
│   erneut öffnet.                                                                │
│                                                                                 │
│ Pflicht 4-Augen-Prinzip: jede Änderung erfordert Freigabe durch zweite/n       │
│ PFM-Admin (siehe §11.0.2 Auditor-Spur).                                         │
└─────────────────────────────────────────────────────────────────────────────────┘

Diff-Ansicht zur Freigabe (zweite PFM-Admin sieht):

┌─ Freigabe ausstehend · NAW-Klasse „Hybrid-Activity-Based" ────────────────────┐
│  Bearbeitet von: T. Spiess (PFM-Admin)       am 17.05.2026, 14:08              │
│                                                                                │
│  Vorherige Werte             Neue Werte                                        │
│  ─────────────────────       ─────────────────────                             │
│  m²/FTE HNF2:  10.0          m²/FTE HNF2:  9.0    ⚠ −10 %                      │
│  m²/FTE GF:    21.0          m²/FTE GF:   20.0    ⚠ −4.8 %                     │
│  Gültig ab:    01.07.2026    Gültig ab:   01.07.2026   (unverändert)           │
│  Aktiv:        ☑             Aktiv:       ☑                                    │
│                                                                                │
│  Begründung der Änderung (T. Spiess):                                          │
│  [ Pilotergebnis Activity-Based-Working Studie 03/2026: bei Hybrid-Profilen    │
│    sind Flächenfaktoren um 10 % zu hoch. Empfehlung CC-PFM 2026-04.          ] │
│                                                                                │
│  [ Ablehnen mit Begründung … ]   [ Genehmigen — Wirksam ab Speicherung ]       │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **Tabs by master-data domain** rather than one giant table — each tab
  corresponds to a FUNC-CC-* item with its own data schema.
- **Validity-date semantics:** changes don't retroactively rewrite drafts;
  they apply to new entries from the save time. Reviewers comparing two
  applications six months apart can rely on stable per-application data.
- **Diff-view at four-eyes-approval time** (v0.3) — the second PFM-admin
  sees prior/new side-by-side with delta percentages. Without the diff,
  four-eyes approval is a rubber stamp; *with* it, the approver actually
  reviews the change.
- **Four-eyes principle** is non-negotiable for master data — every change
  is audit-logged with both PFM-admin identities and the previous/new value.
- **Versioning:** each row can be opened to see the change history (same
  table layout as §11.0.2 audit spur).
- **In other typologies:**
  - **T6 vault:** master data lives as 📁 Stammdaten / 📁 NAW-Klassen; each
    historical version is a separate 📄.
  - **T7 chat:** Apertus *never* edits master data — only the PFM-admin
    role through this UI.
- **Reqs:** FUNC-CC-001/-002/-003 (master data), NFA-IAM-003 (PFM-admin
  role), NFA-SEC-005 (audit), OP-8 (master-data ownership).

### 11.3 Delegated admin / Substitution (NFA-IAM-002)

A VE's authorisation administrator manages users *within* their VE — vacation
deputies for GS reviewers, role assignments, revocations. The wireframe
intentionally separates "user management" from "deputy assignment" because
the urgency profile differs.

```
┌─ Berechtigungsverwaltung · UVEK ───────────────────────────────────────────────┐
│ Tabs: [ Mitarbeitende (24) ]  [ Stellvertretungen (3) ]  [ Rollen ]            │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Stellvertretungen (aktiv: 3)                                                    │
│                                                                                 │
│ Vertretene Person    Rolle                 Stv-Person             Zeitraum     │
│ ──────────────────────────────────────────────────────────────────────────────  │
│ J. Berger             GS-Prüfer/in UVEK    M. Schneider          12.–23.05.   │
│ N. Frey (IM)          IM-Region Bern        C. Roth             20.–31.05.   │
│ — frei —             GS-Prüfer/in UVEK     T. Heller (Pikett)    laufend      │
│                                                                                 │
│ [ + Stellvertretung anlegen ]                                                   │
│                                                                                 │
│ Effekte einer aktiven Stv:                                                      │
│  • Pendenzen-Queue wird parallel angezeigt (gleichzeitiger Zugriff)             │
│  • E-Mail-Benachrichtigungen gehen an beide Personen                            │
│  • Audit-Spur: Aktion = Stv-Person; Hinweis "i.A. von J. Berger"                │
│  • Berechtigung endet automatisch zum konfigurierten Datum                      │
│  • Überlappungs-Check: wenn die vertretene Person 7 Tage nach Stv-Ende nicht    │
│    aktiv war (kein eIAM-Login auf MP), wird der VE-Admin per E-Mail gefragt:   │
│    „Soll die Vertretung verlängert werden?" — eine Antwort wird verlangt;       │
│    ohne Antwort bleibt der Status quo (keine stille Verlängerung).              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Three deputy patterns** captured in one row each: scheduled (with
  Zeitraum), open-ended (Pikett/Bereitschaftsdienst), and one-shot (rare).
- **Audit semantics** are explicit: deputy actions are logged under the
  deputy's name with an "i.A. von …" qualifier — federal administrative-
  procedure law requires the actual actor to be identifiable.
- **Overlap-detection (v0.3)** addresses a real federal pattern: extended
  leave often outlasts the original deputy end-date. The 7-day-after
  inactivity check prompts the VE-Admin without auto-extending — the
  decision stays with the human.
- **No IT-ticket needed** — this is the operational test for FUNC-IAM-002.
- **In other typologies:** identical screen; this is an admin surface
  with no typology-specific overlay.
- **Reqs:** NFA-IAM-002 (delegated admin), NFA-SEC-005 (deputy audit),
  FUNC-FG-004 (parallel notification routing).

### 11.4 Content editor / Self-publish (FUNC-LP-010)

BBL Campus (functional owner) edits portal content — news banners, FAQ
articles, training links, contact lists — without an IT release. A pragmatic
block-editor is enough; full WYSIWYG is overkill for this content profile.

```
┌─ Inhalt verwalten · UVEK / Allgemein   [ Vorschau ▾ ] [ Sprache: DE | FR | IT ]
├─────────────────────────────────────────────────────────────────────────────────┤
│  Slug: /hinweise/wartungsfenster-eppm-mai-2026                                 │
│  Typ:  Hinweis-Banner          Sichtbarkeit:  Alle Rollen                       │
│  Gültig: 18.05.2026 – 26.05.2026                                                │
│                                                                                 │
│  ┌─ Inhalt (Block-Editor) ──────────────────────────────────────────────────┐ │
│  │  H2:  Wartungsfenster ePPM, 25.05. 18:00–22:00                            │ │
│  │  P:   Einreichungen werden während des Fensters gepuffert und nach        │ │
│  │       Abschluss automatisch übergeben.                                    │ │
│  │  Link: weitere Informationen → /faq/eppm-wartung                          │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  Sprachfassungen (NFA-CD-003 v0.5 = Must, Sprachengesetz Art. 6/11):           │
│   ✓ DE — vollständig                                                            │
│   ⚠ FR — fehlt                                                                  │
│   ⚠ IT — fehlt                                                                  │
│                                                                                 │
│  Veröffentlichung ohne FR/IT erfordert eine Sprachengesetz-Derogation:          │
│  ☐ Ich beantrage Veröffentlichung in DE allein.                                 │
│    Begründung *  [ Wartungshinweis dringend; FR/IT werden in 24 h           ]   │
│                  [ nachgeliefert durch Sprachendienst BIT.                   ]  │
│    (wird im Compliance-Audit-Log dokumentiert — NFA-SEC-005)                    │
│                                                                                 │
│  Quelle / Verantwortlich (Pflicht, FUNC-LP-009):                                │
│    Quelle:           [ BIT Betrieb                                          ] │
│    Verantwortlich:   [ E. Frey (BBL Campus)                                 ] │
│    Stand:            17.05.2026 (auto)                                          │
│                                                                                 │
│  [ Entwurf speichern ]  [ 4-Augen zur Freigabe ]  [ Veröffentlichen ]           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Source/contact/last-updated are mandatory editor fields** — the
  metadata triplet from FUNC-LP-009 v0.5 / NFA-UX-004 is enforced at
  publish time for **content items** (this Hinweis-Banner is content).
- **Sprachfassungen are now a Must** (NFA-CD-003 v0.5, citing Sprachengesetz
  SR 441.1 Art. 6 + Art. 11): publishing DE-only is permitted **only** with
  a documented derogation. The editor surfaces this as a checkbox + a
  mandatory Begründung textarea; the derogation is audit-logged.
- The published article still shows all three language tabs on the
  rendered page — clicking a missing language reveals the derogation
  reason ("Diese Fassung wird in den nächsten 24 h nachgeliefert") so
  the federal tenant sees the reason, not silent missing content.
- **Four-eyes-to-publish optional** for hinweis-class content, mandatory
  for FAQ/policy. Configured per content type.
- **In other typologies:** identical surface — content editing is admin
  vocabulary regardless of which typology the public-facing portal uses.
- **Reqs:** FUNC-LP-010 (self-publish), FUNC-LP-009 v0.5 / NFA-UX-004
  (metadata triplet on content items), NFA-CD-002 (Web Guidelines vocab),
  NFA-CD-003 v0.5 (DE/FR/IT now Must — derogation requires Begründung),
  NFA-SEC-005 (derogation audit).

### 11.5 Mobile / responsive (FUNC-LP-008, NFA-CD-004) — v0.5 three-breakpoint scope

Three breakpoints, scoped by role per the v0.5 spec
([REQUIREMENTS.md FUNC-LP-008](REQUIREMENTS.md)):

| Breakpoint | px range | Behaviour | Scope per v0.5 |
|---|---|---|---|
| Desktop | ≥ 1280 | Full multi-column layouts (T1 map+list, §2.5 split-pane, §4.1 cockpit). | **Must** for all roles |
| Tablet | 768–1279 | Split-pane collapses to stacked; reviewer uses §9.2 inline marks; cockpit KPIs go single-column. | **Must** public; **Should** for all auth. roles |
| Mobile | < 768 | Single column; map hidden behind a `Mehr ▾` chip; wizard steps one per screen with bottom-sheet step indicator. | **Must** public; **Should** for mobile-likely roles (ILBO submitter: wizard, inbox, detail, downloads). |

**Desk-bound roles** (GS reviewer split-pane, BBL-PFM cockpit, auditor /
Historie, master-data maintenance) may declare desktop-only at < 1280 px
with a graceful fallback — the §2.5 split-pane redirects to §9.2 inline
marks, and the §11.0.2 audit-spur shows a non-blocking `NotificationBanner`
"Diese Ansicht ist für Desktop optimiert. Bitte verwenden Sie ein Endgerät
mit Bildschirmbreite ≥ 1280 px, oder fahren Sie hier mit eingeschränkter
Darstellung fort." (the banner is *informational*, not blocking — the user
can still proceed).

Three mobile sketches — one per typology family — covering the public landing,
the wizard, and the inbox.

#### 11.5.1 Public landing (T3 service catalogue, mobile)

```
┌─────────────────────────┐
│ ☰  Mieterportal         │
│ 🇨🇭 Schweiz. Eidgen.    │
│   DE FR IT   🔔  Login  │
├─────────────────────────┤
│ Mieterportal des BBL    │
│ Alle Dienste rund um    │
│ Ihre Bundesimmobilien.  │
│                         │
│ [ Mit eIAM anmelden ↗ ] │
├─────────────────────────┤
│ ┌─ Unterbringung ─────┐ │
│ │ Bedarf anmelden     │ │
│ │ Login erforderlich  │ │
│ └─────────────────────┘ │
│ ┌─ Reparatur / Service┐ │
│ │ Schaden melden      │ │
│ │ (verf. nach Login)  │ │
│ └─────────────────────┘ │
│ ┌─ Pläne & Dokumente ─┐ │
│ │ Grundrisse, …       │ │
│ │ Login erforderlich  │ │
│ └─────────────────────┘ │
│ ─── mehr ▾ ───          │
├─────────────────────────┤
│ Impressum · Datenschutz │
│ Barrierefreiheit · Kont.│
└─────────────────────────┘
```

- Tiles stack vertically; **no metadata triplet on action tiles** (v0.5
  scope of FUNC-LP-009). Metadata triplet is reserved for content tiles
  (FAQ, downloads, news), which on mobile collapse to a single line
  `Quelle · Stand` — see §11.6.
- The four-language wordmark abbreviates to "Schweiz. Eidgen." with the
  CH flag — full wordmark accessible via tap on the meta-bar (`Hinweise`
  expand).
- Hamburger reveals the main nav (role-aware after login).

#### 11.5.2 Wizard Step 2 (mobile, NAW + Berechnung)

```
┌─────────────────────────┐
│ ← Schritt 2 / 5         │
│ [●●○○○] Fläche          │
├─────────────────────────┤
│ NAW-Klassifizierung     │
│ ─────────────────────── │
│ Schwerpunkt             │
│ ( ) Konzentriert        │
│ (●) Kollaborativ        │
│ ( ) Mix                 │
│                         │
│ Remote-Anteil           │
│ [ 30 %            ▾ ]   │
│                         │
│ Vertraulichkeit         │
│ (●) mittel  ▾           │
│                         │
│ ▸ Weitere Fragen ▾      │
├─────────────────────────┤
│ NAW-Klasse:             │
│ **Kollab.-Standard**    │
│ m²/FTE HNF2: 12         │
│ m²/FTE GF  : 24         │
├─────────────────────────┤
│ Berechnung              │
│ FTE                     │
│ [ 8                   ] │
│ Belegungsfaktor 0.8 🔒  │
│ ─────────────────────── │
│ HNF2  77 m²             │
│ GF   154 m²             │
│ UK    CHF 462 000       │
│ Möbl. CHF  50 050       │
│ ⚠ 65 CHF/m² GF (über 60)│
├─────────────────────────┤
│ [ Entwurf speichern ]   │
│ [ Weiter → Anhänge   ]  │
└─────────────────────────┘
```

- StepIndicator becomes a dot-array `[●●○○○]` to save horizontal space.
- "Weitere Fragen ▾" hides the secondary NAW questions behind a disclosure
  — the primary three drive 90% of the classification.
- The full calculation block is preserved (single-column) so the applicant
  sees the same numbers as on desktop — audit consistency.
- Sticky bottom CTA bar holds the two primary actions.

#### 11.5.3 Inbox (T3 table, mobile)

```
┌─────────────────────────┐
│ ☰  Meine Anträge        │
├─────────────────────────┤
│ Tab: [ Offen 3 ][Abges.]│
│      [ Entwürfe 1 ]     │
├─────────────────────────┤
│ [ Filter ▾ ] [ 🔍 ]     │
├─────────────────────────┤
│ BE-2026-014             │
│ Bundeshaus W, Bern      │
│ ◐ in GS-Prüfung         │
│ Eingereicht 12.05.      │
│ ───────                 │
│ SEM-2026-002            │
│ Empfangsz. Boudry       │
│ ● eingereicht           │
│ Eingereicht 11.05.      │
│ ───────                 │
│ Z-7-204                 │
│ Sulgenrain 19, Bern     │
│ ◐ in Arbeit             │
│ Eingereicht 09.05.      │
├─────────────────────────┤
│ Seite 1 / 1             │
└─────────────────────────┘
```

- Table → stacked cards; status glyph from family (a) at the top of each
  card; filters collapse behind a `[ Filter ▾ ]` chip.
- Tabs become a horizontal scroller if more than three.

#### 11.5.4 What does NOT degrade gracefully

The §2.5 GS-reviewer split-pane and the §11.0.2 audit-spur table are
**explicitly desktop-only** for the pilot — flagged with a `NotificationBanner`
that says "Diese Ansicht ist für Desktop optimiert. Bitte verwenden Sie ein
Endgerät mit Bildschirmbreite ≥ 1280 px." Per FUNC-LP-008, mobile parity
is *Should*-tier for public content only.

- **In other typologies:**
  - **T1 spatial:** mobile public landing replaces the map with a "Karte
    öffnen ↗" CTA — leafleting a Switzerland-wide map on mobile burns
    battery and gives no information density advantage.
  - **T7 chat:** is naturally mobile-first; the chat box fills the screen
    and the suggestion chips wrap.
- **Reqs:** FUNC-LP-008 (responsive — Should), NFA-CD-004 (WCAG AA on
  mobile too), W-8 (breakpoint decision now pinned).

### 11.6 Self-service downloads (FUNC-LP-007)

Plans, Merkblätter, Schulungen — the content that today lives in PDF
attachments to e-mails should be self-service.

```
┌─ Downloads ────────────────────────────────────────────────────────────────────┐
│ Sie sehen: alle für UVEK freigegebenen + öffentliche Dateien      [ Sichtbarkeit ▾ ]
│ Filter: [ Typ ▾ ] [ Gebäude ▾ ] [ Sprache ▾ ] [ Stand ab ▾ ]    [ 🔍 Suchen ]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Grundrisse Bundeshaus West ────────────────────────────────────────────┐    │
│ │  📐 PDF · 4.2 MB · DE · Stand 15.03.2026               [Sichtbar: UVEK] │    │
│ │  Quelle: BBL-IM · Verantwortlich: N. Frey · 🟢 verifiziert              │    │
│ │  [ Vorschau ] [ Herunterladen ↓ ]                                         │    │
│ └─────────────────────────────────────────────────────────────────────────┘    │
│ ┌─ Merkblatt „Antrag richtig stellen" ─────────────────────────────────────┐    │
│ │  📄 PDF · 320 KB · DE/FR/IT · Stand 11.05.2026         [Sichtbar: Alle] │    │
│ │  Quelle: BBL Campus · Verantwortlich: E. Frey · 🟢 verifiziert          │    │
│ │  [ Herunterladen ↓ ]                                                       │    │
│ └─────────────────────────────────────────────────────────────────────────┘    │
│ ┌─ Schulung „Mieterportal kompakt" (60 min) ───────────────────────────────┐    │
│ │  🎥 MP4 · 245 MB · DE · Stand 13.05.2026               [Sichtbar: Alle] │    │
│ │  Quelle: BBL Campus · Verantwortlich: T. Spiess · 🟢 verifiziert        │    │
│ │  [ Anschauen ↗ ] [ Folien herunterladen ↓ ]                               │    │
│ └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│   Seite 1 / 4 — 23 Dokumente                                  [ Export Liste ]  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Each tile renders the FUNC-LP-009 metadata triplet** (Quelle ·
  Verantwortlich · Stand) — these *are* content items in the v0.5 scope,
  so the triplet applies; see §11.8 for the pattern spec.
- **Visible role-filter badge** (v0.3) — each tile shows the
  `[Sichtbar: …]` chip so the user understands *why* this document is in
  their list. The header line above the filters states the user's current
  scope ("Sie sehen: alle für UVEK freigegebenen + öffentliche Dateien").
- **Role-filtered visibility:** if a Mieter-ILBO browses, they see public
  + their-VE content; a PFM admin sees everything; a BK ILBO sees BK
  + cross-cutting.
- **In other typologies:**
  - **T1 spatial:** filter "Gebäude" auto-populates from a building
    selected on the map; clicking a building marker on §1.3 deep-links to
    `Downloads?gebaeude=BHW`.
  - **T6 vault:** the same files appear as 📄 in the 📁 Schulungen /
    Pläne / Merkblätter sub-folders.
- **Reqs:** FUNC-LP-007 (downloads), FUNC-LP-009 (metadata), NFA-IAM-003
  (role-filter), NFA-SEC-003 (malware-scanned files only).

### 11.7 State library — empty / error / loading / validation / upload

Closes W-9. Five state families to render consistently across every
typology; each gets a canonical sketch.

#### 11.7.1 Empty states

```
┌─ Inbox: keine Anträge ─────────────────────────────────────────────────────────┐
│                                                                                │
│                            📭                                                  │
│                                                                                │
│        Sie haben derzeit keine Anträge in Bearbeitung.                         │
│                                                                                │
│        Tipp: Beginnen Sie mit einer Bedarfsanmeldung, um Bürofläche,           │
│        Übernachtungsplätze oder eine Auslandvertretung zu beantragen.          │
│                                                                                │
│           [ + Bedarf anmelden ]   [ Wie funktioniert das Portal? ↗ ]           │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘

┌─ Karte (öffentlich): nichts in der Region ─────────────────────────────────────┐
│                                                                                │
│                              🗺                                                │
│       Keine Bundesimmobilien in diesem Kartenausschnitt sichtbar.              │
│       Versuchen Sie:  [ Auf Schweiz zoomen ]  [ Filter zurücksetzen ]          │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

Pattern: **glyph · headline · explanation · primary CTA · secondary CTA**.
No empty pages — every empty state proposes the next action.

#### 11.7.2 Loading / skeleton states

```
┌─ Inbox lädt … ─────────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓ · ▓▓▓▓▓▓▓▓▓ ▓▓▓                  ▓▓▓▓▓▓        ▓▓▓▓▓▓▓▓        │
│ ▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓ · ▓▓▓▓▓▓▓▓▓ ▓▓▓                  ▓▓▓▓▓▓        ▓▓▓▓▓▓▓▓        │
│ ▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓ · ▓▓▓▓▓▓▓▓▓ ▓▓▓                  ▓▓▓▓▓▓        ▓▓▓▓▓▓▓▓        │
│                                                                                │
│   ⏳ Daten werden geladen …                                                     │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **Skeleton blocks** match the shape of the eventual content (table rows
  vs. card grid vs. wizard fields).
- ARIA: `<div aria-busy="true" aria-live="polite">…</div>` for screen
  readers (NFA-CD-004).
- After 3 s with no response, append "Antwort dauert länger als erwartet
  …" without dismissing the skeleton.

#### 11.7.3 Validation states (wizard fields)

```
HNF2 (auto)
77 m²                                ✓ ok (live, NAW × Belegungsfaktor)

FTE *
[                       ]            ⚠ Pflichtfeld — bitte ausfüllen
                                       (rot, nur nach erstem Blur)

UK-Kosten / m² GF
65 CHF/m²                            ⚠ über 60 CHF — Begründung in Schritt 5
                                       (gelb, Hinweis, blockiert nicht)

Adresse *
Eichweg 22, Bern                     ✓ erkannt: SAP 1086/2010/AA, EGID 100123456
                                       (grün, mit Auto-Quelle-Badge)

Adresse *
Neufeldstrasse 99, Bern              ◼ Greenfield — keine WE im Stammdatensatz
                                       (neutral, kein Fehler — siehe §8.9)
```

- **Four severity tiers** mapped to the §0.3 colour tokens:
  `✓ ok` (grün), `⚠ Hinweis` (gelb, nicht blockierend), `⚠ Pflicht`
  (rot, blockiert Weiter), `◼ Greenfield` / Sonderfall (neutral).
- **Validation timing:** required-field errors appear only after first
  blur or on attempting to advance; warnings appear immediately as values
  change.
- ARIA: each error linked to its field via `aria-describedby`.

#### 11.7.4 File-upload states (FUNC-AU-008, NFA-SEC-003)

```
┌─ Anhang hochladen ─────────────────────────────────────────────────────────────┐
│                                                                                │
│         📎  Datei hierher ziehen oder  [ Durchsuchen … ]                       │
│                                                                                │
│         Erlaubt: PDF, DOCX, XLSX, JPG, PNG · max. 25 MB · max. 10 Dateien      │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘

  Während Upload:
  WiBe.pdf  (1.2 MB)   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  68 %    [ Abbrechen ✕ ]

  Nach Upload, Virenscan läuft:
  WiBe.pdf  (1.2 MB)   ✓ hochgeladen   ⏳ Virenscan läuft …                      │

  Nach Virenscan ok:
  WiBe.pdf  (1.2 MB)   🟢 Virenscan ok  Quelle: A. Muster · 17.05.2026   [ ✕ ]

  Nach Virenscan fehlgeschlagen (NFA-SEC-003):
  rechnung.docx  (820 KB)   ✕ Datei abgelehnt — Schadsoftware erkannt.
                              Die Datei wurde nicht gespeichert.
                              Wenden Sie sich bei Fragen an: support@bbl.admin.ch

  Format nicht erlaubt:
  movie.mp4  (220 MB)       ✕ Dateityp .mp4 nicht zulässig.
```

- **Three blocking states + one non-blocking pending state.**
- Malware-scan happens server-side; while it runs the file is not yet
  attached to the application — the wizard can be continued but the
  Step-5 readiness counter waits.
- **No re-upload of malware-flagged file** — the user must contact
  support; that channel is a deliberate friction so attempts can be
  investigated.

#### 11.7.5 Network / system error states

```
┌─ Antrag konnte nicht eingereicht werden ───────────────────────────────────────┐
│                                                                                │
│                                  ⚠                                             │
│                                                                                │
│   Verbindung zur Bundesverwaltung unterbrochen.                                │
│   Ihr Entwurf BE-2026-DRAFT-014 wurde lokal zwischengespeichert (Auto-Save).   │
│                                                                                │
│   Bitte versuchen Sie es in einigen Minuten erneut.                            │
│                                                                                │
│   Wenn das Problem anhält, melden Sie sich bei:                                │
│   IT-Support BIT — service-desk@bit.admin.ch · 058 466 86 00                   │
│   Korrelations-ID:  MP-7Z3K-9F2M-8XQA                                               │
│                                                                                │
│              [ Erneut versuchen ↻ ]   [ Zur Inbox zurück ]                     │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **Always show the correlation ID** in error states — the BIT service
  desk uses it to look up the incident in Grafana / log aggregation
  (NFA-DATA-004).
- **Correlation-ID format is opaque** (v0.3 — was `MP-2026-A7C3` in v0.2).
  Format: `MP-XXXX-YYYY-ZZZZ` where each block is a 4-character random
  alphanumeric, generated server-side, time-limited (24 h) and not
  reusable across applications. Year/sequence are **not** embedded in
  the format — federal best practice for user-visible IDs is opacity so
  the visible value can't be incremented or enumerated. The internal
  log key remains structured for ops.
- Auto-save reassurance is part of the error — reduces the panic that
  "my hour of typing is gone."
- "Erneut versuchen" is a stateless retry of the last action.

#### 11.7.6 Applicant-side ePPM-failure surface

When FUNC-PFM-004 (operator retry) is in progress, the applicant doesn't see
"ePPM-Fehler" — they see "Übergabe an SAP läuft …" with a soft retry
indicator. Failures only surface to the applicant if the operator's retries
exhaust:

```
┌─ Antrag BE-2026-014 ───────────────────────────────────────────────────────────┐
│  Status: ⚠ Übergabe an SAP verzögert                                           │
│                                                                                │
│  Ihr Antrag wurde genehmigt. Die automatische Übergabe an SAP ePPM ist         │
│  zurzeit nicht möglich. Das BBL-Betriebsteam ist informiert und wird die       │
│  Übergabe nachholen, sobald die Verbindung wieder verfügbar ist.               │
│                                                                                │
│  Sie müssen nichts unternehmen. Sie werden benachrichtigt, sobald die          │
│  Übergabe erfolgt ist.                                                         │
│                                                                                │
│  Korrelations-ID: MP-7Z3K-9F2M-8XQA                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **Applicants never see SAP error codes.** Operational diagnostics live
  in §4.2 (PFM cockpit); applicants get a calm, reassuring message that
  no action is required from them.
- **In other typologies:**
  - **T7 chat:** Apertus may proactively summarise: "Die Übergabe an SAP
    ist verzögert — Sie müssen nichts tun."
  - **T4 cockpit:** the operator's view of the same incident is the row
    in §4.2 with retry actions.
- **Reqs:** FUNC-PFM-003 (notify involved roles), FUNC-PFM-004 (reprocess),
  NFA-DATA-004 (correlation ID), NFA-INT-005 (ack semantics), W-13.

### 11.8 Content-metadata pattern (FUNC-LP-009 / NFA-UX-004) — v0.5 scope

FUNC-LP-009 v0.5 requires the triplet (a) source, (b) responsible contact,
(c) last-updated date on every **published informational content item** —
FAQ articles, news banners, downloads, training materials, knowledge-base
entries. **Action surfaces (wizard launchers, buttons, navigation tiles)
are explicitly out of scope** per the v0.5 narrowing — they show the
service label and the role-gate text, and stop there.

What counts as a content item (triplet **required**):
- FAQ articles, knowledge-base entries
- News banners and hinweise (e.g. "Wartungsfenster ePPM 25.05.")
- Downloadable files (PDF Merkblätter, plans, training MP4)
- Long-form policy or directive text rendered in the portal

What is **not** a content item (triplet **forbidden** — would be noise):
- Wizard launcher tiles ("Bedarf anmelden")
- Navigation tiles ("Status & Inbox", "Pläne & Dokumente")
- Buttons, status badges, form fields, validation messages
- StepIndicator, breadcrumbs, footer links

```
Article-Metadata (kanonisch) — Sub-Header bei langen Inhalten:

  ┌───────────────────────────────────────────────────────────────┐
  │  Antrag richtig stellen                                       │
  │                                                               │
  │  Quelle:           BBL Campus                                 │
  │  Verantwortlich:   E. Frey  (e.frey@bbl.admin.ch)             │
  │  Stand:            11. Mai 2026                               │
  │  Sprachfassungen:  DE  ·  FR  ·  IT       (NFA-CD-003 Must)   │
  │                                                               │
  │  ───────────────────────────────────────────────              │
  │                                                               │
  │  Diese Anleitung erklärt …                                    │
  └───────────────────────────────────────────────────────────────┘

Download-Metadata (Inline) — Teil der Tile in §11.6:

  📄 Merkblatt „Antrag richtig stellen"
  PDF · 320 KB · DE/FR/IT · Quelle BBL Campus · E. Frey · Stand 11.05.2026
  🟢 verifiziert

News-Banner-Metadata (kompakt) — Eine Zeile unter dem Banner:

  Wartungsfenster ePPM, 25.05. 18:00–22:00
  Einreichungen werden gepuffert.
  ─── Quelle BIT Betrieb · E. Frey (BBL Campus) · Stand 17.05.2026 ───

NICHT zu rendern (v0.5 explicit out-of-scope):

  ┌─ Bedarf anmelden ───────┐      ← Action-Tile: KEIN Triplet.
  │ Unterbringung beantragen│         Triplet hier wäre Lärm und
  │ und Bedarf erfassen     │         verletzt das v0.5-Scope-
  │ [ Antrag starten → ]    │         Narrowing.
  └─────────────────────────┘
```

- **Three render-shapes** (Article, Download-Inline, News-Banner-Compact)
  but **one schema**. Aliased once in the design system as a `<MetaFooter>`
  Web Component so every consumer renders the same fields in the same
  order. Implementation note for the v0.3 prototype.
- **Sprachfassungen line** is part of NFA-CD-003 v0.5 (now Must) governance:
  every content item must show all three Swiss official languages. If a
  language is missing, the renderer falls back to DE with an inline
  derogation marker that the BBL-Campus content owner has documented in
  the audit log.
- **Last-updated date is auto-set** to the publish-or-last-edit timestamp;
  the editor cannot override it (NFA-SEC-005 — content audit).
- **Per-typology placement** depends on the content shape, not the host
  typology — Article-Metadata appears in T6 vault, in §11.4 editor preview,
  and in deep-linked FAQ articles regardless of which typology hosts them.
- **Reqs:** FUNC-LP-009 v0.5 (content items only — Must), NFA-UX-004 v0.5
  (same intent, narrowed scope), NFA-CD-003 v0.5 (Sprachfassungen visible
  — Must), W010 §2.7 (Trustworthiness).

### 11.9 Print stylesheet & "Antrag drucken" affordance

Federal habit: a printable decision document is often the keepsake. Each
detail view (§1.6, §2.5, §3.5) has a `[ Drucken / PDF ]` action that
renders an A4-ready print stylesheet — chrome stripped, single column,
metadata triplet preserved, audit-spur appended.

```
┌─ A4-Druckansicht — Antrag BE-2026-014 ────────────────────────────────────────┐
│  Bundesamt für Bauten und Logistik (BBL) — Mieterportal                       │
│  Antrag BE-2026-014                                                           │
│  Stand: 17.05.2026 · Korrelations-ID MP-7Z3K-9F2M-8XQA                             │
│  ──────────────────────────────────────────────────────────────               │
│  Antragsteller       Andrea Muster (UVEK / BAFU)                              │
│  Antragstyp          Kleinantrag                                              │
│  Status              in GS-Prüfung                                            │
│  Eingereicht         12.05.2026                                               │
│                                                                               │
│  Basisangaben    [Formulardaten Schritt 1]                                    │
│  Flächenbedarf   [Formulardaten Schritt 2 mit Berechnung]                     │
│  Anhänge         WiBe.pdf (SHA-256 e3b0…), Rechtsgrundlage.pdf (SHA-256 a591…)│
│                                                                               │
│  Bisherige Entscheide / Marker je Feld:                                       │
│  [Tabelle aus Audit-Spur §11.0.2]                                             │
│                                                                               │
│  Diese Druckfassung ist informativ; rechtsverbindlich ist der Eintrag         │
│  im Mieterportal mit der oben genannten ID.                                   │
└───────────────────────────────────────────────────────────────────────────────┘
```

- **Footer carries an information-only disclaimer** so a printed copy is
  not mistaken for the legally binding record.
- **SHA-256** of each attachment ensures the printed evidence is tied to
  the same files that exist in the system.
- **Decision actor IS visible** (v0.3 update — was hidden in v0.2): the
  printed page includes the name of the deciding GS reviewer or PFM
  officer and the decision date. The reasoning in v0.2 ("a print can
  leave the building, omit identifiers") was wrong — a federal decision
  *with* the actor is the public record once decided; omitting the actor
  strips evidentiary value. The eIAM **subject-ID** (the technical token)
  stays out of the print; the **human name** stays in.

### 11.10 Required-field marker conventions — `*` vs. optional-mark

FUNC-AU-011 requires that every field be "marked clearly as either
mandatory (Muss) or optional (Kann)" — it does **not** dictate the
convention. Two variants worth user-testing on the wizard:

#### 11.10.1 Variant A — mark mandatory fields with `*` (familiar, default)

```
Kurzbeschreibung *           [                                              ]
Defizite *                   [                                              ]
Termin (Start) *             [ 01.03.2027 ▾ ]
Nutzen-Kosten (optional)     [                                              ]
```

- **Pro:** universally recognised; matches the existing federal form
  vocabulary; works out of the box with screen readers (`aria-required`).
- **Con:** in a Step-4 form where every field is required, `*` everywhere
  becomes visual noise that means "this is a form" rather than "this
  specific field is required".

#### 11.10.2 Variant B — mark optional fields (NN/g, gov.uk-recommended for mostly-mandatory forms)

```
Kurzbeschreibung             [                                              ]
Defizite                     [                                              ]
Termin (Start)               [ 01.03.2027 ▾ ]
Nutzen-Kosten  (optional)    [                                              ]
```

- **Pro:** quieter visual rhythm; signals "this field is unusual — you may
  skip it" with intention; matches NN/g and gov.uk form-design guidance
  for forms where >70% of fields are required.
- **Con:** federal users have been trained on `*` for two decades;
  breaking the convention requires explicit copy at the top of the form
  ("Alle Felder sind Pflicht, ausser explizit als *(optional)* markiert").

#### 11.10.3 Recommendation

**Variant A** for the pilot (lower risk; matches federal CD vocabulary).
**A/B test Variant B** specifically on the §8.6 Step 4 Grossantrag screen,
where 7 of 8 visible fields are mandatory — that's the screen where the
benefit would be highest. Make the convention a master-data setting so a
flip is one config change away.

- **Reqs:** FUNC-AU-011 (Muss/Kann marking), NFA-CD-002 (federal vocab).

### 11.11 NAW classification with confidence + override (FUNC-AU-004)

The five questions in §8.1 can point to inconsistent NAW classes (e.g.
"Konzentriert" + "Labor" + 70% remote). Instead of silently picking one,
show the derivation, the confidence, and let the applicant override with
a recorded reason.

```
┌─ A · NAW-Klassifizierung (Arbeitsstil) ─────────────────────────────────────────┐
│  [ Fragebogen wie §8.1 ]                                                        │
│                                                                                 │
│  → Empfohlene NAW-Klasse:    **Kollaborativ-Standard**  (Konfidenz 84 %)        │
│    └ Alternative:             Sicherheit / Labor       (Konfidenz 12 %)         │
│       basierend auf: Spezialausstattung „Labor" gewählt                         │
│                                                                                 │
│    [ Empfehlung übernehmen ]   [ Andere Klasse wählen ▾ ]                       │
│                                                                                 │
│  ┌─ Wenn „Andere Klasse wählen" gewählt: ──────────────────────────────────┐  │
│  │  Klasse *           [ Sicherheit / Labor                          ▾ ]    │  │
│  │  Begründung *       [ Hauptanteil Labortätigkeit; kollab. Anteil       ] │  │
│  │                     [ ist marginal — Sicherheitsprofil dominiert.       ] │  │
│  │  ⓘ Die Begründung wird im Audit-Log und auf der Antragsdetailseite      │  │
│  │     angezeigt (NFA-SEC-005). Der GS-Prüfer/in sieht sie auf §2.5.       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Recommendation, not silent pick.** The applicant always sees *which*
  class was inferred and *why* — never a black-box "0.80".
- **Confidence is a percent**, calibrated from the questionnaire-to-class
  mapping in master data. Below 70 % confidence the UI nudges harder
  ("Bitte prüfen Sie die Klassifizierung — die Fragen lassen mehrere
  Klassen plausibel erscheinen").
- **Override requires Begründung** — short, mandatory; the reviewer sees
  the same Begründung in §2.5 and decides whether the override is
  reasonable. Audit-logged.
- **Two alternatives shown by default** — more would be noise; the second
  highlights the *real* tension the questionnaire revealed.
- **Reqs:** FUNC-AU-004 (NAW questionnaire → factor), NFA-SEC-005
  (override audit), NFA-COMP-003 (override traceability).

### 11.12 Session expiry mid-wizard

eIAM sessions have a TTL (typically 30–60 min). A wizard that takes 20–40
min to fill the first time will hit expiry. The auto-save covers data;
the session must be refreshed without losing wizard step or scroll
position.

#### 11.12.1 Silent refresh (preferred, no user friction)

```
Background timing — invisible to the user:

   t = 0       Wizard opened, eIAM access token issued (TTL 30 min)
   t = 25 min  Silent refresh attempt via refresh-token (still valid)
                → new access token, wizard continues unbroken
   t = 50 min  Second silent refresh attempt
                → new access token; wizard continues
   t ≥ 60 min  Refresh token expires → cannot refresh silently → §11.12.2
```

- **Default behaviour for active wizards.** The portal attempts a silent
  refresh ~5 min before the access-token TTL. The user sees nothing.
- **Idle-tab caveat:** if the wizard tab is idle for >60 min, the refresh
  token expires; silent refresh fails. Then §11.12.2 modal.

#### 11.12.2 Modal re-authentication (when silent refresh fails)

```
┌─ Sitzung abgelaufen ───────────────────────────────────────────────────────────┐
│                                                                                │
│   Ihre Anmeldung ist abgelaufen.                                               │
│                                                                                │
│   ✓ Ihr Entwurf BE-2026-DRAFT-014 ist gespeichert (Auto-Save 24 s vor          │
│     Sitzungs-Ende).                                                             │
│                                                                                │
│   Bitte melden Sie sich erneut über eIAM an — Sie kehren danach exakt zu       │
│   Schritt 4 / Sektion B zurück. Ihre Eingaben bleiben erhalten.                │
│                                                                                │
│   [ Erneut über eIAM anmelden ↗ ]   [ Entwurf später bearbeiten ]              │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **Reassurance first** — every line of the modal says "your work is safe"
  before it asks the user to re-authenticate.
- **Re-entry preserves step and scroll position** — the portal stores the
  pre-redirect URL fragment (e.g. `#step=4&section=B`) in the eIAM
  state-parameter and restores after return.
- **Soft escape** "Entwurf später bearbeiten" routes to the Inbox Entwürfe
  tab, draft persists.
- **Reqs:** NFA-IAM-001 (eIAM), FUNC-AU-009 (draft), FUNC-AU-022 (visible
  ID), W-15 (silent-refresh implementation — new).

### 11.13 Keyboard shortcuts (Power-user overlay)

Federal reviewers and BBL-PFM ops use the portal 4 h/day. The §2.3 queue
deserves a keyboard map. WCAG 2.1 AA already mandates keyboard reachability
(NFA-CD-004); this section is about making the keymap *good*, not just
*complete*.

```
┌─ Tastatur-Kurzbefehle (Drücken Sie  ?  zum Öffnen / Schliessen) ──────────────┐
│                                                                                │
│  Navigation                            Aktion                                  │
│  ──────────────────────                ──────────────────────                  │
│  j / ↓        nächste Zeile            Enter / o   öffnen (in §2.5)            │
│  k / ↑        vorherige Zeile          Esc         zurück zur Liste             │
│  g g          zum Anfang                                                       │
│  G            zum Ende                  Auf der Detailseite (§2.5):             │
│                                         a           Antragsfeld als OK marken   │
│  Filter                                 n           Antragsfeld als NoK marken  │
│  / oder f     Filterzeile fokussieren   k           OK mit Kommentar            │
│  Esc          Filter löschen            s           Entscheid speichern          │
│                                                                                │
│  Bulk                                   Wizard (Antragsteller):                 │
│  x           Zeile markieren            Tab         nächstes Feld               │
│  Shift+x      Bereich markieren         Shift+Tab   vorheriges Feld             │
│  Cmd/Ctrl+A   alle markieren            Cmd/Ctrl+S  Entwurf speichern           │
│  b           Bulk-Menü öffnen           Cmd/Ctrl+Enter Weiter / Senden          │
│                                                                                │
│  Allgemein                                                                     │
│  ?           dieses Overlay              Cmd/Ctrl+/ Suche im Portal              │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **Vim-style j/k as a baseline** — established in github, gmail, gov.uk
  Notify and elsewhere; reviewers familiar with one transfer to all.
- **Discoverable via `?`** — single key opens this overlay, single key
  closes. No menu, no settings page; the keymap is documentation that
  lives one keystroke away.
- **Documented** in the portal's user-help and in the §11.7.1 empty-state
  copy of the queue ("Tipp: Drücken Sie ? für Tastatur-Kurzbefehle").
- **Reqs:** NFA-CD-004 (a11y — keyboard reachability is mandated;
  *quality* is opt-in), NFA-UX-001 (operable without training — `?`
  surfaces the shortcuts at the moment of need).

### 11.14 Rejected → Resubmit loop (applicant view)

After a §2.5 reviewer marks NoK with Auflagen, the application status
changes to "Rückfrage" and the applicant gets notified (FUNC-FG-004).
This is the most-trafficked iteration loop in the system after wizard-
first-fill — and it was missing in v0.2. Canonical sketch:

#### 11.14.1 Applicant inbox row in "Rückfrage" state

```
BE-2026-014  Bundeshaus West, Bern   ↻ Rückfrage seit 16.05.   [ öffnen → ]
             Auflagen 2 · Begründung von J. Berger (GS UVEK)
```

- The ↻ glyph (lifecycle family from §0.3) signals "needs your action".
- Sub-line tells the applicant what to expect inside.

#### 11.14.2 Applicant detail view with reviewer-marks visible

```
┌─ Antrag BE-2026-014 — Rückfrage ───────────────────────────────────────────────┐
│ Status: ↻ Rückfrage seit 16.05.2026   ·   Bearbeiter: J. Berger (GS UVEK)      │
│                                                                                 │
│ Gesamt-Begründung von J. Berger (16.05. 11:18):                                 │
│ ┌──────────────────────────────────────────────────────────────────────────┐   │
│ │  Genehmigung mit Auflagen. Bitte FTE-Annahme überprüfen und Klimanach-   │   │
│ │  weis nachreichen.                                                       │   │
│ └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│ Offene Auflagen (2)         [ ☐ erledigt → ✓ ]                                  │
│ ┌──────────────────────────────────────────────────────────────────────────┐   │
│ │ ☐ Auflage 1 · Feld 4.11 FTE                                              │   │
│ │    Reviewer-Marke:  NoK  (16.05. 11:14)                                  │   │
│ │    Kommentar:       "FTE-Annahme prüfen — mit HR abgleichen."            │   │
│ │    [ Feld direkt bearbeiten → §8.6 Sektion C ]                           │   │
│ │                                                                          │   │
│ │ ☐ Auflage 2 · neue Datei                                                 │   │
│ │    Reviewer-Anforderung: "Klimanachweis als zusätzliches Anhang."         │   │
│ │    [ Datei hochladen → §11.7.4 ]                                         │   │
│ └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│ Geänderte Felder seit letzter Einreichung      [ Diff anzeigen ▾ ]              │
│   Sektion C · 4.11 FTE                                                          │
│      Eingereicht: 14 (Betreuung) + 160 (Plätze)                                 │
│      Aktuell:     12 (Betreuung) + 160 (Plätze)    ← bearbeitet 18.05.          │
│                                                                                 │
│ [ Entwurf speichern ]   [ Erneut einreichen → ]                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **Reviewer's overall Begründung at the top** — the applicant should read
  the *why* before the *what to fix*.
- **Auflagen as a checklist** with explicit deep-links into the form
  field that needs changing. Each Auflage tracks "erledigt" state — once
  all are ticked, "Erneut einreichen" enables.
- **Diff view since last submission** — the reviewer needs to see what
  changed without re-reading the whole form. The applicant also benefits:
  proves their changes addressed the Auflagen.
- **"Erneut einreichen" not "Neu einreichen"** — the application keeps
  its ID (FUNC-AU-022) and the audit trail records resubmission as a
  state transition, not a new application.

#### 11.14.3 What happens after Erneut einreichen

- Status: `Rückfrage` → `Eingereicht` (the standard pipeline applies again).
- Notification to J. Berger (GS UVEK) with "Resubmission of BE-2026-014".
- Reviewer §2.5 detail shows a **"Vorherige Prüfung" tab** with the prior
  marks, so the reviewer can quickly verify the Auflagen are addressed
  without re-reading the whole application.
- **In other typologies:**
  - **T6 vault:** the case folder shows a new 📄 "Rückfrage-Antwort
    18.05.pdf" alongside the original Antragsformular.
  - **T7 chat:** Apertus may summarise the Auflagen list ("Sie müssen 2
    Auflagen erfüllen") and offer to walk the applicant through them.
- **Reqs:** FUNC-FG-002 (Rejection with conditions), FUNC-FG-003
  (mandatory Begründung visible to applicant), FUNC-FG-004 (notification),
  FUNC-AU-022 (ID preserved across resubmissions), NFA-SEC-005 (audit
  records the state transition).

---

## Appendix A — View → requirements traceability

| View | Source typology | Reqs satisfied |
|---|---|---|
| §0.1 Shell (header/footer/breadcrumb) | all | NFA-CD-001, NFA-CD-003, NFA-CD-004 |
| §0.2 eIAM login | all | NFA-IAM-001, NFA-IAM-002, NFA-IAM-003 |
| §1.1 T1 pre-login landing | T1 | FUNC-LP-001, FUNC-LP-002, FUNC-LP-008 |
| §1.2 T1 authenticated home | T1 | FUNC-LP-003, FUNC-LP-005, FUNC-INB-001, FUNC-INB-002 |
| §1.3 T1 building drill-in | T1 | FUNC-AU-012, FUNC-LP-007 |
| §1.4 T1 wizard step 1 | T1 | FUNC-AU-001, FUNC-AU-012, FUNC-AU-021, FUNC-LP-004 |
| §1.5 T1 map-inbox | T1 | FUNC-INB-001, FUNC-INB-002 |
| §1.6 T1 detail | T1 | FUNC-AU-022, NFA-SEC-005 |
| §2.1 T2 role chooser | T2 | NFA-IAM-003, FUNC-LP-003 |
| §2.2 T2 Mieter home | T2 | FUNC-LP-001 to -003, FUNC-LP-005, FUNC-LP-009 |
| §2.3 T2 GS-Prüfer home | T2 | FUNC-INB-001, FUNC-FG-001 to -004, FUNC-REP-001 |
| §2.4 T2 wizard step 1 | T2 | FUNC-AU-001, FUNC-AU-012, FUNC-AU-021 |
| §2.5 T2 reviewer detail | T2 | FUNC-FG-001 to -003, NFA-COMP-003, NFA-SEC-005 |
| §3.1 T3 pre-login landing | T3 | FUNC-LP-001, FUNC-LP-002, FUNC-LP-009 |
| §3.2 T3 authenticated home | T3 | FUNC-LP-001 to -003, FUNC-INB-001 |
| §3.4 T3 inbox table | T3 | FUNC-INB-001, FUNC-INB-002, FUNC-AU-022 |
| §3.5 T3 detail | T3 | FUNC-INB-002, FUNC-AU-022, NFA-SEC-005 |
| §4.1 T4 cockpit | T4 | FUNC-REP-001, FUNC-INB-002, NFA-COMP-007 |
| §4.2 T4 ePPM handover | T4 | FUNC-PFM-001 to -004, NFA-INT-005, NFA-DATA-004 |
| §5.1 T5 kanban home | T5 | FUNC-INB-001, FUNC-INB-002, REQ-FA-005 |
| §5.2 T5 ticket detail | T5 | NFA-SEC-005, FUNC-FG-004, FUNC-AU-022 |
| §6.1 T6 vault home | T6 | FUNC-AU-022, FUNC-AU-023, NFA-SEC-005, NFA-DATA-002 |
| §7.1 T7 chat home | T7 | FUNC-LP-001, FUNC-LP-006, NFA-CD-003 |
| §7.2 T7 chat-to-wizard handoff | T7 | FUNC-AU-001, FUNC-AU-004, FUNC-LP-004 |
| §8.1 Stepper wizard | wizard alt | FUNC-LP-004, FUNC-AU-014 to -017 |
| §8.2 Accordion wizard | wizard alt | FUNC-LP-004 |
| §8.3 Single-page wizard | wizard alt | FUNC-LP-004 (not recommended) |
| §8.4 Draft/resume | wizard alt | FUNC-AU-009, FUNC-AU-022 |
| §0.3 Status pipeline + glyph families | all | FUNC-INB-002, FUNC-FG-004, FUNC-FG-005, FUNC-AU-013, NFA-SEC-005 |
| §3.3 T3 wizard pointer | T3 | FUNC-LP-004 |
| §3.5 T3 detail (pointer to §1.6) | T3 | FUNC-INB-002, FUNC-AU-022 |
| §4.3 T4 wizard / inbox / detail pointers | T4 | FUNC-LP-004, FUNC-INB-001 |
| §5.3 T5 other views (pre-login / wizard / cockpit) | T5 | FUNC-LP-001, FUNC-LP-004 |
| §6.2 T6 other views (pre-login / wizard / inbox / detail) | T6 | FUNC-AU-023, FUNC-LP-004 |
| §7.3 T7 other views (pre-login / wizard / inbox / detail) | T7 | FUNC-LP-001, FUNC-LP-006 |
| §9.1 Split-pane reviewer | reviewer alt | FUNC-FG-001 to -003 |
| §9.2 Inline marks reviewer | reviewer alt | FUNC-FG-001 to -003 |
| §9.3 Checklist column reviewer | reviewer alt | FUNC-FG-001 to -003 |
| §9.4 Field-by-field stepper reviewer | reviewer alt | FUNC-FG-001 to -003 (not recommended) |
| §8.6 Wizard Step 4 — Grossantrag 12 fields | wizard step | FUNC-AU-019, FUNC-AU-020, FUNC-AU-021, FUNC-PFM-002, FUNC-AU-011 |
| §8.7 Wizard Step 2 — SEM variant | wizard step | FUNC-AU-016, FUNC-AU-021, FUNC-CC-001, NFA-IAM-003 |
| §8.8 Wizard Step 2 — FDFA variant | wizard step | FUNC-AU-017, FUNC-AU-021, NFA-IAM-003 |
| §8.9 Wizard Step 1+2 — Greenfield | wizard step | FUNC-AU-013, FUNC-AU-012, FUNC-AU-001 |
| §8.10 Wizard Step 5 — Prüfen & Senden | wizard step | FUNC-AU-009, FUNC-AU-011, FUNC-AU-022, FUNC-FG-004, NFA-SEC-004, NFA-SEC-005 |
| §11.0.1 Batch approval modal | reviewer | FUNC-FG-002, FUNC-FG-003, NFA-COMP-003, NFA-SEC-005 |
| §11.0.2 Auditor / Historie | reviewer / audit | NFA-COMP-012, NFA-SEC-005, NFA-DATA-004, FUNC-AU-023 |
| §11.1 BK bypass detail | cross-cut | FUNC-FG-005, FUNC-AU-001, FUNC-INB-002 |
| §11.2 Master-data maintenance | admin | FUNC-CC-001/-002/-003, NFA-IAM-003, NFA-SEC-005 |
| §11.3 Delegated admin / Substitution | admin | NFA-IAM-002, NFA-SEC-005, FUNC-FG-004 |
| §11.4 Content editor / Self-publish | admin | FUNC-LP-010, FUNC-LP-009, NFA-CD-002, NFA-CD-003 |
| §11.5 Mobile / responsive | cross-cut | FUNC-LP-008, NFA-CD-004, W-8 |
| §11.6 Self-service downloads | self-service | FUNC-LP-007, FUNC-LP-009, NFA-SEC-003 |
| §11.7.1 Empty states | states | FUNC-LP-002 |
| §11.7.2 Loading / skeleton | states | NFA-CD-004 (a11y) |
| §11.7.3 Validation states | states | FUNC-AU-011 |
| §11.7.4 File-upload states | states | FUNC-AU-008, NFA-SEC-003 |
| §11.7.5 Network error | states | NFA-DATA-004 |
| §11.7.6 Applicant-side ePPM failure | states | FUNC-PFM-003, FUNC-PFM-004, NFA-INT-005 |
| §11.8 Content-metadata pattern | cross-cut | FUNC-LP-009, NFA-UX-004, NFA-CD-003 |
| §11.9 Print stylesheet | cross-cut | NFA-SEC-005, FUNC-AU-022 |

**Pilot Musts now covered (cross-check vs. REQUIREMENTS.md v0.4):**
FUNC-LP-001 ✓ · FUNC-LP-002 ✓ · FUNC-LP-003 ✓ · FUNC-LP-004 ✓ · FUNC-LP-007 ✓ · FUNC-LP-009 ✓
· FUNC-LP-010 ✓ · FUNC-AU-001 ✓ · FUNC-AU-004 ✓ · FUNC-AU-008 ✓ · FUNC-AU-009 ✓ · FUNC-AU-011 ✓
· FUNC-AU-012 ✓ · FUNC-AU-013 ✓ · FUNC-AU-014 ✓ · FUNC-AU-015 ✓ · FUNC-AU-016 ✓ · FUNC-AU-017 ✓
· FUNC-AU-019 ✓ · FUNC-AU-021 ✓ · FUNC-AU-022 ✓ · FUNC-AU-023 ✓ · FUNC-FG-001 ✓ · FUNC-FG-002 ✓
· FUNC-FG-003 ✓ · FUNC-FG-004 ✓ · FUNC-FG-005 ✓ · FUNC-PFM-001 ✓ · FUNC-PFM-002 ✓ · FUNC-PFM-003 ✓
· FUNC-PFM-004 ✓ · FUNC-INB-001 ✓ · FUNC-INB-002 ✓ · FUNC-CC-001 ✓ · FUNC-CC-002 ✓ · FUNC-CC-003 ✓
· NFA-IAM-001 ✓ · NFA-IAM-002 ✓ · NFA-IAM-003 ✓ · NFA-SEC-003 ✓ · NFA-SEC-005 ✓ · NFA-COMP-003 ✓
· NFA-COMP-012 ✓ · NFA-CD-001 ✓ · NFA-CD-002 ✓ · NFA-CD-003 ✓ · NFA-CD-004 ✓.

Still wireframe-only-pointers (referenced, not separately drawn):
FUNC-AU-002 (auto access-rights — visible via §11.3 substitution row),
FUNC-AU-006 (cost-benefit inline calc — referenced from §8.6 row 4.6 but
the inline calc UI is a v0.3 task), FUNC-AU-010 (per-field popup help —
inline `ℹ` annotations only, no popup sketch), FUNC-AU-020 (deadline
suggestion — visible inline in §8.6 row 4.9), FUNC-PFM-005 (early
notification to IM/OM — covered via §11.3 routing principle).

---

## Version history

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 2026-05-18 | Claude + David Rasner | Initial seven-typology exploration. Wizard and reviewer alternatives. Tradeoff matrix + recommended hybrid. Companion to REQUIREMENTS.md v0.3. |
| 0.2 | 2026-05-18 | Claude + David Rasner | Domain-accuracy + coverage pass after v0.1 review. Mechanical: four-language wordmark, design-system token `#DC0018`, Web-Components clarification, eIAM URL, WE/EGID realism, MapLibre + swisstopo, ISG filter on public map, vocabulary aligned to "Bedarfsmeldung" + realistic RE-FX error codes, skip-link, cookie banner ref, notification bell. Pipeline: three variants (Standard / BK-bypass / Greenfield) and three disambiguated glyph families. Wizard: Step 4 Grossantrag (12 mandatory fields with ePPM-tab annotations), Step 5 Prüfen accordion, Step 2 SEM variant, Step 2 FDFA variant, Step 1+2 Greenfield variant; NAW factor disentangled from desk-sharing factor. New chapter §11 cross-cutting views: BK bypass applicant detail, batch approval modal, auditor / Historie view, master-data maintenance, delegated admin / substitution, content editor, self-service downloads, mobile breakpoints (3 sketches), state library (empty / loading / validation / upload / network / ePPM-failure), content-metadata pattern, print stylesheet. New open questions W-10…W-13. Appendix A extended; pilot-Must coverage cross-check added. Companion to REQUIREMENTS.md v0.4. |
| 0.3.1 | 2026-05-18 | Claude + David Rasner | Factual correction after live inspection of `github.com/swiss/designsystem` v1.0.9: framework distribution is **Vue 3 SFC + Tailwind + Storybook**, not Web Components / Lit; primary red `#d8232a` (= `--color-primary-600`), not `#DC0018`. §0.1 chrome description updated. Companion correction in REQUIREMENTS.md v0.5.1 NFA-CD-001. No content changes elsewhere. |
| 0.3 | 2026-05-18 | Claude + David Rasner | **Best-practice + UX cross-check pass.** Domain: §0.4 introduces the three-part SAP RE-FX object identifier (`BK / WE / Obj` = `1086/2010/AA`); WE references throughout switched from single 7-digit to composite. Spec-driven reshape (companion to REQUIREMENTS.md **v0.5**): §8.6 Grossantrag narrowed from 12 mandatory free-text to 6 free-text + 4 structured + 1 optional; ePPM-tab annotations hidden behind toggle; §11.4 content editor enforces Sprachengesetz derogation with audit-logged Begründung when publishing DE-only; §11.5 mobile three-breakpoint table aligned to FUNC-LP-008 v0.5; §11.8 metadata pattern narrowed to content items with explicit forbidden-on-action-tile examples. Seven new big sketches: §3.6 T3-Lite hero-CTA home (pilot-scale alternative to T3 catalogue); §11.10 mandatory-marker convention variants; §11.11 NAW classification with confidence + override; §11.12 silent eIAM refresh + session-expiry modal; §11.13 keyboard-shortcut overlay (`?` to open); §11.14 rejected→resubmit loop with reviewer diff. Dashboard fatigue fix: §2.3 GS home + §4.1 cockpit collapsed by default with primary-metric band + per-user persistence. Five v0.2 regression fixes: §7.2 chat fixed (🤖 badge family, NAW math corrected to 77 m²); §11.0.1 batch approval template default-off + server-side identical-text check; §8.10 over-budget two-tier soft-warn/+20%-block; §11.0.2 SHA-256 hidden behind click; §11.7.5 correlation-ID format opaque (`MP-XXXX-YYYY-ZZZZ`). Small fixes: user-pill role label spelled out (Logistikbeauftragte not "ILBO UVEK"); §11.3 deputy end-date overlap detection; §11.2 master-data four-eyes diff view; §5 T5 marked deferred not-in-pilot; §11.9 print includes actor name. Consistency: Rückfrage glyph synced in §2.3; made-up SLA durations replaced with "gemäss SLA"; W-8/W-9/W-12 closed; W-14/W-15 added. §10.3 hybrid recommendation rewritten: T3-Lite hero CTA for submitters; T2 role-routed home for reviewers/PFM/admins; T6 as GEVER deep-link (no in-portal tree); T4 collapsible widgets; T7 chat narrowed to lookup-only; T5 explicitly out. New open questions: W-14 (cockpit per-user persistence), W-15 (silent eIAM refresh). |
