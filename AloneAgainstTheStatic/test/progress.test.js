import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  markChoice, markEntry, markRoll, readProgress, resetProgress, rollBranch,
} from "../src/ui/progress.js";

const KEY = "aats-progress";
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

function useStorage(storage) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
}

function memoryStorage() {
  const values = new Map();
  return {
    removed: [],
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { this.removed.push(key); values.delete(key); },
    read(key) { return values.get(key) ?? null; },
  };
}

afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete globalThis.localStorage;
});

test("readProgress bez magazynu zwraca pusty, poprawny obiekt", () => {
  delete globalThis.localStorage;
  assert.deepEqual(readProgress(), { entries: {}, choices: {}, rolls: {} });
});

test("markEntry zapisuje i inkrementuje licznik wizyt", () => {
  useStorage(memoryStorage());

  let snapshot = markEntry(31);
  assert.deepEqual(snapshot.entries, { 31: 1 });

  snapshot = markEntry(31);
  assert.deepEqual(snapshot.entries, { 31: 2 });

  snapshot = markEntry(5);
  assert.deepEqual(snapshot.entries, { 31: 2, 5: 1 });

  assert.deepEqual(readProgress().entries, { 31: 2, 5: 1 });
});

test("markChoice jest idempotentny — powtórzony indeks nie dubluje wpisu", () => {
  useStorage(memoryStorage());

  let snapshot = markChoice(31, 0);
  assert.deepEqual(snapshot.choices, { 31: [0] });

  snapshot = markChoice(31, 0);
  assert.deepEqual(snapshot.choices, { 31: [0] });

  snapshot = markChoice(31, 1);
  assert.deepEqual(snapshot.choices, { 31: [0, 1] });
});

test("markRoll jest idempotentny i klucz łączy paragraf z umiejętnością", () => {
  useStorage(memoryStorage());

  let snapshot = markRoll(117, "Intimidate", "success");
  assert.deepEqual(snapshot.rolls, { "117:Intimidate": ["success"] });

  snapshot = markRoll(117, "Intimidate", "success");
  assert.deepEqual(snapshot.rolls, { "117:Intimidate": ["success"] });

  snapshot = markRoll(117, "Intimidate", "fail");
  assert.deepEqual(snapshot.rolls, { "117:Intimidate": ["success", "fail"] });

  snapshot = markRoll(117, "Listen", "pushedFail");
  assert.deepEqual(snapshot.rolls, {
    "117:Intimidate": ["success", "fail"],
    "117:Listen": ["pushedFail"],
  });
});

test("uszkodzony JSON jest odrzucany i kasowany", () => {
  const storage = memoryStorage();
  storage.setItem(KEY, "{ not json");
  useStorage(storage);

  assert.deepEqual(readProgress(), { entries: {}, choices: {}, rolls: {} });
  assert.deepEqual(storage.removed, [KEY]);
});

test("obca wersja jest odrzucana i kasowana", () => {
  const storage = memoryStorage();
  storage.setItem(KEY, JSON.stringify({ version: 99, entries: {}, choices: {}, rolls: {} }));
  useStorage(storage);

  assert.deepEqual(readProgress(), { entries: {}, choices: {}, rolls: {} });
  assert.deepEqual(storage.removed, [KEY]);
});

test("niepoprawny kształt danych (np. ujemny licznik) jest odrzucany w całości", () => {
  const storage = memoryStorage();
  storage.setItem(KEY, JSON.stringify({ version: 1, entries: { 31: -1 }, choices: {}, rolls: {} }));
  useStorage(storage);
  assert.deepEqual(readProgress(), { entries: {}, choices: {}, rolls: {} });
});

test("niepoprawna gałąź rzutu jest odrzucana w całości", () => {
  const storage = memoryStorage();
  storage.setItem(KEY, JSON.stringify({
    version: 1, entries: {}, choices: {}, rolls: { "117:Intimidate": ["nope"] },
  }));
  useStorage(storage);
  assert.deepEqual(readProgress(), { entries: {}, choices: {}, rolls: {} });
});

test("localStorage rzucający przy getItem nie przerywa działania", () => {
  useStorage({
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  });

  assert.doesNotThrow(() => readProgress());
  assert.deepEqual(readProgress(), { entries: {}, choices: {}, rolls: {} });
});

test("localStorage rzucający przy setItem nie przerywa zapisu — pamięć milczy dalej", () => {
  useStorage({
    getItem() { return null; },
    setItem() { throw new Error("quota"); },
    removeItem() { throw new Error("quota"); },
  });

  let snapshot;
  assert.doesNotThrow(() => { snapshot = markEntry(31); });
  assert.deepEqual(snapshot.entries, { 31: 1 });
});

test("resetProgress kasuje wpis i zwraca pusty snapshot", () => {
  const storage = memoryStorage();
  useStorage(storage);
  markEntry(31);
  markChoice(31, 0);

  const snapshot = resetProgress();
  assert.deepEqual(snapshot, { entries: {}, choices: {}, rolls: {} });
  assert.deepEqual(storage.removed, [KEY]);
  assert.deepEqual(readProgress(), { entries: {}, choices: {}, rolls: {} });
});

test("rollBranch wylicza gałąź ze zdarzenia rzutu", () => {
  assert.equal(rollBranch({ success: true, pushed: false }), "success");
  assert.equal(rollBranch({ success: true, pushed: true }), "success");
  assert.equal(rollBranch({ success: false, pushed: true }), "pushedFail");
  assert.equal(rollBranch({ success: false, pushed: false }), "fail");
});
