import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sequenceRng } from "../src/engine/dice.js";
import {
  createState, skillValue, penaltyFor, hasFlag, setFlag, visit, visitCount,
  useChoice, isChoiceUsed, spendLuck, addPenalty, pushReturn, popReturn,
  serialize, deserialize,
} from "../src/engine/state.js";

const characters = JSON.parse(readFileSync(new URL("../data/characters.json", import.meta.url)));

test("nowy stan bierze wartości z karty postaci i losuje Luck", () => {
  // 3D6 = 4+4+4 = 12, razy 5 = 60
  const state = createState(characters.charlie, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  assert.equal(state.characterId, "charlie");
  assert.equal(state.hp, 13);
  assert.equal(state.maxHp, 13);
  assert.equal(state.san, 60);
  assert.equal(state.startingSan, 60);
  assert.equal(state.luck, 60);
  assert.equal(state.mp, 12);
});

test("wartość umiejętności bierze się z karty, cechy z charakterystyk", () => {
  const state = createState(characters.alex, { rng: sequenceRng([]) });
  assert.equal(skillValue(state, characters.alex, "Psychology"), 45);
  assert.equal(skillValue(state, characters.alex, "CON"), 60);
});

test("nieznana umiejętność zgłasza błąd zamiast po cichu zwracać zero", () => {
  const state = createState(characters.alex, { rng: sequenceRng([]) });
  assert.throws(() => skillValue(state, characters.alex, "Locksmith"), /Locksmith/);
});

test("operacje nie mutują poprzedniego stanu", () => {
  const before = createState(characters.alex, { rng: sequenceRng([]) });
  const after = setFlag(before, "touched_by_cold");
  assert.equal(hasFlag(before, "touched_by_cold"), false);
  assert.equal(hasFlag(after, "touched_by_cold"), true);
});

test("licznik wizyt w paragrafie", () => {
  let state = createState(characters.alex, { rng: sequenceRng([]) });
  assert.equal(visitCount(state, 5), 0);
  state = visit(state, 5);
  state = visit(state, 5);
  assert.equal(visitCount(state, 5), 2);
});

test("zużyte wybory są pamiętane per paragraf", () => {
  let state = createState(characters.alex, { rng: sequenceRng([]) });
  state = useChoice(state, 336, 1);
  assert.equal(isChoiceUsed(state, 336, 1), true);
  assert.equal(isChoiceUsed(state, 336, 0), false);
  assert.equal(isChoiceUsed(state, 337, 1), false);
});

test("wydawanie Luck nie schodzi poniżej zera", () => {
  const state = createState(characters.alex, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  assert.equal(spendLuck(state, 10).luck, 50);
  assert.throws(() => spendLuck(state, 61), /Luck/);
});

test("kary z bouts of madness kumulują się", () => {
  let state = createState(characters.alex, { rng: sequenceRng([]) });
  assert.equal(penaltyFor(state, "Listen"), 0);
  state = addPenalty(state, ["Listen"]);
  assert.equal(penaltyFor(state, "Listen"), -1);
  state = addPenalty(state, ["Listen", "Spot Hidden"]);
  assert.equal(penaltyFor(state, "Listen"), -2);
  assert.equal(penaltyFor(state, "Spot Hidden"), -1);
});

test("stos powrotu działa jak stos", () => {
  let state = createState(characters.alex, { rng: sequenceRng([]) });
  state = pushReturn(state, 77);
  state = pushReturn(state, 120);
  let out = popReturn(state);
  assert.equal(out.entryId, 120);
  out = popReturn(out.state);
  assert.equal(out.entryId, 77);
  assert.equal(popReturn(out.state).entryId, null);
});

test("serializacja i odczyt zachowują stan", () => {
  let state = createState(characters.charlie, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  state = setFlag(state, "arrival");
  state = visit(state, 5);
  state = addPenalty(state, ["Listen"]);
  const restored = deserialize(JSON.parse(JSON.stringify(serialize(state))));
  assert.deepEqual(restored, state);
});
