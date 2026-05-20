# Requirements Catalog — BBL Tenant/Service Portal (MP)

> **As of:** 2026-05-18 (v0.5.1) · **Methodology:** HERMES (Swiss federal project management standard) · **Prioritization:** MoSCoW (Must / Should / Could / Won't)
>
> Consolidated requirements catalog for the planned **Tenant/Service Portal
> ("Mieterportal", MP)** of the **Federal Office for Buildings and Logistics
> (BBL — Bundesamt für Bauten und Logistik)**, merged from internal source
> documents in [`BBL Requierements/intermediate/`](BBL%20Requierements/intermediate/_index.md)
> (the folder is gitignored — kept locally only). This file is the single
> requirements source to maintain; it does not replace the original
> functional concepts, but makes their content findable, traceable, and
> prioritisable.

## 1. Context

### 1.1 What is this portal about?

The **BBL** owns and operates the real estate that other Swiss federal
agencies use — embassies, federal-office buildings, asylum-reception
centres, government offices, etc. The "tenants" of the BBL are therefore
not private individuals but **other federal agencies** (departments and
their subordinate offices). Today there is **no unified portal** between
the BBL and these federal tenants. Information requests, accommodation
requests, repair tickets, move requests, and the like are handled
through point solutions and manual channels (phone, e-mail, Excel, PDF
forms) — which creates hand-off gaps, lack of transparency, and slow
turnaround. *(Source: IMMO_Mieterportal_Systemkonzept §1.)*

### 1.2 Goal

Build a portal that

- routes each tenant to the right BBL competence centre or service,
- offers information as self-service,
- enables digital collaboration with proper role and authorization control,
- transfers an **approved demand** directly into **SAP ePPM** (the federal real-estate project-management system) without manual re-entry.

### 1.3 Scope of this requirements catalog

| Phase | What is in scope | MoSCoW band |
|---|---|---|
| **Pilot** | Use case "Landing Page (Single Point of Contact)" + use case "Accommodation Demand (Application Form)" — i.e. a federal tenant logs in, navigates to "I need office space / sleeping berths / a residence abroad", fills out a structured request, the responsible department approves it, and the approved request lands in SAP. | Must / Should |
| **Roadmap Case A** | SUPERB base services (project paperwork, occupancy planning, floor-space management, inventory, repair notifications, moves, furnishing shop) | Should / Could |
| **Roadmap Case B** | Functions independent of SUPERB (portfolio strategy map, key figures — may be implemented in the federal GIS portal instead) | Could |
| **Roadmap Case C** | Strategic-approval items (incident communication, training, directives) | Could / Won't (this iteration) |

### 1.4 Recommended system variant

**Create** — a custom-built application running on **Red Hat OpenShift
(RHOS)**, using shared services from the **federal IT service provider
(BIT — Bundesamt für Informatik und Telekommunikation)**. The
alternatives ("Adapt" using existing federal SharePoint/GEVER, and
"Buy" using a commercial portal/case-management platform) were
evaluated but did not fit the pilot. See
[Loesungsarchitektur Pilot Antrag Unterbringung](BBL%20Requierements/intermediate/Loesungsarchitektur%20Pilot%20Antrag%20Unterbringung.md)
§4 and [IMMO_Mieterportal_Systemkonzept](BBL%20Requierements/intermediate/IMMO_Mieterportal_Systemkonzept.md)
§4 for the full comparison.

### 1.5 Actors / roles

| Abbrev. | Role (full name and explanation) | What they do in the MP |
|---|---|---|
| **BBL Campus / Fachamt** | The BBL functional office that owns the portal product (specialist office responsible for tenant-facing services) | Owns content, quality, currency, and the operational concept on the business side |
| **BBL PFM** | Portfolio Management at BBL — the team that decides which real-estate projects to fund and prioritises them | Receives approved demand, routes it into the SAP system |
| **BBL IM / OM** | Immobilien-/Objektmanagement — Real-Estate / Asset Management at BBL | Gets early notice of new demand so capacity planning can start |
| **LE (BIT)** | Leistungserbringer = service provider; in this case the federal IT office (BIT) | Builds and operates the platform |
| **VE / ILBO** | **VE** = Verwaltungseinheit (Administrative Unit, i.e. a federal department or office). **ILBO** = the Logistics Officer inside a VE, the person who actually submits demand. | Submits accommodation-demand applications |
| **GS** | Generalsekretariat — the General Secretariat of a federal department, which oversees its subordinate offices | Assesses, approves or rejects an application before it reaches BBL |
| **Tenant / End user** | Any employee of a federal agency using the portal | Reads information, files small requests, downloads plans |

### 1.6 MoSCoW priorities

| Priority | Meaning in this catalog |
|---|---|
| **Must** | Pilot go-live is blocked without this |
| **Should** | Important for pilot value, but can be delivered shortly after go-live |
| **Could** | Desirable; planned for a later roadmap iteration |
| **Won't** | Out of scope for this initiative (documented for transparency) |

### 1.7 Source index (linked)

All `Source` cells in the requirement tables point to files in
[`BBL Requierements/intermediate/`](BBL%20Requierements/intermediate/_index.md)
(local-only). The most important sources:

- **Functional concept (Fachkonzept):** [SUPERB_Fachkonzept_ERP_IMMO_Mieterportal NEW V05](BBL%20Requierements/intermediate/SUPERB_Fachkonzept_ERP_IMMO_Mieterportal%20NEW%20V05.md) — the authoritative requirements document for the pilot, edited by Lars Hofmann (BBL), Product Owner Reto Brunner, as of 2025-11-10.
- **System concept (Systemkonzept):** [IMMO_Mieterportal_Systemkonzept](BBL%20Requierements/intermediate/IMMO_Mieterportal_Systemkonzept.md) — the architecture and system-variant analysis (Adapt / Buy / Create).
- **Use cases (Use-Case-Dokumente):** [Mieterportal Gesamt V2.1](BBL%20Requierements/intermediate/Mieterportal%20Gesamt%20V2.1.md), [Use Case Bedarf Unterbringung V2.1](BBL%20Requierements/intermediate/Use%20Case%20Bedarf%20Unterbringung%20V2.1.md), [Use Case Landing Page V2.0](BBL%20Requierements/intermediate/Use%20Case%20Landing%20Page%20V2.0.md) — the user-facing narrative for each pilot use case.
- **Pilot solution architecture:** [Loesungsarchitektur Pilot Antrag Unterbringung](BBL%20Requierements/intermediate/Loesungsarchitektur%20Pilot%20Antrag%20Unterbringung.md) — distils the Adapt/Buy/Create comparison into a recommendation.
- **Bedarf (demand) functional concept:** [Mieterportal Fachkonzept Bedarf](BBL%20Requierements/intermediate/Mieterportal%20Fachkonzept%20Bedarf.md) — adds application identification, archiving, and the Federal Chancellery (BK) workflow special case.
- **Workshop tenant expectations:** [WS 1 Mieterportal Erwartungshaltung](BBL%20Requierements/intermediate/WS%201%20Mieterportal%20Erwartungshaltung.md), [Mieterportal_ WS Erwartungshaltung Mieter](BBL%20Requierements/intermediate/Mieterportal_%20WS%20Erwartungshaltung%20Mieter.md) — outcomes of the stakeholder workshops where federal tenants stated their expectations.

---

## 2. Functional requirements

### 2.1 Landing Page / Single Point of Contact (`FUNC-LP-*`)

The portal's entry point and shared navigation surface. Every federal tenant lands here first, then drills into role-specific tools and information. This section is about look, feel, navigation, and self-service basics — not yet about specific business workflows.

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-LP-001 | The portal acts as a **Single Point of Contact (SPOC)** for every BBL service a federal tenant might need: information lookup, demand submission, status tracking, downloads, etc. | **Must** | As a federal tenant, I want one entry point for everything BBL offers, so that I no longer have to memorise which phone number, e-mail address, or stand-alone tool serves which need. | Workshop WS1 (all federal Administrative Units, VEs) | Use Case Landing Page V2.0; IMMO_Systemkonzept §2.1.2 | No comparable portal exists today (current state). |
| FUNC-LP-002 | Visual simplicity, clear page structure, and self-explanatory operation for users who only visit the portal occasionally | **Must** | As an occasional user, I want to find my way around without training, so that I can complete a task in a few clicks. | Workshop WS1; BBL Campus | Use Case Landing Page V2.0 | The current BBL customer platform is described in the source as "outdated and confusing". |
| FUNC-LP-003 | Role-based navigation: the portal shows or hides whole feature areas depending on the user's role (e.g. contracts, budget information are not visible to every employee) | **Must** | As a federal user, I want to see only the features that apply to my role, so that confidential information stays protected and the UI is not cluttered with options I cannot use. | BBL Campus; Workshop WS1 | Use Case Landing Page V2.0; IMMO_Systemkonzept §2.1.2 | See section 3.1 (Identity & Access Management) for the authorization foundation. |
| FUNC-LP-004 | **Wizards (multi-step guided forms)** for complex tasks like a demand submission, a procurement order, or a multi-step analysis | **Must** | As a Logistics Officer (ILBO) filing a complex application, I want the form to guide me step by step, so that I do not miss any mandatory field. | Workshop WS1; BBL PFM | Use Case Landing Page V2.0 | Wizards are the key reason the "Adapt" variant (using federal SharePoint) was rejected — it cannot do them (System concept §2.1.12). |
| FUNC-LP-005 | Self-service dashboards inside the portal: tenants can read relevant key performance indicators (KPIs) and submit small inputs (e.g. consumption data) directly from the dashboard | **Should** | As a federal tenant, I want to see relevant KPIs without asking BBL, so that I can act on them immediately. | Workshop WS1 | Use Case Landing Page V2.0 | Data binding to each source system to be defined per KPI. |
| FUNC-LP-006 | "Recent activity" / suggestion feature that pre-fills new applications based on what the same user submitted previously | **Could** | As a returning tenant, I want my next application pre-filled from earlier ones, so that I do not start from a blank form every time. | Workshop WS1 | Use Case Landing Page V2.0 | Requires storing historical applications — data protection and retention rules apply. |
| FUNC-LP-007 | Self-service downloads of plans, building information, and training material | **Should** | As a tenant, I want to download building plans and training material myself, so that I do not have to ask for a contact person every time. | Workshop WS1; BBL Campus | Use Case Landing Page V2.0 | Content is curated by the BBL functional office. |
| FUNC-LP-008 | Responsive design across **three breakpoints — desktop (≥ 1280 px), tablet (768–1279 px), mobile (< 768 px)**. Public (non-authenticated) parts: **Must** at all three breakpoints. Authenticated parts used by **mobile-likely roles** (ILBO submitter — wizard, inbox, application detail, downloads): **Should** at all three. Authenticated parts used by **desk-bound roles** (GS reviewer split-pane, BBL-PFM cockpit, auditor / Historie, master-data maintenance): **Should** for tablet, may declare desktop-only for the < 1280 px reviewer split-pane via a `NotificationBanner` redirect to the §9.2 inline-marks fallback | **Must** (public) / **Should** (auth.) | As a federal employee using a phone or tablet, I want to file demand, check status, and read information on the go, so that I am not tied to a desktop machine. | Workshop WS1 | Use Case Landing Page V2.0 | **v0.5 widening (originated in WIREFRAMES.md v0.2 review):** the previous "public parts only" scope produced a 2010-era responsive posture inconsistent with current federal-employee device habits (tablets in meetings, smartphones for ILBO quick checks). Authenticated parity is now **Should** for mobile-likely roles. Device-compliance rules (e.g. BYOD vs. managed devices) continue to be assessed separately by BIT. |
| FUNC-LP-009 | Every **published informational content item** (news banner, FAQ article, training material, downloadable document, knowledge-base entry) carries: (a) its source, (b) the responsible contact person, (c) the date when it was last updated. **Out of scope:** action surfaces — wizard launchers, navigation tiles, buttons, status badges, form fields and any other UI element whose purpose is to *do something*, not to *inform*. | **Must** | As a tenant, I want to know who is responsible for each piece of information and when it was last reviewed, so that I can trust what I am reading — without metadata cluttering buttons and navigation tiles where it doesn't help my decision. | Workshop WS1 | Use Case Landing Page V2.0 | **v0.5 scope narrowing (originated in WIREFRAMES.md v0.2 review):** the original "every piece of content" phrasing was being interpreted to include action tiles (e.g. "Bedarf anmelden" button), where Source/Contact/Stand adds visual noise without informing a user decision (NN/g and gov.uk content guidance: don't display information that doesn't help the user do their next thing). The triplet remains a defined-quality acceptance criterion **per content item**; the renderer is the `<MetaFooter>` Web Component sketched in WIREFRAMES.md §11.8. |
| FUNC-LP-010 | The BBL functional office can publish and delete content itself, without an IT release (low-code / template-based editing) | **Should** | As the functional owner of the portal, I want to update content myself, so that information stays current without waiting for an IT release cycle. | BBL Campus | Use Case Landing Page V2.0; IMMO_Systemkonzept §2.1.2 | Operates under a defined functional operations concept. |
| FUNC-LP-011 | Open APIs let the BBL plug new digital services into the portal from any source system | **Should** | As the functional owner, I want to wire in additional services through APIs, so that future use cases can be added without changing the platform. | BBL Campus; BIT | Use Case Landing Page V2.0 | Implies an integration layer — see section 3.3 (Integration). |
| FUNC-LP-012 | The portal itself can host simple workflows when a source system does not provide them | **Could** | As the functional owner, I want to assemble small approval flows directly in the portal, so that I am not forced to push every minor process back into a source system. | BBL Campus | Use Case Landing Page V2.0 | Possible conflict with a future commercial workflow platform — await the architecture decision. |

### 2.2 Accommodation Demand — application submission (role ILBO/VE) (`FUNC-AU-*`)

The "Accommodation Demand" use case covers the workflow where a federal
agency requests new office space, sleeping berths, embassy buildings,
etc. from the BBL. The applicant is the agency's **Logistics Officer
(ILBO — Logistikbeauftragte)**.

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-AU-001 | When the applicant picks their Administrative Unit (VE) / Department (DEP) from a drop-down, the system automatically determines the responsible BBL contacts for that VE/DEP and displays them on the form | **Must** | As a Logistics Officer (ILBO), I want the system to show me which BBL contacts will see my request, so that I address the request to the right people from the start. | BBL Portfolio Management (PFM); workshop WS1 stakeholders | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf §Input format | Display of contacts was added in version V2.1 of the use case. |
| FUNC-AU-002 | Based on the chosen VE, the system automatically grants the access rights the applicant needs for the rest of the workflow; a defined administrator role can override this for exceptional cases | **Must** | As an applicant, I want my access rights set up automatically, so that I do not wait for a manual IT unlock during my application. | BBL PFM; BIT | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf §Input format | Override happens "on demand — defined role" (rare cases). |
| FUNC-AU-003 | Selectable building location and building category (using the **Portfolio-Management building-category list (PFM-Kategorien)** — a controlled vocabulary maintained by BBL PFM) | **Must** | As an applicant, I want to pick the building location and category from controlled lists, so that downstream cost and floor-space formulas are triggered correctly. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4; Use Case Bedarf | "Location" was added alongside "category" in V2.1. |
| FUNC-AU-004 | Interactive sub-form that asks the applicant about the working style (open-plan vs. collaborative vs. focused work, share of remote work, etc.) and from those answers picks the **floor-space factor (NAW — Neue Arbeitswelten / "New Working Worlds" — the federal classification of office working styles)** used to size the request | **Must** | As an applicant, I want a short questionnaire to derive the right NAW factor, so that the calculated floor-space requirement reflects how my team actually works. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | Implemented as a wizard sub-form per workstation request. |
| FUNC-AU-005 | Preliminary calculation of the **accommodation costs (Unterbringungskosten, UK-Kosten — combined rent, fit-out, and operating cost of the space)** based on the chosen building category (m² × CHF/m²) and location | **Must** | As an applicant, I want to see a rough cost estimate while I am still filling out the form, so that I can judge whether the request is realistic before I submit it. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | Calculation formulas are defined in §4.1.1.3.4.6 (see FUNC-AU-014/-015). |
| FUNC-AU-006 | Upload of a cost-benefit ("cost-effectiveness") proof, or alternatively use a built-in calculation tool that produces one inside the portal | **Must** | As an applicant, I want either to attach my own cost-benefit document or compute one inline, so that it becomes part of the application without back-and-forth. | BBL PFM; General Secretariat (GS) | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | "Legal-basis proof" is a separate upload — see FUNC-AU-007. |
| FUNC-AU-007 | Upload a link or document that references the legal basis ("rechtliche Grundlagen") for the request (e.g. the federal mandate that creates the new need) | **Must** | As an applicant, I want to attach the legal basis, so that the General Secretariat (GS) can confirm the request is mandated. | GS; BBL PFM | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | Becomes an attachment on the demand in SAP ePPM (see §4.1.1.3.4 row 4.4). |
| FUNC-AU-008 | Upload PDFs and other supporting documents as application attachments | **Must** | As an applicant, I want to attach any context documents (floor plans, ministerial decisions, etc.), so that the reviewer has everything they need. | BBL PFM | Use Case Bedarf V2.1 §Input format; Systemkonzept §2.1.4 | File scanning / malware check see NFA-SEC-003. |
| FUNC-AU-009 | Delete an application that is partly or fully filled in but not yet submitted | **Should** | As an applicant, I want to discard a draft, so that I do not leave orphan data in the system. | BBL PFM | Use Case Bedarf V2.1 §Input format | Soft-delete with an audit-log entry is recommended. |
| FUNC-AU-010 | Inline help on every field via a hover/popup info text | **Should** | As an applicant, I want short explanations next to fields, so that I understand what each field expects without external help. | BBL PFM | Use Case Bedarf V2.1 §Input format | Will need to be available in German/French/Italian — see NFA-CD-003. |
| FUNC-AU-011 | Every field is marked clearly as either **mandatory ("Muss")** or **optional ("Kann")**, both in the UI and in server-side validation | **Must** | As an applicant, I want to see immediately which fields are mandatory, so that I am not bounced back for missing data after submitting. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | UI marking + server-side validation. |
| FUNC-AU-012 | When the applicant types a street address, the system automatically derives the **Property Unit (WE — Wirtschaftseinheit, the SAP-side identifier for a federal property)** and the building number from federal master data | **Must** | As an applicant, I want the property unit and building number filled in automatically from the address, so that I do not have to look up internal SAP keys. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (rows 3.5/3.6) | Look into using the federal building register (GWR / EGID) as the source. |
| FUNC-AU-013 | Allow an exception path where the applicant submits a demand for a location that does **not** yet have a Property Unit (WE) or building number in the master data (e.g. a brand-new site) | **Must** | As an applicant, I want to submit demand for new sites that are not yet registered, so that greenfield requirements can be captured. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (row 3.8) | Defines a follow-up process for BBL master-data maintenance. |
| FUNC-AU-014 | For office workstation requests, the system auto-calculates the floor-space requirement using the federal formula: desk-sharing factor 0.8 workstations per full-time equivalent (FTE), **directly usable office area (HNF2 — Hauptnutzfläche 2 per SIA 416)** of 12 m² per FTE, **gross floor area (GF — Geschossfläche)** of 24 m² per FTE, and a maximum operating cost cap of CHF 60 per m² of gross floor area | **Must** | As an applicant, I want the floor-space numbers calculated automatically after I enter the FTE count, so that I do not have to do the maths in parallel. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4.6.1 | Formulas per Swiss building-norm SIA 416. All factor values should live in centrally maintained master data, not be hard-coded. |
| FUNC-AU-015 | For office workstation requests, the system auto-calculates the initial furniture investment as CHF 650 per m² of directly usable office area (HNF2) | **Must** | As an applicant, I want the initial furnishing cost computed immediately, so that the total investment is visible while I am still on the page. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4.6.1 | Value stored as maintainable master data. |
| FUNC-AU-016 | For requests from the **State Secretariat for Migration (SEM — Staatssekretariat für Migration, which operates federal asylum-reception centres)**, the "number of sleeping berths" field is mandatory and the system auto-calculates the investment at CHF 120 000 per berth | **Must** | As an SEM Logistics Officer requesting accommodation for asylum seekers, I want the per-berth investment computed automatically, so that the request carries a defensible cost figure. | BBL PFM; SEM | Fachkonzept NEW V05 §4.1.1.3.4.6.2 | SEM-specific. Confirm scope of applicability (does this also cover federal-asylum-centre maintenance projects?). |
| FUNC-AU-017 | For requests from the **Federal Department of Foreign Affairs (FDFA — Eidgenössisches Departement für auswärtige Angelegenheiten, German abbreviation: EDA, which runs Swiss embassies and consulates abroad)**, the applicant enters floor-space values **manually** — the system must **not** apply the standard auto-calculation, because foreign embassies do not fit the Swiss office formula. The applicant takes the values from the FDFA's own catalog ("standard room programme"), which defines three building types: **Chancery (Kanzlei — the embassy office building)** uses the directly usable area (HNF) from the standard room programme; **Residence (RE — the ambassador's residence)** uses the HNF for residence categories 1-5; **Service Apartment (DW — Dienstwohnung, for posted staff)** uses the HNF for category 6 | **Must** | As an FDFA Logistics Officer requesting an embassy or staff residence abroad, I want to enter the floor space manually from the FDFA's room-programme catalog, so that the figures match our actual diplomatic standard and not the federal office formula. | FDFA (Markus Osterburg, Adrienne Enz, Sandro Negro — confirmed via workshop WS1) | Fachkonzept NEW V05 §4.1.1.3.4.6.3 | The system needs to detect "requester is FDFA" → switch to manual-entry mode. |
| FUNC-AU-018 | For all other (non-standard) order types, the directly usable office area (HNF2) is always recorded in m² | **Must** | As an applicant with an unusual demand, I want one consistent unit (m²) for HNF2, so that downstream calculations work the same way for every request type. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4.6.4 | — |
| FUNC-AU-019 | For "major applications" (Grossantrag — typically large construction projects over a CHF threshold), the form captures **six mandatory free-text fields** (short description, deficiencies in the current situation, target state — merges former "operative Ziele" and "Zielzustand", alternatives considered, planning dependencies, and a legal-basis reference that either points to the upload from FUNC-AU-007 or is filled inline), **four mandatory structured fields** (schedule as start / milestone / completion dates auto-pre-fillable from FUNC-AU-020; cost expectation in CHF auto-pre-fillable from FUNC-AU-005/-014/-015; full-time equivalents as a number; workstation count as a number derived from FTE × desk-sharing factor), and **one optional free-text field** (cost-benefit justification — derived from the WiBe attachment per FUNC-AU-006 when uploaded; only required as free text when no WiBe is attached) | **Must** | As an applicant, I want one structured form that captures everything a major application needs without forcing me to retype values already present elsewhere, so that the reviewing General Secretariat (GS) is ready to assess without round-trips. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (rows 4.1–4.12) | **v0.5 narrowing rationale (originated in WIREFRAMES.md v0.2 review):** the previous "12 mandatory free-text fields" produced UX cliffs and duplication (Operative Ziele ≈ Zielzustand; Nutzen-Kosten-Begründung duplicates the uploaded WiBe; FTE/AP/Kosten/Termine are structured values, not "free text"). The narrowed shape preserves the eleven ePPM tab destinations (FUNC-PFM-002 mapping unchanged — Operative Ziele and Zielzustand both map to the same ePPM "Ziele/Soll" tab) while reducing applicant-side mandatory text from 12 to 7 fields (6 free-text + 1 conditional). To revert to the wider 12-field shape, set a system flag — but pilot uptake metrics should drive that decision. |
| FUNC-AU-020 | Based on the investment amount entered, the system auto-suggests rough project deadlines (start, milestones, completion) | **Should** | As an applicant, I want approximate deadlines derived from the investment size, so that I can communicate realistic expectations to my stakeholders. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (row 4.10) | The thresholds and the deadline-calculation logic still need to be specified. |
| FUNC-AU-021 | At the start of the form, the applicant chooses between three application types: **Major Application (Grossantrag — large project)**, **Minor Application (Kleinantrag — smaller project)**, or **Furniture (Mobiliar)** | **Must** | As an applicant, I want to pick the right application type up front, so that I only see fields that are relevant to my case. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3 (general description); §4.1.1.1.1.1.1-3 | The detail-fields per application type are still empty headers in V05 — to be filled. |
| FUNC-AU-022 | Every application receives a **unique, system-generated application ID** when it is first saved. This ID is shown to the applicant, included in every notification, written to the audit trail, and carried over into the SAP project when the application reaches Portfolio Management | **Must** | As an applicant, I want a visible reference ID for every application, so that I can quote it in e-mails and find it again later. | BBL PFM; Compliance | [Mieterportal Fachkonzept Bedarf](BBL%20Requierements/intermediate/Mieterportal%20Fachkonzept%20Bedarf.md) §Identification | Required by the archive process (FUNC-AU-023) and by the SAP project handover (FUNC-PFM-001). |
| FUNC-AU-023 | Once an application is closed (approved & handed over, rejected with final decision, or cancelled), it is **archived together with all its attachments** (cost-effectiveness proof, legal basis, PDFs, status history). Archived records remain searchable by the application ID for the federal retention period | **Must** | As records management at BBL, I want every closed application archived with its attachments, so that the federal retention duties are met and historical decisions can be reconstructed. | Compliance; BBL PFM | [Mieterportal Fachkonzept Bedarf](BBL%20Requierements/intermediate/Mieterportal%20Fachkonzept%20Bedarf.md) §Archiving | Retention period to be confirmed (see OP-7 — federal records management / GEVER integration). Related: NFA-DATA-002. |

