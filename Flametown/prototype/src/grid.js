export const DIRS = ['N', 'E', 'S', 'W'];

export function oppositeDir(dir) {
  switch (dir) {
    case 'N':
      return 'S';
    case 'E':
      return 'W';
    case 'S':
      return 'N';
    case 'W':
      return 'E';
    default:
      throw new Error(`Unknown direction: ${dir}`);
  }
}

export function neighborCoord(row, col, dir) {
  switch (dir) {
    case 'N':
      return { row: row - 1, col };
    case 'E':
      return { row, col: col + 1 };
    case 'S':
      return { row: row + 1, col };
    case 'W':
      return { row, col: col - 1 };
    default:
      throw new Error(`Unknown direction: ${dir}`);
  }
}

export function inBounds(size, row, col) {
  return row >= 0 && row < size && col >= 0 && col < size;
}

function createEmptyRoads() {
  return { N: false, E: false, S: false, W: false };
}

export function createCellGrid(size) {
  const grid = new Array(size);
  for (let row = 0; row < size; row += 1) {
    grid[row] = new Array(size);
    for (let col = 0; col < size; col += 1) {
      grid[row][col] = {
        elementType: null,
        elementVariant: null,
        pieceId: null,
        roads: createEmptyRoads(),
      };
    }
  }
  return grid;
}

export function createVertexGrid(size, cellSize, jitterAmount, rng = Math.random) {
  const vertices = new Array(size + 1);
  const maxOffset = cellSize * jitterAmount;

  for (let row = 0; row <= size; row += 1) {
    vertices[row] = new Array(size + 1);
    for (let col = 0; col <= size; col += 1) {
      const baseX = col * cellSize;
      const baseY = row * cellSize;
      let dx = (rng() * 2 - 1) * maxOffset;
      let dy = (rng() * 2 - 1) * maxOffset;

      if (row === 0) dy = Math.abs(dy);
      if (row === size) dy = -Math.abs(dy);
      if (col === 0) dx = Math.abs(dx);
      if (col === size) dx = -Math.abs(dx);

      vertices[row][col] = { x: baseX + dx, y: baseY + dy };
    }
  }

  return vertices;
}

export function cellQuad(vertexGrid, row, col) {
  return [
    vertexGrid[row][col],
    vertexGrid[row][col + 1],
    vertexGrid[row + 1][col + 1],
    vertexGrid[row + 1][col],
  ];
}

export function quadCentroid(quad) {
  return {
    x: (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4,
    y: (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4,
  };
}

export function worldToCell(worldX, worldY, cellSize) {
  return {
    row: Math.floor(worldY / cellSize),
    col: Math.floor(worldX / cellSize),
  };
}
