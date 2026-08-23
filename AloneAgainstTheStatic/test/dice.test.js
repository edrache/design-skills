import test from "node:test";
import assert from "node:assert/strict";
import { successLevel, meetsDifficulty } from "../src/engine/dice.js";

test("poziomy sukcesu przy umiejętności 60", () => {
  assert.equal(successLevel(1, 60), "critical");
  assert.equal(successLevel(12, 60), "extreme");   // 1/5 z 60
  assert.equal(successLevel(13, 60), "hard");
  assert.equal(successLevel(30, 60), "hard");      // 1/2 z 60
  assert.equal(successLevel(31, 60), "regular");
  assert.equal(successLevel(60, 60), "regular");
  assert.equal(successLevel(61, 60), "fail");
  assert.equal(successLevel(100, 60), "fumble");
});

test("fumble od 96 przy umiejętności poniżej 50", () => {
  assert.equal(successLevel(96, 45), "fumble");
  assert.equal(successLevel(96, 50), "fail");
  assert.equal(successLevel(95, 45), "fail");
});

test("wymagany poziom trudności", () => {
  assert.equal(meetsDifficulty("regular", "regular"), true);
  assert.equal(meetsDifficulty("regular", "hard"), false);
  assert.equal(meetsDifficulty("hard", "hard"), true);
  assert.equal(meetsDifficulty("critical", "extreme"), true);
  assert.equal(meetsDifficulty("fail", "regular"), false);
  assert.equal(meetsDifficulty("fumble", "regular"), false);
});

import { rollD100, skillCheck, sequenceRng, rollDice } from "../src/engine/dice.js";

test("sequenceRng oddaje wartości po kolei", () => {
  const rng = sequenceRng([0.0, 0.55, 0.9]);
  assert.equal(rng(), 0.0);
  assert.equal(rng(), 0.55);
  assert.equal(rng(), 0.9);
});

test("zwykły rzut: dziesiątki i jednostki", () => {
  // 0.68 -> jednostka 6; 0.20 -> dziesiątki 20
  const rng = sequenceRng([0.68, 0.2]);
  const roll = rollD100(rng, {});
  assert.equal(roll.units, 6);
  assert.deepEqual(roll.tens, [20]);
  assert.equal(roll.result, 26);
});

test("dziesiątki 0 i jednostka 0 dają 100", () => {
  const roll = rollD100(sequenceRng([0.0, 0.0]), {});
  assert.equal(roll.result, 100);
});

test("dziesiątki 0 i jednostka 5 dają 5", () => {
  const roll = rollD100(sequenceRng([0.5, 0.0]), {});
  assert.equal(roll.result, 5);
});

test("kość bonusowa bierze niższy wynik", () => {
  // jednostka 4, dziesiątki 40 i 20 -> kandydaci 44 i 24
  const roll = rollD100(sequenceRng([0.4, 0.4, 0.2]), { dice: 1 });
  assert.deepEqual(roll.candidates, [44, 24]);
  assert.equal(roll.result, 24);
});

test("kość karna bierze wyższy wynik", () => {
  const roll = rollD100(sequenceRng([0.1, 0.2, 0.4]), { dice: -1 });
  assert.deepEqual(roll.candidates, [21, 41]);
  assert.equal(roll.result, 41);
});

test("skillCheck łączy rzut z progiem trudności", () => {
  const check = skillCheck(sequenceRng([0.8, 0.2]), 60, { difficulty: "hard" });
  assert.equal(check.result, 28);
  assert.equal(check.level, "hard");
  assert.equal(check.success, true);

  const miss = skillCheck(sequenceRng([0.5, 0.4]), 60, { difficulty: "hard" });
  assert.equal(miss.result, 45);
  assert.equal(miss.level, "regular");
  assert.equal(miss.success, false);
});

test("rollDice liczy notację kostkową", () => {
  assert.equal(rollDice(sequenceRng([0.5]), "1d6"), 4);
  assert.equal(rollDice(sequenceRng([0.0, 0.99]), "2d4"), 5);
  assert.equal(rollDice(sequenceRng([]), "3"), 3);
  assert.equal(rollDice(sequenceRng([0.5]), "1d6+2"), 6);
});