### 2.3 Accommodation Demand — assessment & approval (role GS) (`FUNC-FG-*`)

After submission, an application normally goes to the General
Secretariat (GS) of the applicant's department for review. The GS can
approve the whole application, reject it with conditions, or approve
field-by-field. The Federal Chancellery (BK) is the one structural
exception (see FUNC-FG-005).

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-FG-001 | The reviewer can mark individual fields as **OK**, **Not OK (NoK)**, or **OK with a comment** — not only the whole form | **Must** | As a General Secretariat (GS) reviewer, I want to approve or reject specific fields, so that I can give the applicant targeted feedback. | GS representatives — confirmed via workshop WS1 (departments WBF, UVEK and others) | Fachkonzept NEW V05 §4.1.1.1.1.1; Use Case Bedarf §Input format Assessment | — |
| FUNC-FG-002 | The reviewer can also issue an overall approval or an overall rejection with conditions ("Auflage") | **Must** | As a reviewer, I want to reject the whole application with a specific list of conditions to correct, so that the applicant knows exactly what to change before resubmitting. | GS representatives | Fachkonzept NEW V05 §4.1.1.1.1.1; Use Case Bedarf | — |
| FUNC-FG-003 | Both approvals and rejections **must include a free-text justification** (the field is mandatory) | **Must** | As a reviewer, I want (and am legally required) to justify my decisions in writing, so that the decision is traceable for audit and administrative-law purposes. | GS representatives; Compliance | Use Case Bedarf V2.1 §Input format Assessment (V2.1 extension) | Audit-relevant — see NFA-COMP-003 and NFA-SEC-005. |
| FUNC-FG-004 | After every status change, all involved roles get an e-mail notification **and** see the new status in the portal's status panel | **Must** | As an involved role, I want to be informed automatically whenever the state of an application changes, so that I do not have to poll the portal. | All roles (workshop WS1) | Use Case Bedarf V2.1 §Input format Assessment | E-mail via the existing federal mail infrastructure — see NFA-INT-004. |
| FUNC-FG-005 | **Federal Chancellery (BK — Bundeskanzlei) bypass path:** the BK is a federal authority that has no subordinate offices and therefore has no General Secretariat (GS). Applications submitted by a BK Logistics Officer must skip the GS-review step and be routed directly from the applicant to BBL Portfolio Management (PFM). The system must detect "submitter is BK" and apply this alternate path automatically | **Must** | As a Logistics Officer at the Federal Chancellery (BK), I want my application to go straight to BBL PFM (skipping the GS step), so that the fact that BK has no GS does not block the workflow. | Federal Chancellery (BK); BBL PFM | [Mieterportal Fachkonzept Bedarf](BBL%20Requierements/intermediate/Mieterportal%20Fachkonzept%20Bedarf.md) §Approval workflow | BK is itself a federal administrative unit but sits at department level; the standard "department → GS → BBL" chain does not apply to it. |

