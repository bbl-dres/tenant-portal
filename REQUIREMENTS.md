# Anforderungskatalog — BBL Mieter-/Serviceportal (MP)

> **Stand:** 2026-05-18 · **Methodik:** HERMES (Anforderungskatalog) · **Priorisierung:** MoSCoW
>
> Konsolidierter Anforderungskatalog für das BBL Mieter-/Serviceportal,
> zusammengeführt aus den Quelldokumenten in
> [`docs/BBL Requierements/intermediate/`](docs/BBL%20Requierements/intermediate/_index.md).
> Diese Datei ist die einzige zu pflegende Anforderungsquelle; sie ersetzt
> nicht die ursprünglichen Fachkonzepte, sondern macht deren Inhalt
> auffindbar, nachverfolgbar und priorisierbar.

## 1. Kontext

### 1.1 Ausgangslage

Heute existiert kein einheitliches Mieter-/Serviceportal als Single Point of
Contact (SPOC) zwischen BBL und seinen Mietern (Verwaltungseinheiten,
Departemente, Bundesämter). Informationen und Leistungen werden über
Einzellösungen je Funktionalität sowie über manuelle Kanäle (Telefon, E-Mail,
PDF, Excel) abgewickelt — mit Medienbrüchen, Intransparenz und langen
Reaktionszeiten als Folge. *(Quelle: IMMO_Mieterportal_Systemkonzept §1.)*

### 1.2 Ziel

Bereitstellung eines Portals, das

- Stakeholder themenbezogen zu Kompetenzzentren und Services leitet,
- Informationen als Self-Service bereitstellt,
- digitale Zusammenarbeit inkl. Rollen- und Berechtigungssteuerung ermöglicht,
- den genehmigten Bedarf direkt in SAP ePPM/PPM überführt.

### 1.3 Scope dieses Anforderungskatalogs

| Phase | Inhalt | MoSCoW-Bandbreite |
|---|---|---|
| **Pilot** | Use Case «Landing Page (SPOC)» + Use Case «Bedarf Unterbringung (Antragsformular)» | Must / Should |
| **Roadmap Fall A** | Basisleistungen SUPERB (Geschäftsblätter, Belegungsplanung, FLM, Inventar, Schadensmeldung, Umzug, Möblierungs-Shop) | Should / Could |
| **Roadmap Fall B** | Unabhängig SUPERB (Portfoliostrategie-Darstellung, Kennzahlen — Umsetzung im GIS Portal zu prüfen) | Could |
| **Roadmap Fall C** | Strategische Freigabe (Ereignisfall, Schulungen, Weisungen) | Could / Won't (diese Iteration) |

### 1.4 Empfohlene Systemvariante

**Create** (Eigenentwicklung auf RHOS + BIT-Standardservices) — vgl.
[Loesungsarchitektur Pilot Antrag Unterbringung](docs/BBL%20Requierements/intermediate/Loesungsarchitektur%20Pilot%20Antrag%20Unterbringung.md)
§4 und [IMMO_Mieterportal_Systemkonzept](docs/BBL%20Requierements/intermediate/IMMO_Mieterportal_Systemkonzept.md)
§4 (Empfehlung). Buy bleibt fachlich attraktiv für eine spätere
Plattformstrategie; Adapt deckt den Pilotprozess nicht ab.

### 1.5 Akteure / Rollen

| Kürzel | Rolle | Hauptaufgabe im MP |
|---|---|---|
| **BBL Campus / Fachamt** | Fachlicher Owner des Portals | Inhalt, Qualität, Aktualität, Betriebskonzept Fach |
| **BBL PFM** | Portfolio Management | Empfang & Steuerung Bedarf in SAP ePPM |
| **BBL IM / OM** | Immobilien-/Objektmanagement | Frühzeitige Information, nachgelagerte Prozesse |
| **LE (BIT)** | Leistungserbringer IT | Technische Umsetzung und Betrieb |
| **VE / ILBO** | Verwaltungseinheit, Logistikbeauftragte | Bedarfsanmeldung |
| **GS** | Generalsekretariat Departement | Beurteilung, Freigabe oder Rückweisung |
| **Mieter / Nutzer** | Endnutzer in der VE | Informationsabruf, Self-Service |

### 1.6 Notation MoSCoW

| Priorität | Bedeutung in diesem Katalog |
|---|---|
| **Must** | Pilot-Go-Live blockierend |
| **Should** | Wichtig für Pilot-Mehrwert, aber nachreichbar |
| **Could** | Wünschenswert; Umsetzung in Roadmap-Iterationen |
| **Won't** | In diesem Vorhaben ausgeschlossen (für Transparenz dokumentiert) |

### 1.7 Quellen-Index (verlinkt)

Alle `Quelle`-Zellen verweisen auf Dateien in
[`docs/BBL Requierements/intermediate/`](docs/BBL%20Requierements/intermediate/_index.md).
Die wichtigsten Dokumente:

- **Fachkonzept**: [SUPERB_Fachkonzept_ERP_IMMO_Mieterportal NEW V05](docs/BBL%20Requierements/intermediate/SUPERB_Fachkonzept_ERP_IMMO_Mieterportal%20NEW%20V05.md) (Heinz Ryter PO, Holger Ludwig Autor, Stand 10.11.2025)
- **Systemkonzept**: [IMMO_Mieterportal_Systemkonzept](docs/BBL%20Requierements/intermediate/IMMO_Mieterportal_Systemkonzept.md)
- **Use Cases**: [Mieterportal Gesamt V2.1](docs/BBL%20Requierements/intermediate/Mieterportal%20Gesamt%20V2.1.md), [Use Case Bedarf Unterbringung V2.1](docs/BBL%20Requierements/intermediate/Use%20Case%20Bedarf%20Unterbringung%20V2.1.md), [Use Case Landing Page V2.0](docs/BBL%20Requierements/intermediate/Use%20Case%20Landing%20Page%20V2.0.md)
- **Lösungsarchitektur Pilot**: [Loesungsarchitektur Pilot Antrag Unterbringung](docs/BBL%20Requierements/intermediate/Loesungsarchitektur%20Pilot%20Antrag%20Unterbringung.md)
- **Workshop Erwartungshaltung**: [WS 1 Mieterportal Erwartungshaltung](docs/BBL%20Requierements/intermediate/WS%201%20Mieterportal%20Erwartungshaltung.md), [Mieterportal_ WS Erwartungshaltung Mieter](docs/BBL%20Requierements/intermediate/Mieterportal_%20WS%20Erwartungshaltung%20Mieter.md)

---

## 2. Funktionale Anforderungen

