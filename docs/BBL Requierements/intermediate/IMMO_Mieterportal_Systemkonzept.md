IMMO Mieterportal Systemkonzept

SUPERB

| Klassifizierung   |    |
|-------------------|----|
| Status            |    |
| Version           |    |
|                   |    |
|                   |    |
|                   |    |

Änderungsverzeichnis

| Version   | Datum	            | Änderung       | Autor       |
|-----------|------------|----------------|-------------|
| 1.0       | 19.02.2026 | Initialversion | Joel Blumer |
|           |            |                |             |

Tabelle 1:	Änderungskontrolle

########### 1 Inhalt

1	Ausgangslage	3

1.1	Abgrenzung	3

2	Anforderungen	3

2.1	Mieter- Serviceportal	3

2.1.1	Akteure (Auszug Use-Case «Landing Page» V2.0)	3

2.1.2	Anforderungen (Auszug Use-Case «Landing Page» V2.0)	3

2.2	Bedarf Unterbringung (Pilot)	4

2.2.1	Akteure (Auszug Use-Case «Bedarf Unterbringung» V2.1)	4

2.2.2	Anforderungen (Auszug Use-Case «Bedarf Unterbringung» V2.1)	4

2.3	Systemvariante Adapt	5

2.3.1	Beschreibung	5

2.3.2	Anforderungsabdeckung	5

2.3.3	Machbarkeitsbeurteilung	6

2.4	Systemvariante Buy	6

2.4.1	Beschreibung	6

2.4.2	Anforderungsabdeckung	7

2.4.3	Machbarkeitsbeurteilung	7

2.5	Systemvariante Create	8

2.5.1	Beschreibung	8

2.5.2	Anforderungsabdeckung	8

2.5.3	Machbarkeitsbeurteilung	9

3	Variantenvergleich	10

3.1	Variante Public Cloud	12

4	Empfehlung	12

5	Anhang	14

5.1	Use Cases	14

5.2	Architekturskizze	14

5.3	Factsheets	14

5.3.1	Variante Adapt	14

5.3.2	Variante Create	14

## 1 Ausgangslage

Heute existiert kein einheitliches Mieter-/Serviceportal als Single Point of Contact (SPOC). Stattdessen werden Informationen und Leistungen über Einzellösungen je Funktionalität sowie über manuelle Kanäle (Telefon, E-Mail, Dateien) bereitgestellt bzw. abgewickelt. Dies führt zu Medienbrüchen, Intransparenz, erhöhtem Koordinationsaufwand sowie längeren Reaktionszeiten bei Veränderungen in der Zusammenarbeit.

Das BBL soll als fachlicher Owner ein Portal bereitstellen, welches Stakeholder themenbezogen zu Kompetenzzentren und Services leitet (digitale Triage, z. B. Chatbot/Wizard), Informationen als Self-Service bereitstellt und digitale Zusammenarbeit inklusive Rollen-/Berechtigungssteuerung ermöglicht. Die technische Umsetzung und der Betrieb erfolgen durch den IT-Leistungserbringer.

Die Umsetzung folgt einer Roadmap und einer Fallkategorisierung:

- Fall A: Basisleistungen (SUPERB)

- Fall B: unabhängig von Basisleistungen
- Fall C: neue Serviceideen (strategische Freigabe erforderlich)

Als Pilot soll der Use Case «Anmeldung Bedarf Unterbringung (Antragsformular)» umgesetzt werden als Teil der Basisleistungen (Fall A), um die digitale Zusammenarbeit zwischen Bedarfsträger (VE/ILBO), Genehmigungsinstanz (GS) und BBL (PFM) zu etablieren und den genehmigten Bedarf direkt in SAP ePPM/PPM zu überführen.

### 1.1 Abgrenzung

Der Scope dieses Systemkonzepts ist auf den Pilot-Use-Case «Anmeldung Bedarf Unterbringung (Antragsformular)» sowie den Use Case «Landing Page Mieter-/Serviceportal (SPOC)» begrenzt. Aspekte zur Skalierung, zur späteren Erweiterung um weitere Use Cases sowie zusätzliche Roadmap-Funktionalitäten sind nicht Bestandteil dieser Version und wurden bei der Variantenbewertung nicht berücksichtigt.

Die im Dokument enthaltenen Empfehlungen und Bewertungen gelten ausschliesslich für den beschriebenen Scope. Sofern sich Anforderungen, Rahmenbedingungen oder Zielsetzungen ändern oder neue Use Cases hinzukommen, sind die beschriebenen Varianten sowie deren Bewertung und Empfehlung erneut zu prüfen und gegebenenfalls zu aktualisieren.

## 2 Anforderungen

### Mieter- Serviceportal

#### 2.1.1 Akteure (Auszug Use-Case «Landing Page» V2.0)

Fachamt BBL als Owner Mieterportals; LE als Betreiber des Mieterportal, definierte Rolle Mieter als User des Mieterportals.

#### 2.1.2 Anforderungen (Auszug Use-Case «Landing Page» V2.0)

