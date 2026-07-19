import assert from 'node:assert/strict';
import { createCellGrid, createVertexGrid } from '../src/grid.js';
import {
  buildRoadGraph,
  hasRoadEdge,
  residentWorldPosition,
  spawnResidentsForHouseCells,
  syncResidentGraph,
  updateResidents,
} from '../src/residents.js';

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

function createResidentState(size = 6) {
  return {
    grid: createCellGrid(size),
    vertices: createVertexGrid(size, 32, 0, () => 0.5),
    residents: [],
    nextResidentId: 1,
  };
}

test('buildRoadGraph includes all occupied-cell edges and deduplicates shared ones', () => {
  const state = createResidentState();
  state.grid[2][2] = {
    elementType: 'house',
    elementVariant: null,
    pieceId: 1,
    roads: { N: false, E: true, S: false, W: false },
  };
  state.grid[2][3] = {
    elementType: 'park',
    elementVariant: null,
    pieceId: 1,
    roads: { N: false, E: false, S: false, W: true },
  };

  const graph = buildRoadGraph(state.grid);
  assert.equal(Object.keys(graph.edges).length, 7);
  assert.equal(hasRoadEdge(graph, { row: 2, col: 3 }, { row: 3, col: 3 }), true);
});

test('buildRoadGraph keeps non-road edges walkable but slower', () => {
  const state = createResidentState();
  state.grid[1][1] = {
    elementType: 'house',
    elementVariant: null,
    pieceId: 1,
    roads: { N: false, E: false, S: false, W: false },
  };

  const graph = buildRoadGraph(state.grid);
  assert.equal(Object.keys(graph.edges).length, 4);
  assert.equal(hasRoadEdge(graph, { row: 1, col: 1 }, { row: 1, col: 2 }), false);
});

test('spawnResidentsForHouseCells creates one resident per eligible house cell', () => {
  const state = createResidentState();
  state.grid[1][1] = {
    elementType: 'house',
    elementVariant: null,
    pieceId: 1,
    roads: { N: true, E: false, S: false, W: false },
  };
  syncResidentGraph(state);

  spawnResidentsForHouseCells(state, [[1, 1]], () => 0.25);
  spawnResidentsForHouseCells(state, [[1, 1]], () => 0.25);

  assert.equal(state.residents.length, 1);
  assert.equal(state.residents[0].homeCell.row, 1);
  assert.equal(state.residents[0].homeCell.col, 1);
});

test('spawnResidentsForHouseCells can use a non-road edge when the house has no roads', () => {
  const state = createResidentState();
  state.grid[1][1] = {
    elementType: 'house',
    elementVariant: null,
    pieceId: 1,
    roads: { N: false, E: false, S: false, W: false },
  };
  syncResidentGraph(state);

  spawnResidentsForHouseCells(state, [[1, 1]], () => 0.25);

  assert.equal(state.residents.length, 1);
  assert.deepEqual(state.residents[0].homeCell, { row: 1, col: 1 });
});

test('updateResidents chooses a new branch without immediately backtracking when alternatives exist', () => {
  const state = createResidentState();
  state.grid[1][1] = {
    elementType: 'park',
    elementVariant: null,
    pieceId: 1,
    roads: { N: false, E: true, S: false, W: false },
  };
  state.grid[1][2] = {
    elementType: 'house',
    elementVariant: null,
    pieceId: 1,
    roads: { N: false, E: true, S: true, W: true },
  };
  state.grid[1][3] = {
    elementType: 'park',
    elementVariant: null,
    pieceId: 1,
    roads: { N: false, E: false, S: false, W: true },
  };
  state.grid[2][2] = {
    elementType: 'park',
    elementVariant: null,
    pieceId: 1,
    roads: { N: true, E: false, S: false, W: false },
  };

  syncResidentGraph(state);
  state.residents.push({
    id: 1,
    homeCell: { row: 1, col: 2 },
    from: { row: 1, col: 2 },
    to: { row: 2, col: 2 },
    progress: 0.99,
    walkDistance: 0,
    facing: 1,
  });

  updateResidents(state, 1, () => 0.75);

  assert.deepEqual(state.residents[0].from, { row: 2, col: 2 });
  assert.notDeepEqual(state.residents[0].to, { row: 1, col: 2 });
});

test('residentWorldPosition interpolates along the active road edge', () => {
  const state = createResidentState();
  const position = residentWorldPosition(
    {
      from: { row: 2, col: 2 },
      to: { row: 2, col: 3 },
      progress: 0.5,
    },
    state.vertices
  );

  assert.equal(position.x, 80);
  assert.equal(position.y, 64);
});

