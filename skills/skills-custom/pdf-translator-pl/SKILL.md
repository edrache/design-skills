---
name: pdf-translator-pl
description: Tłumaczenie podręczników RPG z formatu PDF (j. angielski) na PDF (j. polski). Skill łączy ekstrakcję treści (pdf-to-md), tłumaczenie w klimacie RPG (rpg-translator) oraz generowanie wynikowego pliku PDF. Używaj, gdy użytkownik dostarczy PDF i poprosi o jego polską wersję.
---

# PDF Translator PL (RPG)

Ten skill automatyzuje proces tłumaczenia anglojęzycznych dokumentów PDF (głównie gier RPG) na język polski, dbając o zachowanie terminologii i klimatu.

## Workflow

### 1. Ekstrakcja Treści (PDF -> MD)
Użyj skilla `pdf-to-md`, aby wypakować tekst i obrazy z PDFa.
```bash
python3.11 skills/skills-custom/pdf-to-md/scripts/extract_pdf.py "[input_pdf]" --output_dir "[temp_dir]"
```

### 2. Formatowanie i Tłumaczenie (MD -> MD PL)
Przeczytaj `content.json` z `[temp_dir]`. Sformatuj treść jako Markdown, a następnie przetłumacz ją na j. polski, stosując wytyczne ze skilla `rpg-translator`.
- Zachowaj strukturę nagłówków.
- Używaj spójnej terminologii z `rpg-translator/references/rpg_terms.md`.
- Wstawiaj obrazy używając ścieżek z `temp_dir`.

### 3. Generowanie PDF (MD PL -> PDF)
Skonwertuj przetłumaczony Markdown z powrotem do formatu PDF.
Możesz użyć skryptu pomocniczego:
```bash
python3.11 skills/skills-custom/pdf-translator-pl/scripts/md_to_pdf.py "[translated_md]" "[output_pdf]"
```


## Wytyczne dla Agenta

1. **Spójność**: Upewnij się, że nazwy atrybutów i umiejętności są zgodne z polskimi standardami RPG (np. "Strength" -> "Siła", "Saving Throw" -> "Rzut obronny").
2. **Obrazy**: Nie pomijaj obrazów. Jeśli `pdf-to-md` je wypakował, powinny znaleźć się w pliku Markdown, a następnie w wynikowym PDF.
3. **Układ**: Staraj się zachować hierarchię dokumentu (nagłówki H1, H2, H3).

## Zasoby pomocnicze
- `scripts/md_to_pdf.py`: Skrypt do prostej konwersji MD do PDF przy użyciu PyMuPDF.
- `rpg-translator`: Skill referencyjny dla terminologii.
