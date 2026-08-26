// Spisuje pliki muzyczne z media/music/ do data/music.json. Przeglądarka nie
// potrafi wylistować katalogu, więc lista musi powstać poza grą — stąd ten
// skrypt (`npm run music`, uruchamiany też automatycznie przed testami).
import { readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const EXTENSIONS = [".mp3", ".ogg", ".m4a", ".wav"];

export function collectTracks(dir) {
  let items;
  try {
    items = readdirSync(dir, { withFileTypes: true });
  } catch {
    // Brak katalogu oznacza po prostu brak muzyki.
    return [];
  }

  return items
    .filter((item) => item.isFile())
    .map((item) => item.name)
    .filter((name) => !name.startsWith("."))
    .filter((name) => EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)))
    // Alfabetycznie, żeby ponowne uruchomienie nie produkowało szumu w diffie.
    .sort((a, b) => a.localeCompare(b, "pl"))
    .map((name) => `media/music/${name}`);
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const tracks = collectTracks(join(root, "media/music"));
  const target = join(root, "data/music.json");
  writeFileSync(target, `${JSON.stringify({ tracks }, null, 2)}\n`, "utf8");
  console.log(`data/music.json: ${tracks.length} utwor(y/ów)`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
