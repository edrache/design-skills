# Zakłócenia reaktywne — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uczynić zakłócenie VHS stanem domyślnym, dodać animację narastającą wraz ze spadkiem Poczytalności i odwrócić rolę wskaźnika tak, by uspokajał zakłócenie zamiast je wzmacniać.

**Architecture:** Czyste funkcje natężenia i ruchu w `src/ui/effects.js` liczone z przekazanego czasu; pętla `rAF` podtrzymuje się, dopóki jest co animować; cztery filtry SVG o skwantowanych poziomach; JS ustawia zmienną CSS zamiast pisać po `style.filter`.

**Tech Stack:** Czysty ES-moduł bez bundlera, `node --test`, filtr SVG `feTurbulence` + `feDisplacementMap`, CSS z tokenami oklch.

**Spec:** [`docs/superpowers/specs/2026-08-24-zaklocenia-reaktywne-design.md`](../specs/2026-08-24-zaklocenia-reaktywne-design.md)

## Global Constraints

- Wszystkie polecenia uruchamiasz z katalogu `AloneAgainstTheStatic/`.
- Brak zależności zewnętrznych, brak kroku budowania, brak zmian w `package.json`.
- Nigdy `innerHTML`, `outerHTML`, `insertAdjacentHTML` w `src/`. `src/engine/` nietykalny.
- **Niezmienność treści zostaje nienaruszalna:** `textContent` akapitu równa się źródłu po zdjęciu znaczników. Efekty to wyłącznie CSS i filtry SVG.
- Funkcje liczące natężenie i ruch przyjmują czas jako argument i pozostają czyste — bez `performance.now()` w środku, bez `Math.random()`.
- `prefers-reduced-motion: reduce` zeruje ruch; barwy i typografia zostają.
- Suwak „Efekty tekstu" na zerze wyłącza wszystko.
- Komentarze po polsku, identyfikatory po angielsku.
- Stan wyjściowy: `npm test` daje 218/218, `npm run validate` daje 0 błędów i 17 ostrzeżeń.
- **Na gałęzi pracuje równolegle druga sesja.** Ma niezacommitowane zmiany w `package.json`, `progress.md`, `src/ui/sheet.js`, `test/terms.test.js` oraz nieśledzone `tools/tag-editor.*`, `test/tag-editor-server.test.js`, `media/img/charlie_*.png`. Nie dotykaj ich. Nigdy `git add -A` ani `git add .` — dodawaj wyłącznie pliki, które sam zmieniasz, i potwierdzaj zakres przez `git show --stat HEAD`.
- Każde zadanie kończy się commitem. Komunikat po polsku, tryb orzekający, bez prefiksu `feat:`.

---

### Task 1: Model natężenia i ruchu

**Files:**
- Modify: `AloneAgainstTheStatic/src/ui/effects.js` — stałe na górze pliku oraz funkcja `amplitudeFor`; dwie nowe funkcje eksportowane
- Test: `AloneAgainstTheStatic/test/effects.test.js`

**Interfaces:**
- Consumes: nic.
- Produces:
  - `FLOOR_PX = 0.4`, `CEILING_PX = 2.6`, `BUCKET_LEVELS = [0.4, 1.15, 1.9, 2.6]`
  - `amplitudeFor({ dread, textEffects, proximity, reducedMotion }) => number` — model odwrócony
  - `burstAt(timeMs, dread) => number` — mnożnik ≥ 1
  - `crawlAt(timeMs, dread) => { seed: number, frequencyY: number }`
  - `bucketFor(amplitude) => 0 | 1 | 2 | 3`

- [ ] **Step 1: Write the failing test**

Zastąp w `test/effects.test.js` testy `amplitudeFor` poniższymi i dopisz resztę. Stary test `"amplituda nigdy nie przekracza progu czytelności"` odwołujący się do `MAX_AMPLITUDE_PX` usuń — ta stała znika wraz ze zmianą modelu.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { amplitudeFor, bucketFor, burstAt, crawlAt, BUCKET_LEVELS, CEILING_PX, FLOOR_PX } from "../src/ui/effects.js";

