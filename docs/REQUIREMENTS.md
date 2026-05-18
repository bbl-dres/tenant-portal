# Requirements Catalog — BBL Tenant/Service Portal (MP)

> **As of:** 2026-05-18 · **Methodology:** HERMES (Requirements Catalog) · **Prioritization:** MoSCoW
>
> Consolidated requirements catalog for the BBL Tenant/Service Portal,
> merged from the source documents in
> [`BBL Requierements/intermediate/`](BBL%20Requierements/intermediate/_index.md)
> (folder is gitignored — local working copy only).
> This file is the single requirements source to maintain; it does not
> replace the original functional concepts, but makes their content
> findable, traceable, and prioritisable.

## 1. Context

### 1.1 Initial situation

Today there is no unified tenant/service portal acting as a Single Point of
Contact (SPOC) between the BBL (Swiss Federal Office of Buildings and
Logistics) and its tenants (administrative units, departments, federal
offices). Information and services are delivered via point solutions per
function and via manual channels (phone, e-mail, PDF, Excel) — resulting in
handoff gaps, lack of transparency, and long response times. *(Source:
IMMO_Mieterportal_Systemkonzept §1.)*

### 1.2 Goal

Provide a portal that

- routes stakeholders topic-by-topic to the right competence centres and services,
- delivers information as self-service,
- enables digital collaboration including role and authorization control,
- transfers the approved demand directly into SAP ePPM/PPM.

### 1.3 Scope of this requirements catalog

| Phase | Content | MoSCoW band |
|---|---|---|
| **Pilot** | Use case «Landing Page (SPOC)» + use case «Accommodation Need (application form)» | Must / Should |
| **Roadmap Case A** | SUPERB base services (business sheets, occupancy planning, FLM, inventory, fault/repair notification, move, furnishing shop) | Should / Could |
| **Roadmap Case B** | Independent of SUPERB (portfolio strategy view, KPIs — implementation in GIS Portal to be assessed) | Could |
| **Roadmap Case C** | Strategic approval required (incident communication, training, directives) | Could / Won't (this iteration) |

### 1.4 Recommended system variant

**Create** (in-house development on RHOS + BIT standard services) — see
[Loesungsarchitektur Pilot Antrag Unterbringung](BBL%20Requierements/intermediate/Loesungsarchitektur%20Pilot%20Antrag%20Unterbringung.md)
§4 and [IMMO_Mieterportal_Systemkonzept](BBL%20Requierements/intermediate/IMMO_Mieterportal_Systemkonzept.md)
§4 (Recommendation). Buy remains attractive for a later platform strategy;
Adapt does not cover the pilot process.

### 1.5 Actors / roles

| Abbrev. | Role | Main task in the MP |
|---|---|---|
| **BBL Campus / Fachamt** | Functional owner of the portal | Content, quality, currency, functional operations concept |
| **BBL PFM** | Portfolio Management | Receipt & routing of demand into SAP ePPM |
| **BBL IM / OM** | Real Estate / Asset Management | Early information, downstream processes |
| **LE (BIT)** | IT service provider | Technical implementation and operations |
| **VE / ILBO** | Administrative unit, logistics officer | Demand submission |
| **GS** | General Secretariat of the department | Assessment, approval or rejection |
| **Tenant / User** | End user inside the VE | Information retrieval, self-service |

### 1.6 MoSCoW notation

| Priority | Meaning in this catalog |
|---|---|
| **Must** | Blocks pilot go-live |
| **Should** | Important for pilot value, but can be added later |
| **Could** | Desirable; delivered in roadmap iterations |
| **Won't** | Excluded from this initiative (documented for transparency) |

### 1.7 Source index (linked)

All `Source` cells refer to files in
[`BBL Requierements/intermediate/`](BBL%20Requierements/intermediate/_index.md).
The most important documents are:

- **Functional concept:** [SUPERB_Fachkonzept_ERP_IMMO_Mieterportal NEW V05](BBL%20Requierements/intermediate/SUPERB_Fachkonzept_ERP_IMMO_Mieterportal%20NEW%20V05.md) (Heinz Ryter, Product Owner; Holger Ludwig, author; as of 2025-11-10)
- **System concept:** [IMMO_Mieterportal_Systemkonzept](BBL%20Requierements/intermediate/IMMO_Mieterportal_Systemkonzept.md)
- **Use cases:** [Mieterportal Gesamt V2.1](BBL%20Requierements/intermediate/Mieterportal%20Gesamt%20V2.1.md), [Use Case Bedarf Unterbringung V2.1](BBL%20Requierements/intermediate/Use%20Case%20Bedarf%20Unterbringung%20V2.1.md), [Use Case Landing Page V2.0](BBL%20Requierements/intermediate/Use%20Case%20Landing%20Page%20V2.0.md)
- **Pilot solution architecture:** [Loesungsarchitektur Pilot Antrag Unterbringung](BBL%20Requierements/intermediate/Loesungsarchitektur%20Pilot%20Antrag%20Unterbringung.md)
- **Workshop tenant expectations:** [WS 1 Mieterportal Erwartungshaltung](BBL%20Requierements/intermediate/WS%201%20Mieterportal%20Erwartungshaltung.md), [Mieterportal_ WS Erwartungshaltung Mieter](BBL%20Requierements/intermediate/Mieterportal_%20WS%20Erwartungshaltung%20Mieter.md)

---

## 2. Functional requirements

