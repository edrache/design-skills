# Alone Against the Static — plan implementacji (pionowy plaster)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grywalny fragment przeglądarkowej wersji *Alone Against the Static* — pełny silnik Call of Cthulhu 7e, interfejs w stylu VHS, dane dla paragrafów 1–30, dwa języki i miejsce na media.

**Architecture:** Statyczna aplikacja bez bundlera i backendu. Silnik to cztery moduły ESM bez dostępu do DOM (`dice`, `state`, `rules`, `runner`), testowane przez `node --test`. Dane leżą w JSON-ach: `story.json` trzyma mechanikę i klucze tekstów, `text.*.json` same teksty — dzięki temu tłumaczenie nie dotyka logiki. Warstwa UI tylko rysuje zdarzenia zwrócone przez silnik i oddaje mu decyzje gracza.

**Tech Stack:** Vanilla JavaScript (moduły ESM), CSS bez frameworka, `node --test` (Node 24), Python 3 z PyMuPDF (`.venv/bin/python3`) do jednorazowej ekstrakcji z PDF.

## Global Constraints

- Katalog projektu: `AloneAgainstTheStatic/` w katalogu głównym repozytorium.
- Bez bundlera, bez frameworka, bez zależności npm w kodzie działającym w przeglądarce.
- Wszystkie moduły silnika (`src/engine/*.js`) muszą działać w Node bez DOM i bez `window`.
- Interfejs użytkownika i wszystkie komentarze w kodzie po polsku; klucze danych, nazwy funkcji i identyfikatory po angielsku.
- Flagi log sheeta zapisywane jako `snake_case` z angielskiej nazwy (`Touched by Cold` → `touched_by_cold`).
- Klucze tekstów: `e<id>.p<n>` dla akapitów, `e<id>.c<n>` dla wyborów, `e<id>.r<n>` dla opisów rzutów.
- Numery paragrafów systemowych: 0 HP → 324, major wound → 325, indefinite insanity → 328, bout of madness → 329, 0 SAN → 334, bouts → 330–333.
- Kolejność rozstrzygania progów: obrażenia przed Sanity; 324 przed 325; 334 przed 328 i 329.
- Serwowanie lokalnie: `python3 -m http.server 8080` z katalogu głównego repozytorium, gra pod `http://127.0.0.1:8080/AloneAgainstTheStatic/`.
- Każde zadanie kończy się commitem z komunikatem po polsku.

---

## Struktura plików

```
AloneAgainstTheStatic/
  package.json            {"type":"module"} — tylko po to, by node traktował .js jako ESM
  index.html              jedyna strona; ekrany przełączane w JS
  style.css               styl VHS, zmienne CSS, responsywność
  data/
    characters.json       Alex i Charlie
    story.json            struktura paragrafów + pole "extracted"
    text.en.json          teksty angielskie
    text.pl.json          teksty polskie (na start pusty obiekt)
    media.json            grafiki, lektor, muzyka scen
  src/
    engine/dice.js        rzuty d100, poziomy sukcesu, kości bonusowe i karne
    engine/state.js       stan gry, operacje niemutujące, serializacja
    engine/rules.js       progi HP/SAN, bouts of madness, paragrafy systemowe
    engine/runner.js      interpreter paragrafu (maszyna stanów Frame)
    ui/main.js            bootstrap, przełączanie ekranów
    ui/journal.js         renderowanie zdarzeń do dziennika
    ui/sheet.js           panel postaci i pełna karta
    ui/i18n.js            wyszukiwanie tekstów, przełącznik języka
    ui/audio.js           lektor i muzyka
    ui/settings.js        ustawienia w localStorage
    ui/save.js            autosave
  tools/
    extract.py            PyMuPDF → raw-entries.json
    build-story.mjs       raw-entries.json → story.json + text.en.json
    validate.mjs          walidacja danych i tłumaczeń
    dev.html              skok do dowolnego paragrafu
  test/
    dice.test.js  state.test.js  rules.test.js  runner.test.js  data.test.js
```

---

### Task 1: Szkielet projektu i moduł kości

**Files:**
- Create: `AloneAgainstTheStatic/package.json`
- Create: `AloneAgainstTheStatic/src/engine/dice.js`
- Test: `AloneAgainstTheStatic/test/dice.test.js`

**Interfaces:**
- Consumes: nic
- Produces: `successLevel(result, target) -> string`, `meetsDifficulty(level, difficulty) -> boolean`, `rollD100(rng, {dice}) -> {units, tens, candidates, result}`, `skillCheck(rng, target, {dice, difficulty}) -> {units, tens, candidates, result, target, difficulty, level, success}`, `sequenceRng(values) -> function`, `rollDice(rng, notation) -> number`

- [ ] **Step 1: Utwórz `package.json`**

```json
{
  "name": "alone-against-the-static",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/*.test.js",
    "validate": "node tools/validate.mjs"
  }
}
```

- [ ] **Step 2: Napisz test poziomów sukcesu**

`AloneAgainstTheStatic/test/dice.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { successLevel, meetsDifficulty } from "../src/engine/dice.js";

test("poziomy sukcesu przy umiejętności 60", () => {
  assert.equal(successLevel(1, 60), "critical");
  assert.equal(successLevel(12, 60), "extreme");   // 1/5 z 60
  assert.equal(successLevel(13, 60), "hard");
  assert.equal(successLevel(30, 60), "hard");      // 1/2 z 60
  assert.equal(successLevel(31, 60), "regular");
  assert.equal(successLevel(60, 60), "regular");
  assert.equal(successLevel(61, 60), "fail");
  assert.equal(successLevel(100, 60), "fumble");
});

test("fumble od 96 przy umiejętności poniżej 50", () => {
  assert.equal(successLevel(96, 45), "fumble");
  assert.equal(successLevel(96, 50), "fail");
  assert.equal(successLevel(95, 45), "fail");
});

test("wymagany poziom trudności", () => {
  assert.equal(meetsDifficulty("regular", "regular"), true);
  assert.equal(meetsDifficulty("regular", "hard"), false);
  assert.equal(meetsDifficulty("hard", "hard"), true);
  assert.equal(meetsDifficulty("critical", "extreme"), true);
  assert.equal(meetsDifficulty("fail", "regular"), false);
  assert.equal(meetsDifficulty("fumble", "regular"), false);
});
```

- [ ] **Step 3: Uruchom test i potwierdź, że nie przechodzi**

Run: `cd AloneAgainstTheStatic && node --test test/dice.test.js`
Expected: FAIL — `Cannot find module '../src/engine/dice.js'`

- [ ] **Step 4: Zaimplementuj poziomy sukcesu**

`AloneAgainstTheStatic/src/engine/dice.js`:

```js
// Poziomy sukcesu w Call of Cthulhu 7e, od najgorszego do najlepszego.
const RANK = { fumble: 0, fail: 1, regular: 2, hard: 3, extreme: 4, critical: 5 };
const REQUIRED = { regular: 2, hard: 3, extreme: 4 };

export function successLevel(result, target) {
  if (result === 1) return "critical";
  if (result === 100 || (target < 50 && result >= 96)) return "fumble";
  if (result <= Math.floor(target / 5)) return "extreme";
  if (result <= Math.floor(target / 2)) return "hard";
  if (result <= target) return "regular";
  return "fail";
}

export function meetsDifficulty(level, difficulty = "regular") {
  return RANK[level] >= REQUIRED[difficulty];
}
```

- [ ] **Step 5: Uruchom test i potwierdź, że przechodzi**

Run: `node --test test/dice.test.js`
Expected: PASS — 3 testy

- [ ] **Step 6: Dopisz test rzutu d100 z kośćmi bonusowymi i karnymi**

Dopisz na końcu `test/dice.test.js`:

```js
import { rollD100, skillCheck, sequenceRng, rollDice } from "../src/engine/dice.js";

test("sequenceRng oddaje wartości po kolei", () => {
  const rng = sequenceRng([0.0, 0.55, 0.9]);
  assert.equal(rng(), 0.0);
  assert.equal(rng(), 0.55);
  assert.equal(rng(), 0.9);
});

test("zwykły rzut: dziesiątki i jednostki", () => {
  // 0.68 -> jednostka 6; 0.20 -> dziesiątki 20
  const rng = sequenceRng([0.68, 0.2]);
  const roll = rollD100(rng, {});
  assert.equal(roll.units, 6);
  assert.deepEqual(roll.tens, [20]);
  assert.equal(roll.result, 26);
});

test("dziesiątki 0 i jednostka 0 dają 100", () => {
  const roll = rollD100(sequenceRng([0.0, 0.0]), {});
  assert.equal(roll.result, 100);
});

test("dziesiątki 0 i jednostka 5 dają 5", () => {
  const roll = rollD100(sequenceRng([0.5, 0.0]), {});
  assert.equal(roll.result, 5);
});

test("kość bonusowa bierze niższy wynik", () => {
  // jednostka 4, dziesiątki 40 i 20 -> kandydaci 44 i 24
  const roll = rollD100(sequenceRng([0.4, 0.4, 0.2]), { dice: 1 });
  assert.deepEqual(roll.candidates, [44, 24]);
  assert.equal(roll.result, 24);
});

test("kość karna bierze wyższy wynik", () => {
  const roll = rollD100(sequenceRng([0.1, 0.2, 0.4]), { dice: -1 });
  assert.deepEqual(roll.candidates, [21, 41]);
  assert.equal(roll.result, 41);
});

test("skillCheck łączy rzut z progiem trudności", () => {
  const check = skillCheck(sequenceRng([0.8, 0.2]), 60, { difficulty: "hard" });
  assert.equal(check.result, 28);
  assert.equal(check.level, "hard");
  assert.equal(check.success, true);

  const miss = skillCheck(sequenceRng([0.5, 0.4]), 60, { difficulty: "hard" });
  assert.equal(miss.result, 45);
  assert.equal(miss.level, "regular");
  assert.equal(miss.success, false);
});

test("rollDice liczy notację kostkową", () => {
  assert.equal(rollDice(sequenceRng([0.5]), "1d6"), 4);
  assert.equal(rollDice(sequenceRng([0.0, 0.99]), "2d4"), 5);
  assert.equal(rollDice(sequenceRng([]), "3"), 3);
  assert.equal(rollDice(sequenceRng([0.5]), "1d6+2"), 6);
});
```

- [ ] **Step 7: Uruchom test i potwierdź, że nie przechodzi**

Run: `node --test test/dice.test.js`
Expected: FAIL — `rollD100 is not a function`

- [ ] **Step 8: Dopisz rzuty do `dice.js`**

Dopisz na końcu `src/engine/dice.js`:

```js
// Generator do testów: oddaje z góry ustaloną sekwencję, potem same zera.
export function sequenceRng(values) {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0);
}

function d10(rng) {
  return Math.floor(rng() * 10);
}

// Rzut procentowy. Kość jednostek losowana raz, kości dziesiątek tyle,
// ile wynika z liczby kości bonusowych (dice > 0) lub karnych (dice < 0).
export function rollD100(rng, { dice = 0 } = {}) {
  const units = d10(rng);
  const extra = Math.abs(dice);
  const tens = Array.from({ length: 1 + extra }, () => d10(rng) * 10);
  const candidates = tens.map((t) => (t === 0 && units === 0 ? 100 : t + units));
  let result = candidates[0];
  if (dice > 0) result = Math.min(...candidates);
  if (dice < 0) result = Math.max(...candidates);
  return { units, tens, candidates, result };
}

export function skillCheck(rng, target, { dice = 0, difficulty = "regular" } = {}) {
  const roll = rollD100(rng, { dice });
  const level = successLevel(roll.result, target);
  return { ...roll, target, difficulty, level, success: meetsDifficulty(level, difficulty) };
}

// Notacja typu "1d6", "2d4", "1d6+2" albo stała "3".
export function rollDice(rng, notation) {
  const match = /^(\d+)?(?:d(\d+))?(?:\+(\d+))?$/.exec(String(notation).trim().toLowerCase());
  if (!match) throw new Error(`Nieznana notacja kostkowa: ${notation}`);
  const [, countRaw, sidesRaw, bonusRaw] = match;
  const bonus = Number(bonusRaw ?? 0);
  if (!sidesRaw) return Number(countRaw ?? 0) + bonus;
  const count = Number(countRaw ?? 1);
  const sides = Number(sidesRaw);
  let total = 0;
  for (let i = 0; i < count; i += 1) total += Math.floor(rng() * sides) + 1;
  return total + bonus;
}
```

- [ ] **Step 9: Uruchom wszystkie testy i potwierdź, że przechodzą**

Run: `node --test test/*.test.js`
Expected: PASS — 11 testów

- [ ] **Step 10: Commit**

```bash
git add AloneAgainstTheStatic/package.json AloneAgainstTheStatic/src/engine/dice.js AloneAgainstTheStatic/test/dice.test.js
git commit -m "Szkielet projektu i moduł rzutów d100"
```

---

### Task 2: Karty postaci i stan gry

**Files:**
- Create: `AloneAgainstTheStatic/data/characters.json`
- Create: `AloneAgainstTheStatic/src/engine/state.js`
- Test: `AloneAgainstTheStatic/test/state.test.js`

**Interfaces:**
- Consumes: `rollDice`, `sequenceRng` z `dice.js`
- Produces: `createState(character, {rng}) -> State`, `skillValue(state, character, skill) -> number`, `penaltyFor(state, skill) -> number`, `hasFlag(state, flag) -> boolean`, `setFlag(state, flag) -> State`, `visit(state, id) -> State`, `visitCount(state, id) -> number`, `useChoice(state, id, index) -> State`, `isChoiceUsed(state, id, index) -> boolean`, `spendLuck(state, amount) -> State`, `addPenalty(state, skills) -> State`, `pushReturn(state, id) -> State`, `popReturn(state) -> {state, entryId}`, `serialize(state) -> object`, `deserialize(object) -> State`

- [ ] **Step 1: Utwórz `data/characters.json`**

Wartości przepisane z kart postaci z książki (strony 102 i 104).

