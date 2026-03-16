#!/usr/bin/env python3
import argparse
import html
import re
from pathlib import Path


def infer_setting_name(input_path: Path) -> str:
    for parent in input_path.parents:
        if parent.parent.name == "Settings":
            return parent.name.replace("_", " ")
    return "Unknown Setting"


def parse_adventure(markdown_text: str) -> tuple[str, list[tuple[str, str, list[str]]]]:
    title_match = re.search(r"^#\s+(.+)$", markdown_text, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else "Generator Przygód"

    sections = re.split(r"^###\s+", markdown_text, flags=re.MULTILINE)
    tables: list[tuple[str, str, list[str]]] = []

    for section in sections:
        if not section.strip() or section.startswith("# "):
            continue

        lines = [line.strip() for line in section.splitlines() if line.strip()]
        if not lines:
            continue

        table_title = lines[0]
        prefix = ""
        items: list[str] = []

        for line in lines[1:]:
            if line.startswith("**") and line.endswith("**"):
                prefix = line[2:-2].strip()
            elif re.match(r"^\d+\.\s+", line):
                items.append(re.sub(r"^\d+\.\s+", "", line))

        tables.append((table_title, prefix, items))

    return title, tables


def build_html(title: str, setting_name: str, tables: list[tuple[str, str, list[str]]]) -> str:
    table_cards = []
    for table_title, prefix, items in tables:
        item_html = "".join(
            f'<li><span class="roll-num">{index + 1:02d}</span><span class="roll-text">{html.escape(item)}</span></li>'
            for index, item in enumerate(items)
        )
        prefix_html = f'<p class="table-prefix">{html.escape(prefix)}</p>' if prefix else ""
        table_cards.append(
            "<article class=\"table-card\">"
            f"<h2>{html.escape(table_title)}</h2>"
            f"{prefix_html}"
            f"<ol class=\"roll-table\">{item_html}</ol>"
            "</article>"
        )

    return f"""<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <style>
    @page {{
      size: A4 landscape;
      margin: 8mm;
    }}

    * {{
      box-sizing: border-box;
    }}

    html, body {{
      margin: 0;
      padding: 0;
      font-family: "Helvetica Neue", Arial, sans-serif;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    body {{
      font-size: 7.5px;
      line-height: 1.1;
    }}

    .page {{
      width: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      gap: 4mm;
    }}

    .page-header {{
      display: grid;
      grid-template-columns: 1.6fr 1fr;
      gap: 4mm;
      align-items: end;
      border-bottom: 1px solid #000;
      padding-bottom: 2.5mm;
    }}

    .title-wrap h1 {{
      margin: 0 0 1mm;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 24px;
      line-height: 1;
      letter-spacing: 0.02em;
    }}

    .lead {{
      margin: 0;
      font-size: 9px;
      color: #222;
      font-style: italic;
    }}

    .meta-stack {{
      display: flex;
      flex-direction: column;
      gap: 1mm;
      text-align: right;
    }}

    .meta-line {{
      margin: 0;
      font-size: 10px;
      font-weight: 700;
    }}

    .tables-grid {{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 3mm;
      align-items: start;
    }}

    .table-card {{
      border: 1px solid #000;
      border-radius: 3mm;
      background: #fff;
      padding: 2.4mm;
      break-inside: avoid;
    }}

    .table-card h2 {{
      margin: 0 0 1mm;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 10px;
      line-height: 1.05;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}

    .table-prefix {{
      margin: 0 0 1mm;
      font-weight: 700;
    }}

    .roll-table {{
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.55mm;
    }}

    .roll-table li {{
      display: grid;
      grid-template-columns: 3.6ch 1fr;
      gap: 1mm;
      align-items: start;
    }}

    .roll-num {{
      font-weight: 700;
    }}
  </style>
</head>
<body>
  <main class="page">
    <header class="page-header">
      <div class="title-wrap">
        <h1>{html.escape(title)}</h1>
        <p class="lead">Tabela do szybkiego generowania przygód dla settingu.</p>
      </div>
      <div class="meta-stack">
        <p class="meta-line">Homebrew World</p>
        <p class="meta-line">{html.escape(setting_name)}</p>
      </div>
    </header>
    <section class="tables-grid">
      {''.join(table_cards)}
    </section>
  </main>
</body>
</html>
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Render adventure.md to a compact PDF-ready HTML sheet.")
    parser.add_argument("input_path", help="Path to adventure.md")
    parser.add_argument("--output-dir", required=True, help="Directory for generated HTML")
    args = parser.parse_args()

    input_path = Path(args.input_path).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    markdown_text = input_path.read_text(encoding="utf-8")
    title, tables = parse_adventure(markdown_text)
    html_text = build_html(title, infer_setting_name(input_path), tables)

    output_path = output_dir / f"{input_path.stem}.html"
    output_path.write_text(html_text, encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
