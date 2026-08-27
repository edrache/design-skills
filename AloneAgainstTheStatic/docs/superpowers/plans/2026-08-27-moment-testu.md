# Jednolity moment testu — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Każdy rzut d100 zatrzymuje grę przed zastosowaniem skutków i oferuje ten sam zestaw decyzji: przyjmij wynik, forsuj (gdy dane pozwalają), wypal Szczęście (gdy wolno i stać gracza), cheat na przeciwny wynik.

**Architecture:** Nowy moduł `src/engine/decision.js` jest jedynym miejscem, które liczy progi trudności i dostępność decyzji — korzystają z niego silnik i walidacja zapisu. `runner.js` zamiast stosować gałąź rzutu od razu, zwraca ramkę z `pending.type === "rollDecision"` nosącą `kind` (`skill` / `sanCheck` / `bout`), `stepIndex`, `cursor` i `pushed`; `resume` rozstrzyga decyzję i dopiero wtedy stosuje skutek. Cała maszyneria cofania po fakcie (`frame.rewind`, `withRewind`, `rewindFor`) znika, bo cheat jest teraz decyzją przed skutkiem.

**Tech Stack:** Vanilla ES modules, `node --test` (node:test + node:assert/strict), brak zależności runtime. Testy uruchamia `npm test` w katalogu `AloneAgainstTheStatic`.

## Global Constraints

- Katalog roboczy wszystkich komend: `AloneAgainstTheStatic`.
- Komentarze i teksty w kodzie po polsku, w stylu istniejących plików: tłumaczą **dlaczego**, nie **co**. Nie dopisuj komentarzy do rzeczy oczywistych.
- Zero nowych zależności. Zero `console.log` w kodzie źródłowym.
- Pełny zestaw testów po każdym zadaniu: `npm test` (uruchamia `tools/build-music.mjs` i `node --test test/*.test.js`).
- Nie zmieniaj treści paragrafów w `data/story.json` ani `data/text.*.json` poza etykietami wymienionymi wprost w zadaniu 4.
- Dostępność decyzji obowiązuje dokładnie ta tabela:
  - przyjmij wynik — zawsze;
  - forsuj — porażka ∧ `push: true` w kroku ∧ `pushed === false` ∧ `kind === "skill"`;
  - wypal Szczęście — porażka ∧ `kind === "skill"` ∧ skill inny niż `Sanity` i `Luck` ∧ `luckCost > 0` ∧ `state.luck >= luckCost`;
  - cheat — zawsze, w obie strony.
- Commity po polsku, tryb orzekający w 3. osobie, jak w historii repo („Dodaje…”, „Spina…”).

---

### Task 1: Moduł decyzji

**Files:**
- Create: `src/engine/decision.js`
- Test: `test/decision.test.js`

**Interfaces:**
- Consumes: nic.
- Produces:
  - `requiredThreshold(target: number, difficulty?: "regular"|"hard"|"extreme") => number`
  - `decisionFor(state, check, context) => { canPush: boolean, canLuck: boolean, luckCost: number, canCheat: true }`, gdzie `state` to stan gry (potrzebne `state.luck`), `check` to wynik `skillCheck` (`{ target, difficulty, result, success }`), a `context` to `{ kind: "skill"|"sanCheck"|"bout", skill: string, pushable?: boolean, pushed?: boolean }`.

- [ ] **Step 1: Napisz czerwony test**

Utwórz `test/decision.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { requiredThreshold, decisionFor } from "../src/engine/decision.js";

const stateWith = (luck) => ({ luck });
const check = (over) => ({ target: 60, difficulty: "regular", result: 90, success: false, ...over });

test("próg trudności obniża się przy hard i extreme", () => {
  assert.equal(requiredThreshold(60), 60);
  assert.equal(requiredThreshold(60, "hard"), 30);
  assert.equal(requiredThreshold(61, "extreme"), 12);
});

test("udany rzut nie oferuje forsowania ani Szczęścia, ale zawsze cheat", () => {
  const out = decisionFor(stateWith(99), check({ result: 20, success: true }), {
    kind: "skill", skill: "Spot Hidden", pushable: true,
  });
  assert.deepEqual(out, { canPush: false, canLuck: false, luckCost: 0, canCheat: true });
});

test("nieudany rzut na umiejętność wycenia dopłatę Szczęściem", () => {
  const out = decisionFor(stateWith(40), check(), { kind: "skill", skill: "Spot Hidden" });
  assert.equal(out.canLuck, true);
  assert.equal(out.luckCost, 30);
  assert.equal(out.canPush, false);
});

test("dopłata Szczęściem liczy się od progu trudności, nie od pełnej umiejętności", () => {
  const out = decisionFor(stateWith(99), check({ difficulty: "hard", result: 50 }), {
    kind: "skill", skill: "Spot Hidden",
  });
  assert.equal(out.luckCost, 20); // 50 - floor(60/2)
});

test("za mało Szczęścia zamyka dopłatę, ale koszt zostaje policzony", () => {
  const out = decisionFor(stateWith(10), check(), { kind: "skill", skill: "Spot Hidden" });
  assert.equal(out.canLuck, false);
  assert.equal(out.luckCost, 30);
});

test("rzutów na Sanity i Luck nie ratuje się Szczęściem", () => {
  for (const skill of ["Sanity", "Luck"]) {
    const out = decisionFor(stateWith(99), check(), { kind: "skill", skill });
    assert.equal(out.canLuck, false, skill);
  }
});

test("rzuty wewnętrzne nie mają forsowania ani Szczęścia, tylko przyjęcie i cheat", () => {
  const san = decisionFor(stateWith(99), check(), { kind: "sanCheck", skill: "Sanity" });
  const bout = decisionFor(stateWith(99), check(), { kind: "bout", skill: "INT" });
  assert.deepEqual(san, { canPush: false, canLuck: false, luckCost: 30, canCheat: true });
  assert.deepEqual(bout, { canPush: false, canLuck: false, luckCost: 30, canCheat: true });
});

test("forsowanie tylko raz i tylko gdy krok je oferuje", () => {
  const first = decisionFor(stateWith(0), check(), { kind: "skill", skill: "Listen", pushable: true });
  const again = decisionFor(stateWith(0), check(), { kind: "skill", skill: "Listen", pushable: true, pushed: true });
  const never = decisionFor(stateWith(0), check(), { kind: "skill", skill: "Listen" });
  assert.equal(first.canPush, true);
  assert.equal(again.canPush, false);
  assert.equal(never.canPush, false);
});
```

