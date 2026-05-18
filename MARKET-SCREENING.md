# Market Research: Mieterportal for BBL / Bereich Bauten (DRES)

**TL;DR**
- A federal "Mieterportal" for BBL is best implemented as a **thin, SAP RE-FX–integrated tenant-self-service layer** sitting on top of the post-SUPERB S/4HANA core — buying a proven Swiss/European platform (Allthings, casavi, Planon, or Spacewell) for the B2B workplace and Schadensmeldung modules while custom-building the "federal-specific" Bedürfniserhebung/Raumbedarf and ESG cockpits as SAP Fiori apps on BTP. A pure custom build is not cost-justifiable; a pure COTS purchase will not fit the multi-tenant federal data and classification model.
- The DACH market for tenant-/workplace-experience platforms is consolidating around 8–10 vendors (Eptura, Planon, Spacewell, MRI, Nuvolo, IBM TRIRIGA, Aareon, casavi, Allthings); the broader IWMS market was USD 4.32 billion in 2024 and is growing at a 13.1 % CAGR to USD 13.09 billion by 2033 (Straits Research, 2025), with sustainability/ESG, AI-chat copilots and mobile-first as the three dominant feature vectors.
- Comparable public-sector peers — BImA "Mein BImA", GSA OASIS / PBS Customer Dashboard, Senaatti "Senate App", Rijksvastgoedbedrijf, GPA UK — show the same pattern: a **B2B information & service-request portal** for ministries/agencies plus a **B2C-style mobile app** for the smaller share of residential/embassy tenants. BBL should adopt this dual-track architecture rather than a single one-size portal.

## Key Findings

1. **There is no public BBL tenant portal today.** Searches of bbl.admin.ch and admin.ch return no "Mieterportal", "Kundenportal" or "Mieterapp" reference. The closest neighbour, armasuisse's "Immo-Portal VBS" (ar.admin.ch/de/immo-portal, published 18 Feb 2025), is a **doctrinal PDF library** for VBS role-models, not a transactional tenant system. Real operational tools (ImmoGIS, Immo V, IMS ar, armaform) are intranet-only. Communication between BBL as landlord and its federal tenants (VBS, EFD, EJPD, EDA …) appears to run through bilateral email, Excel templates (the "Raumbedarf Global 2.0" template version 12.03.2026 is the current armasuisse standard) and the SAP back-office. This is the gap.

2. **BBL's own digital strategy is not published as a stand-alone 2026–2034 document.** The only consolidated public reference is Chapter 1.3 "Digitalisierung" of the *BBL Nachhaltigkeitsbericht 2024* (26 Feb 2026): *"Das BBL nutzt die Chancen der Digitalisierung aktiv … Es integriert digitale Arbeitsmethoden in Pilotprojekte. Als Beispiel kann hier das Building Information Management (BIM) genannt werden."* Concrete named initiatives are **BBL GIS IMMO** (launched 2023, 61 internal users in 2024, expanding to "Bauprojekte und Grünflächeninventar" in 2025), **BIM**, and the joint **CDE-Bund** (Common Data Environment, BBL + armasuisse Immobilien + ASTRA — the three "BLO"). A Mieterportal must be positioned as an extension of this stack, not a competing initiative.

3. **SUPERB / SAP S/4HANA is the anchor constraint.** The civilian federal administration completed the S/4HANA cut-over on 18 September 2023; the CHF 485 million SUPERB programme covers Finance, HR, Procurement, Logistics, Real Estate and PPM through 2027 (BBL is Auftraggeber, BIT is Leistungserbringer). SAP RE-FX is the real-estate core. SAP does **not** ship a turnkey tenant portal on RE-FX — the SAP Community confirms "There are no apps available for functionality available for RE-FX" beyond a handful of lease-administrator Fiori apps (F2283, F3035, F4035, F5273). A BBL Mieterportal therefore means either (a) building Fiori apps on BTP atop RE-FX, (b) plugging a third-party portal into RE-FX via API, or (c) a hybrid.

