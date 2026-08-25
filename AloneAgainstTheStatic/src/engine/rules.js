import { rollDice, skillCheck } from "./dice.js";
import { addPenalty, skillValue } from "./state.js";

export const SYSTEM_ENTRIES = {
  zeroHp: 324,
  majorWound: 325,
  indefinite: 328,
  bout: 329,
  zeroSan: 334,
};

// Trwałe kary nakładane przez paragrafy 330-333.
export const BOUT_PENALTIES = {
  330: ["Fighting (Brawl)"],
  331: ["Spot Hidden"],
  332: ["Persuade", "Intimidate"],
  333: ["Listen"],
};

const BOUT_ENTRIES = [330, 331, 332, 333];

export function applyDamage(state, amount) {
  const hp = Math.max(0, state.hp - amount);
  const major = amount >= state.maxHp / 2;
  const next = { ...state, hp, majorWound: state.majorWound || major };
  // Zero HP ma pierwszeństwo przed major wound.
  if (hp === 0) return { state: next, redirect: SYSTEM_ENTRIES.zeroHp };
  // Po pierwszej poważnej ranie każde następne obrażenie wymaga ponownego
  // testu CON z paragrafu 325, zgodnie z instrukcją scenariusza.
  if (major || (state.majorWound && amount > 0)) {
    return { state: next, redirect: SYSTEM_ENTRIES.majorWound };
  }
  return { state: next, redirect: null };
}

export function applySanLoss(state, amount, character, rng) {
  const san = Math.max(0, state.san - amount);
  const sanLostToday = state.sanLostToday + Math.min(amount, state.san);
  const next = { ...state, san, sanLostToday };

  // Zero Sanity unieważnia indefinite insanity i bout of madness.
  if (san === 0) return { state: next, redirect: SYSTEM_ENTRIES.zeroSan };

  if (sanLostToday > Math.floor(state.startingSan / 5) && !state.indefinitelyInsane) {
    return { state: { ...next, indefinitelyInsane: true }, redirect: SYSTEM_ENTRIES.indefinite };
  }
  if (amount > 5) return { state: next, redirect: SYSTEM_ENTRIES.bout };
  if (state.indefinitelyInsane) return { state: next, redirect: SYSTEM_ENTRIES.bout };
  return { state: next, redirect: null };
}

// Nowy dzień w scenariuszu zeruje licznik Sanity utraconej w ciągu doby.
// Próg indefinite insanity (328) liczy się w obrębie jednego dnia.
export function resetDay(state) {
  return { ...state, sanLostToday: 0 };
}

// Paragraf 329. Nieudany rzut INT oznacza, że umysł zamyka się na grozę.
export function resolveBout(state, character, rng) {
  const check = skillCheck(rng, skillValue(state, character, "INT"));
  if (!check.success) return { state, redirect: null, check };

  const remaining = BOUT_ENTRIES.filter((id) => !state.visitedBouts.includes(id));
  if (remaining.length === 0) return { state, redirect: SYSTEM_ENTRIES.zeroSan, check };

  const rolled = BOUT_ENTRIES[rollDice(rng, "1d4") - 1];
  const target = remaining.includes(rolled) ? rolled : remaining[0];
  const next = addPenalty(
    { ...state, visitedBouts: [...state.visitedBouts, target] },
    BOUT_PENALTIES[target],
  );
  return { state: next, redirect: target, check };
}

// Notacja "X/Y": X przy udanym rzucie przeciw Sanity, Y przy nieudanym.
export function sanityCheck(state, character, rng, notation) {
  const [onSuccess, onFail] = String(notation).split("/");
  const check = skillCheck(rng, state.san);
  const lost = rollDice(rng, check.success ? onSuccess : onFail);
  const outcome = applySanLoss(state, lost, character, rng);
  return { state: outcome.state, redirect: outcome.redirect, roll: check, lost };
}
