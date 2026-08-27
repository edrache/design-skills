const KEY = "aats-settings";

const DEFAULTS = Object.freeze({
  narration: true,
  narrationVolume: 0.9,
  musicVolume: 0.4,
  scanlines: 0.05,
  proseSize: 1.05,
  textEffects: 0.6,
  pointerStatic: 0.5,
});

const NUMERIC_RANGES = Object.freeze({
  narrationVolume: [0, 1],
  musicVolume: [0, 1],
  scanlines: [0, 0.15],
  proseSize: [0.9, 1.4],
  textEffects: [0, 1],
  pointerStatic: [0, 1],
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function storageOrNull() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function normalizeValue(key, value, fallback) {
  if (key === "narration") return typeof value === "boolean" ? value : fallback;

  const range = NUMERIC_RANGES[key];
  if (!range || typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(range[0], Math.min(range[1], value));
}

function normalizeValues(source, fallback = DEFAULTS) {
  const candidate = isRecord(source) ? source : {};
  const values = {};
  for (const key of Object.keys(DEFAULTS)) {
    values[key] = normalizeValue(key, candidate[key], fallback[key]);
  }
  return Object.freeze(values);
}

function readStored(storage) {
  try {
    const raw = storage?.getItem?.(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist(storage, values) {
  try {
    storage?.setItem?.(KEY, JSON.stringify(values));
  } catch {
    // Ustawienia działają w pamięci, gdy magazyn jest zablokowany lub pełny.
  }
}

function applyToDocument(values) {
  try {
    const style = globalThis.document?.documentElement?.style;
    if (typeof style?.setProperty !== "function") return;
    style.setProperty("--scanline-strength", String(values.scanlines));
    style.setProperty("--prose-size", `${values.proseSize}rem`);
    style.setProperty("--text-effects", String(values.textEffects));
    style.setProperty("--pointer-static", String(values.pointerStatic));
  } catch {
    // Brak DOM lub nietypowy host nie może zablokować działania ustawień.
  }
}

export function createSettings() {
  const storage = storageOrNull();
  let values = normalizeValues(readStored(storage));
  const listeners = new Set();
  applyToDocument(values);

  return {
    get values() { return values; },

    set(key, value) {
      if (!Object.hasOwn(DEFAULTS, key)) return false;
      const normalized = normalizeValue(key, value, values[key]);
      if (Object.is(normalized, values[key])) return false;

      values = Object.freeze({ ...values, [key]: normalized });
      persist(storage, values);
      applyToDocument(values);
      for (const listener of [...listeners]) {
        try { listener(values); }
        catch { /* Jeden odbiorca nie blokuje pozostałych. */ }
      }
      return true;
    },

    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("Subskrybent ustawień musi być funkcją");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// Pamięć poznanych paragrafów żyje poza ustawieniami (src/ui/progress.js),
// ale kasuje się z ich panelu. Zależności wchodzą argumentem, więc moduł
// nadal nie dotyka DOM-u ani localStorage gry.
export function connectProgressReset({ button, confirm, message, reset }) {
  if (typeof button?.addEventListener !== "function") return () => false;

  const handler = () => {
    // Kasowania nie da się cofnąć, więc pytamy raz — jak przy „Nowej grze”.
    if (!confirm(message())) return false;
    reset();
    return true;
  };

  button.addEventListener("click", handler);
  return handler;
}
