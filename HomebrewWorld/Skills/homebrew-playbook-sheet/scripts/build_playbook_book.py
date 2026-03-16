#!/usr/bin/env python3
import argparse
import subprocess
import sys
from pathlib import Path


def run_command(args: list[str]) -> None:
    subprocess.run(args, check=True)


def find_playbooks(source_dir: Path) -> list[Path]:
    return sorted(
        path for path in source_dir.glob("Playbook_*.md")
        if path.is_file()
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Render all Homebrew World playbooks in a folder to PDFs and merge them into one document."
    )
    parser.add_argument("source_dir", help="Directory containing Playbook_*.md files")
    parser.add_argument("--output-dir", required=True, help="Directory for generated HTML/PDF files")
    parser.add_argument(
        "--merged-name",
        default="Homebrew_World_Playbooks_Combined.pdf",
        help="Filename for the merged PDF"
    )
    parser.add_argument(
        "--merged-only",
        action="store_true",
        help="After merging, delete intermediate HTML and per-playbook PDF files, keeping only the merged PDF.",
    )
    args = parser.parse_args()

    source_dir = Path(args.source_dir).resolve()
    output_dir = Path(args.output_dir).resolve()

    if not source_dir.exists() or not source_dir.is_dir():
        raise SystemExit(f"Source directory not found: {source_dir}")

    playbooks = find_playbooks(source_dir)
    if not playbooks:
        raise SystemExit(f"No Playbook_*.md files found in: {source_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)
    script_dir = Path(__file__).resolve().parent
    render_script = script_dir / "render_playbook_sheet.py"
    render_optional_moves_script = script_dir / "render_optional_moves_sheet.py"
    render_adventure_script = script_dir / "render_adventure_sheet.py"
    export_script = script_dir / "export_playbook_pdf.mjs"

    pdf_paths: list[Path] = []
    html_paths: list[Path] = []

    for playbook_path in playbooks:
        run_command([
            sys.executable,
            str(render_script),
            str(playbook_path),
            "--output-dir",
            str(output_dir),
        ])

        html_path = output_dir / f"{playbook_path.stem}.html"
        pdf_path = output_dir / f"{playbook_path.stem}.pdf"
        html_paths.append(html_path)

        run_command([
            "node",
            str(export_script),
            str(html_path),
            str(pdf_path),
        ])
        pdf_paths.append(pdf_path)

    optional_moves_path = source_dir / "Optional_Moves.md"
    if optional_moves_path.exists():
        run_command([
            sys.executable,
            str(render_optional_moves_script),
            str(optional_moves_path),
            "--output-dir",
            str(output_dir),
        ])

        optional_moves_html = output_dir / f"{optional_moves_path.stem}.html"
        optional_moves_pdf = output_dir / f"{optional_moves_path.stem}.pdf"
        html_paths.append(optional_moves_html)

        run_command([
            "node",
            str(export_script),
            str(optional_moves_html),
            str(optional_moves_pdf),
        ])
        pdf_paths.append(optional_moves_pdf)

    adventure_path = source_dir / "adventure.md"
    if adventure_path.exists():
        run_command([
            sys.executable,
            str(render_adventure_script),
            str(adventure_path),
            "--output-dir",
            str(output_dir),
        ])

        adventure_html = output_dir / f"{adventure_path.stem}.html"
        adventure_pdf = output_dir / f"{adventure_path.stem}.pdf"
        html_paths.append(adventure_html)

        run_command([
            "node",
            str(export_script),
            str(adventure_html),
            str(adventure_pdf),
        ])
        pdf_paths.append(adventure_pdf)

    merged_pdf_path = output_dir / args.merged_name
    run_command([
        "pdfunite",
        *[str(path) for path in pdf_paths],
        str(merged_pdf_path),
    ])

    if args.merged_only:
        for path in html_paths + pdf_paths:
            if path.exists() and path != merged_pdf_path:
                path.unlink()

    print(merged_pdf_path)


if __name__ == "__main__":
    main()
