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

test("dwie kwestie różnych osób w jednym akapicie dostają własnych mówiących", () => {
  const source = "„Uważaj” — szepnął Mark. „Nie teraz” — odpowiada Charlie.";
  assert.equal(
    suggestTags(source, NAMES),
    "[mark]„Uważaj”[/mark] — szepnął Mark. [charlie]„Nie teraz”[/charlie] — odpowiada Charlie.",
  );
});

test("imię z atrybucji wygrywa z imieniem dalej w narracji", () => {
  const source = "„Uważaj” — szepnął Mark. Charlie stał w kącie.";
  assert.equal(
    suggestTags(source, NAMES),
    "[mark]„Uważaj”[/mark] — szepnął Mark. Charlie stał w kącie.",
  );
});

test("okno atrybucji nie sięga w atrybucję kolejnej kwestii", () => {
  const source = "„A.” — mówi Tom. „B.” — odpowiada Charlie.";
  assert.equal(
    suggestTags(source, NAMES),
    "[tom]„A.”[/tom] — mówi Tom. [charlie]„B.”[/charlie] — odpowiada Charlie.",
  );
});

test("imię będące fragmentem dłuższego wyrazu nie zostaje rozpoznane", () => {
  const source = "„Cisza” — mówi Tomasz, poprawiając antenę.";
  assert.equal(suggestTags(source, NAMES), source);
});

test("atrybucja bez imienia, imię pada w następnym zdaniu — brak propozycji", () => {
  const source = "„Jasne…” — mówisz. Charlie wstaje.";
  assert.equal(suggestTags(source, NAMES), source);
});

test("imię w atrybucji zakończonej przecinkiem, zdanie trwa — propozycja jest", () => {
  const source = "„Uważaj” — mówi Charlie, chowając latarkę.";
  assert.equal(
    suggestTags(source, NAMES),
    "[charlie]„Uważaj”[/charlie] — mówi Charlie, chowając latarkę.",
  );
});

test("angielska atrybucja bez myślnika — propozycja jest", () => {
  const source = '"Wait." Mark whispers.';
  assert.equal(suggestTags(source, NAMES), '[mark]"Wait."[/mark] Mark whispers.');
});
