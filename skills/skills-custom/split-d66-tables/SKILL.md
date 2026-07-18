---
name: split-d66-tables
description: Use when a Markdown file (typically converted from a PDF via Docling) contains merged d66 tables — one table with 3 stacked column-pairs (headers "1|2", "3|4", "5|6") that need to become 6 separate named tables.
allowed-tools:
  Bash(python3:*)
  Read
  Edit
  Grep
when_to_use: Use when the user asks to "popraw tabele d66", "napraw scalone tabele", "podziel tabelę na sekcje 1-6", or when a Markdown file produced by converting a PDF (e.g. via Docling) has a table representing a d66 roll-table (two six-sided dice: first die picks a group of 6, second die picks a result) that Docling rendered as one merged table with repeated numeric header rows ("1 | 2", "3 | 4", "5 | 6") instead of 6 separate tables.
argument-hint: "<path-to-markdown-file>"
arguments:
  - file_path
---

# Split d66 Tables

Converts a merged d66 markdown table (3 stacked column-pairs) into 6 separate,
named tables — one per die-group (1 through 6), each with `Roll | Result` columns.

## Inputs
- `file_path`: Path to the Markdown file containing the merged table(s) to fix.

## Goal
Every d66 table in `file_path` ends up as 6 individual tables, each headed
`### N` (N = 1..6), with columns `Roll | Result` and 6 rows. Content must match
the source exactly (verify against the original PDF if available) — only the
table's shape changes, not the text.

## Steps

### 1. Pre-check for missing spaces in merged cells

Docling sometimes drops the space between a row number and a following word
that starts with a capital letter (e.g. a source cell "2 A powerful, old local
family" becomes "2A powerful, old local family" in the markdown). The splitter
script's cell parser requires `<number><space><text>`, so any cell missing that
space causes the whole table block to be skipped silently.

Run this before invoking the script:
```bash
grep -nE '\|[[:space:]]*[0-9][A-Za-z]' "<file_path>"
```
For every match, fix the cell in place (Edit tool) to restore the missing
space, e.g. `2A new dance` → `2 A new dance`. Re-run the grep until it returns
nothing.

**Success criteria**: The grep pattern returns no matches in `file_path`.

### 2. Dry run the splitter

```bash
python3 execution/split_d66_tables.py "<file_path>" --dry-run
```
This prints `converted N table block(s), skipped M (...)` to stderr-ish
(actually stdout via print) and writes the full transformed file content to
stdout. Redirect stdout to a scratch file to inspect it.

Check that:
- `converted` count matches the number of d66 tables you expect to fix (tables
  already in `### N` form, or non-d66 tables, are correctly reported as
  "skipped").
- Spot-check a few of the newly generated `### N` tables against the original
  PDF or raw extracted text (e.g. via `pypdf`) to confirm no rows were dropped,
  merged, or misordered.

**Success criteria**: Converted count matches expectation; spot-checked tables
match the source content exactly.

**Human checkpoint**: Show the user the dry-run diff/summary before writing.
Only proceed to step 3 once they're satisfied.

### 3. Apply for real

```bash
python3 execution/split_d66_tables.py "<file_path>"
```
This overwrites `file_path` in place (only touches blocks it could convert;
non-matching blocks are left untouched).

**Success criteria**: File saved; re-running step 2's dry-run afterwards
reports 0 newly-converted blocks (everything is already in `### N` form).

## Notes / Gotchas
- The script (`execution/split_d66_tables.py`) handles two shapes Docling
  produces: one contiguous table block with the 3 group-header rows embedded
  as body rows, and three separate table blocks (one per column-pair)
  separated by blank lines with inconsistent/missing/misplaced separator rows.
- If a table still isn't converted after fixing missing spaces, check for
  other malformed cells (e.g. a cell that isn't `<number> <text>`, or a header
  row that isn't exactly 2 numeric cells) — the script fails closed (leaves
  the block untouched) rather than guessing.
- The script is idempotent: tables already split into `### N` form don't match
  the merged-table pattern, so they're safely skipped on re-runs.
