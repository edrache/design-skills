import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../tools/validate.mjs";

const load = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8"));

const starts = { alex: 1, charlie: 1 };
const storyOf = (entries, extra = {}) => ({ extracted: [1, 5], starts, entries, ...extra });
const textsFor = (entries) => Object.fromEntries(
  Object.values(entries).flatMap((entry) => [
    ...(entry.text ?? []),
    ...(entry.choices ?? []).map((choice) => choice.text),
  ].map((key) => [key, "x"])),
);

test("wymaga obu startów postaci (legacy start może zostać)", () => {
  const entries = { 1: { id: 1, text: ["e1.p1"], end: true } };
  const out = validate({ extracted: [1, 5], start: 1, entries }, textsFor(entries), {});
  assert.ok(out.errors.some((error) => error.includes("starts.alex")));
  assert.ok(out.errors.some((error) => error.includes("starts.charlie")));
});

test("wykrywa przejście do nieistniejącego paragrafu w zakresie, także w gałęzi rzutu", () => {
  const entries = {
    1: { id: 1, text: ["e1.p1"], on: [{ roll: "DEX", onSuccess: [{ flag: "x" }, { goto: 3 }], onFail: { goto: 1 } }] },
  };
  const out = validate(storyOf(entries), textsFor(entries), {});
  assert.ok(out.errors.some((error) => error.includes("3")));
});

test("przejście poza zakres ekstrakcji to ostrzeżenie, nie błąd", () => {
  const entries = { 1: { id: 1, text: ["e1.p1"], choices: [{ text: "e1.c1", goto: 99 }] } };
  const out = validate(storyOf(entries), textsFor(entries), {});
  assert.deepEqual(out.errors, []);
  assert.ok(out.warnings.some((warning) => warning.includes("99")));
});

test("wykrywa brakujący angielski klucz tekstu, a pusty polski zgłasza jako ostrzeżenie", () => {
  const entries = { 1: { id: 1, text: ["e1.p1"], end: true } };
  const missing = validate(storyOf(entries), {}, {});
  assert.ok(missing.errors.some((error) => error.includes("e1.p1")));
  const untranslated = validate(storyOf(entries), { "e1.p1": "x" }, { "e1.p1": "   " });
  assert.ok(untranslated.warnings.some((warning) => warning.includes("e1.p1")));
});

test("uwzględnia flagi z guards i choice.if, lecz negacja nie wymaga settera", () => {
  const entries = {
    1: {
      id: 1,
      text: ["e1.p1"],
      guards: [{ if: "brak_settera", goto: 1 }],
      choices: [{ text: "e1.c1", if: ["ustawiona", { not: "celowo_nieustawiona" }], goto: 1 }],
      on: [{ flag: "ustawiona" }],
    },
  };
  // Pełny zakres ekstrakcji oznacza komplet danych, więc dodatni warunek musi mieć setter.
  const out = validate({ extracted: [1, 371], starts, entries }, textsFor(entries), {});
  assert.ok(out.errors.some((error) => error.includes("brak_settera")));
  assert.ok(!out.errors.some((error) => error.includes("celowo_nieustawiona")));
  assert.ok(!out.warnings.some((warning) => warning.includes("ustawiona") && warning.includes("nigdzie nie jest czytana")));
});

test("rozpoznaje brak wyjścia po fall-through rzutu, ale @return jest wyjściem", () => {
  const dangling = { 1: { id: 1, text: ["e1.p1"], on: [{ roll: "DEX", onSuccess: { flag: "x" }, onFail: { flag: "y" } }] } };
  const danglingOut = validate(storyOf(dangling), textsFor(dangling), {});
  assert.ok(danglingOut.errors.some((error) => error.includes("nie ma ani wyborów")));

  const returns = { 1: { id: 1, text: ["e1.p1"], on: [{ roll: "DEX", onSuccess: { goto: "@return" }, onFail: { goto: "@return" } }] } };
  const returnOut = validate(storyOf(returns), textsFor(returns), {});
  assert.ok(!returnOut.errors.some((error) => error.includes("nie ma ani wyborów")));

  const bout = { 1: { id: 1, text: ["e1.p1"], on: [{ bout: true }] } };
  const boutOut = validate(storyOf(bout), textsFor(bout), {});
  assert.ok(!boutOut.errors.some((error) => error.includes("nie ma ani wyborów")));
});

test("liczy osiągalność od obu startów", () => {
  const entries = {
    1: { id: 1, text: ["e1.p1"], choices: [{ text: "e1.c1", goto: 3 }] },
    2: { id: 2, text: ["e2.p1"], choices: [{ text: "e2.c1", goto: 3 }] },
    3: { id: 3, text: ["e3.p1"], end: true },
    4: { id: 4, text: ["e4.p1"], end: true },
  };
  const out = validate(storyOf(entries, { starts: { alex: 1, charlie: 2 } }), textsFor(entries), {});
  assert.ok(!out.warnings.some((warning) => warning.includes("nieosiągalny") && (warning.includes("1") || warning.includes("2") || warning.includes("3"))));
  assert.ok(out.warnings.some((warning) => warning.includes("nieosiągalny") && warning.includes("4")));
});

test("częściowy zakres uwzględnia zewnętrzne poprzedniki i wpisy systemowe", () => {
  const entries = {
    1: { id: 1, text: ["e1.p1"], end: true },
    2: { id: 2, text: ["e2.p1"], from: [99], choices: [{ text: "e2.c1", goto: 3 }] },
    3: { id: 3, text: ["e3.p1"], end: true },
    329: { id: 329, text: ["e329.p1"], on: [{ bout: true }] },
  };
  const out = validate({ extracted: [1, 30], starts, entries }, textsFor(entries), {});
  for (const id of [2, 3, 329]) {
    assert.ok(!out.warnings.some((warning) => warning.includes("nieosiągalny") && warning.includes(String(id))));
  }
});

test("prawdziwe dane gry przechodzą walidację bez błędów", () => {
  const out = validate(load("story.json"), load("text.en.json"), load("text.pl.json"));
  assert.deepEqual(out.errors, []);
});

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
    { "e1.p1": '[charlie]"A."[/charlie]' },
    { "e1.p1": '"A."' },
  );
  assert.ok(out.warnings.some((warning) => warning.includes("e1.p1") && warning.includes("charlie")));
});

test("puste tłumaczenie nie jest porównywane ze znacznikami oryginału", () => {
  const entries = { 1: { id: 1, text: ["e1.p1"], end: true } };
  const out = validate(storyOf(entries), { "e1.p1": '[charlie]"A."[/charlie]' }, { "e1.p1": "  " });
  assert.ok(!out.warnings.some((warning) => warning.includes("charlie")));
});
