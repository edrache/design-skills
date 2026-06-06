#!/usr/bin/env python3

from __future__ import annotations

import html
import re
import shutil
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = REPO_ROOT / "HomebrewWorld" / "Settings" / "Warhammer" / "pl"
OUTPUT_DIR = REPO_ROOT / "HomebrewWorld" / "Settings" / "Warhammer" / "Playbooks_html"
ASSET_SOURCE_DIR = REPO_ROOT / "HomebrewWorld" / "Settings" / "Warhammer" / "Playbooks_assets_source"
ASSETS_DIR = OUTPUT_DIR
MARKDOWN_DIR = OUTPUT_DIR

WIDE_SECTION_TITLES = {"Tło", "Ruchy Startowe"}
THEME_OPTIONS = (
    ("screen", "Aktualny styl"),
    ("print", "Styl druku"),
)
CLASS_ORDER = [
    "Uczeni",
    "Mieszczanie",
    "Dworzanie",
    "Pospólstwo",
    "Wędrowcy",
    "Wodniacy",
    "Łotrzykowie",
    "Wojownicy",
    "Nieprzypisane",
]
PLAYBOOK_CLASSES = {
    "Aptekarz": "Uczeni",
    "Czarodziej": "Uczeni",
    "Inzynier": "Uczeni",
    "Kaplan": "Uczeni",
    "Lekarz": "Uczeni",
    "Mniszka": "Uczeni",
    "Prawnik": "Uczeni",
    "Uczony": "Uczeni",
    "Agitator": "Mieszczanie",
    "Kupiec": "Mieszczanie",
    "Mieszczka": "Mieszczanie",
    "Rzemieslnik": "Mieszczanie",
    "Straznik": "Mieszczanie",
    "Szczurolap": "Mieszczanie",
    "Sledczy": "Mieszczanie",
    "Zebrak": "Mieszczanie",
    "Artystka": "Dworzanie",
    "Doradca": "Dworzanie",
    "Namiestnik": "Dworzanie",
    "Posel": "Dworzanie",
    "Sluzacy": "Dworzanie",
    "Szlachcic": "Dworzanie",
    "Szpieg": "Dworzanie",
    "Zwadzca": "Dworzanie",
    "Chlop": "Pospólstwo",
    "Gornik": "Pospólstwo",
    "Guslarz": "Pospólstwo",
    "Lowca": "Pospólstwo",
    "Mistyk": "Pospólstwo",
    "Zarzadca": "Pospólstwo",
    "Zielarka": "Pospólstwo",
    "Zwiadowca": "Pospólstwo",
    "Biczownik": "Wędrowcy",
    "Domokrazca": "Wędrowcy",
    "Kuglarz": "Wędrowcy",
    "Lowca_Czarownic": "Wędrowcy",
    "Lowczyni_Nagrod": "Wędrowcy",
    "Straznik_Drog": "Wędrowcy",
    "Woznica": "Wędrowcy",
    "Doker": "Wodniacy",
    "Flisak": "Wodniacy",
    "Pilot_Rzeczny": "Wodniacy",
    "Pirat_Rzeczny": "Wodniacy",
    "Przemytniczka": "Wodniacy",
    "Przewoznik": "Wodniacy",
    "Straznik_Rzeczny": "Wodniacy",
    "Zeglarz": "Wodniacy",
    "Banita": "Łotrzykowie",
    "Czarownica": "Łotrzykowie",
    "Hiena_Cmentarna": "Łotrzykowie",
    "Lotr": "Łotrzykowie",
    "Paser": "Łotrzykowie",
    "Rajfur": "Łotrzykowie",
    "Reketer": "Łotrzykowie",
    "Szarlatan": "Łotrzykowie",
    "Zlodziej": "Łotrzykowie",
    "Gladiator": "Wojownicy",
    "Kaplan_Wojownik": "Wojownicy",
    "Kawalerzysta": "Wojownicy",
    "Ochroniarz": "Wojownicy",
    "Oprych": "Wojownicy",
    "Rycerz": "Wojownicy",
    "Zabojca": "Wojownicy",
    "Zabojca_Trolli": "Wojownicy",
    "Zolnierz": "Wojownicy",
}


