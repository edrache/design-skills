// Generuje samodzielną stronę z drzewem połączeń między paragrafami.
// Dane (węzły + krawędzie) wstrzykujemy do szablonu, żeby plik wynikowy
// dało się otworzyć bezpośrednio z dysku, bez serwera.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const story = JSON.parse(readFileSync(join(root, "data/story.json"), "utf8"));
const textPl = JSON.parse(readFileSync(join(root, "data/text.pl.json"), "utf8"));
const textEn = JSON.parse(readFileSync(join(root, "data/text.en.json"), "utf8"));

// Paragrafy systemowe (rany, szaleństwo) engine wywołuje z reguł, nie z danych.
const SYSTEM = new Map([
  [324, "spadek punktów wytrzymałości do zera"],
  [325, "poważna rana"],
  [328, "trwałe szaleństwo (indefinite insanity)"],
  [329, "atak szału — nieudany rzut INT"],
  [330, "atak szału: kara do Fighting (Brawl)"],
  [331, "atak szału: kara do Spot Hidden"],
  [332, "atak szału: kara do Persuade i Intimidate"],
  [333, "atak szału: kara do Listen"],
  [334, "spadek poczytalności do zera"],
]);

const plain = (key) => {
  // Nieprzetłumaczone jeszcze paragrafy mają w pl pusty ciąg — wtedy bierzemy angielski.
  const raw = textPl[key] || textEn[key] || textPl[`__en.${key}`] || "";
  return raw.replace(/\[\/?[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
};

const clip = (value, max) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

const conditionLabel = (condition) => {
  const parts = Array.isArray(condition) ? condition : [condition];
  return parts
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && "not" in part) return `bez ${part.not}`;
      if (part && "visits" in part) return `wizyt: ${part.visits}`;
      return JSON.stringify(part);
    })
    .join(" + ");
};

const edges = [];
const seen = new Set();
const addEdge = (from, to, kind, label) => {
  if (typeof to !== "number") return;
  const id = `${from}>${to}>${kind}>${label}`;
  if (seen.has(id)) return;
  seen.add(id);
  edges.push({ from, to, kind, label });
};

// Skoki potrafią siedzieć w gałęziach onSuccess/onFail jako obiekt albo lista efektów.
const collectGoto = (from, outcome, kind, label) => {
  if (!outcome) return;
  for (const effect of Array.isArray(outcome) ? outcome : [outcome]) {
    if (!effect || typeof effect !== "object") continue;
    if (effect.goto === "@return") addEdge(from, -1, kind, label);
    else if (typeof effect.goto === "number") addEdge(from, effect.goto, kind, label);
  }
};

const rollBranches = (from, step, source) => {
  const skill = step.roll + (step.difficulty && step.difficulty !== "regular" ? ` (${step.difficulty})` : "");
  collectGoto(from, step.onSuccess, "success", `${skill}: sukces`);
  collectGoto(from, step.onFail, "fail", `${skill}: porażka`);
  collectGoto(from, step.onPushedFail, "pushed", `${skill}: przepchnięty rzut nieudany`);
  if (!step.onSuccess && !step.onFail && typeof step.goto === "number" && source !== "choice") {
    addEdge(from, step.goto, "auto", "");
  }
};

const entries = Object.values(story.entries).sort((a, b) => a.id - b.id);

for (const entry of entries) {
  const id = entry.id;

  for (const guard of entry.guards ?? []) {
    addEdge(id, guard.goto, "guard", `strażnik: ${conditionLabel(guard.if)}`);
  }

  for (const step of entry.on ?? []) {
    if (step.roll) { rollBranches(id, step, "on"); continue; }
    if (step.bout) continue;
    if (step.if && typeof step.goto === "number") {
      addEdge(id, step.goto, "cond", `jeśli ${conditionLabel(step.if)}`);
      continue;
    }
    if (step.goto === "@return") addEdge(id, -1, "auto", "powrót");
    else if (typeof step.goto === "number") addEdge(id, step.goto, "auto", "");
  }

  entry.choices?.forEach((choice, index) => {
    const label = clip(plain(choice.text) || `wybór ${index + 1}`, 110);
    const suffix = [choice.once ? "jednorazowy" : null, choice.if ? `wymaga: ${conditionLabel(choice.if)}` : null]
      .filter(Boolean)
      .join(", ");
    const full = suffix ? `${label} [${suffix}]` : label;
    if (choice.roll) {
      rollBranches(id, { ...choice }, "choice");
      if (typeof choice.goto === "number" && choice.goto !== id) addEdge(id, choice.goto, "choice", full);
    } else {
      addEdge(id, choice.goto, "choice", full);
    }
  });
}

// Pole "from" pochodzi wprost z książki — dopinamy krawędzie, których nie widać
// w strukturze kroków (np. rozgałęzienia obsługiwane przez silnik).
const declared = new Set(edges.map((edge) => `${edge.from}>${edge.to}`));
for (const entry of entries) {
  for (const from of entry.from ?? []) {
    if (declared.has(`${from}>${entry.id}`)) continue;
    addEdge(from, entry.id, "book", "połączenie z książki");
  }
}

const nodes = entries.map((entry) => ({
  id: entry.id,
  scene: entry.scene,
  end: Boolean(entry.end),
  system: SYSTEM.has(entry.id),
  trigger: SYSTEM.get(entry.id) ?? null,
  roll: (entry.on ?? []).some((step) => step.roll) || (entry.choices ?? []).some((choice) => choice.roll),
  snippet: clip(plain(entry.text?.[0] ?? ""), 300),
}));

const data = {
  starts: story.starts ?? { start: story.start },
  nodes,
  edges: edges.filter((edge) => edge.to !== -1),
  returns: edges.filter((edge) => edge.to === -1).map((edge) => edge.from),
};

const template = readFileSync(join(root, "tools/graph-template.html"), "utf8");
const output = template.replace("/*__DATA__*/null", JSON.stringify(data));
writeFileSync(join(root, "docs/graph.html"), output);
console.log(`Zapisano docs/graph.html — ${nodes.length} paragrafów, ${data.edges.length} połączeń.`);
