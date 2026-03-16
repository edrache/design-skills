#!/usr/bin/env python3
import argparse
import html
import re
from pathlib import Path


SECTION_LABELS = {
    "imię": "name",
    "name": "name",
    "wygląd": "look",
    "look": "look",
    "tło": "background",
    "background": "background",
    "ruchy startowe": "starting_moves",
    "starting moves": "starting_moves",
    "awanse": "advances",
    "advances": "advances",
    "dążenia": "drives",
    "drive": "drives",
    "drives": "drives",
    "ekwipunek": "gear",
    "gear": "gear",
}


def slugify(text: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "_", text.strip())
    return value.strip("_") or "playbook"


def normalize_key(title: str) -> str:
    return SECTION_LABELS.get(title.strip().lower(), title.strip().lower())


def parse_sections(markdown_text: str):
    title_match = re.search(r"^#\s+(.+)$", markdown_text, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else "Playbook"

    intro_match = re.split(r"^##\s+.+$", markdown_text, maxsplit=1, flags=re.MULTILINE)
    intro = intro_match[0]

    section_matches = list(re.finditer(r"^##\s+(.+)$", markdown_text, re.MULTILINE))
    sections = {}

    for index, match in enumerate(section_matches):
        raw_title = match.group(1).strip()
        section_start = match.end()
        section_end = section_matches[index + 1].start() if index + 1 < len(section_matches) else len(markdown_text)
        sections[normalize_key(raw_title)] = {
            "title": raw_title,
            "body": markdown_text[section_start:section_end].strip(),
        }

    return title, intro.strip(), sections


def infer_setting_name(input_path: Path) -> str:
    for parent in input_path.parents:
        if parent.parent.name == "Settings":
            return parent.name.replace("_", " ")
    return "Unknown Setting"


def extract_meta_value(intro: str, label: str) -> str | None:
    pattern = rf"\*\*{re.escape(label)}:\*\*\s*(.+)"
    match = re.search(pattern, intro)
    return compact_text(match.group(1)) if match else None


def extract_load(gear_body: str) -> str | None:
    match = re.search(r"Udźwig\s+([0-9]+)", gear_body)
    return match.group(1) if match else None


def inline_markup(text: str) -> str:
    escaped = html.escape(text, quote=False)
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", escaped)
    return escaped


def compact_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def render_lines_as_blocks(body: str) -> str:
    chunks = []
    list_open = False

    for raw_line in body.splitlines():
        line = raw_line.strip()
        if not line:
            if list_open:
                chunks.append("</ul>")
                list_open = False
            continue

        if line == "---":
            if list_open:
                chunks.append("</ul>")
                list_open = False
            continue

        if re.match(r"^[-*]\s+", line):
            if not list_open:
                chunks.append('<ul class="bullet-list">')
                list_open = True
            item = re.sub(r"^[-*]\s+", "", line)
            chunks.append(f"<li>{inline_markup(compact_text(item))}</li>")
            continue

        if list_open:
            chunks.append("</ul>")
            list_open = False

        if re.fullmatch(r"\*\*.+\*\*", line):
            chunks.append(f'<h3 class="entry-title">{inline_markup(line[2:-2].strip())}</h3>')
        else:
            chunks.append(f"<p>{inline_markup(compact_text(line))}</p>")

    if list_open:
        chunks.append("</ul>")

    return "\n".join(chunks)


def render_backgrounds(body: str) -> str:
    parts = [part.strip() for part in re.split(r"\n---\n", body) if part.strip()]
    blocks = []

    for part in parts:
        lines = [line.strip() for line in part.splitlines() if line.strip()]
        if not lines:
            continue

        if lines[0].lower().startswith("wybierz jedno") or lines[0].lower().startswith("pick one"):
            blocks.append(f'<div class="section-note">{inline_markup(lines[0])}</div>')
            continue

        title = None
        paragraphs = []
        questions = []
        intro = None

        for line in lines:
            if re.fullmatch(r"\*\*.+\*\*", line):
                title = line[2:-2].strip()
                continue
            if re.match(r"^[-*]\s+", line):
                questions.append(re.sub(r"^[-*]\s+", "", line))
                continue
            if "zadaj jedno lub więcej z poniższych pytań" in line.lower() or "ask one or more of the following" in line.lower():
                intro = line
                continue
            paragraphs.append(line)

        paragraph_html = "".join(f"<p>{inline_markup(compact_text(p))}</p>" for p in paragraphs)
        question_html = ""
        if questions:
            intro_html = f'<p class="questions-intro">{inline_markup(compact_text(intro))}</p>' if intro else ""
            items = "".join(f"<li>{inline_markup(compact_text(item))}</li>" for item in questions)
            question_html = f"{intro_html}<ul class=\"question-list\">{items}</ul>"

        blocks.append(
            "<article class=\"background-entry\">"
            f"<h3>{inline_markup(title or 'Tło')}</h3>"
            f"{paragraph_html}"
            f"{question_html}"
            "</article>"
        )

    return "\n".join(blocks)


def render_section(section_key: str, section: dict) -> str:
    title = inline_markup(section["title"])
    body = section["body"]

    if section_key == "background":
        content = render_backgrounds(body)
    else:
        content = render_lines_as_blocks(body)

    return f'<section class="card section-{section_key}"><h2>{title}</h2>{content}</section>'


def render_character_sheet(intro: str, sections: dict) -> str:
    hp_value = extract_meta_value(intro, "PŻ") or "?"
    damage_value = extract_meta_value(intro, "Kostka Obrażeń") or "?"
    load_value = extract_load(sections.get("gear", {}).get("body", "")) or "?"

    stats = ["SIŁ", "ZRC", "KON", "INT", "MDR", "CHA"]
    stat_boxes = "".join(
        f'<div class="stat-box"><span class="stat-name">{stat}</span><span class="stat-value"></span></div>'
        for stat in stats
    )

    return f"""
    <section class="card sheet-card">
      <h2>Arkusz Postaci</h2>
      <p class="sheet-tip">Rozdziel: <strong>+2, +1, +1, +0, +0, -1</strong>.</p>
      <div class="stat-grid">{stat_boxes}</div>
      <div class="track-grid">
        <div class="track-box"><span class="track-label">PŻ</span><span class="track-value">{inline_markup(hp_value)}</span></div>
        <div class="track-box"><span class="track-label">Obrażenia</span><span class="track-value">{inline_markup(damage_value)}</span></div>
        <div class="track-box"><span class="track-label">Pancerz</span><span class="track-value"></span></div>
        <div class="track-box"><span class="track-label">XP</span><span class="track-value">□□□□□</span></div>
        <div class="track-box"><span class="track-label">Udźwig</span><span class="track-value">{inline_markup(load_value)}</span></div>
      </div>
      <div class="debility-grid">
        <div class="debility-box">□ Osłabiony <span>(SIŁ, ZRC)</span></div>
        <div class="debility-box">□ Otępiały <span>(INT, MDR)</span></div>
        <div class="debility-box">□ Przybity <span>(KON, CHA)</span></div>
      </div>
      <div class="sheet-notes">
      <h3 class="entry-title">Ściąga</h3>
      <ul class="bullet-list compact-list">
        <li>Zaznacz XP przy wyniku <strong>6-</strong> oraz gdy coś każe ci to zrobić.</li>
        <li>Wydaj <strong>1 XP</strong>, aby dodać <strong>+1</strong> do rzutu po rzucie.</li>
        <li>Wydaj <strong>5 XP</strong>, aby wybrać awans.</li>
        <li><strong>PŻ</strong> odzyskujesz przez odpoczynek, leczenie i ruchy postaci.</li>
        <li><strong>Pancerz</strong> zmniejsza otrzymywane obrażenia zgodnie z fikcją.</li>
      </ul>
      </div>
    </section>
    """


def build_html(playbook_title: str, intro: str, sections: dict, setting_name: str) -> str:
    lead_html = ""
    intro_lines = [line.strip() for line in intro.splitlines() if line.strip() and line.strip() != "---"]
    for line in intro_lines:
        if line.startswith("*") and line.endswith("*"):
            lead_html = f'<p class="lead">{inline_markup(line[1:-1].strip())}</p>'
            break

    page_one_keys = ["name", "look", "background"]
    page_two_keys = ["starting_moves", "advances", "drives", "gear"]

    return f"""<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(playbook_title)}</title>
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
      font-size: 9px;
      line-height: 1.2;
    }}

    .page {{
      width: 100%;
      min-height: 100vh;
      padding: 0;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      gap: 4mm;
    }}

    .page:last-child {{
      page-break-after: auto;
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

    .page-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
      align-items: start;
      min-height: 0;
      flex: 1;
    }}

    .column {{
      display: flex;
      flex-direction: column;
      gap: 3mm;
      min-height: 0;
    }}

    .card {{
      border: 1px solid #000;
      border-radius: 3mm;
      background: #fff;
      padding: 3mm;
      break-inside: avoid;
    }}

    .card h2 {{
      margin: 0 0 2mm;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 14px;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #000;
    }}

    .card h3,
    .entry-title {{
      margin: 1.5mm 0 1mm;
      font-size: 10px;
      line-height: 1.15;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #000;
    }}

    p {{
      margin: 0 0 1.2mm;
    }}

    ul {{
      margin: 0;
      padding-left: 4mm;
    }}

    li {{
      margin: 0 0 1mm;
    }}

    code {{
      font-family: Menlo, Monaco, monospace;
      font-size: 0.95em;
    }}

    .section-background {{
      padding: 2.5mm;
    }}

    .section-note {{
      margin: 0 0 2mm;
      font-weight: 700;
      color: #111;
    }}

    .background-entry {{
      border-top: 1px solid #999;
      padding-top: 2mm;
      margin-top: 2mm;
    }}

    .background-entry:first-of-type {{
      border-top: 0;
      margin-top: 0;
      padding-top: 0;
    }}

    .background-entry h3 {{
      margin-top: 0;
    }}

    .questions-intro {{
      margin-top: 1mm;
      font-size: 8.4px;
      color: #333;
      font-style: italic;
    }}

    .question-list {{
      column-count: 2;
      column-gap: 4mm;
    }}

    .bullet-list {{
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.6mm;
    }}

    .compact-list {{
      gap: 0.3mm;
    }}

    .page-two-grid {{
      grid-template-columns: 1.1fr 1fr 0.95fr;
      gap: 3mm;
    }}

    .page-two-grid .card {{
      padding: 2.5mm;
    }}

    .page-two-grid .card h2 {{
      font-size: 12px;
      margin-bottom: 1.5mm;
    }}

    .page-two-grid p,
    .page-two-grid li {{
      font-size: 8.2px;
      line-height: 1.15;
    }}

    .page-two-grid .card h3,
    .page-two-grid .entry-title {{
      font-size: 9px;
      margin: 1.2mm 0 0.8mm;
    }}

    .page-two-grid .section-gear p,
    .page-two-grid .section-gear li {{
      font-size: 7.6px;
      line-height: 1.08;
    }}

    .page-two-grid .section-gear .bullet-list {{
      column-count: 2;
      column-gap: 3mm;
      display: block;
      padding-left: 3mm;
    }}

    .page-two-grid .section-gear .bullet-list li {{
      break-inside: avoid;
      margin-bottom: 0.6mm;
    }}

    .sheet-tip {{
      margin-bottom: 2mm;
      color: #222;
    }}

    .stat-grid {{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1.5mm;
      margin-bottom: 2mm;
    }}

    .stat-box,
    .track-box,
    .debility-box {{
      border: 1px solid #000;
      border-radius: 2mm;
      background: #fff;
    }}

    .stat-box {{
      min-height: 14mm;
      padding: 1.5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }}

    .stat-name,
    .track-label {{
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #000;
    }}

    .stat-value {{
      display: block;
      border-bottom: 1px solid #000;
      min-height: 6mm;
    }}

    .track-grid {{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.5mm;
      margin-bottom: 2mm;
    }}

    .track-box {{
      min-height: 11mm;
      padding: 1.5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }}

    .track-value {{
      display: block;
      min-height: 4mm;
      font-size: 10px;
      font-weight: 700;
    }}

    .debility-grid {{
      display: grid;
      gap: 1.2mm;
    }}

    .debility-box {{
      padding: 1.6mm 2mm;
      font-size: 8.4px;
      line-height: 1.15;
    }}

    .debility-box span {{
      color: #222;
    }}

    .sheet-notes {{
      margin-top: 2mm;
    }}
  </style>
</head>
<body>
  <main>
    <section class="page">
      <header class="page-header">
        <div class="title-wrap">
          <h1>{inline_markup(playbook_title)}</h1>
          {lead_html}
        </div>
        <div class="meta-stack">
          <p class="meta-line">Homebrew World</p>
          <p class="meta-line">{inline_markup(setting_name)}</p>
        </div>
      </header>
      <div class="page-grid">
        <div class="column">
          {render_section("name", sections["name"]) if "name" in sections else ""}
          {render_section("look", sections["look"]) if "look" in sections else ""}
        </div>
        <div class="column">
          {render_section("background", sections["background"]) if "background" in sections else ""}
        </div>
      </div>
    </section>
    <section class="page">
      <header class="page-header">
        <div class="title-wrap">
          <h1>{inline_markup(playbook_title)}</h1>
          <p class="lead">Skrót zasad i opcji postaci do gry przy stole.</p>
        </div>
        <div class="meta-stack">
          <p class="meta-line">Homebrew World</p>
          <p class="meta-line">{inline_markup(setting_name)}</p>
        </div>
      </header>
      <div class="page-grid page-two-grid">
        <div class="column">
          {render_section("starting_moves", sections["starting_moves"]) if "starting_moves" in sections else ""}
        </div>
        <div class="column">
          {render_section("advances", sections["advances"]) if "advances" in sections else ""}
          {render_section("drives", sections["drives"]) if "drives" in sections else ""}
        </div>
        <div class="column">
          {render_character_sheet(intro, sections)}
          {render_section("gear", sections["gear"]) if "gear" in sections else ""}
        </div>
      </div>
    </section>
  </main>
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser(description="Render a compact two-page HTML sheet from a Homebrew World playbook.")
    parser.add_argument("input_path", help="Path to Playbook_*.md")
    parser.add_argument("--output-dir", default=None, help="Directory for generated HTML")
    args = parser.parse_args()

    input_path = Path(args.input_path).resolve()
    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    markdown_text = input_path.read_text(encoding="utf-8")
    playbook_title, intro, sections = parse_sections(markdown_text)
    setting_name = infer_setting_name(input_path)
    html_text = build_html(playbook_title, intro, sections, setting_name)

    output_dir = Path(args.output_dir).resolve() if args.output_dir else input_path.parent / "playbook_sheet"
    output_dir.mkdir(parents=True, exist_ok=True)

    output_name = slugify(input_path.stem) + ".html"
    output_path = output_dir / output_name
    output_path.write_text(html_text, encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