### 2.1 Landing Page / SPOC (`FUNC-LP-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-LP-001 | Single Point of Contact (SPOC) for all BBL tenant services | **Must** | As a tenant, I want a single entry point for all BBL services so that I no longer have to navigate via phone, e-mail and isolated tools. | Workshop WS1 (all VEs) | Use Case Landing Page V2.0; IMMO_Systemkonzept §2.1.2 | No portal exists today (current system state). |
| FUNC-LP-002 | Visual simplicity, clear structure, self-explanatory operation | **Must** | As a tenant, I want to find my way around without training so that I can complete tasks in a few clicks. | Workshop WS1; BBL Campus | Use Case Landing Page V2.0 | The current BBL customer platform is described as "outdated, confusing" (Use Case Gesamt). |
| FUNC-LP-003 | Role-based navigation and role-gated access to detail services | **Must** | As a responsible role, I want to see only the functions relevant to my role (e.g. contracts, budget info) so that information stays protected and contextual. | BBL Campus; Workshop WS1 | Use Case Landing Page V2.0; IMMO_Systemkonzept §2.1.2 | See NFA-IAM-* for the authorization foundation. |
| FUNC-LP-004 | Wizards/assistants for complex functions (demand notifications, orders, analyses) | **Must** | As an ILBO, I want to be guided through complex applications so that I do not miss any mandatory fields. | Workshop WS1; BBL PFM | Use Case Landing Page V2.0 | Wizard capability is the key differentiator vs. the Adapt variant (see System concept §2.1.6). |
| FUNC-LP-005 | Self-service dashboards (KPIs, data-entry forms directly in the MP) | **Should** | As a tenant, I want to inspect relevant KPIs without having to ask, so that I can work faster. | Workshop WS1 | Use Case Landing Page V2.0 | Data binding to source systems per KPI to be clarified. |
| FUNC-LP-006 | Suggestion function from history («what did I last order/apply for…») | **Could** | As a tenant, I want applications to be pre-filled from earlier inputs so that I do not start from scratch. | Workshop WS1 | Use Case Landing Page V2.0 | Requires storage of historical application data — clarify data protection / retention. |
| FUNC-LP-007 | Self-service downloads (plans, building information, training material) | **Should** | As a tenant, I want to download plans and training material myself so that I do not need to look for a contact person. | Workshop WS1; BBL Campus | Use Case Landing Page V2.0 | Content maintained by the BBL functional office. |
| FUNC-LP-008 | Responsive design for mobile devices (especially where no IAM is required) | **Should** | As a tenant, I want to access public content from my smartphone so that I stay informed on the move. | Workshop WS1 | Use Case Landing Page V2.0 | Mobile readiness for authenticated areas to be assessed separately (device compliance). |
| FUNC-LP-009 | Source attribution, contact person and "last updated" indication on all information | **Must** | As a tenant, I want to see the source, contact person, and currency of each piece of information so that I can trust the platform. | Workshop WS1 | Use Case Landing Page V2.0 | "Defined quality requirements" — acceptance criterion per content item. |
| FUNC-LP-010 | Self-publishing/deletion of content by the BBL functional office (low-code / macro) | **Should** | As the functional MP owner, I want to publish and delete content myself so that currency does not depend on IT releases. | BBL Campus | Use Case Landing Page V2.0; IMMO_Systemkonzept §2.1.2 | "Per the defined functional operations concept." |
| FUNC-LP-011 | Free integration of digital services via API from all systems | **Should** | As the functional owner, I want to plug in new services flexibly so that future use cases can be added without changing platforms. | BBL Campus; BIT | Use Case Landing Page V2.0 | Requires an integration layer — see NFA-INT-*. |
| FUNC-LP-012 | Landing Page provides workflow building blocks where the source system does not | **Could** | As the functional owner, I want to build simple digital workflows directly in the MP so that I do not have to force small processes back into source systems. | BBL Campus | Use Case Landing Page V2.0 | Conflict risk with Buy/standard platforms — await architecture decision. |

### 2.2 Accommodation Need — application submission (role ILBO/VE) (`FUNC-AU-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-AU-001 | Selection of VE/DEP with automatic assignment of responsible BBL roles | **Must** | As an ILBO, I want to choose my VE and automatically see the responsible BBL contacts so that I address my request to the right people. | BBL PFM (as of 2025-11-04) | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf §Input format | "Display of these roles" (V2.1 extension). |
| FUNC-AU-002 | Automated authorization granting per VE, overrideable by a defined role | **Must** | As an ILBO, I want automatic access rights for my application process so that I do not have to wait for manual unlocks. | BBL PFM; BIT | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf §Input format | Override "on demand — defined role" (special cases). |
| FUNC-AU-003 | Selection of accommodation need by location and building category (PFM categories) | **Must** | As an ILBO, I want to choose location and building category in a structured way so that downstream calculations are triggered correctly. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4; Use Case Bedarf | Location added in V2.1 alongside category. |
| FUNC-AU-004 | Interactive survey on working-style forms (NAW factor for floor-space calculation) | **Must** | As an ILBO, I want to be guided to the right NAW factor through a survey so that the floor-space need is calculated realistically. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | Wizard sub-form per workstation request. |
| FUNC-AU-005 | Preliminary accommodation-cost calculation per building category (m²·CHF) and location | **Must** | As an ILBO, I want to see a cost estimate early on so that I can roughly assess cost-effectiveness. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | Calculation formulas defined in §4.1.1.3.4.6 (see FUNC-AU-014/015). |
| FUNC-AU-006 | Cost-effectiveness proof via upload or built-in calculation tool | **Must** | As an ILBO, I want to upload the cost-effectiveness proof or compute it inline in the MP so that it becomes part of my application. | BBL PFM; GS | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | "Legal-basis proof" is a separate upload (FUNC-AU-007). |
| FUNC-AU-007 | Legal-basis proof via link upload | **Must** | As an ILBO, I want to reference the legal basis so that the GS can check legitimacy. | GS; BBL PFM | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | Attached to the demand in ePPM (see §4.1.1.3.4 row 4.4). |
| FUNC-AU-008 | PDF upload for supporting documents | **Must** | As an ILBO, I want to attach arbitrary PDFs so that I can provide context documents. | BBL PFM | Use Case Bedarf V2.1 §Input format; Systemkonzept §2.1.4 | File scan / malware check see NFA-SEC-003. |
| FUNC-AU-009 | Delete application (whether complete or partial) | **Should** | As an ILBO, I want to discard an unfinished application so that I do not produce orphan data. | BBL PFM | Use Case Bedarf V2.1 §Input format | Soft-delete with an audit entry recommended. |
| FUNC-AU-010 | Info texts for users (popup) | **Should** | As an ILBO, I want to see explanations next to fields so that I understand their meaning without external help. | BBL PFM | Use Case Bedarf V2.1 §Input format | Inline help; multilingual envisaged (DE/FR/IT — to be confirmed). |
| FUNC-AU-011 | Categorization of input fields into *mandatory* and *optional* | **Must** | As an ILBO, I want to clearly recognize which fields are mandatory so that rejections for missing data are avoided. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3; Use Case Bedarf | UI marking + server-side validation. |
| FUNC-AU-012 | Automatic address derivation: economic unit (WE), building (from street/address) | **Must** | As an ILBO, I want the economic unit and building filled in automatically after I enter a street so that I do not need to know internal keys. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (rows 3.5/3.6) | Investigate data source GWR/EGID. |
| FUNC-AU-013 | Exception capture: new need without an existing WE or building | **Must** | As an ILBO, I want to report demand even for locations not yet registered so that greenfield needs can be captured. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (row 3.8) | Define follow-up process with BBL master-data maintenance. |
| FUNC-AU-014 | Auto-calculation office workstations: desk-sharing 0.8 WS/FTE, HNF2 12 m²/FTE, GF 24 m²/FTE, max operating cost CHF 60/m² GF | **Must** | As an ILBO, I want to see floor-space figures automatically after entering FTE so that I do not have to calculate in parallel. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4.6.1 | Formulas per SIA 416. Values to be implemented as centrally maintainable master data. |
| FUNC-AU-015 | Auto-calculation initial furnishing investment: CHF 650/m² HNF2 | **Must** | As an ILBO, I want to see the initial furnishing cost immediately so that I grasp the total investment. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4.6.1 | Value as maintainable master data. |
| FUNC-AU-016 | Sleeping-berth order (SEM): count is mandatory, auto-calculation CHF 120,000 per berth | **Must** | As an ILBO with an SEM need, I want the berth investment calculated directly so that the application is robust. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4.6.2 | SEM-specific — clarify scope of applicability. |
| FUNC-AU-017 | FDFA (EDA) order: manual floor-space transfer per standard room programme, no automatic defaults | **Must** | As an FDFA ILBO, I want to enter floor space against FDFA room standards manually because foreign standards cannot be typified. | FDFA (Workshop WS1 attendees) | Fachkonzept NEW V05 §4.1.1.3.4.6.3 | Chancery = HNF per standard room programme; RE = HNF per RK 1-5; DW = HNF per RK 6. |
| FUNC-AU-018 | Other orders: HNF2 always in m² | **Must** | As an ILBO with a non-standard need, I want to capture HNF2 in m² so that downstream calculations stay consistent. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4.6.4 | — |
| FUNC-AU-019 | Capture of major-application fields 4.1–4.12, all mandatory | **Must** | As an ILBO, I want to capture all required content for a major application in a structured way so that the GS is ready to assess. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (rows 4.1–4.12) | Fields: short description, gaps in current state, legal basis, operational goals, alternatives, cost-effectiveness, target state, planning dependencies, schedule, cost estimate, FTE/WS. |
| FUNC-AU-020 | Auto-calculation of rough deadlines from the investment amount | **Should** | As an ILBO, I want rough deadlines derived directly from the investment amount so that I can communicate realistic expectations. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (row 4.10) | Thresholds / calculation logic to be specified. |
| FUNC-AU-021 | Distinguishable application types: major application, minor application, furniture | **Must** | As an ILBO, I want to choose the application type so that only fields relevant to my case appear. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3 (general description); §4.1.1.1.1.1.1-3 | §4.1.1.1.1.1.1/.2/.3 are still empty headers in V05 — detail fields per application type to follow. |

