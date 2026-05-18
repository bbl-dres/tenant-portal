1

# LBC Mieterportal

1. Mieterportal  use cases

use cases Übersicht

Lösungsarchitektur MP pro Use Case (Fiori SAP / Andere)

use cases Priorisierung Umsetzung

Abgrenzung zu Marktplatz (Log BBL)

1. Gesetzliche Vorgaben VILB ( = relevanten Informationen?)

https://www.fedlex.admin.ch/eli/cc/2008/857/de#art\_9

1. Gesamtarchitektur

Mit dem Mieterportal werden die relevanten Informationen, Formulare, Services u.dgl. für die internen Mieter und Nutzer (gesamte BV) auf einer zentralen Plattform bereitgestellt. 

IV. LBC Mieterportal

Formulierungen - Roadmap

EPICs / Features

# I. Gesamtarchitektur: Mieterportal

| Thema                     | Stand                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|---------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Strategische  Ausrichtung | Strategische Anforderungen formuliert, aber nicht durch GL BBL abgenommen. Offener Entscheid PAG: Abnahme strategische Anforderungen (Auswirkung auf NSP-28)                                                                                                                                                                                                                                                                                                                                                                                          |
| Prozesse Fachkonzept      | Prozesse und Fachkonzept für Ausbauschritte werden laufend gemäss Roadmap aktualisiert und pro EPIC freigegeben. Weiterbearbeitung abhängig von Entscheid PAG.                                                                                                                                                                                                                                                                                                                                                                                        |
| Gesamt-architektur        | Ist «Work Zone» die Lösung auch für Anforderungen non SAP und allenfalls rechtzeitig verfügbar? Technische Lösung kann erst nach Vorliegen der Anforderungen definiert werden.                                                                                                                                                                                                                                                                                                                                                                        |
| Risiken                   | «Work Zone» kann nicht alle Anforderungen erfüllen Es muss eine neue Lösung beschafft werden, da beim Bund keine Anwendung im Einsatz ist Weitere Bedürfnisse wurden nicht erkannt und werden nicht bedient                                                                                                                                                                                                                                                                                                                                           |
| Organisation              | Organisatorische Anpassungen bei BBL (alle) und VE: "einheitliche Betreuung von MP" wünschenswert- Zugriff/Kommunikation etc. muss aufgebaut werden. Mit der Einführung einer «Self-Service» Plattform wird ein neues Service-Verständnis notwendig – von reaktiver Bearbeitung hin zu proaktivem Angebot und Beratung.  Sofern der Kontakt digitalisiert wird, steigt kundenseitig die Erwartungshaltung an eine schnelle Reaktion (resp. muss die Reaktionszeit gut sichtbar kommuniziert werden, um diese Erwartungshaltung nicht zu enttäuschen). |
| Nutzen-erwartung          | Sicherstellung der digitalen Abwicklung der Immobilienprozesse  in der Kommunikation mit Mieter/Nutzer der zivilen Bundesverwaltung, unter Berücksichtigung der zukünftigen Rahmenbedingungen an das zivile Immobilienportfolio BBL mit reduzierten finanziellen Ressourcen in definierter Qualität sicherzustellen.                                                                                                                                                                                                                                  |

Integration

CDE Bund

Transfer

CDE PIM

Externe

Projekt-

Plattform

# Architektur IMMO mit Mieterportal

Acta Nova

CDE AIM

ERP / SAP

Planen

Bauen

Betreiben und Nutzen

SAP PI / CPI

Integration Layer

Planverwaltung

Datenerzeugung Extern / Transfer BV

Orchestrierung / Steuerung / Datenarchiv

Zielsysteme zur Datenverarbeitung

Orchestration Layer

Mieter-portal

<!-- image -->

<!-- image -->

Kunden-Kommunikation

BV ext. Stakeholder

Branchenlösungen

BV int. Kunden

Cloud

MIS &amp; Reporting

Cloud

Cloud

Cloud

PS

FI/CO

PPM

BVML

(…)

PM

IM

RE-FX

 + FM

WSM

Bedarf

<!-- image -->

<!-- image -->

<!-- image -->

<!-- image -->

Planer

Bauunter-nehmer

Spezialisten

Usw.

<!-- image -->

# Kurzbeschrieb der Themen aus LBC IMMO Mieterportal 

Mit dem Mieterportal werden die relevanten Informationen, Formulare, Services u.dgl. für die internen Mieter und Nutzer (gesamte BV) auf einer zentralen Plattform bereitgestellt.