```json
{
  "alex": {
    "id": "alex",
    "name": "Alex",
    "occupation": "Salesperson",
    "birthplace": "Deadwood, SD",
    "residence": "Pierre, SD",
    "characteristics": { "STR": 70, "CON": 60, "SIZ": 75, "DEX": 65, "APP": 60, "EDU": 65, "INT": 55, "POW": 50 },
    "hp": 13,
    "mp": 10,
    "san": 50,
    "move": 7,
    "build": 1,
    "damageBonus": "1d4",
    "skills": {
      "Credit Rating": 40,
      "Dodge": 32,
      "Drive Auto": 45,
      "Fighting (Brawl)": 55,
      "First Aid": 40,
      "Intimidate": 60,
      "Language (Own)": 65,
      "Listen": 50,
      "Natural World": 30,
      "Navigate": 40,
      "Persuade": 60,
      "Psychology": 45,
      "Spot Hidden": 35,
      "Stealth": 35
    },
    "story": {
      "en": "Alex has been with Charlie for almost five years. Charlie seems less and less happy. Charlie's brother Mark recommended going to his vacation cabin for some time alone. It worked for Mark and his wife Julie. Maybe it will work for Alex and Charlie too...",
      "pl": ""
    },
    "backstory": [
      { "label": "Personal Description", "en": "Rugged or scruffy, depending on how charitable you're feeling.", "pl": "" },
      { "label": "Traits", "en": "Hopeless romantic. Fiercely protective.", "pl": "" },
      { "label": "Ideology & Beliefs", "en": "I only believe in what I can see.", "pl": "" },
      { "label": "Significant People", "en": "Charlie despite everything...", "pl": "" },
      { "label": "Meaningful Locations", "en": "The restaurant Charlie booked for their first date.", "pl": "" },
      { "label": "Treasured Possessions", "en": "A love letter written by Charlie.", "pl": "" }
    ]
  },
  "charlie": {
    "id": "charlie",
    "name": "Charlie",
    "occupation": "Nurse",
    "birthplace": "Pierre, SD",
    "residence": "Pierre, SD",
    "characteristics": { "STR": 60, "CON": 70, "SIZ": 65, "DEX": 60, "APP": 75, "EDU": 70, "INT": 65, "POW": 60 },
    "hp": 13,
    "mp": 12,
    "san": 60,
    "move": 7,
    "build": 1,
    "damageBonus": "1d4",
    "skills": {
      "Credit Rating": 30,
      "Dodge": 30,
      "Fighting (Brawl)": 55,
      "First Aid": 70,
      "Intimidate": 45,
      "Language (Own)": 70,
      "Listen": 60,
      "Natural World": 40,
      "Navigate": 20,
      "Persuade": 50,
      "Psychology": 60,
      "Science (Biology)": 25,
      "Science (Chemistry)": 25,
      "Spot Hidden": 65,
      "Stealth": 30
    },
    "story": {
      "en": "Charlie has been with Alex for almost five years. Their relationship has begun to feel very strained. Some time alone might help them patch things up, but honestly, it doesn't feel likely...",
      "pl": ""
    },
    "backstory": [
      { "label": "Traits", "en": "Forlorn and whimsical.", "pl": "" },
      { "label": "Ideology & Beliefs", "en": "Karmic justice.", "pl": "" },
      { "label": "Significant People", "en": "Alex, for better or for worse...", "pl": "" },
      { "label": "Meaningful Locations", "en": "A park bench across from Alex's old apartment where they first kissed.", "pl": "" },
      { "label": "Treasured Possessions", "en": "An inherited family engagement ring.", "pl": "" }
    ]
  }
}
```

Pola `story` i `backstory` mają wersje językowe wprost w tym pliku, a nie w `text.pl.json` — to kilka zdań na karcie postaci, nie treść scenariusza, więc nie ma sensu przepuszczać ich przez generator tłumaczeń.

- [ ] **Step 2: Napisz test stanu gry**

`AloneAgainstTheStatic/test/state.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sequenceRng } from "../src/engine/dice.js";
import {
  createState, skillValue, penaltyFor, hasFlag, setFlag, visit, visitCount,
  useChoice, isChoiceUsed, spendLuck, addPenalty, pushReturn, popReturn,
  serialize, deserialize,
} from "../src/engine/state.js";

const characters = JSON.parse(readFileSync(new URL("../data/characters.json", import.meta.url)));

test("nowy stan bierze wartości z karty postaci i losuje Luck", () => {
  // 3D6 = 4+4+4 = 12, razy 5 = 60
  const state = createState(characters.charlie, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  assert.equal(state.characterId, "charlie");
  assert.equal(state.hp, 13);
  assert.equal(state.maxHp, 13);
  assert.equal(state.san, 60);
  assert.equal(state.startingSan, 60);
  assert.equal(state.luck, 60);
  assert.equal(state.mp, 12);
});

test("wartość umiejętności bierze się z karty, cechy z charakterystyk", () => {
  const state = createState(characters.alex, { rng: sequenceRng([]) });
  assert.equal(skillValue(state, characters.alex, "Psychology"), 45);
  assert.equal(skillValue(state, characters.alex, "CON"), 60);
});

test("nieznana umiejętność zgłasza błąd zamiast po cichu zwracać zero", () => {
  const state = createState(characters.alex, { rng: sequenceRng([]) });
  assert.throws(() => skillValue(state, characters.alex, "Locksmith"), /Locksmith/);
});

test("operacje nie mutują poprzedniego stanu", () => {
  const before = createState(characters.alex, { rng: sequenceRng([]) });
  const after = setFlag(before, "touched_by_cold");
  assert.equal(hasFlag(before, "touched_by_cold"), false);
  assert.equal(hasFlag(after, "touched_by_cold"), true);
});

test("licznik wizyt w paragrafie", () => {
  let state = createState(characters.alex, { rng: sequenceRng([]) });
  assert.equal(visitCount(state, 5), 0);
  state = visit(state, 5);
  state = visit(state, 5);
  assert.equal(visitCount(state, 5), 2);
});

test("zużyte wybory są pamiętane per paragraf", () => {
  let state = createState(characters.alex, { rng: sequenceRng([]) });
  state = useChoice(state, 336, 1);
  assert.equal(isChoiceUsed(state, 336, 1), true);
  assert.equal(isChoiceUsed(state, 336, 0), false);
  assert.equal(isChoiceUsed(state, 337, 1), false);
});

test("wydawanie Luck nie schodzi poniżej zera", () => {
  const state = createState(characters.alex, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  assert.equal(spendLuck(state, 10).luck, 50);
  assert.throws(() => spendLuck(state, 61), /Luck/);
});

test("kary z bouts of madness kumulują się", () => {
  let state = createState(characters.alex, { rng: sequenceRng([]) });
  assert.equal(penaltyFor(state, "Listen"), 0);
  state = addPenalty(state, ["Listen"]);
  assert.equal(penaltyFor(state, "Listen"), -1);
  state = addPenalty(state, ["Listen", "Spot Hidden"]);
  assert.equal(penaltyFor(state, "Listen"), -2);
  assert.equal(penaltyFor(state, "Spot Hidden"), -1);
});

test("stos powrotu działa jak stos", () => {
  let state = createState(characters.alex, { rng: sequenceRng([]) });
  state = pushReturn(state, 77);
  state = pushReturn(state, 120);
  let out = popReturn(state);
  assert.equal(out.entryId, 120);
  out = popReturn(out.state);
  assert.equal(out.entryId, 77);
  assert.equal(popReturn(out.state).entryId, null);
});

test("serializacja i odczyt zachowują stan", () => {
  let state = createState(characters.charlie, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  state = setFlag(state, "arrival");
  state = visit(state, 5);
  state = addPenalty(state, ["Listen"]);
  const restored = deserialize(JSON.parse(JSON.stringify(serialize(state))));
  assert.deepEqual(restored, state);
});
```

- [ ] **Step 3: Uruchom test i potwierdź, że nie przechodzi**

Run: `node --test test/state.test.js`
Expected: FAIL — `Cannot find module '../src/engine/state.js'`

- [ ] **Step 4: Zaimplementuj `state.js`**

`AloneAgainstTheStatic/src/engine/state.js`:

```js
import { rollDice } from "./dice.js";

// Stan gry jest zwykłym obiektem — wszystkie operacje zwracają nowy,
// dzięki czemu testy porównują stany zamiast śledzić efekty uboczne.
export function createState(character, { rng }) {
  return {
    characterId: character.id,
    hp: character.hp,
    maxHp: character.hp,
    san: character.san,
    startingSan: character.san,
    mp: character.mp,
    luck: rollDice(rng, "3d6") * 5,
    flags: [],
    visits: {},
    usedChoices: {},
    penalties: {},
    returnStack: [],
    sanLostToday: 0,
    majorWound: false,
    indefinitelyInsane: false,
    visitedBouts: [],
  };
}

export function skillValue(state, character, skill) {
  if (skill in character.skills) return character.skills[skill];
  if (skill in character.characteristics) return character.characteristics[skill];
  if (skill === "Luck") return state.luck;
  if (skill === "Sanity") return state.san;
  throw new Error(`Postać ${character.id} nie ma umiejętności ani cechy: ${skill}`);
}

export function penaltyFor(state, skill) {
  return -(state.penalties[skill] ?? 0);
}

export function hasFlag(state, flag) {
  return state.flags.includes(flag);
}

export function setFlag(state, flag) {
  if (hasFlag(state, flag)) return state;
  return { ...state, flags: [...state.flags, flag] };
}

export function visit(state, id) {
  return { ...state, visits: { ...state.visits, [id]: visitCount(state, id) + 1 } };
}

export function visitCount(state, id) {
  return state.visits[id] ?? 0;
}

export function useChoice(state, id, index) {
  const used = state.usedChoices[id] ?? [];
  if (used.includes(index)) return state;
  return { ...state, usedChoices: { ...state.usedChoices, [id]: [...used, index] } };
}

export function isChoiceUsed(state, id, index) {
  return (state.usedChoices[id] ?? []).includes(index);
}

export function spendLuck(state, amount) {
  if (amount > state.luck) throw new Error(`Za mało punktów Luck: ${state.luck} < ${amount}`);
  return { ...state, luck: state.luck - amount };
}

export function addPenalty(state, skills) {
  const penalties = { ...state.penalties };
  for (const skill of skills) penalties[skill] = (penalties[skill] ?? 0) + 1;
  return { ...state, penalties };
}

// Stos powrotu trzyma pozycję w paragrafie, żeby powrót wznawiał go za krokiem,
// który spowodował skok, a nie od początku — inaczej krok utraty Sanity odpala się
// drugi raz i gracz wpada w pętlę.
export function pushReturn(state, entryId, cursor = 0) {
  return { ...state, returnStack: [...state.returnStack, { entryId, cursor }] };
}

export function popReturn(state) {
  if (state.returnStack.length === 0) return { state, entryId: null, cursor: 0 };
  const stack = [...state.returnStack];
  const top = stack.pop();
  return { state: { ...state, returnStack: stack }, entryId: top.entryId, cursor: top.cursor };
}

export function serialize(state) {
  return { ...state };
}

export function deserialize(raw) {
  return { ...raw };
}
```

- [ ] **Step 5: Uruchom testy i potwierdź, że przechodzą**

Run: `node --test test/*.test.js`
Expected: PASS — wszystkie testy z zadań 1 i 2

- [ ] **Step 6: Commit**

```bash
git add AloneAgainstTheStatic/data/characters.json AloneAgainstTheStatic/src/engine/state.js AloneAgainstTheStatic/test/state.test.js
git commit -m "Karty postaci Alex i Charlie oraz stan gry"
```

---

### Task 3: Progi zdrowia i zdrowia psychicznego

**Files:**
- Create: `AloneAgainstTheStatic/src/engine/rules.js`
- Test: `AloneAgainstTheStatic/test/rules.test.js`

**Interfaces:**
- Consumes: `state.js` (`setFlag`, `addPenalty`, `pushReturn`), `dice.js` (`rollDice`, `skillCheck`)
- Produces: stałe `SYSTEM_ENTRIES`, `BOUT_PENALTIES`; `applyDamage(state, amount) -> {state, redirect}`, `applySanLoss(state, amount, character, rng) -> {state, redirect}`, `resolveBout(state, character, rng) -> {state, redirect}`, `sanityCheck(state, character, rng, notation) -> {state, roll, lost, redirect}`

`redirect` to `null` albo numer paragrafu systemowego. Wywołujący ma obowiązek odłożyć bieżący paragraf przez `pushReturn` **przed** przejściem pod `redirect`.

- [ ] **Step 1: Napisz test progów**

`AloneAgainstTheStatic/test/rules.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sequenceRng } from "../src/engine/dice.js";
import { createState, penaltyFor } from "../src/engine/state.js";
import { applyDamage, applySanLoss, resolveBout, sanityCheck, SYSTEM_ENTRIES } from "../src/engine/rules.js";

const characters = JSON.parse(readFileSync(new URL("../data/characters.json", import.meta.url)));
const fresh = () => createState(characters.charlie, { rng: sequenceRng([0.5, 0.5, 0.5]) }); // Luck 60

test("drobne obrażenia nie uruchamiają niczego", () => {
  const out = applyDamage(fresh(), 3);
  assert.equal(out.state.hp, 10);
  assert.equal(out.redirect, null);
});

test("obrażenia równe połowie maksymalnych HP to major wound", () => {
  const out = applyDamage(fresh(), 7); // maxHp 13, połowa to 6.5
  assert.equal(out.state.hp, 6);
  assert.equal(out.state.majorWound, true);
  assert.equal(out.redirect, SYSTEM_ENTRIES.majorWound);
});

test("zero HP ma pierwszeństwo przed major wound", () => {
  const out = applyDamage(fresh(), 13);
  assert.equal(out.state.hp, 0);
  assert.equal(out.redirect, SYSTEM_ENTRIES.zeroHp);
});

test("HP nie schodzi poniżej zera", () => {
  assert.equal(applyDamage(fresh(), 40).state.hp, 0);
});

test("mała strata Sanity nie uruchamia niczego", () => {
  const out = applySanLoss(fresh(), 2, characters.charlie, sequenceRng([]));
  assert.equal(out.state.san, 58);
  assert.equal(out.redirect, null);
});

test("strata powyżej 5 punktów naraz uruchamia bout of madness", () => {
  const out = applySanLoss(fresh(), 6, characters.charlie, sequenceRng([]));
  assert.equal(out.redirect, SYSTEM_ENTRIES.bout);
});

test("strata powyżej jednej piątej SAN w ciągu dnia to indefinite insanity", () => {
  // Charlie ma SAN 60, jedna piąta to 12. Dwie straty po 5 to 10, trzecia po 5 daje 15.
  let state = fresh();
  for (const loss of [5, 5]) state = applySanLoss(state, loss, characters.charlie, sequenceRng([])).state;
  const out = applySanLoss(state, 5, characters.charlie, sequenceRng([]));
  assert.equal(out.redirect, SYSTEM_ENTRIES.indefinite);
  assert.equal(out.state.indefinitelyInsane, true);
});

test("zero Sanity ma pierwszeństwo przed wszystkim", () => {
  const out = applySanLoss(fresh(), 60, characters.charlie, sequenceRng([]));
  assert.equal(out.state.san, 0);
  assert.equal(out.redirect, SYSTEM_ENTRIES.zeroSan);
});

test("bout of madness: nieudany rzut INT wraca bez skutków", () => {
  // Charlie ma INT 65; rzut 90 to porażka
  const out = resolveBout(fresh(), characters.charlie, sequenceRng([0.0, 0.9]));
  assert.equal(out.redirect, null);
});

test("bout of madness: udany rzut INT losuje jeden z paragrafów 330-333", () => {
  // rzut INT 20 (sukces), potem 1D4 = 3 -> paragraf 332
  const out = resolveBout(fresh(), characters.charlie, sequenceRng([0.0, 0.2, 0.5]));
  assert.equal(out.redirect, 332);
  assert.deepEqual(out.state.visitedBouts, [332]);
});

test("bout of madness pomija już odwiedzony wynik", () => {
  let state = fresh();
  state = { ...state, visitedBouts: [332] };
  const out = resolveBout(state, characters.charlie, sequenceRng([0.0, 0.2, 0.5]));
  assert.notEqual(out.redirect, 332);
  assert.ok([330, 331, 333].includes(out.redirect));
});

test("wyczerpanie wszystkich czterech bouts prowadzi do 334", () => {
  let state = fresh();
  state = { ...state, visitedBouts: [330, 331, 332, 333] };
  const out = resolveBout(state, characters.charlie, sequenceRng([0.0, 0.2, 0.5]));
  assert.equal(out.redirect, SYSTEM_ENTRIES.zeroSan);
});

test("paragraf 333 nakłada trwałą karę na Listen", () => {
  const out = resolveBout(fresh(), characters.charlie, sequenceRng([0.0, 0.2, 0.99]));
  assert.equal(out.redirect, 333);
  assert.equal(penaltyFor(out.state, "Listen"), -1);
});

test("rzut Sanity 1/1D6: sukces zabiera jeden punkt", () => {
  // SAN 60, rzut 20 -> sukces, strata 1
  const out = sanityCheck(fresh(), characters.charlie, sequenceRng([0.0, 0.2]), "1/1d6");
  assert.equal(out.lost, 1);
  assert.equal(out.state.san, 59);
});

test("rzut Sanity 1/1D6: porażka losuje z 1D6", () => {
  // rzut 90 -> porażka; 1D6 przy 0.5 to 4
  const out = sanityCheck(fresh(), characters.charlie, sequenceRng([0.0, 0.9, 0.5]), "1/1d6");
  assert.equal(out.lost, 4);
  assert.equal(out.state.san, 56);
});
```