### 2.3 Accommodation Need — assessment & approval (role GS) (`FUNC-FG-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-FG-001 | Field-level approval: ok / NoK / comment per field requiring approval | **Must** | As a GS representative, I want to approve or reject fields individually so that I can give targeted justifications. | GS representatives (WBF, UVEK et al.) | Fachkonzept NEW V05 §4.1.1.1.1.1; Use Case Bedarf §Input format Assessment | — |
| FUNC-FG-002 | Overall approval or rejection with conditions | **Must** | As GS, I want to reject an application with specific conditions so that the ILBO knows what to correct. | GS representatives | Fachkonzept NEW V05 §4.1.1.1.1.1; Use Case Bedarf | — |
| FUNC-FG-003 | Mandatory text field justifying approvals and rejections | **Must** | As GS, I want (and must) justify decisions in writing so that traceability is ensured. | GS representatives; Compliance | Use Case Bedarf V2.1 §Input format Assessment (V2.1 extension) | Audit-relevant — see NFA-COMP-003. |
| FUNC-FG-004 | Notification of all involved roles after processing (e-mail + status display) | **Must** | As an involved role, I want to be notified after every status change so that I do not have to poll. | All roles (Workshop WS1) | Use Case Bedarf V2.1 §Input format Assessment | E-mail via existing mail infrastructure (see NFA-INT-004). |

### 2.4 Accommodation Need — handover BBL PFM / SAP ePPM (`FUNC-PFM-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-PFM-001 | Transfer of approved demand from MP directly into SAP ePPM (demand notification) | **Must** | As BBL PFM, I want approved demands to appear in ePPM without manual re-entry so that no handoff gaps emerge. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4; Systemkonzept §2.1.4 | Core integration. Field mapping see FUNC-PFM-002. |
| FUNC-PFM-002 | Complete field mapping MP → ePPM per §4.1.1.3.4 (applicant, address/WE/building, major-application 4.1–4.12, FTE/WS, metrics) | **Must** | As BBL PFM, I want every application field on the correct ePPM tab so that downstream processes can pick up. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3.4 (EPPM-field column) | Mapping for 23 fields specified in V05; some tabs marked "potentially new fields" — to clarify. |
| FUNC-PFM-003 | Notification to all involved roles upon receipt in PFM (status display in MP) | **Must** | As an involved role, I want to see that the application has arrived at BBL so that the transition is transparent. | All roles | Use Case Bedarf §Input format BBL | Maintain status "Transferred to ePPM". |
| FUNC-PFM-004 | Error handling and reprocessing for failed SAP handovers | **Must** | As BBL PFM (operations), I want to deliberately re-trigger failed handovers so that applications do not stall. | BIT (operations); BBL PFM | Systemkonzept §2.1.9 (Buy) and §2.1.12 (Create) | Logging/audit trail see NFA-SEC-005. |
| FUNC-PFM-005 | Early information to BBL IM/OM and other BBL roles | **Should** | As BBL IM/OM, I want to see relevant demands early so that capacity planning and follow-up coordination can begin. | BBL IM/OM (use-case stakeholders) | Use Case Bedarf §Impact/Benefit | Definition of "responsible BBL roles" still open (V2.1). |