4. **Switzerland already has an obvious incumbent for the B2C/mixed UX layer: Allthings.** Founded 2013 as ETH Zürich spin-off, now serving over 300 of Europe's leading real estate companies and service providers (The Proptech Scout), including Credit Suisse Real Estate, Mobimo, Wincasa, Freilager Zürich, Niederer and FMEL Lausanne. Modular app-store model, omnichannel inbox (app/email/phone/web auto-converted to tickets), partner-marketplace including Yarowa for craftsman dispatch. Already deeply embedded in the Swiss residential and mixed-use market.

5. **Closest public-sector benchmark is BImA's "Mein BImA"** (meine-bima.bundesimmobilien.de). It separates **B2C residential tenants** ("Alle rund 38.300 BImA-eigenen Wohnungen bleiben daher im Bestand" per bundesimmobilien.de, with a Reparaturservice 24/7, Immobilienportal newsletter/saved searches, and the BImA-Nummer as joint key) from **B2B Bedarfsdeckung** for federal ressorts (kept inside SAP/"BALIMA"). This is the dual-track BBL should adopt.

6. **The federal regulatory stack is supportive but adds constraints.** EMBAG (in force 1 Jan 2024) mandates "digital first" and creates the legal basis for central IKT services, Open Source ("Public Money – Public Code") and once-only data re-use. DigiV (SR 172.019.1) and the *Strategie Digitale Bundesverwaltung* (in force 1 Jan 2024) explicitly require platform thinking, once-only data, digital sovereignty and Swiss data residency. ISG and the Informationsschutzverordnung force a classification-aware design, because tenants such as VBS, NDB and fedpol handle classified information. Procurement falls under BöB (revised 1 Jan 2021); a portal contract will have to go through simap.ch with sustainability-weighted award criteria.

## Details

### 1. Market segmentation and sizing

The tenant-portal space is not a single market but three converging ones:

| Segment | Typical vendors | Pricing model | Asset class |
|---|---|---|---|
| **IWMS / CAFM with tenant module** (B2B, large CRE) | Planon, Eptura (iOFFICE+SpaceIQ+Archibus+Condeco), IBM TRIRIGA, MRI Software, Nuvolo, Spacewell (Nemetschek), FM:Systems, Manhattan | Annual SaaS, per-named-user; Planon list prices reportedly start ~USD 200 k/yr for enterprise scope | Office, mixed, public |
| **Property-management ERP with tenant portal** (B2B/B2C, residential & commercial) | Aareon (Wodis, Mareon, Smart World CRM-Mieterportal), Yardi, AppFolio, Buildium, RealPage, GARAIO REM, W&W (ImmoTop2/Rimo R5), Abacus AbaImmo, Quorum, Fairwalter | Per managed unit / per user; W&W ImmoTop2 cloud from CHF 149/month for 100 units | Residential (D-A-CH leaders), mixed |
| **Pure tenant-/workplace-experience platforms** (B2B & B2C) | Allthings, casavi, HqO, Equiem, Spaceflow, Chainels, Lane, Office App, facilioo, wohnungshelden, Spiri.Bo, Immomio | Per door / per building / per app user; modular | Residential, office, mixed-use |

Independent sizing: Straits Research (2025) puts the **global IWMS market at USD 4.32 bn in 2024, growing at a 13.1 % CAGR to USD 13.09 bn by 2033**; Market Data Forecast corroborates at USD 4.16 bn in 2024 with a 12.5 % CAGR to USD 10.67 bn by 2032. Gartner Peer Insights lists 25 IWMS products. Verdantix's 2025 *Smart Innovators: Tenant Engagement and User Experience Software* report names roughly 50 active vendors (Accruent, Affirm, AppFolio, Building Engines, Chainels, Cohesion, Comfy, Condeco, Eptura, Equiem, FM:Systems, HqO, IBM, JLL, Lane, Measurabl, MRI, Nuvolo, Oracle, Planon, Robin, Spacewell, Tango, VTS, Yardi …).

