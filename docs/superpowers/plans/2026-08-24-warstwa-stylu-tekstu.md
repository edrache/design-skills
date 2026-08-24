# Warstwa stylu tekstu — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wprowadzić znaczniki `[tag]…[/tag]` w plikach tekstowych gry i warstwę renderującą, która nadaje dialogom, tonom i grozie odrębny wygląd oraz efekty VHS sterowane Poczytalnością postaci.

**Architecture:** Czysty parser (`markup.js`) zamienia tekst na drzewo węzłów; rejestr (`voices.js`) mapuje nazwę znacznika na klasę CSS i opcjonalny efekt; renderer buduje węzły DOM przez `createElement`, nigdy `innerHTML`; warstwa `effects.js` z jedną pętlą `rAF` i jednym filtrem SVG animuje to, co widoczne. Silnik gry (`src/engine/`) nie jest ruszany.

**Tech Stack:** Czysty ES-moduł bez bundlera, `node --test`, CSS z tokenami oklch, filtr SVG `feTurbulence` + `feDisplacementMap`.

**Spec:** [`docs/superpowers/specs/2026-08-24-warstwa-stylu-tekstu-design.md`](../specs/2026-08-24-warstwa-stylu-tekstu-design.md)

## Global Constraints

- Wszystkie polecenia uruchamiasz z katalogu `AloneAgainstTheStatic/`.
- Brak zależności zewnętrznych, brak kroku budowania. Nie dodawaj niczego do `package.json` poza ewentualnym skryptem `npm run`.
- **Nigdy `innerHTML`, `outerHTML` ani `insertAdjacentHTML` w kodzie gry** (`src/`). Węzły powstają przez `document.createElement` i `document.createTextNode`. Wyjątkiem jest `tools/dev.html` — narzędzie autorskie spoza gry, które używa `innerHTML` z własną funkcją `escape()` i tej konwencji nie zmieniamy.
- **Inwariant niezmienności treści:** `textContent` wyrenderowanego akapitu równa się tekstowi źródłowemu po usunięciu znaczników, znak w znak. Nazwa mówiącego pojawia się wyłącznie przez `content: attr(...)` w CSS, bo treść generowana nie wchodzi do `textContent`.
- Amplituda ruchu nigdy nie przekracza 1.5 px. Czytelność jest warunkiem nadrzędnym.
- Komentarze w kodzie i komunikaty walidatora po polsku, zgodnie z resztą repozytorium. Nazwy znaczników, kluczy i identyfikatorów po angielsku.
- Testy uruchamiasz przez `npm test`, walidator przez `npm run validate`.
- Każde zadanie kończy się commitem. Komunikat commita po polsku, tryb orzekający, bez prefiksów typu `feat:` — zgodnie z historią gałęzi.

---

### Task 1: Parser znaczników

**Files:**
- Create: `AloneAgainstTheStatic/src/ui/markup.js`
- Test: `AloneAgainstTheStatic/test/markup.test.js`

**Interfaces:**
- Consumes: nic.
- Produces:
  - `inspectMarkup(source: string) => { nodes: Node[], unclosed: string[], stray: string[] }`
  - `parseMarkup(source: string) => Node[]`
  - `stripMarkup(source: string) => string`
  - `tagCounts(source: string) => Record<string, number>`
  - `Node` to `{ type: "text", value: string }` albo `{ type: "tag", name: string, children: Node[] }`

- [ ] **Step 1: Write the failing test**

Utwórz `test/markup.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { inspectMarkup, parseMarkup, stripMarkup, tagCounts } from "../src/ui/markup.js";

test("tekst bez znaczników przechodzi bez zmian", () => {
  assert.deepEqual(parseMarkup("Zwykły opis."), [{ type: "text", value: "Zwykły opis." }]);
  assert.equal(stripMarkup("Zwykły opis."), "Zwykły opis.");
});

test("znacznik tworzy węzeł z zawartością", () => {
  assert.deepEqual(parseMarkup("[charlie]„Cholera!”[/charlie] — warczy."), [
    { type: "tag", name: "charlie", children: [{ type: "text", value: "„Cholera!”" }] },
    { type: "text", value: " — warczy." },
  ]);
});

test("znaczniki zagnieżdżają się", () => {
  const nodes = parseMarkup("[charlie]„Co to?” [horror]Głos mu się łamie.[/horror][/charlie]");
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].name, "charlie");
  assert.deepEqual(nodes[0].children[1], {
    type: "tag",
    name: "horror",
    children: [{ type: "text", value: "Głos mu się łamie." }],
  });
});

test("niedomknięty znacznik zostaje tekstem literalnym", () => {
  assert.equal(stripMarkup("[horror]Coś tu jest."), "[horror]Coś tu jest.");
  assert.deepEqual(inspectMarkup("[horror]Coś tu jest.").unclosed, ["horror"]);
});

test("zamknięcie bez otwarcia zostaje tekstem literalnym", () => {
  assert.equal(stripMarkup("Coś tu jest.[/horror]"), "Coś tu jest.[/horror]");
  assert.deepEqual(inspectMarkup("Coś tu jest.[/horror]").stray, ["horror"]);
});

test("źle zagnieżdżone zamknięcie nie zamyka cudzego znacznika", () => {
  const out = inspectMarkup("[charlie]a[/horror]b[/charlie]");
  assert.deepEqual(out.stray, ["horror"]);
  assert.equal(stripMarkup("[charlie]a[/horror]b[/charlie]"), "a[/horror]b");
});

test("podwójny nawias to literalny nawias", () => {
  assert.equal(stripMarkup("Notatka [[1]] na ścianie."), "Notatka [1] na ścianie.");
  assert.deepEqual(inspectMarkup("Notatka [[1]] na ścianie.").unclosed, []);
});

test("parser nie zna rejestru — nieznana nazwa nadal daje węzeł", () => {
  assert.deepEqual(parseMarkup("[dream]sen[/dream]"), [
    { type: "tag", name: "dream", children: [{ type: "text", value: "sen" }] },
  ]);
});

test("liczy wystąpienia znaczników do porównania tłumaczeń", () => {
  assert.deepEqual(tagCounts("[charlie]a[/charlie] [charlie]b[/charlie] [horror]c[/horror]"), {
    charlie: 2,
    horror: 1,
  });
});

test("sąsiadujące fragmenty tekstu są scalane", () => {
  assert.deepEqual(parseMarkup("a[/x]b"), [{ type: "text", value: "a[/x]b" }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Oczekiwane: `Cannot find module '../src/ui/markup.js'`.

- [ ] **Step 3: Write minimal implementation**

Utwórz `src/ui/markup.js`:

```js
// Parser znaczników stylu. Czysty — bez DOM i bez wiedzy o rejestrze znaczników,
// dzięki czemu działa tak samo w przeglądarce, w testach i w walidatorze.

const TAG = /^\[(\/?)([a-z][a-z0-9_-]*)\]/;

function mergeText(nodes) {
  const out = [];
  for (const node of nodes) {
    if (node.type === "tag") {
      out.push({ type: "tag", name: node.name, children: mergeText(node.children) });
      continue;
    }
    const previous = out.at(-1);
    if (previous?.type === "text") previous.value += node.value;
    else out.push({ type: "text", value: node.value });
  }
  return out.filter((node) => node.type !== "text" || node.value !== "");
}

