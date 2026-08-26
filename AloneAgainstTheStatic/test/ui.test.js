import test from "node:test";
import assert from "node:assert/strict";
import { createI18n } from "../src/ui/i18n.js";
import { createEntryBlock, entryLabels, eventNodes, renderArchive, renderCheat, renderEvents, renderRollDecision, rollPresentation, segmentEvents } from "../src/ui/journal.js";
import { stripMarkup } from "../src/ui/markup.js";
import { classesOf, createFakeDocument } from "./helpers/fake-dom.js";
import { frameMemory, recordFrame } from "../src/ui/memory.js";
import { markChoice, readProgress, resetProgress } from "../src/ui/progress.js";

test("puste tłumaczenie spada na angielski tekst", () => {
  const i18n = createI18n({ pl: { key: "  " }, en: { key: "Fallback" } }, "pl");
  assert.equal(i18n.t("key"), "Fallback");
  assert.equal(i18n.t("missing"), "[missing]");
});

test("automatyczne przejścia zachowują numery wszystkich paragrafów", () => {
  const roll = { kind: "roll", result: 45 };
  const events = [
    roll,
    { kind: "text", key: "e4.p1" },
    { kind: "text", key: "e5.p1" },
    { kind: "choices", options: [] },
  ];

  assert.deepEqual(segmentEvents(events, { entryId: 5, originEntryId: 7 }), [
    { entryId: 7, events: [roll] },
    { entryId: 4, events: [events[1]] },
    { entryId: 5, events: [events[2], events[3]] },
  ]);
});

test("pierwszy tekst zastępuje origin, gdy nie ma wcześniejszych zdarzeń", () => {
  const events = [{ kind: "text", key: "e8.p1" }];
  assert.deepEqual(segmentEvents(events, { entryId: 8, originEntryId: 3 }), [
    { entryId: 8, events },
  ]);
});

test("guard nie tworzy pustego wpisu dla niewidocznego redirectu", () => {
  const text = { kind: "text", key: "e363.p1" };
  assert.deepEqual(segmentEvents([
    { kind: "redirect", to: 363 },
    text,
  ], { entryId: 363, originEntryId: 9 }), [
    { entryId: 363, events: [text] },
  ]);
});

test("renderEvents przechodzi przez appendEvent/renderMarkup i nie gubi znaczników głosu", () => {
  const source = '[charlie]„Nie wysiadaj z auta.”[/charlie] Zamykasz drzwi.';
  const i18n = createI18n({ pl: { "e1.p1": source }, en: {} }, "pl");
  const doc = createFakeDocument();
  const root = doc.createElement("div");

  const block = renderEvents(root, [{ kind: "text", key: "e1.p1" }], i18n, {}, { entryId: 1 });

  assert.equal(root.lastElementChild, block);
  const paragraph = block.children.find((node) => node.tagName === "P");
  assert.ok(paragraph, "renderEvents powinien dołożyć akapit z renderMarkup");
  assert.ok(classesOf(paragraph).includes("v-charlie"));
  // Inwariant niezmienności treści: textContent akapitu równy źródłu bez znaczników.
  assert.equal(paragraph.textContent, stripMarkup(source));
});

test("prezentacja Luck zachowuje surowy i zakupiony wynik", () => {
  assert.deepEqual(rollPresentation({ result: 45, spentLuck: 54 }), {
    rawResult: 99,
    adjustedResult: 45,
    total: "= 99 → 45",
  });
  assert.equal(rollPresentation({ result: 28 }).total, "= 28");
});

test("renderArchive odtwarza wszystkie przekazane ramki w kolejności czytania", () => {
  const i18n = createI18n({ pl: { "e1.p1": "Pierwszy.", "e2.p1": "Drugi.", "e3.p1": "Trzeci." }, en: {} }, "pl");
  const doc = createFakeDocument();
  const root = doc.createElement("div");
  const records = [
    { entryId: 1, originEntryId: null, events: [{ kind: "text", key: "e1.p1" }] },
    { entryId: 3, originEntryId: 1, events: [{ kind: "text", key: "e2.p1" }, { kind: "text", key: "e3.p1" }] },
  ];

  renderArchive(root, records, i18n, {});

  assert.deepEqual(root.children.map((node) => node.dataset.entryId), ["1", "2", "3"]);
  assert.ok(root.children[0].textContent.endsWith("Pierwszy."));

  // Powtórne wywołanie nie dokłada duplikatów.
  renderArchive(root, records, i18n, {});
  assert.equal(root.children.length, 3);
});

