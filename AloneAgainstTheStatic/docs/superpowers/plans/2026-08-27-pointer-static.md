# Zakłócenia pod wskaźnikiem — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proza paragrafów zniekształca się lokalnie wokół wskaźnika (falowanie liter, poziome cięcia, ziarno), z regulacją siły w ustawieniach i rozchodzącym się pierścieniem po kliknięciu.

**Architecture:** Nowy moduł `src/ui/pointer-static.js` z funkcjami czystymi plus fabryką sterującą DOM-em. Nad każdym `.journal-entry` leży `aria-hidden inert` klon wpisu, zniekształcony jednym filtrem SVG i przycięty maską dysku wokół wskaźnika; oryginalne akapity prozy noszą maskę odwrotną, więc w dysku widać wyłącznie klon. Istniejący `effects.js` (szum z Poczytalności, ulga pod wskaźnikiem) zostaje nietknięty.

**Tech Stack:** Czyste moduły ES bez zależności i bez kroku budowania. Testy: `node --test test/*.test.js` (`npm test`). Fake DOM: `test/helpers/fake-dom.js`. CSS w jednym `style.css`, filtry SVG inline w `index.html`.

## Global Constraints

- Zero zależności, zero kroku budowania — czysty ES-moduł, jak reszta `src/ui/`.
- Komentarze, nazwy testów i teksty UI po polsku; teksty UI mają wersję pl **i** en.
- Każda nowa funkcja czysta musi być testowalna pod Node bez DOM — wzorem `amplitudeFor` z `src/ui/effects.js`.
- `src/ui/effects.js` NIE jest modyfikowany w żadnym zadaniu.
- Treść dziennika jest nienaruszalna: żadne zadanie nie przepisuje `textContent` oryginalnych węzłów. Klon jest kopią.
- Wygaszenie twarde: przy `prefers-reduced-motion: reduce` **albo** sile 0 klony nie powstają, pętla rAF nie startuje, maski są zdejmowane.
- Zakres efektu: wyłącznie `<p>` prozy wewnątrz `.journal-entry`. Nigdy przyciski, bramki `RZUĆ:`, kostki, nagłówki „PARAGRAF *n*".
- Nazwa klucza ustawień: `pointerStatic`. Zmienna CSS: `--pointer-static`. Zakres 0–1, domyślnie `0.5`.
- Nazwy w DOM: kontener klonu `.static-ghost`, filtr `#pointer-static`, suwak `#set-pointer-static`, etykieta `#label-pointer-static`.
- Wartości startowe efektu (stałe eksportowane z modułu): promień dysku 140 px, twardy rdzeń do 40% promienia, przemieszczenie liter 3,5 px, przesunięcie pasm 6 px, krycie ziarna 0,35, prędkość fali 1,6 px/ms, życie fali 520 ms, grubość pierścienia 120 px, wzmocnienie 2,4×.
- Jedna fala naraz — nowe kliknięcie zastępuje poprzednią.
- Commity po polsku, w trybie orzekającym, wzorem historii repo („Dodaje…", „Spisuje…", „Przywraca…").
- Wszystkie polecenia uruchamiane z katalogu `AloneAgainstTheStatic/`.

## Struktura plików

| Plik | Odpowiedzialność |
| --- | --- |
| `src/ui/pointer-static.js` | **nowy.** Funkcje czyste geometrii i siły efektu + fabryka `createPointerStatic` zarządzająca klonami, maskami, pętlą rAF i falą. |
| `test/pointer-static.test.js` | **nowy.** Testy funkcji czystych. |
| `src/ui/reveal.js` | +1 hook `onParagraphDone` w `finishTyping()`. |
| `src/ui/settings.js` | +klucz `pointerStatic` w `DEFAULTS`, `NUMERIC_RANGES`, `applyToDocument`. |
| `index.html` | +filtr `#pointer-static`, +suwak ustawień. |
| `style.css` | +`.static-ghost`, +`position: relative` na `.journal-entry`, +rozszczepienie barwne na klonie. |
| `src/ui/main.js` | +instancja modułu, etykiety pl/en, wiązanie suwaka, wywołania cyklu życia klonów. |
| `README.md` | +akapit o efekcie i suwaku. |

Podział na zadania: najpierw warstwy niezależne od siebie (ustawienia, hook w `reveal`, funkcje czyste modułu), potem prezentacja (filtr, CSS), na końcu spięcie w `main.js` i dokumentacja.

---

### Task 1: Klucz ustawień `pointerStatic`

**Files:**
- Modify: `src/ui/settings.js` (`DEFAULTS`, `NUMERIC_RANGES`, `applyToDocument`)
- Test: `test/settings.test.js`

**Interfaces:**
- Consumes: nic.
- Produces: `settings.values.pointerStatic` (number 0–1, domyślnie `0.5`); zmienna CSS `--pointer-static` ustawiana na `document.documentElement`.

- [ ] **Step 1: Napisz test, który nie przechodzi**

Dopisz na końcu `test/settings.test.js`:

```js
test("zakłócenia kursora startują na połowie siły", () => {
  defineGlobal("localStorage", memoryStorage());
  defineGlobal("document", fakeDocument());
  const settings = createSettings();
  assert.equal(settings.values.pointerStatic, 0.5);
});

test("siła zakłóceń kursora jest obcinana do zakresu 0–1", () => {
  defineGlobal("localStorage", memoryStorage({ pointerStatic: 4 }));
  defineGlobal("document", fakeDocument());
  assert.equal(createSettings().values.pointerStatic, 1);

  defineGlobal("localStorage", memoryStorage({ pointerStatic: -2 }));
  assert.equal(createSettings().values.pointerStatic, 0);
});

test("śmieci w sile zakłóceń kursora spadają na domyślną wartość", () => {
  defineGlobal("localStorage", memoryStorage({ pointerStatic: "mocno" }));
  defineGlobal("document", fakeDocument());
  assert.equal(createSettings().values.pointerStatic, 0.5);
});

test("siła zakłóceń kursora jedzie do dokumentu jako --pointer-static", () => {
  defineGlobal("localStorage", memoryStorage());
  const doc = fakeDocument();
  defineGlobal("document", doc);
  const settings = createSettings();
  settings.set("pointerStatic", 0.25);
  assert.equal(doc.properties.get("--pointer-static"), "0.25");
});
```

Zajrzyj do góry pliku: `defineGlobal`, `memoryStorage`, `fakeDocument` już tam są, a `fakeDocument()` zwraca obiekt z mapą `properties` — nie dopisuj ich drugi raz. Jeśli `afterEach` w tym pliku przywraca globalne `document`/`localStorage`, nic nie zmieniaj.

- [ ] **Step 2: Uruchom test i potwierdź porażkę**

Run: `node --test test/settings.test.js`
Expected: FAIL — `pointerStatic` jest `undefined`, więc pierwszy assert pada na `undefined !== 0.5`.

- [ ] **Step 3: Najmniejsza implementacja**

W `src/ui/settings.js`, w `DEFAULTS` po `textEffects: 0.6,` dopisz:

```js
  pointerStatic: 0.5,
```

W `NUMERIC_RANGES` po `textEffects: [0, 1],` dopisz:

```js
  pointerStatic: [0, 1],
```

W `applyToDocument`, po linii ustawiającej `--text-effects`, dopisz:

```js
    style.setProperty("--pointer-static", String(values.pointerStatic));
```

- [ ] **Step 4: Uruchom testy i potwierdź sukces**

Run: `node --test test/settings.test.js`
Expected: PASS, wszystkie testy pliku.

- [ ] **Step 5: Commit**

```bash
git add src/ui/settings.js test/settings.test.js
git commit -m "Dodaje ustawienie siły zakłóceń kursora"
```

---

### Task 2: Hook `onParagraphDone` w odsłanianiu

**Files:**
- Modify: `src/ui/reveal.js` (`finishTyping()`, lista pól sesji w `start()`)
- Test: `test/reveal.test.js`

**Interfaces:**
- Consumes: nic.
- Produces: `reveal.start(record, { onParagraphDone })` — callback wywoływany z jednym argumentem (element `<p>`, który właśnie skończył się wypisywać), dokładnie raz na akapit, po `dropVeils`.

Dlaczego nowy hook, a nie istniejący `onParagraph`: `onParagraph` sygnalizuje **wejście** akapitu na scenę (wywoływany przy `session.block`), nie domknięcie wypisywania. Klon DOM ma sens tylko po domknięciu.

- [ ] **Step 1: Napisz test, który nie przechodzi**

Dopisz na końcu `test/reveal.test.js`. Wzoruj się na istniejącej funkcji `setup(...)` w tym pliku — zwraca ona `{ doc, root, clock, i18n, reveal }` (sprawdź dokładny kształt i użyj go zgodnie z resztą pliku):

```js
test("domknięcie akapitu zgłasza się przez onParagraphDone dokładnie raz", () => {
  const { clock, i18n, reveal } = setup({ "e1.p1": "Krótko.", "e1.p2": "I jeszcze raz." });
  const done = [];

  reveal.start(
    {
      entryId: 1,
      originEntryId: null,
      events: [{ kind: "text", key: "e1.p1" }, { kind: "text", key: "e1.p2" }],
    },
    { i18n, onParagraphDone: (paragraph) => done.push(paragraph) },
  );

  clock.run();
  assert.equal(done.length, 1, "pierwszy akapit domknięty raz");
  assert.equal(done[0].tagName, "P");

  // Kliknięcie domyka bieżący akapit i odsłania następny.
  reveal.advance();
  clock.run();
  assert.equal(done.length, 2, "drugi akapit też się zgłasza");
  assert.notEqual(done[0], done[1], "to dwa różne akapity");
});
```

Jeśli publiczna metoda przejścia dalej nazywa się w `reveal.js` inaczej niż `advance()` (sprawdź obiekt zwracany przez `createReveal`), użyj tej właściwej nazwy — reszta testu zostaje bez zmian. Jeśli `clock` nie ma metody `run()`, użyj tej, którą stosują istniejące testy do przewinięcia czasu.

- [ ] **Step 2: Uruchom test i potwierdź porażkę**

Run: `node --test test/reveal.test.js`
Expected: FAIL — `done.length` równe 0, bo `onParagraphDone` nigdy nie jest wywoływany.

- [ ] **Step 3: Najmniejsza implementacja**

W `src/ui/reveal.js`, w funkcji `finishTyping()`, po `waitFor(paragraph);` dopisz:

```js
  // Klon widmowy (src/ui/pointer-static.js) można zbudować dopiero teraz:
  // do tej pory applyVisible przepisywał węzły tekstowe co klatkę.
  session.onParagraphDone?.(paragraph);
```

W `start(record, { i18n, media, handlers, seenBefore, onParagraph, onRoll, onComplete } = {})` dopisz `onParagraphDone` do listy rozpakowywanych pól, a w obiekcie `session = { … }` dopisz `onParagraphDone,` obok `onParagraph,`.

- [ ] **Step 4: Uruchom testy i potwierdź sukces**

Run: `node --test test/reveal.test.js`
Expected: PASS — cały plik, w tym istniejące testy `onParagraph`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/reveal.js test/reveal.test.js
git commit -m "Zgłasza domknięcie akapitu przez onParagraphDone"
```

---

### Task 3: Funkcje czyste modułu zakłóceń

**Files:**
- Create: `src/ui/pointer-static.js`
- Test: `test/pointer-static.test.js`

**Interfaces:**
- Consumes: nic (moduł nie importuje niczego).
- Produces — eksporty, na których opierają się Zadania 4–6:
  - stałe: `DISC_RADIUS_PX = 140`, `DISC_CORE = 0.4`, `LETTER_PX = 3.5`, `SLICE_PX = 6`, `GRAIN_OPACITY = 0.35`, `WAVE_SPEED_PX_MS = 1.6`, `WAVE_LIFE_MS = 520`, `WAVE_THICKNESS_PX = 120`, `WAVE_GAIN = 2.4`, `WAVE_REACH_PX` (wyliczone: `WAVE_SPEED_PX_MS * WAVE_LIFE_MS`)
  - `discFalloff(distancePx, radiusPx = DISC_RADIUS_PX) → number` 0–1
  - `waveAt(timeMs, wave) → { radius: number, gain: number } | null`, gdzie `wave` to `{ x, y, at }`
  - `staticScale({ strength = 0, reducedMotion = false, waveGain = 1 } = {}) → { letter: number, slice: number, grain: number }`
  - `discMask({ x = 0, y = 0, radius = DISC_RADIUS_PX, wave = null, invert = false } = {}) → { image: string, composite: string }`

- [ ] **Step 1: Napisz test, który nie przechodzi**

Utwórz `test/pointer-static.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  DISC_CORE, DISC_RADIUS_PX, GRAIN_OPACITY, LETTER_PX, SLICE_PX,
  WAVE_GAIN, WAVE_LIFE_MS, WAVE_REACH_PX, WAVE_SPEED_PX_MS, WAVE_THICKNESS_PX,
  discFalloff, discMask, staticScale, waveAt,
} from "../src/ui/pointer-static.js";

