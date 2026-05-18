SUPERB

ERP IMMO

Fachkonzept Mieterportal / Landing Page

| Product Owner                                                                               | Heinz Ryter                                                                          |
|---------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| Aktuelle Version / Datum                                                                    |                                                                                      |
| Dokumentstatus (offen / in Arbeit / prüfbereit / geprüft / freigegeben / nicht mehr gültig) |                                                                                      |
| Klassifizierung  (intern / nicht klassiert / vertraulich)                                   |                                                                                      |
| Ablageort (Sharepoint) / Confluence                                                         | Fachkonzept Mieterportal - SAP Work Zone - SUPERB Immobilien - Confluence (admin.ch) |

Kurzbeschreibung

Das Fachkonzept vereint alle fachlichen Anforderungen an einen Prozess. Es dokumentiert die Überprüfung, ob die Umsetzung in SAP mit einem BestPractice Prozess oder mit SAP Standard-Komponenten erfolgen kann. Falls dies nicht möglich ist, muss über einen entsprechenden RfA eine Genehmigung für eine Eigenentwicklung beantragt werden. Allfällige Erweiterungen müssen fachlich genau beschrieben und spezifiziert werden.

Dokumentgeschichte

| Version   | Datum      | Änderungen                             | Autor         |
|-----------|------------|----------------------------------------|---------------|
| 0.1       | 19.09.2024 | Initialversion                         | Holger Ludwig |
| 0.2       | 23.09.2024 | Input FaBeBe                           | Holger Ludwig |
| 0.3       | 27.09.2024 | Fachanforderungen                      | Holger Ludwig |
| 0.3       | 02.10.2024 | Fachanforderungen                      | Holger Ludwig |
| 0.5       | 11.10.2024 | Fachanforderungen                      | Holger Ludwig |
| 0.6       | 28.10.2024 | Fachanforderungen verifiziert / Review | Holger Ludwig |
|           |            |                                        |               |
|           |            |                                        |               |
|           |            |                                        |               |
|           |            |                                        |               |
|           |            |                                        |               |
|           |            |                                        |               |

Geprüft und Freigegeben durch

| Rolle         | Name          | Datum   | Bemerkung   |
|---------------|---------------|---------|-------------|
| PO            | Heinz Ryter   |         |             |
| PV BBL        |               |         |             |
| SA Immobilien | Bodmer Thomas |         |             |

Inhaltsverzeichnis

1	Technische Anforderungen	3

1.1	Launchpad Design - Navigationsaufbau	3

1.1.1	Spaces	4

1.1.2	Pages	4

1.1.3	Sections	4

1.1.4	Tiles	4

2	Fachliche Anforderungen	5

2.1	Übergeordneter Use Case Landing Page	5

2.2	Aufbau der zukünftigen Landing Page	6

2.2.1	Oberste Ebene	7

2.2.2	Themengebiete	7

2.2.3	Unterthemen	7

2.2.4	Themendetails	7

2.3	Funktionale Anforderungen	7

2.3.1	Flächen Info	8

2.3.1.1	Prozess	8

2.3.2	Störungsmeldung	8

2.3.2.1	Prozess	8

2.3.3	Bedarf Unterbringung	9

2.3.4	Bedarf Versorgung	9

2.3.5	Bedarf Ausstattung	9

2.3.6	Informationen zu Verbrauchsdaten von Gebäuden	10

2.3.7	Informationen zu Belegungsdaten	10

2.3.8	Weitere Ausbau – zukünftige Anforderungen	10

2.4	Nicht funktionale Anforderungen	10

2.5	Mock Up	10

3	Berechtigungsanforderungen	11

3.1	Berechtigungsanforderungen in Bezug auf die Migration	11

3.1.1	Korasoft Apps	11

3.1.1.1	Organisation 620 - BBL intern	11

3.1.1.2	Bundesverwaltung – ausserhalb BBL	11

3.1.2	Meldungsapps	11

3.1.2.1	Organisation 620 - BBL intern	11

3.1.2.2	Bundesverwaltung – ausserhalb BBL	12

3.2	Berechtigungsanforderungen für zukünftige Innovationen	12

3.2.1	Organisation 620 / BBL	12

3.2.2	Weitere Organisationseinheiten der Bundesverwaltung	12

3.2.3	Dritte	12

4	Umsetzungvarianten	13

5	Roadmap	14

6	Begriffe &amp; Abkürzungen	15

Abbildungsverzeichnis

Es konnten keine Einträge für ein Abbildungsverzeichnis gefunden werden.

Tabellenverzeichnis

Tabelle 30: Begriffe &amp; Abkürzungen	6

## 1 Technische Anforderungen

### 1.1 Launchpad Design - Navigationsaufbau

<!-- image -->

#### 1.1.1 Spaces

