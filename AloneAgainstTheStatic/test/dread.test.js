import test from "node:test";
import assert from "node:assert/strict";
import { dreadLevel } from "../src/ui/dread.js";

test("pełna Poczytalność daje poziom rozpadu 0", () => {
  assert.equal(dreadLevel({ san: 10, startingSan: 10 }), 0);
});

test("połowa Poczytalności daje poziom rozpadu 0.5", () => {
  assert.equal(dreadLevel({ san: 5, startingSan: 10 }), 0.5);
});

test("zerowa Poczytalność daje poziom rozpadu 1", () => {
  assert.equal(dreadLevel({ san: 0, startingSan: 10 }), 1);
});

test("startingSan równe zeru daje poziom rozpadu 0", () => {
  assert.equal(dreadLevel({ san: 0, startingSan: 0 }), 0);
});

test("brak startingSan daje poziom rozpadu 0", () => {
  assert.equal(dreadLevel({ san: 5 }), 0);
});

test("nieliczbowe san lub startingSan daje poziom rozpadu 0", () => {
  assert.equal(dreadLevel({ san: "pięć", startingSan: 10 }), 0);
  assert.equal(dreadLevel({ san: 5, startingSan: "dziesięć" }), 0);
});

test("state równy null lub undefined daje poziom rozpadu 0", () => {
  assert.equal(dreadLevel(null), 0);
  assert.equal(dreadLevel(undefined), 0);
});

test("san większe niż startingSan nie daje wartości ujemnej", () => {
  assert.equal(dreadLevel({ san: 20, startingSan: 10 }), 0);
});