### 2.1 Landing Page / SPOC (`FUNC-LP-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| FUNC-LP-001 | Single Point of Contact (SPOC) für alle BBL-Mieterleistungen | **Must** | Als Mieter will ich einen einzigen Einstieg für alle BBL-Leistungen, damit ich nicht über Telefon, E-Mail und Einzeltools navigieren muss. | Workshop WS1 (alle VE) | Use Case Landing Page V2.0; IMMO_Systemkonzept §2.1.2 | Heute kein Portal vorhanden (System-Ist). |
| FUNC-LP-002 | Visuelle Einfachheit, übersichtliche Struktur, selbsterklärende Bedienung | **Must** | Als Mieter will ich mich ohne Schulung zurechtfinden, damit ich Aufgaben in wenigen Klicks erledigen kann. | Workshop WS1; BBL Campus | Use Case Landing Page V2.0 | Heutige Kundenplattform BBL ist als «veraltet, unübersichtlich» beschrieben (Use Case Gesamt). |
| FUNC-LP-003 | Rollenbasierte Navigation und Freigabe von Detailleistungen | **Must** | Als Verantwortlicher will ich nur die für meine Rolle relevanten Funktionen sehen (z. B. Verträge, Budgetinfo), damit Informationen geschützt und kontextbezogen bleiben. | BBL Campus; Workshop WS1 | Use Case Landing Page V2.0; IMMO_Systemkonzept §2.1.2 | Siehe NFA-IAM-* für die Berechtigungsgrundlage. |
| FUNC-LP-004 | Wizards/Assistenten bei komplexen Funktionen (Bedarfsmeldungen, Bestellungen, Analysen) | **Must** | Als ILBO will ich durch komplexe Anträge geführt werden, damit ich keine Pflichtfelder übersehe. | Workshop WS1; BBL PFM | Use Case Landing Page V2.0 | Wizard-Funktion ist Schlüssel-Differenzierung zur Adapt-Variante (siehe Systemkonzept §2.1.6). |
| FUNC-LP-005 | Self-Service-Dashboards (Kennzahlen, Eingabemasken direkt im MP) | **Should** | Als Mieter will ich relevante Kennzahlen ohne Rückfrage einsehen können, damit ich schneller arbeite. | Workshop WS1 | Use Case Landing Page V2.0 | Datenanbindung an Quellsysteme pro Kennzahl klären. |
| FUNC-LP-006 | Vorschlagsfunktion aus Historie («was habe ich zuletzt bestellt, beantragt …») | **Could** | Als Mieter will ich Anträge aus früheren Eingaben vorausgefüllt erhalten, damit ich nicht von Null beginne. | Workshop WS1 | Use Case Landing Page V2.0 | Verlangt Speicherung historischer Antragsdaten — Datenschutz / Aufbewahrung klären. |
| FUNC-LP-007 | Self-Service-Downloads (Pläne, Gebäudeinformationen, Schulungsangebote) | **Should** | Als Mieter will ich Pläne und Schulungsmaterial selbst herunterladen können, damit ich nicht nach Ansprechpartnern suchen muss. | Workshop WS1; BBL Campus | Use Case Landing Page V2.0 | Inhalte werden vom Fachamt BBL gepflegt. |
| FUNC-LP-008 | Responsive Design für mobile Geräte (insb. wenn kein IAM nötig) | **Should** | Als Mieter will ich öffentliche Inhalte auch vom Smartphone abrufen können, damit ich unterwegs informiert bleibe. | Workshop WS1 | Use Case Landing Page V2.0 | Mobile Tiefe für autorisierte Funktionen separat bewerten (Geräte-Compliance). |
| FUNC-LP-009 | Quellennachweis, Ansprechpartner und Aktualitätsnachweis bei allen Informationen | **Must** | Als Mieter will ich Quelle, Ansprechpartner und Aktualität jeder Information sehen, damit ich der Plattform vertrauen kann. | Workshop WS1 | Use Case Landing Page V2.0 | «Definierte Qualitätsanforderungen» — Akzeptanzkriterium pro Inhalt. |
| FUNC-LP-010 | Inhalts-Selbstpublikation/-löschung durch Fachamt BBL (Low-Code / Makro) | **Should** | Als fachlicher Verantwortlicher MP will ich Inhalte selbst publizieren und löschen können, damit Aktualität nicht von IT-Releases abhängt. | BBL Campus | Use Case Landing Page V2.0; IMMO_Systemkonzept §2.1.2 | «Nach definiertem Betriebskonzept Fach.» |
| FUNC-LP-011 | Freie Anbindung digitaler Services über API aus allen Systemen | **Should** | Als Fachverantwortlicher will ich neue Services flexibel anbinden können, damit künftige Use Cases ohne Plattformwechsel hinzukommen. | BBL Campus; BIT | Use Case Landing Page V2.0 | Setzt Integrationsschicht voraus — siehe NFA-INT-*. |
| FUNC-LP-012 | Landing Page bietet Workflow-Bausteine, falls das anbietende System keine bereitstellt | **Could** | Als Fachverantwortlicher will ich einfache digitale Workflows direkt im MP bauen können, damit ich kleine Prozesse nicht in Quellsystemen erzwingen muss. | BBL Campus | Use Case Landing Page V2.0 | Konflikt-Risiko mit Buy-/Standard-Plattformen — Architekturentscheid abwarten. |

