#!/usr/bin/env python3
"""
Sprite Sheet Tool
  create  - pack images into a sprite sheet
  split   - extract individual sprites from a sheet

Usage:
  python spritesheet.py create --input img1.png img2.png ... --output sheet.png [--padding 1] [--pow2]
  python spritesheet.py create --input-dir ./sprites/ --output sheet.png [--padding 1] [--pow2]
  python spritesheet.py split  --input sheet.png --cols 4 --rows 3 --output-dir ./out/ [--prefix sprite_]
"""

import argparse
import math
import os
import sys
from pathlib import Path

from PIL import Image


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _powers_of_2_near(n: int) -> list[int]:
    """Return the two nearest powers of 2 around n (or one if n is exact)."""
    if n <= 0:
        return [1]
    lower = 2 ** math.floor(math.log2(n))
    upper = 2 ** math.ceil(math.log2(n))
    return list(dict.fromkeys([lower, upper]))  # dedupe when n is exact power


def best_pow2_size(w: int, h: int) -> tuple[int, int]:
    """Find the power-of-2 canvas size (NW x NH) with smallest relative area change vs w*h."""
    candidates_w = _powers_of_2_near(w)
    candidates_h = _powers_of_2_near(h)
    original_area = w * h
    best, best_diff = None, float("inf")
    for nw in candidates_w:
        for nh in candidates_h:
            diff = abs(nw * nh - original_area) / original_area
            if diff < best_diff:
                best_diff, best = diff, (nw, nh)
    return best


def calc_grid(n: int, sw: int, sh: int, padding: int) -> tuple[int, int]:
    """Choose (cols, rows) so the final sheet is as close to square as possible."""
    best_cols, best_rows, best_diff = 1, n, float("inf")
    for cols in range(1, n + 1):
        rows = math.ceil(n / cols)
        sheet_w = cols * sw + (cols + 1) * padding
        sheet_h = rows * sh + (rows + 1) * padding
        diff = abs(sheet_w / sheet_h - 1.0)
        if diff < best_diff:
            best_diff, best_cols, best_rows = diff, cols, rows
    return best_cols, best_rows


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

def cmd_create(args):
    # Collect input files
    if args.input_dir:
        exts = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
        paths = sorted(
            p for p in Path(args.input_dir).iterdir()
            if p.suffix.lower() in exts
        )
        if not paths:
            print(f"ERROR: No images found in {args.input_dir}", file=sys.stderr)
            sys.exit(1)
    else:
        paths = [Path(p) for p in args.input]

    if not paths:
        print("ERROR: No input images provided.", file=sys.stderr)
        sys.exit(1)

    # Load images
    images: list[Image.Image] = []
    for p in paths:
        try:
            images.append(Image.open(p).convert("RGBA"))
        except Exception as e:
            print(f"ERROR: Cannot open {p}: {e}", file=sys.stderr)
            sys.exit(1)

    # Validate uniform size
    sizes = [(img.width, img.height) for img in images]
    unique_sizes = set(sizes)
    if len(unique_sizes) > 1:
        print(
            f"WARNING: Not all sprites are the same size. Found sizes: {unique_sizes}. "
            "Using size of the first image; others will be pasted at their natural size.",
            file=sys.stderr,
        )
    sprite_w, sprite_h = sizes[0]

    n = len(images)
    padding = args.padding

    if args.cols and args.rows:
        cols, rows = args.cols, args.rows
        if cols * rows < n:
            print(f"ERROR: Grid {cols}x{rows}={cols*rows} cells is too small for {n} sprites.", file=sys.stderr)
            sys.exit(1)
    elif args.cols:
        cols = args.cols
        rows = math.ceil(n / cols)
    elif args.rows:
        rows = args.rows
        cols = math.ceil(n / rows)
    else:
        cols, rows = calc_grid(n, sprite_w, sprite_h, padding)

    natural_w = cols * sprite_w + (cols + 1) * padding
    natural_h = rows * sprite_h + (rows + 1) * padding

    if args.pow2:
        final_w, final_h = best_pow2_size(natural_w, natural_h)
    else:
        final_w, final_h = natural_w, natural_h

    # Compose at natural size, then resize to final if needed
    sheet = Image.new("RGBA", (natural_w, natural_h), (0, 0, 0, 0))
    for i, img in enumerate(images):
        col = i % cols
        row = i // cols
        x = padding + col * (sprite_w + padding)
        y = padding + row * (sprite_h + padding)
        sheet.paste(img, (x, y))

    if (final_w, final_h) != (natural_w, natural_h):
        sheet = sheet.resize((final_w, final_h), Image.LANCZOS)
        print(
            f"INFO: Resized from natural {natural_w}x{natural_h} → {final_w}x{final_h} (pow2)",
            file=sys.stderr,
        )

    # Append Unity X scale correction to filename (sprite_w / sprite_h)
    out_path = Path(args.output)
    x_scale = sprite_w / sprite_h
    if abs(x_scale - 1.0) >= 0.005:
        out_path = out_path.with_stem(out_path.stem + f"_sx{x_scale:.2f}")

    os.makedirs(out_path.parent, exist_ok=True) if out_path.parent.as_posix() != "." else None
    sheet.save(out_path)
    print(
        f"Created: {out_path}  |  {final_w}x{final_h}  |  grid {cols}x{rows}  |  {n} sprites  |  padding {padding}px  |  Unity X scale: {x_scale:.2f}"
    )


