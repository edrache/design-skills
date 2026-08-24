import test from "node:test";
import assert from "node:assert/strict";
import { inspectMarkup, parseMarkup, stripMarkup, tagCounts } from "../src/ui/markup.js";
import { isKnownTag, tagInfo, TAGS, VOICE_NAMES } from "../src/ui/voices.js";

test("tekst bez znaczników przechodzi bez zmian", () => {
  assert.deepEqual(parseMarkup("Zwykły opis."), [{ type: "text", value: "Zwykły opis." }]);
  assert.equal(stripMarkup("Zwykły opis."), "Zwykły opis.");
});

test("znacznik tworzy węzeł z zawartością", () => {
  const text = "[charlie]" + String.fromCharCode(0x201e) + "Cholera!" + String.fromCharCode(0x201d) + "[/charlie] " + String.fromCharCode(0x2014) + " warczy.";
  assert.deepEqual(parseMarkup(text), [
    { type: "tag", name: "charlie", children: [{ type: "text", value: String.fromCharCode(0x201e) + "Cholera!" + String.fromCharCode(0x201d) }] },
    { type: "text", value: " " + String.fromCharCode(0x2014) + " warczy." },
  ]);
});

test("znaczniki zagnieżdżają się", () => {
  const text = "[charlie]" + String.fromCharCode(0x201e) + "Co to?" + String.fromCharCode(0x201d) + " [horror]Głos mu się łamie.[/horror][/charlie]";
  const nodes = parseMarkup(text);
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
