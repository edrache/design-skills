# Flametown Prototype Project Context

Stan na: 2026-07-18

Ten dokument jest przeznaczony dla kolejnych agentow pracujacych nad projektem.

## Ważne

Ten dokument ma byc rozwijany i aktualizowany.
Przy kazdej istotnej zmianie w architekturze, assetach, testach, workflow albo statusie projektu nalezy dopisac tu nowe informacje, zamiast liczyc na to, ze kolejny agent sam je odszuka w repo.

## Cel projektu

Projekt implementuje grywalny prototyp HTML/JS/canvas dla core loopu tetromino city buildera:

- losowanie jednego klocka
- podniesienie klocka z panelu
- obrot
- podglad ghost piece
- legalne / nielegalne stawianie
- drogi na krawedziach
- losowanie typu pola
- zapis / odczyt stanu
- automatyczna podmiana emoji na prawdziwe assety PNG, jesli istnieja

## Lokalizacja

Glowny katalog projektu:

- [Flametown/prototype](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype)

Najwazniejsze dokumenty:

- plan implementacyjny: [2026-07-18-tetromino-prototype-plan.md](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/docs/plans/2026-07-18-tetromino-prototype-plan.md)
- status assetow: [ASSET_STATUS.md](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/ASSET_STATUS.md)
- biezacy dziennik pracy: [progress.md](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/progress.md)

## Architektura i pliki

Punkt startowy aplikacji:

- [index.html](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/index.html)
- [main.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/main.js)

Konfiguracja:

- [config.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/config.js)

Moduly logiki:

- [grid.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/grid.js)
- [camera.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/camera.js)
- [pieces.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/pieces.js)
- [elementCatalog.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/elementCatalog.js)
- [roads.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/roads.js)
- [assets.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/assets.js)
- [state.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/state.js)
- [anim.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/anim.js)

Warstwa UI / wejscia / renderu:

- [render.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/render.js)
- [input.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/input.js)
- [ui.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/ui.js)

Testy:

- [tests/](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/tests)

Assety:

- [assets/tiles/](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/assets/tiles)
- tlo swiata: [Terrain_Base.png](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/assets/tiles/Terrain_Base.png)

Artefakty z lokalnych testow:

- [output/](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/output)

## Aktualny stan funkcjonalny

Na teraz zaimplementowane i sprawdzone sa:

- jitterowana siatka
- kamera: zoom, pan myszka i `WASD`
- wszystkie klasyczne ksztalty tetromino
- legalnosc stawiania:
  - pierwszy klocek mozna postawic wszedzie w granicach
  - kolejne musza stykac sie krawedzia z istniejacym miastem
- drogi z dopasowaniem do juz postawionych sasiadow
- losowanie typu pola z katalogu wag
- preview aktualnego klocka w panelu
- ghost piece z legal / illegal feedback
- autosave i reload
- bounce animation dla nowo postawionych pol
- asynchroniczne ladowanie asset manifestu
- fallback do emoji, gdy nie ma PNG

## Elementy swiata / assety

Tlo planszy:

- canvas renderuje teraz duza teksture tileowana z `assets/tiles/Terrain_Base.png`
- tileowanie jest zakotwiczone w swiecie gry, wiec porusza sie razem z kamera zamiast byc statycznym overlayem ekranu
- gestosc tileowania kontroluje `BACKGROUND_TILE_WORLD_SIZE` w [config.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/config.js)
- zajete pola dostaja druga warstwe tileowanego tla, maskowana do wielokatow zbudowanych komorek
- built-area fill ma osobne klucze konfiguracyjne `BUILT_BACKGROUND_TEXTURE_PATH` i `BUILT_BACKGROUND_TILE_WORLD_SIZE`; obecnie korzysta z `assets/tiles/Terrain_Town.png`
- zewnetrzny obrys warstwy built-area nie jest juz idealnie ostry:
  - renderer znajduje tylko wystawione na zewnatrz krawedzie zajetych pol,
  - dodaje na nich nieregularny fringe z tekstury miasta, ktory miejscami wychodzi poza footprint,
  - oraz delikatny erosion strip z tekstury terenu, ktory miejscami cofa wizualna granice do srodka