- [ ] **Step 2: Uruchom test i potwierdź porażkę**

Run: `npm test -- --test-name-pattern "próg trudności"` albo prościej `node --test test/decision.test.js`
Expected: FAIL — `Cannot find module '../src/engine/decision.js'`

- [ ] **Step 3: Napisz minimalną implementację**

Utwórz `src/engine/decision.js`:

```js
// Progi trudności i dostępność decyzji po rzucie mieszkają razem, bo liczy je
// dwóch klientów: silnik przy zatrzymaniu na rzucie i walidacja zapisu, która
// odtwarza pending z danych. Rozjazd między nimi kasowałby poprawne zapisy.

export function requiredThreshold(target, difficulty = "regular") {
  if (difficulty === "hard") return Math.floor(target / 2);
  if (difficulty === "extreme") return Math.floor(target / 5);
  return target;
}

// Przy sukcesie zostaje samo przyjęcie wyniku i cheat — forsować i dopłacać
// nie ma czego. Przy porażce koszt Szczęścia liczymy od progu wymaganego
// przez difficulty, nie od pełnej umiejętności: przy Hard/Extreme pełna
// wartość dałaby koszt zaniżony albo ujemny.
export function decisionFor(state, check, context) {
  if (check.success) return { canPush: false, canLuck: false, luckCost: 0, canCheat: true };

  const threshold = requiredThreshold(check.target, check.difficulty ?? "regular");
  const luckCost = check.result - threshold;
  const skillRoll = context.kind === "skill";
  const canLuck = skillRoll
    && context.skill !== "Sanity"
    && context.skill !== "Luck"
    && luckCost > 0
    && state.luck >= luckCost;

  return {
    canPush: skillRoll && Boolean(context.pushable) && !context.pushed,
    canLuck,
    luckCost,
    canCheat: true,
  };
}
```

- [ ] **Step 4: Uruchom testy**

Run: `node --test test/decision.test.js`
Expected: PASS (8 testów)

- [ ] **Step 5: Uruchom pełny zestaw**

Run: `npm test`
Expected: PASS — nowy moduł nie ma jeszcze konsumentów, nic nie powinno się zepsuć.

- [ ] **Step 6: Commit**

```bash
git add src/engine/decision.js test/decision.test.js
git commit -m "Dodaje moduł liczący dostępność decyzji po rzucie"
```

---

### Task 2: Rozdzielenie rzutu i skutku w rules.js

**Files:**
- Modify: `src/engine/rules.js` (funkcje `resolveBout` i `sanityCheck` na końcu pliku)
- Test: `test/rules.test.js`

**Interfaces:**
- Consumes: `requiredThreshold` nie jest tu potrzebne; `skillCheck`, `rollDice` z `./dice.js` jak dziś.
- Produces:
  - `rollSanity(state, rng) => check` — rzut przeciw `state.san`.
  - `applySanityCheck(state, check, notation, character, rng) => { state, redirect, lost }` — `notation` to `"X/Y"`, `X` przy sukcesie.
  - `rollBout(state, character, rng) => check` — rzut przeciw INT.
  - `applyBout(state, check, rng) => { state, redirect }` — `redirect: null` przy nieudanym INT.
  - `sanityCheck` i `resolveBout` zostają na czas przejścia jako cienkie opakowania (usuwa je zadanie 6).

- [ ] **Step 1: Napisz czerwone testy**

Dopisz na końcu `test/rules.test.js`:

```js
test("rzut Sanity i jego skutek dają to samo co jedno wywołanie", () => {
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const split = (() => {
    const rng = sequenceRng([0.0, 0.1, 0.3]);
    const check = rollSanity(state, rng);
    return { check, ...applySanityCheck(state, check, "1/1d4", character, rng) };
  })();
  const joined = (() => {
    const out = sanityCheck(state, character, sequenceRng([0.0, 0.1, 0.3]), "1/1d4");
    return { check: out.roll, state: out.state, redirect: out.redirect, lost: out.lost };
  })();
  assert.deepEqual(split.check, joined.check);
  assert.equal(split.lost, joined.lost);
  assert.equal(split.state.san, joined.state.san);
  assert.equal(split.redirect, joined.redirect);
});

test("skutek testu Sanity idzie za werdyktem podanym z zewnątrz, nie za kośćmi", () => {
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rng = sequenceRng([0.0, 0.9]); // rzut 90 — porażka przy Sanity 60
  const check = rollSanity(state, rng);
  assert.equal(check.success, false);
  // Odwrócony werdykt (cheat) musi zabrać stratę z gałęzi sukcesu.
  const flipped = applySanityCheck(state, { ...check, success: true }, "1/1d4", character, sequenceRng([0.5]));
  assert.equal(flipped.lost, 1);
});

test("rzut INT ataku obłędu i jego skutek dają to samo co resolveBout", () => {
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rng = sequenceRng([0.0, 0.1, 0.9]);
  const check = rollBout(state, character, rng);
  const split = { check, ...applyBout(state, check, rng) };
  const joined = resolveBout(state, character, sequenceRng([0.0, 0.1, 0.9]));
  assert.deepEqual(split.check, joined.check);
  assert.equal(split.redirect, joined.redirect);
  assert.deepEqual(split.state.penalties, joined.state.penalties);
});

test("nieudany rzut INT nie nakłada kary i nie przekierowuje", () => {
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const out = applyBout(state, { success: false }, sequenceRng([0.5]));
  assert.equal(out.redirect, null);
  assert.equal(out.state, state);
});
```

Dopisz brakujące importy w nagłówku pliku testowego — do istniejącego importu z `../src/engine/rules.js` dodaj `rollSanity`, `applySanityCheck`, `rollBout`, `applyBout`.

- [ ] **Step 2: Uruchom testy i potwierdź porażkę**

Run: `node --test test/rules.test.js`
Expected: FAIL — `rollSanity is not a function`

- [ ] **Step 3: Rozdziel funkcje**

W `src/engine/rules.js` zamień końcówkę pliku (od komentarza nad `resolveBout` do końca) na:

```js
// Paragraf 329. Rzut oddzielony od skutku, bo gracz może odwrócić jego werdykt
// (cheat), zanim kara zdąży się nałożyć.
export function rollBout(state, character, rng) {
  return skillCheck(rng, skillValue(state, character, "INT"));
}

// Udany rzut INT oznacza, że umysł zamyka się na grozę i dostaje trwałą karę.
export function applyBout(state, check, rng) {
  if (!check.success) return { state, redirect: null };

  const remaining = BOUT_ENTRIES.filter((id) => !state.visitedBouts.includes(id));
  if (remaining.length === 0) return { state, redirect: SYSTEM_ENTRIES.zeroSan };

  const rolled = BOUT_ENTRIES[rollDice(rng, "1d4") - 1];
  const target = remaining.includes(rolled) ? rolled : remaining[0];
  const next = addPenalty(
    { ...state, visitedBouts: [...state.visitedBouts, target] },
    BOUT_PENALTIES[target],
  );
  return { state: next, redirect: target };
}

export function resolveBout(state, character, rng) {
  const check = rollBout(state, character, rng);
  return { ...applyBout(state, check, rng), check };
}

export function rollSanity(state, rng) {
  return skillCheck(rng, state.san);
}

// Notacja typu "X/Y": X przy udanym rzucie przeciw Sanity, Y przy nieudanym.
// Werdykt przychodzi z zewnątrz, bo cheat potrafi go odwrócić po rzucie.
export function applySanityCheck(state, check, notation, character, rng) {
  const [onSuccess, onFail] = String(notation).split("/");
  const lost = rollDice(rng, check.success ? onSuccess : onFail);
  const outcome = applySanLoss(state, lost, character, rng);
  return { state: outcome.state, redirect: outcome.redirect, lost };
}

export function sanityCheck(state, character, rng, notation) {
  const check = rollSanity(state, rng);
  return { ...applySanityCheck(state, check, notation, character, rng), roll: check };
}
```

- [ ] **Step 4: Uruchom testy**

Run: `node --test test/rules.test.js`
Expected: PASS — nowe testy i wszystkie dotychczasowe.

- [ ] **Step 5: Pełny zestaw**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/engine/rules.js test/rules.test.js
git commit -m "Rozdziela rzut od skutku w testach Sanity i ataku obłędu"
```

---

### Task 3: Pauza na każdym rzucie w silniku

**Files:**
- Modify: `src/engine/runner.js` (cały przepływ rzutów; usunięcie `rewind`)
- Test: `test/runner.test.js`

**Interfaces:**
- Consumes: `requiredThreshold`, `decisionFor` z `./decision.js` (zadanie 1); `rollSanity`, `applySanityCheck`, `rollBout`, `applyBout` z `./rules.js` (zadanie 2).
- Produces: ramka `{ state, entryId, events, pending, cursor }` bez pola `rewind`. Kształt `pending` dla rzutu:

```js
{
  type: "rollDecision",
  kind: "skill" | "sanCheck" | "bout",
  roll,            // pełny wynik skillCheck: { units, tens, candidates, result, target, difficulty, level, success }
  skill,           // "Spot Hidden" | "Sanity" | "INT" ...
  stepIndex,       // indeks w entry.on albo entry.choices
  cursor,          // pozycja wznowienia w entry.on
  pushed,          // boolean
  canPush, canLuck, luckCost, canCheat,
  source,          // "choice" tylko gdy rzut wyszedł z wyboru
  choiceIndex,     // tylko gdy source === "choice"
  notation,        // tylko gdy kind === "sanCheck", np. "1/1d4"
}
```
  Akcje `resume`: `{ type: "choose", index }`, `{ type: "accept" }`, `{ type: "push" }`, `{ type: "luck" }`, `{ type: "cheat" }`.

- [ ] **Step 1: Napisz czerwone testy**

Fixture `test/fixtures/story.fixture.json` już zawiera rzuty w krokach i w wyborach — nie zmieniaj go. Dopisz do `test/runner.test.js`:

```js
test("udany rzut też zatrzymuje grę i czeka na przyjęcie wyniku", () => {
  const ctx = ctxWith([0.0, 0.2]); // 20 — sukces przy 60
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 0 });
  assert.equal(rolled.pending.type, "rollDecision");
  assert.equal(rolled.pending.roll.success, true);
  assert.equal(rolled.pending.canPush, false);
  assert.equal(rolled.pending.canLuck, false);
  assert.equal(rolled.pending.canCheat, true);
  const accepted = resume(ctx, rolled, { type: "accept" });
  assert.equal(accepted.entryId, 4);
});

test("nieudany rzut bez forsowania i bez stać-na-Szczęście nadal czeka na decyzję", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const poor = { ...state, luck: 0 };
  const rolled = resume(ctx, enter(ctx, poor, 1), { type: "choose", index: 0 });
  assert.equal(rolled.pending.type, "rollDecision");
  assert.equal(rolled.pending.canPush, false);
  assert.equal(rolled.pending.canLuck, false);
  assert.equal(rolled.pending.canCheat, true);
  assert.equal(resume(ctx, rolled, { type: "accept" }).entryId, 5);
});

test("cheat odwraca werdykt przed skutkami i nie rusza kości", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 0 });
  const cheated = resume(ctx, rolled, { type: "cheat" });
  const event = cheated.events.find((e) => e.kind === "roll");
  assert.equal(event.result, rolled.pending.roll.result);
  assert.equal(event.success, true);
  assert.equal(event.cheated, true);
  assert.deepEqual(event.cheatedFrom, { level: rolled.pending.roll.level, success: false });
  assert.equal(cheated.state.cheats, state.cheats + 1);
  assert.equal(cheated.entryId, 4);
});

test("każdy rzut ramki dostaje własną decyzję, żaden nie przelatuje bez pytania", () => {
  // Paragraf 1 -> wybór 0 -> rzut Psychology; jego onSuccess prowadzi dalej,
  // gdzie czeka kolejny rzut. Po przyjęciu pierwszego gra znów pyta.
  const ctx = ctxWith([0.0, 0.2, 0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const first = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 0 });
  assert.equal(first.pending.type, "rollDecision");
  const second = resume(ctx, first, { type: "accept" });
  assert.equal(second.pending.type, "rollDecision");
  assert.notEqual(second.pending.roll.result, first.pending.roll.result);
});

test("forsowanie znika po jednym użyciu", () => {
  const entry = STORY_WITH_PUSH_ENTRY; // patrz krok 2
  const ctx = { story: entry, character, rng: sequenceRng([0.0, 0.9, 0.0, 0.9]) };
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = enter(ctx, state, 1);
  assert.equal(rolled.pending.canPush, true);
  const pushed = resume(ctx, rolled, { type: "push" });
  assert.equal(pushed.pending.type, "rollDecision");
  assert.equal(pushed.pending.pushed, true);
  assert.equal(pushed.pending.canPush, false);
});

