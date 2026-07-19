import { SAVE_KEY } from '../config.js';
import {
  canAffordCostEntries,
  createMarketOffers,
  createDeckState,
  createEmptyBuildingCooldownState,
  createMarketState,
  createStarterOffer,
  createTileInstance,
  createTileInstanceFromDefinition,
  countDrawableTiles,
  drawMissingCount,
  findAffordableGoods,
  getStarterTileDefinitions,
  normalizeMarketOffer,
  spendCostEntries,
  shuffleTiles,
  totalTilesInDeckState,
} from './deck.js';
import {
  DEFAULT_WILD_TYPE,
  buildClusterIndex,
  getClusterCellTypes,
  getHoveredClusterEntryIconId,
  getHoveredClusterEntryLabel,
  getClusterMembership,
  matchShopClusterWildType,
} from './clusters.js';
import {
  ELEMENT_CATALOG,
  SCORING_GROUP_IDS,
  UNIVERSAL_SHOP_GROUP_ID,
  getElementShopGroups,
  isShopElement,
  pickWeightedElement,
} from './elementCatalog.js';
import { createCellGrid, createVertexGrid } from './grid.js';
import { absoluteCells, canPlacePiece, pieceCells, randomPieceId } from './pieces.js';
import {
  bootstrapResidentsFromGrid,
  deserializeResidents,
  serializeResidents,
  spawnResidentsForHouseCells,
  syncResidentGraph,
} from './residents.js';
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

function nextResidentId(residents) {
  return (
    (residents || []).reduce((maxId, resident) => Math.max(maxId, Number(resident.id) || 0), 0) + 1
  );
}

function createEmptyHoverState() {
  return {
    hoveredCell: null,
    hoveredClusterCells: [],
    hoveredClusterSize: 0,
    hoveredClusterEntries: [],
    hoveredPointerScreen: null,
  };
}

function normalizeHoveredCell(state, hoveredCell) {
  if (
    !hoveredCell ||
    !Number.isInteger(hoveredCell.row) ||
    !Number.isInteger(hoveredCell.col) ||
    hoveredCell.row < 0 ||
    hoveredCell.col < 0 ||
    hoveredCell.row >= state.gridSize ||
    hoveredCell.col >= state.gridSize
  ) {
    return null;
  }

  return {
    row: hoveredCell.row,
    col: hoveredCell.col,
  };
}

export function rebuildClusterState(state) {
  state.clusterIndex = buildClusterIndex(state.grid, {
    getCellTypes: getClusterCellTypes,
    matchWildType: matchShopClusterWildType,
  });
  return state.clusterIndex;
}

export function syncHoveredCluster(state, hoveredCell) {
  const normalizedHoveredCell = normalizeHoveredCell(state, hoveredCell);
  if (!normalizedHoveredCell) {
    Object.assign(state, createEmptyHoverState());
    return;
  }

  state.hoveredCell = normalizedHoveredCell;
  const hoveredGridCell = state.grid[normalizedHoveredCell.row][normalizedHoveredCell.col];
  if (!hoveredGridCell?.elementType) {
    state.hoveredClusterCells = [];
    state.hoveredClusterSize = 0;
    state.hoveredClusterEntries = [];
    return;
  }

  if (!state.clusterIndex) {
    rebuildClusterState(state);
  }

  const hoveredTypes = getClusterCellTypes(hoveredGridCell);
  const targetTypes = new Set(hoveredTypes.filter((type) => type !== DEFAULT_WILD_TYPE));

  if (hoveredTypes.includes(DEFAULT_WILD_TYPE)) {
    for (const targetType of state.clusterIndex?.targetTypes || []) {
      if (getClusterMembership(state.clusterIndex, normalizedHoveredCell.row, normalizedHoveredCell.col, targetType)) {
        targetTypes.add(targetType);
      }
    }
  }

  const clusterCellsByKey = new Map();
  const hoveredClusterEntries = [];
  for (const targetType of targetTypes) {
    const membership = getClusterMembership(
      state.clusterIndex,
      normalizedHoveredCell.row,
      normalizedHoveredCell.col,
      targetType
    );
    if (!membership) {
      continue;
    }

    const cluster = state.clusterIndex.clustersById?.[membership.clusterId];
    hoveredClusterEntries.push({
      targetType,
      label: getHoveredClusterEntryLabel(hoveredGridCell.elementType, targetType),
      iconId: getHoveredClusterEntryIconId(hoveredGridCell.elementType, targetType),
      size: membership.size,
      isWildcardExpansion:
        isShopElement(hoveredGridCell.elementType) &&
        hoveredTypes.includes(UNIVERSAL_SHOP_GROUP_ID),
    });
    for (const cell of cluster?.cells || []) {
      clusterCellsByKey.set(`${cell.row}:${cell.col}`, cell);
    }
  }

  state.hoveredClusterCells = [...clusterCellsByKey.values()];
  state.hoveredClusterSize = state.hoveredClusterCells.length;
  state.hoveredClusterEntries = hoveredClusterEntries.sort((left, right) =>
    left.label.localeCompare(right.label)
  );
}