### 2.4 Accommodation Demand — handover to BBL Portfolio Management (PFM) and SAP ePPM (`FUNC-PFM-*`)

Once an application is approved (or, for the Federal Chancellery,
submitted directly), it has to land in SAP without any manual
re-entry. SAP ePPM (Enterprise Portfolio and Project Management) is
the federal project-portfolio system that BBL PFM uses to plan and
fund real-estate projects.

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-PFM-001 | Transfer the approved application from the portal directly into SAP ePPM as a "demand notification" (Bedarfsmeldung), with no manual re-entry | **Must** | As BBL Portfolio Management, I want approved applications to appear automatically in ePPM, so that I do not have to retype them and risk a media break. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (mapping table); Systemkonzept §2.1.4 | This is the core integration. Field-by-field mapping see FUNC-PFM-002. |
| FUNC-PFM-002 | Implement the complete field mapping from the portal application form into the corresponding ePPM tabs and fields, per the 23-row mapping table in the Fachkonzept (applicant data, address / Property Unit (WE) / building, the twelve major-application fields 4.1–4.12, FTE & workstation counts, metric tab) | **Must** | As BBL PFM, I want every application field to land on the correct ePPM tab, so that downstream project workflows can pick up without confusion. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (column "EPPM-Feld") | Mapping for 23 fields specified in V05; some target tabs are marked "possibly new fields" — to clarify with SAP. |
| FUNC-PFM-003 | Once the ePPM has accepted the demand, the portal shows the status "Transferred to ePPM" and notifies the involved roles | **Must** | As an involved role, I want to see that the application has landed in BBL's system, so that the transition is transparent. | All roles | Use Case Bedarf §Input format BBL | — |
| FUNC-PFM-004 | If the transfer to SAP fails (technical error, validation error in the target), the operations team can re-trigger the transfer ("reprocessing") deliberately for that one record | **Must** | As BBL PFM operations, I want to retry a failed handover for a specific application, so that one ePPM hiccup does not stall the whole queue. | BIT (operations); BBL PFM | Systemkonzept §2.1.9 (Buy) and §2.1.12 (Create) | Logging / audit trail see NFA-SEC-005. |
| FUNC-PFM-005 | Notify BBL Real-Estate Management (IM) / Asset Management (OM) and other downstream BBL roles **early** when relevant demand comes in | **Should** | As BBL IM/OM, I want early notice of incoming demand, so that capacity planning and follow-up coordination can start. | BBL IM/OM (use-case stakeholders) | Use Case Bedarf §Impact/Benefit | The exact list of "responsible BBL roles" is still open (V2.1 — see OP-9). |

