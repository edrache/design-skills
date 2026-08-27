import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { sequenceRng } from "../src/engine/dice.js";
import { createState, serialize } from "../src/engine/state.js";
import { enter, resume } from "../src/engine/runner.js";
import { segmentEvents } from "../src/ui/journal.js";
import { clearSave, isSaveCompatible, loadGame, saveGame } from "../src/ui/save.js";

const KEY = "aats-save";
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

function useStorage(storage) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
}

function memoryStorage() {
  const values = new Map();
  return {
    removed: [],
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { this.removed.push(key); values.delete(key); },
  };
}

function validState(overrides = {}) {
  return {
    characterId: "alex",
    hp: 10,
    maxHp: 13,
    san: 47,
    startingSan: 50,
    mp: 10,
    luck: 45,
    flags: ["alex"],
    visits: { 1: 1 },
    usedChoices: { 1: [0] },
    penalties: { Listen: 1 },
    nextRollDice: 0,
    returnStack: [{ entryId: 1, cursor: 2 }],
    sanLostToday: 3,
    majorWound: false,
    indefinitelyInsane: false,
    visitedBouts: [330],
    ...overrides,
  };
}

function choice(index = 0) {
  return { index, key: `e12.c${index + 1}`, goto: 13 + index, used: false, blocked: false };
}

function choicesFrame(overrides = {}) {
  const options = [choice(0), choice(1)];
  return {
    entryId: 12,
    events: [
      { kind: "text", key: "e12.p1" },
      { kind: "choices", options },
    ],
    pending: { type: "choices", options },
    cursor: 0,
    state: validState(),
    ...overrides,
  };
}

function storedPayload(frame = choicesFrame(), overrides = {}) {
  return JSON.stringify({
    version: 2,
    characterId: "alex",
    originEntryId: null,
    frame,
    ...overrides,
  });
}

function compatibleCharacter() {
  return {
    id: "alex",
    hp: 13,
    san: 50,
    mp: 10,
    skills: { CON: 70, Occult: 5 },
    characteristics: { INT: 60 },
  };
}

// Paragrafy zatrzymujące się na każdym rodzaju rzutu i na każdej trudności —
// ramki do walidacji budujemy silnikiem, nie ręcznie.
const engineStory = {
  entries: {
    5: { id: 5, on: [{ roll: "CON", difficulty: "regular", push: true }] },
    6: { id: 6, on: [{ roll: "CON" }] },
    7: { id: 7, on: [{ sanCheck: "1/1d4" }], choices: [{ text: "e7.c1", goto: 6 }] },
    8: { id: 8, on: [{ bout: true }] },
    9: {
      id: 9,
      choices: [{
        text: "e9.c1", goto: 9, flag: "razor_sharp", roll: "Occult",
        onSuccess: { goto: 6 }, onFail: { goto: 6 },
      }],
    },
    51: { id: 51, on: [{ roll: "CON", difficulty: "hard", push: true }] },
    52: { id: 52, on: [{ roll: "CON", difficulty: "extreme", push: true }] },
    53: { id: 53, on: [{ roll: "Sanity" }] },
    54: { id: 54, on: [{ roll: "Luck" }] },
  },
};

// Ręcznie pisany pending przechodzi walidację, kłamiąc o kształcie — dokładnie
// tak ten plik zapewniał, że wczytanie zapisu działa, gdy padało na każdej
// pauzie rzutu. Dlatego ramki bierzemy wprost z silnika.
function engineFrame(entryId, rolls, stateOverrides = {}) {
  const character = compatibleCharacter();
  const ctx = { story: engineStory, character, rng: sequenceRng(rolls) };
  const base = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) }); // Luck 60
  return enter(ctx, { ...base, ...stateOverrides }, entryId);
}

function savedFrom(frame) {
  return {
    characterId: "alex",
    originEntryId: null,
    frame: { ...frame, state: serialize(frame.state) },
  };
}

