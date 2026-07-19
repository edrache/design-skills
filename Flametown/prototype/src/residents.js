import {
  RESIDENT_EDGE_SPEED,
  RESIDENT_ROAD_SPEED,
  RESIDENT_WALK_BOB_DISTANCE,
  RESIDENT_WALK_SCALE_Y_AMPLITUDE,
} from '../config.js';
import { easeInOutSine } from './anim.js';
import { SCORING_GROUP_IDS, getElementScoringGroupId } from './elementCatalog.js';
import {
  buildClusterIndex,
  getClusterCellTypes,
  getClusterMembership,
  matchShopClusterWildType,
} from './clusters.js';

function nodeKey(row, col) {
  return `${row},${col}`;
}

function edgeKey(a, b) {
  const first = nodeKey(a.row, a.col);
  const second = nodeKey(b.row, b.col);
  return first < second ? `${first}|${second}` : `${second}|${first}`;
}

function sameNode(a, b) {
  return Boolean(a) && Boolean(b) && a.row === b.row && a.col === b.col;
}

function cloneNode(node) {
  return { row: node.row, col: node.col };
}

function roadNodesForDirection(row, col, dir) {
  switch (dir) {
    case 'N':
      return [{ row, col }, { row, col: col + 1 }];
    case 'E':
      return [{ row, col: col + 1 }, { row: row + 1, col: col + 1 }];
    case 'S':
      return [{ row: row + 1, col }, { row: row + 1, col: col + 1 }];
    case 'W':
      return [{ row, col }, { row: row + 1, col }];
    default:
      throw new Error(`Unknown road direction: ${dir}`);
  }
}

function oppositeDir(dir) {
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
      throw new Error(`Unknown road direction: ${dir}`);
  }
}

function ensureGraphNode(nodes, row, col) {
  const key = nodeKey(row, col);
  if (!nodes[key]) {
    nodes[key] = { row, col, neighbors: [] };
  }
  return nodes[key];
}

function appendNeighbor(node, neighbor) {
  if (!node.neighbors.some((entry) => sameNode(entry, neighbor))) {
    node.neighbors.push(cloneNode(neighbor));
  }
}

export function buildRoadGraph(grid) {
  const nodes = {};
  const edges = {};

  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      const cell = grid[row][col];
      if (!cell?.elementType) {
        continue;
      }

      for (const dir of ['N', 'E', 'S', 'W']) {
        const [a, b] = roadNodesForDirection(row, col, dir);
        const key = edgeKey(a, b);
        const neighbor =
          dir === 'N'
            ? grid[row - 1]?.[col]
            : dir === 'E'
              ? grid[row]?.[col + 1]
              : dir === 'S'
                ? grid[row + 1]?.[col]
                : grid[row]?.[col - 1];
        const isRoad = Boolean(cell.roads?.[dir] || neighbor?.roads?.[oppositeDir(dir)]);

        if (!edges[key]) {
          const nodeA = ensureGraphNode(nodes, a.row, a.col);
          const nodeB = ensureGraphNode(nodes, b.row, b.col);
          appendNeighbor(nodeA, nodeB);
          appendNeighbor(nodeB, nodeA);
          edges[key] = {
            key,
            from: cloneNode(a),
            to: cloneNode(b),
            isRoad,
          };
          continue;
        }

        if (isRoad) {
          edges[key].isRoad = true;
        }
      }
    }
  }

  return { nodes, edges };
}

export function hasResidentEdge(graph, from, to) {
  if (!from || !to) {
    return false;
  }
  return Boolean(graph?.edges?.[edgeKey(from, to)]);
}

export function hasRoadEdge(graph, from, to) {
  if (!from || !to) {
    return false;
  }
  return Boolean(graph?.edges?.[edgeKey(from, to)]?.isRoad);
}

function randomChoice(items, rng = Math.random) {
  if (!items.length) {
    return null;
  }
  const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[index];
}

