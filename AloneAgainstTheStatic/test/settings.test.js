import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createSettings } from "../src/ui/settings.js";

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

function defineGlobal(name, value) {
  Object.defineProperty(globalThis, name, { configurable: true, value });
}

function restoreGlobal(name, descriptor) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else delete globalThis[name];
}

function memoryStorage(initial = null) {
  const values = new Map();
  if (initial !== null) values.set("aats-settings", JSON.stringify(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    read(key) { return values.get(key) ?? null; },
  };
}

function fakeDocument() {
  const properties = new Map();
  return {
    properties,
    documentElement: {
      style: { setProperty(key, value) { properties.set(key, value); } },
    },
  };
}

afterEach(() => {
  restoreGlobal("localStorage", originalStorage);
  restoreGlobal("document", originalDocument);
});

test("domyślne ustawienia działają bez localStorage i document", () => {
  delete globalThis.localStorage;
  delete globalThis.document;

  let settings;
  assert.doesNotThrow(() => { settings = createSettings(); });
  assert.deepEqual(settings.values, {
    narration: true,
    narrationVolume: 0.9,
    musicVolume: 0.4,
    scanlines: 0.05,
    proseSize: 1.05,
  });
  assert.equal(Object.isFrozen(settings.values), true);
});

test("odczyt przycina liczby, odrzuca obce pola i stosuje CSS", () => {
  const storage = memoryStorage({
    narration: false,
    narrationVolume: 3,
    musicVolume: -2,
    scanlines: 0.8,
    proseSize: 0.2,
    injected: "ignored",
  });
  const doc = fakeDocument();
  defineGlobal("localStorage", storage);
  defineGlobal("document", doc);

  const settings = createSettings();

  assert.deepEqual(settings.values, {
    narration: false,
    narrationVolume: 1,
    musicVolume: 0,
    scanlines: 0.15,
    proseSize: 0.9,
  });
  assert.equal(doc.properties.get("--scanline-strength"), "0.15");
  assert.equal(doc.properties.get("--prose-size"), "0.9rem");
  assert.equal("injected" in settings.values, false);
});

test("nieprawidłowe typy z magazynu spadają na wartości domyślne", () => {
  defineGlobal("localStorage", memoryStorage({
    narration: "yes",
    narrationVolume: "1",
    musicVolume: null,
    scanlines: Number.NaN,
    proseSize: {},
  }));

  assert.deepEqual(createSettings().values, {
    narration: true,
    narrationVolume: 0.9,
    musicVolume: 0.4,
    scanlines: 0.05,
    proseSize: 1.05,
  });
});

test("set przycina zakres, zapisuje wyłącznie znany schemat i aktualizuje CSS", () => {
  const storage = memoryStorage();
  const doc = fakeDocument();
  defineGlobal("localStorage", storage);
  defineGlobal("document", doc);
  const settings = createSettings();

  assert.equal(settings.set("scanlines", 9), true);
  assert.equal(settings.set("proseSize", 0), true);
  assert.equal(settings.set("musicVolume", -1), true);
  assert.equal(settings.set("unknown", 4), false);
  assert.equal(settings.set("narration", "false"), false);

  assert.equal(settings.values.scanlines, 0.15);
  assert.equal(settings.values.proseSize, 0.9);
  assert.equal(settings.values.musicVolume, 0);
  assert.equal(doc.properties.get("--scanline-strength"), "0.15");
  assert.equal(doc.properties.get("--prose-size"), "0.9rem");
  assert.deepEqual(Object.keys(JSON.parse(storage.read("aats-settings"))).sort(), Object.keys(settings.values).sort());
});

test("blokada storage i DOM nie przerywa zmian ani powiadomień", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new Error("blocked"); },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    get() { throw new Error("no DOM"); },
  });

  const settings = createSettings();
  let observed = null;
  settings.subscribe((values) => { observed = values.musicVolume; });

  assert.doesNotThrow(() => settings.set("musicVolume", 0.75));
  assert.equal(settings.values.musicVolume, 0.75);
  assert.equal(observed, 0.75);
});

test("unsubscribe zatrzymuje powiadomienia, a błąd odbiorcy jest izolowany", () => {
  const settings = createSettings();
  const observed = [];
  settings.subscribe(() => { throw new Error("listener failure"); });
  const unsubscribe = settings.subscribe((values) => observed.push(values.narrationVolume));

  assert.doesNotThrow(() => settings.set("narrationVolume", 0.5));
  assert.equal(unsubscribe(), true);
  assert.equal(unsubscribe(), false);
  settings.set("narrationVolume", 0.25);

  assert.deepEqual(observed, [0.5]);
});