# ---------------------------------------------------------------------------
# Split
# ---------------------------------------------------------------------------

def cmd_split(args):
    img = Image.open(args.input).convert("RGBA")
    iw, ih = img.size
    cols, rows = args.cols, args.rows

    if iw % cols != 0 or ih % rows != 0:
        print(
            f"WARNING: Sheet size {iw}x{ih} is not evenly divisible by {cols}x{rows} grid.",
            file=sys.stderr,
        )

    sprite_w = iw // cols
    sprite_h = ih // rows
    out_dir = Path(args.output_dir)
    if out_dir.exists():
        import shutil
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    prefix = args.prefix
    count = 0
    for row in range(rows):
        for col in range(cols):
            x0 = col * sprite_w
            y0 = row * sprite_h
            sprite = img.crop((x0, y0, x0 + sprite_w, y0 + sprite_h))
            out_path = out_dir / f"{prefix}{count:04d}.png"
            sprite.save(out_path)
            count += 1

    print(
        f"Split: {args.input}  |  {cols}x{rows} grid  |  {sprite_w}x{sprite_h} per sprite  |  {count} sprites → {out_dir}/"
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Sprite sheet tool: create / split")
    sub = parser.add_subparsers(dest="command", required=True)

    # -- create --
    p_create = sub.add_parser("create", help="Pack images into a sprite sheet")
    src = p_create.add_mutually_exclusive_group(required=True)
    src.add_argument("--input", nargs="+", metavar="FILE", help="List of input image files")
    src.add_argument("--input-dir", metavar="DIR", help="Directory of input images (sorted alphabetically)")
    p_create.add_argument("--output", required=True, metavar="FILE", help="Output PNG file")
    p_create.add_argument("--padding", type=int, default=1, metavar="PX", help="Padding around each sprite in pixels (default: 1)")
    p_create.add_argument("--cols", type=int, default=None, metavar="N", help="Force number of columns (default: auto)")
    p_create.add_argument("--rows", type=int, default=None, metavar="N", help="Force number of rows (default: auto)")
    p_create.add_argument("--pow2", action="store_true", help="Resize final sheet to nearest power-of-2 dimensions")
    p_create.set_defaults(func=cmd_create)

    # -- split --
    p_split = sub.add_parser("split", help="Extract sprites from a sheet")
    p_split.add_argument("--input", required=True, metavar="FILE", help="Input sprite sheet PNG")
    p_split.add_argument("--cols", required=True, type=int, help="Number of columns")
    p_split.add_argument("--rows", required=True, type=int, help="Number of rows")
    p_split.add_argument("--output-dir", required=True, metavar="DIR", help="Output directory for sprites")
    p_split.add_argument("--prefix", default="sprite_", metavar="STR", help="Output filename prefix (default: sprite_)")
    p_split.set_defaults(func=cmd_split)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
