import {
  BACKGROUND_TEXTURE_PATH,
  BACKGROUND_TILE_WORLD_SIZE,
  BUILT_BACKGROUND_OVERDRAW_WORLD_SIZE,
  BUILT_BACKGROUND_TINT,
  BUILT_BACKGROUND_TEXTURE_OPACITY,
  BUILT_EDGE_DETAIL_WORLD_SPACING,
  BUILT_EDGE_EROSION_WORLD_SIZE,
  BUILT_EDGE_EROSION_TEXTURE_OPACITY,
  BUILT_EDGE_EROSION_TINT,
  BUILT_EDGE_FRINGE_WORLD_SIZE,
  BUILT_EDGE_FRINGE_TEXTURE_OPACITY,
  BUILT_EDGE_FRINGE_TINT,
  BUILT_BACKGROUND_TEXTURE_PATH,
  BUILT_BACKGROUND_TILE_WORLD_SIZE,
  CELL_SIZE,
  DEFAULT_GRID_SIZE,
  GRID_SIZE_MAX,
  GRID_SIZE_MIN,
  JITTER_AMOUNT,
  MAP_POINT_TEXTURE_PATH,
  MAP_POINT_WORLD_SIZE,
  MAX_ASSET_VARIANTS,
} from '../config.js';
import { loadAssetManifest, loadOptionalImage } from './assets.js';
import { createCamera } from './camera.js';
import { ELEMENT_CATALOG } from './elementCatalog.js';
import { createCameraInput, createPlacementInput } from './input.js';
import { renderGhost, renderGrid } from './render.js';
import {
  clampGridSize,
  clearStorage,
  createNewWorld,
  ensureCurrentPiece,
  loadFromStorage,
  placePiece,
  reconcileElementVariants,
  saveToStorage,
} from './state.js';
import { createUIPanel } from './ui.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const panelEl = document.getElementById('ui-panel');

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function buildFreshState(gridSize) {
  const world = createNewWorld(gridSize, CELL_SIZE, JITTER_AMOUNT);
  return {
    ...world,
    camera: createCamera(world.gridSize, window.innerWidth, window.innerHeight),
  };
}

function hydrateSavedState(saved) {
  return {
    gridSize: saved.gridSize,
    worldSeed: saved.worldSeed,
    grid: saved.cells,
    vertices: saved.vertices,
    elementCounts: saved.elementCounts || {},
    placedPieceCount: saved.placedPieceCount || 0,
    camera: saved.camera || createCamera(saved.gridSize, window.innerWidth, window.innerHeight),
    currentPiece: null,
    holding: false,
    animations: [],
    assetManifest: {},
    lastPlacedCells: [],
  };
}

function buildInitialState() {
  const saved = loadFromStorage();
  if (saved) {
    return hydrateSavedState(saved);
  }
  return buildFreshState(DEFAULT_GRID_SIZE);
}

function attachAssetManifest(targetState) {
  loadAssetManifest(ELEMENT_CATALOG, 'assets/tiles', MAX_ASSET_VARIANTS).then((manifest) => {
    targetState.assetManifest = manifest;
    if (reconcileElementVariants(targetState, manifest)) {
      saveToStorage(targetState);
    }
  });
}

function attachBackgroundTexture(targetState) {
  loadOptionalImage(BACKGROUND_TEXTURE_PATH).then((image) => {
    targetState.backgroundTexture = image;
    targetState.backgroundTileWorldSize = BACKGROUND_TILE_WORLD_SIZE;
  });
}

function attachBuiltBackgroundTexture(targetState) {
  loadOptionalImage(BUILT_BACKGROUND_TEXTURE_PATH).then((image) => {
    targetState.builtBackgroundTexture = image;
    targetState.builtBackgroundTileWorldSize = BUILT_BACKGROUND_TILE_WORLD_SIZE;
    targetState.builtBackgroundTextureOpacity = BUILT_BACKGROUND_TEXTURE_OPACITY;
    targetState.builtBackgroundOverdrawWorldSize = BUILT_BACKGROUND_OVERDRAW_WORLD_SIZE;
    targetState.builtEdgeDetailWorldSpacing = BUILT_EDGE_DETAIL_WORLD_SPACING;
    targetState.builtEdgeFringeWorldSize = BUILT_EDGE_FRINGE_WORLD_SIZE;
    targetState.builtEdgeFringeTextureOpacity = BUILT_EDGE_FRINGE_TEXTURE_OPACITY;
    targetState.builtEdgeErosionWorldSize = BUILT_EDGE_EROSION_WORLD_SIZE;
    targetState.builtEdgeErosionTextureOpacity = BUILT_EDGE_EROSION_TEXTURE_OPACITY;
    targetState.builtBackgroundTint = BUILT_BACKGROUND_TINT;
    targetState.builtEdgeErosionTint = BUILT_EDGE_EROSION_TINT;
    targetState.builtEdgeFringeTint = BUILT_EDGE_FRINGE_TINT;
  });
}