dass die Kunden des BBL ein Portal erhalten als Single Point of Contact SPOC, dass folgende Funktionen erfüllt

- visuelle Einfachheit/Übersichtlichkeit
- selbsterklärende Bedienung
- Unterstützung Wizards/Assistenten bei komplexen Funktionen (z.B. Bedarfsmeldungen, Bestellungen, Analysen)
- Rollenbasierte Freigaben von Detailleistungen (Berechtigungskonzept Zugriff auf z.B.VE-Spez: Verträge, Budgetinfo)
- Self Service Dashboards (z.B. Kennzahlen, Eingabe seitens Mieter /Nutzer direkt über Erfassungsmaske im MP))
- Vorschlagfunktionen aus Historie (z.B. was habe ich als Letztes bestellt, beantragt etc.)
- Self Service Downloads (Pläne, Gebäudeinformationen, Schulungsangebote etc.)
- Responsive Design auch für mobile Geräte, wenn kein IAM nötig
- Quellennachweis, Ansprechpartner und Aktualitätsnachweis bei allen Informationen vorhanden (definierte Qualitätsanforderungen)

dass ich als fachlicher Verantwortlicher des Mieterportals über folgende technische Funktionen verfüge:

- Flexible, kostengünstige und schnelle Ausgestaltung der Landingpage durch Low Code/Makroprogrammierung durch Fach möglich
- Freie Anbindung digitaler Services über API aus allen Systemen
- Die Landing Page den Bau von digitalen Workflows anbietet, wenn das anbietende System für den Service diese Funktionalität nicht anbietet
- Berechtigungskonzept bei Funktionalitäten der digitalen Zusammenarbeit
- Fach kann Inhalte selbst publizieren und löschen (nach definiertem Betriebs Konzept Fach)

### Bedarf Unterbringung (Pilot)

#### 2.1.3 Akteure (Auszug Use-Case «Bedarf Unterbringung» V2.1)

Antragssteller Bedarfsträger VE (ILBO), Beurteilung und Freigabe Bedarf bei GS, Eingang Bedarf bei BBL (Erfassung und Steuerung im SAP PPM)

#### 2.1.4 Anforderungen (Auszug Use-Case «Bedarf Unterbringung» V2.1)

Für die digitale Zusammenarbeit zwischen Bedarfssteller, Beurteilungsinstanz, Genehmigung und Erfüllungsverantwortliche, soll für die Beantragung des Unterbringungsbedarfs (heutiges Antragsformular), eine digitale Lösung geschaffen werden, mit dem Ziel den genehmigten Bedarf direkt im SAP PPM anzulegen für die nachfolgenden Prozessschritte.

Eingabeformat Verwaltungseinheit (Rolle ILBO):

- Auswahlfeld VE/DEP (dadurch automatische Zuweisung auf Verantwortliche Rollen BBL, Info an weitere Rollen BBL zu definieren und Anzeige dieser Rollen)
- Automatisierte Berechtigungsvergabe für gesamten Prozess durch Auswahl VE (kann übersteuert werden bei Bedarf – definierte Rolle)
- Auswahlfeld Unterbringungsbedarf für Standort und Gebäudekategorie (PFM Kategorien)
- Unterfenster bei Antrag Arbeitsplätze -&gt; interaktive Befragung zu Arbeitsstilformen (NAW Faktor Flächenbedarfsermittlung)
- Prov. Berechnung von UK-Kosten je Gebäudekategorie (m2*CHF) und Standort
- Nachweis Wirtschaftlichkeit (upload oder Berechnungstool)
- Nachweis rechtliche Grundlagen (Link upload)
- Info an verantwortliche Rollen über Eingabe bei GS (per E-Mail und als Statusinformation auf Mieterportal ersichtlich - Inbox)
- Upload-Möglichkeit für Dokumente (bspw. PDF)
- Möglichkeit einen bereits ausgefüllten (oder teilweise ausgefüllten) Antrag zu löschen
- Infotexte für User hinzufügen (bspw. mittels Popup)

Kategorisierung der Felder in *Muss* und *Kann*

Eingabeformat Beurteilung und Freigabe (Rolle GS):

- Bei Feldern welche Zustimmung erfordern ok/NoK/Bemerkung
- Gesamtfreigabe oder Rückweisung mit Auflage
- Die Freigabe und die Rückweisung ist in einem Textfeld begründen.
- Info an alle beteiligten Rollen nach Bearbeitung (per E-Mail und als Statusinformation auf Mieterportal ersichtlich)

Eingabeformat BBL (Rolle PFM- Meldung Bedarf in EPPM SAP):

- Formular Bedarfsmeldung SAP mit allen relevanten Informationen und Freigabe GS wird aus MP direkt im SAP ePPM eingelesen
- Info an alle beteiligten Rollen nach Eingang (Statusinformation auf Mieterportal ersichtlich)

Analytische, anonymisierte Auswertungen im MP über die Anzahl der Meldung pro VE und Jahr und deren Status. Die Informationen stehen nach Eingabe nur den berechtigten Rollen zur Verfügung.

