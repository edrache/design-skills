#!/usr/bin/env python3

from __future__ import annotations

import argparse
import datetime as dt
import importlib.util
import re
import shutil
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
HOME_BREW_ROOT = REPO_ROOT / "HomebrewWorld"
SETTINGS_ROOT = HOME_BREW_ROOT / "Settings"
OUTPUT_ROOT = HOME_BREW_ROOT / "site"
RENDER_WEB_PATH = HOME_BREW_ROOT / "Skills" / "homebrew-web-presenter" / "scripts" / "render_web.py"
BUILD_PLAYBOOK_BOOK_PATH = HOME_BREW_ROOT / "Skills" / "homebrew-playbook-sheet" / "scripts" / "build_playbook_book.py"
DEPLOY_SCRIPT = REPO_ROOT / "skills" / "skills-custom" / "deploy-mikrus" / "scripts" / "deploy.sh"
SHARED_STYLESHEET = OUTPUT_ROOT / "style.css"


def load_render_web():
    spec = importlib.util.spec_from_file_location("render_web", RENDER_WEB_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Nie moge zaladowac renderera: {RENDER_WEB_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def slugify(value: str) -> str:
    value = value.replace("_", "-").strip().lower()
    value = re.sub(r"[^a-z0-9-]+", "-", value)
    value = re.sub(r"-{2,}", "-", value)
    return value.strip("-")


def humanize(value: str) -> str:
    return value.replace("_", " ").strip()


def detect_languages(setting_dir: Path) -> list[str]:
    langs = [lang for lang in ("pl", "en") if (setting_dir / lang).is_dir()]
    return langs or ["default"]


def discover_settings() -> list[Path]:
    settings = []
    for child in sorted(SETTINGS_ROOT.iterdir()):
        if not child.is_dir() or child.name.startswith("."):
            continue

        langs = detect_languages(child)
        for lang in langs:
            folder = child if lang == "default" else child / lang
            if list(folder.glob("Playbook_*.md")):
                settings.append(child)
                break
    return settings


def count_playbooks(setting_dir: Path) -> int:
    total = 0
    for lang in detect_languages(setting_dir):
        folder = setting_dir if lang == "default" else setting_dir / lang
        total += len(list(folder.glob("Playbook_*.md")))
    return total


def build_setting_summary(setting_dir: Path) -> str:
    langs = detect_languages(setting_dir)
    playbooks = count_playbooks(setting_dir)
    lang_labels = ", ".join("PL" if lang == "pl" else "EN" if lang == "en" else "Default" for lang in langs)
    return f"{playbooks} playbookow • {lang_labels}"


def publish_setting_pdfs(setting_dir: Path, destination_dir: Path) -> None:
    for lang in detect_languages(setting_dir):
        source_folder = setting_dir if lang == "default" else setting_dir / lang
        if not list(source_folder.glob("Playbook_*.md")):
            continue

        merged_name = "playbooks.pdf" if lang == "default" else f"playbooks_{lang}.pdf"
        subprocess.run(
            [
                sys.executable,
                str(BUILD_PLAYBOOK_BOOK_PATH),
                str(source_folder),
                "--output-dir",
                str(destination_dir),
                "--merged-name",
                merged_name,
                "--merged-only",
            ],
            check=True,
        )


def render_homepage(cards: list[dict[str, str]], output_dir: Path) -> Path:
    generated_at = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    output_dir.mkdir(parents=True, exist_ok=True)
    cards_html = "\n".join(
        f"""
        <article class="world-card">
            <p class="world-kicker">Setting #{index + 1:02d}</p>
            <h2>{card['title']}</h2>
            <p class="world-meta">{card['summary']}</p>
            <a class="world-link" href="./{card['slug']}/">Otworz setting</a>
        </article>
        """
        for index, card in enumerate(cards)
    )

    if output_dir.resolve() != OUTPUT_ROOT.resolve():
        shutil.copyfile(SHARED_STYLESHEET, output_dir / "style.css")
        stylesheet_href = "./style.css"
    else:
        stylesheet_href = "./style.css"

    html = f"""<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Homebrew Worlds</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{stylesheet_href}">
</head>
<body>
    <main class="shell">
        <section class="hero">
            <p class="eyebrow">Homebrew World Hub</p>
            <h1>Homebrew Worlds</h1>
            <p class="lead">
                Strona glowna zbierajaca wybrane settingi w jednej bibliotece. Kazda karta prowadzi do osobnej webowej prezentacji i pozwala wrocic z powrotem do tego katalogu.
            </p>
            <div class="toolbar">
                <span class="toolbar-chip">{len(cards)} settingi gotowe do publikacji</span>
                <span class="toolbar-chip">Statyczny serwis z automatycznym buildem</span>
            </div>
        </section>

        <section class="grid">
            {cards_html}
        </section>

        <footer>
            <span>Wygenerowano automatycznie z folderu HomebrewWorld/Settings</span>
            <span>{generated_at}</span>
        </footer>
    </main>
</body>
</html>
"""

    target = output_dir / "index.html"
    target.write_text(html, encoding="utf-8")
    return target


def build_site(selected_names: list[str], output_dir: Path) -> list[dict[str, str]]:
    render_web = load_render_web()
    available = {path.name: path for path in discover_settings()}
    missing = [name for name in selected_names if name not in available]
    if missing:
        raise SystemExit(f"Nie znaleziono settingow: {', '.join(missing)}")

    output_dir.mkdir(parents=True, exist_ok=True)
    cards = []
    for name in selected_names:
        setting_dir = available[name]
        slug = slugify(name)
        setting_output_dir = output_dir / slug
        setting_output_dir.mkdir(parents=True, exist_ok=True)
        publish_setting_pdfs(setting_dir, setting_output_dir)
        render_web.generate_site(str(setting_dir), str(setting_output_dir), home_href="../index.html")
        cards.append(
            {
                "slug": slug,
                "title": humanize(name),
                "summary": build_setting_summary(setting_dir),
            }
        )

    render_homepage(cards, output_dir)
    return cards


def deploy_site(output_dir: Path, app_name: str, go_live: bool, delete_remote: bool) -> None:
    command = [str(DEPLOY_SCRIPT)]
    if go_live:
        command.append("--go")
    if delete_remote:
        command.append("--delete")
    command.append(app_name)
    subprocess.run(command, cwd=output_dir, check=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Buduje i opcjonalnie publikuje statyczna strone Homebrew Worlds."
    )
    parser.add_argument(
        "settings",
        nargs="*",
        help="Nazwy katalogow settingow z HomebrewWorld/Settings. Gdy puste, skrypt publikuje wszystkie wykryte.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(OUTPUT_ROOT),
        help="Katalog wyjsciowy dla statycznego serwisu.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="Wypisz dostepne settingi i zakoncz.",
    )
    parser.add_argument(
        "--deploy",
        action="store_true",
        help="Po zbudowaniu uruchom deploy przez deploy-mikrus.",
    )
    parser.add_argument(
        "--go",
        action="store_true",
        help="Przy deployu wykonaj live deploy zamiast dry-run.",
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Przy deployu usun z serwera pliki, ktorych nie ma lokalnie.",
    )
    parser.add_argument(
        "--app-name",
        default="homebrew-worlds",
        help="Docelowy katalog aplikacji na serwerze.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    available = discover_settings()
    if not available:
        raise SystemExit("Brak wykrytych settingow w HomebrewWorld/Settings")

    if args.list:
        for setting in available:
            print(setting.name)
        return 0

    selected = args.settings or [setting.name for setting in available]
    cards = build_site(selected, Path(args.output_dir))
    print(f"Zbudowano Homebrew Worlds z {len(cards)} settingami w {args.output_dir}")

    if args.deploy:
        deploy_site(Path(args.output_dir), args.app_name, args.go, args.delete)

    return 0


if __name__ == "__main__":
    sys.exit(main())
