"""Merge a list of markdown files, in the given order, into a single output file.

Files are separated by a blank line to avoid accidentally joining the last
line of one file with the first line of the next.

Usage:
    python3 execution/merge_markdown_files.py <output_file> <input_file1> <input_file2> ...
"""
import sys


def merge(output_path, input_paths):
    parts = []
    for path in input_paths:
        with open(path, encoding="utf-8") as f:
            content = f.read()
        parts.append(content.rstrip("\n"))

    merged = "\n\n".join(parts) + "\n"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(merged)

    print(f"Merged {len(input_paths)} file(s) into {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 merge_markdown_files.py <output_file> <input_file1> [input_file2 ...]")
        sys.exit(1)
    merge(sys.argv[1], sys.argv[2:])
