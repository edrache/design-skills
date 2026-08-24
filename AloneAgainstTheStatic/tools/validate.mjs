import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { inspectMarkup, tagCounts } from "../src/ui/markup.js";
import { isKnownTag } from "../src/ui/voices.js";

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

// Wszystkie przejścia, także te schowane w skutkach udanego lub nieudanego rzutu.
function targetsOf(entry) {
  const targets = [];
  const walk = (step) => {
    if (!step || typeof step !== "object") return;
    if (typeof step.goto === "number") targets.push(step.goto);
    for (const branch of ["onSuccess", "onFail"]) {
      const value = step[branch];
      if (Array.isArray(value)) value.forEach(walk);
      else walk(value);
    }
  };

  (entry.on ?? []).forEach(walk);
  (entry.guards ?? []).forEach(walk);
  (entry.choices ?? []).forEach(walk);
  return targets;
}

function conditionFlags(condition, positive, all) {
  if (Array.isArray(condition)) {
    condition.forEach((part) => conditionFlags(part, positive, all));
    return;
  }
  if (typeof condition === "string") {
    positive.add(condition);
    all.add(condition);
    return;
  }
  // Negacja jest użyciem flagi, ale nie wymaga, aby flaga została wcześniej
  // zapalona: `{ not: "x" }` jest często celowym warunkiem początkowym.
  if (condition && typeof condition === "object" && typeof condition.not === "string") {
    all.add(condition.not);
  }
}

function flagsOf(entry) {
  const set = new Set();
  const requiredRead = new Set();
  const allRead = new Set();
  const walk = (step) => {
    if (!step || typeof step !== "object") return;
    if (typeof step.flag === "string") set.add(step.flag);
    for (const branch of ["onSuccess", "onFail"]) {
      const value = step[branch];
      if (Array.isArray(value)) value.forEach(walk);
      else walk(value);
    }
  };

  (entry.on ?? []).forEach(walk);
  for (const guard of entry.guards ?? []) conditionFlags(guard.if, requiredRead, allRead);
  for (const choice of entry.choices ?? []) conditionFlags(choice.if, requiredRead, allRead);
  return { set, requiredRead, allRead };
}

function isTerminalGoto(value) {
  return typeof value === "number" || value === "@return";
}

// Interpreter przechodzi do następnego kroku, jeżeli gałąź rzutu nie wykona
// skoku. Dlatego sam fakt istnienia `onSuccess`/`onFail` nie jest wyjściem.
function branchCanFallThrough(branch) {
  if (branch === undefined) return true;
  const effects = Array.isArray(branch) ? branch : [branch];
  for (const effect of effects) {
    if (!effect || typeof effect !== "object") continue;
    if (isTerminalGoto(effect.goto)) return false;
  }
  return true;
}

function stepCanFallThrough(step) {
  if (!step || typeof step !== "object") return true;
  // Runner zawsze kończy bieżący przebieg kroku bout: przekierowuje do
  // wylosowanego epizodu albo wraca na odłożoną pozycję.
  if (step.bout) return false;
  if (isTerminalGoto(step.goto)) return false;
  if (step.roll) {
    return branchCanFallThrough(step.onSuccess) || branchCanFallThrough(step.onFail);
  }
  return true;
}

function entryCanFallThrough(entry) {
  for (const step of entry.on ?? []) {
    if (!stepCanFallThrough(step)) return false;
  }
  return true;
}

function hasNonBlankText(texts, key) {
  return own(texts, key) && typeof texts[key] === "string" && texts[key].trim().length > 0;
}

