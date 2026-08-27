# Zakłócenia pod wskaźnikiem — projekt

Data: 2026-08-27

## Cel

Proza paragrafów zniekształca się **lokalnie, wokół wskaźnika**: w ograniczonym
promieniu litery falują, przesuwają się poziomymi pasmami i pokrywa je ziarno.
Siłę efektu gracz reguluje osobnym suwakiem w ustawieniach. Kliknięcie wypuszcza
z punktu uderzenia rozchodzący się pierścień silniejszego zniekształcenia.

## Stan wyjściowy i sprzeczność do rozstrzygnięcia

`src/ui/effects.js` prowadzi dziś kanał odwrotny do projektowanego: szum bazowy
rośnie ze spadkiem Poczytalności (`dreadLevel`), a wskaźnik go **zdejmuje** —
`amplitudeFor()` odejmuje 85% amplitudy w promieniu 220 px (stała `RELIEF`), z
klawiaturowym odpowiednikiem w `focusRelief`. To celowa furtka czytelności.

Decyzja: **ulga zostaje bez zmian**, a zakłócenia wskaźnika wchodzą jako
**druga, niezależna warstwa**. Dwa kanały nie dzielą ani suwaka, ani promienia,
ani pętli, ani filtra. `effects.js` nie jest modyfikowany.

Druga przeszkoda: `data-effect="static"` — jedyny dzisiejszy nośnik filtra —
siedzi wyłącznie na znacznikach `[horror]`, `[radio]`, `[wrong]`
(`src/ui/voices.js`), czyli na ułamku prozy. Docelowa powierzchnia (cały tekst
paragrafu) wymaga nowego mechanizmu.

## Zakres

- Działa na: akapitach `<p>` prozy wewnątrz `.journal-entry`.
- Nie działa na: przyciskach wyborów, bramkach `RZUĆ:`, kostkach, nagłówkach
  „PARAGRAF *n*". Klikalne i orientacyjne elementy zostają czytelne, a klon nie
  duplikuje elementów interaktywnych.

## Architektura

Nowy moduł `src/ui/pointer-static.js`. Jedna odpowiedzialność: lokalne
zniekształcenie prozy wokół wskaźnika. Wzorem `effects.js` moduł rozdziela
logikę czystą od sterowania DOM-em.

Funkcje czyste (testowalne pod Node, bez DOM):

- `discFalloff(distancePx, radiusPx)` → 0–1
- `waveAt(timeMs, wave)` → `{ radius, gain } | null` (null po wygaśnięciu)
- `staticScale({ strength, reducedMotion, wave })` → px przemieszczenia
- `discMask({ x, y, radius, wave, invert })` → wartość `mask-image` wraz z
  właściwym `mask-composite`

Fabryka `createPointerStatic({ root, doc })` zwraca obiekt z metodami
`syncEntry(entry)`, `dropAll()`, `recompute()`, `destroy()` — kształt zbieżny z
`createEffects`, żeby wiązanie w `main.js` wyglądało znajomo. Brak DOM lub brak
`requestAnimationFrame` daje instancję no-op, tak jak w `effects.js`.

## Warstwy: klon widmowy i dopełniające się maski

Każdy `.journal-entry` w widoku dostaje jedną nakładkę:

```
<div class="static-ghost" aria-hidden="true" inert>  <!-- position: absolute; inset: 0; pointer-events: none -->
  …pełny klon wpisu…
</div>
```

Wpis staje się `position: relative`. W klonie wszystko poza `<p>` prozy dostaje
`visibility: hidden` — piksele znikają, układ zostaje. Zawijanie wierszy zgadza
się co do piksela, bo to ta sama treść, ta sama szerokość i ten sam CSS.

Klon jest zniekształcony filtrem i przycięty **maską dysku** wokół wskaźnika.
Oryginalne `<p>` prozy dostają **maskę odwrotną**, żeby nie było zjawy —
podwójnych liter, gdzie czysty oryginał przeświecałby pod przesuniętym klonem.
Maski się dopełniają:

- klon: dysk ∪ pierścień → `mask-composite: add`
- oryginał: `¬(dysk ∪ pierścień) = ¬dysk ∩ ¬pierścień` → `mask-composite: intersect`
  na dwóch odwróconych gradientach

Ta sama liczba stopni w gradiencie po obu stronach daje sumę alfy równą 1 także
na miękkiej krawędzi. W dysku widać wyłącznie zniekształcony klon, poza nim
wyłącznie czysty oryginał.

