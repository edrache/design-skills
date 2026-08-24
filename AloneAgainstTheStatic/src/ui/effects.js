// Warstwa efektów: jedna pętla rAF, jeden IntersectionObserver, jeden filtr SVG.
// Elementy poza widokiem są wypisywane z pętli i mają zdejmowany filtr.

export const MAX_AMPLITUDE_PX = 1.5;
const FILTER = "url(#vhs-static)";
const PROXIMITY_RADIUS_PX = 220;
const FLASH_MS = 400;

// Czysta funkcja — cała logika natężenia w jednym miejscu, testowalna bez DOM.
export function amplitudeFor({ dread = 0, textEffects = 0, proximity = 0, reducedMotion = false } = {}) {
  if (reducedMotion) return 0;
  const clamp = (value) => Math.max(0, Math.min(1, Number(value) || 0));
  const base = clamp(dread) * clamp(textEffects);
  if (base === 0) return 0;
  // Bliskość wskaźnika podwaja amplitudę, nie tworzy jej.
  return Math.min(MAX_AMPLITUDE_PX, base * (1 + clamp(proximity)) * (MAX_AMPLITUDE_PX / 2));
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
  const noop = { observe() {}, flash() {}, unobserveAll() {}, destroy() {} };
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

  root.addEventListener("pointermove", onPointer, { passive: true });
  root.addEventListener("pointerdown", onPointer, { passive: true });

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

    destroy() {
      root.removeEventListener("pointermove", onPointer);
      root.removeEventListener("pointerdown", onPointer);
      unobserveAll();
      observer?.disconnect();
      if (frameId) globalThis.cancelAnimationFrame?.(frameId);
    },
  };
}
