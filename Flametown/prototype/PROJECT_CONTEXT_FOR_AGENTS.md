# Flametown Prototype Project Context

Stan na: 2026-07-19
Aktualna wersja prototypu: `0.1.4`

Ten dokument jest przeznaczony dla kolejnych agentow pracujacych nad projektem.

## Ważne

Ten dokument ma byc rozwijany i aktualizowany.
Przy kazdej istotnej zmianie w architekturze, assetach, testach, workflow albo statusie projektu nalezy dopisac tu nowe informacje, zamiast liczyc na to, ze kolejny agent sam je odszuka w repo.
Przy kazdej zmianie w prototypie trzeba tez zwiekszyc numer wersji, zaktualizowac badge w prawym dolnym rogu gry i dopisac wpis do changelogu ponizej.

## Changelog

### 0.1.4 - 2026-07-19

- `main.js` importuje teraz `ui.js` i `tutorial.js` jako namespace z query stringiem `?v=0.1.4`
- dodano fallback runtime dla tutoriala, zeby mieszany cache modulu nie wywracal calej gry na starcie
- to jest hotfix pod blad `The requested module './ui.js' does not provide an export named 'createTutorialOverlay'`

### 0.1.3 - 2026-07-19

- usunieto zaleznosc startu `main.js` od eksportu `APP_VERSION` z `config.js`
- badge wersji czyta teraz numer z `data-version` w `index.html`, co zmniejsza ryzyko awarii przy mieszanym cache po deployu
- query string modulu zostal podbity do `v=0.1.3`

### 0.1.2 - 2026-07-19

- przywrocono brakujacy import `BUILT_BACKGROUND_TEXTURE_PATH` oraz `BUILT_BACKGROUND_TILE_WORLD_SIZE` w `src/main.js`
- to jest hotfix do regresji z wersji `0.1.1`, przez ktora gra przestawala startowac z bledem `ReferenceError`

### 0.1.1 - 2026-07-19

- usunieto podwojny import w `src/main.js`, ktory mogl zatrzymywac start modulu w przegladarce po deployu
- dodano query string wersji do `src/main.js` w `index.html`, zeby ograniczyc problemy z cache po wdrozeniu
- to jest poprawka pod sytuacje, w ktorej na serwerze widac placeholder `version-badge`, ale nie pojawiaja sie numer wersji ani przycisk `Tutorial`

### 0.1.0 - 2026-07-19

- wprowadzono pierwszy jawny numer wersji prototypu
- dodano badge wersji w prawym dolnym rogu gry
- dodano changelog i regule obowiazkowego podbijania wersji przy kazdej kolejnej zmianie
- uzgodniono dokumenty agentowe dla dalszej pracy nad Flametown

## Cel projektu

Projekt implementuje grywalny prototyp HTML/JS/canvas dla core loopu tetromino city buildera:

- losowanie jednego klocka
- podniesienie klocka z panelu
- obrot
- podglad ghost piece
- legalne / nielegalne stawianie
- drogi na krawedziach
- render dróg zależny od zoomu, ze skalowaną szerokością i przejściem na teksturę `Road.png` z bliska
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
- wersja aplikacji: `APP_VERSION` w [config.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/config.js)

Moduly logiki:

- [grid.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/grid.js)
- [camera.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/camera.js)
- [pieces.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/pieces.js)
- [elementCatalog.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/elementCatalog.js)
- [roads.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/roads.js)
- [assets.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/assets.js)
- [state.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/state.js)
- [anim.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/anim.js)
- [clusters.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/clusters.js)

Warstwa UI / wejscia / renderu:

- [render.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/render.js)
- [input.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/input.js)
- [ui.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/ui.js)
- badge wersji jest osadzony w [index.html](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/index.html) i uzupelniany z [main.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/main.js)

Testy:

- [tests/](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/tests)

Assety:

- [assets/tiles/](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/assets/tiles)
- [assets/icons/](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/assets/icons)
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
- preview aktualnego klocka pokazuje juz przypisane typy pol dla tego konkretnego tetromino
- pola na planszy i komorki preview maja wspolny system overlay ikon:
  - `house` pokazuje `Icon_Shop.png`
  - `park` nie pokazuje ikony
  - sklepy `Shop_*` pokazuja ikone swojej grupy towaru
  - grupa `Any` jest wildcardem tylko w systemie klastrow sklepow, a nie dla `house` ani `park`
