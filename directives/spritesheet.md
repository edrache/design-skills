# Directive: Sprite Sheet Tool

## Goal
Pack individual PNG images into a single sprite sheet, or extract individual sprites from an existing sheet.

## Tool
`execution/spritesheet.py` — requires Python 3.11+ with Pillow (`pip install Pillow`).

## Output Convention
Final sprite sheets go to `/Users/marek/OfflineDocuments/Repo/Antigravity/Design/output`.
Intermediate/split sprites go to `.tmp/`.

Always run from the repo root with the venv active:
```bash
source .venv/bin/activate
```

---

## Operation: CREATE

Pack images into a sprite sheet. The tool auto-calculates a grid (cols × rows) that makes the final sheet as close to square as possible.

### From a list of files
```bash
python execution/spritesheet.py create \
  --input img1.png img2.png img3.png \
  --output sheet.png \
  [--padding 1] \
  [--pow2]
```

### From a directory (sorted alphabetically)
```bash
python execution/spritesheet.py create \
  --input-dir ./sprites/ \
  --output sheet.png \
  [--padding 2] \
  [--pow2]
```

### Parameters
| Parameter | Default | Description |
|-----------|---------|-------------|
| `--input` / `--input-dir` | required | Source images (mutually exclusive) |
| `--output` | required | Output PNG path |
| `--padding` | 1 | Pixels of transparent border around each sprite |
| `--cols` | auto | Force number of columns (overrides auto layout) |
| `--rows` | auto | Force number of rows (overrides auto layout) |
| `--pow2` | off | Resize final sheet to nearest power-of-2 dimensions (W and H independently, minimizing area change) |

### Output filename
When `--pow2` distorts the aspect ratio (≥0.5% change), the filename gets a suffix with the Unity X scale correction factor:
- `sheet_sx1.17.png` → set X scale to 1.17 in Unity to restore original proportions
- `sheet.png` (no suffix) → ratio unchanged, use X scale 1.0

### Output line
Prints: `Created: <file> | WxH | grid CxR | N sprites | padding Ppx | Unity X scale: N.NN`

### Warnings
- If not all input images are the same size → warning to stderr, first image size is used as reference cell

---

## Operation: SPLIT

Extract individual sprites from a sheet assuming a uniform grid. Padding is NOT taken into account — the sheet is simply divided into equal cells.

```bash
python execution/spritesheet.py split \
  --input sheet.png \
  --cols 4 \
  --rows 3 \
  --output-dir ./sprites_out/ \
  [--prefix sprite_]
```

### Parameters
| Parameter | Default | Description |
|-----------|---------|-------------|
| `--input` | required | Input sprite sheet PNG |
| `--cols` | required | Number of columns |
| `--rows` | required | Number of rows |
| `--output-dir` | required | Output directory (created if not exists) |
| `--prefix` | `sprite_` | Filename prefix; files are named `<prefix>NNNN.png` |

### Output
Prints one line: `Split: <file> | CxR grid | WxH per sprite | N sprites → <dir>/`

### Warnings
- If sheet dimensions are not evenly divisible by the grid → warning to stderr (split still proceeds)

---

## Edge Cases & Learnings

- **Pow2 sizing**: The tool computes the natural sheet size first, then finds the power-of-2 canvas (both W and H independently) with the smallest relative area change. It may scale up OR down.
- **Unity X scale suffix**: Formula is `(natural_w × final_h) / (final_w × natural_h)`. X=1.0 means no distortion; X=0.5 means width doubled (scale down by half); X=2.0 means width halved (scale up). A large suffix value (e.g. sx2.47) is a strong hint that the grid cols/rows may be wrong.
- **Incomplete grid**: When N sprites don't fill the last row, remaining cells are transparent.
- **Split + padding**: If a sheet was created with padding, split will include fractional padding in each cell (since it ignores padding). This is by design — the user is expected to know their sheet was created without padding when splitting, or accept the extra pixels.
- **Split clears output-dir**: The split command always wipes the output directory before writing, preventing stale sprites from previous runs with different grids.