function savedWithRollDecision({ canPush = true, canLuck = true, success = false } = {}) {
  return savedFrom(engineFrame(canPush ? 5 : 6, success ? [0.0, 0.1] : [0.0, 0.9], {
    luck: canLuck ? 60 : 0,
  }));
}

function savedWithSanCheckDecision() {
  return savedFrom(engineFrame(7, [0.0, 0.9, 0.5]));
}

function savedWithBoutDecision() {
  return savedFrom(engineFrame(8, [0.0, 0.9]));
}

function compatibleStory() {
  return {
    entries: {
      5: { id: 5, on: [{ roll: "CON", difficulty: "regular", push: true }] },
      12: {
        id: 12,
        choices: [
          { text: "e12.c1", goto: 13 },
          { text: "e12.c2", goto: 14 },
        ],
      },
    },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete globalThis.localStorage;
});

test("round-trip zachowuje dokładną ramkę oczekującą na wybór", () => {
  const storage = memoryStorage();
  useStorage(storage);
  const frame = choicesFrame();

  saveGame({ characterId: "alex", frame });

  const raw = JSON.parse(storage.getItem(KEY));
  assert.equal(raw.version, 2);
  assert.equal(raw.characterId, "alex");
  assert.equal(raw.originEntryId, null);
  assert.deepEqual(raw.frame, frame);
  assert.deepEqual(loadGame(), { characterId: "alex", originEntryId: null, frame, log: [] });
});

test("round-trip zachowuje decyzję po rzucie bez ponownego wykonania paragrafu", () => {
  const storage = memoryStorage();
  useStorage(storage);
  const frame = engineFrame(5, [0.0, 0.9]);

  saveGame({ characterId: "alex", frame });

  assert.deepEqual(loadGame(), { characterId: "alex", originEntryId: null, frame, log: [] });
});

test("round-trip zachowuje zdarzenia leczenia i odzyskania Luck", () => {
  const storage = memoryStorage();
  useStorage(storage);
  const options = [choice(0), choice(1)];
  const frame = choicesFrame({
    events: [
      { kind: "text", key: "e12.p1" },
      { kind: "heal", amount: 1, rolled: 1 },
      { kind: "luck", amount: 2, rolled: 4 },
      { kind: "choices", options },
    ],
    state: validState({ hp: 13, luck: 47 }),
  });

  saveGame({ characterId: "alex", frame });
  assert.deepEqual(loadGame(), { characterId: "alex", originEntryId: null, frame, log: [] });
});

test("brak localStorage nie przerywa zapisu, odczytu ani czyszczenia", () => {
  delete globalThis.localStorage;

  assert.doesNotThrow(() => saveGame({ characterId: "alex", frame: choicesFrame() }));
  assert.equal(loadGame(), null);
  assert.doesNotThrow(() => clearSave());
});

test("zablokowany dostęp do właściwości localStorage jest bezpieczny", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new Error("security error"); },
  });

  assert.doesNotThrow(() => saveGame({ characterId: "alex", frame: choicesFrame() }));
  assert.equal(loadGame(), null);
  assert.doesNotThrow(() => clearSave());
});

test("błędy metod localStorage są izolowane od gry", () => {
  useStorage({
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("quota"); },
    removeItem() { throw new Error("blocked"); },
  });

  assert.doesNotThrow(() => saveGame({ characterId: "alex", frame: choicesFrame() }));
  assert.equal(loadGame(), null);
  assert.doesNotThrow(() => clearSave());
});

test("uszkodzony JSON jest usuwany", () => {
  const storage = memoryStorage();
  storage.setItem(KEY, "{zepsute");
  useStorage(storage);

  assert.equal(loadGame(), null);
  assert.deepEqual(storage.removed, [KEY]);
  assert.equal(storage.getItem(KEY), null);
});

test("zapis z innej wersji jest usuwany", () => {
  const storage = memoryStorage();
  storage.setItem(KEY, storedPayload(choicesFrame(), { version: 1 }));
  useStorage(storage);

  assert.equal(loadGame(), null);
  assert.deepEqual(storage.removed, [KEY]);
});