- [ ] **Step 2: Uruchom test i potwierdź, że nie przechodzi**

Run: `node --test test/rules.test.js`
Expected: FAIL — `Cannot find module '../src/engine/rules.js'`

- [ ] **Step 3: Zaimplementuj `rules.js`**

`AloneAgainstTheStatic/src/engine/rules.js`:

```js
import { rollDice, skillCheck } from "./dice.js";
import { addPenalty, skillValue } from "./state.js";

export const SYSTEM_ENTRIES = {
  zeroHp: 324,
  majorWound: 325,
  indefinite: 328,
  bout: 329,
  zeroSan: 334,
};

// Trwałe kary nakładane przez paragrafy 330-333.
export const BOUT_PENALTIES = {
  330: ["Fighting (Brawl)"],
  331: ["Spot Hidden"],
  332: ["Persuade", "Intimidate"],
  333: ["Listen"],
};

const BOUT_ENTRIES = [330, 331, 332, 333];

export function applyDamage(state, amount) {
  const hp = Math.max(0, state.hp - amount);
  const major = amount >= state.maxHp / 2;
  const next = { ...state, hp, majorWound: state.majorWound || major };
  // Zero HP ma pierwszeństwo przed major wound.
  if (hp === 0) return { state: next, redirect: SYSTEM_ENTRIES.zeroHp };
  if (major) return { state: next, redirect: SYSTEM_ENTRIES.majorWound };
  return { state: next, redirect: null };
}

export function applySanLoss(state, amount, character, rng) {
  const san = Math.max(0, state.san - amount);
  const sanLostToday = state.sanLostToday + Math.min(amount, state.san);
  const next = { ...state, san, sanLostToday };

  // Zero Sanity unieważnia indefinite insanity i bout of madness.
  if (san === 0) return { state: next, redirect: SYSTEM_ENTRIES.zeroSan };

  if (sanLostToday > Math.floor(state.startingSan / 5) && !state.indefinitelyInsane) {
    return { state: { ...next, indefinitelyInsane: true }, redirect: SYSTEM_ENTRIES.indefinite };
  }
  if (amount > 5) return { state: next, redirect: SYSTEM_ENTRIES.bout };
  if (state.indefinitelyInsane) return { state: next, redirect: SYSTEM_ENTRIES.bout };
  return { state: next, redirect: null };
}

// Paragraf 329. Nieudany rzut INT oznacza, że umysł zamyka się na grozę.
export function resolveBout(state, character, rng) {
  const check = skillCheck(rng, skillValue(state, character, "INT"));
  if (!check.success) return { state, redirect: null, check };

  const remaining = BOUT_ENTRIES.filter((id) => !state.visitedBouts.includes(id));
  if (remaining.length === 0) return { state, redirect: SYSTEM_ENTRIES.zeroSan, check };

  const rolled = BOUT_ENTRIES[rollDice(rng, "1d4") - 1];
  const target = remaining.includes(rolled) ? rolled : remaining[0];
  const next = addPenalty(
    { ...state, visitedBouts: [...state.visitedBouts, target] },
    BOUT_PENALTIES[target],
  );
  return { state: next, redirect: target, check };
}

// Notacja "X/Y": X przy udanym rzucie przeciw Sanity, Y przy nieudanym.
export function sanityCheck(state, character, rng, notation) {
  const [onSuccess, onFail] = String(notation).split("/");
  const check = skillCheck(rng, state.san);
  const lost = rollDice(rng, check.success ? onSuccess : onFail);
  const outcome = applySanLoss(state, lost, character, rng);
  return { state: outcome.state, redirect: outcome.redirect, roll: check, lost };
}
```

- [ ] **Step 4: Uruchom testy i potwierdź, że przechodzą**

Run: `node --test test/*.test.js`
Expected: PASS — wszystkie testy z zadań 1–3

- [ ] **Step 5: Commit**

```bash
git add AloneAgainstTheStatic/src/engine/rules.js AloneAgainstTheStatic/test/rules.test.js
git commit -m "Progi HP i SAN oraz bouts of madness"
```

---

### Task 4: Interpreter paragrafu

**Files:**
- Create: `AloneAgainstTheStatic/src/engine/runner.js`
- Create: `AloneAgainstTheStatic/test/fixtures/story.fixture.json`
- Test: `AloneAgainstTheStatic/test/runner.test.js`

**Interfaces:**
- Consumes: `state.js`, `rules.js`, `dice.js`
- Produces: `enter(ctx, state, entryId) -> Frame`, `resume(ctx, frame, action) -> Frame`

`ctx` to `{story, character, rng}`. `Frame` to `{state, entryId, events, pending, cursor}`.

> **Korekty wprowadzone w trakcie realizacji** (wiążące, zapisane w
> `.superpowers/sdd/2026-08-23-alone-against-the-static/task-4-decisions.md`): fixture rozdziela
> ścieżkę porażki od kaskady Sanity (paragraf 5 bez kroku `san`, nowy paragraf 11 z `san`,
> `extracted: [1, 11]`); wydanie Luck jest dostępne przy każdym nieudanym rzucie, a nie tylko
> tam gdzie paragraf oferuje push; koszt Luck liczy się od wymaganego progu trudności, nie od
> pełnej wartości umiejętności; stos powrotu przechowuje pozycję w paragrafie, żeby powrót
> wznawiał go za krokiem, który spowodował skok — bez tego krok utraty Sanity odpala się
> ponownie i gracz krąży między paragrafem a 329.
`pending` przyjmuje wartości: `null`, `{type:"rollDecision", roll, skill, canPush, luckCost}`, `{type:"choices", options}`, `{type:"end"}`.
`action` przyjmuje: `{type:"push"}`, `{type:"luck"}`, `{type:"accept"}`, `{type:"choose", index}`.
Rodzaje zdarzeń w `events`: `text`, `roll`, `flag`, `hp`, `san`, `redirect`, `choices`, `end`, `missing`.

- [ ] **Step 1: Utwórz fixture opisujący wszystkie konstrukcje**

`AloneAgainstTheStatic/test/fixtures/story.fixture.json`:

```json
{
  "extracted": [1, 11],
  "start": 1,
  "entries": {
    "1": {
      "id": 1,
      "scene": "drive",
      "text": ["e1.p1"],
      "on": [{ "flag": "alex" }],
      "choices": [
        { "text": "e1.c1", "goto": 2 },
        { "text": "e1.c2", "goto": 3 }
      ]
    },
    "2": {
      "id": 2,
      "text": ["e2.p1"],
      "on": [{ "roll": "Psychology", "onSuccess": { "goto": 4 }, "onFail": { "goto": 5 } }]
    },
    "3": {
      "id": 3,
      "text": ["e3.p1"],
      "on": [{ "roll": "CON", "push": true, "onFail": [{ "flag": "touched_by_cold" }] }],
      "choices": [{ "text": "e3.c1", "goto": 4 }]
    },
    "4": {
      "id": 4,
      "text": ["e4.p1"],
      "guards": [{ "if": "touched_by_cold", "goto": 6 }],
      "choices": [{ "text": "e4.c1", "goto": 7 }]
    },
    "5": { "id": 5, "text": ["e5.p1"], "choices": [{ "text": "e5.c1", "goto": 7 }] },
      "11": { "id": 11, "text": ["e11.p1"], "on": [{ "san": "6" }], "choices": [{ "text": "e11.c1", "goto": 7 }] },
    "6": { "id": 6, "text": ["e6.p1"], "on": [{ "hp": "1d6" }], "choices": [{ "text": "e6.c1", "goto": 7 }] },
    "7": {
      "id": 7,
      "text": ["e7.p1"],
      "choices": [
        { "text": "e7.c1", "goto": 8, "once": true },
        { "text": "e7.c2", "goto": 9, "once": true },
        { "text": "e7.c3", "goto": 10 }
      ]
    },
    "8": { "id": 8, "text": ["e8.p1"], "on": [{ "newDay": true }], "choices": [{ "text": "e8.c1", "goto": 7 }] },
    "9": { "id": 9, "text": ["e9.p1"], "guards": [{ "if": ["touched_by_cold", { "visits": 1 }], "goto": 6 }], "choices": [{ "text": "e9.c1", "goto": 7 }] },
    "10": { "id": 10, "text": ["e10.p1"], "end": true },
    "324": { "id": 324, "text": ["e324.p1"], "end": true },
    "325": { "id": 325, "text": ["e325.p1"], "on": [{ "goto": "@return" }] },
    "329": { "id": 329, "text": ["e329.p1"], "on": [{ "bout": true }] },
    "333": { "id": 333, "text": ["e333.p1"], "on": [{ "goto": "@return" }] },
    "334": { "id": 334, "text": ["e334.p1"], "end": true }
  }
}
```

- [ ] **Step 2: Napisz test interpretera**

`AloneAgainstTheStatic/test/runner.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sequenceRng } from "../src/engine/dice.js";
import { createState, hasFlag, visitCount } from "../src/engine/state.js";
import { enter, resume } from "../src/engine/runner.js";

const characters = JSON.parse(readFileSync(new URL("../data/characters.json", import.meta.url)));
const story = JSON.parse(readFileSync(new URL("./fixtures/story.fixture.json", import.meta.url)));
const character = characters.charlie;

function ctxWith(values) {
  return { story, character, rng: sequenceRng(values) };
}
const kinds = (frame) => frame.events.map((e) => e.kind);

test("wejście w paragraf emituje tekst, zapala flagę i pokazuje wybory", () => {
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctxWith([]), state, 1);
  assert.deepEqual(kinds(frame), ["text", "flag", "choices"]);
  assert.equal(hasFlag(frame.state, "alex"), true);
  assert.equal(visitCount(frame.state, 1), 1);
  assert.equal(frame.pending.type, "choices");
  assert.equal(frame.pending.options.length, 2);
});

test("wybór prowadzi do kolejnego paragrafu", () => {
  const ctx = ctxWith([0.0, 0.2]); // rzut Psychology 20 - sukces przy 60
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const first = enter(ctx, state, 1);
  const second = resume(ctx, first, { type: "choose", index: 0 });
  assert.equal(second.entryId, 4);
  assert.ok(second.events.some((e) => e.kind === "roll" && e.success === true));
});

test("nieudany rzut prowadzi ścieżką porażki", () => {
  const ctx = ctxWith([0.0, 0.9]); // rzut 90 - porażka przy 60
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 0 });
  assert.equal(frame.entryId, 5);
});

test("rzut z możliwością przepchnięcia czeka na decyzję gracza", () => {
  const ctx = ctxWith([0.0, 0.9]); // CON 70, rzut 90 - porażka
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 1 });
  assert.equal(frame.pending.type, "rollDecision");
  assert.equal(frame.pending.canPush, true);
  assert.equal(frame.pending.luckCost, 20); // 90 - 70
  assert.equal(hasFlag(frame.state, "touched_by_cold"), false);
});

test("przyjęcie porażki wykonuje skutki onFail", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const pending = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 1 });
  const done = resume(ctx, pending, { type: "accept" });
  assert.equal(hasFlag(done.state, "touched_by_cold"), true);
  assert.equal(done.pending.type, "choices");
});

test("wydanie Luck zamienia porażkę w sukces", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) }); // Luck 60
  const pending = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 1 });
  const done = resume(ctx, pending, { type: "luck" });
  assert.equal(done.state.luck, 40);
  assert.equal(hasFlag(done.state, "touched_by_cold"), false);
});

test("przepchnięty rzut nie pozwala już wydać Luck", () => {
  const ctx = ctxWith([0.0, 0.9, 0.0, 0.8]); // pierwszy 90, przepchnięty 80
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const pending = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 1 });
  const pushed = resume(ctx, pending, { type: "push" });
  assert.equal(hasFlag(pushed.state, "touched_by_cold"), true);
  assert.equal(pushed.pending.type, "choices");
});

test("strażnik przekierowuje, gdy flaga jest zapalona", () => {
  const ctx = ctxWith([0.0, 0.9]);
  let state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const pending = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 1 });
  const afterFail = resume(ctx, pending, { type: "accept" });
  const guarded = resume(ctx, afterFail, { type: "choose", index: 0 }); // paragraf 4
  assert.equal(guarded.entryId, 6);
  assert.ok(guarded.events.some((e) => e.kind === "redirect" && e.to === 6));
});

test("wybory jednorazowe znikają po użyciu", () => {
  const ctx = ctxWith([]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  let frame = enter(ctx, state, 7);
  assert.equal(frame.pending.options.filter((o) => !o.used).length, 3);
  frame = resume(ctx, frame, { type: "choose", index: 0 }); // do 8
  frame = resume(ctx, frame, { type: "choose", index: 0 }); // z powrotem do 7
  assert.equal(frame.pending.options[0].used, true);
  assert.equal(frame.pending.options[1].used, false);
});

test("strata Sanity powyżej pięciu punktów kieruje do 329 i odkłada powrót", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 0 }); // do 5, strata 6
  assert.equal(frame.entryId, 329);
  assert.deepEqual(frame.state.returnStack, [5]);
});

test("goto @return wraca na odłożony paragraf", () => {
  const ctx = ctxWith([]);
  let state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  state = { ...state, returnStack: [7] };
  const frame = enter(ctx, state, 333);
  assert.equal(frame.entryId, 7);
  assert.deepEqual(frame.state.returnStack, []);
});

test("krok newDay zeruje licznik Sanity utraconej w ciągu doby", () => {
  const ctx = ctxWith([]);
  let state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  state = { ...state, sanLostToday: 7 };
  const frame = enter(ctx, state, 8);
  assert.equal(frame.state.sanLostToday, 0);
});

test("paragraf z end kończy grę", () => {
  const frame = enter(ctxWith([]), createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) }), 10);
  assert.equal(frame.pending.type, "end");
});

test("przejście poza wyekstrahowany zakres daje zdarzenie missing", () => {
  const ctx = ctxWith([]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctx, state, 200);
  assert.deepEqual(kinds(frame), ["missing"]);
  assert.equal(frame.events[0].entryId, 200);
});
```