### 2.5 Inbox, status and overview (`FUNC-INB-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-INB-001 | Personal inbox with all open / in-progress / closed applications per role | **Must** | As an ILBO/GS/PFM, I want to see my cases in an inbox so that I can set priorities. | All roles (use-case stakeholders) | Use Case Bedarf §Input format (e-mail + status info in MP — Inbox) | — |
| FUNC-INB-002 | End-to-end status management (application captured → GS in review → approved/rejected → transferred to SAP → closed) | **Must** | As an involved role, I want to know the current status of every application at any time so that I can react to delays. | Workshop WS1; BBL Campus | Use Case Bedarf §Input format; Systemkonzept §2.1.9/§2.1.12 | Status codes maintained as master data. |

### 2.6 Reporting & analytics (`FUNC-REP-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-REP-001 | Anonymized analytical reports (count of notifications per VE/year and their status) | **Should** | As BBL Campus / PFM, I want to see aggregated volumes/status figures so that I can steer the workload and plan resources. | BBL Campus; BBL PFM | Use Case Bedarf §last paragraph | Data-protection-compliant anonymization required. |
| FUNC-REP-002 | Access to reports limited to authorized roles only | **Must** | As a compliance officer, I want to ensure that only authorized roles see aggregated data so that data protection is preserved. | Compliance; BBL Campus | Use Case Bedarf §last paragraph | See NFA-IAM-* and NFA-COMP-*. |

### 2.7 Master data and configuration (`FUNC-CC-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| FUNC-CC-001 | Key figures per main usable area HNF 1-6 and HNF2 maintained | **Must** | As a BBL functional admin, I want to maintain m² key figures so that cost calculations stay consistent. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3 ("General description" table) | Used by automatic cost calculation (rent or investment). |
| FUNC-CC-002 | Key figures for furnishing cost per workstation (WS) maintained | **Must** | As a BBL functional admin, I want to maintain furnishing cost per WS centrally so that all applications use the same calculation standard. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3 | — |
| FUNC-CC-003 | Cost data for the tenant rental model maintained | **Must** | As a BBL functional admin, I want to maintain rental conditions centrally so that ILBOs get consistent estimates. | BBL PFM | Fachkonzept NEW V05 §4.1.1.3 | Cf. "rent calculator" in Mieterportal Gesamtkonzept §1.1.3 (VILB task cluster 1). |

---

## 3. Non-functional requirements

### 3.1 Identity & Access Management (`NFA-IAM-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-IAM-001 | Authentication on the portal via **eIAM** | **Must** | As a BBL user, I want to log in with my federal credentials so that I do not have to manage another account. | BIT; BBL Campus | Systemkonzept §2.1.12 (Create) | eIAM = federal IAM for internal/administrative applications. Conflict with the vision "AGOV for tenants (public users)" not resolved in pilot scope. |
| NFA-IAM-002 | Delegated management for VE/DEP access rights, substitutions, organizational responsibilities | **Must** | As a VE authorization maintainer, I want to delegate roles myself so that personnel changes do not become IT tickets. | BBL Campus; BIT | Systemkonzept §2.1.12; §2.1.13 (point "IAM and role model") | — |
| NFA-IAM-003 | Role-based authorization in the portal (RBAC) consistent with the eIAM identity | **Must** | As any role, I want to see only the actions/fields intended for my role so that separation of duties applies. | BBL Campus; Compliance | Systemkonzept §2.1.4; §2.1.12 | RBAC = Role-Based Access Control. |
| NFA-IAM-004 | Optional later integration of a data reference point (DBP) for additional organizational/functional attributes | **Could** | As BBL authorization owner, I want to enable attribute-based refinement of access rights once it is functionally required. | BBL Campus | Systemkonzept §2.1.12; §2.1.13 | Not in pilot scope; noted as an extension point. |

### 3.2 Security (`NFA-SEC-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-SEC-001 | Upstream protection and access layer (load balancer + WAF) | **Must** | As operations, I want to protect the portal from unauthorized access and web attacks so that confidentiality and availability are ensured. | BIT (operations) | Systemkonzept §2.1.11 (Create) | WAF = Web Application Firewall. |
| NFA-SEC-002 | Central secrets/key management for application credentials (e.g. SAP tokens, API keys) | **Must** | As operations, I want to keep keys centrally and rotatable so that compromises are contained. | BIT (operations) | Systemkonzept §2.1.11 (Create) | RHOS standard service usable. |
| NFA-SEC-003 | Protective controls for file uploads (malware scanning) | **Must** | As operations, I want uploaded files scanned for malicious code so that the portal and backend systems remain protected. | BIT (operations); BBL Campus | Systemkonzept §2.1.11 (Create) | Upstream of object-storage placement (see FUNC-AU-008). |
| NFA-SEC-004 | Define the ISG classification of the processed data (internal / confidential) | **Must** | As a compliance officer, I want the ISG classification known so that proportionate safeguards apply. | Compliance; BBL Campus | Fachkonzept NEW V05 §Classification (row left blank — explicitly to be defined) | Classification not yet filled in the V05 Fachkonzept header. |
| NFA-SEC-005 | Full audit trail across application processing, status changes, approvals/rejections | **Must** | As compliance/audit, I want to be able to reconstruct every decision so that administrative-law requirements are met. | Compliance; GS | Systemkonzept §2.1.9 (Buy) and §2.1.12 (Create) | Stored in the RHOS database. |

### 3.3 Integration & interfaces (`NFA-INT-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-INT-001 | Integration with SAP ePPM/PPM via the BIT Webservice Gateway (WSG) and existing SAP middleware | **Must** | As an architect, I want defined interfaces rather than direct coupling so that the portal and SAP can be operated independently. | BIT; BBL PFM | Systemkonzept §2.1.11 (Create) | Decoupling eases operations and error handling. |
| NFA-INT-002 | Business-object mapping in SAP ePPM demand notification documented | **Must** | As an architect, I want the target business object and its fields specified so that the mapping becomes testable. | BBL PFM; BIT | Fachkonzept NEW V05 §4.1.5.1 (template — to be filled) | §4.1.5.1 still "click or type" in V05 — specification gap. |
| NFA-INT-003 | Synchronous or defined delayed transmission described | **Should** | As an architect, I want the transmission timing defined so that response times and loads are plannable. | BIT | Fachkonzept NEW V05 §4.1.5.3 (template — to be filled) | Recommendation: synchronous at approval time. |
| NFA-INT-004 | Notifications via the existing federal mail infrastructure | **Must** | As operations, I want to use standard mail channels so that no additional mail-server stack has to be operated. | BIT (operations) | Systemkonzept §2.1.11 (Create) | — |
| NFA-INT-005 | Error feedback to the calling system (e.g. document number, error ID) | **Must** | As an operator role, I want a clear feedback after handover so that success/failure is traceable. | BIT; BBL PFM | Fachkonzept NEW V05 §4.1.5.5/§4.1.5.6 (template) | Template sections still to be filled. |
| NFA-INT-006 | Free integration of further digital services via open APIs | **Should** | As the functional owner, I want to plug in new services so that the MP becomes a platform for follow-up use cases. | BBL Campus | Use Case Landing Page V2.0 | Coordinate the architecture decision with the Buy/standard-platform option. |
| NFA-INT-007 | Optional SAP Fiori / SAP Work Zone compatibility for SAP-driven use cases | **Could** | As an architect, I want to embed Fiori apps or Work Zone components so that SAP-native functions remain usable without breaks. | BIT; BBL PFM | [LBC Mieterportal_ Draft.md](BBL%20Requierements/intermediate/LBC%20Mieterportal_%20Draft.md) §I (Solution architecture MP per use case Fiori SAP / Other); [SUPERB_Fachkonzept Work Zone V06](BBL%20Requierements/intermediate/SUPERB_Fachkonzept_ERP_IMMO_Work%20Zone_V06.md) | Pilot Create variant skips this — relevant for later SAP-centric use cases. |

