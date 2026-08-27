import { serialize, deserialize, skillValue } from "../engine/state.js";
import { meetsDifficulty, successLevel } from "../engine/dice.js";
import { decisionFor } from "../engine/decision.js";

const KEY = "aats-save";
const VERSION = 2;
const PENDING_TYPES = new Set(["rollDecision", "choices", "end", "missing"]);
const ROLL_KINDS = new Set(["skill", "sanCheck", "bout"]);
const EVENT_TYPES = new Set(["text", "roll", "san", "hp", "heal", "luck", "flag", "missing", "choices", "redirect", "end"]);

function storageOrNull() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isNumberMap(value, predicate) {
  return isRecord(value) && Object.values(value).every(predicate);
}

function isChoice(option) {
  return isRecord(option)
    && isNonNegativeInteger(option.index)
    && typeof option.key === "string"
    && Number.isInteger(option.goto)
    && option.goto > 0
    && typeof option.used === "boolean"
    && typeof option.blocked === "boolean";
}

function isPending(pending) {
  if (!isRecord(pending) || !PENDING_TYPES.has(pending.type)) return false;

  if (pending.type === "choices") {
    return Array.isArray(pending.options)
      && pending.options.length > 0
      && pending.options.every(isChoice);
  }

  if (pending.type === "rollDecision") {
    const sourceValid = pending.source === undefined
      || (pending.source === "choice" && isNonNegativeInteger(pending.choiceIndex));
    const notationValid = pending.kind === "sanCheck"
      ? typeof pending.notation === "string" && pending.notation.includes("/")
      : pending.notation === undefined;
    return sourceValid
      && notationValid
      && ROLL_KINDS.has(pending.kind)
      && isRecord(pending.roll)
      && isFiniteNumber(pending.roll.target)
      && isFiniteNumber(pending.roll.result)
      && typeof pending.roll.difficulty === "string"
      && typeof pending.roll.level === "string"
      && typeof pending.roll.success === "boolean"
      && typeof pending.skill === "string"
      && typeof pending.canPush === "boolean"
      && typeof pending.canLuck === "boolean"
      && typeof pending.canCheat === "boolean"
      && typeof pending.pushed === "boolean"
      && isFiniteNumber(pending.luckCost)
      && isNonNegativeInteger(pending.stepIndex)
      && isNonNegativeInteger(pending.cursor);
  }

  return true;
}

function isEvent(event) {
  if (!isRecord(event) || !EVENT_TYPES.has(event.kind)) return false;
  if (event.kind === "text") return typeof event.key === "string";
  if (event.kind === "flag") return typeof event.flag === "string";
  if (event.kind === "choices") return Array.isArray(event.options) && event.options.every(isChoice);
  if (event.kind === "roll") {
    return typeof event.skill === "string"
      && (event.tens === undefined || (Array.isArray(event.tens) && event.tens.every(isFiniteNumber)));
  }
  return true;
}

// Archiwum dziennika jest tylko do odczytu i nie wpływa na przebieg gry,
// więc niepoprawny zapis odrzucamy w całości, ale bez unieważniania ramki.
function isLogRecord(record) {
  if (!isRecord(record)) return false;
  if (record.entryId !== null && !(Number.isInteger(record.entryId) && record.entryId > 0)) return false;
  if (record.originEntryId !== undefined && record.originEntryId !== null
    && !(Number.isInteger(record.originEntryId) && record.originEntryId > 0)) return false;
  return Array.isArray(record.events) && record.events.every(isEvent);
}

// Pamięć poznanych paragrafów dopisana do rekordu jest dodatkiem do archiwum:
// brak pola znaczy „nic nie było”, a nie uszkodzony zapis. Dlatego wersja
// zapisu nie rośnie i starsze taśmy wczytują się bez zmian.
function seenMap(value) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, seen]) => seen === true));
}

function listMap(value, itemIsValid) {
  if (!isRecord(value)) return {};
  const clean = {};
  for (const [key, list] of Object.entries(value)) {
    if (Array.isArray(list) && list.length > 0 && list.every(itemIsValid)) clean[key] = [...list];
  }
  return clean;
}

