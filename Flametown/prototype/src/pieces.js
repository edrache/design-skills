import { DIRS, neighborCoord, inBounds } from './grid.js';

export const TETROMINO_SHAPES = {
  I: [[0, 0], [0, 1], [0, 2], [0, 3]],
  O: [[0, 0], [0, 1], [1, 0], [1, 1]],
  T: [[0, 0], [0, 1], [0, 2], [1, 1]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1]],
  Z: [[0, 0], [0, 1], [1, 1], [1, 2]],
  J: [[0, 0], [1, 0], [1, 1], [1, 2]],
  L: [[0, 2], [1, 0], [1, 1], [1, 2]],
};

export const TETROMINO_IDS = Object.keys(TETROMINO_SHAPES);

function normalize(cells) {
  const minRow = Math.min(...cells.map(([row]) => row));
  const minCol = Math.min(...cells.map(([, col]) => col));
  return cells.map(([row, col]) => [row - minRow, col - minCol]);
}

function rotateCW(cells) {
  return normalize(cells.map(([row, col]) => [col, -row]));
}

function computeRotationStates(baseCells) {
  const states = [normalize(baseCells)];
  for (let index = 1; index < 4; index += 1) {
    states.push(rotateCW(states[index - 1]));
  }
  return states;
}

const TETROMINO_ROTATIONS = Object.fromEntries(
  TETROMINO_IDS.map((id) => [id, computeRotationStates(TETROMINO_SHAPES[id])])
);

export function pieceCells(shapeId, rotation) {
  const states = TETROMINO_ROTATIONS[shapeId];
  if (!states) {
    throw new Error(`Unknown tetromino shape: ${shapeId}`);
  }

  const normalizedRotation = ((rotation % 4) + 4) % 4;
  return states[normalizedRotation];
}

export function randomPieceId(rng = Math.random) {
  const index = Math.min(TETROMINO_IDS.length - 1, Math.floor(rng() * TETROMINO_IDS.length));
  return TETROMINO_IDS[index];
}

export function absoluteCells(shapeId, rotation, anchorRow, anchorCol) {
  return pieceCells(shapeId, rotation).map(([row, col]) => [anchorRow + row, anchorCol + col]);
}

export function canPlacePiece(grid, gridSize, shapeId, rotation, anchorRow, anchorCol, isFirstPiece) {
  const cells = absoluteCells(shapeId, rotation, anchorRow, anchorCol);
  const cellSet = new Set(cells.map(([row, col]) => `${row},${col}`));

  for (const [row, col] of cells) {
    if (!inBounds(gridSize, row, col)) {
      return false;
    }

    if (grid[row][col].elementType !== null) {
      return false;
    }
  }

  if (isFirstPiece) {
    return true;
  }

  for (const [row, col] of cells) {
    for (const dir of DIRS) {
      const neighbor = neighborCoord(row, col, dir);
      if (!inBounds(gridSize, neighbor.row, neighbor.col)) {
        continue;
      }

      if (cellSet.has(`${neighbor.row},${neighbor.col}`)) {
        continue;
      }

      if (grid[neighbor.row][neighbor.col].elementType !== null) {
        return true;
      }
    }
  }

  return false;
}
