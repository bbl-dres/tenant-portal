# Wireframes — BBL Tenant/Service Portal (MP)

> **As of:** 2026-05-18 · **Companion to:** [REQUIREMENTS.md](REQUIREMENTS.md) · **Status:** exploration / pre-decision
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
> (Noto Sans, primary red `#e53940`, Nuxt 3 + Storybook) provides the
> components referenced in each sketch (e.g. `Hero`, `Card`, `StepIndicator`,
> `Accordion`, `Table`, `BadgeFilter`, `Modal`, `Pagination`,
> `NotificationBanner`). The design system ships **no** wizard container,
> dashboard tile, inbox, map helper, or timeline component — all of those
> are assembled from primitives in this document.

## Table of contents

- [0. Common shell](#0-common-shell-used-in-every-typology) — header, footer, breadcrumbs, login, search, status badges
- [1. T1 — Digital-twin / spatial-first](#1-t1--digital-twin--spatial-first)
- [2. T2 — Role-switched portal (armasuisse style)](#2-t2--role-switched-portal-armasuisse-style)
- [3. T3 — Service catalogue (gov.uk pattern)](#3-t3--service-catalogue-govuk-pattern)
- [4. T4 — IWMS / KPI cockpit](#4-t4--iwms--kpi-cockpit)
- [5. T5 — Service-desk / ticketing](#5-t5--service-desk--ticketing)
- [6. T6 — Document vault / e-Akte](#6-t6--document-vault--e-akte)
- [7. T7 — AI copilot / chat-first](#7-t7--ai-copilot--chat-first)
- [8. Wizard alternatives](#8-wizard-alternatives) — stepper vs. accordion vs. single-page
- [9. GS reviewer alternatives](#9-gs-reviewer-alternatives) — split-pane vs. inline marks vs. checklist
- [10. Tradeoff matrix + recommendation](#10-tradeoff-matrix--recommendation)
- [Appendix A — View → requirements traceability](#appendix-a--view--requirements-traceability)

---

## 0. Common shell (used in every typology)

The federal Corporate Design (CD Bund) chrome is identical in every concept
below; the differences are inside the content area. Specified once here, then
omitted from later sketches for brevity.

### 0.1 Federal header + footer + breadcrumbs

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🇨🇭 Schweizerische Eidgenossenschaft · Confédération suisse                     │
│                                                  DE | FR | IT       [ ↗ Login ] │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [BBL Logo]  Mieterportal                            [ 🔍 Suchen … ]         [☰] │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Home › Bedarf › Neuer Antrag                              [Andrea Muster ▾  EN] │
├═════════════════════════════════════════════════════════════════════════════════┤
│                                                                                 │
│                              ── page content ──                                 │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ © Bundesamt für Bauten und Logistik (BBL)                                       │
│ Impressum · Datenschutz · Kontakt · Barrierefreiheit · Sprachversionen           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Top meta-bar** — official Swiss Confederation wordmark + language switcher
  (`DE | FR | IT`) + Login. Components: `TopBar`, `MetaNavigation`.
- **Brand bar** — BBL logo, product name "Mieterportal", global search,
  hamburger for the role-aware main menu (`Logo`, `SearchMain`, `Burger`).
- **Breadcrumb bar** — `Breadcrumb` component on the left; user pill on the
  right (name, role badge, language fallback link, sign-out). Hidden on the
  public landing.
- **Footer** — federal `FooterInformation` + `FooterNavigation` (legal links).
- **Reqs:** NFA-CD-001 (CD Bund), NFA-CD-003 (DE/FR/IT), NFA-CD-004 (WCAG
  AA / eCH-0059), NFA-IAM-001 (eIAM login).

### 0.2 eIAM login & role context

```
┌─────────────────────── eIAM ───────────────────────┐
│                                                    │
│  Anmeldung über eIAM                               │
│                                                    │
│  Sie werden weitergeleitet zu                      │
│  identity.eiam.admin.ch                            │
│                                                    │
│  [ Mit eIAM anmelden  ↗ ]                          │
│                                                    │
│  Kein eIAM-Konto? → Hilfe / IT-Support             │
└────────────────────────────────────────────────────┘
```

- Redirect-then-return pattern. On success: token, role(s), VE/department.
- After return, the portal reads role(s) and (in T2) presents a role chooser
  if more than one applies. In all other typologies, the highest-privilege
  role wins by default with a "switch role" pill in the user menu.
- **Reqs:** NFA-IAM-001, NFA-IAM-002 (delegated admin), NFA-IAM-003 (RBAC).

### 0.3 Notification & status conventions (used in every typology)

```
StatusPipeline (used in inbox rows and detail pages):

[ Entwurf ]→[ Eingereicht ]→[ in GS-Prüfung ]→[ genehmigt ]→[ in ePPM ]→[ abgeschlossen ]
                                              └─ abgelehnt ─┘

Field-quality badges (borrowed from property-inventory):
  🟢 verifiziert    🟡 veraltet    🔴 manuell    ⚪ ungeprüft

Status colours (CD Bund semantic):
  Erfolg    Warnung   Fehler    Info     Neutral
  #16A34A   #EAB308   #DC2626   #0EA5E9  #6B7280
```

- The pipeline is rendered as a `StepIndicator` in the row's right column or as
  a horizontal stepper at the top of the detail page.
- A `NotificationBanner` carries top-of-page system messages (planned
  outages, e-mail-delivery failures, new BBL announcement).
- A `ToastMessage` carries inline confirmations (draft saved, file uploaded,
  status changed).
- **Reqs:** FUNC-INB-002, FUNC-FG-004 (notifications), NFA-SEC-005 (audit
  trail).

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
│              MapLibre — Bundesimmobilien CH (öffentlich sichtbar)               │
│  [ Hintergrund ▾ ]                              [ Layer ▾ ] [ + ] [ − ] [ ⌂ ]   │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─ Was Sie hier tun können ──┬─────────────────────────────┬──────────────────────┐
│ Bedarf anmelden            │ Status nachverfolgen        │ Pläne herunterladen  │
└────────────────────────────┴─────────────────────────────┴──────────────────────┘
```

- Hero with two CTAs. Below, an interactive `MapLibre` map already on screen
  (no login required) showing federal buildings as markers — establishes the
  metaphor immediately.
- Three task tiles under the map: hand off to demand wizard, status, downloads.
- **Reqs:** FUNC-LP-001 (SPOC), FUNC-LP-002 (self-explanatory), FUNC-LP-008
  (responsive).

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
│         ┌─ Floor plan SVG ─┐                │  WE 04711  ·  EGID 12345678        │
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
  building, address, WE, and EGID.
- **Reqs:** FUNC-AU-012 (auto-derive WE from address), FUNC-LP-007
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
│   Klick: WE 04711 erkannt          │   • H. Ludwig (PFM)                        │
│   EGID 12345678 erkannt            │   • A. Wirz (IM)                           │
│                                    │                                            │
└────────────────────────────────────┴────────────────────────────────────────────┘
[ Entwurf speichern ]                   [ Zurück ]  [ Weiter → Fläche / NAW ]
```

- Spatial-first: pick the building on the map, the right column fills itself.
  WE and EGID are auto-resolved via swisstopo/GWR — `🟢 verifiziert` badge.
- The same wizard runs without a starting building (for greenfield/FUNC-AU-013):
  collapse the map column and show only the form.
- **Reqs:** FUNC-AU-001 (VE → contacts), FUNC-AU-012 (address → WE/EGID),
  FUNC-AU-021 (type chooser), FUNC-LP-004 (wizard).

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
│ □ BE-2026-012  Keller (UVEK)         Bern Sulgenrain  Rückfrage   09.05.       │
│ ─────────────────────────────────────────────────────────────────────────────── │
│ Filter: [Alle Status ▾] [Alle Antragsteller ▾]   [ Bulk-Aktion ▾ ]              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Statistiken Ihres GS                                                            │
│ ┌─ Eingang 30 d ──┬─ Bearbeitungs-Ø ─┬─ Offene Auflagen ─┬─ Schnitt zu BBL ─┐   │
│ │      8          │       4.2 d      │        2          │       96 %        │   │
│ └─────────────────┴──────────────────┴───────────────────┴───────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Reviewer's home is a queue (not a tile menu). Borrows T4 KPI tiles for the
  small operational stats strip — proves that mixing typologies inside one
  role is fine.
- Bulk actions cover "approve all without conditions", "reassign", "request
  more info". Click into a row → §2.5 detail/review.
- **Reqs:** FUNC-INB-001, FUNC-FG-001 to FUNC-FG-004, FUNC-REP-001 (small
  aggregated counters).

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
│  Zuständige BBL-Kontakte           H. Ludwig, A. Wirz                (auto)     │
│                                                                                 │
│  Adresse                         [ Eichweg 22, 3003 Bern                      ] │
│  Wirtschaftseinheit (WE)           04711                              🟢 (auto) │
│  EGID                              12345678                           🟢 (auto) │
│                                                                                 │
│  (i) Felder mit (auto) werden aus Bundes-Stammdaten ermittelt.                  │
└─────────────────────────────────────────────────────────────────────────────────┘
[ Entwurf speichern ]                   [ Zurück ]  [ Weiter → Fläche / NAW ]
```

- Same logical step 1 as T1 but no map column — the form is the whole page.
- Field-quality badges (`🟢 verifiziert`) reused from property-inventory.
- **Reqs:** FUNC-AU-001, FUNC-AU-012, FUNC-AU-021, NFA-IAM-003.

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
│  WE / EGID:     04711 / 12345678             │  [✓ OK] [ NoK ] [ OK mit Komm. ] │
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
│ ┌─ Eingang Anträge ─┬─ in GS-Prüfung ─┬─ in ePPM ──┬─ ePPM-Fehler ─────────────┐│
│ │      24           │      11          │     18      │       2  ⚠               ││
│ │  ↑ +6 zu Vorm.     │   Ø 4.2 d        │             │   [ ansehen → ]          ││
│ └────────────────────┴──────────────────┴─────────────┴───────────────────────────┘│
│ ┌─ Belegung CH (Karte) ─────────────┬─ Trend Eingänge 12 Wochen ────────────────┐│
│ │                                   │                                            ││
│ │     ●  ● ●●  ●                    │      ▁▂▄▃▅▆▆▅▇▆▇█                          ││
│ │       Heatmap nach Status         │                                            ││
│ └───────────────────────────────────┴───────────────────────────────────────────┘│
│ ┌─ Top-Wartezeiten ─────────────────┬─ Auflagen offen ─────────────────────────┐ ││
│ │ BE-2026-009  18 d                 │ BE-2026-011  Rechtsgrundlage fehlt        │ ││
│ │ SEM-2026-001 14 d                 │ BE-2026-014  FTE-Annahme prüfen           │ ││
│ │ BE-2026-007  11 d                 │                                          │ ││
│ └───────────────────────────────────┴───────────────────────────────────────────┘ ││
└─────────────────────────────────────────────────────────────────────────────────┘
```

- 2×2 KPI tile band at the top, two charts (map + sparkline) in the middle,
  two list cards at the bottom. Each tile is clickable → drill into a list
  view.
- Borrows from Planon's "Connect for Analytics" twin-monitor layout — but
  trimmed to fit a single screen and CD Bund.
- **Reqs:** FUNC-REP-001 (aggregated reports), FUNC-PFM-004 (ePPM
  reprocessing entry-point), FUNC-INB-002 (status overview), NFA-COMP-007
  (VILB task clusters).

### 4.2 SAP ePPM handover panel (T4-specific)

```
┌─ ePPM-Übergaben ────────────────────────────────────────────────────────────────┐
│ Tabs:  [ Erfolgreich (96) ]  [ Fehlgeschlagen (2) ⚠ ]  [ Warteschlange (3) ]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Antrag         Übergabe              Belegnr SAP         Fehlerkennung           │
│ BE-2026-013    14.05. 09:12  ✓        4711-2026-013       —                       │
│ BE-2026-014    14.05. 11:04  ✗        —                   E-0042 RE-FX feld …    │
│                                                            [ Erneut übergeben ↻ ]│
│ BE-2026-015    14.05. 11:06  ✗        —                   E-0009 Verbindung …    │
│                                                            [ Erneut übergeben ↻ ]│
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
│   Antragstyp:    Kleinantrag      🟢                                            │
│   VE:            UVEK / BAFU      🟢 (aus Ihrem Profil)                          │
│   Adresse:       Bern             🟡 (bitte präzisieren)                         │
│   FTE:           8                🟢                                            │
│   Geschätzte HNF2 (12 m²/FTE):    96 m²                                         │
│                                                                                 │
│ [ Im Formular öffnen → ]   [ Adresse präzisieren ]   [ Verwerfen ]              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Agent fills the wizard from natural language; user is one click away from
  the structured form. *Filling from chat does not constitute submission.*
- **Reqs:** FUNC-AU-001, FUNC-AU-004 (NAW factor — initial guess), FUNC-LP-004
  (the wizard remains the system of record).

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
Schritt 2 von 5 — Flächenbedarf

┌─────────────────────────────────────────────────────────────────────────────────┐
│  Arbeitsstil-Fragebogen (NAW-Faktor)                                            │
│   1. Anteil Remote-Arbeit:     [ 30 %                            ▾ ]            │
│   2. Schwerpunkt:              ( ) Konzentration  (●) Kollab.  ( ) Mischung    │
│   3. Vertraulichkeit:          ( ) niedrig  (●) mittel  ( ) hoch                │
│                                                                                 │
│  → NAW-Faktor (auto):          0.80                                             │
│                                                                                 │
│  FTE:                          [ 8                                            ] │
│  HNF2 (12 m²/FTE × 0.80):      77 m²                                            │
│  GF  (24 m²/FTE × 0.80):       154 m²                                           │
│  UK-Kosten (vorl.):            CHF 462 000                                      │
│  Möblierung (CHF 650/m²):      CHF 50 050                                       │
└─────────────────────────────────────────────────────────────────────────────────┘
[ Entwurf speichern ]                   [ ← Zurück ]  [ Weiter → Anhänge ]
```

- **Pro:** lowest cognitive load for first-time users (the FUNC-LP-002
  "without training" requirement); explicit progress; one decision per
  screen.
- **Con:** can feel slow for power users; if step N depends on step M,
  jumping back is needed.

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

### 10.3 Recommended hybrid (pilot)

> **Base: T3 service catalogue, role-filtered (T2 idea) for the
> authenticated home.** Add **T6** as the archive backend (FUNC-AU-023 is a
> "Must"), **T4** as the *reviewer/admin* dashboard widgets only, and **T1**
> as a secondary "Karte / Portfolio" exploration view. Keep **T7 (AI
> copilot)** as a roadmap layer once Apertus on Swisscom Sovereign Cloud
> matures and ISG classification permits. Keep **T5 (ticketing)** in
> reserve for the post-pilot repair use case (REQ-FA-005).

In practice that means the production app probably looks like:

- **Public landing:** T3 service tiles + a small static map (T1 flavour) +
  Swiss Federal Hero.
- **Authenticated home:** T3 catalogue, role-filtered + a "your open items"
  band on top + a small KPI strip for reviewers/PFM only.
- **Demand wizard:** stepper from §8.1, with §8.2 accordion for the final
  "Prüfen" step.
- **Inbox:** table from §3.4 by default; the kanban from §5 and the map
  from §1.5 available as alternative view toggles.
- **Reviewer detail:** split-pane from §9.1 desktop, inline §9.2 on
  tablet/mobile.
- **PFM cockpit:** T4 KPI tiles + §4.2 ePPM handover panel as a separate
  route under the same shell.
- **Archive search:** T6 tree as an admin/auditor view, hidden from
  ordinary tenant menus.

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
| W-8 | Mobile breakpoint and which views drop columns first | NFA-CD-004 + responsive parity |
| W-9 | Empty-state copy for the inbox, wizard step 1, the public map | Easy to forget; biggest first-impression risk |

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
| §9.1 Split-pane reviewer | reviewer alt | FUNC-FG-001 to -003 |
| §9.2 Inline marks reviewer | reviewer alt | FUNC-FG-001 to -003 |
| §9.3 Checklist column reviewer | reviewer alt | FUNC-FG-001 to -003 |
| §9.4 Field-by-field stepper reviewer | reviewer alt | FUNC-FG-001 to -003 (not recommended) |

---

## Version history

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 2026-05-18 | Claude + David Rasner | Initial seven-typology exploration. Wizard and reviewer alternatives. Tradeoff matrix + recommended hybrid. Companion to REQUIREMENTS.md v0.3. |
