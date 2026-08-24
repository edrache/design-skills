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