test("niepełna koperta zapisu jest odrzucana", async (t) => {
  const invalid = [
    ["characterId", { characterId: "" }],
    ["originEntryId", { originEntryId: "7" }],
    ["frame", { frame: null }],
  ];

  for (const [name, overrides] of invalid) {
    await t.test(name, () => {
      const storage = memoryStorage();
      storage.setItem(KEY, storedPayload(choicesFrame(), overrides));
      useStorage(storage);
      assert.equal(loadGame(), null);
      assert.deepEqual(storage.removed, [KEY]);
    });
  }
});

test("stan o niebezpiecznym kształcie nie trafia do silnika", async (t) => {
  const invalidStates = [
    ["identyfikator innej postaci", { characterId: "charlie" }],
    ["tekst zamiast HP", { hp: "10" }],
    ["HP większe niż maksimum", { hp: 14 }],
    ["Luck poza zakresem", { luck: 101 }],
    ["flagi niebędące tablicą", { flags: {} }],
    ["nieprawidłowy licznik wizyt", { visits: { 1: -1 } }],
    ["nieprawidłowe wybory", { usedChoices: { 1: ["0"] } }],
    ["nieprawidłowa kara", { penalties: { Listen: -1 } }],
    ["nieprawidłowa kość następnego rzutu", { nextRollDice: "1" }],
    ["stara postać stosu powrotu", { returnStack: [1] }],
    ["brak flagi major wound", { majorWound: undefined }],
  ];

  for (const [name, stateOverride] of invalidStates) {
    await t.test(name, () => {
      const storage = memoryStorage();
      storage.setItem(KEY, storedPayload(choicesFrame({ state: validState(stateOverride) })));
      useStorage(storage);
      assert.equal(loadGame(), null);
      assert.deepEqual(storage.removed, [KEY]);
    });
  }
});

test("niepełna ramka nie trafia do integracji", async (t) => {
  const invalidFrames = [
    ["entryId", { entryId: "12" }],
    ["cursor", { cursor: -1 }],
    ["events", { events: {} }],
    ["zdarzenie", { events: ["text"] }],
    ["typ zdarzenia", { events: [{ kind: "unknown" }] }],
    ["brak decyzji", { pending: null }],
    ["pending", { pending: { type: "unknown" } }],
    ["opcje", { pending: { type: "choices", options: [{}] } }],
    ["decyzja rzutu", { pending: { type: "rollDecision" } }],
  ];

  for (const [name, frameOverride] of invalidFrames) {
    await t.test(name, () => {
      const storage = memoryStorage();
      storage.setItem(KEY, storedPayload(choicesFrame(frameOverride)));
      useStorage(storage);
      assert.equal(loadGame(), null);
      assert.deepEqual(storage.removed, [KEY]);
    });
  }
});

test("semantyka choices zgadza się ze story i zdarzeniem wyborów", async (t) => {
  const story = compatibleStory();
  const character = compatibleCharacter();
  const valid = { characterId: "alex", originEntryId: null, frame: choicesFrame() };
  assert.equal(isSaveCompatible(valid, story, character), true);

  await t.test("odrzuca parametry bazowe niezgodne z kartą", () => {
    const saved = clone(valid);
    saved.frame.state.mp = character.mp + 1;
    assert.equal(isSaveCompatible(saved, story, character), false);
  });

  for (const field of ["index", "key", "goto"]) {
    await t.test(`odrzuca zmienione ${field}`, () => {
      const saved = clone(valid);
      const value = field === "key" ? "obcy-klucz" : 999;
      saved.frame.pending.options[0][field] = value;
      saved.frame.events.at(-1).options[0][field] = value;
      assert.equal(isSaveCompatible(saved, story, character), false);
    });
  }

  await t.test("odrzuca rozjazd pending i event choices", () => {
    const saved = clone(valid);
    saved.frame.events.at(-1).options[0].blocked = true;
    assert.equal(isSaveCompatible(saved, story, character), false);
  });
});