function pickNextNeighbor(graph, currentNode, previousNode, rng = Math.random) {
  const neighbors = graph?.nodes?.[nodeKey(currentNode.row, currentNode.col)]?.neighbors || [];
  if (neighbors.length === 0) {
    return null;
  }

  const forwardOptions = previousNode
    ? neighbors.filter((neighbor) => !sameNode(neighbor, previousNode))
    : neighbors;

  return cloneNode(randomChoice(forwardOptions.length > 0 ? forwardOptions : neighbors, rng));
}

function residentSpawnEdge(grid, row, col, rng = Math.random) {
  const cell = grid[row]?.[col];
  if (!cell?.elementType) {
    return null;
  }

  const roadEdges = [];
  const fallbackEdges = [];

  for (const dir of ['N', 'E', 'S', 'W']) {
    const edge = roadNodesForDirection(row, col, dir);
    fallbackEdges.push(edge);
    if (cell.roads?.[dir]) {
      roadEdges.push(edge);
    }
  }

  return randomChoice(roadEdges.length > 0 ? roadEdges : fallbackEdges, rng);
}

function residentHomeKey(resident) {
  return resident?.homeCell ? `${resident.homeCell.row},${resident.homeCell.col}` : '';
}

function createResident(residentId, row, col, edgeNodes, rng = Math.random) {
  const [a, b] = edgeNodes;
  const moveTowardB = rng() < 0.5;
  return {
    id: residentId,
    homeCell: { row, col },
    from: moveTowardB ? cloneNode(a) : cloneNode(b),
    to: moveTowardB ? cloneNode(b) : cloneNode(a),
    progress: 0.5,
    walkDistance: rng() * RESIDENT_WALK_BOB_DISTANCE,
    facing: moveTowardB ? 1 : -1,
  };
}

export function syncResidentGraph(state) {
  state.roadGraph = buildRoadGraph(state.grid);
  state.residents = (state.residents || []).filter((resident) =>
    hasResidentEdge(state.roadGraph, resident.from, resident.to)
  );
}

export function spawnResidentsForHouseCells(state, cells, rng = Math.random) {
  const existingHomes = new Set((state.residents || []).map((resident) => residentHomeKey(resident)));
  state.residents = state.residents || [];

  for (const [row, col] of cells) {
    const cell = state.grid[row]?.[col];
    if (cell?.elementType !== 'house') {
      continue;
    }

    const homeKey = `${row},${col}`;
    if (existingHomes.has(homeKey)) {
      continue;
    }

    const edgeNodes = residentSpawnEdge(state.grid, row, col, rng);
    if (!edgeNodes) {
      continue;
    }

    state.residents.push(createResident(state.nextResidentId || 1, row, col, edgeNodes, rng));
    state.nextResidentId = (state.nextResidentId || 1) + 1;
    existingHomes.add(homeKey);
  }
}

export function bootstrapResidentsFromGrid(state, rng = Math.random) {
  const houseCells = [];
  for (let row = 0; row < state.grid.length; row += 1) {
    for (let col = 0; col < state.grid[row].length; col += 1) {
      if (state.grid[row][col].elementType === 'house') {
        houseCells.push([row, col]);
      }
    }
  }

  spawnResidentsForHouseCells(state, houseCells, rng);
}

function vertexPosition(vertices, node) {
  return vertices[node.row]?.[node.col] || null;
}

function facingFromNodes(vertices, from, to, fallbackFacing = 1) {
  const a = vertexPosition(vertices, from);
  const b = vertexPosition(vertices, to);
  if (a && b) {
    const dx = b.x - a.x;
    if (Math.abs(dx) > 0.001) {
      return dx < 0 ? -1 : 1;
    }
  }

  if (from && to && from.col !== to.col) {
    return to.col < from.col ? -1 : 1;
  }

  return fallbackFacing === -1 ? -1 : 1;
}