Dysk i fala mają różne środki (bieżąca pozycja wskaźnika vs punkt kliknięcia),
więc to dwie warstwy maski, nie jeden gradient.

Współrzędne gradientu są liczone względem prostokąta maskowanego elementu.
Maska dysku siedzi na kontenerze `.static-ghost` (jeden pomiar na wpis), maska
odwrotna na każdym `<p>` prozy (pomiar na akapit). Oba przeliczają te same
współrzędne ekranowe, więc geometria zgadza się niezależnie od poziomu
zagnieżdżenia.

### Kiedy `mask-composite` nie działa

`mask-composite: add`/`intersect` wymaga nowoczesnej przeglądarki. Przy braku
wsparcia (sprawdzane raz przez `CSS.supports`) moduł schodzi na wariant
jednowarstwowy: w trakcie fali maska pierścienia **zastępuje** maskę dysku
zamiast się z nią sumować. Efekt zostaje, traci tylko nakładanie się obu
obszarów.

## Synchronizacja klonu

Tu jest cały koszt, więc klon przebudowuje się wyłącznie w punktach, gdzie DOM
wpisu naprawdę się zmienił:

1. akapit skończył się wypisywać,
2. dołożone kostki albo przyciski wyborów,
3. wpis przerysowany w całości (zmiana języka, wznowienie zapisu).

Akapit **aktualnie wypisywany** jest z efektu wyłączony: `reveal.js` przepisuje
jego węzły tekstowe co klatkę (`applyVisible`), klon nie miałby szans nadążyć.
W praktyce znaczy to, że podczas pisania wskaźnik nie działa na najświeższy
akapit — świadomie przyjęty koszt.

`reveal.js` dostaje jeden nowy hook: `session.onParagraphDone?.(paragraph)`
wywoływany w `finishTyping()`, tuż po `dropVeils(scan)`. Istniejący
`onParagraph` sygnalizuje wejście akapitu na scenę, a nie domknięcie, więc nie
nadaje się do tego celu.

Zmiana rozmiaru okna nie wymaga przebudowy: klon to ten sam HTML w tej samej
szerokości, więc przepływa razem z oryginałem.

## Filtr SVG

Jeden filtr `#pointer-static` w `index.html`. Kubełki jak w `effects.js` są
zbędne, bo wszystkie klony są zniekształcone jednakowo — lokalizację robi
maska, nie amplituda. Atrybuty przepisuje pętla rAF nowego modułu.

Łańcuch:

1. **falowanie liter** — `feTurbulence` fractalNoise (drobna) →
   `feDisplacementMap` na obu osiach, do ~3,5 px przy sile 1
2. **cięcia poziome** — `feTurbulence` z `baseFrequency="0.001 0.08"`
   (zmienność praktycznie tylko po Y) → `feDisplacementMap` na samym X: pasma
   przesuwają się w bok, zerwany tracking VHS, do ~6 px
3. **ziarno** — `feTurbulence` wysokoczęstotliwościowa → `feColorMatrix`
   (odbarwienie, podbicie kontrastu) → `feComposite operator="in"` z
   `SourceAlpha`, więc śnieg siada na literach, nie na całym prostokącie →
   `feBlend mode="screen"`
4. **rozszczepienie barwne** — poza filtrem, przez `text-shadow` czerwony/cyan
   na `.static-ghost p`, sterowany zmienną CSS tak jak dzisiejsze `--glitch`

Pełzanie szumu (skokowe `seed`, falująca `baseFrequency`) idzie wzorem
`crawlAt` z `effects.js`, ale z własnymi stałymi — kanały pozostają rozdzielne.

Fala nie ma własnego filtra ani drugiej warstwy klonu: na czas jej życia pętla
podbija globalnie `scale`, a *gdzie* to widać, rozstrzyga maska pierścienia.
Skutek uboczny: w trakcie fali dysk pod wskaźnikiem też jest silniejszy. To
czyta się jako uderzenie w taśmę i zostaje przyjęte świadomie.

## Wartości startowe

| Parametr | Wartość |
| --- | --- |
| promień dysku | 140 px, twardy rdzeń do 40% promienia, dalej miękka krawędź |
| przemieszczenie liter przy sile 1 | 3,5 px |
| przesunięcie pasm przy sile 1 | 6 px |
| krycie ziarna przy sile 1 | 0,35 |
| prędkość fali | 1,6 px/ms |
| życie fali | 520 ms (~830 px zasięgu) |
| grubość pierścienia | 120 px |
| wzmocnienie w środku pierścienia | 2,4×, gasnące liniowo z promieniem |
| liczba fal naraz | 1 — nowe kliknięcie zastępuje poprzednią |

