# Flametown Tetromino Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable HTML/JS/canvas prototype of the Flamecraft tetromino city builder core loop (draw piece → rotate → place → repeat) on an organic jittered grid, with placeholder emoji graphics that upgrade automatically to real images as they're added.

**Architecture:** Vanilla JS, no bundler, native ES modules (`<script type="module">`), single full-window `<canvas>` rendered via `requestAnimationFrame` with viewport culling. Pure game-logic modules (grid math, tetromino shapes/rotation, placement legality, roads, element weighting, persistence serialization) are unit-tested with Node's built-in `node:assert` (no test framework, no npm install) since they have no DOM dependency. Rendering/input/UI are verified manually in the browser.

**Tech Stack:** HTML5 Canvas 2D, vanilla JavaScript (ES2020+ modules), `node:assert/strict` for logic tests (Node ships this — zero dependencies), Python's built-in `http.server` to preview locally (avoids ES module CORS restrictions over `file://`).

## Global Constraints

- No build step, no bundler, no npm dependencies — vanilla JS + native ES modules only (spec §3).
- Grid is always square, size N×N, default N=256, chosen at "New Game" time, clamped to 16–512 (spec §2, §8).
- Grid vertex jitter defaults to 20% of cell size (`JITTER_AMOUNT = 0.2`), a constant in `config.js`, changed by hand-editing + reload — no live UI slider (spec §4, decision log).
- Desktop-only input: mouse + keyboard. No touch/mobile support in this prototype (spec §2, decision log).
- Game logic (adjacency, occupancy, road matching) always operates on regular `(row, col)` grid indices. Vertex jitter is a rendering-only transform and must never affect legality/adjacency (spec §4).
- All 7 classic tetromino shapes (I, O, T, S, Z, J, L) are available from the start (spec §6).
- One random piece at a time, no preview queue (spec §6).
- Placement legality: first piece placed anywhere; every subsequent piece must have at least one cell edge-adjacent to an already-placed cell (spec §6).
- Roads on an edge that touches an already-placed neighbor must mirror that neighbor's road state; all other edges (including edges internal to the piece being placed) are randomized independently at `ROAD_RANDOM_CHANCE` (spec §6).
- Element type assignment is per-field, independent, weighted by `elementCatalog.js` entries with a configurable `maxCount` cap per type (spec §6).
- Asset variants are discovered by naming convention `assets/tiles/<typeId>_<n>.png` (`n` starting at 1) via sequential probing, not a manifest file. Missing images fall back to the type's emoji (spec §7).
- State (grid, vertices, element counts, camera, grid size) persists to `localStorage` under key `flametown-save-v1`. "New Game" clears it (with a confirm dialog) and regenerates a fresh world at the size chosen in the grid-size input (spec §8).
- No exceptions/crashes on bad input: invalid saved data, invalid grid-size input, and exhausted element-type caps must all degrade gracefully, never throw to the user (spec §9).

---

### Task 1: Project scaffold

**Files:**
- Create: `Flametown/prototype/index.html`
- Create: `Flametown/prototype/package.json`
- Create: `Flametown/prototype/config.js`
- Create: `Flametown/prototype/src/main.js`

**Interfaces:**
- Produces: `config.js` exports `DEFAULT_GRID_SIZE`, `GRID_SIZE_MIN`, `GRID_SIZE_MAX`, `CELL_SIZE`, `JITTER_AMOUNT`, `MAX_ASSET_VARIANTS`, `ROAD_RANDOM_CHANCE`, `SAVE_KEY`, `ZOOM_MIN`, `ZOOM_MAX`, `CAMERA_PAN_SPEED` — every later task imports from this file.

- [x] **Step 1: Create the config file**

`Flametown/prototype/config.js`:
```js
export const DEFAULT_GRID_SIZE = 256;
export const GRID_SIZE_MIN = 16;
export const GRID_SIZE_MAX = 512;
export const CELL_SIZE = 32;
export const JITTER_AMOUNT = 0.2;
export const MAX_ASSET_VARIANTS = 20;
export const ROAD_RANDOM_CHANCE = 0.5;
export const SAVE_KEY = 'flametown-save-v1';
export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 3.0;
export const CAMERA_PAN_SPEED = 600;
```

- [x] **Step 2: Create package.json (ESM marker for Node test runs, no dependencies)**

`Flametown/prototype/package.json`:
```json
{
  "name": "flametown-prototype",
  "private": true,
  "type": "module"
}
```

- [x] **Step 3: Create index.html**

`Flametown/prototype/index.html`:
```html
<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <title>Flametown Prototype</title>
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; background: #1b1b1f; }
    canvas { display: block; }
    #ui-panel {
      position: fixed;
      top: 12px;
      right: 12px;
      background: rgba(20, 20, 24, 0.85);
      color: #f0f0f0;
      font-family: sans-serif;
      padding: 12px;
      border-radius: 8px;
      min-width: 190px;
    }
    #ui-panel button { cursor: pointer; }
  </style>
</head>
<body>
  <canvas id="game-canvas"></canvas>
  <div id="ui-panel"></div>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [x] **Step 4: Create minimal main.js (resizing canvas + render loop)**

`Flametown/prototype/src/main.js`:
```js
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

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