function attachMapPointTexture(targetState) {
  loadOptionalImage(MAP_POINT_TEXTURE_PATH).then((image) => {
    targetState.mapPointTexture = image;
    targetState.mapPointWorldSize = MAP_POINT_WORLD_SIZE;
  });
}

let state = buildInitialState();
ensureCurrentPiece(state);
attachAssetManifest(state);
attachBackgroundTexture(state);
attachBuiltBackgroundTexture(state);
attachMapPointTexture(state);

const cameraInput = createCameraInput(canvas, state);

let uiPanel;
const placementInput = createPlacementInput(canvas, state, (row, col) => {
  if (!state.currentPiece) {
    return;
  }

  const placed = placePiece(state, state.currentPiece.shapeId, state.currentPiece.rotation, row, col);
  if (!placed) {
    return;
  }

  const now = performance.now();
  for (const [placedRow, placedCol] of state.lastPlacedCells) {
    state.animations.push({
      row: placedRow,
      col: placedCol,
      startTime: now + Math.random() * 150,
      duration: 280,
    });
  }

  state.currentPiece = null;
  ensureCurrentPiece(state);
  uiPanel.renderPreview();
  saveToStorage(state);
});

uiPanel = createUIPanel(panelEl, state, {
  onTakePiece: () => {
    state.holding = true;
  },
  onNewGame: (size) => {
    clearStorage();
    const clampedSize = clampGridSize(size, GRID_SIZE_MIN, GRID_SIZE_MAX);
    state = buildFreshState(clampedSize);
    ensureCurrentPiece(state);
    attachAssetManifest(state);
    attachBackgroundTexture(state);
    attachBuiltBackgroundTexture(state);
    attachMapPointTexture(state);
    cameraInput.state = state;
    placementInput.state = state;
    uiPanel.state = state;
    uiPanel.setGridSize(clampedSize);
    uiPanel.renderPreview();
  },
});
uiPanel.renderPreview();

function renderFrame(now = performance.now()) {
  renderGrid(ctx, state, window.innerWidth, window.innerHeight, now);
  renderGhost(ctx, state, window.innerWidth, window.innerHeight, placementInput.getMouseCell());
}

window.render_game_to_text = () =>
  JSON.stringify({
    mode: state.holding ? 'holding-piece' : 'idle',
    currentPiece: state.currentPiece,
    placedPieceCount: state.placedPieceCount,
    camera: { ...state.camera },
    mouseCell: placementInput.getMouseCell(),
    gridSize: state.gridSize,
    note: 'origin=(0,0) top-left; +x right; +y down',
  });

window.__flametown = {
  getStateSnapshot() {
    return {
      gridSize: state.gridSize,
      placedPieceCount: state.placedPieceCount,
      currentPiece: state.currentPiece ? { ...state.currentPiece } : null,
      holding: state.holding,
      lastPlacedCells: [...state.lastPlacedCells],
      occupiedCells: state.grid.flatMap((row, rowIndex) =>
        row.flatMap((cell, colIndex) =>
          cell.elementType
            ? [
                {
                  row: rowIndex,
                  col: colIndex,
                  elementType: cell.elementType,
                  pieceId: cell.pieceId,
                  roads: { ...cell.roads },
                },
              ]
            : []
        )
      ),
    };
  },
  setCurrentPiece(shapeId, rotation = 0) {
    state.currentPiece = { shapeId, rotation };
    state.holding = true;
    uiPanel.renderPreview();
  },
  placeCurrentPiece(row, col) {
    if (!state.currentPiece) {
      return false;
    }
    const placed = placePiece(state, state.currentPiece.shapeId, state.currentPiece.rotation, row, col);
    if (!placed) {
      return false;
    }
    state.currentPiece = null;
    ensureCurrentPiece(state);
    uiPanel.renderPreview();
    saveToStorage(state);
    return true;
  },
};

window.advanceTime = (ms) => {
  const now = performance.now();
  const deltaSeconds = Math.max(0, ms) / 1000;
  cameraInput.update(deltaSeconds);
  state.animations = state.animations.filter((anim) => now - anim.startTime < anim.duration);
  renderFrame(now);
};

let lastTime = performance.now();
function frame(now) {
  const deltaSeconds = (now - lastTime) / 1000;
  lastTime = now;
  cameraInput.update(deltaSeconds);
  state.animations = state.animations.filter((anim) => now - anim.startTime < anim.duration);
  renderFrame(now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
