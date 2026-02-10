---
name: pdf-to-md
description: Extract content from PDF files and convert them into well-formatted Markdown documents. Use when a user provides a PDF file and wants to extract information, summarize it, or convert it to another format.
---

# PDF to Markdown Extraction Skill

This skill allows you to extract text and images from PDF files and then use your reasoning capabilities to format the result into high-quality Markdown.

## Workflow

### 1. Extract Content

Run the extraction script to get a JSON representation of the PDF content and save images.

```bash
python3.11 [skill_path]/scripts/extract_pdf.py "[pdf_path]" --output_dir "[temp_dir]"
```

- **[skill_path]**: Path to the `pdf-to-md` skill directory.
- **[pdf_path]**: Absolute path to the source PDF file.
- **[temp_dir]**: A temporary directory to store extracted JSON and images.

### 2. Read Extracted Data

Read the generated `content.json` file in the `[temp_dir]`. This file contains an array of objects, one per page, with the following structure:

```json
[
  {
    "page_num": 1,
    "text": "Extracted text content...",
    "images": ["path/to/extracted/image1.png", ...]
  }
]
```

### 3. Format into Markdown

Use the extracted text and image paths to construct a formatted Markdown document.

- **Headers**: Identify headings from the text and use appropriate `#` levels.
- **Bullet points**: Convert lists into Markdown bullet points.
- **Tables**: Reconstruct tables where possible using Markdown table syntax.
- **Images**: Embed extracted images using the standard Markdown syntax: `![Caption](file:///path/to/image.png)`.
- **Page Markers**: Use `---\n### Page [N]\n---` to separate pages if the document is long.

## Guidelines for High-Quality Output

- **Maintain Hierarchy**: Respect the original document's structure (titles, subtitles, sections).
- **Clean Text**: Fix common PDF extraction issues like hyphenation at line breaks or misread characters.
- **Visual Context**: If images are present, try to place them near the text they relate to based on their page position.
- **Preserve Links**: If the PDF contains URLs, ensure they are clickable in the Markdown.
