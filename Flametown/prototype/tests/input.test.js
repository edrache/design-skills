import assert from 'node:assert/strict';
import {
  CAMERA_PAN_ACCELERATION,
  CAMERA_PAN_DECELERATION,
  CAMERA_PAN_SPEED,
} from '../config.js';
import { getCameraPanDirection, stepCameraPanVelocity } from '../src/input.js';

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

test('camera pan direction normalizes diagonal keyboard input', () => {
  const direction = getCameraPanDirection(new Set(['KeyD', 'KeyW']));
  assert.ok(Math.abs(direction.x - Math.SQRT1_2) < 1e-9);
  assert.ok(Math.abs(direction.y + Math.SQRT1_2) < 1e-9);
});

test('camera pan velocity ramps up toward configured speed', () => {
  const velocity = stepCameraPanVelocity({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.1);
  assert.equal(velocity.x, CAMERA_PAN_ACCELERATION * 0.1);
  assert.equal(velocity.y, 0);
});

test('camera pan velocity caps at configured top speed', () => {
  const velocity = stepCameraPanVelocity(
    { x: CAMERA_PAN_SPEED - 10, y: 0 },
    { x: 1, y: 0 },
    0.1
  );
  assert.equal(velocity.x, CAMERA_PAN_SPEED);
});

test('camera pan velocity eases back to zero after key release', () => {
  const velocity = stepCameraPanVelocity({ x: 300, y: -120 }, { x: 0, y: 0 }, 0.05);
  assert.equal(velocity.x, 300 - CAMERA_PAN_DECELERATION * 0.05);
  assert.equal(velocity.y, 0);
});
