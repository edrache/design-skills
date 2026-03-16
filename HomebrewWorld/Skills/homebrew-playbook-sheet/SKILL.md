---
name: homebrew-playbook-sheet
description: Create compact black-and-white Homebrew World PDF sheets from Markdown files, either for a single playbook or for all playbooks in a setting merged into one document, with Optional Moves added as a final one-page appendix. Use this skill for printable Homebrew World PDFs, including Polish-language files.
---

# Homebrew Playbook Sheet

This skill turns Homebrew World Markdown files into compact, printable PDF reference sheets. It can render one playbook, or batch-render every playbook in a setting folder, append `Optional_Moves.md` as a final one-page sheet, and merge everything into one PDF.

## Use It For

- Rendering one Homebrew World playbook into a maximum of 2 PDF pages.
- Rendering every playbook in a language folder and merging them into one book PDF.
- Rendering `Optional_Moves.md` as a single-page appendix and placing it at the end of the merged PDF.
- Producing a landscape layout suitable for table use.
- Keeping output black-and-white for cheap, readable printing.
- Handling Polish source files with UTF-8 correctly.
- Creating a repeatable workflow for multiple settings and playbooks.

## Workflow

1. Read the target playbook Markdown file or folder as UTF-8.
2. Generate a dense HTML sheet for each playbook with exactly 2 landscape pages:
   - Page 1: identity, look, backgrounds
   - Page 2: starting moves, advances, drives, gear, sheet area
3. If `Optional_Moves.md` exists, generate a separate black-and-white 1-page sheet for it.
4. Export each HTML file to PDF with Playwright.
5. If working on a folder, merge all playbook PDFs in filename order and place `Optional_Moves.pdf` at the end using `pdfunite`.
6. Verify the final PDFs are 2 pages per playbook and 1 page for optional moves.

## Commands

Run from the repo root:

```bash
python3 HomebrewWorld/Skills/homebrew-playbook-sheet/scripts/render_playbook_sheet.py \
  HomebrewWorld/Settings/Diablo_2/pl/Playbook_Nekromanta.md \
  --output-dir .tmp/nekromanta-sheet

node HomebrewWorld/Skills/homebrew-playbook-sheet/scripts/export_playbook_pdf.mjs \
  .tmp/nekromanta-sheet/Playbook_Nekromanta.html \
  .tmp/nekromanta-sheet/Playbook_Nekromanta.pdf

python3 HomebrewWorld/Skills/homebrew-playbook-sheet/scripts/build_playbook_book.py \
  HomebrewWorld/Settings/Diablo_2/pl \
  --output-dir .tmp/diablo-2-playbooks
```

## Output Rules

- Use landscape A4.
- Use black-and-white styling only.
- Keep the final PDF at 2 pages maximum.
- Keep `Optional_Moves.md` at 1 page maximum.
- Preserve Polish diacritics and source wording unless space pressure requires minor layout-only transformations.
- Prefer compact typography and card layout over removing rules text.
- On merged output, preserve playbook filename order unless the user requests a custom order, and append optional moves last.

## Files

- `scripts/render_playbook_sheet.py`: parses Markdown and creates print HTML.
- `scripts/render_optional_moves_sheet.py`: renders `Optional_Moves.md` into a 1-page print HTML sheet.
- `scripts/export_playbook_pdf.mjs`: exports the HTML to PDF with Playwright.
- `scripts/build_playbook_book.py`: batch-renders all playbooks in a folder and merges them into one PDF.