- sila tego efektu jest sterowana przez `BUILT_EDGE_FRINGE_WORLD_SIZE` i `BUILT_EDGE_EROSION_WORLD_SIZE` w [config.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/config.js)

Typy pol obecnie zdefiniowane w katalogu:

- `house`
- `shop`
- `plaza`
- `park`
- `fountain`
- `decoration`

Wzorzec nazw assetow:

- `assets/tiles/<typeId>_1.png`
- `assets/tiles/<typeId>_2.png`
- ...
- do `MAX_ASSET_VARIANTS = 20`

Na ten moment w repo istnieje tylko:

- [house_1.png](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/assets/tiles/house_1.png)

Jesli plik nie istnieje, render leci przez emoji z `elementCatalog.js`.

## Ważne decyzje techniczne

- Brak bundlera i brak npm dependencies w samym projekcie gry.
- Aplikacja dziala jako natywne ES modules.
- Grid logic dziala na regularnych wspolrzednych `(row, col)`.
- Jitter jest tylko transformacja renderingu, nie wplywa na legalnosc ani sasiedztwo.
- Save do `localStorage` zostal odchudzony:
  - zapisywany jest sparse stan zajetych pol
  - oraz `worldSeed`
  - wierzcholki sa odbudowywane deterministycznie z seeda przy loadzie
- To bylo konieczne, bo pelny zapis grid + vertices przekraczal limit `localStorage`.

## Jak uruchomic gre

```bash
cd /Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype
python3 -m http.server 8091
```

URL:

- [http://127.0.0.1:8091/index.html](http://127.0.0.1:8091/index.html)

## Sterowanie

- klik na preview klocka: podnies klocek
- `Tab`: obrot
- prawy przycisk myszy: obrot
- lewy klik na planszy: postaw klocek
- scroll: zoom
- srodkowy przycisk myszy drag: pan
- `WASD` / strzalki: pan

## Testy

Pelny lokalny zestaw testow:

```bash
cd /Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype
for f in tests/*.test.js; do echo "== $f =="; node "$f" || exit 1; done
```

Istniejace pliki testowe:

- `anim.test.js`
- `assets.test.js`
- `camera.test.js`
- `elementCatalog.test.js`
- `grid.test.js`
- `persistence.test.js`
- `pieces.test.js`
- `roads.test.js`
- `state.test.js`

## Browser verification

Byly robione lokalne testy przegladarkowe dla:

- corrupted save recovery
- unsupported save version recovery
- grid size clamping
- legal / illegal placement
- road continuity
- persistence po reloadzie
- podmiany emoji na prawdziwy asset dla `house_1.png`

Screenshoty i JSON-y z tych testow sa w:

- [output/](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/output)

## Debug hooks w runtime

W `window` sa dostepne pomocnicze haki:

- `window.render_game_to_text()`
- `window.advanceTime(ms)`
- `window.__flametown.getStateSnapshot()`
- `window.__flametown.setCurrentPiece(shapeId, rotation)`
- `window.__flametown.placeCurrentPiece(row, col)`

Te haki istnieja glownie po to, by kolejni agenci mogli szybciej testowac i diagnozowac zachowanie gry.

## Znane ograniczenia / rzeczy do uwazania

- W planie zostaly jeszcze nieodhaczone glownie checkpointy commitowe i reczna weryfikacja bounce animation.
- Ladowanie assetow robi probe kolejnych PNG; brakujace pliki daja 404 w local preview i to jest oczekiwane.
- Nie wszystkie scenariusze gameplayowe sa zdeterminowane, bo typy pol i warianty nadal moga byc losowe.
- Jesli dokladane beda nowe typy pol, trzeba zaktualizowac:
  - `src/elementCatalog.js`
  - `ASSET_STATUS.md`
  - ten dokument

## Oczekiwanie wobec kolejnych agentow

Jesli zmieniasz projekt, zaktualizuj przynajmniej:

- ten dokument
- `progress.md`
- odpowiedni plan / status assetow, jesli zmiana tego dotyczy

Nie zakladaj, ze wiedza jest oczywista albo juz zapisana gdzie indziej - dopisz to tutaj.
