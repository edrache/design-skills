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

function fakeElement() {
  const props = new Map();
  return {
    style: {
      setProperty(name, value) { props.set(name, value); },
      removeProperty(name) { props.delete(name); },
      get filter() { return props.get("filter") ?? ""; },
      set filter(value) { props.set("filter", value); },
    },
    hasProperty(name) { return props.has(name); },
    getBoundingClientRect() { return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }; },
  };
}

function fakeRoot(elements) {
  const listeners = {};
  return {
    style: { setProperty() {}, removeProperty() {} },
    addEventListener(name, fn) { listeners[name] = fn; },
    removeEventListener(name) { delete listeners[name]; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    querySelectorAll() { return elements; },
  };
}

function fakeDoc() {
  return {
    defaultView: { getComputedStyle() { return { getPropertyValue() { return "0"; } }; } },
    querySelector() { return null; },
  };
}

test("unobserveAll istnieje na wariancie pustym (bez DOM) i nie rzuca", async () => {
  const { createEffects } = await import("../src/ui/effects.js");
  const empty = createEffects({ root: null, doc: null });
  assert.equal(typeof empty.unobserveAll, "function");
  assert.doesNotThrow(() => empty.unobserveAll());
});

test("unobserveAll na działającej instancji odpina elementy i zdejmuje filtr/--glitch", async () => {
  const previousRAF = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => 1;
  try {
    const { createEffects } = await import("../src/ui/effects.js");
    const elements = [fakeElement(), fakeElement()];
    const root = fakeRoot(elements);
    const doc = fakeDoc();
    const effects = createEffects({ root, doc, matchMedia: () => null });

    assert.equal(typeof effects.unobserveAll, "function");

    effects.observe(root);
    for (const element of elements) {
      element.style.setProperty("filter", "url(#vhs-static)");
      element.style.setProperty("--glitch", "1.000");
    }

    assert.doesNotThrow(() => effects.unobserveAll());

    for (const element of elements) {
      assert.equal(element.hasProperty("filter"), false);
      assert.equal(element.hasProperty("--glitch"), false);
    }

    // Wywołanie po odpięciu wszystkiego nadal nie rzuca (zbiory już puste).
    assert.doesNotThrow(() => effects.unobserveAll());
  } finally {
    globalThis.requestAnimationFrame = previousRAF;
  }
});
