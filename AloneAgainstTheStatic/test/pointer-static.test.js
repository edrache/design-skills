import test from "node:test";
import assert from "node:assert/strict";
import {
  DISC_CORE, DISC_RADIUS_PX, GRAIN_OPACITY, LETTER_PX, SLICE_PX,
  WAVE_EASE, WAVE_GAIN, WAVE_LIFE_MS, WAVE_REACH_PX, WAVE_THICKNESS_PX,
  BLOB_COUNT, RING_JITTER_PX, RING_SHARDS,
  createPointerStatic, discBlobs, discFalloff, discMask, maskedNodes,
  ringMask, shapeNoise, staticScale, waveAt,
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

test("fala rusza od zera i dobija do pełnego zasięgu", () => {
  const wave = { x: 100, y: 200, at: 1000 };
  assert.equal(waveAt(1000, wave).radius, 0);
  const last = waveAt(1000 + WAVE_LIFE_MS - 1, wave).radius;
  assert.ok(last > WAVE_REACH_PX * 0.99 && last <= WAVE_REACH_PX, `koniec życia na ${last}px`);
});

test("fala rozpędza się: każda kolejna ćwiartka życia to dłuższy skok", () => {
  const wave = { x: 0, y: 0, at: 0 };
  const steps = [0, 0.25, 0.5, 0.75, 1].map((part) => waveAt(WAVE_LIFE_MS * part - (part === 1 ? 1 : 0), wave).radius);
  const jumps = steps.slice(1).map((value, index) => value - steps[index]);
  for (let i = 1; i < jumps.length; i += 1) {
    assert.ok(jumps[i] > jumps[i - 1], `skok ${i} nie jest dłuższy od poprzedniego: ${jumps}`);
  }
  // Pierwsza połowa życia to wyraźnie mniej niż połowa drogi — inaczej
  // rozpędzania nie widać, bo fala i tak wychodzi poza ekran.
  assert.ok(steps[2] < WAVE_REACH_PX * 0.35, `w połowie życia fala jest już na ${steps[2]}px`);
  assert.ok(WAVE_EASE > 1, "wykładnik rozpędzania musi być większy od jedynki");
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

test("maska klonu składa dysk z plam i sumuje warstwy", () => {
  const { image, composite } = discMask({ x: 40, y: 60 });
  assert.equal(image.split("radial-gradient").length - 1, BLOB_COUNT);
  assert.equal(composite, "add");
});

test("maska z falą dokłada odłamki pierścienia do plam dysku", () => {
  const { image } = discMask({ x: 10, y: 20, wave: { radius: 300, gain: 2, x: 500, y: 400 } });
  const layers = image.split("radial-gradient").length - 1;
  assert.equal(layers, BLOB_COUNT + RING_SHARDS);
  // Pierścień liczy się od punktu kliknięcia, więc jego odłamki leżą wokół
  // 500/400, a nie wokół wskaźnika.
  // Odłamki to warstwy o trzech stopniach (pusto — obręcz — pusto); plamy
  // dysku mają dwa, więc po samym „circle" nie da się ich rozróżnić.
  const shards = [...image.matchAll(/circle [\d.]+px at ([-\d.]+)px ([-\d.]+)px, transparent/g)];
  assert.equal(shards.length, RING_SHARDS);
  for (const [, cx, cy] of shards) {
    assert.ok(Math.hypot(Number(cx) - 500, Number(cy) - 400) <= RING_JITTER_PX * 2, "odłamek odjechał od punktu kliknięcia");
  }
});

test("plamy dysku mieszczą się w jego promieniu i kryją środek", () => {
  const radius = 140;
  for (const time of [0, 400, 1700, 9000]) {
    const blobs = discBlobs({ x: 100, y: 200, radius, time });
    assert.equal(blobs.length, BLOB_COUNT);
    for (const blob of blobs) {
      assert.ok(blob.r > 0, "plama bez promienia");
      // Zasięg plamy nie może wyjść poza dysk: maska odwrotna wygryzłaby
      // wtedy w oryginale dziurę tam, gdzie klon jest już wygaszony.
      const reach = Math.hypot(blob.cx - 100, blob.cy - 200) + blob.r;
      assert.ok(reach <= radius + 1e-9, `plama wystaje poza dysk o ${reach - radius}px`);
    }
    // Środek musi zostać kryty, inaczej pod kursorem otwierałaby się dziura
    // w dziurze — widać by w niej było nietknięty oryginał.
    const covering = blobs.filter((blob) => Math.hypot(blob.cx - 100, blob.cy - 200) < blob.r * DISC_CORE);
    assert.ok(covering.length > 0, "żadna plama nie kryje punktu wskaźnika");
  }
});

test("plamy dryfują wokół wskaźnika, każda własnym torem", () => {
  const early = discBlobs({ x: 0, y: 0, radius: 140, time: 0 });
  const later = discBlobs({ x: 0, y: 0, radius: 140, time: 900 });
  assert.deepEqual(discBlobs({ x: 0, y: 0, radius: 140, time: 0 }), early, "kształt zależy od czegoś poza czasem");
  const moved = early.filter((blob, index) => Math.hypot(blob.cx - later[index].cx, blob.cy - later[index].cy) > 1);
  assert.equal(moved.length, BLOB_COUNT, "część plam stoi w miejscu");
  // Plamy nie mogą wędrować zbiorowo w tę samą stronę — wtedy dysk pływałby
  // obok wskaźnika, zamiast oddychać wokół niego.
  const drift = early.reduce((sum, blob, index) => sum + (later[index].cx - blob.cx), 0) / BLOB_COUNT;
  assert.ok(Math.abs(drift) < 140 * 0.5, "plamy odpłynęły zgodnie w jedną stronę");
});

test("promienie plam pulsują, a nie stoją równe", () => {
  const blobs = discBlobs({ x: 0, y: 0, radius: 140, time: 640 });
  const radii = new Set(blobs.map((blob) => blob.r.toFixed(3)));
  assert.ok(radii.size > 1, "wszystkie plamy mają ten sam promień");
});

test("szum kształtu jest deterministyczny, ograniczony i pełznie w czasie", () => {
  // Klon i oryginał liczą swoje maski osobno, w tej samej klatce: ta sama
  // klatka MUSI dać tę samą wartość, inaczej krawędzie się rozjadą.
  assert.equal(shapeNoise(3, 1200), shapeNoise(3, 1200));
  assert.notEqual(shapeNoise(3, 1200), shapeNoise(4, 1200), "sąsiednie plamy chodzą tak samo");
  assert.notEqual(shapeNoise(3, 1200), shapeNoise(3, 1800), "kształt stoi w miejscu");
  for (const value of [shapeNoise(0, 0), shapeNoise(7, 5e5), shapeNoise(2, 33)]) {
    assert.ok(value >= -1 && value <= 1, `szum poza zakresem: ${value}`);
  }
  assert.equal(shapeNoise(NaN, NaN), shapeNoise(0, 0), "wejście spoza liczb nie może dać NaN");
});

test("maska odwrotna przecina warstwy i ma dopełniające stopnie", () => {
  const direct = discMask({ x: 0, y: 0, time: 700 });
  const inverse = discMask({ x: 0, y: 0, time: 700, invert: true });
  assert.equal(inverse.composite, "intersect");
  // Te same progi procentowe po obu stronach — inaczej miękka krawędź
  // nie zsumuje alfy do jedynki i w obwódce dysku tekst zbladnie.
  const stops = (value) => value.match(/\d+(?:\.\d+)?%/g) ?? [];
  assert.deepEqual(stops(inverse.image), stops(direct.image));
  assert.notEqual(inverse.image, direct.image, "kolejność kolorów jest odwrócona");
});

test("grubość pierścienia i zasięg fali są spójne ze stałymi", () => {
  assert.ok(WAVE_REACH_PX > 0);
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

test("maska samego pierścienia ma odłamki i dopełniające się składanie", () => {
  const direct = ringMask({ x: 30, y: 40, radius: 200 }, false);
  assert.equal(direct.image.split("radial-gradient").length - 1, RING_SHARDS);
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