- Umgesetzte Funktionen als MVP (Ersatz bisherige Leistungen): Störmeldung Gebäude / Info Flächen
- Strategische Anforderungen Ausbau Mieterportal: 

Erfassen von Meldungen inkl. Verfolgen der Abwicklung, Abfrage Kundenzufriedenheit/ Dienstleistungen CAMPUS\_ Workspace-Management (Abbildung der Raumausstattung auf Flächen / Reparaturmeldung oder Bedarf Ergänzungsprozess) / Belegungsplanung / Dienstleistungen Reinigung (Raum und Ausstattung)/ Verbrauchskennzahlen (RUMBA- Netto Null) / Integration GIS (Bauprojekte/ Verkaufsobjekte etc.)

Bedarf

Planen

Bauen

Betreiben und Nutzen

Liquidation

# II. VILB – gesetzliche Grundlagen Aufgaben mit Relevanz BLO - BO

5

Im Bereich der strategischen Steuerung erfüllen die BLO insbesondere folgende Aufgaben:

a. Bedürfnisüberprüfung: Sie überprüfen die angemeldeten Bedürfnisse auf Rechtmässigkeit, Zweckmässigkeit, Standards, Optimierung der betrieblichen Abläufe, Wirtschaftlichkeit und Finanzierbarkeit.

b. Investitionsplanung und -steuerung: Sie planen und steuern die Verpflichtungs- und die Voranschlagskredite.

c. Immobilien-Portfolio-Management: Sie definieren Strategien, Gesamtkonzepte, Vorgaben und das Controlling zur Kosten-Nutzen-Optimierung des Immobilien-Portfolios des Bundes.

d. Schaffung von Kostentransparenz: Sie schaffen Kostentransparenz durch den Ausweis der effektiven Kosten des Bundes als Liegenschaftseigentümer und -besitzer sowie als Bauherr, Liegenschaftsbewirtschafter und -betreiber.

e. Mehrjahresplanung und Zielsetzung: Im Rahmen einer rollenden Mehrjahresplanung erarbeiten sie strategische Ziele und legen, auf diese abgestimmt, jedes Jahr die operativen Ziele fest.

 Im Bereich der dispositiven Steuerung der Projekte erfüllen die BLO insbesondere folgende Aufgaben:

a. Statusbericht: Die BLO erstellen in festgelegtem Rhythmus einen Statusbericht mit folgendem Inhalt:

- 1. Soll-Ist-Vergleich zum aktuellen Zeitpunkt,
- 2. Prognose bis zum Projektabschluss,
- 3. Beurteilung der Ursachen von Soll-Ist-Abweichungen sowie Chancen und Risiken,
- 4. Vorschläge für Steuerungsmassnahmen zur Zielerreichung,
- 5. eventuell Antrag auf Projektänderung (Zielabweichung, Zielkorrektur).

b. Projektcontrolling: Das Projektcontrolling umfasst den Einsatz von Controllinginstrumenten zur Steuerung der einzelnen Projekte.

c. Periodisches Reporting: Die BLO erstellen in halbjährlichem Rhythmus ein periodisches Reporting mit Kommentar als Kontrolle der Verpflichtungs- und der Voranschlagskredite.

d. Auditing: Das jeweilige Departement, dem das BLO angehört, kann die Durchführung von Audits in allen Projekten und Prozessen des Immobilienmanagements anordnen. Für das Auditing des ETH-Immobilienportfolios ist das EFD zuständig.

# II. VILB – gesetzliche Grundlagen Aufgaben mit Relevanz BLO - BO

6

Im Bereich der operativen Steuerung erfüllen die BLO insbesondere folgende Aufgaben:

a.22 Immobilien-Bereitstellung, Immobilien-Desinvestition und kaufmännisches Gebäudemanagement: Dieses umfasst insbesondere das Beschaffungsmanagement einschliesslich Beschaffungskooperationen, das Raum- und Flächenmanagement, die Objektbuchhaltung und das Vertragsmanagement. Das BBL und die armasuisse berücksichtigen dabei die Vorgaben zum Beschaffungscontrolling gemäss der Verordnung vom 24. Oktober 201223 über die Organisation des öffentlichen Beschaffungswesens der Bundesverwaltung.

b. Technisches Gebäudemanagement: Dieses umfasst insbesondere das Instandhaltungsmanagement, die technische Betriebsführung, das Energiemanagement und das Sicherheitsmanagement.

