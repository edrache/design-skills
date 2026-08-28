import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MADNESS_ENTRIES,
  DRIFT_FLOOR,
  DRIFT_MAX,
  ENTRY_BASE,
  PULSE_SLOT_MS,
  PULSE_LENGTH_MS,
  madnessBase,
  pulseAt,
} from "../src/ui/madness.js";

test("stałe modułu mają oczekiwane wartości", () => {
  assert.deepEqual(MADNESS_ENTRIES, [328, 329, 330, 331, 332, 333]);
  assert.equal(Object.isFrozen(MADNESS_ENTRIES), true);
  assert.equal(DRIFT_FLOOR, 0.55);
  assert.equal(DRIFT_MAX, 0.4);
  assert.equal(ENTRY_BASE, 1);
  assert.equal(PULSE_SLOT_MS, 1600);
  assert.equal(PULSE_LENGTH_MS, 700);
});

test("madnessBase: paragraf szaleństwa zawsze daje ENTRY_BASE", () => {
  for (const entryId of MADNESS_ENTRIES) {
    assert.equal(madnessBase({ entryId, dread: 0 }), ENTRY_BASE);
    assert.equal(madnessBase({ entryId, dread: 1 }), ENTRY_BASE);
  }
});

test("madnessBase: paragraf pod progiem daje 0", () => {
  assert.equal(madnessBase({ entryId: 1, dread: 0 }), 0);
  assert.equal(madnessBase({ entryId: 1, dread: DRIFT_FLOOR }), 0);
  assert.equal(madnessBase({ entryId: 1, dread: 0.3 }), 0);
});

test("madnessBase: paragraf nad progiem rośnie liniowo do DRIFT_MAX przy dread = 1", () => {
  assert.equal(madnessBase({ entryId: 1, dread: 1 }), DRIFT_MAX);
  const mid = DRIFT_FLOOR + (1 - DRIFT_FLOOR) / 2;
  const expected = ((mid - DRIFT_FLOOR) / (1 - DRIFT_FLOOR)) * DRIFT_MAX;
  assert.ok(Math.abs(madnessBase({ entryId: 1, dread: mid }) - expected) < 1e-9);
});

test("madnessBase: identyfikator jako łańcuch jest normalizowany przez Number", () => {
  assert.equal(madnessBase({ entryId: "330", dread: 0 }), ENTRY_BASE);
  assert.equal(madnessBase({ entryId: "1", dread: 1 }), DRIFT_MAX);
});

test("madnessBase: odporność na śmieciowe wejścia", () => {
  assert.equal(madnessBase({ entryId: NaN, dread: 1 }), DRIFT_MAX);
  assert.equal(madnessBase({ entryId: null, dread: 1 }), DRIFT_MAX);
  assert.equal(madnessBase({ entryId: undefined, dread: 1 }), DRIFT_MAX);
  assert.equal(madnessBase(), 0);
  assert.equal(madnessBase({ entryId: 1, dread: NaN }), 0);
  assert.equal(madnessBase({ entryId: 1, dread: null }), 0);
  assert.equal(madnessBase({ entryId: 1, dread: undefined }), 0);
  assert.equal(madnessBase({ entryId: 1, dread: -5 }), 0);
  assert.equal(madnessBase({ entryId: 1, dread: 5 }), DRIFT_MAX);
});

test("madnessBase: wynik zawsze mieści się w 0…1", () => {
  for (const dread of [-1, 0, 0.3, 0.55, 0.7, 1, 2]) {
    const value = madnessBase({ entryId: 1, dread });
    assert.ok(value >= 0 && value <= 1, `dread=${dread} -> ${value}`);
  }
});

test("pulseAt: podkład bez zrywu przy base = 0 daje zera", () => {
  const { blend, warp } = pulseAt(0, 0);
  assert.equal(blend, 0);
  assert.equal(warp, 0);
});

