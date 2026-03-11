---
name: merge-pdfs
description: Merge multiple PDF files into a single PDF in a user-specified order. Use when a user provides multiple PDF files and wants to combine them into one document.
---

# Merge PDFs Skill

Łączy wiele plików PDF w jeden dokument w podanej kolejności.

## Workflow

### 1. Ustal listę plików i kolejność

Zapytaj użytkownika (lub odczytaj z polecenia) o:
- Ścieżki do plików PDF
- Żądaną kolejność w nowym dokumencie
- Ścieżkę wyjściową (domyślnie: `merged.pdf` w katalogu pierwszego pliku)

Jeśli użytkownik poda pliki bez kolejności, wylistuj je i zapytaj o potwierdzenie kolejności przed scalaniem.

### 2. Uruchom skrypt scalania

```bash
source .venv/bin/activate
python [skill_path]/scripts/merge_pdfs.py "[output_path]" "[file1]" "[file2]" "[file3]"
```

- **[skill_path]**: Ścieżka do katalogu skilla `merge-pdfs`
- **[output_path]**: Ścieżka do wyjściowego pliku PDF
- **[file1], [file2], ...**: Pliki wejściowe w żądanej kolejności

### 3. Potwierdź wynik

Skrypt wypisze listę scalonych plików, liczbę stron z każdego i łączną liczbę stron. Poinformuj użytkownika o wyniku.

## Przykłady

Scalenie 3 plików:
```bash
python merge_pdfs.py ~/Documents/wynik.pdf ~/Documents/rozdzial1.pdf ~/Documents/rozdzial2.pdf ~/Documents/rozdzial3.pdf
```

## Zależności

Wymaga biblioteki `pypdf`:
```bash
pip install pypdf
```

## Edge Cases

- Jeśli plik nie istnieje → skrypt wypisze błąd i zakończy działanie
- Jeśli plik nie jest PDF → błąd z informacją o złym pliku
- Katalog wyjściowy jest tworzony automatycznie, jeśli nie istnieje
- Obsługuje zarówno `pypdf` (nowa) jak i `PyPDF2` (stara)