c. Infrastrukturelles Gebäudemanagement: Dieses umfasst die Beschaffung, Erbringung, Koordination und Überwachung aller Dienste, die für den täglichen Betrieb des Objektes erforderlich sind.

d. Vorstudien und Projektierung: Führung der Teilphasen Machbarkeitsstudien, Projektdefinitionen, Auswahlverfahren, Vorprojekte, Bauprojekte, Bewilligungsverfahren und Auflageprojekte. Die Optimierung der Lebenszykluskosten eines Gebäudes ist in allen Projektphasen zu berücksichtigen.

e. Ausschreibung und Realisierung: Führung der Teilphasen Ausschreibungen, Offertvergleiche, Vergaben, Ausführungsprojekte, Ausführung, Inbetriebnahme und Bauabschluss unter Berücksichtigung der Lebenswegkosten.

f. Ressourcenverbrauch: Die BLO führen ein Ressourcen- und Umweltmanagement und erstellen ein periodisches Reporting über den Ressourcenverbrauch (Wärme, Strom, Wasser, Abfall) pro Energiebezugsfläche und pro Gebäude des für eine aussagekräftige Auswertung relevanten Gebäudebestandes sowie über die geplanten Massnahmen. Den interessierten BO stellen sie diese Informationen im Rahmen des Programms RUMBA(Ressourcen- und Umweltmanagement der Bundesverwaltung) zur Verfügung.

# II. VILB – gesetzliche Grundlagen Aufgaben mit Relevanz BLO - BO

7

3. Abschnitt: Die BO und ihre Zusammenarbeit mit den BLO

Art. 15

1 Die BO wirken im Rahmen der Vorgaben der BLO bei der Erfüllung von Aufgaben nach dieser Verordnung mit.

2 Die BO des BBL- und VBS-Immobilienportfolios sind grundsätzlich nicht befugt, die ihnen von den BLO zugewiesenen Räumlichkeiten Dritten zur Verfügung zu stellen. Ausnahmen bedürfen der schriftlichen Regelung zwischen der BO und dem zuständigen BLO.

3 Sie formulieren und begründen ihre Immobilienbedürfnisse und stellen ihre entsprechenden Anträge gemäss den Weisungen des zuständigen BLO.

4 Die BO und die BLO beachten gegenseitig ihre Rechte und Pflichten und informieren einander über alle relevanten Angelegenheiten

4. Abschnitt: Die BO des BBL-Immobilienportfolios und ihre Zusammenarbeit mit dem BBL

Art. 16 Funktionen der BO

1 Die BO des BBL-Immobilienportfolios und die ihnen vorgesetzten Generalsekretariate (GS) oder andern vorgesetzten Stellen bezeichnen Immobilienverantwortliche als Partner für die Zusammenarbeit mit dem BBL. Sie statten sie mit den notwendigen Kompetenzen und Ressourcen aus.

2 Sie besetzen die folgenden ständigen Funktionen:

a. Verantwortliche oder Verantwortlicher der Ansprechstelle Immobilien auf Stufe GS oder auf der Stufe der Stelle, die der BO vorgesetzt ist;

b. Immobilienlogistikerin oder Immobilienlogistiker auf Stufe BO (IL-BO);

c. Immobilienlogistikerin oder Immobilienlogistiker an den Standorten der BO (IL-SO).

3 Im Rahmen eines Bauprojektes besetzen sie die temporäre Funktion der Vertreterin oder des Vertreters der BO, bei grösseren Vorhaben die temporäre Funktion der Projektleiterin oder des Projektleiters BO, in der Bauprojektorganisation.

4 Die Funktionen nach den Absätzen 2 und 3 haben die Aufgaben nach Anhang 3 zu erfüllen.

5 Bei Bedarf können die Funktionen nach den Absätzen 2 und 3 in Personalunion besetzt werden

# II. VILB – gesetzliche Grundlagen Aufgaben mit Relevanz BLO - BO

8

Art. 17 Anträge der BO

1 Die BO formulieren, begründen und beantragen ihre Immobilienbedürfnisse gemäss den Vorgaben des BBL.

2 Sie müssen in ihren Anträgen den betriebswirtschaftlichen Nachweis ihrer Bedürfnisse erbringen.