### 2.5 Inbox, status and overview (`FUNC-INB-*`)

Each role gets a personal inbox of their pending and recent applications, and the system maintains an end-to-end status so every participant — applicant, GS reviewer, BBL PFM — sees where each item stands at any moment.

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-INB-001 | Each role gets a personal inbox listing every application they are involved in, grouped by status (open / in progress / closed) | **Must** | As any role (Logistics Officer, GS reviewer, BBL PFM), I want one inbox that shows my pending work, so that I can prioritise without juggling multiple tools. | All roles (use-case stakeholders) | Use Case Bedarf §Input format (e-mail + status info in MP — Inbox) | — |
| FUNC-INB-002 | End-to-end status tracking across the whole lifecycle: application captured → GS in review → approved / rejected → transferred to SAP → closed (or archived) | **Must** | As an involved role, I want to know the current state of any application at a glance, so that I can react to delays. | Workshop WS1; BBL Campus | Use Case Bedarf §Input format; Systemkonzept §2.1.9 / §2.1.12 | Status codes maintained as master data. |

### 2.6 Reporting & analytics (`FUNC-REP-*`)

Aggregated reports — counts of applications per VE per year, status distributions — for BBL Campus and PFM to steer the service. Access is strictly limited to authorised roles and figures are anonymised at the individual level.

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-REP-001 | Anonymised, aggregated reports: number of applications per Administrative Unit (VE) per year, broken down by current status | **Should** | As BBL Campus or PFM, I want aggregated volume and status figures, so that I can steer workload and resource planning. | BBL Campus; BBL PFM | Use Case Bedarf §last paragraph | Anonymisation must be data-protection-compliant. |
| FUNC-REP-002 | Reports are visible only to roles explicitly authorised to see aggregated data | **Must** | As a compliance officer, I want strict access control on aggregated reports, so that personal data and confidential operational data stay protected. | Compliance; BBL Campus | Use Case Bedarf §last paragraph | See section 3.1 (IAM) and section 3.5 (Compliance). |

### 2.7 Master data and configuration (`FUNC-CC-*`)

Several of the auto-calculations above rely on values (m², CHF/m²,
factor settings) that the BBL must be able to change without an IT
release. These are maintained as **master data** in the portal.

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-CC-001 | Maintain key figures (m² values) per main usable area class — HNF 1-6 and HNF2 — as central master data | **Must** | As a BBL functional admin, I want to maintain the m² factors centrally, so that every application uses the same numbers. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3 ("General description" table) | Drives the automatic cost (rent or investment) calculations. |
| FUNC-CC-002 | Maintain the furnishing cost per workstation (WS) as central master data | **Must** | As a BBL functional admin, I want the per-workstation furnishing cost in one place, so that the calculation standard is consistent for all applications. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3 | — |
| FUNC-CC-003 | Maintain the rent-model parameters (rates, conditions) as central master data | **Must** | As a BBL functional admin, I want rental conditions in one place, so that applicants always see consistent cost estimates. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3 | Compare with the "rent calculator" mentioned in Mieterportal Gesamtkonzept §1.1.3 (VILB task cluster 1). |

---

## 3. Non-functional requirements

### 3.1 Identity & Access Management (IAM) (`NFA-IAM-*`)

