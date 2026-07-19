import { ELEMENT_CATALOG, SCORING_GROUP_IDS, getShopPrimaryGoodsType, isShopElement } from './elementCatalog.js';
import {
  DRAW_COST_AMOUNT,
  MARKET_RANDOM_COST_GOOD_TYPES,
  MARKET_RANDOM_COST_PER_GOOD_AMOUNT,
  MARKET_REFRESH_COST_AMOUNT,
  MARKET_STARTER_COST_ANY_AMOUNT,
} from '../config.js';
import { pieceCells, randomPieceId } from './pieces.js';

export const DEFAULT_HAND_SIZE = 1;
export const DEFAULT_DRAW_COST = DRAW_COST_AMOUNT;
export const DEFAULT_BUILDING_CLICK_COOLDOWN_MS = 6000;
export const DEFAULT_MARKET_OFFER_COUNT = 3;
export const DEFAULT_MARKET_STARTER_OFFER_COUNT = 2;

const STARTER_TILE_DEFINITIONS = [
  {
    id: 'starter-draco-bell',
    name: 'Draco Bell',
    goodsType: 'Meat',
    shopElementType: 'Shop_DracoBell',
    plannedCells: ['house', 'park', 'park', 'Shop_DracoBell'],
  },
  {
    id: 'starter-potable-potions',
    name: 'Potable Potions',
    goodsType: 'Potion',
    shopElementType: 'Shop_PotablePotions',
    plannedCells: ['house', 'park', 'park', 'Shop_PotablePotions'],
  },
  {
    id: 'starter-hello-nursery',
    name: 'Hello Nursery',
    goodsType: 'Plant',
    shopElementType: 'Shop_HelloNursery',
    plannedCells: ['house', 'park', 'park', 'Shop_HelloNursery'],
  },
  {
    id: 'starter-smith-mart',
    name: 'Smith Mart',
    goodsType: 'Iron',
    shopElementType: 'Shop_SmithMart',
    plannedCells: ['house', 'park', 'park', 'Shop_SmithMart'],
  },
  {
    id: 'starter-fragile-reptile',
    name: 'Fragile Reptile',
    goodsType: 'Crystal',
    shopElementType: 'Shop_FragileReptile',
    plannedCells: ['house', 'park', 'park', 'Shop_FragileReptile'],
  },
  {
    id: 'starter-critical-rolls',
    name: 'Critical Rolls',
    goodsType: 'Bread',
    shopElementType: 'Shop_CriticalRolls',
    plannedCells: ['house', 'park', 'park', 'Shop_CriticalRolls'],
  },
];

const STARTER_TILE_LOOKUP = new Map(STARTER_TILE_DEFINITIONS.map((tile) => [tile.id, tile]));
const CONCRETE_SHOP_ELEMENT_TYPES = ELEMENT_CATALOG.filter((entry) => isShopElement(entry.id))
  .map((entry) => entry.id)
  .filter((elementType) => Boolean(getShopPrimaryGoodsType(elementType)));

function clonePlannedCells(plannedCells) {
  return plannedCells.map((elementType) => ({ elementType }));
}

function cloneCostEntries(costEntries) {
  return (costEntries || []).map((entry) => ({
    goodsType: entry.goodsType,
    amount: entry.amount,
  }));
}

export function createStarterOfferCostEntries() {
  return [{ goodsType: 'Any', amount: MARKET_STARTER_COST_ANY_AMOUNT }];
}

export function createRandomOfferCostEntries(primaryGoodsType, rng = Math.random) {
  const distinctGoods = shuffleTiles(
    SCORING_GROUP_IDS.filter((goodsType) => goodsType !== primaryGoodsType),
    rng
  ).slice(0, Math.max(0, MARKET_RANDOM_COST_GOOD_TYPES - 1));
  const goodsTypes = [primaryGoodsType, ...distinctGoods].slice(0, MARKET_RANDOM_COST_GOOD_TYPES);
  return goodsTypes.map((goodsType) => ({
    goodsType,
    amount: MARKET_RANDOM_COST_PER_GOOD_AMOUNT,
  }));
}

