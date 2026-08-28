import test from "node:test";
import assert from "node:assert/strict";
import {
  DISC_CORE, DISC_RADIUS_PX, GRAIN_OPACITY, LETTER_PX, SLICE_PX,
  WAVE_GAIN, WAVE_LIFE_MS, WAVE_REACH_PX, WAVE_SPEED_PX_MS, WAVE_THICKNESS_PX,
  createPointerStatic, discFalloff, discMask, maskedNodes, ringMask, staticScale, waveAt,
} from "../src/ui/pointer-static.js";
import { createFakeDocument } from "./helpers/fake-dom.js";

test("dysk trzyma pełną siłę w rdzeniu i gaśnie do zera na promieniu", () => {
  assert.equal(discFalloff(0), 1);
  assert.equal(discFalloff(DISC_RADIUS_PX * DISC_CORE), 1);
  assert.equal(discFalloff(DISC_RADIUS_PX), 0);
  assert.equal(discFalloff(DISC_RADIUS_PX * 3), 0);
});

test("dysk słabnie monotonicznie poza rdzeniem", () => {
  let previous = 1;
  for (let distance = DISC_RADIUS_PX * DISC_CORE; distance <= DISC_RADIUS_PX; distance += 5) {
    const current = discFalloff(distance);
    assert.ok(current <= previous, `siła rośnie na ${distance} px`);
    previous = current;
  }
});

test("dysk odporny na wejścia niebędące liczbami", () => {
  assert.equal(discFalloff(NaN), 0);
  assert.equal(discFalloff("blisko"), 0);
  assert.equal(discFalloff(-10), 1);
  assert.equal(discFalloff(50, 0), 0);
});

test("fala rozchodzi się z zadaną prędkością", () => {
  const wave = { x: 100, y: 200, at: 1000 };
  assert.equal(waveAt(1000, wave).radius, 0);
  assert.equal(waveAt(1100, wave).radius, 100 * WAVE_SPEED_PX_MS);
});

test("fala wzmacnia najmocniej na starcie i gaśnie z promieniem", () => {
  const wave = { x: 0, y: 0, at: 0 };
  assert.equal(waveAt(0, wave).gain, WAVE_GAIN);
  const later = waveAt(WAVE_LIFE_MS / 2, wave).gain;
  assert.ok(later > 1 && later < WAVE_GAIN, `wzmocnienie w połowie życia: ${later}`);
});

test("fala wygasa po WAVE_LIFE_MS i nie istnieje przed kliknięciem", () => {
  const wave = { x: 0, y: 0, at: 500 };
  assert.equal(waveAt(500 + WAVE_LIFE_MS, wave), null);
  assert.equal(waveAt(500 + WAVE_LIFE_MS + 1, wave), null);
  assert.equal(waveAt(400, wave), null);
  assert.equal(waveAt(500, null), null);
});

test("siła zero i reduced-motion zerują wszystkie trzy kanały", () => {
  for (const zeroed of [staticScale({ strength: 0 }), staticScale({ strength: 1, reducedMotion: true })]) {
    assert.deepEqual(zeroed, { letter: 0, slice: 0, grain: 0 });
  }
});

test("siła skaluje kanały liniowo do wartości szczytowych", () => {
  assert.deepEqual(staticScale({ strength: 1 }), { letter: LETTER_PX, slice: SLICE_PX, grain: GRAIN_OPACITY });
  const half = staticScale({ strength: 0.5 });
  assert.ok(Math.abs(half.letter - LETTER_PX / 2) < 1e-9);
  assert.ok(Math.abs(half.slice - SLICE_PX / 2) < 1e-9);
  assert.ok(Math.abs(half.grain - GRAIN_OPACITY / 2) < 1e-9);
});

test("wzmocnienie fali podbija przemieszczenie, ale nie wyprowadza ziarna poza jedynkę", () => {
  const boosted = staticScale({ strength: 1, waveGain: WAVE_GAIN });
  assert.ok(boosted.letter > LETTER_PX);
  assert.ok(boosted.slice > SLICE_PX);
  assert.ok(boosted.grain <= 1, "krycie ziarna to alfa — nie może przekroczyć 1");
});