- [ ] **Step 3: Uruchom test i potwierdź, że nie przechodzi**

Run: `node --test test/runner.test.js`
Expected: FAIL — `Cannot find module '../src/engine/runner.js'`

- [ ] **Step 4: Zaimplementuj `runner.js`**

`AloneAgainstTheStatic/src/engine/runner.js`:

```js
import { rollDice, skillCheck, successLevel } from "./dice.js";
import {
  hasFlag, setFlag, visit, visitCount, useChoice, isChoiceUsed,
  spendLuck, penaltyFor, popReturn, pushReturn, skillValue,
} from "./state.js";
import { applyDamage, applySanLoss, sanityCheck, resolveBout, resetDay } from "./rules.js";

// Ramka opisuje wykonanie jednego paragrafu. Interpreter zatrzymuje się,
// gdy potrzebuje decyzji gracza, i wznawia przez resume().
function frameOf(state, entryId, events, pending, cursor) {
  return { state, entryId, events, pending, cursor };
}

function entryOf(ctx, id) {
  return ctx.story.entries[String(id)] ?? null;
}

function guardMatches(state, condition) {
  const parts = Array.isArray(condition) ? condition : [condition];
  return parts.every((part) => {
    if (typeof part === "string") return hasFlag(state, part);
    if ("visits" in part) return visitCount(state, part.entry ?? null) === part.visits;
    if ("not" in part) return !hasFlag(state, part.not);
    throw new Error(`Nieznany warunek strażnika: ${JSON.stringify(part)}`);
  });
}

export function enter(ctx, state, entryId) {
  const entry = entryOf(ctx, entryId);
  if (!entry) {
    return frameOf(state, entryId, [{ kind: "missing", entryId }], { type: "missing" }, 0);
  }

  let next = visit(state, entryId);
  const events = [];

  // Strażniki liczą wizytę bieżącą, więc sprawdzamy je po visit().
  for (const guard of entry.guards ?? []) {
    const condition = (Array.isArray(guard.if) ? guard.if : [guard.if]).map((part) =>
      typeof part === "object" && "visits" in part ? { ...part, entry: entryId } : part,
    );
    if (guardMatches(next, condition)) {
      events.push({ kind: "redirect", to: guard.goto });
      const forward = enter(ctx, next, guard.goto);
      return frameOf(forward.state, forward.entryId, [...events, ...forward.events], forward.pending, forward.cursor);
    }
  }

  for (const key of entry.text ?? []) events.push({ kind: "text", key });

  return runSteps(ctx, frameOf(next, entryId, events, null, 0));
}

// Wykonuje kroki z pola "on" od pozycji cursor, aż do końca albo do decyzji gracza.
function runSteps(ctx, frame) {
  const entry = entryOf(ctx, frame.entryId);
  const steps = entry.on ?? [];
  let { state, events, cursor } = frame;

  while (cursor < steps.length) {
    const step = steps[cursor];
    cursor += 1;

    if (step.flag) {
      state = setFlag(state, step.flag);
      events.push({ kind: "flag", flag: step.flag });
      continue;
    }

    // Próg indefinite insanity liczy się w obrębie jednego dnia scenariusza.
    if (step.newDay) {
      state = resetDay(state);
      continue;
    }

    if (step.hp) {
      const amount = rollDice(ctx.rng, step.hp);
      const out = applyDamage(state, amount);
      state = out.state;
      events.push({ kind: "hp", amount });
      if (out.redirect) return jump(ctx, state, events, frame.entryId, out.redirect);
      continue;
    }

    if (step.san) {
      const amount = rollDice(ctx.rng, step.san);
      const out = applySanLoss(state, amount, ctx.character, ctx.rng);
      state = out.state;
      events.push({ kind: "san", amount });
      if (out.redirect) return jump(ctx, state, events, frame.entryId, out.redirect);
      continue;
    }

    if (step.sanCheck) {
      const out = sanityCheck(state, ctx.character, ctx.rng, step.sanCheck);
      state = out.state;
      events.push({ kind: "san", amount: out.lost, roll: out.roll });
      if (out.redirect) return jump(ctx, state, events, frame.entryId, out.redirect);
      continue;
    }

    if (step.bout) {
      const out = resolveBout(state, ctx.character, ctx.rng);
      state = out.state;
      events.push({ kind: "roll", skill: "INT", ...out.check });
      if (out.redirect) return continueAt(ctx, state, events, out.redirect);
      // Nieudany rzut INT: umysł zamyka się na grozę, wracamy tam, skąd przyszliśmy.
      const back = popReturn(state);
      return continueAt(ctx, back.state, events, back.entryId);
    }

    if (step.goto) {
      if (step.goto === "@return") {
        const back = popReturn(state);
        return continueAt(ctx, back.state, events, back.entryId);
      }
      return continueAt(ctx, state, events, step.goto);
    }

    if (step.roll) {
      const target = skillValue(state, ctx.character, step.roll);
      const dice = (step.dice ?? 0) + penaltyFor(state, step.roll);
      const check = skillCheck(ctx.rng, target, { dice, difficulty: step.difficulty ?? "regular" });
      events.push({ kind: "roll", skill: step.roll, ...check });

      if (check.success) return applyBranch(ctx, state, events, frame.entryId, step, "onSuccess", cursor);

      const luckCost = check.result - target;
      const canLuck = step.roll !== "Sanity" && state.luck >= luckCost && luckCost > 0;
      const pendingDecision = {
        type: "rollDecision",
        roll: check,
        skill: step.roll,
        canPush: Boolean(step.push),
        canLuck,
        luckCost,
        stepIndex: cursor - 1,
      };
      if (pendingDecision.canPush || canLuck) {
        return frameOf(state, frame.entryId, events, pendingDecision, cursor - 1);
      }
      return applyBranch(ctx, state, events, frame.entryId, step, "onFail", cursor);
    }

    throw new Error(`Nieznany krok paragrafu ${frame.entryId}: ${JSON.stringify(step)}`);
  }

  return finish(ctx, state, frame.entryId, events);
}

// Skutki gałęzi onSuccess/onFail: albo skok, albo lista efektów wykonywana na miejscu.
// Efekty są tym samym słownikiem co kroki "on", ale bez rzutów — rzut w rzucie
// nie występuje w książce, więc świadomie go nie obsługujemy.
function applyBranch(ctx, state, events, entryId, step, branch, cursor) {
  const outcome = step[branch];
  if (!outcome) return runSteps(ctx, frameOf(state, entryId, events, null, cursor));
  if (!Array.isArray(outcome) && outcome.goto) {
    return continueAt(ctx, state, events, outcome.goto);
  }

  for (const effect of Array.isArray(outcome) ? outcome : [outcome]) {
    if (effect.flag) {
      state = setFlag(state, effect.flag);
      events.push({ kind: "flag", flag: effect.flag });
      continue;
    }
    if (effect.hp) {
      const amount = rollDice(ctx.rng, effect.hp);
      const out = applyDamage(state, amount);
      state = out.state;
      events.push({ kind: "hp", amount });
      if (out.redirect) return jump(ctx, state, events, entryId, out.redirect);
      continue;
    }
    if (effect.san) {
      const amount = rollDice(ctx.rng, effect.san);
      const out = applySanLoss(state, amount, ctx.character, ctx.rng);
      state = out.state;
      events.push({ kind: "san", amount });
      if (out.redirect) return jump(ctx, state, events, entryId, out.redirect);
      continue;
    }
    if (effect.sanCheck) {
      const out = sanityCheck(state, ctx.character, ctx.rng, effect.sanCheck);
      state = out.state;
      events.push({ kind: "san", amount: out.lost, roll: out.roll });
      if (out.redirect) return jump(ctx, state, events, entryId, out.redirect);
      continue;
    }
    if (effect.goto) return continueAt(ctx, state, events, effect.goto);
    throw new Error(`Nieznany efekt gałęzi ${branch} w paragrafie ${entryId}: ${JSON.stringify(effect)}`);
  }
  return runSteps(ctx, frameOf(state, entryId, events, null, cursor));
}

function jump(ctx, state, events, fromEntryId, toEntryId) {
  // Paragrafy systemowe wracają tam, skąd przyszły.
  const withReturn = pushReturn(state, fromEntryId);
  events.push({ kind: "redirect", to: toEntryId });
  const forward = enter(ctx, withReturn, toEntryId);
  return frameOf(forward.state, forward.entryId, [...events, ...forward.events], forward.pending, forward.cursor);
}

function continueAt(ctx, state, events, entryId) {
  if (entryId === null) return finish(ctx, state, null, events);
  const forward = enter(ctx, state, entryId);
  return frameOf(forward.state, forward.entryId, [...events, ...forward.events], forward.pending, forward.cursor);
}

function finish(ctx, state, entryId, events) {
  const entry = entryOf(ctx, entryId);
  // Brak paragrafu oznacza pusty stos powrotu — traktujemy to jak koniec gry.
  if (!entry || entry.end) {
    events.push({ kind: "end" });
    return frameOf(state, entryId, events, { type: "end" }, 0);
  }
  const options = (entry?.choices ?? []).map((choice, index) => ({
    index,
    key: choice.text,
    goto: choice.goto,
    used: Boolean(choice.once) && isChoiceUsed(state, entryId, index),
    blocked: choice.if ? !guardMatches(state, choice.if) : false,
  }));
  events.push({ kind: "choices", options });
  return frameOf(state, entryId, events, { type: "choices", options }, 0);
}

export function resume(ctx, frame, action) {
  if (action.type === "choose") {
    const option = frame.pending.options[action.index];
    if (option.used || option.blocked) throw new Error(`Wybór ${action.index} jest niedostępny`);
    const state = option.used ? frame.state : useChoice(frame.state, frame.entryId, action.index);
    return continueAt(ctx, state, [], option.goto);
  }

  const entry = entryOf(ctx, frame.entryId);
  const step = (entry.on ?? [])[frame.cursor];
  const cursor = frame.cursor + 1;

  if (action.type === "luck") {
    const state = spendLuck(frame.state, frame.pending.luckCost);
    const level = successLevel(frame.pending.roll.target, frame.pending.roll.target);
    const check = { ...frame.pending.roll, result: frame.pending.roll.target, level, success: true, spentLuck: frame.pending.luckCost };
    const events = [{ kind: "roll", skill: step.roll, ...check }];
    return applyBranch(ctx, state, events, frame.entryId, step, "onSuccess", cursor);
  }

  if (action.type === "push") {
    const target = skillValue(frame.state, ctx.character, step.roll);
    const dice = (step.dice ?? 0) + penaltyFor(frame.state, step.roll);
    const check = skillCheck(ctx.rng, target, { dice, difficulty: step.difficulty ?? "regular" });
    const events = [{ kind: "roll", skill: step.roll, pushed: true, ...check }];
    const branch = check.success ? "onSuccess" : "onFail";
    return applyBranch(ctx, frame.state, events, frame.entryId, step, branch, cursor);
  }

  if (action.type === "accept") {
    return applyBranch(ctx, frame.state, [], frame.entryId, step, "onFail", cursor);
  }

  throw new Error(`Nieznana akcja: ${action.type}`);
}
```

- [ ] **Step 5: Uruchom test interpretera**

Run: `node --test test/runner.test.js`
Expected: PASS — 14 testów

- [ ] **Step 6: Uruchom wszystkie testy**

Run: `node --test test/*.test.js`
Expected: PASS — wszystkie testy z zadań 1–4

- [ ] **Step 7: Commit**

```bash
git add AloneAgainstTheStatic/src/engine/runner.js AloneAgainstTheStatic/test/runner.test.js AloneAgainstTheStatic/test/fixtures/story.fixture.json
git commit -m "Interpreter paragrafów z obsługą rzutów, push i Luck"
```

---

### Task 5: Ekstrakcja paragrafów z PDF

**Files:**
- Create: `AloneAgainstTheStatic/tools/extract.py`
- Create: `AloneAgainstTheStatic/tools/raw-entries.json` (wynik uruchomienia)

**Interfaces:**
- Consumes: `PDF_input/cha23181_-_alone_against_the_static_v6.pdf`
- Produces: `raw-entries.json` w kształcie `{"<id>": {"id": n, "page": n, "paragraphs": [...], "trace": [...]}}`

- [ ] **Step 1: Napisz skrypt ekstrakcji**

`AloneAgainstTheStatic/tools/extract.py`:

```python
"""Wyciąga paragrafy z PDF-a z zachowaniem kolejności czytania dwóch kolumn.

Uruchomienie z katalogu głównego repozytorium:
    .venv/bin/python3 AloneAgainstTheStatic/tools/extract.py
"""
import json
import re
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "PDF_input" / "cha23181_-_alone_against_the_static_v6.pdf"
OUT = Path(__file__).resolve().parent / "raw-entries.json"

# Konwersja PDF-a gubi ligatury: "Th" wychodzi jako "!", "fl" jako "%".
REPLACEMENTS = [
    ("!e ", "The "), ("!is ", "This "), ("!ey ", "They "), ("!at ", "That "),
    ("!ere", "There"), ("!en ", "Then "), ("!ose ", "Those "), ("!rough", "Through"),
    ("!ink", "Think"), ("!ank", "Thank"),
    ("%o", "flo"), ("%a", "fla"), ("%e", "fle"), ("%i", "fli"), ("%u", "flu"),
    ("ﬀ", "ff"), ("ﬁ", "fi"), ("ﬂ", "fl"), ("ﬃ", "ffi"), ("ﬄ", "ffl"),
    ("’", "'"), ("“", '"'), ("”", '"'), ("—", "—"),
]

ENTRY_RE = re.compile(r"^(\d{1,3})$")
TRACE_RE = re.compile(r"^\((Start|[\d,\s]+)\)$")


def clean(text: str) -> str:
    text = text.replace("\n", " ")
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    return re.sub(r"\s+", " ", text).strip()


def ordered_blocks(page):
    """Zwraca bloki tekstu w kolejności czytania: najpierw lewa kolumna, potem prawa."""
    middle = page.rect.width / 2
    blocks = [b for b in page.get_text("blocks") if b[4].strip()]
    left = sorted((b for b in blocks if b[0] < middle * 0.9), key=lambda b: b[1])
    right = sorted((b for b in blocks if b[0] >= middle * 0.9), key=lambda b: b[1])
    return left + right


def main() -> int:
    if not PDF.exists():
        print(f"Nie znaleziono pliku: {PDF}", file=sys.stderr)
        return 1

    doc = fitz.open(PDF)
    entries: dict[str, dict] = {}
    current: dict | None = None

    for page_number, page in enumerate(doc, start=1):
        for block in ordered_blocks(page):
            text = clean(block[4])
            if not text or text == "ALONE AGAINST THE STATIC":
                continue

            match = ENTRY_RE.match(text)
            if match and 1 <= int(match.group(1)) <= 371:
                # Numer strony też jest samodzielną liczbą — odróżniamy go po tym,
                # że stoi nisko na stronie.
                if block[1] > page.rect.height * 0.93:
                    continue
                current = {"id": int(match.group(1)), "page": page_number, "paragraphs": [], "trace": []}
                entries[match.group(1)] = current
                continue

            if current is None:
                continue

            trace = TRACE_RE.match(text)
            if trace:
                body = trace.group(1)
                current["trace"] = [] if body == "Start" else [int(n) for n in re.findall(r"\d+", body)]
                continue

            current["paragraphs"].append(text)

    OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    found = sorted(int(k) for k in entries)
    missing = [n for n in range(1, 372) if n not in found]
    print(f"Zapisano {len(entries)} paragrafów do {OUT}")
    print(f"Brakujące numery: {missing}" if missing else "Komplet 1-371")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Uruchom ekstrakcję**

Run: `cd /Users/marek/OfflineDocuments/Repo/Antigravity/Design && .venv/bin/python3 AloneAgainstTheStatic/tools/extract.py`
Expected: wypisze liczbę paragrafów i listę brakujących numerów

- [ ] **Step 3: Sprawdź poprawność kolejności na paragrafie 3**

Run: `node -e "const d=require('./AloneAgainstTheStatic/tools/raw-entries.json'); console.log(JSON.stringify(d['3'],null,2))"`
Expected: akapity w kolejności — najpierw „You reach forward and turn the dial", potem „'Please,' Charlie barks", potem „You raise your hands defensively", na końcu instrukcja rzutu Psychology; `trace` równe `[1]`

- [ ] **Step 4: Popraw skrypt, jeśli kolejność lub numery się nie zgadzają**

Typowe poprawki: próg podziału kolumn (`middle * 0.9`) dla stron z pełnowymiarowymi ramkami; próg wykrywania numeru strony (`0.93`). Powtarzaj kroki 2–3, aż paragraf 3 wygląda poprawnie, a lista brakujących numerów jest pusta lub zawiera wyłącznie paragrafy, które w książce faktycznie leżą na stronach z grafiką na całą stronę (te dopiszesz ręcznie w zadaniu 6).

- [ ] **Step 5: Porównaj z markdownem jako niezależnym źródłem**

Run:
```bash
cd /Users/marek/OfflineDocuments/Repo/Antigravity/Design && node -e "
const raw = require('./AloneAgainstTheStatic/tools/raw-entries.json');
const md = require('fs').readFileSync('output/markdown/cha23181_-_alone_against_the_static_v6.md','utf8')
  .replace(/Th /g,'Th').replace(/\s+/g,' ').toLowerCase();
