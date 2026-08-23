import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createAudio } from "../src/ui/audio.js";

const originals = {
  Audio: Object.getOwnPropertyDescriptor(globalThis, "Audio"),
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
};

let intervals;
let nextTimer;
let audioInstances;
let playMode;

class FakeAudio {
  constructor(src) {
    this.src = String(src);
    this.volume = 1;
    this.loop = false;
    this.paused = false;
    this.playCalls = 0;
    this.pauseCalls = 0;
    audioInstances.push(this);
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
  const listeners = [];
  const settings = {
    values: {
      narration: true,
      narrationVolume: 0.9,
      musicVolume: 0.4,
      ...overrides,
    },
    subscribe(listener) { listeners.push(listener); },
    update(values) {
      this.values = { ...this.values, ...values };
      for (const listener of listeners) listener(this.values);
    },
  };
  return settings;
}

function tick(count = 1) {
  for (let index = 0; index < count; index += 1) {
    for (const callback of [...intervals.values()]) callback();
  }
}

beforeEach(() => {
  intervals = new Map();
  nextTimer = 1;
  audioInstances = [];
  playMode = "resolve";
  Object.defineProperty(globalThis, "Audio", { configurable: true, value: FakeAudio });
  globalThis.setInterval = (callback) => {
    const id = nextTimer++;
    intervals.set(id, callback);
    return id;
  };
  globalThis.clearInterval = (id) => intervals.delete(id);
});

afterEach(() => {
  if (originals.Audio) Object.defineProperty(globalThis, "Audio", originals.Audio);
  else delete globalThis.Audio;
  globalThis.setInterval = originals.setInterval;
  globalThis.clearInterval = originals.clearInterval;
});

test("brak zasobu oznacza ciszę bez tworzenia Audio", () => {
  const audio = createAudio({ entries: {}, scenes: {} }, fakeSettings());

  assert.doesNotThrow(() => audio.playNarration(1, "pl"));
  assert.doesNotThrow(() => audio.playScene("drive"));
  assert.deepEqual(audioInstances, []);
  assert.equal(intervals.size, 0);
});

test("lektor zatrzymuje poprzedni wpis i reaguje na ustawienia", () => {
  const settings = fakeSettings();
  const audio = createAudio({
    entries: { 1: { audio: { en: "media/narration/1-en.mp3" } } },
    scenes: {},
  }, settings);

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

test("brak kolejnego nagrania ucisza poprzednie", () => {
  const audio = createAudio({
    entries: { 1: { audio: { en: "media/narration/1-en.mp3" } } },
    scenes: {},
  }, fakeSettings());

  audio.playNarration(1, "en");
  const first = audioInstances[0];
  audio.playNarration(2, "en");

  assert.equal(first.paused, true);
  assert.equal(audioInstances.length, 1);
});

test("crossfade używa timerów przypisanych do konkretnych utworów", () => {
  const audio = createAudio({ entries: {}, scenes: {
    drive: "media/music/drive.mp3",
    cabin: "media/music/cabin.mp3",
  } }, fakeSettings());

  audio.playScene("drive");
  const drive = audioInstances[0];
  tick(10);
  const driveBeforeSwitch = drive.volume;

  audio.playScene("cabin");
  const cabin = audioInstances[1];
  tick(1);

  assert.ok(drive.volume < driveBeforeSwitch);
  assert.ok(cabin.volume > 0);
  tick(60);
  assert.equal(drive.paused, true);
  assert.equal(cabin.paused, false);
  assert.ok(Math.abs(cabin.volume - 0.4) < 1e-9);
});

test("szybka trzecia scena nie pozwala timerowi drugiej sterować trzecią", () => {
  const audio = createAudio({ entries: {}, scenes: {
    one: "media/music/one.mp3",
    two: "media/music/two.mp3",
    three: "media/music/three.mp3",
  } }, fakeSettings());

  audio.playScene("one");
  tick(5);
  audio.playScene("two");
  tick(3);
  const two = audioInstances[1];
  audio.playScene("three");
  const three = audioInstances[2];
  tick(60);

  assert.equal(two.paused, true);
  assert.equal(three.paused, false);
  assert.ok(Math.abs(three.volume - 0.4) < 1e-9);
});

test("zmiana musicVolume aktualizuje aktualny utwór i kończy fade", () => {
  const settings = fakeSettings();
  const audio = createAudio({ entries: {}, scenes: { drive: "media/music/drive.mp3" } }, settings);

  audio.playScene("drive");
  tick(5);
  const music = audioInstances[0];
  assert.ok(music.volume < 0.4);

  settings.update({ musicVolume: 0.7 });
  assert.equal(music.volume, 0.7);
  assert.equal(intervals.size, 0);
});

test("stopAll czyści wszystkie timery i zatrzymuje także wygaszane węzły", () => {
  const audio = createAudio({
    entries: { 1: { audio: { en: "media/narration/1-en.mp3" } } },
    scenes: { drive: "media/music/drive.mp3", cabin: "media/music/cabin.mp3" },
  }, fakeSettings());

  audio.playNarration(1, "en");
  audio.playScene("drive");
  tick(3);
  audio.playScene("cabin");
  assert.ok(intervals.size > 0);

  audio.stopAll();

  assert.equal(intervals.size, 0);
  assert.ok(audioInstances.every((node) => node.paused));
  audio.playScene("cabin");
  assert.equal(audioInstances.length, 4);
});

test("odrzucone play i niedostępne Audio są ciche", () => {
  playMode = "reject";
  const audio = createAudio({ entries: { 1: { audio: { en: "x.mp3" } } }, scenes: {} }, fakeSettings());
  assert.doesNotThrow(() => audio.playNarration(1, "en"));

  delete globalThis.Audio;
  const silent = createAudio({ entries: { 1: { audio: { en: "x.mp3" } } }, scenes: {} }, fakeSettings());
  assert.doesNotThrow(() => silent.playNarration(1, "en"));
});

test("odrzucone music.play czyści scenę i pozwala ponowić ją po interakcji", async () => {
  const audio = createAudio({ entries: {}, scenes: { drive: "media/music/drive.mp3" } }, fakeSettings());
  playMode = "reject";

  audio.playScene("drive");
  const rejected = audioInstances[0];
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(rejected.paused, true);
  assert.equal(intervals.size, 0);

  playMode = "resolve";
  audio.playScene("drive");
  assert.equal(audioInstances.length, 2);
  assert.equal(audioInstances[1].playCalls, 1);
  assert.ok(intervals.size > 0);
});

test("synchroniczny błąd music.play również pozwala ponowić tę samą scenę", () => {
  const audio = createAudio({ entries: {}, scenes: { cabin: "media/music/cabin.mp3" } }, fakeSettings());
  playMode = "throw";

  assert.doesNotThrow(() => audio.playScene("cabin"));
  assert.equal(audioInstances[0].paused, true);
  assert.equal(intervals.size, 0);

  playMode = "resolve";
  audio.playScene("cabin");
  assert.equal(audioInstances.length, 2);
  assert.ok(intervals.size > 0);
});
