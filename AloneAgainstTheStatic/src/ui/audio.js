import { createPlaylist } from "./playlist.js";

const TICK_MS = 50;
const CROSSFADE_MS = 6000;
const CROSSFADE_STEP = TICK_MS / CROSSFADE_MS;
const CROSSFADE_SECONDS = CROSSFADE_MS / 1000;

function volume(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

// Narracja i muzyka są opcjonalne. Brak plików, polityka autoplay i niedostępne
// API dźwięku kończą się ciszą, a nie zepsutym dziennikiem.
export function createAudio(media, settings) {
  const base = new URL("../../", import.meta.url);
  const nodes = new Set();
  // node -> { gain, target }: gain to postęp przenikania (0–1), a realna
  // głośność to gain × suwak. Dzięki temu ruch suwaka w trakcie crossfade'u
  // skaluje obie ścieżki, zamiast przerywać przenikanie.
  const fades = new Map();
  let narration = null;
  let playlist = null;
  let current = null;
  let ticker = null;
  let halted = false;
  let awaitingGesture = false;

  function masterVolume() {
    return volume(settings.values.musicVolume, 0.4);
  }

  function applyGain(node) {
    const fade = fades.get(node);
    if (!fade) return;
    try { node.volume = volume(fade.gain * masterVolume()); }
    catch { /* Cisza jest dopuszczalnym wynikiem. */ }
  }

  function pause(node) {
    if (!node) return;
    try { node.pause(); } catch { /* Cisza jest dopuszczalnym wynikiem. */ }
    nodes.delete(node);
  }

  function release(node) {
    fades.delete(node);
    if (current === node) current = null;
    pause(node);
  }

  function makeNode(src) {
    if (typeof src !== "string" || !src.trim() || typeof globalThis.Audio !== "function") return null;
    try {
      const node = new globalThis.Audio(new URL(src, base));
      nodes.add(node);
      return node;
    } catch {
      return null;
    }
  }

  function startTicker() {
    if (ticker === null) ticker = setInterval(tick, TICK_MS);
  }

  function stopTicker() {
    if (ticker === null) return;
    clearInterval(ticker);
    ticker = null;
  }

  function needsCrossfade(node) {
    const duration = Number(node.duration);
    const position = Number(node.currentTime);
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) return false;
    return duration - position <= CROSSFADE_SECONDS;
  }

  function tick() {
    for (const [node, fade] of [...fades]) {
      if (fade.gain !== fade.target) {
        const distance = Math.min(CROSSFADE_STEP, Math.abs(fade.target - fade.gain));
        fade.gain += fade.target > fade.gain ? distance : -distance;
        applyGain(node);
      }
      if (fade.gain === 0 && fade.target === 0) release(node);
    }

    if (current && needsCrossfade(current)) advanceTrack();
    if (fades.size === 0) stopTicker();
  }

  function armGesture() {
    const target = globalThis.document;
    if (awaitingGesture || typeof target?.addEventListener !== "function") return;
    awaitingGesture = true;
    const retry = () => {
      target.removeEventListener?.("pointerdown", retry);
      target.removeEventListener?.("keydown", retry);
      awaitingGesture = false;
      resumeMusic();
    };
    target.addEventListener("pointerdown", retry);
    target.addEventListener("keydown", retry);
  }

  // Odrzucone play() to najczęściej polityka autoplay: uciszamy się i czekamy
  // na pierwszy gest gracza, zamiast zasypywać przeglądarkę próbami.
  function failMusic(node) {
    const wasCurrent = current === node;
    release(node);
    if (!wasCurrent) return;
    haltMusic();
    armGesture();
  }

  function playNode(node) {
    let failedSynchronously = false;
    try {
      const result = node.play();
      result?.catch?.(() => failMusic(node));
    } catch {
      failedSynchronously = true;
      failMusic(node);
    }
    return !failedSynchronously;
  }

  function onEnded(node) {
    if (node !== current) {
      release(node);
      return;
    }
    // Zabezpieczenie na wypadek nieznanej długości utworu — wtedy przenikanie
    // nie ma się kiedy zacząć i po prostu wchodzi kolejny kawałek.
    advanceTrack();
  }

  function advanceTrack() {
    const node = makeNode(playlist?.next());
    if (!node) {
      stopMusic();
      return;
    }

    const previous = current;
    node.loop = false;
    fades.set(node, { gain: 0, target: 1 });
    applyGain(node);
    node.addEventListener?.("ended", () => onEnded(node));
    current = node;

    if (!playNode(node)) return;
    const previousFade = fades.get(previous);
    if (previousFade) previousFade.target = 0;
    startTicker();
  }

  function haltMusic() {
    halted = true;
    stopTicker();
    for (const node of [...fades.keys()]) {
      if (node === current) pause(node);
      else release(node);
    }
  }

  function resumeMusic() {
    if (!playlist) return;
    if (masterVolume() === 0) {
      haltMusic();
      return;
    }
    halted = false;
    if (!current) {
      advanceTrack();
      return;
    }
    nodes.add(current);
    if (playNode(current)) startTicker();
  }

  function stopMusic() {
    stopTicker();
    for (const node of [...fades.keys()]) release(node);
    current = null;
    halted = false;
  }

  function stopNarration() {
    pause(narration);
    narration = null;
  }

  settings.subscribe?.((values) => {
    if (!values.narration) stopNarration();
    else if (narration) narration.volume = volume(values.narrationVolume, 0.9);

    if (volume(values.musicVolume, 0.4) === 0) {
      if (!halted) haltMusic();
      return;
    }
    if (halted) resumeMusic();
    else for (const node of fades.keys()) applyGain(node);
  });

  return {
    playNarration(entryId, locale) {
      stopNarration();
      if (!settings.values.narration) return;
      const src = media?.entries?.[String(entryId)]?.audio?.[locale];
      const node = makeNode(src);
      if (!node) return;
      narration = node;
      node.volume = volume(settings.values.narrationVolume, 0.9);
      try {
        node.play()?.catch?.(() => {});
      } catch { /* Cisza jest dopuszczalnym wynikiem. */ }
    },

    startMusic(tracks) {
      stopMusic();
      playlist = createPlaylist(tracks);
      resumeMusic();
    },

    stopMusic() {
      playlist = null;
      stopMusic();
    },

    stopAll() {
      stopTicker();
      playlist = null;
      current = null;
      halted = false;
      fades.clear();
      for (const node of [...nodes]) {
        try { node.pause(); } catch { /* Cisza jest dopuszczalnym wynikiem. */ }
      }
      nodes.clear();
      narration = null;
    },
  };
}
