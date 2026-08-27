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
  const rolled = resume(ctx, first, { type: "choose", index: 0 });
  assert.ok(rolled.events.some((e) => e.kind === "roll" && e.success === true));
  const second = resume(ctx, rolled, { type: "accept" });
  assert.equal(second.entryId, 4);
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

test("przepchnięty rzut nie pozwala forsować po raz drugi", () => {
  const ctx = ctxWith([0.0, 0.9, 0.0, 0.8]); // pierwszy 90, przepchnięty 80
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const pending = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 1 });
  const pushed = resume(ctx, pending, { type: "push" });
  assert.equal(pushed.pending.type, "rollDecision");
  assert.equal(pushed.pending.pushed, true);
  assert.equal(pushed.pending.canPush, false);
  assert.throws(() => resume(ctx, pushed, { type: "push" }), /Akcja niedostępna: push/);
  // Zasady 7e dają na jeden test jedną deskę ratunku: po forsowaniu Szczęścia
  // już się nie dopłaca, choć koszt progu zostaje policzony.
  assert.equal(pushed.pending.canLuck, false);
  assert.equal(pushed.pending.luckCost, 10); // 80 - 70
  assert.throws(() => resume(ctx, pushed, { type: "luck" }), /Akcja niedostępna: luck/);
  const done = resume(ctx, pushed, { type: "accept" });
  assert.equal(hasFlag(done.state, "touched_by_cold"), true);
  assert.equal(done.pending.type, "choices");
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
  const pushed = resume(ctx, pending, { type: "push" });
  const frame = resume(ctx, pushed, { type: "accept" });
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
  const rolled = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 0 });
  assert.equal(rolled.pending.source, "choice");
  assert.equal(rolled.pending.choiceIndex, 0);
  assert.ok(rolled.events.some((event) => event.kind === "roll" && event.skill === "Occult"));
  const frame = resume(ctx, rolled, { type: "accept" });
  assert.equal(frame.entryId, 2);
  assert.equal(hasFlag(frame.state, "razor_sharp"), true);
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
  const rolled = enter(ctx, state, 11);
  assert.ok(rolled.events.some((e) => e.kind === "redirect" && e.to === 329));
  const frame = resume(ctx, rolled, { type: "accept" });
  assert.ok(frame.events.some((e) => e.kind === "text" && e.key === "e333.p1"));
  assert.equal(penaltyFor(frame.state, "Listen"), -1);
  assert.equal(frame.entryId, 11, "po epizodzie wracamy do paragrafu, w którym byliśmy");
  assert.deepEqual(frame.state.returnStack, []);
  assert.equal(frame.state.san, 54, "utrata Sanity nie powtarza się po powrocie");
});

