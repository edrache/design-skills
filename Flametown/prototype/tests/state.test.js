import assert from 'node:assert/strict';
import { getClusterMembership } from '../src/clusters.js';
import {
  createNewWorld,
  createPieceDraft,
  placePiece,
  reconcileElementVariants,
  rebuildClusterState,
  syncHoveredCluster,
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

test('createNewWorld starts with zero placed pieces and empty element counts', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  assert.equal(state.placedPieceCount, 0);
  assert.deepEqual(state.elementCounts, {});
});

test('placePiece fills 4 cells, assigns element types, and increments counters', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  state.currentPiece = createPieceDraft(state, 'O', 0, () => 0.1);
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
  state.currentPiece = createPieceDraft(state, 'O', 0, () => 0.99);
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

test('placePiece spawns a resident for a newly placed house', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  state.currentPiece = {
    shapeId: 'O',
    rotation: 0,
    plannedCells: [
      { elementType: 'house' },
      { elementType: 'park' },
      { elementType: 'park' },
      { elementType: 'park' },
    ],
  };

  const ok = placePiece(state, 'O', 0, 3, 3, () => 0.1);

  assert.equal(ok, true);
  assert.equal(state.residents.length, 1);
  assert.deepEqual(state.residents[0].homeCell, { row: 3, col: 3 });
});

test('createNewWorld initializes all score buckets to zero', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  assert.deepEqual(state.scoreTotals, {
    Bread: 0,
    Crystal: 0,
    Iron: 0,
    Meat: 0,
    Plant: 0,
    Potion: 0,
  });
});

test('createPieceDraft plans exactly one element per tetromino cell', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  const piece = createPieceDraft(state, 'T', 0, () => 0.2);

  assert.equal(piece.plannedCells.length, 4);
  assert.ok(piece.plannedCells.every((cell) => typeof cell.elementType === 'string'));
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

test('createNewWorld initializes an empty cluster index', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  assert.deepEqual(state.clusterIndex.targetTypes, []);
  assert.equal(state.hoveredClusterSize, 0);
});

test('placePiece rebuilds cluster membership for connected houses', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  state.currentPiece = {
    shapeId: 'O',
    rotation: 0,
    plannedCells: new Array(4).fill(null).map(() => ({ elementType: 'house' })),
  };

  assert.equal(placePiece(state, 'O', 0, 3, 3, () => 0.1), true);
  assert.equal(getClusterMembership(state.clusterIndex, 3, 3, 'house')?.size, 4);
  assert.equal(getClusterMembership(state.clusterIndex, 4, 4, 'house')?.size, 4);
});

test('syncHoveredCluster highlights a concrete shop type through Any bridges only for that type', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  state.grid[2][2].elementType = 'Shop_CriticalRolls';
  state.grid[2][3].elementType = 'Shop_BizarreBazaar';
  state.grid[2][4].elementType = 'Shop_DrakeOfCakes';
  state.grid[2][5].elementType = 'Shop_DraconicTonic';
  rebuildClusterState(state);

  syncHoveredCluster(state, { row: 2, col: 2 });

  assert.equal(state.hoveredClusterSize, 3);
  assert.deepEqual(state.hoveredClusterCells, [
    { row: 2, col: 2 },
    { row: 2, col: 3 },
    { row: 2, col: 4 },
  ]);
  assert.deepEqual(state.hoveredClusterEntries, [
    {
      targetType: 'Bread',
      label: 'Bread',
      iconId: 'Bread',
      size: 3,
      isWildcardExpansion: false,
    },
  ]);
});

test('syncHoveredCluster unions matching clusters when hovering an Any shop', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  state.grid[1][1].elementType = 'Shop_CriticalRolls';
  state.grid[1][2].elementType = 'Shop_BizarreBazaar';
  state.grid[1][3].elementType = 'Shop_DraconicTonic';
  state.grid[2][2].elementType = 'house';
  state.grid[3][2].elementType = 'park';
  rebuildClusterState(state);

  syncHoveredCluster(state, { row: 1, col: 2 });

  assert.equal(state.hoveredClusterSize, 3);
  assert.deepEqual(state.hoveredClusterCells, [
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 1, col: 3 },
  ]);
  assert.deepEqual(state.hoveredClusterEntries, [
    {
      targetType: 'Bread',
      label: 'Bread',
      iconId: 'Bread',
      size: 2,
      isWildcardExpansion: true,
    },
    {
      targetType: 'Potion',
      label: 'Potion',
      iconId: 'Potion',
      size: 2,
      isWildcardExpansion: true,
    },
  ]);
});

test('syncHoveredCluster reports a house cluster only as houses', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  state.grid[3][3].elementType = 'house';
  state.grid[3][4].elementType = 'house';
  state.grid[3][5].elementType = 'park';
  rebuildClusterState(state);

  syncHoveredCluster(state, { row: 3, col: 3 });

  assert.equal(state.hoveredClusterSize, 2);
  assert.deepEqual(state.hoveredClusterCells, [
    { row: 3, col: 3 },
    { row: 3, col: 4 },
  ]);
  assert.deepEqual(state.hoveredClusterEntries, [
    {
      targetType: 'house',
      label: 'house',
      iconId: 'shop',
      size: 2,
      isWildcardExpansion: false,
    },
  ]);
});
