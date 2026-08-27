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
