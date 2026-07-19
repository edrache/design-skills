import assert from 'node:assert/strict';
import {
  buyMarketTile,
  clampGridSize,
  createNewWorld,
  deserializeState,
  placePiece,
  serializeState,
  startRunWithStarter,
} from '../src/state.js';

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

test('serializeState then deserializeState round-trips grid contents', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  state.camera = { x: 10, y: 20, zoom: 1 };
  placePiece(state, 'O', 0, 3, 3, () => 0.1);
  state.scoreTotals.Bread = 3;
  startRunWithStarter(state, 'starter-draco-bell', () => 0.5);
  state.marketState.offers = [
    {
      offerId: 'starter-critical-rolls',
      offerType: 'starter',
      tileId: 'starter-critical-rolls',
      name: 'Critical Rolls',
      goodsType: 'Bread',
      shopElementType: 'Shop_CriticalRolls',
      shapeId: 'O',
      plannedCells: ['house', 'park', 'park', 'Shop_CriticalRolls'],
      costEntries: [{ goodsType: 'Any', amount: 100 }],
    },
  ];
  state.scoreTotals.Bread = 100;
  buyMarketTile(state, 0, () => 0.5);
  state.buildingCooldowns['3:3'] = {
    startedAtMs: 10,
    readyAtMs: 20,
    cooldownMs: 10,
  };
  const json = serializeState(state);
  const data = deserializeState(json);
  assert.equal(data.gridSize, 8);
  assert.equal(data.cells[3][3].elementType, state.grid[3][3].elementType);
  assert.equal(data.placedPieceCount, 1);
  assert.equal(data.starterTileId, 'starter-draco-bell');
  assert.equal(data.deckState.hand.length, 1);
  assert.equal(data.deckState.discardPile.at(-1)?.tileId, 'starter-critical-rolls');
  assert.equal(data.buildingCooldowns['3:3'].readyAtMs, 20);
  assert.equal(data.marketState.refreshCost, 300);
  assert.deepEqual(data.marketState.offers[0].costEntries, [{ goodsType: 'Any', amount: 100 }]);
});

test('deserializeState rejects an unsupported save version', () => {
  assert.throws(() => deserializeState(JSON.stringify({ version: 99 })));
});

test('deserializeState rejects malformed JSON by throwing (caller is responsible for catching)', () => {
  assert.throws(() => deserializeState('not json'));
});

test('clampGridSize clamps out-of-range and non-numeric values', () => {
  assert.equal(clampGridSize(4, 16, 512), 16);
  assert.equal(clampGridSize(9999, 16, 512), 512);
  assert.equal(clampGridSize('abc', 16, 512), 16);
  assert.equal(clampGridSize(256, 16, 512), 256);
});