test("przy pełnej Poczytalności zakłócenie jest obecne, ale minimalne", () => {
  assert.equal(amplitudeFor({ dread: 0, textEffects: 1, proximity: 0 }), FLOOR_PX);
});

test("spadek Poczytalności podnosi amplitudę do sufitu", () => {
  assert.equal(amplitudeFor({ dread: 1, textEffects: 1, proximity: 0 }), CEILING_PX);
  const polowa = amplitudeFor({ dread: 0.5, textEffects: 1, proximity: 0 });
  assert.ok(polowa > FLOOR_PX && polowa < CEILING_PX);
});

test("bliskość wskaźnika uspokaja zakłócenie zamiast je wzmacniać", () => {
  const daleko = amplitudeFor({ dread: 1, textEffects: 1, proximity: 0 });
  const blisko = amplitudeFor({ dread: 1, textEffects: 1, proximity: 1 });
  assert.ok(blisko < daleko);
  // Ulga zdejmuje 85% amplitudy — fragment staje się czytelny, nie znika.
  assert.ok(blisko > 0);
  assert.ok(Math.abs(blisko - daleko * 0.15) < 1e-9);
});

test("suwak na zero wyłącza wszystko mimo pełnego rozpadu", () => {
  assert.equal(amplitudeFor({ dread: 1, textEffects: 0, proximity: 0 }), 0);
});

test("prefers-reduced-motion zeruje ruch niezależnie od reszty", () => {
  assert.equal(amplitudeFor({ dread: 1, textEffects: 1, proximity: 0, reducedMotion: true }), 0);
});

test("wejścia poza zakresem nie dają NaN ani wartości ujemnej", () => {
  for (const zle of [NaN, -5, 7, "abc", null, undefined]) {
    const wynik = amplitudeFor({ dread: zle, textEffects: zle, proximity: zle });
    assert.ok(Number.isFinite(wynik), `dread=${String(zle)}`);
    assert.ok(wynik >= 0);
    assert.ok(wynik <= CEILING_PX);
  }
});

test("zryw nigdy nie tłumi, a przy pełnej Poczytalności prawie nie występuje", () => {
  let zrywy = 0;
  for (let t = 0; t < 60000; t += 50) {
    const m = burstAt(t, 0);
    assert.ok(m >= 1);
    if (m > 1.001) zrywy += 1;
  }
  const spokojne = zrywy;

  zrywy = 0;
  for (let t = 0; t < 60000; t += 50) {
    const m = burstAt(t, 1);
    assert.ok(m >= 1);
    if (m > 1.001) zrywy += 1;
  }
  assert.ok(zrywy > spokojne, `przy rozpadzie ${zrywy} kontra ${spokojne} przy spokoju`);
});

test("zryw jest deterministyczny — ten sam czas daje ten sam wynik", () => {
  assert.equal(burstAt(12345, 0.5), burstAt(12345, 0.5));
});

test("pełzanie przyspiesza wraz z rozpadem", () => {
  const ziarna = (dread) => {
    const zbior = new Set();
    for (let t = 0; t < 2000; t += 20) zbior.add(crawlAt(t, dread).seed);
    return zbior.size;
  };
  assert.ok(ziarna(1) > ziarna(0));
});

test("pełzanie faluje między przeskokami ziarna", () => {
  const a = crawlAt(1000, 0.5).frequencyY;
  const b = crawlAt(1060, 0.5).frequencyY;
  assert.notEqual(a, b);
  for (const t of [0, 500, 1234, 99999]) {
    const { frequencyY } = crawlAt(t, 0.5);
    assert.ok(frequencyY > 0 && frequencyY < 1);
  }
});

