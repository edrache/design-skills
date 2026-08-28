// Warstwa efektów: jedna pętla rAF, jeden IntersectionObserver, cztery kubełki
// filtra SVG (vhs-static-0…3, wybierane przez bucketFor). Elementy poza
// widokiem są wypisywane z pętli i mają zdejmowany filtr.
//
// Ta sama pętla obsługuje drugi, niezależny efekt: warstwę szaleństwa na
// grafikach paragrafów ([data-madness], patrz src/ui/madness.js). Osobna pętla
// rAF byłaby marnotrawstwem — oba efekty czytają te same --dread i
// --text-effects i oba muszą zmieniać się co klatkę.

import { madnessBase, pulseAt } from "./madness.js";

// Zakłócenie jest stanem domyślnym: nawet przy pełnej Poczytalności obraz lekko
// drga. Spadek Poczytalności podnosi amplitudę powyżej progu wygodnego czytania,
// bo gracz ma zawsze sposób jej zniesienia — wskaźnik uspokaja fragment.
export const FLOOR_PX = 0.4;
export const CEILING_PX = 2.6;
// Ulga pod wskaźnikiem zdejmuje 85% amplitudy: fragment staje się czytelny,
// ale nie przestaje istnieć.
const RELIEF = 0.85;
export const BUCKET_LEVELS = Object.freeze([0.4, 1.15, 1.9, 2.6]);

const PROXIMITY_RADIUS_PX = 220;
const FLASH_MS = 400;

const BURST_SLOT_MS = 900;
const BURST_LENGTH_MS = 140;
const SEED_STEP_SLOW_MS = 220;
const SEED_STEP_FAST_MS = 40;

const RELIEF_TOUCH_MS = 2500;
const AMPLITUDE_EPSILON = 0.02;

// Warstwa szaleństwa. Przy prefers-reduced-motion zostaje samo przenikanie,
// o połowę słabsze i bez zniekształcenia — narracja się broni, a nic nie miga.
const MADNESS_EPSILON = 0.01;
const MADNESS_REDUCED_BLEND = 0.5;
// Maksymalne przesunięcia filtra #madness-warp w pikselach: pasma trackingu
// rwą kadr grubo, ziarno tylko go szarpie.
const MADNESS_BAND_PX = 26;
const MADNESS_GRAIN_PX = 5;

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

// Mysz daje ulgę trwałą, dopóki wskaźnik jest nad dziennikiem. Dotyk nie
// zostaje na ekranie, więc jego ulga wygasa liniowo.
export function reliefWeight(pointer, timeMs) {
  if (!pointer?.seen) return 0;
  if (!pointer.touch) return 1;
  const elapsed = Number(timeMs) - Number(pointer.at);
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  return Math.max(0, 1 - elapsed / RELIEF_TOUCH_MS);
}

