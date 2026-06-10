# Anforderungen pro Layer — Mieterportal MVP

**Ziel:** Produktive MVP-Umsetzung des Prototyps [bbl-dres/tenant-portal](https://github.com/bbl-dres/tenant-portal).
**Stand:** Juni 2026 · **Status:** Anforderungsbasis

---

## Zweck des Dokuments

Dieses Dokument bündelt die Anforderungen an die produktive MVP-Umsetzung des Mieterportals — gegliedert nach Architektur-Layern (Frontend, Prozess, KI, Integration, Data, Anwendungen) plus übergreifenden Querschnitten. Es dient als gemeinsame **Anforderungsbasis** für Auftraggeber (BBL), Architektur, Entwicklung und die Förder-/Investitionsentscheidung.

Die Layer-Gliederung folgt dem **Referenzmodell Informatikarchitektur Bund (RIAB, R001)** bzw. TOGAF (P030); die Architekturarbeit den **Architekturprinzipien des Bundes (W010)**. Querschnitte und das Plattform-Kapitel stehen bewusst *vor* den Layern, weil sie für alle gelten.

**Priorisierung:** **MUSS** = MVP-kritisch / rechtlich zwingend · **SOLLTE** = wichtig, früh nach MVP · **KANN** = Mehrwert, später · **WIRD NICHT** = bewusst ausserhalb MVP-Scope

> **MVP-Leitlinie:** Im MVP nur MUSS plus die günstigen SOLLTE. Der Prototyp deckt das Frontend bereits weitgehend ab (CD Bund ~99 %, WCAG 2.1 AA) — der Fokus liegt auf Engine, Persistenz, Authentifizierung und Integration.

> **Architektur-Leitprinzip — Plattform statt Einzelanwendung:** Das Mieterportal ist die *erste Instanz* einer wiederverwendbaren Lösungsplattform, nicht das Endprodukt. Damit setzt es das Bundeskanzlei-Prinzip **«Verwaltung als Plattform»** um — eines der [acht handlungsleitenden Prinzipien der digitalen Verwaltung](https://www.bk.admin.ch/de/prinzipien) — gestützt auf **«Datengetrieben»** (Once-Only, Wiederverwendung harmonisierter Daten) und **«Sicherheit»** (Souveränität). Dieselben Bausteine (Prozess-Engine, Form-Engine, Cockpit, Auth/Audit, Karte, Suche, Connectoren) tragen viele weitere Use-Cases — Stammdaten-Management, Support-Tickets, Grünflächeninventar (Instandhaltung/Reinigung), Workspace-Management, Ausstattungs-/Möbel-Shop, Bauprojekt-Portfolio. Je Use-Case variieren im Kern nur **Prozessmodell, Formular-Schema, Datenobjekt und — leicht — das Frontend**. *Plattform-ready by design, nicht platform-built upfront.* → Details im Kapitel **„Erweiterbarkeit / Plattform"**.

### Normative Grundlagen (Auswahl)

Das Vorhaben bewegt sich im verbindlichen Vorgabenrahmen der zentralen Bundesverwaltung ([bk.admin.ch/de/vorgaben](https://www.bk.admin.ch/de/vorgaben), Rechtsgrundlage **DigiV** seit 1.5.2025). Die folgenden Vorgaben sind für die Architektur relevant:

| Thema | Vorgabe / Standard |
|---|---|
| Recht / digitale Verwaltung | EMBAG, DigiV; Strategie «Digitale Verwaltung Schweiz» (SN001), Strategie Digitale Bundesverwaltung (SB000) |
| Datenschutz | DSG, DSV |
| Informationssicherheit | ISG, ISV; Schutzbedarfsanalyse (P041), ISDS-Konzept (P042), IKT-Grundschutz (Si001) |
| Identität / Zugang | IAMV; IAM-Strategie (SB011); Identitätenschutz (AR012); eIAM/AGOV |
| Interoperabilität | Interoperabilitätsstandards (I007); verbindliche eCH-Standards; I14Y |
| Barrierefreiheit | eCH-0059 (Accessibility); BehiG/BehiV; WCAG 2.1 AA |
| Prozessmodellierung | eCH-0158 (BPMN-Konventionen), eCH-0074; Modellierungswerkzeuge (A736) |
| Geodaten | eCH-0056 (Geodienste), eCH-0031 (INTERLIS) |
| Stammdaten | Gemeinsame Stammdatenverwaltung des Bundes (SB018); Once-Only |
| Aktenführung / GEVER | eCH-0002 / eCH-0038; Document Management (A281), GEVER (A290) |
| Cloud / Souveränität | Cloud-Strategie (SB020), Cloud-Prinzipien (AR010), Digitale Souveränität (W012) |
| KI | Strategie Einsatz von KI-Systemen (SB021) |
| Open Data / Offenheit | OGD-Strategie (SN004) |
| Architektur / Methodik | RIAB (R001), TOGAF (P030), Architekturprinzipien (W010), SOA (SB007 / R016); HERMES (eCH-0054) |
| BK-Leitprinzipien | «Verwaltung als Plattform», «Datengetrieben» u. a. ([bk.admin.ch/de/prinzipien](https://www.bk.admin.ch/de/prinzipien)) |

> **Verbindlichkeit:** Gesetze/Verordnungen (EMBAG, DigiV, DSG/DSV, ISG/ISV) und die als bindend bezeichneten eCH-Standards sind zwingend. DTI-/BK-Weisungen und Strategien sind verbindliche Leitplanken — Abweichung ist begründungspflichtig. Die BK-Leitprinzipien sind handlungsleitend (geltendes Recht hat Vorrang).

---

## Erweiterbarkeit / Plattform

**Zweck:** Den wiederverwendbaren Kern von der Use-Case-Spezifik trennen, sodass weitere Lösungen mit minimalem Grenzaufwand entstehen — das Mieterportal ist die erste von vielen Instanzen.
**Bezug / Standards:** BK-Prinzipien der digitalen Verwaltung — v. a. **«Verwaltung als Plattform»**, **«Datengetrieben»**, **«Nutzerzentriert»**, **«Offenheit»**, **«Sicherheit»** ([bk.admin.ch/de/prinzipien](https://www.bk.admin.ch/de/prinzipien)); SOA (SB007).

> **Normativer Status:** Die BK-Prinzipien sind *handlungsleitende* Leitplanken für Bundesvorhaben (geltendes Recht hat Vorrang) — keine Gesetzespflicht wie BehiG, aber **verbindliche Vorgabe**: Ausrichtung wird erwartet, Abweichung ist begründungspflichtig. Die Plattform-Orientierung ist damit gesetzt, nicht optional; phasiert wird nur die *Umsetzungstiefe* im MVP (siehe Disziplin unten).

### Lösungsmuster (Archetypen)

Die meisten Fachthemen kollabieren auf wenige Muster, die dieselben Bausteine nutzen — es variieren nur Prozessmodell, Formular und Datenobjekt:

| Lösungsmuster | Beispiel-Use-Cases | Gemeinsame Bausteine |
|---|---|---|
| Antrag → Prüfung → Freigabe | Mieterportal (Bedarf), Ausstattungs-/Möbel-Shop, Bauprojekt-Antrag | Form-Engine · Engine + DMN · Cockpit/Inbox · Rollen · Audit |
| Ticket → Triage → Bearbeitung → Lösung | Support-Tickets, Schadensmeldung, Instandhaltung & Reinigung | Form-Engine · Engine · Prüfer-Queue · Fristen/Eskalation · Audit |
| Stammdaten/Inventar → Mutation → Validierung → Übernahme | Stammdaten-Management, Grünflächeninventar, Workspace-Management | Form-Engine · Engine · SAP-/Inventar-Connector · Audit |
| Katalog → Auswahl → Bestellung → Lieferung | Ausstattungs- & Möbel-Shop | Katalog/Such-Index · Engine (Genehmigung) · Connector |
| Portfolio-/Objektsicht (quer zu allen) | alle — Liste / Karte / Detail / Dokumente | Cockpit-Pattern · MapLibre · DMS · Suche |

### Plattform-Capabilities

| Capability | Priorität | Anforderung | Hinweis |
|---|---|---|---|
| Multi-Use-Case-Fähigkeit | **MUSS** | Mehrere fachliche Lösungen auf einer Plattform; Trennung von Daten, Rollen, Navigation je Use-Case | BK «Verwaltung als Plattform» |
| Wiederverwendbare Frontend-Bausteine | **MUSS** | Shell, Form-Renderer, Cockpit/Listen, Detail/Karte als geteilte Komponenten — nicht pro Use-Case neu | im Prototyp als gemeinsame Shell angelegt |
| Plattform-Services (Querschnitt) | **MUSS** | Auth, Audit, Berechtigungen, i18n, Suche, Notifikation einmal zentral, von jedem Use-Case konsumiert | → Querschnitt |
| Harmonisierte Daten / Once-Only | **MUSS** | Stammdaten einmal halten und über Use-Cases wiederverwenden statt doppelt erfassen | BK «Datengetrieben»; Stammdatenverwaltung (SB018); → Data / Anwendungen |
| Connector-Baukasten | SOLLTE | SAP RE-FX, DMS, Geo, Mail als wiederverwendbare Konnektoren statt Punkt-zu-Punkt je Use-Case | → Integration Layer |
| Konfiguration / Metadaten statt Code | SOLLTE | Neuer Use-Case = Prozessmodell + Formular-Schema + Datenschema + Navigation, ohne Kern-Änderung | inkrementell, dort wo billig |
| Lösungsmuster-Bibliothek | SOLLTE | Template-BPMN + Formular-Templates für die o. g. Archetypen | beschleunigt Use-Case #2+ |
| Offene Standards / Nachnutzbarkeit | SOLLTE | Offene, dokumentierte APIs; Komponenten auch durch andere Ämter nachnutzbar | BK «Offenheit»; OGD-Strategie (SN004) |
| No-/Low-Code-Studio (Self-Onboarding) | KANN | Fachseite legt neue Lösungen selbst an | strategisches Endbild, bewusst post-MVP |

> **Disziplin — plattform-ready, nicht platform-built:** Im MVP wird das Mieterportal entlang der wiederverwendbaren Nähte gebaut (klare Layer-Schnittstellen, Querschnitte als Services, ein Connector statt SAP-Spaghetti), damit Use-Case #2 günstig wird. Generische Metadaten-/No-Code-Engines bleiben bewusst KANN/später — erst abstrahieren, wenn ein Muster zum dritten Mal auftritt, sonst entsteht die falsche Abstraktion.

---

## Querschnitt (für alle Layer)

**Zweck:** Übergreifende Qualitäten und nicht-funktionale Anforderungen — gelten für jeden Layer.

| Querschnitt | Priorität | Anforderung | Hinweis |
|---|---|---|---|
| Zero Trust | **MUSS** | Rollen & Berechtigungen, eIAM/AGOV-SSO an jedem Layer | IAMV; IAM-Strategie (SB011); Identitätenschutz (AR012) |
| Informationssicherheit (ISDS) | **MUSS** | Schutzbedarfsanalyse, ISDS-Konzept, IKT-Grundschutz; Verschlüsselung at-rest/in-transit | ISG/ISV; P041 (Schuban), P042 (ISDS), Si001 — verbindlich |
| Datenschutz | **MUSS** | Datenklassifikation, Bearbeitungsverzeichnis, Aufbewahrung/Löschung (Retention), ggf. DSFA | DSG, DSV |
| Observability / Audit | **MUSS** | Logs, Metriken, **Audit-Trail**, Nachweise | behördliche Nachweispflicht |
| Aktenführung / Records (GEVER) | SOLLTE | Geschäftsrelevante Vorgänge nachvollziehbar ablegen; Records-Management | Aktenführungspflicht (BGA); eCH-0002/0038, GEVER (A290) |
| Interoperability | **MUSS** | Offene APIs, eCH-Standards, Anschlussfähigkeit I14Y | Interoperabilitätsstandards (I007); eCH-0039/0058 |
| Accessibility | **MUSS** | WCAG 2.1 AA: Tastatur, ARIA, Kontrast, `prefers-reduced-motion` (i18n: SOLLTE) | rechtlich (BehiG); eCH-0059 |
| Digitale Souveränität | SOLLTE | Datenhaltung/Betrieb in CH-Hoheit; Cloud nur regelkonform; kein CLOUD-Act-Exposure | W012; Cloud-Strategie (SB020), Cloud-Prinzipien (AR010) |
| Governance / Ownership | **MUSS** | Change Management, Kosten, Risiken, QS, **Ownership**; Projektmethodik HERMES | **organisatorisch — aktueller Blocker**; eCH-0054 (HERMES) |
| Findability | SOLLTE | Metadaten, Lineage, Directories, Datenkatalog | → I14Y |
| Reusability | SOLLTE | Entkopplung, Modularität, austauschbare Layer; wiederverwendbare Bausteine über Use-Cases | → Kapitel «Erweiterbarkeit / Plattform»; BK «Verwaltung als Plattform» |

---

## Frontend Layer

**Zweck:** Interaktion und Self-Service der Nutzer:innen (mietende Verwaltungseinheiten, GS-Prüfer:innen, BBL-PFM, Auditor).
**Bezug / Standards:** CD Bund (`swiss/designsystem`), WCAG 2.1 AA / eCH-0059, eIAM/AGOV.

| Capability | Priorität | Anforderung | Hinweis |
|---|---|---|---|
| Formulare / Bedarfsmeldung | **MUSS** | Geführter 5-Schritt-Wizard: Validierung, Entwurf-Autosave (localStorage), NAW-Klassifikation, m²/FTE-Berechnung mit Belegungsfaktor, Validierungs-Übersicht vor dem Senden | im Prototyp vorhanden |
| Leistung beziehen (Self-Service) | **MUSS** | End-to-End-Abwicklung der Kerntransaktion; Service-Katalog: Bedarfsmeldung, Schadensmeldung, Umzug, Sonderreinigung, Möbel | Kernnutzen; im Prototyp vorhanden |
| Authentifizierung | **MUSS** | Login über eIAM/AGOV (SAML 2.0 / OIDC), rollenbasiert | → Querschnitt Zero Trust |
| Rollenspezifische Sichten | **MUSS** | Angepasste Navigation & Landing je Rolle (LBO/Mieter, GS-Prüfer:in, BBL-PFM, BBL-Campus, Auditor) | im Prototyp vorhanden; an Auth gekoppelt |
| Status / Dashboard / Cockpit | **MUSS** | Statuspipeline, Antrags-Inbox (Mieter) & Prüfer-Queue (GS), Detailansicht mit Anhängen + Verlauf/Historie | im Prototyp vorhanden |
| Accessibility | **MUSS** | WCAG 2.1 AA: Tastaturbedienung, ARIA, Kontrast, Fokus-Management, `prefers-reduced-motion` | rechtlich (BehiG); eCH-0059 |
| CD-Bund-Konformität | **MUSS** | Designsystem-Tokens, Noto Sans, Komponenten, Federal Header/Footer | ~99 % im Prototyp |
| Objektportfolio (Galerie / Liste / Karte) | SOLLTE | Liegenschaften der VE durchsuchen & filtern; Detailseite (Vertrag/Kennzahlen, Mietverhältnis, zugehörige Anträge, Dokumente, Kontakte) | im Prototyp vorhanden |
| Objektkarte | SOLLTE | MapLibre-Kartenansicht des Portfolios (Marker mit SAP-Objektlabel, Info-Popups) | im Prototyp vorhanden; eine Sicht des Portfolios |
| Pläne & Dokumente | SOLLTE | Dokumentenliste mit Filter (Typ / Objekt / Text), Einsehen & Herunterladen | im Prototyp vorhanden; → DMS/CDE |
| Suche | SOLLTE | Volltextsuche über Anträge, Objekte, Dokumente, News, Info-Abschnitte | im Prototyp vorhanden |
| i18n (DE/FR/IT/EN) | SOLLTE | Mehrsprachigkeit mit Sprachumschalter (Sprache als URL-Parameter); MVP DE-first, Chrome + Schlüsselseiten übersetzt, Restinhalte nachgelagert | Engine + Chrome im Prototyp angelegt |
| Benachrichtigungen / Kommunikation | SOLLTE | E-Mail-Notifikation bei Statuswechsel | |
| Anleitungen / News / Info-Inhalte | SOLLTE | Info-Seite (Sticky-TOC, Scroll-Spy), Kontexthilfe zu Prozessen, News-Übersicht/Detail | im Prototyp vorhanden |
| Grundriss-Viewer (Geschoss / Raum) | KANN | Interaktiver Grundriss (MapLibre + Floor/Space-GeoJSON): Einfärben nach Nutzung / SIA 416 / Mietende VE, Raum-Popups, Zoom/Pan/Vollbild | im Prototyp vorhanden; setzt Floor-/Space-Geodaten (PostGIS) voraus |
| Dokumentenvorschau / Viewer | KANN | In-App-Vorschau (Seiten-Navigation, Zoom/Pan, Kommentare) ohne Download | im Prototyp als Mock vorhanden |
| Standort- / Geosuche (swisstopo) | KANN | Adress-/Ortssuche via geo.admin.ch SearchServer, Treffer als Karten-Marker | im Prototyp vorhanden; → OGC API (Geo) |
| Deep-Linking & Teilen / Drucken | KANN | URL-State (View / Filter / Seite / Sprache im Hash), teilbare Links, Teilen-/Druck-Leiste | im Prototyp vorhanden |
| Tastatur-Shortcuts (Power-User) | KANN | Globale Shortcuts (z. B. `j`/`k`/`Enter`/`x` in der Prüfer-Queue) + Cheat-Sheet (`?`) | im Prototyp vorhanden |
| WIKI | KANN | Redaktionelle Inhalte | nachgelagert |
| Native Mobile-App | **WIRD NICHT** | Responsive Web (Mobile / Tablet / Desktop) genügt im MVP | |

## Prozess Layer

**Zweck:** Orchestrierung der Geschäftsprozesse (Bedarfsmeldung → Prüfung → Freigabe, Mutationen).
**Bezug / Standards:** BPMN 2.0 (eCH-0158 / eCH-0074), REST-Abstraktion (Backend-for-Frontend); Modellierungswerkzeuge (A736).

| Capability | Priorität | Anforderung | Hinweis |
|---|---|---|---|
| Prozess ausführen (Engine) | **MUSS** | Zustandsbehaftete, langlaufende Prozesse | Operaton (Apache 2.0) |
| Human Tasks / Aufgaben-Inbox | **MUSS** | Zuweisung, Bearbeitung, Fristen, Prüfer-Queue | |
| Prozess-Status | **MUSS** | Abfragbar für Frontend (pro Antrag) | |
| REST-API-Abstraktion (BFF) | **MUSS** | Engine nie direkt ans Frontend exponieren | SOA (SB007) |
| Logging | **MUSS** | Prozess-Ereignisse protokollieren | → Observability |
| Prozesse versionieren / ändern | SOLLTE | Deployment-Versionierung der Modelle | Betrieb / Wartung |
| Prozesse überwachen | SOLLTE | Monitoring / Cockpit (laufende Instanzen) | |
| BPMN-Modellierung (Fachanwender) | KANN | No-/Low-Code-Modellierung durch Fachseite; Konventionen eCH-0158 | MVP: wenige fix modellierte Prozesse |

## KI Layer *(SOLLTE — nicht MVP)*

**Zweck:** Kognitive Assistenz (Suche, Verstehen, Automatisieren).
**Bezug / Standards:** Strategie Einsatz von KI-Systemen (SB021); souveräne Infrastruktur (BIT-KI / on-prem), Datenklassifikation, KI-Governance; Digitale Souveränität (W012).

| Capability | Priorität | Anforderung | Hinweis |
|---|---|---|---|
| RAG-Wissenssuche | SOLLTE | «Fragen beantworten» über Portalinhalte / Dokumente | Phase 2 |
| LLM-Ausfüllhilfe | SOLLTE | «Fragen verstehen», geführtes Ausfüllen | Phase 2 |
| Wissen aggregieren / Erkenntnisse | KANN | Auswertungen, Zusammenfassungen | |
| MCP-Anbindung | KANN | Standardisierte Tool-/Datenanbindung | |
| Agents / Actions (Automatisierung) | KANN | Autonome Prozessautomatisierung — eng abgegrenzt, mit Human-in-the-Loop | spät; Governance-/Haftungs-/Souveränitätsfragen klären (SB021) |

> Architektonisch als **entkoppelter Layer** vorgesehen → später andockbar, ohne das MVP zu belasten (Reusability). Einführung nur auf souveräner Infrastruktur mit Datenklassifikation — sonst dasselbe CLOUD-Act-Thema wie bei BTP.

## Integration Layer

**Zweck:** System-zu-System-Anbindung und Datenfluss.
**Bezug / Standards:** REST, eCH-Schnittstellen (eCH-0039 / eCH-0058), OGC API (Geo) / eCH-0056; Interoperabilitätsstandards (I007).

| Capability | Priorität | Anforderung | Hinweis |
|---|---|---|---|
| REST-Anbindung Fachsysteme | **MUSS** | Anbindung SAP RE-FX (Objekte, Mietverhältnisse) | zentrale Datenquelle |
| Integration definieren / gestalten | **MUSS** | Konfigurierbare Schnittstellen | |
| Fehler- / Ausnahmebehandlung | **MUSS** | Retry, Dead-Letter, Alarmierung | robuster Betrieb |
| Metadaten / Lineage | SOLLTE | Herkunfts- / Verarbeitungsnachweis | → Findability / Audit |
| API-Gateway (separat) | KANN | APISIX / Kong erst bei mehreren Consumern / Skalierung | |
| WSO2-ESB-Vollstack | **WIRD NICHT** | Schwergewichtige ESB-Middleware | Thin-REST genügt im MVP |

## Data Layer

**Zweck:** Persistenz, Zugriff, Berechtigungen.
**Bezug / Standards:** PostgreSQL, PostGIS, Backup-Policy; Datenschutz (DSG/DSV).

| Capability | Priorität | Anforderung | Hinweis |
|---|---|---|---|
| Persistenz | **MUSS** | PostgreSQL als primäre Datenhaltung | |
| Daten lesen / schreiben | **MUSS** | Transaktionale CRUD-Operationen | |
| Berechtigungen | **MUSS** | Rollenbasiert / row-level | → Zero Trust |
| Backup / Recovery | **MUSS** | Gesicherte Wiederherstellung (Produktivbetrieb) | |
| PostGIS (Geodaten) | SOLLTE | Räumliche Daten für Objektkarte und Grundriss-Viewer | eCH-0031 (INTERLIS) |
| Load Balancing / HA | KANN | Erst bei Skalierung | |
| WSO2 API Gateway (separat) | **WIRD NICHT** | Im MVP überflüssig | |

## Anwendungen / Systeme Layer

**Zweck:** Bestehende Fachsysteme als Datenquellen und -senken.
**Bezug / Standards:** SAP RE-FX, DMS / CDE, Once-Only; Gemeinsame Stammdatenverwaltung (SB018).

| Capability | Priorität | Anforderung | Hinweis |
|---|---|---|---|
| SAP RE-FX anbinden | **MUSS** | Stammdaten Objekte / Mietverhältnisse lesen / schreiben | zentrale Quelle |
| Once-Only-Prinzip | SOLLTE | Keine Doppelerfassung bereits vorhandener Daten | → Gemeinsame Stammdatenverwaltung (SB018) |
| Dokumente (DMS / CDE) | SOLLTE | Pläne & Dokumente anbinden | → Aktenführung/GEVER |
| Sonstige IT-Systeme | KANN | Weitere Quellen nach Bedarf | |

---

*Zugehörige Seiten: «Marktscreening — Mieterportal MVP», «Lösungsarchitektur & Varianten».*