const missing = [];
for (const [id, e] of Object.entries(raw)) {
  for (const p of e.paragraphs) {
    const probe = p.toLowerCase().replace(/[^a-z ]/g,'').split(' ').filter(w=>w.length>4).slice(0,4).join(' ');
    if (probe && !md.includes(probe)) missing.push([id, p.slice(0,60)]);
  }
}
console.log('Fragmentów bez odpowiednika w markdownie:', missing.length);
missing.slice(0,20).forEach(m=>console.log(' ', m[0], '|', m[1]));
"
```
Expected: lista krótka (poniżej 20 pozycji, głównie instrukcje mechaniczne i podpisy). Każdą pozycję obejrzyj w PDF-ie i popraw `REPLACEMENTS`, jeśli to efekt zepsutego znaku.

- [ ] **Step 6: Commit**

```bash
git add AloneAgainstTheStatic/tools/extract.py AloneAgainstTheStatic/tools/raw-entries.json
git commit -m "Ekstrakcja paragrafów z PDF przez PyMuPDF"
```

---

### Task 6: Budowa story.json i text.en.json

**Files:**
- Create: `AloneAgainstTheStatic/tools/build-story.mjs`
- Create: `AloneAgainstTheStatic/data/story.json` (wynik)
- Create: `AloneAgainstTheStatic/data/text.en.json` (wynik)
- Create: `AloneAgainstTheStatic/data/text.pl.json` (pusty obiekt)

**Interfaces:**
- Consumes: `tools/raw-entries.json`
- Produces: `story.json` w kształcie `{extracted: [1, 30], start: 1, entries: {...}}` zgodnym z fixture z zadania 4; `text.en.json` w kształcie `{"e1.p1": "…"}`

- [ ] **Step 1: Napisz konwerter**

`AloneAgainstTheStatic/tools/build-story.mjs`:

```js
// Zamienia surowe akapity na strukturę mechaniczną plus osobny plik tekstów.
// Zdania instrukcyjne w książce są bardzo regularne, więc dają się rozpoznać wzorcami.
// Wszystko, czego nie rozpozna, trafia na listę do ręcznego obejrzenia.
import { readFileSync, writeFileSync } from "node:fs";

const RANGE = [1, 30];
const raw = JSON.parse(readFileSync(new URL("./raw-entries.json", import.meta.url)));

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const PATTERNS = [
  { re: /^Check\/tick (.+?) on the log sheet\.?$/i,
    build: (m) => ({ on: [{ flag: slug(m[1]) }] }) },
  { re: /^Make an? (Hard )?([A-Za-z ()/]+?) roll[^:]*:?$/i,
    build: (m) => ({ pendingRoll: { roll: m[2].trim(), ...(m[1] ? { difficulty: "hard" } : {}) } }) },
  { re: /^Make an? (Hard )?([A-Za-z ()/]+?) roll; if you fail, check\/tick (.+?) on the log sheet\.?$/i,
    build: (m) => ({ on: [{ roll: m[2].trim(), ...(m[1] ? { difficulty: "hard" } : {}), onFail: [{ flag: slug(m[3]) }] }] }) },
  { re: /^[•\-]?\s*If you succeed(?: the roll)?, go to (\d+)\.?$/i,
    build: (m) => ({ branch: ["onSuccess", Number(m[1])] }) },
  { re: /^[•\-]?\s*If you fail(?: the roll)?, go to (\d+)\.?$/i,
    build: (m) => ({ branch: ["onFail", Number(m[1])] }) },
  { re: /^To (.+?), go to (\d+)\.?$/i,
    build: (m) => ({ choice: { label: `To ${m[1]}`, goto: Number(m[2]) } }) },
  { re: /^Go to (\d+)\.?$/i,
    build: (m) => ({ on: [{ goto: Number(m[1]) }] }) },
  { re: /^If (.+?) is checked\/?(?:ticked)? on the log sheet,.*?go to (\d+)\.?$/i,
    build: (m) => ({ guard: { if: slug(m[1]), goto: Number(m[2]) } }) },
  { re: /^Lose (\d+D?\d*) Sanity(?: points?)?\.?$/i,
    build: (m) => ({ on: [{ san: m[1].toLowerCase() }] }) },
  { re: /^THE END\.?$/i, build: () => ({ end: true }) },
];

// Instrukcje bywają sklejone w jeden blok — tniemy na zdania.
function instructionLines(paragraph) {
  return paragraph.split(/(?<=\.)\s+(?=[A-Z•]|If |To |Make |Check|Go to)/).map((s) => s.trim()).filter(Boolean);
}

const entries = {};
const texts = {};
const unparsed = [];

for (let id = RANGE[0]; id <= RANGE[1]; id += 1) {
  const source = raw[String(id)];
  if (!source) { unparsed.push([id, "BRAK PARAGRAFU W raw-entries.json"]); continue; }

  const entry = { id, text: [], from: source.trace };
  const on = [];
  const choices = [];
  const guards = [];
  let pendingRoll = null;
  let prose = 1;

  for (const paragraph of source.paragraphs) {
    for (const line of instructionLines(paragraph)) {
      const hit = PATTERNS.map((p) => [p, p.re.exec(line)]).find(([, m]) => m);
      if (!hit) {
        // Zdanie bez wzorca traktujemy jako prozę, o ile nie wygląda na instrukcję.
        if (/^(If|To|Make|Check|Go to|THE END)\b/i.test(line)) unparsed.push([id, line]);
        else { const key = `e${id}.p${prose++}`; entry.text.push(key); texts[key] = line; }
        continue;
      }
      const [, match] = hit;
      const out = hit[0].build(match);
      if (out.on) on.push(...out.on);
      if (out.guard) guards.push(out.guard);
      if (out.end) entry.end = true;
      if (out.pendingRoll) { pendingRoll = out.pendingRoll; on.push(pendingRoll); }
      if (out.branch) {
        if (!pendingRoll) { unparsed.push([id, `gałąź bez rzutu: ${line}`]); continue; }
        pendingRoll[out.branch[0]] = { goto: out.branch[1] };
      }
      if (out.choice) {
        const key = `e${id}.c${choices.length + 1}`;
        texts[key] = out.choice.label;
        choices.push({ text: key, goto: out.choice.goto });
      }
    }
  }

  if (on.length) entry.on = on;
  if (choices.length) entry.choices = choices;
  if (guards.length) entry.guards = guards;
  entries[id] = entry;
}

const story = { extracted: RANGE, start: 1, entries };
const dir = new URL("../data/", import.meta.url);
writeFileSync(new URL("story.json", dir), JSON.stringify(story, null, 2) + "\n");
writeFileSync(new URL("text.en.json", dir), JSON.stringify(texts, null, 2) + "\n");

console.log(`Zbudowano ${Object.keys(entries).length} paragrafów, ${Object.keys(texts).length} tekstów.`);
if (unparsed.length) {
  console.log(`\nDo ręcznego sprawdzenia (${unparsed.length}):`);
  for (const [id, line] of unparsed) console.log(`  ${id}: ${line}`);
}
```

- [ ] **Step 2: Uruchom konwerter**

Run: `cd AloneAgainstTheStatic && node tools/build-story.mjs`
Expected: wypisze liczbę paragrafów i listę zdań do ręcznego sprawdzenia

- [ ] **Step 3: Popraw ręcznie to, czego konwerter nie rozpoznał**

Otwórz `data/story.json` i dla każdej pozycji z listy „Do ręcznego sprawdzenia" dopisz właściwą konstrukcję według tabeli z sekcji „Model danych" w specyfikacji. Częste przypadki w paragrafach 1–30:

- „If Broken Heart is checked on the log sheet, you cannot stay calm. You must go to 24." → `guards: [{ "if": "broken_heart", "goto": 24 }]`
- rzut z możliwością przepchnięcia („If you fail but wish to Push the Roll") → dopisz `"push": true` do kroku `roll`
- paragraf, w którym bohaterowie budzą się rano → dopisz krok `{ "newDay": true }` na początku listy `on`; zeruje on licznik Sanity utraconej w ciągu doby, od którego zależy próg 328. W paragrafach 1–30 taki moment nie występuje (to jeden wieczór), ale przy rozszerzaniu ekstrakcji trzeba go dodać przy każdym przespanym nocy
- teksty wprowadzające do wyborów, które konwerter uznał za prozę — zostaw jako prozę

Po każdej poprawce uruchom `node tools/validate.mjs` (zadanie 7) i sprawdź, czy lista błędów maleje.

- [ ] **Step 4: Przypisz sceny do paragrafów**

Scena decyduje o tym, który utwór muzyczny gra — dopóki kolejne paragrafy należą do tej samej sceny, muzyka nie przerywa się. Dopisz w `tools/build-story.mjs` mapę scen przed pętlą:

```js
// Zakresy paragrafów według miejsca akcji. Granice wynikają z treści,
// więc po rozszerzeniu ekstrakcji trzeba je uzupełnić ręcznie.
const SCENES = [
  { to: 4, name: "drive" },     // jazda samochodem przez Black Hills
  { to: 30, name: "cabin" },    // przyjazd i pierwszy wieczór w chacie
];
const sceneFor = (id) => SCENES.find((s) => id <= s.to)?.name ?? null;
```

W miejscu tworzenia obiektu paragrafu dopisz pole:

```js
  const entry = { id, scene: sceneFor(id), text: [], from: source.trace };
```

Uruchom ponownie `node tools/build-story.mjs` i sprawdź, że każdy paragraf w `story.json` ma niepuste pole `scene`.

- [ ] **Step 5: Utwórz pusty plik tłumaczenia**

```bash
echo '{}' > AloneAgainstTheStatic/data/text.pl.json
```

- [ ] **Step 6: Utwórz szkielet media.json**

`AloneAgainstTheStatic/data/media.json`:

```json
{
  "entries": {},
  "scenes": {}
}
```

- [ ] **Step 7: Commit**

```bash
git add AloneAgainstTheStatic/tools/build-story.mjs AloneAgainstTheStatic/data/
git commit -m "Konwersja surowych paragrafów na story.json i text.en.json"
```

---

### Task 7: Walidator danych

**Files:**
- Create: `AloneAgainstTheStatic/tools/validate.mjs`
- Test: `AloneAgainstTheStatic/test/data.test.js`

**Interfaces:**
- Consumes: `data/story.json`, `data/text.en.json`, `data/text.pl.json`
- Produces: `validate(story, textEn, textPl) -> {errors: string[], warnings: string[]}`

- [ ] **Step 1: Napisz test walidatora**

`AloneAgainstTheStatic/test/data.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../tools/validate.mjs";

const load = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url)));

test("wykrywa przejście do nieistniejącego paragrafu w zakresie", () => {
  const story = { extracted: [1, 5], start: 1, entries: {
    1: { id: 1, text: ["e1.p1"], choices: [{ text: "e1.c1", goto: 3 }] },
  }};
  const out = validate(story, { "e1.p1": "x", "e1.c1": "y" }, {});
  assert.ok(out.errors.some((e) => e.includes("3")));
});

test("przejście poza zakres ekstrakcji to ostrzeżenie, nie błąd", () => {
  const story = { extracted: [1, 5], start: 1, entries: {
    1: { id: 1, text: ["e1.p1"], choices: [{ text: "e1.c1", goto: 99 }] },
  }};
  const out = validate(story, { "e1.p1": "x", "e1.c1": "y" }, {});
  assert.equal(out.errors.length, 0);
  assert.ok(out.warnings.some((w) => w.includes("99")));
});

test("wykrywa brakujący klucz tekstu", () => {
  const story = { extracted: [1, 5], start: 1, entries: { 1: { id: 1, text: ["e1.p1"] } } };
  const out = validate(story, {}, {});
  assert.ok(out.errors.some((e) => e.includes("e1.p1")));
});

test("brak tłumaczenia to ostrzeżenie", () => {
  const story = { extracted: [1, 5], start: 1, entries: { 1: { id: 1, text: ["e1.p1"] } } };
  const out = validate(story, { "e1.p1": "x" }, {});
  assert.ok(out.warnings.some((w) => w.includes("e1.p1")));
});

test("wykrywa paragraf nieosiągalny ze startu", () => {
  const story = { extracted: [1, 5], start: 1, entries: {
    1: { id: 1, text: ["e1.p1"] },
    2: { id: 2, text: ["e2.p1"] },
  }};
  const out = validate(story, { "e1.p1": "x", "e2.p1": "y" }, {});
  assert.ok(out.warnings.some((w) => w.includes("nieosiągalny") && w.includes("2")));
});

test("wykrywa flagę czytaną, ale nigdy niezapalaną", () => {
  const story = { extracted: [1, 5], start: 1, entries: {
    1: { id: 1, text: ["e1.p1"], guards: [{ if: "nigdy_niezapalona", goto: 1 }] },
  }};
  const out = validate(story, { "e1.p1": "x" }, {});
  assert.ok(out.errors.some((e) => e.includes("nigdy_niezapalona")));
});