test("powrót wznawia paragraf za krokiem, który spowodował skok", () => {
  const ctx = ctxWith([0.0, 0.9]); // rzut INT 90 - porażka, wracamy bez epizodu
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = resume(ctx, enter(ctx, state, 11), { type: "accept" });
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
  const first = enter(ctx, state, 1);
  const firstRoll = first.events.find((event) => event.kind === "roll");
  assert.equal(firstRoll.tens.length, 2);
  assert.equal(firstRoll.result, 20);
  assert.equal(first.state.nextRollDice, 0);
  const second = resume(ctx, first, { type: "accept" });
  const secondRoll = second.events.find((event) => event.kind === "roll");
  assert.equal(secondRoll.tens.length, 1);
  assert.equal(second.state.nextRollDice, 0);
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
  const rolled = enter(ctx, state, 12);
  assert.equal(rolled.pending.type, "rollDecision");
  assert.equal(rolled.pending.canLuck, false, "silnik nie proponuje dopłaty");
  const frame = resume(ctx, rolled, { type: "accept" });
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

// --- Nawrót: odwracanie werdyktu w chwili rzutu -------------------------
// Patrz docs/superpowers/specs/2026-08-26-cheat-reroll-design.md. Nawrót nie
// cofa już paragrafu po fakcie: gra staje na rzucie, więc poprawiony zapis
// jest jedną z decyzji obok przyjęcia wyniku.

test("nawrót po porażce prowadzi na gałąź sukcesu, nie ruszając kości", () => {
  const ctx = ctxWith([0.0, 0.9]); // Psychology 90 przy progu 60 — porażka
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const failed = enter(ctx, state, 2);
  assert.equal(failed.pending.type, "rollDecision");
  assert.equal(failed.pending.roll.success, false);

  const cheated = resume(ctx, failed, { type: "cheat" });
  assert.equal(cheated.entryId, 4);

  const roll = cheated.events.find((event) => event.kind === "roll");
  assert.equal(roll.success, true);
  assert.equal(roll.cheated, true);
  assert.equal(roll.result, 90, "kości zostają nietknięte — zmienia się sam werdykt");
  assert.deepEqual(roll.tens, failed.pending.roll.tens);
  assert.deepEqual(roll.cheatedFrom, { level: "fail", success: false });
  assert.equal(cheated.state.cheats, 1);
});

test("nawrót po sukcesie prowadzi na gałąź porażki", () => {
  const ctx = ctxWith([0.0, 0.2]); // Psychology 20 przy progu 60 — sukces
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const won = enter(ctx, state, 2);
  assert.equal(won.pending.type, "rollDecision");
  assert.equal(won.pending.roll.success, true);

  const cheated = resume(ctx, won, { type: "cheat" });
  assert.equal(cheated.entryId, 5);
  const roll = cheated.events.find((event) => event.kind === "roll");
  assert.equal(roll.success, false);
  assert.equal(roll.level, "fail");
  assert.equal(roll.result, 20);
  assert.deepEqual(roll.cheatedFrom, { level: "hard", success: true });
});

test("nawrót nie powiela zdarzeń paragrafu, w którym padł rzut", () => {
  const ctx = ctxWith([0.0, 0.2]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const won = enter(ctx, state, 2);
  const cheated = resume(ctx, won, { type: "cheat" });
  assert.deepEqual(kinds(won), ["text", "roll"]);
  assert.equal(won.events[0].key, "e2.p1");
  // Ramka decyzji zostaje na ekranie, więc wznowienie dokłada tylko skłamany
  // rzut i to, co po nim — tekstu paragrafu 2 nie emitujemy po raz drugi.
  assert.deepEqual(kinds(cheated), ["roll", "text", "choices"]);
  assert.equal(cheated.events[1].key, "e5.p1");
});

test("nawrót działa raz — po decyzji gra ruszyła dalej", () => {
  const ctx = ctxWith([0.0, 0.2]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const cheated = resume(ctx, enter(ctx, state, 2), { type: "cheat" });
  assert.equal(cheated.pending.type, "choices");
  assert.throws(() => resume(ctx, cheated, { type: "cheat" }), /Nieznana akcja/);
});

// Nawrót ma zawsze stać pod widocznymi kośćmi. Po przyjęciu porażki i po
// dopłacie Szczęściem gracz jest już w innym miejscu paragrafu, więc okazja
// znika razem z rzutem, do którego się odnosiła.
test("przyjęcie porażki zamyka okazję do nawrotu", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const decision = enter(ctx, state, 2);
  assert.equal(decision.pending.canCheat, true, "przy decyzji nawrót ma być dostępny");

  const accepted = resume(ctx, decision, { type: "accept" });
  assert.equal(accepted.entryId, 5);
  assert.equal(accepted.pending.type, "choices");
  assert.throws(() => resume(ctx, accepted, { type: "cheat" }), /Nieznana akcja/);
});

test("dopłata Szczęściem zamyka okazję do nawrotu", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const lucky = resume(ctx, enter(ctx, state, 2), { type: "luck" });
  assert.equal(lucky.entryId, 4);
  assert.equal(lucky.pending.type, "choices");
  assert.throws(() => resume(ctx, lucky, { type: "cheat" }), /Nieznana akcja/);
});

test("nawrót po przepchnięciu odnosi się do nowego rzutu", () => {
  const ctx = ctxWith([0.0, 0.9, 0.0, 0.8]); // CON 90, po przepchnięciu 80
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const pushed = resume(ctx, enter(ctx, state, 3), { type: "push" });
  assert.equal(pushed.pending.roll.result, 80);

  const cheated = resume(ctx, pushed, { type: "cheat" });
  assert.equal(cheated.events.find((event) => event.kind === "roll").success, true);
  assert.equal(cheated.state.cheats, 1);
});

// Dawniej rzut INT ataku obłędu leciał bez pytania, bo nie rozgałęział
// paragrafu. Teraz zatrzymuje grę jak każdy inny i da się go poprawić.
test("nawrót na rzucie ataku obłędu nakłada karę, której porażka nie nakładała", () => {
  const ctx = ctxWith([0.0, 0.9, 0.99]); // INT 90 — porażka; po nawrocie 1d4 = 4 -> 333
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = enter(ctx, state, 329);
  assert.equal(rolled.pending.type, "rollDecision");
  assert.equal(rolled.pending.kind, "bout");
  assert.equal(rolled.pending.canCheat, true);

  const cheated = resume(ctx, rolled, { type: "cheat" });
  assert.equal(penaltyFor(cheated.state, "Listen"), -1);
  assert.equal(cheated.state.cheats, 1);
});

// Każdy rzut musi zatrzymać grę przed skutkiem — także wtedy, gdy gałąź
// prowadzi do innego paragrafu. Regresja: dawniej sukces stosował się od razu
// i decyzja gracza przelatywała razem ze skokiem.
test("rzut zatrzymuje grę przed skokiem do innego paragrafu", () => {
  const ctx = ctxWith([0.0, 0.2]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const frame = enter(ctx, state, 2);
  assert.equal(frame.entryId, 2, "gra jeszcze nie ruszyła na gałąź sukcesu");
  assert.equal(frame.pending.type, "rollDecision");
  assert.equal(frame.pending.canCheat, true);
  assert.equal(resume(ctx, frame, { type: "accept" }).entryId, 4);
});

// Ten sam warunek na całym scenariuszu, nie na atrapie: żadna ramka z rzutem
// nie przelatuje bez pytania, a decyzja dotyczy dokładnie tego rzutu, który
// gracz widzi w zdarzeniach.
test("żaden rzut w całym scenariuszu nie przelatuje bez decyzji", () => {
  const fullStory = JSON.parse(readFileSync(new URL("../data/story.json", import.meta.url)));

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
      const rolls = frame.events.filter((event) => event.kind === "roll");
      if (rolls.length > 0) {
        seen += rolls.length;
        assert.equal(
          frame.pending?.type,
          "rollDecision",
          `paragraf ${frame.entryId} zastosował rzut bez pytania`,
        );
        assert.equal(rolls.length, 1, `paragraf ${frame.entryId} skleił dwa rzuty w jedną decyzję`);
        assert.equal(rolls[0].result, frame.pending.roll.result, `paragraf ${frame.entryId} pyta o inny rzut`);
        assert.equal(frame.pending.canCheat, true);
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

// --- Pauza na każdym rzucie ---------------------------------------------

test("udany rzut też zatrzymuje grę i czeka na przyjęcie wyniku", () => {
  const ctx = ctxWith([0.0, 0.2]); // 20 — sukces przy 60
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 0 });
  assert.equal(rolled.pending.type, "rollDecision");
  assert.equal(rolled.pending.roll.success, true);
  assert.equal(rolled.pending.canPush, false);
  assert.equal(rolled.pending.canLuck, false);
  assert.equal(rolled.pending.canCheat, true);
  const accepted = resume(ctx, rolled, { type: "accept" });
  assert.equal(accepted.entryId, 4);
});

test("nieudany rzut bez forsowania i bez stać-na-Szczęście nadal czeka na decyzję", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const poor = { ...state, luck: 0 };
  const rolled = resume(ctx, enter(ctx, poor, 1), { type: "choose", index: 0 });
  assert.equal(rolled.pending.type, "rollDecision");
  assert.equal(rolled.pending.canPush, false);
  assert.equal(rolled.pending.canLuck, false);
  assert.equal(rolled.pending.canCheat, true);
  assert.equal(resume(ctx, rolled, { type: "accept" }).entryId, 5);
});

test("cheat odwraca werdykt przed skutkami i nie rusza kości", () => {
  const ctx = ctxWith([0.0, 0.9]);
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = resume(ctx, enter(ctx, state, 1), { type: "choose", index: 0 });
  const cheated = resume(ctx, rolled, { type: "cheat" });
  const event = cheated.events.find((e) => e.kind === "roll");
  assert.equal(event.result, rolled.pending.roll.result);
  assert.equal(event.success, true);
  assert.equal(event.cheated, true);
  assert.deepEqual(event.cheatedFrom, { level: rolled.pending.roll.level, success: false });
  assert.equal(cheated.state.cheats, state.cheats + 1);
  assert.equal(cheated.entryId, 4);
});

test("każdy rzut ramki dostaje własną decyzję, żaden nie przelatuje bez pytania", () => {
  // Dwa rzuty w jednym paragrafie: po przyjęciu pierwszego gra dochodzi do
  // drugiego kroku i znów pyta, zamiast wykonać oba na raz.
  const twoRolls = {
    entries: {
      1: {
        text: ["e1.p1"],
        on: [
          { roll: "Psychology", onFail: { goto: 2 } },
          { roll: "Listen", onFail: { goto: 2 } },
        ],
        choices: [{ text: "e1.c1", goto: 2 }],
      },
      2: { text: ["e2.p1"], end: true },
    },
  };
  const ctx = { story: twoRolls, character, rng: sequenceRng([0.0, 0.2, 0.0, 0.9]) };
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const first = enter(ctx, state, 1);
  assert.equal(first.pending.type, "rollDecision");
  assert.equal(first.pending.skill, "Psychology");
  const second = resume(ctx, first, { type: "accept" });
  assert.equal(second.pending.type, "rollDecision");
  assert.equal(second.pending.skill, "Listen");
  assert.notEqual(second.pending.roll.result, first.pending.roll.result);
});

test("forsowanie znika po jednym użyciu", () => {
  const entry = {
    entries: {
      1: {
        text: ["e1.p1"],
        on: [{ roll: "Listen", push: true, onFail: { goto: 2 } }],
        choices: [{ text: "e1.c1", goto: 2 }],
      },
      2: { text: ["e2.p1"], end: true },
    },
  };
  const ctx = { story: entry, character, rng: sequenceRng([0.0, 0.9, 0.0, 0.9]) };
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = enter(ctx, state, 1);
  assert.equal(rolled.pending.canPush, true);
  const pushed = resume(ctx, rolled, { type: "push" });
  assert.equal(pushed.pending.type, "rollDecision");
  assert.equal(pushed.pending.pushed, true);
  assert.equal(pushed.pending.canPush, false);
});

test("test Sanity zatrzymuje grę przed utratą poczytalności i daje cheat", () => {
  const story = {
    entries: {
      1: { text: ["e1.p1"], on: [{ sanCheck: "1/1d4" }], choices: [{ text: "e1.c1", goto: 2 }] },
      2: { text: ["e2.p1"], end: true },
    },
  };
  const ctx = { story, character, rng: sequenceRng([0.0, 0.9, 0.5]) };
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = enter(ctx, state, 1);
  assert.equal(rolled.pending.type, "rollDecision");
  assert.equal(rolled.pending.kind, "sanCheck");
  assert.equal(rolled.pending.notation, "1/1d4");
  assert.equal(rolled.pending.canLuck, false);
  assert.equal(rolled.pending.canPush, false);
  assert.equal(rolled.pending.canCheat, true);
  const san = state.san;
  const cheated = resume(ctx, rolled, { type: "cheat" });
  assert.equal(cheated.state.san, san - 1); // gałąź sukcesu notacji "1/1d4"
  assert.equal(cheated.pending.type, "choices");
});

test("rzut INT ataku obłędu zatrzymuje grę i pozwala go poprawić", () => {
  // Do paragrafu 329 wchodzimy tak, jak robi to gra: przez stratę Sanity,
  // która odkłada powrót na stos — inaczej nieudany rzut nie miałby gdzie wrócić.
  const story = {
    entries: {
      1: { text: ["e1.p1"], on: [{ san: "6" }], choices: [{ text: "e1.c1", goto: 2 }] },
      2: { text: ["e2.p1"], end: true },
      329: { text: ["e329.p1"], on: [{ bout: true }] },
    },
  };
  const ctx = { story, character, rng: sequenceRng([0.0, 0.9]) };
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = enter(ctx, state, 1);
  assert.equal(rolled.pending.kind, "bout");
  assert.equal(rolled.pending.skill, "INT");
  assert.equal(rolled.pending.canCheat, true);
  assert.equal(resume(ctx, rolled, { type: "accept" }).entryId, 1);
});

// Niedostępna akcja musi padać głośno. `luckCost` liczy się także tam, gdzie
// dopłacać nie wolno, więc brak bramki oznaczałby, że rzut Sanity albo ataku
// obłędu daje się kupić za punkty Szczęścia.
test("dopłata Szczęściem na rzucie ataku obłędu jest odrzucana", () => {
  const ctx = ctxWith([0.0, 0.9]); // INT 90 — porażka
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = enter(ctx, state, 329);
  assert.equal(rolled.pending.kind, "bout");
  assert.equal(rolled.pending.canLuck, false);
  assert.ok(rolled.pending.luckCost > 0, "koszt jest policzony, choć akcji nie ma");
  assert.throws(() => resume(ctx, rolled, { type: "luck" }), /Akcja niedostępna: luck/);
  assert.equal(rolled.state.luck, state.luck, "punkty Szczęścia zostają nietknięte");
});

test("dopłata Szczęściem na teście Sanity jest odrzucana", () => {
  const story = {
    entries: {
      1: { text: ["e1.p1"], on: [{ sanCheck: "1/1d4" }], choices: [{ text: "e1.c1", goto: 2 }] },
      2: { text: ["e2.p1"], end: true },
    },
  };
  const ctx = { story, character, rng: sequenceRng([0.0, 0.9, 0.5]) };
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = enter(ctx, state, 1);
  assert.equal(rolled.pending.canLuck, false);
  assert.throws(() => resume(ctx, rolled, { type: "luck" }), /Akcja niedostępna: luck/);
});

test("forsowanie rzutu, którego paragraf nie oferuje, jest odrzucane", () => {
  const ctx = ctxWith([0.0, 0.9]); // Psychology 90 — porażka, paragraf 2 nie ma push
  const state = createState(character, { rng: sequenceRng([0.5, 0.5, 0.5]) });
  const rolled = enter(ctx, state, 2);
  assert.equal(rolled.pending.canPush, false);
  assert.throws(() => resume(ctx, rolled, { type: "push" }), /Akcja niedostępna: push/);
});
