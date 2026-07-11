#!/usr/bin/env python3
"""Export abilities JSON to an Illustrator-friendly CSV data source."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


DEFAULT_COLUMNS = (
    ("NamePL", "name_pl"),
    ("NameEN", "name"),
    ("DescPL", "description_pl"),
    ("DescEN", "description"),
    ("Source", "source"),
    ("Level", "level"),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Convert a JSON array of abilities into a comma-delimited CSV file "
            "for Adobe Illustrator data merge."
        )
    )
    parser.add_argument("input_json", type=Path, help="Path to the source JSON file.")
    parser.add_argument("output_csv", type=Path, help="Path to the output CSV file.")
    return parser.parse_args()


def load_items(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError(f"Expected a JSON array in {path}, got {type(data).__name__}.")
    return data


def validate_headers(columns: tuple[tuple[str, str], ...]) -> None:
    for header, _ in columns:
        if " " in header:
            raise ValueError(
                f"Header {header!r} contains a blank space, which Illustrator does not support."
            )


def export_csv(items: list[dict], output_path: Path) -> None:
    validate_headers(DEFAULT_COLUMNS)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[header for header, _ in DEFAULT_COLUMNS],
            quoting=csv.QUOTE_MINIMAL,
        )
        writer.writeheader()
        for item in items:
            row = {}
            for header, source_key in DEFAULT_COLUMNS:
                value = item.get(source_key, "")
                row[header] = "" if value is None else str(value)
            writer.writerow(row)


def main() -> None:
    args = parse_args()
    items = load_items(args.input_json)
    export_csv(items, args.output_csv)
    print(f"Exported {len(items)} rows to {args.output_csv}")


if __name__ == "__main__":
    main()