Eptura was named a Leader in the **2026 Gartner Magic Quadrant for Workplace Experience Applications** (Gartner, by Sohail Majumdar and Christopher Trueman, 6 April 2026). Planon is recognised as a Leader in *Verdantix Green Quadrant IWMS 2025* and ranked top by IDC MarketScape 2025 for SaaS facility solutions. casavi reports 130,000 connected buildings, 2.7 million units and "around 1,500 property management and housing companies" (Aareon Connect marketplace listing). GARAIO REM states on its own homepage that "1,5 Mio. Mietobjekte durch 150+ Verwaltungen bewirtschaftet" werden, and the Digital Real Estate Summit 2025 programme updates this to "mehr als 1.6 Millionen Mietobjekte verwaltet".

Key trends: AI/chatbot copilots for tenant inquiries (casavi "smartflows", Aareon CRM-Portal KI-Chatbot 2024-2025); ESG/CRREM/GRESB dashboards exposed to tenants (Chainels integrations with Rhino/Blue Module/iqbi; Equiem; Planon Energy & Sustainability Management); mobile-first PWA + native; integration with BIM/IoT/digital twin; visitor management and access-control mobile passes; energy-consumption transparency via smart-meter feeds (UVI in DE).

### 2. Feature / use-case catalogue

Table-stakes (every serious portal): tenant identity & SSO, omnichannel messaging inbox, document vault (lease, certificates, invoices), Schadensmeldung with photo upload and real-time ticket status, digital announcements/pinboard, invoice/billing view, profile/banking self-service, multi-language. The Vonovia "Mein Vonovia" app is the DACH reference for B2C UX with all of the above plus push-tracked work-order updates ("ähnlich wie man es schon von den grossen Logistikunternehmen kennt").

Differentiating for BBL's B2B context:
- **Bedürfniserhebung / Raumbedarfsmeldung** — replicate the armasuisse "Raumbedarf Global 2.0" Excel as a structured form feeding directly into SAP RE-FX and BBL GIS IMMO. **Highest-value BBL-specific module.**
- **Parking, desk, meeting-room and event-space booking** — Eptura, Spacewell, Nuvolo and Planon all offer mature modules; the GSA equivalent is the PBS Customer Dashboard / OASIS Occupancy Agreement system.
- **Energy/sustainability cockpits per tenant** — directly supports BBL's existing Nachhaltigkeitsbericht obligations under VILB Art. 9 Abs. 1bis; CRREM-pathway and GHG visualisation per Verwaltungseinheit.
- **Move-in/move-out and handover** — W&W "Abnahme-App" is the Swiss reference.
- **Service catalogue + visitor management + mobile access** — Spacewell and Eptura; Senaatti's "Senate App" (built by Steerpath; indoor wayfinding from CAD floor plans + meeting-room availability) and the GPA UK Workplace Services Toolkit are public-sector precedents.
- **Feedback/satisfaction surveys** — light-touch NPS embedded in the inbox flow (Allthings standard).
- **Tenant-specific ESG/Net-Zero pathway dashboards** — Planon's Energy & Sustainability Management domain, Spacewell sensor-driven comfort/CO₂.

### 3. DACH and Swiss public-sector benchmarks

