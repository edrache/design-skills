# Warstwa stylu tekstu — dialogi, opisy, groza

Data: 2026-08-24
Gałąź: `game/alone-against-the-static`
Katalog docelowy: `AloneAgainstTheStatic/`
Poprzedni spec: [`2026-08-23-alone-against-the-static-design.md`](2026-08-23-alone-against-the-static-design.md)

## Cel

Tekst gry jest dziś jednolitą prozą: `journal.js` renderuje każdy akapit jako
`<p>` z surowym `textContent`. Dialogi giną w opisie, groza czyta się tak samo
jak jazda samochodem, a wszystkie postacie brzmią wizualnie identycznie.

Wprowadzamy warstwę stylu: autor znakuje fragmenty tekstu jawnymi znacznikami,
a renderer nadaje im wygląd i efekty. Każda mówiąca postać ma własną barwę,
groza ma własny rejestr typograficzny, opis narracyjny pozostaje spokojną bazą.
Efekty ruchu są sterowane Poczytalnością postaci i reagują na wskaźnik myszy
lub palec.

**Czytelność jest warunkiem nadrzędnym, a treść pozostaje niezmienna** — to nie
jest hasło, tylko testowany inwariant (patrz „Niezmienność treści").

## Decyzje

| Rzecz | Wybór |
|---|---|
| Źródło informacji o stylu | ręczne znaczniki w plikach tekstowych, nie autodetekcja |
| Forma znacznika | parzysty, w stylu BBCode: `[horror]…[/horror]` |
| Nazewnictwo | angielskie, płaskie nazwy |
| Natężenie | mocne, ale reaktywne na stan gry — na starcie prawie czysty druk |
| Nośnik ruchu | filtr SVG `feDisplacementMap`, bez dzielenia tekstu na węzły |
| Opis narracyjny | bez znacznika — jest domyślny |
| Rozszerzalność | nowy efekt = wpis w rejestrze + reguła CSS |

## Architektura

Cztery moduły, wpięte w istniejący przepływ bez zmiany silnika. `src/engine/`
nie jest ruszany — styl to wyłącznie sprawa warstwy UI.

### `src/ui/markup.js`

Czysty parser, bez dostępu do DOM, testowalny w `node --test` bez środowiska
przeglądarki.

```js
parseMarkup("[charlie]„Cholera!”[/charlie] — warczy Charlie.")
// [
//   { type: "tag", name: "charlie", children: [{ type: "text", value: "„Cholera!”" }] },
//   { type: "text", value: " — warczy Charlie." },
// ]
```

Reguły:

- Znaczniki zagnieżdżają się dowolnie głęboko.
- `[[` to literalny znak `[`. Innego escapowania nie ma.
- Nieznana nazwa znacznika → węzeł zachowany w drzewie z `known: false`;
  renderer wypisuje jego zawartość bez opakowania. Gra działa dalej.
- Niedomknięty lub źle zagnieżdżony znacznik → cała sekwencja traktowana jak
  zwykły tekst, razem z nawiasami. Gracz zobaczy `[horror]`, autor zobaczy
  błąd w walidatorze.
- Tekst bez znaczników przechodzi jako pojedynczy węzeł `text` bez zmian.

### `src/ui/voices.js`

Rejestr — jedyne miejsce, które edytujesz, dodając efekt.

```js
export const TAGS = {
  charlie: { kind: "voice", className: "v-charlie" },
  horror:  { kind: "tone",  className: "t-horror", effect: "static" },
  // …
};
```

Pola: `kind` (`voice` albo `tone`), `className` (klasa CSS), `effect`
(opcjonalna nazwa zachowania JS z `effects.js`). Brak `effect` znaczy: sam CSS,
zero kosztu w czasie działania.

### `src/ui/effects.js`

Warstwa zachowań. Jedna instancja na dokument, tworzona raz w `main.js`.

- Jeden nasłuch `pointermove` / `pointerdown` na `#journal`, throttled do
  jednej aktualizacji na `requestAnimationFrame`. Zapisuje `--px` i `--py`
  (0–1 względem kontenera).
- Jeden `IntersectionObserver` — elementy z `effect` poza widokiem są
  wypisywane z pętli i mają zdejmowany filtr.
- Jeden filtr SVG w `index.html`: `feTurbulence` + `feDisplacementMap`,
  z `baseFrequency` i `scale` sterowanymi ze skryptu.
- Brak timerów per element. Brak `setInterval`. Jedna pętla `rAF`, aktywna
  tylko gdy jakikolwiek element wymaga animacji.

### Wpięcie

- `journal.js`, `appendEvent()`: dla `event.kind === "text"` zamiast
  `el(doc, "p", null, i18n.t(event.key))` wywołanie
  `renderMarkup(doc, parseMarkup(i18n.t(event.key)))`, zwracające gotowe `<p>`.
  Węzły budowane wyłącznie przez `createElement` / `createTextNode` —
  `innerHTML` nie pojawia się nigdzie.
- `main.js`, po każdym `renderCharacterSheet()`: ustawienie `--dread` na
  `document.documentElement` na `1 - frame.state.san / frame.state.startingSan`,
  przycięte do zakresu 0–1 (patrz „`--dread`").
- `main.js`, `bootstrap()`: utworzenie instancji `effects` i podpięcie jej pod
  `#journal`.

### Niezmienność treści

Twardy warunek: `textContent` wyrenderowanego akapitu równa się tekstowi
źródłowemu po usunięciu znaczników — znak w znak. Żaden efekt nie podmienia,
nie usuwa i nie dokłada znaków. Cała dynamika to CSS na opakowujących
`<span>`-ach oraz filtr SVG, który zniekształca rendering, nie dane.

Konsekwencje, dla których to robimy: zaznaczanie i kopiowanie działa, czytnik
ekranu czyta tekst bez śmieci, a `text-transform: uppercase` przy `[shout]`
zmienia wygląd, nie zawartość.

Ten warunek ma własny test przechodzący przez **wszystkie** klucze w obu
plikach tekstowych, więc obejmuje też to, co dopiszesz później.

## Słownik znaczników

Kategoria `voice` — kto mówi:

| Znacznik | Znaczenie |
|---|---|
| `[charlie]` `[alex]` `[mark]` `[julie]` `[tom]` | nazwane postacie |
| `[you]` | kwestia bohatera |
| `[voice]` | mówca nieznany lub nienazwany |

Kategoria `tone` — jak brzmi:

| Znacznik | Znaczenie |
|---|---|
| `[horror]` | groza |
| `[whisper]` | cicho, ledwo słyszalne |
| `[shout]` | krzyk |
| `[thought]` | myśl bohatera |
| `[radio]` | głos z radia lub taśmy |
| `[sign]` | napis, notatka, tabliczka |
| `[wrong]` | coś jest nie tak — najsubtelniejszy z całego zestawu |

Zagnieżdżanie jest zamierzonym sposobem użycia:

```
[charlie]„Nie słyszałeś tego?” [horror]Głos mu się łamie w połowie zdania.[/horror][/charlie]
```

Opis narracyjny nie ma znacznika. Nie tagujesz całego tekstu, tylko odstępstwa
od prozy — dzięki temu proza pozostaje tłem, wobec którego reszta się odcina.

## Język wizualny

### Barwy głosów

Wszystkie w istniejącej gamie oklch pliku `style.css`, jasność 76–78 %, czyli
kontrast AA na `--void` również po nałożeniu blura.

| Głos | Token | Wartość |
|---|---|---|
| Charlie | `--voice-charlie` | `oklch(78% 0.07 62)` — bursztyn |
| Alex | `--voice-alex` | `oklch(78% 0.07 205)` — zimny błękit |
| Mark | `--voice-mark` | `oklch(76% 0.06 300)` — przygaszony fiolet |
| Julie | `--voice-julie` | `oklch(78% 0.065 340)` — spłowiały róż |
| Tom | `--voice-tom` | `oklch(76% 0.055 145)` — fosforowa zieleń |
| `[voice]` | `--paper-dim` | istniejący token |
| `[you]` | `--paper` | **bez własnej barwy** |

Bohater zostaje neutralny celowo: to twój głos. Odróżnia go krój i wcięcie, nie
kolor. Dzięki temu barwna kwestia zawsze znaczy „mówi ktoś inny".

### Rytm strony

Jedna reguła odpowiada za większość zmiany wizualnej:

- Znacznik `voice` obejmujący **cały** akapit → układ blokowy: wcięcie,
  kreska 2 px w barwie postaci po lewej, nazwa nad kwestią kapitalikami
  w `--font-console`, stopień 0.6 rem.
- Znacznik `voice` **wewnątrz** akapitu → inline: barwa tekstu plus kropka
  w tej samej barwie przed otwierającym cudzysłowem.

Akapity będące czystym dialogiem czytają się jak scenariusz, mieszane jak
proza — naprzemiennie, bez dodatkowej pracy autora. To jest główne źródło
dynamiki, o którą chodzi w tym specu.

### Rejestry tonów

| Znacznik | Traktowanie |
|---|---|
| `[horror]` | dryf barwy ku `--rec-soft`, `letter-spacing: 0.04em`, rozszczepienie RGB przez `text-shadow`, filtr statyki |
| `[whisper]` | `font-size: 0.92em`, `--paper-dim`, `letter-spacing: 0.06em`, `opacity: 0.8` |
| `[shout]` | `--font-console`, ciasny kerning, `text-transform: uppercase` |
| `[thought]` | kursywa, `--phosphor`, bez cudzysłowów w stylu |
| `[radio]` | `--font-console`, stała statyka o niskiej amplitudzie |
| `[sign]` | `--font-console`, ramka, wrażenie odbicia |
| `[wrong]` | sam blur, bez zmiany barwy; widoczny dopiero przy wysokim `--dread` |

## Efekty

### Statyka bez dotykania tekstu

Jeden filtr SVG: `feTurbulence` → `feDisplacementMap`. Displacement zniekształca
każdą literę osobno, a DOM zostaje nietknięty. To daje „poruszenie liter"
i pływanie obrazu w stylu VHS bez dzielenia tekstu na węzły per znak — czyli
bez strat dla zaznaczania i czytnika ekranu.

Amplituda 0.5–1.5 px. Nigdy więcej: powyżej tego progu tekst przestaje być
czytelny, a to warunek nadrzędny.

### `--dread`

Jedna zmienna CSS na `<html>`, zakres 0–1, liczona jako
`1 - san / startingSan`. Mnoży amplitudę każdego efektu ruchu. Przy pełnej
Poczytalności strona jest praktycznie czystym drukiem; rozpad przychodzi wtedy,
gdy rozpada się postać.

### Kursor jako głowica

`pointermove` i `pointerdown` (obsługa myszy i dotyku tym samym zdarzeniem)
zapisują `--px` / `--py`. Efekty:

- Poziomy pas aberracji chromatycznej podąża za wskaźnikiem po bieżącym
  wpisie — jak błąd trackingu na taśmie.
- Fragmenty z `effect` wzmacniają się przy zbliżeniu wskaźnika. Dystans liczony
  wyłącznie dla elementów widocznych w oknie.

Na urządzeniach bez wskaźnika i bez dotyku efekt po prostu nie występuje.

### Glitch przy nowym wpisie

Jednorazowe, ~400 ms zaburzenie trackingu na świeżo dołożonym paragrafie,
odpalane w `advance()` razem z istniejącym `scrollIntoView`. Raz na wpis, więc
nie męczy przy godzinnej rozgrywce.

### Hamulce

- Nowy suwak **„Efekty tekstu"** (0–100) w oknie ustawień, obok istniejących
  linii skanowania. Obsługiwany przez `settings.js` tak samo jak pozostałe
  wartości, z zapisem w `localStorage`. Wartość 0 zostawia barwy i typografię,
  wyłącza cały ruch.
- `prefers-reduced-motion: reduce` zeruje amplitudę ruchu automatycznie,
  niezależnie od suwaka. Barwy i krój zostają.
- Przy amplitudzie zero atrybut `filter` jest **zdejmowany z elementu**, nie
  ustawiany na wartość neutralną. Zero kosztu renderowania.

## Walidacja

Rozszerzenie `tools/validate.mjs`, zgodnie z istniejącym podziałem na błędy
i ostrzeżenia:

| Sytuacja | Rodzaj |
|---|---|
| znacznik niedomknięty lub źle zagnieżdżony | **błąd** |
| nieznana nazwa znacznika | ostrzeżenie |
| różny zestaw znaczników dla tego samego klucza w PL i EN | ostrzeżenie |

Nieznany znacznik jest ostrzeżeniem świadomie: pozwala wpisać `[dream]`
w tekście, zanim powstanie jego implementacja.

Kontrola PL/EN łapie najczęstszy błąd tłumaczenia — znacznik zgubiony
przy przepisywaniu zdania.

## Testy

Nowy plik `test/markup.test.js`:

- zagnieżdżanie znaczników
- znacznik niedomknięty → tekst literalny
- nieznana nazwa → zawartość renderowana bez opakowania
- escapowanie `[[`
- tekst bez znaczników niezmieniony
- **inwariant niezmienności treści** przez wszystkie klucze `data/text.pl.json`
  i `data/text.en.json`: `textContent` po renderze równy źródłu bez znaczników

Rozszerzenie `test/ui.test.js` o render akapitu z dialogiem — sprawdzenie
klas CSS i tego, że powstają węzły elementów, a nie tekst z nawiasami.

## Migracja istniejących tekstów

Stan wyjściowy: 152 klucze, 120 akapitów, 81 z dialogiem. Docelowo scenariusz
ma 371 paragrafów, więc oznaczanie będzie pracą ciągłą, nie jednorazową.

Narzędzie `tools/tag-dialogue.mjs` — pomoc, nie automat:

- proponuje znaczniki `voice` na podstawie cudzysłowów i atrybucji
  („— warczy Charlie" → `[charlie]`)
- **wypisuje diff do zatwierdzenia**, nie pisze po plikach bez zgody
- znaczników `tone` nie zgaduje — `[horror]` i `[whisper]` to decyzja autorska

`tools/dev.html` dostaje kolumnę ze znacznikami użytymi w paragrafie, żeby
na jednym ekranie było widać miejsca bez oznaczeń.

## Poza zakresem

- Zmiany w `src/engine/` — silnik nie wie o stylu i nie ma wiedzieć.
- Osobne kroje pisma na postać. Dwa kroje w projekcie (`--font-prose`,
  `--font-console`) wystarczają; trzeci rozbiłby spójność VHS.
- Dzielenie tekstu na węzły per znak. Filtr SVG daje ten sam efekt bez kosztu
  dostępnościowego.
- Efekty dźwiękowe powiązane ze znacznikami. Warstwa audio istnieje
  i jest niezależna.
- Animacja pojawiania się tekstu litera po literze. Zmienia tempo czytania,
  a gra jest tekstowa.