- system klastrow typow budynkow jest juz zaimplementowany:
  - dla zwyklych budynkow klaster liczy sie po dokladnym `elementType`, bez wildcardow miedzy roznymi typami
  - `house` moze laczyc sie w klastry tylko z `house`
  - `park` moze laczyc sie w klastry tylko z `park`
  - dla sklepow klaster liczy sie po `shopGroups`, wiec konkretne typy towarow sa rozdzielone, a `Any` dziala jako wild tylko dla sklepow i laczy sie z odpowiednim typem towaru
  - scoring mieszkancow przy mijaniu sklepu korzysta z tego samego indeksu klastrow: pojedynczy mijany sklep daje tyle punktow, ile wynosi rozmiar jego klastra dla danego `shopGroup`
  - jesli jedna krawedz dotyka dwoch sklepow tego samego typu punktowego, oba sklepy naliczaja swoje wartosci i popup agreguje sume w ramach `groupId`
  - runtime utrzymuje cache klastrow i rozmiar klastra jest zawsze dostepny dla hoverowanego bloku
  - hover budynku podswietla tlo wszystkich blokow nalezacych do tego samego polaczonego klastra
  - kolor highlightu klastra ma byc konfigurowalny, a nie zaszyty na stale w rendererze
  - przy kursorze ma pojawiac sie tooltip z ikona typu i liczba pol w klastrze
  - jesli hover dotyczy sklepu `Any`, tooltip ma pokazac osobne linie dla kazdej pasujacej grupy towaru, kazda z wlasna ikona i liczba pol
- po oddaleniu kamery ikony typu moga pojawiac sie tez na juz zbudowanych polach miasta:
  - start pojawiania steruje `CITY_ICON_ZOOM_START`
  - pelny rozmiar i wypelnienie bloku steruje `CITY_ICON_ZOOM_FULL`
- ghost piece z legal / illegal feedback
- autosave i reload
- bounce animation dla nowo postawionych pol
- asynchroniczne ladowanie asset manifestu
- asynchroniczne ladowanie manifestu ikon overlay
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
- `park`
- szeroka lista nazwanych sklepow fantasy `Shop_*`
- sklepy z grupa `Any` korzystaja z tej samej logiki co pozostale sklepy, ale ich waga losowania jest celowo obnizona do 10% wagi zwyklego sklepu

Metadane grup sklepow sa teraz czescia wpisow w katalogu elementow:

- definicje grup i ich ikon: `SHOP_GROUP_DEFINITIONS` w [elementCatalog.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/src/elementCatalog.js)
- overlaye ikon elementow: `ELEMENT_OVERLAY_ICON_DEFINITIONS` i helpery `getElementOverlayIconIds()` / `getElementOverlayIcons()`
- dodanie nowej grupy wymaga dopisania definicji ikony i przypisania `shopGroups` do wybranych elementow

Logika klastrow dla zbudowanych blokow:

- klaster jest wyznaczany po ortogonalnym sasiedztwie komorek na planszy
- zwykle typy budynkow naleza do jednego klastra tylko wtedy, gdy maja ten sam `elementType`
- `house` moze nalezec tylko do klastra `house`
- `park` moze nalezec tylko do klastra `park`
- sklepy naleza do klastrow po `shopGroups`; `Any` mostkuje dopasowany typ towaru tylko w warstwie sklepow i nie laczy sklepow z `house` czy `park`
- hover na konkretnym sklepie z typem towaru podswietla tylko jego klaster tego typu z ewentualnymi mostkami `Any`
- hover na sklepie `Any` laczy wszystkie klastry typow towaru, do ktorych ten konkretny sklep nalezy
- system utrzymuje gotowy indeks klastrow w runtime, zeby mozna bylo od razu pobrac rozmiar klastra i liste nalezacych do niego komorek
- ten sam indeks klastrow jest wspoldzielony przez hover i scoring mieszkancow, zeby reguly `Any` / `shopGroups` byly identyczne w obu miejscach
- renderer hovera zmienia kolor tla calego klastra powiazanego z aktualnie wskazanym budynkiem
- kolor tego tla powinien byc sterowany konfiguracja
- tooltip hovera powinien korzystac z danych klastra trzymanych w runtime, zeby liczebnosc nie byla liczona ad hoc w rendererze
- dla zwyklego typu tooltip pokazuje jedna linie: ikona typu + liczba pol w aktywnym klastrze
- dla `Any` tooltip pokazuje wiele linii: po jednej na kazda grupe sklepu, do ktorej dany blok nalezy, z osobna liczebnoscia klastra