test("dysk trzyma pełną siłę w rdzeniu i gaśnie do zera na promieniu", () => {
  assert.equal(discFalloff(0), 1);
  assert.equal(discFalloff(DISC_RADIUS_PX * DISC_CORE), 1);
  assert.equal(discFalloff(DISC_RADIUS_PX), 0);
  assert.equal(discFalloff(DISC_RADIUS_PX * 3), 0);
});

test("dysk słabnie monotonicznie poza rdzeniem", () => {
  let previous = 1;
  for (let distance = DISC_RADIUS_PX * DISC_CORE; distance <= DISC_RADIUS_PX; distance += 5) {
    const current = discFalloff(distance);
    assert.ok(current <= previous, `siła rośnie na ${distance} px`);
    previous = current;
  }
});

test("dysk odporny na wejścia niebędące liczbami", () => {
  assert.equal(discFalloff(NaN), 0);
  assert.equal(discFalloff("blisko"), 0);
  assert.equal(discFalloff(-10), 1);
  assert.equal(discFalloff(50, 0), 0);
});

test("fala rozchodzi się z zadaną prędkością", () => {
  const wave = { x: 100, y: 200, at: 1000 };
  assert.equal(waveAt(1000, wave).radius, 0);
  assert.equal(waveAt(1100, wave).radius, 100 * WAVE_SPEED_PX_MS);
});

