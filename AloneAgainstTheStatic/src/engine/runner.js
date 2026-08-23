import { rollDice, skillCheck, successLevel } from "./dice.js";
import {
  hasFlag, setFlag, visit, visitCount, useChoice, isChoiceUsed,
  spendLuck, penaltyFor, popReturn, pushReturn, skillValue,
} from "./state.js";
import { applyDamage, applySanLoss, sanityCheck, resolveBout, resetDay } from "./rules.js";

// Ramka opisuje wykonanie jednego paragrafu. Interpreter zatrzymuje się,
// gdy potrzebuje decyzji gracza, i wznawia przez resume().
function frameOf(state, entryId, events, pending, cursor) {
  return { state, entryId, events, pending, cursor };
}

function entryOf(ctx, id) {
  return ctx.story.entries[String(id)] ?? null;
}

// Ile trzeba dobić, żeby trafić w wymagany próg — przy Hard i Extreme
// próg jest niższy niż pełna wartość umiejętności.
function requiredThreshold(target, difficulty = "regular") {
  if (difficulty === "hard") return Math.floor(target / 2);
  if (difficulty === "extreme") return Math.floor(target / 5);
  return target;
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
      return frameOf(forward.state, forward.entryId, [...events, ...forward.events], forward.pending, forward.cursor);
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

  if (effect.san) {
    const amount = rollDice(ctx.rng, effect.san);
    const out = applySanLoss(state, amount, ctx.character, ctx.rng);
    events.push({ kind: "san", amount });
    if (out.redirect) return { frame: jump(ctx, out.state, events, entryId, out.redirect, cursor) };
    return { state: out.state };
  }

  if (effect.sanCheck) {
    const out = sanityCheck(state, ctx.character, ctx.rng, effect.sanCheck);
    events.push({ kind: "san", amount: out.lost, roll: out.roll });
    if (out.redirect) return { frame: jump(ctx, out.state, events, entryId, out.redirect, cursor) };
    return { state: out.state };
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
      const out = resolveBout(state, ctx.character, ctx.rng);
      state = out.state;
      events.push({ kind: "roll", skill: "INT", ...out.check });
      if (out.redirect) return continueAt(ctx, state, events, out.redirect);
      // Nieudany rzut INT: paragraf 329 mówi wprost, że wracamy tam, skąd
      // przyszliśmy — ale za krokiem, który spowodował skok (patrz returnTo).
      const back = popReturn(state);
      return returnTo(ctx, back.state, events, back.entryId, back.cursor);
    }

    if (step.roll) {
      const target = skillValue(state, ctx.character, step.roll);
      const dice = (step.dice ?? 0) + penaltyFor(state, step.roll);
      const check = skillCheck(ctx.rng, target, { dice, difficulty: step.difficulty ?? "regular" });
      events.push({ kind: "roll", skill: step.roll, ...check });

      if (check.success) return applyBranch(ctx, state, events, frame.entryId, step, "onSuccess", cursor);

      // Wydanie Luck jest dostępne przy każdym nieudanym rzucie, na który gracza
      // stać — niezależnie od tego, czy paragraf oferuje przepchnięcie — z wyjątkiem
      // rzutów na Sanity (nie ratuje samej siebie) i na Luck (nie można ratować
      // rzutu Luck wydaniem punktów Luck). Koszt liczymy od progu wymaganego przez
      // difficulty, nie od pełnej umiejętności, bo przy Hard/Extreme dałoby to
      // zaniżony albo ujemny koszt.
      const threshold = requiredThreshold(target, step.difficulty ?? "regular");
      const luckCost = check.result - threshold;
      const canLuck = step.roll !== "Sanity" && step.roll !== "Luck" && state.luck >= luckCost && luckCost > 0;
      const pendingDecision = {
        type: "rollDecision",
        roll: check,
        skill: step.roll,
        canPush: Boolean(step.push),
        canLuck,
        luckCost,
        stepIndex: cursor - 1,
      };
      if (pendingDecision.canPush || canLuck) {
        return frameOf(state, frame.entryId, events, pendingDecision, cursor - 1);
      }
      return applyBranch(ctx, state, events, frame.entryId, step, "onFail", cursor);
    }

    // Pozostałe rodzaje kroków (flag, hp, san, sanCheck, goto) dzielą logikę
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
  return frameOf(forward.state, forward.entryId, [...events, ...forward.events], forward.pending, forward.cursor);
}

function continueAt(ctx, state, events, entryId) {
  if (entryId === null) return finish(ctx, state, null, events);
  const forward = enter(ctx, state, entryId);
  return frameOf(forward.state, forward.entryId, [...events, ...forward.events], forward.pending, forward.cursor);
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
    const state = option.used ? frame.state : useChoice(frame.state, frame.entryId, action.index);
    return continueAt(ctx, state, [], option.goto);
  }

  const entry = entryOf(ctx, frame.entryId);
  const step = (entry.on ?? [])[frame.cursor];
  const cursor = frame.cursor + 1;

  if (action.type === "luck") {
    const state = spendLuck(frame.state, frame.pending.luckCost);
    // Po dopłacie Luck rzut ląduje dokładnie na wymaganym progu, nie na pełnej umiejętności.
    const threshold = requiredThreshold(frame.pending.roll.target, frame.pending.roll.difficulty);
    const level = successLevel(threshold, frame.pending.roll.target);
    const check = { ...frame.pending.roll, result: threshold, level, success: true, spentLuck: frame.pending.luckCost };
    const events = [{ kind: "roll", skill: step.roll, ...check }];
    return applyBranch(ctx, state, events, frame.entryId, step, "onSuccess", cursor);
  }

  if (action.type === "push") {
    const target = skillValue(frame.state, ctx.character, step.roll);
    const dice = (step.dice ?? 0) + penaltyFor(frame.state, step.roll);
    const check = skillCheck(ctx.rng, target, { dice, difficulty: step.difficulty ?? "regular" });
    const events = [{ kind: "roll", skill: step.roll, pushed: true, ...check }];
    const branch = check.success ? "onSuccess" : "onFail";
    return applyBranch(ctx, frame.state, events, frame.entryId, step, branch, cursor);
  }

  if (action.type === "accept") {
    return applyBranch(ctx, frame.state, [], frame.entryId, step, "onFail", cursor);
  }

  throw new Error(`Nieznana akcja: ${action.type}`);
}
