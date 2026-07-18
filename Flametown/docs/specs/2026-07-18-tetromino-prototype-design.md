# Flametown Tetromino Prototype — Design Doc (v0.1)

Bazuje na: [Flamecraft_Tetromino_City_Builder_MVP_v0.1.md](../Flamecraft_Tetromino_City_Builder_MVP_v0.1.md)

Ten dokument rozszerza MVP design o decyzje techniczne i UX niezbędne do zbudowania działającego prototypu w HTML/JS/canvas. Odpowiada na "otwarte pytania" z oryginalnego dokumentu tam, gdzie dotyczą one zakresu prototypu.

## 1. Cel prototypu

Grywalny prototyp w przeglądarce (vanilla JS, canvas, bez build stepu), realizujący core loop z dokumentu MVP: dostań klocek → obróć → wybierz miejsce → dołóż → powtórz — z naciskiem na przyjemny, satysfakcjonujący UI/UX oraz łatwe podmienianie placeholderów na docelowe grafiki.

## 2. Zakres (co jest, co nie jest, w prototypie)

Zakres MVP z oryginalnego dokumentu (sekcja 9) obowiązuje bez zmian: brak ekonomii, zdolności, ruchu postaci, działania sklepów, mechanik smoków, celu/zakończenia gry.

Dodatkowo w prototypie:
- Rozmiar siatki wybierany przez gracza przy "New Game" (pole liczbowe N, siatka N×N, domyślnie 256, zakres 16–512).
- Zapis stanu w `localStorage`, przycisk "New Game" (z potwierdzeniem) czyści zapis i generuje nowy świat.
- Tylko desktop (mysz + klawiatura) — brak wsparcia dotykowego/mobilnego w tym etapie.

## 3. Architektura i struktura plików

Pojedynczy canvas, `requestAnimationFrame`, viewport culling (renderujemy tylko widoczne komórki), natywne moduły ES (`<script type="module">`) — bez bundlera/frameworka, zero zależności npm.

```
Flametown/prototype/
  index.html
  config.js           – JITTER_AMOUNT=0.2, DEFAULT_GRID_SIZE=256, GRID_SIZE_MIN=16, GRID_SIZE_MAX=512,
                         CELL_SIZE, MAX_ASSET_VARIANTS, ROAD_RANDOM_CHANCE, SAVE_KEY='flametown-save-v1'
  src/
    main.js           – inicjalizacja, pętla gry
    state.js          – scentralizowany obiekt stanu + localStorage save/load + New Game
    grid.js           – logiczna siatka N x N, siatka wierzchołków (jitter), konwersje grid<->world<->screen
    camera.js         – pozycja/zoom kamery, pan/zoom, resize okna
    input.js          – mysz/klawiatura: PPM/TAB rotate, środkowy przycisk + WASD/strzałki pan, scroll zoom, klik postaw
    pieces.js         – definicje 7 tetromino + rotacje, losowanie klocka, walidacja legalności postawienia
    roads.js          – losowanie i dopasowanie krawędzi dróg na stykach
    elementCatalog.js – katalog typów elementów miasta: {id, weight, maxCount, emoji}
    assets.js         – loader assetów (probing wariantów obrazków po nazwie pliku, fallback na emoji)
    render.js         – rysowanie canvasu: siatka (jittered quads), elementy, drogi, duch klocka, animacje bounce-in
    ui.js             – panel boczny (podgląd klocka, New Game + pole rozmiaru siatki), feedback błędu
  assets/
    tiles/            – tu wrzucane są house_1.png, house_2.png, shop_bakery_1.png itd.
```

## 4. Model danych

**Siatka logiczna**: tablica 2D `N x N` komórek: `{ elementType: string|null, elementVariant: number|null, pieceId: number|null, roads: {N,E,S,W}: bool }`.

**Siatka wierzchołków (jitter)**: osobna tablica `(N+1) x (N+1)` punktów, współdzielonych przez sąsiednie komórki (gwarancja braku dziur w siatce mimo przesunięcia). Każdy wierzchołek = bazowa pozycja `(col*CELL_SIZE, row*CELL_SIZE)` + losowy offset `(dx, dy)` w zakresie `±JITTER_AMOUNT * CELL_SIZE` (domyślnie 20%), wygenerowany raz przy tworzeniu nowego świata i zapisany w stanie (nie zmienia się między sesjami). Wierzchołki na brzegu mapy przesuwane wyłącznie do wewnątrz, żeby granica świata pozostała prostokątna.

**Reguła rozdziału odpowiedzialności**: logika gry (przyleganie, zajętość, legalność ruchu) działa wyłącznie na indeksach `(row, col)`. Jitter wierzchołków jest czysto wizualną warstwą przy renderowaniu — nie wpływa na zasady.

**Renderowanie komórki**: komórka `(row, col)` to czworokąt z 4 sąsiednich wierzchołków. Tło i linie dróg rysowane jako ten czworokąt (canvas path). Grafika/emoji elementu rysowana niezniekształcona (bez warpu), wyśrodkowana w centroidzie czworokąta.

## 5. Kamera, responsywność, renderowanie

Canvas pełnoekranowy, skalowany do `window.innerWidth/innerHeight * devicePixelRatio`, z resize listenerem. UI panel jako HTML nad canvasem (position: fixed) — działa na dowolnej rozdzielczości okna desktopowego.

Kamera: `{x, y, zoom}` w world-space, start wycentrowana na środku mapy z zoomem pokazującym ok. 15x15 pól, zoom ograniczony do rozsądnego zakresu (np. 5x5 do 40x40 pól widocznych).

