#!/usr/bin/env python3
"""Build page-scoped replacements for the Fear of the Unknown table PDF."""

from __future__ import annotations

import csv
import importlib.util
import json
import re
import sys
from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "PDF_input/FearOfTheUnknown/fotu_only_tables.pdf"
SOURCE_CSV = ROOT / "PDF_input/FearOfTheUnknown/fotu_d66_tables.csv"
TARGET_CSV = ROOT / "PDF_input/FearOfTheUnknown/PL/fotu_d66_tabele_PL.csv"
POLSKA90_CSV = (
    ROOT
    / "PDF_input/FearOfTheUnknown/PL/"
    "fotu_d66_tabele_PL_miasteczko_PL90_poprawka.csv"
)
TOWN_EN = ROOT / "PDF_input/FearOfTheUnknown/fotu_CREATION_1_town.md"
TOWN_PL = ROOT / "PDF_input/FearOfTheUnknown/PL/3_fotu_CREATION_1_town.md"
CHAR_EN = ROOT / "PDF_input/FearOfTheUnknown/fotu_CREATION_2_character.md"
CHAR_PL = ROOT / "PDF_input/FearOfTheUnknown/PL/4_fotu_CREATION_2_character.md"
OUTPUT = ROOT / "tmp/pdfs/fotu_only_tables_uniform_Polska90_replacements.json"
SKILL_SCRIPT = Path(
    "/Users/marek/.codex/skills/replace-pdf-text/scripts/pdfreplace.py"
)

PAGE_QUESTION = {
    1: ("town", 1),
    2: ("town", 2),
    3: ("town", 3),
    4: ("town", 4),
    7: ("character", 1),
    8: ("character", 3),
    9: ("character", 4),
    10: ("character", 5),
    11: ("character", 6),
    12: ("character", 7),
    13: ("character", 8),
    14: ("character", 10),
    15: ("character", 11),
    16: ("character", 13),
    17: ("character", 14),
    18: ("character", 15),
    19: ("character", 16),
}

PDF_TEXT_OVERRIDES = {
    (2, "Who's someone that everyone in town knows or at least knows of?"):
        "Who’s someone that everyone in town knows - or at least knows of?",
    (2, "The 'Tough Guy'"): "The “Tough Guy”",
    (3, "The 'bad' neighborhood"): "The “bad” neighborhood",
    (8, "I'm 'out' of the mafia"): "I’m “out” of the mafia",
    (14, "I 'don't' have an addiction"): "I “don’t” have an addiction",
}