test("blocked wyboru jest przeliczany z choice.if tak samo jak w runnerze", async (t) => {
  const character = compatibleCharacter();
  const cases = [
    ["flaga obecna", "ready", { flags: ["ready"] }, false],
    ["flaga nieobecna", "ready", { flags: [] }, true],
    ["not", { not: "danger" }, { flags: ["danger"] }, true],
    ["visits", { visits: 2, entry: 12 }, { visits: { 12: 2 } }, false],
    [
      "tablica warunków",
      ["ready", { not: "danger" }, { visits: 2, entry: 12 }],
      { flags: ["ready"], visits: { 12: 2 } },
      false,
    ],
  ];

  for (const [name, condition, stateOverrides, blocked] of cases) {
    await t.test(name, () => {
      const options = [{ index: 0, key: "e12.c1", goto: 13, used: false, blocked }];
      const frame = choicesFrame({
        events: [{ kind: "choices", options }],
        pending: { type: "choices", options },
        state: validState(stateOverrides),
      });
      const story = { entries: { 12: { id: 12, choices: [{ text: "e12.c1", goto: 13, if: condition }] } } };
      const saved = { characterId: "alex", originEntryId: null, frame };

      assert.equal(isSaveCompatible(saved, story, character), true);
      const tampered = clone(saved);
      tampered.frame.pending.options[0].blocked = !blocked;
      tampered.frame.events[0].options[0].blocked = !blocked;
      assert.equal(isSaveCompatible(tampered, story, character), false);
    });
  }
});

test("semantyka rollDecision wiąże krok story z dostępnością decyzji", async (t) => {
  const story = engineStory;
  const character = compatibleCharacter();
  const valid = savedWithRollDecision();
  assert.equal(isSaveCompatible(valid, story, character), true);

  await t.test("odrzuca kursor rozjechany z pending", () => {
    const saved = clone(valid);
    saved.frame.cursor = saved.frame.pending.cursor + 1;
    assert.equal(isSaveCompatible(saved, story, character), false);
  });

  await t.test("odrzuca stepIndex poza krokami paragrafu", () => {
    const saved = clone(valid);
    saved.frame.pending.stepIndex = 1;
    assert.equal(isSaveCompatible(saved, story, character), false);
  });

  await t.test("odrzuca skill inny niż krok rzutu", () => {
    const saved = clone(valid);
    saved.frame.pending.skill = "Listen";
    saved.frame.events[0].skill = "Listen";
    assert.equal(isSaveCompatible(saved, story, character), false);
  });

  await t.test("odrzuca target niezgodny z postacią", () => {
    const saved = clone(valid);
    saved.frame.pending.roll.target = 50;
    saved.frame.events[0].target = 50;
    assert.equal(isSaveCompatible(saved, story, character), false);
  });

  for (const [entryId, difficulty, luck, luckCost] of [[51, "hard", 60, 55], [52, "extreme", 80, 76]]) {
    await t.test(`przelicza próg ${difficulty} i koszt Luck`, () => {
      const saved = savedFrom(engineFrame(entryId, [0.0, 0.9], { luck }));
      assert.equal(saved.frame.pending.luckCost, luckCost);
      assert.equal(isSaveCompatible(saved, story, character), true);

      saved.frame.pending.luckCost -= 1;
      assert.equal(isSaveCompatible(saved, story, character), false);
    });
  }

  await t.test("canLuck uwzględnia liczbę dostępnych punktów", () => {
    const saved = savedWithRollDecision({ canLuck: false });
    assert.equal(saved.frame.pending.canLuck, false);
    assert.equal(isSaveCompatible(saved, story, character), true);

    saved.frame.pending.canLuck = true;
    assert.equal(isSaveCompatible(saved, story, character), false);
  });

  for (const [entryId, skill] of [[53, "Sanity"], [54, "Luck"]]) {
    await t.test(`${skill} nie pozwala ratować rzutu punktami Luck`, () => {
      const saved = savedFrom(engineFrame(entryId, [0.0, 0.9]));
      assert.equal(saved.frame.pending.skill, skill);
      assert.equal(saved.frame.pending.canLuck, false);
      assert.equal(isSaveCompatible(saved, story, character), true);

      saved.frame.pending.canLuck = true;
      assert.equal(isSaveCompatible(saved, story, character), false);
    });
  }

  await t.test("forsowany rzut nie daje drugiej deski ratunku", () => {
    const ctx = { story, character, rng: sequenceRng([0.0, 0.9, 0.0, 0.8]) };
    const base = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
    const pushed = resume(ctx, enter(ctx, base, 5), { type: "push" });
    const saved = savedFrom(pushed);
    assert.equal(saved.frame.pending.pushed, true);
    assert.equal(isSaveCompatible(saved, story, character), true);

    saved.frame.pending.canLuck = true;
    assert.equal(isSaveCompatible(saved, story, character), false);
  });
});