test("test Sanity zatrzymuje grę przed utratą poczytalności i daje cheat", () => {
  const story = {
    entries: {
      1: { text: ["e1.p1"], on: [{ sanCheck: "1/1d4" }], choices: [{ text: "e1.c1", goto: 2 }] },
      2: { text: ["e2.p1"], end: true },
    },
  };
  const ctx = { story, character, rng: sequenceRng([0.0, 0.9, 0.5]) };
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = enter(ctx, state, 1);
  assert.equal(rolled.pending.type, "rollDecision");
  assert.equal(rolled.pending.kind, "sanCheck");
  assert.equal(rolled.pending.notation, "1/1d4");
  assert.equal(rolled.pending.canLuck, false);
  assert.equal(rolled.pending.canPush, false);
  assert.equal(rolled.pending.canCheat, true);
  const san = state.san;
  const cheated = resume(ctx, rolled, { type: "cheat" });
  assert.equal(cheated.state.san, san - 1); // gałąź sukcesu notacji "1/1d4"
  assert.equal(cheated.pending.type, "choices");
});

test("rzut INT ataku obłędu zatrzymuje grę i pozwala go poprawić", () => {
  const story = {
    entries: {
      1: { text: ["e1.p1"], on: [{ goto: 329 }], choices: [{ text: "e1.c1", goto: 2 }] },
      2: { text: ["e2.p1"], end: true },
      329: { text: ["e329.p1"], on: [{ bout: true }] },
    },
  };
  const ctx = { story, character, rng: sequenceRng([0.0, 0.9]) };
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = enter(ctx, state, 1);
  assert.equal(rolled.pending.kind, "bout");
  assert.equal(rolled.pending.skill, "INT");
  assert.equal(rolled.pending.canCheat, true);
  assert.equal(resume(ctx, rolled, { type: "accept" }).entryId, 1);
});
```

W teście „forsowanie znika po jednym użyciu" zamiast stałej `STORY_WITH_PUSH_ENTRY` zdefiniuj lokalnie:

```js
  const entry = {
    entries: {
      1: {
        text: ["e1.p1"],
        on: [{ roll: "Listen", push: true, onFail: { goto: 2 } }],
        choices: [{ text: "e1.c1", goto: 2 }],
      },
      2: { text: ["e2.p1"], end: true },
    },
  };
```

- [ ] **Step 2: Uruchom testy i potwierdź porażkę**

Run: `node --test test/runner.test.js`
Expected: FAIL — nowe testy padają na `pending.type === "choices"` zamiast `rollDecision`, `pending.kind === undefined` itd. Część **starych** testów też padnie (zakładały automatyczne stosowanie sukcesu) — to oczekiwane, poprawisz je w kroku 5.

- [ ] **Step 3: Przepisz przepływ rzutów w `runner.js`**

Importy na górze pliku:

```js
import { rollDice, skillCheck, successLevel } from "./dice.js";
import { requiredThreshold, decisionFor } from "./decision.js";
import {
  hasFlag, setFlag, visit, visitCount, useChoice, isChoiceUsed,
  spendLuck, restoreLuck, restoreHp, penaltyFor, popReturn, pushReturn, skillValue,
  addNextRollDice, takeNextRollDice, countCheat,
} from "./state.js";
import {
  applyDamage, applySanLoss, resetDay,
  rollSanity, applySanityCheck, rollBout, applyBout,
} from "./rules.js";
```

Usuń z pliku: lokalną `requiredThreshold`, `withRewind`, `rewindFor` oraz przenoszenie `rewind` w `mergeForward`. `mergeForward` skraca się do:

```js
// Sklejenie zdarzeń bieżącego paragrafu ze zdarzeniami paragrafu, do którego
// właśnie przeszliśmy.
function mergeForward(events, forward) {
  return frameOf(
    forward.state, forward.entryId, [...events, ...forward.events], forward.pending, forward.cursor,
  );
}
```

`invertedRoll` zostaje bez zmian — działa teraz na `pending.roll`.

Dodaj fabrykę pauzy (nad `runSteps`):

```js
// Każdy rzut zatrzymuje grę, zanim skutek zdąży się wykonać: dopiero wtedy
// gracz wybiera, czy wynik przyjmuje, forsuje, dopłaca Szczęściem, czy poprawia
// zapis. Pending nosi wszystko, co potrzebne do wznowienia, więc cheat nie
// wymaga już cofania paragrafu po fakcie.
function pauseOnRoll(state, entryId, events, check, context) {
  const pending = {
    type: "rollDecision",
    kind: context.kind,
    roll: check,
    skill: context.skill,
    stepIndex: context.stepIndex,
    cursor: context.cursor,
    pushed: Boolean(context.pushed),
    ...decisionFor(state, check, context),
  };
  if (context.source === "choice") {
    pending.source = "choice";
    pending.choiceIndex = context.choiceIndex;
  }
  if (context.notation !== undefined) pending.notation = context.notation;
  return frameOf(state, entryId, events, pending, context.cursor);
}
```

W `runSteps` zamień gałąź `step.bout` na:

```js
    if (step.bout) {
      const check = rollBout(state, ctx.character, ctx.rng);
      events.push({ kind: "roll", skill: "INT", ...check });
      return pauseOnRoll(state, frame.entryId, events, check, {
        kind: "bout", skill: "INT", stepIndex: cursor - 1, cursor,
      });
    }
```

Dodaj przed gałęzią `step.roll` obsługę testu Sanity (dotąd robił to `applyEffect`):

```js
    if (step.sanCheck) {
      const check = rollSanity(state, ctx.rng);
      events.push({ kind: "roll", skill: "Sanity", ...check });
      return pauseOnRoll(state, frame.entryId, events, check, {
        kind: "sanCheck", skill: "Sanity", notation: step.sanCheck,
        stepIndex: cursor - 1, cursor,
      });
    }
```

Usuń z `applyEffect` całą gałąź `if (effect.sanCheck) { ... }`. Dane trzymają `sanCheck` wyłącznie w krokach `on` (paragrafy 248, 271, 273, 315, 348), więc gdyby kiedyś trafił do gałęzi `onSuccess`/`onFail`, `applyBranch` rzuci głośny wyjątek — i to jest właściwe zachowanie.

Zamień gałąź `step.roll` na:

```js
    if (step.roll) {
      const target = skillValue(state, ctx.character, step.roll);
      const queued = takeNextRollDice(state);
      state = queued.state;
      const dice = diceFor(state, step) + queued.dice;
      const check = skillCheck(ctx.rng, target, { dice, difficulty: step.difficulty ?? "regular" });
      events.push({ kind: "roll", skill: step.roll, ...check });
      return pauseOnRoll(state, frame.entryId, events, check, {
        kind: "skill", skill: step.roll, pushable: Boolean(step.push),
        stepIndex: cursor - 1, cursor,
      });
    }