test("pulseAt: czas ujemny lub nieliczbowy daje sam podkład", () => {
  const base = 0.6;
  for (const time of [-1, NaN, undefined, null, "x"]) {
    const { blend, warp } = pulseAt(time, base);
    assert.ok(Math.abs(blend - base * 0.28) < 1e-9, `blend time=${time}`);
    assert.ok(Math.abs(warp - base * 0.2) < 1e-9, `warp time=${time}`);
  }
});

test("pulseAt: poza zrywem zwraca sam podkład", () => {
  const base = 1;
  // Slot 0: sprawdzamy warunek odpalenia bezpośrednio przez slotNoise.
  const slotNoise = (slot) => {
    const value = Math.sin(slot * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  };
  let quietSlot = -1;
  for (let slot = 0; slot < 50; slot += 1) {
    if (slotNoise(slot) >= 0.15 + 0.5 * base) {
      quietSlot = slot;
      break;
    }
  }
  assert.notEqual(quietSlot, -1, "test setup: potrzebny cichy slot");
  const time = quietSlot * PULSE_SLOT_MS;
  const { blend, warp } = pulseAt(time, base);
  assert.ok(Math.abs(blend - base * 0.28) < 1e-9);
  assert.ok(Math.abs(warp - base * 0.2) < 1e-9);
});

test("pulseAt: zryw w znanym slocie podnosi blend i warp do bazy w szczycie obwiedni", () => {
  const base = 1;
  const slotNoise = (slot) => {
    const value = Math.sin(slot * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  };
  let burstSlot = -1;
  for (let slot = 0; slot < 200; slot += 1) {
    if (slotNoise(slot) < 0.15 + 0.5 * base) {
      burstSlot = slot;
      break;
    }
  }
  assert.notEqual(burstSlot, -1, "test setup: potrzebny slot ze zrywem");
  const slotStart = burstSlot * PULSE_SLOT_MS;
  const peakTime = slotStart + PULSE_LENGTH_MS / 2; // szczyt sin(pi * into / LENGTH)
  const quiet = pulseAt(slotStart - 1, base);
  const peak = pulseAt(peakTime, base);
  assert.ok(peak.blend > quiet.blend, "puls powinien podnieść blend");
  assert.ok(peak.warp > quiet.warp, "puls powinien podnieść warp");
  assert.ok(peak.blend <= 1);
  assert.ok(peak.warp <= 1);
});

test("pulseAt: blend i warp zawsze w zakresie 0…1 dla różnych baz i czasów", () => {
  for (const base of [0, 0.2, 0.55, 0.8, 1]) {
    for (let slot = 0; slot < 20; slot += 1) {
      for (const offset of [0, 100, 350, 699, 1000, 1599]) {
        const time = slot * PULSE_SLOT_MS + offset;
        const { blend, warp } = pulseAt(time, base);
        assert.ok(blend >= 0 && blend <= 1, `blend base=${base} time=${time} -> ${blend}`);
        assert.ok(warp >= 0 && warp <= 1, `warp base=${base} time=${time} -> ${warp}`);
      }
    }
  }
});

test("pulseAt: monotoniczność względem base w szczycie pulsu (gdy pulsuje dla obu)", () => {
  // Przy base = 1 zryw jest niemal gwarantowany w większości slotów; porównujemy
  // z base niższym w tym samym slocie i czasie szczytu.
  const slotNoise = (slot) => {
    const value = Math.sin(slot * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  };
  let burstSlot = -1;
  for (let slot = 0; slot < 200; slot += 1) {
    // Warunek dla base=1 obejmuje warunek dla base niższego, więc szukamy slotu
    // odpalającego przy obu wartościach.
    if (slotNoise(slot) < 0.15 + 0.5 * 0.4) {
      burstSlot = slot;
      break;
    }
  }
  assert.notEqual(burstSlot, -1);
  const peakTime = burstSlot * PULSE_SLOT_MS + PULSE_LENGTH_MS / 2;
  const low = pulseAt(peakTime, 0.4);
  const high = pulseAt(peakTime, 1);
  assert.ok(high.blend >= low.blend);
  assert.ok(high.warp >= low.warp);
});
