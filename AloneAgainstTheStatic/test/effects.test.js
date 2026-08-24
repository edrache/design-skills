import test from "node:test";
import assert from "node:assert/strict";
import { amplitudeFor, bucketFor, burstAt, crawlAt, focusRelief, BUCKET_LEVELS, CEILING_PX, FLOOR_PX } from "../src/ui/effects.js";

test("przy pełnej Poczytalności zakłócenie jest obecne, ale minimalne", () => {
  assert.equal(amplitudeFor({ dread: 0, textEffects: 1, proximity: 0 }), FLOOR_PX);
});

test("spadek Poczytalności podnosi amplitudę do sufitu", () => {
  assert.equal(amplitudeFor({ dread: 1, textEffects: 1, proximity: 0 }), CEILING_PX);
  const polowa = amplitudeFor({ dread: 0.5, textEffects: 1, proximity: 0 });
  assert.ok(polowa > FLOOR_PX && polowa < CEILING_PX);
});

test("bliskość wskaźnika uspokaja zakłócenie zamiast je wzmacniać", () => {
  const daleko = amplitudeFor({ dread: 1, textEffects: 1, proximity: 0 });
  const blisko = amplitudeFor({ dread: 1, textEffects: 1, proximity: 1 });
  assert.ok(blisko < daleko);
  // Ulga zdejmuje 85% amplitudy — fragment staje się czytelny, nie znika.
  assert.ok(blisko > 0);
  assert.ok(Math.abs(blisko - daleko * 0.15) < 1e-9);
});

test("suwak na zero wyłącza wszystko mimo pełnego rozpadu", () => {
  assert.equal(amplitudeFor({ dread: 1, textEffects: 0, proximity: 0 }), 0);
});

test("prefers-reduced-motion zeruje ruch niezależnie od reszty", () => {
  assert.equal(amplitudeFor({ dread: 1, textEffects: 1, proximity: 0, reducedMotion: true }), 0);
});

test("wejścia poza zakresem nie dają NaN ani wartości ujemnej", () => {
  for (const zle of [NaN, -5, 7, "abc", null, undefined]) {
    const wynik = amplitudeFor({ dread: zle, textEffects: zle, proximity: zle });
    assert.ok(Number.isFinite(wynik), `dread=${String(zle)}`);
    assert.ok(wynik >= 0);
    assert.ok(wynik <= CEILING_PX);
  }
});

test("zryw nigdy nie tłumi, a przy pełnej Poczytalności prawie nie występuje", () => {
  let zrywy = 0;
  for (let t = 0; t < 60000; t += 50) {
    const m = burstAt(t, 0);
    assert.ok(m >= 1);
    if (m > 1.001) zrywy += 1;
  }
  const spokojne = zrywy;

  zrywy = 0;
  for (let t = 0; t < 60000; t += 50) {
    const m = burstAt(t, 1);
    assert.ok(m >= 1);
    if (m > 1.001) zrywy += 1;
  }
  assert.ok(zrywy > spokojne, `przy rozpadzie ${zrywy} kontra ${spokojne} przy spokoju`);
});

test("zryw jest deterministyczny — ten sam czas daje ten sam wynik", () => {
  assert.equal(burstAt(12345, 0.5), burstAt(12345, 0.5));
});

test("pełzanie przyspiesza wraz z rozpadem", () => {
  const ziarna = (dread) => {
    const zbior = new Set();
    for (let t = 0; t < 2000; t += 20) zbior.add(crawlAt(t, dread).seed);
    return zbior.size;
  };
  assert.ok(ziarna(1) > ziarna(0));
});

test("pełzanie faluje między przeskokami ziarna", () => {
  const a = crawlAt(1000, 0.5).frequencyY;
  const b = crawlAt(1060, 0.5).frequencyY;
  assert.notEqual(a, b);
  for (const t of [0, 500, 1234, 99999]) {
    const { frequencyY } = crawlAt(t, 0.5);
    assert.ok(frequencyY > 0 && frequencyY < 1);
  }
});

test("kubełek dobiera najbliższy poziom filtra", () => {
  assert.equal(bucketFor(0), 0);
  assert.equal(bucketFor(FLOOR_PX), 0);
  assert.equal(bucketFor(CEILING_PX), BUCKET_LEVELS.length - 1);
  assert.equal(bucketFor(999), BUCKET_LEVELS.length - 1);
  // Wartość między poziomami trafia do bliższego z nich.
  assert.equal(bucketFor(1.1), 1);
});

test("brak DOM nie wywraca modułu", async () => {
  const { createEffects } = await import("../src/ui/effects.js");
  const effects = createEffects({ root: null, doc: null });
  effects.observe(null);
  effects.flash(null);
  effects.destroy();
});

test("focusRelief daje pełną ulgę wpisowi zawierającemu element aktywny", () => {
  const activeElement = { tag: "button" };
  const entry = { contains(node) { return node === activeElement; } };
  assert.equal(focusRelief(entry, activeElement), 1);
});

test("focusRelief daje pełną ulgę, gdy sam wpis jest elementem aktywnym", () => {
  const entry = { contains() { return false; } };
  assert.equal(focusRelief(entry, entry), 1);
});