def load_skill():
    spec = importlib.util.spec_from_file_location("pdfreplace", SKILL_SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


PDFREPLACE = load_skill()


def read_csv(path: Path, delimiter: str = ",") -> list[list[str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.reader(handle, delimiter=delimiter))


def polska90_title(raw_heading: str) -> str:
    if ":" in raw_heading:
        return raw_heading.split(":", 1)[1].strip()
    if "-" in raw_heading:
        return raw_heading.split("-", 1)[1].strip()
    return raw_heading.strip()


def clean_candidate(line: str) -> str | None:
    value = line.strip()
    if (
        not value
        or value.startswith("<!--")
        or value.startswith("### ")
        or value.startswith("|")
        or re.fullmatch(r"\d+", value)
    ):
        return None
    if value.startswith("## "):
        value = value[3:].strip()
    return value or None


def numbered_section(path: Path, question: int) -> list[str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    marker = f"## {question}"
    start = next(i for i, line in enumerate(lines) if line.strip() == marker)
    end = len(lines)
    for i in range(start + 1, len(lines)):
        if re.fullmatch(r"## \d+", lines[i].strip()):
            end = i
            break
    return [
        candidate
        for line in lines[start + 1 : end]
        if (candidate := clean_candidate(line)) is not None
    ]


def named_section(path: Path, heading: str, end_heading: str | None = None) -> list[str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    marker = f"## {heading}"
    start = next(i for i, line in enumerate(lines) if line.strip() == marker)
    end = len(lines)
    if end_heading is not None:
        end_marker = f"## {end_heading}"
        end = next(
            i for i in range(start + 1, len(lines)) if lines[i].strip() == end_marker
        )
    return [
        candidate
        for line in lines[start:end]
        if (candidate := clean_candidate(line)) is not None
    ]


def line_entries(page: fitz.Page) -> list[tuple[str, fitz.Rect]]:
    entries: list[tuple[str, fitz.Rect]] = []
    for block in page.get_text("dict", sort=False).get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = "".join(span.get("text", "") for span in line.get("spans", [])).strip()
            if text:
                entries.append((text, fitz.Rect(line["bbox"])))
    return entries


def exact_text_occurrence(page: fitz.Page, old: str) -> int:
    normalized_old = PDFREPLACE.normalize_text(old)
    candidates: list[fitz.Rect] = []
    for text, rect in line_entries(page):
        if PDFREPLACE.normalize_text(text) == normalized_old:
            candidates.append(rect)
    for block in page.get_text("dict", sort=False).get("blocks", []):
        if block.get("type") != 0:
            continue
        text = " ".join(
            span.get("text", "")
            for line in block.get("lines", [])
            for span in line.get("spans", [])
        ).strip()
        if PDFREPLACE.normalize_text(text) == normalized_old:
            candidates.append(fitz.Rect(block["bbox"]))

    matches = PDFREPLACE.locate_matches(page, old)
    if len(matches) == 1:
        return 1
    for candidate in candidates:
        for occurrence, match in enumerate(matches, start=1):
            rect = fitz.Rect(match.bbox)
            if (
                abs(rect.y0 - candidate.y0) < 1.0
                and abs(rect.y1 - candidate.y1) < 1.0
                and candidate.contains(rect)
            ):
                return occurrence
    raise RuntimeError(
        f"Niejednoznaczny tekst {old!r}: {len(matches)} dopasowań, "
        f"{len(candidates)} dokładnych wierszy/bloków"
    )


def append_pair(
    replacements: list[dict[str, object]],
    document: fitz.Document,
    page_number: int,
    old: str,
    new: str,
) -> None:
    old = PDF_TEXT_OVERRIDES.get((page_number, old), old)
    if old == new:
        return
    page = document[page_number - 1]
    matches = PDFREPLACE.locate_matches(page, old)
    if not matches:
        raise RuntimeError(f"Strona {page_number}: nie znaleziono {old!r}")
    occurrence = exact_text_occurrence(page, old)
    replacement: dict[str, object] = {
        "page": page_number,
        "old": old,
        "new": new,
    }
    if len(matches) > 1:
        replacement["occurrence"] = occurrence
    replacements.append(replacement)


def cluster_values(values: list[float], tolerance: float = 0.05) -> list[float]:
    clusters: list[list[float]] = []
    for value in sorted(values):
        if not clusters or abs(value - clusters[-1][-1]) > tolerance:
            clusters.append([value])
        else:
            clusters[-1].append(value)
    return [sum(cluster) / len(cluster) for cluster in clusters]


def table_geometry(lines: list[dict[str, object]]) -> tuple[list[float], list[float]]:
    horizontal_y: list[float] = []
    vertical_x: list[float] = []
    for line in lines:
        start = line["from"]
        end = line["to"]
        assert isinstance(start, list) and isinstance(end, list)
        x0, y0 = (float(value) for value in start)
        x1, y1 = (float(value) for value in end)
        if line["orientation"] == "horizontal" and abs(x1 - x0) > 150:
            horizontal_y.append((y0 + y1) / 2)
        if line["orientation"] == "vertical" and abs(y1 - y0) > 15:
            vertical_x.append((x0 + x1) / 2)
    xs = cluster_values(vertical_x)
    ys = cluster_values(horizontal_y)
    if len(xs) != 3 or len(ys) != 22:
        raise RuntimeError(
            f"Nieoczekiwana geometria tabeli: {len(xs)} granice X, "
            f"{len(ys)} granice Y"
        )
    return xs, ys


def cell_bbox(
    xs: list[float],
    ys: list[float],
    group: int,
    roll: int,
) -> list[float]:
    pair = (group - 1) // 2
    column = (group - 1) % 2
    top_index = 1 + pair * 7 + (roll - 1)
    return [
        round(xs[column], 3),
        round(ys[top_index], 3),
        round(xs[column + 1], 3),
        round(ys[top_index + 1], 3),
    ]


def append_cell(
    replacements: list[dict[str, object]],
    document: fitz.Document,
    page_number: int,
    source: str,
    target: str,
    roll: int,
    bbox: list[float],
) -> None:
    source = PDF_TEXT_OVERRIDES.get((page_number, source), source)
    old = f"{roll} {source}"
    new = f"{roll} {target}"
    page = document[page_number - 1]
    matches = PDFREPLACE.locate_matches(page, old)
    if not matches:
        raise RuntimeError(f"Strona {page_number}: nie znaleziono komórki {old!r}")
    occurrence = exact_text_occurrence(page, old)
    replacement: dict[str, object] = {
        "page": page_number,
        "old": old,
        "new": new,
        "layout_group": "table-values",
        "layout_bbox": bbox,
    }
    if len(matches) > 1:
        replacement["occurrence"] = occurrence
    replacements.append(replacement)


def aligned_extras(page_number: int) -> tuple[list[str], list[str]]:
    if page_number == 5:
        return (
            named_section(TOWN_EN, "Rumours"),
            named_section(TOWN_PL, "Plotki"),
        )
    if page_number == 6:
        return (
            named_section(CHAR_EN, "Creation", "Flowchart"),
            named_section(CHAR_PL, "Tworzenie postaci", "Schemat"),
        )
    family, question = PAGE_QUESTION[page_number]
    if family == "town":
        return numbered_section(TOWN_EN, question), numbered_section(TOWN_PL, question)
    return numbered_section(CHAR_EN, question), numbered_section(CHAR_PL, question)


def main() -> None:
    source_rows = read_csv(SOURCE_CSV)
    target_rows = read_csv(TARGET_CSV)
    polska90_rows = read_csv(POLSKA90_CSV, delimiter=";")
    if (len(source_rows), len(source_rows[0])) != (37, 19):
        raise RuntimeError("Nieoczekiwany rozmiar źródłowego CSV")
    if (len(target_rows), len(target_rows[0])) != (37, 19):
        raise RuntimeError("Nieoczekiwany rozmiar docelowego CSV")
    if (len(polska90_rows), len(polska90_rows[0])) != (37, 19):
        raise RuntimeError("Nieoczekiwany rozmiar CSV Polska90")

    replacements: list[dict[str, object]] = []
    document = fitz.open(PDF)
    inspection = PDFREPLACE.inspect_pdf(PDF, include_lines=True)
    try:
        for page_number in range(1, 20):
            old_extra, new_extra = aligned_extras(page_number)
            if page_number <= 5:
                new_extra[0] = polska90_title(
                    polska90_rows[0][page_number - 1]
                )
            if len(old_extra) != len(new_extra):
                raise RuntimeError(
                    f"Strona {page_number}: różna liczba tekstów dodatkowych "
                    f"({len(old_extra)} != {len(new_extra)})\n"
                    f"EN={old_extra}\nPL={new_extra}"
                )
            for old, new in zip(old_extra, new_extra):
                append_pair(replacements, document, page_number, old, new)

            page_inspection = inspection["pages"][page_number - 1]
            xs, ys = table_geometry(page_inspection["lines"])
            column = page_number - 1
            for row in range(1, 37):
                group = (row - 1) // 6 + 1
                roll = (row - 1) % 6 + 1
                append_cell(
                    replacements,
                    document,
                    page_number,
                    source_rows[row][column],
                    (
                        polska90_rows[row][column]
                        if page_number <= 5
                        else target_rows[row][column]
                    ),
                    roll,
                    cell_bbox(xs, ys, group, roll),
                )
    finally:
        document.close()

    config = {
        "policies": {
            "min_font_scale": 0.3,
            "font_step": 0.1,
            "fail_on_overflow": True,
        },
        "layout_groups": {
            "table-values": {
                "font": "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
                "font_size": {
                    "mode": "uniform_fit",
                    "preferred": 8.0,
                    "minimum": 6.5,
                    "maximum": 8.0,
                    "step": 0.1,
                },
                "align": "left",
                "valign": "middle",
                "padding": {
                    "left": 4,
                    "right": 3,
                    "top": 0.5,
                    "bottom": 0.5,
                },
                "wrap": True,
                "max_lines": 2,
                "line_height": 1.0,
                "overflow": "error",
                "uppercase": False,
                "hyphenation": "none",
                "language": "pl",
            }
        },
        "replacements": replacements,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(config, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Zapisano {len(replacements)} podmian do {OUTPUT}")


if __name__ == "__main__":
    main()
