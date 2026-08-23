import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const sources = path.join(root, "PDF_input/FearOfTheUnknown/PL");

const townMd = fs.readFileSync(path.join(sources, "3_fotu_CREATION_1_town.md"), "utf8");
const characterMd = fs.readFileSync(path.join(sources, "4_fotu_CREATION_2_character.md"), "utf8");
const oracleMd = fs.readFileSync(path.join(sources, "8_fotu_oracle.md"), "utf8");
const pl90Csv = fs
  .readFileSync(path.join(sources, "fotu_d66_tabele_PL_miasteczko_PL90_poprawka.csv"), "utf8")
  .replace(/^\uFEFF/, "");

function clean(text) {
  return text
    .replace(/<!--.*?-->/gs, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tableRows(section) {
  return [...section.matchAll(/^\|\s*([1-6])\s*\|\s*(.*?)\s*\|$/gm)].map((match) => clean(match[2]));
}

function d66(rows) {
  if (rows.length !== 36) throw new Error(`Expected 36 d66 entries, got ${rows.length}`);
  return rows.map((text, index) => ({
    roll: `${Math.floor(index / 6) + 1}${(index % 6) + 1}`,
    text,
  }));
}

function sectionBetween(markdown, startPattern, endPattern) {
  const start = markdown.search(startPattern);
  if (start < 0) throw new Error(`Missing section: ${startPattern}`);
  const tail = markdown.slice(start);
  const endMatch = tail.slice(1).search(endPattern);
  return endMatch < 0 ? tail : tail.slice(0, endMatch + 1);
}

function questionSection(markdown, number) {
  return sectionBetween(markdown, new RegExp(`^## ${number}$`, "m"), /^## \d+$|^## Możecie zaczynać grę$/m);
}

function questionTitle(section) {
  const headings = [...section.matchAll(/^## (.+)$/gm)].map((match) => clean(match[1]));
  return headings.find((heading) => !/^\d+$/.test(heading)) ?? "Tabela";
}

function shortDescription(section, fallback) {
  const titleIndex = section.indexOf(`## ${questionTitle(section)}`);
  const afterTitle = section.slice(titleIndex).split(/\n### 1\b/)[0];
  const paragraphs = afterTitle
    .split(/\n\s*\n/)
    .map(clean)
    .filter((paragraph) => paragraph && !paragraph.startsWith("##") && !paragraph.startsWith("|"));
  return paragraphs[0] || fallback;
}

const townDefinitions = [
  ["town-landmark", 1, "Miejsce"],
  ["town-known-person", 2, "Znana osoba"],
  ["town-disliked-group", 3, "Nielubiana grupa"],
  ["town-obsession", 4, "Obsesja"],
].map(([id, number, label]) => {
  const section = questionSection(townMd, number);
  return {
    id,
    category: "town",
    label,
    title: questionTitle(section),
    description: shortDescription(section, "Wylosuj inspirację i dopasuj ją do swojego miasteczka."),
    dice: "d66",
    core: d66(tableRows(section)),
  };
});

const rumorsSection = sectionBetween(townMd, /^## Plotki$/m, /^## Jesteś gotowy/m);
townDefinitions.push({
  id: "town-rumors",
  category: "town",
  label: "Plotki",
  title: "Jaką plotkę ostatnio słyszano?",
  description:
    "Plotka nie musi być prawdziwa — to po prostu coś, co usłyszała postać. Wyrocznia zdecyduje, czy okaże się prawdą.",
  dice: "d66",
  core: d66(tableRows(rumorsSection)),
});

const bondsSection = sectionBetween(characterMd, /^## Tworzenie postaci$/m, /^## Przejdź do pytania 1$/m);
const characterDefinitions = [
  {
    id: "character-bond",
    category: "character",
    label: "Więź",
    title: "Jaki rodzaj więzi łączy protagonistów?",
    description:
      "Więź to wspólny, uniwersalny tag oparty na doświadczeniu obu postaci, przywoływany podczas współpracy.",
    dice: "d66",
    tagType: "uniwersalny",
    core: d66(tableRows(bondsSection)),
  },
];

for (const number of [1, 3, 4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 16]) {
  const section = questionSection(characterMd, number);
  const description = shortDescription(section, "Wylosuj inspirację dla swojej postaci.");
  const tagType = /negatywny/i.test(description)
    ? "negatywny"
    : /uniwersalny/i.test(description)
      ? "uniwersalny"
      : "pozytywny";
  characterDefinitions.push({
    id: `character-${number}`,
    category: "character",
    label: `Pytanie ${number}`,
    title: questionTitle(section),
    description,
    dice: "d66",
    tagType,
    core: d66(tableRows(section)),
  });
}

function parseCsv(csv) {
  const header = csv.split(/\r?\n/, 1)[0];
  const delimiter = (header.match(/;/g) || []).length > (header.match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

const csvRows = parseCsv(pl90Csv);
if (csvRows.length !== 37 || csvRows[0].length !== 19) {
  throw new Error(`Unexpected Polska '90 CSV shape: ${csvRows.length} × ${csvRows[0]?.length}`);
}

[...townDefinitions, ...characterDefinitions].forEach((table, column) => {
  table.pl90 = d66(csvRows.slice(1).map((row) => clean(row[column])));
});

function numberedEntries(section, limit = 6) {
  return [...section.matchAll(/^([1-6])\.\s+(.+)$/gm)]
    .slice(0, limit)
    .map((match) => ({ roll: match[1], text: clean(match[2]) }));
}

function oracleSection(title, nextTitle) {
  return sectionBetween(
    oracleMd,
    new RegExp(`^## ${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"),
    new RegExp(`^## ${nextTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"),
  );
}

const antagonist = oracleSection("Antagonista", "Co robią?");
const actions = oracleSection("Co robią?", "Ich motyw");
const motives = oracleSection("Ich motyw", "Incydent inicjujący");
const incident = oracleSection("Incydent inicjujący", "Powiąż to wszystko z miasteczkiem i postaciami i możesz ZACZĄĆ grę");
const police = oracleSection("Dlaczego policja nie pomoże?", "Prowadzenie gry");
const alternateMotives = motives.slice(motives.indexOf("Alternatywnie rzuć na tej tabeli:"));

const mysteryDefinitions = [
  {
    id: "mystery-antagonist",
    category: "mystery",
    label: "Antagonista",
    title: "Kim lub czym jest antagonista?",
    description: "Rzuć pojedynczą sześciościenną kością, aby wylosować antagonistę.",
    dice: "d6",
    core: numberedEntries(antagonist),
  },
  {
    id: "mystery-action",
    category: "mystery",
    label: "Działanie",
    title: "Co robi antagonista?",
    description: "Znajdź inspirację dotyczącą tego, co dzieje się w tle tajemnicy.",
    dice: "d6",
    core: numberedEntries(actions),
  },
  {
    id: "mystery-motive",
    category: "mystery",
    label: "Motyw",
    title: "Co jest motywem antagonisty?",
    description: "Wylosuj powód, dla którego antagonista robi to, co robi.",
    dice: "d6",
    core: numberedEntries(motives),
  },
  {
    id: "mystery-motive-alt",
    category: "mystery",
    label: "Motyw II",
    title: "Alternatywny motyw antagonisty",
    description: "Alternatywna tabela motywów — użyj jej zamiast tabeli podstawowej albo połącz oba wyniki.",
    dice: "d6",
    core: numberedEntries(alternateMotives),
  },
  {
    id: "mystery-incident",
    category: "mystery",
    label: "Incydent",
    title: "Jaki jest incydent inicjujący?",
    description: "Pierwsza scena po stworzeniu miasta i postaci: sposób, w jaki protagoniści odkrywają sekret.",
    dice: "d6",
    core: numberedEntries(incident),
  },
  {
    id: "mystery-police",
    category: "mystery",
    label: "Policja",
    title: "Dlaczego policja nie pomoże?",
    description: "Użyj tej tabeli, gdy bohaterowie szukają pomocy, ale nie mają odpowiedniego tagu ani więzi z policją.",
    dice: "d6",
    core: numberedEntries(police),
  },
];

const data = {
  settings: [
    { id: "core", label: "Podręcznik", note: "Główne tabele z polskiego wydania podręcznika." },
    {
      id: "pl90",
      label: "Polska ’90",
      note: "Miasto i Postać korzystają z tabel Polska ’90. Tajemnica pozostaje podręcznikowa.",
    },
  ],
  categories: [
    {
      id: "town",
      label: "Miasto",
      eyebrow: "Pięć tagów i szepty",
      intro: "Wylosuj cztery filary miasteczka oraz plotkę. Piąty tag uzyskasz, powtarzając dowolne pytanie.",
    },
    {
      id: "character",
      label: "Postać",
      eyebrow: "Kim jesteś, gdy robi się ciemno?",
      intro: "Tabele są inspiracją dla więzi oraz pozytywnych, negatywnych i uniwersalnych tagów protagonisty.",
    },
    {
      id: "mystery",
      label: "Tajemnica",
      eyebrow: "Sekret, który nie chce pozostać ukryty",
      intro: "Połącz antagonistę, jego działanie, motyw i incydent inicjujący. Dopasuj wyniki do tagów miasta i postaci.",
    },
  ],
  tables: [...townDefinitions, ...characterDefinitions, ...mysteryDefinitions],
};

const output = `window.FOTU_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(path.join(root, "FearOfTheUnknown/data.js"), output);
console.log(
  `Generated ${data.tables.length} tables and ${data.tables.reduce((sum, table) => sum + table.core.length, 0)} core entries.`,
);
