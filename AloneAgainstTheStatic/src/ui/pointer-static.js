// Zakłócenia pod wskaźnikiem: drugi, niezależny kanał efektów tekstu.
// Kanał pierwszy (src/ui/effects.js) robi rzecz odwrotną — szum bazowy rośnie
// ze spadkiem Poczytalności, a wskaźnik go ZDEJMUJE. Ten moduł nie dotyka
// tamtego: własny suwak (--pointer-static), własny promień, własna pętla,
// własny filtr (#pointer-static).

export const DISC_RADIUS_PX = 140;
// Twardy rdzeń: do 40% promienia zniekształcenie jest pełne, dalej gaśnie.
// Bez rdzenia dysk czyta się jak plama, a nie jak dziura w taśmie.
export const DISC_CORE = 0.4;

export const LETTER_PX = 3.5;
export const SLICE_PX = 6;
export const GRAIN_OPACITY = 0.35;

export const WAVE_SPEED_PX_MS = 1.6;
export const WAVE_LIFE_MS = 520;
export const WAVE_THICKNESS_PX = 120;
export const WAVE_GAIN = 2.4;
export const WAVE_REACH_PX = WAVE_SPEED_PX_MS * WAVE_LIFE_MS;

const clamp01 = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
};

export function discFalloff(distancePx, radiusPx = DISC_RADIUS_PX) {
  const distance = Number(distancePx);
  const radius = Number(radiusPx);
  if (!Number.isFinite(distance) || !Number.isFinite(radius) || radius <= 0) return 0;
  if (distance <= radius * DISC_CORE) return 1;
  if (distance >= radius) return 0;
  const edge = (distance - radius * DISC_CORE) / (radius * (1 - DISC_CORE));
  return 1 - edge;
}

// Pierścień: promień rośnie liniowo w czasie, wzmocnienie gaśnie z promieniem.
// Zwraca null, gdy fali nie ma — to jedyny sygnał "nic nie rysuj".
export function waveAt(timeMs, wave) {
  const time = Number(timeMs);
  const at = Number(wave?.at);
  if (!Number.isFinite(time) || !Number.isFinite(at)) return null;
  const elapsed = time - at;
  if (elapsed < 0 || elapsed >= WAVE_LIFE_MS) return null;
  const radius = elapsed * WAVE_SPEED_PX_MS;
  const decay = 1 - elapsed / WAVE_LIFE_MS;
  return { radius, gain: 1 + (WAVE_GAIN - 1) * decay };
}

export function staticScale({ strength = 0, reducedMotion = false, waveGain = 1 } = {}) {
  if (reducedMotion) return { letter: 0, slice: 0, grain: 0 };
  const scale = clamp01(strength);
  if (scale === 0) return { letter: 0, slice: 0, grain: 0 };
  const gain = Number.isFinite(Number(waveGain)) ? Math.max(1, Number(waveGain)) : 1;
  return {
    letter: LETTER_PX * scale * gain,
    slice: SLICE_PX * scale * gain,
    // Ziarno to alfa, nie przemieszczenie — wzmocnienie fali nie może
    // wypchnąć jej poza jedynkę, bo dalej nic już się nie dzieje.
    grain: Math.min(1, GRAIN_OPACITY * scale * gain),
  };
}

// Stopnie gradientu są wspólne dla wersji prostej i odwróconej: suma alfy
// obu masek musi wynosić 1 także na miękkiej krawędzi, inaczej w obwódce
// dysku tekst blednie, zamiast przechodzić z oryginału w klon.
const CORE_STOP = `${(DISC_CORE * 100).toFixed(0)}%`;

function discLayer(x, y, radius, invert) {
  const inner = invert ? "transparent" : "#000";
  const outer = invert ? "#000" : "transparent";
  return `radial-gradient(circle ${radius}px at ${x}px ${y}px, ${inner} ${CORE_STOP}, ${outer} 100%)`;
}

