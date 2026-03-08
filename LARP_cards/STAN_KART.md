# Dokumentacja Generowania Kart - Cień nad Zakonem 

Ten plik stanowi podsumowanie aktualnego stanu prac nakierowanych na generowanie zestawu kart LARPowych ("Cień nad Zakonem"). Opisuje kroki, które zostały do tej pory zrealizowane, oraz sposób postępowania po zresetowaniu limitów na wywoływanie AI dla nowych ilustracji.

## 1. Podsumowanie Aktualnego Stanu Prac

*   **Ekstrakcja Danych:** W pełni "rozczytano" wszystkie potrzebne talie z wejściowego pliku PDF (`LARP - Cien nad Zakonem - spis kart.pdf`).
*   **Logika parsowania wszystkich 112 unikalnych kart do formatu JSON:** Zebrano każdą kartę z takimi wartościami jak nazwa, tekst mechaniki, dopisywany zależnie flavor tekst fabularny oraz liczba kopii w druku. Dane te leżą pod: `@[/Users/marek/OfflineDocuments/Repo/Antigravity/Design/.tmp/all_cards.json]`.
*   **Format Kart i PDFów:** Opracowano i zintegrowano poprawne szablonowanie HTML i CSS dla docelowych kart poprzez Playwright. Karty uzyskują poprawne larpowe wymiary TCG: **63x88mm** wraz ze spadami marginesowymi na każdej pojedynczej stronie z oddzieleniem. Posiłek na formacie czcionek *"EB Garamond"* oraz *"Cinzel"*.
*   **Grafiki:** Wygenerowano i wyeksportowano zadowalający wizerunek ryciny średniowiecznej (styl grawerunku na drewnie) dla: 
    *   **9** Mikstur (kompletne)
    *   **7** Pierwszych Kart Zakonnych (pozostało drugie tyle oraz reszta w innych kategoriach).
*   **Pliki docelowe generowania:** Na ten moment utworzono pliki, wykorzystujące obrazy tam, gdzie się udało wygenerować, a posiłkujące się plikiem zapasowym `img/0.png` dla reszty nakładu. Gotowe, kompletne, ale w dużej mierze zastępcze PDFy oczekują w `PDF_output/`. Do weryfikacji mechanicznej są idealne.

## 2. Architektura i Ważne Pliki

*   **Wejściowy PDF:** `PDF_input/LARP - Cien nad Zakonem - spis kart.pdf`
*   **Główna baza JSON:** `.tmp/all_cards.json`
*   **Katalog z obrazkami (dla druku PDF):** `PDF_output/images/`
*   **Skrypty PDFów (Playwright):** 
    *   `.tmp/generate_final_cards_pdf.py` (Obrabia Karty Zakonne, Zakazane i Mikstury)
    *   `.tmp/generate_rest_cards_pdf.py` (Obrabia Plotki, Stany i Dowody Grzechu)

## 3. Co i Jak Wykonać Dalej (Gdy Powrócą Limity Obrazków)

Gdy dostępność opcji generowania powróci (tj. za ok. 2 godziny), należy wykonać następujące działania:

### Krok 1: Kontynuacja wywołań w API AI (Generacja reszty z odpowiednim Promptem)
Należy skorzystać ze schematu zapytań (promptów), jaki przyniósł nam wymaganą czarno-białą, rytowniczą zgodność ze stroną podręcznika:
> **Zalecany Prompt AI:** `"A medieval black and white woodcut engraving of a [ENGLISH_TRANSLATION_OR_DESCRIPTION]. White background."`

Należy wypisać sobie, ile z 112 pozycji wymaga fizycznej ryciny (Stany i Plotki np. mogą wykorzystywać uniwersalny obraz rewersu lub wspólną ramkę – tutaj można zdecydować mechanicznie, żeby obniżyć pożeranie kredytów, albo dać sztucznej inteligencji wolną rękę nad dosłownie KAŻDĄ plotką osobiście).
**Brakujące kategorie:** reszta Kart Zakonnych, całe Karty Zakazane, sprytne rysunki dla Dowodów Grzechu.

### Krok 2: Export Obrazów do Output Images Directory
Cokolwiek wygeneruje Agent, powinno zostawać automatycznie lub skryptem przenoszone do katalogu:
`@[/Users/marek/OfflineDocuments/Repo/Antigravity/Design/PDF_output/images]` z rozsądną zwięzłą nazwą, dla przykładu: `karta_zakazana_15_liber_furti.png`.

### Krok 3: Aktualizacja Słownika Podpięć Plików W Skryptach
Skrypty: `.tmp/generate_final_cards_pdf.py` oraz `.tmp/generate_rest_cards_pdf.py` opierają się na słowniku, w którym kluczem jest pełna nazwa danej karty (jak *Archiwum Zakonu*), a wartością jej grafika bazowa lub wzór "glob". 
Należy otworzyć te pliki i analogicznie je za-mapować przy pomocy nowego skryptu:

```python
title_to_img_pattern = {
    # ... dodasz nowo zaimportowane pliki ze zmienionymi nazwami na dopasowane obrazy
    "Archiwum Zakonu": "archiwum_concept.png"
}
```

### Krok 4: Ostateczne Renderowanie Plików PDF
Gdy upewnimy się, że obrazy załadowały się do folderu docelowego i połączono je mapowanymi zmiennymi – odpalamy z terminala skrypty renderujące ponownie.

```bash
python3 .tmp/generate_final_cards_pdf.py
python3 .tmp/generate_rest_cards_pdf.py
```
Pliki `.pdf` same nadpiszą się wraz z kompletem odpowiednich grafik, a Ty będziesz gotowy do cięcia gilotyną.