test("prawdziwe dane gry przechodzą walidację bez błędów", () => {
  const out = validate(load("story.json"), load("text.en.json"), load("text.pl.json"));
  assert.deepEqual(out.errors, []);
});
```

- [ ] **Step 2: Uruchom test i potwierdź, że nie przechodzi**

Run: `node --test test/data.test.js`
Expected: FAIL — `Cannot find module '../tools/validate.mjs'`

- [ ] **Step 3: Zaimplementuj walidator**

`AloneAgainstTheStatic/tools/validate.mjs`:

```js
import { readFileSync } from "node:fs";

// Zbiera wszystkie cele przejść z jednego paragrafu.
function targetsOf(entry) {
  const targets = [];
  const walk = (step) => {
    if (!step || typeof step !== "object") return;
    if (typeof step.goto === "number") targets.push(step.goto);
    for (const branch of ["onSuccess", "onFail"]) {
      const value = step[branch];
      if (Array.isArray(value)) value.forEach(walk);
      else walk(value);
    }
  };
  (entry.on ?? []).forEach(walk);
  (entry.guards ?? []).forEach((g) => targets.push(g.goto));
  (entry.choices ?? []).forEach((c) => targets.push(c.goto));
  return targets.filter((t) => typeof t === "number");
}

function flagsOf(entry) {
  const set = [];
  const read = [];
  const walk = (step) => {
    if (!step || typeof step !== "object") return;
    if (step.flag) set.push(step.flag);
    for (const branch of ["onSuccess", "onFail"]) {
      const value = step[branch];
      if (Array.isArray(value)) value.forEach(walk);
      else walk(value);
    }
  };
  (entry.on ?? []).forEach(walk);
  for (const guard of entry.guards ?? []) {
    const parts = Array.isArray(guard.if) ? guard.if : [guard.if];
    for (const part of parts) if (typeof part === "string") read.push(part);
  }
  return { set, read };
}

export function validate(story, textEn, textPl) {
  const errors = [];
  const warnings = [];
  const [from, to] = story.extracted ?? [1, 371];
  const ids = new Set(Object.keys(story.entries).map(Number));
  const setFlags = new Set();
  const readFlags = new Set();

  for (const entry of Object.values(story.entries)) {
    for (const key of entry.text ?? []) {
      if (!(key in textEn)) errors.push(`Brak tekstu angielskiego dla klucza ${key}`);
      else if (!(key in textPl)) warnings.push(`Brak tłumaczenia dla klucza ${key}`);
    }
    for (const choice of entry.choices ?? []) {
      if (!(choice.text in textEn)) errors.push(`Brak tekstu angielskiego dla klucza ${choice.text}`);
      else if (!(choice.text in textPl)) warnings.push(`Brak tłumaczenia dla klucza ${choice.text}`);
    }
    for (const target of targetsOf(entry)) {
      if (ids.has(target)) continue;
      if (target >= from && target <= to) errors.push(`Paragraf ${entry.id} prowadzi do nieistniejącego ${target}`);
      else warnings.push(`Paragraf ${entry.id} prowadzi do jeszcze nieprzepisanego ${target}`);
    }
    const flags = flagsOf(entry);
    flags.set.forEach((f) => setFlags.add(f));
    flags.read.forEach((f) => readFlags.add(f));
  }

  for (const flag of readFlags) {
    if (!setFlags.has(flag)) errors.push(`Flaga ${flag} jest czytana, ale nigdzie nie jest zapalana`);
  }
  for (const flag of setFlags) {
    if (!readFlags.has(flag)) warnings.push(`Flaga ${flag} jest zapalana, ale nigdzie nie jest czytana`);
  }

  const reachable = new Set([story.start]);
  const queue = [story.start];
  while (queue.length) {
    const entry = story.entries[String(queue.pop())];
    if (!entry) continue;
    for (const target of targetsOf(entry)) {
      if (!reachable.has(target)) { reachable.add(target); queue.push(target); }
    }
  }
  for (const id of ids) {
    if (!reachable.has(id) && id < 324) warnings.push(`Paragraf ${id} jest nieosiągalny ze startu`);
  }

  return { errors, warnings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const load = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url)));
  const out = validate(load("story.json"), load("text.en.json"), load("text.pl.json"));
  out.warnings.forEach((w) => console.log(`OSTRZEŻENIE: ${w}`));
  out.errors.forEach((e) => console.error(`BŁĄD: ${e}`));
  console.log(`\n${out.errors.length} błędów, ${out.warnings.length} ostrzeżeń.`);
  process.exit(out.errors.length ? 1 : 0);
}
```

- [ ] **Step 4: Uruchom test**

Run: `node --test test/data.test.js`
Expected: PASS — 7 testów. Jeśli ostatni test nie przechodzi, wróć do kroku 3 zadania 6 i popraw `story.json`, aż lista błędów będzie pusta.

- [ ] **Step 5: Uruchom walidator na prawdziwych danych**

Run: `node tools/validate.mjs`
Expected: `0 błędów`; ostrzeżenia o brakach tłumaczeń i przejściach poza zakres są oczekiwane

- [ ] **Step 6: Commit**

```bash
git add AloneAgainstTheStatic/tools/validate.mjs AloneAgainstTheStatic/test/data.test.js AloneAgainstTheStatic/data/story.json
git commit -m "Walidator danych i tłumaczeń"
```

---

### Task 8: Strona, styl VHS i dziennik rozgrywki

**Files:**
- Create: `AloneAgainstTheStatic/index.html`
- Create: `AloneAgainstTheStatic/style.css`
- Create: `AloneAgainstTheStatic/src/ui/i18n.js`
- Create: `AloneAgainstTheStatic/src/ui/journal.js`
- Create: `AloneAgainstTheStatic/src/ui/main.js`

**Interfaces:**
- Consumes: `runner.js`, `state.js`, dane JSON
- Produces: `createI18n(texts, fallback) -> {t(key), setLocale(locale), locale}`, `renderEvents(root, events, i18n, handlers) -> void`

- [ ] **Step 1: Utwórz `index.html`**

```html
<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0a0a0c" />
    <title>Alone Against the Static</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="scanlines" aria-hidden="true"></div>

    <header class="topbar">
      <span class="topbar-title">Alone Against the Static</span>
      <div class="topbar-actions">
        <button type="button" id="lang-toggle" class="chip">EN</button>
        <button type="button" id="sheet-toggle" class="chip" aria-expanded="false">Karta</button>
        <button type="button" id="settings-toggle" class="chip">Ustawienia</button>
      </div>
    </header>

    <main class="layout">
      <section id="screen-character" class="screen" hidden>
        <h1 class="screen-title">Kim jesteś?</h1>
        <div id="character-choices" class="character-choices"></div>
      </section>

      <section id="screen-game" class="screen" hidden>
        <div id="journal" class="journal" aria-live="polite"></div>
      </section>

      <section id="screen-end" class="screen" hidden>
        <h1 class="screen-title">Koniec</h1>
        <div id="end-summary"></div>
        <button type="button" id="restart" class="action">Zagraj jeszcze raz</button>
      </section>

      <aside id="sheet" class="sheet" aria-label="Karta postaci"></aside>
    </main>

    <script type="module" src="src/ui/main.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Utwórz `style.css`**

```css
:root {
  --bg: #0a0a0c;
  --panel: #08080a;
  --ink: #cfcfd6;
  --ink-dim: #8a8a96;
  --line: #23232b;
  --hot: #ff3a6a;
  --cool: #00d8ff;
  --scanline-strength: 0.05;
  --font-prose: "Helvetica Neue", Inter, system-ui, sans-serif;
  --font-machine: "Courier New", ui-monospace, monospace;
  --prose-size: 1.05rem;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-prose);
  font-size: var(--prose-size);
  line-height: 1.7;
}

.scanlines {
  position: fixed;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, var(--scanline-strength)) 0 1px,
    transparent 1px 3px
  );
}

@media (prefers-reduced-motion: reduce) {
  :root { --scanline-strength: 0; }
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 1rem;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
  font-family: var(--font-machine);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.topbar-actions { display: flex; gap: 0.4rem; }

.chip {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink-dim);
  font: inherit;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
}
.chip:hover, .chip:focus-visible { color: var(--ink); border-color: var(--ink-dim); }

.layout { display: flex; align-items: flex-start; }

.screen { flex: 1; max-width: 42rem; margin: 0 auto; padding: 2rem 1.25rem 6rem; }
.screen[hidden] { display: none; }

.journal-entry { margin-bottom: 2.5rem; }
.journal-entry.past { opacity: 0.45; }

.entry-number {
  font-family: var(--font-machine);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--hot);
  text-shadow: 1.5px 0 var(--cool);
  margin-bottom: 0.6rem;
}

.journal-entry p { margin: 0 0 0.9rem; }

.entry-image { width: 100%; height: auto; margin: 1rem 0; border: 1px solid var(--line); }

.rollbox {
  border: 1px solid var(--line);
  background: #101015;
  padding: 0.8rem 1rem;
  margin: 1rem 0;
  font-family: var(--font-machine);
  font-size: 0.85rem;
}
.roll-head { color: var(--ink-dim); letter-spacing: 0.14em; font-size: 0.7rem; margin-bottom: 0.6rem; }
.roll-dice { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.die {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.2rem; height: 2.2rem;
  background: #15151b; border: 1px solid #3a3a47;
}
.die.discarded { opacity: 0.35; text-decoration: line-through; }
.roll-total { font-size: 1.2rem; }
.roll-level { letter-spacing: 0.14em; font-size: 0.75rem; }
.roll-level.ok { color: var(--cool); }
.roll-level.bad { color: var(--hot); }
.roll-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.8rem; }

.action, .choice {
  display: block; width: 100%; text-align: left;
  background: #0e0e13; border: 1px solid var(--line); border-left: 3px solid var(--cool);
  color: var(--ink); font: inherit; padding: 0.7rem 0.9rem; margin: 0.4rem 0; cursor: pointer;
}
.choice:hover:not(:disabled) { border-left-color: var(--hot); }
.choice:disabled { opacity: 0.3; cursor: not-allowed; text-decoration: line-through; }

.roll-actions .action { width: auto; border-left-width: 1px; padding: 0.35rem 0.8rem;
  font-family: var(--font-machine); font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; }
.roll-actions .action.hot { border-color: var(--hot); color: #ff7a99; }

.missing { border: 1px dashed var(--line); padding: 1rem; color: var(--ink-dim); font-family: var(--font-machine); }

.sheet {
  width: 15rem; flex: none; position: sticky; top: 3rem;
  padding: 1rem; background: var(--panel); border-left: 1px solid var(--line);
  font-family: var(--font-machine); font-size: 0.75rem; letter-spacing: 0.04em;
  max-height: calc(100vh - 3rem); overflow-y: auto;
}
.sheet h2 { font-size: 0.7rem; letter-spacing: 0.16em; color: var(--ink-dim); margin: 1.2rem 0 0.4rem; }
.sheet h2:first-child { margin-top: 0; }
.meter { height: 4px; background: #1c1c23; margin: 0.2rem 0 0.7rem; }
.meter span { display: block; height: 100%; }
.meter.hp span { background: #a3283f; }
.meter.san span { background: #2c7f96; }
.meter.luck span { background: #8a7a2e; }
.sheet ul { list-style: none; margin: 0; padding: 0; line-height: 1.9; }

.character-choices { display: grid; gap: 1rem; }
.screen-title { font-family: var(--font-machine); letter-spacing: 0.1em; }

@media (max-width: 52rem) {
  .layout { flex-direction: column; }
  .sheet {
    position: fixed; inset: auto 0 0 0; width: 100%; max-height: 60vh;
    border-left: none; border-top: 1px solid var(--line);
    transform: translateY(calc(100% - 2.6rem)); transition: transform 0.25s ease;
  }
  .sheet.open { transform: translateY(0); }
  .screen { padding-bottom: 8rem; }
}
```

- [ ] **Step 3: Napisz moduł tekstów**

`AloneAgainstTheStatic/src/ui/i18n.js`:

```js
// Teksty żyją osobno od struktury gry. Brak polskiego klucza spada na angielski.
export function createI18n(sources, initialLocale = "pl") {
  let locale = initialLocale;
  return {
    get locale() { return locale; },
    setLocale(next) { locale = next; },
    t(key) {
      const value = sources[locale]?.[key] ?? sources.en?.[key];
      return value ?? `[${key}]`;
    },
  };
}
```

- [ ] **Step 4: Napisz renderer dziennika**

`AloneAgainstTheStatic/src/ui/journal.js`:

```js
const LEVEL_LABELS = {
  critical: "KRYTYK", extreme: "SUKCES EKSTREMALNY", hard: "SUKCES TRUDNY",
  regular: "SUKCES", fail: "PORAŻKA", fumble: "FATALNA PORAŻKA",
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderRoll(event) {
  const box = el("div", "rollbox");
  const head = `${event.skill} · ${event.target} / ${Math.floor(event.target / 2)} / ${Math.floor(event.target / 5)}`;
  box.append(el("div", "roll-head", event.pushed ? `${head} · PRZEPCHNIĘTY` : head));

  const dice = el("div", "roll-dice");
  for (const tens of event.tens) {
    const kept = (tens === 0 && event.units === 0 ? 100 : tens + event.units) === event.result;
    dice.append(el("span", kept ? "die" : "die discarded", String(tens).padStart(2, "0")));
  }
  dice.append(el("span", "die", String(event.units)));
  dice.append(el("span", "roll-total", `= ${event.result}`));
  const level = el("span", `roll-level ${event.success ? "ok" : "bad"}`, LEVEL_LABELS[event.level]);
  dice.append(level);
  box.append(dice);
  if (event.spentLuck) box.append(el("div", "roll-head", `Wydano ${event.spentLuck} punktów Luck`));
  return box;
}

// Rysuje zdarzenia zwrócone przez silnik. Nie liczy niczego samodzielnie.
export function renderEvents(root, events, i18n, handlers, context = {}) {
  const block = el("article", "journal-entry");
  for (const previous of root.querySelectorAll(".journal-entry")) previous.classList.add("past");

  if (context.entryId !== undefined) block.append(el("div", "entry-number", String(context.entryId)));

  for (const event of events) {
    if (event.kind === "text") block.append(el("p", null, i18n.t(event.key)));
    if (event.kind === "roll") block.append(renderRoll(event));

    if (event.kind === "san") block.append(el("div", "roll-head", `Utrata Sanity: ${event.amount}`));
    if (event.kind === "hp") block.append(el("div", "roll-head", `Obrażenia: ${event.amount}`));
    if (event.kind === "flag") block.append(el("div", "roll-head", `Zapisano: ${event.flag}`));

    if (event.kind === "missing") {
      block.append(el("div", "missing", `Paragraf ${event.entryId} nie został jeszcze przepisany.`));
    }

    if (event.kind === "choices") {
      for (const option of event.options) {
        const button = el("button", "choice", i18n.t(option.key));
        button.type = "button";
        button.disabled = option.used || option.blocked;
        button.addEventListener("click", () => handlers.onChoose(option.index));
        block.append(button);
      }
    }
  }

  root.append(block);
  block.scrollIntoView({ behavior: "smooth", block: "start" });
  return block;
}

export function renderRollDecision(block, pending, i18n, handlers) {
  const actions = el("div", "roll-actions");
  if (pending.canLuck) {
    const luck = el("button", "action", `Spal ${pending.luckCost} Luck`);
    luck.type = "button";
    luck.addEventListener("click", () => handlers.onLuck());
    actions.append(luck);
  }
  if (pending.canPush) {
    const push = el("button", "action hot", "Przepchnij rzut");
    push.type = "button";
    push.addEventListener("click", () => handlers.onPush());
    actions.append(push);
  }
  const accept = el("button", "action", "Przyjmij porażkę");
  accept.type = "button";
  accept.addEventListener("click", () => handlers.onAccept());
  actions.append(accept);

  [...block.querySelectorAll(".rollbox")].at(-1).append(actions);
  return actions;
}

export function clearJournal(root) {
  root.replaceChildren();
}
```

