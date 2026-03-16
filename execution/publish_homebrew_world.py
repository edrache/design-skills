#!/usr/bin/env python3

from __future__ import annotations

import argparse
import datetime as dt
import importlib.util
import re
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
HOME_BREW_ROOT = REPO_ROOT / "HomebrewWorld"
SETTINGS_ROOT = HOME_BREW_ROOT / "Settings"
OUTPUT_ROOT = HOME_BREW_ROOT / "site"
RENDER_WEB_PATH = HOME_BREW_ROOT / "Skills" / "homebrew-web-presenter" / "scripts" / "render_web.py"
DEPLOY_SCRIPT = REPO_ROOT / "skills" / "skills-custom" / "deploy-mikrus" / "scripts" / "deploy.sh"


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


def render_homepage(cards: list[dict[str, str]], output_dir: Path) -> Path:
    generated_at = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
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

    html = f"""<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Homebrew Worlds</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg: #111015;
            --panel: rgba(255, 248, 238, 0.08);
            --panel-strong: rgba(255, 248, 238, 0.14);
            --line: rgba(255, 248, 238, 0.16);
            --text: #f6f0e8;
            --muted: #cabfb1;
            --accent: #d29b5c;
            --accent-strong: #f0c489;
        }}

        * {{ box-sizing: border-box; }}
        html {{ scroll-behavior: smooth; }}

        body {{
            margin: 0;
            min-height: 100vh;
            font-family: "Manrope", sans-serif;
            color: var(--text);
            background:
                radial-gradient(circle at top left, rgba(210, 155, 92, 0.18), transparent 32%),
                radial-gradient(circle at bottom right, rgba(128, 62, 46, 0.25), transparent 28%),
                linear-gradient(180deg, #17141d 0%, #0d0c10 100%);
        }}

        body::before {{
            content: "";
            position: fixed;
            inset: 0;
            pointer-events: none;
            background-image:
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
            background-size: 36px 36px;
            mask-image: linear-gradient(180deg, rgba(0,0,0,0.55), transparent 90%);
        }}

        .shell {{
            width: min(1160px, calc(100% - 32px));
            margin: 0 auto;
            padding: 32px 0 56px;
        }}

        .hero {{
            padding: clamp(2rem, 5vw, 5rem);
            border: 1px solid var(--line);
            border-radius: 32px;
            background:
                linear-gradient(135deg, rgba(255, 248, 238, 0.08), rgba(255, 248, 238, 0.02)),
                rgba(12, 10, 15, 0.72);
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
            overflow: hidden;
            position: relative;
        }}

        .hero::after {{
            content: "";
            position: absolute;
            inset: auto -10% -35% 50%;
            width: 60%;
            aspect-ratio: 1;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(240, 196, 137, 0.35), transparent 60%);
            filter: blur(18px);
        }}

        .eyebrow {{
            margin: 0 0 18px;
            color: var(--accent-strong);
            text-transform: uppercase;
            letter-spacing: 0.24em;
            font-size: 0.74rem;
            font-weight: 800;
        }}

        h1 {{
            margin: 0;
            max-width: 10ch;
            font-family: "Cormorant Garamond", serif;
            font-size: clamp(3.6rem, 9vw, 7.2rem);
            line-height: 0.9;
            font-weight: 700;
        }}

        .lead {{
            position: relative;
            z-index: 1;
            width: min(44rem, 100%);
            margin: 24px 0 0;
            color: var(--muted);
            font-size: clamp(1rem, 2vw, 1.15rem);
            line-height: 1.8;
        }}

        .toolbar {{
            display: flex;
            gap: 14px;
            flex-wrap: wrap;
            margin-top: 28px;
            position: relative;
            z-index: 1;
        }}

        .toolbar-chip {{
            padding: 12px 16px;
            border-radius: 999px;
            background: var(--panel);
            border: 1px solid var(--line);
            color: var(--text);
            font-weight: 700;
        }}

        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
            gap: 18px;
            margin-top: 26px;
        }}

        .world-card {{
            padding: 24px;
            border-radius: 24px;
            border: 1px solid var(--line);
            background: linear-gradient(180deg, var(--panel-strong), rgba(255, 248, 238, 0.04));
            min-height: 240px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
        }}

        .world-card:hover {{
            transform: translateY(-4px);
            border-color: rgba(240, 196, 137, 0.45);
            background: linear-gradient(180deg, rgba(255, 248, 238, 0.18), rgba(255, 248, 238, 0.06));
        }}

        .world-kicker {{
            margin: 0 0 24px;
            color: var(--accent-strong);
            font-size: 0.72rem;
            font-weight: 800;
            letter-spacing: 0.2em;
            text-transform: uppercase;
        }}

        .world-card h2 {{
            margin: 0;
            font-size: clamp(1.7rem, 3vw, 2.4rem);
            line-height: 1;
            font-family: "Cormorant Garamond", serif;
        }}

        .world-meta {{
            margin: 14px 0 28px;
            color: var(--muted);
            line-height: 1.7;
        }}

        .world-link {{
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: fit-content;
            padding: 12px 18px;
            border-radius: 999px;
            text-decoration: none;
            color: #1a1410;
            background: var(--accent-strong);
            font-weight: 800;
        }}

        footer {{
            display: flex;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
            margin-top: 24px;
            padding: 0 4px;
            color: var(--muted);
            font-size: 0.9rem;
        }}

        @media (max-width: 640px) {{
            .shell {{
                width: min(100% - 20px, 1160px);
                padding-top: 20px;
            }}

            .hero {{
                border-radius: 24px;
                padding: 24px;
            }}

            h1 {{
                max-width: none;
            }}
        }}
    </style>
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

    output_dir.mkdir(parents=True, exist_ok=True)
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
        render_web.generate_site(str(setting_dir), str(output_dir / slug), home_href="../index.html")
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