function normalizeRandomOfferCostEntries(costEntries, primaryGoodsType) {
  const explicitGoodsTypes = (costEntries || [])
    .map((entry) => entry?.goodsType)
    .filter((goodsType) => SCORING_GROUP_IDS.includes(goodsType));
  const orderedGoodsTypes = [
    primaryGoodsType,
    ...explicitGoodsTypes.filter((goodsType) => goodsType !== primaryGoodsType),
  ].slice(0, MARKET_RANDOM_COST_GOOD_TYPES);

  if (orderedGoodsTypes.length >= MARKET_RANDOM_COST_GOOD_TYPES) {
    return orderedGoodsTypes.map((goodsType) => ({
      goodsType,
      amount: MARKET_RANDOM_COST_PER_GOOD_AMOUNT,
    }));
  }

  return createRandomOfferCostEntries(primaryGoodsType);
}

export function getStarterTileDefinitions() {
  return STARTER_TILE_DEFINITIONS.map((tile) => ({
    ...tile,
    plannedCells: [...tile.plannedCells],
  }));
}

export function getStarterTileDefinitionById(tileId) {
  const tile = STARTER_TILE_LOOKUP.get(tileId);
  if (!tile) {
    throw new Error(`Unknown starter tile: ${tileId}`);
  }
  return {
    ...tile,
    plannedCells: [...tile.plannedCells],
  };
}

export function createTileInstance(tileId) {
  const tile = getStarterTileDefinitionById(tileId);
  return createTileInstanceFromDefinition(tile);
}

export function createTileInstanceFromDefinition(tile) {
  return {
    tileId: tile.id,
    name: tile.name,
    goodsType: tile.goodsType,
    shopElementType: tile.shopElementType,
    shapeId: tile.shapeId || 'O',
    rotation: tile.rotation || 0,
    plannedCells: clonePlannedCells(tile.plannedCells),
  };
}

export function createStarterOffer(tileId) {
  const tile = getStarterTileDefinitionById(tileId);
  return {
    offerId: tile.id,
    offerType: 'starter',
    tileId: tile.id,
    name: tile.name,
    goodsType: tile.goodsType,
    shopElementType: tile.shopElementType,
    shapeId: 'O',
    plannedCells: [...tile.plannedCells],
    costEntries: createStarterOfferCostEntries(),
  };
}

