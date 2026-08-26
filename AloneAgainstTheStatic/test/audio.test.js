import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createAudio } from "../src/ui/audio.js";

const originals = {
  Audio: Object.getOwnPropertyDescriptor(globalThis, "Audio"),
  document: Object.getOwnPropertyDescriptor(globalThis, "document"),
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
};

let intervals;
let nextTimer;
let audioInstances;
let playMode;
let listeners;

class FakeAudio {
  constructor(src) {
    this.src = String(src);
    this.volume = 1;
    this.loop = false;
    this.paused = false;
    this.duration = 60;
    this.currentTime = 0;
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.handlers = new Map();
    audioInstances.push(this);
  }

  addEventListener(name, handler) {
    this.handlers.set(name, handler);
  }

  emit(name) {
    this.handlers.get(name)?.();
  }

  play() {
    this.playCalls += 1;
    this.paused = false;
    if (playMode === "throw") throw new Error("audio unavailable");
    if (playMode === "reject") return Promise.reject(new Error("autoplay blocked"));
    return Promise.resolve();
  }

  pause() {
    this.pauseCalls += 1;
    this.paused = true;
  }
}

function fakeSettings(overrides = {}) {
  const subscribers = [];
  return {
    values: {
      narration: true,
      narrationVolume: 0.9,
      musicVolume: 0.4,
      ...overrides,
    },
    subscribe(listener) { subscribers.push(listener); },
    update(values) {
      this.values = { ...this.values, ...values };
      for (const listener of subscribers) listener(this.values);
    },
  };
}

// Jeden tick timera = 50 ms; przewijamy też pozycję odtwarzania utworów.
function tick(count = 1) {
  for (let index = 0; index < count; index += 1) {
    for (const node of audioInstances) {
      if (!node.paused) node.currentTime = Math.min(node.duration, node.currentTime + 0.05);
    }
    for (const callback of [...intervals.values()]) callback();
  }
}

function music(tracks = ["media/music/a.mp3", "media/music/b.mp3", "media/music/c.mp3"]) {
  return tracks;
}

beforeEach(() => {
  intervals = new Map();
  nextTimer = 1;
  audioInstances = [];
  playMode = "resolve";
  listeners = new Map();
  Object.defineProperty(globalThis, "Audio", { configurable: true, value: FakeAudio });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      addEventListener(name, handler) { listeners.set(name, handler); },
      removeEventListener(name) { listeners.delete(name); },
    },
  });
  globalThis.setInterval = (callback) => {
    const id = nextTimer++;
    intervals.set(id, callback);
    return id;
  };
  globalThis.clearInterval = (id) => intervals.delete(id);
});

afterEach(() => {
  for (const key of ["Audio", "document"]) {
    if (originals[key]) Object.defineProperty(globalThis, key, originals[key]);
    else delete globalThis[key];
  }
  globalThis.setInterval = originals.setInterval;
  globalThis.clearInterval = originals.clearInterval;
});

test("brak zasobu oznacza ciszę bez tworzenia Audio", () => {
  const audio = createAudio({ entries: {} }, fakeSettings());

  assert.doesNotThrow(() => audio.playNarration(1, "pl"));
  assert.doesNotThrow(() => audio.startMusic([]));
  assert.deepEqual(audioInstances, []);
  assert.equal(intervals.size, 0);
});

test("lektor zatrzymuje poprzedni wpis i reaguje na ustawienia", () => {
  const settings = fakeSettings();
  const audio = createAudio({ entries: { 1: { audio: { en: "media/narration/1-en.mp3" } } } }, settings);

  audio.playNarration(1, "en");
  const narration = audioInstances[0];
  assert.equal(narration.volume, 0.9);
  assert.equal(narration.playCalls, 1);

  settings.update({ narrationVolume: 0.35 });
  assert.equal(narration.volume, 0.35);
  settings.update({ narration: false });
  assert.equal(narration.paused, true);

  audio.playNarration(1, "en");
  assert.equal(audioInstances.length, 1);
});

test("muzyka rusza od razu i narasta do poziomu suwaka", () => {
  const audio = createAudio({}, fakeSettings());
  audio.startMusic(music());

  const first = audioInstances[0];
  assert.equal(first.playCalls, 1);
  assert.equal(first.loop, false);
  assert.equal(first.volume, 0);

  tick(60);
  assert.ok(first.volume > 0 && first.volume < 0.4);
  tick(60);
  assert.ok(Math.abs(first.volume - 0.4) < 1e-9);
});