Sterowanie:
- scroll = zoom in/out
- środkowy przycisk myszy (drag) = pan
- strzałki / WASD = pan
- klik na klocek w panelu = "bierzesz" klocek, duch podąża za kursorem
- PPM lub TAB = obrót 90°
- klik na legalnym polu = postawienie; na nielegalnym = czerwona poświata na duchu klocka, klik ignorowany

Pętla `requestAnimationFrame`: 1) oblicz widoczne komórki (viewport culling), 2) narysuj je (tło+drogi+elementy), 3) narysuj ducha klocka jeśli aktywny, 4) narysuj aktywne animacje bounce-in.

**Animacja bounce-in**: przy postawieniu klocka każde z 4 pól dostaje losowe opóźnienie (0–150ms) i tween skali `0→1` z easing bounce-out (~250-300ms), zaimplementowany jako prosta funkcja easingu + `performance.now()` per pole, bez zewnętrznej biblioteki.

## 6. Klocki, zasady stawiania, drogi, elementy

**Tetromino**: pełny zestaw 7 (I, O, T, S, Z, J, L), każdy z 4 stanami rotacji wyliczonymi raz przy starcie.

**Losowanie**: jeden losowy kształt na raz (uniform z 7), bez podglądu kolejki.

**Zasada stawiania**: pierwszy klocek w grze — dowolne miejsce. Każdy kolejny musi mieć przynajmniej jedno pole stykające się krawędzią z już postawionym polem miasta. Walidacja przy każdej próbie: kolizja z zajętym polem, wyjście poza N×N, brak przylegania → nielegalne.

**Elementy miasta**: `elementCatalog.js` eksportuje listę `{id, weight, maxCount, emoji}`. Przy stawianiu, dla każdego z 4 pól niezależnie losujemy typ ważony przez `weight`, pomijając typy które osiągnęły `maxCount` w bieżącym mieście (licznik w stanie globalnym).

**Drogi**: dla każdej krawędzi każdego z 4 pól:
- jeśli krawędź styka się z już postawionym sąsiadem → przejmujemy stan drogi sąsiada (łączenie się na stykach)
- jeśli krawędź nie styka się z niczym postawionym → losujemy niezależnie (domyślnie `ROAD_RANDOM_CHANCE = 0.5`)

## 7. System assetów

**Konwencja nazw**: `assets/tiles/<typeId>_<n>.png`, `<typeId>` z `elementCatalog.js`, `<n>` od 1 (`house_1.png`, `house_2.png`, ...).

**Wykrywanie wariantów**: przy starcie gry loader próbuje sekwencyjnie załadować `..._1.png`, `..._2.png` itd. (przez `new Image()` + `onload`/`onerror`) aż natrafi na brak pliku lub osiągnie `MAX_ASSET_VARIANTS` (bezpiecznik, domyślnie 20). Wynik: mapa `typeId -> [obrazki]`. Dodanie nowej grafiki = wrzucenie pliku o właściwej nazwie, bez zmian w kodzie.

**Fallback**: brak wykrytych wariantów dla danego `typeId` → renderer rysuje `emoji` z katalogu.

**Losowanie wariantu**: przy przypisaniu typu do pola, jeśli są dostępne warianty graficzne, losujemy jeden i zapamiętujemy `elementVariant` w danych komórki (stabilne między re-renderami/reloadami).

## 8. UI i persystencja

**Panel UI**: HTML nad canvasem — podgląd aktualnego klocka (mini-widok 4 pól), krótka podpowiedź sterowania, przycisk **New Game**, pod nim pole liczbowe **N** (rozmiar nowej siatki, domyślnie 256, walidowane/clamped do 16–512).

**Zapis stanu**: po każdej zmianie miasta (postawienie klocka) cały stan (siatka komórek, siatka wierzchołków/jitter, liczniki maxCount, kamera, N) serializowany do `localStorage` pod kluczem `flametown-save-v1`. Start: jeśli klucz istnieje i parsuje się poprawnie — wczytujemy; inaczej generujemy nowy świat.

**New Game**: czyści zapis, z potwierdzeniem (`confirm()`), generuje nową siatkę wierzchołków (nowy jitter) i pustą siatkę komórek o rozmiarze z pola N.

## 9. Obsługa błędów

- Nielegalne postawienie → wizualny feedback (czerwona poświata), klik ignorowany, brak wyjątków.
- Brakujący/uszkodzony plik obrazka → cichy fallback na emoji.
- Uszkodzony/niekompatybilny zapis w localStorage → `try/catch` przy parsowaniu, w razie błędu ignorujemy zapis i startujemy nową grę.
- Nieprawidłowa wartość N (poza zakresem, nie-liczba) → clamp do 16–512.

## 10. Testowanie

- Ręczna weryfikacja w przeglądarce na każdym etapie budowy.
- Proste funkcje czyste do pokrycia: legalność postawienia klocka, rotacja tetromino, dopasowanie dróg, ważone losowanie z maxCount — pokryte lekkimi `console.assert` w osobnym `tests.js`, uruchamianym ręcznie w konsoli przeglądarki. Bez frameworka testowego, bez testów e2e na tym etapie.

## 11. Poza zakresem prototypu (świadomie)

Zgodnie z oryginalnym dokumentem MVP: rozwój, zdolności, ekonomia, punkty, cel gry, zakończenie, ruch postaci, działanie sklepów, mechaniki smoków. Dodatkowo: wsparcie dotykowe/mobilne, podgląd kolejki klocków, wybór spośród kilku klocków, live UI do strojenia jittera (jitter to stała w `config.js`).