test("fala wzmacnia najmocniej na starcie i gaśnie z promieniem", () => {
  const wave = { x: 0, y: 0, at: 0 };
  assert.equal(waveAt(0, wave).gain, WAVE_GAIN);
  const later = waveAt(WAVE_LIFE_MS / 2, wave).gain;
  assert.ok(later > 1 && later < WAVE_GAIN, `wzmocnienie w połowie życia: ${later}`);
});

test("fala wygasa po WAVE_LIFE_MS i nie istnieje przed kliknięciem", () => {
  const wave = { x: 0, y: 0, at: 500 };
  assert.equal(waveAt(500 + WAVE_LIFE_MS, wave), null);
  assert.equal(waveAt(500 + WAVE_LIFE_MS + 1, wave), null);
  assert.equal(waveAt(400, wave), null);
  assert.equal(waveAt(500, null), null);
});

test("siła zero i reduced-motion zerują wszystkie trzy kanały", () => {
  for (const zeroed of [staticScale({ strength: 0 }), staticScale({ strength: 1, reducedMotion: true })]) {
    assert.deepEqual(zeroed, { letter: 0, slice: 0, grain: 0 });
  }
});

test("siła skaluje kanały liniowo do wartości szczytowych", () => {
  assert.deepEqual(staticScale({ strength: 1 }), { letter: LETTER_PX, slice: SLICE_PX, grain: GRAIN_OPACITY });
  const half = staticScale({ strength: 0.5 });
  assert.ok(Math.abs(half.letter - LETTER_PX / 2) < 1e-9);
  assert.ok(Math.abs(half.slice - SLICE_PX / 2) < 1e-9);
  assert.ok(Math.abs(half.grain - GRAIN_OPACITY / 2) < 1e-9);
});

test("wzmocnienie fali podbija przemieszczenie, ale nie wyprowadza ziarna poza jedynkę", () => {
  const boosted = staticScale({ strength: 1, waveGain: WAVE_GAIN });
  assert.ok(boosted.letter > LETTER_PX);
  assert.ok(boosted.slice > SLICE_PX);
  assert.ok(boosted.grain <= 1, "krycie ziarna to alfa — nie może przekroczyć 1");
});

test("maska klonu składa warstwę dysku i sumuje warstwy", () => {
  const { image, composite } = discMask({ x: 40, y: 60 });
  assert.match(image, /radial-gradient/);
  assert.match(image, /40px 60px/);
  assert.equal(composite, "add");
});

test("maska z falą ma dwie warstwy o różnych środkach", () => {
  const { image } = discMask({ x: 10, y: 20, wave: { radius: 300, gain: 2, x: 500, y: 400 } });
  const layers = image.split("radial-gradient").length - 1;
  assert.equal(layers, 2, "dysk pod wskaźnikiem plus pierścień z punktu kliknięcia");
  assert.match(image, /10px 20px/);
  assert.match(image, /500px 400px/);
});

test("maska odwrotna przecina warstwy i ma dopełniające stopnie", () => {
  const direct = discMask({ x: 0, y: 0 });
  const inverse = discMask({ x: 0, y: 0, invert: true });
  assert.equal(inverse.composite, "intersect");
  // Te same progi procentowe po obu stronach — inaczej miękka krawędź
  // nie zsumuje alfy do jedynki i w obwódce dysku tekst zbladnie.
  const stops = (value) => value.match(/\d+(?:\.\d+)?%/g) ?? [];
  assert.deepEqual(stops(inverse.image), stops(direct.image));
  assert.notEqual(inverse.image, direct.image, "kolejność kolorów jest odwrócona");
});

test("grubość pierścienia i zasięg fali są spójne ze stałymi", () => {
  assert.equal(WAVE_REACH_PX, WAVE_SPEED_PX_MS * WAVE_LIFE_MS);
  assert.ok(WAVE_THICKNESS_PX > 0);
});
```

- [ ] **Step 2: Uruchom test i potwierdź porażkę**

Run: `node --test test/pointer-static.test.js`
Expected: FAIL — `Cannot find module .../src/ui/pointer-static.js`.

- [ ] **Step 3: Najmniejsza implementacja**

Utwórz `src/ui/pointer-static.js` z sekcją funkcji czystych. Fabryka `createPointerStatic` przychodzi w Zadaniu 6 — na razie sam ten kod:

```js
// Zakłócenia pod wskaźnikiem: drugi, niezależny kanał efektów tekstu.
// Kanał pierwszy (src/ui/effects.js) robi rzecz odwrotną — szum bazowy rośnie
// ze spadkiem Poczytalności, a wskaźnik go ZDEJMUJE. Ten moduł nie dotyka
// tamtego: własny suwak (--pointer-static), własny promień, własna pętla,
// własny filtr (#pointer-static).

