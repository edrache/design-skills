import assert from 'node:assert/strict';
import { createCellGrid } from '../src/grid.js';
import {
  TETROMINO_IDS,
  pieceCells,
  randomPieceId,
  absoluteCells,
  canPlacePiece,
} from '../src/pieces.js';

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

test('all 7 classic tetromino shapes are defined', () => {
  assert.deepEqual([...TETROMINO_IDS].sort(), ['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
});

test('every shape has exactly 4 cells in every rotation state', () => {
  for (const id of TETROMINO_IDS) {
    for (let rotation = 0; rotation < 4; rotation++) {
      assert.equal(pieceCells(id, rotation).length, 4);
    }
  }
});

test('rotating 4 times returns to the original cell set', () => {
  for (const id of TETROMINO_IDS) {
    const base = pieceCells(id, 0);
    const afterFour = pieceCells(id, 4);
    assert.deepEqual(afterFour, base);
  }
});

test('randomPieceId always returns a valid shape id', () => {
  assert.equal(randomPieceId(() => 0), TETROMINO_IDS[0]);
  assert.equal(randomPieceId(() => 0.999), TETROMINO_IDS[TETROMINO_IDS.length - 1]);
});

test('absoluteCells offsets shape cells by the anchor', () => {
  const cells = absoluteCells('O', 0, 5, 5);
  assert.deepEqual(cells.sort(), [[5, 5], [5, 6], [6, 5], [6, 6]].sort());
});

test('first piece can be placed anywhere in bounds', () => {
  const grid = createCellGrid(10);
  assert.equal(canPlacePiece(grid, 10, 'O', 0, 3, 3, true), true);
});

test('first piece cannot be placed out of bounds', () => {
  const grid = createCellGrid(10);
  assert.equal(canPlacePiece(grid, 10, 'O', 0, 9, 9, true), false);
});

test('non-first piece must touch an existing placed cell', () => {
  const grid = createCellGrid(10);
  grid[0][0].elementType = 'house';
  assert.equal(canPlacePiece(grid, 10, 'O', 0, 5, 5, false), false);
  assert.equal(canPlacePiece(grid, 10, 'O', 0, 0, 1, false), true);
});

test('placement fails when it overlaps an occupied cell', () => {
  const grid = createCellGrid(10);
  grid[0][0].elementType = 'house';
  assert.equal(canPlacePiece(grid, 10, 'O', 0, 0, 0, true), false);
});