- [ ] **Step 5: Napisz bootstrap**

`AloneAgainstTheStatic/src/ui/main.js`:

```js
import { createState } from "../engine/state.js";
import { enter, resume } from "../engine/runner.js";
import { createI18n } from "./i18n.js";
import { renderEvents, renderRollDecision, clearJournal } from "./journal.js";
import { renderSheet } from "./sheet.js";

const base = new URL("../../data/", import.meta.url);
const load = (name) => fetch(new URL(name, base)).then((r) => r.json());

const [characters, story, en, pl, media] = await Promise.all([
  load("characters.json"), load("story.json"),
  load("text.en.json"), load("text.pl.json"), load("media.json"),
]);

const i18n = createI18n({ en, pl }, localStorage.getItem("aats-locale") ?? "pl");

const dom = {
  screens: {
    character: document.querySelector("#screen-character"),
    game: document.querySelector("#screen-game"),
    end: document.querySelector("#screen-end"),
  },
  journal: document.querySelector("#journal"),
  sheet: document.querySelector("#sheet"),
  characterChoices: document.querySelector("#character-choices"),
  endSummary: document.querySelector("#end-summary"),
};

let ctx = null;
let frame = null;
const history = [];

function showScreen(name) {
  for (const [key, node] of Object.entries(dom.screens)) node.hidden = key !== name;
  dom.sheet.hidden = name !== "game";
}

// Cofać się nie wolno, więc przyciski w starszych wpisach dziennika gasną.
function lockPast() {
  const blocks = [...dom.journal.querySelectorAll(".journal-entry")];
  blocks.forEach((block, index) => {
    if (index === blocks.length - 1) return;
    for (const button of block.querySelectorAll("button")) button.disabled = true;
  });
}

function draw(record, isLast) {
  const block = renderEvents(dom.journal, record.events, i18n, { onChoose: choose },
    { entryId: record.entryId });
  if (isLast && frame.pending?.type === "rollDecision") {
    renderRollDecision(block, frame.pending, i18n, {
      onLuck: () => advance(resume(ctx, frame, { type: "luck" })),
      onPush: () => advance(resume(ctx, frame, { type: "push" })),
      onAccept: () => advance(resume(ctx, frame, { type: "accept" })),
    });
  }
}

function advance(next) {
  frame = next;
  history.push({ entryId: frame.entryId, events: frame.events });
  draw(history.at(-1), true);
  lockPast();
  renderSheet(dom.sheet, frame.state, ctx.character, i18n.locale);
  if (frame.pending?.type === "end") showEnd();
}

// Zmiana języka przerysowuje cały dziennik od początku rozgrywki.
function redraw() {
  clearJournal(dom.journal);
  history.forEach((record, index) => draw(record, index === history.length - 1));
  lockPast();
  renderSheet(dom.sheet, frame.state, ctx.character, i18n.locale);
}

function choose(index) {
  advance(resume(ctx, frame, { type: "choose", index }));
}

function showEnd() {
  dom.endSummary.replaceChildren();
  const summary = document.createElement("ul");
  summary.innerHTML = `
    <li>Paragraf końcowy: ${frame.entryId}</li>
    <li>Hit Points: ${frame.state.hp} / ${frame.state.maxHp}</li>
    <li>Sanity: ${frame.state.san} / ${frame.state.startingSan}</li>
    <li>Luck: ${frame.state.luck}</li>
    <li>Log sheet: ${frame.state.flags.join(", ") || "—"}</li>`;
  dom.endSummary.append(summary);
  showScreen("end");
}

function startGame(characterId) {
  const character = characters[characterId];
  ctx = { story, character, rng: Math.random };
  history.length = 0;
  clearJournal(dom.journal);
  showScreen("game");
  advance(enter(ctx, createState(character, { rng: Math.random }), story.start));
}

function renderCharacterChoice() {
  dom.characterChoices.replaceChildren();
  for (const character of Object.values(characters)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.textContent = `${character.name} — ${character.occupation} · SAN ${character.san} · HP ${character.hp}`;
    button.addEventListener("click", () => startGame(character.id));
    dom.characterChoices.append(button);
  }
  showScreen("character");
}

document.querySelector("#lang-toggle").addEventListener("click", (event) => {
  const next = i18n.locale === "pl" ? "en" : "pl";
  i18n.setLocale(next);
  localStorage.setItem("aats-locale", next);
  event.target.textContent = next === "pl" ? "EN" : "PL";
  if (frame) redraw();
});

document.querySelector("#sheet-toggle").addEventListener("click", (event) => {
  const open = dom.sheet.classList.toggle("open");
  event.target.setAttribute("aria-expanded", String(open));
});

document.querySelector("#restart").addEventListener("click", renderCharacterChoice);

renderCharacterChoice();
```

- [ ] **Step 6: Uruchom grę i sprawdź w przeglądarce**

Run: `cd /Users/marek/OfflineDocuments/Repo/Antigravity/Design && python3 -m http.server 8080`
Otwórz `http://127.0.0.1:8080/AloneAgainstTheStatic/`.
Expected: ekran wyboru postaci; po wyborze pojawia się paragraf 1 z numerem, tekstem i dwoma wyborami; klikanie prowadzi dalej, a starsze wpisy przygasają i mają wygaszone przyciski; przy porażce rzutu pojawiają się przyciski decyzji; przełącznik EN/PL przerysowuje cały dziennik. Konsola bez błędów.

Uwaga: `main.js` importuje `renderSheet` z modułu dostarczanego w zadaniu 9 — do jego wykonania panel postaci nie działa i konsola zgłosi brak modułu. To oczekiwane; zadania 8 i 9 wykonaj jedno po drugim.

- [ ] **Step 7: Commit**

```bash
git add AloneAgainstTheStatic/index.html AloneAgainstTheStatic/style.css AloneAgainstTheStatic/src/ui/
git commit -m "Strona, styl VHS i dziennik rozgrywki"
```

---

### Task 9: Panel postaci

**Files:**
- Create: `AloneAgainstTheStatic/src/ui/sheet.js`

**Interfaces:**
- Consumes: `state.js` (`penaltyFor`)
- Produces: `renderSheet(root, state, character) -> void`

Uwaga: `main.js` z zadania 8 już importuje `renderSheet`. To zadanie dostarcza brakujący moduł, więc wykonaj je bezpośrednio po zadaniu 8.

- [ ] **Step 1: Napisz moduł panelu**

`AloneAgainstTheStatic/src/ui/sheet.js`:

```js
import { penaltyFor } from "../engine/state.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function meter(label, value, max, kind) {
  const wrap = document.createDocumentFragment();
  wrap.append(el("div", null, `${label} ${value}/${max}`));
  const bar = el("div", `meter ${kind}`);
  const fill = el("span");
  fill.style.width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
  bar.append(fill);
  wrap.append(bar);
  return wrap;
}

// Panel jest odbiciem stanu — nie liczy niczego, tylko go pokazuje.
export function renderSheet(root, state, character, locale = "en") {
  const localized = (field) => field[locale] || field.en;

  root.replaceChildren();
  root.append(el("h2", null, `${character.name} · ${character.occupation}`));
  root.append(meter("HP", state.hp, state.maxHp, "hp"));
  root.append(meter("SAN", state.san, state.startingSan, "san"));
  root.append(meter("LUCK", state.luck, 100, "luck"));

  if (state.majorWound) root.append(el("div", null, "⚠ Poważna rana"));
  if (state.indefinitelyInsane) root.append(el("div", null, "⚠ Trwałe zaburzenie"));

  root.append(el("h2", null, "Log sheet"));
  const flags = el("ul");
  if (state.flags.length === 0) flags.append(el("li", null, "—"));
  for (const flag of state.flags) flags.append(el("li", null, `☑ ${flag.replace(/_/g, " ")}`));
  root.append(flags);

  root.append(el("h2", null, "Umiejętności"));
  const skills = el("ul");
  for (const [name, value] of Object.entries(character.skills)) {
    const penalty = penaltyFor(state, name);
    skills.append(el("li", null, penalty ? `${name} ${value} (kara ${penalty})` : `${name} ${value}`));
  }
  root.append(skills);

  root.append(el("h2", null, "Cechy"));
  const traits = el("ul");
  for (const [name, value] of Object.entries(character.characteristics)) {
    traits.append(el("li", null, `${name} ${value}`));
  }
  root.append(traits);

  root.append(el("h2", null, "Moja historia"));
  root.append(el("p", null, localized(character.story)));

  root.append(el("h2", null, "Tło"));
  const background = el("ul");
  for (const field of character.backstory) {
    background.append(el("li", null, `${field.label}: ${localized(field)}`));
  }
  root.append(background);
}
```

- [ ] **Step 2: Sprawdź w przeglądarce**

Odśwież `http://127.0.0.1:8080/AloneAgainstTheStatic/`.
Expected: panel po prawej pokazuje HP, SAN, Luck z paskami, listę flag rosnącą w miarę gry i listę umiejętności. Po zwężeniu okna poniżej 52rem panel schodzi na dół i otwiera się przyciskiem „Karta".

- [ ] **Step 3: Commit**

```bash
git add AloneAgainstTheStatic/src/ui/sheet.js
git commit -m "Panel postaci z log sheetem i umiejętnościami"
```

---

### Task 10: Autosave

**Files:**
- Create: `AloneAgainstTheStatic/src/ui/save.js`
- Modify: `AloneAgainstTheStatic/src/ui/main.js`

**Interfaces:**
- Consumes: `state.js` (`serialize`, `deserialize`)
- Produces: `saveGame({characterId, entryId, state}) -> void`, `loadGame() -> {characterId, entryId, state} | null`, `clearSave() -> void`

- [ ] **Step 1: Napisz moduł zapisu**

`AloneAgainstTheStatic/src/ui/save.js`:

```js
import { serialize, deserialize } from "../engine/state.js";

const KEY = "aats-save";
const VERSION = 1;

export function saveGame({ characterId, entryId, state }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, characterId, entryId, state: serialize(state) }));
  } catch {
    // Brak miejsca lub zablokowany localStorage — gra ma działać dalej bez zapisu.
  }
}

// Uszkodzony lub starszy zapis jest kasowany, a gra zaczyna się od nowa.
export function loadGame() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version !== VERSION) throw new Error("stara wersja zapisu");
    if (!parsed.characterId || typeof parsed.entryId !== "number") throw new Error("niepełny zapis");
    return { characterId: parsed.characterId, entryId: parsed.entryId, state: deserialize(parsed.state) };
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
```

- [ ] **Step 2: Podłącz zapis w `main.js`**

W `src/ui/main.js` dopisz import obok pozostałych:

```js
import { saveGame, loadGame, clearSave } from "./save.js";
```

W funkcji `advance` dodaj zapis na końcu, przed sprawdzeniem końca gry:

```js
  renderSheet(dom.sheet, frame.state, ctx.character, i18n.locale);
  saveGame({ characterId: ctx.character.id, entryId: frame.entryId, state: frame.state });
  if (frame.pending?.type === "end") showEnd();
```

W `startGame` skasuj poprzedni zapis — dopisz `clearSave();` zaraz po pobraniu postaci:

```js
function startGame(characterId) {
  const character = characters[characterId];
  clearSave();
  ctx = { story, character, rng: Math.random };
  history.length = 0;
  clearJournal(dom.journal);
  showScreen("game");
  advance(enter(ctx, createState(character, { rng: Math.random }), story.start));
}
```

Zamień ostatnią linię pliku `renderCharacterChoice();` na wznowienie zapisu:

```js
const saved = loadGame();
if (saved && characters[saved.characterId]) {
  ctx = { story, character: characters[saved.characterId], rng: Math.random };
  showScreen("game");
  advance(enter(ctx, saved.state, saved.entryId));
} else {
  renderCharacterChoice();
}
```

- [ ] **Step 3: Sprawdź w przeglądarce**

Zagraj kilka paragrafów, odśwież stronę.
Expected: gra wznawia się na tym samym paragrafie, z tym samym HP, SAN, Luck i flagami. Dziennik zaczyna się od paragrafu wznowienia — wcześniejszych nie odtwarzamy, bo zapisujemy stan, nie historię.

- [ ] **Step 4: Sprawdź odporność na uszkodzony zapis**

W konsoli przeglądarki: `localStorage.setItem("aats-save", "{zepsute")` i odśwież.
Expected: gra startuje od ekranu wyboru postaci, bez błędu w konsoli.

- [ ] **Step 5: Commit**

```bash
git add AloneAgainstTheStatic/src/ui/save.js AloneAgainstTheStatic/src/ui/main.js
git commit -m "Autosave rozgrywki w localStorage"
```

---

### Task 11: Media i ustawienia

**Files:**
- Create: `AloneAgainstTheStatic/src/ui/audio.js`
- Create: `AloneAgainstTheStatic/src/ui/settings.js`
- Modify: `AloneAgainstTheStatic/src/ui/main.js`
- Modify: `AloneAgainstTheStatic/src/ui/journal.js`
- Modify: `AloneAgainstTheStatic/index.html`

**Interfaces:**
- Consumes: `data/media.json`
- Produces: `createAudio(media, settings) -> {playNarration(entryId, locale), playScene(scene), stopAll()}`, `createSettings() -> {values, set(key, value), subscribe(fn)}`

- [ ] **Step 1: Napisz moduł ustawień**

`AloneAgainstTheStatic/src/ui/settings.js`:

```js
const KEY = "aats-settings";
const DEFAULTS = {
  narration: true,
  narrationVolume: 0.9,
  musicVolume: 0.4,
  scanlines: 0.05,
  proseSize: 1.05,
};

export function createSettings() {
  let values = { ...DEFAULTS };
  try {
    values = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    // Uszkodzone ustawienia zastępujemy domyślnymi.
  }
  const listeners = [];

  function apply() {
    document.documentElement.style.setProperty("--scanline-strength", String(values.scanlines));
    document.documentElement.style.setProperty("--prose-size", `${values.proseSize}rem`);
  }
  apply();

  return {
    get values() { return values; },
    set(key, value) {
      values = { ...values, [key]: value };
      localStorage.setItem(KEY, JSON.stringify(values));
      apply();
      listeners.forEach((fn) => fn(values));
    },
    subscribe(fn) { listeners.push(fn); },
  };
}
```

- [ ] **Step 2: Napisz moduł dźwięku**

