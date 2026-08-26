import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
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

function rollFrame(overrides = {}) {
  const roll = {
    tens: [90], units: 0, result: 90, target: 70,
    difficulty: "regular", level: "fail", success: false,
  };
  return {
    entryId: 5,
    events: [{ kind: "roll", skill: "CON", ...roll }],
    pending: {
      type: "rollDecision",
      roll,
      skill: "CON",
      canPush: true,
      canLuck: true,
      luckCost: 20,
      stepIndex: 0,
    },
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
    characteristics: {},
  };
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
  const frame = rollFrame();

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

test("semantyka rollDecision wiąże cursor i skill z krokiem story", async (t) => {
  const story = compatibleStory();
  const character = compatibleCharacter();
  const valid = { characterId: "alex", originEntryId: null, frame: rollFrame() };
  assert.equal(isSaveCompatible(valid, story, character), true);

  await t.test("odrzuca cursor poza krokiem rzutu", () => {
    const saved = clone(valid);
    saved.frame.cursor = 1;
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

  for (const [difficulty, luck, luckCost] of [["hard", 60, 55], ["extreme", 80, 76]]) {
    await t.test(`przelicza próg ${difficulty} i koszt Luck`, () => {
      const saved = clone(valid);
      const semanticStory = compatibleStory();
      semanticStory.entries[5].on[0].difficulty = difficulty;
      saved.frame.state.luck = luck;
      saved.frame.pending.roll.difficulty = difficulty;
      saved.frame.pending.luckCost = luckCost;
      saved.frame.events[0].difficulty = difficulty;
      assert.equal(isSaveCompatible(saved, semanticStory, character), true);

      saved.frame.pending.luckCost -= 1;
      assert.equal(isSaveCompatible(saved, semanticStory, character), false);
    });
  }

  await t.test("canLuck uwzględnia liczbę dostępnych punktów", () => {
    const saved = clone(valid);
    saved.frame.state.luck = 10;
    saved.frame.pending.canLuck = false;
    assert.equal(isSaveCompatible(saved, story, character), true);

    saved.frame.pending.canLuck = true;
    assert.equal(isSaveCompatible(saved, story, character), false);
  });

  for (const skill of ["Sanity", "Luck"]) {
    await t.test(`${skill} nie pozwala ratować rzutu punktami Luck`, () => {
      const saved = clone(valid);
      const semanticStory = compatibleStory();
      const target = skill === "Sanity" ? saved.frame.state.san : saved.frame.state.luck;
      semanticStory.entries[5].on[0].roll = skill;
      saved.frame.pending.skill = skill;
      saved.frame.pending.roll.target = target;
      saved.frame.pending.luckCost = saved.frame.pending.roll.result - target;
      saved.frame.pending.canLuck = false;
      saved.frame.events[0].skill = skill;
      saved.frame.events[0].target = target;
      assert.equal(isSaveCompatible(saved, semanticStory, character), true);

      saved.frame.pending.canLuck = true;
      assert.equal(isSaveCompatible(saved, semanticStory, character), false);
    });
  }
});

test("autosave wiąże decyzję po rzucie z wyborem, który go uruchomił", () => {
  const roll = {
    tens: [50], units: 0, result: 50, target: 5,
    difficulty: "regular", level: "fail", success: false,
  };
  const frame = {
    entryId: 69,
    events: [
      { kind: "flag", flag: "razor_sharp" },
      { kind: "roll", skill: "Occult", ...roll },
    ],
    pending: {
      type: "rollDecision",
      source: "choice",
      choiceIndex: 0,
      roll,
      skill: "Occult",
      canPush: false,
      canLuck: true,
      luckCost: 45,
      stepIndex: 0,
    },
    cursor: 0,
    state: validState({ flags: ["alex", "razor_sharp"], luck: 45 }),
  };
  const story = {
    entries: {
      69: {
        id: 69,
        choices: [{
          text: "e69.c1",
          goto: 69,
          flag: "razor_sharp",
          roll: "Occult",
          onSuccess: { goto: 361 },
          onFail: { goto: 362 },
        }],
      },
    },
  };
  const saved = { characterId: "alex", originEntryId: null, frame };
  assert.equal(isSaveCompatible(saved, story, compatibleCharacter()), true);

  const tampered = clone(saved);
  tampered.frame.pending.choiceIndex = 1;
  tampered.frame.pending.stepIndex = 1;
  assert.equal(isSaveCompatible(tampered, story, compatibleCharacter()), false);
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

test("punkt cofnięcia nie trafia do zapisu — odświeżenie strony zamyka okazję", () => {
  useStorage(memoryStorage());
  const frame = rollFrame();
  frame.rewind = { state: validState(), entryId: 5, eventCount: 0, cursor: 1, stepIndex: 0, event: frame.events[0] };
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