test("kolejny utwór wchodzi przenikaniem na 6 sekund przed końcem", () => {
  const audio = createAudio({}, fakeSettings());
  audio.startMusic(music());

  const first = audioInstances[0];
  tick(120);
  first.currentTime = first.duration - 6.01;
  tick(1);

  assert.equal(audioInstances.length, 2);
  const second = audioInstances[1];
  assert.notEqual(second.src, first.src);

  tick(60);
  assert.ok(first.volume < 0.4 && first.volume > 0, "poprzedni utwór wygasa");
  assert.ok(second.volume > 0 && second.volume < 0.4, "nowy utwór narasta");

  tick(61);
  assert.equal(first.paused, true);
  assert.equal(second.paused, false);
  assert.ok(Math.abs(second.volume - 0.4) < 1e-9);
});

test("zdarzenie ended przełącza utwór, gdy długość jest nieznana", () => {
  const audio = createAudio({}, fakeSettings());
  audio.startMusic(music());

  const first = audioInstances[0];
  first.duration = Number.NaN;
  tick(200);
  assert.equal(audioInstances.length, 1);

  first.emit("ended");
  assert.equal(audioInstances.length, 2);
  assert.equal(audioInstances[1].playCalls, 1);
});

test("zmiana głośności w trakcie przenikania skaluje obie ścieżki i nie przerywa fade'u", () => {
  const settings = fakeSettings();
  const audio = createAudio({}, settings);
  audio.startMusic(music());

  const first = audioInstances[0];
  tick(120);
  first.currentTime = first.duration - 6.01;
  tick(31);
  const second = audioInstances[1];
  const before = { first: first.volume, second: second.volume };

  settings.update({ musicVolume: 0.8 });
  assert.ok(Math.abs(first.volume - before.first * 2) < 1e-9);
  assert.ok(Math.abs(second.volume - before.second * 2) < 1e-9);

  tick(1);
  assert.ok(first.volume < before.first * 2, "wygaszanie trwa dalej");
  assert.ok(second.volume > before.second * 2, "narastanie trwa dalej");
});

test("zerowa głośność pauzuje muzykę, podniesienie suwaka ją wznawia", () => {
  const settings = fakeSettings();
  const audio = createAudio({}, settings);
  audio.startMusic(music());
  tick(120);
  const first = audioInstances[0];

  settings.update({ musicVolume: 0 });
  assert.equal(first.paused, true);
  assert.equal(intervals.size, 0);

  settings.update({ musicVolume: 0.5 });
  assert.equal(first.paused, false);
  assert.equal(first.playCalls, 2);
  assert.ok(intervals.size > 0);
});

test("start przy wyciszonym suwaku czeka na podniesienie głośności", () => {
  const settings = fakeSettings({ musicVolume: 0 });
  const audio = createAudio({}, settings);
  audio.startMusic(music());

  assert.deepEqual(audioInstances, []);
  settings.update({ musicVolume: 0.4 });
  assert.equal(audioInstances.length, 1);
  assert.equal(audioInstances[0].playCalls, 1);
});

test("zablokowany autoplay wraca przy pierwszym geście gracza", async () => {
  playMode = "reject";
  const audio = createAudio({}, fakeSettings());
  audio.startMusic(music());

  const blocked = audioInstances[0];
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(blocked.paused, true);
  assert.equal(intervals.size, 0);
  assert.ok(listeners.has("pointerdown"));

  playMode = "resolve";
  listeners.get("pointerdown")();

  assert.equal(audioInstances.length, 2);
  assert.equal(audioInstances[1].playCalls, 1);
  assert.ok(intervals.size > 0);
  assert.equal(listeners.size, 0);
});

test("synchroniczny błąd play nie zapętla prób", () => {
  playMode = "throw";
  const audio = createAudio({}, fakeSettings());

  assert.doesNotThrow(() => audio.startMusic(music()));
  assert.equal(audioInstances.length, 1);
  assert.equal(audioInstances[0].paused, true);
  assert.equal(intervals.size, 0);
});

test("niedostępne Audio jest ciche", () => {
  delete globalThis.Audio;
  const audio = createAudio({ entries: { 1: { audio: { en: "x.mp3" } } } }, fakeSettings());

  assert.doesNotThrow(() => audio.playNarration(1, "en"));
  assert.doesNotThrow(() => audio.startMusic(music()));
  assert.equal(intervals.size, 0);
});

test("stopMusic i stopAll zatrzymują wszystko i czyszczą timery", () => {
  const audio = createAudio({ entries: { 1: { audio: { en: "media/narration/1-en.mp3" } } } }, fakeSettings());
  audio.playNarration(1, "en");
  audio.startMusic(music());
  tick(10);
  assert.ok(intervals.size > 0);

  audio.stopMusic();
  assert.equal(intervals.size, 0);
  assert.ok(audioInstances.slice(1).every((node) => node.paused));

  audio.startMusic(music());
  tick(5);
  audio.stopAll();
  assert.equal(intervals.size, 0);
  assert.ok(audioInstances.every((node) => node.paused));
});