#### 1.1.2 

#### 1.1.3 Pages

#### 1.1.4 

#### 1.1.5 Sections

#### 1.1.6 

#### 1.1.7 Tiles

## 2 Fachliche Anforderungen

### 2.1 Übergeordneter Use Case Landing Page

Der nachfolgende übergeordnete Use Case wurde mit dem Fach erhoben und definiert die allgemeinen Anforderungen und Struktur der Landing Page.

| Use Case Name  (Titel des Anwendungsfalles)                    | User/Client Service Landing Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | User/Client Service Landing Page                                                     | User/Client Service Landing Page     |
|----------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|--------------------------------------|
| **Akteure**  *Als*  (Rolle)                                    | Leistungserbringer des Mieterportals                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Leistungserbringer des Mieterportals                                                 | Leistungserbringer des Mieterportals |
| **Beschreibung**  will ich  (Beschreibung des Anwendungsfalls) | dass die Kunden des BBL ein Portal erhalten, dass folgende Funktionen erfüllt  - visuelle Einfachheit UX - selbsterklärende Bedienung - Unterstützung Wizards/Assistenten bei komplexen Bedarfsmeldungen, Bestellungen, Suchen, Analysen - Auffinden aller Services an einem zentralen Ort - Personalisierung der Seite mit einem Account-Management (was habe ich als letztes bestellt, beantragt etc. Status des Prozesses) - Self Service Dashboards - Responsive Design auch für mobile Geräte - Entsprechende IT-Sicherheitsvorkehrungen wenn kein eIAM möglich  dass ich als Leistungserbringer des Mieterportals über folgende technische Funktionen verfüge:  - Das Mieterportal funktioniert als Landingpage, die alle Funktionalitäten als Services anbietet: «Hier starten und enden alle Dienstleistungen» - Flexible, kostengünstige und schnelle Ausgestaltung der Landingpage durch schnelle Anpassungen des Inhalt - Freie Anbindung digitaler Services über API aus allen Systemen - Die Landing Page digitalen Workflows anbietet, wenn das anbietende System für den Service diese Funktionalität nicht anbietet |                                                                                      |                                      |
| **Wirkung / Nutzen**  *damit*  (Wirkung auf das BBL / Bund)    | Personas & Interessengruppen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Pos. Wirkung / Nutzen                                                                | Neg. Wirkung / Schaden               |
|                                                                | Leistungserbringer (BBL als Querschnittsamt) &  Leistungsbezüger (Mieter, Nutzer)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Nachvollziehbare und transparente Beziehungen zwischen BBL und Kunden (CRM)          |                                      |
|                                                                | Leistungserbringer (BBL als Querschnittsamt) &  Leistungsbezüger (Mieter, Nutzer)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | UX                                                                                   |                                      |
|                                                                | Leistungserbringer (BBL als Querschnittsamt) &  Leistungsbezüger (Mieter, Nutzer)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Geregelte und strukturierte Kommunikation zwischen BBL und Kunden (CRM)              |                                      |
|                                                                | Leistungserbringer (BBL als Querschnittsamt)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Kostengünstige, flexible und schnelle Anpassung der Services nach Bedarfsentwicklung |                                      |
|                                                                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |                                                                                      |                                      |
|                                                                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |                                                                                      |                                      |
| **Akzeptanzkriterien**                                         | Funktionalitätsanforderungen sind erfüllt &amp; ein Berechtigungsmodell mit unterschiedlichen Endusern kann umgesetzt werden und ist IKS konform.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |                                                                                      |                                      |
| System  (bisher verwendetes System)                            | Intranet BBL Kundenplattform                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Intranet BBL Kundenplattform                                                         | Intranet BBL Kundenplattform         |
| **Bemerkungen**                                                | Einfache Anpassungen via SuperUser, Trennung zu LE  Ermöglichung von Datenanalyse. Sollte Prozessteuerung ermöglichen und Prozesse inkl. Steuerung importieren können. Zummanbindung verscheidener Funktionen. Der Betreiber des MP (BBL) muss auch selber Anpassungen / Einbuingen von Applikatioen vornehmen können.  Die genauen Anforderungen und Funktionalitäten insb. Einbindung anderen Applikationen muss vor Anschaffung der Plattform geklärt werden.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |                                                                                      |                                      |

### 2.2 Aufbau der zukünftigen Landing Page

<!-- image -->

Analog der voranstehenden Folie, ist der Aufbau der zukünftigen Landig Page wie folgt gewünscht. Der Aufbau muss klar und logisch sein. Die Anpassungen an der Landing Page müssen ohne grossen Aufwand und Zeitverzug seitens Leistungserbringer oder direkt seitens BBL möglich sein.

#### 2.2.1 Oberste Ebene

