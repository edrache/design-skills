// Warstwa efektów: jedna pętla rAF, jeden IntersectionObserver, jeden filtr SVG.
// Elementy poza widokiem są wypisywane z pętli i mają zdejmowany filtr.

// Zakłócenie jest stanem domyślnym: nawet przy pełnej Poczytalności obraz lekko
// drga. Spadek Poczytalności podnosi amplitudę powyżej progu wygodnego czytania,
// bo gracz ma zawsze sposób jej zniesienia — wskaźnik uspokaja fragment.
export const FLOOR_PX = 0.4;
export const CEILING_PX = 2.6;
// Ulga pod wskaźnikiem zdejmuje 85% amplitudy: fragment staje się czytelny,
// ale nie przestaje istnieć.
const RELIEF = 0.85;
export const BUCKET_LEVELS = Object.freeze([0.4, 1.15, 1.9, 2.6]);

const FILTER = "url(#vhs-static)";
const PROXIMITY_RADIUS_PX = 220;
const FLASH_MS = 400;

const BURST_SLOT_MS = 900;
const BURST_LENGTH_MS = 140;
const SEED_STEP_SLOW_MS = 220;
const SEED_STEP_FAST_MS = 40;

const clamp01 = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
};

// Czysta funkcja — cała logika natężenia w jednym miejscu, testowalna bez DOM.
export function amplitudeFor({ dread = 0, textEffects = 0, proximity = 0, reducedMotion = false } = {}) {
  if (reducedMotion) return 0;
  const scale = clamp01(textEffects);
  if (scale === 0) return 0;
  const base = (FLOOR_PX + (CEILING_PX - FLOOR_PX) * clamp01(dread)) * scale;
  return base * (1 - RELIEF * clamp01(proximity));
}

