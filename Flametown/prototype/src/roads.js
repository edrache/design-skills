import { DIRS, neighborCoord, oppositeDir, inBounds } from './grid.js';
import { ROAD_RANDOM_CHANCE } from '../config.js';

export function assignRoadsForPiece(grid, gridSize, cells, rng = Math.random) {
  const cellSet = new Set(cells.map(([row, col]) => `${row},${col}`));

  return cells.map(([row, col]) => {
    const roads = { N: false, E: false, S: false, W: false };

    for (const dir of DIRS) {
      const neighbor = neighborCoord(row, col, dir);
      const isOwnCell = cellSet.has(`${neighbor.row},${neighbor.col}`);
      const neighborIsPlaced =
        !isOwnCell &&
        inBounds(gridSize, neighbor.row, neighbor.col) &&
        grid[neighbor.row][neighbor.col].elementType !== null;

      if (neighborIsPlaced) {
        roads[dir] = grid[neighbor.row][neighbor.col].roads[oppositeDir(dir)];
      } else {
        roads[dir] = rng() < ROAD_RANDOM_CHANCE;
      }
    }

    return roads;
  });
}
