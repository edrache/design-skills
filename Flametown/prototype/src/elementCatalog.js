const SHOP_ELEMENT_WEIGHT = 9 / 34;
const ANY_SHOP_WEIGHT_MULTIPLIER = 0.1;
export const UNIVERSAL_SHOP_GROUP_ID = 'Any';

export const SHOP_GROUP_DEFINITIONS = {
  Bread: {
    id: 'Bread',
    iconAssetPath: 'assets/icons/Icon_GoodsToken_Bread.png',
  },
  Crystal: {
    id: 'Crystal',
    iconAssetPath: 'assets/icons/Icon_GoodsToken_Crystal.png',
  },
  Iron: {
    id: 'Iron',
    iconAssetPath: 'assets/icons/Icon_GoodsToken_Iron.png',
  },
  Meat: {
    id: 'Meat',
    iconAssetPath: 'assets/icons/Icon_GoodsToken_Meat.png',
  },
  Plant: {
    id: 'Plant',
    iconAssetPath: 'assets/icons/Icon_GoodsToken_Plant.png',
  },
  Potion: {
    id: 'Potion',
    iconAssetPath: 'assets/icons/Icon_GoodsToken_Potion.png',
  },
  Any: {
    id: 'Any',
    iconAssetPath: 'assets/icons/Icon_GoodsToken_Any.png',
  },
};

export const SCORING_GROUP_IDS = Object.keys(SHOP_GROUP_DEFINITIONS).filter(
  (groupId) => groupId !== UNIVERSAL_SHOP_GROUP_ID
);

export const ELEMENT_OVERLAY_ICON_DEFINITIONS = {
  shop: {
    id: 'shop',
    iconAssetPath: 'assets/icons/Icon_Shop.png',
  },
  ...SHOP_GROUP_DEFINITIONS,
};

function shop(id, groups) {
  const hasUniversalGroup = Array.isArray(groups) && groups.includes(UNIVERSAL_SHOP_GROUP_ID);
  return {
    id,
    weight: hasUniversalGroup
      ? SHOP_ELEMENT_WEIGHT * ANY_SHOP_WEIGHT_MULTIPLIER
      : SHOP_ELEMENT_WEIGHT,
    maxCount: Infinity,
    emoji: '🏪',
    shopGroups: groups,
  };
}

export const ELEMENT_CATALOG = [
  { id: 'house', weight: 4, maxCount: Infinity, emoji: '🏠', overlayIconIds: ['shop'] },
  { id: 'park', weight: 3, maxCount: Infinity, emoji: '🌳', overlayIconIds: [] },
  shop('Shop_BizarreBazaar', ['Any']),
  shop('Shop_CriticalRolls', ['Bread']),
  shop('Shop_DracoBell', ['Meat']),
  shop('Shop_DraconicTonic', ['Potion']),
  shop('Shop_DragginTailRoost', ['Any']),
  shop('Shop_DragonAlley', ['Any']),
  shop('Shop_DragonHoardBank', ['Crystal']),
  shop('Shop_DrakeOfCakes', ['Bread']),
  shop('Shop_EternalFlame', ['Any']),
  shop('Shop_FlagonsDragons', ['Any']),
  shop('Shop_FogoDeChar', ['Meat']),
  shop('Shop_FragileReptile', ['Crystal']),
  shop('Shop_FullPlateBuffet', ['Meat']),
  shop('Shop_FunkyBrewsters', ['Potion']),
  shop('Shop_GnomeDepot', ['Iron']),
  shop('Shop_GuiltyTreasures', ['Bread']),
  shop('Shop_HedgesHenges', ['Plant']),
  shop('Shop_HelloNursery', ['Plant']),
  shop('Shop_LaPetiteDragonne', ['Bread']),
  shop('Shop_MawPaws', ['Any']),
  shop('Shop_NunyasBeeswax', ['Any']),
  shop('Shop_OhMyGourd', ['Plant']),
  shop('Shop_PizzaCoven', ['Meat']),
  shop('Shop_PotablePotions', ['Potion']),
  shop('Shop_SageOfSage', ['Plant']),
  shop('Shop_SavingThrow', ['Iron']),
  shop('Shop_ScaleMailPost', ['Any']),
  shop('Shop_SewCute', ['Any']),
  shop('Shop_SmithMart', ['Iron']),
  shop('Shop_SpellfireSprings', ['Potion']),
  shop('Shop_TheSavageBeat', ['Iron']),
  shop('Shop_TipTheScales', ['Crystal']),
  shop('Shop_TouchOGlass', ['Crystal']),
  shop('Shop_WishingWell', ['Any']),
];

export function catalogEntry(id, catalog = ELEMENT_CATALOG) {
  const entry = catalog.find((item) => item.id === id);
  if (!entry) {
    throw new Error(`Unknown element type: ${id}`);
  }
  return entry;
}

export function pickWeightedElement(counts, rng = Math.random, catalog = ELEMENT_CATALOG) {
  const available = catalog.filter((entry) => (counts[entry.id] || 0) < entry.maxCount);
  const pool = available.length > 0 ? available : catalog;
  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);

  let roll = rng() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.id;
    }
  }

  return pool[pool.length - 1].id;
}

export function isShopElement(id) {
  return typeof id === 'string' && id.startsWith('Shop_');
}

export function getElementShopGroups(id, catalog = ELEMENT_CATALOG) {
  const entry = catalogEntry(id, catalog);
  return Array.isArray(entry.shopGroups) ? [...entry.shopGroups] : [];
}

export function elementBelongsToShopGroup(id, groupId, catalog = ELEMENT_CATALOG) {
  const groups = getElementShopGroups(id, catalog);
  return groups.includes(groupId) || (groups.includes(UNIVERSAL_SHOP_GROUP_ID) && groupId !== null);
}

export function getElementOverlayIconIds(id, catalog = ELEMENT_CATALOG) {
  const entry = catalogEntry(id, catalog);
  if (Array.isArray(entry.overlayIconIds)) {
    return [...entry.overlayIconIds];
  }
  if (Array.isArray(entry.shopGroups) && entry.shopGroups.length > 0) {
    return [entry.shopGroups[0]];
  }
  return [];
}

export function getElementOverlayIcons(id, catalog = ELEMENT_CATALOG) {
  return getElementOverlayIconIds(id, catalog)
    .map((iconId) => ELEMENT_OVERLAY_ICON_DEFINITIONS[iconId])
    .filter(Boolean);
}

export function getElementScoringGroupId(id, catalog = ELEMENT_CATALOG) {
  const groups = getElementShopGroups(id, catalog);
  return groups.find((groupId) => SCORING_GROUP_IDS.includes(groupId)) ?? null;
}