// Reguła „pending musi oferować push albo Luck" zniknęła świadomie: przy
// sukcesie, teście Sanity i ataku obłędu zostaje samo przyjęcie wyniku i cheat.
// Walidacja pilnuje więc zgodności dostępności z danymi, nie jej istnienia.
test("zapis każdej decyzji po rzucie jest zgodny", async (t) => {
  const story = engineStory;
  const character = compatibleCharacter();

  await t.test("zostaje tylko przyjęcie wyniku i cheat", () => {
    const saved = savedWithRollDecision({ canPush: false, canLuck: false });
    assert.deepEqual(
      [saved.frame.pending.canPush, saved.frame.pending.canLuck, saved.frame.pending.canCheat],
      [false, false, true],
    );
    assert.equal(isSaveCompatible(saved, story, character), true);
  });

  await t.test("decyzja po udanym rzucie", () => {
    const saved = savedWithRollDecision({ success: true });
    assert.equal(saved.frame.pending.roll.success, true);
    assert.equal(isSaveCompatible(saved, story, character), true);
  });

  await t.test("decyzja po teście Sanity", () => {
    const saved = savedWithSanCheckDecision();
    assert.equal(saved.frame.pending.kind, "sanCheck");
    assert.equal(isSaveCompatible(saved, story, character), true);
  });

  await t.test("decyzja po rzucie ataku obłędu", () => {
    const saved = savedWithBoutDecision();
    assert.equal(saved.frame.pending.kind, "bout");
    assert.equal(isSaveCompatible(saved, story, character), true);
  });

  await t.test("odrzuca podmieniony rodzaj rzutu", () => {
    const saved = savedWithRollDecision({ canPush: false, canLuck: false });
    saved.frame.pending.kind = "bout";
    assert.equal(isSaveCompatible(saved, story, character), false);
  });

  await t.test("odrzuca zawyżoną dostępność forsowania", () => {
    const saved = savedWithRollDecision({ canPush: false, canLuck: false });
    saved.frame.pending.canPush = true;
    assert.equal(isSaveCompatible(saved, story, character), false);
  });

  await t.test("odrzuca test Sanity z podmienioną notacją", () => {
    const saved = savedWithSanCheckDecision();
    saved.frame.pending.notation = "1/1d10";
    assert.equal(isSaveCompatible(saved, story, character), false);
  });
});

test("autosave wiąże decyzję po rzucie z wyborem, który go uruchomił", () => {
  const character = compatibleCharacter();
  const ctx = { story: engineStory, character, rng: sequenceRng([0.0, 0.9]) };
  const base = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = resume(ctx, enter(ctx, base, 9), { type: "choose", index: 0 });
  const saved = savedFrom(frame);

  assert.equal(saved.frame.pending.source, "choice");
  assert.equal(isSaveCompatible(saved, engineStory, character), true);

  const tampered = clone(saved);
  tampered.frame.pending.choiceIndex = 1;
  tampered.frame.pending.stepIndex = 1;
  assert.equal(isSaveCompatible(tampered, engineStory, character), false);
});

