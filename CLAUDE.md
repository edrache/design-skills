# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture: 3-Layer Agent System

This project separates deterministic execution from probabilistic orchestration:

1. **Directive Layer** (`directives/`) - SOPs in Markdown defining goals, inputs, tools, outputs, and edge cases
2. **Orchestration Layer** (You) - Read directives, call execution scripts, handle errors, update directives with learnings
3. **Execution Layer** (`execution/`) - Deterministic Python scripts for API calls, file operations, data processing

**Why:** Errors compound in LLM-only workflows (90% accuracy × 5 steps = 59% success). Push complexity into deterministic code; focus on decision-making.

## Operating Principles

- **Check for tools first** - Before writing a script, check `execution/` per your directive
- **Self-anneal when things break** - Fix script → test → update directive with learnings
- **Update directives as you learn** - Directives are living documents, but don't overwrite without asking

## Directory Structure

- `directives/` - SOPs in Markdown (instruction set)
- `execution/` - Python scripts (deterministic tools)
- `.tmp/` - Intermediate processing data (gitignored, can be deleted)
- `.env` - Environment variables (gitignored)
- `skills/` - Specialized agent capabilities
  - `skills/skills-custom/` - Custom skills:
    - `pdf-to-md` - Extract PDF content to Markdown
    - `pdf-translator-pl` - Translate RPG PDFs from English to Polish PDF
    - `rpg-translator` - Translate RPG Markdown EN→PL with terminology consistency
    - `deploy-mikrus` - Deploy apps to VPS (Mikrus) via rsync/SSH
    - `seer-manager` - Structure text using SEER method (Summarize, Elaborate, Example, Restate)
    - `polish-lyric-writer` - Write professional Polish song lyrics with meter and hooks
    - `merge-pdfs` - Merge multiple PDFs into one in a specified order
    - `compress-pdf` - Compress PDF(s) with quality presets, custom DPI, and target file size
    - `spritesheet` - Pack images into a sprite sheet or extract sprites from a sheet
    - `gdcvault-downloader` - Download GDC Vault videos as MP4 or MP3
    - `paint-transition-texture` - Generate Unity UIEffect Transition Texture PNG from a paint/ink spread video
    - `split-d66-tables` - Split merged d66 markdown tables (from Docling PDF conversion) into 6 separate named tables
  - `skills/skills-anthrophics/` - Anthropic's official skills library
  - `skills/dist/` - Compiled `.skill` files ready for deployment

## File Organization

- **Deliverables**: Cloud-based outputs (Google Sheets, Slides, etc.) where users can access them
- **Intermediates**: Everything in `.tmp/` - temporary files for processing, always regenerated
- Google OAuth files (`credentials.json`, `token.json`) are required but gitignored

## Python Environment

```bash
source .venv/bin/activate
```

## Skills Development

Custom skills follow this structure:
```
skills/skills-custom/<skill-name>/
├── SKILL.md         # Skill definition and instructions
├── references/      # Reference materials
└── agents/          # Agent configurations (optional)
```

Compiled skills are output to `skills/dist/` as `.skill` files.

## Skills Registration (REQUIRED)

After creating any new skill, you MUST update the skills list in CLAUDE.md:
1. Add a line under `skills/skills-custom/` in the Directory Structure section: `- \`skill-name\` - One-line description in English`
2. Do this before finishing — it is part of the skill creation workflow.

## Flametown

When working in `/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype`:

- Treat `PROJECT_CONTEXT_FOR_AGENTS.md` as required living context, not optional notes.
- Update `PROJECT_CONTEXT_FOR_AGENTS.md` and `progress.md` whenever you make a meaningful project change.
- Whenever you change Flametown gameplay mechanics, also update the in-game text tutorial/rules popup so it matches the current game.
- If a mechanic changed enough that the old tutorial text is no longer true, remove or rewrite the outdated description instead of only appending new notes.
- Bump the prototype version on every change:
  - `version` in `Flametown/prototype/package.json`
  - `APP_VERSION` in `Flametown/prototype/config.js`
  - changelog entry in `Flametown/prototype/PROJECT_CONTEXT_FOR_AGENTS.md`
- Keep the in-game version badge in the bottom-right corner working and aligned with the current version.
- Prefer adding Flametown-specific collaboration instructions to `Flametown/prototype/AGENTS.md`.
