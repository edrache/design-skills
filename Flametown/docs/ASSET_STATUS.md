# Flametown Prototype Asset Status

Stan na: 2026-07-18

## Zasada ladowania

Gra laduje assety kafelkow z katalogu `assets/tiles/` wedlug wzoru:

- `<typeId>_1.png`
- `<typeId>_2.png`
- ...
- do maksymalnie `20` wariantow na typ

Ladowane typy:

- `house`
- `shop`
- `plaza`
- `park`
- `fountain`
- `decoration`

## Assety graficzne

| Typ | Wzor pliku | Status | Istniejace pliki | Braki |
| --- | --- | --- | --- | --- |
| `house` | `assets/tiles/house_<n>.png` | czesciowo gotowe | `house_1.png` | `house_2.png` - `house_20.png` |
| `shop` | `assets/tiles/shop_<n>.png` | brak | - | `shop_1.png` - `shop_20.png` |
| `plaza` | `assets/tiles/plaza_<n>.png` | brak | - | `plaza_1.png` - `plaza_20.png` |
| `park` | `assets/tiles/park_<n>.png` | brak | - | `park_1.png` - `park_20.png` |
| `fountain` | `assets/tiles/fountain_<n>.png` | brak | - | `fountain_1.png` - `fountain_20.png` |
| `decoration` | `assets/tiles/decoration_<n>.png` | brak | - | `decoration_1.png` - `decoration_20.png` |

## Pliki obecne w repo

- [house_1.png](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/assets/tiles/house_1.png)
- [.gitkeep](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/assets/tiles/.gitkeep)

## Uwagi

- Jesli plik graficzny nie istnieje, gra automatycznie fallbackuje do emoji.
- Tlo, siatka, drogi, ghost piece i podglad klocka w panelu nie korzystaja z osobnych plikow graficznych - sa rysowane proceduralnie.