@dataclass
class Section:
    title: str
    body: str


@dataclass
class Playbook:
    slug: str
    filename: str
    source_name: str
    source_path: Path
    output_path: Path
    class_name: str
    title: str
    lead: str
    notes: list[str]
    meta: list[tuple[str, str]]
    sections: list[Section]
    markdown_output_path: Path


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def format_inline(text: str) -> str:
    escaped = html.escape(text.strip())
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"\*(.+?)\*", r"<em>\1</em>", escaped)
    return escaped


def strip_markdown(text: str) -> str:
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    return text.strip()


def parse_section_blocks(body: str) -> str:
    parts: list[str] = []
    in_list = False

    def close_list() -> None:
        nonlocal in_list
        if in_list:
            parts.append("</ul>")
            in_list = False

    lines = body.splitlines()
    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            close_list()
            continue

        if line == "---":
            close_list()
            parts.append('<div class="section-divider" aria-hidden="true"></div>')
            continue

        if re.fullmatch(r"\*\*.+?\*\*", line):
            close_list()
            heading = strip_markdown(line)
            parts.append(f"<h3>{html.escape(heading)}</h3>")
            continue

        bullet_match = re.match(r"^[-*]\s+(.+)$", line)
        if bullet_match:
            if not in_list:
                parts.append('<ul class="bullet-list">')
                in_list = True
            parts.append(f"<li>{format_inline(bullet_match.group(1))}</li>")
            continue

        labeled_match = re.match(r"^\*\*(.+?):\*\*\s*(.+)$", line)
        if labeled_match:
            close_list()
            label = html.escape(labeled_match.group(1).strip())
            value = format_inline(labeled_match.group(2))
            parts.append(
                '<div class="fact-row">'
                f'<span class="fact-label">{label}</span>'
                f'<span class="fact-value">{value}</span>'
                "</div>"
            )
            continue

        close_list()
        parts.append(f"<p>{format_inline(line)}</p>")

    close_list()
    if parts and parts[-1] == '<div class="section-divider" aria-hidden="true"></div>':
        parts.pop()
    return "\n".join(parts)


def parse_playbook(path: Path) -> Playbook:
    raw_text = read_text(path)
    lines = raw_text.splitlines()

    title = ""
    lead = ""
    notes: list[str] = []
    meta: list[tuple[str, str]] = []
    index = 0

    while index < len(lines):
        line = lines[index].strip()
        if line.startswith("# "):
            title = line[2:].strip()
            index += 1
            break
        index += 1

    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        if line.startswith("*") and line.endswith("*") and not line.startswith("**"):
            lead = strip_markdown(line)
            index += 1
            continue
        if line.startswith(">"):
            notes.append(strip_markdown(line.lstrip(">").strip()))
            index += 1
            continue
        meta_match = re.match(r"^\*\*(.+?):\*\*\s*(.+)$", line)
        if meta_match:
            meta.append((meta_match.group(1).strip(), meta_match.group(2).strip()))
            index += 1
            continue
        if line == "---":
            index += 1
            break
        break

    remaining = "\n".join(lines[index:]).strip()
    sections: list[Section] = []
    for chunk in re.split(r"^##\s+", remaining, flags=re.MULTILINE):
        chunk = chunk.strip()
        if not chunk:
            continue
        split = chunk.split("\n", 1)
        section_title = split[0].strip()
        section_body = split[1].strip() if len(split) > 1 else ""
        sections.append(Section(title=section_title, body=section_body))

    filename = f"{path.stem}.html"
    source_key = path.stem.replace("Playbook_", "")
    return Playbook(
        slug=path.stem.lower(),
        filename=filename,
        source_name=path.name,
        source_path=path,
        output_path=OUTPUT_DIR / filename,
        class_name=PLAYBOOK_CLASSES.get(source_key, "Nieprzypisane"),
        title=title or path.stem.replace("Playbook_", "").replace("_", " "),
        lead=lead,
        notes=notes,
        meta=meta,
        sections=sections,
        markdown_output_path=MARKDOWN_DIR / path.name,
    )