```

W `resume`, gałąź `choose`, zamień blok `if (choice?.roll) { ... }` (od `const target` do końca tego bloku) na:

```js
    // Niektóre decyzje (np. zabranie sztyletu w paragrafie 69) od razu
    // uruchamiają test. Źródło rzutu zostaje w pending, żeby wznowienie
    // wiedziało, którego kroku dotyczy decyzja.
    if (choice?.roll) {
      const target = skillValue(state, ctx.character, choice.roll);
      const queued = takeNextRollDice(state);
      state = queued.state;
      const dice = diceFor(state, choice) + queued.dice;
      const check = skillCheck(ctx.rng, target, { dice, difficulty: choice.difficulty ?? "regular" });
      events.push({ kind: "roll", skill: choice.roll, ...check });
      return pauseOnRoll(state, frame.entryId, events, check, {
        kind: "skill", skill: choice.roll, pushable: Boolean(choice.push),
        source: "choice", choiceIndex: action.index, stepIndex: action.index,
        cursor: (entry.on ?? []).length,
      });
    }
```

Zamień całą resztę `resume` (od komentarza „Nawrót: gracz odwraca werdykt…" do końca funkcji) na:

```js
  if (frame.pending?.type !== "rollDecision") throw new Error(`Nieznana akcja: ${action.type}`);
  return decideRoll(ctx, frame, action);
}

function stepOfPending(ctx, frame) {
  const entry = entryOf(ctx, frame.entryId);
  const pending = frame.pending;
  if (pending.source === "choice") return (entry.choices ?? [])[pending.choiceIndex];
  return (entry.on ?? [])[pending.stepIndex];
}

// Zastosowanie werdyktu — tego, który wypadł, albo tego, który gracz wybrał.
// Rodzaj rzutu decyduje, co znaczy „skutek": gałąź paragrafu, utrata
// poczytalności albo kara ataku obłędu.
function applyRolled(ctx, frame, state, events, check) {
  const pending = frame.pending;

  if (pending.kind === "sanCheck") {
    const out = applySanityCheck(state, check, pending.notation, ctx.character, ctx.rng);
    events.push({ kind: "san", amount: out.lost });
    if (out.redirect) return jump(ctx, out.state, events, frame.entryId, out.redirect, pending.cursor);
    return runSteps(ctx, frameOf(out.state, frame.entryId, events, null, pending.cursor));
  }

  if (pending.kind === "bout") {
    const out = applyBout(state, check, ctx.rng);
    if (out.redirect) return continueAt(ctx, out.state, events, out.redirect);
    // Paragraf 329 mówi wprost, że po nieudanym rzucie INT wracamy tam, skąd
    // przyszliśmy — za krok, który spowodował skok (patrz returnTo).
    const back = popReturn(out.state);
    return returnTo(ctx, back.state, events, back.entryId, back.cursor);
  }

  const step = stepOfPending(ctx, frame);
  const branch = check.success
    ? "onSuccess"
    : (pending.pushed && step.onPushedFail ? "onPushedFail" : "onFail");
  return applyBranch(ctx, state, events, frame.entryId, step, branch, pending.cursor);
}

function decideRoll(ctx, frame, action) {
  const pending = frame.pending;

  if (action.type === "accept") {
    return applyRolled(ctx, frame, frame.state, [], pending.roll);
  }

  // Poprawiony zapis: kości zostają nietknięte, na ekranie ma zostać widoczne
  // kłamstwo, nie nowy rzut.
  if (action.type === "cheat") {
    const check = invertedRoll(pending.roll);
    const state = countCheat(frame.state);
    return applyRolled(ctx, frame, state, [{ kind: "roll", skill: pending.skill, ...check }], check);
  }

  if (action.type === "luck") {
    const state = spendLuck(frame.state, pending.luckCost);
    // Po dopłacie Luck rzut ląduje dokładnie na wymaganym progu, nie na pełnej umiejętności.
    const threshold = requiredThreshold(pending.roll.target, pending.roll.difficulty);
    const level = successLevel(threshold, pending.roll.target);
    const check = { ...pending.roll, result: threshold, level, success: true, spentLuck: pending.luckCost };
    return applyRolled(ctx, frame, state, [{ kind: "roll", skill: pending.skill, ...check }], check);
  }

  if (action.type === "push") {
    const step = stepOfPending(ctx, frame);
    const target = skillValue(frame.state, ctx.character, step.roll);
    const dice = diceFor(frame.state, step);
    const check = skillCheck(ctx.rng, target, { dice, difficulty: step.difficulty ?? "regular" });
    const events = [{ kind: "roll", skill: step.roll, pushed: true, ...check }];
    return pauseOnRoll(frame.state, frame.entryId, events, check, {
      kind: "skill", skill: step.roll, pushable: Boolean(step.push), pushed: true,
      source: pending.source, choiceIndex: pending.choiceIndex,
      stepIndex: pending.stepIndex, cursor: pending.cursor,
    });
  }

  throw new Error(`Nieznana akcja: ${action.type}`);
}
```

- [ ] **Step 4: Uruchom testy runnera**

Run: `node --test test/runner.test.js`
Expected: nowe testy PASS. Stare testy zakładające automatyczne przejście po udanym rzucie padają.

- [ ] **Step 5: Popraw stare testy runnera**

Zasada: gdzie test spodziewał się, że po rzucie ramka jest już w kolejnym paragrafie, wstaw `resume(ctx, rolled, { type: "accept" })`. Gdzie test sprawdzał `frame.rewind` albo akcję `cheat` na cofnięciu, przepisz na `pending` i `{ type: "cheat" }` z tej samej ramki. Nie usuwaj testów — przenoś ich intencję. Jeśli test opisuje sytuację, która w nowym modelu nie istnieje (np. „po przyjęciu porażki nie ma już nawrotu"), zastąp go testem tej samej reguły w nowym modelu (cheat dostępny w momencie rzutu, nieobecny po decyzji, bo ramka ruszyła dalej).

Run: `node --test test/runner.test.js`
Expected: PASS

- [ ] **Step 6: Pełny zestaw**

Run: `npm test`
Expected: FAIL w `test/save.test.js` i `test/ui.test.js` — one czekają na zadania 4 i 5. Zapisz w commicie, że silnik jest gotowy, UI nie.

- [ ] **Step 7: Commit**

```bash
git add src/engine/runner.js test/runner.test.js
git commit -m "Zatrzymuje grę na każdym rzucie przed zastosowaniem skutku"
```

---

### Task 4: Panel decyzji w interfejsie

**Files:**
- Modify: `src/ui/journal.js` (`COPY.pl.accept`, `COPY.en.accept`, `renderRollDecision`, usunięcie `renderCheat`)
- Modify: `src/ui/main.js` (`draw`, `finishFrame`, `presentCurrent`, usunięcie `rollBoxOf` i `cheat`)
- Test: `test/ui.test.js`

**Interfaces:**
- Consumes: `pending` z zadania 3 (`canPush`, `canLuck`, `luckCost`, `canCheat`, `roll.success`).
- Produces: `renderRollDecision(block, pending, i18n, handlers)` gdzie `handlers` to `{ onAccept, onPush, onLuck, onCheat }`; zwraca kontener `.roll-actions`. `renderCheat` przestaje istnieć.

- [ ] **Step 1: Napisz czerwone testy**

Dopisz do `test/ui.test.js` (naśladuj istniejący w tym pliku sposób budowania DOM i wołania `renderRollDecision`):

```js
test("panel decyzji zawsze daje przyjęcie wyniku i cheat", () => {
  const { block, pending } = rollDecisionFixture({ success: true, canPush: false, canLuck: false });
  const clicks = [];
  renderRollDecision(block, pending, { locale: "pl" }, {
    onAccept: () => clicks.push("accept"),
    onPush: () => clicks.push("push"),
    onLuck: () => clicks.push("luck"),
    onCheat: () => clicks.push("cheat"),
  });
  const buttons = [...block.querySelectorAll("button")];
  assert.equal(buttons.length, 2);
  assert.equal(buttons[0].textContent, "Przyjmij wynik");
  assert.ok(buttons[1].classList.contains("cheat"));
  buttons[0].dispatchEvent(new block.ownerDocument.defaultView.Event("click"));
  buttons[1].dispatchEvent(new block.ownerDocument.defaultView.Event("click"));
  assert.deepEqual(clicks, ["accept", "cheat"]);
});