test('updateResidents flips facing on near-vertical edges that drift left or right', () => {
  const state = createResidentState();
  state.grid[1][1] = {
    elementType: 'house',
    elementVariant: null,
    pieceId: 1,
    roads: { N: false, E: false, S: false, W: false },
  };
  state.vertices[1][1] = { x: 40, y: 32 };
  state.vertices[2][1] = { x: 34, y: 64 };
  syncResidentGraph(state);

  state.residents.push({
    id: 1,
    homeCell: { row: 1, col: 1 },
    from: { row: 1, col: 1 },
    to: { row: 2, col: 1 },
    progress: 0.99,
    walkDistance: 0,
    facing: 1,
  });

  updateResidents(state, 0.005, () => 0.1);

  assert.equal(state.residents[0].facing, -1);
});

test('updateResidents awards points for scoring blocks touching the crossed edge midpoint', () => {
  const state = createResidentState();
  state.scoreTotals = {
    Bread: 0,
    Crystal: 0,
    Iron: 0,
    Meat: 0,
    Plant: 0,
    Potion: 0,
  };
  state.scoreTotalsVersion = 0;
  state.scorePopups = [];
  state.grid[1][1] = {
    elementType: 'Shop_DracoBell',
    elementVariant: null,
    pieceId: 1,
    roads: { N: true, E: false, S: false, W: false },
  };
  state.grid[0][1] = {
    elementType: 'Shop_DrakeOfCakes',
    elementVariant: null,
    pieceId: 2,
    roads: { N: false, E: false, S: true, W: false },
  };
  syncResidentGraph(state);
  state.residents.push({
    id: 1,
    homeCell: { row: 1, col: 1 },
    from: { row: 1, col: 1 },
    to: { row: 1, col: 2 },
    progress: 0.4,
    walkDistance: 0,
    facing: 1,
  });

  updateResidents(state, 0.5, () => 0.1);

  assert.equal(state.scoreTotals.Meat, 1);
  assert.equal(state.scoreTotals.Bread, 1);
  assert.equal(state.scoreTotalsVersion, 1);
  assert.equal(state.scorePopups.length, 2);
});

test('updateResidents awards a concrete shop by the full size of its cluster', () => {
  const state = createResidentState();
  state.scoreTotals = {
    Bread: 0,
    Crystal: 0,
    Iron: 0,
    Meat: 0,
    Plant: 0,
    Potion: 0,
  };
  state.scoreTotalsVersion = 0;
  state.scorePopups = [];
  state.grid[1][1] = {
    elementType: 'Shop_CriticalRolls',
    elementVariant: null,
    pieceId: 1,
    roads: { N: true, E: false, S: false, W: false },
  };
  state.grid[1][2] = {
    elementType: 'Shop_BizarreBazaar',
    elementVariant: null,
    pieceId: 2,
    roads: { N: false, E: false, S: false, W: false },
  };
  state.grid[1][3] = {
    elementType: 'Shop_DrakeOfCakes',
    elementVariant: null,
    pieceId: 3,
    roads: { N: false, E: false, S: false, W: false },
  };
  syncResidentGraph(state);
  state.residents.push({
    id: 1,
    homeCell: { row: 1, col: 1 },
    from: { row: 1, col: 1 },
    to: { row: 1, col: 2 },
    progress: 0.4,
    walkDistance: 0,
    facing: 1,
  });

  updateResidents(state, 0.5, () => 0.1);

  assert.equal(state.scoreTotals.Bread, 3);
  assert.equal(state.scoreTotalsVersion, 1);
  assert.equal(state.scorePopups.length, 1);
  assert.equal(state.scorePopups[0].amount, 3);
});

test('updateResidents aggregates duplicate scoring types from both sides of one edge', () => {
  const state = createResidentState();
  state.scoreTotals = {
    Bread: 0,
    Crystal: 0,
    Iron: 0,
    Meat: 0,
    Plant: 0,
    Potion: 0,
  };
  state.scoreTotalsVersion = 0;
  state.scorePopups = [];
  state.grid[1][1] = {
    elementType: 'Shop_DracoBell',
    elementVariant: null,
    pieceId: 1,
    roads: { N: true, E: false, S: false, W: false },
  };
  state.grid[0][1] = {
    elementType: 'Shop_FogoDeChar',
    elementVariant: null,
    pieceId: 2,
    roads: { N: false, E: false, S: true, W: false },
  };
  syncResidentGraph(state);
  state.residents.push({
    id: 1,
    homeCell: { row: 1, col: 1 },
    from: { row: 1, col: 1 },
    to: { row: 1, col: 2 },
    progress: 0.49,
    walkDistance: 0,
    facing: 1,
  });

  updateResidents(state, 0.5, () => 0.1);

  assert.equal(state.scoreTotals.Meat, 4);
  assert.equal(state.scorePopups.length, 1);
  assert.equal(state.scorePopups[0].amount, 4);
});