function withMemory(record, clean) {
  const seenEntries = seenMap(record.seenEntries);
  const takenChoices = Array.isArray(record.takenChoices)
    ? record.takenChoices.filter(isNonNegativeInteger)
    : [];
  const rollHistory = listMap(record.rollHistory, (branch) => typeof branch === "string");

  if (record.seenBefore === true) clean.seenBefore = true;
  if (Object.keys(seenEntries).length) clean.seenEntries = seenEntries;
  if (takenChoices.length) clean.takenChoices = takenChoices;
  if (Object.keys(rollHistory).length) clean.rollHistory = rollHistory;
  return clean;
}

function sanitizeLog(value) {
  if (!Array.isArray(value) || !value.every(isLogRecord)) return [];
  return value.map((record) => withMemory(record, {
    entryId: record.entryId,
    originEntryId: record.originEntryId ?? null,
    events: record.events,
  }));
}

function isState(state, characterId) {
  if (!isRecord(state) || state.characterId !== characterId) return false;

  if (!isFiniteNumber(state.hp) || state.hp < 0) return false;
  if (!isFiniteNumber(state.maxHp) || state.maxHp <= 0 || state.hp > state.maxHp) return false;
  if (!isFiniteNumber(state.san) || state.san < 0) return false;
  if (!isFiniteNumber(state.startingSan) || state.startingSan < 0) return false;
  if (!isFiniteNumber(state.mp) || state.mp < 0) return false;
  if (!isFiniteNumber(state.luck) || state.luck < 0 || state.luck > 100) return false;
  if (!isFiniteNumber(state.sanLostToday) || state.sanLostToday < 0) return false;

  if (!Array.isArray(state.flags) || !state.flags.every((flag) => typeof flag === "string")) return false;
  if (!isNumberMap(state.visits, isNonNegativeInteger)) return false;
  if (!isRecord(state.usedChoices) || !Object.values(state.usedChoices).every((choices) => (
    Array.isArray(choices) && choices.every(isNonNegativeInteger)
  ))) return false;
  if (!isNumberMap(state.penalties, isNonNegativeInteger)) return false;
  if (state.nextRollDice !== undefined && !Number.isInteger(state.nextRollDice)) return false;
  // Starsze zapisy nie mają licznika odwróconych werdyktów; brak = zero.
  if (state.cheats !== undefined && !isNonNegativeInteger(state.cheats)) return false;

  if (!Array.isArray(state.returnStack) || !state.returnStack.every((frame) => (
    isRecord(frame)
    && Number.isInteger(frame.entryId)
    && frame.entryId > 0
    && isNonNegativeInteger(frame.cursor)
  ))) return false;
  if (!Array.isArray(state.visitedBouts) || !state.visitedBouts.every((id) => Number.isInteger(id))) return false;
  if (typeof state.majorWound !== "boolean" || typeof state.indefinitelyInsane !== "boolean") return false;

  return true;
}

function isFrame(frame, characterId) {
  if (!isRecord(frame)) return false;
  if (!(Number.isInteger(frame.entryId) && frame.entryId > 0) && frame.entryId !== null) return false;
  if (frame.entryId === null && frame.pending?.type !== "end") return false;
  if (!isNonNegativeInteger(frame.cursor)) return false;
  if (!Array.isArray(frame.events) || !frame.events.every(isEvent)) return false;
  if (!isPending(frame.pending)) return false;
  return isState(frame.state, characterId);
}

function sameChoice(left, right) {
  return left.index === right.index
    && left.key === right.key
    && left.goto === right.goto
    && left.used === right.used
    && left.blocked === right.blocked;
}

function sameChoices(left, right) {
  return left.length === right.length && left.every((option, index) => sameChoice(option, right[index]));
}

