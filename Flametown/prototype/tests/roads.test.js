import assert from 'node:assert/strict';
import { createCellGrid } from '../src/grid.js';
import { assignRoadsForPiece } from '../src/roads.js';

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

test('edges touching an already-placed neighbor mirror that neighbor\'s road state', () => {
  const grid = createCellGrid(10);
  grid[4][5].elementType = 'house';
  grid[4][5].roads = { N: false, E: false, S: true, W: false };
  const cells = [[5, 5]];
  const [roads] = assignRoadsForPiece(grid, 10, cells, () => 0);
  assert.equal(roads.N, true);
});

test('edges with no placed neighbor are randomized using rng and ROAD_RANDOM_CHANCE', () => {
  const grid = createCellGrid(10);
  const cells = [[5, 5]];
  const [allRoads] = assignRoadsForPiece(grid, 10, cells, () => 0);
  assert.deepEqual(allRoads, { N: true, E: true, S: true, W: true });
  const [noRoads] = assignRoadsForPiece(grid, 10, cells, () => 0.99);
  assert.deepEqual(noRoads, { N: false, E: false, S: false, W: false });
});

test('edges shared between two cells of the same new piece are randomized independently, not mirrored', () => {
  const grid = createCellGrid(10);
  const cells = [[5, 5], [5, 6]];
  const sequence = [0.9, 0.1, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9];
  let call = 0;
  const rng = () => sequence[call++];
  const [roadsA, roadsB] = assignRoadsForPiece(grid, 10, cells, rng);
  assert.equal(roadsA.E, true);
  assert.equal(roadsB.W, false);
  assert.notEqual(roadsA.E, roadsB.W);
});