How users sign in and what they are allowed to see and do. Authentication uses the federal IAM (eIAM); authorisation is role-based (RBAC) and locally delegated to each Administrative Unit (VE) so HR / personnel changes do not become IT tickets.

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-IAM-001 | Users authenticate via **eIAM (federal Identity and Access Management — the Swiss Confederation's single sign-on for internal/administrative applications)** | **Must** | As a federal user, I want to sign in with my standard federal credentials, so that I do not have to manage a new account. | BIT; BBL Campus | Systemkonzept §2.1.12 (Create) | The longer-term federal vision is **AGOV (the federal login service for public users — successor to CH-LOGIN)** for tenants who are not federal employees; that is **not** in pilot scope (see OP-3). |
| NFA-IAM-002 | **Delegated administration:** an authorised role inside a VE can assign, revoke, and substitute access rights for users in their own VE — without filing IT tickets | **Must** | As a VE authorisation administrator, I want to manage my own users (including substitutions for vacations), so that staff changes do not generate IT support tickets. | BBL Campus; BIT | Systemkonzept §2.1.12; §2.1.13 | — |
| NFA-IAM-003 | **Role-based access control (RBAC):** the portal enforces that each role sees only the actions and fields meant for that role, consistent with the user's eIAM identity | **Must** | As any role, I want to see only the actions and fields meant for me, so that separation of duties is upheld and I am not distracted by irrelevant options. | BBL Campus; Compliance | Systemkonzept §2.1.4; §2.1.12 | RBAC = Role-Based Access Control. |
| NFA-IAM-004 | (Optional, later iteration) Integrate the **Data Reference Point (DBP — Datenbezugspunkt, the federal source for organisational and functional attributes about federal staff)** for attribute-based access decisions | **Could** | As the BBL authorisation owner, I want to refine access using attributes (organisation, function), so that we can model finer-grained policies once needed. | BBL Campus | Systemkonzept §2.1.12; §2.1.13 | Not pilot scope; noted as an extension. |

### 3.2 Security (`NFA-SEC-*`)

Baseline protections for a portal handling federal-tenant data: network protection (load balancer + WAF), centrally managed secrets, malware scanning on every upload, a defined data classification per the federal Information Security Act (ISG), and a full audit trail of every action.

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-SEC-001 | Place a **load balancer plus Web Application Firewall (WAF)** in front of the portal | **Must** | As operations, I want to protect the portal from unauthorised access and standard web attacks (SQL injection, XSS, etc.), so that confidentiality and availability hold. | BIT (operations) | Systemkonzept §2.1.11 (Create) | — |
| NFA-SEC-002 | Manage application credentials (SAP tokens, API keys, etc.) in a **central secrets store** (e.g. HashiCorp Vault or the RHOS-native secrets service) — never in code or configuration files | **Must** | As operations, I want keys centrally stored and rotatable, so that a single compromise has limited blast radius. | BIT (operations) | Systemkonzept §2.1.11 (Create) | — |
| NFA-SEC-003 | Scan every uploaded file for malware before storing it | **Must** | As operations, I want every upload checked for malicious content, so that we do not store or forward malware. | BIT (operations); BBL Campus | Systemkonzept §2.1.11 (Create) | Runs upstream of object-storage write (see FUNC-AU-008). |
| NFA-SEC-004 | Define the **Information Security classification (ISG — Informationssicherheitsgesetz, the federal Information Security Act, which classifies data as Internal / Confidential / Secret)** of the data processed in the portal | **Must** | As a compliance officer, I want the data classified up-front, so that proportionate security controls can be designed. | Compliance; BBL Campus | Fachkonzept NEW V05 §Classification (the field is currently empty in V05) | The Fachkonzept currently leaves the classification field blank — see OP-1. |
| NFA-SEC-005 | Keep a **full audit trail** of every application action, status change, approval, and rejection — including who did what and when | **Must** | As compliance/audit, I want to reconstruct every past decision, so that administrative-law and audit requirements are met. | Compliance; GS | Systemkonzept §2.1.9 (Buy) and §2.1.12 (Create) | Stored in the RHOS-side database. |

### 3.3 Integration & interfaces (`NFA-INT-*`)

How the portal talks to the surrounding federal IT landscape — mainly SAP ePPM via the BIT Webservice Gateway (WSG), the federal mail infrastructure for notifications, plus open APIs to plug in additional digital services later.

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-INT-001 | Talk to SAP ePPM/PPM via the **BIT Webservice Gateway (WSG — a federal API gateway operated by BIT)** plus the existing SAP middleware — not by directly coupling the portal to SAP | **Must** | As an architect, I want defined web-service interfaces between the portal and SAP, so that the two can be operated and released independently. | BIT; BBL PFM | Systemkonzept §2.1.11 (Create) | Decoupling makes operations and error handling easier. |
| NFA-INT-002 | Document the SAP business-object mapping for the demand notification (what fields go where in ePPM) | **Must** | As an architect/developer, I want the target SAP object and its fields specified explicitly, so that the mapping is testable. | BBL PFM; BIT | Fachkonzept NEW V05 §4.1.5.1 (template — still to be filled) | §4.1.5.1 in V05 still contains placeholder text — specification gap. |
| NFA-INT-003 | Decide and document whether the SAP transfer is synchronous (at approval time) or asynchronous (queued for later delivery) | **Should** | As an architect, I want the transfer mode pinned down, so that response times and load patterns are predictable. | BIT | Fachkonzept NEW V05 §4.1.5.3 (template — still to be filled) | Recommendation: synchronous at approval time, with retry on failure (see FUNC-PFM-004). |
| NFA-INT-004 | Send notifications via the **existing federal mail infrastructure** rather than running a new mail server | **Must** | As operations, I want to reuse the standard mail relays, so that we do not maintain a separate mail stack. | BIT (operations) | Systemkonzept §2.1.11 (Create) | — |
| NFA-INT-005 | After every SAP handover, return a clear acknowledgement to the portal — a document number on success, an error identifier on failure | **Must** | As an operator role, I want a definitive response from every handover, so that success and failure are unambiguous. | BIT; BBL PFM | Fachkonzept NEW V05 §4.1.5.5 / §4.1.5.6 (template) | — |
| NFA-INT-006 | Expose open APIs so that additional digital services (BBL or third-party) can be plugged into the portal | **Should** | As the functional owner, I want a stable API surface, so that new services can be added without a platform change. | BBL Campus | Use Case Landing Page V2.0 | Coordinate with any future commercial-platform decision. |
| NFA-INT-007 | (Optional, later use cases) Support embedding **SAP Fiori apps or SAP Work Zone components** in the portal | **Could** | As an architect, I want the option to embed Fiori screens later, so that SAP-native functions can be reused without re-implementation. | BIT; BBL PFM | [LBC Mieterportal_ Draft.md](BBL%20Requierements/intermediate/LBC%20Mieterportal_%20Draft.md) §I; [SUPERB_Fachkonzept Work Zone V06](BBL%20Requierements/intermediate/SUPERB_Fachkonzept_ERP_IMMO_Work%20Zone_V06.md) | Pilot Create variant does not need this; relevant for later SAP-centric use cases. |

### 3.4 Hosting & platform (`NFA-PLT-*`)

Where and how the portal runs in production. The pilot targets Red Hat OpenShift (RHOS) in BIT's federal data centre, operated by BIT as the service provider. Application data lives in a managed database, uploaded files in object storage.

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-PLT-001 | Pilot target platform: **Red Hat OpenShift (RHOS — a Kubernetes-based container platform operated by BIT in the federal data centre)** | **Must** | As an architect, I want a standardised container platform, so that the portal fits into BIT's existing operations and security workflows. | BIT | Systemkonzept §2.1.11; Lösungsarchitektur §3.0 | Decision flows from the variant comparison (Create recommended). |
| NFA-PLT-002 | Operations run by the federal IT service provider (BIT) — not by the BBL itself | **Must** | As BBL, I want BIT to operate the platform, so that the functional office stays focused on business content and an SLA exists. | BBL Campus; BIT | Use Case Gesamt §Description; Systemkonzept §2.1.13 | A pure self-service operating model is explicitly **not** planned. |
| NFA-PLT-003 | Persist process data, status data, and log data in a managed database (one of the BIT-provided RHOS database services) | **Must** | As operations, I want application state persisted reliably, so that workflows can be resumed and audits/reports are possible. | BIT (operations) | Systemkonzept §2.1.11 | — |
| NFA-PLT-004 | Store uploaded files (cost-effectiveness proofs, legal-basis attachments, PDFs) in an object store, not in the application database | **Must** | As operations, I want large files stored separately from the application database, so that performance and backup strategies hold. | BIT (operations) | Systemkonzept §2.1.11 | — |
| NFA-PLT-005 | Deliver a lifecycle plan: release process, patch policy, monitoring, and operations documentation | **Must** | As operations, I want a clear release / patch / monitoring plan, so that the service stays maintainable in production. | BIT (operations) | Systemkonzept §2.1.13 (operations and responsibility) | — |
| NFA-PLT-006 | Avoid "customizing spirals" if a commercial platform is ever chosen later (prefer using standard product features over customisation) | **Should** | As an architect, I want to default to standard features, so that maintainability and cost stay under control. | BIT; BBL Campus | Systemkonzept §2.1.10 (Buy risks) | Relevant for a later "Buy" phase, not for the pilot Create. |

### 3.5 Compliance, law & data sovereignty (`NFA-COMP-*`)

Legal and regulatory obligations the portal must meet: federal Data Protection (DSG), Information Security (ISG), the real-estate ordinance (VILB) including its audit clause, "open source by default" (EMBAG Art. 9), and the federal Architecture Principles (W010) and ICT Strategy (SB011).

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-COMP-001 | **Data sovereignty:** the BBL has unrestricted control over all data the portal holds | **Must** | As BBL, I want unrestricted control over all data in the portal, so that no third party can access or restrict it. | BBL Campus | Use Case Gesamt §Acceptance criteria | — |
| NFA-COMP-002 | Compliance with the federal security and data-protection regime: the **Federal Data Protection Act (DSG — Datenschutzgesetz)**, the **Information Security Act (ISG)**, and the Federal Real-Estate Ordinance (VILB) | **Must** | As a compliance officer, I want the portal to be DSG- and ISG-compliant, so that there is no legal risk. | Compliance; BBL Campus | Systemkonzept §2.1.10 (Buy point "Cloud/Environment fit & Governance"); §2.1.13 | — |
| NFA-COMP-003 | Every approval and rejection decision must include a written justification (matched by FUNC-FG-003) so that decisions are administratively traceable | **Must** | As an administrative lawyer, I want every decision justified in writing, so that administrative procedure law is satisfied. | Compliance; GS | Use Case Bedarf V2.1 (extension) | See also NFA-SEC-005 (audit trail). |
| NFA-COMP-004 | The implementation must be cost-effective overall — proven cost/benefit before go-live | **Must** | As BBL / the Confederation, I want a positive cost/benefit balance, so that federal funds are used responsibly. | BBL Campus; GS | Use Case Gesamt §Acceptance criteria; Use Case Landing Page §Acceptance criteria | — |
| NFA-COMP-005 | Deliver the portal as **self-contained functional building blocks**, each releasable independently | **Should** | As programme management, I want building blocks to be deliverable on their own, so that we deliver value early and limit risk. | BBL Campus | Use Case Gesamt §Acceptance criteria | The pilot itself is the first building block. |
| NFA-COMP-006 | Define a clear functional owner ("Fachowner") for every content area in the portal — accountable for accuracy and currency | **Must** | As compliance/programme management, I want one accountable owner per content area, so that no content is left orphaned. | BBL Campus | Use Case Bedarf §Acceptance criteria; Use Case Landing Page (Note) | — |
| NFA-COMP-007 | Cover all VILB task clusters (budget / cost, accommodation, supply, other) on the roadmap | **Should** | As BBL, I want every legally mandated VILB task represented on the roadmap, so that the federal mandate is complete. | BBL Campus | Mieterportal Gesamtkonzept §1.1.3 (VILB table); LBC §II | The pilot primarily covers "accommodation / demand / application". |
| NFA-COMP-008 | **EMBAG (E-Government Act) Art. 9 — Open-Source-by-Default:** publish in-house developments as open source unless a clearly documented reason (third-party rights or security) forbids it | **Could** | As the Federal Administration, I want in-house code published as open source, so that EMBAG Art. 9 is honoured. | Compliance | Market screening §EMBAG; not explicit in the Fachkonzept | Applies if the Create variant is taken — check licence, security, third-party rights. |
| NFA-COMP-009 | Compliance with the **Architecture Principles Directive (W010 V1.0)** of the **Digital Transformation and ICT Steering division (DTI — at the Federal Chancellery)**, issued under Art. 40 of the **Digital Administration Ordinance (DigiV — SR 172.019.1)** | **Must** | As BBL / Federal Administration, I want the portal to follow the seven federal architecture principles (see §3.A), so that interoperability and user acceptance are structurally ensured. | DTI (directive binding for the central Federal Administration, BBL included) | [W010 V1.0 (PDF)](https://www.bk.admin.ch/dam/bk/de/dokumente/dti/Vorgaben/WeisungendesDelegiertenDTI/W010%20V1.0%20Architekturprinzipien.pdf.download.pdf/W010%20V1.0%20Architekturprinzipien.pdf); local copy [intermediate/W010 Architekturprinzipien.md](BBL%20Requierements/intermediate/W010%20Architekturprinzipien.md) | Deviations from any principle must be decided at department/directorate level and substantively justified. Implementation mapping see §3.A. |
| NFA-COMP-010 | Alignment with **SB011 (federal ICT Strategy) of the DTI** — strategic pillars include digital identity sovereignty, open standards, user-centric automation, AGOV as central login, resilience | **Should** | As BBL, I want the portal to be aligned with federal ICT strategy pillars, so that the initiative survives the strategic review. | DTI (strategic) | [SB011 ICT Strategy](https://www.bk.admin.ch/bk/de/home/digitale-transformation-ikt-lenkung/vorgaben/sb011-ikt-strategie.html) | Internal tool — strategy as guardrail, not a strict compliance duty. AGOV migration see OP-3. |
| NFA-COMP-011 | Reconcile with the rest of the DTI directive catalog (W001…W0nn, SB000…SB0nn) during the architecture review | **Could** | As an architect, I want to systematically check the federal directive catalog, so that no binding detail is missed. | DTI | [Overview of DTI directives](https://www.bk.admin.ch/bk/de/home/digitale-transformation-ikt-lenkung/vorgaben.html) | Depth of detail proportional to "internal tool" character. |
| NFA-COMP-012 | The responsible department of any **Real-Estate / Building Organ (BLO — Bau- und Liegenschaftsorgan, the federal organisation type that BBL itself is)** can order audits across all projects and processes in real-estate management (VILB Art. 9 lit. d) | **Must** | As the department to which BBL reports, I want to order audits across all real-estate processes, so that oversight is possible. | EFD (Federal Department of Finance, which oversees BBL); generally the responsible department for any BLO | [LBC Mieterportal_ Draft.md §VILB tasks](BBL%20Requierements/intermediate/LBC%20Mieterportal_%20Draft.md); [VILB Art. 9](https://www.fedlex.admin.ch/eli/cc/2008/857/de#art_9) | Audit authority = read access to data, logs, configurations for a dedicated audit role. The ETH real-estate portfolio: EFD is responsible. |

### 3.6 User experience (UX) & usability (`NFA-UX-*`)

Baseline usability rules so that occasional federal tenants can use the portal without training: clear navigation, role-aware visibility, responsive layout, and trustworthy content metadata (source, contact, last-updated). Multilingualism and accessibility live in §3.8 because they come from federal Corporate Design.

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-UX-001 | The portal is operable without prior training — even for an occasional user | **Must** | As an occasional user, I want to operate the portal without any training, so that I actually use it for the rare task. | Workshop WS1 | Use Case Landing Page V2.0; Use Case Gesamt | — |
| NFA-UX-002 | Clear navigation and visible role guidance — a user immediately sees which area belongs to their role | **Must** | As a tenant, I want to see at a glance what is for my role, so that I do not scroll through irrelevant sections. | Workshop WS1 | Use Case Landing Page V2.0 | — |
| NFA-UX-003 | Responsive design across the three breakpoints defined in FUNC-LP-008; **Must** for public parts, **Should** for authenticated parts used by mobile-likely roles, with desk-bound reviewer surfaces allowed to declare desktop-only with a graceful fallback | **Must** / **Should** | As a mobile user, I want to read public content and file/track applications on the move, so that I am not tied to a desktop. | Workshop WS1 | Use Case Landing Page V2.0 | Same scope-widening as FUNC-LP-008 in v0.5. |
| NFA-UX-004 | Every **published informational content item** shows its source, contact person, and "last updated" date. Action surfaces (buttons, wizard launchers, navigation tiles) are explicitly out of scope. | **Must** | As a tenant, I want to know where information comes from and when it was last reviewed, so that I can rely on it — without metadata cluttering UI controls. | Workshop WS1; BBL Campus | Use Case Landing Page V2.0 | Same intent as FUNC-LP-009. **v0.5 scope narrowing** — see FUNC-LP-009 note. |

*(Multilingualism — German / French / Italian — and accessibility per WCAG 2.1 AA are handled as federal Corporate Design requirements in §3.8, see NFA-CD-003 and NFA-CD-004.)*

### 3.7 Data, retention & logging (`NFA-DATA-*`)

How the portal handles data over time: anonymisation for aggregated reports, federal retention periods on closed applications, data residency on Swiss soil, and structured logging with a correlation ID across frontend, backend and SAP for incident analysis.

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-DATA-001 | Anonymise aggregated reports so that no individual is identifiable | **Must** | As a compliance officer, I want reports never to identify individuals, so that data-protection law (DSG) is respected. | Compliance; BBL Campus | Use Case Bedarf §last paragraph | Pairs with FUNC-REP-001. |
| NFA-DATA-002 | Hold application data and audit trails for the retention periods defined by federal records-management rules | **Must** | As records management, I want clear retention periods enforced, so that statutory archive duties are met. | Compliance | Not explicit in the BBL sources; standard federal duty | Specific periods to be confirmed with the Federal Archive / **GEVER (Geschäftsverwaltung — federal records-management system)** — see OP-7. |
| NFA-DATA-003 | Store data on Swiss soil ("data residency") | **Should** | As BBL / the Confederation, I want all data physically stored in Switzerland, so that data sovereignty is real, not just contractual. | BBL Campus; Compliance | Not explicit in the BBL sources; implied by RHOS-at-BIT operations | RHOS in the BIT data centre satisfies this by default; confirm explicitly at acceptance. |
| NFA-DATA-004 | Emit structured logs with a **correlation ID** that links events across frontend, backend, and the SAP handover | **Should** | As operations, I want to trace any incident end-to-end across systems, so that root cause is quick to find. | BIT (operations) | Systemkonzept §2.1.9 (Buy point "Logging / Audit Trail"); §2.1.12 (Create) | — |

### 3.8 Swiss Federal Corporate Design (CD) & Web Guidelines (`NFA-CD-*`)

The Confederation has a shared **Corporate Design (CD — visual and
interaction standard for all federal websites)**, plus accompanying Web
Guidelines and the official open-source design system at
[github.com/swiss/designsystem](https://github.com/swiss/designsystem)
(Nuxt + Storybook + Figma library, MIT licence, maintained by the
Federal Chancellery).

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-CD-001 | Use the **Swiss Federal Design System** (HTML structures, CSS assets, design tokens, components) to build the portal UI | **Must** | As a tenant, I want the portal to look and feel like every other federal site, so that I recognise it as official and do not need to relearn interaction patterns. | Federal Chancellery | [github.com/swiss/designsystem](https://github.com/swiss/designsystem) (MIT, v1.0.9 as of 2026-05-18) | Internal tool — minimum implementation: typographic tokens (Noto Sans), colour palette (primary red `--color-primary-600` = `#d8232a`), base component set, Swiss coat of arms / federal brand. **Distribution:** the design system ships as **Vue 3 Single-File Components + Tailwind CSS utility layer + Storybook documentation** (NOT Web Components / Lit, as earlier drafts incorrectly stated). Consumption options for the portal: (a) Vue/Nuxt-native — embed the components directly; (b) CSS-only — link the pre-built `dist/main.css` (~360 KB) and use semantic class names + custom properties, re-implementing interactive behaviour (modal, accordion, tabs) in the chosen framework; (c) token extraction — copy the design tokens into a lightweight `tokens.css` (~10 KB) and write thin component CSS, as the sister prototype `workspace-management` does. The pilot-frontend framework decision (option a/b/c) is OP-11. |
| NFA-CD-002 | Comply with the federal **Web Guidelines (Webguidelines Bund)** — labelling, vocabulary, and language standards used across federal websites | **Must** | As a tenant, I want labels and interaction patterns I already recognise from other federal services, so that the portal feels intuitive. | Federal Chancellery | publiccode.yml in the Design System (feature "Web Guidelines Bund"); see also [bk.admin.ch › Vorgaben](https://www.bk.admin.ch/bk/de/home/digitale-transformation-ikt-lenkung/vorgaben.html) | Shipped together with the Design System. |
| NFA-CD-003 | Localise the portal into the three Swiss official languages: **German (DE)**, **French (FR)**, **Italian (IT)**. UI chrome, navigation, validation messages, e-mail notifications, audit-log labels and every published informational content item must be available in all three. A content item may be published in fewer languages only with a documented **Sprachengesetz derogation** (audit-logged Begründung visible to Compliance) | **Must** | As a French- or Italian-speaking federal tenant, I want the portal in my official language, so that communication and legal certainty are guaranteed under the federal Languages Act. | Federal Department of Foreign Affairs (FDFA); all FR/IT-speaking VEs; Compliance (federal Languages Act) | [Sprachengesetz SR 441.1 Art. 6 + Art. 11](https://www.fedlex.admin.ch/eli/cc/2009/821/de) (federal authorities must publish in DE/FR/IT); Use Case Landing Page §UX requirements | **v0.5 promotion from Should to Must (originated in WIREFRAMES.md v0.2 review):** the federal Sprachengesetz Art. 6 Abs. 1 and Art. 11 make DE/FR/IT availability a legal obligation for federal authorities, not a desirability. English only if a concrete need arises (e.g. FDFA staff posted abroad). Replaces the earlier UX-language requirement. |
| NFA-CD-004 | Meet **WCAG 2.1 Level AA** (the W3C Web Content Accessibility Guidelines, Level AA) and the Swiss-government accessibility standard **eCH-0059** | **Must** | As a user with disabilities, I want full access to the portal, so that I am not excluded from a federal service. | Compliance; Federal Chancellery | [eCH-0059](https://www.ech.ch/); WCAG 2.1 AA | Level AA is the Swiss federal minimum for internal applications. W010 principle 2.4 ("Comprehensive Inclusion") requires this structurally. |

---

## 3.A Mapping W010 architecture principles → MP implementation

The seven federal architecture principles defined in
[Directive W010 V1.0](BBL%20Requierements/intermediate/W010%20Architekturprinzipien.md)
§2 must be visibly anchored in this catalog. The mapping:

| W010 principle | Anchored in MP via | Comment |
|---|---|---|
| **2.1 Digital First** ("Bevorzugt Digital") | FUNC-LP-001 (Single Point of Contact), FUNC-AU-001 ff. (digital application submission), FUNC-PFM-001 (direct SAP handover) | Replacing today's phone/e-mail/PDF/Excel is an explicit pilot goal. |
| **2.2 Once-Only Data Collection** ("Einmalige Datenerhebung") | FUNC-AU-012 (auto-derive property unit and building from address), FUNC-AU-001 (auto-assign responsible BBL roles), NFA-INT-001 (transfer to SAP without re-entry) | Sourcing from the federal building register (GWR / EGID, see OP-7) would strengthen this further. |
| **2.3 Prudent Interoperability** ("Umsichtige Interoperabilität") | NFA-INT-001 to -006 (open interfaces, federal Webservice Gateway, open APIs), NFA-COMP-010 (open-standards alignment via SB011) | Conformance with I14Y (federal interoperability platform) and eCH standards to be assessed later. |
| **2.4 Comprehensive Inclusion** ("Umfassende Inklusion") | NFA-CD-004 (WCAG 2.1 AA / eCH-0059), NFA-CD-003 (German / French / Italian) | Federal minimum level for internal applications. |
| **2.5 Transparent Public-Authority Interaction** ("Transparente Behördeninteraktion") | FUNC-INB-001 / -002 (inbox + status tracking), FUNC-FG-003 (mandatory justification of decisions), NFA-SEC-005 (audit trail) | The applicant can see the state and the reasoning behind every step. |
| **2.6 Accessible Public Services** ("Zugängliche Behördenleistungen") | FUNC-LP-001 (SPOC), FUNC-LP-008 (responsive), NFA-IAM-001 (eIAM), NFA-CD-* | Pilot scope is internal-federal; public-tenant scenarios with AGOV see OP-3. |
| **2.7 Authentic Trustworthiness** ("Aufrichtige Vertrauenswürdigkeit") | NFA-SEC-001 to -005 (WAF, secrets, malware scanning, ISG classification, audit trail), NFA-COMP-001 (data sovereignty), NFA-COMP-003 (decision traceability) | Source attribution / currency per content item (FUNC-LP-009) reinforces user trust. |

---

## 4. Roadmap use cases (beyond the pilot)

The following use cases are **not** part of the pilot but are listed so
that architecture and data model stay pilot-compatible with the next
roadmap iterations. Sources: [Mieterportal Gesamt V2.1](BBL%20Requierements/intermediate/Mieterportal%20Gesamt%20V2.1.md)
§Description; [Mieterportal_ Vision](BBL%20Requierements/intermediate/Mieterportal_%20Vision.md);
[LBC Mieterportal_ Draft](BBL%20Requierements/intermediate/LBC%20Mieterportal_%20Draft.md) §III.

### 4.1 Case A — SUPERB base services (`REQ-FA-*`)

Tenant-facing services that are part of the SUPERB programme (BBL's S/4HANA roll-out) and will naturally live in the portal in later iterations: occupancy planning, repair tickets, moves, furnishing shop, project paperwork.

| ID | Use case | Priority | Requested by | Source | Note |
|---|---|---|---|---|---|
| REQ-FA-001 | Project paperwork ("Geschäftsblätter") — handle the lifecycle of project sheets that BBL produces for each construction project | **Should** | BBL PFM | Mieterportal Gesamt V2.1 §Case A | — |
| REQ-FA-002 | Visual representation of building furnishings on a map / floor plan, with key information | **Could** | BBL Campus; workshop WS1 | Mieterportal Gesamt V2.1 §Case A | Map / floor-plan view. |
| REQ-FA-003 | Occupancy planning tool (Info-App for floor-space management, FLM — self-service) | **Should** | BBL Campus | Mieterportal Gesamt V2.1 §Case A; LBC §Use Case 1; Superb_QuickHelp_FLM_INFO | FLM = Flächenmanagement (floor-space management). |
| REQ-FA-004 | Furniture and inventory management tool | **Could** | BBL Campus; BBL Supply | Mieterportal Gesamt V2.1 §Case A | Already in progress under work-stream "WSM". |
| REQ-FA-005 | Submit repair-need or fault notifications, plotted on a map, captured directly in the portal | **Should** | Workshop WS1; BBL Campus | Mieterportal Gesamt V2.1 §Case A; LBC §Use Case 2 | Ticketing tool — see MP0100 / MP0200 variants described in the LBC document. |
| REQ-FA-006 | Submit move / transport requests and special cleaning requests | **Could** | BBL Campus | Mieterportal Gesamt V2.1 §Case A | — |
| REQ-FA-007 | Furnishing shop (standard items + special items) | **Could** | BBL Campus; BBL Supply | Mieterportal Gesamt V2.1 §Case A | Marketplace function; in progress elsewhere. |

### 4.2 Case B — independent of SUPERB (`REQ-FB-*`)

Tenant-facing services that do not depend on SUPERB. The open delivery question for each one is whether it belongs in this portal or in the federal Geographic Information System (GIS) portal.

| ID | Use case | Priority | Requested by | Source | Note |
|---|---|---|---|---|---|
| REQ-FB-001 | Portfolio strategy view (projects, maintenance measures, planned disposals) on a map | **Could** | BBL Campus | Mieterportal Gesamt V2.1 §Case B | Likely implemented in the federal **GIS (Geographic Information System) portal** instead of the MP. |
| REQ-FB-002 | Per-object KPIs (consumption, workstation count) with interactive capture | **Could** | BBL Campus; BBL PFM | Mieterportal Gesamt V2.1 §Case B | Same delivery question as REQ-FB-001 — GIS portal vs. MP. |

### 4.3 Case C — strategic approval required (`REQ-FC-*`)

Use cases that need a strategic decision before scoping (incident communication, training, normative knowledge base). They are explicitly not part of the pilot.

| ID | Use case | Priority | Requested by | Source | Note |
|---|---|---|---|---|---|
| REQ-FC-001 | Crisis-incident communication channel | **Won't** (Pilot) | BBL Campus; federal crisis-management staff | Mieterportal Gesamt V2.1 §Case C | Strategic approval needed before scoping. |
| REQ-FC-002 | Digital training on the collaboration roles (BBL ↔ federal tenants) | **Could** | BBL Campus | Mieterportal Gesamt V2.1 §Case C | — |
| REQ-FC-003 | Directives, ordinances, guidelines — published as a knowledge base | **Won't** (Pilot) | BBL Campus | Mieterportal Gesamt V2.1 §Case C | To be delivered on the public internet, not in the tenant portal. |

---

## 5. Open points and gaps

| # | Point | Source | Recommended clarification |
|---|---|---|---|
| OP-1 | The ISG (Information Security Act) classification of the portal's data (Internal / Confidential / Secret) is not filled in | Fachkonzept NEW V05 §Classification | Clarify with the **Information Security Officer (ISBO)** before the pilot architecture decision. |
| OP-2 | The detail sections §4.1.2 (Workflow), §4.1.4 (Form), §4.1.5 (Interface), §4.1.6 (Reporting) in the Fachkonzept V05 are still template placeholders | Fachkonzept NEW V05 | Assign chapter owners and specify in detail before implementation start. |
| OP-3 | The pilot uses eIAM (federal IAM for internal users), but the longer-term vision is AGOV for public-tenant use cases. Migration path needed | Systemkonzept §2.1.12 (Create); Market screening §I (AGOV) | Decide the target state and document the migration path eIAM → AGOV. |
| OP-4 | "BBL PFM as requester (as of 2025-11-04)" appears throughout; specific names (Lars Hofmann and others) are only visible in the solution-architecture annex | Fachkonzept NEW V05 §4.1.1.3 | List the PFM representatives explicitly and tidy the "Requested by" column. |
| OP-5 | The Visio source "20251104 Anforderungen Mieterportal PFM.vsdx" could not be converted automatically — the OCR returned empty | [intermediate/_index.md](BBL%20Requierements/intermediate/_index.md) §Failed | Re-export from Visio with text-as-vector, or re-OCR with `easyocr`. |
| OP-6 | Multilingualism (DE / FR / IT) and accessibility (eCH-0059 / WCAG 2.1 AA) are not specified in the BBL source material; they are derived from federal Corporate Design rules | NFA-CD-003, NFA-CD-004 | Confirm with BIT and Compliance and add formally to the pilot acceptance criteria. |
| OP-7 | Retention periods and GEVER integration not described | NFA-DATA-002 | Coordinate with the Federal Archive and federal records management. |
| OP-8 | The NAW factor and the PFM building categories are master-data, but the maintenance process is not defined | FUNC-AU-004, FUNC-AU-014/-015 | Define the master-data ownership (likely BBL PFM). |
| OP-9 | The explicit list of "responsible BBL roles" per VE (looked up by FUNC-AU-001) is missing | FUNC-AU-001; Use Case Bedarf | Compile with BBL PFM (Lars Hofmann). |
| OP-10 | Reporting selection / layout / drilldown is not specified | Fachkonzept NEW V05 §4.1.6 | Specify the detail reports with BBL Campus and PFM. |
| OP-11 | The integration depth of the federal Design System (component set, theming, release cadence) is not pinned down | NFA-CD-001 | Coordinate with the chosen frontend stack and Federal Chancellery maintenance cycles (Storybook/Nuxt components vs. pure CSS tokens). |
| OP-12 | Availability and SLA targets (uptime, RTO, RPO) are not defined | Not in the source material | Define an SLA with BIT — for an internal tool, ~99.5 % during office hours is typically enough. |

---

## 6. Glossary (excerpt)

| Term | Meaning |
|---|---|
| **AGOV** | Federal login service for public users — successor to CH-LOGIN |
| **BBL** | Bundesamt für Bauten und Logistik — Federal Office for Buildings and Logistics |
| **BBL Campus** | The BBL functional office that owns the tenant portal |
| **BBL PFM** | Portfolio Management at BBL — decides which real-estate projects to fund and prioritises them |
| **BIT** | Bundesamt für Informatik und Telekommunikation — Federal IT service provider |
| **BK** | Bundeskanzlei — Federal Chancellery |
| **BLO** | Bau- und Liegenschaftsorgan des Bundes — federal building and real-estate organ (BBL is a BLO) |
| **BLV** | Bundesverordnung über die Liquidation und Verwertung — see federal regulations on real-estate disposal (used in NFA-COMP-002) |
| **CD Bund** | Corporate Design of the Swiss Federal Administration — see github.com/swiss/designsystem |
| **DBP** | Datenbezugspunkt — federal source of organisational/functional attributes for federal staff |
| **DigiV** | Digital Administration Ordinance (SR 172.019.1) — the federal ordinance under which DTI directives are issued |
| **DSG** | Datenschutzgesetz — federal Data Protection Act |
| **DTI** | Bereich Digitale Transformation und IKT-Lenkung — Digital Transformation and ICT Steering division of the Federal Chancellery |
| **EDA / FDFA** | Eidgenössisches Departement für auswärtige Angelegenheiten / Federal Department of Foreign Affairs |
| **EFD** | Eidgenössisches Finanzdepartement — Federal Department of Finance (oversees BBL) |
| **EGID** | Federal Building Identifier (part of the GWR register) |
| **eIAM** | Federal Identity and Access Management — the Swiss Confederation's IAM for internal applications |
| **EMBAG** | Federal Act on the Use of Electronic Means in Government Tasks — federal e-government act; Art. 9 = "open source by default" |
| **ePPM / PPM** | SAP Enterprise Portfolio and Project Management — federal SAP module for project portfolios |
| **FLM** | Flächenmanagement — floor-space management |
| **GEVER** | Geschäftsverwaltung — federal records-management system family |
| **GF** | Geschossfläche — gross floor area per SIA 416 |
| **GIS** | Geographic Information System |
| **GS** | Generalsekretariat — General Secretariat of a federal department |
| **GWR** | Gebäude- und Wohnungsregister — federal building & dwelling register |
| **HNF / HNF2** | Hauptnutzfläche / Hauptnutzfläche 2 — main usable area / directly usable office area (SIA 416) |
| **ILBO** | Logistikbeauftragte — logistics officer of a VE; the role that submits applications |
| **ISBO** | Informationssicherheits-Beauftragter — Information Security Officer |
| **ISG** | Informationssicherheitsgesetz — federal Information Security Act |
| **LE** | Leistungserbringer — service provider (here: BIT) |
| **MP** | Mieter-/Serviceportal — the tenant/service portal being built |
| **NAW** | Neue Arbeitswelten — federal classification of working styles; drives the floor-space factor |
| **NoK** | "Not OK" — the rejection marker the GS reviewer can apply per field |
| **PFM categories** | Building categorisation maintained by BBL Portfolio Management |
| **RBAC** | Role-Based Access Control |
| **RHOS** | Red Hat OpenShift — Kubernetes-based container platform |
| **RPO** | Recovery Point Objective — max acceptable data loss in a disaster |
| **RTO** | Recovery Time Objective — max acceptable downtime in a disaster |
| **SAP** | Systems, Applications and Products — the ERP vendor; SAP ePPM is BBL's project-portfolio system |
| **SB011** | Federal ICT Strategy — strategic directive issued by DTI |
| **SEM** | Staatssekretariat für Migration — State Secretariat for Migration; runs federal asylum centres |
| **SIA 416** | Swiss building-norm SIA 416 — defines floor-area classifications (HNF, GF, etc.) |
| **SLA** | Service Level Agreement |
| **SPOC** | Single Point of Contact |
| **SUPERB** | BBL's SAP S/4HANA programme (cut-over September 2023) |
| **UK costs** | Unterbringungskosten — combined accommodation costs (rent + fit-out + operations) |
| **UVEK** | Eidg. Departement für Umwelt, Verkehr, Energie und Kommunikation — Federal Department of Environment, Transport, Energy and Communications |
| **VE** | Verwaltungseinheit — administrative unit (department, federal office) |
| **VILB** | Verordnung über das Immobilienmanagement und die Logistik des Bundes — federal real-estate and logistics ordinance |
| **W010** | Directive W010 V1.0 "Architecture Principles" issued by DTI |
| **WAF** | Web Application Firewall |
| **WBF** | Eidg. Departement für Wirtschaft, Bildung und Forschung — Federal Department of Economic Affairs, Education and Research |
| **WCAG** | Web Content Accessibility Guidelines (W3C); federal minimum is Level AA |
| **WE** | Wirtschaftseinheit — property unit in SAP RE-FX |
| **WS / AP** | Workstation / Arbeitsplatz |
| **WSG** | BIT Webservice Gateway — federal API gateway |
| **WSM** | Internal work-stream / project name (referenced in the source material) |
| **eCH-0059** | Swiss accessibility standard for e-government |
| **eCH-0279** | Swiss federal architecture vision 2050 (basis for W010) |

---

## 7. Version history of this document

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 2026-05-18 | Claude + David Rasner | Initial version. Consolidated from 22 source documents in `docs/BBL Requierements/`. Pilot scope prioritised. Roadmap (Case A/B/C) as Should/Could/Won't. |
| 0.2 | 2026-05-18 | Claude + David Rasner | Added NFA-COMP-009 (W010 architecture principles), NFA-COMP-010 (SB011), NFA-COMP-011 (further DTI directives), NFA-COMP-012 (VILB audit), NFA-INT-007 (Fiori / Work Zone option), §3.8 Federal CD (NFA-CD-001…-004), §3.A mapping W010 → MP. UX-004/-005 consolidated into §3.8. Glossary additions. OP-11/-12 added. |
| 0.3 | 2026-05-18 | Claude + David Rasner | Translated to English; content and intent preserved, IDs and links unchanged. |
| 0.4 | 2026-05-18 | Claude + David Rasner | Developer-friendly clarity pass: every acronym spelled out on first use as "Full Name (ACRONYM)", domain context added in the requirements text where the Swiss federal jargon was opaque. Added three high-value requirements derived from the previously uncited [Mieterportal Fachkonzept Bedarf](BBL%20Requierements/intermediate/Mieterportal%20Fachkonzept%20Bedarf.md): FUNC-AU-022 (application ID), FUNC-AU-023 (archive), FUNC-FG-005 (Federal Chancellery bypass). Fixed dangling reference (former NFA-UX-005 → NFA-CD-004 in OP-6) and FUNC-PFM-001 source reference (§4.1.1.1.1.1 → §4.1.1.3.4). |
| 0.5.1 | 2026-05-18 | Claude + David Rasner | Factual correction to NFA-CD-001 after live inspection of `github.com/swiss/designsystem` at v1.0.9: the design system distributes as **Vue 3 SFCs + Tailwind utility layer + Storybook**, **not** Web Components / Lit as earlier drafts asserted. NFA-CD-001 expanded with three consumption options (Vue-native / CSS-only / token-extracted). Pilot-frontend choice remains OP-11. |
| 0.5 | 2026-05-18 | Claude + David Rasner | **Best-practice and UX cross-check pass** — four spec adjustments arising from the [WIREFRAMES.md](WIREFRAMES.md) v0.2 review where the wireframes faithfully implemented a Must whose underlying requirement deserved push-back: (1) **FUNC-AU-019 narrowed** from "twelve mandatory free-text fields" to **6 mandatory free-text + 4 mandatory structured + 1 optional**, removing duplication between Operative Ziele / Zielzustand and between Nutzen-Kosten free-text and the WiBe upload (FUNC-PFM-002 ePPM-tab mapping preserved). (2) **FUNC-LP-009 + NFA-UX-004 scope-narrowed** to *published informational content* (FAQ articles, news banners, downloads, training materials); action surfaces (wizard launchers, buttons, navigation tiles) are explicitly **out of scope** — preventing metadata clutter on UI controls. (3) **NFA-CD-003 promoted from Should to Must** with explicit Sprachengesetz Art. 6 / Art. 11 citation; DE-only publication requires a documented audit-logged derogation. (4) **FUNC-LP-008 / NFA-UX-003 widened** to a three-breakpoint scope (desktop / tablet / mobile) with Must for public parts and Should for authenticated parts used by mobile-likely roles; the previous "public parts only" wording is replaced. Reqs IDs unchanged; priority of FUNC-LP-008 split into Must/Should depending on the role. SAP RE-FX object-key clarification added to project memory: the federal SAP identifier is the three-part composite `Buchungskreis / Wirtschaftseinheit / Objektnummer` (e.g. `1086/2010/AA`); the previous "WE = single 7-digit number" simplification in the wireframes was incorrect. |