// Kanał klawiaturowy dla ulgi: element wewnątrz ogniskowanego wpisu ma
// dostawać pełną ulgę, tak samo jak spod wskaźnika. Czysta funkcja — bierze
// już wyliczony węzeł wpisu (`element.closest(".journal-entry")`) i element
// aktywny z dokumentu, żadnych zapytań DOM w środku.
export function focusRelief(entry, activeElement) {
  if (!entry || !activeElement) return 0;
  if (entry === activeElement) return 1;
  return typeof entry.contains === "function" && entry.contains(activeElement) ? 1 : 0;
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
  // Cele warstwy szaleństwa idą osobnymi zbiorami, bo liczy się je z zupełnie
  // innego wzoru — ale przez tego samego IntersectionObservera.
  const madnessObserved = new Set();
  const madnessActive = new Set();
  const pointer = { x: 0, y: 0, seen: false, touch: false, at: 0 };
  let running = false;
  let frameId = 0;
  const motionQuery = matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;

  // Źródło czasu odporne na brak `performance` (np. w środowisku testowym).
  const now = () => globalThis.performance?.now?.() ?? 0;

  // Referencje do czterech filtrów SVG i ich węzłów wewnętrznych, zebrane raz
  // przy tworzeniu instancji — zamiast 16 zapytań DOM na każdą klatkę pętli.
  // Brak filtrów w dokumencie (np. w testach) nie wywraca modułu: wpis
  // zostaje z samymi `null`, a pętla go po prostu przeskakuje.
  const filterRefs = BUCKET_LEVELS.map((_, index) => {
    const filter = doc.querySelector(`#vhs-static-${index}`);
    return {
      turbulence: filter?.querySelector("feTurbulence") ?? null,
      displacement: filter?.querySelector("feDisplacementMap") ?? null,
    };
  });

  // #madness-warp ma po dwa węzły każdego rodzaju: pasma trackingu i ziarno.
  // Jeden filtr dla wszystkich figur wystarcza — na ekranie jest ich najwyżej
  // kilka, więc kubełki jak przy tekście byłyby kosztem bez zysku.
  const madnessFilter = doc.querySelector("#madness-warp");
  const madnessTurbulences = [...(madnessFilter?.querySelectorAll?.("feTurbulence") ?? [])];
  const madnessDisplacements = [...(madnessFilter?.querySelectorAll?.("feDisplacementMap") ?? [])];

  const observer = typeof globalThis.IntersectionObserver === "function"
    ? new globalThis.IntersectionObserver((records) => {
        for (const record of records) {
          // Ten sam obserwator obsługuje dwa rodzaje celów, więc o tym, do
          // którego zbioru trafia węzeł, decyduje to, jak został zgłoszony.
          const madness = madnessObserved.has(record.target);
          const bucket = madness ? madnessActive : active;
          if (record.isIntersecting) bucket.add(record.target);
          else {
            bucket.delete(record.target);
            if (madness) clearMadness(record.target);
            else {
              record.target.style.removeProperty("--vhs-filter");
              record.target.style.removeProperty("--glitch");
            }
          }
        }
        start();
      })
    : null;

  function clearMadness(element) {
    element.style.removeProperty("--madness-blend");
    element.style.removeProperty("--madness-filter");
  }

  function onPointer(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.seen = true;
    pointer.touch = event.pointerType === "touch";
    pointer.at = now();
    start();
  }

  function onPointerLeave() {
    pointer.seen = false;
    start();
  }

  function onFocusChange() {
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

    const time = now();
    const dread = readNumber(doc, "--dread");
    const textEffects = readNumber(doc, "--text-effects");
    const textEffectsScale = clamp01(textEffects);
    const reducedMotion = Boolean(motionQuery?.matches);
    const pointerRelief = reliefWeight(pointer, time);
    const burst = burstAt(time, dread);

    if (pointer.seen) {
      const box = root.getBoundingClientRect();
      root.style.setProperty("--py", String((pointer.y - box.top) / (box.height || 1)));
    }

    let anyVisible = false;
    for (const element of active) {
      // Pomiar prostokąta jest kosztowny i bez sensu, gdy ulga ze wskaźnika
      // jest zerowa — ale zerowa ulga ze wskaźnika nie znaczy zerowej ulgi
      // w ogóle, bo ognisko klawiaturowe liczy się niezależnie (patrz niżej).
      const pointerProximity = pointerRelief > 0 ? proximityTo(element) * pointerRelief : 0;
      const entry = typeof element.closest === "function" ? element.closest(".journal-entry") : null;
      const keyboardRelief = focusRelief(entry, doc.activeElement);
      // Ulga ze wskaźnika i ulga z ogniskowania sumują się przez maksimum:
      // wystarczy jedno z dwóch, żeby fragment się uspokoił.
      const proximity = Math.max(pointerProximity, keyboardRelief);
      const amplitude = amplitudeFor({ dread, textEffects, proximity, reducedMotion });
      if (amplitude < AMPLITUDE_EPSILON) {
        element.style.removeProperty("--vhs-filter");
        element.style.removeProperty("--glitch");
        continue;
      }
      anyVisible = true;
      // --glitch to drugi konsument amplitudy (text-shadow) — zryw musi go
      // dotykać tak samo jak feDisplacementMap, inaczej litery skaczą, a
      // rozszczepienie barwne stoi w miejscu. Próg wygaszenia wyżej sprawdza
      // się na amplitudzie BEZ zrywu, żeby zryw nie ożywiał wygaszonych.
      element.style.setProperty("--glitch", (amplitude * burst).toFixed(3));
      // Kubełek wybieramy w przestrzeni poziomów (0.4–2.6), nie w przestrzeni
      // po przeskalowaniu suwakiem — inaczej suwak działałby binarnie: tylko
      // dokładne zero cokolwiek zmienia. `textEffectsScale` > 0 tutaj, bo
      // amplitude >= AMPLITUDE_EPSILON > 0 wymaga scale > 0.
      const bucketIndex = bucketFor(amplitude / textEffectsScale);
      element.style.setProperty("--vhs-filter", `url(#vhs-static-${bucketIndex})`);
    }

    // Drugi przebieg: warstwa szaleństwa na grafikach. Czyta te same `dread`
    // i `textEffectsScale`, więc nie kosztuje ani jednego odczytu CSS więcej.
    let maxWarp = 0;
    for (const element of madnessActive) {
      const entry = typeof element.closest === "function" ? element.closest(".journal-entry") : null;
      const base = madnessBase({ entryId: entry?.dataset?.entryId, dread }) * textEffectsScale;
      const { blend, warp } = reducedMotion
        ? { blend: base * MADNESS_REDUCED_BLEND, warp: 0 }
        : pulseAt(time, base);
      if (blend < MADNESS_EPSILON) {
        clearMadness(element);
        continue;
      }
      element.style.setProperty("--madness-blend", blend.toFixed(3));
      if (warp < MADNESS_EPSILON) element.style.removeProperty("--madness-filter");
      else {
        element.style.setProperty("--madness-filter", "url(#madness-warp)");
        if (warp > maxWarp) maxWarp = warp;
      }
    }
    // Samo przenikanie stoi w miejscu, więc pętli nie podtrzymuje — robi to
    // dopiero zniekształcenie, które musi się zmieniać z klatki na klatkę.
    if (maxWarp > 0) anyVisible = true;

    const { seed, frequencyY } = crawlAt(time, dread);
    for (let index = 0; index < BUCKET_LEVELS.length; index += 1) {
      const { turbulence, displacement } = filterRefs[index];
      turbulence?.setAttribute("baseFrequency", `0.9 ${frequencyY.toFixed(4)}`);
      turbulence?.setAttribute("seed", String(seed));
      displacement?.setAttribute("scale", (BUCKET_LEVELS[index] * textEffectsScale * burst).toFixed(3));
    }

    // Oba stopnie #madness-warp dostają wspólne `seed` (żeby rwały zgodnie) i
    // własne skale. Drugie ziarno jest przesunięte, bo identyczna turbulencja
    // dwa razy z rzędu tylko pogłębia to samo przesunięcie, zamiast dokładać
    // nową fakturę.
    madnessTurbulences[0]?.setAttribute("seed", String(seed));
    madnessTurbulences[1]?.setAttribute("seed", String((seed + 137) % 1000));
    madnessDisplacements[0]?.setAttribute("scale", (MADNESS_BAND_PX * maxWarp).toFixed(2));
    madnessDisplacements[1]?.setAttribute("scale", (MADNESS_GRAIN_PX * maxWarp).toFixed(2));

    // Ta pętla MUSI się podtrzymywać, odwrotnie niż poprzednia wersja modułu.
    // Wtedy nie było generatora zmiany w czasie, więc kolejne klatki byłyby
    // identyczne. Teraz szum pełza i zrywa, więc zatrzymanie pętli zamroziłoby
    // obraz. Gaśnie dopiero, gdy nie ma czego animować.
    if (anyVisible && !reducedMotion) start();
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
  root.addEventListener("pointerleave", onPointerLeave, { passive: true });
  // `focusin`/`focusout` bąbelkują (inaczej niż `focus`/`blur`), więc jedna
  // para nasłuchów na kontenerze wystarcza, żeby budzić pętlę przy zmianie
  // ogniskowania wewnątrz dowolnego wpisu dziennika.
  root.addEventListener("focusin", onFocusChange);
  root.addEventListener("focusout", onFocusChange);
  motionQuery?.addEventListener?.("change", onMotionChange);

  // Odpina wszystkie dotąd obserwowane elementy: przerywa obserwację, zdejmuje
  // pozostawiony filtr/--glitch i czyści zbiory. Wspólna dla destroy() i dla
  // wywołania z main.js przed przerysowaniem dziennika, żeby IntersectionObserver
  // nie trzymał w nieskończoność referencji do odłączonych od DOM węzłów.
  function unobserveAll() {
    for (const element of observed) {
      observer?.unobserve(element);
      element.style.removeProperty("--vhs-filter");
      element.style.removeProperty("--glitch");
    }
    for (const element of madnessObserved) {
      observer?.unobserve(element);
      clearMadness(element);
    }
    observed.clear();
    active.clear();
    madnessObserved.clear();
    madnessActive.clear();
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
      for (const element of block.querySelectorAll("[data-madness]")) {
        madnessObserved.add(element);
        if (observer) observer.observe(element);
        else madnessActive.add(element);
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
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("focusin", onFocusChange);
      root.removeEventListener("focusout", onFocusChange);
      motionQuery?.removeEventListener?.("change", onMotionChange);
      unobserveAll();
      observer?.disconnect();
      if (frameId) globalThis.cancelAnimationFrame?.(frameId);
    },
  };
}
