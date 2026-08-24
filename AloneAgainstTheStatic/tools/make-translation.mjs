// Buduje text.pl.json z kompletem kluczy w kolejności paragrafów.
// Już przetłumaczone wpisy zostają nietknięte; nowe dostają pusty string
// i sąsiadujący klucz "__en" z oryginałem, żeby tłumaczyć bez drugiego pliku.
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../data/", import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, dir)));

const story = load("story.json");
const en = load("text.en.json");
const pl = load("text.pl.json");

const out = {};
let added = 0;

const ids = Object.keys(story.entries).map(Number).sort((a, b) => a - b);
for (const id of ids) {
  const entry = story.entries[id];
  const keys = [...(entry.text ?? []), ...(entry.choices ?? []).map((c) => c.text)];
  for (const key of keys) {
    if (!(key in en)) continue;
    out[`__en.${key}`] = en[key];
    if (pl[key]) out[key] = pl[key];
    else { out[key] = ""; added += 1; }
  }
}

// Klucze obecne w text.en.json, ale nieużywane przez żaden paragraf, nigdy nie
// trafią do gry. Zgłaszamy je, żeby nie zniknęły po cichu razem z tłumaczeniem.
const covered = new Set(Object.keys(out).filter((k) => !k.startsWith("__en.")));
const orphans = Object.keys(en).filter((k) => !covered.has(k));

writeFileSync(new URL("text.pl.json", dir), JSON.stringify(out, null, 2) + "\n");
console.log(`Plik tłumaczenia zawiera ${covered.size} wpisów, w tym ${added} nowych do przetłumaczenia.`);
if (orphans.length) console.log(`Klucze bez paragrafu (pominięte): ${orphans.join(", ")}`);