| Organisation | Portal / system | Notes |
|---|---|---|
| **BImA (DE)** | meine-bima.bundesimmobilien.de + Reparaturservice 24/7 | 38,300 BImA-owned units plus ~62,000 total Wohnungsfürsorge units at 500+ locations; B2C focus, B2B Bedarfsdeckung kept inside SAP-based BALIMA; eGovernment-Wettbewerb 2024 nominee "Adakta" for eAkte. **Reference architecture: separate B2C portal + ERP-internal B2B workflow.** |
| **BIG / ARE Austrian Real Estate (AT)** | "Wohn- und Mieterservice" web area (big.at/leistungen/wohn-mieterservice) | Largest tenants are 22 universities + Ministries (BMBWF, BMI, BMJ); 2,000+ properties, fair value ~€18 bn, ~500,000 daily users. Public portal currently document-/forms-based, not a true SaaS portal. |
| **armasuisse Immobilien (CH)** | "Immo-Portal VBS" + intranet ImmoGIS / Immo V / IMS ar | Public site is doctrine PDFs; real tenant interaction is intranet-only. Pioneering BIM/VR (Frauenfeld). |
| **Cantonal/city Liegenschaftsverwaltungen** | Mostly GARAIO REM (Kanton Zürich Baudirektion confirmed user) or W&W ImmoTop2/Rimo R5 | Citizen-/tenant-facing portals usually limited to easy-contact form + STWEG-Portal (condominium owners). |
| **GSA (US)** | PBS Customer Dashboard, OASIS (Occupancy Agreement Space Inventory System), Leasing Portal, Rent on the Web | Pure B2B for ~100 federal client agencies, ~1 M+ employees, 363 M sq ft; 24/7 access to occupancy/financial/project data. **Closest functional analogue to what BBL needs for federal ressorts.** |
| **GPA (UK)** | "Workplace Services" + GovS 004 Workplace Design Guide + emerging Property Technology Services | £2.1 bn assets, 45 % of UK gov office estate. Strategy: "interoperable property technology" — heading toward an integrated portal but not yet a single tenant app. |
| **Rijksvastgoedbedrijf (NL)** | Public site + Biedboek.nl + open-data portal; internal CAFM | 83,000 ha, 12 M m², 150,000 central-government employees; tenant-facing portal not separately exposed publicly; Director Strategy & Digitalisation Max Droste. |
| **Senaatti (FI)** | "Senate App" (Steerpath) + e-service portal at senaatti.fi | Indoor wayfinding, smart meeting-room booking integrated. Net-zero target embedded in Government Premises Strategy 2030. |
| **Statsbygg (NO)** | 2.7 M m², 2,350 buildings (115 abroad incl. Global Seed Vault) | Traditional CRE management; no public tenant portal product reference. |

### 4. Enterprise IWMS / corporate CRE platforms

- **Planon** — Dutch leader, deep SAP integration (Planon Real Estate Management for SAP S/4HANA explicitly markets seamless integration with SAP Contract and Lease Management). Five domains: Real Estate, Space & Workplace, Asset & Maintenance, Energy & Sustainability, Integrated Services. Self-service portal, back-office and mobile app. On UK G-Cloud for Crown Commercial Service. **Strongest fit for BBL on capability and SAP integration**; main risks are cost and lock-in.
- **Eptura** — 2026 Gartner MQ Leader, formed by iOFFICE + SpaceIQ + Archibus + Condeco merger. Strong on space, desk/room booking, employee service requests, visitor, ESG tracking. Strongest workplace-experience UX; weakest on heavy ERP/lease accounting.
- **IBM TRIRIGA** — mature, SaaS-on-AWS option, very strong portfolio and lease accounting, well-known in the Swiss public sector (Garaio originally derived from IBM Tereal). Tenant self-service module exists but with less modern UX than Eptura/Planon.
- **Nuvolo** — built natively on ServiceNow; compelling if BBL/Bund eventually standardises on ServiceNow for ITSM/ESM.
- **Spacewell** (Nemetschek) — heavy IoT/sensor focus, comfort & CO₂, kiosks + app + portal. Good fit if BBL pushes Digital-Twin/BIM2FM aggressively.
- **MRI Software / Manhattan / FM:Systems / Archibus / SAP RE-FX add-ons** (e.g. Goldinmotion "Simple Property Management") — viable but each has a narrower DACH installed base than Planon.

### 5. SAP RE-FX integration options

Because SAP has not delivered a turnkey tenant portal for RE-FX, three architecture patterns dominate:

1. **Build on SAP BTP + Fiori** — custom UI5/Fiori apps for Bedürfniserhebung, Schadensmeldung and contract/invoice view, calling RE-FX via OData. Highest sovereignty, lowest UX velocity, no community feature roadmap.
2. **Planon for SAP S/4HANA** — Planon as IWMS front-end, RE-FX as financial system of record, bidirectional integration of leases and transactions. The standard SAP pattern.
3. **Allthings / casavi / Aareon Mieterportal as front-end + ERP API** — casavi has standardised "Aareon Connect" bidirectional integration; Aareon's own CRM-Mieterportal includes a "Mieterportal für SAP®" variant. Best for the Allthings-style modern UX, with the trade-off that the back-end must publish stable REST APIs from RE-FX.

A composable pattern combining (1) for federal-specific Bedürfniserhebung/ESG and (3) for community/Schadensmeldung/booking is most attractive — and matches the *Strategie Digitale Bundesverwaltung*'s "als Plattform" principle.

