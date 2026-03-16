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


def parse_optional_moves(markdown_text: str) -> tuple[str, list[tuple[str, str, list[str]]]]:
    title_match = re.search(r"^#\s+(.+)$", markdown_text, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else "Ruchy Opcjonalne"

    parts = [part.strip() for part in re.split(r"\n---\n", markdown_text) if part.strip()]
    moves: list[tuple[str, str, list[str]]] = []

    for part in parts[1:]:
        lines = [line.strip() for line in part.splitlines() if line.strip()]
        if not lines:
            continue
        move_title = re.sub(r"^\*\*(.+)\*\*$", r"\1", lines[0]).strip()
        paragraphs: list[str] = []
        bullets: list[str] = []
        for line in lines[1:]:
            if line.startswith("- "):
                bullets.append(line[2:].strip())
            else:
                paragraphs.append(line)
        moves.append((move_title, " ".join(paragraphs), bullets))

    return title, moves


def build_html(title: str, setting_name: str, moves: list[tuple[str, str, list[str]]]) -> str:
    move_cards = []
    for move_title, text, bullets in moves:
        bullet_html = ""
        if bullets:
            items = "".join(f"<li>{html.escape(item)}</li>" for item in bullets)
            bullet_html = f'<ul class="bullet-list">{items}</ul>'
        move_cards.append(
            "<article class=\"move-card\">"
            f"<h2>{html.escape(move_title)}</h2>"
            f"<p>{html.escape(text)}</p>"
            f"{bullet_html}"
            "</article>"
        )

    cards_html = "".join(move_cards)

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
      font-size: 8.4px;
      line-height: 1.15;
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
      font-size: 10px;
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

    .moves-grid {{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 3mm;
      align-items: start;
    }}

    .move-card {{
      border: 1px solid #000;
      border-radius: 3mm;
      background: #fff;
      padding: 2.5mm;
      break-inside: avoid;
    }}

    .move-card h2 {{
      margin: 0 0 1.2mm;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 11px;
      line-height: 1.05;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}

    .move-card p {{
      margin: 0 0 1mm;
    }}

    .bullet-list {{
      margin: 0;
      padding-left: 3mm;
    }}

    .bullet-list li {{
      margin: 0 0 0.7mm;
    }}
  </style>
</head>
<body>
  <main class="page">
    <header class="page-header">
      <div class="title-wrap">
        <h1>{html.escape(title)}</h1>
        <p class="lead">Jednostronicowa karta ruchów opcjonalnych do settingu.</p>
      </div>
      <div class="meta-stack">
        <p class="meta-line">Homebrew World</p>
        <p class="meta-line">{html.escape(setting_name)}</p>
      </div>
    </header>
    <section class="moves-grid">
      {cards_html}
    </section>
  </main>
</body>
</html>
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Render Optional_Moves.md to a single-page HTML sheet.")
    parser.add_argument("input_path", help="Path to Optional_Moves.md")
    parser.add_argument("--output-dir", required=True, help="Directory for generated HTML")
    args = parser.parse_args()

    input_path = Path(args.input_path).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    markdown_text = input_path.read_text(encoding="utf-8")
    title, moves = parse_optional_moves(markdown_text)
    html_text = build_html(title, infer_setting_name(input_path), moves)

    output_path = output_dir / f"{input_path.stem}.html"
    output_path.write_text(html_text, encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
