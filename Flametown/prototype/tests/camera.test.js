import assert from 'node:assert/strict';
import { ZOOM_MAX, ZOOM_MIN } from '../config.js';
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
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test('createCamera centers on the middle of the world', () => {
  const camera = createCamera(256, 800, 600);
  assert.equal(camera.x, 4096);
  assert.equal(camera.y, 4096);
  assert.ok(camera.zoom > 0);
});

test('clampZoom respects min/max bounds', () => {
  assert.equal(clampZoom(0.01), ZOOM_MIN);
  assert.equal(clampZoom(100), ZOOM_MAX);
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
  assert.equal(camera.x, 90);
  assert.equal(camera.y, 105);
});

test('panCameraWorld moves the camera directly in world units', () => {
  const camera = { x: 100, y: 100, zoom: 2 };
  panCameraWorld(camera, 15, -5);
  assert.equal(camera.x, 115);
  assert.equal(camera.y, 95);
});

test('zoomCamera multiplies and clamps', () => {
  const camera = { x: 0, y: 0, zoom: ZOOM_MAX - 0.1 };
  zoomCamera(camera, 1.5);
  assert.equal(camera.zoom, ZOOM_MAX);
});

test('visibleCellRange stays within grid bounds', () => {
  const camera = { x: 0, y: 0, zoom: 1 };
  const range = visibleCellRange(camera, 800, 600, 10);
  assert.ok(range.minRow >= 0 && range.minCol >= 0);
  assert.ok(range.maxRow <= 9 && range.maxCol <= 9);
});
