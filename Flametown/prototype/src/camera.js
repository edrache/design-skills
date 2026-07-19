import { CELL_SIZE, ZOOM_MIN, ZOOM_MAX } from '../config.js';

export function clampZoom(zoom) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

export function createCamera(gridSize, viewportWidth, viewportHeight) {
  const targetCellsWide = 1;
  const zoom = clampZoom(viewportWidth / (targetCellsWide * CELL_SIZE));
  const worldSize = gridSize * CELL_SIZE;

  return {
    x: worldSize / 2,
    y: worldSize / 2,
    zoom,
  };
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
  const bottomRight = screenToWorld(
    camera,
    viewportWidth,
    viewportHeight,
    viewportWidth,
    viewportHeight
  );
  const pad = 2;

  return {
    minRow: Math.max(0, Math.floor(topLeft.y / CELL_SIZE) - pad),
    maxRow: Math.min(gridSize - 1, Math.ceil(bottomRight.y / CELL_SIZE) + pad),
    minCol: Math.max(0, Math.floor(topLeft.x / CELL_SIZE) - pad),
    maxCol: Math.min(gridSize - 1, Math.ceil(bottomRight.x / CELL_SIZE) + pad),
  };
}
