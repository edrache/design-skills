import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sequenceRng } from "../src/engine/dice.js";
import { createState, hasFlag, visitCount, penaltyFor, setFlag } from "../src/engine/state.js";
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

test("porażka forsowanego rzutu może mieć osobny skutek", () => {
  const pushedStory = {
    entries: {
      1: {
        id: 1,
        text: ["e1.p1"],
        on: [{
          roll: "DEX",
          push: true,
          onSuccess: { goto: 2 },
          onFail: { goto: 3 },
          onPushedFail: { goto: 4 },
        }],
      },
      2: { id: 2, text: ["e2.p1"], end: true },
      3: { id: 3, text: ["e3.p1"], end: true },
      4: { id: 4, text: ["e4.p1"], end: true },
    },
  };
  const ctx = { story: pushedStory, character, rng: sequenceRng([0.0, 0.9, 0.0, 0.8]) };
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const pending = enter(ctx, state, 1);
  const frame = resume(ctx, pending, { type: "push" });
  assert.equal(frame.entryId, 4);
});

test("warunkowy krok sprawdza flagę ustawioną wcześniej w tym samym paragrafie", () => {
  const conditionalStory = {
    entries: {
      1: {
        id: 1,
        text: ["e1.p1"],
        on: [{ flag: "toolkit" }, { if: "toolkit", goto: 2 }, { goto: 3 }],
      },
      2: { id: 2, text: ["e2.p1"], end: true },
      3: { id: 3, text: ["e3.p1"], end: true },
    },
  };
  const ctx = { story: conditionalStory, character, rng: sequenceRng([]) };
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctx, state, 1);
  assert.equal(frame.entryId, 2);
  assert.equal(hasFlag(frame.state, "toolkit"), true);
});

test("wybór może ustawić flagę i bezpośrednio uruchomić rzut", () => {
  const choiceRollStory = {
    entries: {
      1: {
        id: 1,
        text: ["e1.p1"],
        choices: [{
          text: "e1.c1",
          goto: 1,
          flag: "razor_sharp",
          roll: "Occult",
          onSuccess: { goto: 2 },
          onFail: { goto: 3 },
        }],
      },
      2: { id: 2, text: ["e2.p1"], end: true },
      3: { id: 3, text: ["e3.p1"], end: true },
    },
  };
  const ctx = { story: choiceRollStory, character, rng: sequenceRng([0.1, 0.0]) };
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 0 });
  assert.equal(frame.entryId, 2);
  assert.equal(hasFlag(frame.state, "razor_sharp"), true);
  assert.ok(frame.events.some((event) => event.kind === "roll" && event.skill === "Occult"));
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

test("leczenie i odzyskiwanie Luck emitują rzeczywiście odzyskane wartości", () => {
  const recoveryStory = {
    entries: {
      1: { id: 1, text: ["e1.p1"], on: [{ heal: "1" }, { luck: "1d4" }, { goto: 2 }] },
      2: { id: 2, text: ["e2.p1"], end: true },
    },
  };
  const ctx = { story: recoveryStory, character, rng: sequenceRng([0.99]) };
  const initial = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctx, { ...initial, hp: 12, luck: 98 }, 1);
  assert.equal(frame.state.hp, 13);
  assert.equal(frame.state.luck, 100);
  assert.ok(frame.events.some((event) => event.kind === "heal" && event.amount === 1 && event.rolled === 1));
  assert.ok(frame.events.some((event) => event.kind === "luck" && event.amount === 2 && event.rolled === 4));
});

test("warunkowe kości bonusowe i karne zależą od flag i wzajemnie się znoszą", () => {
  const modifierStory = {
    entries: {
      1: {
        id: 1,
        text: ["e1.p1"],
        on: [{
          roll: "CON",
          diceIf: [{ if: "comfortable", dice: 1 }, { if: "touched_by_cold", dice: -1 }],
          onSuccess: { goto: 2 },
          onFail: { goto: 3 },
        }],
      },
      2: { id: 2, text: ["e2.p1"], end: true },
      3: { id: 3, text: ["e3.p1"], end: true },
    },
  };
  const initial = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });

  const bonus = enter(
    { story: modifierStory, character, rng: sequenceRng([0.0, 0.8, 0.2]) },
    setFlag(initial, "comfortable"),
    1,
  );
  assert.equal(bonus.events.find((event) => event.kind === "roll").result, 20);

  const penalty = enter(
    { story: modifierStory, character, rng: sequenceRng([0.0, 0.8, 0.2]) },
    setFlag(initial, "touched_by_cold"),
    1,
  );
  assert.equal(penalty.events.find((event) => event.kind === "roll").result, 80);

  const cancelled = enter(
    { story: modifierStory, character, rng: sequenceRng([0.0, 0.8]) },
    setFlag(setFlag(initial, "comfortable"), "touched_by_cold"),
    1,
  );
  assert.equal(cancelled.events.find((event) => event.kind === "roll").tens.length, 1);
});

