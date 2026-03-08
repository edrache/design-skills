# 3-Layer Agent Architecture

This project follows a 3-layer architecture designed to separate deterministic execution from probabilistic orchestration.

## The Layers

### 1. Directive (Instruction Set)
- Located in `directives/`
- Standard Operating Procedures (SOPs) written in Markdown.
- Defines goals, inputs, tools, and edge cases.

### 2. Orchestration (Decision Making)
- This is the AI agent's role.
- Reads directives, calls execution scripts, and handles error recovery.

### 3. Execution (Deterministic Tools)
- Located in `execution/`
- Python scripts that handle API calls, file operations, and data processing.
- Must be reliable and testable.

## Directory Structure
- `directives/` - SOPs and instructions.
- `execution/` - Deterministic Python tools.
- `.tmp/` - Intermediate processing data (excluded from git).
- `.env` - Environment variables (excluded from git).
- `skills/` - Specialized agent capabilities and tools.

## Available Skills / Dostępne Umiejętności

This project includes several skills that extend the agent's capabilities. / Projekt zawiera zestaw umiejętności, które rozszerzają możliwości agenta.

### Custom Skills / Umiejętności Niestandardowe

- **pdf-to-md**: Extract content from PDF files and convert them into well-formatted Markdown documents. / Wyodrębnianie treści z plików PDF i konwersja na sformatowane dokumenty Markdown.
- **pdf-translator-pl**: Translation of RPG manuals from PDF (English) to PDF (Polish). / Tłumaczenie podręczników RPG z formatu PDF (angielski) na PDF (polski).
- **rpg-translator**: Translation of RPG Markdown files from English to Polish, maintaining the original atmosphere. / Tłumaczenie plików Markdown gier RPG z angielskiego na polski z zachowaniem klimatu.
- **deploy-mikrus**: Fast deployment of applications to VPS (Mikrus) using rsync/SSH. / Szybkie wdrażanie aplikacji na VPS (Mikrus) przez rsync/SSH.

### Anthropic Skills / Umiejętności Anthropic

- **algorithmic-art**: Creating algorithmic art using p5.js with seeded randomness. / Tworzenie sztuki algorytmicznej przy użyciu p5.js z ziarnem losowości.
- **brand-guidelines**: Applies Anthropic's official brand colors and typography to artifacts. / Nakładanie oficjalnej kolorystyki i typografii marki Anthropic na artefakty.
- **canvas-design**: Create beautiful visual art in .png and .pdf documents using design philosophy. / Tworzenie grafiki wizualnej w dokumentach .png i .pdf w oparciu o filozofię projektowania.
- **doc-coauthoring**: Guide users through a structured workflow for co-authoring documentation. / Prowadzenie użytkowników przez ustrukturyzowany proces wspólnego tworzenia dokumentacji.
- **docx**: Create, read, edit, or manipulate Microsoft Word documents (.docx). / Tworzenie, odczyt, edycja i manipulacja dokumentami Word (.docx).
- **frontend-design**: Create distinctive, production-grade frontend interfaces with high design quality. / Tworzenie unikalnych, produkcyjnych interfejsów frontendowych o wysokiej jakości projektowej.
- **internal-comms**: Writing internal communications using company-standard formats. / Pisanie komunikacji wewnętrznej przy użyciu standardowych formatów firmowych.
- **mcp-builder**: Guide for creating high-quality MCP (Model Context Protocol) servers. / Przewodnik po tworzeniu wysokiej jakości serwerów MCP (Model Context Protocol).
- **pdf**: Comprehensive PDF processing (merging, splitting, OCR, metadata). / Wszechstronne przetwarzanie plików PDF (łączenie, dzielenie, OCR, metadane).
- **pptx**: Comprehensive PowerPoint presentation management (.pptx). / Wszechstronne zarządzanie prezentacjami PowerPoint (.pptx).
- **skill-creator**: Guide for creating and updating effective skills. / Przewodnik po tworzeniu i aktualizowaniu efektywnych umiejętności.
- **slack-gif-creator**: Creating animated GIFs optimized for Slack. / Tworzenie animowanych plików GIF zoptymalizowanych pod kątem Slacka.
- **theme-factory**: Toolkit for styling artifacts with pre-set or custom themes. / Zestaw narzędzi do stylizacji artefaktów za pomocą gotowych lub własnych motywów.
- **web-artifacts-builder**: Tools for creating complex, multi-component HTML artifacts (React, Tailwind, shadcn/ui). / Narzędzia do tworzenia złożonych artefaktów HTML (React, Tailwind, shadcn/ui).
- **webapp-testing**: Interacting with and testing local web applications using Playwright. / Interakcja i testowanie lokalnych aplikacji webowych przy użyciu Playwright.
- **xlsx**: Comprehensive spreadsheet file management (.xlsx, .csv, .tsv). / Wszechstronne zarządzanie arkuszami kalkulacyjnymi (.xlsx, .csv, .tsv).