test("focusRelief zwraca zero, gdy wpis nie zawiera elementu aktywnego", () => {
  const activeElement = { tag: "body" };
  const entry = { contains() { return false; } };
  assert.equal(focusRelief(entry, activeElement), 0);
});

test("focusRelief zwraca zero bez wpisu lub bez elementu aktywnego", () => {
  assert.equal(focusRelief(null, { tag: "body" }), 0);
  assert.equal(focusRelief({ contains() { return true; } }, null), 0);
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
    getProperty(name) { return props.get(name); },
    getBoundingClientRect() { return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }; },
    // Bez wpisu-rodzica: brak ulgi klawiaturowej dla tego elementu.
    closest() { return null; },
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
      element.style.setProperty("--vhs-filter", "url(#vhs-static-0)");
      element.style.setProperty("--glitch", "1.000");
    }

    assert.doesNotThrow(() => effects.unobserveAll());

    for (const element of elements) {
      assert.equal(element.hasProperty("--vhs-filter"), false);
      assert.equal(element.hasProperty("--glitch"), false);
    }

    // Wywołanie po odpięciu wszystkiego nadal nie rzuca (zbiory już puste).
    assert.doesNotThrow(() => effects.unobserveAll());
  } finally {
    globalThis.requestAnimationFrame = previousRAF;
  }
});

import { createEffects, reliefWeight } from "../src/ui/effects.js";

test("mysz daje ulgę trwałą, dotyk wygasającą", () => {
  const mysz = { seen: true, touch: false, at: 0 };
  assert.equal(reliefWeight(mysz, 0), 1);
  assert.equal(reliefWeight(mysz, 999999), 1);

  const dotyk = { seen: true, touch: true, at: 1000 };
  assert.equal(reliefWeight(dotyk, 1000), 1);
  assert.ok(reliefWeight(dotyk, 2250) > 0);
  assert.ok(reliefWeight(dotyk, 2250) < 1);
  assert.equal(reliefWeight(dotyk, 3500), 0);
  assert.equal(reliefWeight(dotyk, 9999), 0);
});

test("brak wskaźnika to brak ulgi", () => {
  assert.equal(reliefWeight({ seen: false, touch: false, at: 0 }, 0), 0);
});

// --- Kontrolowana atrapa requestAnimationFrame + testy pętli tick() ---
//
// Poprzednia atrapa (`() => 1`) nigdy nie wołała callbacku, więc tick() nie
// wykonywał się w żadnym teście. Ta kolejkuje callbacki i udostępnia
// `runFrame()`, które wykonuje dokładnie jedną klatkę — bez tego pętla,
// która się podtrzymuje (`start()` wewnątrz `tick()`), wpadłaby w
// nieskończoną rekurencję.
function createRafStub() {
  const queue = [];
  let nextId = 1;
  const raf = (callback) => {
    queue.push(callback);
    return nextId++;
  };
  raf.runFrame = (time = 0) => {
    const callback = queue.shift();
    if (callback) callback(time);
  };
  raf.pending = () => queue.length;
  return raf;
}

function fakeFilterNode() {
  const attrs = new Map();
  return {
    setAttribute(name, value) { attrs.set(name, value); },
    getAttribute(name) { return attrs.get(name); },
  };
}

function fakeFilterElement() {
  const turbulence = fakeFilterNode();
  const displacement = fakeFilterNode();
  return {
    turbulence,
    displacement,
    querySelector(selector) {
      if (selector === "feTurbulence") return turbulence;
      if (selector === "feDisplacementMap") return displacement;
      return null;
    },
  };
}

// `cssVars` mapuje nazwę zmiennej CSS (np. "--dread") na jej wartość
// tekstową; `filters` mapuje "#vhs-static-N" na fakeFilterElement().
function fakeVarsDoc({ cssVars = {}, filters = {}, activeElement = null } = {}) {
  return {
    activeElement,
    defaultView: {
      getComputedStyle() {
        return { getPropertyValue(name) { return cssVars[name] ?? "0"; } };
      },
    },
    querySelector(selector) { return filters[selector] ?? null; },
  };
}

function fakeMotionQuery(matches) {
  return { matches, addEventListener() {}, removeEventListener() {} };
}

function fourFakeFilters() {
  const filters = {};
  for (let index = 0; index < 4; index += 1) filters[`#vhs-static-${index}`] = fakeFilterElement();
  return filters;
}

