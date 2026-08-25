import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONFIG_301_371, proseOf301To371, sceneFor301To371 } from "../tools/build-story-301-371.mjs";

const raw = JSON.parse(readFileSync(new URL("../tools/raw-entries.json", import.meta.url), "utf8"));

test("konfiguracja 301–371 jest kompletna, ma sceny i daje wyjście z każdego wpisu", () => {
  const ids = Object.keys(CONFIG_301_371).map(Number).sort((a, b) => a - b);
  assert.deepEqual(ids, Array.from({ length: 71 }, (_, index) => index + 301));

  for (const id of ids) {
    const config = CONFIG_301_371[id];
    assert.ok(sceneFor301To371(id), `brak sceny ${id}`);
    assert.ok(config.end || config.on?.length || config.choices?.length || config.guards?.length, `brak wyjścia ${id}`);
    assert.ok(proseOf301To371(id, raw[id].paragraphs).length > 0, `brak prozy ${id}`);
  }
});

test("mechanika zachowuje warunki, rzuty, obrażenia i wpisy systemowe", () => {
  assert.deepEqual(CONFIG_301_371[303].on, [{ if: "running_on_empty", goto: 304 }, { goto: 307 }]);
  assert.deepEqual(CONFIG_301_371[312].on, [
    { hp: "1d4" },
    { if: "familiar_face", goto: 266 },
    { if: "wrong_turn", goto: 266 },
    { goto: 275 },
  ]);
  assert.deepEqual(CONFIG_301_371[315].on, [{ sanCheck: "0/1d6" }]);
  assert.deepEqual(CONFIG_301_371[325].on, [{
    roll: "CON",
    onSuccess: [{ goto: "@return" }],
    onFail: { goto: 324 },
  }]);
  assert.deepEqual(CONFIG_301_371[329].on, [{ bout: true }]);
  assert.equal(CONFIG_301_371[330].on[0].goto, "@return");
  assert.equal(CONFIG_301_371[345].on[0].difficulty, "hard");
  assert.equal(CONFIG_301_371[368].on[0].roll, "Mechanical Repair");
  assert.equal(CONFIG_301_371[368].on[0].difficulty, "hard");
  assert.deepEqual(CONFIG_301_371[364].on, [{ san: "1d4" }, { goto: 365 }]);
  assert.deepEqual(CONFIG_301_371[323].on.at(-2), { if: "broken_heart", goto: 366 });
  assert.deepEqual(CONFIG_301_371[308].on.at(-1), { goto: 323 });
  assert.deepEqual(CONFIG_301_371[335].on.at(-1), { goto: 285 });
  assert.deepEqual(CONFIG_301_371[341].on.at(-1), { goto: 280 });
});

test("wybory i proza nie mieszają instrukcji z tekstem fabularnym", () => {
  assert.deepEqual(CONFIG_301_371[302].choices.map(({ label }) => label), ["To investigate the sound", "To run like hell"]);
  assert.ok(CONFIG_301_371[336].choices.slice(0, 4).every((item) => item.once));
  assert.equal(CONFIG_301_371[370].choices[1].label, "To search for flashlights and batteries so you have light for when it gets dark");
  assert.match(proseOf301To371(327, raw[327].paragraphs)[2], /catch sight of yourself in the mirror/);
  assert.doesNotMatch(proseOf301To371(327, raw[327].paragraphs).at(-1), /^To feel confident/);
  assert.doesNotMatch(proseOf301To371(315, raw[315].paragraphs).at(-1), /^Make a Sanity roll/);
  assert.doesNotMatch(proseOf301To371(364, raw[364].paragraphs).at(-1), /^Make a note/);
  assert.equal(proseOf301To371(336, raw[336].paragraphs).length, 3);
  assert.doesNotMatch(proseOf301To371(336, raw[336].paragraphs).join("\n"), /select an option/);
  assert.equal(proseOf301To371(361, raw[361].paragraphs).length, 2);
  assert.doesNotMatch(proseOf301To371(361, raw[361].paragraphs).join("\n"), /Check\/tick/);
  assert.equal(proseOf301To371(325, raw[325].paragraphs).length, 1);
  assert.equal(sceneFor301To371(361), "shed");
  assert.equal(sceneFor301To371(354), "forest");
});