export function createInitialScoreTotals() {
  return Object.fromEntries(SCORING_GROUP_IDS.map((groupId) => [groupId, 0]));
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
  const state = {
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
    scoreTotals: createInitialScoreTotals(),
    scoreTotalsVersion: 0,
    scorePopups: [],
    runState: 'starter-selection',
    starterOptions: getStarterTileDefinitions().map((tile) => tile.id),
    starterTileId: null,
    deckState: createDeckState(),
    marketState: createMarketState(rng),
    buildingCooldowns: createEmptyBuildingCooldownState(),
    residents: [],
    nextResidentId: 1,
    clusterIndex: null,
    ...createEmptyHoverState(),
  };
  syncResidentGraph(state);
  rebuildClusterState(state);
  return state;
}

function buildPlannedPieceCells(state, cellCount, rng = Math.random) {
  const nonShopCatalog = ELEMENT_CATALOG.filter((entry) => !isShopElement(entry.id));
  const plannedCells = [];
  let hasShopOnPiece = false;

  for (let index = 0; index < cellCount; index += 1) {
    const elementType = pickWeightedElement(
      state.elementCounts,
      rng,
      hasShopOnPiece ? nonShopCatalog : ELEMENT_CATALOG
    );
    plannedCells.push({ elementType });
    hasShopOnPiece = hasShopOnPiece || isShopElement(elementType);
  }

  return plannedCells;
}

export function createPieceDraft(
  state,
  shapeId = randomPieceId(Math.random),
  rotation = 0,
  rng = Math.random
) {
  const cellCount = pieceCells(shapeId, rotation).length;
  return {
    shapeId,
    rotation,
    plannedCells: buildPlannedPieceCells(state, cellCount, rng),
  };
}

export function syncCurrentPieceSelection(state) {
  const deckState = state.deckState || createDeckState();
  state.deckState = deckState;

  if (!Array.isArray(deckState.hand)) {
    deckState.hand = [];
  }
  if (!Array.isArray(deckState.drawPile)) {
    deckState.drawPile = [];
  }
  if (!Array.isArray(deckState.discardPile)) {
    deckState.discardPile = [];
  }

  const maxIndex = Math.max(0, deckState.hand.length - 1);
  deckState.selectedHandIndex = Math.min(maxIndex, Math.max(0, deckState.selectedHandIndex || 0));
  state.currentPiece = deckState.hand[deckState.selectedHandIndex] || null;
  if (!state.currentPiece) {
    state.holding = false;
  }
}

export function ensureCurrentPiece(state, rng = Math.random) {
  if (state.deckState) {
    if (!state.currentPiece || (state.deckState.hand?.length || 0) > 0) {
      syncCurrentPieceSelection(state);
    }
    return;
  }

  if (!state.currentPiece) {
    state.currentPiece = createPieceDraft(state, randomPieceId(rng), 0, rng);
    state.holding = false;
  }
}

function getOwnedStarterTileIds(state) {
  const owned = new Set();
  const deckState = state.deckState || createDeckState();
  for (const zone of [deckState.drawPile, deckState.hand, deckState.discardPile]) {
    for (const tile of zone || []) {
      if (tile?.tileId?.startsWith?.('starter-')) {
        owned.add(tile.tileId);
      }
    }
  }
  if (typeof state.starterTileId === 'string') {
    owned.add(state.starterTileId);
  }
  return [...owned];
}

function normalizeMarketState(state, rng = Math.random) {
  if (!state.marketState) {
    state.marketState = createMarketState(rng, getOwnedStarterTileIds(state));
    return;
  }

  state.marketState.offers = (state.marketState.offers || [])
    .map((offer) => normalizeMarketOffer(offer))
    .filter(Boolean);
  state.marketState.refreshCost = Number.isFinite(state.marketState.refreshCost)
    ? state.marketState.refreshCost
    : createMarketState().refreshCost;
}

export function rerollMarketOffers(state, rng = Math.random) {
  normalizeMarketState(state, rng);
  state.marketState.offers = createMarketOffers(getOwnedStarterTileIds(state), rng);
  return state.marketState.offers;
}

export function startRunWithStarter(state, tileId, rng = Math.random) {
  state.runState = 'playing';
  state.starterTileId = tileId;
  state.deckState = createDeckState();
  state.marketState = createMarketState(rng, [tileId]);
  state.buildingCooldowns = createEmptyBuildingCooldownState();
  state.deckState.drawPile.push(createTileInstance(tileId));
  drawTilesUpToHandLimit(state, rng);
  state.holding = false;
}

