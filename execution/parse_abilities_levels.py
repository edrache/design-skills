"""
Parse abilities_level2_awod.md and produce:
  - abilities_level2_awod.json
  - abilities_level3_awod.json
  - abilities_all_awod.json  (levels 1+2+3 combined)

Polish translations for levels 2/3 are left empty.
name_pl is carried over from abilities_awod.json (level 1).
"""

import json
import re
from pathlib import Path

INPUT_DIR = Path(__file__).parent.parent / "WorldOfDungeons" / "Input"
MD_FILE   = INPUT_DIR / "abilities_level2_awod.md"
L1_FILE   = INPUT_DIR / "abilities_awod.json"
SOURCE    = "AWoD"


def parse_md(md_text: str) -> dict[str, dict[int, str]]:
    """Return {ability_name: {2: description, 3: description}}."""
    abilities: dict[str, dict[int, str]] = {}
    current_name: str | None = None

    for line in md_text.splitlines():
        line = line.strip()

        # Section header  ## Alchemy
        h2 = re.match(r'^##\s+(.+)$', line)
        if h2:
            current_name = h2.group(1).strip()
            abilities[current_name] = {}
            continue

        if current_name is None:
            continue

        # Level 2 / Level 3 entries  **Level 2:** ...
        lv = re.match(r'^\*\*Level\s+(\d)\:\*\*\s+(.+)$', line)
        if lv:
            level = int(lv.group(1))
            desc  = lv.group(2).strip()
            if level in (2, 3):
                abilities[current_name][level] = desc

    return abilities


def build_entry(name: str, name_pl: str, description: str, level: int) -> dict:
    return {
        "name":           name,
        "name_pl":        name_pl,
        "description":    description,
        "description_pl": "",
        "level":          level,
        "source":         SOURCE,
    }


def main():
    md_text = MD_FILE.read_text(encoding="utf-8")
    parsed  = parse_md(md_text)

    l1_entries: list[dict] = json.loads(L1_FILE.read_text(encoding="utf-8"))
    name_pl_map: dict[str, str] = {e["name"]: e.get("name_pl", "") for e in l1_entries}

    level2_list: list[dict] = []
    level3_list: list[dict] = []

    for name, levels in parsed.items():
        name_pl = name_pl_map.get(name, "")
        if 2 in levels:
            level2_list.append(build_entry(name, name_pl, levels[2], 2))
        if 3 in levels:
            level3_list.append(build_entry(name, name_pl, levels[3], 3))

    all_list = l1_entries + level2_list + level3_list

    out2   = INPUT_DIR / "abilities_level2_awod.json"
    out3   = INPUT_DIR / "abilities_level3_awod.json"
    outall = INPUT_DIR / "abilities_all_awod.json"

    out2.write_text(json.dumps(level2_list, ensure_ascii=False, indent=2), encoding="utf-8")
    out3.write_text(json.dumps(level3_list, ensure_ascii=False, indent=2), encoding="utf-8")
    outall.write_text(json.dumps(all_list,   ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Poziom 2: {len(level2_list)} zdolności → {out2.name}")
    print(f"Poziom 3: {len(level3_list)} zdolności → {out3.name}")
    print(f"Wszystkie: {len(all_list)} zdolności  → {outall.name}")


if __name__ == "__main__":
    main()
