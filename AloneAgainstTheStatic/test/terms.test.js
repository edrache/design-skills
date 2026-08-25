import test from "node:test";
import assert from "node:assert/strict";
import { termName } from "../src/ui/terms.js";
import { renderEvents, renderRollDecision } from "../src/ui/journal.js";
import { portraitSourceFor, renderSheet } from "../src/ui/sheet.js";
import { createI18n } from "../src/ui/i18n.js";

// Minimalna atrapa DOM: renderery potrzebują tylko drzewa węzłów z tekstem.
function createDocument() {
  const doc = {
    createElement(tag) {
      const node = {
        tagName: tag.toUpperCase(),
        children: [],
        attributes: {},
        dataset: {},
        style: {},
        _text: "",
        ownerDocument: doc,
        get textContent() { return this._text; },
        set textContent(value) { this._text = String(value); },
        get childElementCount() { return this.children.length; },
        append(...nodes) { this.children.push(...nodes); },
        replaceChildren(...nodes) { this.children = [...nodes]; },
        setAttribute(name, value) { this.attributes[name] = String(value); },
        addEventListener() {},
        focus() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
      };
      return node;
    },
  };
  return doc;
}

function flatten(node) {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return "";
  const own = node._text ?? "";
  const children = Array.isArray(node.children) ? node.children.map(flatten) : [];
  return [own, ...children].filter(Boolean).join(" ");
}

const doc = createDocument();
const root = doc.createElement("div");

test("nazwy testów i cech używają terminologii polskiego Startera", () => {
  assert.equal(termName("Spot Hidden", "pl"), "Spostrzegawczość");
  assert.equal(termName("Fighting (Brawl)", "pl"), "Walka Wręcz (Bijatyka)");
  assert.equal(termName("SIZ", "pl"), "BC");
  assert.equal(termName("Spot Hidden", "en"), "Spot Hidden");
  // Nieznany klucz zostaje w oryginale, zamiast zniknąć z ekranu.
  assert.equal(termName("Piloting (Airship)", "pl"), "Piloting (Airship)");
});

test("dziennik rzutu opisuje test po polsku", () => {
  const i18n = createI18n({ pl: {}, en: {} }, "pl");
  const block = renderEvents(root, [
    { kind: "roll", skill: "Psychology", target: 45, tens: [80], units: 6, result: 86, level: "fail", success: false },
  ], i18n, {}, { entryId: 7 });
  const text = flatten(block);

  assert.match(text, /Psychologia · 45 \/ 22 \/ 9/);
  assert.match(text, /Porażka/);
  assert.doesNotMatch(text, /Psychology/);
});

test("decyzja o rzucie proponuje wydanie Szczęścia, nie Luck", () => {
  const i18n = createI18n({ pl: {}, en: {} }, "pl");
  const block = doc.createElement("article");
  renderRollDecision(block, { canLuck: true, luckCost: 15, canPush: true }, i18n, {});
  const text = flatten(block);

  assert.match(text, /Wydaj 15 pkt\. Szczęścia/);
  assert.match(text, /Forsuj rzut/);
  assert.doesNotMatch(text, /Luck/);
});

test("karta postaci pokazuje polskie nazwy umiejętności i cech", () => {
  const character = {
    name: "Alex",
    occupation: { en: "Salesperson", pl: "Sprzedawczyni" },
    move: 7,
    build: 1,
    damageBonus: "1d4",
    skills: { "Spot Hidden": 35 },
    characteristics: { STR: 70 },
  };
  const state = { hp: 13, maxHp: 13, san: 50, startingSan: 50, luck: 35, mp: 10, flags: [], penalties: {} };
  const panel = doc.createElement("div");
  renderSheet(panel, state, character, "pl");
  const text = flatten(panel);

  assert.match(text, /Alex · Sprzedawczyni/);
  assert.match(text, /Spostrzegawczość 35/);
  assert.match(text, /S 70/);
  assert.match(text, /PW 13\/13/);
  assert.match(text, /Modyfikator Obrażeń: 1d4/);
  assert.match(text, /Krzepa: 1/);
});

test("portret Charliego odpowiada procentowi pozostałego Sanity", () => {
  const charlie = { id: "charlie", san: 60 };
  const sourceAt = (san) => portraitSourceFor(charlie, { san, startingSan: 60 });

  assert.equal(sourceAt(60), "media/img/charlie.png");
  assert.equal(sourceAt(42), "media/img/charlie.png");
  assert.equal(sourceAt(41), "media/img/charlie_75.png");
  assert.equal(sourceAt(36), "media/img/charlie_50.png");
  assert.equal(sourceAt(24), "media/img/charlie_25.png");
  assert.equal(sourceAt(12), "media/img/charlie_0.png");
  assert.equal(sourceAt(0), "media/img/charlie_0.png");
});

test("portret Alex pozostaje bazowy niezależnie od Sanity", () => {
  const alex = { id: "alex", san: 50 };
  assert.equal(portraitSourceFor(alex, { san: 0, startingSan: 50 }), "media/img/alex.png");
});