function edgeLength(vertices, from, to) {
  const a = vertexPosition(vertices, from);
  const b = vertexPosition(vertices, to);
  if (!a || !b) {
    return 0;
  }
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function currentEdgeSpeed(graph, resident) {
  return hasRoadEdge(graph, resident.from, resident.to) ? RESIDENT_ROAD_SPEED : RESIDENT_EDGE_SPEED;
}

function touchedCellsForEdge(grid, from, to) {
  if (!from || !to) {
    return [];
  }

  if (from.row === to.row && Math.abs(from.col - to.col) === 1) {
    const row = from.row;
    const col = Math.min(from.col, to.col);
    return [
      { row: row - 1, col },
      { row, col },
    ]
      .map(({ row: cellRow, col: cellCol }) => ({
        row: cellRow,
        col: cellCol,
        cell: grid[cellRow]?.[cellCol] || null,
      }))
      .filter(({ cell }) => Boolean(cell?.elementType));
  }

  if (from.col === to.col && Math.abs(from.row - to.row) === 1) {
    const row = Math.min(from.row, to.row);
    const col = from.col;
    return [
      { row, col: col - 1 },
      { row, col },
    ]
      .map(({ row: cellRow, col: cellCol }) => ({
        row: cellRow,
        col: cellCol,
        cell: grid[cellRow]?.[cellCol] || null,
      }))
      .filter(({ cell }) => Boolean(cell?.elementType));
  }

  return [];
}

function midpointPosition(vertices, from, to) {
  const a = vertexPosition(vertices, from);
  const b = vertexPosition(vertices, to);
  if (!a || !b) {
    return null;
  }

  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
  };
}

function ensureScoreState(state) {
  if (!state.scoreTotals) {
    state.scoreTotals = Object.fromEntries(SCORING_GROUP_IDS.map((groupId) => [groupId, 0]));
  }
  if (!Array.isArray(state.scorePopups)) {
    state.scorePopups = [];
  }
  if (!Number.isFinite(state.scoreTotalsVersion)) {
    state.scoreTotalsVersion = 0;
  }
}

function ensureClusterIndex(state) {
  if (!state.clusterIndex) {
    state.clusterIndex = buildClusterIndex(state.grid, {
      getCellTypes: getClusterCellTypes,
      matchWildType: matchShopClusterWildType,
    });
  }
  return state.clusterIndex;
}

function scoringAmountForCell(state, row, col, cell) {
  const groupId = getElementScoringGroupId(cell.elementType);
  if (!groupId) {
    return null;
  }

  const clusterIndex = ensureClusterIndex(state);
  const membership = getClusterMembership(clusterIndex, row, col, groupId);
  return {
    groupId,
    amount: membership?.size ?? 1,
  };
}

function awardEdgeMidpointPoints(state, resident, from, to, now = performance.now()) {
  const touchedCells = touchedCellsForEdge(state.grid, from, to);
  if (touchedCells.length === 0) {
    return;
  }

  const additions = {};
  for (const { row, col, cell } of touchedCells) {
    const scoring = scoringAmountForCell(state, row, col, cell);
    if (!scoring) {
      continue;
    }
    additions[scoring.groupId] = (additions[scoring.groupId] || 0) + scoring.amount;
  }

  const awardedGroups = Object.entries(additions);
  if (awardedGroups.length === 0) {
    return;
  }

  ensureScoreState(state);
  const anchor = midpointPosition(state.vertices, from, to);
  let popupIndex = 0;

  for (const [groupId, amount] of awardedGroups) {
    state.scoreTotals[groupId] = (state.scoreTotals[groupId] || 0) + amount;
    if (anchor) {
      state.scorePopups.push({
        id: `score-${resident.id}-${groupId}-${now}-${popupIndex}`,
        groupId,
        amount,
        x: anchor.x,
        y: anchor.y,
        startTime: now + popupIndex * 70,
        duration: 900,
      });
    }
    popupIndex += 1;
  }

  state.scoreTotalsVersion += 1;
}