function guardMatches(state, condition) {
  const parts = Array.isArray(condition) ? condition : [condition];
  return parts.every((part) => {
    if (typeof part === "string") return state.flags.includes(part);
    if (!isRecord(part)) throw new Error("invalid choice guard");
    if ("visits" in part) return (state.visits[part.entry ?? null] ?? 0) === part.visits;
    if ("not" in part) return !state.flags.includes(part.not);
    throw new Error("unknown choice guard");
  });
}

function compatibleChoices(frame, entry) {
  const source = entry?.choices;
  const options = frame.pending.options;
  if (!Array.isArray(source) || source.length === 0 || frame.cursor !== 0) return false;
  if (source.length !== options.length) return false;

  for (let index = 0; index < source.length; index += 1) {
    const expected = source[index];
    const actual = options[index];
    if (actual.index !== index || actual.key !== expected.text || actual.goto !== expected.goto) return false;
    const used = Boolean(expected.once) && (frame.state.usedChoices[String(frame.entryId)] ?? []).includes(index);
    if (actual.used !== used) return false;
    const blocked = expected.if ? !guardMatches(frame.state, expected.if) : false;
    if (actual.blocked !== blocked) return false;
  }

  const choiceEvents = frame.events.filter((event) => event.kind === "choices");
  return choiceEvents.length === 1
    && frame.events.at(-1) === choiceEvents[0]
    && sameChoices(choiceEvents[0].options, options);
}

// Pending musi dać się odtworzyć z danych: krok, do którego wraca, wciąż ma
// ten sam rodzaj rzutu, a dostępność decyzji wychodzi z tego samego modułu,
// z którego liczy ją silnik.
function compatibleRoll(frame, entry, character) {
  const pending = frame.pending;
  const fromChoice = pending.source === "choice";
  const step = fromChoice
    ? entry?.choices?.[pending.choiceIndex]
    : entry?.on?.[pending.stepIndex];
  if (!isRecord(step)) return false;
  if (frame.cursor !== pending.cursor) return false;
  if (fromChoice) {
    if (pending.kind !== "skill" || pending.stepIndex !== pending.choiceIndex) return false;
    if (pending.cursor !== (entry?.on ?? []).length) return false;
  } else if (pending.cursor !== pending.stepIndex + 1) {
    // Pauza na kroku zawsze wraca za ten krok. Kursor przesunięty dalej kazałby
    // po wczytaniu pominąć kroki między nimi — obrażenia, flagi, skoki.
    return false;
  }

  let target;
  let pushable = false;
  try {
    if (pending.kind === "skill") {
      if (typeof step.roll !== "string" || step.roll !== pending.skill) return false;
      if (pending.roll.difficulty !== (step.difficulty ?? "regular")) return false;
      target = skillValue(frame.state, character, step.roll);
      pushable = Boolean(step.push);
    } else if (pending.kind === "sanCheck") {
      if (step.sanCheck !== pending.notation || pending.skill !== "Sanity") return false;
      if (pending.roll.difficulty !== "regular") return false;
      target = frame.state.san;
    } else {
      if (!step.bout || pending.skill !== "INT") return false;
      if (pending.roll.difficulty !== "regular") return false;
      target = skillValue(frame.state, character, "INT");
    }
  } catch {
    return false;
  }
  if (pending.roll.target !== target) return false;

  // Werdykt wynika z wyniku, progu i trudności, więc go przeliczamy: sam
  // `success` przestawiony na `true` przepuszczałby zapis, który po wczytaniu
  // idzie gałęzią sukcesu, bo `decisionFor` kończy wtedy na kształcie sukcesu.
  const level = successLevel(pending.roll.result, target);
  if (pending.roll.level !== level) return false;
  if (pending.roll.success !== meetsDifficulty(level, pending.roll.difficulty)) return false;

  const expected = decisionFor(frame.state, pending.roll, {
    kind: pending.kind, skill: pending.skill, pushable, pushed: pending.pushed,
  });
  if (pending.canPush !== expected.canPush
    || pending.canLuck !== expected.canLuck
    || pending.luckCost !== expected.luckCost
    || pending.canCheat !== expected.canCheat) return false;

  const rollEvents = frame.events.filter((event) => event.kind === "roll");
  const event = rollEvents.at(-1);
  return Boolean(event)
    && event.skill === pending.skill
    && event.result === pending.roll.result
    && event.target === pending.roll.target
    && event.difficulty === pending.roll.difficulty
    // Znacznik forsowania nosi tylko zdarzenie rzutu przepchniętego, więc brak
    // pola znaczy „nieforsowany". Bez tego porównania zapis mógłby dorobić
    // sobie gałąź onPushedFail albo odzyskać zużyte forsowanie.
    && Boolean(event.pushed) === pending.pushed;
}

