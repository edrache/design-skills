import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sequenceRng } from "../src/engine/dice.js";
import { createState, penaltyFor } from "../src/engine/state.js";
import { applyDamage, applySanLoss, resolveBout, sanityCheck, SYSTEM_ENTRIES } from "../src/engine/rules.js";

const characters = JSON.parse(readFileSync(new URL("../data/characters.json", import.meta.url)));
const fresh = () => createState(characters.charlie, { rng: sequenceRng([0.5, 0.5, 0.5]) }); // Luck 60

test("drobne obrażenia nie uruchamiają niczego", () => {
  const out = applyDamage(fresh(), 3);
  assert.equal(out.state.hp, 10);
  assert.equal(out.redirect, null);
});

test("obrażenia równe połowie maksymalnych HP to major wound", () => {
  const out = applyDamage(fresh(), 7); // maxHp 13, połowa to 6.5
  assert.equal(out.state.hp, 6);
  assert.equal(out.state.majorWound, true);
  assert.equal(out.redirect, SYSTEM_ENTRIES.majorWound);
});

test("zero HP ma pierwszeństwo przed major wound", () => {
  const out = applyDamage(fresh(), 13);
  assert.equal(out.state.hp, 0);
  assert.equal(out.redirect, SYSTEM_ENTRIES.zeroHp);
});

test("HP nie schodzi poniżej zera", () => {
  assert.equal(applyDamage(fresh(), 40).state.hp, 0);
});

test("mała strata Sanity nie uruchamia niczego", () => {
  const out = applySanLoss(fresh(), 2, characters.charlie, sequenceRng([]));
  assert.equal(out.state.san, 58);
  assert.equal(out.redirect, null);
});

test("strata powyżej 5 punktów naraz uruchamia bout of madness", () => {
  const out = applySanLoss(fresh(), 6, characters.charlie, sequenceRng([]));
  assert.equal(out.redirect, SYSTEM_ENTRIES.bout);
});

test("strata powyżej jednej piątej SAN w ciągu dnia to indefinite insanity", () => {
  // Charlie ma SAN 60, jedna piąta to 12. Dwie straty po 5 to 10, trzecia po 5 daje 15.
  let state = fresh();
  for (const loss of [5, 5]) state = applySanLoss(state, loss, characters.charlie, sequenceRng([])).state;
  const out = applySanLoss(state, 5, characters.charlie, sequenceRng([]));
  assert.equal(out.redirect, SYSTEM_ENTRIES.indefinite);
  assert.equal(out.state.indefinitelyInsane, true);
});

test("zero Sanity ma pierwszeństwo przed wszystkim", () => {
  const out = applySanLoss(fresh(), 60, characters.charlie, sequenceRng([]));
  assert.equal(out.state.san, 0);
  assert.equal(out.redirect, SYSTEM_ENTRIES.zeroSan);
});

test("bout of madness: nieudany rzut INT wraca bez skutków", () => {
  // Charlie ma INT 65; rzut 90 to porażka
  const out = resolveBout(fresh(), characters.charlie, sequenceRng([0.0, 0.9]));
  assert.equal(out.redirect, null);
});

test("bout of madness: udany rzut INT losuje jeden z paragrafów 330-333", () => {
  // rzut INT 20 (sukces), potem 1D4 = 3 -> paragraf 332
  const out = resolveBout(fresh(), characters.charlie, sequenceRng([0.0, 0.2, 0.5]));
  assert.equal(out.redirect, 332);
  assert.deepEqual(out.state.visitedBouts, [332]);
});

test("bout of madness pomija już odwiedzony wynik", () => {
  let state = fresh();
  state = { ...state, visitedBouts: [332] };
  const out = resolveBout(state, characters.charlie, sequenceRng([0.0, 0.2, 0.5]));
  assert.notEqual(out.redirect, 332);
  assert.ok([330, 331, 333].includes(out.redirect));
});

test("wyczerpanie wszystkich czterech bouts prowadzi do 334", () => {
  let state = fresh();
  state = { ...state, visitedBouts: [330, 331, 332, 333] };
  const out = resolveBout(state, characters.charlie, sequenceRng([0.0, 0.2, 0.5]));
  assert.equal(out.redirect, SYSTEM_ENTRIES.zeroSan);
});

test("paragraf 333 nakłada trwałą karę na Listen", () => {
  const out = resolveBout(fresh(), characters.charlie, sequenceRng([0.0, 0.2, 0.99]));
  assert.equal(out.redirect, 333);
  assert.equal(penaltyFor(out.state, "Listen"), -1);
});

test("rzut Sanity 1/1D6: sukces zabiera jeden punkt", () => {
  // SAN 60, rzut 20 -> sukces, strata 1
  const out = sanityCheck(fresh(), characters.charlie, sequenceRng([0.0, 0.2]), "1/1d6");
  assert.equal(out.lost, 1);
  assert.equal(out.state.san, 59);
});

test("rzut Sanity 1/1D6: porażka losuje z 1D6", () => {
  // rzut 90 -> porażka; 1D6 przy 0.5 to 4
  const out = sanityCheck(fresh(), characters.charlie, sequenceRng([0.0, 0.9, 0.5]), "1/1d6");
  assert.equal(out.lost, 4);
  assert.equal(out.state.san, 56);
});
