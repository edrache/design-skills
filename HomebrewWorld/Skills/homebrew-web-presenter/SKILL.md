---
name: homebrew-web-presenter
description: Homebrew World web presentation generator. Collects playbooks and optional moves from a setting folder and creates a hub-aligned HTML/CSS/JS website with multi-language support, warm editorial styling, and sidebar navigation.
---

# Homebrew Web Presenter

This skill transforms Markdown-based Homebrew World materials into an interactive web page that visually matches the main `HomebrewWorld/site/index.html` hub.

## Workflow

1.  **Locate Materials**: Identify the directory containing your Homebrew World playbooks (`Playbook_*.md`), optional moves (`Optional_Moves.md`), and adventure tables (`adventure.md` or `adventures.md`).
2.  **Generate Website**: Run `scripts/render_web.py` with the setting folder as input and an explicit output directory when needed.
    - If the setting has subfolders `en/` and `pl/`, the script automatically creates a language toggle.
    - For published pages, render directly into `HomebrewWorld/site/<slug>/`.
3.  **Output**: A standalone `index.html` is generated in the target folder, usually either `web_presentation/` or `HomebrewWorld/site/<slug>/`. Published pages in `HomebrewWorld/site/` must link the shared stylesheet at `HomebrewWorld/site/style.css` instead of embedding page-local CSS.

## Features

- **Hub-Aligned Aesthetics**: Match the main hub exactly in spirit: `Manrope` + `Cormorant Garamond`, warm amber accents, dark atmospheric gradients, glass panels, and rounded card geometry.
- **Sidebar-Driven Layout**: A persistent, collapsible sidebar for quick navigation between playbooks.
- **Multi-Language Support**: Top-level toggle to switch between different language versions (e.g., PL/EN).
- **Adventure Generator**: Automatically parses `adventure.md` into a dedicated Generator tab, which dynamically rolls and forms full adventure sentences on page load or when clicking the "Roll" button.
- **Emoji Integration**: Automatic emoji mapping for playbook titles and section headers for better visual identification.
- **Scroll-Spy Experience**: Sidebar automatically highlights the current section as you scroll.
- **Mobile Optimized**: Responsive design that transforms the sidebar into a sticky horizontal menu on mobile devices.
- **Smart Formatting**: Automatic column splitting (main/side) for playbook content to mimic official character sheets.

## Output Standards

Every generated page should satisfy the following baseline requirements:

- **Visual consistency with the hub**: Setting pages are not standalone art directions. Reuse the same palette, shell, hero treatment, chips, card language, and footer rhythm as `HomebrewWorld/site/index.html`.
- **Progressive enhancement first**: Core content must remain visible without JavaScript. JS may improve navigation, collapse state, and scroll behavior, but cannot be required to reveal the main text.
- **Safe grid sizing**: Use `minmax(0, 1fr)` instead of plain `1fr` in any grid that holds long text (like `.main-layout` and `.playbook-content`). Also set `min-width: 0` on grid/flex children that contain prose.
- **Narrow-screen resilience**: Generated layouts must remain readable at `320px` width. Navigation chips may wrap or scroll horizontally, but prose cards must never push the viewport wider than the screen.
- **Aggressive wrapping**: Use `word-break: break-word` along with `overflow-wrap: break-word` for all text containers to prevent layout breaking from long strings or technical tags.
- **Mobile padding refinement**: On screens smaller than `600px`, reduce card padding (e.g., to `1.25rem`) and scale down heading font sizes to maximize reading area.
- **Touch ergonomics**: Interactive elements need practical mobile targets. Treat `44x44px` as the default minimum for toggles, buttons, and compact chips.
- **Discoverable mobile navigation**: If the sidebar becomes a horizontal scroller, keep a visible scrollbar or another clear visual cue that more items exist off-screen.
- **Keyboard and screen reader support**: Add visible `:focus-visible` styles, semantic `main`/`nav` landmarks, and meaningful ARIA state for language toggles, active tabs, and collapsible navigation.
- **Reduced motion support**: Respect `prefers-reduced-motion`; disable smooth scrolling and non-essential animation in that mode.
- **Language correctness**: Keep `html[lang]`, active language toggle state, and visible content in sync. If PL is shown, the document language should be `pl`; if EN is shown, it should be `en`.

## Implementation Notes

When updating the shared stylesheet, `assets/script.js`, or generated output, carry these concrete patterns over:

- **Typography**: Use `Manrope` for UI/body copy and `Cormorant Garamond` for page and card headings.
- **Theme tokens**: Prefer the shared warm token set (`--bg`, `--panel`, `--panel-strong`, `--line`, `--text`, `--muted`, `--accent`, `--accent-strong`) rather than per-setting colors.
- **Shared stylesheet**: Published pages under `HomebrewWorld/site/` must reference the root `style.css` via a relative `<link rel="stylesheet">`, for example `../style.css` from a setting page. Do not emit inline `<style>` blocks there.
- **Hero shell**: Every page should start with a hub-like hero containing eyebrow, backlink, language toggles, title, summary, and compact stat chips.
- **Sidebar return link**: Put the backlink to `HomebrewWorld/site/index.html` inside the sidebar, not in the hero area.
- **Setting summary**: The `page-summary` paragraph in the hero must describe the specific setting itself, not the renderer. For bilingual pages, provide both PL and EN summaries and keep them synchronized with the language toggle.
- **Summary source**: Store per-setting hero summaries in `references/setting_summaries.json` so content updates do not require editing `scripts/render_web.py`.
- **Viewport sanity**: Keep `overflow-x: hidden` on `body`, not on the main `.container`.
- **Text wrapping**: Always apply `word-break: break-word` to `p, li, h1, h2, h3` to catch overflows.
- **Grid robustness**: Ensure `.main-column` and `.side-column` have `min-width: 0`.
- **Responsive cards**: Cards must have `max-width: 100%` and `box-sizing: border-box` to stay within parent bounds.
- **Mobile headers**: On very narrow screens, reduce card padding and keep the hero compact without dropping the visual identity.
- **Optional Moves**: Use `minmax(min(100%, 350px), 1fr)` for the optional moves grid to handle narrow viewports gracefully.
- **Clean footer**: Keep footer text concise, two-part when possible, and visually aligned with the homepage footer.
- **Language controls**: Toggle buttons should update pressed state and keep `html[lang]` synchronized with visible content.
- **Toolbar discipline**: Do not add generic helper badges like `Ruchy opcjonalne i szybka nawigacja`; keep the toolbar limited to compact factual counts.

## Resources

- **Script**: `scripts/render_web.py` - The core engine that parses Markdown and generates HTML.
- **Setting summaries**: `references/setting_summaries.json` - Per-setting PL/EN hero copy used by `page-summary`.
- **Assets**: 
    - `HomebrewWorld/site/style.css` - Shared published stylesheet used by the homepage and all published setting pages.
    - `assets/style.css` - Legacy/local stylesheet mirror if a non-site output needs a copied stylesheet.
    - `assets/script.js` - Interactive elements, sidebar logic, and language switching.

## Usage

```bash
# Basic usage (single folder or root with en/pl folders)
python3 scripts/render_web.py /path/to/setting/folder

# Publish directly into the static site
python3 scripts/render_web.py /path/to/setting/folder /path/to/HomebrewWorld/site/setting-slug
```

By default this produces `web_presentation/index.html` in the setting directory. Pass an explicit output directory when rendering a published page.
