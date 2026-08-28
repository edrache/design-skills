// Poziomy warstwy szaleństwa: czyste funkcje, bez DOM — wzorowane na
// src/ui/effects.js, testowalne pod Node. Paragrafy szaleństwa (MADNESS_ENTRIES)
// mają efekt zawsze pełny; pozostałe paragrafy dostają "dryf" rosnący z
// Poczytalnością dopiero powyżej progu — poniżej niego czytelnik ma spokój.
export const MADNESS_ENTRIES = Object.freeze([328, 329, 330, 331, 332, 333]);

export const DRIFT_FLOOR = 0.55; // poniżej tego --dread nie robi nic
export const DRIFT_MAX = 0.4; // maksimum dla zwykłego paragrafu
export const ENTRY_BASE = 1; // paragrafy szaleństwa

export const PULSE_SLOT_MS = 1600;
export const PULSE_LENGTH_MS = 700;

const clamp01 = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
};

// Zwraca poziom bazowy 0…1: pełny dla paragrafu szaleństwa, dryf liniowy nad
// progiem dla pozostałych. Łańcuch identyfikatora jest normalizowany przez
// Number, żeby dataset.entry (zawsze string w DOM) też trafiał w tabelę.
export function madnessBase({ entryId, dread } = {}) {
  const id = Number(entryId);
  if (MADNESS_ENTRIES.includes(id)) return ENTRY_BASE;
  const level = clamp01(dread);
  if (level <= DRIFT_FLOOR) return 0;
  return ((level - DRIFT_FLOOR) / (1 - DRIFT_FLOOR)) * DRIFT_MAX;
}

// Ten sam deterministyczny skrót slotu co w effects.js — determinizm pozwala
// przetestować rozkład pulsów bez podstawiania generatora losowego.
function slotNoise(slot) {
  const value = Math.sin(slot * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

// Zwraca { blend, warp } — krycie warstwy szaleństwa i siłę zniekształcenia
// kadru, obie 0…1. Podkład (base * 0.28 / base * 0.2) trzyma dyskomfort
// stały między pulsami — przy base = 1 obraz nigdy nie wraca do czystości.
// Zryw dokłada się na wierzchu podkładu, do wartości `base`, więc wynik
// rośnie monotonicznie z base i nigdy nie przekracza 1.
export function pulseAt(timeMs, base) {
  const level = clamp01(base);
  const blendFloor = level * 0.28;
  const warpFloor = level * 0.2;
  if (level === 0) return { blend: 0, warp: 0 };

  const time = Number(timeMs);
  if (!Number.isFinite(time) || time < 0) return { blend: blendFloor, warp: warpFloor };

  const slot = Math.floor(time / PULSE_SLOT_MS);
  if (slotNoise(slot) >= 0.15 + 0.5 * level) return { blend: blendFloor, warp: warpFloor };

  const into = time - slot * PULSE_SLOT_MS;
  if (into >= PULSE_LENGTH_MS) return { blend: blendFloor, warp: warpFloor };

  const envelope = Math.sin((Math.PI * into) / PULSE_LENGTH_MS);
  return {
    blend: Math.min(1, blendFloor + level * (1 - 0.28) * envelope),
    warp: Math.min(1, warpFloor + level * (1 - 0.2) * envelope),
  };
}