test("klatka przy widocznym elemencie ustawia --vhs-filter i --glitch", () => {
  const raf = createRafStub();
  const previousRAF = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = raf;
  try {
    const element = fakeElement();
    const root = fakeRoot([element]);
    const doc = fakeVarsDoc({ cssVars: { "--dread": "1", "--text-effects": "0.6" }, filters: fourFakeFilters() });
    const effects = createEffects({ root, doc, matchMedia: () => fakeMotionQuery(false) });

    effects.observe(root);
    assert.equal(raf.pending(), 1);
    raf.runFrame(0);

    assert.ok(element.hasProperty("--glitch"));
    assert.ok(element.hasProperty("--vhs-filter"));
    assert.match(String(element.getProperty("--vhs-filter")), /^url\(#vhs-static-\d\)$/);
  } finally {
    globalThis.requestAnimationFrame = previousRAF;
  }
});

test("klatka przy widocznym elemencie i niezerowej amplitudzie planuje kolejną klatkę", () => {
  const raf = createRafStub();
  const previousRAF = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = raf;
  try {
    const element = fakeElement();
    const root = fakeRoot([element]);
    const doc = fakeVarsDoc({ cssVars: { "--dread": "1", "--text-effects": "0.6" }, filters: fourFakeFilters() });
    const effects = createEffects({ root, doc, matchMedia: () => fakeMotionQuery(false) });

    effects.observe(root);
    raf.runFrame(0);

    assert.equal(raf.pending(), 1, "amplituda niezerowa i brak reduced-motion muszą podtrzymać pętlę");
  } finally {
    globalThis.requestAnimationFrame = previousRAF;
  }
});

test("klatka przy prefers-reduced-motion nie ustawia właściwości i nie planuje kolejnej", () => {
  const raf = createRafStub();
  const previousRAF = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = raf;
  try {
    const element = fakeElement();
    element.style.setProperty("--glitch", "1.000");
    element.style.setProperty("--vhs-filter", "url(#vhs-static-3)");
    const root = fakeRoot([element]);
    const doc = fakeVarsDoc({ cssVars: { "--dread": "1", "--text-effects": "1" }, filters: fourFakeFilters() });
    const effects = createEffects({ root, doc, matchMedia: () => fakeMotionQuery(true) });

    effects.observe(root);
    raf.runFrame(0);

    assert.equal(element.hasProperty("--glitch"), false);
    assert.equal(element.hasProperty("--vhs-filter"), false);
    assert.equal(raf.pending(), 0, "brak ruchu do animowania nie może planować kolejnej klatki");
  } finally {
    globalThis.requestAnimationFrame = previousRAF;
  }
});

test("klatka przy suwaku \"Efekty tekstu\" na zero zdejmuje właściwości i nie planuje kolejnej", () => {
  const raf = createRafStub();
  const previousRAF = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = raf;
  try {
    const element = fakeElement();
    element.style.setProperty("--glitch", "1.000");
    element.style.setProperty("--vhs-filter", "url(#vhs-static-3)");
    const root = fakeRoot([element]);
    const doc = fakeVarsDoc({ cssVars: { "--dread": "1", "--text-effects": "0" }, filters: fourFakeFilters() });
    const effects = createEffects({ root, doc, matchMedia: () => fakeMotionQuery(false) });

    effects.observe(root);
    raf.runFrame(0);

    assert.equal(element.hasProperty("--glitch"), false);
    assert.equal(element.hasProperty("--vhs-filter"), false);
    assert.equal(raf.pending(), 0, "suwak na zero nie ma czego animować dalej");
  } finally {
    globalThis.requestAnimationFrame = previousRAF;
  }
});

test("element wewnątrz ogniskowanego wpisu dostaje pełną ulgę jak spod wskaźnika", () => {
  const raf = createRafStub();
  const previousRAF = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = raf;
  try {
    const activeElement = { tag: "article.journal-entry" };
    const focusedElement = fakeElement();
    focusedElement.closest = (selector) => (selector === ".journal-entry" ? activeElement : null);
    const root = fakeRoot([focusedElement]);
    const doc = fakeVarsDoc({
      cssVars: { "--dread": "1", "--text-effects": "1" },
      filters: fourFakeFilters(),
      activeElement,
    });
    const effects = createEffects({ root, doc, matchMedia: () => fakeMotionQuery(false) });

    effects.observe(root);
    raf.runFrame(0);

    // Pełna ulga (proximity=1) daje amplitude = CEILING_PX * (1 - 0.85) = 0.39,
    // czyli najbliższy kubełek to indeks 0 (FLOOR_PX=0.4) — bez ulgi byłby to
    // indeks 3 (CEILING_PX=2.6).
    assert.equal(focusedElement.getProperty("--vhs-filter"), "url(#vhs-static-0)");
  } finally {
    globalThis.requestAnimationFrame = previousRAF;
  }
});

test("zapisy scale trafiają na cztery filtry", () => {
  const raf = createRafStub();
  const previousRAF = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = raf;
  try {
    const element = fakeElement();
    const root = fakeRoot([element]);
    const filters = fourFakeFilters();
    const doc = fakeVarsDoc({ cssVars: { "--dread": "1", "--text-effects": "0.6" }, filters });
    const effects = createEffects({ root, doc, matchMedia: () => fakeMotionQuery(false) });

    effects.observe(root);
    raf.runFrame(0);

    for (const key of Object.keys(filters)) {
      const scale = Number(filters[key].displacement.getAttribute("scale"));
      assert.ok(Number.isFinite(scale) && scale > 0, `${key} powinien mieć ustawione scale`);
    }
  } finally {
    globalThis.requestAnimationFrame = previousRAF;
  }
});