// Pierścień: przezroczysty w środku, kryjący w obręczy, przezroczysty poza nią.
function ringLayer(x, y, radius, invert) {
  const band = invert ? "transparent" : "#000";
  const rest = invert ? "#000" : "transparent";
  const half = WAVE_THICKNESS_PX / 2;
  const from = Math.max(0, radius - half);
  const to = radius + half;
  return `radial-gradient(circle ${to}px at ${x}px ${y}px, ${rest} ${from}px, ${band} ${radius}px, ${rest} ${to}px)`;
}

export function discMask({ x = 0, y = 0, radius = DISC_RADIUS_PX, wave = null, invert = false } = {}) {
  const layers = [discLayer(Number(x) || 0, Number(y) || 0, Number(radius) || DISC_RADIUS_PX, invert)];
  if (wave) layers.push(ringLayer(Number(wave.x) || 0, Number(wave.y) || 0, Number(wave.radius) || 0, invert));
  // Klon pokazuje sumę obszarów, oryginał — dopełnienie tej sumy:
  // ¬(dysk ∪ pierścień) = ¬dysk ∩ ¬pierścień.
  return { image: layers.join(", "), composite: invert ? "intersect" : "add" };
}

// Maska samego pierścienia, bez warstwy dysku. Potrzebna w dwóch sytuacjach:
// gdy dysku nie ma (wskaźnik poza dziennikiem albo dotyk, który nie najeżdża),
// oraz gdy przeglądarka nie umie składać warstw maski i pierścień musi dysk
// ZASTĄPIĆ. Współrzędne poza pudełkiem elementu wystarczą — warstwy dysku
// nie da się „wypchnąć w nieskończoność", bo `Infinitypx` to niepoprawny CSS
// i przeglądarka odrzuciłaby całą deklarację maski razem z pierścieniem.
export function ringMask(ring, invert = false) {
  const { x = 0, y = 0, radius = 0 } = ring ?? {};
  return {
    image: ringLayer(Number(x) || 0, Number(y) || 0, Number(radius) || 0, invert),
    composite: invert ? "intersect" : "add",
  };
}

function readNumber(doc, name) {
  try {
    const raw = doc.defaultView?.getComputedStyle(doc.documentElement).getPropertyValue(name);
    return Number(raw) || 0;
  } catch {
    return 0;
  }
}

// `mask-composite` jest warunkiem sumowania dysku z pierścieniem. Gdy go nie
// ma, pierścień ZASTĘPUJE dysk na czas fali — efekt zostaje, traci tylko
// nakładanie się obu obszarów. Bez tego sprawdzenia druga warstwa maski
// w takiej przeglądarce zsumowałaby się także w wariancie odwróconym,
// czyli oryginał przeświecałby pod klonem.
function supportsComposite() {
  try {
    return Boolean(globalThis.CSS?.supports?.("mask-composite", "add"));
  } catch {
    return false;
  }
}

// Kolejność zapisu jest bezpieczna: przeliczenie stylu następuje dopiero po
// wyjściu ze skryptu, więc przeglądarka nigdy nie widzi nowego `mask-image`
// ze starym `mask-composite`.
function writeMask(element, { image, composite }) {
  const { style } = element;
  style.setProperty("mask-image", image);
  style.setProperty("-webkit-mask-image", image);
  style.setProperty("mask-composite", composite);
}

function clearMask(element) {
  for (const property of ["mask-image", "-webkit-mask-image", "mask-composite"]) {
    element.style.removeProperty(property);
  }
}

// Elementy ORYGINAŁU, którym pętla zdejmuje piksele maską odwrotną — czyli
// dokładnie to, co w klonie ma być widoczne: proza i figura kadru. Maskowana
// jest cała figura, nie sam kadr: warstwa szaleństwa jest z nim zlana trybem
// screen, więc rozdzielenie ich zostawiłoby w dysku samo świecenie oczu.
//
// Akapit wypisywany jest z efektu wyłączony: reveal.js przepisuje jego węzły
// tekstowe co klatkę, więc klon nie miałby szans nadążyć — a maska odwrotna
// wygryzłaby w oryginale dziurę wypełnioną nieaktualnym tekstem.
export function maskedNodes(entry) {
  return [...(entry?.children ?? [])].filter((node) => {
    if (node.tagName === "P") return node.dataset?.typing === undefined;
    return node.tagName === "FIGURE" && node.classList?.contains?.("entry-art");
  });
}