def style_switcher_html() -> str:
    buttons = []
    for theme, label in THEME_OPTIONS:
        buttons.append(
            f'<button class="theme-button" type="button" data-theme-option="{theme}">{label}</button>'
        )
    buttons.append(
        '<button class="theme-button theme-button--ghost" type="button" data-print-page>Drukuj</button>'
    )
    return f'<div class="theme-switcher" data-style-switcher>{"".join(buttons)}</div>'


def render_playbook_page(playbook: Playbook, previous_page: str | None, next_page: str | None) -> str:
    meta_html = "".join(
        '<div class="meta-chip">'
        f'<span class="meta-chip__label">{html.escape(label)}</span>'
        f'<strong class="meta-chip__value">{format_inline(value)}</strong>'
        "</div>"
        for label, value in playbook.meta
    )
    meta_html = (
        '<div class="meta-chip">'
        '<span class="meta-chip__label">Klasa</span>'
        f'<strong class="meta-chip__value">{html.escape(playbook.class_name)}</strong>'
        "</div>"
        '<div class="meta-chip">'
        '<span class="meta-chip__label">Playbook</span>'
        f'<strong class="meta-chip__value">{html.escape(playbook.title)}</strong>'
        "</div>"
        + meta_html
    )

    notes_html = "".join(f'<p class="hero-note">{html.escape(note)}</p>' for note in playbook.notes)

    cards = []
    for section in playbook.sections:
        wide_modifier = " section-card--wide" if section.title in WIDE_SECTION_TITLES else ""
        cards.append(
            f"""
            <section class="section-card{wide_modifier}">
              <h2>{html.escape(section.title)}</h2>
              <div class="section-body">
                {parse_section_blocks(section.body)}
              </div>
            </section>
            """.strip()
        )

    nav_links = []
    if previous_page:
        nav_links.append(
            f'<a class="pager-link" href="{html.escape(previous_page)}">← Poprzedni playbook</a>'
        )
    else:
        nav_links.append('<span class="pager-link pager-link--muted">← Poprzedni playbook</span>')

    nav_links.append('<a class="pager-link pager-link--home" href="./index.html">Lista playbooków</a>')

    if next_page:
        nav_links.append(
            f'<a class="pager-link" href="{html.escape(next_page)}">Następny playbook →</a>'
        )
    else:
        nav_links.append('<span class="pager-link pager-link--muted">Następny playbook →</span>')

    return f"""<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(playbook.title)} | Warhammer Playbook</title>
  <link rel="stylesheet" href="./base.css">
  <link rel="stylesheet" href="./theme-screen.css" id="theme-stylesheet" data-screen-href="./theme-screen.css" data-print-href="./theme-print.css">
  <script defer src="./app.js"></script>
</head>
<body data-page="playbook" data-theme="screen">
  <main class="app-shell">
    <header class="page-hero">
      <div class="page-toolbar">
        <a class="back-link" href="./index.html">← Wszystkie playbooki</a>
        <a class="source-link" href="./{html.escape(playbook.source_name)}" download>Pobierz Markdown</a>
        {style_switcher_html()}
      </div>
      <div class="hero-copy">
        <p class="eyebrow">Warhammer · Playbook</p>
        <h1>{html.escape(playbook.title)}</h1>
        <p class="lead">{html.escape(playbook.lead)}</p>
        {notes_html}
        <p class="hero-note"><strong>Klasa:</strong> {html.escape(playbook.class_name)}</p>
      </div>
      <div class="meta-grid">
        {meta_html}
      </div>
    </header>

    <section class="content-grid">
      {"".join(cards)}
    </section>

    <nav class="pager" aria-label="Nawigacja playbooków">
      {"".join(nav_links)}
    </nav>
  </main>
</body>
</html>
"""


