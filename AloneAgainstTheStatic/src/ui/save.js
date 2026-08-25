import { serialize, deserialize, skillValue } from "../engine/state.js";

const KEY = "aats-save";
const VERSION = 2;
const PENDING_TYPES = new Set(["rollDecision", "choices", "end", "missing"]);
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
    return sourceValid
      && isRecord(pending.roll)
      && isFiniteNumber(pending.roll.target)
      && isFiniteNumber(pending.roll.result)
      && typeof pending.roll.difficulty === "string"
      && typeof pending.skill === "string"
      && typeof pending.canPush === "boolean"
      && typeof pending.canLuck === "boolean"
      && isNonNegativeInteger(pending.luckCost)
      && isNonNegativeInteger(pending.stepIndex)
      && (pending.canPush || pending.canLuck);
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

function sanitizeLog(value) {
  if (!Array.isArray(value) || !value.every(isLogRecord)) return [];
  return value.map((record) => ({
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

function requiredThreshold(target, difficulty) {
  if (difficulty === "hard") return Math.floor(target / 2);
  if (difficulty === "extreme") return Math.floor(target / 5);
  return target;
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

function compatibleRoll(frame, entry, character) {
  const pending = frame.pending;
  const fromChoice = pending.source === "choice";
  const step = fromChoice
    ? entry?.choices?.[pending.choiceIndex]
    : entry?.on?.[frame.cursor];
  if (!isRecord(step) || typeof step.roll !== "string") return false;
  if (fromChoice) {
    if (frame.cursor !== 0 || pending.stepIndex !== pending.choiceIndex) return false;
  } else if (pending.stepIndex !== frame.cursor) return false;
  if (pending.skill !== step.roll) return false;
  if (pending.canPush !== Boolean(step.push)) return false;
  if (pending.roll.difficulty !== (step.difficulty ?? "regular")) return false;

  let target;
  try {
    target = skillValue(frame.state, character, step.roll);
  } catch {
    return false;
  }
  if (pending.roll.target !== target) return false;

  const threshold = requiredThreshold(target, pending.roll.difficulty);
  const luckCost = pending.roll.result - threshold;
  const canLuck = step.roll !== "Sanity"
    && step.roll !== "Luck"
    && frame.state.luck >= luckCost
    && luckCost > 0;
  if (pending.luckCost !== luckCost || pending.canLuck !== canLuck) return false;

  const rollEvents = frame.events.filter((event) => event.kind === "roll");
  const event = rollEvents.at(-1);
  return Boolean(event)
    && event.skill === pending.skill
    && event.result === pending.roll.result
    && event.target === pending.roll.target
    && event.difficulty === pending.roll.difficulty;
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