### 2.2 Bedarf Unterbringung — Antragstellung (Rolle ILBO/VE) (`FUNC-AU-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| FUNC-AU-001 | Auswahl VE/DEP mit automatischer Zuweisung verantwortlicher BBL-Rollen | **Must** | Als ILBO will ich meine VE wählen und automatisch die zuständigen BBL-Kontakte sehen, damit ich meine Anfrage richtig adressiere. | BBL PFM (Stand 04.11.2025) | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf §Eingabeformat | «Anzeige dieser Rollen» (V2.1-Erweiterung). |
| FUNC-AU-002 | Automatisierte Berechtigungsvergabe gemäss VE, übersteuerbar durch definierte Rolle | **Must** | Als ILBO will ich automatische Zugriffsrechte für meinen Antragsprozess, damit ich nicht manuell auf Freischaltungen warten muss. | BBL PFM; BIT | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf §Eingabeformat | Übersteuerung «bei Bedarf — definierte Rolle» (Sonderfälle). |
| FUNC-AU-003 | Auswahl Unterbringungsbedarf nach Standort und Gebäudekategorie (PFM-Kategorien) | **Must** | Als ILBO will ich Standort und Gebäudekategorie strukturiert wählen, damit Folgeberechnungen korrekt anstossen. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4; Use Case Bedarf | Standort ergänzt in V2.1 zur Kategorie. |
| FUNC-AU-004 | Interaktive Befragung zu Arbeitsstilformen (NAW-Faktor für Flächenbedarfsermittlung) | **Must** | Als ILBO will ich durch eine Befragung den passenden NAW-Faktor erhalten, damit der Flächenbedarf realitätsnah berechnet wird. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | Wizard-Subform pro Arbeitsplatz-Antrag. |
| FUNC-AU-005 | Provisorische UK-Kostenberechnung nach Gebäudekategorie (m²·CHF) und Standort | **Must** | Als ILBO will ich frühzeitig eine Kostenschätzung sehen, damit ich Wirtschaftlichkeit grob beurteilen kann. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | Berechnungsformeln definiert in §4.1.1.3.4.6 (siehe FUNC-AU-014/015). |
| FUNC-AU-006 | Nachweis Wirtschaftlichkeit als Upload oder Berechnungstool | **Must** | Als ILBO will ich den Wirtschaftlichkeitsnachweis hochladen oder direkt im MP berechnen, damit er Bestandteil meines Antrags ist. | BBL PFM; GS | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | «Nachweis rechtliche Grundlagen» als separater Upload (FUNC-AU-007). |
| FUNC-AU-007 | Nachweis rechtliche Grundlagen via Link-Upload | **Must** | Als ILBO will ich die rechtliche Grundlage referenzieren, damit GS die Legitimation prüfen kann. | GS; BBL PFM | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | Als Anhang an Bedarf in ePPM (siehe §4.1.1.3.4 Zeile 4.4). |
| FUNC-AU-008 | PDF-Upload-Möglichkeit für ergänzende Dokumente | **Must** | Als ILBO will ich beliebige PDFs anhängen können, damit ich Kontextdokumente bereitstellen kann. | BBL PFM | Use Case Bedarf (V2.1-Erweiterung) | Datei-Scan / Malware-Prüfung siehe NFA-SEC-004. |
| FUNC-AU-009 | Antrag löschen (vollständig oder teilweise ausgefüllt) | **Should** | Als ILBO will ich einen unfertigen Antrag verwerfen können, damit ich keine Daten-Leichen produziere. | BBL PFM | Use Case Bedarf (V2.1-Erweiterung) | Soft-Delete mit Audit-Eintrag empfohlen. |
| FUNC-AU-010 | Infotexte für User (Popup) | **Should** | Als ILBO will ich Erklärungen zu Feldern eingeblendet sehen, damit ich die Bedeutung verstehe ohne externe Hilfe. | BBL PFM | Use Case Bedarf (V2.1-Erweiterung) | Inline-Hilfe; mehrsprachig vorgesehen (DE/FR/IT — Bestätigung offen). |
| FUNC-AU-011 | Kategorisierung der Eingabefelder in *Muss* und *Kann* | **Must** | Als ILBO will ich klar erkennen, welche Felder zwingend sind, damit Rückweisungen wegen fehlender Daten vermieden werden. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | UI-Markierung + serverseitige Validierung. |
| FUNC-AU-012 | Automatische Adress-Ableitung: Wirtschaftseinheit, Gebäude (aus Strasse/Adresse) | **Must** | Als ILBO will ich nach Eingabe der Strasse Wirtschaftseinheit und Gebäude automatisch erhalten, damit ich keine internen Schlüssel kennen muss. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (Zeilen 3.5/3.6) | Datenbezug GWR/EGID prüfen. |
| FUNC-AU-013 | Ausnahmen-Erfassung: neuer Bedarf ohne bestehende WE oder Gebäude | **Must** | Als ILBO will ich auch Bedarfe für noch nicht erfasste Standorte melden können, damit Greenfield-Bedürfnisse abbildbar sind. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (Zeile 3.8) | Folgeprozess mit BBL-Stammdatenpflege definieren. |
| FUNC-AU-014 | Auto-Berechnung Büroarbeitsplätze: Desksharing 0.8 AP/FTE, HNF2 12 m²/FTE, GF 24 m²/FTE, max. BK CHF 60/m² GF | **Must** | Als ILBO will ich nach FTE-Angabe automatisch die Flächenwerte sehen, damit ich nicht parallel rechnen muss. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4.6.1 | Formeln SIA 416. Werte als zentral pflegbare Stammdaten umsetzen. |
| FUNC-AU-015 | Auto-Berechnung Erstinvestition Mobiliar: 650 CHF/m² HNF2 | **Must** | Als ILBO will ich die initiale Möblierungskosten gleich sehen, damit ich das Gesamt-Investment verstehe. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4.6.1 | Wert als pflegbarer Stammdatensatz. |
| FUNC-AU-016 | Bestellung Schlafplätze (SEM): Anzahl Mussfeld, Auto-Berechnung CHF 120 000 / Schlafplatz | **Must** | Als ILBO mit SEM-Bedarf will ich die Schlafplatz-Investition direkt berechnet sehen, damit der Antrag belastbar wird. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4.6.2 | SEM-spezifisch — Geltungsbereich klären. |
| FUNC-AU-017 | Bestellung EDA: manueller Übertrag Flächen gemäss Standardraumprogramm, keine automatische Hinterlegung | **Must** | Als EDA-ILBO will ich Flächen nach EDA-Raumstandards manuell erfassen, weil Auslandsstandards nicht typisierbar sind. | EDA (Markus Osterburg / Adrienne Enz / Sandro Negro) | Fachkonzept NEW V05 §4.1.1.3.4.6.3 | Kanzlei = HNF Standardraumprogramm; RE = HNF gem. RK 1-5; DW = HNF gem. RK 6. |
| FUNC-AU-018 | Sonstige Bestellungen: HNF2 stets in m² | **Must** | Als ILBO eines nicht-standardisierten Bedarfs will ich HNF2 in m² erfassen, damit Folgeberechnungen einheitlich bleiben. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4.6.4 | — |
| FUNC-AU-019 | Erfassung Grossantrag-Felder 4.1–4.12 vollständig als Mussfelder | **Must** | Als ILBO will ich strukturiert alle für einen Grossantrag geforderten Inhalte erfassen, damit GS prüfbereit ist. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (Zeilen 4.1–4.12) | Inhalte: Kurzbeschrieb, Mängel Ist, Rechtl. Grundlagen, Betriebliche Ziele, Alternativen, Wirtschaftlichkeit, Soll-Zustand, planer. Abhängigkeiten, Termine, Kostenvorstellung, FTE/AP. |
| FUNC-AU-020 | Auto-Berechnung grober Termine anhand Höhe der Investitionssumme | **Should** | Als ILBO will ich grobe Termine direkt aus der Investitionssumme erhalten, damit ich realistische Erwartungen kommunizieren kann. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (Zeile 4.10) | Schwellwerte / Berechnungslogik zu spezifizieren. |
| FUNC-AU-021 | Antragstypen unterscheidbar: Grossantrag, Kleinantrag, Mobiliar | **Must** | Als ILBO will ich den Antragstyp wählen können, damit nur die für meinen Fall relevanten Felder erscheinen. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3 (allgemeine Beschreibung); §4.1.1.1.1.1.1-3 | §4.1.1.1.1.1.1/.2/.3 sind in V05 noch unbestückt — Detailfelder pro Antragstyp folgen. |

### 2.3 Bedarf Unterbringung — Beurteilung & Freigabe (Rolle GS) (`FUNC-FG-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| FUNC-FG-001 | Feldbezogene Zustimmung: ok / NoK / Bemerkung pro zustimmungspflichtigem Feld | **Must** | Als GS-Vertreter will ich Felder einzeln zustimmen oder ablehnen können, damit ich Begründungen punktgenau geben kann. | GS-Vertreter (WBF, UVEK u. a.) | Fachkonzept NEW V05 §4.1.1.1.1.1; Use Case Bedarf §Eingabeformat Beurteilung | — |
| FUNC-FG-002 | Gesamtfreigabe oder Rückweisung mit Auflage | **Must** | Als GS will ich einen Antrag mit konkreten Auflagen zurückweisen können, damit der ILBO weiss, was zu korrigieren ist. | GS-Vertreter | Fachkonzept NEW V05 §4.1.1.1.1.1; Use Case Bedarf | — |
| FUNC-FG-003 | Pflicht-Textfeld zur Begründung von Freigabe und Rückweisung | **Must** | Als GS will (und muss) ich Entscheide schriftlich begründen, damit Nachvollziehbarkeit gewährleistet ist. | GS-Vertreter; Compliance | Use Case Bedarf V2.1 §Eingabeformat Beurteilung (Erweiterung V2.1) | Audit-relevant — siehe NFA-COMP-003. |
| FUNC-FG-004 | Benachrichtigung aller beteiligten Rollen nach Bearbeitung (E-Mail + Statusanzeige) | **Must** | Als beteiligte Rolle will ich nach jedem Statuswechsel informiert werden, damit ich nicht aktiv abfragen muss. | Alle Rollen (Workshop WS1) | Use Case Bedarf V2.1 §Eingabeformat Beurteilung | E-Mail-Versand via bestehende Mail-Infrastruktur (siehe NFA-INT-004). |

