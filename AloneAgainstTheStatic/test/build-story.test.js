import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildStory } from "../tools/build-story.mjs";

const load = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));
const raw = load("../tools/raw-entries.json");

test("generator buduje deterministyczny zakres 1-230 z dwoma startami", () => {
  const first = buildStory(raw);
  const second = buildStory(raw);
  assert.deepEqual(first, second);
  assert.deepEqual(first.story.extracted, [1, 230]);
  assert.equal(Object.keys(first.story.entries).length, 230);
  assert.equal(first.story.start, 1);
  assert.deepEqual(first.story.starts, { alex: 1, charlie: 2 });
});

test("jawna mechanika zachowuje trudne przypadki z obu partii ekstrakcji", () => {
  const { story } = buildStory(raw);
  assert.deepEqual(story.entries[5].on, [{ roll: "CON", onFail: [{ flag: "touched_by_cold" }] }]);
  assert.deepEqual(story.entries[9].guards, [{ if: ["temporal_steel", { not: "knife_to_a_gun_fight" }], goto: 363 }]);
  assert.deepEqual(story.entries[22].on, [{ roll: "Sanity", onFail: [{ flag: "unsettled" }, { san: "1" }] }]);
  assert.deepEqual(story.entries[26].on, [{ flag: "the_flowers_in_the_stream" }]);
  assert.deepEqual(story.entries[31].guards, [
    { if: "broken_heart", goto: 33 },
    { if: "blame_game", goto: 33 },
  ]);
  assert.deepEqual(story.entries[46].on[0], {
    roll: "Natural World",
    push: true,
    onSuccess: { goto: 47 },
    onFail: { goto: 53 },
    onPushedFail: { goto: 54 },
  });
  assert.deepEqual(story.entries[66].guards, [{ if: ["unsettled", { visits: 1 }], goto: 67 }]);
  assert.equal(story.entries[69].choices[0].roll, "Occult");
  assert.equal(story.entries[69].choices[0].flag, "razor_sharp");
  assert.deepEqual(story.entries[90].on, [{ heal: "1" }, { luck: "1d4" }, { goto: 92 }]);
  assert.equal(story.entries[91].choices[0].flag, "practical");
  assert.equal(story.entries[95].on[0].onPushedFail.goto, 99);
  assert.equal(story.entries[117].choices[0].roll, "Intimidate");
  assert.equal(story.entries[117].choices[1].roll, "Persuade");
  assert.equal(story.entries[134].end, true);
  assert.deepEqual(story.entries[141].on[0].diceIf, [{ if: "comfortable", dice: 1 }]);
  assert.equal(story.entries[147].on[0].difficulty, "hard");
  assert.deepEqual(story.entries[156].on[0].onPushedFail, { goto: 162 });
  assert.deepEqual(story.entries[159].on[0].diceIf, [
    { if: "touched_by_cold", dice: -1 },
    { if: "practical", dice: 1 },
  ]);
  assert.deepEqual(story.entries[166].on, [{ san: "1d4" }, { hp: "1d4" }]);
  assert.equal(story.entries[171].end, true);
  assert.deepEqual(story.entries[176].on[1], { if: "lumberjack", goto: 177 });
  assert.equal(story.entries[186].choices[0].if, "the_quiet_in_the_evening");
  assert.equal(story.entries[186].choices[0].once, true);
  assert.equal(story.entries[186].choices[2].once, true);
  assert.deepEqual(story.entries[189].on[0].onPushedFail, { goto: 195 });
  assert.deepEqual(story.entries[193].guards, [
    { if: "broken_heart", goto: 207 },
    { if: "blame_game", goto: 207 },
  ]);
  assert.deepEqual(story.entries[200].on[0].onPushedFail, { goto: 203 });
  assert.deepEqual(story.entries[211].on, [{ if: "veterinarian", goto: 212 }, { goto: 215 }]);
  assert.deepEqual(story.entries[226].on[0].onPushedFail, { goto: 231 });
  assert.deepEqual(story.entries[229].on, [{ if: "arrival", goto: 250 }, { goto: 248 }]);
});

test("proza zachowuje akapity, a urwane linie 5 i 8 są połączone", () => {
  const { story, texts } = buildStory(raw);
  assert.match(texts[story.entries[5].text[1]], /walk around to the trunk/);
  assert.match(texts[story.entries[8].text[0]], /gets lost, and then refuses/);
  assert.equal(story.entries[22].text.length, 8);
  assert.equal(story.entries[23].text.length, 6);
  assert.equal(story.entries[29].text.length, 7);
  assert.equal(story.entries[38].text.length, 1);
  assert.match(texts[story.entries[38].text[0]], /You're about to lick them clean/);
  assert.equal(story.entries[46].text.length, 4);
  assert.equal(story.entries[57].text.length, 2);
  assert.match(texts[story.entries[85].text[2]], /still without power/);
  assert.equal(story.entries[117].text.length, 3);
  assert.doesNotMatch(texts[story.entries[123].text[3]], /To ask the stranger/);
  assert.equal(story.entries[141].text.length, 1);
  assert.equal(story.entries[145].text.length, 6);
  assert.match(texts[story.entries[145].text[5]], /movement in the cabin/);
  assert.equal(story.entries[150].text.length, 3);
  assert.match(texts[story.entries[150].text[1]], /behind your eyes/);
  assert.equal(story.entries[168].text.length, 2);
  assert.match(texts[story.entries[168].text[1]], /find your way back/);
  assert.equal(story.entries[186].text.length, 1);
  assert.equal(story.entries[188].text.length, 10);
  assert.equal(story.entries[189].text.length, 2);
  assert.equal(story.entries[193].text.length, 6);
  assert.equal(story.entries[200].text.length, 2);
  assert.equal(story.entries[211].text.length, 1);
  assert.equal(story.entries[226].text.length, 1);
  assert.ok(!Object.values(texts).some((value) => value.startsWith("If Broken Heart")));
  assert.ok(!Object.values(texts).some((value) => value.startsWith("Make a ")));
  assert.equal(Object.values(texts).filter((value) => value.startsWith("To ")).length, 206);
});

test("każdy wpis ma scenę i wszystkie klucze tekstów istnieją", () => {
  const { story, texts } = buildStory(raw);
  for (const entry of Object.values(story.entries)) {
    assert.ok(entry.scene);
    assert.ok(entry.text.length > 0);
    for (const key of entry.text) assert.ok(key in texts, key);
    for (const item of entry.choices ?? []) assert.ok(item.text in texts, item.text);
  }
  assert.equal(story.entries[3].scene, "drive");
  assert.equal(story.entries[5].scene, "arrival");
  assert.equal(story.entries[9].scene, "clearing");
  assert.equal(story.entries[11].scene, "cabin");
  assert.equal(story.entries[38].scene, "forest");
  assert.equal(story.entries[46].scene, "stream");
  assert.equal(story.entries[69].scene, "shed");
  assert.equal(story.entries[83].scene, "drive");
  assert.equal(story.entries[103].scene, "arrival");
  assert.equal(story.entries[104].scene, "forest");
  assert.equal(story.entries[117].scene, "cabin");
  assert.equal(story.entries[134].scene, "cabin");
  assert.equal(story.entries[141].scene, "forest");
  assert.equal(story.entries[145].scene, "cabin");
  assert.equal(story.entries[169].scene, "forest");
  assert.equal(story.entries[176].scene, "cabin");
  assert.equal(story.entries[186].scene, "cabin");
  assert.equal(story.entries[224].scene, "clearing");
  assert.equal(story.entries[229].scene, "forest");
  assert.equal(story.entries[230].scene, "cabin");
});
