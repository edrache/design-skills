import { SAVE_KEY } from '../config.js';
import { ELEMENT_CATALOG, isShopElement, pickWeightedElement } from './elementCatalog.js';
import { createCellGrid, createVertexGrid } from './grid.js';
import { absoluteCells, canPlacePiece, randomPieceId } from './pieces.js';
import { assignRoadsForPiece } from './roads.js';

function normalizeSeed(value) {
  return (value >>> 0) || 1;
}

function createSeededRng(seed) {
  let state = normalizeSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeVariantIndex(value, variantCount) {
  if (variantCount <= 0) {
    return null;
  }

  if (!Number.isInteger(value)) {
    return null;
  }

  return ((value % variantCount) + variantCount) % variantCount;
}

function stableVariantIndex(row, col, pieceId, variantCount) {
  if (variantCount <= 0) {
    return null;
  }

  const a = Math.imul((row + 1) * 73856093, 1);
  const b = Math.imul((col + 1) * 19349663, 1);
  const c = Math.imul(((pieceId ?? 0) + 1) * 83492791, 1);
  const hash = (a ^ b ^ c) >>> 0;
  return hash % variantCount;
}

function sparseOccupiedCells(grid) {
  const occupiedCells = [];
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      const cell = grid[row][col];
      if (!cell.elementType) {
        continue;
      }
      occupiedCells.push({
        row,
        col,
        elementType: cell.elementType,
        elementVariant: cell.elementVariant,
        pieceId: cell.pieceId,
        roads: cell.roads,
      });
    }
  }
  return occupiedCells;
}

function rebuildGridFromOccupiedCells(gridSize, occupiedCells) {
  const grid = createCellGrid(gridSize);
  for (const cell of occupiedCells || []) {
    if (
      cell &&
      Number.isInteger(cell.row) &&
      Number.isInteger(cell.col) &&
      cell.row >= 0 &&
      cell.row < gridSize &&
      cell.col >= 0 &&
      cell.col < gridSize
    ) {
      grid[cell.row][cell.col] = {
        elementType: cell.elementType ?? null,
        elementVariant: cell.elementVariant ?? null,
        pieceId: cell.pieceId ?? null,
        roads: {
          N: Boolean(cell.roads?.N),
          E: Boolean(cell.roads?.E),
          S: Boolean(cell.roads?.S),
          W: Boolean(cell.roads?.W),
        },
      };
    }
  }
  return grid;
}

export function createNewWorld(gridSize, cellSize, jitterAmount, rng = Math.random) {
  const worldSeed = normalizeSeed(Math.floor(rng() * 0xffffffff));
  return {
    gridSize,
    worldSeed,
    grid: createCellGrid(gridSize),
    vertices: createVertexGrid(gridSize, cellSize, jitterAmount, createSeededRng(worldSeed)),
    elementCounts: {},
    placedPieceCount: 0,
    currentPiece: null,
    holding: false,
    animations: [],
    assetManifest: {},
    lastPlacedCells: [],
  };
}

export function ensureCurrentPiece(state, rng = Math.random) {
  if (!state.currentPiece) {
    state.currentPiece = {
      shapeId: randomPieceId(rng),
      rotation: 0,
    };
    state.holding = false;
  }
}

