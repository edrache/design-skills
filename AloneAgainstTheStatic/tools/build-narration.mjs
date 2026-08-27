import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseMarkup } from "../src/ui/markup.js";
import { tagInfo } from "../src/ui/voices.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ENTRIES = Object.freeze([1, 3, 7]);
const API_URL = "https://api.elevenlabs.io/v1/text-to-dialogue";
const MODEL_PRICE_PER_1000 = 0.10;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

// `.env` jest ignorowany przez repozytorium. Wspieramy go bez zależności,
// żeby sekret nie musiał trafiać do komendy ani do kodu przeglądarkowego.
try {
  process.loadEnvFile?.(path.join(ROOT, ".env"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const TONE_DIRECTIONS = Object.freeze({
  horror: "tense, frightened, ominous",
  whisper: "whispering",
  shout: "shouting",
  thought: "quietly, introspectively",
  radio: "through a crackling car radio",
  wrong: "uneasy, uncanny",
});

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function withoutAudioTags(value) {
  return cleanText(String(value ?? "").replace(/\[[^\]\n]+\]/g, ""));
}

function speakerFor(tag, protagonist) {
  if (tag === "you") return protagonist;
  if (["alex", "charlie", "mark", "julie", "tom"].includes(tag)) return tag;
  return "narrator";
}

export function buildDialogueTurns(source, { protagonist = "alex" } = {}) {
  const turns = [];

  function add(speaker, directions, value) {
    const text = cleanText(value);
    if (!text) return;
    const direction = directions.at(-1);
    const spoken = direction ? `[${direction}] ${text}` : text;
    const previous = turns.at(-1);
    if (previous?.speaker === speaker && previous.direction === direction) {
      previous.text = `${previous.text} ${text}`;
      return;
    }
    turns.push({ speaker, direction: direction ?? null, text: spoken });
  }

  function walk(nodes, context) {
    for (const node of nodes) {
      if (node.type === "text") {
        add(context.speaker, context.directions, node.value);
        continue;
      }

      const info = tagInfo(node.name);
      if (info?.kind === "voice") {
        walk(node.children, { ...context, speaker: speakerFor(node.name, protagonist) });
        continue;
      }

      const direction = TONE_DIRECTIONS[node.name];
      if (direction) {
        walk(node.children, { ...context, directions: [...context.directions, direction] });
        continue;
      }

      walk(node.children, context);
    }
  }

  walk(parseMarkup(source), { speaker: "narrator", directions: [] });
  return turns;
}

export function applyNarrationScript(baseTurns, scriptedTurns, key = "tekst") {
  if (!Array.isArray(scriptedTurns)) return baseTurns;
  if (scriptedTurns.length !== baseTurns.length) {
    throw new Error(`Skrypt narracji ${key} zmienia liczbę tur: ${baseTurns.length} → ${scriptedTurns.length}.`);
  }

  return scriptedTurns.map((turn, index) => {
    const base = baseTurns[index];
    if (!turn || turn.speaker !== base.speaker) {
      throw new Error(`Skrypt narracji ${key}, tura ${index + 1}, zmienia mówcę ${base.speaker}.`);
    }
    if (withoutAudioTags(turn.text) !== withoutAudioTags(base.text)) {
      throw new Error(`Skrypt narracji ${key}, tura ${index + 1}, zmienia wypowiadany tekst.`);
    }
    return { speaker: turn.speaker, direction: null, text: cleanText(turn.text) };
  });
}

export function narrationScriptFor(value, protagonist) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray(value[protagonist])) return value[protagonist];
  return null;
}

function parseList(value) {
  return String(value).split(",").map((item) => Number(item.trim())).filter(Number.isInteger);
}

