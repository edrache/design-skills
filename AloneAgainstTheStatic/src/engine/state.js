import { rollDice } from "./dice.js";

// Umiejętności niewypisane na skróconych kartach postaci zachowują bazową
// wartość z Call of Cthulhu 7e. Dopisujemy je tu w miarę użycia w scenariuszu.
const BASE_SKILLS = {
  "Mechanical Repair": 10,
  Occult: 5,
};

// Stan gry jest zwykłym obiektem — wszystkie operacje zwracają nowy,
// dzięki czemu testy porównują stany zamiast śledzić efekty uboczne.
export function createState(character, { rng }) {
  return {
    characterId: character.id,
    hp: character.hp,
    maxHp: character.hp,
    san: character.san,
    startingSan: character.san,
    mp: character.mp,
    luck: rollDice(rng, "3d6") * 5,
    flags: [],
    visits: {},
    usedChoices: {},
    penalties: {},
    // Doraźna kość przyznana przez fabułę (np. paragraf 238) jest
    // zużywana przez najbliższy rzut, niezależnie od użytej umiejętności.
    nextRollDice: 0,
    returnStack: [],
    sanLostToday: 0,
    majorWound: false,
    indefinitelyInsane: false,
    visitedBouts: [],
  };
}

export function skillValue(state, character, skill) {
  if (skill in character.skills) return character.skills[skill];
  if (skill in character.characteristics) return character.characteristics[skill];
  if (skill in BASE_SKILLS) return BASE_SKILLS[skill];
  if (skill === "Luck") return state.luck;
  if (skill === "Sanity") return state.san;
  throw new Error(`Postać ${character.id} nie ma umiejętności ani cechy: ${skill}`);
}

export function penaltyFor(state, skill) {
  const penalty = state.penalties[skill] ?? 0;
  return penalty === 0 ? 0 : -penalty;
}

export function hasFlag(state, flag) {
  return state.flags.includes(flag);
}

export function setFlag(state, flag) {
  if (hasFlag(state, flag)) return state;
  return { ...state, flags: [...state.flags, flag] };
}

export function visit(state, id) {
  return { ...state, visits: { ...state.visits, [id]: visitCount(state, id) + 1 } };
}

export function visitCount(state, id) {
  return state.visits[id] ?? 0;
}

export function useChoice(state, id, index) {
  const used = state.usedChoices[id] ?? [];
  if (used.includes(index)) return state;
  return { ...state, usedChoices: { ...state.usedChoices, [id]: [...used, index] } };
}

export function isChoiceUsed(state, id, index) {
  return (state.usedChoices[id] ?? []).includes(index);
}

export function spendLuck(state, amount) {
  if (amount > state.luck) throw new Error(`Za mało punktów Luck: ${state.luck} < ${amount}`);
  return { ...state, luck: state.luck - amount };
}

export function restoreLuck(state, amount) {
  return { ...state, luck: Math.min(100, state.luck + Math.max(0, amount)) };
}

export function restoreHp(state, amount) {
  return { ...state, hp: Math.min(state.maxHp, state.hp + Math.max(0, amount)) };
}

export function addPenalty(state, skills) {
  const penalties = { ...state.penalties };
  for (const skill of skills) penalties[skill] = (penalties[skill] ?? 0) + 1;
  return { ...state, penalties };
}

export function addNextRollDice(state, dice) {
  return { ...state, nextRollDice: (state.nextRollDice ?? 0) + dice };
}

export function takeNextRollDice(state) {
  const dice = state.nextRollDice ?? 0;
  if (dice === 0) return { state, dice: 0 };
  return { state: { ...state, nextRollDice: 0 }, dice };
}

// Stos powrotu przechowuje nie tylko paragraf, ale i pozycję w nim (cursor),
// żeby powrót mógł wznowić wykonanie za krokiem, który spowodował skok,
// zamiast wykonywać paragraf od nowa.
export function pushReturn(state, entryId, cursor = 0) {
  return { ...state, returnStack: [...state.returnStack, { entryId, cursor }] };
}

export function popReturn(state) {
  if (state.returnStack.length === 0) return { state, entryId: null, cursor: 0 };
  const stack = [...state.returnStack];
  const top = stack.pop();
  return { state: { ...state, returnStack: stack }, entryId: top.entryId, cursor: top.cursor };
}

export function serialize(state) {
  return { ...state };
}

export function deserialize(raw) {
  // Starsze zapisy nie mają nextRollDice; odczyty traktują jego brak jak 0.
  return { ...raw };
}