### Systemvariante Adapt

#### 2.1.5 Beschreibung

In der Adapt-Variante wird der Ansatz verfolgt, bereits vorhandene Standarddienste des Bundes zu nutzen und damit eine Lösung mit möglichst geringem Beschaffungs- und Entwicklungsaufwand aufzubauen. Da Power Apps nach aktuellem Stand nicht für geschäftliche Zwecke im vorgesehenen Kontext einsetzbar ist, steht als naheliegender Standardbaustein primär der Standard-Dienst Web (SD Web), auch als Marktleistung «Content Delivery Service» bekannt, zur Verfügung. Dieser eignet sich insbesondere für die Bereitstellung der Landing Page als Single Point of Contact sowie für Content-Funktionen wie Informationen, Downloads und Verlinkungen auf weitere Services.

Für transaktionale Anwendungsfälle wie den Pilot «Bedarf Unterbringung» bietet SD Web jedoch nur begrenzte Möglichkeiten. Als ergänzende Option wird deshalb die Verwendung von GEVER (Bundesarchiv) als Workflow- bzw. Dossier-Komponente betrachtet, beispielsweise zur strukturierten Ablage, Nachvollziehbarkeit und einfachen Aufgaben-/Freigabeschritten. Diese Kombination (SD Web als Front/Content und GEVER als nachgelagerte Bearbeitungs-/Nachweiskomponente) kann einzelne Elemente der digitalen Zusammenarbeit abdecken, ersetzt jedoch kein spezialisiertes Portal-/Formular-/Workflow-System. Die Anbindung an SAP ePPM/PPM erfolgt in dieser Variante weiterhin über einen Integrationsmechanismus. Es ist jedoch davon auszugehen, dass wesentliche Teile der fachlichen Logik und der Prozesssteuerung nicht direkt im Portal abgebildet werden können, sondern in nachgelagerte Systeme verlagert oder über zusätzliche Workarounds umgesetzt werden müssten.

#### 2.1.6 Anforderungsabdeckung

Die Anforderungsabdeckung der Adapt-Variante ist mit den verfügbaren Standarddiensten insgesamt nur gering bis punktuell. SD Web deckt die Anforderungen an eine SPOC-Landing Page, übersichtliche Navigation, Informationsbereitstellung und Self-Service-Downloads grundsätzlich ab. Anforderungen wie Wizards/Assistenten, Formularlogik mit Muss/Kann-Feldern, interaktive Befragungen (NAW), provisorische Kostenberechnungen, Status-/Inbox-Führung sowie eine durchgängige Prozesssteuerung (GS-Freigabe, Rückweisung mit Auflagen) werden durch SD Web jedoch nur sehr eingeschränkt oder gar nicht unterstützt.

GEVER kann in dieser Variante unterstützend wirken, insbesondere für Nachvollziehbarkeit, Dossierbildung und einfache Bearbeitungs-/Freigabeschritte. Dennoch bleibt die Abdeckung für die zentralen Portalanforderungen und für den Pilotprozess spärlich, weil GEVER nicht als Portal-/Wizard-Lösung konzipiert ist und die gewünschte Nutzerführung sowie die prozessnahe Interaktion (inkl. dynamischer Formularlogik) nur eingeschränkt abbilden kann.

Zusammengefasst ist die Adapt-Variante daher eher geeignet, um einen SPOC mit Informations-/Content-Funktionen bereitzustellen, weniger jedoch, um den Pilot «Bedarf Unterbringung» als durchgängigen digitalen Prozess inkl. SAP ePPM/PPM-Übernahme umzusetzen.

#### 2.1.7 Machbarkeitsbeurteilung

Die Adapt-Variante ist technisch grundsätzlich umsetzbar, führt jedoch aufgrund der eingeschränkten Funktionsabdeckung zu relevanten fachlichen und organisatorischen Einschränkungen. Da Power Apps in diesem Kontext nicht eingesetzt werden kann, lassen sich die vorgesehenen transaktionalen Prozesse und Workflows (z. B. Formularstrecken, Wizards sowie Freigaben/Rückweisungen) im Portal nicht umsetzen. Damit steigt das Risiko, dass der Pilot nur über Umwege (z. B. Medienbrüche, Workarounds oder starke Prozessverlagerung in nachgelagerte Systeme) umgesetzt werden kann und der Nutzen des Mieterportals im Pilot nicht ausreichend nachgewiesen wird.

Der Einsatz von GEVER als Workflow-/Nachweis-Komponente kann einzelne Anforderungen adressieren (insbesondere Nachvollziehbarkeit und Dokumentation), ist jedoch kein Ersatz für eine geeignete Formular-/Wizard- und Case-/Workflow-Plattform. Zudem ist davon auszugehen, dass Integrationen und Prozessführung komplexer werden, weil Frontend, Bearbeitung und Zielsystem (SAP ePPM/PPM) nicht in einer durchgängigen Lösung zusammengeführt sind.