// --- Pamięć poznanych paragrafów (docs/superpowers/specs/2026-08-26-progress-memory-design.md)

const rollEvent = {
  kind: "roll",
  skill: "Intimidate",
  target: 45,
  tens: [40],
  units: 3,
  result: 43,
  level: "regular",
  success: true,
};

function choicesEvent() {
  return {
    kind: "choices",
    options: [
      { index: 0, key: "e1.c1" },
      { index: 1, key: "e1.c2" },
      { index: 2, key: "e1.c3", used: true },
    ],
  };
}

test("createEntryBlock oznacza paragraf widziany wcześniej dopiero na życzenie", () => {
  const doc = createFakeDocument();
  const labels = entryLabels(createI18n({ pl: {}, en: {} }, "pl"));

  // Stare wywołanie (reveal.js) — cztery argumenty, żadnych oznaczeń.
  assert.equal(createEntryBlock(doc, 31, labels, undefined).dataset.seen, undefined);
  assert.equal(createEntryBlock(doc, 31, labels, undefined, {}).dataset.seen, undefined);
  assert.equal(createEntryBlock(doc, 31, labels, undefined, { seenBefore: false }).dataset.seen, undefined);

  const seen = createEntryBlock(doc, 31, labels, undefined, { seenBefore: true });
  assert.equal(seen.dataset.seen, "true");
  assert.equal(seen.dataset.entryId, "31");
});

test("renderEvents przenosi flagę seenBefore z kontekstu na wpis", () => {
  const i18n = createI18n({ pl: { "e1.p1": "Tekst." }, en: {} }, "pl");
  const doc = createFakeDocument();
  const events = [{ kind: "text", key: "e1.p1" }];

  const plain = renderEvents(doc.createElement("div"), events, i18n, {}, { entryId: 1 });
  assert.equal(plain.dataset.seen, undefined);

  const seen = renderEvents(doc.createElement("div"), events, i18n, {}, { entryId: 1, seenBefore: true });
  assert.equal(seen.dataset.seen, "true");
});

test("renderEvents pyta predykat o każdy paragraf ramki z osobna", () => {
  const i18n = createI18n({ pl: { "e4.p1": "Cztery.", "e5.p1": "Pięć." }, en: {} }, "pl");
  const doc = createFakeDocument();
  const root = doc.createElement("div");

  renderEvents(root, [
    { kind: "text", key: "e4.p1" },
    { kind: "text", key: "e5.p1" },
  ], i18n, {}, { entryId: 5, seenBefore: (entryId) => entryId === 4 });

  assert.deepEqual(root.children.map((node) => node.dataset.seen), ["true", undefined]);
});

test("opcja podjęta wcześniej dostaje data-taken i zostaje klikalna", () => {
  const i18n = createI18n({ pl: { "e1.c1": "Raz", "e1.c2": "Dwa", "e1.c3": "Trzy" }, en: {} }, "pl");
  const doc = createFakeDocument();
  const labels = entryLabels(i18n);

  const buttons = eventNodes(doc, choicesEvent(), labels, i18n, { takenChoices: [0, 2] });

  assert.deepEqual(buttons.map((button) => button.dataset.taken), ["true", undefined, "true"]);
  // data-taken nie blokuje: stan niezależny od used/blocked.
  assert.deepEqual(buttons.map((button) => Boolean(button.disabled)), [false, false, true]);
  assert.deepEqual(buttons.map((button) => button.dataset.reason), [undefined, undefined, "used"]);

  let chosen = null;
  const clickable = eventNodes(doc, choicesEvent(), labels, i18n, {
    takenChoices: [0],
    onChoose: (index) => { chosen = index; },
  });
  clickable[0].click();
  assert.equal(chosen, 0);
});

test("bez listy podjętych wyborów nic nie jest oznaczone", () => {
  const i18n = createI18n({ pl: { "e1.c1": "Raz", "e1.c2": "Dwa", "e1.c3": "Trzy" }, en: {} }, "pl");
  const doc = createFakeDocument();

  const buttons = eventNodes(doc, choicesEvent(), entryLabels(i18n), i18n, {});
  assert.deepEqual(buttons.map((button) => button.dataset.taken), [undefined, undefined, undefined]);
});

