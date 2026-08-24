// Pomoc przy oznaczaniu dialogów, nie automat. Domyślnie wypisuje propozycje
// do zatwierdzenia; --write zapisuje je do plików. Znaczników tonu
// ([horror], [whisper]) nie zgaduje — to decyzja autorska.

import { readFileSync, writeFileSync } from "node:fs";
import { tagCounts } from "../src/ui/markup.js";
import { VOICE_NAMES, TAGS } from "../src/ui/voices.js";

// Ile znaków po zamknięciu cudzysłowu przeszukujemy w poszukiwaniu imienia.
const ATTRIBUTION_WINDOW = 60;
const QUOTE = /„[^„”]*”|"[^"]*"/g;

const NAMED = VOICE_NAMES.filter((name) => TAGS[name].label);

export function suggestTags(text, names = NAMED) {
  const source = String(text ?? "");
  // Tekst już oznaczony zostawiamy w spokoju — autor tam był.
  if (Object.keys(tagCounts(source)).length > 0) return source;

  let result = "";
  let cursor = 0;

  for (const match of source.matchAll(QUOTE)) {
    const start = match.index;
    const end = start + match[0].length;
    const window = source.slice(end, end + ATTRIBUTION_WINDOW);
    const name = names.find((candidate) => {
      const label = TAGS[candidate].label;
      return label ? new RegExp(`\\b${label}\\b`).test(window) : false;
    });

    result += source.slice(cursor, start);
    result += name ? `[${name}]${match[0]}[/${name}]` : match[0];
    cursor = end;
  }

  return result + source.slice(cursor);
}

function run() {
  const write = process.argv.includes("--write");
  const files = ["text.en.json", "text.pl.json"];
  let changes = 0;

  for (const file of files) {
    const url = new URL(`../data/${file}`, import.meta.url);
    const data = JSON.parse(readFileSync(url, "utf8"));
    let touched = false;

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("__en.") || typeof value !== "string") continue;
      const suggestion = suggestTags(value);
      if (suggestion === value) continue;

      changes += 1;
      touched = true;
      console.log(`\n${file} → ${key}`);
      console.log(`- ${value}`);
      console.log(`+ ${suggestion}`);
      if (write) data[key] = suggestion;
    }

    if (write && touched) writeFileSync(url, `${JSON.stringify(data, null, 2)}\n`);
  }

  console.log(`\n${changes} propozycji.`);
  if (!write) console.log("Uruchom z --write, żeby je zapisać.");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) run();
