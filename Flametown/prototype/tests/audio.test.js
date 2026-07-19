import assert from 'node:assert/strict';
import { SHOP_SOUND_ASSET_PATHS, clampVolume, createGameAudio, resolvePlaybackRate } from '../src/audio.js';

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('shop goods types map to the expected audio files', () => {
  assert.deepEqual(SHOP_SOUND_ASSET_PATHS, {
    Bread: 'assets/audio/Shop_A.wav',
    Crystal: 'assets/audio/Shop_C.wav',
    Iron: 'assets/audio/Shop_D.wav',
    Meat: 'assets/audio/Shop_E.wav',
    Plant: 'assets/audio/Shop_F.wav',
    Potion: 'assets/audio/Shop_G.wav',
  });
});

test('preload warms every configured shop sound', () => {
  const loaded = [];
  const audioManager = createGameAudio({
    shopSoundAssetPaths: {
      Bread: 'bread.wav',
      Meat: 'meat.wav',
    },
    createAudio(assetPath) {
      return {
        src: assetPath,
        load() {
          loaded.push(assetPath);
        },
        cloneNode() {
          return this;
        },
        play() {
          return Promise.resolve();
        },
      };
    },
  });

  audioManager.preload();
  assert.deepEqual(loaded, ['bread.wav', 'meat.wav']);
});

test('playShopSound clones and plays the configured sound for a goods type', () => {
  const played = [];
  const playbackRates = [];
  const volumes = [];
  const audioManager = createGameAudio({
    shopSoundAssetPaths: {
      Bread: 'bread.wav',
    },
    volume: 0.35,
    basePlaybackRate: 1,
    playbackRateJitter: 0.1,
    rng() {
      return 1;
    },
    createAudio(assetPath) {
      return {
        src: assetPath,
        cloneNode() {
          return {
            set volume(value) {
              volumes.push(value);
            },
            set playbackRate(value) {
              playbackRates.push(value);
            },
            play() {
              played.push(assetPath);
              return Promise.resolve();
            },
          };
        },
        play() {
          played.push(`base:${assetPath}`);
          return Promise.resolve();
        },
      };
    },
  });

  assert.equal(audioManager.playShopSound('Bread'), true);
  assert.deepEqual(played, ['bread.wav']);
  assert.deepEqual(volumes, [0.35]);
  assert.deepEqual(playbackRates, [1.1]);
});

test('playShopSound is a no-op for unknown goods types', () => {
  const audioManager = createGameAudio({
    shopSoundAssetPaths: {},
    createAudio() {
      throw new Error('should not be called');
    },
  });

  assert.equal(audioManager.playShopSound('Unknown'), false);
});

test('resolvePlaybackRate returns the base rate when jitter is disabled', () => {
  assert.equal(resolvePlaybackRate(1.05, 0, () => 0), 1.05);
});

test('resolvePlaybackRate applies symmetric random jitter around the base rate', () => {
  assert.equal(resolvePlaybackRate(1, 0.1, () => 0), 0.9);
  assert.equal(resolvePlaybackRate(1, 0.1, () => 0.5), 1);
  assert.equal(resolvePlaybackRate(1, 0.1, () => 1), 1.1);
});

test('clampVolume keeps audio volume inside the supported range', () => {
  assert.equal(clampVolume(-1), 0);
  assert.equal(clampVolume(0.4), 0.4);
  assert.equal(clampVolume(2), 1);
});
