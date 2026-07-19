import assert from 'node:assert/strict';
import { createNewWorld, placePiece, reconcileElementVariants } from '../src/state.js';

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test('createNewWorld starts with zero placed pieces and empty element counts', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  assert.equal(state.placedPieceCount, 0);
  assert.deepEqual(state.elementCounts, {});
});

test('placePiece fills 4 cells, assigns element types, and increments counters', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  const ok = placePiece(state, 'O', 0, 3, 3, () => 0.1);
  assert.equal(ok, true);
  assert.equal(state.placedPieceCount, 1);

  for (const [row, col] of [
    [3, 3],
    [3, 4],
    [4, 3],
    [4, 4],
  ]) {
    assert.notEqual(state.grid[row][col].elementType, null);
    assert.equal(state.grid[row][col].pieceId, 1);
  }

  const totalCounted = Object.values(state.elementCounts).reduce((sum, count) => sum + count, 0);
  assert.equal(totalCounted, 4);
});

test('placePiece allows at most one shop element per tetromino', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  const ok = placePiece(state, 'O', 0, 3, 3, () => 0.99);
  assert.equal(ok, true);

  const placedTypes = [
    state.grid[3][3].elementType,
    state.grid[3][4].elementType,
    state.grid[4][3].elementType,
    state.grid[4][4].elementType,
  ];
  const shopCount = placedTypes.filter((type) => type.startsWith('Shop_')).length;

  assert.equal(shopCount, 1);
});

test('placePiece rejects an illegal placement and leaves state unchanged', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  placePiece(state, 'O', 0, 3, 3, () => 0.1);
  const before = JSON.stringify(state.grid);
  const ok = placePiece(state, 'O', 0, 6, 6, () => 0.1);
  assert.equal(ok, false);
  assert.equal(state.placedPieceCount, 1);
  assert.equal(JSON.stringify(state.grid), before);
});

test('a second piece touching the first is accepted', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  placePiece(state, 'O', 0, 3, 3, () => 0.1);
  const ok = placePiece(state, 'O', 0, 3, 5, () => 0.1);
  assert.equal(ok, true);
  assert.equal(state.placedPieceCount, 2);
});

test('reconcileElementVariants backfills missing variants for already placed cells', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  state.grid[2][2] = {
    elementType: 'park',
    elementVariant: null,
    pieceId: 7,
    roads: { N: false, E: false, S: false, W: false },
  };

  const changed = reconcileElementVariants(state, {
    park: [{ id: 'park_1' }, { id: 'park_2' }],
  });

  assert.equal(changed, true);
  assert.notEqual(state.grid[2][2].elementVariant, null);
  assert.ok(state.grid[2][2].elementVariant >= 0);
  assert.ok(state.grid[2][2].elementVariant <= 1);
});

test('reconcileElementVariants clears stale variant indices when no images exist', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  state.grid[1][1] = {
    elementType: 'Shop_DracoBell',
    elementVariant: 3,
    pieceId: 2,
    roads: { N: false, E: false, S: false, W: false },
  };

  const changed = reconcileElementVariants(state, {});

  assert.equal(changed, true);
  assert.equal(state.grid[1][1].elementVariant, null);
});
