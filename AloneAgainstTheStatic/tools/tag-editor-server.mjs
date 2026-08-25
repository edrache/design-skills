import { createServer } from "node:http";
import { readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inspectMarkup, tagCounts } from "../src/ui/markup.js";
import { isKnownTag, TAGS } from "../src/ui/voices.js";

const ROOT = new URL("../", import.meta.url);
const DATA_DIR = new URL("../data/", import.meta.url);
const MAX_BODY_BYTES = 256 * 1024;
const MIME = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
});
let updateQueue = Promise.resolve();

const json = (response, status, value) => {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(`${JSON.stringify(value)}\n`);
};

const loadJson = async (url) => JSON.parse(await readFile(url, "utf8"));

function dataUrl(locale, dataDir = DATA_DIR) {
  if (!new Set(["en", "pl"]).has(locale)) throw Object.assign(new Error("Nieobsługiwany język."), { status: 400 });
  return new URL(`text.${locale}.json`, dataDir);
}

export function validateTextValue(value) {
  if (typeof value !== "string") return { errors: ["Tekst musi być ciągiem znaków."], warnings: [] };
  const inspection = inspectMarkup(value);
  const errors = [
    ...inspection.unclosed.map((name) => `Niedomknięty znacznik [${name}].`),
    ...inspection.stray.map((name) => `Zamknięcie [/${name}] nie ma pasującego otwarcia.`),
  ];
  const warnings = Object.keys(tagCounts(value))
    .filter((name) => !isKnownTag(name))
    .map((name) => `Nieznany znacznik [${name}].`);
  return { errors, warnings };
}

export async function updateTextFile({ locale, key, value, expected, dataDir = DATA_DIR }) {
  if (!/^e\d+\.(?:p|c)\d+$/.test(key ?? "")) {
    throw Object.assign(new Error("Nieprawidłowy klucz tekstu."), { status: 400 });
  }
  if (typeof value !== "string" || typeof expected !== "string") {
    throw Object.assign(new Error("Brak tekstu lub wersji bazowej."), { status: 400 });
  }
  if (Buffer.byteLength(value, "utf8") > MAX_BODY_BYTES) {
    throw Object.assign(new Error("Tekst jest zbyt długi."), { status: 413 });
  }

  const validation = validateTextValue(value);
  if (validation.errors.length) {
    throw Object.assign(new Error(validation.errors.join(" ")), { status: 422, details: validation });
  }

  const url = dataUrl(locale, dataDir);
  const texts = await loadJson(url);
  if (!Object.hasOwn(texts, key)) {
    throw Object.assign(new Error(`Klucz ${key} nie istnieje w text.${locale}.json.`), { status: 404 });
  }
  if (texts[key] !== expected) {
    throw Object.assign(new Error("Plik zmienił się od chwili otwarcia edytora."), {
      status: 409,
      current: texts[key],
    });
  }

  texts[key] = value;
  const temporary = new URL(`.${fileURLToPath(url).split("/").at(-1)}.${randomUUID()}.tmp`, dataDir);
  await writeFile(temporary, `${JSON.stringify(texts, null, 2)}\n`, "utf8");
  await rename(temporary, url);
  return { key, locale, value, warnings: validation.warnings };
}

function enqueueTextUpdate(options) {
  const update = updateQueue.then(() => updateTextFile(options));
  updateQueue = update.catch(() => undefined);
  return update;
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("Żądanie jest zbyt duże."), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Nieprawidłowy JSON."), { status: 400 });
  }
}

async function editorPayload() {
  const [story, en, pl] = await Promise.all([
    loadJson(new URL("story.json", DATA_DIR)),
    loadJson(new URL("text.en.json", DATA_DIR)),
    loadJson(new URL("text.pl.json", DATA_DIR)),
  ]);
  return { story, texts: { en, pl }, tags: TAGS };
}

function staticUrl(pathname) {
  const relative = pathname === "/" ? "tools/tag-editor.html" : decodeURIComponent(pathname.slice(1));
  const url = new URL(relative, ROOT);
  return url.pathname.startsWith(ROOT.pathname) ? url : null;
}

async function handle(request, response) {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

  if (request.method === "GET" && requestUrl.pathname === "/api/editor-data") {
    return json(response, 200, await editorPayload());
  }

  const update = /^\/api\/text\/(en|pl)\/([^/]+)$/.exec(requestUrl.pathname);
  if (request.method === "PUT" && update) {
    const body = await readBody(request);
    const result = await enqueueTextUpdate({
      locale: update[1],
      key: decodeURIComponent(update[2]),
      value: body.value,
      expected: body.expected,
    });
    return json(response, 200, result);
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return json(response, 405, { error: "Niedozwolona metoda." });
  }

  const url = staticUrl(requestUrl.pathname);
  if (!url) return json(response, 403, { error: "Niedozwolona ścieżka." });
  try {
    const body = await readFile(url);
    const extension = /\.[^.]+$/.exec(url.pathname)?.[0] ?? "";
    response.writeHead(200, {
      "content-type": MIME[extension] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error?.code === "ENOENT") return json(response, 404, { error: "Nie znaleziono pliku." });
    throw error;
  }
}

export function createTagEditorServer() {
  return createServer((request, response) => {
    handle(request, response).catch((error) => {
      json(response, error.status ?? 500, {
        error: error.message ?? "Błąd serwera.",
        ...(error.details ? { details: error.details } : {}),
        ...(error.current !== undefined ? { current: error.current } : {}),
      });
    });
  });
}

function cliPort(argv) {
  const at = argv.indexOf("--port");
  const value = at >= 0 ? Number(argv[at + 1]) : 4174;
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error("Port musi być liczbą od 1 do 65535.");
  return value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = cliPort(process.argv.slice(2));
  const server = createTagEditorServer();
  server.listen(port, "127.0.0.1", () => {
    console.log(`Edytor tagów: http://127.0.0.1:${port}/tools/tag-editor.html`);
    console.log("Zatrzymaj serwer skrótem Ctrl+C.");
  });
}