function frame() {
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- [x] **Step 5: Verify in the browser**

Run: `cd Flametown/prototype && python3 -m http.server 8000`
Open: `http://localhost:8000`
Expected: full-window dark gray canvas that stays full-window when you resize the browser window. No console errors.

- [ ] **Step 6: Commit**

```bash
git add Flametown/prototype/
git commit -m "feat: scaffold Flametown prototype (canvas shell, config)"
```

---

### Task 2: Grid math (logical cells + jittered vertices)

**Files:**
- Create: `Flametown/prototype/src/grid.js`
- Test: `Flametown/prototype/tests/grid.test.js`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces: `DIRS` (`['N','E','S','W']`), `oppositeDir(dir)`, `neighborCoord(row,col,dir)`, `inBounds(size,row,col)`, `createCellGrid(size)`, `createVertexGrid(size, cellSize, jitterAmount, rng)`, `cellQuad(vertexGrid,row,col)`, `quadCentroid(quad)`. Cell shape: `{ elementType: string|null, elementVariant: number|null, pieceId: number|null, roads: {N,E,S,W: boolean} }`. These are consumed by `pieces.js`, `roads.js`, `camera.js`, `render.js`, `state.js` in later tasks.

- [x] **Step 1: Write the failing test**

`Flametown/prototype/tests/grid.test.js`:
```js
import assert from 'node:assert/strict';
import {
  oppositeDir,
  neighborCoord,
  inBounds,
  createCellGrid,
  createVertexGrid,
  cellQuad,
  quadCentroid,
} from '../src/grid.js';

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('oppositeDir returns the correct opposite for each direction', () => {
  assert.equal(oppositeDir('N'), 'S');
  assert.equal(oppositeDir('S'), 'N');
  assert.equal(oppositeDir('E'), 'W');
  assert.equal(oppositeDir('W'), 'E');
});

test('neighborCoord offsets row/col correctly', () => {
  assert.deepEqual(neighborCoord(5, 5, 'N'), { row: 4, col: 5 });
  assert.deepEqual(neighborCoord(5, 5, 'S'), { row: 6, col: 5 });
  assert.deepEqual(neighborCoord(5, 5, 'E'), { row: 5, col: 6 });
  assert.deepEqual(neighborCoord(5, 5, 'W'), { row: 5, col: 4 });
});

test('inBounds respects grid size', () => {
  assert.equal(inBounds(10, 0, 0), true);
  assert.equal(inBounds(10, 9, 9), true);
  assert.equal(inBounds(10, 10, 0), false);
  assert.equal(inBounds(10, -1, 0), false);
});

test('createCellGrid produces size x size grid of empty cells', () => {
  const grid = createCellGrid(4);
  assert.equal(grid.length, 4);
  assert.equal(grid[0].length, 4);
  assert.deepEqual(grid[2][3], {
    elementType: null,
    elementVariant: null,
    pieceId: null,
    roads: { N: false, E: false, S: false, W: false },
  });
});

test('createVertexGrid places vertices at base positions when rng is centered', () => {
  const verts = createVertexGrid(4, 32, 0.2, () => 0.5); // rng=0.5 -> zero offset
  assert.equal(verts.length, 5);
  assert.equal(verts[0].length, 5);
  assert.deepEqual(verts[2][3], { x: 3 * 32, y: 2 * 32 });
});

test('createVertexGrid clamps boundary vertices inward with exact offsets', () => {
  const cellSize = 32;
  const jitterAmount = 0.2;
  const size = 4;
  const maxOffset = cellSize * jitterAmount;
  const verts = createVertexGrid(size, cellSize, jitterAmount, () => 1);
  assert.deepEqual(verts[0][0], { x: maxOffset, y: maxOffset });
  assert.deepEqual(verts[0][size], { x: size * cellSize - maxOffset, y: maxOffset });
  assert.deepEqual(verts[size][0], { x: maxOffset, y: size * cellSize - maxOffset });
  assert.deepEqual(verts[size][size], { x: size * cellSize - maxOffset, y: size * cellSize - maxOffset });
});

test('cellQuad returns the 4 corners shared with neighboring cells', () => {
  const verts = createVertexGrid(4, 32, 0.2, () => 0.5);
  const quad = cellQuad(verts, 1, 1);
  assert.deepEqual(quad[0], verts[1][1]);
  assert.deepEqual(quad[1], verts[1][2]);
  assert.deepEqual(quad[2], verts[2][2]);
  assert.deepEqual(quad[3], verts[2][1]);
});

test('quadCentroid averages the 4 corners', () => {
  const quad = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  assert.deepEqual(quadCentroid(quad), { x: 5, y: 5 });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/grid.test.js` (from `Flametown/prototype/`)
Expected: `Cannot find module '../src/grid.js'` error.

- [x] **Step 3: Write the implementation**

`Flametown/prototype/src/grid.js`:
```js
export const DIRS = ['N', 'E', 'S', 'W'];

export function oppositeDir(dir) {
  switch (dir) {
    case 'N': return 'S';
    case 'S': return 'N';
    case 'E': return 'W';
    case 'W': return 'E';
    default: throw new Error(`Unknown direction: ${dir}`);
  }
}

export function neighborCoord(row, col, dir) {
  switch (dir) {
    case 'N': return { row: row - 1, col };
    case 'S': return { row: row + 1, col };
    case 'E': return { row, col: col + 1 };
    case 'W': return { row, col: col - 1 };
    default: throw new Error(`Unknown direction: ${dir}`);
  }
}

export function inBounds(size, row, col) {
  return row >= 0 && row < size && col >= 0 && col < size;
}

export function createCellGrid(size) {
  const cells = new Array(size);
  for (let row = 0; row < size; row++) {
    cells[row] = new Array(size);
    for (let col = 0; col < size; col++) {
      cells[row][col] = {
        elementType: null,
        elementVariant: null,
        pieceId: null,
        roads: { N: false, E: false, S: false, W: false },
      };
    }
  }
  return cells;
}

export function createVertexGrid(size, cellSize, jitterAmount, rng = Math.random) {
  const verts = new Array(size + 1);
  const maxOffset = cellSize * jitterAmount;
  for (let row = 0; row <= size; row++) {
    verts[row] = new Array(size + 1);
    for (let col = 0; col <= size; col++) {
      const baseX = col * cellSize;
      const baseY = row * cellSize;
      let dx = (rng() * 2 - 1) * maxOffset;
      let dy = (rng() * 2 - 1) * maxOffset;
      // Clamp boundary vertices inward so the world edge stays rectangular.
      if (row === 0) dy = Math.abs(dy);
      if (row === size) dy = -Math.abs(dy);
      if (col === 0) dx = Math.abs(dx);
      if (col === size) dx = -Math.abs(dx);
      verts[row][col] = { x: baseX + dx, y: baseY + dy };
    }
  }
  return verts;
}

export function cellQuad(vertexGrid, row, col) {
  return [
    vertexGrid[row][col],
    vertexGrid[row][col + 1],
    vertexGrid[row + 1][col + 1],
    vertexGrid[row + 1][col],
  ];
}

export function quadCentroid(quad) {
  const x = (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4;
  const y = (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4;
  return { x, y };
}

export function worldToCell(worldX, worldY, cellSize) {
  return { row: Math.floor(worldY / cellSize), col: Math.floor(worldX / cellSize) };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/grid.test.js`
Expected: 7 `PASS:` lines, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add Flametown/prototype/src/grid.js Flametown/prototype/tests/grid.test.js
git commit -m "feat: add grid math (cells, jittered vertices, quads)"
```

---

### Task 3: Camera math (pan, zoom, coordinate transforms)

**Files:**
- Create: `Flametown/prototype/src/camera.js`
- Test: `Flametown/prototype/tests/camera.test.js`

**Interfaces:**
- Consumes: `CELL_SIZE, ZOOM_MIN, ZOOM_MAX` from `config.js`.
- Produces: `createCamera(gridSize, viewportWidth, viewportHeight)`, `clampZoom(zoom)`, `worldToScreen(camera, vw, vh, worldX, worldY)`, `screenToWorld(camera, vw, vh, screenX, screenY)`, `panCamera(camera, dxScreen, dyScreen)`, `panCameraWorld(camera, dxWorld, dyWorld)`, `zoomCamera(camera, factor)`, `visibleCellRange(camera, vw, vh, gridSize)`. Camera shape: `{ x, y, zoom }`. Consumed by `render.js`, `input.js`, `main.js`.

- [x] **Step 1: Write the failing test**

`Flametown/prototype/tests/camera.test.js`:
```js
import assert from 'node:assert/strict';
import {
  createCamera,
  clampZoom,
  worldToScreen,
  screenToWorld,
  panCamera,
  panCameraWorld,
  zoomCamera,
  visibleCellRange,
} from '../src/camera.js';

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('createCamera centers on the middle of the world', () => {
  const camera = createCamera(256, 800, 600);
  assert.equal(camera.x, (256 * 32) / 2);
  assert.equal(camera.y, (256 * 32) / 2);
  assert.ok(camera.zoom > 0);
});

test('clampZoom respects min/max bounds', () => {
  assert.equal(clampZoom(0.01), 0.3);
  assert.equal(clampZoom(100), 3.0);
  assert.equal(clampZoom(1), 1);
});

test('worldToScreen and screenToWorld are inverses', () => {
  const camera = { x: 500, y: 300, zoom: 2 };
  const world = { x: 640, y: 410 };
  const screen = worldToScreen(camera, 800, 600, world.x, world.y);
  const back = screenToWorld(camera, 800, 600, screen.x, screen.y);
  assert.ok(Math.abs(back.x - world.x) < 1e-9);
  assert.ok(Math.abs(back.y - world.y) < 1e-9);
});

test('panCamera moves the camera opposite to a screen-space drag', () => {
  const camera = { x: 100, y: 100, zoom: 2 };
  panCamera(camera, 20, -10);
  assert.equal(camera.x, 100 - 20 / 2);
  assert.equal(camera.y, 100 - (-10) / 2);
});

test('panCameraWorld moves the camera directly in world units', () => {
  const camera = { x: 100, y: 100, zoom: 2 };
  panCameraWorld(camera, 15, -5);
  assert.equal(camera.x, 115);
  assert.equal(camera.y, 95);
});

test('zoomCamera multiplies and clamps', () => {
  const camera = { x: 0, y: 0, zoom: 2.9 };
  zoomCamera(camera, 1.5);
  assert.equal(camera.zoom, 3.0);
});

test('visibleCellRange stays within grid bounds', () => {
  const camera = { x: 0, y: 0, zoom: 1 };
  const range = visibleCellRange(camera, 800, 600, 10);
  assert.ok(range.minRow >= 0 && range.minCol >= 0);
  assert.ok(range.maxRow <= 9 && range.maxCol <= 9);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/camera.test.js`
Expected: `Cannot find module '../src/camera.js'` error.

- [x] **Step 3: Write the implementation**

`Flametown/prototype/src/camera.js`:
```js
import { CELL_SIZE, ZOOM_MIN, ZOOM_MAX } from '../config.js';

export function clampZoom(zoom) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

export function createCamera(gridSize, viewportWidth, viewportHeight) {
  const targetCellsWide = 15;
  const zoom = clampZoom(viewportWidth / (targetCellsWide * CELL_SIZE));
  const worldSize = gridSize * CELL_SIZE;
  return { x: worldSize / 2, y: worldSize / 2, zoom };
}

export function worldToScreen(camera, viewportWidth, viewportHeight, worldX, worldY) {
  return {
    x: (worldX - camera.x) * camera.zoom + viewportWidth / 2,
    y: (worldY - camera.y) * camera.zoom + viewportHeight / 2,
  };
}

export function screenToWorld(camera, viewportWidth, viewportHeight, screenX, screenY) {
  return {
    x: (screenX - viewportWidth / 2) / camera.zoom + camera.x,
    y: (screenY - viewportHeight / 2) / camera.zoom + camera.y,
  };
}

export function panCamera(camera, dxScreen, dyScreen) {
  camera.x -= dxScreen / camera.zoom;
  camera.y -= dyScreen / camera.zoom;
}

export function panCameraWorld(camera, dxWorld, dyWorld) {
  camera.x += dxWorld;
  camera.y += dyWorld;
}

export function zoomCamera(camera, factor) {
  camera.zoom = clampZoom(camera.zoom * factor);
}

export function visibleCellRange(camera, viewportWidth, viewportHeight, gridSize) {
  const topLeft = screenToWorld(camera, viewportWidth, viewportHeight, 0, 0);
  const bottomRight = screenToWorld(camera, viewportWidth, viewportHeight, viewportWidth, viewportHeight);
  const pad = 2; // extra cells to cover jitter overflow near viewport edges
  const minCol = Math.max(0, Math.floor(topLeft.x / CELL_SIZE) - pad);
  const minRow = Math.max(0, Math.floor(topLeft.y / CELL_SIZE) - pad);
  const maxCol = Math.min(gridSize - 1, Math.ceil(bottomRight.x / CELL_SIZE) + pad);
  const maxRow = Math.min(gridSize - 1, Math.ceil(bottomRight.y / CELL_SIZE) + pad);
  return { minRow, maxRow, minCol, maxCol };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/camera.test.js`
Expected: 7 `PASS:` lines, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add Flametown/prototype/src/camera.js Flametown/prototype/tests/camera.test.js
git commit -m "feat: add camera pan/zoom math"
```

---

### Task 4: World state + static grid rendering

**Files:**
- Create: `Flametown/prototype/src/state.js`
- Create: `Flametown/prototype/src/render.js`
- Modify: `Flametown/prototype/src/main.js` (replace entire contents)

**Interfaces:**
- Consumes: `createCellGrid, createVertexGrid, cellQuad` from `grid.js`; `createCamera, visibleCellRange, worldToScreen` from `camera.js`; `DEFAULT_GRID_SIZE, CELL_SIZE, JITTER_AMOUNT` from `config.js`.
- Produces: `state.js` exports `createNewWorld(gridSize, cellSize, jitterAmount, rng)` returning `{ gridSize, grid, vertices }`. `render.js` exports `renderGrid(ctx, state, viewportWidth, viewportHeight)`. Both are extended by later tasks — this task establishes their initial shape.

- [x] **Step 1: Create the initial state module**

`Flametown/prototype/src/state.js`:
```js
import { createCellGrid, createVertexGrid } from './grid.js';

export function createNewWorld(gridSize, cellSize, jitterAmount, rng = Math.random) {
  return {
    gridSize,
    grid: createCellGrid(gridSize),
    vertices: createVertexGrid(gridSize, cellSize, jitterAmount, rng),
  };
}
```

- [x] **Step 2: Create the render module**

`Flametown/prototype/src/render.js`:
```js
import { cellQuad } from './grid.js';
import { visibleCellRange, worldToScreen } from './camera.js';

export function renderGrid(ctx, state, viewportWidth, viewportHeight) {
  const { camera, vertices, gridSize } = state;
  const range = visibleCellRange(camera, viewportWidth, viewportHeight, gridSize);
  ctx.fillStyle = '#1b1b1f';
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);
  for (let row = range.minRow; row <= range.maxRow; row++) {
    for (let col = range.minCol; col <= range.maxCol; col++) {
      const quad = cellQuad(vertices, row, col);
      const screenQuad = quad.map((p) => worldToScreen(camera, viewportWidth, viewportHeight, p.x, p.y));
      ctx.beginPath();
      ctx.moveTo(screenQuad[0].x, screenQuad[0].y);
      for (let i = 1; i < screenQuad.length; i++) ctx.lineTo(screenQuad[i].x, screenQuad[i].y);
      ctx.closePath();
      ctx.fillStyle = '#2f4f2f';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}
```

- [x] **Step 3: Wire it into main.js**

`Flametown/prototype/src/main.js` (replace entire contents):
```js
import { DEFAULT_GRID_SIZE, CELL_SIZE, JITTER_AMOUNT } from '../config.js';
import { createNewWorld } from './state.js';
import { createCamera } from './camera.js';
import { renderGrid } from './render.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

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

const world = createNewWorld(DEFAULT_GRID_SIZE, CELL_SIZE, JITTER_AMOUNT);
const state = {
  ...world,
  camera: createCamera(world.gridSize, window.innerWidth, window.innerHeight),
};

function frame() {
  renderGrid(ctx, state, window.innerWidth, window.innerHeight);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- [x] **Step 4: Verify in the browser**

Run: `cd Flametown/prototype && python3 -m http.server 8000` (if not already running)
Open: `http://localhost:8000`
Expected: a dark green jittered grid fills the viewport — cell edges look slightly irregular/hand-drawn (not perfectly square), with no gaps between adjacent cells. No console errors.

- [ ] **Step 5: Commit**

```bash
git add Flametown/prototype/src/state.js Flametown/prototype/src/render.js Flametown/prototype/src/main.js
git commit -m "feat: render the static jittered grid"
```

---

### Task 5: Camera input (zoom, pan)

**Files:**
- Create: `Flametown/prototype/src/input.js`
- Modify: `Flametown/prototype/src/main.js` (replace entire contents)

**Interfaces:**
- Consumes: `zoomCamera, panCamera, panCameraWorld` from `camera.js`; `CAMERA_PAN_SPEED` from `config.js`.
- Produces: `createCameraInput(canvas, state)` returning `{ update(deltaSeconds) }`. Consumed by `main.js`.

- [x] **Step 1: Create the input module**

`Flametown/prototype/src/input.js`:
```js
import { zoomCamera, panCamera, panCameraWorld } from './camera.js';
import { CAMERA_PAN_SPEED } from '../config.js';

const PAN_KEYS = {
  KeyW: { dx: 0, dy: -1 }, ArrowUp: { dx: 0, dy: -1 },
  KeyS: { dx: 0, dy: 1 }, ArrowDown: { dx: 0, dy: 1 },
  KeyA: { dx: -1, dy: 0 }, ArrowLeft: { dx: -1, dy: 0 },
  KeyD: { dx: 1, dy: 0 }, ArrowRight: { dx: 1, dy: 0 },
};

export function createCameraInput(canvas, state) {
  const pressedKeys = new Set();
  let isMiddleDragging = false;
  let lastDragPos = { x: 0, y: 0 };

  window.addEventListener('keydown', (e) => {
    if (e.code in PAN_KEYS) pressedKeys.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    pressedKeys.delete(e.code);
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomCamera(state.camera, factor);
  }, { passive: false });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1) {
      isMiddleDragging = true;
      lastDragPos = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  });
  window.addEventListener('mousemove', (e) => {
    if (isMiddleDragging) {
      const dx = e.clientX - lastDragPos.x;
      const dy = e.clientY - lastDragPos.y;
      panCamera(state.camera, dx, dy);
      lastDragPos = { x: e.clientX, y: e.clientY };
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 1) isMiddleDragging = false;
  });

  return {
    update(deltaSeconds) {
      let dx = 0, dy = 0;
      for (const code of pressedKeys) {
        const dir = PAN_KEYS[code];
        dx += dir.dx;
        dy += dir.dy;
      }
      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy) || 1;
        const worldDx = (dx / length) * CAMERA_PAN_SPEED * deltaSeconds;
        const worldDy = (dy / length) * CAMERA_PAN_SPEED * deltaSeconds;
        panCameraWorld(state.camera, worldDx, worldDy);
      }
    },
  };
}
```

- [x] **Step 2: Wire it into main.js**

`Flametown/prototype/src/main.js` (replace entire contents):
```js
import { DEFAULT_GRID_SIZE, CELL_SIZE, JITTER_AMOUNT } from '../config.js';
import { createNewWorld } from './state.js';
import { createCamera } from './camera.js';
import { renderGrid } from './render.js';
import { createCameraInput } from './input.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

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

const world = createNewWorld(DEFAULT_GRID_SIZE, CELL_SIZE, JITTER_AMOUNT);
const state = {
  ...world,
  camera: createCamera(world.gridSize, window.innerWidth, window.innerHeight),
};

const cameraInput = createCameraInput(canvas, state);

let lastTime = performance.now();
function frame(now) {
  const deltaSeconds = (now - lastTime) / 1000;
  lastTime = now;
  cameraInput.update(deltaSeconds);
  renderGrid(ctx, state, window.innerWidth, window.innerHeight);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- [x] **Step 3: Verify in the browser**

Open: `http://localhost:8000`
Expected: scrolling zooms in/out smoothly (clamped, doesn't flip or invert); holding the middle mouse button and dragging pans the view; holding W/A/S/D or arrow keys pans continuously in that direction. No console errors.

- [ ] **Step 4: Commit**

```bash
git add Flametown/prototype/src/input.js Flametown/prototype/src/main.js
git commit -m "feat: add camera pan/zoom controls"
```

---

### Task 6: Tetromino shapes, rotation, and placement legality

**Files:**
- Create: `Flametown/prototype/src/pieces.js`
- Test: `Flametown/prototype/tests/pieces.test.js`

**Interfaces:**
- Consumes: `DIRS, neighborCoord, inBounds` from `grid.js`.
- Produces: `TETROMINO_IDS` (array of 7 shape ids: `I,O,T,S,Z,J,L`), `pieceCells(shapeId, rotation)`, `randomPieceId(rng)`, `absoluteCells(shapeId, rotation, anchorRow, anchorCol)`, `canPlacePiece(grid, gridSize, shapeId, rotation, anchorRow, anchorCol, isFirstPiece)`. Consumed by `state.js`, `roads.js` (via cells), `render.js`, `input.js`, `ui.js`.

- [x] **Step 1: Write the failing test**

`Flametown/prototype/tests/pieces.test.js`:
```js
import assert from 'node:assert/strict';
import { createCellGrid } from '../src/grid.js';
import {
  TETROMINO_IDS,
  pieceCells,
  randomPieceId,
  absoluteCells,
  canPlacePiece,
} from '../src/pieces.js';

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('all 7 classic tetromino shapes are defined', () => {
  assert.deepEqual([...TETROMINO_IDS].sort(), ['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
});

test('every shape has exactly 4 cells in every rotation state', () => {
  for (const id of TETROMINO_IDS) {
    for (let rotation = 0; rotation < 4; rotation++) {
      assert.equal(pieceCells(id, rotation).length, 4);
    }
  }
});

test('rotating 4 times returns to the original cell set', () => {
  for (const id of TETROMINO_IDS) {
    const base = pieceCells(id, 0);
    const afterFour = pieceCells(id, 4); // rotation index wraps via modulo inside pieceCells
    assert.deepEqual(afterFour, base);
  }
});

test('randomPieceId always returns a valid shape id', () => {
  assert.equal(randomPieceId(() => 0), TETROMINO_IDS[0]);
  assert.equal(randomPieceId(() => 0.999), TETROMINO_IDS[TETROMINO_IDS.length - 1]);
});

test('absoluteCells offsets shape cells by the anchor', () => {
  const cells = absoluteCells('O', 0, 5, 5);
  assert.deepEqual(cells.sort(), [[5, 5], [5, 6], [6, 5], [6, 6]].sort());
});

test('first piece can be placed anywhere in bounds', () => {
  const grid = createCellGrid(10);
  assert.equal(canPlacePiece(grid, 10, 'O', 0, 3, 3, true), true);
});

test('first piece cannot be placed out of bounds', () => {
  const grid = createCellGrid(10);
  assert.equal(canPlacePiece(grid, 10, 'O', 0, 9, 9, true), false);
});

test('non-first piece must touch an existing placed cell', () => {
  const grid = createCellGrid(10);
  grid[0][0].elementType = 'house';
  assert.equal(canPlacePiece(grid, 10, 'O', 0, 5, 5, false), false);
  assert.equal(canPlacePiece(grid, 10, 'O', 0, 0, 1, false), true); // O at (0,1)-(1,2) touches (0,0)
});

test('placement fails when it overlaps an occupied cell', () => {
  const grid = createCellGrid(10);
  grid[0][0].elementType = 'house';
  assert.equal(canPlacePiece(grid, 10, 'O', 0, 0, 0, true), false);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/pieces.test.js`
Expected: `Cannot find module '../src/pieces.js'` error.

- [x] **Step 3: Write the implementation**

`Flametown/prototype/src/pieces.js`:
```js
import { DIRS, neighborCoord, inBounds } from './grid.js';

export const TETROMINO_SHAPES = {
  I: [[0, 0], [0, 1], [0, 2], [0, 3]],
  O: [[0, 0], [0, 1], [1, 0], [1, 1]],
  T: [[0, 0], [0, 1], [0, 2], [1, 1]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1]],
  Z: [[0, 0], [0, 1], [1, 1], [1, 2]],
  J: [[0, 0], [1, 0], [1, 1], [1, 2]],
  L: [[0, 2], [1, 0], [1, 1], [1, 2]],
};

export const TETROMINO_IDS = Object.keys(TETROMINO_SHAPES);

function normalize(cells) {
  const minRow = Math.min(...cells.map(([r]) => r));
  const minCol = Math.min(...cells.map(([, c]) => c));
  return cells.map(([r, c]) => [r - minRow, c - minCol]);
}

function rotateCW(cells) {
  return normalize(cells.map(([r, c]) => [c, -r]));
}

function computeRotationStates(baseCells) {
  const states = [normalize(baseCells)];
  for (let i = 1; i < 4; i++) states.push(rotateCW(states[i - 1]));
  return states;
}

const TETROMINO_ROTATIONS = Object.fromEntries(
  TETROMINO_IDS.map((id) => [id, computeRotationStates(TETROMINO_SHAPES[id])])
);

export function pieceCells(shapeId, rotation) {
  return TETROMINO_ROTATIONS[shapeId][((rotation % 4) + 4) % 4];
}

export function randomPieceId(rng = Math.random) {
  const index = Math.min(TETROMINO_IDS.length - 1, Math.floor(rng() * TETROMINO_IDS.length));
  return TETROMINO_IDS[index];
}

export function absoluteCells(shapeId, rotation, anchorRow, anchorCol) {
  return pieceCells(shapeId, rotation).map(([r, c]) => [anchorRow + r, anchorCol + c]);
}

export function canPlacePiece(grid, gridSize, shapeId, rotation, anchorRow, anchorCol, isFirstPiece) {
  const cells = absoluteCells(shapeId, rotation, anchorRow, anchorCol);
  for (const [row, col] of cells) {
    if (!inBounds(gridSize, row, col)) return false;
    if (grid[row][col].elementType !== null) return false;
  }
  if (isFirstPiece) return true;
  for (const [row, col] of cells) {
    for (const dir of DIRS) {
      const n = neighborCoord(row, col, dir);
      if (!inBounds(gridSize, n.row, n.col)) continue;
      const isOwnCell = cells.some(([r, c]) => r === n.row && c === n.col);
      if (isOwnCell) continue;
      if (grid[n.row][n.col].elementType !== null) return true;
    }
  }
  return false;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/pieces.test.js`
Expected: 8 `PASS:` lines, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add Flametown/prototype/src/pieces.js Flametown/prototype/tests/pieces.test.js
git commit -m "feat: add tetromino shapes, rotation, and placement legality"
```

---

### Task 7: Element catalog (weighted random with maxCount)

**Files:**
- Create: `Flametown/prototype/src/elementCatalog.js`
- Test: `Flametown/prototype/tests/elementCatalog.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `ELEMENT_CATALOG` (array of `{id, weight, maxCount, emoji}`), `pickWeightedElement(counts, rng, catalog)`, `catalogEntry(id, catalog)`. Consumed by `state.js`, `render.js`.

- [x] **Step 1: Write the failing test**

`Flametown/prototype/tests/elementCatalog.test.js`:
```js
import assert from 'node:assert/strict';
import { ELEMENT_CATALOG, pickWeightedElement, catalogEntry } from '../src/elementCatalog.js';

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('catalogEntry finds a known type and throws on unknown', () => {
  const entry = catalogEntry('house');
  assert.equal(entry.id, 'house');
  assert.throws(() => catalogEntry('nonexistent'));
});

test('pickWeightedElement picks the only available type when catalog has one entry', () => {
  const catalog = [{ id: 'solo', weight: 1, maxCount: Infinity, emoji: '⭐' }];
  assert.equal(pickWeightedElement({}, () => 0.5, catalog), 'solo');
});

test('pickWeightedElement respects relative weights at the roll boundaries', () => {
  const catalog = [
    { id: 'a', weight: 1, maxCount: Infinity, emoji: 'A' },
    { id: 'b', weight: 3, maxCount: Infinity, emoji: 'B' },
  ];
  // total weight = 4; rng=0 -> roll=0 -> falls into 'a' (roll -= 1 => -1 <= 0)
  assert.equal(pickWeightedElement({}, () => 0, catalog), 'a');
  // rng just past a's share (1/4 = 0.25) should land in 'b'
  assert.equal(pickWeightedElement({}, () => 0.26, catalog), 'b');
});

test('pickWeightedElement excludes types that reached maxCount', () => {
  const catalog = [
    { id: 'capped', weight: 10, maxCount: 2, emoji: 'C' },
    { id: 'open', weight: 1, maxCount: Infinity, emoji: 'O' },
  ];
  const counts = { capped: 2 };
  assert.equal(pickWeightedElement(counts, () => 0.01, catalog), 'open');
});

test('pickWeightedElement falls back to the full catalog (never throws) when everything is capped', () => {
  const catalog = [{ id: 'onlyone', weight: 1, maxCount: 1, emoji: 'X' }];
  const counts = { onlyone: 1 };
  assert.doesNotThrow(() => pickWeightedElement(counts, () => 0.5, catalog));
  assert.equal(pickWeightedElement(counts, () => 0.5, catalog), 'onlyone');
});

test('the default catalog has no exceedingly low caps that would starve a 256x256 game', () => {
  for (const entry of ELEMENT_CATALOG) {
    assert.ok(entry.maxCount === Infinity || entry.maxCount >= 1000);
  }
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/elementCatalog.test.js`
Expected: `Cannot find module '../src/elementCatalog.js'` error.

- [x] **Step 3: Write the implementation**

`Flametown/prototype/src/elementCatalog.js`:
```js
// Edit this list to add/retune element types. `maxCount` is a cap on how many
// of that type can exist in the current city at once (Infinity = uncapped).
export const ELEMENT_CATALOG = [
  { id: 'house', weight: 5, maxCount: Infinity, emoji: '🏠' },
  { id: 'shop', weight: 4, maxCount: Infinity, emoji: '🏪' },
  { id: 'plaza', weight: 2, maxCount: Infinity, emoji: '🟫' },
  { id: 'park', weight: 3, maxCount: Infinity, emoji: '🌳' },
  { id: 'fountain', weight: 1, maxCount: Infinity, emoji: '⛲' },
  { id: 'decoration', weight: 2, maxCount: Infinity, emoji: '💐' },
];

export function catalogEntry(id, catalog = ELEMENT_CATALOG) {
  const entry = catalog.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown element type: ${id}`);
  return entry;
}

export function pickWeightedElement(counts, rng = Math.random, catalog = ELEMENT_CATALOG) {
  const available = catalog.filter((entry) => (counts[entry.id] || 0) < entry.maxCount);
  const pool = available.length > 0 ? available : catalog; // never leave the player with nothing pickable
  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return pool[pool.length - 1].id;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/elementCatalog.test.js`
Expected: 6 `PASS:` lines, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add Flametown/prototype/src/elementCatalog.js Flametown/prototype/tests/elementCatalog.test.js
git commit -m "feat: add weighted element catalog with maxCount caps"
```

---

### Task 8: Road edge matching

**Files:**
- Create: `Flametown/prototype/src/roads.js`
- Test: `Flametown/prototype/tests/roads.test.js`

**Interfaces:**
- Consumes: `DIRS, neighborCoord, oppositeDir, inBounds` from `grid.js`; `ROAD_RANDOM_CHANCE` from `config.js`.
- Produces: `assignRoadsForPiece(grid, gridSize, cells, rng)` returning an array (parallel to `cells`) of `{N,E,S,W: boolean}`. Consumed by `state.js`.

- [x] **Step 1: Write the failing test**

`Flametown/prototype/tests/roads.test.js`:
```js
import assert from 'node:assert/strict';
import { createCellGrid } from '../src/grid.js';
import { assignRoadsForPiece } from '../src/roads.js';

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('edges touching an already-placed neighbor mirror that neighbor\'s road state', () => {
  const grid = createCellGrid(10);
  grid[4][5].elementType = 'house';
  grid[4][5].roads = { N: false, E: false, S: true, W: false }; // road on its S edge
  const cells = [[5, 5]]; // new cell directly south of (4,5); shares an edge on its N side
  const [roads] = assignRoadsForPiece(grid, 10, cells, () => 0); // rng=0 would give "no road" if randomized
  assert.equal(roads.N, true); // must mirror the neighbor's S=true, not randomize
});

test('edges with no placed neighbor are randomized using rng and ROAD_RANDOM_CHANCE', () => {
  const grid = createCellGrid(10);
  const cells = [[5, 5]];
  const [allRoads] = assignRoadsForPiece(grid, 10, cells, () => 0); // rng=0 < 0.5 -> always road
  assert.deepEqual(allRoads, { N: true, E: true, S: true, W: true });
  const [noRoads] = assignRoadsForPiece(grid, 10, cells, () => 0.99); // rng=0.99 >= 0.5 -> never road
  assert.deepEqual(noRoads, { N: false, E: false, S: false, W: false });
});

test('edges shared between two cells of the same new piece are randomized independently, not mirrored', () => {
  const grid = createCellGrid(10);
  const cells = [[5, 5], [5, 6]]; // adjacent cells within the same piece, sharing an edge
  // Call order is cell (5,5)'s N,E,S,W then cell (5,6)'s N,E,S,W (8 calls total, all random
  // since neither cell has a pre-existing placed neighbor). Index 1 = (5,5)'s E edge (the
  // shared edge from A's side); index 7 = (5,6)'s W edge (the same shared edge from B's side).
  const sequence = [0.9, 0.1, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9];
  let call = 0;
  const rng = () => sequence[call++];
  const [roadsA, roadsB] = assignRoadsForPiece(grid, 10, cells, rng);
  assert.equal(roadsA.E, true);
  assert.equal(roadsB.W, false);
  // The shared edge is consumed independently by each side, so they need not match.
  assert.notEqual(roadsA.E, roadsB.W);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/roads.test.js`
Expected: `Cannot find module '../src/roads.js'` error.

- [x] **Step 3: Write the implementation**

`Flametown/prototype/src/roads.js`:
```js
import { DIRS, neighborCoord, oppositeDir, inBounds } from './grid.js';
import { ROAD_RANDOM_CHANCE } from '../config.js';

export function assignRoadsForPiece(grid, gridSize, cells, rng = Math.random) {
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));
  return cells.map(([row, col]) => {
    const roads = { N: false, E: false, S: false, W: false };
    for (const dir of DIRS) {
      const n = neighborCoord(row, col, dir);
      const isOwnCell = cellSet.has(`${n.row},${n.col}`);
      const neighborIsPlaced = !isOwnCell && inBounds(gridSize, n.row, n.col) && grid[n.row][n.col].elementType !== null;
      if (neighborIsPlaced) {
        roads[dir] = grid[n.row][n.col].roads[oppositeDir(dir)];
      } else {
        roads[dir] = rng() < ROAD_RANDOM_CHANCE;
      }
    }
    return roads;
  });
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/roads.test.js`
Expected: 3 `PASS:` lines, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add Flametown/prototype/src/roads.js Flametown/prototype/tests/roads.test.js
git commit -m "feat: add road edge matching against placed neighbors"
```

---

### Task 9: Asset variant loader (probing + emoji fallback)

**Files:**
- Create: `Flametown/prototype/src/assets.js`
- Test: `Flametown/prototype/tests/assets.test.js`

**Interfaces:**
- Consumes: `MAX_ASSET_VARIANTS` from `config.js`.
- Produces: `defaultLoadImage(url)` (real `Image`-based loader, browser-only), `detectVariants(typeId, basePath, maxVariants, loadImage)`, `loadAssetManifest(catalog, basePath, maxVariants, loadImage)`. `loadImage` is injectable so `detectVariants`/`loadAssetManifest` are testable in Node without a DOM. Consumed by `main.js`, `render.js`.

- [x] **Step 1: Write the failing test**

`Flametown/prototype/tests/assets.test.js`:
```js
import assert from 'node:assert/strict';
import { detectVariants, loadAssetManifest } from '../src/assets.js';

function test(name, fn) {
  return fn().then(
    () => console.log(`PASS: ${name}`),
    (err) => {
      console.error(`FAIL: ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  );
}

function fakeLoader(existingUrls) {
  return (url) => Promise.resolve(existingUrls.has(url) ? { url } : null);
}

await test('detectVariants stops at the first missing file', async () => {
  const loader = fakeLoader(new Set(['tiles/house_1.png', 'tiles/house_2.png']));
  const variants = await detectVariants('house', 'tiles', 20, loader);
  assert.equal(variants.length, 2);
});

await test('detectVariants returns an empty array when no variant files exist', async () => {
  const loader = fakeLoader(new Set());
  const variants = await detectVariants('ghost', 'tiles', 20, loader);
  assert.deepEqual(variants, []);
});

await test('detectVariants respects the maxVariants safety cap', async () => {
  const loader = () => Promise.resolve({}); // pretends every file exists forever
  const variants = await detectVariants('infinite', 'tiles', 5, loader);
  assert.equal(variants.length, 5);
});

await test('loadAssetManifest builds a map keyed by catalog id', async () => {
  const catalog = [{ id: 'house' }, { id: 'shop' }];
  const loader = fakeLoader(new Set(['tiles/house_1.png']));
  const manifest = await loadAssetManifest(catalog, 'tiles', 20, loader);
  assert.equal(manifest.house.length, 1);
  assert.equal(manifest.shop.length, 0);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/assets.test.js`
Expected: `Cannot find module '../src/assets.js'` error.

- [x] **Step 3: Write the implementation**

`Flametown/prototype/src/assets.js`:
```js
export function defaultLoadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function detectVariants(typeId, basePath, maxVariants, loadImage = defaultLoadImage) {
  const variants = [];
  for (let n = 1; n <= maxVariants; n++) {
    const url = `${basePath}/${typeId}_${n}.png`;
    const img = await loadImage(url);
    if (!img) break;
    variants.push(img);
  }
  return variants;
}

export async function loadAssetManifest(catalog, basePath, maxVariants, loadImage = defaultLoadImage) {
  const manifest = {};
  for (const entry of catalog) {
    manifest[entry.id] = await detectVariants(entry.id, basePath, maxVariants, loadImage);
  }
  return manifest;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/assets.test.js`
Expected: 4 `PASS:` lines, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add Flametown/prototype/src/assets.js Flametown/prototype/tests/assets.test.js
git commit -m "feat: add asset variant probing loader with emoji-fallback hook"
```

---

### Task 10: placePiece orchestration

**Files:**
- Modify: `Flametown/prototype/src/state.js` (replace entire contents)
- Test: `Flametown/prototype/tests/state.test.js`

**Interfaces:**
- Consumes: `canPlacePiece, absoluteCells` from `pieces.js`; `assignRoadsForPiece` from `roads.js`; `pickWeightedElement` from `elementCatalog.js`; `createCellGrid, createVertexGrid` from `grid.js`.
- Produces: `createNewWorld(gridSize, cellSize, jitterAmount, rng)` now also returns `elementCounts: {}` and `placedPieceCount: 0`. New export `placePiece(state, shapeId, rotation, anchorRow, anchorCol, rng)` returns `true`/`false` and mutates `state.grid`, `state.elementCounts`, `state.placedPieceCount` on success. Consumed by `main.js` (Task 13).

- [x] **Step 1: Write the failing test**

`Flametown/prototype/tests/state.test.js`:
```js
import assert from 'node:assert/strict';
import { createNewWorld, placePiece } from '../src/state.js';

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('createNewWorld starts with zero placed pieces and empty element counts', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  assert.equal(state.placedPieceCount, 0);
  assert.deepEqual(state.elementCounts, {});
});

test('placePiece fills 4 cells, assigns element types, and increments counters', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  const ok = placePiece(state, 'O', 0, 3, 3, () => 0.1);
  assert.equal(ok, true);
  assert.equal(state.placedPieceCount, 1);
  for (const [row, col] of [[3, 3], [3, 4], [4, 3], [4, 4]]) {
    assert.notEqual(state.grid[row][col].elementType, null);
    assert.equal(state.grid[row][col].pieceId, 1);
  }
  const totalCounted = Object.values(state.elementCounts).reduce((a, b) => a + b, 0);
  assert.equal(totalCounted, 4);
});

test('placePiece rejects an illegal placement and leaves state unchanged', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  placePiece(state, 'O', 0, 3, 3, () => 0.1); // first piece, occupies (3,3)-(4,4)
  const before = JSON.stringify(state.grid);
  const ok = placePiece(state, 'O', 0, 6, 6, () => 0.1); // not touching the existing city
  assert.equal(ok, false);
  assert.equal(state.placedPieceCount, 1); // unchanged
  assert.equal(JSON.stringify(state.grid), before);
});

test('a second piece touching the first is accepted', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  placePiece(state, 'O', 0, 3, 3, () => 0.1); // occupies (3,3)-(4,4)
  const ok = placePiece(state, 'O', 0, 3, 5, () => 0.1); // occupies (3,5)-(4,6), touches col 4
  assert.equal(ok, true);
  assert.equal(state.placedPieceCount, 2);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/state.test.js`
Expected: `placePiece` is not exported / undefined error.

- [x] **Step 3: Write the implementation**

`Flametown/prototype/src/state.js` (replace entire contents):
```js
import { createCellGrid, createVertexGrid } from './grid.js';
import { canPlacePiece, absoluteCells } from './pieces.js';
import { assignRoadsForPiece } from './roads.js';
import { pickWeightedElement } from './elementCatalog.js';

export function createNewWorld(gridSize, cellSize, jitterAmount, rng = Math.random) {
  return {
    gridSize,
    grid: createCellGrid(gridSize),
    vertices: createVertexGrid(gridSize, cellSize, jitterAmount, rng),
    elementCounts: {},
    placedPieceCount: 0,
  };
}

export function placePiece(state, shapeId, rotation, anchorRow, anchorCol, rng = Math.random) {
  const isFirstPiece = state.placedPieceCount === 0;
  if (!canPlacePiece(state.grid, state.gridSize, shapeId, rotation, anchorRow, anchorCol, isFirstPiece)) {
    return false;
  }
  const cells = absoluteCells(shapeId, rotation, anchorRow, anchorCol);
  const roadsForCells = assignRoadsForPiece(state.grid, state.gridSize, cells, rng);
  const pieceId = state.placedPieceCount + 1;
  const assetManifest = state.assetManifest || {};
  cells.forEach(([row, col], index) => {
    const elementType = pickWeightedElement(state.elementCounts, rng);
    state.elementCounts[elementType] = (state.elementCounts[elementType] || 0) + 1;
    const variants = assetManifest[elementType] || [];
    const elementVariant = variants.length > 0 ? Math.floor(rng() * variants.length) : null;
    state.grid[row][col] = {
      elementType,
      elementVariant,
      pieceId,
      roads: roadsForCells[index],
    };
  });
  state.placedPieceCount = pieceId;
  return true;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/state.test.js`
Expected: 4 `PASS:` lines, exit code 0.

- [x] **Step 5: Verify main.js still runs (state.js's exported shape changed but createNewWorld's call signature didn't)**

Run: `python3 -m http.server 8000` (from `Flametown/prototype/`), open `http://localhost:8000`
Expected: same jittered grid as Task 5, pan/zoom still work, no console errors.

- [ ] **Step 6: Commit**

```bash
git add Flametown/prototype/src/state.js Flametown/prototype/tests/state.test.js
git commit -m "feat: add placePiece orchestration (legality + roads + elements)"
```

---

### Task 11: Persistence (localStorage save/load, New Game)

**Files:**
- Modify: `Flametown/prototype/src/state.js` (append new exports)
- Modify: `Flametown/prototype/src/main.js` (replace entire contents)
- Test: `Flametown/prototype/tests/persistence.test.js`

**Interfaces:**
- Consumes: `SAVE_KEY, GRID_SIZE_MIN, GRID_SIZE_MAX` from `config.js`.
- Produces: `serializeState(state)`, `deserializeState(json)`, `clampGridSize(value, min, max)` (pure, Node-testable), plus `saveToStorage(state)`, `loadFromStorage()`, `clearStorage()` (thin `localStorage` wrappers, browser-only, manually verified). Consumed by `main.js`.

- [x] **Step 1: Write the failing test**

`Flametown/prototype/tests/persistence.test.js`:
```js
import assert from 'node:assert/strict';
import { createNewWorld, placePiece, serializeState, deserializeState, clampGridSize } from '../src/state.js';

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('serializeState then deserializeState round-trips grid contents', () => {
  const state = createNewWorld(8, 32, 0.2, () => 0.5);
  placePiece(state, 'O', 0, 3, 3, () => 0.1);
  const json = serializeState(state);
  const data = deserializeState(json);
  assert.equal(data.gridSize, 8);
  assert.equal(data.cells[3][3].elementType, state.grid[3][3].elementType);
  assert.equal(data.placedPieceCount, 1);
});

test('deserializeState rejects an unsupported save version', () => {
  assert.throws(() => deserializeState(JSON.stringify({ version: 99 })));
});

test('deserializeState rejects malformed JSON by throwing (caller is responsible for catching)', () => {
  assert.throws(() => deserializeState('not json'));
});

test('clampGridSize clamps out-of-range and non-numeric values', () => {
  assert.equal(clampGridSize(4, 16, 512), 16);
  assert.equal(clampGridSize(9999, 16, 512), 512);
  assert.equal(clampGridSize('abc', 16, 512), 16);
  assert.equal(clampGridSize(256, 16, 512), 256);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/persistence.test.js`
Expected: `serializeState is not a function` error.

- [x] **Step 3: Append the new exports to state.js**

Add to the end of `Flametown/prototype/src/state.js`:
```js
import { SAVE_KEY } from '../config.js';

export function serializeState(state) {
  return JSON.stringify({
    version: 1,
    gridSize: state.gridSize,
    cells: state.grid,
    vertices: state.vertices,
    elementCounts: state.elementCounts,
    placedPieceCount: state.placedPieceCount,
    camera: { x: state.camera.x, y: state.camera.y, zoom: state.camera.zoom },
  });
}

export function deserializeState(json) {
  const data = JSON.parse(json);
  if (data.version !== 1) throw new Error(`Unsupported save version: ${data.version}`);
  if (!Number.isInteger(data.gridSize) || data.gridSize < 1) throw new Error('Invalid gridSize in save data');
  return data;
}

export function clampGridSize(value, min, max) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function saveToStorage(state) {
  try {
    localStorage.setItem(SAVE_KEY, serializeState(state));
  } catch (err) {
    console.warn('Failed to save game state', err);
  }
}

export function loadFromStorage() {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return null;
    return deserializeState(json);
  } catch (err) {
    console.warn('Failed to load saved game, starting fresh', err);
    return null;
  }
}

export function clearStorage() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    console.warn('Failed to clear saved game', err);
  }
}
```

(Move the `import { SAVE_KEY } from '../config.js';` line up to join the existing imports at the top of the file instead of leaving it mid-file.)

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/persistence.test.js`
Expected: 4 `PASS:` lines, exit code 0.

- [x] **Step 5: Wire load-on-startup into main.js**

`Flametown/prototype/src/main.js` (replace entire contents):
```js
import { DEFAULT_GRID_SIZE, CELL_SIZE, JITTER_AMOUNT } from '../config.js';
import { createNewWorld, loadFromStorage } from './state.js';
import { createCamera } from './camera.js';
import { renderGrid } from './render.js';
import { createCameraInput } from './input.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

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

function buildInitialState() {
  const saved = loadFromStorage();
  if (saved) {
    return {
      gridSize: saved.gridSize,
      grid: saved.cells,
      vertices: saved.vertices,
      elementCounts: saved.elementCounts,
      placedPieceCount: saved.placedPieceCount,
      camera: { ...saved.camera },
    };
  }
  const world = createNewWorld(DEFAULT_GRID_SIZE, CELL_SIZE, JITTER_AMOUNT);
  return { ...world, camera: createCamera(world.gridSize, window.innerWidth, window.innerHeight) };
}

const state = buildInitialState();
const cameraInput = createCameraInput(canvas, state);

let lastTime = performance.now();
function frame(now) {
  const deltaSeconds = (now - lastTime) / 1000;
  lastTime = now;
  cameraInput.update(deltaSeconds);
  renderGrid(ctx, state, window.innerWidth, window.innerHeight);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- [x] **Step 6: Verify in the browser**

Open: `http://localhost:8000`
Expected: page loads a fresh empty grid on first run (no save yet), no console errors. Open devtools console and run `localStorage.getItem('flametown-save-v1')` — expect `null` (nothing saves yet until Task 13 wires `placePiece` + `saveToStorage` together).

- [ ] **Step 7: Commit**

```bash
git add Flametown/prototype/src/state.js Flametown/prototype/src/main.js Flametown/prototype/tests/persistence.test.js
git commit -m "feat: add save/load persistence and grid-size clamping"
```

---

### Task 12: UI panel (piece preview, New Game, grid-size input)

**Files:**
- Create: `Flametown/prototype/src/ui.js`
- Modify: `Flametown/prototype/src/state.js` (append new exports)
- Modify: `Flametown/prototype/src/main.js` (replace entire contents)

**Interfaces:**
- Consumes: `GRID_SIZE_MIN, GRID_SIZE_MAX, DEFAULT_GRID_SIZE` from `config.js`; `pieceCells` from `pieces.js`.
- Produces: `createUIPanel(panelEl, state, callbacks)` returning `{ renderPreview() }`, where `callbacks = { onTakePiece(), onNewGame(size) }`. `state.js` gains `ensureCurrentPiece(state, rng)` and `createNewWorld`'s return value gains `currentPiece: null, holding: false, animations: [], assetManifest: {}`. Consumed by `main.js`.

- [x] **Step 1: Extend createNewWorld and add ensureCurrentPiece in state.js**

Replace the `createNewWorld` function in `Flametown/prototype/src/state.js` with:
```js
export function createNewWorld(gridSize, cellSize, jitterAmount, rng = Math.random) {
  return {
    gridSize,
    grid: createCellGrid(gridSize),
    vertices: createVertexGrid(gridSize, cellSize, jitterAmount, rng),
    elementCounts: {},
    placedPieceCount: 0,
    currentPiece: null,
    holding: false,
    animations: [],
    assetManifest: {},
  };
}

export function ensureCurrentPiece(state, rng = Math.random) {
  if (!state.currentPiece) {
    state.currentPiece = { shapeId: randomPieceId(rng), rotation: 0 };
    state.holding = false;
  }
}
```

Add `randomPieceId` to the existing `import { canPlacePiece, absoluteCells } from './pieces.js';` line so it reads:
```js
import { canPlacePiece, absoluteCells, randomPieceId } from './pieces.js';
```

- [x] **Step 2: Create the UI panel module**

`Flametown/prototype/src/ui.js`:
```js
import { GRID_SIZE_MIN, GRID_SIZE_MAX, DEFAULT_GRID_SIZE } from '../config.js';
import { pieceCells } from './pieces.js';

export function createUIPanel(panelEl, state, callbacks) {
  panelEl.innerHTML = `
    <div id="piece-preview" style="display:grid;grid-template-columns:repeat(4,20px);grid-template-rows:repeat(4,20px);gap:2px;margin-bottom:8px;cursor:pointer;"></div>
    <div style="font-size:12px;margin-bottom:8px;line-height:1.4;">
      Scroll: zoom &middot; Środkowy przycisk / WASD: przesuń widok<br/>
      Kliknij klocek: podnieś &middot; TAB / PPM: obróć &middot; Klik na polu: postaw
    </div>
    <button id="new-game-btn">New Game</button>
    <div style="margin-top:6px;font-size:12px;">
      Rozmiar siatki:
      <input id="grid-size-input" type="number" min="${GRID_SIZE_MIN}" max="${GRID_SIZE_MAX}" value="${DEFAULT_GRID_SIZE}" style="width:70px;" />
    </div>
  `;

  const previewEl = panelEl.querySelector('#piece-preview');
  const newGameBtn = panelEl.querySelector('#new-game-btn');
  const gridSizeInput = panelEl.querySelector('#grid-size-input');

  function renderPreview() {
    previewEl.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const cellEl = document.createElement('div');
      cellEl.style.background = 'rgba(255,255,255,0.08)';
      previewEl.appendChild(cellEl);
    }
    if (!state.currentPiece) return;
    const cells = pieceCells(state.currentPiece.shapeId, state.currentPiece.rotation);
    for (const [row, col] of cells) {
      const index = row * 4 + col;
      if (index >= 0 && index < 16) {
        const cellEl = previewEl.children[index];
        cellEl.textContent = '🧱';
        cellEl.style.display = 'flex';
        cellEl.style.alignItems = 'center';
        cellEl.style.justifyContent = 'center';
        cellEl.style.background = '#5a5a66';
      }
    }
  }

  previewEl.addEventListener('click', () => callbacks.onTakePiece());
  newGameBtn.addEventListener('click', () => {
    const size = Number(gridSizeInput.value);
    if (window.confirm('Na pewno zaczynasz nową grę? Obecne miasto zostanie utracone.')) {
      callbacks.onNewGame(size);
    }
  });

  return { renderPreview };
}
```

- [x] **Step 3: Wire the panel into main.js**

`Flametown/prototype/src/main.js` (replace entire contents):
```js
import { DEFAULT_GRID_SIZE, CELL_SIZE, JITTER_AMOUNT, GRID_SIZE_MIN, GRID_SIZE_MAX } from '../config.js';
import { createNewWorld, loadFromStorage, clearStorage, clampGridSize, ensureCurrentPiece } from './state.js';
import { createCamera } from './camera.js';
import { renderGrid } from './render.js';
import { createCameraInput } from './input.js';
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
  return { ...world, camera: createCamera(world.gridSize, window.innerWidth, window.innerHeight) };
}

function buildInitialState() {
  const saved = loadFromStorage();
  if (saved) {
    return {
      gridSize: saved.gridSize,
      grid: saved.cells,
      vertices: saved.vertices,
      elementCounts: saved.elementCounts,
      placedPieceCount: saved.placedPieceCount,
      camera: { ...saved.camera },
      currentPiece: null,
      holding: false,
      animations: [],
      assetManifest: {},
    };
  }
  return buildFreshState(DEFAULT_GRID_SIZE);
}

let state = buildInitialState();
ensureCurrentPiece(state);

const cameraInput = createCameraInput(canvas, state);
const uiPanel = createUIPanel(panelEl, state, {
  onTakePiece: () => { state.holding = true; },
  onNewGame: (size) => {
    clearStorage();
    const clamped = clampGridSize(size, GRID_SIZE_MIN, GRID_SIZE_MAX);
    state = buildFreshState(clamped);
    ensureCurrentPiece(state);
    cameraInput.state = state; // camera input module reads live camera off this reference each frame
    uiPanel.renderPreview();
  },
});
uiPanel.renderPreview();

let lastTime = performance.now();
function frame(now) {
  const deltaSeconds = (now - lastTime) / 1000;
  lastTime = now;
  cameraInput.update(deltaSeconds);
  renderGrid(ctx, state, window.innerWidth, window.innerHeight);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- [x] **Step 4: Fix createCameraInput to read a mutable state reference (New Game replaces `state` wholesale)**

`createCameraInput` currently closes over the `state` parameter directly, so reassigning the outer `state` variable in `onNewGame` won't be seen by the already-created `cameraInput`. Replace the `createCameraInput` function signature and body in `Flametown/prototype/src/input.js` to read `input.state` instead of the closed-over parameter:

```js
export function createCameraInput(canvas, initialState) {
  const input = { state: initialState };
  const pressedKeys = new Set();
  let isMiddleDragging = false;
  let lastDragPos = { x: 0, y: 0 };

  window.addEventListener('keydown', (e) => {
    if (e.code in PAN_KEYS) pressedKeys.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    pressedKeys.delete(e.code);
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomCamera(input.state.camera, factor);
  }, { passive: false });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1) {
      isMiddleDragging = true;
      lastDragPos = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  });
  window.addEventListener('mousemove', (e) => {
    if (isMiddleDragging) {
      const dx = e.clientX - lastDragPos.x;
      const dy = e.clientY - lastDragPos.y;
      panCamera(input.state.camera, dx, dy);
      lastDragPos = { x: e.clientX, y: e.clientY };
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 1) isMiddleDragging = false;
  });

  input.update = (deltaSeconds) => {
    let dx = 0, dy = 0;
    for (const code of pressedKeys) {
      const dir = PAN_KEYS[code];
      dx += dir.dx;
      dy += dir.dy;
    }
    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy) || 1;
      const worldDx = (dx / length) * CAMERA_PAN_SPEED * deltaSeconds;
      const worldDy = (dy / length) * CAMERA_PAN_SPEED * deltaSeconds;
      panCameraWorld(input.state.camera, worldDx, worldDy);
    }
  };

  return input;
}
```

This changes the return shape from `{ update }` to `{ state, update }` — `main.js`'s `cameraInput.update(deltaSeconds)` call is unchanged, and `cameraInput.state = state` in `onNewGame` now correctly redirects future pans/zooms to the new world.

- [x] **Step 5: Verify in the browser**

Open: `http://localhost:8000`
Expected: side panel shows a 4x4 preview grid with a random tetromino shape highlighted in it, control hints, a "New Game" button, and a grid-size number input defaulting to 256. Clicking "New Game" asks for confirmation, then regenerates the world (new jitter pattern visible) and a new piece preview. Changing the grid-size input and clicking "New Game" regenerates at that size (zoom out with scroll to see the new bounds). No console errors.

- [ ] **Step 6: Commit**

```bash
git add Flametown/prototype/src/ui.js Flametown/prototype/src/state.js Flametown/prototype/src/main.js Flametown/prototype/src/input.js
git commit -m "feat: add UI panel with piece preview and New Game/grid-size controls"
```

---

### Task 13: Core gameplay loop (ghost piece, rotate, place)

**Files:**
- Modify: `Flametown/prototype/src/grid.js` (append `worldToCell`, already added in Task 2 — verify it's present; if not, append it)
- Modify: `Flametown/prototype/src/input.js` (append `createPlacementInput`)
- Modify: `Flametown/prototype/src/render.js` (replace entire contents)
- Modify: `Flametown/prototype/src/main.js` (replace entire contents)
- Test: `Flametown/prototype/tests/grid.test.js` (append one test for `worldToCell`)

**Interfaces:**
- Consumes: `absoluteCells, canPlacePiece` from `pieces.js`; `catalogEntry` from `elementCatalog.js`; `placePiece, saveToStorage` from `state.js`; `worldToCell` from `grid.js`.
- Produces: `createPlacementInput(canvas, state, onPlace)` returning `{ getMouseCell() }`. `renderGrid` now also draws placed elements and roads. New `renderGhost(ctx, state, viewportWidth, viewportHeight, mouseCell)`. Consumed by `main.js`.

- [x] **Step 1: Add a test for worldToCell and confirm it's implemented**

Append to `Flametown/prototype/tests/grid.test.js` (before the last line, alongside the other `test(...)` calls):
```js
test('worldToCell maps world pixel coordinates to the containing regular cell', () => {
  assert.deepEqual(worldToCell(0, 0, 32), { row: 0, col: 0 });
  assert.deepEqual(worldToCell(31, 31, 32), { row: 0, col: 0 });
  assert.deepEqual(worldToCell(32, 32, 32), { row: 1, col: 1 });
  assert.deepEqual(worldToCell(65, 100, 32), { row: 3, col: 2 });
});
```
Add `worldToCell` to the existing import line at the top of the test file:
```js
import {
  oppositeDir,
  neighborCoord,
  inBounds,
  createCellGrid,
  createVertexGrid,
  cellQuad,
  quadCentroid,
  worldToCell,
} from '../src/grid.js';
```

- [x] **Step 2: Run test to verify it fails (or passes if Task 2 already added worldToCell)**

Run: `node tests/grid.test.js`
Expected: PASS if `worldToCell` was added in Task 2 exactly as specified; if it's missing from `src/grid.js`, add the function shown in Task 2 Step 3 now.

- [x] **Step 3: Add gameplay input handling**

Append to `Flametown/prototype/src/input.js`:
```js
import { screenToWorld } from './camera.js';
import { worldToCell } from './grid.js';
import { CELL_SIZE } from '../config.js';

export function createPlacementInput(canvas, state, onPlace) {
  let mouseWorld = { x: 0, y: 0 };

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseWorld = screenToWorld(state.camera, rect.width, rect.height, e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.addEventListener('contextmenu', (e) => {
    if (state.holding) e.preventDefault();
  });

  canvas.addEventListener('mousedown', (e) => {
    if (!state.holding || !state.currentPiece) return;
    if (e.button === 2) {
      state.currentPiece.rotation = (state.currentPiece.rotation + 1) % 4;
    } else if (e.button === 0) {
      const cell = worldToCell(mouseWorld.x, mouseWorld.y, CELL_SIZE);
      onPlace(cell.row, cell.col);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (state.holding && state.currentPiece && e.code === 'Tab') {
      e.preventDefault();
      state.currentPiece.rotation = (state.currentPiece.rotation + 1) % 4;
    }
  });

  return {
    getMouseCell() {
      return worldToCell(mouseWorld.x, mouseWorld.y, CELL_SIZE);
    },
  };
}
```

Note: this module-level `state` parameter is fixed at creation time, same limitation `createCameraInput` had before Task 12 Step 4 fixed it. Since `createPlacementInput` is only created once in `main.js` and never needs to survive a New Game (Step 5 below recreates it after New Game instead of patching it), this is acceptable — do not add the same indirection here (YAGNI).

- [x] **Step 4: Extend rendering to draw placed elements, roads, and the ghost piece**

`Flametown/prototype/src/render.js` (replace entire contents):
```js
import { cellQuad, quadCentroid } from './grid.js';
import { visibleCellRange, worldToScreen } from './camera.js';
import { absoluteCells, canPlacePiece } from './pieces.js';
import { catalogEntry } from './elementCatalog.js';

export function renderGrid(ctx, state, viewportWidth, viewportHeight) {
  const { camera, vertices, gridSize, grid, assetManifest } = state;
  const manifest = assetManifest || {};
  const range = visibleCellRange(camera, viewportWidth, viewportHeight, gridSize);
  ctx.fillStyle = '#1b1b1f';
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);
  for (let row = range.minRow; row <= range.maxRow; row++) {
    for (let col = range.minCol; col <= range.maxCol; col++) {
      const cell = grid[row][col];
      const quad = cellQuad(vertices, row, col);
      const screenQuad = quad.map((p) => worldToScreen(camera, viewportWidth, viewportHeight, p.x, p.y));
      ctx.beginPath();
      ctx.moveTo(screenQuad[0].x, screenQuad[0].y);
      for (let i = 1; i < screenQuad.length; i++) ctx.lineTo(screenQuad[i].x, screenQuad[i].y);
      ctx.closePath();
      ctx.fillStyle = cell.elementType ? '#4a4a52' : '#2f4f2f';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (cell.elementType) drawElement(ctx, cell, quadCentroid(screenQuad), manifest, camera.zoom);
      drawRoads(ctx, cell, screenQuad);
    }
  }
}

function drawElement(ctx, cell, center, assetManifest, zoom) {
  const variants = assetManifest[cell.elementType];
  const size = 24 * zoom;
  if (variants && variants.length > 0 && cell.elementVariant != null) {
    const img = variants[cell.elementVariant % variants.length];
    ctx.drawImage(img, center.x - size / 2, center.y - size / 2, size, size);
    return;
  }
  const entry = catalogEntry(cell.elementType);
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(entry.emoji, center.x, center.y);
}

function drawRoads(ctx, cell, screenQuad) {
  const edges = {
    N: [screenQuad[0], screenQuad[1]],
    E: [screenQuad[1], screenQuad[2]],
    S: [screenQuad[3], screenQuad[2]],
    W: [screenQuad[0], screenQuad[3]],
  };
  ctx.strokeStyle = '#d8c27a';
  ctx.lineWidth = 3;
  for (const dir of Object.keys(edges)) {
    if (!cell.roads[dir]) continue;
    const [a, b] = edges[dir];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

export function renderGhost(ctx, state, viewportWidth, viewportHeight, mouseCell) {
  if (!state.holding || !state.currentPiece) return;
  const { shapeId, rotation } = state.currentPiece;
  const isFirstPiece = state.placedPieceCount === 0;
  const legal = canPlacePiece(state.grid, state.gridSize, shapeId, rotation, mouseCell.row, mouseCell.col, isFirstPiece);
  const cells = absoluteCells(shapeId, rotation, mouseCell.row, mouseCell.col);
  ctx.globalAlpha = 0.5;
  for (const [row, col] of cells) {
    if (row < 0 || row >= state.gridSize || col < 0 || col >= state.gridSize) continue;
    const quad = cellQuad(state.vertices, row, col);
    const screenQuad = quad.map((p) => worldToScreen(state.camera, viewportWidth, viewportHeight, p.x, p.y));
    ctx.beginPath();
    ctx.moveTo(screenQuad[0].x, screenQuad[0].y);
    for (let i = 1; i < screenQuad.length; i++) ctx.lineTo(screenQuad[i].x, screenQuad[i].y);
    ctx.closePath();
    ctx.fillStyle = legal ? '#f1c40f' : '#c0392b';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
```

- [x] **Step 5: Wire gameplay input + ghost rendering + autosave into main.js**

`Flametown/prototype/src/main.js` (replace entire contents):
```js
import { DEFAULT_GRID_SIZE, CELL_SIZE, JITTER_AMOUNT, GRID_SIZE_MIN, GRID_SIZE_MAX } from '../config.js';
import { createNewWorld, loadFromStorage, saveToStorage, clearStorage, clampGridSize, ensureCurrentPiece, placePiece } from './state.js';
import { createCamera } from './camera.js';
import { renderGrid, renderGhost } from './render.js';
import { createCameraInput, createPlacementInput } from './input.js';
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
  return { ...world, camera: createCamera(world.gridSize, window.innerWidth, window.innerHeight) };
}

function buildInitialState() {
  const saved = loadFromStorage();
  if (saved) {
    return {
      gridSize: saved.gridSize,
      grid: saved.cells,
      vertices: saved.vertices,
      elementCounts: saved.elementCounts,
      placedPieceCount: saved.placedPieceCount,
      camera: { ...saved.camera },
      currentPiece: null,
      holding: false,
      animations: [],
      assetManifest: {},
    };
  }
  return buildFreshState(DEFAULT_GRID_SIZE);
}

let state = buildInitialState();
ensureCurrentPiece(state);

const cameraInput = createCameraInput(canvas, state);
const placementInput = createPlacementInput(canvas, state, (row, col) => {
  if (!state.currentPiece) return;
  const placed = placePiece(state, state.currentPiece.shapeId, state.currentPiece.rotation, row, col);
  if (placed) {
    state.currentPiece = null;
    ensureCurrentPiece(state);
    uiPanel.renderPreview();
    saveToStorage(state);
  }
});

const uiPanel = createUIPanel(panelEl, state, {
  onTakePiece: () => { state.holding = true; },
  onNewGame: (size) => {
    clearStorage();
    const clamped = clampGridSize(size, GRID_SIZE_MIN, GRID_SIZE_MAX);
    state = buildFreshState(clamped);
    ensureCurrentPiece(state);
    cameraInput.state = state;
    placementInput.state = state;
    uiPanel.renderPreview();
  },
});
uiPanel.renderPreview();

let lastTime = performance.now();
function frame(now) {
  const deltaSeconds = (now - lastTime) / 1000;
  lastTime = now;
  cameraInput.update(deltaSeconds);
  renderGrid(ctx, state, window.innerWidth, window.innerHeight);
  renderGhost(ctx, state, window.innerWidth, window.innerHeight, placementInput.getMouseCell());
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

Since `onNewGame` now also does `placementInput.state = state`, `createPlacementInput` must read `state` through the same mutable-reference pattern used in `createCameraInput` (Task 12 Step 4). Update `createPlacementInput` in `Flametown/prototype/src/input.js` to match:
```js
export function createPlacementInput(canvas, initialState, onPlace) {
  const input = { state: initialState };
  let mouseWorld = { x: 0, y: 0 };

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseWorld = screenToWorld(input.state.camera, rect.width, rect.height, e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.addEventListener('contextmenu', (e) => {
    if (input.state.holding) e.preventDefault();
  });

  canvas.addEventListener('mousedown', (e) => {
    if (!input.state.holding || !input.state.currentPiece) return;
    if (e.button === 2) {
      input.state.currentPiece.rotation = (input.state.currentPiece.rotation + 1) % 4;
    } else if (e.button === 0) {
      const cell = worldToCell(mouseWorld.x, mouseWorld.y, CELL_SIZE);
      onPlace(cell.row, cell.col);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (input.state.holding && input.state.currentPiece && e.code === 'Tab') {
      e.preventDefault();
      input.state.currentPiece.rotation = (input.state.currentPiece.rotation + 1) % 4;
    }
  });

  input.getMouseCell = () => worldToCell(mouseWorld.x, mouseWorld.y, CELL_SIZE);
  return input;
}
```

(This replaces the version written in Step 3 above — the return shape changes from `{ getMouseCell }` to `{ state, getMouseCell }`; `main.js`'s `placementInput.getMouseCell()` call is unchanged.)

- [x] **Step 6: Verify the full core loop in the browser**

Open: `http://localhost:8000` (clear the save first via devtools: `localStorage.removeItem('flametown-save-v1')`, then reload)
Expected:
1. Click the piece preview in the panel — a semi-transparent yellow ghost piece appears following the mouse over the map.
2. Press TAB or right-click — the ghost rotates 90°.
3. Click on a cell far from anywhere (first piece) — it places, cells fill with emoji, `placedPieceCount` becomes 1, a new piece appears in the preview.
4. Click the new piece, try to place it NOT touching the existing city — ghost shows red, click does nothing.
5. Place it touching the existing city — it succeeds, roads appear as tan lines, and where a new road-carrying edge touches the first piece's road-carrying edge, the line is continuous (no gap).
6. Reload the page — the city persists (loaded from `localStorage`).
No console errors throughout.

- [ ] **Step 7: Commit**

```bash
git add Flametown/prototype/src/render.js Flametown/prototype/src/input.js Flametown/prototype/src/main.js Flametown/prototype/tests/grid.test.js
git commit -m "feat: wire up the full core loop (take, rotate, place, autosave)"
```

---

### Task 14: Bounce-in placement animation

**Files:**
- Create: `Flametown/prototype/src/anim.js`
- Test: `Flametown/prototype/tests/anim.test.js`
- Modify: `Flametown/prototype/src/render.js` (update `drawElement` and `renderGrid`)
- Modify: `Flametown/prototype/src/main.js` (spawn animations on placement, prune finished ones each frame)

**Interfaces:**
- Consumes: nothing.
- Produces: `easeOutBounce(t)`, `animationScale(anim, now)` where `anim = { startTime, duration }`. Consumed by `render.js`, `main.js`.

- [x] **Step 1: Write the failing test**

`Flametown/prototype/tests/anim.test.js`:
```js
import assert from 'node:assert/strict';
import { easeOutBounce, animationScale } from '../src/anim.js';

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('easeOutBounce starts at 0 and ends at 1', () => {
  assert.equal(easeOutBounce(0), 0);
  assert.ok(Math.abs(easeOutBounce(1) - 1) < 1e-9);
});

test('animationScale is 0 before startTime, 1 after startTime+duration', () => {
  const anim = { startTime: 1000, duration: 300 };
  assert.equal(animationScale(anim, 999), 0);
  assert.ok(Math.abs(animationScale(anim, 1300) - 1) < 1e-9);
});

test('animationScale is between 0 and 1 mid-animation', () => {
  const anim = { startTime: 1000, duration: 300 };
  const mid = animationScale(anim, 1150);
  assert.ok(mid >= 0 && mid <= 1.1); // bounce-out can slightly overshoot past 1 before settling
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/anim.test.js`
Expected: `Cannot find module '../src/anim.js'` error.

- [x] **Step 3: Write the implementation**

`Flametown/prototype/src/anim.js`:
```js
export function easeOutBounce(t) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
  if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
  t -= 2.625 / d1;
  return n1 * t * t + 0.984375;
}

export function animationScale(anim, now) {
  if (now < anim.startTime) return 0;
  const t = Math.min(1, (now - anim.startTime) / anim.duration);
  return easeOutBounce(t);
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/anim.test.js`
Expected: 3 `PASS:` lines, exit code 0.

- [x] **Step 5: Apply the scale to element rendering**

In `Flametown/prototype/src/render.js`, update the `drawElement` function signature and body to accept a `scale`:
```js
function drawElement(ctx, cell, center, assetManifest, zoom, scale = 1) {
  if (scale <= 0) return;
  const variants = assetManifest[cell.elementType];
  const size = 24 * zoom * scale;
  if (variants && variants.length > 0 && cell.elementVariant != null) {
    const img = variants[cell.elementVariant % variants.length];
    ctx.drawImage(img, center.x - size / 2, center.y - size / 2, size, size);
    return;
  }
  const entry = catalogEntry(cell.elementType);
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(entry.emoji, center.x, center.y);
}
```

Update `renderGrid` (same file) to look up a matching animation and pass its scale, and to accept the current time:
```js
import { animationScale } from './anim.js';

export function renderGrid(ctx, state, viewportWidth, viewportHeight, now = performance.now()) {
  const { camera, vertices, gridSize, grid, assetManifest, animations = [] } = state;
  const manifest = assetManifest || {};
  const range = visibleCellRange(camera, viewportWidth, viewportHeight, gridSize);
  ctx.fillStyle = '#1b1b1f';
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);
  for (let row = range.minRow; row <= range.maxRow; row++) {
    for (let col = range.minCol; col <= range.maxCol; col++) {
      const cell = grid[row][col];
      const quad = cellQuad(vertices, row, col);
      const screenQuad = quad.map((p) => worldToScreen(camera, viewportWidth, viewportHeight, p.x, p.y));
      ctx.beginPath();
      ctx.moveTo(screenQuad[0].x, screenQuad[0].y);
      for (let i = 1; i < screenQuad.length; i++) ctx.lineTo(screenQuad[i].x, screenQuad[i].y);
      ctx.closePath();
      ctx.fillStyle = cell.elementType ? '#4a4a52' : '#2f4f2f';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (cell.elementType) {
        const anim = animations.find((a) => a.row === row && a.col === col);
        const scale = anim ? animationScale(anim, now) : 1;
        drawElement(ctx, cell, quadCentroid(screenQuad), manifest, camera.zoom, scale);
      }
      drawRoads(ctx, cell, screenQuad);
    }
  }
}
```

- [x] **Step 6: Spawn and prune animations in main.js**

In `Flametown/prototype/src/main.js`, update the `placementInput` placement callback to spawn animations, and update `frame()` to prune finished ones and pass `now` to `renderGrid`:
```js
const placementInput = createPlacementInput(canvas, state, (row, col) => {
  if (!state.currentPiece) return;
  const placed = placePiece(state, state.currentPiece.shapeId, state.currentPiece.rotation, row, col);
  if (placed) {
    const now = performance.now();
    for (let r = 0; r < state.gridSize; r++) {
      for (let c = 0; c < state.gridSize; c++) {
        if (state.grid[r][c].pieceId === state.placedPieceCount) {
          state.animations.push({ row: r, col: c, startTime: now + Math.random() * 150, duration: 280 });
        }
      }
    }
    state.currentPiece = null;
    ensureCurrentPiece(state);
    uiPanel.renderPreview();
    saveToStorage(state);
  }
});
```

And update `frame`:
```js
function frame(now) {
  const deltaSeconds = (now - lastTime) / 1000;
  lastTime = now;
  cameraInput.update(deltaSeconds);
  state.animations = state.animations.filter((a) => now - a.startTime < a.duration);
  renderGrid(ctx, state, window.innerWidth, window.innerHeight, now);
  renderGhost(ctx, state, window.innerWidth, window.innerHeight, placementInput.getMouseCell());
  requestAnimationFrame(frame);
}
```

(Scanning the whole grid for the 4 newly-placed cells is O(N²) once per placement, not per frame — fine for N up to 512 and simpler than threading the `cells` array through the closure. If this ever shows up as slow, thread `cells` from `placePiece`'s call site instead.)

- [ ] **Step 7: Verify in the browser**

Clear the save and reload. Place a piece — each of its 4 cells should pop in with a staggered delay (not all at once) and a springy overshoot-then-settle bounce, instead of appearing instantly.

- [ ] **Step 8: Commit**

```bash
git add Flametown/prototype/src/anim.js Flametown/prototype/src/render.js Flametown/prototype/src/main.js Flametown/prototype/tests/anim.test.js
git commit -m "feat: add staggered bounce-in animation for newly placed tiles"
```

---

### Task 15: Real asset loading (image variants replace emoji when present)

**Files:**
- Modify: `Flametown/prototype/src/main.js` (load manifest at startup)
- Create: `Flametown/prototype/assets/tiles/.gitkeep`

**Interfaces:**
- Consumes: `loadAssetManifest, defaultLoadImage` from `assets.js`; `ELEMENT_CATALOG` from `elementCatalog.js`; `MAX_ASSET_VARIANTS` from `config.js`.
- Produces: nothing new — assigns to the existing `state.assetManifest` field that `render.js`/`state.js` already read.

- [x] **Step 1: Create the assets folder placeholder**

`Flametown/prototype/assets/tiles/.gitkeep`: (empty file, just so the folder exists in git before any real PNGs are added)

- [x] **Step 2: Load the manifest at startup**

In `Flametown/prototype/src/main.js`, add imports:
```js
import { loadAssetManifest } from './assets.js';
import { ELEMENT_CATALOG } from './elementCatalog.js';
import { MAX_ASSET_VARIANTS } from '../config.js';
```

After the line `let state = buildInitialState();`, add:
```js
loadAssetManifest(ELEMENT_CATALOG, 'assets/tiles', MAX_ASSET_VARIANTS).then((manifest) => {
  state.assetManifest = manifest;
});
```

(The game is playable immediately with emoji fallback since `state.assetManifest` starts as `{}`; it upgrades in place once the async scan resolves — no loading screen needed for a prototype this size.)

- [x] **Step 3: Verify emoji-only behavior first**

Reload with an empty `assets/tiles/` folder. Expected: identical behavior to Task 14 (all emoji), no console errors, no failed-request spam (probing 404s are expected and harmless, but confirm the count stops growing unbounded — check the Network tab shows exactly `MAX_ASSET_VARIANTS` (20) failed requests per catalog type, not more).

- [x] **Step 4: Verify with a real image**

Save any small square PNG as `Flametown/prototype/assets/tiles/house_1.png`. Reload. Expected: cells with `elementType === 'house'` now render that image instead of the 🏠 emoji; all other types still show emoji. Add a second `house_2.png` and reload a few times — expect roughly half of new house placements to use each variant.

- [ ] **Step 5: Commit**

```bash
git add Flametown/prototype/src/main.js Flametown/prototype/assets/
git commit -m "feat: load real asset variants at startup with emoji fallback"
```

---

### Task 16: Full playtest and error-handling verification

**Files:** none created — this task is manual verification of behavior already implemented in Tasks 1–15.

- [x] **Step 1: Verify corrupted save recovery**

Open devtools console: `localStorage.setItem('flametown-save-v1', 'not valid json')`, reload.
Expected: game starts with a fresh empty world (per `loadFromStorage`'s try/catch), a `console.warn` appears (not an uncaught error), no blank/broken page.

- [x] **Step 2: Verify unsupported save version recovery**

`localStorage.setItem('flametown-save-v1', JSON.stringify({version: 99}))`, reload.
Expected: same graceful fallback to a fresh world as Step 1.

- [x] **Step 3: Verify grid-size input clamping**

In the UI panel, set the grid-size input to `abc`, click New Game. Expected: world resets at the minimum size (16) per `clampGridSize`'s NaN fallback, not a crash.
Set it to `99999`, click New Game. Expected: world resets at 512 (the max), not a 99999×512 tile grid that would hang the browser.

- [x] **Step 4: Verify placement legality feedback end-to-end**

Place several pieces to build a small city. Take a new piece and hover it over an empty area not touching the city — confirm it renders red and clicking does nothing (no piece consumed, no console error). Hover it back onto a legal spot — confirm it turns yellow and places on click.

- [x] **Step 5: Verify road continuity visually**

Zoom in (scroll) on a seam between two separately-placed pieces. Confirm any road line that touches that seam continues unbroken into the neighboring piece (per Task 8's matching rule) — this is the visual proof that `assignRoadsForPiece` is wired correctly end-to-end, not just passing in isolation.

- [x] **Step 6: Run the full automated test suite once, end to end**

Run (from `Flametown/prototype/`):
```bash
for f in tests/*.test.js; do echo "== $f =="; node "$f" || exit 1; done
```
Expected: every file prints only `PASS:` lines, script exits 0.

- [ ] **Step 7: Final commit**

If Steps 1–6 required no code changes, there is nothing to commit — the prototype is complete per this plan. If any step surfaced a bug, fix it, re-run the relevant test(s) and this task's manual steps, then:
```bash
git add -A
git commit -m "fix: address issues found in final playtest"
```