test("kubełek dobiera najbliższy poziom filtra", () => {
  assert.equal(bucketFor(0), 0);
  assert.equal(bucketFor(FLOOR_PX), 0);
  assert.equal(bucketFor(CEILING_PX), BUCKET_LEVELS.length - 1);
  assert.equal(bucketFor(999), BUCKET_LEVELS.length - 1);
  // Wartość między poziomami trafia do bliższego z nich.
  assert.equal(bucketFor(1.1), 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Oczekiwane: błędy importu `FLOOR_PX`, `CEILING_PX`, `burstAt`, `crawlAt`, `bucketFor` oraz porażki testów amplitudy.

- [ ] **Step 3: Write implementation**

W `src/ui/effects.js` zastąp stałą `MAX_AMPLITUDE_PX` i funkcję `amplitudeFor` poniższym. Reszta pliku zostaje na razie bez zmian — jej dostosowanie to Task 2.

```js
// Zakłócenie jest stanem domyślnym: nawet przy pełnej Poczytalności obraz lekko
// drga. Spadek Poczytalności podnosi amplitudę powyżej progu wygodnego czytania,
// bo gracz ma zawsze sposób jej zniesienia — wskaźnik uspokaja fragment.
export const FLOOR_PX = 0.4;
export const CEILING_PX = 2.6;
// Ulga pod wskaźnikiem zdejmuje 85% amplitudy: fragment staje się czytelny,
// ale nie przestaje istnieć.
const RELIEF = 0.85;
export const BUCKET_LEVELS = Object.freeze([0.4, 1.15, 1.9, 2.6]);

const BURST_SLOT_MS = 900;
const BURST_LENGTH_MS = 140;
const SEED_STEP_SLOW_MS = 220;
const SEED_STEP_FAST_MS = 40;

const clamp01 = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
};

// Czysta funkcja — cała logika natężenia w jednym miejscu, testowalna bez DOM.
export function amplitudeFor({ dread = 0, textEffects = 0, proximity = 0, reducedMotion = false } = {}) {
  if (reducedMotion) return 0;
  const scale = clamp01(textEffects);
  if (scale === 0) return 0;
  const base = (FLOOR_PX + (CEILING_PX - FLOOR_PX) * clamp01(dread)) * scale;
  return base * (1 - RELIEF * clamp01(proximity));
}

// Deterministyczny skrót slotu na liczbę 0–1. Determinizm jest celowy: pozwala
// przetestować rozkład zrywów bez podstawiania generatora losowego.
function slotNoise(slot) {
  const value = Math.sin(slot * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

// Zwraca mnożnik amplitudy: 1 poza zrywem, więcej w jego trakcie.
export function burstAt(timeMs, dread = 0) {
  const time = Number(timeMs);
  if (!Number.isFinite(time) || time < 0) return 1;
  const level = clamp01(dread);
  const slot = Math.floor(time / BURST_SLOT_MS);
  if (slotNoise(slot) >= 0.05 + 0.45 * level) return 1;

  const into = time - slot * BURST_SLOT_MS;
  if (into >= BURST_LENGTH_MS) return 1;
  const envelope = Math.sin((into / BURST_LENGTH_MS) * Math.PI);
  return 1 + 1.2 * level * envelope;
}

// Pełzanie szumu: ziarno przeskakuje skokowo, a częstotliwość faluje w sposób
// ciągły, żeby obraz nie zamierał między przeskokami.
export function crawlAt(timeMs, dread = 0) {
  const time = Number.isFinite(Number(timeMs)) ? Math.max(0, Number(timeMs)) : 0;
  const level = clamp01(dread);
  const step = SEED_STEP_SLOW_MS + (SEED_STEP_FAST_MS - SEED_STEP_SLOW_MS) * level;
  const seed = Math.floor(time / step) % 1000;
  const rate = 0.0008 + 0.0052 * level;
  const frequencyY = 0.04 + 0.03 * Math.sin(time * rate);
  return { seed, frequencyY };
}

export function bucketFor(amplitude) {
  const value = Number(amplitude);
  if (!Number.isFinite(value)) return 0;
  let best = 0;
  for (let index = 1; index < BUCKET_LEVELS.length; index += 1) {
    if (Math.abs(value - BUCKET_LEVELS[index]) < Math.abs(value - BUCKET_LEVELS[best])) best = index;
  }
  return best;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Oczekiwane: wszystkie zielone. Jeśli inne pliki testowe importowały `MAX_AMPLITUDE_PX`, popraw je — nie usuwaj asercji, tylko przelicz je na nowy model i opisz zmianę w raporcie.

- [ ] **Step 5: Commit**

```bash
git add AloneAgainstTheStatic/src/ui/effects.js AloneAgainstTheStatic/test/effects.test.js
git commit -m "Model zakłóceń: podłoga, sufit i ulga pod wskaźnikiem"
```

---

### Task 2: Cztery filtry i pętla animacji

**Files:**
- Modify: `AloneAgainstTheStatic/index.html` — blok `<svg class="filter-defs">`
- Modify: `AloneAgainstTheStatic/src/ui/effects.js` — `createEffects`: obsługa wskaźnika, `tick`, cykl życia pętli
- Test: `AloneAgainstTheStatic/test/effects.test.js` (dopisanie na końcu)

**Interfaces:**
- Consumes: `amplitudeFor`, `burstAt`, `crawlAt`, `bucketFor`, `BUCKET_LEVELS` z Task 1.
- Produces:
  - w `index.html` filtry o identyfikatorach `vhs-static-0` … `vhs-static-3`
  - `createEffects` ustawia na elemencie właściwość `--vhs-filter` (wartość `url(#vhs-static-N)`) zamiast pisać po `style.filter`
  - `reliefWeight(pointer, timeMs) => number` — eksportowana czysta funkcja wagi ulgi

- [ ] **Step 1: Write the failing test**

Dopisz na końcu `test/effects.test.js`:

```js
import { createEffects, reliefWeight } from "../src/ui/effects.js";

test("mysz daje ulgę trwałą, dotyk wygasającą", () => {
  const mysz = { seen: true, touch: false, at: 0 };
  assert.equal(reliefWeight(mysz, 0), 1);
  assert.equal(reliefWeight(mysz, 999999), 1);

  const dotyk = { seen: true, touch: true, at: 1000 };
  assert.equal(reliefWeight(dotyk, 1000), 1);
  assert.ok(reliefWeight(dotyk, 2250) > 0);
  assert.ok(reliefWeight(dotyk, 2250) < 1);
  assert.equal(reliefWeight(dotyk, 3500), 0);
  assert.equal(reliefWeight(dotyk, 9999), 0);
});

test("brak wskaźnika to brak ulgi", () => {
  assert.equal(reliefWeight({ seen: false, touch: false, at: 0 }, 0), 0);
});

test("brak DOM nie wywraca modułu", () => {
  const effects = createEffects({ root: null, doc: null });
  effects.observe(null);
  effects.flash(null);
  effects.unobserveAll();
  effects.recompute();
  effects.destroy();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Oczekiwane: `reliefWeight is not a function`.

- [ ] **Step 3: Write implementation**

W `index.html` zastąp cały blok `<svg class="filter-defs">` czterema filtrami. Każdy ma własny identyfikator; `scale`, `baseFrequency` i `seed` ustawia skrypt.

```html
    <svg class="filter-defs" aria-hidden="true" focusable="false" width="0" height="0">
      <filter id="vhs-static-0" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.9 0.04" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="vhs-static-1" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.9 0.04" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="vhs-static-2" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.9 0.04" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="vhs-static-3" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.9 0.04" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
```

W `src/ui/effects.js`:

Dopisz obok pozostałych stałych:

```js
const RELIEF_TOUCH_MS = 2500;
const AMPLITUDE_EPSILON = 0.02;

// Mysz daje ulgę trwałą, dopóki wskaźnik jest nad dziennikiem. Dotyk nie
// zostaje na ekranie, więc jego ulga wygasa liniowo.
export function reliefWeight(pointer, timeMs) {
  if (!pointer?.seen) return 0;
  if (!pointer.touch) return 1;
  const elapsed = Number(timeMs) - Number(pointer.at);
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  return Math.max(0, 1 - elapsed / RELIEF_TOUCH_MS);
}
```

Zmień obiekt `pointer` na `{ x: 0, y: 0, seen: false, touch: false, at: 0 }`.

Zmień `onPointer` tak, by zapisywał rodzaj wskaźnika i czas:

```js
  function onPointer(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.seen = true;
    pointer.touch = event.pointerType === "touch";
    pointer.at = now();
    start();
  }

  function onPointerLeave() {
    pointer.seen = false;
    start();
  }
```

Dodaj źródło czasu tuż obok, tak by moduł działał również bez `performance`:

```js
  const now = () => globalThis.performance?.now?.() ?? 0;
```

Podepnij `pointerleave` obok istniejących nasłuchów i odepnij go w `destroy()`.

Przepisz `tick` — pełna nowa treść funkcji:

```js
  function tick() {
    frameId = 0;
    running = false;

    const time = now();
    const dread = readNumber(doc, "--dread");
    const textEffects = readNumber(doc, "--text-effects");
    const reducedMotion = Boolean(motionQuery?.matches);
    const relief = reliefWeight(pointer, time);

    if (pointer.seen) {
      const box = root.getBoundingClientRect();
      root.style.setProperty("--px", String((pointer.x - box.left) / (box.width || 1)));
      root.style.setProperty("--py", String((pointer.y - box.top) / (box.height || 1)));
    }

    let anyVisible = false;
    for (const element of active) {
      const proximity = proximityTo(element) * relief;
      const amplitude = amplitudeFor({ dread, textEffects, proximity, reducedMotion });
      if (amplitude < AMPLITUDE_EPSILON) {
        element.style.removeProperty("--vhs-filter");
        element.style.removeProperty("--glitch");
        continue;
      }
      anyVisible = true;
      element.style.setProperty("--glitch", amplitude.toFixed(3));
      element.style.setProperty("--vhs-filter", `url(#vhs-static-${bucketFor(amplitude)})`);
    }

    const burst = burstAt(time, dread);
    const { seed, frequencyY } = crawlAt(time, dread);
    for (let index = 0; index < BUCKET_LEVELS.length; index += 1) {
      const filter = doc.querySelector(`#vhs-static-${index}`);
      if (!filter) continue;
      filter.querySelector("feTurbulence")?.setAttribute("baseFrequency", `0.9 ${frequencyY.toFixed(4)}`);
      filter.querySelector("feTurbulence")?.setAttribute("seed", String(seed));
      filter.querySelector("feDisplacementMap")?.setAttribute("scale", (BUCKET_LEVELS[index] * burst).toFixed(3));
    }

    // Ta pętla MUSI się podtrzymywać, odwrotnie niż poprzednia wersja modułu.
    // Wtedy nie było generatora zmiany w czasie, więc kolejne klatki byłyby
    // identyczne. Teraz szum pełza i zrywa, więc zatrzymanie pętli zamroziłoby
    // obraz. Gaśnie dopiero, gdy nie ma czego animować.
    if (anyVisible && !reducedMotion) start();
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Oczekiwane: wszystkie zielone.

- [ ] **Step 5: Commit**

```bash
git add AloneAgainstTheStatic/index.html AloneAgainstTheStatic/src/ui/effects.js AloneAgainstTheStatic/test/effects.test.js
git commit -m "Cztery filtry statyki i pętla animacji zakłóceń"
```

---

### Task 3: Składanie filtra w CSS i powrót `[wrong]`

**Files:**
- Modify: `AloneAgainstTheStatic/src/ui/voices.js` — wpis `wrong`, komentarz przy rejestrze
- Modify: `AloneAgainstTheStatic/style.css` — reguły `[data-effect]`, `.t-wrong`
- Test: `AloneAgainstTheStatic/test/markup.test.js` (dopisanie na końcu)

**Interfaces:**
- Consumes: `--vhs-filter` ustawiane przez `createEffects` z Task 2.
- Produces: `TAGS.wrong.effect === "static"`.

- [ ] **Step 1: Write the failing test**

Dopisz na końcu `test/markup.test.js`:

```js
test("wszystkie trzy znaczniki zakłóceń mają efekt", () => {
  for (const nazwa of ["horror", "radio", "wrong"]) {
    assert.equal(tagInfo(nazwa).effect, "static", nazwa);
  }
});

test("znacznik z efektem oznacza element atrybutem danych", () => {
  const doc = createFakeDocument();
  const p = renderMarkup(doc, "Coś [wrong]tu nie gra[/wrong].");
  const span = p.children.find((node) => node.nodeType === 1);
  assert.equal(span.className, "t-wrong");
  assert.equal(span.dataset.effect, "static");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Oczekiwane: `undefined !== "static"` dla `wrong`.

- [ ] **Step 3: Write implementation**

W `src/ui/voices.js` przywróć efekt dla `wrong` i zastąp komentarz przy wpisie:

```js
  // `[wrong]` składa własny blur z przemieszczeniem szumu. Wcześniej efekt był
  // tu wyłączony, bo JS pisał po `style.filter` i nadpisywał regułę blur;
  // teraz JS ustawia `--vhs-filter`, a CSS składa oba w jednym `filter`.
  wrong: { kind: "tone", className: "t-wrong", effect: "static" },
```

Popraw też komentarz na górze pliku: pole `effect` włącza filtr statyki przez zmienną `--vhs-filter`, a jego wartość nadal nie jest rozróżniana.

W `style.css`, w sekcji warstwy stylu tekstu, zastąp regułę `[data-effect="static"]` oraz `.t-wrong`:

```css
/* Rozszczepienie RGB skalowane amplitudą liczoną w effects.js. Filtr wchodzi
   przez zmienną, a nie przez styl inline, żeby dało się go składać z filtrami
   zadeklarowanymi w CSS — patrz `.t-wrong` niżej. */
[data-effect="static"] {
  --glitch: 0;
  filter: var(--vhs-filter, none);
  text-shadow:
    calc(var(--glitch) * -1px) 0 oklch(60% 0.14 20 / 0.5),
    calc(var(--glitch) * 1px) 0 oklch(65% 0.1 200 / 0.45);
}

/* Najsubtelniejszy z zestawu: blur rośnie z rozpadem i sumuje się ze szumem. */
.t-wrong {
  filter: blur(calc(var(--dread) * var(--text-effects) * 0.9px)) var(--vhs-filter, );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Oczekiwane: wszystkie zielone.

- [ ] **Step 5: Commit**

```bash
git add AloneAgainstTheStatic/src/ui/voices.js AloneAgainstTheStatic/style.css AloneAgainstTheStatic/test/markup.test.js
git commit -m "Składanie filtra w CSS i powrót efektu dla [wrong]"
```

---

## Weryfikacja końcowa

Wykonuje kontroler w przeglądarce, po Task 3:

- przy pełnej Poczytalności zakłócenie jest widoczne, ale spokojne
- przy `--dread` bliskim jedności tekst jest wyraźnie roztrzęsiony i trudny
- najechanie kursorem uspokaja fragment pod nim, sąsiednie zostają zakłócone
- `[wrong]` ma jednocześnie blur i szum, bez migotania między nimi
- suwak „Efekty tekstu" na zerze wyłącza wszystko
- brak spadków płynności przy widocznych kilku fragmentach naraz