export function parseOptions(argv) {
  const options = {
    entries: [...DEFAULT_ENTRIES],
    locales: ["pl"],
    protagonist: "alex",
    confirm: false,
    force: false,
    variant: false,
    requireScript: false,
    concurrency: 1,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--entries") options.entries = parseList(argv[++index]);
    else if (arg === "--locale") {
      const locale = argv[++index];
      options.locales = locale === "all" ? ["pl", "en"] : [locale];
    } else if (arg === "--protagonist") options.protagonist = argv[++index];
    else if (arg === "--confirm") options.confirm = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--variant") options.variant = true;
    else if (arg === "--require-script") options.requireScript = true;
    else if (arg === "--concurrency") options.concurrency = Number(argv[++index]);
    else throw new Error(`Nieznana opcja: ${arg}`);
  }

  if (!options.entries.length) throw new Error("Lista --entries jest pusta.");
  if (options.locales.some((locale) => !["pl", "en"].includes(locale))) {
    throw new Error("--locale przyjmuje pl, en albo all.");
  }
  if (!['alex', 'charlie'].includes(options.protagonist)) {
    throw new Error("--protagonist przyjmuje alex albo charlie.");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 3) {
    throw new Error("--concurrency przyjmuje liczbę od 1 do 3.");
  }
  return options;
}

function countCharacters(turns) {
  return turns.reduce((total, turn) => total + [...turn.text].length, 0);
}

function voiceId(speaker, locale) {
  const specific = `ELEVENLABS_VOICE_${speaker.toUpperCase()}_${locale.toUpperCase()}`;
  const common = `ELEVENLABS_VOICE_${speaker.toUpperCase()}`;
  return process.env[specific] || process.env[common] || "";
}

async function json(name) {
  return JSON.parse(await readFile(path.join(ROOT, "data", name), "utf8"));
}

