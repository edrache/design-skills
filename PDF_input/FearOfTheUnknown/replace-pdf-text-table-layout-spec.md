# Specyfikacja rozszerzenia `replace-pdf-text`: jednolity skład tabel

## Cel

Rozszerzyć `replace-pdf-text` o możliwość zastępowania tekstu w tabelach tak, aby:

- wszystkie komórki należące do grupy używały identycznego fontu i rozmiaru;
- tekst był wyrównany do lewej, środka albo prawej;
- obszarem układu była cała komórka, a nie tylko prostokąt oryginalnego napisu;
- dłuższy tekst mógł zajmować kilka wierszy;
- rozmiar został obliczony wspólnie dla całej grupy;
- przepełnienie było wykrywane przed modyfikacją PDF;
- dotychczasowe pliki JSON działały bez zmian.

## Proponowany format JSON

```json
{
  "policies": {
    "min_font_scale": 0.65,
    "font_step": 0.1,
    "fail_on_overflow": true
  },
  "layout_groups": {
    "table-values": {
      "font": "/System/Library/Fonts/Supplemental/Arial Narrow Italic.ttf",
      "font_size": {
        "mode": "uniform_fit",
        "preferred": 8.0,
        "minimum": 6.5,
        "maximum": 8.0,
        "step": 0.1
      },
      "align": "left",
      "valign": "middle",
      "padding": {
        "left": 14,
        "right": 3,
        "top": 1,
        "bottom": 1
      },
      "wrap": true,
      "max_lines": 2,
      "line_height": 1.0,
      "overflow": "error",
      "uppercase": false
    }
  },
  "replacements": [
    {
      "page": 1,
      "old": "The old sawmill",
      "new": "Stary tartak",
      "occurrence": 1,
      "layout_group": "table-values",
      "layout_bbox": [42.0, 232.0, 208.0, 249.0]
    }
  ]
}
```

`layout_bbox` oznacza prostokąt całej komórki. Lewy padding 14 pt pozostawia miejsce na numer rzutu, który nie jest usuwany.

## Tryby rozmiaru fontu

Pole `font_size.mode` powinno obsługiwać trzy wartości.

### `preserve`

Obecne zachowanie:

```json
"font_size": {
  "mode": "preserve",
  "minimum_scale": 0.65
}
```

Każdy tekst może dostać inny rozmiar.

### `fixed`

Ściśle określony rozmiar:

```json
"font_size": {
  "mode": "fixed",
  "size": 7.5
}
```

Jeśli tekst nie mieści się po zawinięciu do `max_lines`, operacja kończy się błędem.

### `uniform_fit`

Zalecany tryb dla tabel:

```json
"font_size": {
  "mode": "uniform_fit",
  "preferred": 8.0,
  "minimum": 6.5,
  "maximum": 8.0,
  "step": 0.1
}
```

Algorytm znajduje największy rozmiar, przy którym mieszczą się wszystkie elementy grupy. Obliczona wartość jest następnie używana dla każdego wpisu, także krótkiego.

## Pola grupy układu

| Pole | Typ | Znaczenie |
|---|---:|---|
| `font` | string | Bezwzględna ścieżka do fontu |
| `font_index` | integer | Opcjonalna twarz w pliku TTC |
| `font_size` | object | `preserve`, `fixed` albo `uniform_fit` |
| `align` | string | `left`, `center`, `right`, `justify` |
| `valign` | string | `top`, `middle`, `bottom`, `baseline` |
| `padding` | number/object | Wewnętrzne marginesy prostokąta |
| `wrap` | boolean | Zezwolenie na łamanie wierszy |
| `max_lines` | integer | Maksymalna liczba wierszy |
| `line_height` | number | Mnożnik wysokości wiersza |
| `overflow` | string | `error`, `shrink`, `clip` |
| `uppercase` | boolean | Wymuszenie wielkich liter |
| `hyphenation` | string | `none`, `soft`, `language` |
| `language` | string | Np. `pl`, wykorzystywane przy dzieleniu wyrazów |

Domyślne `overflow` powinno wynosić `error`. Tryb `clip` jest ryzykowny i nie powinien być używany automatycznie.

## Pola pojedynczej podmiany

Nowe opcjonalne pola:

