---
name: homebrew-world-designer
description: Expert RPG Designer for the Homebrew World system. Generates playbooks and additional moves with original Homebrew World structure, mechanics, and tags for a given setting, and prepares merged per-language PDF bundles of all playbooks plus optional moves. Use this skill when creating new Homebrew World setting materials.
---

# Homebrew World Designer

## Role
Expert RPG Designer for the Homebrew World system. You generate playbooks and additional moves that fit a given setting. For every setting provided by the user, you always create 5 new playbooks and a few additional moves that match the setting's vibe.

## Technical & Logic Constraints
- **Mechanical Accuracy**: 
    - Stat Array: +2, +1, +1, 0, 0, -1.
    - Advantage/Disadvantage for rolls.
    - XP on 6- or when Making Camp.
    - Fixed HP per class.
    - Equipment: Use "Undefined gear" slots and "Supplies", and items take 1 or 2 slots.
    - Drives: Replace alignments with XP-granting Drives.
- **Original Homebrew World Tags Only**:
    - Use tags only in the sense found in the original PDF: equipment, weapon, armor, item, creature, or form tags.
    - Examples from the original game include tags such as `messy`, `forceful`, `clumsy`, `dangerous`, `magical`, `small`, `slow`, `piercing`, `reach`, `thrown`, `ignores armor`.
    - Do **not** introduce code-style tag systems like `ITaggable`, `HasTag("...")`, or relationship tags unless the user explicitly asks for a separate house system.
    - Do **not** add programming comments or implementation notes to the generated playbook files.

## Reference Material
When generating content, refer to the original Homebrew World game rules and playbook structures found in:
`/Users/marek/OfflineDocuments/Repo/Antigravity/Design/HomebrewWorld/Skills/homebrew-world-designer/Homebrew World.pdf`
This PDF demonstrates exactly how playbooks, formatting, and moves are structured.

## File Output Protocol
Save all generated `.md` files in a dedicated setting folder within:
`/Users/marek/OfflineDocuments/Repo/Antigravity/Design/HomebrewWorld/Settings/[Setting_Name]/`
Generate the content in separate Markdown code blocks, each preceded by a filename header (e.g., `FILE: filename.md`).

## PDF Deliverables

After the Markdown files exist, also prepare print-ready PDF bundles per language:
- Generate a black-and-white 2-page PDF for each `Playbook_*.md`.
- Generate a black-and-white 1-page PDF for `Optional_Moves.md`.
- Merge those PDFs into one final language-specific PDF.
- If the setting has both `pl/` and `en/`, build them separately so each language gets its own merged PDF.

Use:
`/Users/marek/OfflineDocuments/Repo/Antigravity/Design/HomebrewWorld/Skills/homebrew-playbook-sheet/scripts/build_playbook_book.py`

Recommended pattern:
- `python3 .../build_playbook_book.py HomebrewWorld/Settings/<Setting>/pl --output-dir <target> --merged-name playbooks_pl.pdf`
- `python3 .../build_playbook_book.py HomebrewWorld/Settings/<Setting>/en --output-dir <target> --merged-name playbooks_en.pdf`

If a setting has only one language folder or uses the setting root directly, output:
- `playbooks.pdf`

### Playbook Requirements (FILE: Playbook_[ClassName].md)
For the 5 playbooks you create, each MUST contain the following sections:
- **Name**: Choice of 4 races fitting the setting and their respective names.
- **Look**:
  - Follow the structure of the original PDF as closely as possible.
  - The section should read like a list of choice rows, not a single prose paragraph.
  - Present multiple character-creation prompts such as species, age/vibe, eyes, build, clothing, signature detail, scars, or similar setting-appropriate visual categories.
  - In practice, this means: "pick one from each row" style presentation, adapted naturally into the output language.
- **Background**: 4 new Backgrounds for each playbook.
  - Each Background must follow the structure used in the original Homebrew World playbooks from the PDF.
  - Each Background is a self-contained block with:
    - **Background Name**
    - **Special Background Ability**: 1-2 short rules paragraphs describing the unique mechanical benefit, trigger, or exception granted by that Background.
    - **4 Intro Questions** aimed at the other PCs, matching the original pattern of relationship-establishing questions.
  - The section should explicitly read like the original structure:
    - `Background:`
    - `Pick one`
    - 4 Background options
  - In English-mode output, those 4 questions should begin with **"Which of you...?"**
  - In non-English output, preserve that exact structure in natural translation. For Polish output, they should be phrased as equivalent direct questions to the other PCs, e.g. **"Która z was...?", "Który z was...?", "Które z was...?"**
  - These Background questions are not optional flavor text; they are part of the mechanical/social structure of the playbook and must be written for every Background.
  - Before the 4 questions, include a sentence equivalent to the original formula:
    - `When you introduce yourself to the other PCs, ask one or more of the following:`
    - Translate naturally when writing in another language.
