---
name: compress-pdf
description: Compress one or more PDF files with configurable quality presets, custom image DPI, and optional target file size. Use when a user wants to reduce PDF file size. Triggers on phrases like "skompresuj PDF", "zmniejsz PDF", "compress PDF", "reduce PDF size".
---

# Compress PDF Skill

Kompresuje pliki PDF za pomocą Ghostscript z konfigurowalnymi opcjami jakości i docelowym rozmiarem.

## Wymagania

Ghostscript musi być zainstalowany:
```bash
brew install ghostscript   # macOS
apt install ghostscript    # Ubuntu/Debian
```

## Workflow

### 1. Zbierz parametry od użytkownika

Zapytaj o (lub odczytaj z polecenia):

| Parametr | Opcje | Domyślnie |
|----------|-------|-----------|
| Plik(i) wejściowe | ścieżki do PDF | — (wymagane) |
| Jakość | `screen`, `ebook`, `printer`, `prepress` | `ebook` |
| DPI obrazów | liczba, np. `100` | wg presetu |
| Docelowy rozmiar | np. `2MB`, `500KB` | brak |
| Wyjście | ścieżka pliku lub katalogu | `_compressed.pdf` obok oryginału |

**Presety jakości:**
- `screen` — 72 dpi, maksymalna kompresja (~20% oryginału), do czytania na ekranie
- `ebook` — 150 dpi, dobry balans (~40% oryginału), domyślny wybór
- `printer` — 300 dpi, wysoka jakość (~70% oryginału)
- `prepress` — 300+ dpi, minimalna kompresja (~90% oryginału)

Jeśli użytkownik podał **docelowy rozmiar** (`--target-size`), skrypt automatycznie próbuje wszystkich presetów od najsilniejszego i raportuje minimalny osiągalny rozmiar, jeśli cel jest nieosiągalny.

### 2. Uruchom skrypt

Aktywuj środowisko i uruchom:

```bash
source .venv/bin/activate
python [skill_path]/scripts/compress_pdf.py [inputs] [options]
```

**[skill_path]**: pełna ścieżka do `skills/skills-custom/compress-pdf`

#### Przykłady wywołań

Pojedynczy plik, domyślna jakość:
```bash
python compress_pdf.py dokument.pdf
```

Konkretna jakość i DPI:
```bash
python compress_pdf.py dokument.pdf -q screen --dpi 100
```

Docelowy rozmiar:
```bash
python compress_pdf.py dokument.pdf --target-size 2MB
```

Wiele plików do katalogu:
```bash
python compress_pdf.py plik1.pdf plik2.pdf plik3.pdf -o skompresowane/
```

Konkretna ścieżka wyjściowa:
```bash
python compress_pdf.py raport.pdf -o raport_maly.pdf -q ebook
```

Wszystkie opcje:
```bash
python compress_pdf.py wejscie.pdf -o wyjscie.pdf -q ebook --dpi 120 --target-size 1.5MB
```

### 3. Zinterpretuj wynik i poinformuj użytkownika

Skrypt wypisuje dla każdego pliku:
- Rozmiar oryginalny i skompresowany
- Procent oryginału i zaoszczędzone miejsce
- Użyty preset

**Jeśli docelowy rozmiar jest nieosiągalny**, skrypt wypisze:
```
⚠ Target 500.0 KB not achievable.
  Minimum achievable: 1.2 MB (preset: screen)
```

Poinformuj użytkownika o minimalnym osiągalnym rozmiarze i zapytaj, czy chce zapisać tę wersję.

## Parametry CLI

| Flaga | Opis |
|-------|------|
| `inputs` | Jeden lub więcej plików PDF |
| `-o / --output` | Plik wyjściowy lub katalog |
| `-q / --quality` | Preset: `screen`, `ebook`, `printer`, `prepress` |
| `--dpi N` | Niestandardowe DPI dla obrazów |
| `--target-size SIZE` | Docelowy rozmiar, np. `2MB`, `500KB` |
| `--suffix TEXT` | Sufiks nazwy pliku (domyślnie: `_compressed`) |

## Edge Cases

- Brak Ghostscript → skrypt wypisze instrukcję instalacji i zakończy z błędem
- Plik nie istnieje lub nie jest PDF → błąd z nazwą pliku
- Skompresowany plik może być **większy** niż oryginał dla już skompresowanych PDF-ów — poinformuj użytkownika
- Tryb `--target-size` zapisuje najlepszy (najmniejszy) wynik nawet jeśli cel jest nieosiągalny
- Katalog wyjściowy jest tworzony automatycznie