test("forsowanie i Szczęście dochodzą tylko wtedy, gdy pending je pozwala", () => {
  const { block, pending } = rollDecisionFixture({ success: false, canPush: true, canLuck: true, luckCost: 30 });
  renderRollDecision(block, pending, { locale: "pl" }, {
    onAccept() {}, onPush() {}, onLuck() {}, onCheat() {},
  });
  const labels = [...block.querySelectorAll("button")].map((b) => b.textContent);
  assert.deepEqual(labels, ["Przyjmij wynik", "Forsuj rzut", "Wydaj 30 pkt. Szczęścia", "A może jednak się udało?"]);
});

test("cheat przy udanym rzucie proponuje porażkę", () => {
  const { block, pending } = rollDecisionFixture({ success: true, canPush: false, canLuck: false });
  renderRollDecision(block, pending, { locale: "pl" }, { onAccept() {}, onPush() {}, onLuck() {}, onCheat() {} });
  assert.equal(block.querySelector(".cheat").textContent, "A może jednak test się nie udał?");
});
```

Pomocnik `rollDecisionFixture` dopisz w tym samym pliku, obok istniejących pomocników:

```js
// Minimalny wpis z pudełkiem rzutu: panel decyzji doczepia się do ostatniego
// .rollbox we wpisie.
function rollDecisionFixture({ success, canPush, canLuck, luckCost = 0 }) {
  const dom = createDom(); // istniejący w pliku pomocnik JSDOM/linkedom
  const block = dom.document.createElement("div");
  const box = dom.document.createElement("div");
  box.className = "rollbox";
  block.append(box);
  dom.document.body.append(block);
  return {
    block,
    pending: {
      type: "rollDecision",
      kind: "skill",
      skill: "Spot Hidden",
      roll: { target: 60, result: success ? 20 : 90, difficulty: "regular", success },
      canPush, canLuck, luckCost, canCheat: true,
      pushed: false, stepIndex: 0, cursor: 1,
    },
  };
}
```

Jeśli `test/ui.test.js` buduje DOM inaczej (sprawdź jego górę), użyj tego samego mechanizmu zamiast `createDom()` — nie dodawaj nowej zależności.

- [ ] **Step 2: Uruchom testy i potwierdź porażkę**

Run: `node --test test/ui.test.js`
Expected: FAIL — panel nie zawiera cheata, etykieta brzmi „Przyjmij porażkę".

- [ ] **Step 3: Zmień etykiety i panel**

W `src/ui/journal.js` w `COPY.pl` zamień `accept: "Przyjmij porażkę"` na `accept: "Przyjmij wynik"`, a w `COPY.en` `accept: "Accept failure"` na `accept: "Accept the result"`.

Zamień `renderRollDecision` na:

```js
// Jeden panel na wszystkie decyzje po rzucie: przyjęcie wyniku jest zawsze,
// forsowanie i Szczęście zależą od zasad, a cheat stoi obok nich — zamiast, jak
// dawniej, dopiero po tym, jak skutki rzutu już się wykonały.
export function renderRollDecision(block, pending, i18n, handlers) {
  const doc = block.ownerDocument ?? document;
  const labels = copy(i18n);
  const actions = el(doc, "div", "roll-actions");

  const accept = el(doc, "button", "action", labels.accept);
  accept.type = "button";
  accept.addEventListener("click", handlers.onAccept);
  actions.append(accept);

  if (pending.canPush) {
    const push = el(doc, "button", "action action-danger", labels.push);
    push.type = "button";
    push.addEventListener("click", handlers.onPush);
    actions.append(push);
  }
  if (pending.canLuck) {
    const luck = el(doc, "button", "action", labels.burnLuck(pending.luckCost));
    luck.type = "button";
    luck.addEventListener("click", handlers.onLuck);
    actions.append(luck);
  }

  const target = [...block.querySelectorAll(".rollbox")].at(-1) ?? block;
  target.append(actions);

  // Przycisk jest celowo ledwo widoczny — trzeba go poszukać, a wtedy zapala
  // się na czerwono. Stoi po pozostałych, bo dotyczy tego samego wyniku.
  if (pending.canCheat) {
    const cheat = el(
      doc, "button", "cheat",
      pending.roll?.success ? labels.cheatToFail : labels.cheatToSuccess,
    );
    cheat.type = "button";
    cheat.addEventListener("click", handlers.onCheat);
    target.append(cheat);
  }

  return actions;
}
```

Usuń całą funkcję `renderCheat` wraz z komentarzem nad nią.

- [ ] **Step 4: Zepnij `main.js`**

W `src/ui/main.js`:
- usuń `renderCheat` z importu z `./journal.js`;
- usuń funkcję `rollBoxOf` wraz z komentarzem nad nią;
- usuń funkcję `cheat()` wraz z komentarzem nad nią;
- w `draw` usuń wiersz `if (isLast && frame.rewind) renderCheat(...)` i dopisz `onCheat` do handlerów `renderRollDecision`;
- w `finishFrame` dopisz `onCheat: () => decide("cheat")`;
- w `presentCurrent`, w `onRoll`, usuń wiersz `if (frame.rewind?.event === event) renderCheat(box, frame.rewind, i18n, cheat);` — zostaje samo `pointerStatic?.syncEntry(box.parentElement)` z jego komentarzem, a komentarz nad `onRoll` mówiący o nawrocie zamień na wyjaśnienie, że kości wchodzą do wpisu po domknięciu akapitu, więc klon trzeba odświeżyć.

Każde z trzech wywołań `renderRollDecision` ma teraz pełny zestaw:

```js
      onLuck: () => decide("luck"),
      onPush: () => decide("push"),
      onAccept: () => decide("accept"),
      onCheat: () => decide("cheat"),