test("bonus fabularny działa tylko na najbliższy rzut", () => {
  const bonusStory = {
    entries: {
      1: { id: 1, text: ["e1.p1"], on: [{ nextRollDice: 1 }, { goto: 2 }] },
      2: { id: 2, text: ["e2.p1"], on: [{ roll: "DEX", onSuccess: { goto: 3 }, onFail: { goto: 3 } }] },
      3: { id: 3, text: ["e3.p1"], on: [{ roll: "DEX", onSuccess: { goto: 4 }, onFail: { goto: 4 } }] },
      4: { id: 4, text: ["e4.p1"], end: true },
    },
  };
  const ctx = { story: bonusStory, character, rng: sequenceRng([0.0, 0.8, 0.2, 0.0, 0.3]) };
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctx, state, 1);
  const rolls = frame.events.filter((event) => event.kind === "roll");
  assert.equal(rolls[0].tens.length, 2);
  assert.equal(rolls[0].result, 20);
  assert.equal(rolls[1].tens.length, 1);
  assert.equal(frame.state.nextRollDice, 0);
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

test("nie można wydać Luck na nieudanym rzucie Luck", () => {
  const ctx = ctxWith([0.0, 0.9]); // rzut 90 przy Luck 60 - porażka
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctx, state, 12);
  assert.equal(frame.pending.type, "choices", "silnik nie proponuje decyzji");
  assert.equal(hasFlag(frame.state, "unlucky"), true);
  assert.equal(frame.state.luck, 60, "punkty Luck nie zostały wydane");
});

test("paragraf bez wyborów i bez końca zgłasza czytelny błąd danych", () => {
  const broken = { ...story, entries: { ...story.entries, 13: { id: 13, text: ["e13.p1"] } } };
  const ctx = { story: broken, character, rng: sequenceRng([]) };
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  assert.throws(() => enter(ctx, state, 13), /Paragraf 13/);
});

test("wybór spoza zakresu zgłasza czytelny błąd", () => {
  const ctx = ctxWith([]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctx, state, 1);
  assert.throws(() => resume(ctx, frame, { type: "choose", index: 9 }), /nie ma wyboru/);
});

// --- Nawrót: odwracanie werdyktu ostatniego rzutu -----------------------
// Patrz docs/superpowers/specs/2026-08-26-cheat-reroll-design.md.

test("nawrót po porażce prowadzi na gałąź sukcesu, nie ruszając kości", () => {
  const ctx = ctxWith([0.0, 0.9]); // Psychology 90 przy progu 60 — porażka
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const failed = enter(ctx, state, 2);
  assert.equal(failed.pending.type, "rollDecision");
  assert.equal(failed.rewind.event.success, false);

  const cheated = resume(ctx, failed, { type: "cheat" });
  assert.equal(cheated.entryId, 4);

  const roll = cheated.events.find((event) => event.kind === "roll");
  assert.equal(roll.success, true);
  assert.equal(roll.cheated, true);
  assert.equal(roll.result, 90, "kości zostają nietknięte — zmienia się sam werdykt");
  assert.deepEqual(roll.tens, failed.rewind.event.tens);
  assert.deepEqual(roll.cheatedFrom, { level: "fail", success: false });
  assert.equal(cheated.state.cheats, 1);
});

test("nawrót po sukcesie prowadzi na gałąź porażki", () => {
  const ctx = ctxWith([0.0, 0.2]); // Psychology 20 przy progu 60 — sukces
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const won = enter(ctx, state, 2);
  assert.equal(won.entryId, 4);
  assert.equal(won.rewind.event.success, true);

  const cheated = resume(ctx, won, { type: "cheat" });
  assert.equal(cheated.entryId, 5);
  const roll = cheated.events.find((event) => event.kind === "roll");
  assert.equal(roll.success, false);
  assert.equal(roll.level, "fail");
  assert.equal(roll.result, 20);
  assert.deepEqual(roll.cheatedFrom, { level: "hard", success: true });
});

