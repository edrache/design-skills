import assert from 'node:assert/strict';
import {
  oppositeDir,
  neighborCoord,
  inBounds,
  createCellGrid,
  createVertexGrid,
  cellQuad,
  quadCentroid,
  worldToCell,
} from '../src/grid.js';

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

test('oppositeDir returns the correct opposite for each direction', () => {
  assert.equal(oppositeDir('N'), 'S');
  assert.equal(oppositeDir('S'), 'N');
  assert.equal(oppositeDir('E'), 'W');
  assert.equal(oppositeDir('W'), 'E');
});

test('neighborCoord offsets row/col correctly', () => {
  assert.deepEqual(neighborCoord(5, 5, 'N'), { row: 4, col: 5 });
  assert.deepEqual(neighborCoord(5, 5, 'S'), { row: 6, col: 5 });
  assert.deepEqual(neighborCoord(5, 5, 'E'), { row: 5, col: 6 });
  assert.deepEqual(neighborCoord(5, 5, 'W'), { row: 5, col: 4 });
});

test('inBounds respects grid size', () => {
  assert.equal(inBounds(10, 0, 0), true);
  assert.equal(inBounds(10, 9, 9), true);
  assert.equal(inBounds(10, 10, 0), false);
  assert.equal(inBounds(10, -1, 0), false);
});

test('createCellGrid produces size x size grid of empty cells', () => {
  const grid = createCellGrid(4);
  assert.equal(grid.length, 4);
  assert.equal(grid[0].length, 4);
  assert.deepEqual(grid[2][3], {
    elementType: null,
    elementVariant: null,
    pieceId: null,
    roads: { N: false, E: false, S: false, W: false },
  });
});

test('createVertexGrid places vertices at base positions when rng is centered', () => {
  const verts = createVertexGrid(4, 32, 0.2, () => 0.5);
  assert.equal(verts.length, 5);
  assert.equal(verts[0].length, 5);
  assert.deepEqual(verts[2][3], { x: 96, y: 64 });
});

test('createVertexGrid clamps boundary vertices inward with exact offsets', () => {
  const cellSize = 32;
  const jitterAmount = 0.2;
  const size = 4;
  const maxOffset = cellSize * jitterAmount;
  const verts = createVertexGrid(size, cellSize, jitterAmount, () => 1);

  assert.deepEqual(verts[0][0], { x: maxOffset, y: maxOffset });
  assert.deepEqual(verts[0][size], { x: size * cellSize - maxOffset, y: maxOffset });
  assert.deepEqual(verts[size][0], { x: maxOffset, y: size * cellSize - maxOffset });
  assert.deepEqual(verts[size][size], {
    x: size * cellSize - maxOffset,
    y: size * cellSize - maxOffset,
  });
});

test('cellQuad returns the 4 corners shared with neighboring cells', () => {
  const verts = createVertexGrid(4, 32, 0.2, () => 0.5);
  const quad = cellQuad(verts, 1, 1);
  assert.deepEqual(quad[0], verts[1][1]);
  assert.deepEqual(quad[1], verts[1][2]);
  assert.deepEqual(quad[2], verts[2][2]);
  assert.deepEqual(quad[3], verts[2][1]);
});

test('quadCentroid averages the 4 corners', () => {
  const quad = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  assert.deepEqual(quadCentroid(quad), { x: 5, y: 5 });
});

test('worldToCell maps world pixel coordinates to the containing regular cell', () => {
  assert.deepEqual(worldToCell(0, 0, 32), { row: 0, col: 0 });
  assert.deepEqual(worldToCell(31, 31, 32), { row: 0, col: 0 });
  assert.deepEqual(worldToCell(32, 32, 32), { row: 1, col: 1 });
  assert.deepEqual(worldToCell(65, 100, 32), { row: 3, col: 2 });
});