`AloneAgainstTheStatic/src/ui/audio.js`:

```js
const FADE_MS = 2500;

// Lektor i muzyka są opcjonalne: brak pliku w media.json albo brak samego
// pliku na dysku oznacza ciszę, nie błąd.
export function createAudio(media, settings) {
  const base = new URL("../../", import.meta.url);
  let narration = null;
  let music = null;
  let currentScene = null;

  function fadeOut(node) {
    if (!node) return;
    const step = node.volume / (FADE_MS / 50);
    const timer = setInterval(() => {
      node.volume = Math.max(0, node.volume - step);
      if (node.volume === 0) { clearInterval(timer); node.pause(); }
    }, 50);
  }

  return {
    playNarration(entryId, locale) {
      if (narration) { narration.pause(); narration = null; }
      if (!settings.values.narration) return;
      const src = media.entries?.[String(entryId)]?.audio?.[locale];
      if (!src) return;
      narration = new Audio(new URL(src, base));
      narration.volume = settings.values.narrationVolume;
      // Przeglądarki blokują dźwięk przed pierwszą interakcją — cicho to ignorujemy.
      narration.play().catch(() => {});
    },

    playScene(scene) {
      if (!scene || scene === currentScene) return;
      const src = media.scenes?.[scene];
      currentScene = scene;
      fadeOut(music);
      if (!src) { music = null; return; }
      music = new Audio(new URL(src, base));
      music.loop = true;
      music.volume = 0;
      music.play().catch(() => {});
      const target = settings.values.musicVolume;
      const step = target / (FADE_MS / 50);
      const timer = setInterval(() => {
        music.volume = Math.min(target, music.volume + step);
        if (music.volume >= target) clearInterval(timer);
      }, 50);
    },

    stopAll() {
      narration?.pause();
      fadeOut(music);
      narration = null;
      currentScene = null;
    },
  };
}
```

- [ ] **Step 3: Dodaj grafikę paragrafu do dziennika**

W `src/ui/journal.js`, w funkcji `renderEvents`, tuż pod linią dodającą numer paragrafu wstaw grafikę:

```js
  if (context.entryId !== undefined) block.append(el("div", "entry-number", String(context.entryId)));

  const image = context.media?.entries?.[String(context.entryId)]?.image;
  if (image) {
    const img = document.createElement("img");
    img.className = "entry-image";
    img.src = new URL(image, new URL("../../", import.meta.url));
    img.alt = "";
    // Brakujący plik znika bez śladu zamiast zostawiać ikonę zepsutego obrazka.
    img.addEventListener("error", () => img.remove());
    block.append(img);
  }
```

- [ ] **Step 4: Dodaj panel ustawień do `index.html`**

Wstaw przed `</main>`:

```html
      <dialog id="settings-dialog" class="settings">
        <form method="dialog">
          <h2>Ustawienia</h2>
          <label>Lektor <input type="checkbox" id="set-narration" /></label>
          <label>Głośność lektora <input type="range" id="set-narration-volume" min="0" max="1" step="0.05" /></label>
          <label>Głośność muzyki <input type="range" id="set-music-volume" min="0" max="1" step="0.05" /></label>
          <label>Linie skanowania <input type="range" id="set-scanlines" min="0" max="0.15" step="0.01" /></label>
          <label>Rozmiar tekstu <input type="range" id="set-prose" min="0.9" max="1.4" step="0.05" /></label>
          <button type="submit" class="action">Zamknij</button>
        </form>
      </dialog>
```

Dopisz do `style.css`:

```css
.settings { background: var(--panel); color: var(--ink); border: 1px solid var(--line); max-width: 22rem; }
.settings h2 { font-family: var(--font-machine); letter-spacing: 0.14em; font-size: 0.8rem; }
.settings label { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin: 0.8rem 0; font-size: 0.85rem; }
.settings::backdrop { background: rgba(0, 0, 0, 0.7); }
```

- [ ] **Step 5: Podłącz wszystko w `main.js`**

Dopisz importy:

```js
import { createAudio } from "./audio.js";
import { createSettings } from "./settings.js";
```

Po utworzeniu `i18n` dodaj:

```js
const settings = createSettings();
const audio = createAudio(media, settings);
```

W funkcji `draw` dołóż media do kontekstu renderera:

```js
  const block = renderEvents(dom.journal, record.events, i18n, { onChoose: choose },
    { entryId: record.entryId, media });
```

W funkcji `advance` odpal dźwięk zaraz po `draw`:

```js
  draw(history.at(-1), true);
  audio.playNarration(frame.entryId, i18n.locale);
  audio.playScene(story.entries[String(frame.entryId)]?.scene);
  lockPast();
```

Podłącz kontrolki ustawień na końcu pliku, przed wznowieniem zapisu:

```js
const dialog = document.querySelector("#settings-dialog");
const controls = {
  narration: ["#set-narration", "checked"],
  narrationVolume: ["#set-narration-volume", "value"],
  musicVolume: ["#set-music-volume", "value"],
  scanlines: ["#set-scanlines", "value"],
  proseSize: ["#set-prose", "value"],
};
for (const [key, [selector, property]] of Object.entries(controls)) {
  const input = document.querySelector(selector);
  input[property] = settings.values[key];
  input.addEventListener("input", () => {
    settings.set(key, property === "checked" ? input.checked : Number(input.value));
  });
}
document.querySelector("#settings-toggle").addEventListener("click", () => dialog.showModal());
```

- [ ] **Step 6: Sprawdź w przeglądarce**

Odśwież stronę.
Expected: przycisk „Ustawienia" otwiera okno; suwak linii skanowania natychmiast zmienia wygląd tła; suwak rozmiaru tekstu zmienia akapity; brak plików audio i grafik nie powoduje żadnych błędów w konsoli.

- [ ] **Step 7: Dodaj przykładowy wpis do `media.json`, żeby sprawdzić ścieżkę grafiki**

Podmień zawartość `data/media.json`:

```json
{
  "entries": {},
  "scenes": {
    "drive": "media/music/drive.mp3",
    "cabin": "media/music/cabin.mp3"
  }
}
```

Utwórz katalogi na przyszłe pliki:

```bash
mkdir -p AloneAgainstTheStatic/media/music AloneAgainstTheStatic/media/narration AloneAgainstTheStatic/media/img
touch AloneAgainstTheStatic/media/music/.gitkeep AloneAgainstTheStatic/media/narration/.gitkeep AloneAgainstTheStatic/media/img/.gitkeep
```

Expected po odświeżeniu: konsola bez błędów mimo brakujących plików muzyki.

- [ ] **Step 8: Commit**

```bash
git add AloneAgainstTheStatic/src/ui/ AloneAgainstTheStatic/index.html AloneAgainstTheStatic/style.css AloneAgainstTheStatic/data/media.json AloneAgainstTheStatic/media/
git commit -m "Lektor, muzyka scen, grafiki paragrafów i ustawienia"
```

---

### Task 12: Plik do tłumaczenia, narzędzie autorskie i dokumentacja

**Files:**
- Create: `AloneAgainstTheStatic/tools/make-translation.mjs`
- Create: `AloneAgainstTheStatic/tools/dev.html`
- Create: `AloneAgainstTheStatic/README.md`
- Modify: `AloneAgainstTheStatic/data/text.pl.json`

**Interfaces:**
- Consumes: `data/story.json`, `data/text.en.json`, `data/text.pl.json`
- Produces: `text.pl.json` z kompletem kluczy w kolejności paragrafów, z angielskim oryginałem w polu pomocniczym

- [ ] **Step 1: Napisz generator pliku do tłumaczenia**

`AloneAgainstTheStatic/tools/make-translation.mjs`:

```js
// Buduje text.pl.json z kompletem kluczy w kolejności paragrafów.
// Już przetłumaczone wpisy zostają nietknięte; nowe dostają pusty string
// i sąsiadujący klucz "__en" z oryginałem, żeby tłumaczyć bez drugiego pliku.
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../data/", import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, dir)));

const story = load("story.json");
const en = load("text.en.json");
const pl = load("text.pl.json");

const out = {};
let added = 0;

const ids = Object.keys(story.entries).map(Number).sort((a, b) => a - b);
for (const id of ids) {
  const entry = story.entries[id];
  const keys = [...(entry.text ?? []), ...(entry.choices ?? []).map((c) => c.text)];
  for (const key of keys) {
    if (!(key in en)) continue;
    out[`__en.${key}`] = en[key];
    if (pl[key]) out[key] = pl[key];
    else { out[key] = ""; added += 1; }
  }
}

writeFileSync(new URL("text.pl.json", dir), JSON.stringify(out, null, 2) + "\n");
console.log(`Plik tłumaczenia zawiera ${Object.keys(out).length / 2} wpisów, w tym ${added} nowych do przetłumaczenia.`);
```

- [ ] **Step 2: Wygeneruj plik i sprawdź, że gra go znosi**

Run: `cd AloneAgainstTheStatic && node tools/make-translation.mjs && node tools/validate.mjs`
Expected: plik powstaje; walidator nie zgłasza błędów. Pusty string w `text.pl.json` musi zachowywać się jak brak tłumaczenia, więc popraw `src/ui/i18n.js`:

```js
    t(key) {
      const value = sources[locale]?.[key] || sources.en?.[key];
      return value ?? `[${key}]`;
    },
```

Klucze `__en.*` nigdy nie są odpytywane przez grę, więc mogą w pliku zostać.

- [ ] **Step 3: Napisz narzędzie autorskie**

`AloneAgainstTheStatic/tools/dev.html`:

```html
<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <title>Alone Against the Static — narzędzie autorskie</title>
    <style>
      body { font-family: ui-monospace, monospace; background: #0a0a0c; color: #cfcfd6; padding: 2rem; }
      table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
      td, th { border: 1px solid #23232b; padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; }
      a { color: #00d8ff; }
      .warn { color: #ff3a6a; }
    </style>
  </head>
  <body>
    <h1>Paragrafy</h1>
    <p>Lista wyekstrahowanych paragrafów z podglądem mechaniki. Służy do sprawdzania danych i podpinania mediów — nie jest częścią gry.</p>
    <table id="list"><thead><tr><th>#</th><th>Scena</th><th>Tekst</th><th>Mechanika</th><th>Przejścia</th><th>Media</th></tr></thead><tbody></tbody></table>

    <script type="module">
      const base = new URL("../data/", import.meta.url);
      const load = (n) => fetch(new URL(n, base)).then((r) => r.json());
      const [story, en, media] = await Promise.all([load("story.json"), load("text.en.json"), load("media.json")]);
      const body = document.querySelector("#list tbody");

      for (const id of Object.keys(story.entries).map(Number).sort((a, b) => a - b)) {
        const entry = story.entries[id];
        const row = document.createElement("tr");
        const targets = [
          ...(entry.choices ?? []).map((c) => c.goto),
          ...(entry.guards ?? []).map((g) => g.goto),
        ];
        const hasAudio = Boolean(media.entries?.[id]?.audio);
        const hasImage = Boolean(media.entries?.[id]?.image);
        row.innerHTML = `
          <td>${id}</td>
          <td>${entry.scene ?? "<span class='warn'>brak</span>"}</td>
          <td>${(entry.text ?? []).map((k) => en[k] ?? `<span class='warn'>${k}</span>`).join(" ").slice(0, 160)}…</td>
          <td>${JSON.stringify(entry.on ?? [])}</td>
          <td>${targets.join(", ") || "—"}${entry.end ? " KONIEC" : ""}</td>
          <td>${hasAudio ? "♪" : "—"} ${hasImage ? "▣" : "—"}</td>`;
        body.append(row);
      }
    </script>
  </body>
</html>
```

- [ ] **Step 4: Napisz README**

`AloneAgainstTheStatic/README.md`:

```markdown
# Alone Against the Static — wersja przeglądarkowa

Solowa przygoda Call of Cthulhu 7e (Chaosium, 2023) w przeglądarce.
Projekt prywatny; treść scenariusza pozostaje własnością Chaosium.

## Uruchomienie

Z katalogu głównego repozytorium:

    python3 -m http.server 8080

Gra: <http://127.0.0.1:8080/AloneAgainstTheStatic/>
Narzędzie autorskie: <http://127.0.0.1:8080/AloneAgainstTheStatic/tools/dev.html>

## Testy i walidacja

    cd AloneAgainstTheStatic
    node --test test/*.test.js
    node tools/validate.mjs

## Dane

| Plik | Zawartość |
|---|---|
| `data/story.json` | mechanika paragrafów, przejścia, klucze tekstów |
| `data/text.en.json` | teksty angielskie |
| `data/text.pl.json` | teksty polskie; klucze `__en.*` to podgląd oryginału |
| `data/characters.json` | karty Alex i Charlie |
| `data/media.json` | grafiki, lektor, muzyka scen |

Pole `extracted` w `story.json` mówi, które paragrafy są już przepisane.
Przejścia poza ten zakres to w grze zaślepka, a w walidatorze ostrzeżenie.

## Tłumaczenie

    node tools/make-translation.mjs

Uzupełniasz puste wartości w `data/text.pl.json`. Klucz `__en.<klucz>`
tuż nad każdym wpisem zawiera oryginał. Ponowne uruchomienie skryptu
nie kasuje tego, co już przetłumaczone.

## Media

Pliki wrzucasz do `media/narration/`, `media/music/`, `media/img/`
i wpisujesz ścieżki do `data/media.json`. Brakujący plik nie psuje gry.

## Deploy

    ./universal-deploy/deploy.sh --go alone-against-the-static
```

- [ ] **Step 5: Uruchom pełną weryfikację**

Run:
```bash
cd AloneAgainstTheStatic && node --test test/*.test.js && node tools/validate.mjs
```
Expected: wszystkie testy przechodzą, walidator zwraca `0 błędów`

- [ ] **Step 6: Przejdź grę od początku do końca wyekstrahowanego fragmentu**

Otwórz grę, wybierz Charlie, przejdź do momentu, w którym trafisz na zaślepkę „nie został jeszcze przepisany". Powtórz jako Alex.
Expected: żadnych błędów w konsoli, panel postaci aktualizuje się przy każdej zmianie HP/SAN/Luck, przełącznik języka działa, zaślepka pojawia się zamiast pustego ekranu.

- [ ] **Step 7: Commit**

```bash
git add AloneAgainstTheStatic/tools/make-translation.mjs AloneAgainstTheStatic/tools/dev.html AloneAgainstTheStatic/README.md AloneAgainstTheStatic/data/text.pl.json AloneAgainstTheStatic/src/ui/i18n.js
git commit -m "Plik do tłumaczenia, narzędzie autorskie i dokumentacja"
```

---

## Po tym planie

Pionowy plaster jest gotowy. Kolejne kroki, każdy jako osobny plan:

1. **Ekstrakcja paragrafów 31–371** — rozszerzenie `RANGE` w `build-story.mjs`, obsługa konstrukcji, które w pierwszych 30 paragrafach nie występują (wybory jednorazowe z paragrafu 336, warunki `visits`, `sanCheck`, walka), przegląd listy nierozpoznanych zdań.
2. **Tłumaczenie PL** — uzupełnianie `text.pl.json`.
3. **Media** — nagrania lektora, muzyka, grafiki.
