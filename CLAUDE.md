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
