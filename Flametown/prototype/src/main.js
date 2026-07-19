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
  ROAD_TEXTURE_PATH,
  RESIDENT_SPRITE_PATH,
} from '../config.js';
import { loadAssetManifest, loadNamedImages, loadOptionalImage } from './assets.js';
import { createCamera } from './camera.js';
import { ELEMENT_CATALOG, ELEMENT_OVERLAY_ICON_DEFINITIONS } from './elementCatalog.js';
import { createCameraInput, createPlacementInput } from './input.js';
import { canPlacePiece } from './pieces.js';
import { renderGhost, renderGrid } from './render.js';
import { bootstrapResidentsFromGrid, syncResidentGraph, updateResidents } from './residents.js';
import {
  clampGridSize,
  clearStorage,
  createInitialScoreTotals,
  createPieceDraft,
  deserializeState,
  createNewWorld,
  ensureCurrentPiece,
  loadFromStorage,
  placePiece,
  reconcileElementVariants,
  rebuildClusterState,
  serializeState,
  saveToStorage,
  syncHoveredCluster,
} from './state.js';
import { createTutorialController, getTutorialRulesSections } from './tutorial.js';
import { createScorePanel, createTutorialOverlay, createUIPanel } from './ui.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const panelEl = document.getElementById('ui-panel');
const scorePanelEl = document.getElementById('score-panel');

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
  const hydrated = {
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
    scoreTotals: { ...createInitialScoreTotals(), ...(saved.scoreTotals || {}) },
    scoreTotalsVersion: 0,
    scorePopups: [],
    residents: saved.residents || [],
    nextResidentId: saved.nextResidentId || 1,
    clusterIndex: null,
    hoveredCell: null,
    hoveredClusterCells: [],
    hoveredClusterSize: 0,
  };
  syncResidentGraph(hydrated);
  rebuildClusterState(hydrated);
  if (hydrated.residents.length === 0) {
    bootstrapResidentsFromGrid(hydrated);
  }
  return hydrated;
}

function buildInitialState() {
  const saved = loadFromStorage();
  if (saved) {
    return hydrateSavedState(saved);
  }
  return buildFreshState(DEFAULT_GRID_SIZE);
}

function configureStateResources(targetState) {
  attachAssetManifest(targetState);
  attachIconManifest(targetState);
  attachBackgroundTexture(targetState);
  attachBuiltBackgroundTexture(targetState);
  attachMapPointTexture(targetState);
  attachRoadTexture(targetState);
  attachResidentSprite(targetState);
}

function primeState(targetState) {
  ensureCurrentPiece(targetState);
  configureStateResources(targetState);
  return targetState;
}

function centerCameraOnCells(targetState, cells) {
  if (!Array.isArray(cells) || cells.length === 0) {
    return;
  }
  const points = cells.map(({ row, col }) => targetState.vertices[row][col]);
  const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  targetState.camera.x = centerX + CELL_SIZE * 0.5;
  targetState.camera.y = centerY + CELL_SIZE * 0.5;
}

function attachAssetManifest(targetState) {
  loadAssetManifest(ELEMENT_CATALOG, 'assets/tiles', MAX_ASSET_VARIANTS).then((manifest) => {
    targetState.assetManifest = manifest;
    if (reconcileElementVariants(targetState, manifest) && !tutorialController?.isActive()) {
      saveToStorage(targetState);
    }
  });
}

