# BBL Source Documents — Index

Catalogue of the cleaned Markdown conversions of the internal BBL source
documents in `docs/BBL Requierements/`. The original PDFs/DOCX/PPTX/XLSX are
gitignored; this index and the `*.md` files in this folder are tracked so the
consolidated [REQUIREMENTS.md](../../../REQUIREMENTS.md) (when drafted) can
link back to source content.

**Re-run conversion:** `python scripts/convert_docs.py` from the repo root.

## Legend

- ✅ Good — text-rich, fully captured
- ⚠️ Partial — diagrams / embedded images carry content that was reduced to `<!-- image -->`
- ❌ Failed — no usable output

## Primary requirements sources

| Markdown | Role | Quality |
|---|---|---|
| [SUPERB_Fachkonzept_ERP_IMMO_Mieterportal NEW V05.md](SUPERB_Fachkonzept_ERP_IMMO_Mieterportal%20NEW%20V05.md) | **Authoritative Fachkonzept v0.5** (Product Owner: Heinz Ryter; Holger Ludwig, 10.11.2025). §4 = detailed Fachanforderungen across Workflow / Enhancement / Formular / Schnittstelle / Reporting. | ✅ |
| [Mieterportal Gesamt V2.1.md](Mieterportal%20Gesamt%20V2.1.md) | Master Use Case "Gesamt" — stakeholders, A/B/C case categorisation, acceptance criteria, roadmap. Single dense table. | ✅ |
| [Use Case Bedarf Unterbringung V2.1.md](Use%20Case%20Bedarf%20Unterbringung%20V2.1.md) | Pilot Use Case — form fields, role-based access, SAP ePPM integration spec. | ✅ |
| [Use Case Landing Page V2.0.md](Use%20Case%20Landing%20Page%20V2.0.md) | Use Case for Landing Page / SPOC entry. | ✅ |
| [IMMO_Mieterportal_Systemkonzept.md](IMMO_Mieterportal_Systemkonzept.md) | System concept: Ausgangslage / Anforderungen / Adapt-Buy-Create / Variantenvergleich / Empfehlung. | ✅ |
| [Loesungsarchitektur Pilot Antrag Unterbringung.md](Loesungsarchitektur%20Pilot%20Antrag%20Unterbringung.md) | Pilot architecture: A/B/C variant comparison; recommends **Create** (Eigenentwicklung on RHOS + BIT-Standardservices). | ✅ |
| [Mieterportal Gesamtkonzept.md](Mieterportal%20Gesamtkonzept.md) | Strategic categorisation: Vertraulichkeit, Prozess LC IMMO (rollenbasiert), VILB-Aufgabencluster table. | ⚠️ Diagrams (1.1.1, 1.1.2) lost |

## Use cases / vision / workshop

| Markdown | Role | Quality |
|---|---|---|
| [Mieterportal_ Vision.md](Mieterportal_%20Vision.md) | Vision deck: Architekturskizze, MP Use Cases, Ausblick Mock-up. | ✅ |
| [LBC Mieterportal_ Draft.md](LBC%20Mieterportal_%20Draft.md) | LBC draft: VILB-relevante Aufgaben, Use Case 1 (Info App FLM), Use Case 2 (Schadensmeldung), Roadmap. | ✅ |
| [Mieterportal_ WS Erwartungshaltung Mieter.md](Mieterportal_%20WS%20Erwartungshaltung%20Mieter.md) | Workshop output — tenant expectations. | ✅ |
| [WS 1 Mieterportal Erwartungshaltung.md](WS%201%20Mieterportal%20Erwartungshaltung.md) | Workshop 1 — attendee / stakeholder list (VE × Funktion × Status). | ✅ |
| [Info 170124.md](Info%20170124.md) | Information deck (17.01.2024). | ✅ |
| [Superb_QuickHelp_FLM_INFO.md](Superb_QuickHelp_FLM_INFO.md) | Quick-help for Flächenmanagement (FLM). | ✅ |
| [SBFOLIO-1110 IMMO Mieterportal.md](SBFOLIO-1110%20IMMO%20Mieterportal.md) | Ticket SBFOLIO-1110 — initiative scope. | ✅ |
| [MP_ Gesamtübersicht_sefr20250919.md](MP_%20Gesamtübersicht_sefr20250919.md) | Excel "Gesamtübersicht" — stakeholder / role / roadmap matrix. | ✅ |

## Older / variant versions (kept for diff)

| Markdown | Role |
|---|---|
| [SUPERB_Fachkonzept_ERP_IMMO_Mieterportal 201023.md](SUPERB_Fachkonzept_ERP_IMMO_Mieterportal%20201023.md) | Older Fachkonzept (October 2023). |
| [SUPERB_Fachkonzept_ERP_IMMO_Work Zone_V06.md](SUPERB_Fachkonzept_ERP_IMMO_Work%20Zone_V06.md) | Variant focused on SAP Work Zone (BTP portal layer). |
| [Umfrage Mitwirkung Mieterportal_20092025.md](Umfrage%20Mitwirkung%20Mieterportal_20092025.md) | Survey, 20.09.2025. |
| [Umfrage Mitwirkung Mieterportal_16102025.md](Umfrage%20Mitwirkung%20Mieterportal_16102025.md) | Survey, 16.10.2025 (mostly stakeholder header). |

## Lower-value or partial

| Markdown | Role | Quality |
|---|---|---|
| [Mieterportal Benchmark Fachabstimmung.md](Mieterportal%20Benchmark%20Fachabstimmung.md) | Benchmark / fachliche Abstimmung notes. | ⚠️ Small |
| [Mieterportal Fachkonzept Bedarf.md](Mieterportal%20Fachkonzept%20Bedarf.md) | Fachkonzept Bedarf (small). | ⚠️ Small |

## Failed

| Markdown | Issue | Recovery |
|---|---|---|
| [20251104 Anforderungen Mieterportal PFM (1).md](20251104%20Anforderungen%20Mieterportal%20PFM%20%281%29.md) | Visio export → PDF mixes vector text with screenshots; bundled RapidOCR (CJK-tuned) returned empty for the German image content. Output is `<!-- image -->` only. | (a) `pip install easyocr` and retry with `docling --force-ocr --ocr-engine easyocr ...`; (b) re-export from Visio so all shape text is preserved as vector text, not rasterised; (c) treat as supplementary and rely on the use-case docs. |

## Notes on conversion

- **Image-export mode:** `placeholder` — embedded images become `<!-- image -->`
  markers instead of base64. This keeps Markdown small; the price is that any
  text or data that lived inside a diagram is lost.
- **OCR language:** `de,en`. RapidOCR is CJK-tuned so its German results on
  pure raster content are unreliable; image-heavy PDFs with mostly raster
  pages will need a different engine.
- **Skipped duplicates:** files ending in ` (N).ext` next to a sibling without
  the suffix were skipped (e.g. `Mieterportal Gesamt V2.1 (1).docx`,
  `Use Case Landing Page V2.0 (1).docx`,
  `Mieterportal_ WS Erwartungshaltung Mieter (1).pdf`).
- **Skipped Visio:** `.vsdx` is not supported by docling; the BBL folder
  retains `20251104 Anforderungen Mieterportal PFM (1).vsdx` next to its
  exported PDF for reference only.