```json
{
  "layout_group": "table-values",
  "layout_bbox": [x0, y0, x1, y1],
  "redact_bbox": [x0, y0, x1, y1],
  "padding": {
    "left": 14
  },
  "align": "left",
  "valign": "middle",
  "max_lines": 2,
  "font_size": 7.5
}
```

Wartości na poziomie podmiany nadpisują grupę.

`redact_bbox` i `layout_bbox` muszą być rozdzielone:

- `redact_bbox` — obszar usuwanego oryginalnego tekstu;
- `layout_bbox` — obszar dostępny dla nowego tekstu.

Domyślnie redagowane powinny być wyłącznie znalezione glify. Dzięki temu linie tabeli i numery rzutów pozostają nietknięte.

## Algorytm `uniform_fit`

Operacja powinna przebiegać przed zastosowaniem jakichkolwiek redakcji:

1. Znajdź wszystkie źródłowe wystąpienia.
2. Rozwiąż fonty i sprawdź polskie glify.
3. Wyznacz `layout_bbox` i padding.
4. Dla każdej grupy zacznij od `maximum`.
5. Zawiń każdy tekst w jego prostokącie.
6. Sprawdź szerokość, liczbę wierszy i wysokość.
7. Jeśli choć jeden wpis się nie mieści, zmniejsz rozmiar o `step`.
8. Zakończ po znalezieniu wspólnego rozmiaru.
9. Jeśli osiągnięto `minimum` bez sukcesu, przerwij bez zapisywania PDF.
10. Dopiero po poprawnym zaplanowaniu wszystkich grup wykonaj redakcje i wstawianie.

Dopasowanie musi być transakcyjne. Błąd jednej komórki nie może pozostawić częściowo wygenerowanego dokumentu.

## Łamanie tekstu

Nie należy polegać wyłącznie na `page.insert_textbox()`. Potrzebny jest deterministyczny wrapper oparty na:

```python
font.text_length(text, fontsize=size)
```

Reguły:

1. Respektuj jawne `\n`.
2. Łam najpierw na spacjach.
3. Zachowuj nierozdzielne fragmenty, np. `7–9` i `+1`.
4. Opcjonalnie łam przy łączniku.
5. Nie wstawiaj miękkiego łącznika bez potrzeby.
6. Jeśli pojedynczy wyraz nie mieści się w wierszu, zwróć błąd albo zastosuj dzielenie właściwe dla języka.
7. Nie przekraczaj `max_lines`.

Wrapper powinien zwracać:

```python
LayoutResult(
    lines=["pierwszy wiersz", "drugi wiersz"],
    width=...,
    height=...,
    overflow=False,
)
```

## Wyrównanie pionowe

Po obliczeniu wysokości bloku:

```text
top:    y = content_rect.y0
middle: y = content_rect.y0 + (content_rect.height - text_height) / 2
bottom: y = content_rect.y1 - text_height
```

Dla tabel najlepsze będzie:

```json
"align": "left",
"valign": "middle"
```

## Pozyskiwanie obszarów komórek

### Wersja minimalna

Wymagaj jawnego `layout_bbox` dla każdej komórki. Jest to najbezpieczniejszy pierwszy etap.

Rozszerz `inspect`, aby eksportował linie z geometrią:

```bash
pdfreplace inspect input.pdf \
  --include-lines \
  -o inspection.json
```

### Wersja docelowa

Dodać wykrywanie tabel:

```bash
pdfreplace inspect input.pdf \
  --detect-tables \
  -o inspection.json
```

Wynik:

```json
{
  "tables": [
    {
      "id": "page-1-table-1",
      "page": 1,
      "bbox": [42, 218, 400, 568],
      "cells": [
        {
          "row": 1,
          "column": 1,
          "bbox": [42, 232, 208, 249],
          "text": "1 The old sawmill"
        }
      ]
    }
  ]
}
```

Detekcja może korzystać z `page.get_drawings()`:

1. Zbierz poziome i pionowe odcinki.
2. Scal współrzędne z tolerancją około 1 pt.
3. Znajdź zamknięte prostokąty.
4. Przypisz tekst według środka glifów.
5. Wykryj scalone komórki na podstawie brakujących separatorów.

Podmiana mogłaby wtedy wskazywać:

```json
{
  "table": "page-1-table-1",
  "row": 1,
  "column": 1,
  "content_padding_left": 14
}
```