Analog der Darstellung, muss die oberste Ebene (Spaces) unterscheidliche Reiter zulassen, je nach Bedarfsträger oder Themengebiet bzw. Funktionalität

Z.B. ein Reiter für Gebäude / Ausstattung/ Unterbringung/ Versorgung etc.

#### 2.2.2 Themengebiete

Analog der Darstellung (Pages), müssen die verschiednen Themengebiete innerhalb des jeweiligen Reiter logisch angeordnet und untergliedert werden können.

#### 2.2.3 

#### 2.2.4 Unterthemen

Analog der Darstellung (Sections), müssen innerhalb der Themengebiete die entsprechenden Fiori eingebunden werden können. Es muss zudem möglich sein, Kacheln, die einen Ansprung auf eine andere Applikation beinhelten einzubinden. Z.B. eine Kachel Erhaltungsplanung, die einen Absprung auf die enstprechende Applikation beinhaltet.

#### 2.2.5 

#### 2.2.6 Themendetails

Analog der Darstellung (Tiles), müssen auf dieser Ebene z.B. Fiori Details oder Details anderer Applikationen eingebunden werden können. Z.B. Im VIM Analytics App ist meine Selektion mit den entsprechenden Daten direkt sichtbar. D.h. als Themengebiet gibt es z.B. Finanzen oder DLZ, als Unterthema VIM und als Themendetail meine entsprechende Selektion.

<!-- image -->

### 2.3 Funktionale Anforderungen

Die funktionalen Anforderungen basieren z.Z. auf drei konkreten Use-Cases.

Die beiden ersten Use-Cases Flächen Info und Störungsmeldung sind schon heute umgesetzt und aktiv, siehe Kapitel 1.3.1.

Weitere zukünftige Anforderungen, siehe Kapitel 2.33 – 2.3.9, wie die Kollaboration z.B. im Bereich Verbrauchsdaten für Gebäude wird zu einem späteren Zeitpunkt konkretisiert und weiter ausgeführt.

Die schon bestehenden und auch zukünftig zur Verfügung gestellten Funktionalitäten müssen unter einer gemeinsamen Landing Page namens Mieterportal sichbar sein.

Eine Unterteilung der Landing Page nach unterscheidlichen Funktionalitäten z.B. Meldung, Flächendaten, etc. muss gegeben sein, d.h. einzelne «Reiter» innerhalb der Landing Page nach Funktionalität.

Die Einbindung von Links zu anderen Applikationen / Absprünge, inkl. der entsprechenden eIAM Authentifizierung (FED- &amp; CH Login) muss möglich sein.

#### 2.3.1 Flächen Info

##### 2.3.1.1 Prozess

<!-- image -->

#### 2.3.2 Störungsmeldung

##### 2.3.2.1 Prozess

<!-- image -->

<!-- image -->

#### 2.3.3 Bedarf Unterbringung

Hier geht es um die Digitalisierung interne Prozesse BBL für Portfolio und Projektmanagement, Facility Management entlang des gesamten Lebenszyklus.

#### 2.3.4 Bedarf Versorgung

Wird später konkretisiert

#### 2.3.5 Bedarf Ausstattung

Wird später konkretisiert

#### 2.3.6 Informationen zu Verbrauchsdaten von Gebäuden

Wird später konkretisiert

#### 2.3.7 Informationen zu Belegungsdaten

Wird später konkretisiert

#### 2.3.8 Weitere Ausbau – zukünftige Anforderungen

Wird später konkretisiert

### 2.4 Nicht funktionale Anforderungen

Siehe Kapitel 2.1 Use Case

### 2.5 Mock Up

Wird später geliefert

### 2.6 

## 3 Berechtigungsanforderungen

### 3.1 Berechtigungsanforderungen in Bezug auf die Migration

Berechtigungs-Anforderungen für die Migration der bestehenden Korasoft Apps und der Meldungsapps vom bestehenden E-Gate auf eine neue Landing Page.

Die in den nachfolgenden Kapiteln (3.1.1 – 3.1.3) beschriebenen Details und Abläufe müssen auf der neuen Landing Page berücksichtigt werden.

D.h. es muss zwingend eine berechtigungstechnische Unterscheidung zwischen BBL internen Nutzer und Nutzern aus anderen Verwaltungseinheiten möglich sein. Zu einem späteren Zeitpunkt sind auch Nutzer ausserhalb der Bundesverwaltung sog. «Dritte» auf der Landing Page berechtigungstechnisch zu unterscheiden.

#### 3.1.1 Korasoft Apps

##### 3.1.1.1 Organisation 620 - BBL intern

Es handelt sich um die nachfolgenden 5 Korasoft AM Rollen die ausschliesslich in der Organisation 620 im AM aufgeschaltet sind.

<!-- image -->