// Structural validation belongs to loadGame; this second pass ties the frame to
// the currently loaded story and character before main.js exposes any controls.
export function isSaveCompatible(saved, story, character) {
  try {
    if (!isRecord(saved) || !isRecord(story) || !isRecord(story.entries)) return false;
    if (!isRecord(character) || saved.characterId !== character.id) return false;
    if (!isFrame(saved.frame, saved.characterId)) return false;
    if (saved.frame.state.maxHp !== character.hp
      || saved.frame.state.startingSan !== character.san
      || saved.frame.state.mp !== character.mp) return false;
    if (saved.originEntryId !== null) {
      if (!Number.isInteger(saved.originEntryId) || saved.originEntryId <= 0) return false;
      if (!story.entries[String(saved.originEntryId)]) return false;
    }

    const frame = saved.frame;
    const entry = frame.entryId === null ? null : story.entries[String(frame.entryId)];
    if (frame.pending.type === "choices") return compatibleChoices(frame, entry);
    if (frame.pending.type === "rollDecision") return compatibleRoll(frame, entry, character);
    if (frame.pending.type === "end") {
      return frame.cursor === 0
        && (frame.entryId === null || Boolean(entry?.end))
        && frame.events.at(-1)?.kind === "end";
    }
    if (frame.pending.type === "missing") {
      return frame.cursor === 0
        && frame.entryId !== null
        && !entry
        && frame.events.at(-1)?.kind === "missing"
        && frame.events.at(-1)?.entryId === frame.entryId;
    }
    return false;
  } catch {
    return false;
  }
}

function discard(storage) {
  try {
    storage?.removeItem?.(KEY);
  } catch {
    // A blocked store must not prevent the game from starting without a save.
  }
}

export function saveGame({ characterId, frame, originEntryId = null, log = [] }) {
  const storage = storageOrNull();
  try {
    const savedFrame = {
      entryId: frame.entryId,
      events: frame.events,
      pending: frame.pending,
      cursor: frame.cursor,
      state: serialize(frame.state),
    };
    storage?.setItem?.(KEY, JSON.stringify({
      version: VERSION,
      characterId,
      originEntryId,
      frame: savedFrame,
      log: sanitizeLog(log),
    }));
  } catch {
    // Quota errors and privacy settings disable autosave, not the game.
  }
}

// Invalid, incomplete, or older saves are discarded so the caller can start fresh.
export function loadGame() {
  const storage = storageOrNull();
  if (!storage) return null;

  try {
    const raw = storage.getItem?.(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== VERSION) throw new Error("unsupported save version");
    if (typeof parsed.characterId !== "string" || !parsed.characterId.trim()) throw new Error("missing character");
    if (parsed.originEntryId !== null && (!Number.isInteger(parsed.originEntryId) || parsed.originEntryId <= 0)) {
      throw new Error("invalid origin entry");
    }
    if (!isRecord(parsed.frame)) throw new Error("missing frame");

    const frame = { ...parsed.frame, state: deserialize(parsed.frame.state) };
    if (!isFrame(frame, parsed.characterId)) throw new Error("invalid frame");
    return {
      characterId: parsed.characterId,
      originEntryId: parsed.originEntryId,
      frame,
      log: sanitizeLog(parsed.log),
    };
  } catch {
    discard(storage);
    return null;
  }
}

export function clearSave() {
  discard(storageOrNull());
}