export function inspectMarkup(source) {
  const text = String(source ?? "");
  const root = { type: "root", children: [] };
  const stack = [root];
  const stray = [];
  let buffer = "";
  let index = 0;

  const flush = () => {
    if (buffer === "") return;
    stack.at(-1).children.push({ type: "text", value: buffer });
    buffer = "";
  };

  while (index < text.length) {
    if (text.startsWith("[[", index)) {
      buffer += "[";
      index += 2;
      continue;
    }

    const match = TAG.exec(text.slice(index));
    if (!match) {
      buffer += text[index];
      index += 1;
      continue;
    }

    const [raw, slash, name] = match;
    if (!slash) {
      flush();
      const node = { type: "tag", name, raw, children: [] };
      stack.at(-1).children.push(node);
      stack.push(node);
    } else if (stack.length > 1 && stack.at(-1).name === name) {
      flush();
      stack.pop();
    } else {
      // Zamknięcie bez pasującego otwarcia jest zwykłym tekstem, ale autor
      // ma się o nim dowiedzieć z walidatora.
      stray.push(name);
      buffer += raw;
    }
    index += raw.length;
  }
  flush();

  // Niedomknięte znaczniki rozwijamy z powrotem na tekst literalny, od środka.
  const unclosed = [];
  while (stack.length > 1) {
    const node = stack.pop();
    unclosed.unshift(node.name);
    const parent = stack.at(-1);
    parent.children.pop();
    parent.children.push({ type: "text", value: node.raw }, ...node.children);
  }

  return { nodes: mergeText(root.children), unclosed, stray };
}

export function parseMarkup(source) {
  return inspectMarkup(source).nodes;
}

export function stripMarkup(source) {
  const walk = (nodes) => nodes.map((node) => (node.type === "text" ? node.value : walk(node.children))).join("");
  return walk(parseMarkup(source));
}

export function tagCounts(source) {
  const counts = {};
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.type !== "tag") continue;
      counts[node.name] = (counts[node.name] ?? 0) + 1;
      walk(node.children);
    }
  };
  walk(parseMarkup(source));
  return counts;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Oczekiwane: wszystkie testy `markup.test.js` przechodzą, pozostałe pliki testowe nadal zielone.

- [ ] **Step 5: Commit**

```bash
git add AloneAgainstTheStatic/src/ui/markup.js AloneAgainstTheStatic/test/markup.test.js
git commit -m "Parser znaczników stylu tekstu"
```

---

### Task 2: Rejestr znaczników

**Files:**
- Create: `AloneAgainstTheStatic/src/ui/voices.js`
- Modify: `AloneAgainstTheStatic/test/markup.test.js` (dopisanie testów na końcu pliku)

**Interfaces:**
- Consumes: nic.
- Produces:
  - `TAGS: Readonly<Record<string, { kind: "voice" | "tone", className: string, label?: string, effect?: string }>>`
  - `tagInfo(name: string) => TagInfo | null`
  - `isKnownTag(name: string) => boolean`
  - `VOICE_NAMES: string[]` — nazwy znaczników o `kind === "voice"`

- [ ] **Step 1: Write the failing test**

Dopisz na końcu `test/markup.test.js`:

```js
import { isKnownTag, tagInfo, TAGS, VOICE_NAMES } from "../src/ui/voices.js";

test("rejestr rozróżnia głosy i tony", () => {
  assert.equal(tagInfo("charlie").kind, "voice");
  assert.equal(tagInfo("horror").kind, "tone");
  assert.equal(tagInfo("dream"), null);
  assert.equal(isKnownTag("whisper"), true);
  assert.equal(isKnownTag("dream"), false);
});

test("każdy znacznik ma unikalną klasę CSS", () => {
  const classes = Object.values(TAGS).map((info) => info.className);
  assert.equal(new Set(classes).size, classes.length);
});

test("bohater i mówca nieznany nie mają etykiety nad kwestią", () => {
  assert.equal(tagInfo("you").label, undefined);
  assert.equal(tagInfo("voice").label, undefined);
  assert.equal(tagInfo("charlie").label, "Charlie");
});

test("lista głosów obejmuje całą obsadę i bohatera", () => {
  assert.deepEqual([...VOICE_NAMES].sort(), ["alex", "charlie", "julie", "mark", "tom", "voice", "you"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Oczekiwane: `Cannot find module '../src/ui/voices.js'`.

- [ ] **Step 3: Write minimal implementation**

Utwórz `src/ui/voices.js`:

```js
// Rejestr znaczników stylu. To jedyne miejsce, które edytujesz, dodając efekt:
// wpis tutaj plus reguła w style.css. Pole `effect` włącza zachowanie z effects.js.

export const TAGS = Object.freeze({
  charlie: { kind: "voice", className: "v-charlie", label: "Charlie" },
  alex: { kind: "voice", className: "v-alex", label: "Alex" },
  mark: { kind: "voice", className: "v-mark", label: "Mark" },
  julie: { kind: "voice", className: "v-julie", label: "Julie" },
  tom: { kind: "voice", className: "v-tom", label: "Tom" },
  // Bohater i mówca nienazwany zostają bez etykiety: ich kwestie mają
  // brzmieć jak część prozy, nie jak scenariusz.
  you: { kind: "voice", className: "v-you" },
  voice: { kind: "voice", className: "v-unknown" },

  horror: { kind: "tone", className: "t-horror", effect: "static" },
  whisper: { kind: "tone", className: "t-whisper" },
  shout: { kind: "tone", className: "t-shout" },
  thought: { kind: "tone", className: "t-thought" },
  radio: { kind: "tone", className: "t-radio", effect: "static" },
  sign: { kind: "tone", className: "t-sign" },
  wrong: { kind: "tone", className: "t-wrong", effect: "static" },
});

export function tagInfo(name) {
  return Object.hasOwn(TAGS, name) ? TAGS[name] : null;
}

export function isKnownTag(name) {
  return tagInfo(name) !== null;
}

export const VOICE_NAMES = Object.freeze(
  Object.keys(TAGS).filter((name) => TAGS[name].kind === "voice"),
);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Oczekiwane: wszystkie testy zielone.

- [ ] **Step 5: Commit**

```bash
git add AloneAgainstTheStatic/src/ui/voices.js AloneAgainstTheStatic/test/markup.test.js
git commit -m "Rejestr znaczników głosów i tonów"
```

---

### Task 3: Renderer i wpięcie w dziennik

**Files:**
- Create: `AloneAgainstTheStatic/test/helpers/fake-dom.js`
- Create: `AloneAgainstTheStatic/src/ui/render-markup.js`
- Modify: `AloneAgainstTheStatic/src/ui/journal.js` — import na górze pliku oraz gałąź `event.kind === "text"` w `appendEvent()`
- Test: `AloneAgainstTheStatic/test/markup.test.js` (dopisanie na końcu)

**Interfaces:**
- Consumes: `parseMarkup`, `stripMarkup` z Task 1; `tagInfo` z Task 2.
- Produces:
  - `renderMarkup(doc: DocumentLike, source: string) => ElementLike` — zwraca gotowy `<p>`
  - `createFakeDocument() => { createElement, createTextNode }` (tylko dla testów)

- [ ] **Step 1: Write the failing test**

Utwórz `test/helpers/fake-dom.js`:

```js
// Minimalny dokument na potrzeby testów renderera. Odwzorowuje tylko to,
// czego używa render-markup.js: tworzenie węzłów, append, className, dataset.

class FakeText {
  constructor(value) {
    this.nodeType = 3;
    this.value = value;
  }
  get textContent() { return this.value; }
}

class FakeElement {
  constructor(tag) {
    this.nodeType = 1;
    this.tagName = tag.toUpperCase();
    this.className = "";
    this.dataset = {};
    this.children = [];
  }
  append(...nodes) { this.children.push(...nodes); }
  get textContent() { return this.children.map((node) => node.textContent).join(""); }
}

export function createFakeDocument() {
  return {
    createElement: (tag) => new FakeElement(tag),
    createTextNode: (value) => new FakeText(value),
  };
}

// Zbiera klasy wszystkich elementów w poddrzewie, w kolejności wystąpienia.
export function classesOf(node) {
  if (node.nodeType !== 1) return [];
  const own = node.className ? [node.className] : [];
  return [...own, ...node.children.flatMap(classesOf)];
}
```

Dopisz na końcu `test/markup.test.js`:

```js
import { readFileSync } from "node:fs";
import { renderMarkup } from "../src/ui/render-markup.js";
import { classesOf, createFakeDocument } from "./helpers/fake-dom.js";

test("dialog w środku akapitu jest opakowany inline", () => {
  const doc = createFakeDocument();
  const p = renderMarkup(doc, "[charlie]„Cholera!”[/charlie] — warczy Charlie.");
  assert.equal(p.tagName, "P");
  assert.equal(p.className, "");
  assert.ok(classesOf(p).includes("v-charlie"));
  assert.equal(p.textContent, "„Cholera!” — warczy Charlie.");
});

test("akapit będący w całości kwestią dostaje układ blokowy", () => {
  const doc = createFakeDocument();
  const p = renderMarkup(doc, "[charlie]„Nie wysiadaj z auta.”[/charlie]");
  assert.equal(p.className, "speech v-charlie");
  assert.equal(p.dataset.who, "Charlie");
  assert.equal(p.textContent, "„Nie wysiadaj z auta.”");
});

test("etykieta mówiącego nie trafia do treści", () => {
  const doc = createFakeDocument();
  const p = renderMarkup(doc, "[charlie]„A.”[/charlie]");
  assert.ok(!p.textContent.includes("Charlie"));
});

test("kwestia bohatera nie dostaje etykiety", () => {
  const doc = createFakeDocument();
  const p = renderMarkup(doc, "[you]„Nie wiem.”[/you]");
  assert.equal(p.className, "speech v-you");
  assert.equal(p.dataset.who, undefined);
});

test("znacznik z efektem oznacza element atrybutem danych", () => {
  const doc = createFakeDocument();
  const p = renderMarkup(doc, "Coś [horror]tu jest[/horror].");
  const span = p.children.find((node) => node.nodeType === 1);
  assert.equal(span.className, "t-horror");
  assert.equal(span.dataset.effect, "static");
});

test("nieznany znacznik renderuje zawartość bez opakowania", () => {
  const doc = createFakeDocument();
  const p = renderMarkup(doc, "[dream]sen[/dream]");
  assert.deepEqual(classesOf(p), []);
  assert.equal(p.textContent, "sen");
});

test("INWARIANT: render nie zmienia treści żadnego tekstu w danych", () => {
  const doc = createFakeDocument();
  const load = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8"));

  for (const file of ["text.pl.json", "text.en.json"]) {
    for (const [key, value] of Object.entries(load(file))) {
      if (typeof value !== "string") continue;
      assert.equal(
        renderMarkup(doc, value).textContent,
        stripMarkup(value),
        `${file} → ${key}`,
      );
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Oczekiwane: `Cannot find module '../src/ui/render-markup.js'`.

- [ ] **Step 3: Write minimal implementation**

Utwórz `src/ui/render-markup.js`:

```js
import { parseMarkup } from "./markup.js";
import { tagInfo } from "./voices.js";

// Akapit będący w całości jedną kwestią czyta się jak scenariusz, mieszany
// jak proza. Ta funkcja rozstrzyga, który to przypadek.
function soleVoice(nodes) {
  const meaningful = nodes.filter((node) => node.type !== "text" || node.value.trim() !== "");
  if (meaningful.length !== 1) return null;
  const node = meaningful[0];
  if (node.type !== "tag") return null;
  return tagInfo(node.name)?.kind === "voice" ? node : null;
}

function appendNodes(doc, parent, nodes) {
  for (const node of nodes) {
    if (node.type === "text") {
      parent.append(doc.createTextNode(node.value));
      continue;
    }

    const info = tagInfo(node.name);
    // Nieznany znacznik nie może zjeść tekstu — renderujemy samą zawartość.
    if (!info) {
      appendNodes(doc, parent, node.children);
      continue;
    }

    const span = doc.createElement("span");
    span.className = info.className;
    if (info.effect) span.dataset.effect = info.effect;
    appendNodes(doc, span, node.children);
    parent.append(span);
  }
}

export function renderMarkup(doc, source) {
  const nodes = parseMarkup(source);
  const paragraph = doc.createElement("p");
  const block = soleVoice(nodes);

  if (block) {
    const info = tagInfo(block.name);
    paragraph.className = `speech ${info.className}`;
    // Etykieta idzie do atrybutu, a nie do DOM: CSS wypisuje ją przez
    // content: attr(data-who), więc nie wchodzi do textContent.
    if (info.label) paragraph.dataset.who = info.label;
    appendNodes(doc, paragraph, block.children);
    return paragraph;
  }

  appendNodes(doc, paragraph, nodes);
  return paragraph;
}
```

W `src/ui/journal.js` dodaj import obok istniejącego importu `termName`:

```js
import { renderMarkup } from "./render-markup.js";
```

i zamień w `appendEvent()` pierwszą linię gałęzi tekstu:

```js
  // było: if (event.kind === "text") block.append(el(doc, "p", null, i18n.t(event.key)));
  if (event.kind === "text") block.append(renderMarkup(doc, i18n.t(event.key)));
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Oczekiwane: wszystkie zielone, w tym test inwariantu przechodzący przez 304 wartości (152 klucze × 2 pliki, wliczając podglądy `__en.*`).

- [ ] **Step 5: Commit**

```bash
git add AloneAgainstTheStatic/src/ui/render-markup.js AloneAgainstTheStatic/src/ui/journal.js AloneAgainstTheStatic/test/helpers/fake-dom.js AloneAgainstTheStatic/test/markup.test.js
git commit -m "Renderer znaczników z inwariantem niezmienności treści"
```

---

### Task 4: Język wizualny w CSS

**Files:**
- Modify: `AloneAgainstTheStatic/style.css` — bloku `:root` (dopisanie tokenów) oraz nowa sekcja po regule `.journal-entry p:first-of-type::first-letter`

**Interfaces:**
- Consumes: klasy `v-*`, `t-*`, `speech` i atrybut `data-who` z Task 3.
- Produces: tokeny `--voice-charlie`, `--voice-alex`, `--voice-mark`, `--voice-julie`, `--voice-tom` używane w Task 6.

To zadanie jest wyłącznie wizualne — nie ma dla niego testu jednostkowego. Weryfikujesz je w przeglądarce, krok 3.

- [ ] **Step 1: Dopisz tokeny barw do `:root`**

W `style.css`, w bloku `:root`, po linii `--rec-soft: oklch(72% 0.09 31);` dodaj:

```css
  --voice-charlie: oklch(78% 0.07 62);
  --voice-alex: oklch(78% 0.07 205);
  --voice-mark: oklch(76% 0.06 300);
  --voice-julie: oklch(78% 0.065 340);
  --voice-tom: oklch(76% 0.055 145);
  /* Poziom rozpadu 0–1, ustawiany z Poczytalności w main.js. */
  --dread: 0;
  /* Mnożnik amplitudy z suwaka „Efekty tekstu”. */
  --text-effects: 0.6;
```

