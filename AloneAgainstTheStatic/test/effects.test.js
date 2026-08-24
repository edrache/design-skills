import test from "node:test";
import assert from "node:assert/strict";
import { amplitudeFor, MAX_AMPLITUDE_PX } from "../src/ui/effects.js";

test("przy pełnej Poczytalności ruchu nie ma", () => {
  assert.equal(amplitudeFor({ dread: 0, textEffects: 1, proximity: 1 }), 0);
});

test("amplituda rośnie z rozpadem i z bliskością wskaźnika", () => {
  const far = amplitudeFor({ dread: 0.5, textEffects: 1, proximity: 0 });
  const near = amplitudeFor({ dread: 0.5, textEffects: 1, proximity: 1 });
  assert.ok(far > 0);
  assert.ok(near > far);
});

test("amplituda nigdy nie przekracza progu czytelności", () => {
  assert.equal(amplitudeFor({ dread: 1, textEffects: 1, proximity: 1 }), MAX_AMPLITUDE_PX);
  assert.ok(MAX_AMPLITUDE_PX <= 1.5);
});

test("suwak na zero wyłącza ruch mimo pełnego rozpadu", () => {
  assert.equal(amplitudeFor({ dread: 1, textEffects: 0, proximity: 1 }), 0);
});

test("prefers-reduced-motion zeruje ruch niezależnie od suwaka", () => {
  assert.equal(amplitudeFor({ dread: 1, textEffects: 1, proximity: 1, reducedMotion: true }), 0);
});

test("brak DOM nie wywraca modułu", async () => {
  const { createEffects } = await import("../src/ui/effects.js");
  const effects = createEffects({ root: null, doc: null });
  effects.observe(null);
  effects.flash(null);
  effects.destroy();
});
