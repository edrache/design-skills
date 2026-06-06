#!/usr/bin/env python3
"""
GDC Vault video downloader.

Usage:
    python gdcvault_download.py <URL> [URL2 ...] [--quality 720|480|1080|best] [--output DIR] [--mp3]

Examples:
    python gdcvault_download.py https://gdcvault.com/play/1035926/...
    python gdcvault_download.py https://gdcvault.com/play/1035926/... --quality 720 --output ~/Downloads/GDC
    python gdcvault_download.py https://gdcvault.com/play/1035926/... --mp3
"""

import argparse
import re
import subprocess
import sys
import urllib.request
from pathlib import Path


BLAZE_SCRIPT_URL = "https://gdcvault.blazestreaming.com/script_VOD.js"
BLAZE_CDN_PATTERN = "https://cdn-a.blazestreaming.com/out/v1/{video_id}/{hash1}/{hash2}/index.m3u8"

QUALITY_FORMAT_MAP = {
    "480": "347",
    "720": "530",
    "1080": "1407",
    "best": "bestvideo+bestaudio/best",
}


def fetch_url(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as r:
        return r.read().decode("utf-8", errors="replace")


def get_blaze_url_pattern() -> str:
    """Fetch script_VOD.js and extract the CDN URL pattern.

    The JS uses string concatenation: 'BASE'+videoId+'/HASH1/HASH2/index.m3u8'
    so we join the entire PLAYBACK_URL line and extract the two 32-char hashes.
    """
    js = fetch_url(BLAZE_SCRIPT_URL)
    # Match the full concatenated line, e.g.:
    # PLAYBACK_URL = '...base...'+videoId+'/HASH1/HASH2/index.m3u8';
    m = re.search(r"PLAYBACK_URL\s*=\s*(.+?);", js)
    if not m:
        raise RuntimeError("Nie znaleziono wzorca URL w script_VOD.js")
    line = m.group(1)
    hashes = re.findall(r"[a-f0-9]{32}", line)
    if len(hashes) < 2:
        raise RuntimeError(f"Nieoczekiwany format wzorca w script_VOD.js: {line}")
    return BLAZE_CDN_PATTERN.format(video_id="{video_id}", hash1=hashes[0], hash2=hashes[1])


def extract_blaze_video_id(gdcvault_url: str) -> tuple[str, str]:
    """Return (video_id, page_title) from a GDC Vault page."""
    html = fetch_url(gdcvault_url)

    # Find blazestreaming iframe
    m = re.search(r'src=["\']https://gdcvault\.blazestreaming\.com/\?id=([a-f0-9]+)["\']', html, re.I)
    if not m:
        raise RuntimeError(
            "Nie znaleziono embedu blazestreaming na stronie. "
            "Film może wymagać logowania lub mieć inny format odtwarzacza."
        )
    video_id = m.group(1)

    # Extract page title for filename
    title_m = re.search(r"<title>([^<]+)</title>", html, re.I)
    title = title_m.group(1).strip() if title_m else video_id
    # Clean title for use in filename
    title = re.sub(r"[^\w\s\-]", "", title).strip()
    title = re.sub(r"\s+", "_", title)

    return video_id, title


def build_m3u8_url(pattern: str, video_id: str) -> str:
    return pattern.replace("{video_id}", video_id)


def download_video(m3u8_url: str, title: str, output_dir: Path, quality: str, mp3: bool) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_template = str(output_dir / f"{title}.%(ext)s")

    if mp3:
        # Stream ma audio zmuxowane z wideo — pobieramy najniższą jakość i wycinamy audio
        cmd = [
            "yt-dlp",
            "--format", "347",  # 480p — najmniejszy format zawierający audio
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "0",  # najlepsza jakość VBR
            "--output", output_template,
            "--no-warnings",
            "--progress",
            m3u8_url,
        ]
        print(f"  Pobieranie audio: {title}")
        print(f"  Format: MP3 (najlepsza jakość, audio z 480p)")
    else:
        fmt = QUALITY_FORMAT_MAP.get(quality, QUALITY_FORMAT_MAP["best"])
        cmd = [
            "yt-dlp",
            "--format", fmt,
            "--merge-output-format", "mp4",
            "--output", output_template,
            "--no-warnings",
            "--progress",
            m3u8_url,
        ]
        print(f"  Pobieranie wideo: {title}")
        print(f"  Jakość: {quality}p" if quality != "best" else "  Jakość: najlepsza")

    print(f"  Cel: {output_dir}")
    result = subprocess.run(cmd)
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp zakończył się błędem (kod {result.returncode})")


def main():
    parser = argparse.ArgumentParser(description="Pobierz wideo z GDC Vault")
    parser.add_argument("urls", nargs="+", help="URL(e) z gdcvault.com/play/...")
    parser.add_argument(
        "--quality", choices=["480", "720", "1080", "best"], default="720",
        help="Jakość wideo (domyślnie: 720)"
    )
    parser.add_argument(
        "--output", default=".", type=Path,
        help="Katalog docelowy (domyślnie: bieżący)"
    )
    parser.add_argument(
        "--mp3", action="store_true",
        help="Pobierz tylko audio i zapisz jako MP3"
    )
    args = parser.parse_args()

    print("Pobieranie wzorca URL CDN z script_VOD.js...")
    try:
        pattern = get_blaze_url_pattern()
    except Exception as e:
        print(f"BŁĄD: {e}", file=sys.stderr)
        sys.exit(1)

    errors = []
    for url in args.urls:
        print(f"\n{'='*60}")
        print(f"URL: {url}")
        try:
            video_id, title = extract_blaze_video_id(url)
            m3u8_url = build_m3u8_url(pattern, video_id)
            print(f"  ID wideo: {video_id}")
            download_video(m3u8_url, title, args.output, args.quality, args.mp3)
            print("  OK")
        except Exception as e:
            print(f"  BŁĄD: {e}", file=sys.stderr)
            errors.append((url, str(e)))

    if errors:
        print(f"\n{len(errors)} błąd(ów):")
        for url, err in errors:
            print(f"  {url}: {err}")
        sys.exit(1)


if __name__ == "__main__":
    main()
