import { rollDice, skillCheck, successLevel } from "./dice.js";
import { requiredThreshold, decisionFor } from "./decision.js";
import {
  hasFlag, setFlag, visit, visitCount, useChoice, isChoiceUsed,
  spendLuck, restoreLuck, restoreHp, penaltyFor, popReturn, pushReturn, skillValue,
  addNextRollDice, takeNextRollDice, countCheat,
} from "./state.js";
import {
  applyDamage, applySanLoss, resetDay,
  rollSanity, applySanityCheck, rollBout, applyBout,
} from "./rules.js";

// Ramka opisuje wykonanie jednego paragrafu. Interpreter zatrzymuje się,
// gdy potrzebuje decyzji gracza, i wznawia przez resume().
function frameOf(state, entryId, events, pending, cursor) {
  return { state, entryId, events, pending, cursor };
}

function entryOf(ctx, id) {
  return ctx.story.entries[String(id)] ?? null;
}

// Sklejenie zdarzeń bieżącego paragrafu ze zdarzeniami paragrafu, do którego
// właśnie przeszliśmy.
function mergeForward(events, forward) {
  return frameOf(
    forward.state, forward.entryId, [...events, ...forward.events], forward.pending, forward.cursor,
  );
}

// Odwrócony werdykt tego samego rzutu. Kości zostają nietknięte — na ekranie
// ma zostać widoczne kłamstwo, nie nowy rzut.
function invertedRoll(event) {
  const from = { level: event.level, success: event.success };
  if (event.success) {
    return { ...event, level: "fail", success: false, cheated: true, cheatedFrom: from };
  }
  const threshold = requiredThreshold(event.target, event.difficulty ?? "regular");
  return {
    ...event,
    level: successLevel(threshold, event.target),
    success: true,
    cheated: true,
    cheatedFrom: from,
  };
}

function guardMatches(state, condition) {
  const parts = Array.isArray(condition) ? condition : [condition];
  return parts.every((part) => {
    if (typeof part === "string") return hasFlag(state, part);
    if ("visits" in part) return visitCount(state, part.entry ?? null) === part.visits;
    if ("not" in part) return !hasFlag(state, part.not);
    throw new Error(`Nieznany warunek strażnika: ${JSON.stringify(part)}`);
  });
}

// Doraźne kości bonusowe i karne zapisujemy przy konkretnym rzucie. Wartości
// sumują się, więc przeciwne modyfikatory znoszą się zgodnie z zasadami gry.
function diceFor(state, step) {
  const conditional = (step.diceIf ?? []).reduce(
    (sum, modifier) => sum + (guardMatches(state, modifier.if) ? modifier.dice : 0),
    0,
  );
  return (step.dice ?? 0) + conditional + penaltyFor(state, step.roll);
}

export function enter(ctx, state, entryId) {
  const entry = entryOf(ctx, entryId);
  if (!entry) {
    return frameOf(state, entryId, [{ kind: "missing", entryId }], { type: "missing" }, 0);
  }

  let next = visit(state, entryId);
  const events = [];

  // Strażniki liczą wizytę bieżącą, więc sprawdzamy je po visit().
  for (const guard of entry.guards ?? []) {
    const condition = (Array.isArray(guard.if) ? guard.if : [guard.if]).map((part) =>
      typeof part === "object" && "visits" in part ? { ...part, entry: entryId } : part,
    );
    if (guardMatches(next, condition)) {
      events.push({ kind: "redirect", to: guard.goto });
      const forward = enter(ctx, next, guard.goto);
      return mergeForward(events, forward);
    }
  }

  for (const key of entry.text ?? []) events.push({ kind: "text", key });

  return runSteps(ctx, frameOf(next, entryId, events, null, 0));
}