### 2.4 Bedarf Unterbringung — Übernahme BBL PFM / SAP ePPM (`FUNC-PFM-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| FUNC-PFM-001 | Übergabe des genehmigten Bedarfs aus MP direkt in SAP ePPM (Bedarfsmeldung) | **Must** | Als BBL PFM will ich genehmigte Bedarfe ohne manuelle Nacherfassung im ePPM sehen, damit keine Medienbrüche entstehen. | BBL PFM | Fachkonzept NEW V05 §4.1.1.1.1.1; Systemkonzept §2.1.4 | Kernintegration. Feldmapping siehe FUNC-PFM-002. |
| FUNC-PFM-002 | Vollständiges Feldmapping MP → ePPM gemäss §4.1.1.3.4 (Antragsteller, Adresse/WE/Gebäude, Grossantrag 4.1–4.12, FTE/AP, Metriken) | **Must** | Als BBL PFM will ich alle Antragsdaten im richtigen ePPM-Reiter wiederfinden, damit Folgeprozesse anschliessen können. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (Spalte EPPM-Feld) | Mapping in V05 für 23 Felder spezifiziert; einige Reiter «Evt. neue Felder» — zu klären. |
| FUNC-PFM-003 | Benachrichtigung aller beteiligten Rollen bei Eingang im PFM (Statusanzeige im MP) | **Must** | Als beteiligte Rolle will ich erkennen, dass der Antrag bei BBL angekommen ist, damit der Übergang transparent bleibt. | Alle Rollen | Use Case Bedarf §Eingabeformat BBL | Status «Übernommen in ePPM» pflegen. |
| FUNC-PFM-004 | Fehlerhandling und Reprocessing bei fehlgeschlagener SAP-Übergabe | **Must** | Als BBL PFM (Betrieb) will ich fehlgeschlagene Übergaben gezielt neu auslösen können, damit Anträge nicht stillstehen. | BIT (Betrieb); BBL PFM | Systemkonzept §2.1.9 (Buy) und §2.1.12 (Create) | Logging/Audit-Trail siehe NFA-SEC-005. |
| FUNC-PFM-005 | Frühzeitige Information an BBL IM/OM und weitere BBL-Rollen | **Should** | Als BBL IM/OM will ich relevante Bedarfe früh sehen, damit Kapazitätsplanung und Folgekoordination starten können. | BBL IM/OM (Use-Case-Stakeholder) | Use Case Bedarf §Wirkung/Nutzen | Definition «verantwortliche Rollen BBL» noch offen (V2.1). |

### 2.5 Inbox, Status und Übersicht (`FUNC-INB-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| FUNC-INB-001 | Persönliche Inbox mit allen offenen / bearbeiteten / abgeschlossenen Anträgen pro Rolle | **Must** | Als ILBO/GS/PFM will ich meine Vorgänge in einer Inbox sehen, damit ich Prioritäten setzen kann. | Alle Rollen (Use-Case-Stakeholder) | Use Case Bedarf §Eingabeformat (E-Mail + Statusinformation auf MP — Inbox) | — |
| FUNC-INB-002 | Statusführung durchgängig (Antrag erfasst → GS in Prüfung → freigegeben/rückgewiesen → in SAP übernommen → abgeschlossen) | **Must** | Als beteiligte Rolle will ich den aktuellen Status jedes Antrags jederzeit erkennen, damit ich auf Verzögerungen reagieren kann. | Workshop WS1; BBL Campus | Use Case Bedarf §Eingabeformat; Systemkonzept §2.1.9/§2.1.12 | Status-Codes als Stammdaten pflegen. |

### 2.6 Reporting & Analytics (`FUNC-REP-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| FUNC-REP-001 | Anonymisierte analytische Auswertungen (Anzahl Meldungen pro VE/Jahr und deren Status) | **Should** | Als BBL Campus / PFM will ich aggregierte Mengen-/Statuszahlen sehen, damit ich Steuerung und Ressourcen planen kann. | BBL Campus; BBL PFM | Use Case Bedarf §letzter Abschnitt | Datenschutzkonforme Anonymisierung erforderlich. |
| FUNC-REP-002 | Zugriff auf Auswertungen nur für berechtigte Rollen | **Must** | Als Compliance-Verantwortlicher will ich sicherstellen, dass nur berechtigte Rollen aggregierte Daten sehen, damit Datenschutz gewahrt bleibt. | Compliance; BBL Campus | Use Case Bedarf §letzter Abschnitt | Siehe NFA-IAM-* und NFA-COMP-*. |

### 2.7 Stammdaten und Konfiguration (`FUNC-CC-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| FUNC-CC-001 | Kennzahlen je Hauptnutzfläche HNF 1-6 und HNF2 hinterlegt | **Must** | Als BBL Fachadmin will ich m²-Kennzahlen pflegen können, damit Kostenberechnungen konsistent bleiben. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3 («Allgemeine Beschreibung»-Tabelle) | Dient automatischer Kosten- (Miete oder Investition) Berechnung. |
| FUNC-CC-002 | Kennzahlen Kosten Mobiliar pro Arbeitsplatz (AP) hinterlegt | **Must** | Als BBL Fachadmin will ich Mobiliarkosten pro AP zentral pflegen, damit alle Anträge denselben Kalkulationsstandard nutzen. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3 | — |
| FUNC-CC-003 | Kosten für das Mietermodell hinterlegt | **Must** | Als BBL Fachadmin will ich die Mietkonditionen zentral pflegen, damit ILBO konsistente Schätzungen erhalten. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3 | Vgl. «Mietzinsrechner» in Mieterportal Gesamtkonzept §1.1.3 (VILB-Aufgabencluster 1). |

---

## 3. Nicht-funktionale Anforderungen

