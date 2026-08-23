import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sequenceRng } from "../src/engine/dice.js";
import { createState, hasFlag, visitCount, penaltyFor } from "../src/engine/state.js";
import { enter, resume } from "../src/engine/runner.js";

const characters = JSON.parse(readFileSync(new URL("../data/characters.json", import.meta.url)));
const story = JSON.parse(readFileSync(new URL("./fixtures/story.fixture.json", import.meta.url)));
const character = characters.charlie;

function ctxWith(values) {
  return { story, character, rng: sequenceRng(values) };
}
const kinds = (frame) => frame.events.map((e) => e.kind);

test("wejście w paragraf emituje tekst, zapala flagę i pokazuje wybory", () => {
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctxWith([]), state, 1);
  assert.deepEqual(kinds(frame), ["text", "flag", "choices"]);
  assert.equal(hasFlag(frame.state, "alex"), true);
  assert.equal(visitCount(frame.state, 1), 1);
  assert.equal(frame.pending.type, "choices");
  assert.equal(frame.pending.options.length, 2);
});

test("wybór prowadzi do kolejnego paragrafu", () => {
  const ctx = ctxWith([0.0, 0.2]); // rzut Psychology 20 - sukces przy 60
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const first = enter(ctx, state, 1);
  const second = resume(ctx, first, { type: "choose", index: 0 });
  assert.equal(second.entryId, 4);
  assert.ok(second.events.some((e) => e.kind === "roll" && e.success === true));
});

test("nieudany rzut czeka na decyzję, a po jej odrzuceniu idzie ścieżką porażki", () => {
  const ctx = ctxWith([0.0, 0.9]); // rzut 90 - porażka przy 60
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) }); // Luck 60
  const failed = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 0 });
  // Wydanie Luck jest dostępne przy każdym nieudanym rzucie, na który gracza stać,
  // więc silnik zatrzymuje się nawet gdy paragraf nie oferuje przepchnięcia.
  assert.equal(failed.pending.type, "rollDecision");
  assert.equal(failed.pending.canPush, false);
  assert.equal(failed.pending.canLuck, true);
  assert.equal(failed.pending.luckCost, 30); // 90 - 60
  const frame = resume(ctx, failed, { type: "accept" });
  assert.equal(frame.entryId, 5);
});

test("rzut z możliwością przepchnięcia czeka na decyzję gracza", () => {
  const ctx = ctxWith([0.0, 0.9]); // CON 70, rzut 90 - porażka
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 1 });
  assert.equal(frame.pending.type, "rollDecision");
  assert.equal(frame.pending.canPush, true);
  assert.equal(frame.pending.luckCost, 20); // 90 - 70
  assert.equal(hasFlag(frame.state, "touched_by_cold"), false);
});

test("przyjęcie porażki wykonuje skutki onFail", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const pending = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 1 });
  const done = resume(ctx, pending, { type: "accept" });
  assert.equal(hasFlag(done.state, "touched_by_cold"), true);
  assert.equal(done.pending.type, "choices");
});

test("wydanie Luck zamienia porażkę w sukces", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) }); // Luck 60
  const pending = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 1 });
  const done = resume(ctx, pending, { type: "luck" });
  assert.equal(done.state.luck, 40);
  assert.equal(hasFlag(done.state, "touched_by_cold"), false);
});

test("przepchnięty rzut nie pozwala już wydać Luck", () => {
  const ctx = ctxWith([0.0, 0.9, 0.0, 0.8]); // pierwszy 90, przepchnięty 80
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const pending = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 1 });
  const pushed = resume(ctx, pending, { type: "push" });
  assert.equal(hasFlag(pushed.state, "touched_by_cold"), true);
  assert.equal(pushed.pending.type, "choices");
});

test("strażnik przekierowuje, gdy flaga jest zapalona", () => {
  const ctx = ctxWith([0.0, 0.9]);
  let state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const pending = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 1 });
  const afterFail = resume(ctx, pending, { type: "accept" });
  const guarded = resume(ctx, afterFail, { type: "choose", index: 0 }); // paragraf 4
  assert.equal(guarded.entryId, 6);
  assert.ok(guarded.events.some((e) => e.kind === "redirect" && e.to === 6));
});

test("wybory jednorazowe znikają po użyciu", () => {
  const ctx = ctxWith([]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  let frame = enter(ctx, state, 7);
  assert.equal(frame.pending.options.filter((o) => !o.used).length, 3);
  frame = resume(ctx, frame, { type: "choose", index: 0 }); // do 8
  frame = resume(ctx, frame, { type: "choose", index: 0 }); // z powrotem do 7
  assert.equal(frame.pending.options[0].used, true);
  assert.equal(frame.pending.options[1].used, false);
});

test("strata Sanity powyżej pięciu punktów prowadzi przez bout of madness i wraca", () => {
  const ctx = ctxWith([0.0, 0.2, 0.99]); // rzut INT 20 - sukces; 1D4 = 4 -> paragraf 333
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctx, state, 11);
  assert.ok(frame.events.some((e) => e.kind === "redirect" && e.to === 329));
  assert.ok(frame.events.some((e) => e.kind === "text" && e.key === "e333.p1"));
  assert.equal(penaltyFor(frame.state, "Listen"), -1);
  assert.equal(frame.entryId, 11, "po epizodzie wracamy do paragrafu, w którym byliśmy");
  assert.deepEqual(frame.state.returnStack, []);
  assert.equal(frame.state.san, 54, "utrata Sanity nie powtarza się po powrocie");
});

test("powrót wznawia paragraf za krokiem, który spowodował skok", () => {
  const ctx = ctxWith([0.0, 0.9]); // rzut INT 90 - porażka, wracamy bez epizodu
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctx, state, 11);
  assert.equal(frame.entryId, 11);
  assert.equal(frame.state.san, 54, "krok utraty Sanity nie wykonuje się drugi raz");
  assert.equal(frame.pending.type, "choices");
});

test("goto @return wraca na odłożony paragraf", () => {
  const ctx = ctxWith([]);
  let state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  state = { ...state, returnStack: [{ entryId: 7, cursor: 0 }] };
  const frame = enter(ctx, state, 333);
  assert.equal(frame.entryId, 7);
  assert.deepEqual(frame.state.returnStack, []);
});

test("krok newDay zeruje licznik Sanity utraconej w ciągu doby", () => {
  const ctx = ctxWith([]);
  let state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  state = { ...state, sanLostToday: 7 };
  const frame = enter(ctx, state, 8);
  assert.equal(frame.state.sanLostToday, 0);
});

test("paragraf z end kończy grę", () => {
  const frame = enter(ctxWith([]), createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) }), 10);
  assert.equal(frame.pending.type, "end");
});

test("przejście poza wyekstrahowany zakres daje zdarzenie missing", () => {
  const ctx = ctxWith([]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctx, state, 200);
  assert.deepEqual(kinds(frame), ["missing"]);
  assert.equal(frame.events[0].entryId, 200);
});
