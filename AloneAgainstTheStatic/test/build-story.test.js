import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildStory } from "../tools/build-story.mjs";

const load = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));
const raw = load("../tools/raw-entries.json");

test("generator buduje deterministyczny zakres 1-30 z dwoma startami", () => {
  const first = buildStory(raw);
  const second = buildStory(raw);
  assert.deepEqual(first, second);
  assert.deepEqual(first.story.extracted, [1, 30]);
  assert.equal(Object.keys(first.story.entries).length, 30);
  assert.equal(first.story.start, 1);
  assert.deepEqual(first.story.starts, { alex: 1, charlie: 2 });
});

test("jawna mechanika zachowuje trudne przypadki 5, 9, 22 i 26", () => {
  const { story } = buildStory(raw);
  assert.deepEqual(story.entries[5].on, [{ roll: "CON", onFail: [{ flag: "touched_by_cold" }] }]);
  assert.deepEqual(story.entries[9].guards, [{ if: ["temporal_steel", { not: "knife_to_a_gun_fight" }], goto: 363 }]);
  assert.deepEqual(story.entries[22].on, [{ roll: "Sanity", onFail: [{ flag: "unsettled" }, { san: "1" }] }]);
  assert.deepEqual(story.entries[26].on, [{ flag: "the_flowers_in_the_stream" }]);
});

test("proza zachowuje akapity, a urwane linie 5 i 8 są połączone", () => {
  const { story, texts } = buildStory(raw);
  assert.match(texts[story.entries[5].text[1]], /walk around to the trunk/);
  assert.match(texts[story.entries[8].text[0]], /gets lost, and then refuses/);
  assert.equal(story.entries[22].text.length, 8);
  assert.equal(story.entries[23].text.length, 6);
  assert.equal(story.entries[29].text.length, 7);
  assert.ok(!Object.values(texts).some((value) => value.startsWith("If Broken Heart")));
  assert.equal(Object.values(texts).filter((value) => value.startsWith("To ")).length, 32);
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
});