test("maska klonu składa warstwę dysku i sumuje warstwy", () => {
  const { image, composite } = discMask({ x: 40, y: 60 });
  assert.match(image, /radial-gradient/);
  assert.match(image, /40px 60px/);
  assert.equal(composite, "add");
});

test("maska z falą ma dwie warstwy o różnych środkach", () => {
  const { image } = discMask({ x: 10, y: 20, wave: { radius: 300, gain: 2, x: 500, y: 400 } });
  const layers = image.split("radial-gradient").length - 1;
  assert.equal(layers, 2, "dysk pod wskaźnikiem plus pierścień z punktu kliknięcia");
  assert.match(image, /10px 20px/);
  assert.match(image, /500px 400px/);
});

test("maska odwrotna przecina warstwy i ma dopełniające stopnie", () => {
  const direct = discMask({ x: 0, y: 0 });
  const inverse = discMask({ x: 0, y: 0, invert: true });
  assert.equal(inverse.composite, "intersect");
  // Te same progi procentowe po obu stronach — inaczej miękka krawędź
  // nie zsumuje alfy do jedynki i w obwódce dysku tekst zbladnie.
  const stops = (value) => value.match(/\d+(?:\.\d+)?%/g) ?? [];
  assert.deepEqual(stops(inverse.image), stops(direct.image));
  assert.notEqual(inverse.image, direct.image, "kolejność kolorów jest odwrócona");
});

test("grubość pierścienia i zasięg fali są spójne ze stałymi", () => {
  assert.equal(WAVE_REACH_PX, WAVE_SPEED_PX_MS * WAVE_LIFE_MS);
  assert.ok(WAVE_THICKNESS_PX > 0);
});

test("brak DOM daje instancję no-op o pełnym kształcie", () => {
  const noop = createPointerStatic({ root: null });
  for (const name of ["syncEntry", "dropEntry", "dropAll", "recompute", "destroy"]) {
    assert.equal(typeof noop[name], "function", `no-op nie ma metody ${name}`);
  }
  // Żadne wywołanie nie może rzucić — main.js woła je bezwarunkowo.
  noop.syncEntry({});
  noop.dropEntry({});
  noop.dropAll();
  noop.recompute();
  noop.destroy();
});

test("maska samego pierścienia ma jedną warstwę i dopełniające się składanie", () => {
  const direct = ringMask({ x: 30, y: 40, radius: 200 }, false);
  assert.equal(direct.image.split("radial-gradient").length - 1, 1, "pierścień to jedna warstwa");
  assert.match(direct.image, /30px 40px/);
  assert.equal(direct.composite, "add");
  const inverse = ringMask({ x: 30, y: 40, radius: 200 }, true);
  assert.equal(inverse.composite, "intersect");
  assert.notEqual(inverse.image, direct.image, "kolejność kolorów jest odwrócona");
});

test("maskowaniu podlegają akapity prozy i figura kadru", () => {
  const doc = createFakeDocument();
  const entry = doc.createElement("article");
  const number = doc.createElement("div");
  number.className = "entry-number";
  const figure = doc.createElement("figure");
  figure.className = "entry-art";
  const closed = doc.createElement("p");
  const typing = doc.createElement("p");
  // Akapit wypisywany zostaje poza efektem: reveal.js przepisuje jego węzły
  // co klatkę, więc klon nigdy by nie nadążył.
  typing.dataset.typing = "1";
  entry.append(number, figure, closed, typing);

  assert.deepEqual(maskedNodes(entry), [figure, closed]);
});

test("wpis bez prozy i bez kadru nie ma czego maskować", () => {
  const doc = createFakeDocument();
  const entry = doc.createElement("article");
  const number = doc.createElement("div");
  number.className = "entry-number";
  entry.append(number);

  assert.deepEqual(maskedNodes(entry), []);
});
