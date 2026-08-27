import test from "node:test";
import assert from "node:assert/strict";
import { requiredThreshold, decisionFor } from "../src/engine/decision.js";

const stateWith = (luck) => ({ luck });
const check = (over) => ({ target: 60, difficulty: "regular", result: 90, success: false, ...over });

test("próg trudności obniża się przy hard i extreme", () => {
  assert.equal(requiredThreshold(60), 60);
  assert.equal(requiredThreshold(60, "hard"), 30);
  assert.equal(requiredThreshold(61, "extreme"), 12);
});

test("udany rzut nie oferuje forsowania ani Szczęścia, ale zawsze cheat", () => {
  const out = decisionFor(stateWith(99), check({ result: 20, success: true }), {
    kind: "skill", skill: "Spot Hidden", pushable: true,
  });
  assert.deepEqual(out, { canPush: false, canLuck: false, luckCost: 0, canCheat: true });
});

test("nieudany rzut na umiejętność wycenia dopłatę Szczęściem", () => {
  const out = decisionFor(stateWith(40), check(), { kind: "skill", skill: "Spot Hidden" });
  assert.equal(out.canLuck, true);
  assert.equal(out.luckCost, 30);
  assert.equal(out.canPush, false);
});

test("dopłata Szczęściem liczy się od progu trudności, nie od pełnej umiejętności", () => {
  const out = decisionFor(stateWith(99), check({ difficulty: "hard", result: 50 }), {
    kind: "skill", skill: "Spot Hidden",
  });
  assert.equal(out.luckCost, 20); // 50 - floor(60/2)
});

test("za mało Szczęścia zamyka dopłatę, ale koszt zostaje policzony", () => {
  const out = decisionFor(stateWith(10), check(), { kind: "skill", skill: "Spot Hidden" });
  assert.equal(out.canLuck, false);
  assert.equal(out.luckCost, 30);
});

test("rzutów na Sanity i Luck nie ratuje się Szczęściem", () => {
  for (const skill of ["Sanity", "Luck"]) {
    const out = decisionFor(stateWith(99), check(), { kind: "skill", skill });
    assert.equal(out.canLuck, false, skill);
  }
});

test("rzuty wewnętrzne nie mają forsowania ani Szczęścia, tylko przyjęcie i cheat", () => {
  const san = decisionFor(stateWith(99), check(), { kind: "sanCheck", skill: "Sanity" });
  const bout = decisionFor(stateWith(99), check(), { kind: "bout", skill: "INT" });
  assert.deepEqual(san, { canPush: false, canLuck: false, luckCost: 30, canCheat: true });
  assert.deepEqual(bout, { canPush: false, canLuck: false, luckCost: 30, canCheat: true });
});

test("forsowanie tylko raz i tylko gdy krok je oferuje", () => {
  const first = decisionFor(stateWith(0), check(), { kind: "skill", skill: "Listen", pushable: true });
  const again = decisionFor(stateWith(0), check(), { kind: "skill", skill: "Listen", pushable: true, pushed: true });
  const never = decisionFor(stateWith(0), check(), { kind: "skill", skill: "Listen" });
  assert.equal(first.canPush, true);
  assert.equal(again.canPush, false);
  assert.equal(never.canPush, false);
});