Diese AM Rollen müssen jedem BBL User dezidiert einzeln hinzufügbar sein, da jede einzelne Rolle einer entsprechenden Lizenz unterliegt.

##### 3.1.1.2 Bundesverwaltung – ausserhalb BBL

Es handelt sich um das nachfolgende  Korasoft AM Rolle das in der Bundesverwaltung im AM aufgeschaltet ist.

<!-- image -->

Diese Rolle steht in der AM Struktur der verschiedenen Verwaltungseinheiten zur Verfügung und wird via einem Genehmigungsworkflow in den einzelnen Verwaltungseinheiten beantragt. Die entsprechende Genehmigung erfolgt dann im BBL.

#### 3.1.2 Meldungsapps

##### 3.1.2.1 Organisation 620 - BBL intern

Es handelt sich um die nachfolgenden 2 Meldungs-Rollen die in der Organisation 620 im AM aufgeschaltet sind.

<!-- image -->

Es wird vorallem die Rolle MP-0100 im BBL vergeben.

##### 3.1.2.2 Bundesverwaltung – ausserhalb BBL

Es handelt sich um das nachfolgende Meldungs-Rollen das in der Bundesverwaltung im AM aufgeschaltet ist.

<!-- image -->

Ausserhalb vom BBL steht den Verwaltungseiheiten die AM Rolle MP-0200 in ihrer AM Struktur zur Verfügung und kann dort beantragt und genehigt werden. Der benötigten Arbeitsplatz woird wie anhin im BBL Kundendienst via IW21 hinzugefügt.

### 3.2 Berechtigungsanforderungen für zukünftige Innovationen

#### 3.2.1 Organisation 620 / BBL

Analog Kapitel 2.2. Aufbau der zukünftigen Landing Page, muss es möglich sein, das BBL User direkt auf die oberste Ebene berechtigt werden und somit Zugang zu allen darunterliegenden Informationen haben, d.h. top down Vererbung der Berechtigungen für alle Rollen die keiner seperaten Lizenzpolitik unterliegen, sog. Named User.

Ebenso muss es möglich sein, je Ebene und Applikation unterschiedliche Rollen (z.B. Viewer, Mutierend, etc.) pro User einzustellen.

#### 3.2.2 Weitere Organisationseinheiten der Bundesverwaltung

Analog Kapitel 2.2. Aufbau der zukünftigen Landing Page, muss es möglich sein, das User der Bundesverwaltung direkt auf die oberste Ebene berechtigt werden und somit Zugang zu allen darunterliegenden Informationen haben d.h. top down Vererbung der Berechtigungenfür alle Rollen die keiner seperaten Lizenzpolitik unterliegen, sog. Named User. Ebenso muss es möglich sein, je Ebene und Applikation unterschiedliche Rollen (z.B. Viewer, Mutierend, etc.) pro User einzustellen.

#### 3.2.3 Dritte

Analog Kapitel 2.2. Aufbau der zukünftigen Landing Page, muss es möglich sein, das sog. Dritte direkt auf die oberste Ebene berechtigt werden und Zugang zu allen darunterliegenden Informationen haben d.h. top down Vererbung der Berechtigungen für alle Rollen die entsprechend für Dritte freigeschaltet wurden. Denn es ist davon auszugehen, das die Informationen für Dritte nicht alle Kacheln umfassen. Daher ist es notwendig, die für Dritte zugänglichen Kacheln entsprechend auswählen zu können. D.h. bestimmte Informationen oder Kacheln müssen als «frei zugänglich» gekennzeichnet oder berechtigt werden können.

## 4 Umsetzungvarianten

Wird einem späteren Zeitpunkt detailliert.

- Migration von E-Gate auf SAP Workzone
- Landing Page auf Intranet-Seite
    - Offene Fragen:
        - Können Fioris einfach eingebunden werden
            - Mit allen Berechtigungen
        - Braucht es Anpassungen an den Berechtigungen / Rollen

## 5 Roadmap

Wird zu einem späteren Zeitpunkt geliefert

## 6 Begriffe &amp; Abkürzungen

| Begriff   | Beschreibung                           |
|-----------|----------------------------------------|
| AO        | Architektonisches Objekt               |
| EB        | Ebene                                  |
| eIAM      | Identity & Access Mangement des Bundes |
| WE        | Wirtschaftseinheit                     |
| GR        | Grundstück                             |
| GE        | Gebäude                                |
| AO        | Architektonisches Objekt               |
| CR        | Change Request                         |
| MO        | Mietobjekt                             |
| FP        | Flächenpool                            |
| MF        | Mietfläche                             |
| ME        | Mieteinheit                            |
| EBF       | Energiebezugsfläche                    |
| EDM       | Energiedatenmanagement                 |
| AP        | Arbeitsplatz                           |

Tabelle 30: Begriffe &amp; Abkürzungen