# Real-Estate Operators — Reference Library (BBL / DRES context)

> **Companion to** [MARKET-SCREENING.md](MARKET-SCREENING.md). State of data: 18 May 2026.

## Purpose

This document lists actual real-estate **operators** (federal / cantonal / communal landlords, transport and utility operators, listed property managers, FM service providers, corporate occupiers) and the tenant-portal systems they operate. It is distinct from [MARKET-SCREENING.md](MARKET-SCREENING.md), which lists software **products / vendors**. An operator is an organisation that runs a real-estate portfolio; a product is the software it uses to do so. The same product (e.g. Planon, SAP RE-FX, GARAIO REM) typically appears in multiple operator rows below — when you want to look up which products are used in which segment, jump to [MARKET-SCREENING.md "Details by Segment"](MARKET-SCREENING.md#5-details-by-segment).

**Methodology.** Sources include official websites, annual reports, public-procurement notices (simap.ch, TED, contracts-finder), vendor press releases naming customers, trade press, and LinkedIn job adverts treated as indicators. Entries marked *[indicative]* rely on indicators only, not official confirmations. URLs to operators' official real-estate / property-management landing pages have been verified live (May 2026); rows without a link either point to the operator's corporate marketing site already cited inline, or no separately findable RE-division page was identified.

**BBL fit scoring** *(0–10, where 10 = perfect fit; identical scale and bands as in [MARKET-SCREENING.md §5](MARKET-SCREENING.md#5-details-by-segment))*. Typical bands: **8–10** = closest peer pattern (federal landlord with comparable scale, SAP-centric stack, AGOV-equivalent identity, mandatory tenant portal); **4–7** = adjacent / partially comparable (cantonal, municipal, transport, or corporate-occupier with overlapping but not identical pattern); **1–3** = weakly comparable (supplier / non-property / geographically remote); **0** = outside the federal property-management context. The score is a descriptive observation about the operator's structural similarity to BBL's situation — it is **not** a vendor recommendation.

## Table of contents

- [1. Swiss Confederation peers](#1-swiss-confederation-peers)
- [2. Swiss Cantons](#2-swiss-cantons)
- [3. Swiss Cities](#3-swiss-cities)
- [4. Swiss Universities / Academic](#4-swiss-universities--academic)
- [5. Swiss Transport & Utilities](#5-swiss-transport--utilities)
- [6. Swiss Listed RE / Corporates / Large Asset Managers](#6-swiss-listed-re--corporates--large-asset-managers)
- [7. DACH peers](#7-dach-peers)
- [8. Nordic peers](#8-nordic-peers)
- [9. UK / Ireland](#9-uk--ireland)
- [10. Benelux](#10-benelux)
- [11. France / Southern Europe](#11-france--southern-europe)
- [12. US peers](#12-us-peers)
- [13. International Transport & Infrastructure](#13-international-transport--infrastructure)
- [14. Major FM Operators](#14-major-fm-operators)
- [15. International Corporate-Occupier Benchmarks](#15-international-corporate-occupier-benchmarks)
- [Evidence Index — downloaded validation artifacts](#evidence-index--downloaded-validation-artifacts)

## 1. Swiss Confederation peers

| Organisation | Function / scale | Portal / system | Vendor / stack | Identity | Recent news (date) | Scope | BBL fit |
|---|---|---|---|---|---|---|---|
| [**armasuisse Immobilien (VBS)**](https://www.ar.admin.ch/de/immo-portal) | Military real estate CH | **SAP stack**: EAM (order management), PS (projects), IM (investments), BW (reporting); Adobe LiveCycle e-signature | **SAP S/4HANA Defense & Security** live since 06.01.2025 (programme ERPSYSVAR) | Azure AD / Bund | RE6 "stabilisation / reporting" delivered on time 31.12.2025; RE7 "optimisation / automation" on track (VBS report 20.08.2025) | ~10,000 internal staff | **9** — Same SAP path, same federal regulatory frame |
| **SBB Immobilien / CFF** | Second-largest Swiss real-estate company after Swiss Life, with 3,500 properties of which ~800 train stations, ~20,000 lease contracts (Alexis Leuthold, Head Property Management SBB Immobilien, Immobilia April 2023) | [**portal.sbb-immobilien.ch**](https://portal.sbb-immobilien.ch/) (fault reporting, invoices, documents, reservations); **Sales Reporting Portal** for commercial tenants via SAP IAS / OpenID Connect | **SBB ERP = SAP**; **Microsoft Dynamics Customer Insights (Journeys)** for mailings; SAP Ariba for procurement | Own login verification; OpenID Connect | Rental-deposit insurance integrated | External residential / commercial tenants + internal service providers | **9** — Reference architecture for an SAP-centric B2C/B2B portal |
| **Schweizerische Post / Post Immobilien Management & Services AG** | ~2,200 properties; book value >CHF 3 bn (>1,000 owned + >1,300 leased-in) | [**immobilien.post.ch**](https://immobilien.post.ch/) as marketing site; integrated tenant self-service not publicly advertised *[indicative]* | SAP stack of Post Group | SwissID / Azure AD | Headquartered at Wankdorfallee 4, 3030 Berne | Group-internal + third-party tenants | **6** — Federal-corporate SAP estate; tenant portal unconfirmed |
| **Swisscom Immobilien AG** | ~13,000 properties (>1 m m²) | [**immobilien.swisscom.ch**](https://immobilien.swisscom.ch/) (residential / commercial) | Group IT, high SAP share | Swisscom Login / SwissID | – | Group + third-party tenants | **5** — Large semi-public operator; marketing site only |

## 2. Swiss Cantons

| Organisation | Portal / system | Vendor | Identity | Recent news | BBL fit |
|---|---|---|---|---|---|
| [**Canton Zürich, Immobilienamt (Baudirektion)**](https://www.zh.ch/de/baudirektion/immobilienamt.html) — ~2,300 buildings, 12,000 undeveloped plots; own FacilityServices for building automation / access; ~200 staff | **GARAIO REM** (public reference Samira Good, Team Lead Property Management Canton ZH) | GARAIO REM | ZH-Login | FM submission Nov 2020 with 12 bids | **9** — Largest cantonal operator, GARAIO anchor case |
| [**Canton Berne (AGG)**](https://www.bvd.be.ch/de/start/ueber-uns/amt-fuer-grundstuecke-und-gebaeude.html) — ~115 staff, 3 departments, ~350 ongoing construction projects | unclear *[indicative]* | – | BE-Login | – | **5** — Cantonal scale; portal stack not publicly detailed |
| [**Canton Aargau (Immobilien Aargau)**](https://www.ag.ch/de/verwaltung/dfr/immobilien) — ~600 properties, building-insurance value ~CHF 2.3 bn, ~65 staff | unclear *[indicative]* | – | – | – | **5** — Cantonal scale; portal stack not publicly detailed |
| [**Canton Vaud (DGIP)**](https://www.vd.ch/deiep/dgip) — ~1,300 buildings | unclear *[indicative]* | – | VD-Login | – | **5** — Cantonal scale; portal stack not publicly detailed |

## 3. Swiss Cities

| Organisation | Portal / system | Vendor | Identity | Recent news | BBL fit |
|---|---|---|---|---|---|
| **City of Zürich — LSZ + IMMO** | [**Mietendenportal**](https://www.stadt-zuerich.ch/de/lebenslagen/wohnen/mietendenportal.html) — "online platform for exchange between tenants, suppliers and property management" | Municipal industry solution (details not public) | **"Mein Konto"** (City-of-Zürich SSO) | Established as a dialogue platform | **9** — Best Swiss municipal reference for federated tenant SSO |
| **City of Berne — [ISB](https://www.bern.ch/politik-und-verwaltung/stadtverwaltung/fpi/immobilien-stadt-bern) + [HSB](https://www.bern.ch/politik-und-verwaltung/stadtverwaltung/prd/hochbau-stadt-bern)** | **Project DOMUM**: replacement of **Microsoft Dynamics NAV 2009 R2** | Tender 2020 (simap 1140191); industry-solution award for real estate Nov 2022; planned go-live summer 2022 | BE-Login | Investment credit CHF 3,980,000 + commitment credit CHF 1,094,800 (2023–2027) | **9** — Direct Swiss-public-sector legacy-replacement case |
| [**City of Basel (Immobilien Basel-Stadt)**](https://www.bs.ch/fd/ibs) | unclear *[indicative]* | – | BS-Login | – | **6** — Major municipal operator (to be verified) |
| [**City of Geneva**](https://www.geneve.ch/autorites-administration/administration-municipale/departement-finances-environnement-logement/services-municipaux/gerance-immobiliere-municipale) (Gérance immobilière municipale GIM) / [**City of Lausanne**](https://www.lausanne.ch/officiel/administration/logement-environnement-et-architecture/gerances.html) (Service des gérances) | unclear *[indicative]* | – | – | – | **5** — Romandie municipal counterparts; stack not detailed |

## 4. Swiss Universities / Academic

| Organisation | Portal / system | Vendor | Identity | Recent news | BBL fit |
|---|---|---|---|---|---|
| [**ETH Zürich — Real Estate Department**](https://ethz.ch/services/de/organisation/abteilungen/immobilien.html) | Real-estate portfolio of ~CHF 5 bn book value (ETH Zürich Real Estate Management page); tenants internal (departments) + external; **wohnen.ethz.ch** with Housing Office UZH / ETH | SAP standard; consolidated external tenant-portal solution not publicly published | **eduID / ETH AAI** | Immobilien ETHZF AG + Hohenlinden AG as non-profit foundation subsidiaries | **7** — Federal-area peer; same SAP base, eduID instead of AGOV |
| [**EPFL — Domaine Immobilier & Infrastructures (DII)**](https://dii.epfl.ch/) | Campus 540,000 m², 11,000 people, budget ~CHF 75 m / year | **ARCHIBUS (Eptura) via AREMIS** — tender 2020; modules maintenance, projects, inventory, security; interface to IS-Academia | **EPFL Tequila / eduID** | LEX 7.1.0.1 (federal real-estate management); LEX 7.1.0.2 (EPF domain) | **8** — Directly comparable EPF domain, federal regulatory frame |
| **University of Zürich (UZH)** | Shared Housing Office with ETH | – | eduID | – | **5** — Academic operator; smaller real-estate scope |
| **University of Berne** | IAM tender simap 1117279 (03.02.2020) | – | eduID | – | **5** — Academic operator; smaller real-estate scope |
| **ZHAW, FHNW, HSG, USI, Universities of Basel / Geneva / Lausanne** | mostly Archibus / Planon *[indicative]* | – | eduID | – | **5** — Long tail of Swiss-academic Archibus / Planon estate |

## 5. Swiss Transport & Utilities

| Organisation | Portal / system | Vendor | Identity | Recent news | BBL fit |
|---|---|---|---|---|---|
| **SBB Immobilien** | see [§1](#1-swiss-confederation-peers) | SAP ERP + MS Dynamics CI | OIDC | – | **9** — Reference architecture (cross-reference) |
| **Post Immobilien** | see [§1](#1-swiss-confederation-peers) | SAP-centric | – | – | **6** — Federal-corporate SAP (cross-reference) |
| **Swisscom Immobilien** | see [§1](#1-swiss-confederation-peers) | – | – | – | **5** — Semi-public marketing site (cross-reference) |
| **BKW / Axpo** | not publicly detailed | – | – | – | **2** — Utility infrastructure; minimal RE-portal precedent |
| [**Flughafen Zürich**](https://www.flughafen-zuerich.ch/de/business/mieten-und-werben/immobilien-und-vermietung/buero-und-gewerbeflaechen) (Real Estate division — terminals, offices, logistics, "The Circle") | Referenced at SAP Real Estate Congress 2024 | SAP stack *[indicative]* | – | – | **5** — Commercial-tenant focus, SAP base |

## 6. Swiss Listed RE / Corporates / Large Asset Managers

| Organisation | Portal / system | Vendor | Identity | Recent news | BBL fit |
|---|---|---|---|---|---|
| [**Wincasa AG**](https://www.wincasa.ch/) | **Wincasa Home** (tenants), **Supplier**, **Client** | **Aareon RELion** in **Microsoft Azure CH cloud** (first-ever for CH bank-secrecy-analogue tenant-data requirements); portal via **streamnow ag**; IT-provider list: GARAIO REM, Jarowa, IDnow, Microsoft, Pidas, UMB, Elca, Inacta, Arcplace, Tilbago | SwissID-capable | Contract signed 2019; Home rollout from Aug 2021, 38,000 tenants in the first wave (~55%); Telli property visible in IT-provider list | **7** — Largest Swiss private benchmark for tenant-portal rollout |
| [**Livit**](https://www.livit.ch/) | **Mylivit** | historically IG REM (Garaio) | SwissID | Master of Swiss Apps 2020 | **6** — Established CH mobile-tenant-app pattern |
| [**Privera**](https://www.privera.ch/) | – | **GARAIO REM** (public testimonial) | – | – | **6** — Private GARAIO reference, similar scale |
| [**Swiss Prime Site**](https://sps.swiss/en/group/home) / [**PSP Swiss Property**](https://www.psp.info/en/) / **Allreal / Mobimo** | mostly commercial; own portals limited | mostly SAP / GARAIO REM | SwissID | – | **5** — CH-listed commercial RE; limited tenant-portal precedent |
| **Migros / Coop / UBS / Zurich Insurance / Swiss Re / ABB / Sulzer / Roche / Novartis / Nestlé** | Corporate occupiers with internal focus; **Roche on the SAP S/4HANA journey since 2019** (SAP News Aug 2023, Anderson Accioli) | SAP / Azure AD | – | – | **5** — Internal-occupier focus, not external tenant-portal |
| **Implenia, Hochtief, STRABAG (CH)** | more relevant as FM suppliers | – | – | – | **2** — FM supplier perspective rather than operator |

## 7. DACH peers

| Organisation | Portal / system | Vendor | Identity | Recent news | BBL fit |
|---|---|---|---|---|---|
| [**BImA (DE)**](https://www.bundesimmobilien.de/) | Per BImA corporate page ([bundesimmobilien.de/unternehmen](https://www.bundesimmobilien.de/unternehmen)): more than 38,400 dwellings and ~453,000 hectares of land; ~7,400 staff (Wikipedia, Bundesanstalt für Immobilienaufgaben); 19,000 properties; **bundesimmobilien.de** with 24/7 repair service, real-estate portal, Wohnungsfürsorge search | **BALIMA** — proprietary management system on a **SAP basis** (BImA job ad: "Solid user knowledge of SAP ERP 6.0") | **"meine BImA"** (own account platform) | Digitalisation business unit reports directly to the executive board; Adakta programme (eGovernment competition 2024) | **10** — Closest German peer: federal landlord, SAP base, own identity platform |
| [**BIG Austria**](https://www.big.at/) (~2,000 properties, fair value ~€18 bn) / [**ARE Austria**](https://www.are.at/en/) (~580 properties + 40 development projects) | not publicly detailed | SAP standard *[indicative]* | ID Austria | – | **7** — Austrian federal-property pair; comparable scale |
| **Berlin BIM, Munich Kommunalreferat, TU München, RWTH Aachen** | mostly SAP RE-FX *[indicative]* | – | – | – | **5** — DE Länder / academic SAP RE-FX estate (long tail) |

## 8. Nordic peers

| Organisation | Portal / system | Vendor | Identity | Recent news | BBL fit |
|---|---|---|---|---|---|
| [**Senate Properties / Senaatti (FI)**](https://www.senaatti.fi/en/) | **Senate eService**, **BEM** (project doc management), **Hilma** (procurement); **Granlund Manager** as the central maintenance ERP for service providers (iOS / Android app) | Granlund Oy | Suomi.fi / Senate eService | ISO 14001; Defence Properties Finland separate ("most extensive property-maintenance system in Finland") | **9** — Analogous federal landlord-with-spin-off model |
| [**Statsbygg (NO)**](https://www.statsbygg.no/) | Per Wikipedia (Norwegian Directorate of Public Construction and Property): "2.7 million square metres in 2,350 buildings, of which 115 are located abroad … about 200 construction projects under way, completing about 10–20 new structures each year. Statsbygg has 860 employees." | **dRofus + TIDA** since 2008; **SIMBA** BIM validator; BIM mandate since 2011 | ID-porten | – | **8** — BIM pioneer, comparable federal-landlord scale |
| [**Akademiska Hus (SE)**](https://www.akademiskahus.se/en/) — ~3.4 m m² across 15 university locations, fully state-owned | not publicly detailed *[indicative]* | – | Sambi / Swedish eID | – | **6** — Specialised (universities only) state landlord |
| [**Statens Fastighetsverk (SFV, SE)**](https://www.sfv.se/) — ~2,300 state-owned properties / 4,000 buildings / 6.8 m hectares; properties in 60+ countries | not publicly detailed *[indicative]* | – | BankID | – | **5** — Cultural-heritage-skewed federal estate |
| [**Vasakronan (SE)**](https://vasakronan.se/en/) — 164 properties, 2.4 m m², owned by Swedish national pension funds | not publicly detailed | – | BankID | – | **5** — Commercial RE owned by state pension funds |
| [**Bygningsstyrelsen (DK)**](https://en.bygst.dk/) (Danish Building and Property Agency) — Ministry of Transport; portfolio value >USD 38 bn (universities, police, courts, ministries) | not publicly detailed *[indicative]* | – | MitID | – | **7** — Federal landlord, comparable customer mix |

## 9. UK / Ireland

| Organisation | Portal / system | Vendor | Identity | Recent news | BBL fit |
|---|---|---|---|---|---|
| [**GPA — Government Property Agency (UK)**](https://gpa.gov.uk/) — Cabinet Office executive agency, ~£2.1 bn property assets, >53 % of government office estate | Per [GPA's "Transforming the Civil Service" page](https://gpa.gov.uk/about-us/public-service-transformation/): **GovPass** — single access pass — used by more than 166,000 civil servants; Smarter Working Programme covering 225,000 civil servants; **Customer Portal** + **Workplace Digital Platform**; **GovPrint** | In-house build + Strategic Partners (up to 7 years) | One Login (gov.uk) | Quay House Peterborough (Mar 2023, 1,200 civil servants); Birmingham Hub (Jul 2022, 1,700 civil servants, Leesman+ certified); Manchester Campus approved 2024; Darlington Hub planned | **10** — Directly comparable central-government RE function |
| [**NHS Property Services**](https://www.property.nhs.uk/) — >3,000 properties, 7,000 tenants across England | Tenant portal for NHS trusts | not publicly detailed | NHS Identity | – | **7** — Public-sector landlord with explicit tenant-portal target |
| [**Network Rail Property**](https://property.networkrail.co.uk/) / [**Crown Estate**](https://www.thecrownestate.co.uk/) (~£16 bn urban + rural + seabed) / GLA | not publicly detailed | – | – | – | **5** — Sector-specific UK estate (rail, monarch, regional) |
| **Oxford / Cambridge / Imperial Estates** | mostly Archibus / Planon *[indicative]* | – | – | – | **5** — Academic peers (long tail) |

## 10. Benelux

| Organisation | Portal / system | Vendor | Identity | Recent news | BBL fit |
|---|---|---|---|---|---|
| [**Rijksvastgoedbedrijf (RVB, NL)**](https://www.rijksvastgoedbedrijf.nl/) | Dutch State real estate | **Planon Asset & Maintenance Management (AMM)** — **go-live 13.11.2025** (Planon press release: "800 internal employees and 800 external suppliers will now work with Planon"); replaces six maintenance systems following a European tender | DigiD / eHerkenning | "an important milestone in a large-scale digitalisation programme that began in 2021" (Luciën Kamps, GM Planon EMEA West) | **9** — Freshest EU public-sector Planon go-live; closest pattern to Planon-on-SAP option |
| [**Régie des Bâtiments (BE)**](https://www.regiedesbatiments.be/fr) — ~7.3 m m² across ~1,137 building complexes | SAP stack *[indicative]* | – | itsme | – | **7** — Federal landlord with comparable customer mix |
| **Luxembourg State Property** | – | – | LuxTrust | – | **5** — Small federal state, limited public detail |

## 11. France / Southern Europe

| Organisation | Portal / system | Vendor | Identity | Recent news | BBL fit |
|---|---|---|---|---|---|
| [**Agenzia del Demanio (IT)**](https://www.agenziademanio.it/) | Italian state patrimony | **PA-Suite portals**: RATIO, SIM, PTIM, IPER, **EnTer**, **upDATe** (BIM, since July 2020), **Portale della Riscossione**; all developed / operated by **Sogei S.p.A.** | SPID / CIE | "EnTer è la piattaforma informatica che l'Agenzia del Demanio mette a disposizione delle PA per raccogliere e mettere in rete i dati sugli immobili pubblici" (agenziademanio.it) | **8** — Alternative architecture (state-owned SI vs. COTS) |
| [**DIE — Direction de l'Immobilier de l'État (FR)**](https://immobilier-etat.gouv.fr/) — ~97 m m² across >195,000 buildings | – | not publicly detailed | FranceConnect+ | – | **7** — French federal-state RE strategist; comparable governance frame |
| **SNCF Immobilier (FR)** | Railway real estate (~8.5 m m² + 20,000 ha) | [**ePublimmo**](https://epublimmo.sncf/) (public commercial / storage / office / station-retail / land marketing); internal via **S2FIT** | FranceConnect | – | **6** — Public commercial-marketing portal pattern |
| **RATP / EDF / APIJ** | not publicly detailed | – | – | – | **5** — Sector-specific FR estate (transport, energy, justice) |
| **Patrimonio del Estado / Patrimonio Nacional (ES)** | not publicly detailed | – | Cl@ve | – | **5** — ES federal state RE; portal stack not detailed |

## 12. US peers

| Organisation | Portal / system | Vendor | Identity | Recent news | BBL fit |
|---|---|---|---|---|---|
| **GSA Public Buildings Service** | 345 m sq ft, 1 m federal employees, 1,600 owned buildings | **eRETA** (External RWA Entry & Tracking) at [extportal.pbs.gsa.gov](https://extportal.pbs.gsa.gov/); **OASIS** (Occupancy Agreement Space Inventory); **EUAS** (Energy Usage); **Space Match** | **Login.gov** (mandatory since 21.10.2024) | eRETA 9.18 (Nov 2024); eRETA 9.17 (Jul 2024); RWA-submission requirement for all federal agencies | **9** — RWA federal-landlord model comparable to BBL "UK 2024" |
| **DoD Installations** | SAP / proprietary | – | DoD CAC / Login.gov | – | **5** — Federal-defence parallel, limited public-portal precedent |
| [**Stanford University LBRE**](https://lbre.stanford.edu/) | **Archibus by Eptura** (cit. Zig Wu, Stanford Health Care, TrustRadius: "Archibus is used to document the assigned department cost centers and employee location information") | – | Stanford SUNet ID | – | **6** — Academic-occupier Archibus reference |
| **MIT / Harvard / Yale** | typically Archibus / Planon *[indicative]* | – | – | – | **5** — Academic peers (long tail) |

## 13. International Transport & Infrastructure

| Organisation | Portal / system | Vendor | Identity | Recent news | BBL fit |
|---|---|---|---|---|---|
| [**Deutsche Bahn — DB InfraGO**](https://www.dbinfrago.com/web) (formed Dec 2023 from DB Netz + DB Station&Service) — 33,000 km network, 5,400 stations, 61,000 staff | ~17 m boarding / alighting per day; >230 staff in leasing | **Infraportal** + **Stationsportal** (B2B EVUs); **APN — Anlagenportal-Netz** since 01.07.2017; **DB Wohnen** (housing search for employees) | DB ID | DB Wohnen Scanner as a newsletter feature | **7** — Large-tenant operator pattern, comparable to SBB |
| [**ÖBB-Immobilienmanagement (AT)**](https://immobilien.oebb.at/de/) — Austria's largest property manager by area | not publicly detailed *[indicative]* | – | ID Austria | – | **5** — Austrian rail counterpart, limited public detail |
| **SNCF Gares & Connexions** | see [§11](#11-france--southern-europe) | – | – | – | **6** — Station-retail RE focus |
| **JR East (JP)** | not publicly detailed | – | – | – | **2** — Geographically and regulatorily distant |

## 14. Major FM Operators

| Operator | Platform / app | Vendor / stack | Evidence | BBL fit |
|---|---|---|---|---|
| [**CBRE Global Workplace Solutions**](https://www.cbre.com/services/transform-business-outcomes/global-workplace-solutions) | **Host** (CBRE Singapore launch 14.07.2021); **fmPilot** (CMMS); **CBRE 360**; **ServiceInsight** | **Microsoft Azure Digital Twins + IoT** (Host); **MS Dynamics 365 Field Service** (fmPilot); MS Viva (employee engagement) | Sandeep Dave, CDO CBRE GWS, MWC 2019: "We have partnered with Microsoft in this journey and leveraged their Azure Digital Twin foundation to manage sensors and leverage analytics"; Facility Executive: "fmPilot built on Microsoft Dynamics 365 will become the core operating platform" | **8** — Microsoft-centric pattern as an alternative to Planon |
| [**JLL Work Dynamics**](https://www.jll.com/en-us/services/facilities-management) | **HqO** (strategic partnership + acquisition of JLL Jet 12.07.2022); **FM:Systems / FMS:Employee** | HqO, FM:Systems | GlobeNewswire 12.07.2022: "JLL Selects HqO as its Preferred Global Solution for Tenants and Employees, and HqO Acquires JLL Jet" (Yishai Lerner, Co-CEO JLL Technologies) | **7** — Workplace-experience best-practice reference |
| [**ISS World A/S**](https://www.issworld.com/) — 325,000+ staff, 30+ countries, 40,000+ customers | In-house development under **OneISS** (launch 16.12.2020); ISS Tech Portugal (Aug 2022) | proprietary | Markus Sontheimer, Group CIO/CDO ISS, 11.08.2022: "we are not only investing in state-of-the-art technologies but are also ramping up our inhouse capabilities at a global scale" | **6** — Large FM in-house stack pattern |
| **Sodexo "Vital Spaces"** | Services framework + partner stack (Circles Concierge, AskFM, Wando) | – | Sodexo Ireland case study | **5** — Services framework rather than single platform |
| **Apleona (DE)** | **CAFM transformation to Planon** in progress (job ad 2024–25: "Active participation and technical guidance of the CAFM transformation to Planon as the central contact point") | Planon (in-progress) | [jobs.apleona.com](https://jobs.apleona.com/) | **6** — Live Planon migration reference (in progress) |
| **Vinci Facilities / Engie Solutions / SPIE / Compass / Cushman & Wakefield GOS** | mixed models, often Planon / IBM TRIRIGA / MS stack | – | – | **5** — Mixed-stack FM majors |

## 15. International Corporate-Occupier Benchmarks

| Organisation | Platform | Vendor | Evidence | BBL fit |
|---|---|---|---|---|
| [**Siemens Real Estate (DE)**](https://www.siemens.com/global/en/company/about/businesses/real-estate.html) | **Planon "ONE Global"** (Cloud, Planon Accelerator) + **SAP RE-FX** in parallel | Planon (Oct 2016) | Planon press release 11.10.2016 with Dr. Stephan Jakoby, CFO Siemens RE: "The solution provided by Planon allows us to support our real-estate business processes across the entire lifecycle on the basis of a globally uniform system" (>50 m sq ft / 2,400 sites) | **10** — SAP RE-FX + Planon coexistence, exactly the BBL co-existence pattern |
| **Roche (Basel)** | **SAP S/4HANA journey** since 2019 incl. Asset Strategy & Performance Mgmt and Service & Asset Manager | SAP | SAP News Aug 2023, Anderson Accioli, Roche: "harmonize business processes on all sites and divisions around the world" | **6** — Same-country S/4HANA corporate-occupier reference |
| **Microsoft Global RE / Google REWS / Apple Park / Meta Workplace** | not publicly detailed | – | – | **5** — Big-tech corporate-occupier (limited public detail) |
| **JPMorgan Chase / HSBC / BNP Paribas Immobilier** | not publicly detailed | – | – | **5** — Global-bank corporate RE (limited public detail) |
| **Pfizer, Bayer, Merck, BMW, Mercedes-Benz, Volkswagen Immobilien** | typically SAP RE-FX + local CAFM *[indicative]* | – | – | **5** — DACH-industrial SAP RE-FX pattern |
| **Novartis Real Estate / Nestlé Corporate RE** | not publicly detailed | – | – | **5** — CH-headquartered corporate RE (limited public detail) |

## Evidence Index — downloaded validation artifacts

Public-domain validation artifacts for the top peer operators (BBL fit ≥ 8), downloaded May 2026 and stored in [`assets/operators/`](../assets/operators/) so claims in the tables above can be checked against primary sources without a live internet connection. Where no row appears below, the operator's row in the tables above cites either a live portal URL (its own primary evidence) or an *[indicative]* note (no public artifact identified).

### §1 — Swiss Confederation peers

- **armasuisse Immobilien (VBS)** — [Nachhaltigkeitsbericht 2022 (PDF, 5.2 MB)](../assets/operators/armasuisse-immobilien-nachhaltigkeitsbericht-2022.pdf); [armasuisse Organigramm August 2025 (PDF, 285 KB)](../assets/operators/armasuisse-organigramm-2025-08.pdf).
- **SBB Immobilien / CFF** — no downloadable artifact; `company.sbb.ch` and `portal.sbb-immobilien.ch` are the live primary evidence (publisher's CDN refuses direct PDF download).

### §2 — Swiss Cantons

- **Canton Zürich, Immobilienamt** — [Portfoliostrategie für die Liegenschaften des allgemeinen Finanzvermögens, 2022 (PDF, 4.0 MB)](../assets/operators/kanton-zh-immobilienamt-portfoliostrategie-2022.pdf).

### §3 — Swiss Cities

- **City of Berne — Project DOMUM** — [Vortrag des Gemeinderats an den Stadtrat (PDF, 390 KB)](../assets/operators/stadt-bern-domum-vortrag-gemeinderat-2019.pdf) — the investment-credit submission (CHF 3,980,000) that anchors the DOMUM scope and timeline cited in the table.

### §4 — Swiss Universities / Academic

- **EPFL — Domaine Immobilier & Infrastructures (DII)** — [AREMIS Archibus case study (HTML, 67 KB)](../assets/operators/epfl-dii-archibus-aremis-case-study.html) — AREMIS's own write-up of the 2020 EPFL selection.

### §7 — DACH peers

- **BImA (DE)** — [BImA corporate brochure, English (PDF, 4.2 MB)](../assets/operators/bima-de-corporate-brochure-en.pdf); [Adakta — eGovernment-Wettbewerb 2024 submission (PDF, 22 KB)](../assets/operators/bima-de-adakta-egovernment-wettbewerb-2024.pdf).

### §8 — Nordic peers

- **Senate Properties / Senaatti (FI)** — [Tilinpäätös 2024 (annual financial report, Finnish, PDF, 850 KB)](../assets/operators/senaatti-fi-tilinpaatos-2024.pdf); [Vastuullisuusraportti 2024 (sustainability / annual report, Finnish, PDF, 33 MB)](../assets/operators/senaatti-fi-vastuullisuusraportti-2024.pdf).
- **Statsbygg (NO)** — [BIM Manual 1.2.1, English, 2013 (PDF, 2.7 MB)](../assets/operators/statsbygg-bim-manual-1-2-1-en-2013.pdf); [BIM Manual 2.0, English, 2019 (PDF, 3.1 MB)](../assets/operators/statsbygg-bim-manual-2-0-en-2019.pdf).

### §9 — UK / Ireland

- **GPA — Government Property Agency (UK)** — [GPA Annual Report and Accounts 2024-25, large-print version (PDF, 1.0 MB)](../assets/operators/gpa-uk-annual-report-2024-25.pdf).

### §10 — Benelux

- **Rijksvastgoedbedrijf (NL)** — [Planon press release on the 13.11.2025 RVB Asset & Maintenance Management go-live (HTML, 130 KB)](../assets/operators/rvb-nl-planon-go-live-press-release-2025-11-13.html); [Auditrapport 2024 Rijksvastgoedbedrijf, Auditdienst Rijk (PDF, 780 KB)](../assets/operators/rvb-nl-auditrapport-2024.pdf).

### §11 — France / Southern Europe

- **Agenzia del Demanio (IT)** — [Piano Strategico Industriale 2024-2027, aggiornamento (PDF, 13.4 MB, Italian)](../assets/operators/agenzia-demanio-piano-strategico-industriale-2024-2027.pdf); [Bilancio 2024 (PDF, 2.6 MB, Italian)](../assets/operators/agenzia-demanio-bilancio-2024.pdf).

### §12 — US peers

- **GSA Public Buildings Service** — [GSA FY2024 Annual Performance Report (PDF, 1.6 MB)](../assets/operators/gsa-pbs-annual-performance-report-fy2024.pdf).

### §14 — Major FM Operators

- **CBRE Global Workplace Solutions** — [Host launch (Singapore / India), press release mirror at indiatechnologynews.in, 14.07.2021 (HTML, 175 KB)](../assets/operators/cbre-gws-host-launch-india-2021-press-mirror.html) — the original CBRE.com.sg page is behind Cloudflare bot protection; the India-mirror copy preserves the same announcement text.

### §15 — International Corporate-Occupier Benchmarks

- **Siemens Real Estate (DE)** — [Planon press release 11.10.2016 — Siemens Real Estate Deploys Planon Real Estate Management Software Worldwide (HTML, 128 KB)](../assets/operators/siemens-re-de-planon-one-global-press-release-2016-10-11.html) — the announcement of Siemens RE's "ONE Global" selection of Planon that the table cites as Dr. Stephan Jakoby's quote.

---

*Document prepared 18 May 2026. Split out from [MARKET-SCREENING.md](MARKET-SCREENING.md) as a separate operator-reference companion. For software products / vendors and their segmentation, see [MARKET-SCREENING.md](MARKET-SCREENING.md). For Swiss federal regulatory anchors (EMBAG, DigiV, ISG, VILB, BöB) and the federal abbreviations glossary, see [MARKET-SCREENING.md Appendices A–E](MARKET-SCREENING.md#appendices). URLs in operator-name cells link to the official real-estate / property-management landing page (verified live May 2026); URLs in "Portal / system" cells link to the actual tenant or operator portal where applicable.*