export function placePiece(state, shapeId, rotation, anchorRow, anchorCol, rng = Math.random) {
  const isFirstPiece = state.placedPieceCount === 0;
  if (
    !canPlacePiece(
      state.grid,
      state.gridSize,
      shapeId,
      rotation,
      anchorRow,
      anchorCol,
      isFirstPiece
    )
  ) {
    return false;
  }

  const cells = absoluteCells(shapeId, rotation, anchorRow, anchorCol);
  const roads = assignRoadsForPiece(state.grid, state.gridSize, cells, rng);
  const pieceId = state.placedPieceCount + 1;
  const assetManifest = state.assetManifest || {};
  const nonShopCatalog = ELEMENT_CATALOG.filter((entry) => !isShopElement(entry.id));
  let hasShopOnPiece = false;

  cells.forEach(([row, col], index) => {
    const finalElementType = pickWeightedElement(
      state.elementCounts,
      rng,
      hasShopOnPiece ? nonShopCatalog : ELEMENT_CATALOG
    );
    state.elementCounts[finalElementType] = (state.elementCounts[finalElementType] || 0) + 1;
    hasShopOnPiece = hasShopOnPiece || isShopElement(finalElementType);

    const variants = assetManifest[finalElementType] || [];
    const elementVariant =
      variants.length > 0 ? Math.min(variants.length - 1, Math.floor(rng() * variants.length)) : null;

    state.grid[row][col] = {
      elementType: finalElementType,
      elementVariant,
      pieceId,
      roads: roads[index],
    };
  });

  state.placedPieceCount = pieceId;
  state.lastPlacedCells = cells;
  return true;
}

export function reconcileElementVariants(state, assetManifest) {
  let changed = false;
  const manifest = assetManifest || {};

  for (let row = 0; row < state.grid.length; row += 1) {
    for (let col = 0; col < state.grid[row].length; col += 1) {
      const cell = state.grid[row][col];
      if (!cell.elementType) {
        continue;
      }

      const variants = manifest[cell.elementType] || [];
      if (variants.length === 0) {
        if (cell.elementVariant !== null) {
          cell.elementVariant = null;
          changed = true;
        }
        continue;
      }

      const normalized = normalizeVariantIndex(cell.elementVariant, variants.length);
      const nextVariant =
        normalized ?? stableVariantIndex(row, col, cell.pieceId, variants.length);

      if (cell.elementVariant !== nextVariant) {
        cell.elementVariant = nextVariant;
        changed = true;
      }
    }
  }

  return changed;
}

export function serializeState(state) {
  return JSON.stringify({
    version: 1,
    gridSize: state.gridSize,
    worldSeed: normalizeSeed(state.worldSeed || 1),
    occupiedCells: sparseOccupiedCells(state.grid),
    elementCounts: state.elementCounts,
    placedPieceCount: state.placedPieceCount,
    camera: state.camera
      ? { x: state.camera.x, y: state.camera.y, zoom: state.camera.zoom }
      : null,
  });
}

export function deserializeState(json) {
  const data = JSON.parse(json);
  if (data.version !== 1) {
    throw new Error(`Unsupported save version: ${data.version}`);
  }
  if (!Number.isInteger(data.gridSize) || data.gridSize < 1) {
    throw new Error('Invalid gridSize in save data');
  }

  if (Array.isArray(data.cells) && Array.isArray(data.vertices)) {
    if (data.cells.length !== data.gridSize) {
      throw new Error('Invalid cell grid in save data');
    }
    if (data.vertices.length !== data.gridSize + 1) {
      throw new Error('Invalid vertex grid in save data');
    }
    return data;
  }

  const worldSeed = normalizeSeed(data.worldSeed || 1);
  const cells = rebuildGridFromOccupiedCells(data.gridSize, data.occupiedCells);
  const vertices = createVertexGrid(data.gridSize, 32, 0.2, createSeededRng(worldSeed));

  return {
    version: 1,
    gridSize: data.gridSize,
    worldSeed,
    cells,
    vertices,
    elementCounts: data.elementCounts || {},
    placedPieceCount: data.placedPieceCount || 0,
    camera: data.camera || null,
  }
}

export function clampGridSize(value, min, max) {
  const normalized = Math.round(Number(value));
  if (!Number.isFinite(normalized)) {
    return min;
  }
  return Math.min(max, Math.max(min, normalized));
}

export function saveToStorage(state) {
  try {
    localStorage.setItem(SAVE_KEY, serializeState(state));
  } catch (error) {
    console.warn('Failed to save game state', error);
  }
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }
    return deserializeState(raw);
  } catch (error) {
    console.warn('Failed to load saved game, starting fresh', error);
    return null;
  }
}

export function clearStorage() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.warn('Failed to clear saved game', error);
  }
}