def render_index_cards(playbooks: list[Playbook]) -> str:
    cards: list[str] = []
    for playbook in playbooks:
        meta_html = "".join(
            '<li class="index-meta__item">'
            f'<span>{html.escape(label)}</span>'
            f'<strong>{format_inline(value)}</strong>'
            "</li>"
            for label, value in playbook.meta
        )
        class_html = (
            '<li class="index-meta__item">'
            '<span>Klasa</span>'
            f'<strong>{html.escape(playbook.class_name)}</strong>'
            "</li>"
            '<li class="index-meta__item">'
            '<span>Playbook</span>'
            f'<strong>{html.escape(playbook.title)}</strong>'
            "</li>"
        )
        cards.append(
            f"""
            <article class="index-card">
              <p class="index-card__eyebrow">Playbook</p>
              <h2><a href="./{html.escape(playbook.filename)}">{html.escape(playbook.title)}</a></h2>
              <p class="index-card__lead">{html.escape(playbook.lead)}</p>
              <ul class="index-meta">{class_html}{meta_html}</ul>
              <div class="index-card__actions">
                <a class="index-link" href="./{html.escape(playbook.filename)}">Otwórz HTML</a>
                <a class="index-link index-link--ghost" href="./{html.escape(playbook.source_name)}" download>Markdown</a>
              </div>
            </article>
            """.strip()
        )
    return "".join(cards)


def group_playbooks_by_class(playbooks: list[Playbook]) -> list[tuple[str, list[Playbook]]]:
    grouped: dict[str, list[Playbook]] = {}
    for playbook in playbooks:
        grouped.setdefault(playbook.class_name, []).append(playbook)

    ordered_groups: list[tuple[str, list[Playbook]]] = []
    for class_name in CLASS_ORDER:
        items = grouped.pop(class_name, [])
        if items:
            ordered_groups.append((class_name, items))

    for class_name in sorted(grouped):
        ordered_groups.append((class_name, grouped[class_name]))

    return ordered_groups


def render_index_page(playbooks: list[Playbook]) -> str:
    groups_html: list[str] = []
    for class_name, items in group_playbooks_by_class(playbooks):
        groups_html.append(
            f"""
            <section class="class-group">
              <header class="class-group__header">
                <p class="class-group__eyebrow">Klasa</p>
                <h2>{html.escape(class_name)}</h2>
                <p class="class-group__count">{len(items)} playbooków</p>
              </header>
              <div class="index-grid">
                {render_index_cards(items)}
              </div>
            </section>
            """.strip()
        )

    return f"""<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Warhammer Playbooks</title>
  <link rel="stylesheet" href="./base.css">
  <link rel="stylesheet" href="./theme-screen.css" id="theme-stylesheet" data-screen-href="./theme-screen.css" data-print-href="./theme-print.css">
  <script defer src="./app.js"></script>
</head>
<body data-page="index" data-theme="screen">
  <main class="app-shell">
    <header class="page-hero page-hero--index">
      <div class="page-toolbar">
        <a class="back-link" href="./markdown_index.html">← Katalog markdown</a>
        {style_switcher_html()}
      </div>
      <div class="hero-copy">
        <p class="eyebrow">Warhammer · Playbooks HTML</p>
        <h1>Biblioteka playbooków</h1>
        <p class="lead">Każdy playbook ma osobny plik HTML, a wygląd jest sterowany wspólnymi stylami. Możesz zmieniać estetykę bez przepisywania treści i przełączać się między widokiem ekranowym a drukowym.</p>
      </div>
      <div class="meta-grid">
        <div class="meta-chip">
          <span class="meta-chip__label">Playbooki</span>
          <strong class="meta-chip__value">{len(playbooks)}</strong>
        </div>
        <div class="meta-chip">
          <span class="meta-chip__label">Motywy</span>
          <strong class="meta-chip__value">2 style</strong>
        </div>
        <div class="meta-chip">
          <span class="meta-chip__label">Źródło</span>
          <strong class="meta-chip__value">Markdown → HTML</strong>
        </div>
      </div>
    </header>

    <section class="class-group-list">
      {"".join(groups_html)}
    </section>
  </main>
</body>
</html>
"""