// Deterministyczny skrót slotu na liczbę 0–1. Determinizm jest celowy: pozwala
// przetestować rozkład zrywów bez podstawiania generatora losowego.
function slotNoise(slot) {
  const value = Math.sin(slot * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

// Zwraca mnożnik amplitudy: 1 poza zrywem, więcej w jego trakcie.
export function burstAt(timeMs, dread = 0) {
  const time = Number(timeMs);
  if (!Number.isFinite(time) || time < 0) return 1;
  const level = clamp01(dread);
  const slot = Math.floor(time / BURST_SLOT_MS);
  if (slotNoise(slot) >= 0.05 + 0.45 * level) return 1;

  const into = time - slot * BURST_SLOT_MS;
  if (into >= BURST_LENGTH_MS) return 1;
  const envelope = Math.sin((into / BURST_LENGTH_MS) * Math.PI);
  return 1 + 1.2 * level * envelope;
}

// Pełzanie szumu: ziarno przeskakuje skokowo, a częstotliwość faluje w sposób
// ciągły, żeby obraz nie zamierał między przeskokami.
export function crawlAt(timeMs, dread = 0) {
  const time = Number.isFinite(Number(timeMs)) ? Math.max(0, Number(timeMs)) : 0;
  const level = clamp01(dread);
  const step = SEED_STEP_SLOW_MS + (SEED_STEP_FAST_MS - SEED_STEP_SLOW_MS) * level;
  const seed = Math.floor(time / step) % 1000;
  const rate = 0.0008 + 0.0052 * level;
  const frequencyY = 0.04 + 0.03 * Math.sin(time * rate);
  return { seed, frequencyY };
}

export function bucketFor(amplitude) {
  const value = Number(amplitude);
  if (!Number.isFinite(value)) return 0;
  let best = 0;
  for (let index = 1; index < BUCKET_LEVELS.length; index += 1) {
    if (Math.abs(value - BUCKET_LEVELS[index]) < Math.abs(value - BUCKET_LEVELS[best])) best = index;
  }
  return best;
}

function readNumber(doc, name) {
  try {
    const raw = doc.defaultView?.getComputedStyle(doc.documentElement).getPropertyValue(name);
    return Number(raw) || 0;
  } catch {
    return 0;
  }
}

export function createEffects({ root, doc = root?.ownerDocument ?? null, matchMedia = globalThis.matchMedia } = {}) {
  const noop = { observe() {}, flash() {}, unobserveAll() {}, recompute() {}, destroy() {} };
  if (!root || !doc || typeof globalThis.requestAnimationFrame !== "function") return noop;

  // Wszystkie elementy kiedykolwiek przekazane do observe(), niezależnie od
  // tego, czy są akurat w widoku (a więc w `active`) — potrzebne, żeby
  // unobserveAll() mogło odpiąć również te, które nigdy nie weszły do `active`.
  const observed = new Set();
  const active = new Set();
  const pointer = { x: 0, y: 0, seen: false };
  let running = false;
  let frameId = 0;
  const motionQuery = matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;

  const observer = typeof globalThis.IntersectionObserver === "function"
    ? new globalThis.IntersectionObserver((records) => {
        for (const record of records) {
          if (record.isIntersecting) active.add(record.target);
          else {
            active.delete(record.target);
            record.target.style.removeProperty("filter");
            record.target.style.removeProperty("--glitch");
          }
        }
        start();
      })
    : null;

  function onPointer(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.seen = true;
    start();
  }

  function proximityTo(element) {
    if (!pointer.seen) return 0;
    const box = element.getBoundingClientRect();
    const dx = Math.max(box.left - pointer.x, 0, pointer.x - box.right);
    const dy = Math.max(box.top - pointer.y, 0, pointer.y - box.bottom);
    const distance = Math.hypot(dx, dy);
    return Math.max(0, 1 - distance / PROXIMITY_RADIUS_PX);
  }

  function tick() {
    frameId = 0;
    running = false;

    const dread = readNumber(doc, "--dread");
    const textEffects = readNumber(doc, "--text-effects");
    const reducedMotion = Boolean(motionQuery?.matches);

    if (pointer.seen) {
      const box = root.getBoundingClientRect();
      root.style.setProperty("--px", String((pointer.x - box.left) / (box.width || 1)));
      root.style.setProperty("--py", String((pointer.y - box.top) / (box.height || 1)));
    }

    let peak = 0;
    for (const element of active) {
      const amplitude = amplitudeFor({ dread, textEffects, proximity: proximityTo(element), reducedMotion });
      peak = Math.max(peak, amplitude);
      // Poniżej progu zdejmujemy filtr, a nie wyciszamy: zero kosztu renderowania.
      if (amplitude < 0.05) {
        element.style.removeProperty("filter");
        element.style.removeProperty("--glitch");
        continue;
      }
      element.style.setProperty("--glitch", amplitude.toFixed(3));
      element.style.filter = FILTER;
    }

    const displacement = doc.querySelector("#vhs-static feDisplacementMap");
    if (displacement) displacement.setAttribute("scale", peak.toFixed(3));

    // Pętla NIE wznawia się sama: przy nieruchomym wskaźniku wartości byłyby
    // identyczne w każdej klatce, więc dalsze rAF-y byłyby czystym marnotrawstwem.
    // Budzi ją dopiero ruch wskaźnika (onPointer) albo zmiana widoczności (observer).
  }

  function start() {
    if (running || frameId) return;
    running = true;
    frameId = globalThis.requestAnimationFrame(tick);
  }

  // Zmiana ustawienia systemowego "prefers-reduced-motion" w locie musi też
  // obudzić pętlę, inaczej efekty zostają w stanie sprzed zmiany aż do
  // najbliższego ruchu wskaźnika.
  function onMotionChange() {
    start();
  }

  root.addEventListener("pointermove", onPointer, { passive: true });
  root.addEventListener("pointerdown", onPointer, { passive: true });
  motionQuery?.addEventListener?.("change", onMotionChange);

  // Odpina wszystkie dotąd obserwowane elementy: przerywa obserwację, zdejmuje
  // pozostawiony filtr/--glitch i czyści zbiory. Wspólna dla destroy() i dla
  // wywołania z main.js przed przerysowaniem dziennika, żeby IntersectionObserver
  // nie trzymał w nieskończoność referencji do odłączonych od DOM węzłów.
  function unobserveAll() {
    for (const element of observed) {
      observer?.unobserve(element);
      element.style.removeProperty("filter");
      element.style.removeProperty("--glitch");
    }
    observed.clear();
    active.clear();
  }

  return {
    observe(block) {
      if (!block?.querySelectorAll) return;
      for (const element of block.querySelectorAll("[data-effect]")) {
        observed.add(element);
        // Bez IntersectionObserver rezygnujemy z optymalizacji, nie z efektu.
        if (observer) observer.observe(element);
        else active.add(element);
      }
      start();
    },

    // Jednorazowe zaburzenie trackingu na świeżo dołożonym wpisie.
    flash(block) {
      if (!block?.classList) return;
      block.classList.add("tracking-flash");
      globalThis.setTimeout?.(() => block.classList.remove("tracking-flash"), FLASH_MS);
    },

    unobserveAll,

    // Wymusza przeliczenie na najbliższej klatce, nawet gdy wskaźnik stoi
    // w miejscu — potrzebne po zmianie ustawienia "Efekty tekstu" na suwaku,
    // żeby filtry zdjęte przez zjazd do zera nie czekały na ruch wskaźnika.
    recompute() {
      start();
    },

    destroy() {
      root.removeEventListener("pointermove", onPointer);
      root.removeEventListener("pointerdown", onPointer);
      motionQuery?.removeEventListener?.("change", onMotionChange);
      unobserveAll();
      observer?.disconnect();
      if (frameId) globalThis.cancelAnimationFrame?.(frameId);
    },
  };
}