// Wykonuje jeden efekt wspólny dla kroków "on" i gałęzi onSuccess/onFail.
// Zwraca zaktualizowany stan albo, jeśli efekt przenosi grę gdzie indziej,
// gotową ramkę do natychmiastowego zwrócenia (pole `frame`). `cursor` to
// pozycja zaraz za krokiem, który wywołuje efekt — potrzebna, gdy efekt
// odkłada powrót (jump), żeby wznowienie nie powtórzyło tego kroku.
function applyEffect(ctx, state, events, entryId, effect, cursor) {
  if (effect.flag) {
    const nextState = setFlag(state, effect.flag);
    events.push({ kind: "flag", flag: effect.flag });
    return { state: nextState };
  }

  if (effect.hp) {
    const amount = rollDice(ctx.rng, effect.hp);
    const out = applyDamage(state, amount);
    events.push({ kind: "hp", amount });
    if (out.redirect) return { frame: jump(ctx, out.state, events, entryId, out.redirect, cursor) };
    return { state: out.state };
  }

  if (effect.heal) {
    const rolled = rollDice(ctx.rng, effect.heal);
    const nextState = restoreHp(state, rolled);
    events.push({ kind: "heal", amount: nextState.hp - state.hp, rolled });
    return { state: nextState };
  }

  if (effect.luck) {
    const rolled = rollDice(ctx.rng, effect.luck);
    const nextState = restoreLuck(state, rolled);
    events.push({ kind: "luck", amount: nextState.luck - state.luck, rolled });
    return { state: nextState };
  }

  if (effect.nextRollDice) {
    return { state: addNextRollDice(state, effect.nextRollDice) };
  }

  if (effect.san) {
    const amount = rollDice(ctx.rng, effect.san);
    const out = applySanLoss(state, amount, ctx.character, ctx.rng);
    events.push({ kind: "san", amount });
    if (out.redirect) return { frame: jump(ctx, out.state, events, entryId, out.redirect, cursor) };
    return { state: out.state };
  }

  if (effect.if && effect.goto) {
    if (!guardMatches(state, effect.if)) return { state };
    return { frame: continueAt(ctx, state, events, effect.goto) };
  }

  if (effect.goto) {
    if (effect.goto === "@return") {
      const back = popReturn(state);
      return { frame: returnTo(ctx, back.state, events, back.entryId, back.cursor) };
    }
    return { frame: continueAt(ctx, state, events, effect.goto) };
  }

  return null;
}

// Każdy rzut zatrzymuje grę, zanim skutek zdąży się wykonać: dopiero wtedy
// gracz wybiera, czy wynik przyjmuje, forsuje, dopłaca Szczęściem, czy poprawia
// zapis. Pending nosi wszystko, co potrzebne do wznowienia, więc cheat nie
// wymaga już cofania paragrafu po fakcie.
function pauseOnRoll(state, entryId, events, check, context) {
  const pending = {
    type: "rollDecision",
    kind: context.kind,
    roll: check,
    skill: context.skill,
    stepIndex: context.stepIndex,
    cursor: context.cursor,
    pushed: Boolean(context.pushed),
    ...decisionFor(state, check, context),
  };
  if (context.source === "choice") {
    pending.source = "choice";
    pending.choiceIndex = context.choiceIndex;
  }
  if (context.notation !== undefined) pending.notation = context.notation;
  return frameOf(state, entryId, events, pending, context.cursor);
}

// Wykonuje kroki z pola "on" od pozycji cursor, aż do końca albo do decyzji gracza.
function runSteps(ctx, frame) {
  const entry = entryOf(ctx, frame.entryId);
  const steps = entry.on ?? [];
  let { state, events, cursor } = frame;

  while (cursor < steps.length) {
    const step = steps[cursor];
    cursor += 1;

    if (step.newDay) {
      // Próg indefinite insanity liczy się w obrębie jednego dnia scenariusza.
      state = resetDay(state);
      continue;
    }

    if (step.bout) {
      const check = rollBout(state, ctx.character, ctx.rng);
      events.push({ kind: "roll", skill: "INT", ...check });
      return pauseOnRoll(state, frame.entryId, events, check, {
        kind: "bout", skill: "INT", stepIndex: cursor - 1, cursor,
      });
    }

    if (step.sanCheck) {
      const check = rollSanity(state, ctx.rng);
      events.push({ kind: "roll", skill: "Sanity", ...check });
      return pauseOnRoll(state, frame.entryId, events, check, {
        kind: "sanCheck", skill: "Sanity", notation: step.sanCheck,
        stepIndex: cursor - 1, cursor,
      });
    }

    if (step.roll) {
      const target = skillValue(state, ctx.character, step.roll);
      const queued = takeNextRollDice(state);
      state = queued.state;
      const dice = diceFor(state, step) + queued.dice;
      const check = skillCheck(ctx.rng, target, { dice, difficulty: step.difficulty ?? "regular" });
      events.push({ kind: "roll", skill: step.roll, ...check });
      return pauseOnRoll(state, frame.entryId, events, check, {
        kind: "skill", skill: step.roll, pushable: Boolean(step.push),
        stepIndex: cursor - 1, cursor,
      });
    }

    // Pozostałe rodzaje kroków (flag, hp, san, goto) dzielą logikę
    // z gałęziami onSuccess/onFail — patrz applyEffect.
    const outcome = applyEffect(ctx, state, events, frame.entryId, step, cursor);
    if (outcome) {
      if (outcome.frame) return outcome.frame;
      state = outcome.state;
      continue;
    }

    throw new Error(`Nieznany krok paragrafu ${frame.entryId}: ${JSON.stringify(step)}`);
  }

  return finish(ctx, state, frame.entryId, events);
}

