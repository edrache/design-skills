import json
from pathlib import Path


INPUT_DIR = Path(__file__).parent.parent / "WorldOfDungeons" / "Input"
INPUT_FILES = [
    INPUT_DIR / "abilities_level1_awod.json",
    INPUT_DIR / "abilities_level2_awod.json",
    INPUT_DIR / "abilities_level3_awod.json",
]
OUTPUT_FILE = INPUT_DIR / "abilities_level1-3_awod.json"


def main() -> None:
    combined: list[dict] = []

    for path in INPUT_FILES:
        entries = json.loads(path.read_text(encoding="utf-8"))
        for entry in entries:
            if entry.get("level") in (2, 3):
                entry["source"] = "edr"
        combined.extend(entries)

    OUTPUT_FILE.write_text(
        json.dumps(combined, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Połączono {len(INPUT_FILES)} pliki w {OUTPUT_FILE.name}")
    print(f"Liczba wpisów: {len(combined)}")


if __name__ == "__main__":
    main()
