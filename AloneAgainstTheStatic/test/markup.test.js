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

test("INWARIANT: render nie zmienia treści żadnego tekstu na ciągach syntetycznych", () => {
  const doc = createFakeDocument();
  const samples = [
    "Zwykły tekst bez znaczników.",
    " [charlie]„A.”[/charlie] ",
    "\n[charlie]„A.”[/charlie]\n",
    "[horror]Coś [whisper]szepcze[/whisper] w ciemności[/horror].",
    "[dream]sen[/dream]",
    "[charlie][/charlie]",
    "[charlie]niedomknięty",
  ];

  for (const sample of samples) {
    assert.equal(renderMarkup(doc, sample).textContent, stripMarkup(sample), sample);
  }
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

test("akapit blokowy (cała treść to kwestia) dostaje data-opens=voice", () => {
  const doc = createFakeDocument();
  const p = renderMarkup(doc, "[charlie]„Nie wysiadaj z auta.”[/charlie]");
  assert.equal(p.dataset.opens, "voice");
});

test("akapit zaczynający się wtopioną kwestią dostaje data-opens=voice", () => {
  const doc = createFakeDocument();
  const p = renderMarkup(doc, "[charlie]„Cholera!”[/charlie] — warczy Charlie.");
  assert.equal(p.dataset.opens, "voice");
});

test("akapit zaczynający się narracją z kwestią w środku nie dostaje data-opens", () => {
  const doc = createFakeDocument();
  const p = renderMarkup(doc, "Narracja na starcie, a " + '[charlie]„Cholera!”[/charlie]' + " w środku.");
  assert.equal(p.dataset.opens, undefined);
});

test("akapit czysto narracyjny nie dostaje data-opens", () => {
  const doc = createFakeDocument();
  const p = renderMarkup(doc, "Coś [horror]tu jest[/horror].");
  assert.equal(p.dataset.opens, undefined);
});

test("biały znak przed znacznikiem głosu nie psuje wykrycia otwarcia kwestią", () => {
  const doc = createFakeDocument();
  const p = renderMarkup(doc, "\n[charlie]„A.”[/charlie]\n");
  assert.equal(p.dataset.opens, "voice");
});
