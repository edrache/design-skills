// Poziomy sukcesu w Call of Cthulhu 7e, od najgorszego do najlepszego.
const RANK = { fumble: 0, fail: 1, regular: 2, hard: 3, extreme: 4, critical: 5 };
const REQUIRED = { regular: 2, hard: 3, extreme: 4 };

export function successLevel(result, target) {
  if (result === 1) return "critical";
  if (result === 100 || (target < 50 && result >= 96)) return "fumble";
  if (result <= Math.floor(target / 5)) return "extreme";
  if (result <= Math.floor(target / 2)) return "hard";
  if (result <= target) return "regular";
  return "fail";
}

export function meetsDifficulty(level, difficulty = "regular") {
  return RANK[level] >= REQUIRED[difficulty];
}

// Generator do testów: oddaje z góry ustaloną sekwencję, potem same zera.
export function sequenceRng(values) {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0);
}

function d10(rng) {
  return Math.floor(rng() * 10);
}

// Rzut procentowy. Kość jednostek losowana raz, kości dziesiątek tyle,
// ile wynika z liczby kości bonusowych (dice > 0) lub karnych (dice < 0).
export function rollD100(rng, { dice = 0 } = {}) {
  const units = d10(rng);
  const extra = Math.abs(dice);
  const tens = Array.from({ length: 1 + extra }, () => d10(rng) * 10);
  const candidates = tens.map((t) => (t === 0 && units === 0 ? 100 : t + units));
  let result = candidates[0];
  if (dice > 0) result = Math.min(...candidates);
  if (dice < 0) result = Math.max(...candidates);
  return { units, tens, candidates, result };
}

export function skillCheck(rng, target, { dice = 0, difficulty = "regular" } = {}) {
  const roll = rollD100(rng, { dice });
  const level = successLevel(roll.result, target);
  return { ...roll, target, difficulty, level, success: meetsDifficulty(level, difficulty) };
}

// Notacja typu "1d6", "2d4", "1d6+2" albo stała "3".
export function rollDice(rng, notation) {
  const match = /^(\d+)?(?:d(\d+))?(?:\+(\d+))?$/.exec(String(notation).trim().toLowerCase());
  if (!match) throw new Error(`Nieznana notacja kostkowa: ${notation}`);
  const [, countRaw, sidesRaw, bonusRaw] = match;
  const bonus = Number(bonusRaw ?? 0);
  if (!sidesRaw) return Number(countRaw ?? 0) + bonus;
  const count = Number(countRaw ?? 1);
  const sides = Number(sidesRaw);
  let total = 0;
  for (let i = 0; i < count; i += 1) total += Math.floor(rng() * sides) + 1;
  return total + bonus;
}