test("rzut pokazuje wcześniej uzyskane gałęzie, po polsku i po angielsku", () => {
  const doc = createFakeDocument();

  const pl = createI18n({ pl: {}, en: {} }, "pl");
  const [box] = eventNodes(doc, rollEvent, entryLabels(pl), pl, {
    rollHistory: ["success", "fail", "pushedFail"],
  });
  const history = box.querySelector(".roll-history");
  assert.ok(history, "brak węzła .roll-history");
  assert.equal(history.textContent, "Już było: Sukces · Porażka · Porażka forsowana");

  const en = createI18n({ pl: {}, en: {} }, "en");
  const [enBox] = eventNodes(doc, rollEvent, entryLabels(en), en, { rollHistory: ["fail"] });
  assert.equal(enBox.querySelector(".roll-history").textContent, "Seen before: Failure");
});

test("historia rzutu może przyjść mapą umiejętności albo funkcją", () => {
  const doc = createFakeDocument();
  const i18n = createI18n({ pl: {}, en: {} }, "pl");

  const [byMap] = eventNodes(doc, rollEvent, entryLabels(i18n), i18n, {
    rollHistory: { Intimidate: ["success"], Listen: ["fail"] },
  });
  assert.equal(byMap.querySelector(".roll-history").textContent, "Już było: Sukces");

  const [byFunction] = eventNodes(doc, rollEvent, entryLabels(i18n), i18n, {
    rollHistory: (event) => (event.skill === "Intimidate" ? ["fail"] : []),
  });
  assert.equal(byFunction.querySelector(".roll-history").textContent, "Już było: Porażka");
});

test("pusta lub nieznana historia rzutu nie tworzy węzła", () => {
  const doc = createFakeDocument();
  const i18n = createI18n({ pl: {}, en: {} }, "pl");
  const labels = entryLabels(i18n);

  for (const rollHistory of [undefined, [], {}, ["nieznana"], { Listen: ["success"] }]) {
    const [box] = eventNodes(doc, rollEvent, labels, i18n, { rollHistory });
    assert.equal(box.querySelector(".roll-history"), null, `historia: ${JSON.stringify(rollHistory)}`);
  }
});

test("archiwum bierze oznaczenia z rekordu dziennika, a stare rekordy zostają czyste", () => {
  const i18n = createI18n({ pl: { "e1.p1": "Pierwszy.", "e2.p1": "Drugi." }, en: {} }, "pl");
  const doc = createFakeDocument();
  const root = doc.createElement("div");

  renderArchive(root, [
    { entryId: 1, events: [{ kind: "text", key: "e1.p1" }, rollEvent], seenBefore: true, rollHistory: ["success"] },
    { entryId: 2, events: [{ kind: "text", key: "e2.p1" }, rollEvent] },
  ], i18n, {});

  assert.deepEqual(root.children.map((node) => node.dataset.seen), ["true", undefined]);
  assert.equal(root.children[0].querySelector(".roll-history").textContent, "Już było: Sukces");
  assert.equal(root.children[1].querySelector(".roll-history"), null);
});

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

function useStorage(storage) {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
}

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

function restoreStorage() {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete globalThis.localStorage;
}

test("pamięć ramki jest zdjęciem sprzed wizyty, a zapis obejmuje wszystkie paragrafy", (t) => {
  t.after(restoreStorage);
  useStorage(memoryStorage());

  const roll = { kind: "roll", skill: "Intimidate", success: false, pushed: true };
  const record = {
    entryId: 5,
    originEntryId: 4,
    events: [
      roll,
      { kind: "text", key: "e5.p1" },
      { kind: "choices", options: [{ index: 0, key: "e5.c1" }] },
    ],
  };

  // Pierwsze wejście: magazyn pusty, więc nic nie jest oznaczone.
  const first = frameMemory(record, readProgress());
  assert.deepEqual(first, { seenBefore: false, seenEntries: {}, takenChoices: [], rollHistory: {} });

  recordFrame(record);
  markChoice(5, 0);

  // Drugie wejście widzi oba paragrafy ramki, gałąź rzutu i podjęty wybór.
  const second = frameMemory(record, readProgress());
  assert.deepEqual(second, {
    seenBefore: true,
    seenEntries: { 4: true, 5: true },
    takenChoices: [0],
    rollHistory: { Intimidate: ["pushedFail"] },
  });

  // Wznowiony zapis: ta ramka jest już policzona, więc nie przygasza sama siebie.
  const resumed = frameMemory(record, readProgress(), { revisit: true });
  assert.equal(resumed.seenBefore, false);
  assert.deepEqual(resumed.seenEntries, {});

  resetProgress();
  assert.deepEqual(frameMemory(record, readProgress()), {
    seenBefore: false,
    seenEntries: {},
    takenChoices: [],
    rollHistory: {},
  });
});