Aus Sicht des Systemkonzepts ist Adapt in der vorliegenden Ausprägung deshalb als eingeschränkt tragfähige Variante zu bewerten. Sie eignet sich für einen SPOC mit Content, jedoch nicht als Zielarchitektur für den Pilotprozess.

### Systemvariante Buy

#### 2.1.8 Beschreibung

In der Systemvariante Buy wird das IMMO Mieterportal über die Beschaffung einer marktgängigen Portal- und Workflow-/Case-Management-Plattform realisiert. Ziel ist es, die geforderten Funktionen für SPOC-Landing Page, rollenbasierte Bereitstellung von Informationen, Self-Service, Wizards sowie die digitale Zusammenarbeit (inkl. Status-/Inbox-Führung, Freigaben und Rückweisungen) möglichst weitgehend als Standardfunktionalität zu erhalten und damit Entwicklungsaufwand zu reduzieren.

Da im BIT aktuell keine bestehende Standardplattform zur Wiederverwendung verfügbar ist, wäre die Buy-Variante als eigenständige Beschaffung umzusetzen. Zur Konkretisierung der Lösungsausprägung werden Kandidatenprodukte in einer Shortlist bewertet. Die definitive Auswahl würde dann im Beschaffungsverfahren erfolgen.

Als beispielhafte Kandidaten können insbesondere folgende marktgängige Plattformen als Referenz dienen, um Funktionsumfang und Integrationsfähigkeit zu beurteilen:

- Enterprise Service Portal / Case Suites, z. B. ServiceNow Customer Service Management (CSM)
- Case-/Workflow-orientierte Plattformen, z. B. Pega (Customer Service / Case Management) und Appian (Dynamic Case Management / Process Automation)
- SAP-nahe Workflow-/Forms-Option, z. B. SAP Build Process Automation (als Workflow-/Formularbaustein; Portal-/SPOC-Frontend je nach Ausprägung separat)

Der Pilot «Bedarf Unterbringung» wird in einer Buy-Plattform als Case/Workflow modelliert. Dabei werden insbesondere folgende Elemente abgebildet:

- Rollen-/Berechtigungslogik entlang VE/DEP, inkl. definierter Übersteuerung
- GS-Freigabe mit Rückweisung/Auflagen
- Status- und Inbox-Funktionalität für die Beteiligten
- Benachrichtigungen sowie Nachvollziehbarkeit/Audit Trail
- Übergabe des genehmigten Bedarfs in SAP ePPM/PPM über definierte Integrations-schnittstellen, inkl. Fehlerhandling (z. B. Reprocessing)

#### 2.1.9 Anforderungsabdeckung

Die Buy-Variante deckt die Portal-Standardanforderungen in der Regel sehr gut ab, da marktgängige Plattformen zentrale Funktionen wie SPOC-Einstieg, rollenbasierte Navigation, Wissens-/Downloadbereiche, Status-/Inbox-Führung, Aufgabensteuerung sowie Audit Trail und Reporting meist als Standard mitbringen. Dadurch eignet sie sich gut zur Standardisierung und Wiederverwendung über mehrere Use Cases.

Für den Pilot «Bedarf Unterbringung» ist die Abdeckung grundsätzlich hoch, da sich GS-Freigaben und Rückweisungen, Statusverfolgung über mehrere Rollen sowie Benachrichtigungen typischerweise direkt als Case/Workflow modellieren lassen. Die Abbildbarkeit komplexer Wizards und Formularlogik (Muss/Kann, dynamische Teilfragen, NAW, Nachweise) ist produktabhängig und kann je nach Umfang zusätzlichen Konfigurations- oder Customizingaufwand verursachen.

Der kritischste Punkt bleibt die End-to-End-Integration nach SAP ePPM/PPM. Entscheidend ist eine fachlich vollständige und betrieblich robuste Übergabe des genehmigten Bedarfs inklusive GS-Freigabeinformationen, mit sauberem Datenmapping, Fehlerhandling, Reprocessing sowie Logging/Audit-Trail.

#### 2.1.10 Machbarkeitsbeurteilung

Die Buy-Variante ist grundsätzlich gut machbar, da die benötigten Kernfähigkeiten (Portal, Case/Workflow, Inbox/Status, Audit und Reporting) in etablierten Produkten vorhanden sind. Der Time-to-Market für den Pilot ist jedoch tendenziell länger, da Evaluation, formelle Beschaffung und Einführung erfahrungsgemäss zeitintensiv sind (inkl. Governance, Rollenmodell, Integration und Betriebskonzept).

Für eine risikominimierte Umsetzung sind frühzeitig folgende Punkte zu klären:

- Betriebsmodell/Betreibbarkeit: Betrieb durch Leistungserbringer muss möglich sein. Reine Self-Service-Angebote sind nur eingeschränkt geeignet.
- Cloud-/Umgebungsfit &amp; Governance: Konformität mit Sicherheits-/Datenschutzvorgaben und Betreibbarkeit in der Zielumgebung.
- Integration SAP ePPM/PPM: robuste Übergabe inkl. GS-Freigabe, Fehlerhandling, Reprocessing und Auditierbarkeit.
- Standard vs. Customizing: Vermeidung einer Customizing-Spirale bei Wizard-Logik, Rollenmodell und Prozessvarianten.
- Lifecycle/Kosten: Lizenz- und Betriebskosten, Upgrade-Zyklen, Vendor Lock-in und Wartbarkeit.