async function optionalJson(name) {
  try {
    return await json(name);
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

function selectedKeys(story, entries) {
  return entries.flatMap((id) => {
    const entry = story.entries?.[String(id)];
    if (!entry) throw new Error(`Brak wpisu ${id} w story.json.`);
    return entry.text;
  });
}

async function exists(filename) {
  try {
    await access(filename);
    return true;
  } catch {
    return false;
  }
}

async function atomicWrite(filename, data) {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp-${process.pid}`;
  await writeFile(temporary, data);
  await rename(temporary, filename);
}

async function saveManifest(manifest) {
  const filename = path.join(ROOT, "data", "media.json");
  await atomicWrite(filename, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function generate(turns, locale, options) {
  const speakers = [...new Set(turns.map((turn) => turn.speaker))];
  const missing = speakers.filter((speaker) => !voiceId(speaker, locale));
  if (missing.length) {
    throw new Error(`Brak identyfikatorów głosów dla ${locale}: ${missing.join(", ")}.`);
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${API_URL}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        model_id: "eleven_v3",
        seed: 1989,
        inputs: turns.map((turn) => ({ text: turn.text, voice_id: voiceId(turn.speaker, locale) })),
      }),
    });

    if (response.ok) {
      return {
        audio: Buffer.from(await response.arrayBuffer()),
        charged: response.headers.get("character-cost"),
      };
    }

    const detail = await response.text();
    if (!RETRYABLE_STATUS.has(response.status) || attempt === 4) {
      throw new Error(`ElevenLabs HTTP ${response.status}: ${detail.slice(0, 500)}`);
    }
    const delay = 1000 * (2 ** attempt);
    console.warn(`ElevenLabs HTTP ${response.status}; ponawiam za ${delay / 1000}s…`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("ElevenLabs: wyczerpano próby ponowienia żądania.");
}

function setNarrationPath(manifest, job, relative, options) {
  manifest.narration[job.key] ??= {};
  if (!options.variant) {
    manifest.narration[job.key][job.locale] = relative;
    return;
  }
  const current = manifest.narration[job.key][job.locale];
  const variants = current && typeof current === "object" ? current : {};
  if (typeof current === "string" && current.trim()) variants.default = current;
  variants[options.protagonist] = relative;
  manifest.narration[job.key][job.locale] = variants;
}

export async function run(argv = process.argv.slice(2)) {
  const options = parseOptions(argv);
  const [story, manifest] = await Promise.all([json("story.json"), json("media.json")]);
  const keys = selectedKeys(story, options.entries);
  const jobs = [];

  for (const locale of options.locales) {
    const [texts, narrationScripts] = await Promise.all([
      json(`text.${locale}.json`),
      optionalJson(`narration.${locale}.json`),
    ]);
    for (const key of keys) {
      const source = texts[key];
      if (typeof source !== "string" || !source.trim()) throw new Error(`Brak tekstu ${locale}:${key}.`);
      const baseTurns = buildDialogueTurns(source, { protagonist: options.protagonist });
      const scriptedTurns = narrationScriptFor(narrationScripts[key], options.protagonist);
      if (options.requireScript && !scriptedTurns) {
        throw new Error(`Brak emocjonalnego skryptu ${locale}:${key} dla ${options.protagonist}.`);
      }
      const turns = applyNarrationScript(baseTurns, scriptedTurns, `${locale}:${key}`);
      if (options.requireScript && turns.some((turn) => !/\[[^\]\n]+\]/.test(turn.text))) {
        throw new Error(`Skrypt narracji ${locale}:${key} ma turę bez znacznika emocji.`);
      }
      jobs.push({ locale, key, turns, characters: countCharacters(turns) });
    }
  }

  const total = jobs.reduce((sum, job) => sum + job.characters, 0);
  const cost = total / 1000 * MODEL_PRICE_PER_1000;
  console.log(`Narracja: wpisy ${options.entries.join(", ")} · bohater ${options.protagonist}`);
  console.log(`Klipy: ${jobs.length} · znaki API: ${total} · szacunek v3: $${cost.toFixed(4)}`);
  for (const locale of options.locales) {
    const selected = jobs.filter((job) => job.locale === locale);
    const characters = selected.reduce((sum, job) => sum + job.characters, 0);
    console.log(`${locale}: ${selected.length} klipów · ${characters} znaków · $${(characters / 10000).toFixed(4)}`);
  }

  if (!options.confirm) {
    console.log("Tryb kosztorysu: nie wysłano żadnego płatnego żądania. Dodaj --confirm, aby generować.");
    return { jobs, total, cost, generated: 0 };
  }
  if (!process.env.ELEVENLABS_API_KEY) throw new Error("Brak ELEVENLABS_API_KEY w środowisku.");
  if (!process.env.ELEVENLABS_API_KEY.startsWith("sk_") || process.env.ELEVENLABS_API_KEY.length !== 51) {
    throw new Error(
      "ELEVENLABS_API_KEY nie jest sekretem ElevenLabs. Właściwy klucz zaczyna się od sk_, ma dokładnie 51 znaków i jest widoczny tylko przy utworzeniu lub rotacji.",
    );
  }

  manifest.narration ??= {};
  let generated = 0;
  let cursor = 0;
  async function processJob(job) {
    const directory = options.variant ? `${job.locale}/${options.protagonist}` : job.locale;
    const relative = `media/narration/${directory}/${job.key}.mp3`;
    const filename = path.join(ROOT, relative);
    if (!options.force && await exists(filename)) {
      setNarrationPath(manifest, job, relative, options);
      console.log(`pomijam ${job.locale}:${job.key} — plik już istnieje`);
      return;
    }

    // Dotychczasowe klipy EN dla Alex mogą zostać użyte jako wariant Alex,
    // bez ponownego naliczania kosztu. Innych protagonistów nie zakładamy.
    if (!options.force && options.variant && options.protagonist === "alex") {
      const legacyRelative = `media/narration/${job.locale}/${job.key}.mp3`;
      if (await exists(path.join(ROOT, legacyRelative))) {
        setNarrationPath(manifest, job, legacyRelative, options);
        console.log(`używam istniejącego ${job.locale}:${job.key} jako wariantu alex`);
        return;
      }
    }

    const result = await generate(job.turns, job.locale, options);
    await atomicWrite(filename, result.audio);
    setNarrationPath(manifest, job, relative, options);
    generated += 1;
    console.log(`gotowe ${job.locale}:${job.key} · ${job.characters} znaków · koszt nagłówka ${result.charged ?? "?"}`);
  }

  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor];
      cursor += 1;
      await processJob(job);
    }
  }

  await Promise.all(Array.from({ length: Math.min(options.concurrency, jobs.length) }, () => worker()));
  await saveManifest(manifest);
  return { jobs, total, cost, generated };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