```

- [ ] **Step 5: Uruchom testy UI**

Run: `node --test test/ui.test.js test/reveal.test.js test/style.test.js`
Expected: PASS. Jeśli któryś test odwołuje się do `renderCheat`, przepisz go na panel — reguła jest ta sama, zmienił się nośnik.

- [ ] **Step 6: Pełny zestaw**

Run: `npm test`
Expected: FAIL już tylko w `test/save.test.js` (zadanie 5).

- [ ] **Step 7: Commit**

```bash
git add src/ui/journal.js src/ui/main.js test/ui.test.js
git commit -m "Scala decyzje po rzucie w jeden panel z cheatem"
```

---

### Task 5: Walidacja zapisu

**Files:**
- Modify: `src/ui/save.js` (`isPending`, `compatibleRoll`, usunięcie lokalnego `requiredThreshold`)
- Test: `test/save.test.js`

**Interfaces:**
- Consumes: `requiredThreshold`, `decisionFor` z `../engine/decision.js`; kształt `pending` z zadania 3.
- Produces: `isSaveCompatible` przyjmujące pending `rollDecision` dla wszystkich trzech rodzajów rzutu, także takie, w którym dostępne są wyłącznie przyjęcie wyniku i cheat.

- [ ] **Step 1: Napisz czerwone testy**

Dopisz do `test/save.test.js`, wzorując się na istniejących testach `isSaveCompatible` w tym pliku (użyj tych samych fabryk zapisu i tej samej historii/postaci):

```js
test("zapis z decyzją, w której zostaje tylko przyjęcie wyniku i cheat, jest zgodny", () => {
  const saved = savedWithRollDecision({ canPush: false, canLuck: false });
  assert.equal(isSaveCompatible(saved, story, character), true);
});

test("zapis z decyzją po udanym rzucie jest zgodny", () => {
  const saved = savedWithRollDecision({ success: true });
  assert.equal(isSaveCompatible(saved, story, character), true);
});

test("zapis z decyzją po teście Sanity jest zgodny", () => {
  const saved = savedWithSanCheckDecision();
  assert.equal(isSaveCompatible(saved, story, character), true);
});

test("zapis z podmienionym rodzajem rzutu jest odrzucany", () => {
  const saved = savedWithRollDecision({ canPush: false, canLuck: false });
  saved.frame.pending.kind = "bout";
  assert.equal(isSaveCompatible(saved, story, character), false);
});

test("zapis z zawyżoną dostępnością forsowania jest odrzucany", () => {
  const saved = savedWithRollDecision({ canPush: false, canLuck: false });
  saved.frame.pending.canPush = true;
  assert.equal(isSaveCompatible(saved, story, character), false);
});
```

Fabryki `savedWithRollDecision` i `savedWithSanCheckDecision` zbuduj **z prawdziwej ramki silnika**, nie ręcznie — to jedyny sposób, by test nie skłamał o kształcie pending:

```js
// Zapis budujemy z ramki, którą naprawdę wypuścił silnik: ręcznie pisany
// pending rozjechałby się z implementacją przy pierwszej zmianie kształtu.
function savedFrom(frame) {
  return { version: 2, characterId: character.id, frame: { ...frame, state: serialize(frame.state) }, originEntryId: null, log: [] };
}
```

Jeśli `test/save.test.js` już ma taki pomocnik (sprawdź górę pliku), użyj istniejącego. Ramkę z pauzą na rzucie umiejętności uzyskasz przez `enter`/`resume` na tym samym `story`, którego używają pozostałe testy tego pliku; ramkę z `sanCheck` przez lokalną historię z krokiem `{ sanCheck: "1/1d4" }`, tak jak w `test/runner.test.js`.

- [ ] **Step 2: Uruchom testy i potwierdź porażkę**

Run: `node --test test/save.test.js`
Expected: FAIL — `isPending` odrzuca pending bez `canPush`/`canLuck`, `compatibleRoll` szuka kroku pod `frame.cursor` i nie zna rodzajów `sanCheck`/`bout`.

- [ ] **Step 3: Przepisz walidację**

W `src/ui/save.js`:

Import na górze:

```js
import { serialize, deserialize, skillValue } from "../engine/state.js";
import { requiredThreshold, decisionFor } from "../engine/decision.js";
```

Usuń lokalną funkcję `requiredThreshold`. Dodaj obok `PENDING_TYPES`:

```js
const ROLL_KINDS = new Set(["skill", "sanCheck", "bout"]);
```

W `isPending` zamień gałąź `rollDecision` na:

```js
  if (pending.type === "rollDecision") {
    const sourceValid = pending.source === undefined
      || (pending.source === "choice" && isNonNegativeInteger(pending.choiceIndex));
    const notationValid = pending.kind === "sanCheck"
      ? typeof pending.notation === "string" && pending.notation.includes("/")
      : pending.notation === undefined;
    return sourceValid
      && notationValid
      && ROLL_KINDS.has(pending.kind)
      && isRecord(pending.roll)
      && isFiniteNumber(pending.roll.target)
      && isFiniteNumber(pending.roll.result)
      && typeof pending.roll.difficulty === "string"
      && typeof pending.roll.success === "boolean"
      && typeof pending.skill === "string"
      && typeof pending.canPush === "boolean"
      && typeof pending.canLuck === "boolean"
      && typeof pending.canCheat === "boolean"
      && typeof pending.pushed === "boolean"
      && isFiniteNumber(pending.luckCost)
      && isNonNegativeInteger(pending.stepIndex)
      && isNonNegativeInteger(pending.cursor);
  }