- [ ] **Step 2: Dopisz sekcję stylów tekstu**

W `style.css`, bezpośrednio po regule `.journal-entry p:first-of-type::first-letter { … }`, wstaw:

```css
/* --- Warstwa stylu tekstu ------------------------------------------------ */

.v-charlie { --voice: var(--voice-charlie); }
.v-alex { --voice: var(--voice-alex); }
.v-mark { --voice: var(--voice-mark); }
.v-julie { --voice: var(--voice-julie); }
.v-tom { --voice: var(--voice-tom); }
.v-unknown { --voice: var(--paper-dim); }
/* Bohater zostaje neutralny: barwa znaczy „mówi ktoś inny”. */
.v-you { --voice: var(--paper); }

.journal-entry p span[class^="v-"],
.journal-entry p span[class*=" v-"] {
  color: var(--voice);
}

/* Kropka przed kwestią wtopioną w opis — sygnał, że zaczyna się mowa. */
.journal-entry p span[class^="v-"]::before,
.journal-entry p span[class*=" v-"]::before {
  content: "";
  display: inline-block;
  width: 0.3em;
  height: 0.3em;
  margin-right: 0.35em;
  vertical-align: 0.12em;
  background: var(--voice);
}

/* Akapit będący w całości kwestią: układ scenariuszowy. */
.journal-entry p.speech {
  margin-left: clamp(0.6rem, 3vw, 1.6rem);
  padding-left: 0.9rem;
  border-left: 2px solid var(--voice);
  color: var(--voice);
}

.journal-entry p.speech::before {
  content: attr(data-who);
  display: block;
  margin-bottom: 0.3rem;
  color: var(--voice);
  font: 400 0.6rem/1 var(--font-console);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.75;
}

/* Bez data-who pseudoelement jest pusty — zdejmujemy pusty odstęp. */
.journal-entry p.speech:not([data-who])::before { display: none; }

.journal-entry p.speech span[class^="v-"]::before,
.journal-entry p.speech span[class*=" v-"]::before { display: none; }

.t-horror {
  color: var(--rec-soft);
  letter-spacing: 0.04em;
}

.t-whisper {
  color: var(--paper-dim);
  font-size: 0.92em;
  letter-spacing: 0.06em;
  opacity: 0.8;
}

.t-shout {
  font-family: var(--font-console);
  font-weight: 700;
  letter-spacing: -0.01em;
  text-transform: uppercase;
}

.t-thought {
  color: var(--phosphor);
  font-style: italic;
}

.t-radio {
  font-family: var(--font-console);
  color: var(--paper-dim);
  letter-spacing: 0.03em;
}

.t-sign {
  display: inline-block;
  padding: 0.15em 0.5em;
  border: 1px solid var(--rule);
  background: oklch(20% 0.02 128 / 0.6);
  font-family: var(--font-console);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Najsubtelniejszy z zestawu: widoczny dopiero, gdy Poczytalność spada. */
.t-wrong {
  filter: blur(calc(var(--dread) * var(--text-effects) * 0.9px));
}
```

- [ ] **Step 3: Sprawdź w przeglądarce**

Z katalogu głównego repozytorium uruchom serwer:

```bash
python3 -m http.server 8080
```

Otwórz <http://127.0.0.1:8080/AloneAgainstTheStatic/>, zacznij grę dowolną postacią. Na razie żaden tekst nie ma znaczników, więc paragrafy mają wyglądać **dokładnie jak dotąd** — to jest sprawdzian, że renderer niczego nie popsuł.

Żeby zobaczyć nowe style przed migracją danych, wpisz tymczasowo w konsoli przeglądarki:

```js
document.querySelector("#journal p").outerHTML =
  '<p class="speech v-charlie" data-who="Charlie">„Nie wysiadaj z auta.”</p>';
```

Oczekiwane: bursztynowa kwestia z kreską po lewej i kapitalikami `CHARLIE` nad nią. Cofnij zmianę odświeżając stronę.

- [ ] **Step 4: Commit**

```bash
git add AloneAgainstTheStatic/style.css
git commit -m "Barwy głosów i rejestry typograficzne tonów"
```

---

### Task 5: Poziom rozpadu i suwak efektów

**Files:**
- Modify: `AloneAgainstTheStatic/src/ui/settings.js` — `DEFAULTS`, `NUMERIC_RANGES`, `applyToDocument`
- Modify: `AloneAgainstTheStatic/index.html` — nowy `<label>` w `#settings-dialog`, przed `#settings-close`
- Modify: `AloneAgainstTheStatic/src/ui/main.js` — `UI_COPY.pl`, `UI_COPY.en`, `settingControls`, `updateChrome()`, `advance()`
- Test: `AloneAgainstTheStatic/test/settings.test.js` (dopisanie na końcu)

**Interfaces:**
- Consumes: tokeny `--dread` i `--text-effects` z Task 4.
- Produces: klucz ustawień `textEffects` (0–1, domyślnie 0.6) oraz zmienne CSS `--dread` i `--text-effects` na `document.documentElement`, czytane przez Task 6.

- [ ] **Step 1: Write the failing test**

Dopisz na końcu `test/settings.test.js`:

```js
test("suwak efektów tekstu ma domyślną wartość i zakres", () => {
  defineGlobal("localStorage", memoryStorage());
  const settings = createSettings();
  assert.equal(settings.values.textEffects, 0.6);

  settings.set("textEffects", 5);
  assert.equal(settings.values.textEffects, 1);

  settings.set("textEffects", -2);
  assert.equal(settings.values.textEffects, 0);
});

test("efekty tekstu trafiają do zmiennej CSS", () => {
  const properties = new Map();
  defineGlobal("localStorage", memoryStorage());
  defineGlobal("document", { documentElement: { style: { setProperty: (k, v) => properties.set(k, v) } } });

  createSettings().set("textEffects", 0.25);
  assert.equal(properties.get("--text-effects"), "0.25");
});
```

Uwaga: `afterEach` w tym pliku już przywraca `localStorage` i `document` — nie dopisuj własnego sprzątania.

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Oczekiwane: `AssertionError: undefined !== 0.6`.

- [ ] **Step 3: Write implementation**

W `src/ui/settings.js`, w `DEFAULTS`, po `proseSize: 1.05,` dodaj:

```js
  textEffects: 0.6,
```

W `NUMERIC_RANGES`, po `proseSize: [0.9, 1.4],` dodaj:

```js
  textEffects: [0, 1],
```

W `applyToDocument`, po linii ustawiającej `--prose-size`, dodaj:

```js
    style.setProperty("--text-effects", String(values.textEffects));
```

W `index.html`, w `#settings-dialog`, po `<label>` z `#set-prose` a przed `#settings-close`:

```html
          <label><span id="label-text-effects">Efekty tekstu</span><input type="range" id="set-text-effects" min="0" max="1" step="0.05" /></label>
```

W `src/ui/main.js`, w `UI_COPY.pl` po `proseSize: "Rozmiar tekstu",` dodaj `textEffects: "Efekty tekstu",`; w `UI_COPY.en` po `proseSize: "Text size",` dodaj `textEffects: "Text effects",`.

W `settingControls` po wpisie `proseSize` dodaj:

```js
  textEffects: [document.querySelector("#set-text-effects"), "value"],
```

W `updateChrome()`, po linii z `#label-prose`, dodaj:

```js
  document.querySelector("#label-text-effects").textContent = text.textEffects;
```

W `advance()`, bezpośrednio po `renderCharacterSheet();`, dodaj:

```js
  setDread(frame.state);
```

