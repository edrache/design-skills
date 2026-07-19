import { CAMERA_PAN_SPEED, CELL_SIZE } from '../config.js';
import { panCamera, panCameraWorld, screenToWorld, zoomCamera } from './camera.js';
import { worldToCell } from './grid.js';

const PAN_KEYS = {
  KeyW: { dx: 0, dy: -1 },
  ArrowUp: { dx: 0, dy: -1 },
  KeyS: { dx: 0, dy: 1 },
  ArrowDown: { dx: 0, dy: 1 },
  KeyA: { dx: -1, dy: 0 },
  ArrowLeft: { dx: -1, dy: 0 },
  KeyD: { dx: 1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
};

export function createCameraInput(canvas, initialState) {
  const input = { state: initialState };
  const pressedKeys = new Set();
  let isMiddleDragging = false;
  let lastDragPos = { x: 0, y: 0 };

  window.addEventListener('keydown', (event) => {
    if (event.code in PAN_KEYS) {
      pressedKeys.add(event.code);
    }
  });

  window.addEventListener('keyup', (event) => {
    pressedKeys.delete(event.code);
  });

  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomCamera(input.state.camera, factor);
    },
    { passive: false }
  );

  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 1) {
      isMiddleDragging = true;
      lastDragPos = { x: event.clientX, y: event.clientY };
      event.preventDefault();
    }
  });

  window.addEventListener('mousemove', (event) => {
    if (!isMiddleDragging) {
      return;
    }

    const dx = event.clientX - lastDragPos.x;
    const dy = event.clientY - lastDragPos.y;
    panCamera(input.state.camera, dx, dy);
    lastDragPos = { x: event.clientX, y: event.clientY };
  });

  window.addEventListener('mouseup', (event) => {
    if (event.button === 1) {
      isMiddleDragging = false;
    }
  });

  input.update = (deltaSeconds) => {
    let dx = 0;
    let dy = 0;

    for (const code of pressedKeys) {
      const vector = PAN_KEYS[code];
      dx += vector.dx;
      dy += vector.dy;
    }

    if (dx === 0 && dy === 0) {
      return;
    }

    const length = Math.hypot(dx, dy) || 1;
    const worldDx = (dx / length) * CAMERA_PAN_SPEED * deltaSeconds;
    const worldDy = (dy / length) * CAMERA_PAN_SPEED * deltaSeconds;
    panCameraWorld(input.state.camera, worldDx, worldDy);
  };

  return input;
}

export function createPlacementInput(canvas, initialState, onPlace, onRotate = () => {}) {
  const input = { state: initialState };
  let mouseWorld = { x: 0, y: 0 };
  let hoveredCell = null;
  let mouseScreen = null;

  function updateMouseWorld(event) {
    const rect = canvas.getBoundingClientRect();
    mouseScreen = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    mouseWorld = screenToWorld(
      input.state.camera,
      rect.width,
      rect.height,
      mouseScreen.x,
      mouseScreen.y
    );
    hoveredCell = worldToCell(mouseWorld.x, mouseWorld.y, CELL_SIZE);
  }

  canvas.addEventListener('mousemove', (event) => {
    updateMouseWorld(event);
  });

  canvas.addEventListener('contextmenu', (event) => {
    if (input.state.holding) {
      event.preventDefault();
    }
  });

  canvas.addEventListener('mousedown', (event) => {
    updateMouseWorld(event);

    if (!input.state.holding || !input.state.currentPiece) {
      return;
    }

    if (event.button === 2) {
      input.state.currentPiece.rotation = (input.state.currentPiece.rotation + 1) % 4;
      onRotate();
      return;
    }

    if (event.button === 0) {
      const cell = worldToCell(mouseWorld.x, mouseWorld.y, CELL_SIZE);
      onPlace(cell.row, cell.col);
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hoveredCell = null;
    mouseScreen = null;
  });

  window.addEventListener('keydown', (event) => {
    if (input.state.holding && input.state.currentPiece && event.code === 'Tab') {
      event.preventDefault();
      input.state.currentPiece.rotation = (input.state.currentPiece.rotation + 1) % 4;
      onRotate();
    }
  });

  input.getMouseCell = () => hoveredCell;
  input.getMouseScreen = () => (mouseScreen ? { ...mouseScreen } : null);
  return input;
}
