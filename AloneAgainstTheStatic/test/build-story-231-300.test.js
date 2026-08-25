import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CONFIG_231_300,
  proseOf231To300,
  sceneFor231To300,
} from "../tools/build-story-231-300.mjs";

const raw = JSON.parse(readFileSync(new URL("../tools/raw-entries.json", import.meta.url), "utf8"));

function targetsOf(value) {
  if (!value || typeof value !== "object") return [];
  const out = [];
  if (typeof value.goto === "number") out.push(value.goto);
  for (const branch of ["onSuccess", "onFail", "onPushedFail"]) {
    const child = value[branch];
    if (Array.isArray(child)) child.forEach((part) => out.push(...targetsOf(part)));
    else out.push(...targetsOf(child));
  }
  return out;
}

test("konfiguracja 231-300 zawiera komplet paragrafów i wyjście z każdego", () => {
  assert.deepEqual(Object.keys(CONFIG_231_300).map(Number), Array.from({ length: 70 }, (_, i) => i + 231));

  for (let id = 231; id <= 300; id += 1) {
    const config = CONFIG_231_300[id];
    const targets = [
      ...(config.guards ?? []).flatMap(targetsOf),
      ...(config.on ?? []).flatMap(targetsOf),
      ...(config.choices ?? []).flatMap(targetsOf),
    ];
    assert.ok(config.end || targets.length > 0, `§${id} musi mieć zakończenie albo wyjście`);
    assert.ok(sceneFor231To300(id), `§${id} musi mieć scenę`);
    assert.ok(proseOf231To300(id, raw[id].paragraphs).length > 0, `§${id} musi zachować prozę`);
  }
});

test("mechanika zachowuje rzuty forsowane, kości i kolejność warunków", () => {
  assert.deepEqual(CONFIG_231_300[231].on, [{ hp: "1" }, {
    roll: "Luck", onSuccess: { goto: 326 }, onFail: { goto: 232 },
  }]);
  assert.deepEqual(CONFIG_231_300[233].on[0], {
    roll: "DEX", dice: -1, push: true,
    onSuccess: { goto: 227 }, onFail: { goto: 230 }, onPushedFail: { goto: 231 },
  });
  assert.deepEqual(CONFIG_231_300[238].on, [{ nextRollDice: 1 }]);
  assert.deepEqual(CONFIG_231_300[239].guards, [{ if: "lockdown", goto: 240 }]);
  assert.equal(CONFIG_231_300[241].choices[0].if, "in_case_of_emergency");
  assert.equal(CONFIG_231_300[241].choices[2].goto, 269);
  assert.deepEqual(CONFIG_231_300[248].on, [{ sanCheck: "0/1d6" }]);
  assert.deepEqual(CONFIG_231_300[248].choices.map((item) => item.goto), [353, 357]);
  assert.deepEqual(CONFIG_231_300[260].on[0].diceIf, [{ if: "red_handed", dice: -1 }]);
  assert.equal(CONFIG_231_300[264].on[0].dice, 1);
  assert.deepEqual(CONFIG_231_300[264].on[0].diceIf, [{ if: "red_handed", dice: -1 }]);
  assert.deepEqual(CONFIG_231_300[261].on.map((step) => step.goto), [267, 268, 271, 273, 270]);
  assert.deepEqual(CONFIG_231_300[271].on, [
    { flag: "arrival" },
    { sanCheck: "0/1d6" },
    { goto: 298 },
  ]);
  assert.deepEqual(CONFIG_231_300[273].on, [{ sanCheck: "0/1d4" }, { goto: 298 }]);
  assert.equal(CONFIG_231_300[277].on[0].difficulty, "hard");
  assert.ok(CONFIG_231_300[278].end);
  assert.ok(CONFIG_231_300[284].end);
  assert.ok(CONFIG_231_300[285].choices.slice(0, 4).every((item) => item.once));
  assert.deepEqual(CONFIG_231_300[299].on, [{ if: "well_rested", goto: 300 }, { goto: 301 }]);
});

test("proza usuwa instrukcje, ale zachowuje trudne akapity OCR", () => {
  const prose233 = proseOf231To300(233, raw[233].paragraphs);
  assert.deepEqual(prose233, raw[233].paragraphs.slice(0, 2));
  assert.doesNotMatch(prose233.join("\n"), /Make a DEX roll|pushed roll/);

  const prose241 = proseOf231To300(241, raw[241].paragraphs);
  assert.deepEqual(prose241, [raw[241].paragraphs[0]]);
  assert.doesNotMatch(prose241.join("\n"), /In Case of Emergency|Razor Sharp|Close to Hand/);

  const prose285 = proseOf231To300(285, raw[285].paragraphs);
  assert.equal(prose285.length, 3);
  assert.match(prose285[2], /The voice in the static/);
  assert.doesNotMatch(prose285.join("\n"), /You may return to this entry|To ask what the Child is/);

  assert.deepEqual(proseOf231To300(279, raw[279].paragraphs), [raw[279].paragraphs[0]]);
  assert.equal(proseOf231To300(297, raw[297].paragraphs).length, 3);
  assert.equal(proseOf231To300(299, raw[299].paragraphs).length, 2);

  assert.equal(sceneFor231To300(233), "clearing");
  assert.equal(sceneFor231To300(241), "cabin");
  assert.equal(sceneFor231To300(298), "forest");
});