// Skutki gałęzi onSuccess/onFail: albo skok, albo lista efektów wykonywana na miejscu.
// Efekty są tym samym słownikiem co kroki "on", ale bez rzutów — rzut w rzucie
// nie występuje w książce, więc świadomie go nie obsługujemy.
function applyBranch(ctx, state, events, entryId, step, branch, cursor) {
  const outcome = step[branch];
  if (!outcome) return runSteps(ctx, frameOf(state, entryId, events, null, cursor));
  if (!Array.isArray(outcome) && outcome.goto) {
    return continueAt(ctx, state, events, outcome.goto);
  }

  for (const effect of Array.isArray(outcome) ? outcome : [outcome]) {
    const applied = applyEffect(ctx, state, events, entryId, effect, cursor);
    if (!applied) throw new Error(`Nieznany efekt gałęzi ${branch} w paragrafie ${entryId}: ${JSON.stringify(effect)}`);
    if (applied.frame) return applied.frame;
    state = applied.state;
  }
  return runSteps(ctx, frameOf(state, entryId, events, null, cursor));
}

function jump(ctx, state, events, fromEntryId, toEntryId, cursor) {
  // Paragrafy systemowe wracają tam, skąd przyszły — dokładnie za krok,
  // który wywołał skok, żeby powrót nie powtórzył go po raz drugi.
  const withReturn = pushReturn(state, fromEntryId, cursor);
  events.push({ kind: "redirect", to: toEntryId });
  const forward = enter(ctx, withReturn, toEntryId);
  return mergeForward(events, forward);
}

function continueAt(ctx, state, events, entryId) {
  if (entryId === null) return finish(ctx, state, null, events);
  return mergeForward(events, enter(ctx, state, entryId));
}

// Powrót na odłożony paragraf: wznawiamy za krokiem, który spowodował skok,
// i nie emitujemy tekstu ponownie — gracz już go przeczytał.
function returnTo(ctx, state, events, entryId, cursor) {
  if (entryId === null) return finish(ctx, state, null, events);
  const entry = entryOf(ctx, entryId);
  if (!entry) {
    return frameOf(state, entryId, [...events, { kind: "missing", entryId }], { type: "missing" }, 0);
  }
  return runSteps(ctx, frameOf(state, entryId, events, null, cursor));
}

function finish(ctx, state, entryId, events) {
  const entry = entryOf(ctx, entryId);
  // Brak paragrafu oznacza pusty stos powrotu — traktujemy to jak koniec gry.
  if (!entry || entry.end) {
    events.push({ kind: "end" });
    return frameOf(state, entryId, events, { type: "end" }, 0);
  }
  const options = (entry?.choices ?? []).map((choice, index) => ({
    index,
    key: choice.text,
    goto: choice.goto,
    used: Boolean(choice.once) && isChoiceUsed(state, entryId, index),
    blocked: choice.if ? !guardMatches(state, choice.if) : false,
  }));
  if (options.length === 0) {
    throw new Error(`Paragraf ${entryId} nie ma ani wyborów, ani znacznika końca — błąd w danych`);
  }
  events.push({ kind: "choices", options });
  return frameOf(state, entryId, events, { type: "choices", options }, 0);
}

export function resume(ctx, frame, action) {
  if (action.type === "choose") {
    const option = frame.pending?.options?.[action.index];
    if (!option) throw new Error(`Paragraf ${frame.entryId} nie ma wyboru o numerze ${action.index}`);
    if (option.used || option.blocked) throw new Error(`Wybór ${action.index} jest niedostępny`);
    let state = option.used ? frame.state : useChoice(frame.state, frame.entryId, action.index);
    const entry = entryOf(ctx, frame.entryId);
    const choice = entry?.choices?.[action.index];
    const events = [];

    if (choice?.flag) {
      state = setFlag(state, choice.flag);
      events.push({ kind: "flag", flag: choice.flag });
    }

    // Niektóre decyzje (np. zabranie sztyletu w paragrafie 69) od razu
    // uruchamiają test. Źródło rzutu zostaje w pending, żeby wznowienie
    // wiedziało, którego kroku dotyczy decyzja.
    if (choice?.roll) {
      const target = skillValue(state, ctx.character, choice.roll);
      const queued = takeNextRollDice(state);
      state = queued.state;
      const dice = diceFor(state, choice) + queued.dice;
      const check = skillCheck(ctx.rng, target, { dice, difficulty: choice.difficulty ?? "regular" });
      events.push({ kind: "roll", skill: choice.roll, ...check });
      return pauseOnRoll(state, frame.entryId, events, check, {
        kind: "skill", skill: choice.roll, pushable: Boolean(choice.push),
        source: "choice", choiceIndex: action.index, stepIndex: action.index,
        cursor: (entry.on ?? []).length,
      });
    }

    return continueAt(ctx, state, events, option.goto);
  }

  if (frame.pending?.type !== "rollDecision") throw new Error(`Nieznana akcja: ${action.type}`);
  return decideRoll(ctx, frame, action);
}