export const DISC_RADIUS_PX = 140;
// Twardy rdzeń: do 40% promienia zniekształcenie jest pełne, dalej gaśnie.
// Bez rdzenia dysk czyta się jak plama, a nie jak dziura w taśmie.
export const DISC_CORE = 0.4;

export const LETTER_PX = 3.5;
export const SLICE_PX = 6;
export const GRAIN_OPACITY = 0.35;

export const WAVE_SPEED_PX_MS = 1.6;
export const WAVE_LIFE_MS = 520;
export const WAVE_THICKNESS_PX = 120;
export const WAVE_GAIN = 2.4;
export const WAVE_REACH_PX = WAVE_SPEED_PX_MS * WAVE_LIFE_MS;

const clamp01 = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
};

export function discFalloff(distancePx, radiusPx = DISC_RADIUS_PX) {
  const distance = Number(distancePx);
  const radius = Number(radiusPx);
  if (!Number.isFinite(distance) || !Number.isFinite(radius) || radius <= 0) return 0;
  if (distance <= radius * DISC_CORE) return 1;
  if (distance >= radius) return 0;
  const edge = (distance - radius * DISC_CORE) / (radius * (1 - DISC_CORE));
  return 1 - edge;
}

// Pierścień: promień rośnie liniowo w czasie, wzmocnienie gaśnie z promieniem.
// Zwraca null, gdy fali nie ma — to jedyny sygnał "nic nie rysuj".
export function waveAt(timeMs, wave) {
  const time = Number(timeMs);
  const at = Number(wave?.at);
  if (!Number.isFinite(time) || !Number.isFinite(at)) return null;
  const elapsed = time - at;
  if (elapsed < 0 || elapsed >= WAVE_LIFE_MS) return null;
  const radius = elapsed * WAVE_SPEED_PX_MS;
  const decay = 1 - elapsed / WAVE_LIFE_MS;
  return { radius, gain: 1 + (WAVE_GAIN - 1) * decay };
}

export function staticScale({ strength = 0, reducedMotion = false, waveGain = 1 } = {}) {
  if (reducedMotion) return { letter: 0, slice: 0, grain: 0 };
  const scale = clamp01(strength);
  if (scale === 0) return { letter: 0, slice: 0, grain: 0 };
  const gain = Number.isFinite(Number(waveGain)) ? Math.max(1, Number(waveGain)) : 1;
  return {
    letter: LETTER_PX * scale * gain,
    slice: SLICE_PX * scale * gain,
    // Ziarno to alfa, nie przemieszczenie — wzmocnienie fali nie może
    // wypchnąć jej poza jedynkę, bo dalej nic już się nie dzieje.
    grain: Math.min(1, GRAIN_OPACITY * scale * gain),
  };
}

// Stopnie gradientu są wspólne dla wersji prostej i odwróconej: suma alfy
// obu masek musi wynosić 1 także na miękkiej krawędzi, inaczej w obwódce
// dysku tekst blednie, zamiast przechodzić z oryginału w klon.
const CORE_STOP = `${(DISC_CORE * 100).toFixed(0)}%`;

function discLayer(x, y, radius, invert) {
  const inner = invert ? "transparent" : "#000";
  const outer = invert ? "#000" : "transparent";
  return `radial-gradient(circle ${radius}px at ${x}px ${y}px, ${inner} ${CORE_STOP}, ${outer} 100%)`;
}

// Pierścień: przezroczysty w środku, kryjący w obręczy, przezroczysty poza nią.
function ringLayer(x, y, radius, invert) {
  const band = invert ? "transparent" : "#000";
  const rest = invert ? "#000" : "transparent";
  const half = WAVE_THICKNESS_PX / 2;
  const from = Math.max(0, radius - half);
  const to = radius + half;
  return `radial-gradient(circle ${to}px at ${x}px ${y}px, ${rest} ${from}px, ${band} ${radius}px, ${rest} ${to}px)`;
}

export function discMask({ x = 0, y = 0, radius = DISC_RADIUS_PX, wave = null, invert = false } = {}) {
  const layers = [discLayer(Number(x) || 0, Number(y) || 0, Number(radius) || DISC_RADIUS_PX, invert)];
  if (wave) layers.push(ringLayer(Number(wave.x) || 0, Number(wave.y) || 0, Number(wave.radius) || 0, invert));
  // Klon pokazuje sumę obszarów, oryginał — dopełnienie tej sumy:
  // ¬(dysk ∪ pierścień) = ¬dysk ∩ ¬pierścień.
  return { image: layers.join(", "), composite: invert ? "intersect" : "add" };
}
```

- [ ] **Step 4: Uruchom testy i potwierdź sukces**

Run: `node --test test/pointer-static.test.js`
Expected: PASS, wszystkie testy pliku.

Jeśli test „maska odwrotna przecina warstwy i ma dopełniające stopnie" pada na porównaniu stopni: `ringLayer` używa progów w `px`, a `discLayer` w `%`. Wyrażenie `stops()` z testu wyłapuje tylko `%`, więc porównanie dotyczy warstwy dysku — nie „naprawiaj" tego zmianą jednostek w `ringLayer`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/pointer-static.js test/pointer-static.test.js
git commit -m "Dodaje geometrię i siłę zakłóceń pod wskaźnikiem"
```

---

### Task 4: Filtr SVG i suwak w `index.html`

**Files:**
- Modify: `index.html` (blok `<svg class="filter-defs">`, `<dialog id="settings-dialog">`)
- Test: `test/ui.test.js`

**Interfaces:**
- Consumes: nazwy z Global Constraints.
- Produces: filtr `#pointer-static` z węzłami, których atrybuty przepisuje pętla z Zadania 6 — `feTurbulence[result="letter-noise"]`, `feDisplacementMap[result="wobbled"]`, `feTurbulence[result="slice-noise"]`, `feDisplacementMap[result="sliced"]`, `feTurbulence[result="grain-noise"]`, `feComponentTransfer[result="grain"]`; suwak `#set-pointer-static` i etykieta `#label-pointer-static`.

- [ ] **Step 1: Napisz test, który nie przechodzi**

Dopisz na końcu `test/ui.test.js`. Plik nie czyta dziś `index.html`, więc dołóż import i stałą u góry pliku (obok pozostałych importów):

```js
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
```

a na końcu pliku testy:

```js
test("index.html ma filtr zakłóceń pod wskaźnikiem z trzema kanałami", () => {
  const match = html.match(/<filter id="pointer-static"[\s\S]*?<\/filter>/);
  assert.ok(match, "brak filtra #pointer-static");
  const filter = match[0];
  // Trzy kanały ze specyfikacji: falowanie liter, poziome cięcia, ziarno.
  for (const result of ["letter-noise", "wobbled", "slice-noise", "sliced", "grain-noise", "grain"]) {
    assert.match(filter, new RegExp(`result="${result}"`), `brak węzła result="${result}"`);
  }
  // Ziarno musi siadać na literach, nie na całym prostokącie akapitu.
  assert.match(filter, /operator="in"[^>]*|in2="SourceAlpha"/);
  // Cięcia przesuwają tylko w poziomie: kanał Y wskazuje na płaski składnik.
  assert.match(filter, /result="sliced"[\s\S]{0,200}|xChannelSelector="R"/);
});

test("index.html ma suwak siły zakłóceń kursora", () => {
  assert.match(html, /id="label-pointer-static"/);
  const input = html.match(/<input[^>]*id="set-pointer-static"[^>]*>/);
  assert.ok(input, "brak suwaka #set-pointer-static");
  assert.match(input[0], /type="range"/);
  assert.match(input[0], /min="0"/);
  assert.match(input[0], /max="1"/);
});
```

- [ ] **Step 2: Uruchom test i potwierdź porażkę**

Run: `node --test test/ui.test.js`
Expected: FAIL — „brak filtra #pointer-static".

- [ ] **Step 3: Najmniejsza implementacja**

W `index.html`, w bloku `<svg class="filter-defs">`, po ostatnim `vhs-static-3`, wstaw:

```html
      <!-- Zakłócenia pod wskaźnikiem (src/ui/pointer-static.js). Jeden filtr
           dla wszystkich klonów: lokalizację robi maska, nie amplituda.
           Wartości scale/seed/krycie przepisuje pętla rAF modułu. -->
      <filter id="pointer-static" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.8 0.5" numOctaves="2" seed="3" result="letter-noise" />
        <feDisplacementMap in="SourceGraphic" in2="letter-noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="wobbled" />
        <!-- Zmienność praktycznie tylko po Y: całe poziome pasma jadą w bok. -->
        <feTurbulence type="fractalNoise" baseFrequency="0.001 0.08" numOctaves="1" seed="11" result="slice-noise" />
        <feDisplacementMap in="wobbled" in2="slice-noise" scale="0" xChannelSelector="R" yChannelSelector="A" result="sliced" />
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="19" result="grain-noise" />
        <feComponentTransfer in="grain-noise" result="grain">
          <feFuncA type="linear" slope="0" intercept="0" />
        </feComponentTransfer>
        <!-- Śnieg siada wyłącznie na literach: przycięcie alfą źródła. -->
        <feComposite in="grain" in2="sliced" operator="in" result="grain-on-glyphs" />
        <feBlend in="sliced" in2="grain-on-glyphs" mode="screen" />
      </filter>
```

W `<dialog id="settings-dialog">`, po wierszu z `set-text-effects`, wstaw:

```html
          <label><span id="label-pointer-static">Zakłócenia kursora</span><input type="range" id="set-pointer-static" min="0" max="1" step="0.05" /></label>
```

- [ ] **Step 4: Uruchom testy i potwierdź sukces**

Run: `node --test test/ui.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html test/ui.test.js
git commit -m "Dodaje filtr i suwak zakłóceń pod wskaźnikiem"
```

---

### Task 5: Warstwa klonu w CSS

**Files:**
- Modify: `style.css`
- Test: `test/style.test.js`

**Interfaces:**
- Consumes: klasa `.static-ghost` i `--pointer-static` z Global Constraints.
- Produces: klasa `.static-ghost` gotowa do użycia przez fabrykę z Zadania 6; zmienne, które fabryka ustawia na kontenerze klonu: `--ghost-split` (px rozszczepienia barwnego), `--ghost-grain` (krycie ziarna, dziś tylko dokumentacyjnie), oraz `mask-image` / `mask-composite` pisane bezpośrednio w `element.style`.

- [ ] **Step 1: Napisz test, który nie przechodzi**

Dopisz na końcu `test/style.test.js` (funkcja pomocnicza `rule(selector)` jest już w tym pliku — użyj jej, nie duplikuj):

```js
test("klon widmowy leży nad wpisem, nie łapie zdarzeń i nie zmienia układu", () => {
  const ghost = rule(".static-ghost");
  assert.ok(ghost, "brak reguły .static-ghost");
  assert.match(ghost, /position:\s*absolute/);
  assert.match(ghost, /inset:\s*0/);
  // Klon nie może przechwytywać kliknięć — pod nim są wybory i bramka rzutu.
  assert.match(ghost, /pointer-events:\s*none/);
  assert.match(ghost, /filter:\s*url\(#pointer-static\)/);
});

test("wpis dziennika jest kontekstem pozycjonowania dla klonu", () => {
  const entry = rule(".journal-entry");
  assert.ok(entry, "brak reguły .journal-entry");
  assert.match(entry, /position:\s*relative/);
});

test("w klonie widać wyłącznie prozę", () => {
  // Wszystko poza akapitami prozy jest ukryte przez visibility, nie display:
  // układ musi zostać identyczny z oryginałem, inaczej wiersze się rozjadą.
  const hidden = rule(".static-ghost .journal-entry > *:not(p)");
  assert.ok(hidden, "brak reguły ukrywającej niebędące prozą elementy klonu");
  assert.match(hidden, /visibility:\s*hidden/);
});

test("rozszczepienie barwne na klonie jest sterowane zmienną", () => {
  const prose = rule(".static-ghost p");
  assert.ok(prose, "brak reguły .static-ghost p");
  assert.match(prose, /text-shadow:[\s\S]*var\(--ghost-split/);
});

test("reduced-motion gasi klon widmowy", () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*\.static-ghost\s*\{[^}]*display:\s*none/);
});
```

- [ ] **Step 2: Uruchom test i potwierdź porażkę**

Run: `node --test test/style.test.js`
Expected: FAIL — „brak reguły .static-ghost".

- [ ] **Step 3: Najmniejsza implementacja**

W `style.css`, obok istniejących reguł `[data-effect="static"]` (sekcja efektów taśmy), dopisz:

```css
/* Klon widmowy: kopia wpisu leżąca nad oryginałem, zniekształcona filtrem
   i przycięta maską dysku wokół wskaźnika (src/ui/pointer-static.js).
   Oryginalne akapity prozy noszą maskę odwrotną, więc w dysku widać
   wyłącznie klon — bez zjawy podwójnych liter. */
.journal-entry {
  position: relative;
}

.static-ghost {
  position: absolute;
  inset: 0;
  pointer-events: none;
  filter: url(#pointer-static);
  --ghost-split: 0;
  --ghost-grain: 0;
}

/* Układ klonu MUSI być identyczny z oryginałem, więc niebędące prozą
   elementy gasimy widocznością, nie wyrzucamy z układu. */
.static-ghost .journal-entry > *:not(p) {
  visibility: hidden;
}

.static-ghost p {
  text-shadow:
    calc(var(--ghost-split) * -1px) 0 oklch(60% 0.14 20 / 0.5),
    calc(var(--ghost-split) * 1px) 0 oklch(65% 0.1 200 / 0.45);
}
```

W istniejącym bloku `@media (prefers-reduced-motion: reduce)` dopisz:

```css
  .static-ghost { display: none; }
```

Jeśli `.journal-entry` ma już regułę w `style.css`, dopisz `position: relative;` do niej, zamiast tworzyć drugą — test szuka pierwszej reguły dla tego selektora, więc duplikat może go oszukać albo nie, zależnie od kolejności.

- [ ] **Step 4: Uruchom testy i potwierdź sukces**

Run: `node --test test/style.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add style.css test/style.test.js
git commit -m "Dodaje warstwę klonu widmowego w stylach"
```

---

### Task 6: Fabryka `createPointerStatic`

**Files:**
- Modify: `src/ui/pointer-static.js` (dopisanie fabryki pod funkcjami czystymi)
- Test: `test/pointer-static.test.js` (dopisanie testów fabryki)

**Interfaces:**
- Consumes: funkcje czyste i stałe z Zadania 3; filtr `#pointer-static` z Zadania 4; klasa `.static-ghost` z Zadania 5.
- Produces: `createPointerStatic({ root, doc, matchMedia }) → { syncEntry(entry), dropEntry(entry), dropAll(), recompute(), destroy() }`. Brak `root`, brak `doc` lub brak `requestAnimationFrame` daje instancję no-op o tym samym kształcie (wzorem `createEffects`).

Zachowanie:
- Siłę czyta z `--pointer-static` na `documentElement` (wzorem `readNumber` z `effects.js`).
- Siła 0 lub `prefers-reduced-motion` → `dropAll()`, pętla nie startuje.
- `pointermove` (wskaźnik inny niż dotykowy) ustawia pozycję dysku; `pointerleave` ją zdejmuje.
- `pointerdown` (dowolny, także dotyk) zapisuje falę `{ x, y, at }`, nadpisując poprzednią.
- Na klatce: dla każdego wpisu z klonem liczy współrzędne lokalne, pisze `mask-image`/`mask-composite` na kontenerze klonu (wariant prosty) i na każdym `<p>` prozy oryginału (wariant odwrócony); przepisuje `scale`/`seed` w filtrze i `--ghost-split` na klonie.
- Pętla podtrzymuje się, dopóki jest fala albo widoczny dysk; gaśnie sama.

- [ ] **Step 1: Napisz test, który nie przechodzi**

Dopisz na końcu `test/pointer-static.test.js`. Fabryka jest sterowana DOM-em, więc test pilnuje tylko kontraktu, który da się sprawdzić bez prawdziwej przeglądarki — kształtu no-op i twardego wygaszenia:

```js
import { createPointerStatic } from "../src/ui/pointer-static.js";

test("brak DOM daje instancję no-op o pełnym kształcie", () => {
  const noop = createPointerStatic({ root: null });
  for (const name of ["syncEntry", "dropEntry", "dropAll", "recompute", "destroy"]) {
    assert.equal(typeof noop[name], "function", `no-op nie ma metody ${name}`);
  }
  // Żadne wywołanie nie może rzucić — main.js woła je bezwarunkowo.
  noop.syncEntry({});
  noop.dropEntry({});
  noop.dropAll();
  noop.recompute();
  noop.destroy();
});
```

Dopisz też import `createPointerStatic` do istniejącej listy importów z tego modułu na górze pliku, zamiast drugiej instrukcji `import`.

- [ ] **Step 2: Uruchom test i potwierdź porażkę**

Run: `node --test test/pointer-static.test.js`
Expected: FAIL — `createPointerStatic is not a function`.

- [ ] **Step 3: Najmniejsza implementacja**

Dopisz na końcu `src/ui/pointer-static.js`:

