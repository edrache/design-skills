const FADE_MS = 2500;
const TICK_MS = 50;
const FADE_STEPS = FADE_MS / TICK_MS;

function volume(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

// Narration and music are optional. Missing assets, browser autoplay policy, and
// unavailable audio APIs all result in silence rather than breaking the journal.
export function createAudio(media, settings) {
  const base = new URL("../../", import.meta.url);
  const timers = new Map();
  const nodes = new Set();
  let narration = null;
  let music = null;
  let currentScene = null;

  function forgetTimer(node, timer) {
    clearInterval(timer);
    const nodeTimers = timers.get(node);
    nodeTimers?.delete(timer);
    if (nodeTimers?.size === 0) timers.delete(node);
  }

  function clearNodeTimers(node) {
    const nodeTimers = timers.get(node);
    if (!nodeTimers) return;
    for (const timer of nodeTimers) clearInterval(timer);
    timers.delete(node);
  }

  function clearTimers() {
    for (const node of timers.keys()) clearNodeTimers(node);
  }

  function everyTick(node, callback) {
    const timer = setInterval(() => callback(() => forgetTimer(node, timer)), TICK_MS);
    const nodeTimers = timers.get(node) ?? new Set();
    nodeTimers.add(timer);
    timers.set(node, nodeTimers);
  }

  function pause(node) {
    if (!node) return;
    clearNodeTimers(node);
    try { node.pause(); } catch { /* Optional media must remain silent on failure. */ }
    nodes.delete(node);
  }

  function play(node, onFailure = () => {}) {
    let failedSynchronously = false;
    const fail = () => {
      failedSynchronously = true;
      onFailure();
    };
    try {
      const result = node.play();
      result?.catch?.(fail);
    } catch {
      fail();
    }
    return !failedSynchronously;
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

  function fadeOut(node) {
    if (!node) return;
    clearNodeTimers(node);
    const step = Math.max(volume(node.volume) / FADE_STEPS, 1 / FADE_STEPS);
    if (volume(node.volume) === 0) {
      pause(node);
      return;
    }
    everyTick(node, (done) => {
      node.volume = Math.max(0, volume(node.volume) - step);
      if (node.volume === 0) {
        done();
        try { node.pause(); } catch { /* Silence is the fallback. */ }
        nodes.delete(node);
      }
    });
  }

  function fadeIn(node) {
    clearNodeTimers(node);
    const target = volume(settings.values.musicVolume, 0.4);
    if (target === 0) return;
    const step = target / FADE_STEPS;
    everyTick(node, (done) => {
      node.volume = Math.min(target, volume(node.volume) + step);
      if (node.volume >= target) done();
    });
  }

  function stopNarration() {
    pause(narration);
    narration = null;
  }

  settings.subscribe?.((values) => {
    if (!values.narration) stopNarration();
    else if (narration) narration.volume = volume(values.narrationVolume, 0.9);

    if (music) {
      clearNodeTimers(music);
      music.volume = volume(values.musicVolume, 0.4);
    }
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
      play(node);
    },

    playScene(scene) {
      if (!scene || scene === currentScene) return;
      const previous = music;
      currentScene = scene;
      music = null;
      fadeOut(previous);

      const node = makeNode(media?.scenes?.[scene]);
      if (!node) return;
      music = node;
      node.loop = true;
      node.volume = 0;
      const failed = () => {
        pause(node);
        if (music === node) music = null;
        if (currentScene === scene) currentScene = null;
      };
      if (play(node, failed) && music === node) fadeIn(node);
    },

    stopAll() {
      clearTimers();
      for (const node of [...nodes]) {
        try { node.pause(); } catch { /* Silence is the fallback. */ }
      }
      nodes.clear();
      narration = null;
      music = null;
      currentScene = null;
    },
  };
}