### 3.1 Identity & Access Management (`NFA-IAM-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| NFA-IAM-001 | Authentisierung am Portal via **eIAM** | **Must** | Als BBL-Anwender will ich mich mit meinem Bundes-Login anmelden, damit ich kein neues Konto verwalten muss. | BIT; BBL Campus | Systemkonzept §2.1.12 (Create) | eIAM = Bundes-IAM für interne/Verwaltungs-Anwendungen. Konflikt zur Vision «AGOV für Mieter (öffentliche User)» nicht in Pilot-Scope geklärt. |
| NFA-IAM-002 | Delegiertes Management für VE/DEP-bezogene Zugriffsrechte, Stellvertretungen, organisatorische Zuständigkeiten | **Must** | Als VE-Berechtigungspfleger will ich Rollen selbst delegieren können, damit Personalwechsel nicht zu IT-Tickets werden. | BBL Campus; BIT | Systemkonzept §2.1.12; §2.1.13 (Punkt «IAM und Rollenmodell») | — |
| NFA-IAM-003 | Rollenbasierte Autorisierung im Portal (RBAC) konsistent zur eIAM-Identität | **Must** | Als beliebige Rolle will ich nur die für meine Rolle vorgesehenen Aktionen/Felder sehen, damit Trennung der Verantwortlichkeiten gilt. | BBL Campus; Compliance | Systemkonzept §2.1.4; §2.1.12 | RBAC = Role-Based Access Control. |
| NFA-IAM-004 | Optionale spätere Anbindung Datenbezugspunkt (DBP) für zusätzliche Organisations-/Funktionsattribute | **Could** | Als BBL Berechtigungs-Verantwortlicher will ich attributbasierte Verfeinerung der Zugriffe ermöglichen, sobald fachlich erforderlich. | BBL Campus | Systemkonzept §2.1.12; §2.1.13 | Nicht Pilot-Scope; als Erweiterungspunkt vermerken. |

### 3.2 Sicherheit (`NFA-SEC-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| NFA-SEC-001 | Vorgeschaltete Absicherungs- und Zugangsschicht (Load Balancer + WAF) | **Must** | Als Betrieb will ich das Portal vor unautorisiertem Zugriff und Web-Attacken schützen, damit Vertraulichkeit und Verfügbarkeit gewährleistet sind. | BIT (Betrieb) | Systemkonzept §2.1.11 (Create) | WAF = Web Application Firewall. |
| NFA-SEC-002 | Zentrale Secrets-/Key-Verwaltung für Applikationszugänge (z. B. SAP-Tokens, API-Keys) | **Must** | Als Betrieb will ich Schlüssel zentral und rotierbar halten, damit Kompromittierungen begrenzt bleiben. | BIT (Betrieb) | Systemkonzept §2.1.11 (Create) | RHOS-Standardservice nutzbar. |
| NFA-SEC-003 | Schutzfunktionen für Datei-Uploads (Malware-Prüfung) | **Must** | Als Betrieb will ich hochgeladene Dateien auf Schadcode prüfen, damit der Bestand des Portals und der Backend-Systeme geschützt bleibt. | BIT (Betrieb); BBL Campus | Systemkonzept §2.1.11 (Create) | Vorgelagert vor Ablage in Objektspeicher (siehe FUNC-AU-008). |
| NFA-SEC-004 | Klassifizierung der verarbeiteten Daten gemäss ISG (intern / vertraulich) festlegen | **Must** | Als Compliance-Verantwortlicher will ich die ISG-Klassifikation kennen, damit angemessene Schutzmassnahmen greifen. | Compliance; BBL Campus | Fachkonzept NEW V05 §Klassifizierung (Zeile leer — explizit zu definieren) | Fachkonzept-Klassifikation in V05 noch nicht ausgefüllt. |
| NFA-SEC-005 | Vollständiges Audit-Trail über Antragsbearbeitung, Statuswechsel, Freigaben/Rückweisungen | **Must** | Als Compliance/Revision will ich jeden Entscheid nachvollziehen können, damit Verwaltungsrechtsanforderungen erfüllt sind. | Compliance; GS | Systemkonzept §2.1.9 (Buy) und §2.1.12 (Create) | Datenhaltung in RHOS-Datenbank. |

### 3.3 Integration & Schnittstellen (`NFA-INT-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| NFA-INT-001 | Anbindung an SAP ePPM/PPM über BIT Webservice Gateway (WSG) und bestehende SAP-Middleware | **Must** | Als Architekt will ich definierte Schnittstellen statt direkter Kopplung, damit Portal und SAP unabhängig betrieben werden können. | BIT; BBL PFM | Systemkonzept §2.1.11 (Create) | Entkopplung erleichtert Betrieb und Fehlerbehandlung. |
| NFA-INT-002 | Geschäftsobjekt-Mapping in SAP ePPM-Bedarfsmeldung dokumentiert | **Must** | Als Architekt will ich das Zielgeschäftsobjekt und seine Felder spezifiziert haben, damit Mapping testbar wird. | BBL PFM; BIT | Fachkonzept NEW V05 §4.1.5.1 (Template — noch zu füllen) | §4.1.5.1 in V05 als «Klicken oder tippen» belassen — Spezifikationslücke. |
| NFA-INT-003 | Synchrone oder definierte verzögerte Übermittlung beschrieben | **Should** | Als Architekt will ich den Übertragungszeitpunkt festgelegt haben, damit Reaktionszeiten und Lasten planbar sind. | BIT | Fachkonzept NEW V05 §4.1.5.3 (Template — noch zu füllen) | Empfehlung: synchron beim Freigabezeitpunkt. |
| NFA-INT-004 | Benachrichtigungen via bestehende Bundes-Mail-Infrastruktur | **Must** | Als Betrieb will ich Standard-Mail-Wege nutzen, damit kein zusätzlicher Mailserver-Stack betrieben werden muss. | BIT (Betrieb) | Systemkonzept §2.1.11 (Create) | — |
| NFA-INT-005 | Fehlerrückmeldung an aufrufendes System (z. B. Beleg-Nr., Fehler-Id) | **Must** | Als Bediener-Rolle will ich nach Übergabe eine eindeutige Rückmeldung erhalten, damit Erfolg/Fehler nachvollziehbar sind. | BIT; BBL PFM | Fachkonzept NEW V05 §4.1.5.5/§4.1.5.6 (Template) | Template-Felder noch zu füllen. |
| NFA-INT-006 | Freie Anbindung weiterer digitaler Services über offene APIs | **Should** | Als Fachverantwortlicher will ich neue Services anbinden, damit das MP zur Plattform für Folge-Use-Cases werden kann. | BBL Campus | Use Case Landing Page V2.0 | Architekturentscheidung mit Buy-/Plattform-Variante koordinieren. |

### 3.4 Hosting & Plattform (`NFA-PLT-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| NFA-PLT-001 | Zielplattform Pilot: **RHOS (Red Hat OpenShift)** | **Must** | Als Architekt will ich einen standardisierten Plattform-Stack nutzen, damit Betrieb und Sicherheitsprozesse des BIT integrierbar sind. | BIT | Systemkonzept §2.1.11; Lösungsarchitektur §3.0 | Entscheid auf Basis Variantenvergleich (Empfehlung Create). |
| NFA-PLT-002 | Betrieb durch den IT-Leistungserbringer (BIT) | **Must** | Als BBL will ich, dass der Betrieb durch den LE erfolgt, damit das Fachamt entlastet ist und SLA-fähig bleibt. | BBL Campus; BIT | Use Case Gesamt §Beschreibung; Systemkonzept §2.1.13 | Reines Self-Service-Modell nicht vorgesehen. |
| NFA-PLT-003 | Datenhaltung: Datenbank für Prozess-, Status-, Protokolldaten (Antrag, Bearbeitungsstatus, Freigabeentscheid) | **Must** | Als Betrieb will ich Antragsdaten persistieren, damit Wiederaufnahme und Auswertungen möglich sind. | BIT (Betrieb) | Systemkonzept §2.1.11 | RHOS-Service. |
| NFA-PLT-004 | Objektablage für Uploads/Nachweise (Wirtschaftlichkeit, rechtliche Grundlagen, PDFs) | **Must** | Als Betrieb will ich grosse Dateien getrennt von der Antrags-DB ablegen, damit Performance und Backup-Strategien tragen. | BIT (Betrieb) | Systemkonzept §2.1.11 | — |
| NFA-PLT-005 | Lifecycle/Release-/Patch-/Betriebsdokumentation | **Must** | Als Betrieb will ich klare Release-/Patch-Prozesse, damit der Service wartbar bleibt. | BIT (Betrieb) | Systemkonzept §2.1.13 (Punkte Betrieb und Verantwortung) | — |
| NFA-PLT-006 | Vermeidung einer Customizing-Spirale (sofern Buy-Variante kommt) | **Should** | Als Architekt will ich Standard-Funktionen vor Customizing bevorzugen, damit Wartbarkeit und Kosten kontrollierbar bleiben. | BIT; BBL Campus | Systemkonzept §2.1.10 (Buy-Risiken) | Relevant für eine spätere Plattform-Phase, nicht für Pilot-Create. |

