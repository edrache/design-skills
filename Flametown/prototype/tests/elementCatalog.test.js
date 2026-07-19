import assert from 'node:assert/strict';
import { ELEMENT_CATALOG, pickWeightedElement, catalogEntry } from '../src/elementCatalog.js';

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

test('catalogEntry finds a known type and throws on unknown', () => {
  const entry = catalogEntry('house');
  assert.equal(entry.id, 'house');
  assert.throws(() => catalogEntry('nonexistent'));
});

test('pickWeightedElement picks the only available type when catalog has one entry', () => {
  const catalog = [{ id: 'solo', weight: 1, maxCount: Infinity, emoji: '⭐' }];
  assert.equal(pickWeightedElement({}, () => 0.5, catalog), 'solo');
});

test('pickWeightedElement respects relative weights at the roll boundaries', () => {
  const catalog = [
    { id: 'a', weight: 1, maxCount: Infinity, emoji: 'A' },
    { id: 'b', weight: 3, maxCount: Infinity, emoji: 'B' },
  ];
  assert.equal(pickWeightedElement({}, () => 0, catalog), 'a');
  assert.equal(pickWeightedElement({}, () => 0.26, catalog), 'b');
});

test('pickWeightedElement excludes types that reached maxCount', () => {
  const catalog = [
    { id: 'capped', weight: 10, maxCount: 2, emoji: 'C' },
    { id: 'open', weight: 1, maxCount: Infinity, emoji: 'O' },
  ];
  const counts = { capped: 2 };
  assert.equal(pickWeightedElement(counts, () => 0.01, catalog), 'open');
});

test('pickWeightedElement falls back to the full catalog (never throws) when everything is capped', () => {
  const catalog = [{ id: 'onlyone', weight: 1, maxCount: 1, emoji: 'X' }];
  const counts = { onlyone: 1 };
  assert.doesNotThrow(() => pickWeightedElement(counts, () => 0.5, catalog));
  assert.equal(pickWeightedElement(counts, () => 0.5, catalog), 'onlyone');
});

test('the default catalog has no exceedingly low caps that would starve a 256x256 game', () => {
  for (const entry of ELEMENT_CATALOG) {
    assert.ok(entry.maxCount === Infinity || entry.maxCount >= 1000);
  }
});
