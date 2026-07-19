export const SHOP_SOUND_ASSET_PATHS = {
  Bread: 'assets/audio/Shop_A.wav',
  Crystal: 'assets/audio/Shop_C.wav',
  Iron: 'assets/audio/Shop_D.wav',
  Meat: 'assets/audio/Shop_E.wav',
  Plant: 'assets/audio/Shop_F.wav',
  Potion: 'assets/audio/Shop_G.wav',
};

export function resolvePlaybackRate(
  basePlaybackRate = 1,
  playbackRateJitter = 0,
  rng = Math.random
) {
  const jitter = Math.max(0, playbackRateJitter);
  if (jitter === 0) {
    return basePlaybackRate;
  }
  const randomOffset = (rng() * 2 - 1) * jitter;
  return Math.max(0.01, basePlaybackRate + randomOffset);
}

export function clampVolume(volume = 1) {
  return Math.min(1, Math.max(0, volume));
}

export function defaultCreateAudio(url) {
  const audio = new Audio(url);
  audio.preload = 'auto';
  return audio;
}

export function createGameAudio({
  shopSoundAssetPaths = SHOP_SOUND_ASSET_PATHS,
  createAudio = defaultCreateAudio,
  volume = 1,
  basePlaybackRate = 1,
  playbackRateJitter = 0,
  rng = Math.random,
} = {}) {
  const shopSounds = Object.fromEntries(
    Object.entries(shopSoundAssetPaths).map(([goodsType, assetPath]) => [goodsType, createAudio(assetPath)])
  );

  function warmAudio(audio) {
    if (typeof audio?.load === 'function') {
      audio.load();
    }
  }

  return {
    preload() {
      Object.values(shopSounds).forEach(warmAudio);
    },
    playShopSound(goodsType) {
      const baseAudio = shopSounds[goodsType];
      if (!baseAudio) {
        return false;
      }

      const playableAudio =
        typeof baseAudio.cloneNode === 'function' ? baseAudio.cloneNode() : createAudio(baseAudio.src);

      playableAudio.volume = clampVolume(volume);
      playableAudio.playbackRate = resolvePlaybackRate(basePlaybackRate, playbackRateJitter, rng);

      if (typeof playableAudio.play === 'function') {
        const playResult = playableAudio.play();
        if (typeof playResult?.catch === 'function') {
          playResult.catch(() => {});
        }
      }
      return true;
    },
  };
}