i zdefiniuj funkcję nad `advance()`:

```js
// Rozpad obrazu rośnie wraz ze spadkiem Poczytalności: na starcie gra jest
// praktycznie czystym drukiem.
function setDread(state) {
  const start = Number(state?.startingSan) || 0;
  const current = Number(state?.san) || 0;
  const dread = start > 0 ? 1 - current / start : 0;
  document.documentElement.style.setProperty("--dread", String(Math.max(0, Math.min(1, dread))));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Oczekiwane: wszystkie zielone.

- [ ] **Step 5: Sprawdź w przeglądarce**

Uruchom serwer, otwórz grę, wejdź w **Ustawienia**. Nowy suwak „Efekty tekstu" ma być widoczny pod „Rozmiar tekstu". Przełącz język na EN — etykieta ma zmienić się na „Text effects". W konsoli sprawdź:

```js
getComputedStyle(document.documentElement).getPropertyValue("--dread");
```

Oczekiwane: `0` na starcie rozgrywki (pełna Poczytalność).

- [ ] **Step 6: Commit**

```bash
git add AloneAgainstTheStatic/src/ui/settings.js AloneAgainstTheStatic/index.html AloneAgainstTheStatic/src/ui/main.js AloneAgainstTheStatic/test/settings.test.js
git commit -m "Poziom rozpadu z Poczytalności i suwak efektów tekstu"
```

---

### Task 6: Warstwa efektów

**Files:**
- Create: `AloneAgainstTheStatic/src/ui/effects.js`
- Modify: `AloneAgainstTheStatic/index.html` — filtr SVG bezpośrednio po `<div class="tape-noise">`
- Modify: `AloneAgainstTheStatic/style.css` — reguły efektów na końcu sekcji z Task 4
- Modify: `AloneAgainstTheStatic/src/ui/main.js` — utworzenie instancji w `bootstrap()`, wywołania w `advance()` i `redraw()`
- Test: `AloneAgainstTheStatic/test/effects.test.js`

**Interfaces:**
- Consumes: `data-effect="static"` z Task 3, `--dread` i `--text-effects` z Task 5.
- Produces:
  - `createEffects({ root, doc, matchMedia }) => { observe(block), flash(block), destroy() }` — natężenie czyta ze zmiennych CSS, więc nie potrzebuje instancji ustawień
  - `amplitudeFor({ dread, textEffects, proximity, reducedMotion }) => number` — czysta funkcja, testowalna bez DOM

- [ ] **Step 1: Write the failing test**

Utwórz `test/effects.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { amplitudeFor, MAX_AMPLITUDE_PX } from "../src/ui/effects.js";

test("przy pełnej Poczytalności ruchu nie ma", () => {
  assert.equal(amplitudeFor({ dread: 0, textEffects: 1, proximity: 1 }), 0);
});

test("amplituda rośnie z rozpadem i z bliskością wskaźnika", () => {
  const far = amplitudeFor({ dread: 0.5, textEffects: 1, proximity: 0 });
  const near = amplitudeFor({ dread: 0.5, textEffects: 1, proximity: 1 });
  assert.ok(far > 0);
  assert.ok(near > far);
});

test("amplituda nigdy nie przekracza progu czytelności", () => {
  assert.equal(amplitudeFor({ dread: 1, textEffects: 1, proximity: 1 }), MAX_AMPLITUDE_PX);
  assert.ok(MAX_AMPLITUDE_PX <= 1.5);
});

test("suwak na zero wyłącza ruch mimo pełnego rozpadu", () => {
  assert.equal(amplitudeFor({ dread: 1, textEffects: 0, proximity: 1 }), 0);
});

test("prefers-reduced-motion zeruje ruch niezależnie od suwaka", () => {
  assert.equal(amplitudeFor({ dread: 1, textEffects: 1, proximity: 1, reducedMotion: true }), 0);
});