Buy ist besonders attraktiv, wenn das Mieterportal als skalierbare Plattform für mehrere Roadmap-Use Cases aufgebaut werden soll. Für einen sehr schnellen Pilot bleibt die Variante aufgrund des Beschaffungsvorlaufs zeitlich risikobehaftet und ungeeignet.

### Systemvariante Create

#### 2.1.11 Beschreibung

In der Create-Variante wird das IMMO Mieterportal als Eigenentwicklung umgesetzt, um den Pilot «Bedarf Unterbringung» und die Landing Page als durchgängige, digitale Lösung aus einer Hand abzubilden. Als Zielplattform dient RHOS (Red Hat OpenShift), sodass die Lösung auf einem standardisierten Plattform-Stack aufsetzt und in bestehende Betriebs- und Sicherheitsprozesse des BITs integrierbar ist.

Die Lösung wird als zentrale Portalapplikation realisiert, welche die SPOC-Landing Page, transaktionale Funktionen (Wizard-/Formularstrecken), Status-/Inbox-Funktionen sowie die Prozesslogik für Freigaben und Rückweisungen abdeckt. Der Benutzerzugriff erfolgt über den Browser und wird über eine vorgeschaltete Absicherungs- und Zugangsschicht (Load Balancer/WAF) geführt. Dadurch werden die grundlegenden Anforderungen an Schutz, Stabilität und kontrollierte Zugriffe unterstützt.

Die Benutzer authentisieren sich am Portal über eIAM. Die Rollen- und Berechtigungsverwaltung wird über das delegierte Management abgebildet, sodass VE/DEP-bezogene Zugriffsrechte, Stellvertretungen und organisatorische Zuständigkeiten fachlich nachvollziehbar gepflegt werden können. Als optionale Erweiterung kann ein Datenbezugspunkt (DBP) angebunden werden, sofern fachlich erforderlich, zusätzliche Organisations- und Funktionsinformationen zu Bundesmitarbeitenden zu beziehen. Damit können spätere Ausbaustufen stärker attributbasiert unterstützen (z. B. zusätzliche Plausibilisierungen oder automatisierte Zuweisungen), ohne das Grundprinzip der rollenbasierten Zugriffskontrolle zu ersetzen.

Zur Reduktion von Entwicklungs- und Betriebsaufwand nutzt die Eigenentwicklung gezielt Standardservices in der RHOS-nahen Service-Landschaft. Für die Umsetzung der Anforderungen sind insbesondere folgende Bausteine vorgesehen:

- Datenhaltung: Datenbank für Prozess-, Status- und Protokolldaten (z. B. Antrag, Bearbeitungsstatus, Freigabeentscheid).
- Dokumente/Nachweise: Objektablage für Uploads und Nachweisdokumente (z. B. Wirtschaftlichkeit, rechtliche Grundlagen).
- Sicherheit: zentrale Secrets-/Key-Verwaltung für Applikationszugänge sowie Schutzfunktionen für Datei-Uploads (Malware-Prüfung).
- Formularbaustein: optionaler Form-Service zur Unterstützung von Formular- und Dokumentfunktionen (je nach Ausprägung des Piloten).

Die Integration in die SAP-Welt erfolgt über das BIT Webservice Gateway (WSG) sowie einer bestehenden SAP-Middleware-Komponente. Der genehmigte Bedarf kann dadurch in das SAP-Backend übernommen werden. Diese Entkopplung erleichtert den Betrieb, die Fehlerbehandlung und die Nachvollziehbarkeit, da Portal und SAP über definierte Schnittstellen interagieren. Benachrichtigungen (z. B. bei Statuswechseln oder Freigaben) können über die bestehende Mail-Infrastruktur umgesetzt werden.

Die detaillierte Netzwerksicht (Zonen, Komponenten und Kommunikationsbeziehungen inkl. DBP) wird als Referenzarchitektur im Anhang dokumentiert.

#### 2.1.12 Anforderungsabdeckung

Die Create-Variante weist eine hohe Anforderungsabdeckung auf, da Benutzerführung, Wizard-/Formularlogik, Rollenmodell und Prozessschritte passgenau für den Pilot «Bedarf Unterbringung» umgesetzt werden können. Damit lassen sich insbesondere VE/DEP-basierte Berechtigungsvergabe (inkl. definierter Übersteuerung), interaktive Befragungen (z. B. NAW), provisorische Berechnungen, Nachweise (Upload/Link), GS-Freigabe und Rückweisung mit Auflagen sowie eine konsistente Status-/Inbox-Führung durchgängig abbilden. Auch anonymisierte Auswertungen können so umgesetzt werden, dass sie fachlich nutzbar und datenschutzkonform sind.