### 6. B2C UX inspiration

- **Vonovia "Mein Vonovia"** — DE residential reference. Foto-upload Schadensmeldung, real-time push, digital lease conclusion, digital mailbox, parking direct-reserve, energy add-ons. ~1 M residents.
- **Aareon CRM-Portal + Mareon service portal** — 2 M+ apartments, 35 M tradesperson orders processed; KI chatbot integration 2024-2025.
- **Mobimo, Allreal, Swiss Prime Site, PSP, Helvetia** — most have moved to Allthings or in-house light portals; Allthings is the de-facto Swiss commercial standard.
- **Fixflo (UK) / Plentific (UK) / Foncia, Nexity (FR)** — strong on Schadensmeldung and contractor dispatch flows.

### 7. Build vs Buy analysis for BBL

| Dimension | Build (Fiori on BTP) | Buy (Planon / Eptura / Allthings) | Hybrid (recommended) |
|---|---|---|---|
| Federal-specificity (Bedürfniserhebung, ESG cockpit per Verwaltungseinheit, classification handling) | ✅ best fit | ❌ requires heavy customisation | ✅ build the specific, buy the generic |
| Time-to-value | ❌ slow | ✅ months | ⚠️ medium |
| Vendor lock-in | ✅ minimal | ❌ high | ⚠️ scoped |
| ISG / Swiss data residency | ✅ controllable | ⚠️ vendor cloud region required (most have Swiss/EU regions; Allthings is Swiss-based) | ✅ |
| Total Cost of Ownership 7-yr | ❌ highest | ⚠️ medium-high (recurring SaaS) | ⚠️ medium |
| EMBAG OSS preference | ✅ if open-sourced | ❌ proprietary | ⚠️ partial |
| Community / feature velocity | ❌ slow | ✅ fast | ✅ fast on the bought part |

There is **no significant open-source tenant portal** for public-sector real estate at the maturity BBL would need (Verdantix, CB Insights and Gartner all list only commercial vendors). Building everything from scratch under EMBAG's "Public Money – Public Code" principle is conceivable, but in light of the SUPERB precedent (CHF 485 M) and the BBL Beschaffungsvolumen for IT (20.7 % Informatikdienstleistungen and 14.7 % Informatik- und Telekommunikationsmittel of CHF 1.5 bn in 2024 = roughly CHF 530 M), buying the generic 80 % and building the federal-specific 20 % is the only defensible TCO path.

### 8. Key trends 2025–2026 affecting BBL

- **AI tenant copilots** — Aareon, casavi and Allthings have shipped KI chatbots; expect this to be table-stakes by 2027.
- **CRREM / GRESB / GRI ESG dashboards exposed to tenants** — directly supports VILB Art. 9 Abs. 1bis sustainability mandate. Tenant departments are increasingly asked to report Scope-3 building emissions.
- **BIM2FM / Digital Twin handover** — ProLeMo and the openBIM Datenfeldkatalog BIM2FM are Swiss-industry standards (bauen-digital.ch); a portal that surfaces BIM data per tenant rental object would put BBL ahead of BImA and GPA.
- **Composable / API-first / headless** — supported by Strategie Digitale Bundesverwaltung's "als Plattform" principle and SAP BTP. Allows BBL to swap out front-end vendors without re-platforming.
- **AGOV (federal identity)** + once-only data principle — any portal must federate AGOV/eID and reuse SAP master data; no second identity store.

## Recommendations (decision-ready, staged)

**Phase 0 — Confirm strategy and scope (Q3 2026):**
1. Publish an explicit DRES-level "Strategie Mieterportal BBL 2027–2032" anchored in the Nachhaltigkeitsbericht 2024, Strategie Digitale Bundesverwaltung, EMBAG and the SUPERB end-state. Sponsor: BBL Direktion (Pierre Broye) + Bereich Bauten leadership; product ownership in DRES with co-ownership by Immobilienmanagement and Objektmanagement (Leiterin Daniela Müller).
2. Define **two personas with separate journeys**: (a) **B2B federal Verwaltungseinheit** (VBS, EFD, EJPD, EDA …) — primary use-cases Bedürfniserhebung, contracts, invoices, ESG cockpit, project status; (b) **B2C residential / embassy / commercial tenant** — primary use-cases Schadensmeldung, communication, billing.