Wzorzec nazw assetow:

- `assets/tiles/<typeId>_1.png`
- `assets/tiles/<typeId>_2.png`
- ...
- do `MAX_ASSET_VARIANTS = 20`

Na ten moment w repo istnieja m.in.:

- [house_1.png](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/assets/tiles/house_1.png)
- liczne bezposrednie PNG dla sklepow `Shop_*`
- ikony overlay w [assets/icons/](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/assets/icons)

Jesli plik nie istnieje, render leci przez emoji z `elementCatalog.js`.

Road rendering:

- szerokosc drogi kontroluje `ROAD_WIDTH_AT_CITY_ICON_ZOOM_START` w [config.js](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/config.js)
- ta wartosc oznacza szerokosc drogi w pikselach ekranu dokladnie przy `CITY_ICON_ZOOM_START`
- renderer skaluje te szerokosc proporcjonalnie dla innych zoomow
- tekstura bliskiego zoomu jest ladowana z `ROAD_TEXTURE_PATH`, obecnie `assets/tiles/Road.png`
- powtarzalnosc tekstury po dlugosci odcinka ustawia `ROAD_TEXTURE_TILE_WORLD_LENGTH`
- sila przejscia do tekstury steruje `ROAD_TEXTURE_ZOOM_FULL`
- tekstura jest rysowana jako strip wzdluz kazdego odcinka drogi, wiec tileuje sie tylko w jednym kierunku; pionowe drogi to ten sam strip obrocony razem z odcinkiem

## Ważne decyzje techniczne

- Brak bundlera i brak npm dependencies w samym projekcie gry.
- Aplikacja dziala jako natywne ES modules.
- Grid logic dziala na regularnych wspolrzednych `(row, col)`.
- Jitter jest tylko transformacja renderingu, nie wplywa na legalnosc ani sasiedztwo.
- Planowane klastry tez maja bazowac na regularnym ortogonalnym sasiedztwie gridu, a nie na jitterze renderingu.
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
- `roadStyle.test.js`
- `residents.test.js`
- `state.test.js`
- `clusters.test.js`

## Browser verification

Byly robione lokalne testy przegladarkowe dla:

- corrupted save recovery
- unsupported save version recovery
- grid size clamping
- legal / illegal placement
- road continuity
- persistence po reloadzie
- podmiany emoji na prawdziwy asset dla `house_1.png`
- hover highlight klastrow budynkow z wildcardem `Any`
- road zoom transition in `output/road-zoom-smoke/`:
  - `zoom = 5` dla legacy flat roads
  - `zoom = 6.5` dla przejscia
  - `zoom = 8` dla wyraznej tekstury z bliska

Screenshoty i JSON-y z tych testow sa w:

- [output/](/Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype/output)

## Debug hooks w runtime

W `window` sa dostepne pomocnicze haki:

- `window.render_game_to_text()`
- `window.advanceTime(ms)`
- `window.__flametown.getStateSnapshot()`
- `window.__flametown.setCurrentPiece(shapeId, rotation)`
- `window.__flametown.placeCurrentPiece(row, col)`
- `window.__flametown.loadClusterTestScenario()`
- `window.__flametown.loadRoadRenderTestScenario()`
- `window.__flametown.setCameraZoom(zoom)`
- `window.__flametown.setCameraPosition(x, y)`

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
Przy kazdej kolejnej zmianie dopisz tez nowa sekcje changelogu z nowym numerem wersji.
Przy zmianie frontendu warto tez aktualizowac query string wersji przy `src/main.js` w `index.html`, zeby deploy nie zostawial starego cache JS.
Badge wersji jest odporniejszy na cache, gdy `index.html` trzyma tez aktualne `data-version`.
