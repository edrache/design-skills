#!/usr/bin/env python3
"""
compress_pdf.py - Compress PDF files using Ghostscript.

Usage:
    python compress_pdf.py input.pdf [options]
    python compress_pdf.py input1.pdf input2.pdf -o output_dir/ [options]

Quality presets (--quality):
    screen    - 72 dpi, max compression (~20% of original)
    ebook     - 150 dpi, good balance (~40% of original)
    printer   - 300 dpi, high quality (~70% of original)
    prepress  - 300+ dpi, minimal compression (~90% of original)

Image DPI (--dpi):
    Custom DPI for images. Overrides quality preset DPI.

Target size (--target-size):
    e.g. "2MB", "500KB". Script will try progressively lower quality
    until target is reached; reports minimum achievable if not possible.
"""

import sys
import os
import shutil
import argparse
import subprocess
import tempfile
from pathlib import Path


QUALITY_PRESETS = {
    "screen":   {"gs_setting": "/screen",   "dpi": 72,  "label": "Screen (72 dpi, max compression)"},
    "ebook":    {"gs_setting": "/ebook",    "dpi": 150, "label": "Ebook (150 dpi, balanced)"},
    "printer":  {"gs_setting": "/printer",  "dpi": 300, "label": "Printer (300 dpi, high quality)"},
    "prepress": {"gs_setting": "/prepress", "dpi": 300, "label": "Prepress (300+ dpi, minimal compression)"},
}

PRESET_ORDER = ["screen", "ebook", "printer", "prepress"]


def find_ghostscript():
    """Find ghostscript binary."""
    for name in ["gs", "gswin64c", "gswin32c"]:
        path = shutil.which(name)
        if path:
            return path
    return None


def parse_size(size_str: str) -> int:
    """Parse size string like '2MB', '500KB' to bytes."""
    size_str = size_str.strip().upper()
    units = {"B": 1, "KB": 1024, "MB": 1024**2, "GB": 1024**3}
    for unit, multiplier in sorted(units.items(), key=lambda x: -len(x[0])):
        if size_str.endswith(unit):
            return int(float(size_str[:-len(unit)].strip()) * multiplier)
    # plain number = bytes
    return int(size_str)


def format_size(bytes_val: int) -> str:
    """Format bytes as human-readable string."""
    for unit in ["B", "KB", "MB", "GB"]:
        if bytes_val < 1024:
            return f"{bytes_val:.1f} {unit}"
        bytes_val /= 1024
    return f"{bytes_val:.1f} TB"