```

Zamień `compatibleRoll` na:

```js
// Pending musi dać się odtworzyć z danych: krok, do którego wraca, wciąż ma
// ten sam rodzaj rzutu, a dostępność decyzji wychodzi z tego samego modułu,
// z którego liczy ją silnik.
function compatibleRoll(frame, entry, character) {
  const pending = frame.pending;
  const fromChoice = pending.source === "choice";
  const step = fromChoice
    ? entry?.choices?.[pending.choiceIndex]
    : entry?.on?.[pending.stepIndex];
  if (!isRecord(step)) return false;
  if (frame.cursor !== pending.cursor) return false;
  if (fromChoice) {
    if (pending.kind !== "skill" || pending.stepIndex !== pending.choiceIndex) return false;
    if (pending.cursor !== (entry?.on ?? []).length) return false;
  }

  let target;
  let pushable = false;
  try {
    if (pending.kind === "skill") {
      if (typeof step.roll !== "string" || step.roll !== pending.skill) return false;
      if (pending.roll.difficulty !== (step.difficulty ?? "regular")) return false;
      target = skillValue(frame.state, character, step.roll);
      pushable = Boolean(step.push);
    } else if (pending.kind === "sanCheck") {
      if (step.sanCheck !== pending.notation || pending.skill !== "Sanity") return false;
      if (pending.roll.difficulty !== "regular") return false;
      target = frame.state.san;
    } else {
      if (!step.bout || pending.skill !== "INT") return false;
      if (pending.roll.difficulty !== "regular") return false;
      target = skillValue(frame.state, character, "INT");
    }
  } catch {
    return false;
  }
  if (pending.roll.target !== target) return false;

  const expected = decisionFor(frame.state, pending.roll, {
    kind: pending.kind, skill: pending.skill, pushable, pushed: pending.pushed,
  });
  if (pending.canPush !== expected.canPush
    || pending.canLuck !== expected.canLuck
    || pending.luckCost !== expected.luckCost
    || pending.canCheat !== expected.canCheat) return false;

  const rollEvents = frame.events.filter((event) => event.kind === "roll");
  const event = rollEvents.at(-1);
  return Boolean(event)
    && event.skill === pending.skill
    && event.result === pending.roll.result
    && event.target === pending.roll.target
    && event.difficulty === pending.roll.difficulty;
}
```

Zwróć uwagę: `requiredThreshold` może po tej zmianie zostać nieużywane w `save.js` — jeśli tak, usuń je z importu, żeby nie zostawiać martwego symbolu.

- [ ] **Step 4: Uruchom testy zapisu**

Run: `node --test test/save.test.js`
Expected: PASS. Stare testy oczekujące odrzucenia pending bez `push`/`luck` przepisz — ta reguła zniknęła świadomie; w jej miejsce testuj odrzucanie pending z **niezgodną** dostępnością (jak w kroku 1).

- [ ] **Step 5: Pełny zestaw**

Run: `npm test`
Expected: PASS — cały zestaw zielony.

- [ ] **Step 6: Commit**

```bash
git add src/ui/save.js test/save.test.js
git commit -m "Dopuszcza zapis każdej decyzji po rzucie"
```

---

### Task 6: Porządki i weryfikacja w przeglądarce

**Files:**
- Modify: `src/engine/rules.js` (usunięcie opakowań `sanityCheck` i `resolveBout`)
- Modify: `test/rules.test.js` (testy porównawcze opakowań)
- Modify: `AloneAgainstTheStatic/progress.md`

**Interfaces:**
- Consumes: wszystko z zadań 1–5.
- Produces: brak nowych symboli.

- [ ] **Step 1: Sprawdź, czy opakowania mają jeszcze konsumentów**

Run: `grep -rn "sanityCheck\|resolveBout" src/ test/ tools/`
Expected: trafienia tylko w `src/engine/rules.js` i w testach porównawczych z zadania 2.

- [ ] **Step 2: Usuń opakowania**

Usuń z `src/engine/rules.js` funkcje `sanityCheck` i `resolveBout`. Z `test/rules.test.js` usuń dwa testy porównawcze („dają to samo co…"), bo porównywać nie ma już z czym; zostaw testy sprawdzające zachowanie `rollSanity`, `applySanityCheck`, `rollBout`, `applyBout` — jeśli po usunięciu zniknęłoby pokrycie skutków (utrata Sanity, przekierowanie do 328/329/334, nałożenie kary), dopisz je jako osobne testy na nowym API.

- [ ] **Step 3: Pełny zestaw**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Sprawdź w grze**

Uruchom `index.html` przez podgląd w przeglądarce (`preview_start`) i przejdź trzy ścieżki, potwierdzając zrzutem ekranu każdą:
1. udany rzut — panel pokazuje „Przyjmij wynik" i cheat, brak forsowania i Szczęścia;
2. nieudany rzut na umiejętność z `push: true` (np. paragraf 55) — cztery przyciski, forsowanie znika po użyciu;
3. test Sanity (np. paragraf 22) — kości widoczne, panel z przyjęciem i cheatem, po przyjęciu utrata poczytalności w dzienniku.

Sprawdź konsolę (`read_console_messages`) — musi być pusta.

- [ ] **Step 5: Odnotuj w progress.md**

Dopisz w `progress.md`, w miejscu i formie zgodnej z resztą pliku, jedno zdanie: każdy rzut zatrzymuje grę i oferuje przyjęcie wyniku, forsowanie (gdy dane pozwalają), Szczęście (gdy wolno) i cheat; `frame.rewind` przestał istnieć.

- [ ] **Step 6: Commit**

```bash
git add src/engine/rules.js test/rules.test.js progress.md
git commit -m "Usuwa opakowania po rozdzieleniu rzutu od skutku"
```
