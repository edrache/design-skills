// Ile rozpadu dokłada jedno odwrócenie werdyktu i ile ich łącznie liczymy.
// Sufit jest po to, żeby oszukiwanie brudziło obraz, ale nigdy samo z siebie
// nie zasłoniło tekstu — do maksimum wciąż trzeba stracić Poczytalność.
const CHEAT_STEP = 0.06;
const CHEAT_CEILING = 0.5;

export function cheatDread(state) {
  const cheats = Number(state?.cheats);
  if (!Number.isFinite(cheats) || cheats <= 0) return 0;
  return Math.min(CHEAT_CEILING, cheats * CHEAT_STEP);
}

// Poziom rozpadu obrazu rośnie wraz ze spadkiem Poczytalności: na starcie
// gry (pełna Poczytalność) rozpad jest zerowy, przy zerowej Poczytalności
// sięga maksimum. Każde odwrócenie werdyktu rzutu dokłada swoje — taśma
// pamięta oszustwo, nawet jeśli postać nic nie straciła. Czysta funkcja —
// bez DOM, bez document, do użycia zarówno w UI, jak i w testach pod Node.
export function dreadLevel(state) {
  const start = Number(state?.startingSan);
  const current = Number(state?.san);
  const cheats = cheatDread(state);
  if (!Number.isFinite(start) || !Number.isFinite(current) || start <= 0) {
    return Math.max(0, Math.min(1, cheats));
  }
  const dread = 1 - current / start;
  return Math.max(0, Math.min(1, dread + cheats));
}