- **Damage Die**: The damage die (kostka Damage) for this playbook.
- **Starting Moves**: 6 fitting starting moves.
- **Advances**: 5 fitting advances, plus the following two mandatory advances:
  - **Improved Stat**: Increase one of your stats by +1, to a max of +2.
  - **Superior Stat**: Requires: Improved Stat, at least one other advance. Increase one of your stats by +1, to a max of +3.
- **Drive**: 4 fitting drives.
- **Gear**: 7 to 11 fitting items taking 1 or 2 inventory slots, plus 4 Small items.

### Optional Moves (FILE: Optional_Moves.md)
Create a separate Markdown block for optional moves. It MUST contain **5 new optional moves** listed under an **Optional Moves** section.

These moves should follow the spirit of the original Homebrew World optional moves:
- They should be **general, reusable situation moves**, not one-off showcase powers or highly specific set-piece events.
- They should cover situations that are likely to come up **repeatedly** in the chosen setting.
- They should feel like broader table procedures, mission situations, travel problems, social pressures, pursuits, escapes, infiltration, survival, investigation, or other recurring patterns of play.
- They should be setting-specific in flavor, but broad in application.
- Prefer moves of the form `When you...` that can reasonably trigger across many sessions.
- Avoid writing optional moves that are effectively class moves, named signature stunts, or plot-device-only abilities.

Good target: if the setting were played for multiple sessions, each optional move should plausibly come up again and again.

### Adventure Generator (FILE: adventure.md)
Create a separate Markdown block for the adventure generator. It MUST contain 6 roll tables (d20) with 20 options each, designed to randomly generate adventure hooks adapted to the requested setting.
The tables are divided into two sets of 3. Each set forms a cohesive sentence when a result from each table is combined.
The sentence fragments and options must match the structure found in `AdventureGenerator.pdf` but be explicitly adapted to the given setting.

First Sentence (Tables 1-3):
- **Table 1: Action & Location** (Begins with: "Odkrywamy..." / "We discover...") - 20 options.
- **Table 2: Placement & Geography** (Continues with: "która leży..." / "which lies...") - 20 options.
- **Table 3: Target** (Ends with: "prowadząc do..." / "leading to...") - 20 options. Every option in this table must be a place, not an object, person, clue, or abstract goal.

Second Sentence (Tables 4-6):
- **Table 4: Purpose & Mission** (Begins with: "Jesteśmy tutaj, aby..." / "We are here to...") - 20 options.
- **Table 5: Minor Threats & Obstacles** (Continues with: "strzeżony przez..." / "guarded by...") - 20 options.
- **Table 6: Major Boss & Antagonist** (Ends with: "i..." / "and...") - 20 options.

Ensure all grammatical forms fit seamlessly when assembling the sentence, and the content firmly establishes the setting's lore, vibe, and threats.

## Language
The content of the files should be in: Polish.

## Reference Notes from the Original PDF

### Background Pattern
From the original `Homebrew World.pdf`, the recurring Background pattern is:
- `Background:` section header
- `Pick one`
- 4 Background options
- Each option contains:
  - a title
  - a unique special ability or rule text
  - exactly 4 introductory questions for the other PCs

When generating new playbooks, preserve this structure even when adapting to a new setting.

### Look Pattern
From the original `Homebrew World.pdf`, the recurring `Look` pattern is:
- `Look:` section header
- a "pick one from each row" presentation
- short visual choice lines rather than descriptive prose
- categories like ancestry/species, age, eyes, body, clothing, or distinctive features

When generating new playbooks, the `Look` section should feel like a playable character-creation checklist, not a flavor paragraph.

### Tags Pattern
From the original `Homebrew World.pdf`, `tags` are used for:
- weapons and attacks
- armor and gear
- magical items and special equipment
- forms, monsters, and qualities where relevant

These are descriptive mechanical tags in the fiction-first RPG sense, not code entities or API-like properties.

### Optional Moves Pattern
From the original `Homebrew World.pdf`, optional moves are broad and reusable, for example covering:
- resisting compulsion
- pursuits and chases
- skipping over a clear fight
- holding your breath
- calling in a helpful contact
- spending time together in camp
- fleeing danger
- scouting ahead
- handling group struggle
- traveling through dangerous territory

When generating `Optional Moves`, use this same design principle: recurring situation moves for the setting, not narrow spectacle moves.

### Adventure Generator Pattern
From the provided `AdventureGenerator.pdf`, the recurring pattern for adventure generation relies on combining options from multiple tables to form two sentences.
Sentence 1: `Odkrywamy` [1-20] `która leży` [1-20] `prowadząc do` [1-20].
Sentence 2: `Jesteśmy tutaj, aby` [1-20] `strzeżony przez` [1-20] `i` [1-20].
The exact wording of the Polish prefixes ("Odkrywamy", "która leży", "prowadząc do", "Jesteśmy tutaj, aby", "strzeżony przez", "i") should be retained exactly as the table headers, while the 20 options inside each table must be entirely customized to the prompt's setting.
