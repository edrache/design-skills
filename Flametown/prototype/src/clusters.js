import { DIRS, neighborCoord } from './grid.js';
import {
  SHOP_GROUP_DEFINITIONS,
  UNIVERSAL_SHOP_GROUP_ID,
  getElementOverlayIconIds,
  getElementShopGroups,
  isShopElement,
} from './elementCatalog.js';

export const DEFAULT_WILD_TYPE = 'Any';

function cellKey(row, col) {
  return `${row},${col}`;
}

function uniqueTypes(types) {
  return [...new Set(types.filter((type) => typeof type === 'string' && type.length > 0))];
}

function defaultGetCellTypes(cell) {
  return cell?.elementType ? [cell.elementType] : [];
}

export function getClusterCellTypes(cell) {
  if (!cell?.elementType) {
    return [];
  }

  if (isShopElement(cell.elementType)) {
    return getElementShopGroups(cell.elementType);
  }

  return [cell.elementType];
}

export function matchShopClusterWildType(cell, targetType) {
  return (
    isShopElement(cell?.elementType) &&
    typeof targetType === 'string' &&
    targetType !== UNIVERSAL_SHOP_GROUP_ID &&
    Object.hasOwn(SHOP_GROUP_DEFINITIONS, targetType)
  );
}

export function getHoveredClusterEntryLabel(elementType, targetType) {
  if (isShopElement(elementType)) {
    return targetType;
  }

  return elementType;
}

export function getHoveredClusterEntryIconId(elementType, targetType) {
  if (isShopElement(elementType)) {
    return targetType;
  }

  return getElementOverlayIconIds(elementType)[0] ?? null;
}

function inGrid(grid, row, col) {
  return row >= 0 && row < grid.length && col >= 0 && col < (grid[row]?.length ?? 0);
}

export function getCellTypes(cell, getTypes = defaultGetCellTypes) {
  const rawTypes = getTypes(cell);
  if (!Array.isArray(rawTypes)) {
    return [];
  }
  return uniqueTypes(rawTypes);
}

function wildTypeMatchesTarget(cell, targetType, types, options = {}) {
  const wildType = options.wildType ?? DEFAULT_WILD_TYPE;
  if (!types.includes(wildType)) {
    return false;
  }

  const matchWildType = options.matchWildType;
  if (typeof matchWildType === 'function') {
    return Boolean(matchWildType(cell, targetType, types, wildType));
  }

  return false;
}

export function cellMatchesClusterType(cell, targetType, options = {}) {
  if (typeof targetType !== 'string' || targetType.length === 0) {
    return false;
  }

  const types = getCellTypes(cell, options.getCellTypes ?? defaultGetCellTypes);
  return types.includes(targetType) || wildTypeMatchesTarget(cell, targetType, types, options);
}

export function findCluster(grid, startRow, startCol, targetType, options = {}) {
  if (!Array.isArray(grid) || !inGrid(grid, startRow, startCol)) {
    return { targetType, size: 0, cells: [] };
  }

  if (!cellMatchesClusterType(grid[startRow][startCol], targetType, options)) {
    return { targetType, size: 0, cells: [] };
  }

  const visited = new Set();
  const queue = [{ row: startRow, col: startCol }];
  const cells = [];

  while (queue.length > 0) {
    const current = queue.shift();
    const key = cellKey(current.row, current.col);
    if (visited.has(key)) {
      continue;
    }

    visited.add(key);

    const cell = grid[current.row]?.[current.col];
    if (!cellMatchesClusterType(cell, targetType, options)) {
      continue;
    }

    cells.push({ row: current.row, col: current.col });

    for (const dir of DIRS) {
      const neighbor = neighborCoord(current.row, current.col, dir);
      if (!inGrid(grid, neighbor.row, neighbor.col)) {
        continue;
      }

      const neighborKey = cellKey(neighbor.row, neighbor.col);
      if (!visited.has(neighborKey)) {
        queue.push(neighbor);
      }
    }
  }

  return {
    targetType,
    size: cells.length,
    cells,
  };
}

function collectTargetTypes(grid, getTypes, wildType) {
  const targetTypes = new Set();

  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      for (const type of getCellTypes(grid[row][col], getTypes)) {
        if (type !== wildType) {
          targetTypes.add(type);
        }
      }
    }
  }

  return [...targetTypes];
}

export function buildClusterIndex(grid, options = {}) {
  const getTypes = options.getCellTypes ?? defaultGetCellTypes;
  const wildType = options.wildType ?? DEFAULT_WILD_TYPE;
  const targetTypes = options.targetTypes ?? collectTargetTypes(grid, getTypes, wildType);
  const clustersByType = {};
  const clustersById = {};
  const membershipByType = {};

  for (const targetType of targetTypes) {
    const visited = new Set();
    const clusters = [];
    const membership = {};

    for (let row = 0; row < grid.length; row += 1) {
      for (let col = 0; col < grid[row].length; col += 1) {
        const startKey = cellKey(row, col);
        if (visited.has(startKey) || !cellMatchesClusterType(grid[row][col], targetType, options)) {
          continue;
        }

        const cluster = findCluster(grid, row, col, targetType, options);
        const clusterId = `${targetType}:${clusters.length}`;
        const clusterWithId = {
          id: clusterId,
          targetType,
          size: cluster.size,
          cells: cluster.cells,
        };

        clusters.push(clusterWithId);
        clustersById[clusterId] = clusterWithId;

        for (const cell of cluster.cells) {
          const key = cellKey(cell.row, cell.col);
          visited.add(key);
          membership[key] = {
            clusterId,
            size: cluster.size,
            targetType,
          };
        }
      }
    }

    clustersByType[targetType] = clusters;
    membershipByType[targetType] = membership;
  }

  return {
    targetTypes: [...targetTypes],
    clustersByType,
    clustersById,
    membershipByType,
  };
}

export function getClusterMembership(index, row, col, targetType) {
  return index?.membershipByType?.[targetType]?.[cellKey(row, col)] ?? null;
}