### 3.5 Compliance, Recht & Datenhoheit (`NFA-COMP-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| NFA-COMP-001 | **Datenhoheit beim BBL** | **Must** | Als BBL will ich uneingeschränkte Verfügung über die im MP geführten Daten, damit Souveränität gewahrt bleibt. | BBL Campus | Use Case Gesamt §Akzeptanzkriterien | — |
| NFA-COMP-002 | Konformität mit Sicherheits-/Datenschutzvorgaben der Bundesverwaltung | **Must** | Als Compliance-Verantwortlicher will ich, dass das MP DSG/ISG/BLV-konform ist, damit kein rechtliches Risiko entsteht. | Compliance; BBL Campus | Systemkonzept §2.1.10 (Buy-Punkt «Cloud-/Umgebungsfit & Governance»); §2.1.13 | DSG = Datenschutzgesetz; ISG = Informationssicherheitsgesetz. |
| NFA-COMP-003 | Nachvollziehbarkeit aller Entscheide (Begründungspflicht Freigabe/Rückweisung) | **Must** | Als Verwaltungsjurist will ich jeden Entscheid begründet finden, damit Verwaltungsverfahrensrecht eingehalten ist. | Compliance; GS | Use Case Bedarf V2.1 (Erweiterung) | Vgl. NFA-SEC-005 (Audit-Trail). |
| NFA-COMP-004 | Wirtschaftlichkeit der Umsetzung (Nachweis Kosten/Nutzen) | **Must** | Als BBL/Bund will ich, dass Aufwand und Nutzen in einem wirtschaftlichen Verhältnis stehen, damit Bundesmittel zielführend eingesetzt werden. | BBL Campus; GS | Use Case Gesamt §Akzeptanzkriterien; Use Case Landing Page §Akzeptanzkriterien | — |
| NFA-COMP-005 | Aufbau in Funktionsbausteinen, jeder in sich abgeschlossen | **Should** | Als Programmleitung will ich, dass Bausteine isoliert lieferbar sind, damit Nutzen früh entsteht und Risiken klein bleiben. | BBL Campus | Use Case Gesamt §Akzeptanzkriterien | Pilot = erster Baustein. |
| NFA-COMP-006 | Fachliche Owner-Verantwortlichkeit für alle Inhalte definiert (Betriebskonzept Fach) | **Must** | Als Compliance/Programmleitung will ich klare Verantwortlichkeit für Inhalte, damit Aktualität und Korrektheit zugeordnet sind. | BBL Campus | Use Case Bedarf §Akzeptanzkriterien; Use Case Landing Page (Bemerkung) | — |
| NFA-COMP-007 | Berücksichtigung VILB-Aufgabencluster (Budget/Kosten, Unterbringung, Versorgung, Sonstiges) in Roadmap | **Should** | Als BBL will ich, dass alle gesetzlich verlangten Aufgaben gemäss VILB im MP-Roadmap-Plan enthalten sind, damit der Auftrag vollständig wird. | BBL Campus | Mieterportal Gesamtkonzept §1.1.3 (VILB-Tabelle); LBC §II | Pilot adressiert primär «Unterbringung / Bedarf / Antrag». |
| NFA-COMP-008 | EMBAG Art. 9 — Veröffentlichung von Eigenentwicklungen als Open Source by Default | **Could** | Als Bundesverwaltung will ich Eigenentwicklungen unter OSS publizieren, damit Art. 9 EMBAG gefolgt wird. | Compliance | Marktscreening §EMBAG; nicht explizit im Fachkonzept | Bei Create-Variante (Eigenentwicklung) zu prüfen — Lizenz / Sicherheit / Dritt-Rechte. |
| NFA-COMP-009 | Einhaltung der **Weisung W010 V1.0 «Architekturprinzipien»** des Bereichs DTI (gestützt auf Art. 40 DigiV) | **Must** | Als BBL/BVerw will ich, dass das MP den 7 Architekturprinzipien folgt (Bevorzugt Digital, Einmalige Datenerhebung, Umsichtige Interoperabilität, Umfassende Inklusion, Transparente Behördeninteraktion, Zugängliche Behördenleistungen, Aufrichtige Vertrauenswürdigkeit), damit Interoperabilität und Anwenderakzeptanz strukturell gewährleistet sind. | DTI (Weisung verbindlich für zentrale BVerw) | [W010 V1.0 (PDF)](https://www.bk.admin.ch/dam/bk/de/dokumente/dti/Vorgaben/WeisungendesDelegiertenDTI/W010%20V1.0%20Architekturprinzipien.pdf.download.pdf/W010%20V1.0%20Architekturprinzipien.pdf); lokale Kopie [intermediate/W010 Architekturprinzipien.md](docs/BBL%20Requierements/intermediate/W010%20Architekturprinzipien.md) | Geltungsbereich «zentrale Bundesverwaltung» schliesst BBL ein. Abweichungen sind «auf Stufe Departement bzw. Direktion zu entscheiden» und stichhaltig zu begründen. Konkrete Umsetzungs-Mapping siehe §3.8. |
| NFA-COMP-010 | Berücksichtigung der **SB011 IKT-Strategie der Bundesverwaltung** (strategische Stossrichtungen) | **Should** | Als BBL will ich, dass das MP die strategischen Pfeiler der Bundes-IKT (u. a. AGOV als zentrales Login, offene Standards, Resilienz, nutzerzentrierte Automatisierung) unterstützt, damit das Vorhaben mit der Bundesstrategie ausgerichtet bleibt. | DTI (strategisch) | [SB011 IKT-Strategie](https://www.bk.admin.ch/bk/de/home/digitale-transformation-ikt-lenkung/vorgaben/sb011-ikt-strategie.html) | Internes Tool — Strategie als Leitplanke, keine starre Konformitätspflicht. AGOV-Aspekt siehe OP-3 (Migrationspfad eIAM→AGOV). |
| NFA-COMP-011 | Berücksichtigung weiterer Vorgaben DTI (W001…W0nn, SB000…SB0nn) im Architektur-Review | **Could** | Als Architekt will ich den DTI-Vorgabenkatalog im Review systematisch abgleichen, damit keine bindenden Detailweisungen übersehen werden. | DTI | [Übersicht Vorgaben DTI](https://www.bk.admin.ch/bk/de/home/digitale-transformation-ikt-lenkung/vorgaben.html) | Detailtiefe gemäss Charakter (internes Tool) — Architektur-Review macht den Cut. |
| NFA-COMP-012 | Auditierbarkeit durch das verantwortliche Departement (VILB Art. 9 lit. d) | **Must** | Als Departement, dem ein BLO angehört, will ich Audits in allen Projekten und Prozessen des Immobilienmanagements anordnen können, damit Aufsicht möglich ist. | EFD / Departement | [LBC Mieterportal_ Draft.md §VILB-Aufgaben](docs/BBL%20Requierements/intermediate/LBC%20Mieterportal_%20Draft.md); [VILB Art. 9](https://www.fedlex.admin.ch/eli/cc/2008/857/de#art_9) | Audit-Befugnis = Read-Access auf Daten, Logs, Konfigurationen für Audit-Rolle. ETH-Immobilienportfolio: EFD zuständig. |

### 3.6 UX, Bedienbarkeit & Sprache (`NFA-UX-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| NFA-UX-001 | Selbsterklärende Bedienung ohne Schulung | **Must** | Als gelegentlicher Nutzer will ich das Portal ohne Schulung bedienen können, damit es tatsächlich genutzt wird. | Workshop WS1 | Use Case Landing Page V2.0; Use Case Gesamt | — |
| NFA-UX-002 | Übersichtliche Navigation, klare Rollenführung | **Must** | Als Mieter will ich auf einen Blick erkennen, was zu meiner Rolle gehört, damit ich nicht durch fremde Bereiche scrolle. | Workshop WS1 | Use Case Landing Page V2.0 | — |
| NFA-UX-003 | Responsive Design (mobile-tauglich für anonyme/öffentliche Inhalte) | **Should** | Als mobiler Nutzer will ich öffentliche Inhalte auch unterwegs lesen, damit ich nicht an einen PC gebunden bin. | Workshop WS1 | Use Case Landing Page V2.0 | Authentifizierte Bereiche mobile-Reife separat klären. |
| NFA-UX-004 | Mehrsprachigkeit DE/FR/IT (Bundessprachen) | **Should** | Als französisch- oder italienischsprachiger Mieter will ich das Portal in meiner Amtssprache nutzen, damit Verständnis gesichert ist. | EDA; alle FR/IT-VE | Implizit Bundesverwaltung; nicht explizit im Fachkonzept | EN-Variante optional. Zu bestätigen. |
| NFA-UX-005 | Barrierefreiheit gemäss eCH-0059 / WCAG 2.1 AA | **Should** | Als Mensch mit Einschränkungen will ich das Portal vollständig nutzen können, damit Inklusion erfüllt ist. | Compliance | Nicht explizit in Quellen; Bundesvorgabe | Bundesverwaltung-Vorgabe — von BIT bestätigen lassen. |
| NFA-UX-006 | Definierte Qualitätsanforderungen je Inhalt: Quelle, Ansprechpartner, Aktualitätsstand | **Must** | Als Mieter will ich erkennen, woher eine Information stammt und wie aktuell sie ist, damit ich Vertrauen entwickle. | Workshop WS1; BBL Campus | Use Case Landing Page V2.0 | Vgl. FUNC-LP-009. |

### 3.7 Daten, Aufbewahrung & Reporting (`NFA-DATA-*`)

| ID | Anforderung | Priorität | User Story | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|---|
| NFA-DATA-001 | Datenschutzkonforme Anonymisierung für aggregierte Auswertungen | **Must** | Als Compliance will ich, dass Auswertungen Einzelpersonen nicht identifizieren, damit DSG-Vorgaben eingehalten sind. | Compliance; BBL Campus | Use Case Bedarf §letzter Abschnitt | Vgl. FUNC-REP-001. |
| NFA-DATA-002 | Aufbewahrungsfristen für Antragsdokumente und Audit-Daten gemäss Bundesarchiv-Vorgaben | **Must** | Als Records-Verantwortlicher will ich klare Aufbewahrungsfristen kennen, damit gesetzliche Pflichten erfüllt sind. | Compliance | Nicht explizit in Quellen; Bundesvorgabe | Zu spezifizieren in Abstimmung mit Bundesarchiv / GEVER. |
| NFA-DATA-003 | Datenhaltung in der Schweiz (Datenresidenz) | **Should** | Als BBL/Bund will ich die Daten auf Schweizer Boden gehalten sehen, damit Souveränität faktisch gegeben ist. | BBL Campus; Compliance | Nicht explizit; impliziert durch RHOS-im-BIT-Betrieb | RHOS-Betrieb im BIT-RZ erfüllt das implizit; explizit in Abnahme bestätigen. |
| NFA-DATA-004 | Logging mit Korrelations-ID über Frontend, Backend und SAP-Übergabe | **Should** | Als Betrieb will ich Vorfälle End-to-End nachvollziehen können, damit Fehler schnell adressierbar sind. | BIT (Betrieb) | Systemkonzept §2.1.9 (Buy-Punkt «Logging/Audit-Trail»); §2.1.12 (Create) | — |

---

## 4. Roadmap-Use-Cases (über Pilot hinaus)

Diese Use Cases sind nicht Bestandteil des Pilots, werden aber dokumentiert,
damit Architektur und Datenmodell pilot-kompatibel bleiben. Quellen: [Mieterportal Gesamt V2.1](docs/BBL%20Requierements/intermediate/Mieterportal%20Gesamt%20V2.1.md)
§Beschreibung; [Mieterportal_ Vision](docs/BBL%20Requierements/intermediate/Mieterportal_%20Vision.md);
[LBC Mieterportal_ Draft](docs/BBL%20Requierements/intermediate/LBC%20Mieterportal_%20Draft.md) §III.

### 4.1 Fall A — Basisleistungen SUPERB (`REQ-FA-*`)

| ID | Use Case | Priorität | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|
| REQ-FA-001 | Geschäftsblätter — Projektabwicklung | **Should** | BBL PFM | Mieterportal Gesamt V2.1 §Fall A | — |
| REQ-FA-002 | Grafische Darstellung der Ausstattung inkl. Hauptinformationen | **Could** | BBL Campus; Workshop WS1 | Mieterportal Gesamt V2.1 §Fall A | Karte / Plansicht. |
| REQ-FA-003 | Belegungsplanungstool (Info-App FLM, Self-Service) | **Should** | BBL Campus | Mieterportal Gesamt V2.1 §Fall A; LBC §Use Case 1; Superb_QuickHelp_FLM_INFO | FLM = Flächenmanagement. |
| REQ-FA-004 | Inventarführungstool Ausstattung | **Could** | BBL Campus; BBL Versorgung | Mieterportal Gesamt V2.1 §Fall A | In Bearbeitung WSM. |
| REQ-FA-005 | Meldung Instandsetzungsbedarf / Störung (auf Karte, Erfassung im MP) | **Should** | Workshop WS1; BBL Campus | Mieterportal Gesamt V2.1 §Fall A; LBC §Use Case 2 | Ticketing-Tool — MP0100/MP0200 Varianten in LBC beschrieben. |
| REQ-FA-006 | Meldung Umzugs-/Transportbedarf / Sonderreinigung | **Could** | BBL Campus | Mieterportal Gesamt V2.1 §Fall A | — |
| REQ-FA-007 | Shop Möblierung (Standard + Spezial) | **Could** | BBL Campus; BBL Versorgung | Mieterportal Gesamt V2.1 §Fall A | Marktplatz-Funktion, in Bearbeitung. |

### 4.2 Fall B — Unabhängig SUPERB (`REQ-FB-*`)

| ID | Use Case | Priorität | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|
| REQ-FB-001 | Portfoliostrategie (Projekte, Unterhaltsmassnahmen, Aufgabe Objekte — Darstellung auf Karte) | **Could** | BBL Campus | Mieterportal Gesamt V2.1 §Fall B | Umsetzung im GIS Portal zu prüfen. |
| REQ-FB-002 | Kennzahlen zu Objekten — interaktive Aufnahme (Verbrauch, Anzahl AP) | **Could** | BBL Campus; BBL PFM | Mieterportal Gesamt V2.1 §Fall B | Umsetzung im GIS Portal zu prüfen. |

### 4.3 Fall C — Strategische Freigabe erforderlich (`REQ-FC-*`)

| ID | Use Case | Priorität | Anforderer | Quelle | Bemerkung |
|---|---|---|---|---|---|
| REQ-FC-001 | Information Ereignisfall (Krisenkommunikation) | **Won't** (Pilot) | BBL Campus; Sicherheits-/Krisenstab | Mieterportal Gesamt V2.1 §Fall C | Strategische Freigabe erforderlich. |
| REQ-FC-002 | Digitale Schulungen zu Rollen in der Zusammenarbeit | **Could** | BBL Campus | Mieterportal Gesamt V2.1 §Fall C | — |
| REQ-FC-003 | Weisungen / Verordnungen / Richtlinien | **Won't** (Pilot) | BBL Campus | Mieterportal Gesamt V2.1 §Fall C | Umsetzung im Internet vorgesehen. |

---

## 5. Offene Punkte und Lücken

| # | Punkt | Quelle | Empfohlene Klärung |
|---|---|---|---|
| OP-1 | ISG-Klassifizierung (intern / nicht klassiert / vertraulich) nicht ausgefüllt | Fachkonzept NEW V05 §Klassifizierung | Vor Pilot-Architekturentscheid mit ISBO klären. |
| OP-2 | §4.1.2 Workflow, §4.1.4 Formular, §4.1.5 Schnittstelle, §4.1.6 Reporting sind in V05 Template-Platzhalter | Fachkonzept NEW V05 | Verantwortliche je Kapitel benennen; Detailspezifikation vor Implementierungsstart. |
| OP-3 | AGOV vs. eIAM für Mieter-Login: Pilot setzt eIAM (BIT) — der spätere Mieterkreis (öffentliche Nutzer) braucht AGOV. | Systemkonzept §2.1.12 (Create); Marktscreening §I (AGOV) | Entscheid für Zielzustand; Migrationspfad eIAM→AGOV vermerken. |
| OP-4 | Identität «Anforderer BBL PFM» — Stand 04.11.2025 erwähnt, Namen nur in Lösungsarchitektur-Anhang erkennbar | Fachkonzept NEW V05 §4.1.1.3 | Liste der PFM-Vertreter (Holger Ludwig, …) ergänzen und in der Anforderer-Spalte präzisieren. |
| OP-5 | Visio-Quelle «20251104 Anforderungen Mieterportal PFM.vsdx» konnte nicht automatisch konvertiert werden (OCR leer) | [docs/BBL Requierements/intermediate/_index.md](docs/BBL%20Requierements/intermediate/_index.md) §Failed | Visio-Datei mit Text-als-Vektor neu exportieren oder mit `easyocr` re-konvertieren. |
| OP-6 | Mehrsprachigkeit DE/FR/IT, Barrierefreiheit eCH-0059 — nicht im Quellmaterial spezifiziert | NFA-UX-004, NFA-UX-005 | Mit BIT/Compliance abklären, formal in Akzeptanzkriterien aufnehmen. |
| OP-7 | Aufbewahrungsfristen und GEVER-Integration nicht beschrieben | NFA-DATA-002 | Mit Bundesarchiv / Records Management abstimmen. |
| OP-8 | NAW-Faktor und PFM-Gebäudekategorien als Stammdaten — Pflegeprozess offen | FUNC-AU-004, FUNC-AU-014/015 | Verantwortlichkeit Stammdaten-Pflege definieren (BBL PFM?). |
| OP-9 | Verteilung «verantwortliche Rollen BBL» nach Auswahl VE — explizite Liste fehlt | FUNC-AU-001; Use Case Bedarf | Mit BBL PFM (Holger Ludwig) abstimmen. |
| OP-10 | Reporting-Selektions-/Layout-/Drilldown-Spezifikation fehlt | Fachkonzept NEW V05 §4.1.6 | Mit BBL Campus und PFM Detail-Reports spezifizieren. |

---

## 6. Glossar (Auszug)

| Begriff | Bedeutung |
|---|---|
| **AGOV** | Bundes-Login für öffentliche Nutzer (Nachfolger CH-LOGIN) |
| **BBL** | Bundesamt für Bauten und Logistik |
| **BBL Campus** | Fachamt im BBL — Owner Mieterportal |
| **BBL PFM** | Portfolio-Management des BBL |
| **BIT** | Bundesamt für Informatik und Telekommunikation (Leistungserbringer IT) |
| **BLO** | Bau und Liegenschaftsorgane Bund |
| **DBP** | Datenbezugspunkt — föderale Quelle für Organisations-/Funktionsattribute |
| **eIAM** | Bundes-IAM für interne / Verwaltungs-Anwendungen |
| **ePPM / PPM** | SAP Enterprise Portfolio and Project Management |
| **GS** | Generalsekretariat (Departement) — beurteilende und freigebende Instanz |
| **HNF / HNF2** | Hauptnutzfläche (SIA 416) |
| **ILBO** | Logistikbeauftragte einer VE / Antragsstellende Rolle |
| **ISG** | Informationssicherheitsgesetz |
| **LE** | Leistungserbringer (hier: BIT) |
| **MP** | Mieter-/Serviceportal |
| **NAW** | Faktor zur Flächenbedarfsermittlung (Arbeitsstilformen) |
| **PFM-Kategorien** | Gebäudekategorisierung des Portfolio-Managements |
| **RHOS** | Red Hat OpenShift |
| **SPOC** | Single Point of Contact |
| **SUPERB** | BBL S/4HANA-Programm (Cut-over Sept. 2023) |
| **UK-Kosten** | Unterbringungskosten |
| **VE** | Verwaltungseinheit (Departemente, Bundesämter) |
| **VILB** | Verordnung über das Immobilienmanagement und die Logistik des Bundes |
| **WAF** | Web Application Firewall |
| **WSG** | BIT Webservice Gateway |

---

## 7. Versionierung dieses Dokuments

| Version | Datum | Autor | Änderungen |
|---|---|---|---|
| 0.1 | 2026-05-18 | Claude + David Rasner | Initialversion. Konsolidiert aus 22 Quelldokumenten in `docs/BBL Requierements/`. Pilot-Scope priorisiert. Roadmap (Fall A/B/C) als Should/Could/Won't. |