### 3.4 Hosting & platform (`NFA-PLT-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-PLT-001 | Target platform for the pilot: **RHOS (Red Hat OpenShift)** | **Must** | As an architect, I want a standardized platform stack so that BIT operations and security processes can integrate with it. | BIT | Systemkonzept §2.1.11; Lösungsarchitektur §3.0 | Decision based on the variant comparison (Create recommendation). |
| NFA-PLT-002 | Operations by the IT service provider (BIT) | **Must** | As BBL, I want operations to be run by the LE so that the functional office is relieved and SLA capability is given. | BBL Campus; BIT | Use Case Gesamt §Description; Systemkonzept §2.1.13 | Pure self-service model is not envisaged. |
| NFA-PLT-003 | Data storage: database for process, status, and log data (application, processing state, approval decision) | **Must** | As operations, I want to persist application data so that resumption and analyses are possible. | BIT (operations) | Systemkonzept §2.1.11 | RHOS service. |
| NFA-PLT-004 | Object storage for uploads/evidence (cost-effectiveness, legal basis, PDFs) | **Must** | As operations, I want large files stored separately from the application DB so that performance and backup strategies hold. | BIT (operations) | Systemkonzept §2.1.11 | — |
| NFA-PLT-005 | Lifecycle / release / patch / operations documentation | **Must** | As operations, I want clear release/patch processes so that the service remains maintainable. | BIT (operations) | Systemkonzept §2.1.13 (points operations and responsibility) | — |
| NFA-PLT-006 | Avoid a "customizing spiral" (in case the Buy variant is chosen) | **Should** | As an architect, I want to prefer standard features over customizing so that maintainability and cost stay controllable. | BIT; BBL Campus | Systemkonzept §2.1.10 (Buy risks) | Relevant for a later platform phase, not for the pilot Create. |

