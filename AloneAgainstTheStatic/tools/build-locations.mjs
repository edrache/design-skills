// Podpina grafiki lokacji (media/img/locations/NN.webp) pod konkretne paragrafy
// w data/media.json. Mapowanie paragraf → plik opisuje docs/grafiki-lokacji.md
// i to ten dokument jest źródłem prawdy dla ludzi; poniższa tablica jest jego
// wykonywalnym odpowiednikiem. Po zmianie przypisań uruchom `npm run locations`.
//
// Grafika wpisu ma w journal.js pierwszeństwo przed ilustracją sceny. Paragrafy
// z listy INHERIT (wstawki szaleństwa 328–333) nie dostają własnego kadru, tylko
// znacznik `inherit` — journal.js powtarza dla nich grafikę poprzedniego
// paragrafu, bo opisują stan umysłu, a nie zmianę miejsca.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = "media/img/locations";

// Paragrafy, które dziedziczą kadr po poprzedniku zamiast dostać własny.
export const INHERIT = [328, 329, 330, 331, 332, 333];

export const LOCATIONS = [
  {
    file: "01.webp",
    name: "Wnętrze samochodu — droga przez Black Hills",
    entries: [1, 2, 3, 4, 7, 8, 83, 96],
  },
  {
    file: "02.webp",
    name: "Podjazd i ganek przed chatą",
    entries: [
      5, 6, 12, 36, 37, 41, 42, 84, 85, 103, 105, 111, 113, 114, 115, 116, 117,
      118, 119, 121, 122, 123, 125, 128, 130, 132, 136, 177, 178, 179, 180,
    ],
  },
  {
    file: "03.webp",
    name: "Chata — główne pomieszczenie",
    entries: [
      11, 18, 19, 20, 22, 23, 24, 25, 26, 28, 29, 30, 31, 32, 33, 34, 89, 91,
      92, 93, 95, 100, 101, 107, 108, 109, 110, 112, 120, 124, 126, 131, 133,
      135, 139, 140, 142, 145, 154, 158, 160, 163, 170, 174, 175, 176, 182,
      185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198,
      199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212,
      213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 227, 228, 230,
      231, 234, 235, 236, 238, 241, 243, 244, 245, 246, 249, 251, 252, 253,
      255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 267, 268, 269,
      270, 271, 272, 273, 274, 278, 282, 283, 284, 287, 288, 289, 291, 294,
      295, 296, 325, 326, 327, 370,
    ],
  },
  {
    file: "04.webp",
    name: "Chata — aneks kuchenny",
    entries: [13, 14, 15, 16, 17, 35, 94, 97, 98, 99, 106, 127, 129, 181, 183, 232, 237, 247],
  },
  {
    file: "05.webp",
    name: "Chata — łazienka i wanna",
    entries: [21, 86, 87, 88, 90, 102, 137, 184, 239, 240, 254, 293, 297],
  },
  {
    file: "06.webp",
    name: "Tył chaty — generator",
    entries: [368, 369, 371],
  },
  {
    file: "07.webp",
    name: "Polana przed chatą",
    entries: [
      9, 10, 27, 134, 224, 225, 226, 229, 233, 242, 248, 250, 275, 276, 277,
      279, 280, 281, 285, 286, 292, 335, 336, 337, 338, 339, 340, 341, 342,
      343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 355, 356, 357,
      358, 359, 363, 364,
    ],
  },
  {
    file: "08.webp",
    name: "Szlak spacerowy w lesie (dzień)",
    entries: [38, 39, 40, 43, 49, 55, 77, 104],
  },
  {
    file: "09.webp",
    name: "Strumień",
    entries: [44, 45, 46, 47, 48, 50, 51, 52, 53, 54],
  },
  {
    file: "10.webp",
    name: "Polana z opuszczoną szopą",
    entries: [56, 78, 79, 80, 81, 82],
  },
  {
    file: "11.webp",
    name: "Wnętrze szopy",
    entries: [
      57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
      75, 76, 361, 362,
    ],
  },
  {
    file: "12.webp",
    name: "Las nocą — pościg za nieznajomym",
    entries: [138, 141, 143, 144, 146, 147, 148, 149, 150, 151, 152, 153, 155, 156, 157],
  },
  {
    file: "13.webp",
    name: "Dolina i obozowisko z namiotem",
    entries: [164, 165, 166, 167, 168, 169, 171, 172, 173, 266, 366],
  },
  {
    file: "14.webp",
    name: "Ciemny las podczas ucieczki",
    entries: [
      159, 161, 162, 290, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307,
      308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321,
      322, 323, 324, 334, 354, 360,
    ],
  },
  {
    file: "15.webp",
    name: "Szosa i kabina ciężarówki (epilog)",
    entries: [365, 367],
  },
];

// Buduje mapę `entries` dla media.json i po drodze pilnuje, żeby mapowanie
// zgadzało się z historią: żaden paragraf nie może dostać dwóch grafik ani
// wskazywać na nieistniejący wpis.
export function buildEntries(locations, storyEntries) {
  const entries = {};
  const owner = new Map();
  const problems = [];

  for (const location of locations) {
    for (const id of location.entries) {
      const key = String(id);
      if (storyEntries && !(key in storyEntries)) {
        problems.push(`paragraf ${key} (${location.file}) nie istnieje w story.json`);
        continue;
      }
      if (owner.has(key)) {
        problems.push(`paragraf ${key}: ${owner.get(key)} i ${location.file}`);
        continue;
      }
      owner.set(key, location.file);
      entries[key] = { image: `${DIR}/${location.file}` };
    }
  }

  for (const id of INHERIT) {
    const key = String(id);
    if (owner.has(key)) {
      problems.push(`paragraf ${key}: dziedziczy kadr, a dostał ${owner.get(key)}`);
      continue;
    }
    owner.set(key, "inherit");
    entries[key] = { inherit: true };
  }

  const missing = storyEntries
    ? Object.keys(storyEntries)
        .filter((key) => !owner.has(key))
        .map(Number)
        .sort((a, b) => a - b)
    : [];

  // Klucze numerycznie, żeby diff pliku był czytelny przy ponownym budowaniu.
  const sorted = {};
  for (const key of Object.keys(entries).sort((a, b) => Number(a) - Number(b))) {
    sorted[key] = entries[key];
  }
  return { entries: sorted, missing, problems };
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const story = JSON.parse(readFileSync(join(root, "data/story.json"), "utf8"));
  const media = JSON.parse(readFileSync(join(root, "data/media.json"), "utf8"));

  const absent = LOCATIONS.filter((location) => !existsSync(join(root, DIR, location.file)));
  const { entries, missing, problems } = buildEntries(LOCATIONS, story.entries);

  const unexpected = missing;
  if (problems.length || unexpected.length) {
    for (const problem of problems) console.error(`błąd: ${problem}`);
    if (unexpected.length) console.error(`błąd: paragrafy bez grafiki: ${unexpected.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  for (const location of absent) console.warn(`uwaga: brak pliku ${DIR}/${location.file}`);

  writeFileSync(
    join(root, "data/media.json"),
    `${JSON.stringify({ ...media, entries }, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `data/media.json: ${Object.keys(entries).length} paragraf(y/ów), ` +
      `${LOCATIONS.length} grafik(i), dziedziczy kadr: ${INHERIT.join(", ") || "—"}`,
  );
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
