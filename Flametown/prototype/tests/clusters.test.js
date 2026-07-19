import assert from 'node:assert/strict';
import {
  buildClusterIndex,
  cellMatchesClusterType,
  findCluster,
  getClusterMembership,
} from '../src/clusters.js';
import { getElementShopGroups } from '../src/elementCatalog.js';

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

function createGrid(typeRows) {
  return typeRows.map((row) =>
    row.map((elementType) => ({
      elementType,
      elementVariant: null,
      pieceId: null,
      roads: { N: false, E: false, S: false, W: false },
    }))
  );
}

const shopGroupOptions = {
  getCellTypes(cell) {
    return cell?.elementType ? getElementShopGroups(cell.elementType) : [];
  },
  matchWildType(cell) {
    return cell?.elementType === 'Shop_BizarreBazaar';
  },
};

test('cellMatchesClusterType matches only exact non-shop types by default', () => {
  assert.equal(cellMatchesClusterType({ elementType: 'house' }, 'house'), true);
  assert.equal(cellMatchesClusterType({ elementType: 'park' }, 'house'), false);
  assert.equal(cellMatchesClusterType({ elementType: 'Any' }, 'house'), false);
});

test('cellMatchesClusterType treats Any as a wildcard only when explicitly enabled', () => {
  const anyShop = { elementType: 'Shop_BizarreBazaar' };
  assert.equal(cellMatchesClusterType(anyShop, 'Bread', shopGroupOptions), true);
  assert.equal(cellMatchesClusterType(anyShop, 'Potion', shopGroupOptions), true);
});

test('findCluster returns only orthogonally connected matching cells', () => {
  const grid = createGrid([
    ['house', 'house', null],
    [null, 'house', null],
    ['house', null, 'house'],
  ]);

  const cluster = findCluster(grid, 0, 0, 'house');

  assert.equal(cluster.size, 3);
  assert.deepEqual(cluster.cells, [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
  ]);
});

test('findCluster bridges concrete types through Any cells for a target type', () => {
  const grid = createGrid([
    ['Shop_CriticalRolls', 'Shop_BizarreBazaar', 'Shop_DrakeOfCakes'],
  ]);

  const breadCluster = findCluster(grid, 0, 0, 'Bread', shopGroupOptions);

  assert.equal(breadCluster.size, 3);
  assert.deepEqual(breadCluster.cells, [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ]);
});

test('findCluster does not let Any bridge house or park clusters', () => {
  const grid = createGrid([
    ['house', 'Any', 'house'],
    ['park', 'Any', 'park'],
  ]);

  const houseCluster = findCluster(grid, 0, 0, 'house');
  const parkCluster = findCluster(grid, 1, 0, 'park');

  assert.equal(houseCluster.size, 1);
  assert.deepEqual(houseCluster.cells, [{ row: 0, col: 0 }]);
  assert.equal(parkCluster.size, 1);
  assert.deepEqual(parkCluster.cells, [{ row: 1, col: 0 }]);
});

test('buildClusterIndex keeps park and house clusters isolated to their own types', () => {
  const grid = createGrid([
    ['park', 'house', 'park'],
    ['park', 'house', 'house'],
  ]);

  const index = buildClusterIndex(grid);

  assert.equal(getClusterMembership(index, 0, 0, 'park')?.size, 2);
  assert.equal(getClusterMembership(index, 1, 0, 'park')?.size, 2);
  assert.equal(getClusterMembership(index, 0, 1, 'park'), null);

  assert.equal(getClusterMembership(index, 0, 1, 'house')?.size, 3);
  assert.equal(getClusterMembership(index, 1, 1, 'house')?.size, 3);
  assert.equal(getClusterMembership(index, 1, 2, 'house')?.size, 3);
  assert.equal(getClusterMembership(index, 0, 0, 'house'), null);
});

test('buildClusterIndex keeps separate memberships for different target types', () => {
  const grid = createGrid([
    ['Shop_CriticalRolls', 'Shop_BizarreBazaar', 'Shop_DraconicTonic'],
  ]);

  const index = buildClusterIndex(grid, shopGroupOptions);

  assert.deepEqual(index.targetTypes.sort(), ['Bread', 'Potion']);
  assert.equal(getClusterMembership(index, 0, 0, 'Bread')?.size, 2);
  assert.equal(getClusterMembership(index, 0, 1, 'Bread')?.size, 2);
  assert.equal(getClusterMembership(index, 0, 1, 'Potion')?.size, 2);
  assert.equal(getClusterMembership(index, 0, 2, 'Potion')?.size, 2);
  assert.equal(getClusterMembership(index, 0, 0, 'Potion'), null);
});

test('buildClusterIndex reports cluster sizes for multiple disconnected groups of one type', () => {
  const grid = createGrid([
    ['house', 'house', null, 'house'],
    [null, 'house', null, null],
  ]);

  const index = buildClusterIndex(grid);

  assert.equal(index.clustersByType.house.length, 2);
  assert.equal(getClusterMembership(index, 0, 0, 'house')?.size, 3);
  assert.equal(getClusterMembership(index, 1, 1, 'house')?.size, 3);
  assert.equal(getClusterMembership(index, 0, 3, 'house')?.size, 1);
});
