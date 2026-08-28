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

// Dysk nie jest kołem: składa się z plam, które krążą wokół wskaźnika po
// własnych orbitach i pulsują promieniem, więc jego brzeg oddycha. Sześć to
// kompromis — mniej czyta się jak trzy nachodzące koła, więcej kosztuje warstw
// maski w każdej klatce i w każdym maskowanym elemencie.
export const BLOB_COUNT = 6;
// Pierścień fali chodzi tym samym szumem, ale inną geometrią: kilka odłamków
// o lekko rozjechanych środkach i promieniach. Anularnego kształtu nie da się
// złożyć z plam, bo CSS nie umie przecinać masek wewnątrz jednej warstwy.
export const RING_SHARDS = 4;
export const RING_JITTER_PX = 18;

// Fala nie rozchodzi się ze stałą prędkością: rusza leniwie i rozpędza się
// przez całe swoje życie. Uderzenie zostaje wtedy przy punkcie kliknięcia
// na tyle długo, żeby dało się je zobaczyć, a dopiero potem ucieka z ekranu.
export const WAVE_LIFE_MS = 720;
export const WAVE_REACH_PX = 900;
export const WAVE_EASE = 2.2;
export const WAVE_THICKNESS_PX = 120;
export const WAVE_GAIN = 2.4;

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