test("nawrót zachowuje zdarzenia sprzed rzutu i nie powiela tych po nim", () => {
  const ctx = ctxWith([0.0, 0.2]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const won = enter(ctx, state, 2);
  const cheated = resume(ctx, won, { type: "cheat" });
  assert.deepEqual(kinds(won), ["text", "roll", "text", "choices"]);
  assert.deepEqual(kinds(cheated), ["text", "roll", "text", "choices"]);
  assert.equal(cheated.events[0].key, "e2.p1");
  assert.equal(cheated.events[2].key, "e5.p1");
});

test("nawrót działa raz — drugi nie ma już punktu cofnięcia", () => {
  const ctx = ctxWith([0.0, 0.2]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const cheated = resume(ctx, enter(ctx, state, 2), { type: "cheat" });
  assert.equal(cheated.rewind, undefined);
  assert.throws(() => resume(ctx, cheated, { type: "cheat" }), /odwrócić/);
});

// Nawrót ma zawsze stać pod widocznymi kośćmi. Po przyjęciu porażki i po
// dopłacie Szczęściem gracz jest już w innym miejscu paragrafu, więc punkt
// cofnięcia znika razem z rzutem, do którego się odnosił.
test("przyjęcie porażki zamyka okazję do nawrotu", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const decision = enter(ctx, state, 2);
  assert.ok(decision.rewind, "przy decyzji nawrót ma być dostępny");

  const accepted = resume(ctx, decision, { type: "accept" });
  assert.equal(accepted.entryId, 5);
  assert.equal(accepted.rewind, undefined);
});

test("dopłata Szczęściem zamyka okazję do nawrotu", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const lucky = resume(ctx, enter(ctx, state, 2), { type: "luck" });
  assert.equal(lucky.entryId, 4);
  assert.equal(lucky.rewind, undefined);
});

test("nawrót po przepchnięciu odnosi się do nowego rzutu", () => {
  const ctx = ctxWith([0.0, 0.9, 0.0, 0.8]); // CON 90, po przepchnięciu 80
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const pushed = resume(ctx, enter(ctx, state, 3), { type: "push" });
  assert.equal(pushed.rewind.event.result, 80);

  const cheated = resume(ctx, pushed, { type: "cheat" });
  assert.equal(cheated.events.find((event) => event.kind === "roll").success, true);
  assert.equal(cheated.state.cheats, 1);
});

test("rzuty spoza rozgałęzień (bout) nie dają punktu cofnięcia", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctx, state, 329);
  assert.ok(frame.events.some((event) => event.kind === "roll"));
  assert.equal(frame.rewind, undefined);
});

// Punkt cofnięcia musi przetrwać `goto` po rzucie — a przetrwać znaczy też
// wskazywać właściwe miejsce w sklejonej liście zdarzeń. Regresja: sklejanie
// zdarzeń w continueAt/jump gubiło rewind, więc nawrót znikał wszędzie tam,
// gdzie gałąź rzutu prowadziła do innego paragrafu (czyli prawie zawsze).
test("punkt cofnięcia przeżywa skok do innego paragrafu i wskazuje ten rzut", () => {
  const ctx = ctxWith([0.0, 0.2]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctx, state, 2);
  assert.equal(frame.entryId, 4, "sukces prowadzi do innego paragrafu");
  assert.ok(frame.rewind, "nawrót nie może ginąć przy skoku");
  assert.equal(frame.events[frame.rewind.eventCount], frame.rewind.event);
});

// Ten sam warunek na całym scenariuszu, nie na atrapie: każda ramka z rzutem
// rozgałęziającym ma punkt cofnięcia, a jego indeks trafia w ten rzut.
test("każda ramka z rzutem rozgałęziającym ma sprawny punkt cofnięcia", () => {
  const fullStory = JSON.parse(readFileSync(new URL("../data/story.json", import.meta.url)));
  const branchSkills = new Set();
  for (const entry of Object.values(fullStory.entries)) {
    for (const step of entry.on ?? []) if (step.roll) branchSkills.add(step.roll);
    for (const choice of entry.choices ?? []) if (choice.roll) branchSkills.add(choice.roll);
  }

  // Deterministyczny generator: ten sam przebieg przy każdym uruchomieniu.
  let seed = 12345;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const ctx = { story: fullStory, character, rng };

  let seen = 0;
  for (let run = 0; run < 10; run += 1) {
    let frame = enter(ctx, createState(character, { rng }), fullStory.start);
    for (let step = 0; step < 150; step += 1) {
      if (frame.events.some((event) => event.kind === "roll" && branchSkills.has(event.skill))) {
        seen += 1;
        assert.ok(frame.rewind, `paragraf ${frame.entryId} zgubił punkt cofnięcia`);
        assert.equal(
          frame.events[frame.rewind.eventCount],
          frame.rewind.event,
          `paragraf ${frame.entryId} wskazuje nie ten rzut`,
        );
      }
      if (frame.pending?.type === "end" || frame.pending?.type === "missing") break;
      if (frame.pending?.type === "rollDecision") {
        frame = resume(ctx, frame, { type: "accept" });
        continue;
      }
      const open = frame.pending.options.filter((option) => !option.used && !option.blocked);
      if (open.length === 0) break;
      frame = resume(ctx, frame, { type: "choose", index: open[Math.floor(rng() * open.length)].index });
    }
  }
  assert.ok(seen > 20, `przebieg za płytki, żeby cokolwiek sprawdzić (${seen})`);
});