Ein wesentlicher Vorteil der Variante besteht darin, dass zentrale technische Basisfähigkeiten nicht individuell gebaut, sondern über Standardservices abgedeckt werden (Dokumentenablage, Secrets-Handling, Upload-Schutz, Datenhaltung). Dadurch werden nicht-funktionale Anforderungen wie Sicherheit, Nachvollziehbarkeit und Betreibbarkeit pragmatisch unterstützt.

Der Datenbezugspunkt (DBP) ist als Erweiterungsoption zu verstehen. Für den Pilot sind eIAM mit der Option des delegierten Managements ausreichend. Der DBP kann jedoch später genutzt werden, um zusätzliche Organisations- oder Funktionsattribute für Automatisierung oder feinere Berechtigungsentscheidungen heranzuziehen, sofern dies fachlich erforderlich ist.

#### 2.1.13 Machbarkeitsbeurteilung

Die Variante ist grundsätzlich machbar und durch die Nutzung von RHOS sowie Standardservices gut integrierbar. Im Vergleich zur Buy-Variante entfällt der Beschaffungsvorlauf einer Suite. Gleichzeitig ist der Initialaufwand höher als bei Adapt, da Architektur, Umsetzung, Tests, Integrationen sowie Betriebsartefakte aktiv aufgebaut werden müssen. Dadurch steigt das Liefer- und Betriebsrisiko gegenüber einer Standardplattform.

Für eine realistische Umsetzung sind frühzeitig folgende Punkte verbindlich zu klären:

- Betrieb und Verantwortung: Betrieb der Lösung durch den Leistungserbringer BIT inkl. Überwachung, Support, Release-/Patch und Betriebsdokumentation.
- IAM und Rollenmodell: eIAM-Anbindung, delegiertes Management (Rollenpflege/Delegation/Stellvertretung) und konsistente Autorisierung im Portal.
- SAP-Integration: robuste Übergabe nach SAP ePPM/PPM über Gateway/Middleware inkl. Datenmapping, Fehlerhandling, Nachverarbeitung und Auditierbarkeit.
- Sicherheit und Nachvollziehbarkeit: Schutz der Zugriffe, Logging/Audit sowie sichere Verwaltung von Applikationszugängen.
- Dokumentenhandling: sichere Upload-Verarbeitung inkl. Schutzprüfung und kontrollierter Ablage.
- Datenbezugspunkt (DBP): Auslesen von Rollen, Funktionen und Betriebszugehörigkeit der Bundesmitarbeitenden, die sich via eIAM am Portal anmelden.

In Summe ist Create insbesondere dann sinnvoll, wenn der Pilot als durchgängiger End-to-End-Prozess umgesetzt werden soll und Adapt aufgrund der geringen Abdeckung nicht genügt, während Buy aufgrund Beschaffungsdauer oder Rahmenbedingungen nicht rechtzeitig realisierbar ist. Die Referenzarchitektur mit RHOS und Standardservices schafft eine technische Basis, ersetzt jedoch nicht die Notwendigkeit eines abgestimmten Architektur- und Betriebskonzepts.

## 3 Variantenvergleich

Der Variantenvergleich bewertet die drei Lösungsansätze Adapt, Buy und Create anhand definierter Kriterien. Im Fokus stehen dabei insbesondere die Umsetzbarkeit des Pilot-Use-Cases «Bedarf Unterbringung“ und der Landing Page (SPOC), die Integrationsfähigkeit Richtung SAP ePPM/PPM sowie betriebliche und wirtschaftliche Aspekte. Die nachfolgende Bewertung erfolgt auf Basis eines Rankings (Skala 1 - 3; 1 = schlecht, 3 = gut). Zusätzlich wird eine Gewichtung (Skala 1 - 3) vorgesehen, um die Kriterien im gemeinsamen Verständnis mit dem BBL priorisieren zu können. Aus Bewertung und Gewichtung ergibt sich ein Total je Variante und daraus eine Empfehlung.

