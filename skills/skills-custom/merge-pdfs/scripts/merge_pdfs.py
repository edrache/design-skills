#!/usr/bin/env python3
"""
merge_pdfs.py - Merge multiple PDF files into one.

Usage:
    python merge_pdfs.py output.pdf file1.pdf file2.pdf file3.pdf
    python merge_pdfs.py output.pdf file1.pdf file2.pdf --list  # just list pages
"""

import sys
import argparse
from pathlib import Path

try:
    from pypdf import PdfWriter, PdfReader
except ImportError:
    try:
        from PyPDF2 import PdfWriter, PdfReader
    except ImportError:
        print("ERROR: pypdf not installed. Run: pip install pypdf", file=sys.stderr)
        sys.exit(1)


def merge_pdfs(output_path: str, input_paths: list[str]) -> dict:
    writer = PdfWriter()
    stats = []

    for pdf_path in input_paths:
        p = Path(pdf_path)
        if not p.exists():
            print(f"ERROR: File not found: {pdf_path}", file=sys.stderr)
            sys.exit(1)
        if not p.suffix.lower() == ".pdf":
            print(f"ERROR: Not a PDF file: {pdf_path}", file=sys.stderr)
            sys.exit(1)

        reader = PdfReader(str(p))
        page_count = len(reader.pages)
        for page in reader.pages:
            writer.add_page(page)
        stats.append({"file": p.name, "pages": page_count})

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    with open(out, "wb") as f:
        writer.write(f)

    total = sum(s["pages"] for s in stats)
    print(f"Merged {len(stats)} files ({total} pages total) -> {out}")
    for s in stats:
        print(f"  {s['file']}: {s['pages']} pages")

    return {"output": str(out), "files": stats, "total_pages": total}


def main():
    parser = argparse.ArgumentParser(description="Merge PDF files into one.")
    parser.add_argument("output", help="Output PDF path")
    parser.add_argument("inputs", nargs="+", help="Input PDF files in desired order")
    args = parser.parse_args()

    merge_pdfs(args.output, args.inputs)


if __name__ == "__main__":
    main()
