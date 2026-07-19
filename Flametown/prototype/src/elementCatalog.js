const SHOP_ELEMENT_WEIGHT = 9 / 34;

export const ELEMENT_CATALOG = [
  { id: 'house', weight: 5, maxCount: Infinity, emoji: '🏠' },
  { id: 'park', weight: 3, maxCount: Infinity, emoji: '🌳' },
  { id: 'Shop_BizarreBazaar', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_CriticalRolls', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_DracoBell', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_DraconicTonic', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_DragginTailRoost', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_DragonAlley', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_DragonHoardBank', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_DrakeOfCakes', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_EternalFlame', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_FlagonsDragons', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_FogoDeChar', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_FragileReptile', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_FullPlateBuffet', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_FunkyBrewsters', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_GnomeDepot', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_GuiltyTreasures', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_HedgesHenges', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_HelloNursery', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_LaPetiteDragonne', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_MawPaws', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_NunyasBeeswax', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_OhMyGourd', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_PizzaCoven', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_PotablePotions', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_SageOfSage', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_SavingThrow', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_ScaleMailPost', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_SewCute', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_SmithMart', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_SpellfireSprings', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_TheSavageBeat', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_TipTheScales', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_TouchOGlass', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
  { id: 'Shop_WishingWell', weight: SHOP_ELEMENT_WEIGHT, maxCount: Infinity, emoji: '🏪' },
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