```js
function readNumber(doc, name) {
  try {
    const raw = doc.defaultView?.getComputedStyle(doc.documentElement).getPropertyValue(name);
    return Number(raw) || 0;
  } catch {
    return 0;
  }
}

// `mask-composite` jest warunkiem sumowania dysku z pierścieniem. Gdy go nie
// ma, pierścień ZASTĘPUJE dysk na czas fali — efekt zostaje, traci tylko
// nakładanie się obu obszarów.
function supportsComposite() {
  try {
    return Boolean(globalThis.CSS?.supports?.("mask-composite", "add"));
  } catch {
    return false;
  }
}

function writeMask(element, { image, composite }) {
  const { style } = element;
  style.setProperty("mask-image", image);
  style.setProperty("-webkit-mask-image", image);
  style.setProperty("mask-composite", composite);
}

function clearMask(element) {
  for (const property of ["mask-image", "-webkit-mask-image", "mask-composite"]) {
    element.style.removeProperty(property);
  }
}

export function createPointerStatic({ root, doc = root?.ownerDocument ?? null, matchMedia = globalThis.matchMedia } = {}) {
  const noop = {
    syncEntry() {}, dropEntry() {}, dropAll() {}, recompute() {}, destroy() {},
  };
  if (!root || !doc || typeof globalThis.requestAnimationFrame !== "function") return noop;

  // entry → { ghost, prose }: kontener klonu i akapity prozy ORYGINAŁU,
  // którym trzeba zdejmować maskę odwrotną.
  const ghosts = new Map();
  const pointer = { x: 0, y: 0, seen: false };
  let wave = null;
  let frameId = 0;
  const composite = supportsComposite();
  const motionQuery = matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
  const now = () => globalThis.performance?.now?.() ?? 0;

  const filter = doc.querySelector("#pointer-static");
  const nodes = {
    letter: filter?.querySelector('[result="letter-noise"]') ?? null,
    wobble: filter?.querySelector('[result="wobbled"]') ?? null,
    slice: filter?.querySelector('[result="slice-noise"]') ?? null,
    sliced: filter?.querySelector('[result="sliced"]') ?? null,
    grain: filter?.querySelector('[result="grain"]') ?? null,
  };

  function strength() {
    return readNumber(doc, "--pointer-static");
  }

  function silenced() {
    return strength() <= 0 || Boolean(motionQuery?.matches);
  }

  function dropEntry(entry) {
    const record = ghosts.get(entry);
    if (!record) return;
    record.ghost.remove?.();
    for (const paragraph of record.prose) clearMask(paragraph);
    ghosts.delete(entry);
  }

  function dropAll() {
    for (const entry of [...ghosts.keys()]) dropEntry(entry);
  }

  // Klon powstaje od zera przy każdej synchronizacji: DOM wpisu zmienia się
  // rzadko (domknięty akapit, dołożone wybory, przerysowanie), a próba
  // łatania klonu w miejscu kosztowałaby więcej niż ponowne sklonowanie.
  function syncEntry(entry) {
    if (!entry?.cloneNode) return;
    dropEntry(entry);
    if (silenced()) return;

    const prose = [...entry.children].filter((node) => node.tagName === "P");
    if (prose.length === 0) return;

    const ghost = doc.createElement("div");
    ghost.className = "static-ghost";
    ghost.setAttribute("aria-hidden", "true");
    // `inert` trzyma klon poza kolejnością tabulacji i poza czytnikiem ekranu.
    ghost.setAttribute("inert", "");
    const copy = entry.cloneNode(true);
    // Klon nie może zawierać drugiego klonu ani niczego, co się ogniskuje.
    for (const nested of copy.querySelectorAll?.(".static-ghost") ?? []) nested.remove();
    ghost.append(copy);
    entry.append(ghost);
    ghosts.set(entry, { ghost, prose });
    start();
  }

  function onPointerMove(event) {
    if (event.pointerType === "touch") return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.seen = true;
    start();
  }

  function onPointerLeave() {
    pointer.seen = false;
    start();
  }

  // Dotyk nie ma najechania, więc na telefonie zostaje sam pierścień.
  function onPointerDown(event) {
    wave = { x: event.clientX, y: event.clientY, at: now() };
    start();
  }

  function tick() {
    frameId = 0;
    if (silenced()) {
      dropAll();
      return;
    }

    const time = now();
    const active = waveAt(time, wave);
    if (!active) wave = null;

    const scale = staticScale({ strength: strength(), waveGain: active?.gain ?? 1 });
    const seed = Math.floor(time / 60) % 1000;
    nodes.letter?.setAttribute("seed", String(seed));
    nodes.slice?.setAttribute("seed", String((seed * 7) % 1000));
    nodes.wobble?.setAttribute("scale", scale.letter.toFixed(3));
    nodes.sliced?.setAttribute("scale", scale.slice.toFixed(3));
    nodes.grain?.querySelector?.("feFuncA")?.setAttribute("slope", scale.grain.toFixed(3));

    for (const [entry, record] of ghosts) {
      const box = entry.getBoundingClientRect();
      const visible = pointer.seen || Boolean(active);
      if (!visible) {
        clearMask(record.ghost);
        for (const paragraph of record.prose) clearMask(paragraph);
        continue;
      }

      // Współrzędne maski są liczone względem prostokąta MASKOWANEGO
      // elementu, więc każdy poziom przelicza je osobno z tych samych
      // współrzędnych ekranowych — i dzięki temu obie maski się zgadzają.
      const ring = active && composite ? { ...active, x: wave.x - box.left, y: wave.y - box.top } : null;
      const ringOnly = active && !composite;
      const local = {
        x: pointer.seen ? pointer.x - box.left : Number.NEGATIVE_INFINITY,
        y: pointer.seen ? pointer.y - box.top : Number.NEGATIVE_INFINITY,
      };

      const ghostMask = ringOnly
        ? discMask({ x: wave.x - box.left, y: wave.y - box.top, radius: active.radius + WAVE_THICKNESS_PX / 2 })
        : discMask({ ...local, wave: ring });
      writeMask(record.ghost, ghostMask);
      record.ghost.style.setProperty("--ghost-split", scale.letter.toFixed(3));

      for (const paragraph of record.prose) {
        const paragraphBox = paragraph.getBoundingClientRect();
        const paragraphRing = active && composite
          ? { ...active, x: wave.x - paragraphBox.left, y: wave.y - paragraphBox.top }
          : null;
        const inverse = ringOnly
          ? discMask({
              x: wave.x - paragraphBox.left,
              y: wave.y - paragraphBox.top,
              radius: active.radius + WAVE_THICKNESS_PX / 2,
              invert: true,
            })
          : discMask({
              x: pointer.seen ? pointer.x - paragraphBox.left : Number.NEGATIVE_INFINITY,
              y: pointer.seen ? pointer.y - paragraphBox.top : Number.NEGATIVE_INFINITY,
              wave: paragraphRing,
              invert: true,
            });
        writeMask(paragraph, inverse);
      }
    }

    // Pętla podtrzymuje się, dopóki jest co animować: szum pełza w czasie,
    // więc zatrzymanie jej zamroziłoby obraz pod nieruchomym wskaźnikiem.
    if (ghosts.size > 0 && (pointer.seen || wave)) start();
  }

  function start() {
    if (frameId) return;
    frameId = globalThis.requestAnimationFrame(tick);
  }

  function onMotionChange() {
    start();
  }

  root.addEventListener("pointermove", onPointerMove, { passive: true });
  root.addEventListener("pointerdown", onPointerDown, { passive: true });
  root.addEventListener("pointerleave", onPointerLeave, { passive: true });
  motionQuery?.addEventListener?.("change", onMotionChange);

  return {
    syncEntry,
    dropEntry,
    dropAll,
    recompute: start,
    destroy() {
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerleave", onPointerLeave);
      motionQuery?.removeEventListener?.("change", onMotionChange);
      dropAll();
      if (frameId) globalThis.cancelAnimationFrame?.(frameId);
    },
  };
}
```

- [ ] **Step 4: Uruchom testy i potwierdź sukces**

Run: `node --test test/pointer-static.test.js`
Expected: PASS.

Potem cały zestaw, żeby wykluczyć skutki uboczne: `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/pointer-static.js test/pointer-static.test.js
git commit -m "Dodaje fabrykę zakłóceń pod wskaźnikiem"
```