export function updateResidents(state, deltaSeconds, rng = Math.random) {
  if (!deltaSeconds || deltaSeconds <= 0 || !state.residents?.length) {
    return;
  }

  const graph = state.roadGraph || buildRoadGraph(state.grid);
  state.roadGraph = graph;

  for (const resident of state.residents) {
    if (!hasResidentEdge(graph, resident.from, resident.to)) {
      continue;
    }

    resident.facing = facingFromNodes(state.vertices, resident.from, resident.to, resident.facing);
    let distanceRemaining = deltaSeconds * currentEdgeSpeed(graph, resident);
    const now = performance.now();

    while (distanceRemaining > 0.0001) {
      const startProgress = resident.progress;
      const edgeStart = cloneNode(resident.from);
      const edgeEnd = cloneNode(resident.to);
      const length = edgeLength(state.vertices, resident.from, resident.to);
      if (length <= 0.0001) {
        break;
      }

      const distanceToEnd = length * (1 - resident.progress);
      if (distanceRemaining < distanceToEnd) {
        resident.progress += distanceRemaining / length;
        resident.walkDistance += distanceRemaining;
        if (startProgress < 0.5 && resident.progress >= 0.5) {
          awardEdgeMidpointPoints(state, resident, edgeStart, edgeEnd, now);
        }
        distanceRemaining = 0;
        break;
      }

      resident.progress = 1;
      resident.walkDistance += distanceToEnd;
      distanceRemaining -= distanceToEnd;
      if (startProgress < 0.5) {
        awardEdgeMidpointPoints(state, resident, edgeStart, edgeEnd, now);
      }

      const previousNode = cloneNode(resident.from);
      const currentNode = cloneNode(resident.to);
      const nextNode = pickNextNeighbor(graph, currentNode, previousNode, rng);
      if (!nextNode) {
        resident.from = previousNode;
        resident.to = currentNode;
        resident.progress = 1;
        resident.facing = facingFromNodes(
          state.vertices,
          previousNode,
          currentNode,
          resident.facing
        );
        break;
      }

      resident.from = currentNode;
      resident.to = nextNode;
      resident.progress = 0;
      resident.facing = facingFromNodes(
        state.vertices,
        currentNode,
        nextNode,
        resident.facing
      );
    }
  }
}

export function residentWorldPosition(resident, vertices) {
  const from = vertexPosition(vertices, resident.from);
  const to = vertexPosition(vertices, resident.to);
  if (!from || !to) {
    return null;
  }

  return {
    x: from.x + (to.x - from.x) * resident.progress,
    y: from.y + (to.y - from.y) * resident.progress,
  };
}

export function residentScaleY(resident) {
  const amplitude = Math.max(0, Math.min(0.45, RESIDENT_WALK_SCALE_Y_AMPLITUDE));
  if (amplitude === 0) {
    return 1;
  }

  const cycleDistance = Math.max(1, RESIDENT_WALK_BOB_DISTANCE);
  const phase = ((resident.walkDistance || 0) % cycleDistance) / cycleDistance;
  const wave = (Math.sin(phase * Math.PI * 2) + 1) * 0.5;
  const eased = easeInOutSine(wave);
  return 1 - amplitude * 0.5 + amplitude * eased;
}

export function serializeResidents(residents) {
  return (residents || []).map((resident) => ({
    id: resident.id,
    homeCell: resident.homeCell ? { ...resident.homeCell } : null,
    from: resident.from ? { ...resident.from } : null,
    to: resident.to ? { ...resident.to } : null,
    progress: resident.progress,
    walkDistance: resident.walkDistance || 0,
    facing: resident.facing || 1,
  }));
}

export function deserializeResidents(serializedResidents) {
  return (serializedResidents || [])
    .filter((resident) => resident?.from && resident?.to && resident?.homeCell)
    .map((resident) => ({
      id: resident.id,
      homeCell: { ...resident.homeCell },
      from: { ...resident.from },
      to: { ...resident.to },
      progress: Math.max(0, Math.min(1, Number(resident.progress) || 0)),
      walkDistance: Math.max(0, Number(resident.walkDistance) || 0),
      facing: resident.facing === -1 ? -1 : 1,
    }));
}