def compress_with_gs(gs_bin: str, input_path: str, output_path: str,
                     quality: str, dpi: int | None = None) -> bool:
    """Run Ghostscript compression. Returns True on success."""
    preset = QUALITY_PRESETS[quality]
    gs_setting = preset["gs_setting"]
    effective_dpi = dpi if dpi is not None else preset["dpi"]

    cmd = [
        gs_bin,
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        f"-dPDFSETTINGS={gs_setting}",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        f"-dColorImageResolution={effective_dpi}",
        f"-dGrayImageResolution={effective_dpi}",
        f"-dMonoImageResolution={effective_dpi}",
        "-dColorImageDownsampleType=/Bicubic",
        "-dGrayImageDownsampleType=/Bicubic",
        f"-sOutputFile={output_path}",
        input_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERROR: Ghostscript failed:\n{result.stderr}", file=sys.stderr)
        return False
    return True


def compress_single(gs_bin: str, input_path: Path, output_path: Path,
                    quality: str, dpi: int | None,
                    target_bytes: int | None) -> dict:
    """Compress a single PDF. Returns stats dict."""
    original_size = input_path.stat().st_size

    if target_bytes is not None:
        # Try presets from worst quality up until target is met
        best_result = None
        print(f"  Target size: {format_size(target_bytes)}")

        for preset_name in PRESET_ORDER:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp_path = tmp.name

            try:
                ok = compress_with_gs(gs_bin, str(input_path), tmp_path, preset_name, dpi)
                if not ok:
                    continue
                result_size = Path(tmp_path).stat().st_size
                ratio = result_size / original_size * 100

                print(f"  [{preset_name:8s}] {format_size(result_size):>10s}  ({ratio:.0f}% of original)")

                if best_result is None or result_size < best_result["size"]:
                    best_result = {"preset": preset_name, "size": result_size, "tmp": tmp_path}

                if result_size <= target_bytes:
                    # Target achieved — use this result
                    shutil.copy2(tmp_path, output_path)
                    os.unlink(tmp_path)
                    return {
                        "file": input_path.name,
                        "original": original_size,
                        "compressed": result_size,
                        "preset_used": preset_name,
                        "target_achieved": True,
                    }
            except Exception as e:
                print(f"  WARNING: preset {preset_name} failed: {e}", file=sys.stderr)
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

        # Target not achievable — use best (smallest) result
        if best_result:
            shutil.copy2(best_result["tmp"], output_path)
            os.unlink(best_result["tmp"])
            min_size = best_result["size"]
            print(f"\n  ⚠ Target {format_size(target_bytes)} not achievable.")
            print(f"    Minimum achievable: {format_size(min_size)} (preset: {best_result['preset']})")
            return {
                "file": input_path.name,
                "original": original_size,
                "compressed": min_size,
                "preset_used": best_result["preset"],
                "target_achieved": False,
                "min_achievable": min_size,
                "target": target_bytes,
            }
        else:
            return {"file": input_path.name, "error": "All compression attempts failed"}

    else:
        # Normal compression with specified quality
        ok = compress_with_gs(gs_bin, str(input_path), str(output_path), quality, dpi)
        if not ok:
            return {"file": input_path.name, "error": "Compression failed"}

        result_size = output_path.stat().st_size
        ratio = result_size / original_size * 100
        return {
            "file": input_path.name,
            "original": original_size,
            "compressed": result_size,
            "preset_used": quality,
            "target_achieved": None,
        }


def main():
    parser = argparse.ArgumentParser(
        description="Compress PDF files using Ghostscript.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("inputs", nargs="+", help="Input PDF file(s)")
    parser.add_argument(
        "-o", "--output",
        help="Output path: file (single input) or directory (multiple inputs). "
             "Default: input_compressed.pdf or input_dir/",
    )
    parser.add_argument(
        "-q", "--quality",
        choices=list(QUALITY_PRESETS.keys()),
        default="ebook",
        help="Compression quality preset (default: ebook). Ignored if --target-size is set.",
    )
    parser.add_argument(
        "--dpi",
        type=int,
        help="Override image resolution in DPI (e.g. 100). Overrides preset DPI.",
    )
    parser.add_argument(
        "--target-size",
        help="Target output size, e.g. '2MB', '500KB'. Tries all presets to reach target.",
    )
    parser.add_argument(
        "--suffix",
        default="_compressed",
        help="Suffix for output filename when no -o is given (default: _compressed)",
    )
    args = parser.parse_args()

    # Find Ghostscript
    gs_bin = find_ghostscript()
    if not gs_bin:
        print("ERROR: Ghostscript not found. Install with: brew install ghostscript", file=sys.stderr)
        sys.exit(1)

    # Parse target size
    target_bytes = None
    if args.target_size:
        try:
            target_bytes = parse_size(args.target_size)
        except ValueError:
            print(f"ERROR: Invalid size format: {args.target_size}", file=sys.stderr)
            sys.exit(1)

    # Validate inputs
    input_paths = []
    for inp in args.inputs:
        p = Path(inp)
        if not p.exists():
            print(f"ERROR: File not found: {inp}", file=sys.stderr)
            sys.exit(1)
        if p.suffix.lower() != ".pdf":
            print(f"ERROR: Not a PDF: {inp}", file=sys.stderr)
            sys.exit(1)
        input_paths.append(p)

    # Determine output paths
    output_paths = []
    if args.output:
        out = Path(args.output)
        if len(input_paths) == 1 and not out.is_dir():
            out.parent.mkdir(parents=True, exist_ok=True)
            output_paths = [out]
        else:
            out.mkdir(parents=True, exist_ok=True)
            for inp in input_paths:
                output_paths.append(out / (inp.stem + args.suffix + ".pdf"))
    else:
        for inp in input_paths:
            output_paths.append(inp.parent / (inp.stem + args.suffix + ".pdf"))

    # Process files
    print(f"Ghostscript: {gs_bin}")
    if target_bytes:
        print(f"Mode: target size ({format_size(target_bytes)})")
    else:
        preset_info = QUALITY_PRESETS[args.quality]
        dpi_info = f"{args.dpi} dpi (custom)" if args.dpi else f"{preset_info['dpi']} dpi"
        print(f"Mode: quality={args.quality} ({dpi_info})")
    print()

    results = []
    for inp, out in zip(input_paths, output_paths):
        print(f"Processing: {inp.name}")
        print(f"  Original:  {format_size(inp.stat().st_size)}")
        result = compress_single(gs_bin, inp, out, args.quality, args.dpi, target_bytes)
        results.append(result)

        if "error" in result:
            print(f"  ERROR: {result['error']}")
        else:
            compressed_size = result["compressed"]
            ratio = compressed_size / result["original"] * 100
            saved = result["original"] - compressed_size
            print(f"  Compressed:{format_size(compressed_size):>10s}  ({ratio:.0f}% of original, saved {format_size(saved)})")
            if not result.get("target_achieved") and result.get("target_achieved") is not None:
                # target_achieved == False means failed
                pass
            else:
                print(f"  Output:    {out}")
        print()

    # Summary for multiple files
    if len(results) > 1:
        total_orig = sum(r.get("original", 0) for r in results if "error" not in r)
        total_comp = sum(r.get("compressed", 0) for r in results if "error" not in r)
        errors = [r for r in results if "error" in r]
        not_achieved = [r for r in results if r.get("target_achieved") is False]

        print("=" * 50)
        print(f"Total: {len(results)} files")
        print(f"  Original total:   {format_size(total_orig)}")
        print(f"  Compressed total: {format_size(total_comp)}")
        if total_orig > 0:
            print(f"  Overall ratio:    {total_comp/total_orig*100:.0f}%")
        if errors:
            print(f"  Errors: {len(errors)} file(s)")
        if not_achieved:
            print(f"  Target not achieved: {len(not_achieved)} file(s)")


if __name__ == "__main__":
    main()
