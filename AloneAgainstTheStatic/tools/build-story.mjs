// Buduje deterministyczny pionowy plaster paragrafów 1-30.
// Mechanika jest jawna: ponowne uruchomienie generatora nie nadpisuje ręcznych
// poprawek, bo wszystkie wyjątki pozostają w tym pliku.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const RANGE = [1, 30];

const choice = (label, goto) => ({ label, goto });
const roll = (skill, onSuccess, onFail) => ({ roll: skill, onSuccess, onFail });

const CONFIG = {
  1: { on: [{ flag: "alex" }], choices: [choice("To keep offering help", 7), choice("To change the radio station instead", 3)] },
  2: { on: [{ flag: "charlie" }], choices: [choice("To ask Alex to stop", 83), choice("To just ignore the sound", 96)] },
  3: { on: [roll("Psychology", { goto: 4 }, { goto: 8 })] },
  4: { on: [{ goto: 5 }] },
  5: { on: [{ roll: "CON", onFail: [{ flag: "touched_by_cold" }] }], choices: [choice("To say you are hungry", 6), choice("To say you aren't hungry", 12)] },
  6: { on: [{ goto: 11 }] },
  7: { on: [roll("Psychology", { goto: 4 }, { goto: 8 })] },
  8: { on: [{ goto: 5 }] },
  9: { guards: [{ if: ["temporal_steel", { not: "knife_to_a_gun_fight" }], goto: 363 }], choices: [choice("To accept", 27), choice("To refuse", 134)] },
  10: { on: [roll("DEX", { goto: 360 }, { goto: 359 })] },
  11: { choices: [choice("To get started on dinner", 13), choice("To wait for Charlie", 16)] },
  12: { on: [{ goto: 11 }] },
  13: { choices: [choice("To respond lovingly", 14), choice("To change the subject", 17)] },
  14: { choices: [choice("To talk about plans for tomorrow", 18), choice("To reassure Charlie", 15)] },
  15: { choices: [choice("To agree", 19), choice("To complain", 25)] },
  16: { choices: [choice("To respond lovingly", 14), choice("To change the subject", 17)] },
  17: { on: [{ flag: "broken_heart" }], choices: [choice("To talk about plans for tomorrow", 18), choice("To reassure Charlie", 15)] },
  18: { choices: [choice("To agree", 19), choice("To complain", 25)] },
  19: { on: [roll("Spot Hidden", { goto: 26 }, { goto: 20 })] },
  20: { choices: [choice("To watch the movie right away", 28), choice("To get ready for bed first", 21)] },
  21: { on: [{ flag: "occupied" }, { goto: 22 }] },
  22: { on: [{ roll: "Sanity", onFail: [{ flag: "unsettled" }, { san: "1" }] }], choices: [choice("To cover your ears", 29), choice("To scramble for the dial and turn it down", 23)] },
  23: { guards: [{ if: "broken_heart", goto: 24 }], choices: [choice("To get frustrated with Charlie", 24), choice("To stay calm", 30)] },
  24: { on: [{ flag: "blame_game" }, { goto: 31 }] },
  25: { on: [roll("Spot Hidden", { goto: 26 }, { goto: 20 })] },
  26: { on: [{ flag: "the_flowers_in_the_stream" }], choices: [choice("To get changed before the movie", 21), choice("To lay on the bed and watch it now", 28)] },
  27: { on: [{ goto: 354 }] },
  28: { on: [{ goto: 22 }] },
  29: { guards: [{ if: "broken_heart", goto: 24 }], choices: [choice("To get frustrated with Charlie", 24), choice("To stay calm", 30)] },
  30: { on: [{ goto: 31 }] },
};

const DRIVE = new Set([1, 2, 3, 4, 7, 8]);
const CLEARING = new Set([9, 10, 27]);
const ARRIVAL = new Set([5, 6, 12]);

function sceneFor(id) {
  if (DRIVE.has(id)) return "drive";
  if (CLEARING.has(id)) return "clearing";
  if (ARRIVAL.has(id)) return "arrival";
  return "cabin";
}

function proseOf(id, paragraphs) {
  if (id === 5) return [paragraphs[0], `${paragraphs[1]} ${paragraphs[2]}`, paragraphs[3]];
  if (id === 8) return [`${paragraphs[0]} ${paragraphs[1]}`, paragraphs[2]];
  if (id === 22) return paragraphs.slice(0, -2);
  if (id === 23 || id === 29) return paragraphs.slice(0, -2);
  return paragraphs.slice(0, -1);
}

export function buildStory(raw) {
  const entries = {};
  const texts = {};

  for (let id = RANGE[0]; id <= RANGE[1]; id += 1) {
    const source = raw[String(id)];
    if (!source) throw new Error(`Brak paragrafu ${id} w raw-entries.json`);
    const config = CONFIG[id];
    if (!config) throw new Error(`Brak jawnej konfiguracji mechaniki paragrafu ${id}`);

    const entry = { id, scene: sceneFor(id), text: [], from: source.trace };
    for (const paragraph of proseOf(id, source.paragraphs)) {
      const key = `e${id}.p${entry.text.length + 1}`;
      entry.text.push(key);
      texts[key] = paragraph;
    }
    if (config.guards) entry.guards = structuredClone(config.guards);
    if (config.on) entry.on = structuredClone(config.on);
    if (config.choices) {
      entry.choices = config.choices.map((item, index) => {
        const key = `e${id}.c${index + 1}`;
        texts[key] = item.label;
        return { text: key, goto: item.goto };
      });
    }
    entries[id] = entry;
  }

  return {
    story: { extracted: [...RANGE], start: 1, starts: { alex: 1, charlie: 2 }, entries },
    texts,
  };
}

export function writeStoryFiles(raw) {
  const { story, texts } = buildStory(raw);
  const data = new URL("../data/", import.meta.url);
  writeFileSync(new URL("story.json", data), `${JSON.stringify(story, null, 2)}\n`);
  writeFileSync(new URL("text.en.json", data), `${JSON.stringify(texts, null, 2)}\n`);
  const textPl = new URL("text.pl.json", data);
  const media = new URL("media.json", data);
  if (!existsSync(textPl)) writeFileSync(textPl, "{}\n");
  if (!existsSync(media)) {
    writeFileSync(media, `${JSON.stringify({ entries: {}, scenes: {} }, null, 2)}\n`);
  }
  return { story, texts };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const raw = JSON.parse(readFileSync(new URL("./raw-entries.json", import.meta.url), "utf8"));
  const { story, texts } = writeStoryFiles(raw);
  console.log(`Zbudowano ${Object.keys(story.entries).length} paragrafów, ${Object.keys(texts).length} tekstów.`);
}
