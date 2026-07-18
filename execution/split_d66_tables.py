"""Split merged d66 markdown tables (3 stacked column-pairs "1|2", "3|4", "5|6")
into 6 separate named tables ("### N" + a Roll/Result table).

Handles the two shapes Docling produces for these tables:
  - one contiguous table block with the 3 group-header rows embedded as body rows
  - three separate table blocks (one per column-pair) separated by blank lines,
    with inconsistent/missing/misplaced separator rows

Usage:
    python3 execution/split_d66_tables.py <markdown_file> [--dry-run]
"""
import re
import sys


ROW_RE = re.compile(r"^\|(.+)\|$")
CELL_NUM_RE = re.compile(r"^\s*(\d+)\s+(.*\S)\s*$")


def parse_row(line):
    m = ROW_RE.match(line.rstrip("\n"))
    if not m:
        return None
    return [c.strip() for c in m.group(1).split("|")]


def is_separator_row(cells):
    return all(re.fullmatch(r"-+", c) for c in cells)


def is_group_header_row(cells):
    return len(cells) == 2 and all(re.fullmatch(r"\d+", c) for c in cells)


def find_table_blocks(lines):
    """Yield (start, end) exclusive line-index ranges of '|...|' rows, merging
    blocks that are separated only by blank lines."""
    blocks = []
    i = 0
    n = len(lines)
    while i < n:
        if ROW_RE.match(lines[i].rstrip("\n")):
            start = i
            last_row = i
            j = i + 1
            while j < n:
                if ROW_RE.match(lines[j].rstrip("\n")):
                    last_row = j
                    j += 1
                    continue
                if lines[j].strip() == "":
                    k = j
                    while k < n and lines[k].strip() == "":
                        k += 1
                    if k < n and ROW_RE.match(lines[k].rstrip("\n")):
                        j = k
                        continue
                    break
                break
            end = last_row + 1
            blocks.append((start, end))
            i = end
        else:
            i += 1
    return blocks


def try_convert_block(block_lines):
    """Return list of new lines (the 6 named tables) or None if block doesn't match the d66 pattern."""
    content_rows = []
    for l in block_lines:
        if l.strip() == "":
            continue
        row = parse_row(l)
        if row is None:
            return None
        if is_separator_row(row):
            continue
        content_rows.append(row)

    if not content_rows or not is_group_header_row(content_rows[0]):
        return None

    groups = []  # list of (label, [6 result strings])
    idx = 0
    while idx < len(content_rows):
        header = content_rows[idx]
        if not is_group_header_row(header):
            return None
        idx += 1
        data_rows = content_rows[idx: idx + 6]
        if len(data_rows) != 6:
            return None
        idx += 6
        col_a, col_b = [], []
        for r in data_rows:
            if len(r) != 2:
                return None
            ma, mb = CELL_NUM_RE.match(r[0]), CELL_NUM_RE.match(r[1])
            if not ma or not mb:
                return None
            col_a.append(ma.group(2))
            col_b.append(mb.group(2))
        groups.append((header[0], col_a))
        groups.append((header[1], col_b))

    if len(groups) != 6:
        return None

    out = []
    for label, results in groups:
        out.append(f"### {label}\n")
        out.append("\n")
        out.append("| Roll | Result |\n")
        out.append("|---|---|\n")
        for i, text in enumerate(results, start=1):
            out.append(f"| {i} | {text} |\n")
        out.append("\n")
    if out and out[-1] == "\n":
        out.pop()
    return out


def process(path, dry_run=False):
    with open(path, encoding="utf-8") as f:
        lines = f.readlines()

    blocks = find_table_blocks(lines)
    converted = 0
    skipped = 0
    new_lines = []
    last_end = 0
    for start, end in blocks:
        block_lines = lines[start:end]
        replacement = try_convert_block(block_lines)
        new_lines.extend(lines[last_end:start])
        if replacement is not None:
            new_lines.extend(replacement)
            converted += 1
        else:
            new_lines.extend(block_lines)
            skipped += 1
        last_end = end
    new_lines.extend(lines[last_end:])

    print(f"{path}: converted {converted} table block(s), skipped {skipped} (already-converted or non-matching)")
    if not dry_run and converted:
        with open(path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
    elif dry_run:
        sys.stdout.writelines(new_lines)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 split_d66_tables.py <markdown_file> [--dry-run]")
        sys.exit(1)
    dry = "--dry-run" in sys.argv
    target = [a for a in sys.argv[1:] if a != "--dry-run"][0]
    process(target, dry_run=dry)
