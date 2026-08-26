const KEY = "aats-progress";
const VERSION = 1;
const BRANCHES = new Set(["success", "fail", "pushedFail"]);

const EMPTY = Object.freeze({ entries: {}, choices: {}, rolls: {} });

function storageOrNull() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isEntries(value) {
  return isRecord(value) && Object.values(value).every(isNonNegativeInteger);
}

function isChoices(value) {
  return isRecord(value) && Object.values(value).every((list) => (
    Array.isArray(list) && list.every(isNonNegativeInteger)
  ));
}

function isRolls(value) {
  return isRecord(value) && Object.values(value).every((list) => (
    Array.isArray(list) && list.every((branch) => typeof branch === "string" && BRANCHES.has(branch))
  ));
}

// Uszkodzony JSON albo obca wersja to sygnał, że wpis nie jest zaufany —
// traktujemy go jak pusty magazyn i kasujemy, tak jak save.js.
function discard(storage) {
  try {
    storage?.removeItem?.(KEY);
  } catch {
    // Zablokowany magazyn nie może przerwać gry.
  }
}

export function readProgress() {
  const storage = storageOrNull();
  if (!storage) return EMPTY;

  try {
    const raw = storage.getItem?.(KEY);
    if (!raw) return EMPTY;

    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== VERSION) throw new Error("unsupported progress version");
    if (!isEntries(parsed.entries) || !isChoices(parsed.choices) || !isRolls(parsed.rolls)) {
      throw new Error("invalid progress shape");
    }

    return { entries: parsed.entries, choices: parsed.choices, rolls: parsed.rolls };
  } catch {
    discard(storage);
    return EMPTY;
  }
}

function persist(storage, snapshot) {
  try {
    storage?.setItem?.(KEY, JSON.stringify({ version: VERSION, ...snapshot }));
  } catch {
    // Pełny magazyn albo tryb prywatny wyłączają pamięć, gra działa dalej.
  }
}

export function markEntry(id) {
  const storage = storageOrNull();
  const current = readProgress();
  const key = String(id);
  const snapshot = {
    ...current,
    entries: { ...current.entries, [key]: (current.entries[key] ?? 0) + 1 },
  };
  persist(storage, snapshot);
  return snapshot;
}

export function markChoice(id, index) {
  const storage = storageOrNull();
  const current = readProgress();
  const key = String(id);
  const existing = current.choices[key] ?? [];
  if (existing.includes(index)) return current;

  const snapshot = {
    ...current,
    choices: { ...current.choices, [key]: [...existing, index] },
  };
  persist(storage, snapshot);
  return snapshot;
}

export function markRoll(id, skill, branch) {
  const storage = storageOrNull();
  const current = readProgress();
  const key = `${id}:${skill}`;
  const existing = current.rolls[key] ?? [];
  if (existing.includes(branch)) return current;

  const snapshot = {
    ...current,
    rolls: { ...current.rolls, [key]: [...existing, branch] },
  };
  persist(storage, snapshot);
  return snapshot;
}

export function resetProgress() {
  discard(storageOrNull());
  return EMPTY;
}

// Silnik nie rozróżnia gałęzi rzutu — wyliczamy ją tu ze zdarzenia,
// które i tak renderuje dziennik, żeby go nie zmieniać.
export function rollBranch(event) {
  if (event.success) return "success";
  if (event.pushed) return "pushedFail";
  return "fail";
}