export function reshuffleDiscardIntoDraw(state, rng = Math.random) {
  const deckState = state.deckState || createDeckState();
  state.deckState = deckState;
  if ((deckState.drawPile?.length || 0) > 0 || (deckState.discardPile?.length || 0) === 0) {
    return false;
  }

  deckState.drawPile = shuffleTiles(deckState.discardPile, rng);
  deckState.discardPile = [];
  deckState.lastDrawUsedReshuffle = true;
  return true;
}

export function drawTilesUpToHandLimit(state, rng = Math.random) {
  const deckState = state.deckState || createDeckState();
  state.deckState = deckState;
  deckState.lastDrawUsedReshuffle = false;

  while (drawMissingCount(deckState) > 0 && countDrawableTiles(deckState) > 0) {
    if ((deckState.drawPile?.length || 0) === 0) {
      reshuffleDiscardIntoDraw(state, rng);
    }

    const nextPiece = deckState.drawPile.shift();
    if (!nextPiece) {
      break;
    }
    deckState.hand.push(nextPiece);
  }

  syncCurrentPieceSelection(state);
}

export function canAffordDraw(state, goodsType) {
  const deckState = state.deckState || createDeckState();
  const missing = drawMissingCount(deckState);
  if (missing <= 0 || countDrawableTiles(deckState) <= 0) {
    return false;
  }
  return (state.scoreTotals?.[goodsType] || 0) >= (deckState.drawCost || 0);
}

export function drawUsingGoods(state, goodsType, rng = Math.random) {
  if (!canAffordDraw(state, goodsType)) {
    return { ok: false, reason: 'insufficient-goods' };
  }

  state.scoreTotals[goodsType] -= state.deckState.drawCost;
  state.scoreTotalsVersion = (state.scoreTotalsVersion || 0) + 1;
  state.deckState.lastDrawGoodType = goodsType;
  drawTilesUpToHandLimit(state, rng);
  return { ok: true, reshuffled: Boolean(state.deckState.lastDrawUsedReshuffle) };
}

export function moveCurrentPieceToDiscard(state) {
  const deckState = state.deckState || createDeckState();
  state.deckState = deckState;
  if (!state.currentPiece || !Array.isArray(deckState.hand) || deckState.hand.length === 0) {
    state.currentPiece = null;
    state.holding = false;
    return null;
  }

  const selectedIndex = Math.max(
    0,
    Math.min(deckState.hand.length - 1, deckState.selectedHandIndex || 0)
  );
  const [playedPiece] = deckState.hand.splice(selectedIndex, 1);
  if (playedPiece) {
    deckState.discardPile.push(playedPiece);
  }
  syncCurrentPieceSelection(state);
  state.holding = false;
  return playedPiece || null;
}

export function buyMarketTile(state, offerIndex, rng = Math.random, preferredAnyGoodsType = null) {
  normalizeMarketState(state, rng);
  const offer = state.marketState?.offers?.[offerIndex];
  if (!offer) {
    return { ok: false, reason: 'missing-offer' };
  }

  const tileInstance =
    offer.offerType === 'starter'
      ? createTileInstance(offer.tileId)
      : createTileInstanceFromDefinition({
          id: offer.tileId,
          name: offer.name,
          goodsType: offer.goodsType,
          shopElementType: offer.shopElementType,
          shapeId: offer.shapeId,
          rotation: offer.rotation,
          plannedCells: offer.plannedCells,
        });
  const payment = spendCostEntries(state.scoreTotals, offer.costEntries, {
    preferredAnyGoodsType,
  });
  if (!payment) {
    return { ok: false, reason: 'insufficient-goods' };
  }

  state.scoreTotals = payment.nextTotals;
  state.scoreTotalsVersion = (state.scoreTotalsVersion || 0) + 1;
  state.deckState.discardPile.push(tileInstance);
  rerollMarketOffers(state, rng);
  return { ok: true, spentEntries: payment.spentEntries };
}

export function canAffordMarketRefresh(state, goodsType) {
  normalizeMarketState(state);
  return (state.scoreTotals?.[goodsType] || 0) >= (state.marketState?.refreshCost || 0);
}

export function refreshMarketUsingGoods(state, goodsType, rng = Math.random) {
  normalizeMarketState(state, rng);
  const refreshCost = state.marketState?.refreshCost || 0;
  if ((state.scoreTotals?.[goodsType] || 0) < refreshCost) {
    return { ok: false, reason: 'insufficient-goods', goodsType };
  }

  state.scoreTotals[goodsType] -= refreshCost;
  state.scoreTotalsVersion = (state.scoreTotalsVersion || 0) + 1;
  rerollMarketOffers(state, rng);
  return { ok: true, goodsType };
}