|                                                   |            | Variante Adapt         | Variante Adapt                           | Variante Buy         | Variante Buy                           | Variante Create         | Variante Create                           |
|---------------------------------------------------|------------|------------------------|------------------------------------------|----------------------|----------------------------------------|-------------------------|-------------------------------------------|
| Kriterium                                         | Gewichtung | Bewertung              | **Adapt Total (Gewichtung x Bewertung)** | Bewertung            | **Buy Total (Gewichtung x Bewertung)** | Bewertung               | **Create Total (Gewichtung x Bewertung)** |
| Pilot Time-to-Market                              | 3          | 2                      | **6**                                    | 1                    | **3**                                  | 2                       | **6**                                     |
| Kosten (inkl. Betrieb/Lizenzen/Einführung)        | 3          | 3                      | **9**                                    | 1                    | **3**                                  | 3                       | **9**                                     |
| Verwendete Synergien (Standarddienste/Reuse)      | 2          | 3                      | **6**                                    | 1                    | **2**                                  | 2                       | **4**                                     |
| Abhängigkeiten (Schnittstellen/Produktstrategien) | 3          | 2                      | **6**                                    | 2                    | **6**                                  | 2                       | **6**                                     |
| Businessprozessveränderung                        | 1          | 1                      | **1**                                    | 2                    | **2**                                  | 2                       | **2**                                     |
| Langfristigkeit                                   | 1          | 1                      | **1**                                    | 3                    | **3**                                  | 3                       | **3**                                     |
| Integrationsfähigkeit SAP/Non-SAP                 | 2          | 1                      | **2**                                    | 2                    | **4**                                  | 3                       | **6**                                     |
| Anforderungsabdeckung (Muss/Soll)                 | 2          | 1                      | **2**                                    | 3                    | **6**                                  | 3                       | **6**                                     |
| Benutzerfreundlichkeit                            | 2          | 1                      | **2**                                    | 3                    | **6**                                  | 3                       | **6**                                     |
| Technologie-Modernität                            | 2          | 2                      | **4**                                    | 3                    | **6**                                  | 3                       | **6**                                     |
| Automatisierungsgrad                              | 2          | 1                      | **2**                                    | 3                    | **6**                                  | 3                       | **6**                                     |
| Risiken (Gesamtbetrachtung)                       | 2          | 1                      | **2**                                    | 2                    | **4**                                  | 2                       | **4**                                     |
| Gesamtsumme                                       |            | **Variante Adapt: 43** |                                          | **Variante Buy: 51** |                                        | **Variante Create: 64** |                                           |

Mit der Variante Create kann der Pilot «Bedarf Unterbringung» inklusive Rollensteuerung, Status-/Inbox-Führung und der Integration in SAP ePPM/PPM end-to-end vollständig und am flexibelsten abgebildet werden. Durch die Umsetzung auf RHOS und die Nutzung von BIT-Standardservices wird die Betreibbarkeit verbessert und Beschaffungsrisiken entfallen.

Die Variante Buy überzeugt vor allem durch hohe Funktionsabdeckung, Benutzerfreundlichkeit und Automatisierung dank Standardplattform. Der entscheidende Nachteil ist der längere Vorlauf durch Beschaffung und Einführung sowie die Kosten- und Vendor-Lock-in-Thematik.

Adapt ist zwar für eine schnelle SPOC-/Content-Lösung geeignet und nutzt vorhandene Standarddienste, deckt jedoch den Pilotprozess nur eingeschränkt ab. Damit besteht ein erhöhtes Risiko, dass der erwartete Nutzen (digitale Zusammenarbeit ohne Workarounds) im Pilot nicht erreicht wird.

### Variante Public Cloud

Für das IMMO Mieterportal wird die Option einer Umsetzung in der Public Cloud grundsätzlich als attraktiver Ansatz betrachtet, weil sie eine hohe Agilität, kurze Bereitstellungszeiten und den Zugriff auf moderne Plattformdienste ermöglichen kann. In der Praxis ist diese Variante jedoch nicht nur technisch zu bewerten, sondern vor allem entlang des vorgesehenen Betriebsmodells und der organisatorischen Verantwortlichkeiten.

Das BBL erwartet einen operativen Betrieb durch einen Leistungserbringer (inkl. Übernahme von Betriebsaufgaben wie Überwachung, Incident Management, Wartung und Weiterentwicklung im geregelten Betrieb). Diese Erwartung steht im direkten Konflikt mit dem aktuellen Angebot des BIT für Public-Cloud-Leistungen. Gemäss WTO20007 wird die Public Cloud durch das BIT ausschliesslich als Self-Service angeboten. Das bedeutet, dass kein klassischer Betriebsservice im Sinne eines betriebenen Applikations- oder Plattformbetriebs durch BIT bzw. einen durch BIT bereitgestellten Leistungserbringer zur Verfügung steht, sondern dass die konsumierende Organisation den Betrieb faktisch selbst verantworten und organisieren müsste.

Damit ergibt sich ein entscheidendes Ausschlusskriterium für die Variante Public Cloud. Solange die Public Cloud im Rahmen WTO20007 nur als Self-Service bezogen werden kann, ist das gewünschte Betriebsmodell des BBL (Betrieb durch Leistungserbringer) nicht umsetzbar. Eine Public-Cloud-Umsetzung würde entweder zu einer nicht akzeptierten Verlagerung von Betriebsverantwortlichkeiten in Richtung BBL führen oder es müssten ausserhalb des BIT-Angebots zusätzliche Betriebsstrukturen aufgebaut werden, was dem Ziel einer standardisierten, wirtschaftlichen Lösung widerspricht und die Governance- und Compliance-Risiken erhöht.

Aus Sicht des Systemkonzepts wird die Public-Cloud-Variante deshalb nur dann weiterverfolgt, wenn eine der folgenden Bedingungen erfüllt werden kann:

Entweder wird ein Betriebsmodell etabliert, das den Betrieb durch einen Leistungserbringer in der Public Cloud regelkonform ermöglicht, oder das BBL akzeptiert explizit die Konsequenzen eines Self-Service-Betriebs (inkl. personeller und organisatorischer Betriebsverantwortung). Bis dahin ist die Public Cloud für das IMMO Mieterportal in der vorliegenden Zielsetzung nicht die bevorzugte Variante, da sie das zentrale Zielbild eines betriebenen Services nicht erfüllt.

