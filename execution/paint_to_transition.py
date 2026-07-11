#!/usr/bin/env python3
"""Generate a Unity UIEffect Transition Texture PNG from a paint-spread video.

The alpha channel encodes paint arrival time: first painted pixel = alpha 255,
last painted pixel = alpha 0 (or inverted with --invert).
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, distance_transform_edt


def extract_frames(video_path: str, out_dir: str) -> int:
    """Extract all video frames as grayscale PNGs via ffmpeg. Returns frame count."""
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vf", "format=gray",
        os.path.join(out_dir, "frame_%06d.png"),
        "-hide_banner", "-loglevel", "error",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ffmpeg error:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)

    frames = sorted(f for f in os.listdir(out_dir) if f.startswith("frame_") and f.endswith(".png"))
    return len(frames)


def build_time_map(frame_dir: str, frame_count: int, size: int, threshold: int, dark_on_light: bool) -> np.ndarray:
    """Return a (size, size) float32 array with normalized arrival time per pixel.

    dark_on_light=True: detects pixels dropping BELOW threshold (black ink on white bg).
    dark_on_light=False: detects pixels rising ABOVE threshold (white paint on black bg).
    """
    frames = sorted(f for f in os.listdir(frame_dir) if f.startswith("frame_") and f.endswith(".png"))

    # time_map: 0.0 = never painted; filled in on first threshold crossing
    time_map = np.zeros((size, size), dtype=np.float32)
    painted = np.zeros((size, size), dtype=bool)

    total = len(frames)
    for i, fname in enumerate(frames):
        print(f"\rKlatka {i + 1}/{total}", end="", flush=True)
        img = Image.open(os.path.join(frame_dir, fname)).convert("L").resize((size, size), Image.LANCZOS)
        arr = np.array(img, dtype=np.uint8)

        if dark_on_light:
            newly_painted = (~painted) & (arr <= threshold)
        else:
            newly_painted = (~painted) & (arr >= threshold)

        if newly_painted.any():
            # Normalized frame index: first frame → 1.0, last → near 0.0
            norm_value = 1.0 - (i / max(total - 1, 1))
            time_map[newly_painted] = norm_value
            painted |= newly_painted

    print()  # newline after progress
    return time_map


def apply_fill_gradient(time_map: np.ndarray, fill_ceiling: float = 0.25) -> np.ndarray:
    """Extend painted area into unpainted pixels using distance-based gradient.

    Painted pixels are rescaled to [fill_ceiling, 1.0] so the fill gradient
    has a guaranteed visible range [0, fill_ceiling], regardless of how small
    the original min_painted value is.

    fill_ceiling: fraction of [0,1] reserved for the fill gradient (default 0.25 = alpha 0–64).
    """
    time_map = time_map.copy()
    unpainted = time_map == 0
    painted = ~unpainted

    if not painted.any() or not unpainted.any():
        return time_map

    # Rescale painted pixels from [min_p, max_p] → [fill_ceiling, 1.0]
    # so the fill zone always has a meaningful visible range below it.
    min_p = float(time_map[painted].min())
    max_p = float(time_map[painted].max())
    denom = max_p - min_p if max_p > min_p else 1.0
    time_map[painted] = fill_ceiling + (time_map[painted] - min_p) / denom * (1.0 - fill_ceiling)

    # Distance of each unpainted pixel from the nearest painted pixel
    dist = distance_transform_edt(unpainted)
    max_dist = float(dist.max())

    if max_dist == 0:
        return time_map

    # dist=0 (edge of painted area) → fill_ceiling, dist=max_dist (farthest) → 0
    fill = fill_ceiling * (1.0 - dist / max_dist)
    time_map[unpainted] = fill[unpainted].astype(np.float32)

    return time_map


def save_as_transition_png(time_map: np.ndarray, output_path: str, invert: bool, blur_radius: float, fill_gradient: bool) -> None:
    """Apply optional fill gradient, blur, invert, then save RGBA PNG with data in alpha."""
    if fill_gradient:
        print("Wypełnianie gradientem (distance transform)...")
        time_map = apply_fill_gradient(time_map)

    if blur_radius > 0:
        time_map = gaussian_filter(time_map.astype(np.float64), sigma=blur_radius).astype(np.float32)

    if invert:
        # Invert all non-zero pixels (includes fill-gradient area)
        mask = time_map > 0
        time_map[mask] = 1.0 - time_map[mask]

    alpha = np.clip(time_map * 255, 0, 255).astype(np.uint8)
    size = alpha.shape[0]

    rgba = np.zeros((size, size, 4), dtype=np.uint8)
    rgba[:, :, 3] = alpha

    Image.fromarray(rgba, mode="RGBA").save(output_path)
    print(f"Zapisano: {output_path}  ({size}×{size} px)")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generuj Unity Transition Texture PNG z wideo rozlewającej się farby."
    )
    parser.add_argument("--input", required=True, help="Ścieżka do pliku wideo")
    parser.add_argument("--output", required=True, help="Ścieżka do wyjściowego PNG")
    parser.add_argument("--size", type=int, default=512, help="Rozmiar tekstury (px, kwadrat, domyślnie 512)")
    parser.add_argument("--threshold", type=int, default=128, help="Próg binarny 0–255 (domyślnie 128)")
    parser.add_argument("--blur", type=float, default=0.0, help="Promień Gaussian blur (0 = wyłączony)")
    parser.add_argument("--invert", action="store_true", help="Odwróć alpha: zamalowane pierwsze → alpha 0")
    parser.add_argument("--dark-on-light", action="store_true",
                        help="Tryb: ciemny atrament na jasnym tle (wykrywa piksele <= próg)")
    parser.add_argument("--fill-gradient", action="store_true",
                        help="Wypełnij niepomalowane piksele gradientem odległości od plamy (efekt płynnego powiększania)")
    args = parser.parse_args()

    if not os.path.isfile(args.input):
        print(f"Błąd: plik wejściowy nie istnieje: {args.input}", file=sys.stderr)
        sys.exit(1)

    tmp_dir = tempfile.mkdtemp(prefix="paint_transition_")
    try:
        print(f"Ekstrahowanie klatek z: {args.input}")
        frame_count = extract_frames(args.input, tmp_dir)
        if frame_count == 0:
            print("Błąd: ffmpeg nie wyekstrahował żadnych klatek.", file=sys.stderr)
            sys.exit(1)
        print(f"Łącznie klatek: {frame_count}")

        mode = "ciemny-na-jasnym" if args.dark_on_light else "jasny-na-ciemnym"
        print(f"Budowanie time map ({args.size}×{args.size}, próg={args.threshold}, tryb={mode})...")
        time_map = build_time_map(tmp_dir, frame_count, args.size, args.threshold, args.dark_on_light)

        painted_px = (time_map > 0).sum()
        total_px = args.size * args.size
        print(f"Zamalowane piksele: {painted_px}/{total_px} ({100 * painted_px / total_px:.1f}%)")

        save_as_transition_png(time_map, args.output, args.invert, args.blur, args.fill_gradient)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