test("semantyka end i missing odpowiada stanowi story", () => {
  const character = compatibleCharacter();
  const endFrame = {
    entryId: 99,
    events: [{ kind: "end" }],
    pending: { type: "end" },
    cursor: 0,
    state: validState(),
  };
  const missingFrame = {
    entryId: 404,
    events: [{ kind: "missing", entryId: 404 }],
    pending: { type: "missing" },
    cursor: 0,
    state: validState(),
  };
  const story = { entries: { 99: { id: 99, end: true } } };

  assert.equal(isSaveCompatible({ characterId: "alex", originEntryId: null, frame: endFrame }, story, character), true);
  assert.equal(isSaveCompatible({ characterId: "alex", originEntryId: null, frame: missingFrame }, story, character), true);
  assert.equal(isSaveCompatible(
    { characterId: "alex", originEntryId: null, frame: endFrame },
    { entries: { 99: { id: 99, end: false } } },
    character,
  ), false);
  assert.equal(isSaveCompatible(
    { characterId: "alex", originEntryId: null, frame: missingFrame },
    { entries: { 404: { id: 404 } } },
    character,
  ), false);
});

test("originEntryId przeżywa reload i zachowuje początek sekwencji Luck 7→4→5", () => {
  const storage = memoryStorage();
  useStorage(storage);
  const options = [
    { index: 0, key: "e5.c1", goto: 6, used: false, blocked: false },
  ];
  const frame = choicesFrame({
    entryId: 5,
    events: [
      { kind: "roll", skill: "Luck", tens: [40], units: 2, result: 42, target: 45, difficulty: "regular" },
      { kind: "text", key: "e4.p1" },
      { kind: "text", key: "e5.p1" },
      { kind: "choices", options },
    ],
    pending: { type: "choices", options },
  });

  saveGame({ characterId: "alex", frame, originEntryId: 7 });
  const restored = loadGame();

  assert.equal(restored.originEntryId, 7);
  assert.deepEqual(segmentEvents(restored.frame.events, {
    entryId: restored.frame.entryId,
    originEntryId: restored.originEntryId,
  }).map((segment) => segment.entryId), [7, 4, 5]);
  assert.equal(isSaveCompatible(restored, {
    entries: {
      4: { id: 4 },
      5: { id: 5, choices: [{ text: "e5.c1", goto: 6 }] },
      7: { id: 7 },
    },
  }, compatibleCharacter()), true);
});

test("clearSave usuwa wyłącznie klucz autosave", () => {
  const storage = memoryStorage();
  storage.setItem(KEY, storedPayload());
  storage.setItem("aats-locale", "pl");
  useStorage(storage);

  clearSave();

  assert.equal(storage.getItem(KEY), null);
  assert.equal(storage.getItem("aats-locale"), "pl");
});

test("zapis przenosi archiwum dziennika i odrzuca niepoprawne wpisy", () => {
  const storage = memoryStorage();
  useStorage(storage);
  const frame = choicesFrame();
  const log = [{ entryId: 1, originEntryId: null, events: [{ kind: "text", key: "e1.p1" }] }];

  saveGame({ characterId: "alex", frame, log });
  assert.deepEqual(loadGame().log, log);

  // Uszkodzone archiwum nie unieważnia ramki — dziennik startuje pusty.
  const parsed = JSON.parse(storage.getItem(KEY));
  parsed.log = [{ entryId: 0, events: [] }];
  storage.setItem(KEY, JSON.stringify(parsed));
  const restored = loadGame();
  assert.deepEqual(restored.log, []);
  assert.deepEqual(restored.frame, frame);
});

