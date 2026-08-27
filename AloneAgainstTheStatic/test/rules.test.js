import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sequenceRng } from "../src/engine/dice.js";
import { createState, penaltyFor } from "../src/engine/state.js";
import {
  applyDamage,
  applySanLoss,
  resolveBout,
  sanityCheck,
  resetDay,
  SYSTEM_ENTRIES,
  rollSanity,
  applySanityCheck,
  rollBout,
  applyBout,
} from "../src/engine/rules.js";

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

test("po major wound każde kolejne obrażenie ponawia test z paragrafu 325", () => {
  const wounded = applyDamage(fresh(), 7).state;
  const out = applyDamage(wounded, 1);
  assert.equal(out.state.hp, 5);
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

test("nowy dzień zeruje licznik Sanity utraconej w ciągu doby", () => {
  let state = applySanLoss(fresh(), 4, characters.charlie, sequenceRng([])).state;
  assert.equal(state.sanLostToday, 4);
  state = resetDay(state);
  assert.equal(state.sanLostToday, 0);
  assert.equal(state.san, 56, "reset dnia nie odzyskuje utraconej Sanity");
});

test("po resecie dnia próg indefinite insanity liczy się od nowa", () => {
  // Charlie ma SAN 60, jedna piąta to 12.
  let state = fresh();
  for (const loss of [5, 5]) state = applySanLoss(state, loss, characters.charlie, sequenceRng([])).state;
  state = resetDay(state);
  const out = applySanLoss(state, 5, characters.charlie, sequenceRng([]));
  assert.equal(out.redirect, null, "10 punktów sprzed resetu nie liczy się do progu");
});

test("rzut Sanity i jego skutek dają to samo co jedno wywołanie", () => {
  const state = fresh();
  const split = (() => {
    const rng = sequenceRng([0.0, 0.1, 0.3]);
    const check = rollSanity(state, rng);
    return { check, ...applySanityCheck(state, check, "1/1d4", characters.charlie, rng) };
  })();
  const joined = (() => {
    const out = sanityCheck(state, characters.charlie, sequenceRng([0.0, 0.1, 0.3]), "1/1d4");
    return { check: out.roll, state: out.state, redirect: out.redirect, lost: out.lost };
  })();
  assert.deepEqual(split.check, joined.check);
  assert.equal(split.lost, joined.lost);
  assert.equal(split.state.san, joined.state.san);
  assert.equal(split.redirect, joined.redirect);
});

test("skutek testu Sanity idzie za werdyktem podanym z zewnątrz, nie za kośćmi", () => {
  const state = fresh();
  const rng = sequenceRng([0.0, 0.9]); // rzut 90 — porażka przy Sanity 60
  const check = rollSanity(state, rng);
  assert.equal(check.success, false);
  // Odwrócony werdykt (cheat) musi zabrać stratę z gałęzi sukcesu.
  const flipped = applySanityCheck(state, { ...check, success: true }, "1/1d4", characters.charlie, sequenceRng([0.5]));
  assert.equal(flipped.lost, 1);
});

test("rzut INT ataku obłędu i jego skutek dają to samo co resolveBout", () => {
  const state = fresh();
  const rng = sequenceRng([0.0, 0.1, 0.9]);
  const check = rollBout(state, characters.charlie, rng);
  const split = { check, ...applyBout(state, check, rng) };
  const joined = resolveBout(state, characters.charlie, sequenceRng([0.0, 0.1, 0.9]));
  assert.deepEqual(split.check, joined.check);
  assert.equal(split.redirect, joined.redirect);
  assert.deepEqual(split.state.penalties, joined.state.penalties);
});

test("nieudany rzut INT nie nakłada kary i nie przekierowuje", () => {
  const state = fresh();
  const out = applyBout(state, { success: false }, sequenceRng([0.5]));
  assert.equal(out.redirect, null);
  assert.equal(out.state, state);
});
