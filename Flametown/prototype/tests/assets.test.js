import assert from 'node:assert/strict';
import { detectVariants, loadAssetManifest, loadNamedImages } from '../src/assets.js';

function test(name, fn) {
  return fn().then(
    () => console.log(`PASS: ${name}`),
    (err) => {
      console.error(`FAIL: ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  );
}

function fakeLoader(existingUrls) {
  return (url) => Promise.resolve(existingUrls.has(url) ? { url } : null);
}

await test('detectVariants stops at the first missing file', async () => {
  const loader = fakeLoader(new Set(['tiles/house_1.png', 'tiles/house_2.png']));
  const variants = await detectVariants('house', 'tiles', 20, loader);
  assert.equal(variants.length, 2);
});

await test('detectVariants returns an empty array when no variant files exist', async () => {
  const loader = fakeLoader(new Set());
  const variants = await detectVariants('ghost', 'tiles', 20, loader);
  assert.deepEqual(variants, []);
});

await test('detectVariants respects the maxVariants safety cap', async () => {
  const loader = (url) => Promise.resolve(url.includes('_') ? {} : null);
  const variants = await detectVariants('infinite', 'tiles', 5, loader);
  assert.equal(variants.length, 5);
});

await test('detectVariants loads a direct unnumbered asset when present', async () => {
  const loader = fakeLoader(new Set(['tiles/Shop_DracoBell.png']));
  const variants = await detectVariants('Shop_DracoBell', 'tiles', 20, loader);
  assert.equal(variants.length, 1);
  assert.equal(variants[0].url, 'tiles/Shop_DracoBell.png');
});

await test('loadAssetManifest builds a map keyed by catalog id', async () => {
  const catalog = [{ id: 'house' }, { id: 'Shop_DracoBell' }];
  const loader = fakeLoader(new Set(['tiles/house_1.png', 'tiles/Shop_DracoBell.png']));
  const manifest = await loadAssetManifest(catalog, 'tiles', 20, loader);
  assert.equal(manifest.house.length, 1);
  assert.equal(manifest.Shop_DracoBell.length, 1);
});

await test('loadNamedImages loads a direct manifest keyed by logical id', async () => {
  const loader = fakeLoader(
    new Set(['assets/icons/Icon_Shop.png', 'assets/icons/Icon_GoodsToken_Bread.png'])
  );
  const manifest = await loadNamedImages(
    {
      shop: 'assets/icons/Icon_Shop.png',
      Bread: 'assets/icons/Icon_GoodsToken_Bread.png',
    },
    loader
  );
  assert.equal(manifest.shop.url, 'assets/icons/Icon_Shop.png');
  assert.equal(manifest.Bread.url, 'assets/icons/Icon_GoodsToken_Bread.png');
});