test("rekord dziennika przenosi pamięć poznanych paragrafów i toleruje jej brak", () => {
  const storage = memoryStorage();
  useStorage(storage);
  const frame = choicesFrame();
  const remembered = {
    entryId: 31,
    originEntryId: null,
    events: [{ kind: "text", key: "e31.p1" }],
    seenBefore: true,
    seenEntries: { 31: true },
    takenChoices: [0, 2],
    rollHistory: { Intimidate: ["success", "fail"] },
  };
  const plain = { entryId: 1, originEntryId: null, events: [{ kind: "text", key: "e1.p1" }] };

  saveGame({ characterId: "alex", frame, log: [remembered, plain] });
  const loaded = loadGame().log;

  assert.deepEqual(loaded[0], remembered);
  // Starsze zapisy nie mają nowych pól i mają wczytywać się bez zmian.
  assert.deepEqual(loaded[1], plain);
  assert.equal(loaded[1].seenBefore, undefined);
  assert.equal(loaded[1].takenChoices ?? null, null);
});

test("pamięć rekordu o niepoprawnym kształcie znika, a archiwum zostaje", () => {
  const storage = memoryStorage();
  useStorage(storage);
  const frame = choicesFrame();

  saveGame({
    characterId: "alex",
    frame,
    log: [{
      entryId: 7,
      originEntryId: null,
      events: [{ kind: "text", key: "e7.p1" }],
      seenBefore: "tak",
      seenEntries: { 7: "tak" },
      takenChoices: ["pierwszy"],
      rollHistory: { Listen: [3] },
    }],
  });
  const record = loadGame().log[0];

  assert.deepEqual(record, {
    entryId: 7,
    originEntryId: null,
    events: [{ kind: "text", key: "e7.p1" }],
  });
});

// --- Nawrót (spec 2026-08-26-cheat-reroll-design.md) --------------------

test("licznik nawrotów przechodzi przez zapis, a jego brak nie unieważnia starych zapisów", () => {
  useStorage(memoryStorage());
  const frame = choicesFrame({ state: validState({ cheats: 3 }) });
  saveGame({ characterId: "alex", frame });
  assert.equal(loadGame().frame.state.cheats, 3);

  useStorage(memoryStorage());
  const legacy = validState();
  delete legacy.cheats;
  saveGame({ characterId: "alex", frame: choicesFrame({ state: legacy }) });
  assert.ok(loadGame(), "stary zapis bez licznika ma nadal się wczytywać");
});

test("licznik nawrotów o złym kształcie odrzuca zapis", () => {
  useStorage(memoryStorage());
  saveGame({ characterId: "alex", frame: choicesFrame({ state: validState({ cheats: -1 }) }) });
  assert.equal(loadGame(), null);
});

// Pola `rewind` silnik już nie wypuszcza, ale zapis nadal ma przenosić tylko
// znane pola ramki: inaczej taśma ze starszej wersji gry wniosłaby do niej
// stan, którego dzisiejszy silnik nie rozumie.
test("nieznane pole ramki nie trafia do zapisu", () => {
  useStorage(memoryStorage());
  const frame = engineFrame(5, [0.0, 0.9]);
  frame.rewind = { entryId: 5, eventCount: 0, cursor: 1, stepIndex: 0 };
  saveGame({ characterId: "alex", frame });
  assert.equal(loadGame().frame.rewind, undefined);
});

test("odwrócony rzut przechodzi przez zapis razem ze znacznikami", () => {
  useStorage(memoryStorage());
  const frame = choicesFrame({
    events: [
      {
        kind: "roll", skill: "CON", tens: [90], units: 0, result: 90, target: 70,
        difficulty: "regular", level: "regular", success: true,
        cheated: true, cheatedFrom: { level: "fail", success: false },
      },
      { kind: "text", key: "e12.p1" },
      { kind: "choices", options: [choice(0), choice(1)] },
    ],
  });
  saveGame({ characterId: "alex", frame });
  const loaded = loadGame();
  assert.equal(loaded.frame.events[0].cheated, true);
  assert.deepEqual(loaded.frame.events[0].cheatedFrom, { level: "fail", success: false });
});
