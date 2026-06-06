---
name: homebrew-world-publisher
description: Build and publish the Homebrew Worlds static hub with a homepage plus selected setting presentations. Published setting pages must stay visually aligned with the main hub, include downloadable merged PDF bundles for each available language, and be rendered from the shared `homebrew-web-presenter` generator.
---

# Homebrew World Publisher

This skill publishes the static `HomebrewWorld` website from local setting folders.

## Visual Standard

- Every published setting page must match the homepage style in `HomebrewWorld/site/index.html`.
- Every published page in `HomebrewWorld/site/` must load the shared stylesheet `HomebrewWorld/site/style.css`; do not publish inline page-specific CSS there.
- Do not ship standalone per-setting themes. Use the shared warm palette, `Manrope` + `Cormorant Garamond`, the hero shell, rounded glass cards, and the same footer language as the hub.
- Regenerate setting pages through `HomebrewWorld/Skills/homebrew-web-presenter/scripts/render_web.py` before publishing.

## Workflow

1. Identify the source setting folder in `HomebrewWorld/Settings/`.
2. For each available language, generate the merged PDF bundle of playbooks plus optional moves into the published destination folder so the PDFs sit next to `index.html`.
3. Render or refresh each setting presentation into its published destination in `HomebrewWorld/site/<slug>/` using the shared presenter:
   `python3 HomebrewWorld/Skills/homebrew-web-presenter/scripts/render_web.py HomebrewWorld/Settings/Star_Wars HomebrewWorld/site/star-wars`
4. Verify the generated page still matches the hub visually, keeps working language/navigation behavior, and shows a download button for each published PDF.
5. Refresh the homepage catalog if the set of published settings changed.
6. Deploy with the repo's current deployment flow after previewing the static output.

## CRITICAL: Deploy Safety Rule

**Always build ALL settings before deploying**, even when only one setting was added or changed.

The deploy script uses rsync with `--delete`, which removes any remote file that doesn't exist locally. Deploying a partial build (e.g. only the new setting) will delete all other settings from the server.

**Correct command:**
```bash
python3 execution/publish_homebrew_world.py --deploy --go
```

**Never do this:**
```bash
python3 execution/publish_homebrew_world.py NewSetting --deploy --go
```

If the full build is too slow and you only need to deploy one setting, rebuild all and deploy all — the build is fast enough and correctness is more important than speed.

## Notes

- Source folders are discovered in `HomebrewWorld/Settings/`.
- Output is generated into `HomebrewWorld/site/`.
- Each published setting gets its own static page and a backlink to the hub homepage.
- Each published setting should also include `playbooks.pdf` or per-language files like `playbooks_pl.pdf` and `playbooks_en.pdf` in the same folder as `index.html`.
- The setting page should expose those files through visible download buttons in the hero area.
- When publishing adventure generators, keep Table 3 as `Target` only. It must contain locations and use the `prowadząc do...` / `leading to...` phrasing rather than an object-seeking goal.
- If a dedicated publisher script exists in the repo, it should call the shared presenter rather than embedding a separate theme.
- Keep `Settings/<Setting>/web_presentation/` and `site/<slug>/` aligned when both are used in the workflow.