export function canAffordMarketOffer(state, offerIndex, preferredAnyGoodsType = null) {
  normalizeMarketState(state);
  const offer = state.marketState?.offers?.[offerIndex];
  if (!offer) {
    return false;
  }
  return canAffordCostEntries(state.scoreTotals, offer.costEntries, {
    preferredAnyGoodsType,
  });
}

export function getAffordableDrawGoods(state) {
  return findAffordableGoods(state.scoreTotals, state.deckState?.drawCost || 0);
}

export function getTotalOwnedTiles(state) {
  return totalTilesInDeckState(state.deckState);
}

export function isBuildingReady(state, row, col, now = Date.now()) {
  const cooldown = state.buildingCooldowns?.[`${row}:${col}`];
  return !cooldown || cooldown.readyAtMs <= now;
}

export function setBuildingCooldown(state, row, col, now, cooldownMs) {
  if (!state.buildingCooldowns) {
    state.buildingCooldowns = createEmptyBuildingCooldownState();
  }
  state.buildingCooldowns[`${row}:${col}`] = {
    readyAtMs: now + cooldownMs,
    startedAtMs: now,
    cooldownMs,
  };
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
  const plannedCells =
    state.currentPiece &&
    state.currentPiece.shapeId === shapeId &&
    state.currentPiece.rotation === rotation &&
    Array.isArray(state.currentPiece.plannedCells) &&
    state.currentPiece.plannedCells.length === cells.length
      ? state.currentPiece.plannedCells
      : buildPlannedPieceCells(state, cells.length, rng);

  cells.forEach(([row, col], index) => {
    const finalElementType = plannedCells[index]?.elementType ?? pickWeightedElement(state.elementCounts, rng);
    state.elementCounts[finalElementType] = (state.elementCounts[finalElementType] || 0) + 1;

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
  syncResidentGraph(state);
  spawnResidentsForHouseCells(state, cells, rng);
  rebuildClusterState(state);
  syncHoveredCluster(state, state.hoveredCell);
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
    version: 4,
    gridSize: state.gridSize,
    worldSeed: normalizeSeed(state.worldSeed || 1),
    occupiedCells: sparseOccupiedCells(state.grid),
    elementCounts: state.elementCounts,
    placedPieceCount: state.placedPieceCount,
    scoreTotals: { ...createInitialScoreTotals(), ...(state.scoreTotals || {}) },
    runState: state.runState || 'starter-selection',
    starterTileId: state.starterTileId || null,
    starterOptions: state.starterOptions || getStarterTileDefinitions().map((tile) => tile.id),
    deckState: state.deckState || createDeckState(),
    marketState: state.marketState || createMarketState(),
    buildingCooldowns: state.buildingCooldowns || createEmptyBuildingCooldownState(),
    residents: serializeResidents(state.residents),
    nextResidentId: state.nextResidentId || nextResidentId(state.residents),
    camera: state.camera
      ? { x: state.camera.x, y: state.camera.y, zoom: state.camera.zoom }
      : null,
  });
}

export function deserializeState(json) {
  const data = JSON.parse(json);
  if (data.version !== 1 && data.version !== 2 && data.version !== 3 && data.version !== 4) {
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
  const residents = deserializeResidents(data.residents);

  const state = {
    version: 4,
    gridSize: data.gridSize,
    worldSeed,
    cells,
    vertices,
    elementCounts: data.elementCounts || {},
    placedPieceCount: data.placedPieceCount || 0,
    scoreTotals: { ...createInitialScoreTotals(), ...(data.scoreTotals || {}) },
    runState: data.runState || 'starter-selection',
    starterTileId: data.starterTileId || null,
    starterOptions: data.starterOptions || getStarterTileDefinitions().map((tile) => tile.id),
    deckState: { ...createDeckState(), ...(data.deckState || {}) },
    marketState: { ...createMarketState(), ...(data.marketState || {}) },
    buildingCooldowns: data.buildingCooldowns || createEmptyBuildingCooldownState(),
    residents,
    nextResidentId: data.nextResidentId || nextResidentId(residents),
    camera: data.camera || null,
  };

  // Tuning values should come from the current build, not from stale saves.
  state.deckState.drawCost = createDeckState().drawCost;
  normalizeMarketState(state);

  if (data.version === 1 && residents.length === 0) {
    const upgradeState = {
      grid: cells,
      residents,
      nextResidentId: state.nextResidentId,
    };
    bootstrapResidentsFromGrid(upgradeState);
    state.residents = upgradeState.residents;
    state.nextResidentId = upgradeState.nextResidentId;
  }

  return state;
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