export function validate(story, textEn, textPl) {
  const errors = [];
  const warnings = [];
  const error = (message) => {
    if (!errors.includes(message)) errors.push(message);
  };
  const warning = (message) => {
    if (!warnings.includes(message)) warnings.push(message);
  };
  const entries = story?.entries && typeof story.entries === "object" ? story.entries : {};
  const ids = new Set(Object.keys(entries).map(Number).filter(Number.isFinite));
  const extracted = Array.isArray(story?.extracted) && story.extracted.length === 2
    ? story.extracted.map(Number)
    : null;
  const [from, to] = extracted ?? [null, null];
  const partialExtraction = extracted !== null && !(from === 1 && to === 371);
  const starts = story?.starts;

  for (const character of ["alex", "charlie"]) {
    const start = starts?.[character];
    if (!Number.isFinite(start)) {
      error(`Brak wymaganego punktu startowego starts.${character}`);
    } else if (!ids.has(start)) {
      error(`Punkt startowy starts.${character} wskazuje nieistniejący paragraf ${start}`);
    }
  }

  const setFlags = new Set();
  const requiredReadFlags = new Set();
  const allReadFlags = new Set();
  for (const [rawId, entry] of Object.entries(entries)) {
    const id = Number(rawId);
    for (const key of [...(entry.text ?? []), ...(entry.choices ?? []).map((choice) => choice.text)]) {
      if (!hasNonBlankText(textEn ?? {}, key)) error(`Brak tekstu angielskiego dla klucza ${key}`);
      if (!hasNonBlankText(textPl ?? {}, key)) warning(`Brak tłumaczenia dla klucza ${key}`);
    }

    for (const target of targetsOf(entry)) {
      if (ids.has(target)) continue;
      if (!extracted || (target >= from && target <= to)) {
        error(`Paragraf ${id} prowadzi do nieistniejącego ${target}`);
      } else {
        warning(`Paragraf ${id} prowadzi do jeszcze nieprzepisanego ${target}`);
      }
    }

    const flags = flagsOf(entry);
    flags.set.forEach((flag) => setFlags.add(flag));
    flags.requiredRead.forEach((flag) => requiredReadFlags.add(flag));
    flags.allRead.forEach((flag) => allReadFlags.add(flag));

    if (!entry.end && (entry.choices ?? []).length === 0 && entryCanFallThrough(entry)) {
      error(`Paragraf ${id} nie ma ani wyborów, ani znacznika końca, ani przejścia`);
    }
  }

  for (const flag of requiredReadFlags) {
    if (setFlags.has(flag)) continue;
    // W pionowym plastrze setter może być w jeszcze nieprzepisanym fragmencie
    // historii. Po usunięciu `extracted` (pełne dane) to znów twardy błąd.
    if (partialExtraction) warning(`Flaga ${flag} jest czytana, ale może być zapalana poza zakresem ekstrakcji`);
    else error(`Flaga ${flag} jest czytana, ale nigdzie nie jest zapalana`);
  }
  for (const flag of setFlags) {
    if (!allReadFlags.has(flag)) warning(`Flaga ${flag} jest zapalana, ale nigdzie nie jest czytana`);
  }

  const reachable = new Set();
  const queue = [];
  for (const character of ["alex", "charlie"]) {
    const start = starts?.[character];
    if (Number.isFinite(start) && !reachable.has(start)) {
      reachable.add(start);
      queue.push(start);
    }
  }
  // W częściowym plastrze paragraf może mieć poprzedniki wyłącznie poza
  // bieżącym zakresem. Traktujemy go jak dodatkowy korzeń, a nie jako martwy kod.
  if (partialExtraction) {
    for (const [rawId, entry] of Object.entries(entries)) {
      if (!(entry.from ?? []).some((source) => !ids.has(source))) continue;
      const id = Number(rawId);
      if (!reachable.has(id)) {
        reachable.add(id);
        queue.push(id);
      }
    }
  }
  while (queue.length > 0) {
    const id = queue.pop();
    const entry = entries[String(id)];
    if (!entry) continue;
    for (const target of targetsOf(entry)) {
      if (!reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }
  for (const id of ids) {
    // Paragrafy systemowe są osiągane niejawnie z reguł HP/SAN, a nie przez
    // numeryczne goto obecne w story.json.
    if (id >= 324 && id <= 334) continue;
    if (!reachable.has(id)) warning(`Paragraf ${id} jest nieosiągalny ze startów`);
  }

  // --- Znaczniki stylu tekstu ---
  const checkMarkup = (locale, texts) => {
    for (const [key, value] of Object.entries(texts ?? {})) {
      // Klucze __en.* to podgląd oryginału w pliku polskim, nie treść gry.
      if (key.startsWith("__en.") || typeof value !== "string") continue;

      const { unclosed, stray } = inspectMarkup(value);
      for (const name of unclosed) error(`${locale} ${key}: niedomknięty znacznik [${name}]`);
      for (const name of stray) error(`${locale} ${key}: zamknięcie [/${name}] bez otwarcia`);

      for (const name of Object.keys(tagCounts(value))) {
        if (!isKnownTag(name)) warning(`${locale} ${key}: nieznany znacznik [${name}]`);
      }
    }
  };

  checkMarkup("en", textEn);
  checkMarkup("pl", textPl);

  // Znacznik zgubiony przy tłumaczeniu — najczęstszy błąd przepisywania zdania.
  for (const [key, source] of Object.entries(textEn ?? {})) {
    const target = textPl?.[key];
    if (typeof source !== "string" || typeof target !== "string" || target.trim() === "") continue;

    const here = tagCounts(source);
    const there = tagCounts(target);
    for (const name of new Set([...Object.keys(here), ...Object.keys(there)])) {
      if ((here[name] ?? 0) !== (there[name] ?? 0)) {
        warning(`${key}: znacznik [${name}] występuje ${here[name] ?? 0}× w en i ${there[name] ?? 0}× w pl`);
      }
    }
  }

  return { errors, warnings };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const load = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8"));
  const out = validate(load("story.json"), load("text.en.json"), load("text.pl.json"));
  out.warnings.forEach((message) => console.log(`OSTRZEŻENIE: ${message}`));
  out.errors.forEach((message) => console.error(`BŁĄD: ${message}`));
  console.log(`\n${out.errors.length} błędów, ${out.warnings.length} ostrzeżeń.`);
  process.exitCode = out.errors.length > 0 ? 1 : 0;
}