function attachIconManifest(targetState) {
  const iconPaths = Object.fromEntries(
    Object.values(ELEMENT_OVERLAY_ICON_DEFINITIONS).map((definition) => [
      definition.id,
      definition.iconAssetPath,
    ])
  );
  loadNamedImages(iconPaths).then((manifest) => {
    targetState.iconManifest = manifest;
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

function attachRoadTexture(targetState) {
  loadOptionalImage(ROAD_TEXTURE_PATH).then((image) => {
    targetState.roadTexture = image;
  });
}

function attachResidentSprite(targetState) {
  loadOptionalImage(RESIDENT_SPRITE_PATH).then((image) => {
    targetState.residentSprite = image;
  });
}

let state = primeState(buildInitialState());
let lastSavedScoreTotalsVersion = state.scoreTotalsVersion || 0;

const cameraInput = createCameraInput(canvas, state);

let uiPanel;
let scorePanel;
let tutorialOverlay;
let tutorialController;

function computeGhostLegal(targetState, mouseCell) {
  if (!targetState.holding || !targetState.currentPiece || !mouseCell) {
    return null;
  }

  return canPlacePiece(
    targetState.grid,
    targetState.gridSize,
    targetState.currentPiece.shapeId,
    targetState.currentPiece.rotation,
    mouseCell.row,
    mouseCell.col,
    targetState.placedPieceCount === 0
  );
}

function syncPanels() {
  cameraInput.state = state;
  placementInput.state = state;
  if (uiPanel) {
    uiPanel.state = state;
    uiPanel.setGridSize(state.gridSize);
    uiPanel.renderPreview();
  }
  if (scorePanel) {
    scorePanel.state = state;
    scorePanel.renderScores(true);
  }
  lastSavedScoreTotalsVersion = state.scoreTotalsVersion || 0;
}

function adoptState(nextState, { persist = false } = {}) {
  state = primeState(nextState);
  syncPanels();
  if (persist) {
    saveToStorage(state);
  }
}

function buildTutorialBoardState() {
  const nextState = buildFreshState(14);
  nextState.currentPiece = createPieceDraft(nextState, 'L', 0, () => 0.18);
  nextState.holding = false;
  return nextState;
}

function buildIllegalPlacementState() {
  const nextState = buildFreshState(12);
  nextState.currentPiece = createPieceDraft(nextState, 'T', 0, () => 0.22);
  nextState.holding = false;
  const occupied = [
    { row: 5, col: 5, elementType: 'house' },
    { row: 5, col: 6, elementType: 'park' },
    { row: 6, col: 5, elementType: 'park' },
    { row: 6, col: 6, elementType: 'house' },
  ];
  for (const cell of occupied) {
    nextState.grid[cell.row][cell.col] = {
      elementType: cell.elementType,
      elementVariant: null,
      pieceId: 1,
      roads: { N: false, E: false, S: false, W: false },
    };
    nextState.elementCounts[cell.elementType] = (nextState.elementCounts[cell.elementType] || 0) + 1;
  }
  nextState.placedPieceCount = 1;
  rebuildClusterState(nextState);
  centerCameraOnCells(nextState, occupied);
  return nextState;
}

function buildClusterTutorialState() {
  const nextState = buildFreshState(12);
  const occupied = [
    { row: 5, col: 3, elementType: 'Shop_CriticalRolls', pieceId: 1 },
    { row: 5, col: 4, elementType: 'Shop_BizarreBazaar', pieceId: 2 },
    { row: 5, col: 5, elementType: 'Shop_DrakeOfCakes', pieceId: 3 },
    { row: 5, col: 6, elementType: 'Shop_DraconicTonic', pieceId: 4 },
    { row: 7, col: 2, elementType: 'house', pieceId: 5 },
    { row: 7, col: 3, elementType: 'house', pieceId: 5 },
  ];
  for (const cell of occupied) {
    nextState.grid[cell.row][cell.col] = {
      elementType: cell.elementType,
      elementVariant: null,
      pieceId: cell.pieceId,
      roads: { N: false, E: false, S: false, W: false },
    };
    nextState.elementCounts[cell.elementType] = (nextState.elementCounts[cell.elementType] || 0) + 1;
  }
  nextState.placedPieceCount = 5;
  rebuildClusterState(nextState);
  centerCameraOnCells(nextState, occupied);
  return nextState;
}

function buildScoreTutorialState() {
  const nextState = buildFreshState(16);
  const occupied = [
    { row: 6, col: 6, elementType: 'house', pieceId: 1, roads: { N: true, E: false, S: false, W: false } },
    { row: 5, col: 6, elementType: 'Shop_DracoBell', pieceId: 2, roads: { N: false, E: false, S: true, W: false } },
    { row: 6, col: 7, elementType: 'Shop_DrakeOfCakes', pieceId: 3, roads: { N: true, E: false, S: false, W: false } },
  ];
  for (const cell of occupied) {
    nextState.grid[cell.row][cell.col] = {
      elementType: cell.elementType,
      elementVariant: null,
      pieceId: cell.pieceId,
      roads: cell.roads,
    };
    nextState.elementCounts[cell.elementType] = (nextState.elementCounts[cell.elementType] || 0) + 1;
  }
  nextState.placedPieceCount = 3;
  nextState.scoreTotals = createInitialScoreTotals();
  nextState.scoreTotalsVersion = 0;
  nextState.scorePopups = [];
  nextState.residents = [
    {
      id: 1,
      homeCell: { row: 6, col: 6 },
      from: { row: 6, col: 6 },
      to: { row: 6, col: 7 },
      progress: 0.48,
      walkDistance: 0,
      facing: 1,
    },
  ];
  nextState.nextResidentId = 2;
  centerCameraOnCells(nextState, occupied);
  syncResidentGraph(nextState);
  rebuildClusterState(nextState);
  return nextState;
}

function buildResidentTutorialState() {
  const nextState = buildScoreTutorialState();
  nextState.scoreTotals = createInitialScoreTotals();
  nextState.scoreTotalsVersion = 0;
  nextState.scorePopups = [];
  return nextState;
}
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
  scorePanel.renderScores(true);
  if (!tutorialController.isActive()) {
    saveToStorage(state);
  }
}, () => {
  uiPanel.renderPreview();
});

tutorialController = createTutorialController({
  loadTutorialBoard() {
    adoptState(buildTutorialBoardState());
  },
  loadResidentBoard() {
    adoptState(buildResidentTutorialState());
  },
  prepareSecondPlacementStep() {
    state.currentPiece = createPieceDraft(state, 'I', 0, () => 0.3);
    state.holding = false;
    uiPanel.renderPreview();
  },
  loadIllegalPlacementBoard() {
    adoptState(buildIllegalPlacementState());
  },
  loadClusterBoard() {
    adoptState(buildClusterTutorialState());
  },
  loadScoreBoard() {
    adoptState(buildScoreTutorialState());
  },
  captureCameraBaseline() {
    return { ...state.camera };
  },
  getSnapshot() {
    return window.__flametown.getStateSnapshot();
  },
  saveGameSnapshot() {
    return serializeState(state);
  },
  restoreGameSnapshot(serialized) {
    const saved = deserializeState(serialized);
    adoptState(hydrateSavedState(saved));
  },
});

uiPanel = createUIPanel(panelEl, state, {
  onTakePiece: () => {
    state.holding = true;
  },
  onToggleTutorial: () => {
    const viewModel = tutorialController.isActive()
      ? tutorialController.stop({ restore: true })
      : tutorialController.start();
    tutorialOverlay.render(viewModel);
  },
  onNewGame: (size) => {
    clearStorage();
    const clampedSize = clampGridSize(size, GRID_SIZE_MIN, GRID_SIZE_MAX);
    adoptState(buildFreshState(clampedSize));
  },
});
uiPanel.renderPreview();
scorePanel = createScorePanel(scorePanelEl, state);
tutorialOverlay = createTutorialOverlay(tutorialController.getViewModel(), {
  onPrevious: () => {
    tutorialOverlay.render(tutorialController.previous());
  },
  onRestart: () => {
    tutorialOverlay.render(tutorialController.restartStep());
  },
  onNext: () => {
    tutorialOverlay.render(tutorialController.next());
  },
  onClose: () => {
    tutorialOverlay.render(tutorialController.stop({ restore: true }));
  },
  getRulesSections: () => getTutorialRulesSections(),
});
uiPanel.renderDebug();

function renderFrame(now = performance.now()) {
  syncHoveredCluster(state, state.holding ? null : placementInput.getMouseCell());
  state.hoveredPointerScreen = state.holding ? null : placementInput.getMouseScreen();
  state.ghostLegal = computeGhostLegal(state, placementInput.getMouseCell());
  state.scorePopups = (state.scorePopups || []).filter((popup) => now - popup.startTime < popup.duration);
  if (!tutorialController.isActive() && (state.scoreTotalsVersion || 0) !== lastSavedScoreTotalsVersion) {
    saveToStorage(state);
    lastSavedScoreTotalsVersion = state.scoreTotalsVersion || 0;
  }
  scorePanel.renderScores();
  renderGrid(ctx, state, window.innerWidth, window.innerHeight, now);
  renderGhost(ctx, state, window.innerWidth, window.innerHeight, placementInput.getMouseCell());
  uiPanel.renderDebug();
  tutorialOverlay.render(tutorialController.sync());
}

window.render_game_to_text = () =>
  JSON.stringify({
    mode: state.holding ? 'holding-piece' : 'idle',
    currentPiece: state.currentPiece,
    placedPieceCount: state.placedPieceCount,
    camera: { ...state.camera },
    mouseCell: placementInput.getMouseCell(),
    hoveredCell: state.hoveredCell,
    hoveredClusterSize: state.hoveredClusterSize ?? 0,
    hoveredClusterEntries: state.hoveredClusterEntries ?? [],
    ghostLegal: state.ghostLegal,
    gridSize: state.gridSize,
    residents: (state.residents || []).map((resident) => ({
      id: resident.id,
      from: resident.from,
      to: resident.to,
      progress: Number(resident.progress?.toFixed?.(3) || resident.progress || 0),
    })),
    scoreTotals: state.scoreTotals,
    activeScorePopups: (state.scorePopups || []).length,
    note: 'origin=(0,0) top-left; +x right; +y down',
  });

window.__flametown = {
  getStateSnapshot() {
    return {
      gridSize: state.gridSize,
      placedPieceCount: state.placedPieceCount,
      camera: state.camera ? { ...state.camera } : null,
      currentPiece: state.currentPiece ? { ...state.currentPiece } : null,
      holding: state.holding,
      hoveredCell: state.hoveredCell ? { ...state.hoveredCell } : null,
      hoveredClusterSize: state.hoveredClusterSize ?? 0,
      hoveredClusterEntries: Array.isArray(state.hoveredClusterEntries)
        ? state.hoveredClusterEntries.map((entry) => ({ ...entry }))
        : [],
      ghostLegal: state.ghostLegal ?? null,
      hoveredClusterCells: Array.isArray(state.hoveredClusterCells)
        ? state.hoveredClusterCells.map((cell) => ({ ...cell }))
        : Array.from(state.hoveredClusterCells || []),
      lastPlacedCells: [...state.lastPlacedCells],
      residents: (state.residents || []).map((resident) => ({
        id: resident.id,
        homeCell: { ...resident.homeCell },
        from: { ...resident.from },
        to: { ...resident.to },
        progress: resident.progress,
      })),
      scoreTotals: { ...(state.scoreTotals || {}) },
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
    state.currentPiece = createPieceDraft(state, shapeId, rotation);
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
  loadScoreTestScenario() {
    state = buildFreshState(16);
    state.grid[6][6] = {
      elementType: 'house',
      elementVariant: null,
      pieceId: 1,
      roads: { N: true, E: false, S: false, W: false },
    };
    state.grid[5][6] = {
      elementType: 'Shop_DracoBell',
      elementVariant: null,
      pieceId: 2,
      roads: { N: false, E: false, S: true, W: false },
    };
    state.grid[6][7] = {
      elementType: 'Shop_DrakeOfCakes',
      elementVariant: null,
      pieceId: 3,
      roads: { N: true, E: false, S: false, W: false },
    };
    state.elementCounts = {
      house: 1,
      Shop_DracoBell: 1,
      Shop_DrakeOfCakes: 1,
    };
    state.scoreTotals = createInitialScoreTotals();
    state.scoreTotalsVersion = 0;
    state.scorePopups = [];
    state.residents = [
      {
        id: 1,
        homeCell: { row: 6, col: 6 },
        from: { row: 6, col: 6 },
        to: { row: 6, col: 7 },
        progress: 0.48,
        walkDistance: 0,
        facing: 1,
      },
    ];
    state.nextResidentId = 2;
    state.camera = createCamera(state.gridSize, window.innerWidth, window.innerHeight);
    state.camera.x = state.vertices[6][6].x + CELL_SIZE * 0.9;
    state.camera.y = state.vertices[6][6].y + CELL_SIZE * 0.4;
    syncResidentGraph(state);
    ensureCurrentPiece(state);
    attachAssetManifest(state);
    attachIconManifest(state);
    attachBackgroundTexture(state);
    attachBuiltBackgroundTexture(state);
    attachMapPointTexture(state);
    attachRoadTexture(state);
    attachResidentSprite(state);
    cameraInput.state = state;
    placementInput.state = state;
    uiPanel.state = state;
    scorePanel.state = state;
    uiPanel.setGridSize(state.gridSize);
    uiPanel.renderPreview();
    scorePanel.renderScores(true);
    lastSavedScoreTotalsVersion = state.scoreTotalsVersion || 0;
    saveToStorage(state);
    return this.getStateSnapshot();
  },
  loadClusterTestScenario() {
    state = buildFreshState(12);
    state.grid[5][3] = {
      elementType: 'Shop_CriticalRolls',
      elementVariant: null,
      pieceId: 1,
      roads: { N: false, E: false, S: false, W: false },
    };
    state.grid[5][4] = {
      elementType: 'Shop_BizarreBazaar',
      elementVariant: null,
      pieceId: 2,
      roads: { N: false, E: false, S: false, W: false },
    };
    state.grid[5][5] = {
      elementType: 'Shop_DrakeOfCakes',
      elementVariant: null,
      pieceId: 3,
      roads: { N: false, E: false, S: false, W: false },
    };
    state.grid[5][6] = {
      elementType: 'Shop_DraconicTonic',
      elementVariant: null,
      pieceId: 4,
      roads: { N: false, E: false, S: false, W: false },
    };
    state.grid[7][2] = {
      elementType: 'house',
      elementVariant: null,
      pieceId: 5,
      roads: { N: false, E: false, S: false, W: false },
    };
    state.grid[7][3] = {
      elementType: 'house',
      elementVariant: null,
      pieceId: 5,
      roads: { N: false, E: false, S: false, W: false },
    };
    state.elementCounts = {
      Shop_CriticalRolls: 1,
      Shop_BizarreBazaar: 1,
      Shop_DrakeOfCakes: 1,
      Shop_DraconicTonic: 1,
      house: 2,
    };
    state.scoreTotals = createInitialScoreTotals();
    state.scoreTotalsVersion = 0;
    state.scorePopups = [];
    state.residents = [];
    state.nextResidentId = 1;
    state.camera = createCamera(state.gridSize, window.innerWidth, window.innerHeight);
    state.camera.x = state.vertices[5][4].x + CELL_SIZE * 1.5;
    state.camera.y = state.vertices[5][4].y + CELL_SIZE * 0.8;
    rebuildClusterState(state);
    syncHoveredCluster(state, null);
    ensureCurrentPiece(state);
    attachAssetManifest(state);
    attachIconManifest(state);
    attachBackgroundTexture(state);
    attachBuiltBackgroundTexture(state);
    attachMapPointTexture(state);
    attachRoadTexture(state);
    attachResidentSprite(state);
    cameraInput.state = state;
    placementInput.state = state;
    uiPanel.state = state;
    scorePanel.state = state;
    uiPanel.setGridSize(state.gridSize);
    uiPanel.renderPreview();
    scorePanel.renderScores(true);
    lastSavedScoreTotalsVersion = state.scoreTotalsVersion || 0;
    saveToStorage(state);
    return this.getStateSnapshot();
  },
  loadRoadRenderTestScenario() {
    state = buildFreshState(12);
    state.grid[5][4] = {
      elementType: 'house',
      elementVariant: null,
      pieceId: 1,
      roads: { N: false, E: true, S: true, W: false },
    };
    state.grid[5][5] = {
      elementType: 'Shop_DracoBell',
      elementVariant: null,
      pieceId: 2,
      roads: { N: true, E: true, S: true, W: true },
    };
    state.grid[5][6] = {
      elementType: 'Shop_DrakeOfCakes',
      elementVariant: null,
      pieceId: 3,
      roads: { N: false, E: false, S: false, W: true },
    };
    state.grid[4][5] = {
      elementType: 'Shop_DraconicTonic',
      elementVariant: null,
      pieceId: 4,
      roads: { N: false, E: false, S: true, W: false },
    };
    state.grid[6][5] = {
      elementType: 'Shop_BizarreBazaar',
      elementVariant: null,
      pieceId: 5,
      roads: { N: true, E: false, S: false, W: false },
    };
    state.elementCounts = {
      house: 1,
      Shop_DracoBell: 1,
      Shop_DrakeOfCakes: 1,
      Shop_DraconicTonic: 1,
      Shop_BizarreBazaar: 1,
    };
    state.scoreTotals = createInitialScoreTotals();
    state.scoreTotalsVersion = 0;
    state.scorePopups = [];
    state.residents = [];
    state.nextResidentId = 1;
    state.camera = createCamera(state.gridSize, window.innerWidth, window.innerHeight);
    state.camera.x = state.vertices[5][5].x;
    state.camera.y = state.vertices[5][5].y;
    rebuildClusterState(state);
    syncHoveredCluster(state, null);
    ensureCurrentPiece(state);
    attachAssetManifest(state);
    attachIconManifest(state);
    attachBackgroundTexture(state);
    attachBuiltBackgroundTexture(state);
    attachMapPointTexture(state);
    attachRoadTexture(state);
    attachResidentSprite(state);
    cameraInput.state = state;
    placementInput.state = state;
    uiPanel.state = state;
    scorePanel.state = state;
    uiPanel.setGridSize(state.gridSize);
    uiPanel.renderPreview();
    scorePanel.renderScores(true);
    lastSavedScoreTotalsVersion = state.scoreTotalsVersion || 0;
    saveToStorage(state);
    return this.getStateSnapshot();
  },
  setCameraZoom(zoom) {
    state.camera.zoom = zoom;
    return this.getStateSnapshot();
  },
  setCameraPosition(x, y) {
    state.camera.x = x;
    state.camera.y = y;
    return this.getStateSnapshot();
  },
};

window.advanceTime = (ms) => {
  const now = performance.now();
  const deltaSeconds = Math.max(0, ms) / 1000;
  cameraInput.update(deltaSeconds);
  updateResidents(state, deltaSeconds);
  state.animations = state.animations.filter((anim) => now - anim.startTime < anim.duration);
  renderFrame(now);
};

let lastTime = performance.now();
function frame(now) {
  const deltaSeconds = (now - lastTime) / 1000;
  lastTime = now;
  cameraInput.update(deltaSeconds);
  updateResidents(state, deltaSeconds);
  state.animations = state.animations.filter((anim) => now - anim.startTime < anim.duration);
  renderFrame(now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