export function createPointerStatic({ root, doc = root?.ownerDocument ?? null, matchMedia = globalThis.matchMedia } = {}) {
  const noop = {
    syncEntry() {}, dropEntry() {}, dropAll() {}, recompute() {}, destroy() {},
  };
  if (!root || !doc || typeof globalThis.requestAnimationFrame !== "function") return noop;

  // entry → { ghost, masked }: kontener klonu i te elementy ORYGINAŁU,
  // którym trzeba zdejmować maskę odwrotną.
  const ghosts = new Map();
  const pointer = { x: 0, y: 0, seen: false };
  let wave = null;
  let frameId = 0;
  const composite = supportsComposite();
  const motionQuery = matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
  const now = () => globalThis.performance?.now?.() ?? 0;

  // Referencje do węzłów filtra zebrane raz, wzorem `filterRefs` z effects.js.
  // Brak filtra w dokumencie (np. w testach) zostawia same `null`, a pętla
  // przepisuje wtedy tylko maski.
  const filter = doc.querySelector("#pointer-static");
  const nodes = {
    letter: filter?.querySelector('[result="letter-noise"]') ?? null,
    wobble: filter?.querySelector('[result="wobbled"]') ?? null,
    slice: filter?.querySelector('[result="slice-noise"]') ?? null,
    sliced: filter?.querySelector('[result="sliced"]') ?? null,
    grain: filter?.querySelector('[result="grain"]') ?? null,
  };

  function strength() {
    return readNumber(doc, "--pointer-static");
  }

  function silenced() {
    return strength() <= 0 || Boolean(motionQuery?.matches);
  }

  // Zdjęcie maski znaczy „widać wszystko", a nie „nie widać nic", więc sam
  // clearMask na klonie pokazałby cały wpis zniekształcony. Klon gasimy
  // widocznością i dopiero potem porządkujemy maski.
  function conceal(record) {
    record.ghost.style.visibility = "hidden";
    clearMask(record.ghost);
    for (const node of record.masked) clearMask(node);
  }

  function dropEntry(entry) {
    const record = ghosts.get(entry);
    if (!record) return;
    record.ghost.remove?.();
    for (const node of record.masked) clearMask(node);
    ghosts.delete(entry);
  }

  function dropAll() {
    for (const entry of [...ghosts.keys()]) dropEntry(entry);
  }

  // Klon powstaje od zera przy każdej synchronizacji: DOM wpisu zmienia się
  // rzadko (domknięty akapit, dołożone wybory, przerysowanie), a próba
  // łatania klonu w miejscu kosztowałaby więcej niż ponowne sklonowanie.
  function syncEntry(entry) {
    if (!entry?.cloneNode) return;
    dropEntry(entry);
    if (silenced()) return;

    const masked = maskedNodes(entry);
    if (masked.length === 0) return;

    const ghost = doc.createElement("div");
    ghost.className = "static-ghost";
    ghost.setAttribute("aria-hidden", "true");
    // `inert` trzyma klon poza kolejnością tabulacji i poza czytnikiem ekranu.
    ghost.setAttribute("inert", "");
    // Do pierwszej klatki pętli klon jest niewidoczny: nie ma jeszcze maski,
    // a atrybuty filtra pamiętają poprzednią klatkę.
    ghost.style.visibility = "hidden";
    const copy = entry.cloneNode(true);
    // Klon nie może zawierać drugiego klonu ani niczego, co się ogniskuje.
    for (const nested of copy.querySelectorAll?.(".static-ghost") ?? []) nested.remove();
    // Kopia akapitu wypisywanego pokazywałaby w dysku nieaktualny tekst.
    // Gasimy ją widocznością, nie usuwamy — układ klonu musi zostać co do
    // piksela taki jak oryginału.
    for (const typing of copy.querySelectorAll?.("[data-typing]") ?? []) typing.style.visibility = "hidden";
    ghost.append(copy);
    entry.append(ghost);
    ghosts.set(entry, { ghost, masked });
    start();
  }

  function onPointerMove(event) {
    if (event.pointerType === "touch") return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.seen = true;
    start();
  }

  function onPointerLeave() {
    pointer.seen = false;
    start();
  }

  // Dotyk nie ma najechania, więc na telefonie zostaje sam pierścień.
  function onPointerDown(event) {
    wave = { x: event.clientX, y: event.clientY, at: now() };
    start();
  }

  // Jedna ścieżka liczenia maski dla kontenera klonu i dla akapitów oryginału:
  // różni je wyłącznie prostokąt odniesienia i odwrócenie. Współrzędne
  // gradientu liczą się względem pudełka MASKOWANEGO elementu, więc każdy
  // poziom przelicza te same współrzędne ekranowe osobno — i dzięki temu obie
  // maski się zgadzają.
  function maskFor(box, active, invert) {
    const ring = active ? { x: wave.x - box.left, y: wave.y - box.top, radius: active.radius } : null;
    if (!pointer.seen || (ring && !composite)) return ringMask(ring, invert);
    return discMask({ x: pointer.x - box.left, y: pointer.y - box.top, wave: ring, invert });
  }

  function tick() {
    frameId = 0;
    if (silenced()) {
      dropAll();
      return;
    }

    const time = now();
    const active = waveAt(time, wave);
    if (!active) wave = null;

    const scale = staticScale({ strength: strength(), waveGain: active?.gain ?? 1 });
    const seed = Math.floor(time / 60) % 1000;
    nodes.letter?.setAttribute("seed", String(seed));
    nodes.slice?.setAttribute("seed", String((seed * 7) % 1000));
    nodes.wobble?.setAttribute("scale", scale.letter.toFixed(3));
    nodes.sliced?.setAttribute("scale", scale.slice.toFixed(3));
    nodes.grain?.querySelector?.("feFuncA")?.setAttribute("slope", scale.grain.toFixed(3));

    // Dysk chodzi za wskaźnikiem, fala żyje niezależnie od niego. Gdy nie ma
    // ani jednego, ani drugiego, nie ma czego odsłaniać w żadnym wpisie.
    const visible = pointer.seen || Boolean(active);

    for (const [entry, record] of [...ghosts]) {
      // Wpis wyrzucony z dokumentu bez dropEntry trzymałby referencję w mapie
      // do końca sesji — pętla zbiera takie po sobie.
      if (entry.isConnected === false) {
        dropEntry(entry);
        continue;
      }
      if (!visible) {
        conceal(record);
        continue;
      }

      record.ghost.style.visibility = "";
      record.ghost.style.setProperty("--ghost-split", scale.letter.toFixed(3));
      writeMask(record.ghost, maskFor(entry.getBoundingClientRect(), active, false));
      for (const node of record.masked) {
        writeMask(node, maskFor(node.getBoundingClientRect(), active, true));
      }
    }

    // Pętla podtrzymuje się, dopóki jest co animować: szum pełza w czasie,
    // więc zatrzymanie jej zamroziłoby obraz pod nieruchomym wskaźnikiem.
    // Gaśnie sama, gdy nie ma klonów albo gdy zniknął i dysk, i fala.
    if (ghosts.size > 0 && (pointer.seen || wave)) start();
  }

  function start() {
    if (frameId) return;
    frameId = globalThis.requestAnimationFrame(tick);
  }

  function onMotionChange() {
    start();
  }

  root.addEventListener("pointermove", onPointerMove, { passive: true });
  root.addEventListener("pointerdown", onPointerDown, { passive: true });
  root.addEventListener("pointerleave", onPointerLeave, { passive: true });
  motionQuery?.addEventListener?.("change", onMotionChange);

  return {
    syncEntry,
    dropEntry,
    dropAll,

    // Wymusza przeliczenie na najbliższej klatce, nawet gdy wskaźnik stoi
    // w miejscu — potrzebne po ruchu suwaka, żeby zjazd do zera zdjął klony
    // bez czekania na ruch wskaźnika.
    recompute: start,

    destroy() {
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerleave", onPointerLeave);
      motionQuery?.removeEventListener?.("change", onMotionChange);
      dropAll();
      if (frameId) globalThis.cancelAnimationFrame?.(frameId);
    },
  };
}
