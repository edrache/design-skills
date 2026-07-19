import assert from 'node:assert/strict';
import { animationScale, easeOutBounce } from '../src/anim.js';

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
  assert.ok(mid >= 0 && mid <= 1.1);
});

test('shop click bounce stays at neutral scale before start and after finish', () => {
  const anim = { startTime: 1000, duration: 260, kind: 'shop-click-bounce' };
  assert.equal(animationScale(anim, 999), 1);
  assert.ok(Math.abs(animationScale(anim, 1260) - 1) < 1e-9);
});

test('shop click bounce briefly scales above 1 during the animation', () => {
  const anim = { startTime: 1000, duration: 260, kind: 'shop-click-bounce' };
  assert.ok(animationScale(anim, 1130) > 1);
});