## 4 Empfehlung

Auf Basis der gemeinsam mit dem BBL durchgeführten Bewertung wird für den betrachteten Scope (Landing Page/SPOC und Pilot «Bedarf Unterbringung») die Systemvariante Create empfohlen. Sie erreicht die höchste Gesamtbewertung und ermöglicht eine durchgängige End-to-End-Umsetzung des Piloten (Antrag, GS-Freigabe/Rückweisung, Übernahme in SAP) inklusive Rollensteuerung sowie Status-/Inbox-Führung. Durch die Umsetzung auf RHOS und die Nutzung von BIT-Standardservices wird das gewünschte Betriebsmodell (Betrieb durch Leistungserbringer) vollumfänglich unterstützt.

Die Buy-Variante bleibt fachlich attraktiv (hoher Standardfunktionsumfang), ist für den Pilot jedoch aufgrund des hohen Beschaffungsvorlauf nur eingeschränkt geeignet.

Adapt eignet sich primär für SPOC/Content, deckt den Pilotprozess jedoch nur unzureichend ab und birgt damit ein erhöhtes Risiko von Workarounds und ist nicht zu empfehlen.

## Anhang

### 4.1 Use Cases

Use Case Bedarf Unterbringung V2.1.docx

Use Case Landing Page V2.0.docx

### 4.2 Architekturskizze

BBL\_IMMO\_Mieterportal.vsdx

### 4.3 Factsheets

Factsheet eIAM: [https://intranet.bit.admin.ch/bit\_kp/de/home/angebot/platform/e-government-identity-und-access-management-eiam.html](https://intranet.bit.admin.ch/bit_kp/de/home/angebot/platform/e-government-identity-und-access-management-eiam.html)

#### 4.3.1 Variante Adapt

Factsheet Content Delivery Service (SD Web): [https://intranet.bit.admin.ch/bit\_kp/de/home/angebot/solution/content-delivery-services.html](https://intranet.bit.admin.ch/bit_kp/de/home/angebot/solution/content-delivery-services.html)

#### 4.3.2 Variante Create

Infosheet Betrieb Fachanwendung: [https://intranet.bit.admin.ch/dam/bit\_kp/de/dokumente/angebot/solution/fachanwendungen/infosheet-fachanwendungen.pdf.download.pdf/Infosheet%20Betrieb%20Fachanwendung.pdf](https://intranet.bit.admin.ch/dam/bit_kp/de/dokumente/angebot/solution/fachanwendungen/infosheet-fachanwendungen.pdf.download.pdf/Infosheet%20Betrieb%20Fachanwendung.pdf)

Factsheet Fachanwendung Full Service: [https://intranet.bit.admin.ch/bit\_kp/de/home/angebot/solution/fachanwendung-full-service.html](https://intranet.bit.admin.ch/bit_kp/de/home/angebot/solution/fachanwendung-full-service.html)

Factsheet Form-Service: [https://intranet.bit.admin.ch/bit\_kp/de/home/angebot/solution/forms-service.html](https://intranet.bit.admin.ch/bit_kp/de/home/angebot/solution/forms-service.html)

Factsheet Object Storage (S3): [https://intranet.bit.admin.ch/bit\_kp/de/home/angebot/platform/object-storage.html](https://intranet.bit.admin.ch/bit_kp/de/home/angebot/platform/object-storage.html)

Factsheet Antivirus: [https://intranet.bit.admin.ch/bit\_kp/de/home/angebot/platform/antivirus.html](https://intranet.bit.admin.ch/bit_kp/de/home/angebot/platform/antivirus.html)

Factsheet PostgreSQL: [https://intranet.bit.admin.ch/bit\_kp/de/home/angebot/platform/postgresql.html](https://intranet.bit.admin.ch/bit_kp/de/home/angebot/platform/postgresql.html)

Factsheet Datenbezugspunkt: [https://intranet.bit.admin.ch/bit\_kp/de/home/angebot/platform/datenbezugspunkt.html](https://intranet.bit.admin.ch/bit_kp/de/home/angebot/platform/datenbezugspunkt.html)

Factsheet Container Application Environment (CAE): [https://intranet.bit.admin.ch/bit\_kp/de/home/angebot/platform/container-application-environment.html](https://intranet.bit.admin.ch/bit_kp/de/home/angebot/platform/container-application-environment.html)

Factsheet Vault: [https://intranet.bit.admin.ch/bit\_kp/de/home/angebot/platform/vault.html](https://intranet.bit.admin.ch/bit_kp/de/home/angebot/platform/vault.html)

Factsheet CI/CD Pipeline: [https://intranet.bit.admin.ch/bit\_kp/de/home/angebot/platform/cicd-pipeline.html](https://intranet.bit.admin.ch/bit_kp/de/home/angebot/platform/cicd-pipeline.html)