function stepOfPending(ctx, frame) {
  const entry = entryOf(ctx, frame.entryId);
  const pending = frame.pending;
  if (pending.source === "choice") return (entry.choices ?? [])[pending.choiceIndex];
  return (entry.on ?? [])[pending.stepIndex];
}

// Zastosowanie werdyktu — tego, który wypadł, albo tego, który gracz wybrał.
// Rodzaj rzutu decyduje, co znaczy „skutek": gałąź paragrafu, utrata
// poczytalności albo kara ataku obłędu.
function applyRolled(ctx, frame, state, events, check) {
  const pending = frame.pending;

  if (pending.kind === "sanCheck") {
    const out = applySanityCheck(state, check, pending.notation, ctx.character, ctx.rng);
    events.push({ kind: "san", amount: out.lost });
    if (out.redirect) return jump(ctx, out.state, events, frame.entryId, out.redirect, pending.cursor);
    return runSteps(ctx, frameOf(out.state, frame.entryId, events, null, pending.cursor));
  }

  if (pending.kind === "bout") {
    const out = applyBout(state, check, ctx.rng);
    if (out.redirect) return continueAt(ctx, out.state, events, out.redirect);
    // Paragraf 329 mówi wprost, że po nieudanym rzucie INT wracamy tam, skąd
    // przyszliśmy — za krok, który spowodował skok (patrz returnTo).
    const back = popReturn(out.state);
    return returnTo(ctx, back.state, events, back.entryId, back.cursor);
  }

  const step = stepOfPending(ctx, frame);
  const branch = check.success
    ? "onSuccess"
    : (pending.pushed && step.onPushedFail ? "onPushedFail" : "onFail");
  return applyBranch(ctx, state, events, frame.entryId, step, branch, pending.cursor);
}

function decideRoll(ctx, frame, action) {
  const pending = frame.pending;

  if (action.type === "accept") {
    return applyRolled(ctx, frame, frame.state, [], pending.roll);
  }

  // Poprawiony zapis: kości zostają nietknięte, na ekranie ma zostać widoczne
  // kłamstwo, nie nowy rzut.
  if (action.type === "cheat") {
    const check = invertedRoll(pending.roll);
    const state = countCheat(frame.state);
    return applyRolled(ctx, frame, state, [{ kind: "roll", skill: pending.skill, ...check }], check);
  }

  if (action.type === "luck") {
    const state = spendLuck(frame.state, pending.luckCost);
    // Po dopłacie Luck rzut ląduje dokładnie na wymaganym progu, nie na pełnej umiejętności.
    const threshold = requiredThreshold(pending.roll.target, pending.roll.difficulty);
    const level = successLevel(threshold, pending.roll.target);
    const check = { ...pending.roll, result: threshold, level, success: true, spentLuck: pending.luckCost };
    return applyRolled(ctx, frame, state, [{ kind: "roll", skill: pending.skill, ...check }], check);
  }

  if (action.type === "push") {
    const step = stepOfPending(ctx, frame);
    const target = skillValue(frame.state, ctx.character, step.roll);
    const dice = diceFor(frame.state, step);
    const check = skillCheck(ctx.rng, target, { dice, difficulty: step.difficulty ?? "regular" });
    const events = [{ kind: "roll", skill: step.roll, pushed: true, ...check }];
    return pauseOnRoll(frame.state, frame.entryId, events, check, {
      kind: "skill", skill: step.roll, pushable: Boolean(step.push), pushed: true,
      source: pending.source, choiceIndex: pending.choiceIndex,
      stepIndex: pending.stepIndex, cursor: pending.cursor,
    });
  }

  throw new Error(`Nieznana akcja: ${action.type}`);
}