3 Die BO holen zu ihren Anträgen vor der Einreichung beim BBL die Beurteilung und Empfehlung des zuständigen GS beziehungsweise der anderen vorgesetzten Stelle ein; ausgenommen sind Anträge für bauliche Klein- und Unterhaltsmassnahmen.

4 Das GS beziehungsweise die andere vorgesetzte Stelle prüft, beurteilt und priorisiert die Anträge, gleicht sie mit der Entwicklungsstrategie und der langfristigen Planung des Departements oder ihrer Organisationseinheit ab, gibt die Empfehlung dazu ab und leitet die Anträge mit einer Begründung an das BBL weiter

Art. 18 Rechte und Pflichten des BBL im Rahmen der Zusammenarbeit

1 Das BBL berücksichtigt die bundesinternen Weisungen und die finanziellen Möglichkeiten und achtet auf die wirtschaftliche Unterbringung der BO.

2 Es informiert die BO regelmässig über:

- a. die Grundsätze der Portfoliostrategie;
- b. die Investitionsplanung (Mehrjahresplanung, Investitionsbänder);
- c. die aktuelle Belegungsstrategie;
- d. die Weisungen, Normen und Standards bezüglich Bau, Einrichtung, Betrieb und nachhaltigem Bauen;
- e. die aktuelle Erhaltungsstrategie;
- f. den Ressourcenverbrauch und die Umweltbelastung.

3 Es stellt den BO die für ihre Bedürfnisse notwendigen Planungs- und Steuerungsinstrumente online zur Verfügung, insbesondere:

- a. Antragsformulare;
- b. Belegungspläne und Flächendaten über die Büro- und Verwaltungsgebäude;
- c. Weisungen, Normen und Standards bezüglich Bau, Einrichtung, Betrieb und nachhaltigem Bauen;
- d. Dokumentationen über die Organisation und Arbeitsweise des BBL.

4 Es führt regelmässig Kundenbefragungen durch.

# II. VILB – gesetzliche Grundlagen Aufgaben mit Relevanz BLO - BO

9

Art. 19 Rechte und Pflichten der BO im Rahmen der Zusammenarbeit

1 Die BO der Bundesverwaltung nach den Artikeln 7 und 7a Absatz 1 Buchstaben a und b RVOV27 müssen die Leistungen umfassend beim BBL beziehen.28

2 Die BO der Bundesverwaltung nach Artikel 7a Absatz 1 Buchstaben c und d RVOV sowie externe Träger von Verwaltungsaufgaben im Sinne von Artikel 6 Absatz 3 erster Satz RVOV und weitere öffentliche Verwaltungen können die Leistungen beim BBL aufgrund einer vertraglichen Vereinbarung beziehen.29

3 Die BO arbeiten mit dem BBL zur Erreichung der Ziele nach Artikel 2 in den folgenden Bereichen zusammen:

- a. Raumbelegung und Nutzungsverdichtung;
- b. Planung und Optimierung nutzerspezifischer Betriebsabläufe;
- c. Planung und Optimierung von Gebäudebewirtschaftung und -betrieb;
- d. Optimierung des Raum- und Flächenbedarfs;
- e. Nachweise der Wirtschaftlichkeit von Betriebsabläufen.

4 Sie informieren das BBL regelmässig über:

- a. ihre kurz- und mittelfristige Planung;
- b. ihre mittel- und langfristige Strategie;
- c. die Entwicklung des Flächenbedarfs;
- d. die erwartete Personalentwicklung nach Voll- und Teilzeitstellen;
- e. die Standort-Beurteilung und die Eignung der Liegenschaft;
- f. die Anforderungen an die Raumqualität;

g. Anregungen für Anpassungen der Raum-Standards.

5 Sie stellen dem BBL jährlich die folgenden Daten für übergeordnete Berichte und für Berichte zum Programm RUMBA zur Verfügung:

- a. Personalbestände nach Voll- und Teilzeitstellen pro Standort;
- b. Betriebskennzahlen, sofern die Zuständigkeit für den Gebäudebetrieb bei der BO liegt

Mieterportal

(BV intern)

10

BBL= BLO

(Leistungserbringer: Unterbringung und Versorgung)

VEs

Leistungsbezüger 

Mieter/Nutzer = BO

1

Bedarf UK 

2

Flächen INFO

Störungsmeldung

Bedarf Ausstattung

<!-- image -->

<!-- image -->

Belegungsplanung

Verbrauchsdaten Gebäude

geplant

aktiv

Legende:

Umzugsplanung

