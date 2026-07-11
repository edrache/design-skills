---
name: paint-transition-texture
description: Use when converting a video of paint or ink spreading on a dark background into a Unity UIEffect Transition Texture PNG, where the alpha channel encodes paint arrival time.
---

# paint-transition-texture

Converts a paint/ink spread video into a RGBA PNG whose **alpha channel** encodes the arrival time of each painted pixel — ready to use as `Transition Tex` in Unity's Coffee UIEffects `UIEffect` component.

## Trigger

Use when the user wants to:
- Generate a transition texture from a paint/ink spread video
- Create a Unity UIEffect mask from a video clip
- Encode paint arrival order into a PNG alpha channel

## Requirements

- Python 3.9+ with venv active
- `ffmpeg` in PATH
- Libraries: `numpy`, `Pillow`, `scipy`

```bash
source .venv/bin/activate
pip install numpy pillow scipy
# ffmpeg: brew install ffmpeg  (macOS)
```

## Quick reference

```bash
python execution/paint_to_transition.py \
  --input   <video.mp4>          \
  --output  <output.png>         \
  --size    512                  \   # texture size in px (square, power of 2)
  --threshold 128                \   # binary threshold 0–255
  --blur    0                    \   # Gaussian blur radius (0 = off)
  --invert                       \   # flip alpha: first painted = 0 instead of 255
  --dark-on-light                \   # dark ink on bright bg (detects pixels <= threshold)
  --fill-gradient                    # extend shape outward with distance gradient to fill entire image
```

### Typical examples

White paint on dark background (default):
```bash
python execution/paint_to_transition.py \
  --input paint_spread.mp4 \
  --output transition_mask.png \
  --size 512 --threshold 100 --blur 2
```

Black ink on white background:
```bash
python execution/paint_to_transition.py \
  --input ink_blot.mov \
  --output transition_mask.png \
  --size 512 --threshold 128 --blur 2 --dark-on-light
```

## How the alpha encodes timing

| Pixel state | Alpha |
|---|---|
| Painted first | 255 |
| Painted last | ~1 |
| Never painted | 0 |

With `--invert`: first painted → 0, last → ~255.

## Parameters to tune

| Parameter | When to adjust |
|---|---|
| `--threshold` | Lower (e.g. 80) if video has soft ink edges; higher if background bleeds through |
| `--blur` | Use 1–3 to smooth aliasing artifacts on hard edges; keep 0 for pixel-perfect timing |
| `--size` | Must be power of 2: 256, 512, 1024. Match your UI element's resolution |
| `--invert` | Use when you want paint to disappear rather than appear, as alternative to `transitionReverse` in Unity |
| `--dark-on-light` | Use when video has dark ink/paint on a bright/white background (detects pixel drop below threshold) |
| `--fill-gradient` | Fills unpainted pixels with a distance-based gradient so the shape smoothly expands to cover the entire image. Painted pixels are rescaled to the top 75% of alpha range; fill occupies the bottom 25% |

## Output format

- Format: RGBA PNG
- RGB channels: `(0, 0, 0)` — ignored by UIEffect
- Alpha: paint arrival time normalized to 0–255
- Color space: **linear** (disable sRGB on import in Unity)

## Unity setup

After importing the PNG:

| Setting | Value |
|---|---|
| Texture Type | Default |
| sRGB (Color Texture) | **off** |
| Alpha Source | Input Texture Alpha |
| Alpha Is Transparency | **off** |
| Compression | None (or quality without dithering) |

```csharp
effect.transitionFilter  = TransitionFilter.Cutoff; // or Dissolve
effect.transitionTexture = transitionTexturePNG;
effect.transitionRate    = 1f; // start hidden

// Reveal animation (DOTween):
DOTween.To(() => effect.transitionRate,
           x  => effect.transitionRate = x,
           0f, duration);
```

## Common mistakes

| Mistake | Fix |
|---|---|
| Texture looks like solid alpha | Video background too bright — lower `--threshold` or ensure dark background |
| Only a fraction of pixels painted | Threshold too high — lower it |
| Harsh visible steps in gradient | Add `--blur 1` or `--blur 2` |
| Unity shows no transition effect | Check sRGB is **off** and Alpha Is Transparency is **off** |
| Wrong paint direction | Add `--invert` or set `transitionReverse = true` in UIEffect |