// --- Nawrót w dzienniku (spec 2026-08-26-cheat-reroll-design.md) --------

function rollBoxOf(doc, event) {
  const i18n = createI18n({}, "pl");
  const block = createEntryBlock(doc, 2, entryLabels(i18n), null);
  for (const node of eventNodes(doc, event, entryLabels(i18n), i18n, {})) block.append(node);
  return block;
}

test("odwrócony werdykt zostawia w dzienniku przekreślony oryginał", () => {
  const doc = createFakeDocument();
  const event = {
    kind: "roll",
    skill: "Psychology",
    target: 60,
    difficulty: "regular",
    result: 90,
    units: 0,
    tens: [90],
    level: "regular",
    success: true,
    cheated: true,
    cheatedFrom: { level: "fail", success: false },
  };
  const block = rollBoxOf(doc, event);
  const levels = [...block.querySelectorAll(".roll-level")];
  assert.equal(levels.length, 2);
  assert.equal(levels[0].className, "roll-level cheated-from");
  assert.equal(levels[0].textContent, "Porażka");
  assert.equal(levels[1].textContent, "Normalny sukces");
  assert.ok(block.querySelector(".cheat-note"), "brak przypisu o poprawionym zapisie");
});

test("zwykły rzut nie dostaje ani przekreślenia, ani przypisu", () => {
  const doc = createFakeDocument();
  const block = rollBoxOf(doc, {
    kind: "roll", skill: "Psychology", target: 60, difficulty: "regular",
    result: 20, units: 0, tens: [20], level: "hard", success: true,
  });
  assert.equal(block.querySelectorAll(".roll-level").length, 1);
  assert.equal(block.querySelector(".cheat-note"), null);
});

test("przycisk nawrotu proponuje werdykt przeciwny do tego, który padł", () => {
  const doc = createFakeDocument();
  const i18n = createI18n({}, "pl");
  const failed = rollBoxOf(doc, {
    kind: "roll", skill: "Psychology", target: 60, difficulty: "regular",
    result: 90, units: 0, tens: [90], level: "fail", success: false,
  });
  const toSuccess = renderCheat(failed, { event: { success: false } }, i18n, () => {});
  assert.equal(toSuccess.textContent, "A może jednak się udało?");
  assert.ok(classesOf(toSuccess).includes("cheat"));
  assert.ok(failed.querySelector(".rollbox").children.includes(toSuccess), "nawrót stoi pod kośćmi");

  const won = rollBoxOf(doc, {
    kind: "roll", skill: "Psychology", target: 60, difficulty: "regular",
    result: 20, units: 0, tens: [20], level: "hard", success: true,
  });
  const toFail = renderCheat(won, { event: { success: true } }, i18n, () => {});
  assert.equal(toFail.textContent, "A może jednak test się nie udał?");
});

test("nawrót staje pod kośćmi, przed decyzjami o Szczęściu i forsowaniu", () => {
  const doc = createFakeDocument();
  const i18n = createI18n({}, "pl");
  const block = rollBoxOf(doc, {
    kind: "roll", skill: "Psychology", target: 60, difficulty: "regular",
    result: 90, units: 0, tens: [90], level: "fail", success: false,
  });
  const box = block.querySelector(".rollbox");
  const button = renderCheat(box, { event: { success: false } }, i18n, () => {});
  renderRollDecision(block, {
    type: "rollDecision", roll: { result: 90, target: 60, difficulty: "regular" },
    skill: "Psychology", canPush: true, canLuck: true, luckCost: 30, stepIndex: 0,
  }, i18n, { onLuck() {}, onPush() {}, onAccept() {} });

  const order = box.children.map((node) => node.className);
  assert.deepEqual(order.slice(-2), ["cheat", "roll-actions"]);
  assert.ok(box.children.includes(button));
});

test("kliknięcie nawrotu woła podany uchwyt dokładnie raz", () => {
  const doc = createFakeDocument();
  let calls = 0;
  const block = rollBoxOf(doc, {
    kind: "roll", skill: "Psychology", target: 60, difficulty: "regular",
    result: 90, units: 0, tens: [90], level: "fail", success: false,
  });
  const button = renderCheat(block, { event: { success: false } }, createI18n({}, "pl"), () => { calls += 1; });
  button.click();
  assert.equal(calls, 1);
});