// Pierścień: promień rośnie z rozpędem (WAVE_EASE), wzmocnienie gaśnie
// liniowo z czasem — najmocniejsze jest przy kliknięciu, gdy fala dopiero
// odrywa się od punktu uderzenia. Zwraca null, gdy fali nie ma — to jedyny
// sygnał "nic nie rysuj".
export function waveAt(timeMs, wave) {
  const time = Number(timeMs);
  const at = Number(wave?.at);
  if (!Number.isFinite(time) || !Number.isFinite(at)) return null;
  const elapsed = time - at;
  if (elapsed < 0 || elapsed >= WAVE_LIFE_MS) return null;
  const progress = elapsed / WAVE_LIFE_MS;
  const radius = WAVE_REACH_PX * progress ** WAVE_EASE;
  return { radius, gain: 1 + (WAVE_GAIN - 1) * (1 - progress) };
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

// Szum kształtu: suma dwóch sinusów o niewspółmiernych okresach.
// Deterministyczny z założenia — klon i oryginał liczą swoje maski osobno, ale
// w tej samej klatce i z tym samym czasem, więc obie krawędzie muszą wyjść
// identyczne. Math.random() rozjechałby je o klatkę i w obwódce dysku pokazałby
// oryginał.
export function shapeNoise(index, timeMs, seed = 0) {
  const i = Number(index) || 0;
  const t = Number(timeMs) || 0;
  const slow = Math.sin(i * 1.73 + seed * 3.11 + t / 260);
  const fast = Math.sin(i * 4.31 + seed * 1.97 + t / 97);
  return slow * 0.65 + fast * 0.35;
}

// Plamy dysku: jeden rdzeń pod samym wskaźnikiem i pięć satelitów krążących
// wokół niego. Rdzeń jest po to, żeby pod kursorem nie otwierała się dziura
// w dziurze — satelity same z siebie zostawiłyby w środku prześwit oryginału.
const CORE_ORBIT = 0.06;
const CORE_RADIUS = 0.55;
const BLOB_ORBIT = 0.32;
const BLOB_RADIUS = 0.55;
const BLOB_WOBBLE = 0.15;
// Pełny obrót satelitów. Wolno: kształt ma pełzać, a nie wirować.
const ORBIT_PERIOD_MS = 5200;

export function discBlobs({ x = 0, y = 0, radius = DISC_RADIUS_PX, time = 0 } = {}) {
  const cx = Number(x) || 0;
  const cy = Number(y) || 0;
  const r = Number(radius) || DISC_RADIUS_PX;
  const t = Number(time) || 0;
  const blobs = [];
  const satellites = BLOB_COUNT - 1;

  for (let index = 0; index < BLOB_COUNT; index += 1) {
    const wobble = shapeNoise(index, t, 5);
    const core = index === 0;
    // Rdzeń dryfuje wokół samego wskaźnika, satelity krążą po orbicie;
    // wspólny obrót w czasie plus własny szum każdego z nich.
    const angle = core
      ? shapeNoise(index, t, 13) * Math.PI
      : ((index - 1) / satellites) * Math.PI * 2 + (t / ORBIT_PERIOD_MS) * Math.PI * 2 + shapeNoise(index, t, 13) * 0.6;
    const orbit = r * (core ? CORE_ORBIT : BLOB_ORBIT * (1 + shapeNoise(index, t, 29) * BLOB_WOBBLE));
    // Zasięg plamy przycięty do promienia dysku: bez tego maska odwrotna
    // wygryzłaby w oryginale dziurę tam, gdzie klon jest już wygaszony.
    const wanted = r * (core ? CORE_RADIUS : BLOB_RADIUS) * (1 + wobble * BLOB_WOBBLE);
    blobs.push({
      cx: cx + Math.cos(angle) * orbit,
      cy: cy + Math.sin(angle) * orbit,
      r: Math.max(1, Math.min(wanted, r - orbit)),
    });
  }
  return blobs;
}

// Stopnie gradientu są wspólne dla wersji prostej i odwróconej: suma alfy
// obu masek musi wynosić 1 także na miękkiej krawędzi, inaczej w obwódce
// dysku tekst blednie, zamiast przechodzić z oryginału w klon.
const CORE_STOP = `${(DISC_CORE * 100).toFixed(0)}%`;

function blobLayer(blob, invert) {
  const inner = invert ? "transparent" : "#000";
  const outer = invert ? "#000" : "transparent";
  const round = (value) => value.toFixed(2);
  return `radial-gradient(circle ${round(blob.r)}px at ${round(blob.cx)}px ${round(blob.cy)}px, ${inner} ${CORE_STOP}, ${outer} 100%)`;
}

// Pierścień: przezroczysty w środku, kryjący w obręczy, przezroczysty poza nią.
// Odłamek to ten sam pierścień, tylko z przesuniętym środkiem i promieniem —
// kilka takich warstw daje obręcz rwaną, a nie wyrysowaną cyrklem.
function ringLayer(x, y, radius, invert, shard = 0, time = 0) {
  const band = invert ? "transparent" : "#000";
  const rest = invert ? "#000" : "transparent";
  const drift = shapeNoise(shard, time, 11) * RING_JITTER_PX;
  const lift = shapeNoise(shard, time, 23) * RING_JITTER_PX;
  const swell = 1 + shapeNoise(shard, time, 31) * 0.08;
  const center = Math.max(0, radius * swell);
  const half = (WAVE_THICKNESS_PX * 0.6) / 2;
  const from = Math.max(0, center - half);
  const to = center + half;
  return `radial-gradient(circle ${to.toFixed(2)}px at ${(x + drift).toFixed(2)}px ${(y + lift).toFixed(2)}px, ${rest} ${from.toFixed(2)}px, ${band} ${center.toFixed(2)}px, ${rest} ${to.toFixed(2)}px)`;
}

function ringLayers(x, y, radius, invert, time) {
  return Array.from({ length: RING_SHARDS }, (_, shard) => ringLayer(x, y, radius, invert, shard, time));
}

export function discMask({ x = 0, y = 0, radius = DISC_RADIUS_PX, wave = null, invert = false, time = 0 } = {}) {
  const layers = discBlobs({ x, y, radius, time }).map((blob) => blobLayer(blob, invert));
  if (wave) layers.push(...ringLayers(Number(wave.x) || 0, Number(wave.y) || 0, Number(wave.radius) || 0, invert, time));
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
export function ringMask(ring, invert = false, time = 0) {
  const { x = 0, y = 0, radius = 0 } = ring ?? {};
  return {
    image: ringLayers(Number(x) || 0, Number(y) || 0, Number(radius) || 0, invert, time).join(", "),
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
  function maskFor(box, active, invert, time) {
    const ring = active ? { x: wave.x - box.left, y: wave.y - box.top, radius: active.radius } : null;
    if (!pointer.seen || (ring && !composite)) return ringMask(ring, invert, time);
    return discMask({ x: pointer.x - box.left, y: pointer.y - box.top, wave: ring, invert, time });
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
      // Ten sam `time` dla klonu i dla oryginału: kształt plam jest funkcją
      // czasu, więc dwie różne wartości w jednej klatce rozjechałyby krawędzie
      // i w obwódce dysku pokazałyby oryginał pod klonem.
      writeMask(record.ghost, maskFor(entry.getBoundingClientRect(), active, false, time));
      for (const node of record.masked) {
        writeMask(node, maskFor(node.getBoundingClientRect(), active, true, time));
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