**Phase 1 — Pilot with one ressort (2027):**
3. Procure via simap.ch a 12-month pilot with **two parallel tracks**: (i) a SaaS tenant-experience platform (short-list: Allthings, casavi, Planon Tenant Portal, Spacewell Workplace) for the B2C/community and Schadensmeldung capabilities; (ii) custom Fiori apps on SAP BTP for Bedürfniserhebung and ESG cockpit, integrated with SAP RE-FX, BBL GIS IMMO and the CDE-Bund. Pilot site: 1–2 large Verwaltungsgebäude in the Bern area (the Guisanplatz cluster is a natural choice given armasuisse adjacency).
4. Use AGOV for tenant-user identity; route all data through Swiss-resident infrastructure; classify according to ISG (max VERTRAULICH per object).
5. Establish KPI baseline before go-live: time-to-first-response on tenant requests, % digital Schadensmeldungen, NPS, # Bedürfniserhebungen processed, % tenants registered. **Decision threshold for scale-out**: ≥ 60 % tenant-user adoption and ≥ 30 % reduction in manual back-office handling within 9 months.

**Phase 2 — Federal scale (2028–2029):**
6. If thresholds met, roll out to all civilian Verwaltungseinheiten in parallel with SUPERB stabilisation; extend to embassies (EDA / FDFA) with offline-capable PWA and language packs (DE/FR/IT/EN).
7. Open APIs back to Verwaltungseinheiten' own intranet/IT so each ressort can embed Mieterportal widgets — supports the "als Plattform" principle.
8. Connect to BIM2FM/CDE-Bund so that tenants see 3D floor plans, booking and energy data on the same object.

**Phase 3 — Sector platform (2030+):**
9. Federate with armasuisse, ASTRA and (optionally) cantonal real-estate offices via the same APIs; offer the portal as a shared federal Basisdienst under EMBAG Art. 11 governance.

**Thresholds that would change the recommendation:**
- If SUPERB stabilisation slips past 2027 → delay Phase 1 by 6–9 months and run a paper-prototype with one ressort instead.
- If Allthings/casavi/Planon cannot guarantee data residency in CH cloud regions → fall back to the BTP custom-build path, accepting slower UX velocity.
- If the EU "GovTech Sandbox" or buildingSMART Federation produces an open-source reference tenant portal before Q1 2028 → re-evaluate the buy decision in favour of an OSS-led path.

## Caveats

- "BBL Digitalisierungsstrategie 2026–2034" is referenced in the brief but no public document with that title was located; this report therefore reconstructs BBL's digital direction from the *Nachhaltigkeitsbericht 2024*, the *Strategie Digitale Bundesverwaltung* and named programmes (SUPERB, BBL GIS IMMO, CDE-Bund). If an internal version of the 2026–2034 strategy exists, its concrete pillars should override the inferences here.
- Vendor pricing cited (e.g. "Planon pricing starts at USD 200,000 annually, quote-based" per SelectHub; W&W ImmoTop2 cloud from CHF 149/month) is indicative; federal-scale licensing has to be tendered.
- Some sources are vendor-published (Planon, Allthings, Aareon, Eptura) and contain marketing claims — the Gartner Magic Quadrant (Majumdar/Trueman, April 2026) and Verdantix Green Quadrant references corroborate their analyst standing but should not be read as endorsements for BBL.
- "Mein Vonovia" reviews are mixed in app-store text (login bugs, partial digitalisation); the operational lessons (clear in-portal status tracking, push notifications, foto-upload Schadensmeldung) remain valid even where execution is criticised.
- The armasuisse "Immo-Portal VBS" should not be confused with a tenant-self-service SaaS; it is a doctrinal PDF library.
- Market sizing diverges across analysts (Straits Research USD 13.09 bn 2033; Market Data Forecast USD 10.67 bn 2032); both confirm a double-digit CAGR but the absolute level should be triangulated annually.
- Subject to change after May 2026 — Gartner MQs and Verdantix Green Quadrants are revised annually.