test("brak DOM nie wywraca modułu", async () => {
  const { createEffects } = await import("../src/ui/effects.js");
  const effects = createEffects({ root: null, doc: null });
  effects.observe(null);
  effects.flash(null);
  effects.destroy();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Oczekiwane: `Cannot find module '../src/ui/effects.js'`.

- [ ] **Step 3: Write implementation**

Utwórz `src/ui/effects.js`:

```js
// Warstwa efektów: jedna pętla rAF, jeden IntersectionObserver, jeden filtr SVG.
// Elementy poza widokiem są wypisywane z pętli i mają zdejmowany filtr.

export const MAX_AMPLITUDE_PX = 1.5;
const FILTER = "url(#vhs-static)";
const PROXIMITY_RADIUS_PX = 220;
const FLASH_MS = 400;

// Czysta funkcja — cała logika natężenia w jednym miejscu, testowalna bez DOM.
export function amplitudeFor({ dread = 0, textEffects = 0, proximity = 0, reducedMotion = false } = {}) {
  if (reducedMotion) return 0;
  const clamp = (value) => Math.max(0, Math.min(1, Number(value) || 0));
  const base = clamp(dread) * clamp(textEffects);
  if (base === 0) return 0;
  // Bliskość wskaźnika podwaja amplitudę, nie tworzy jej.
  return Math.min(MAX_AMPLITUDE_PX, base * (1 + clamp(proximity)) * (MAX_AMPLITUDE_PX / 2));
}

function readNumber(doc, name) {
  try {
    const raw = doc.defaultView?.getComputedStyle(doc.documentElement).getPropertyValue(name);
    return Number(raw) || 0;
  } catch {
    return 0;
  }
}

export function createEffects({ root, doc = root?.ownerDocument ?? null, matchMedia = globalThis.matchMedia } = {}) {
  const noop = { observe() {}, flash() {}, destroy() {} };
  if (!root || !doc || typeof globalThis.requestAnimationFrame !== "function") return noop;

  const active = new Set();
  const pointer = { x: 0, y: 0, seen: false };
  let running = false;
  let frameId = 0;
  const motionQuery = matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;

  const observer = typeof globalThis.IntersectionObserver === "function"
    ? new globalThis.IntersectionObserver((records) => {
        for (const record of records) {
          if (record.isIntersecting) active.add(record.target);
          else {
            active.delete(record.target);
            record.target.style.removeProperty("filter");
            record.target.style.removeProperty("--glitch");
          }
        }
        start();
      })
    : null;

  function onPointer(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.seen = true;
    start();
  }

  function proximityTo(element) {
    if (!pointer.seen) return 0;
    const box = element.getBoundingClientRect();
    const dx = Math.max(box.left - pointer.x, 0, pointer.x - box.right);
    const dy = Math.max(box.top - pointer.y, 0, pointer.y - box.bottom);
    const distance = Math.hypot(dx, dy);
    return Math.max(0, 1 - distance / PROXIMITY_RADIUS_PX);
  }

  function tick() {
    frameId = 0;
    running = false;

    const dread = readNumber(doc, "--dread");
    const textEffects = readNumber(doc, "--text-effects");
    const reducedMotion = Boolean(motionQuery?.matches);

    if (pointer.seen) {
      const box = root.getBoundingClientRect();
      root.style.setProperty("--px", String((pointer.x - box.left) / (box.width || 1)));
      root.style.setProperty("--py", String((pointer.y - box.top) / (box.height || 1)));
    }

    let peak = 0;
    for (const element of active) {
      const amplitude = amplitudeFor({ dread, textEffects, proximity: proximityTo(element), reducedMotion });
      peak = Math.max(peak, amplitude);
      // Poniżej progu zdejmujemy filtr, a nie wyciszamy: zero kosztu renderowania.
      if (amplitude < 0.05) {
        element.style.removeProperty("filter");
        element.style.removeProperty("--glitch");
        continue;
      }
      element.style.setProperty("--glitch", amplitude.toFixed(3));
      element.style.filter = FILTER;
    }

    const displacement = doc.querySelector("#vhs-static feDisplacementMap");
    if (displacement) displacement.setAttribute("scale", peak.toFixed(3));

    // Pętla żyje tylko wtedy, gdy naprawdę coś się rusza. Przy zerowej
    // amplitudzie budzi ją dopiero ruch wskaźnika albo nowy wpis.
    if (peak > 0) start();
  }

  function start() {
    if (running || frameId) return;
    running = true;
    frameId = globalThis.requestAnimationFrame(tick);
  }

  root.addEventListener("pointermove", onPointer, { passive: true });
  root.addEventListener("pointerdown", onPointer, { passive: true });

  return {
    observe(block) {
      if (!block?.querySelectorAll) return;
      for (const element of block.querySelectorAll("[data-effect]")) {
        // Bez IntersectionObserver rezygnujemy z optymalizacji, nie z efektu.
        if (observer) observer.observe(element);
        else active.add(element);
      }
      start();
    },

    // Jednorazowe zaburzenie trackingu na świeżo dołożonym wpisie.
    flash(block) {
      if (!block?.classList) return;
      block.classList.add("tracking-flash");
      globalThis.setTimeout?.(() => block.classList.remove("tracking-flash"), FLASH_MS);
    },

    destroy() {
      root.removeEventListener("pointermove", onPointer);
      root.removeEventListener("pointerdown", onPointer);
      observer?.disconnect();
      if (frameId) globalThis.cancelAnimationFrame?.(frameId);
      active.clear();
    },
  };
}
```

W `index.html`, bezpośrednio po `<div class="tape-noise" aria-hidden="true"></div>`, wstaw:

```html
    <svg class="filter-defs" aria-hidden="true" focusable="false" width="0" height="0">
      <filter id="vhs-static" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.9 0.04" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
```

W `style.css`, na końcu sekcji dodanej w Task 4:

```css
.filter-defs {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
}

/* Rozszczepienie RGB skalowane amplitudą liczoną w effects.js. */
[data-effect="static"] {
  --glitch: 0;
  text-shadow:
    calc(var(--glitch) * -1px) 0 oklch(60% 0.14 20 / 0.5),
    calc(var(--glitch) * 1px) 0 oklch(65% 0.1 200 / 0.45);
}

/* Pas błędu trackingu podąża za wskaźnikiem po bieżącym wpisie. */
.journal-entry:not(.past) {
  --px: 0.5;
  --py: 0.5;
}

.journal-entry:not(.past)::after {
  content: "";
  position: absolute;
  z-index: 1;
  right: 0;
  left: 0;
  height: 2.2rem;
  top: calc(var(--py, 0.5) * 100%);
  transform: translateY(-50%);
  opacity: calc(var(--dread) * var(--text-effects) * 0.5);
  background: linear-gradient(
    180deg,
    transparent,
    oklch(70% 0.05 200 / 0.12) 45%,
    oklch(65% 0.09 25 / 0.1) 55%,
    transparent
  );
  mix-blend-mode: screen;
  pointer-events: none;
}

@keyframes tracking-flash {
  0% { transform: translateX(0); filter: none; }
  18% { transform: translateX(-2px); filter: blur(0.6px); }
  42% { transform: translateX(3px); filter: none; }
  70% { transform: translateX(-1px); filter: blur(0.3px); }
  100% { transform: translateX(0); filter: none; }
}

.journal-entry.tracking-flash {
  animation: tracking-flash 400ms steps(12, end) 1;
}

@media (prefers-reduced-motion: reduce) {
  .journal-entry.tracking-flash { animation: none; }
  .journal-entry:not(.past)::after { display: none; }
  .t-wrong { filter: none; }
}
```

W `src/ui/main.js` dodaj import obok pozostałych:

```js
import { createEffects } from "./effects.js";
```

zadeklaruj zmienną obok `let audio;`:

```js
let effects = null;
```

w `bootstrap()`, po `audio = createAudio(media, settings);`:

```js
  effects = createEffects({ root: dom.journal });
```

w `advance()`, po `renderCharacterSheet();` i `setDread(frame.state);`:

```js
  effects?.observe(block);
  effects?.flash(block);
```

w `redraw()`, po pętli `history.forEach(...)`:

```js
  for (const block of dom.journal.children) effects?.observe(block);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Oczekiwane: wszystkie zielone, w tym `effects.test.js`.

- [ ] **Step 5: Sprawdź w przeglądarce**

Uruchom serwer i otwórz grę. Ponieważ dane nie mają jeszcze znaczników, weryfikujesz w konsoli. Zacznij grę, potem:

```js
document.documentElement.style.setProperty("--dread", "0.9");
document.querySelector("#journal p").innerHTML =
  'Coś <span class="t-horror" data-effect="static">tu jest</span>.';
```

Odśwież obserwację, przesuwając mysz nad paragrafem. Oczekiwane: fragment „tu jest" lekko faluje i ma rozszczepiony kontur, silniej gdy kursor jest blisko; pas trackingu podąża za kursorem w pionie. Ustaw suwak „Efekty tekstu" na zero — ruch ma zniknąć, barwa zostać.

Sprawdź jeszcze wydajność: w zakładce Performance nagraj 5 sekund ruchu myszą. Oczekiwane: brak spadków poniżej 50 fps na laptopie.

- [ ] **Step 6: Commit**

```bash
git add AloneAgainstTheStatic/src/ui/effects.js AloneAgainstTheStatic/index.html AloneAgainstTheStatic/style.css AloneAgainstTheStatic/src/ui/main.js AloneAgainstTheStatic/test/effects.test.js
git commit -m "Warstwa efektów: statyka SVG, pas trackingu i glitch wpisu"
```

---

### Task 7: Walidacja znaczników

**Files:**
- Modify: `AloneAgainstTheStatic/tools/validate.mjs` — import na górze pliku oraz nowa sekcja kontroli w funkcji `validate()`, przed `return { errors, warnings }`
- Test: `AloneAgainstTheStatic/test/data.test.js` (dopisanie na końcu)

**Interfaces:**
- Consumes: `inspectMarkup`, `tagCounts` z Task 1; `isKnownTag` z Task 2.
- Produces: nic dla dalszych zadań.

- [ ] **Step 1: Write the failing test**

Dopisz na końcu `test/data.test.js`:

```js
test("niedomknięty znacznik jest błędem", () => {
  const entries = { 1: { id: 1, text: ["e1.p1"], end: true } };
  const out = validate(storyOf(entries), { "e1.p1": "[horror]Coś tu jest." }, {});
  assert.ok(out.errors.some((error) => error.includes("horror")));
});

test("zamknięcie bez otwarcia jest błędem", () => {
  const entries = { 1: { id: 1, text: ["e1.p1"], end: true } };
  const out = validate(storyOf(entries), { "e1.p1": "Coś tu jest.[/horror]" }, {});
  assert.ok(out.errors.some((error) => error.includes("horror")));
});

test("nieznany znacznik jest tylko ostrzeżeniem", () => {
  const entries = { 1: { id: 1, text: ["e1.p1"], end: true } };
  const out = validate(storyOf(entries), { "e1.p1": "[dream]sen[/dream]" }, {});
  assert.equal(out.errors.length, 0);
  assert.ok(out.warnings.some((warning) => warning.includes("dream")));
});

test("zgubiony znacznik w tłumaczeniu jest ostrzeżeniem", () => {
  const entries = { 1: { id: 1, text: ["e1.p1"], end: true } };
  const out = validate(
    storyOf(entries),
    { "e1.p1": "[charlie]„A.”[/charlie]" },
    { "e1.p1": "„A.”" },
  );
  assert.ok(out.warnings.some((warning) => warning.includes("e1.p1") && warning.includes("charlie")));
});

test("puste tłumaczenie nie jest porównywane ze znacznikami oryginału", () => {
  const entries = { 1: { id: 1, text: ["e1.p1"], end: true } };
  const out = validate(storyOf(entries), { "e1.p1": "[charlie]„A.”[/charlie]" }, { "e1.p1": "  " });
  assert.ok(!out.warnings.some((warning) => warning.includes("charlie")));
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Oczekiwane: `AssertionError` — walidator nie zgłasza nic o znacznikach.

- [ ] **Step 3: Write implementation**

W `tools/validate.mjs` dodaj na górze, po istniejących importach:

```js
import { inspectMarkup, tagCounts } from "../src/ui/markup.js";
import { isKnownTag } from "../src/ui/voices.js";
```

W funkcji `validate(story, en, pl)`, bezpośrednio przed `return { errors, warnings };`, wstaw:

```js
  // --- Znaczniki stylu tekstu ---
  const checkMarkup = (locale, texts) => {
    for (const [key, value] of Object.entries(texts ?? {})) {
      // Klucze __en.* to podgląd oryginału w pliku polskim, nie treść gry.
      if (key.startsWith("__en.") || typeof value !== "string") continue;

      const { unclosed, stray } = inspectMarkup(value);
      for (const name of unclosed) error(`${locale} ${key}: niedomknięty znacznik [${name}]`);
      for (const name of stray) error(`${locale} ${key}: zamknięcie [/${name}] bez otwarcia`);

      for (const name of Object.keys(tagCounts(value))) {
        if (!isKnownTag(name)) warning(`${locale} ${key}: nieznany znacznik [${name}]`);
      }
    }
  };

  checkMarkup("en", en);
  checkMarkup("pl", pl);

  // Znacznik zgubiony przy tłumaczeniu — najczęstszy błąd przepisywania zdania.
  for (const [key, source] of Object.entries(en ?? {})) {
    const target = pl?.[key];
    if (typeof source !== "string" || typeof target !== "string" || target.trim() === "") continue;

    const here = tagCounts(source);
    const there = tagCounts(target);
    for (const name of new Set([...Object.keys(here), ...Object.keys(there)])) {
      if ((here[name] ?? 0) !== (there[name] ?? 0)) {
        warning(`${key}: znacznik [${name}] występuje ${here[name] ?? 0}× w en i ${there[name] ?? 0}× w pl`);
      }
    }
  }
```

Pomocniki `error(message)` i `warning(message)` są już zdefiniowane w `validate()` (linie 105–110) i same odsiewają duplikaty — używasz ich bez zmian.

- [ ] **Step 4: Run tests and validator**

```bash
npm test && npm run validate
```

Oczekiwane: testy zielone; walidator zgłasza **0 błędów** na obecnych danych (nie mają jeszcze znaczników) i tyle ostrzeżeń, ile przed zmianą.

- [ ] **Step 5: Commit**

```bash
git add AloneAgainstTheStatic/tools/validate.mjs AloneAgainstTheStatic/test/data.test.js
git commit -m "Walidacja znaczników stylu w plikach tekstowych"
```

---

### Task 8: Narzędzia autorskie

**Files:**
- Create: `AloneAgainstTheStatic/tools/tag-dialogue.mjs`
- Modify: `AloneAgainstTheStatic/tools/dev.html` — nowa kolumna w tabeli paragrafów
- Modify: `AloneAgainstTheStatic/package.json` — skrypt `tag`
- Test: `AloneAgainstTheStatic/test/tag-dialogue.test.js`

**Interfaces:**
- Consumes: `VOICE_NAMES` i `TAGS` z Task 2; `tagCounts` z Task 1.
- Produces:
  - `suggestTags(text: string, names: string[]) => string` — czysta funkcja, wstawia znaczniki `voice` wokół kwestii

- [ ] **Step 1: Write the failing test**

Utwórz `test/tag-dialogue.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { suggestTags } from "../tools/tag-dialogue.mjs";
import { stripMarkup } from "../src/ui/markup.js";

const NAMES = ["charlie", "alex", "mark", "julie", "tom"];

test("rozpoznaje mówiącego z atrybucji po kwestii", () => {
  const source = "„Cholera!” — warczy Charlie, składając mapę.";
  assert.equal(suggestTags(source, NAMES), "[charlie]„Cholera!”[/charlie] — warczy Charlie, składając mapę.");
});

test("działa na angielskich cudzysłowach", () => {
  const source = '"Dammit!" Charlie growls.';
  assert.equal(suggestTags(source, NAMES), '[charlie]"Dammit!"[/charlie] Charlie growls.');
});

test("kwestia bez rozpoznanej atrybucji zostaje nietknięta", () => {
  const source = "„Nie wiem” — mówisz cicho.";
  assert.equal(suggestTags(source, NAMES), source);
});

test("nie tyka tekstu, który ma już znaczniki", () => {
  const source = "[charlie]„Cholera!”[/charlie] — warczy Charlie.";
  assert.equal(suggestTags(source, NAMES), source);
});

test("propozycja nigdy nie zmienia treści", () => {
  const source = "„A.” — mówi Charlie. „B.” — odpowiada Alex.";
  assert.equal(stripMarkup(suggestTags(source, NAMES)), source);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Oczekiwane: `Cannot find module '../tools/tag-dialogue.mjs'`.

- [ ] **Step 3: Write implementation**

Utwórz `tools/tag-dialogue.mjs`:

```js
// Pomoc przy oznaczaniu dialogów, nie automat. Domyślnie wypisuje propozycje
// do zatwierdzenia; --write zapisuje je do plików. Znaczników tonu
// ([horror], [whisper]) nie zgaduje — to decyzja autorska.

import { readFileSync, writeFileSync } from "node:fs";
import { tagCounts } from "../src/ui/markup.js";
import { VOICE_NAMES, TAGS } from "../src/ui/voices.js";

// Ile znaków po zamknięciu cudzysłowu przeszukujemy w poszukiwaniu imienia.
const ATTRIBUTION_WINDOW = 60;
const QUOTE = /„[^„”]*”|"[^"]*"/g;

const NAMED = VOICE_NAMES.filter((name) => TAGS[name].label);

export function suggestTags(text, names = NAMED) {
  const source = String(text ?? "");
  // Tekst już oznaczony zostawiamy w spokoju — autor tam był.
  if (Object.keys(tagCounts(source)).length > 0) return source;

  let result = "";
  let cursor = 0;

  for (const match of source.matchAll(QUOTE)) {
    const start = match.index;
    const end = start + match[0].length;
    const window = source.slice(end, end + ATTRIBUTION_WINDOW);
    const name = names.find((candidate) => {
      const label = TAGS[candidate].label;
      return label ? new RegExp(`\\b${label}\\b`).test(window) : false;
    });

    result += source.slice(cursor, start);
    result += name ? `[${name}]${match[0]}[/${name}]` : match[0];
    cursor = end;
  }

  return result + source.slice(cursor);
}

function run() {
  const write = process.argv.includes("--write");
  const files = ["text.en.json", "text.pl.json"];
  let changes = 0;

  for (const file of files) {
    const url = new URL(`../data/${file}`, import.meta.url);
    const data = JSON.parse(readFileSync(url, "utf8"));
    let touched = false;

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("__en.") || typeof value !== "string") continue;
      const suggestion = suggestTags(value);
      if (suggestion === value) continue;

      changes += 1;
      touched = true;
      console.log(`\n${file} → ${key}`);
      console.log(`- ${value}`);
      console.log(`+ ${suggestion}`);
      if (write) data[key] = suggestion;
    }

    if (write && touched) writeFileSync(url, `${JSON.stringify(data, null, 2)}\n`);
  }

  console.log(`\n${changes} propozycji.`);
  if (!write) console.log("Uruchom z --write, żeby je zapisać.");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) run();
```

W `package.json`, w `scripts`, po `"validate"`:

```json
    "tag": "node tools/tag-dialogue.mjs"
```

W `tools/dev.html`, w wierszu 19, w nagłówku tabeli, po `<th>PL</th>` wstaw `<th>Znaczniki</th>`.

W bloku `<script type="module">` dodaj import jako pierwszą linię po otwarciu skryptu:

```js
      import { tagCounts } from "../src/ui/markup.js";
```

W pętli `for (const id of ids)`, po linii `const hasImage = …`, dodaj:

```js
        const tags = [...new Set(keys.flatMap((k) => Object.keys(tagCounts(pl[k] || en[k] || ""))))];
```

i w szablonie `row.innerHTML`, po komórce z postępem tłumaczenia (`<td>${done === keys.length ? …}</td>`), wstaw:

```js
          <td>${tags.join(" ") || "<span class='warn'>—</span>"}</td>
```

`dev.html` używa `innerHTML` z funkcją `escape()` — to istniejąca konwencja tego narzędzia i wyjątek od zasady obowiązującej w kodzie gry. Nazwy znaczników pochodzą z rejestru, nie z danych, więc nie wymagają escapowania.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Oczekiwane: wszystkie zielone.

- [ ] **Step 5: Sprawdź działanie narzędzia na sucho**

```bash
npm run tag
```

Oczekiwane: lista propozycji z diffem, zakończona liczbą i zdaniem „Uruchom z --write". **Pliki nie mogą się zmienić** — sprawdź:

```bash
git status --short AloneAgainstTheStatic/data/
```

Oczekiwane: pusty wynik.

- [ ] **Step 6: Commit**

```bash
git add AloneAgainstTheStatic/tools/tag-dialogue.mjs AloneAgainstTheStatic/tools/dev.html AloneAgainstTheStatic/package.json AloneAgainstTheStatic/test/tag-dialogue.test.js
git commit -m "Narzędzie proponujące znaczniki dialogów"
```

---

### Task 9: Migracja tekstów i dokumentacja

**Files:**
- Modify: `AloneAgainstTheStatic/data/text.en.json`, `AloneAgainstTheStatic/data/text.pl.json`
- Modify: `AloneAgainstTheStatic/README.md` — nowa sekcja przed „Media"
- Modify: `AloneAgainstTheStatic/docs/tlumaczenie.md` — akapit o znacznikach

**Interfaces:**
- Consumes: wszystko z zadań 1–8.
- Produces: oznaczone dane wejściowe gry.

To zadanie jest w części autorskie: znaczniki `voice` wstawia narzędzie, znaczniki `tone` wstawia autor. Wykonawca automatyczny robi kroki 1–2 i 4–6; krok 3 zostawia autorowi do decyzji.

- [ ] **Step 1: Zapisz propozycje znaczników głosów**

```bash
npm run tag -- --write
git diff --stat AloneAgainstTheStatic/data/
```

- [ ] **Step 2: Sprawdź, że treść się nie zmieniła**

```bash
npm test && npm run validate
```

Oczekiwane: test inwariantu niezmienności treści zielony, walidator z zerem błędów. Jeśli inwariant padnie, narzędzie uszkodziło tekst — cofnij `git checkout AloneAgainstTheStatic/data/` i zgłoś to zamiast poprawiać dane ręcznie.

- [ ] **Step 3: Przejrzyj propozycje i dopisz tony (autor)**

Przejrzyj diff. Popraw błędne przypisania mówiącego. Kwestie bohatera oznacz `[you]`, kwestie postaci nienazwanych `[voice]`. Dopisz `[horror]`, `[whisper]`, `[shout]`, `[thought]`, `[radio]`, `[sign]`, `[wrong]` tam, gdzie mają sens — narzędzie ich nie zgaduje celowo.

Po każdej partii zmian:

```bash
npm run validate
```

- [ ] **Step 4: Sprawdź w przeglądarce**

Uruchom serwer i przejdź pierwsze kilkanaście paragrafów obiema postaciami. Sprawdź: czy kwestie mają właściwe barwy, czy akapity czysto dialogowe dostają układ blokowy z etykietą, czy zaznaczenie tekstu myszą kopiuje czysty tekst bez nawiasów.

- [ ] **Step 5: Uzupełnij dokumentację**

W `README.md`, przed sekcją „Media", dodaj:

```markdown
## Znaczniki stylu tekstu

Fragmenty tekstu można oznaczać znacznikami `[tag]…[/tag]`, które nadają im
wygląd i efekty. Głosy: `[charlie]` `[alex]` `[mark]` `[julie]` `[tom]`
`[you]` `[voice]`. Tony: `[horror]` `[whisper]` `[shout]` `[thought]`
`[radio]` `[sign]` `[wrong]`. Opis narracyjny nie ma znacznika — jest domyślny.

Znaczniki zagnieżdżają się. `[[` to literalny nawias kwadratowy.

Akapit będący w całości jedną kwestią dostaje układ scenariuszowy z kreską
i nazwą mówiącego; kwestia w środku opisu zostaje inline.

Nowy efekt dodajesz wpisem w `src/ui/voices.js` i regułą w `style.css`.
Nieznany znacznik jest ostrzeżeniem walidatora, a nie błędem — możesz go
wpisać, zanim powstanie implementacja.

```bash
npm run tag           # propozycje znaczników dialogów, bez zapisu
npm run tag -- --write
```

Natężenie efektów rośnie wraz ze spadkiem Poczytalności i jest sterowane
suwakiem **Efekty tekstu** w ustawieniach. `prefers-reduced-motion` wyłącza
ruch automatycznie.
```

W `docs/tlumaczenie.md` dopisz akapit: znaczniki przenosi się do tłumaczenia bez zmian, a walidator zgłasza ostrzeżenie, gdy zestaw znaczników w PL różni się od EN.

- [ ] **Step 6: Commit**

```bash
git add AloneAgainstTheStatic/data/ AloneAgainstTheStatic/README.md AloneAgainstTheStatic/docs/tlumaczenie.md
git commit -m "Oznaczenie dialogów w tekstach i dokumentacja znaczników"
```

---

## Kolejność i zależności

Zadania 1 → 2 → 3 muszą iść po kolei: parser, rejestr, renderer. Zadanie 4 (CSS)
wymaga klas z zadania 3. Zadanie 5 wymaga tokenów z zadania 4. Zadanie 6 wymaga
zadań 3, 4 i 5. Zadania 7 i 8 wymagają tylko 1 i 2 — można je zrobić równolegle
z 4–6. Zadanie 9 jest ostatnie.

Po zadaniu 3 gra działa i wygląda dokładnie jak przed zmianą; to celowe.
Widoczna różnica pojawia się dopiero w zadaniu 9, gdy dane dostają znaczniki.