Bedarf Sonderreinigung

<!-- image -->

Kennzahlen

Netto Null

Use cases BBL

Stakeholder

- Alle OE Bauten (Rollen?)
- OE Nachhaltigkeit (Rollen?)
- OE Campus (Rollen?)

Use cases Mieter/Nutzer

Information (I)

Meldung (M)

Zusammenarbeit (Z)

SPOC single point of contact

Stakeholder

- Alle Anforderer (I/M)
- Alle Amts- u. Immobilienlogistiker (I/M/Z)
- Alle MA aller VE (I)

# III. MP Use Cases

<!-- image -->

Mieterportal

(BV intern)

11

BBL

(Leistungserbringer: Unterbringung und Versorgung)

VEs

(Leistungsbezüger Mieter/Nutzer)

1

Shop - Marktplatz 

(BV intern + extern)

2

Flächen INFO

Störungsmeldung

<!-- image -->

<!-- image -->

geplant

aktiv

Legende:

<!-- image -->

Kennzahlen

Netto Null

Use cases Shop – Marktplatz

- ..

Information

Meldung

Zusammenarbeit

Stakeholder Shop – Marktplatz

- ..

# III. MP Use Cases – Abgrenzung Marktplatz

<!-- image -->

12

# Mieterportal – Anforderungen NSP Relevanz

<!-- image -->

NSP: 13.5 Mio

Check : Nutzen durch definierte Use Cases realistisch ?

# III. MP Use Cases – Erwartungshaltung -&gt; NSP

13

| use case     | Kategorie      | Zeitfaktor                                 | Nutzen       |
|--------------|----------------|--------------------------------------------|--------------|
| Flächen INFO | Information    | Tagesaktuell/ Monatsaktuell/ Jahresaktuell | Self Service |
| Störmeldung  | Meldung        | Bei Bedarf - Tagesaktuell                  | Self Service |
| …            | Zusammenarbeit |                                            |              |
| …            |                |                                            |              |
|              |                |                                            |              |
|              |                |                                            |              |

# IV. LBC Mieterportal

14

ab PI27 Lean Business Case "Mieterportal" - SUPERB - Confluence

<!-- image -->

PI27: Gesamtkonzept use cases (Rollen/ Kategorien / erwarteter Nutzen)

Optimierungspotential an umgesetzten Lösungen identifizieren

Analyse Lösungsarchitektur Workzone für alle use cases oder Alternativen

Priorisierung Uses Cases (verfügbare Lösung/ Need/ grösster Nutzen)

PI28: Fachkonzepte priorisierte use Cases inkl. techn. Spez. – Optimierungen/Rollenmodell

PI29: inkl. techn. Spez. – Berechtigungskonzept workzone

PI30: Build – Usescase ¾ inkl. Einführung

PI31: Build – Einführung Optimierungen 

SBFOLIO-1016 - IMMO Mieterportal Ausbaustufe 1 umgesetzt - SUPERB – Confluence

15

# Use Case 1: Info App Flächenmanagement VE kann Flächeninformationen und Nutzungsinformationen zu Ihrem Mietvertrag abrufen – Self Service*

Antrag Zugriff auf APP

Zuweisung Berechtigung auf Fiori

* Ausbau/Optimierung  Self Service in Bearbeitung

Legende:

Diverse Flächeninformationen im Self Service verfügbar

Fiori 

Info APP FLM

Qick Help und Companion 

Hier finden sie alle Informationen zur Beantragung und Nutzung der APP: FLM Info-App (admin.ch)

Fiori KS00030

SAP manuell

BER manuell

SAP 

auto.

| Rolle                                  | VE (Bedarf)   |
|----------------------------------------|---------------|
| Anforderer/ Immobilien-logistiker      |               |
| Verantwortlicher Flächenmanagement BBL |               |

Antrag Zugriff auf AM Rolle KS00030 / APP

Zuweisung Berechtigung auf Fiori in der VE

Diverse Flächeninformationen im Self Service verfügbar

Fiori 

Info APP FLM

Qick Help und Companion 

Genehmigung Berechtigung auf Fiori

Workflow

Workflow

# Mieterportal – Auslegeordnung – next steps

Offene Punkte technisch:

- Kategorisierung nach Infofluss (BLO-Mieter/Nutzer)-&gt; Lösungsarchitektur
- Information
- Meldung
- Zusammenarbeit
- Priorisierung E2E Prozessablauf (innerhalb SAP oder über mehrere Systeme verteilt) – Basisleistungen sap vorhanden-&gt;dann MP