def render_markdown_index_page(playbooks: list[Playbook]) -> str:
    groups_html: list[str] = []
    for class_name, items in group_playbooks_by_class(playbooks):
        rows = []
        for playbook in items:
            rows.append(
                f"""
                <li class="markdown-list__item">
                  <a href="./{html.escape(playbook.source_name)}" download>{html.escape(playbook.title)}</a>
                  <span>{html.escape(playbook.source_name)}</span>
                </li>
                """.strip()
            )
        groups_html.append(
            f"""
            <section class="class-group">
              <header class="class-group__header">
                <p class="class-group__eyebrow">Klasa</p>
                <h2>{html.escape(class_name)}</h2>
                <p class="class-group__count">{len(items)} plików markdown</p>
              </header>
              <ul class="markdown-list">
                {"".join(rows)}
              </ul>
            </section>
            """.strip()
        )

    return f"""<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Warhammer Markdown</title>
  <link rel="stylesheet" href="./base.css">
  <link rel="stylesheet" href="./theme-screen.css" id="theme-stylesheet" data-screen-href="./theme-screen.css" data-print-href="./theme-print.css">
  <script defer src="./app.js"></script>
</head>
<body data-page="markdown-index" data-theme="screen">
  <main class="app-shell">
    <header class="page-hero page-hero--index">
      <div class="page-toolbar">
        <a class="back-link" href="./index.html">← Biblioteka playbooków</a>
        {style_switcher_html()}
      </div>
      <div class="hero-copy">
        <p class="eyebrow">Warhammer · Markdown</p>
        <h1>Źródła do pobrania</h1>
        <p class="lead">Tutaj są wszystkie markdowny skopiowane do buildu, dzięki czemu po wdrożeniu na serwer użytkownik może pobierać źródłowe pliki bez dostępu do repozytorium.</p>
      </div>
    </header>

    <section class="class-group-list">
      {"".join(groups_html)}
    </section>
  </main>
</body>
</html>
"""


def ensure_assets_dir() -> None:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def write_file(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def build() -> list[Playbook]:
    ensure_assets_dir()
    for legacy_dir in (OUTPUT_DIR / "assets", OUTPUT_DIR / "markdown"):
        if legacy_dir.exists() and legacy_dir.is_dir():
            shutil.rmtree(legacy_dir)
    for asset_name in ("base.css", "theme-screen.css", "theme-print.css", "app.js"):
        shutil.copyfile(ASSET_SOURCE_DIR / asset_name, OUTPUT_DIR / asset_name)
    playbook_paths = sorted(SOURCE_DIR.glob("Playbook_*.md"))
    playbooks = [parse_playbook(path) for path in playbook_paths]

    for index, playbook in enumerate(playbooks):
        previous_page = playbooks[index - 1].filename if index > 0 else None
        next_page = playbooks[index + 1].filename if index < len(playbooks) - 1 else None
        write_file(playbook.markdown_output_path, read_text(playbook.source_path))
        write_file(playbook.output_path, render_playbook_page(playbook, previous_page, next_page))

    write_file(OUTPUT_DIR / "index.html", render_index_page(playbooks))
    write_file(OUTPUT_DIR / "markdown_index.html", render_markdown_index_page(playbooks))
    return playbooks


def main() -> int:
    playbooks = build()
    print(f"Wygenerowano {len(playbooks)} stron playbooków oraz indeks w {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
