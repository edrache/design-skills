import test from "node:test";
import assert from "node:assert/strict";
import { createI18n } from "../src/ui/i18n.js";
import { rollPresentation, segmentEvents } from "../src/ui/journal.js";

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

test("prezentacja Luck zachowuje surowy i zakupiony wynik", () => {
  assert.deepEqual(rollPresentation({ result: 45, spentLuck: 54 }), {
    rawResult: 99,
    adjustedResult: 45,
    total: "= 99 → 45",
  });
  assert.equal(rollPresentation({ result: 28 }).total, "= 28");
});