## Wyzwalanie

- **Dysk**: `pointermove` w obszarze dziennika, wskaźnik inny niż dotykowy.
  `pointerleave` zdejmuje dysk.
- **Fala**: każdy `pointerdown` w obszarze dziennika — tło, opcja wyboru,
  bramka rzutu. Kliknięcie zawsze uderza w taśmę.
- **Dotyk**: brak stałego dysku (nie ma czego śledzić), sam pierścień z punktu
  dotknięcia.

## Ustawienia

Nowy klucz `pointerStatic`, zakres 0–1, domyślnie **0,5**:

- `src/ui/settings.js`: `DEFAULTS`, `NUMERIC_RANGES`, `applyToDocument` →
  `--pointer-static`
- `index.html`: suwak `#set-pointer-static` z etykietą `#label-pointer-static`
  w panelu ustawień, obok „Efekty tekstu"
- `src/ui/main.js`: wpis w słownikach pl/en („Zakłócenia kursora" / „Cursor
  interference"), wpis w mapie kontrolek, subskrypcja budząca `recompute()`

## Wygaszenie

Twarde i całkowite. Przy `prefers-reduced-motion: reduce` **albo** suwaku na 0:
klony nie powstają, pętla rAF nie startuje, maski nie są zakładane, a już
założone są zdejmowane. Zero kosztu, gdy efekt jest wyłączony. Zmiana
ustawienia systemowego w locie budzi pętlę, wzorem `onMotionChange` z
`effects.js`.

## Dostępność

- Klon: `aria-hidden="true"` i `inert` — nie czyta go czytnik ekranu, nie da
  się w niego wejść klawiaturą, nie łapie zdarzeń wskaźnika
  (`pointer-events: none`).
- Treść oryginału pozostaje nienaruszona: klon jest kopią, nikt nie przepisuje
  `textContent` dziennika.
- Maska odwrotna nie wpływa na trafianie w elementy (`mask` nie dotyka
  hit-testingu), a i tak nie jest zakładana na nic klikalnego.
- Ulga czytelności z `effects.js` — pod wskaźnikiem i pod ogniskiem
  klawiatury — działa dalej bez zmian.

## Testy

Nowy `test/pointer-static.test.js` pod `node --test`, na funkcjach czystych:

- `discFalloff`: 1 w środku, 0 na promieniu i dalej, monotoniczność, odporność
  na wejścia niebędące liczbami
- `waveAt`: koperta pierścienia, wzmocnienie gasnące z promieniem, `null` po
  `WAVE_LIFE_MS`, `null` dla czasu przed startem
- `staticScale`: 0 przy sile 0, 0 przy `reducedMotion`, liniowość w sile,
  podbicie w trakcie fali
- `discMask`: obecność obu warstw, poprawny `mask-composite` dla obu
  wariantów, dopełnianie się stopni gradientu przy `invert`

Rozszerzenia istniejących zestawów:

- `test/settings.test.js`: nowy klucz — domyślna wartość, obcinanie do zakresu,
  odrzucanie śmieci, zapis do `localStorage`
- `test/style.test.js`: reguły `.static-ghost`
- `test/ui.test.js`: obecność filtra `#pointer-static` i suwaka
  `#set-pointer-static` w `index.html`
- `test/reveal.test.js`: `onParagraphDone` wywołane raz po domknięciu akapitu

## Pliki

| Plik | Zmiana |
| --- | --- |
| `src/ui/pointer-static.js` | nowy |
| `test/pointer-static.test.js` | nowy |
| `index.html` | filtr `#pointer-static`, suwak ustawień |
| `style.css` | `.static-ghost`, `.journal-entry { position: relative }`, `text-shadow` rozszczepienia |
| `src/ui/settings.js` | klucz `pointerStatic` |
| `src/ui/main.js` | instancja modułu, etykiety, wiązanie suwaka, wywołania `syncEntry`/`dropAll` |
| `src/ui/reveal.js` | hook `onParagraphDone` w `finishTyping()` |
| `README.md` | akapit o nowym efekcie i suwaku |

## Poza zakresem

- Zmiany w `effects.js` i w semantyce ulgi pod wskaźnikiem.
- Efekt kursora na elementach interaktywnych.
- Więcej niż jedna fala jednocześnie.
- Osobna, silniejsza warstwa filtra wyłącznie dla pierścienia — do rozważenia
  później, gdy jednowarstwowe wzmocnienie okaże się za słabe.
