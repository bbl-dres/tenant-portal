"""Convert BBL source documents (PDF/DOCX/PPTX/XLSX) to clean Markdown via docling.

Usage:
    python scripts/convert_docs.py
    python scripts/convert_docs.py --dry-run
    python scripts/convert_docs.py --source <dir> --output <dir>
    python scripts/convert_docs.py --force          # re-convert existing outputs

Behavior:
- Walks the source folder for .pdf/.docx/.pptx/.xlsx files.
- Skips files ending in ` (N).<ext>` when a sibling without the suffix exists
  (handles browser-download duplicates like `Foo (1).pdf` next to `Foo.pdf`).
- Skips .vsdx files (docling does not support Visio; export to PDF first).
- Skips files that already have a Markdown output, unless --force is set.
- Uses --image-export-mode placeholder so embedded images become
  `<!-- image -->` markers instead of base64 (which would bloat outputs
  by 10-100x).
- OCR language defaults to de,en.

Note: For PDFs that are pure raster (e.g. Visio exports with screenshots),
default OCR may miss text. For those, invoke docling directly with
--force-ocr and an alternative engine (e.g. --ocr-engine easyocr) since
the bundled RapidOCR engine is CJK-tuned.
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

SUPPORTED_EXTS = {".pdf", ".docx", ".pptx", ".xlsx"}
DUP_RE = re.compile(r" \((\d+)\)$")


def is_dup(path: Path) -> bool:
    """True if path stem ends in ' (N)' AND a sibling without that suffix exists."""
    m = DUP_RE.search(path.stem)
    if not m:
        return False
    sibling = path.with_name(path.stem[: m.start()] + path.suffix)
    return sibling.exists()


def find_sources(source_dir: Path, output_dir: Path, force: bool):
    to_convert: list[Path] = []
    skipped: list[tuple[Path, str]] = []
    for path in sorted(source_dir.iterdir()):
        if not path.is_file() or path.suffix.lower() not in SUPPORTED_EXTS:
            continue
        if is_dup(path):
            skipped.append((path, "duplicate of sibling without (N) suffix"))
            continue
        md_out = output_dir / (path.stem + ".md")
        if md_out.exists() and not force:
            skipped.append((path, f"already converted ({md_out.name})"))
            continue
        to_convert.append(path)
    return to_convert, skipped


def parse_args():
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--source", default="docs/BBL Requierements")
    p.add_argument("--output", default="docs/BBL Requierements/intermediate")
    p.add_argument("--ocr-lang", default="de,en")
    p.add_argument("--force", action="store_true",
                   help="Re-convert files even if a Markdown output exists")
    p.add_argument("--dry-run", action="store_true",
                   help="List what would be converted; do not call docling")
    return p.parse_args()


def main():
    args = parse_args()
    source = Path(args.source)
    output = Path(args.output)
    if not source.is_dir():
        sys.exit(f"Source folder not found: {source}")
    output.mkdir(parents=True, exist_ok=True)

    to_convert, skipped = find_sources(source, output, args.force)

    print(f"Source:  {source}")
    print(f"Output:  {output}")
    print()
    print(f"To convert ({len(to_convert)}):")
    for f in to_convert:
        print(f"  + {f.name}")
    print()
    print(f"Skipped ({len(skipped)}):")
    for f, why in skipped:
        print(f"  - {f.name}    [{why}]")

    if args.dry_run:
        print("\n(dry run — not invoking docling)")
        return 0
    if not to_convert:
        print("\nNothing to convert.")
        return 0

    cmd = [
        "docling",
        "--output", str(output),
        "--image-export-mode", "placeholder",
        "--ocr-lang", args.ocr_lang,
        "--no-abort-on-error",
    ] + [str(f) for f in to_convert]

    print(f"\nRunning docling on {len(to_convert)} file(s)...")
    return subprocess.call(cmd)


if __name__ == "__main__":
    sys.exit(main())
