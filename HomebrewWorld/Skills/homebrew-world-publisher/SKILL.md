---
name: homebrew-world-publisher
description: Build and publish the Homebrew Worlds static hub with a homepage plus selected setting presentations. Published setting pages must stay visually aligned with the main hub and be rendered from the shared `homebrew-web-presenter` generator.
---

# Homebrew World Publisher

This skill publishes the static `HomebrewWorld` website from local setting folders.

## Visual Standard

- Every published setting page must match the homepage style in `HomebrewWorld/site/index.html`.
- Do not ship standalone per-setting themes. Use the shared warm palette, `Manrope` + `Cormorant Garamond`, the hero shell, rounded glass cards, and the same footer language as the hub.
- Regenerate setting pages through `HomebrewWorld/Skills/homebrew-web-presenter/scripts/render_web.py` before publishing.

## Workflow

1. Identify the source setting folder in `HomebrewWorld/Settings/`.
2. Render or refresh each setting presentation into its published destination in `HomebrewWorld/site/<slug>/` using the shared presenter:
   `python3 HomebrewWorld/Skills/homebrew-web-presenter/scripts/render_web.py HomebrewWorld/Settings/Star_Wars HomebrewWorld/site/star-wars`
3. Verify the generated page still matches the hub visually and keeps working language/navigation behavior.
4. Refresh the homepage catalog if the set of published settings changed.
5. Deploy with the repo's current deployment flow after previewing the static output.

## Notes

- Source folders are discovered in `HomebrewWorld/Settings/`.
- Output is generated into `HomebrewWorld/site/`.
- Each published setting gets its own static page and a backlink to the hub homepage.
- If a dedicated publisher script exists in the repo, it should call the shared presenter rather than embedding a separate theme.
- Keep `Settings/<Setting>/web_presentation/` and `site/<slug>/` aligned when both are used in the workflow.