---

### Task 7: Spięcie w `main.js` i dokumentacja

**Files:**
- Modify: `src/ui/main.js` (import, zmienna modułu, słowniki pl/en, `updateChrome`, `settingControls`, `bootstrap`, `showCurrentInstantly`, `onParagraphShown`, `presentCurrent`, `startOver`, wybór postaci)
- Modify: `README.md`
- Test: `npm test` plus weryfikacja w przeglądarce

**Interfaces:**
- Consumes: `createPointerStatic` (Zadanie 6), `onParagraphDone` (Zadanie 2), `settings.values.pointerStatic` (Zadanie 1), `#set-pointer-static`/`#label-pointer-static` (Zadanie 4).
- Produces: nic dla dalszych zadań — to ostatnie.

- [ ] **Step 1: Podłącz moduł**

W `src/ui/main.js`, obok `import { createEffects } from "./effects.js";`:

```js
import { createPointerStatic } from "./pointer-static.js";
```

Obok `let effects = null;`:

```js
let pointerStatic = null;
```

W `bootstrap()`, po `effects = createEffects({ root: dom.journal });`:

```js
  pointerStatic = createPointerStatic({ root: dom.journal });
```

Rozszerz istniejącą subskrypcję ustawień — suwak siły musi budzić także tę pętlę:

```js
  settings.subscribe(() => {
    effects?.recompute();
    pointerStatic?.recompute();
  });
```

- [ ] **Step 2: Podłącz cykl życia klonów**

Klony schodzą wszędzie tam, gdzie dziś schodzi obserwacja `effects` — w `showCurrentInstantly()`, `presentCurrent()`, `startOver()` i przy wyborze postaci, obok każdego `effects?.unobserveAll();`:

```js
  pointerStatic?.dropAll();
```

W `showCurrentInstantly()`, w pętli po dzieciach dziennika, obok `effects?.observe(node)`:

```js
    pointerStatic?.syncEntry(node);
```

W `presentCurrent()`, w obiekcie przekazywanym do `reveal.start`, obok `onParagraph: onParagraphShown,` dopisz:

```js
    // Klon widmowy powstaje dopiero po domknięciu akapitu: do tej chwili
    // reveal.js przepisuje jego węzły tekstowe co klatkę.
    onParagraphDone: (paragraph) => pointerStatic?.syncEntry(paragraph.parentElement),
```

W `onParagraphShown(block)` NIE wołaj `syncEntry` — akapit dopiero wchodzi na scenę i jest wypisywany.

Domknięcie ramki dokłada do wpisu kostki i przyciski, więc klon trzeba odświeżyć. Na końcu `finishFrame()`, przed zamknięciem funkcji, dopisz:

```js
  pointerStatic?.syncEntry(reveal.block());
```

- [ ] **Step 3: Podłącz suwak i etykiety**

W słowniku `pl`, po `textEffects: "Efekty tekstu",`:

```js
    pointerStatic: "Zakłócenia kursora",
```

W słowniku `en`, po `textEffects: "Text effects",`:

```js
    pointerStatic: "Cursor interference",
```

W `updateChrome()`, po wierszu z `#label-text-effects`:

```js
  document.querySelector("#label-pointer-static").textContent = text.pointerStatic;
```

W `settingControls`, po wpisie `textEffects`:

```js
  pointerStatic: [document.querySelector("#set-pointer-static"), "value"],
```

- [ ] **Step 4: Uruchom cały zestaw testów**

Run: `npm test`
Expected: PASS, wszystkie pliki.

- [ ] **Step 5: Sprawdź w przeglądarce**

```bash
python3 -m http.server 8080
```

Otwórz `http://127.0.0.1:8080/AloneAgainstTheStatic/`, przejdź do pierwszego paragrafu i sprawdź po kolei:

1. Po najechaniu na prozę zniekształcenie chodzi za kursorem w ograniczonym kole; poza kołem tekst jest czysty.
2. Nie ma zjawy — w kole widać jedne litery, nie dwa nałożone zestawy.
3. Kliknięcie wypuszcza pierścień, który rozchodzi się i gaśnie w ~pół sekundy.
4. Suwak „Zakłócenia kursora" na 0 gasi efekt całkowicie, na 1 daje mocne zniekształcenie; wartość przeżywa odświeżenie strony.
5. Przyciski wyborów, bramka `RZUĆ:` i kostki zostają nietknięte i klikalne.
6. Akapit aktualnie wypisywany nie reaguje na kursor; reaguje po domknięciu.
7. Konsola bez błędów.

Jeśli klon rozjeżdża się z oryginałem (przesunięte wiersze), sprawdź, czy `.journal-entry` ma `position: relative`, a `.static-ghost` `inset: 0` — klon musi dostawać dokładnie tę samą szerokość.

- [ ] **Step 6: Uzupełnij README**

W `README.md`, w sekcji o rozgrywce albo o efektach, dopisz akapit:

```markdown
## Zakłócenia pod wskaźnikiem

Proza paragrafów zniekształca się lokalnie tam, gdzie stoi wskaźnik: litery
falują, poziome pasma jadą w bok, na glify siada ziarno. Kliknięcie wypuszcza
z punktu uderzenia rozchodzący się pierścień mocniejszego zniekształcenia; na
dotyku zostaje sam pierścień, bo nie ma czego śledzić. Siłę reguluje suwak
**Zakłócenia kursora** w ustawieniach (0 gasi efekt całkowicie), a
`prefers-reduced-motion` wyłącza go bezwarunkowo.

Technicznie: nad każdym wpisem leży `aria-hidden inert` klon (`.static-ghost`),
zniekształcony filtrem `#pointer-static` i przycięty maską dysku wokół
wskaźnika; oryginalne akapity noszą maskę odwrotną, więc w dysku widać
wyłącznie klon. Klon przebudowuje się tylko wtedy, gdy DOM wpisu naprawdę się
zmienił — akapit aktualnie wypisywany jest z efektu wyłączony, bo `reveal.js`
przepisuje jego węzły tekstowe co klatkę. To osobny kanał od szumu z
Poczytalności (`src/ui/effects.js`), gdzie wskaźnik działa odwrotnie: uspokaja
tekst.
```

- [ ] **Step 7: Commit**

```bash
git add src/ui/main.js README.md
git commit -m "Spina zakłócenia pod wskaźnikiem z rozgrywką"
```