function humanizeShopName(shopElementType) {
  return shopElementType
    .replace(/^Shop_/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function createRandomMarketTileOffer(rng = Math.random) {
  const shuffledShops = shuffleTiles(CONCRETE_SHOP_ELEMENT_TYPES, rng);
  const shopElementType = shuffledShops[0] || 'Shop_DracoBell';
  const goodsType = getShopPrimaryGoodsType(shopElementType) || 'Meat';
  const shapeId = randomPieceId(rng);
  const cellCount = pieceCells(shapeId, 0).length;
  const plannedCells = shuffleTiles(
    ['house', 'park', 'park', shopElementType].slice(0, cellCount),
    rng
  );
  const suffix = Math.floor(rng() * 0xffffffff)
    .toString(36)
    .padStart(6, '0');

  return {
    offerId: `random-${shopElementType}-${suffix}`,
    offerType: 'random',
    tileId: `market-random-${suffix}`,
    name: humanizeShopName(shopElementType),
    goodsType,
    shopElementType,
    shapeId,
    rotation: 0,
    plannedCells,
    costEntries: createRandomOfferCostEntries(goodsType, rng),
  };
}

export function createDeckState() {
  return {
    drawPile: [],
    discardPile: [],
    hand: [],
    handSize: DEFAULT_HAND_SIZE,
    selectedHandIndex: 0,
    drawCost: DEFAULT_DRAW_COST,
    lastDrawGoodType: null,
    lastDrawUsedReshuffle: false,
  };
}

export function createMarketOffers(ownedStarterIds = [], rng = Math.random) {
  const owned = new Set(ownedStarterIds);
  const starterOffers = shuffleTiles(
    STARTER_TILE_DEFINITIONS.filter((tile) => !owned.has(tile.id)),
    rng
  )
    .slice(0, DEFAULT_MARKET_STARTER_OFFER_COUNT)
    .map((tile) => createStarterOffer(tile.id));

  const offers = [...starterOffers];
  while (offers.length < DEFAULT_MARKET_OFFER_COUNT) {
    offers.push(createRandomMarketTileOffer(rng));
  }
  return offers.slice(0, DEFAULT_MARKET_OFFER_COUNT);
}

export function createMarketState(rng = Math.random, ownedStarterIds = []) {
  return {
    offers: createMarketOffers(ownedStarterIds, rng),
    isOpen: false,
    refreshCost: MARKET_REFRESH_COST_AMOUNT,
  };
}

export function createEmptyBuildingCooldownState() {
  return {};
}

export function totalTilesInDeckState(deckState) {
  return (
    (deckState?.drawPile?.length || 0) +
    (deckState?.hand?.length || 0) +
    (deckState?.discardPile?.length || 0)
  );
}

export function countDrawableTiles(deckState) {
  return (deckState?.drawPile?.length || 0) + (deckState?.discardPile?.length || 0);
}

export function drawMissingCount(deckState) {
  const handSize = Number(deckState?.handSize || 0);
  const currentHandSize = deckState?.hand?.length || 0;
  return Math.max(0, handSize - currentHandSize);
}

export function shuffleTiles(items, rng = Math.random) {
  const clone = [...(items || [])];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(rng() * (index + 1));
    [clone[index], clone[nextIndex]] = [clone[nextIndex], clone[index]];
  }
  return clone;
}

export function normalizeMarketOffer(offer) {
  if (!offer) {
    return null;
  }
  if (typeof offer === 'string') {
    return createStarterOffer(offer);
  }
  if (offer.offerType === 'starter' && typeof offer.tileId === 'string') {
    const starterOffer = createStarterOffer(offer.tileId);
    return {
      ...starterOffer,
      ...offer,
      plannedCells: Array.isArray(offer.plannedCells) ? [...offer.plannedCells] : starterOffer.plannedCells,
      costEntries: cloneCostEntries(starterOffer.costEntries),
    };
  }
  if (offer.offerType === 'random') {
    const primaryGoodsType = offer.goodsType || getShopPrimaryGoodsType(offer.shopElementType) || 'Meat';
    const currentCostEntries = normalizeRandomOfferCostEntries(offer.costEntries, primaryGoodsType);
    return {
      ...offer,
      plannedCells: Array.isArray(offer.plannedCells) ? [...offer.plannedCells] : ['house', 'park', 'park', offer.shopElementType],
      shapeId: offer.shapeId || 'O',
      rotation: offer.rotation || 0,
      costEntries: cloneCostEntries(currentCostEntries),
    };
  }
  return null;
}

export function canAffordCostEntries(scoreTotals, costEntries, options = {}) {
  const normalized = cloneCostEntries(costEntries);
  return normalized.every((entry) => {
    if (entry.goodsType === 'Any') {
      if (options.preferredAnyGoodsType) {
        return (scoreTotals?.[options.preferredAnyGoodsType] || 0) >= entry.amount;
      }
      return SCORING_GROUP_IDS.some((goodsType) => (scoreTotals?.[goodsType] || 0) >= entry.amount);
    }
    return (scoreTotals?.[entry.goodsType] || 0) >= entry.amount;
  });
}

export function spendCostEntries(scoreTotals, costEntries, options = {}) {
  if (!canAffordCostEntries(scoreTotals, costEntries, options)) {
    return null;
  }

  const nextTotals = { ...(scoreTotals || {}) };
  const spentEntries = [];
  for (const entry of cloneCostEntries(costEntries)) {
    if (entry.goodsType === 'Any') {
      const payableGoodsType = options.preferredAnyGoodsType
        ? options.preferredAnyGoodsType
        : SCORING_GROUP_IDS.find((goodsType) => (nextTotals[goodsType] || 0) >= entry.amount);
      if (!payableGoodsType) {
        return null;
      }
      nextTotals[payableGoodsType] -= entry.amount;
      spentEntries.push({ goodsType: payableGoodsType, amount: entry.amount, sourceGoodsType: 'Any' });
      continue;
    }

    nextTotals[entry.goodsType] = (nextTotals[entry.goodsType] || 0) - entry.amount;
    spentEntries.push({ goodsType: entry.goodsType, amount: entry.amount, sourceGoodsType: entry.goodsType });
  }

  return { nextTotals, spentEntries };
}

export function findAffordableGoods(scoreTotals, requiredAmount) {
  return SCORING_GROUP_IDS.filter((groupId) => (scoreTotals?.[groupId] || 0) >= requiredAmount);
}