### 3.5 Compliance, law & data sovereignty (`NFA-COMP-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-COMP-001 | **Data sovereignty at BBL** | **Must** | As BBL, I want unrestricted control over the data held in the MP so that sovereignty is preserved. | BBL Campus | Use Case Gesamt §Acceptance criteria | — |
| NFA-COMP-002 | Compliance with federal security/data-protection requirements | **Must** | As a compliance officer, I want the MP to be DSG/ISG/BLV compliant so that no legal risk arises. | Compliance; BBL Campus | Systemkonzept §2.1.10 (Buy point "Cloud/Environment fit & Governance"); §2.1.13 | DSG = Federal Data Protection Act; ISG = Information Security Act. |
| NFA-COMP-003 | Traceability of every decision (duty to justify approvals/rejections) | **Must** | As an administrative lawyer, I want every decision to be justified in writing so that administrative procedure law is followed. | Compliance; GS | Use Case Bedarf V2.1 (extension) | Cf. NFA-SEC-005 (audit trail). |
| NFA-COMP-004 | Cost-effectiveness of the implementation (proof of cost/benefit) | **Must** | As BBL/Confederation, I want effort and benefit to stand in an economically justified ratio so that federal funds are used purposefully. | BBL Campus; GS | Use Case Gesamt §Acceptance criteria; Use Case Landing Page §Acceptance criteria | — |
| NFA-COMP-005 | Build-up in functional building blocks, each self-contained | **Should** | As programme management, I want building blocks to be independently deliverable so that benefit appears early and risks stay small. | BBL Campus | Use Case Gesamt §Acceptance criteria | Pilot = first building block. |
| NFA-COMP-006 | Functional owner accountability defined for all content (functional operations concept) | **Must** | As compliance/programme management, I want clear ownership for content so that currency and correctness are assigned. | BBL Campus | Use Case Bedarf §Acceptance criteria; Use Case Landing Page (Note) | — |
| NFA-COMP-007 | Coverage of VILB task clusters (budget/cost, accommodation, supply, other) in the roadmap | **Should** | As BBL, I want every legally mandated task per VILB present in the MP roadmap so that the mandate is complete. | BBL Campus | Mieterportal Gesamtkonzept §1.1.3 (VILB table); LBC §II | Pilot primarily addresses "accommodation / demand / application". |
| NFA-COMP-008 | EMBAG Art. 9 — publication of in-house developments as Open Source by Default | **Could** | As Federal Administration, I want in-house developments published under OSS so that EMBAG Art. 9 is honoured. | Compliance | Market screening §EMBAG; not explicit in the Fachkonzept | For the Create variant (in-house development) to be checked — license / security / third-party rights. |
| NFA-COMP-009 | Compliance with **Directive W010 V1.0 "Architecture Principles"** of the DTI Division (based on Art. 40 DigiV) | **Must** | As BBL/Federal Administration, I want the MP to follow the 7 architecture principles (Digital First, Once-Only Data Collection, Prudent Interoperability, Comprehensive Inclusion, Transparent Public-Authority Interaction, Accessible Public Services, Authentic Trustworthiness) so that interoperability and user acceptance are structurally ensured. | DTI (directive binding for the central Federal Administration) | [W010 V1.0 (PDF)](https://www.bk.admin.ch/dam/bk/de/dokumente/dti/Vorgaben/WeisungendesDelegiertenDTI/W010%20V1.0%20Architekturprinzipien.pdf.download.pdf/W010%20V1.0%20Architekturprinzipien.pdf); local copy [intermediate/W010 Architekturprinzipien.md](BBL%20Requierements/intermediate/W010%20Architekturprinzipien.md) | Scope "central Federal Administration" includes BBL. Deviations must be "decided at department/directorate level" and substantively justified. Implementation mapping see §3.A. |
| NFA-COMP-010 | Alignment with the **SB011 ICT Strategy of the Federal Administration** (strategic thrusts) | **Should** | As BBL, I want the MP to support the strategic pillars of federal ICT (AGOV as central login, open standards, resilience, user-centric automation, …) so that the initiative stays aligned with federal strategy. | DTI (strategic) | [SB011 ICT Strategy](https://www.bk.admin.ch/bk/de/home/digitale-transformation-ikt-lenkung/vorgaben/sb011-ikt-strategie.html) | Internal tool — strategy as guardrail, not a rigid compliance duty. AGOV aspect see OP-3 (migration path eIAM→AGOV). |
| NFA-COMP-011 | Consideration of further DTI directives (W001…W0nn, SB000…SB0nn) in the architecture review | **Could** | As an architect, I want to systematically reconcile the DTI directive catalog in the review so that no binding detail directives are missed. | DTI | [Overview of DTI directives](https://www.bk.admin.ch/bk/de/home/digitale-transformation-ikt-lenkung/vorgaben.html) | Depth of detail proportional to the tool's nature (internal) — the architecture review makes the cut. |
| NFA-COMP-012 | Auditability by the responsible department (VILB Art. 9 lit. d) | **Must** | As the department to which a BLO reports, I want to order audits across all projects and processes of real-estate management so that oversight is possible. | EFD / Department | [LBC Mieterportal_ Draft.md §VILB tasks](BBL%20Requierements/intermediate/LBC%20Mieterportal_%20Draft.md); [VILB Art. 9](https://www.fedlex.admin.ch/eli/cc/2008/857/de#art_9) | Audit authority = read access to data, logs, configurations for the audit role. ETH real-estate portfolio: EFD is responsible. |

### 3.6 UX, usability & language (`NFA-UX-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-UX-001 | Self-explanatory operation without training | **Must** | As an occasional user, I want to operate the portal without training so that it actually gets used. | Workshop WS1 | Use Case Landing Page V2.0; Use Case Gesamt | — |
| NFA-UX-002 | Clear navigation, clear role guidance | **Must** | As a tenant, I want to see at a glance what belongs to my role so that I do not scroll through unrelated sections. | Workshop WS1 | Use Case Landing Page V2.0 | — |
| NFA-UX-003 | Responsive design (mobile-capable for anonymous/public content) | **Should** | As a mobile user, I want to read public content on the move so that I am not tied to a PC. | Workshop WS1 | Use Case Landing Page V2.0 | Mobile maturity for authenticated areas to be assessed separately. |
| NFA-UX-004 | Defined quality requirements per content item: source, contact person, currency | **Must** | As a tenant, I want to recognize where information comes from and how current it is so that I develop trust. | Workshop WS1; BBL Campus | Use Case Landing Page V2.0 | Cf. FUNC-LP-009. |

*(Multilingualism DE/FR/IT and accessibility eCH-0059/WCAG 2.1 AA see §3.8 NFA-CD-003/-004 — kept as federal CD requirements, not duplicated in the UX section.)*

### 3.7 Data, retention & reporting (`NFA-DATA-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-DATA-001 | Data-protection-compliant anonymization for aggregated reports | **Must** | As compliance, I want reports never to identify individuals so that DSG requirements are met. | Compliance; BBL Campus | Use Case Bedarf §last paragraph | Cf. FUNC-REP-001. |
| NFA-DATA-002 | Retention periods for application documents and audit data per Federal Archive rules | **Must** | As records management, I want clear retention periods known so that statutory duties are met. | Compliance | Not explicit in the sources; federal default | To be specified in coordination with the Federal Archive / GEVER. |
| NFA-DATA-003 | Data storage in Switzerland (data residency) | **Should** | As BBL/Confederation, I want data to be held on Swiss soil so that sovereignty is real. | BBL Campus; Compliance | Not explicit; implied by RHOS-in-BIT operations | RHOS operations in the BIT data centre implicitly satisfy this; confirm explicitly at acceptance. |
| NFA-DATA-004 | Logging with correlation ID across frontend, backend, and SAP handover | **Should** | As operations, I want to trace incidents end-to-end so that errors are quick to address. | BIT (operations) | Systemkonzept §2.1.9 (Buy point "Logging/Audit Trail"); §2.1.12 (Create) | — |

### 3.8 Swiss Federal Corporate Design & Web Guidelines (`NFA-CD-*`)

| ID | Requirement | Priority | User story | Requested by | Source | Note |
|---|---|---|---|---|---|---|
| NFA-CD-001 | Use of the **Swiss Federal Design System** (HTML structures, CSS assets, design elements) | **Must** | As a tenant, I want the MP to look and behave like other federal offerings so that I recognize it as an official government tool and can use it without re-learning. | Federal Chancellery | [github.com/swiss/designsystem](https://github.com/swiss/designsystem) (MIT licence, maintained by the Federal Chancellery; Storybook + Nuxt + Figma library) | Internal tool — minimum implementation: typographic tokens, colours, base component set, Swiss coat of arms / federal brand. Web Components or Nuxt integration depending on the frontend stack. |
| NFA-CD-002 | Compliance with the **Federal Web Guidelines** (operation, labelling, and language standards of the Federal Administration) | **Must** | As a tenant, I want to find labels, icons, and interaction patterns I already know from other federal offerings so that the operation stays intuitive. | Federal Chancellery | publiccode.yml in the Design System (feature "Web Guidelines Bund"); see also [bk.admin.ch › Vorgaben](https://www.bk.admin.ch/bk/de/home/digitale-transformation-ikt-lenkung/vorgaben.html) | Delivered together with the Design System. |
| NFA-CD-003 | Multilingualism in the **three official languages DE / FR / IT** | **Should** | As a French- or Italian-speaking tenant, I want to use the MP in my official language so that communication and legal certainty are ensured. | EDA; all FR/IT VEs; Compliance (Languages Act) | Implicit in federal language law; Use Case Landing Page §UX requirements | EN only on explicit need (e.g. EDA missions abroad). Consolidates the former NFA-UX-004 (multilingualism). |
| NFA-CD-004 | Accessibility per eCH-0059 / WCAG 2.1 AA | **Must** | As a person with disabilities, I want to use the MP fully so that inclusion and statutory requirements are met. | Compliance; Federal Chancellery | [eCH-0059](https://www.ech.ch/) (federal accessibility standard); WCAG 2.1 AA | Consolidates the former NFA-UX-005 (accessibility); W010 §2.4 "Comprehensive Inclusion" requires this structurally. Internal tool: AA is the federal minimum. |

---

## 3.A Mapping W010 architecture principles → MP implementation

The seven architecture principles from [W010 V1.0](BBL%20Requierements/intermediate/W010%20Architekturprinzipien.md) §2 are anchored in this catalog as follows:

| W010 principle | Implemented in the MP via | Note |
|---|---|---|
| **2.1 Digital First** | FUNC-LP-001 (SPOC), FUNC-AU-001 ff. (digital application submission), FUNC-PFM-001 (direct SAP handover) | Replacing phone/e-mail/PDF/Excel is an explicit pilot goal. |
| **2.2 Once-Only Data Collection** | FUNC-AU-012 (auto-derivation WE/building from address), FUNC-AU-001 (auto-role assignment), NFA-INT-001 (ePPM handover without re-entry) | Auto-derivation from GWR/EGID (OP-7) strengthens the principle. |
| **2.3 Prudent Interoperability** | NFA-INT-001 through -006 (open interfaces, BIT WSG, APIs), NFA-COMP-010 (SB011 open standards) | I14Y / eCH conformance to be assessed later. |
| **2.4 Comprehensive Inclusion** | NFA-CD-004 (eCH-0059 / WCAG 2.1 AA), NFA-CD-003 (DE/FR/IT) | Federal minimum level for internal applications. |
| **2.5 Transparent Public-Authority Interaction** | FUNC-INB-001/-002 (Inbox + status tracking), FUNC-FG-003 (duty to justify), NFA-SEC-005 (audit trail) | The applicant sees state and reasoning at any time. |
| **2.6 Accessible Public Services** | FUNC-LP-001 (SPOC), FUNC-LP-008 (responsive), NFA-IAM-001 (eIAM), NFA-CD-* | Pilot scope is internal; public AGOV access see OP-3. |
| **2.7 Authentic Trustworthiness** | NFA-SEC-001 through -005 (WAF, secrets, malware, ISG classification, audit trail), NFA-COMP-001 (data sovereignty), NFA-COMP-003 (traceability) | Source attribution / currency per content item (FUNC-LP-009) further strengthens trust. |

---

## 4. Roadmap use cases (beyond the pilot)

These use cases are not part of the pilot, but are documented so that
architecture and data model remain pilot-compatible. Sources: [Mieterportal Gesamt V2.1](BBL%20Requierements/intermediate/Mieterportal%20Gesamt%20V2.1.md)
§Description; [Mieterportal_ Vision](BBL%20Requierements/intermediate/Mieterportal_%20Vision.md);
[LBC Mieterportal_ Draft](BBL%20Requierements/intermediate/LBC%20Mieterportal_%20Draft.md) §III.

### 4.1 Case A — SUPERB base services (`REQ-FA-*`)

| ID | Use case | Priority | Requested by | Source | Note |
|---|---|---|---|---|---|
| REQ-FA-001 | Business sheets — project execution | **Should** | BBL PFM | Mieterportal Gesamt V2.1 §Case A | — |
| REQ-FA-002 | Graphical representation of furnishings including main information | **Could** | BBL Campus; Workshop WS1 | Mieterportal Gesamt V2.1 §Case A | Map / plan view. |
| REQ-FA-003 | Occupancy planning tool (Info App FLM, self-service) | **Should** | BBL Campus | Mieterportal Gesamt V2.1 §Case A; LBC §Use Case 1; Superb_QuickHelp_FLM_INFO | FLM = Floor-space management. |
| REQ-FA-004 | Inventory management tool for furnishings | **Could** | BBL Campus; BBL Supply | Mieterportal Gesamt V2.1 §Case A | Work in progress in WSM. |
| REQ-FA-005 | Notification of repair needs / faults (on a map, captured in the MP) | **Should** | Workshop WS1; BBL Campus | Mieterportal Gesamt V2.1 §Case A; LBC §Use Case 2 | Ticketing tool — MP0100/MP0200 variants described in LBC. |
| REQ-FA-006 | Notification of move/transport needs / special cleaning | **Could** | BBL Campus | Mieterportal Gesamt V2.1 §Case A | — |
| REQ-FA-007 | Furnishing shop (standard + special) | **Could** | BBL Campus; BBL Supply | Mieterportal Gesamt V2.1 §Case A | Marketplace function, work in progress. |

### 4.2 Case B — independent of SUPERB (`REQ-FB-*`)

| ID | Use case | Priority | Requested by | Source | Note |
|---|---|---|---|---|---|
| REQ-FB-001 | Portfolio strategy (projects, maintenance measures, disposals — map view) | **Could** | BBL Campus | Mieterportal Gesamt V2.1 §Case B | Implementation in the GIS portal to be examined. |
| REQ-FB-002 | KPIs per object — interactive capture (consumption, number of workstations) | **Could** | BBL Campus; BBL PFM | Mieterportal Gesamt V2.1 §Case B | Implementation in the GIS portal to be examined. |

### 4.3 Case C — strategic approval required (`REQ-FC-*`)

| ID | Use case | Priority | Requested by | Source | Note |
|---|---|---|---|---|---|
| REQ-FC-001 | Incident information (crisis communication) | **Won't** (Pilot) | BBL Campus; security/crisis staff | Mieterportal Gesamt V2.1 §Case C | Strategic approval required. |
| REQ-FC-002 | Digital training on collaboration roles | **Could** | BBL Campus | Mieterportal Gesamt V2.1 §Case C | — |
| REQ-FC-003 | Directives / ordinances / guidelines | **Won't** (Pilot) | BBL Campus | Mieterportal Gesamt V2.1 §Case C | To be delivered on the public internet. |

---

## 5. Open points and gaps

| # | Point | Source | Recommended clarification |
|---|---|---|---|
| OP-1 | ISG classification (internal / not classified / confidential) not filled in | Fachkonzept NEW V05 §Classification | Clarify with the ISBO before the pilot architecture decision. |
| OP-2 | §4.1.2 Workflow, §4.1.4 Form, §4.1.5 Interface, §4.1.6 Reporting are template placeholders in V05 | Fachkonzept NEW V05 | Assign chapter owners; detailed specification before implementation start. |
| OP-3 | AGOV vs. eIAM for tenant login: the pilot uses eIAM (BIT) — a later public-tenant scope needs AGOV. | Systemkonzept §2.1.12 (Create); Market screening §I (AGOV) | Decide target state; note migration path eIAM → AGOV. |
| OP-4 | The "BBL PFM requester" (as of 2025-11-04) is referenced; names only visible in the solution-architecture annex | Fachkonzept NEW V05 §4.1.1.3 | List the PFM representatives (Holger Ludwig, …) and clarify the Requester column. |
| OP-5 | Visio source "20251104 Anforderungen Mieterportal PFM.vsdx" could not be converted automatically (OCR returned empty) | [intermediate/_index.md](BBL%20Requierements/intermediate/_index.md) §Failed | Re-export from Visio with text-as-vector, or re-convert with `easyocr`. |
| OP-6 | Multilingualism DE/FR/IT and accessibility eCH-0059 not specified in the source material | NFA-CD-003, NFA-CD-004 | Clarify with BIT/Compliance and add formally to acceptance criteria. |
| OP-7 | Retention periods and GEVER integration not described | NFA-DATA-002 | Coordinate with the Federal Archive / Records Management. |
| OP-8 | NAW factor and PFM building categories as master data — maintenance process open | FUNC-AU-004, FUNC-AU-014/015 | Define master-data maintenance responsibility (BBL PFM?). |
| OP-9 | Allocation of "responsible BBL roles" after VE selection — explicit list missing | FUNC-AU-001; Use Case Bedarf | Coordinate with BBL PFM (Holger Ludwig). |
| OP-10 | Reporting selection / layout / drilldown specification missing | Fachkonzept NEW V05 §4.1.6 | Specify detail reports with BBL Campus and PFM. |
| OP-11 | Concrete integration depth of the Federal Design System (component set, theming, release cadence) | NFA-CD-001 | Coordinate with frontend stack and Federal Chancellery maintenance cycle (Storybook/Nuxt components or pure CSS tokens). |
| OP-12 | Availability / SLA targets (uptime, RTO, RPO) | Not in the source material | Define an SLA with BIT as the service provider — typically 99.5% during office hours is sufficient for an internal tool. |

---

## 6. Glossary (excerpt)

| Term | Meaning |
|---|---|
| **AGOV** | Federal login for public users (successor to CH-LOGIN) |
| **BBL** | Bundesamt für Bauten und Logistik — Swiss Federal Office of Buildings and Logistics |
| **BBL Campus** | Functional office within the BBL — owner of the tenant portal |
| **BBL PFM** | Portfolio Management of the BBL |
| **BIT** | Bundesamt für Informatik und Telekommunikation — federal IT service provider |
| **BLO** | Bau und Liegenschaftsorgane des Bundes — federal building and real-estate organs |
| **CD Bund** | Corporate Design of the Swiss Federal Administration (see github.com/swiss/designsystem) |
| **DBP** | Datenbezugspunkt — federal source of organizational/functional attributes |
| **DigiV** | Ordinance on Digital Services and Digital Transformation in the Federal Administration (SR 172.019.1) |
| **DTI** | Digital Transformation and ICT Steering division (Federal Chancellery) |
| **EDA** | Eidgenössisches Departement für auswärtige Angelegenheiten — Federal Department of Foreign Affairs (FDFA) |
| **EFD** | Eidgenössisches Finanzdepartement — Federal Department of Finance |
| **eIAM** | Federal IAM for internal / administrative applications |
| **ePPM / PPM** | SAP Enterprise Portfolio and Project Management |
| **GS** | Generalsekretariat (departmental) — the assessing and approving authority |
| **HNF / HNF2** | Hauptnutzfläche (main usable area, per SIA 416) |
| **ILBO** | Logistikbeauftragte — logistics officer of a VE / application-submitting role |
| **ISG** | Informationssicherheitsgesetz — federal Information Security Act |
| **LE** | Leistungserbringer — service provider (here: BIT) |
| **MP** | Mieter-/Serviceportal — tenant/service portal |
| **NAW** | Factor for floor-space calculation based on working-style forms |
| **PFM categories** | Building categorization used by Portfolio Management |
| **RHOS** | Red Hat OpenShift |
| **SPOC** | Single Point of Contact |
| **SB011** | Strategic directive SB011 "ICT Strategy of the Federal Administration" (DTI) |
| **SUPERB** | BBL's S/4HANA programme (cut-over September 2023) |
| **UK costs** | Unterbringungskosten — accommodation costs |
| **VE** | Verwaltungseinheit — administrative unit (departments, federal offices) |
| **VILB** | Verordnung über das Immobilienmanagement und die Logistik des Bundes — federal real-estate and logistics ordinance |
| **W010** | Directive W010 V1.0 "Architecture Principles" of the DTI |
| **WAF** | Web Application Firewall |
| **WCAG** | Web Content Accessibility Guidelines (W3C); federal minimum AA |
| **WS** | Workstation (Arbeitsplatz, AP) |
| **WSG** | BIT Webservice Gateway |
| **eCH-0059** | Swiss accessibility standard for e-government |
| **eCH-0279** | Architecture Vision 2050 (basis for W010) |

---

## 7. Version history of this document

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 2026-05-18 | Claude + David Rasner | Initial version. Consolidated from 22 source documents in `docs/BBL Requierements/`. Pilot scope prioritized. Roadmap (Case A/B/C) as Should/Could/Won't. |
| 0.2 | 2026-05-18 | Claude + David Rasner | Added NFA-COMP-009 (W010 architecture principles), NFA-COMP-010 (SB011), NFA-COMP-011 (further DTI directives), NFA-COMP-012 (VILB audit), NFA-INT-007 (Fiori / Work Zone option), §3.8 Federal CD (NFA-CD-001…-004), §3.A mapping W010 → MP. UX-004/-005 consolidated into §3.8. Glossary (CD Bund, DigiV, DTI, SB011, W010, WCAG, eCH-0059, eCH-0279). OP-11/-12. |
| 0.3 | 2026-05-18 | Claude + David Rasner | Translated to English (content and intent preserved; IDs, source paths, and hyperlinks unchanged). Source documents kept in their original German; this catalog is the English consolidated layer above them. |
