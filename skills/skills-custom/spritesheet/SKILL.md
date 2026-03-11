# Skill: spritesheet

Pack images into a sprite sheet or extract sprites from an existing sheet.

## Trigger

Use this skill when the user wants to:
- Create / pack / generate a sprite sheet from multiple images
- Split / extract / unpack sprites from a sprite sheet
- Convert individual frames into a sprite atlas

## How to use

Read the full directive first:
> `directives/spritesheet.md`

Then call the execution script. Always activate the venv first:
```bash
source .venv/bin/activate
```

---

## Quick reference

### Create sprite sheet
```bash
python execution/spritesheet.py create \
  --input-dir ./sprites/ \
  --output output/sheet.png \
  --padding 1 \
  [--cols 4] [--rows 4] \
  [--pow2]
```
Or with explicit file list:
```bash
python execution/spritesheet.py create \
  --input a.png b.png c.png \
  --output output/sheet.png
```

### Split sprite sheet
```bash
python execution/spritesheet.py split \
  --input sheet.png \
  --cols 4 --rows 3 \
  --output-dir ./out/
```

---

## Key behaviors
- Grid layout is auto-calculated to produce the most square result; override with `--cols`/`--rows`
- `--pow2` resizes the final sheet to power-of-2 dimensions (W and H independently), choosing the option with smallest area change
- When `--pow2` distorts the aspect ratio, the output filename gets a `_sxN.NN` suffix — this is the X scale to set in Unity (1.0 = no distortion, 0.5 = width doubled, 2.0 = width halved). A large value hints the grid may be wrong.
- All input sprites should be the same size (warning if not)
- Split clears the output directory before writing to avoid stale files
- Split ignores padding — divides sheet into equal cells
- Final files go to `output/`, intermediates to `.tmp/`
- Output is always RGBA PNG