## Zmiany w kodzie

Najważniejsze modyfikacje w `pdfreplace.py`:

1. Zastąpić rozgałęzienie `_insert_single_line()` / `_fit_and_insert()` wspólnym mechanizmem:

   ```python
   layout_text(...)
   render_text_layout(...)
   ```

2. Dodać modele:

   ```python
   LayoutGroup
   FontSizePolicy
   Padding
   LayoutPlan
   LayoutResult
   ```

3. Po fazie `prepared` dodać:

   ```python
   resolve_layout_rects()
   resolve_layout_groups()
   measure_all_replacements()
   validate_layout_plan()
   ```

4. Dopiero później wykonywać istniejące redakcje.

5. Dla każdego wpisu korzystać z obliczonego:

   ```python
   resolved_font_size
   content_bbox
   lines
   text_origin
   ```

## Raport

Każda podmiana powinna raportować:

```json
{
  "layout_group": "table-values",
  "layout_bbox": [42, 232, 208, 249],
  "content_bbox": [56, 233, 205, 248],
  "font_file": ".../Arial Narrow Italic.ttf",
  "font_size_mode": "uniform_fit",
  "requested_font_size": 8.0,
  "resolved_group_font_size": 7.4,
  "final_size": 7.4,
  "align": "left",
  "valign": "middle",
  "line_count": 2,
  "lines": [
    "Miasteczkowa plotkara lub",
    "miasteczkowy plotkarz"
  ],
  "wrapped": true,
  "overflow": false,
  "status": "replaced"
}
```

Raport grupy:

```json
{
  "layout_groups": {
    "table-values": {
      "replacement_count": 684,
      "resolved_font_size": 7.4,
      "minimum": 6.5,
      "maximum": 8.0,
      "wrapped_count": 37,
      "overflow_count": 0
    }
  }
}
```

## Nowa komenda planowania

Warto dodać tryb bez modyfikacji PDF:

```bash
pdfreplace plan \
  input.pdf \
  replacements.json \
  -o layout-plan.json
```

Powinien:

- znaleźć wszystkie wystąpienia;
- rozwiązać fonty;
- obliczyć wspólny rozmiar;
- zwrócić podział na wiersze;
- wykryć przepełnienia;
- nie tworzyć PDF.

`apply` może wewnętrznie uruchamiać dokładnie ten sam planner.

## Kompatybilność

- Brak `layout_group` i `layout_bbox` oznacza stare zachowanie.
- Dotychczasowe `font`, `uppercase`, `occurrence` i `min_font_scale` pozostają obsługiwane.
- Nowy kod nie może zmieniać renderowania istniejących konfiguracji.
- Nie należy automatycznie wykrywać tabel w `apply`; wykrywanie powinno być jawne lub pochodzić z przygotowanego planu.

## Testy akceptacyjne

Dla `fotu_only_tables.pdf` rezultat powinien spełniać:

- wszystkie 684 wartości tabel używają dokładnie tego samego fontu i rozmiaru;
- `final_size` jest identyczny z tolerancją `0.001 pt`;
- tekst zaczyna się w stałej odległości od lewej krawędzi komórki;
- numery rzutów pozostają widoczne;
- żadna linia tabeli nie zostaje usunięta;
- tekst zajmuje najwyżej dwa wiersze;
- brak tekstu poza `content_bbox`;
- wszystkie polskie znaki są widoczne i ekstrahowalne;
- wszystkie 739 podmian mają status `replaced`;
- liczba stron, rozmiary stron i grafika poza redagowanym tekstem pozostają niezmienione;
- niemożliwy układ kończy się błędem przed zapisaniem PDF.

## Zalecana konfiguracja dla `fotu_only_tables.pdf`

Punkt wyjścia:

```json
{
  "font": "/System/Library/Fonts/Supplemental/Arial Narrow Italic.ttf",
  "font_size": {
    "mode": "uniform_fit",
    "preferred": 8.0,
    "minimum": 6.5,
    "maximum": 8.0,
    "step": 0.1
  },
  "align": "left",
  "valign": "middle",
  "wrap": true,
  "max_lines": 2,
  "line_height": 1.0,
  "overflow": "error"
}
```

Należy pozostawić osobny lewy gutter na numer rzutu. Taki układ zapewni równy skład bez konieczności skracania tłumaczeń.