Offene Punkte fachlich:

- Systeme und Daten vorhanden oder in welchem Zeitraum beschaffbar
- Nutzen von Automatisierung im Vergleich zu heutigem doing
- Neue Services -&gt; Aufbau in welchem Zeitraum erforderlich -&gt; Entscheid Strategie (inkl. Verrechnungsmodelle)
- MP Owner definieren
- Identifikation der Stakeholder / Zielgruppen
- 
- 
- 

16

# 5. Roadmap Immobilienlösungen 

2025

Q1

Q2

Q3

Q4

2026

Q1

Q2

Q3

Q4

Ausbau auf Zielprozesse (Zielkernel), Fokus Beschaffung, Vertrieb, Logistik

Phase «Optimieren / Innovieren / Betrieb»

Stand: 28.03.2025

Mieterportal Ausbau 1

Facility Management FM Optimierungen

Projektportfolio IMMO PPM

Immobilienportfolio PPM

MIS Cockpit BUND IMMO + spez. BBL

MIS IMMO BLO Bund

Schnittstelle FAW Kollaboration

PPM Projektportfolio

SST\_

Kollaboration

Mietermodelle harmonisiert inkl. neuer LV Prozess

                                          Datenkatalog

Layer Orchestration

Layer Integration

IMMO\_ Portfoliocontrolling BW

Workspacemanagement MVP

IMMO Liegenschaftserfolgsrechnung

Legende:

LBC Mieterportal

LBC PPM IMMO

LBC IMMO Integration

DATA Katalog

Mieterportal Ausbau 2

Mieterportal Ausbau 1

WSM 

PPM IMMO

Portfolio

LBC Analytics IMMO ab PI26

LBC IMMO PPM ab PI25

LBC Mieterportal

Ausbau 1 ab  PI27 / Ausbau 2 2027

LBC Datenkatalog –  PI25 – PI29

ab PI26 (07.05.25)

LBC IMMO Analytics

LBC FM / WSM

LBC IMMO Integration

ab PI27

LBC Facility- u. 

Workspacemanagement

ab PI26

2027

Q1

Q2

Q3

Q4

IMMO\_ Planungslösung PBC (OPEX)

Optimierungen PPM

 Ausbau Workspacemanagement

Rückbau Mietermodelle

18

# Use Case 2: Instandsetzungsbedarf / Störungsmeldung Gebäude VE meldet Störung im Gebäude und wird über den Status der Instandsetzung informiert MP0200 «Meldung ohne verantwortlichen Arbeitsplatz» 

Aufschaltung der Info auf Intranet Kundenportal BBL in Bearbeitung

Legende:

Fiori

manuel

| Rolle                                         | VE (Bedarf)   |
|-----------------------------------------------|---------------|
| Anforderer/ Immobilien-logistiker             |               |
| Verantwortlicher Objektmanager (Kundendienst) |               |
| Verantwortliches DLZ / REZ                    |               |

MP 0200 Fiori Instandsetz-ungsbedarf

Zuweisung auf Objekt

Bestellung anlegen

Optional: Bestellung genehmigen 

IH Auftrag

Status: eingereicht

Zuweisung auf verantw. AP (DLZ/REZ)

BANF

Status: in Bearbeitung

Status: erledigt

Prüfung korrektes Objekt

Quick Help und Companion 

| Rolle                                         | VE (Bedarf)   |
|-----------------------------------------------|---------------|
| Anforderer/ Immobilien-logistiker             |               |
| Verantwortlicher Objektmanager (Kundendienst) |               |
| Verantwortliches DLZ / REZ                    |               |

19

# Use Case 2: Instandsetzungsbedarf / Störungsmeldung Gebäude MP0100 «Meldung mit verantwortlichem Arbeitsplatz»: VE meldet Störung im Gebäude und wird über den Status der Instandsetzung informiert

MP 0100 Fiori Instandsetz-ungsbedarf

Zuweisung auf Objekt

Bestellung anlegen

Optional: Bestellung genehmigen 

IH Auftrag

Legende:

Status: eingereicht

Fiori MP0100

SAP manuell

Quick Help und Companion 

Zuweisung auf verantw. AP (DLZ/REZ)

BANF

Status: in Bearbeitung

Status: erledigt

Nur relevant für BBL DLZ Mitarbeiter