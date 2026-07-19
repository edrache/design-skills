import assert from 'node:assert/strict';
import { createTutorialController } from '../src/tutorial.js';

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

function createRuntime() {
  const calls = [];
  const snapshot = {
    camera: { x: 0, y: 0, zoom: 1 },
    holding: false,
    currentPiece: { rotation: 0 },
    placedPieceCount: 0,
    ghostLegal: null,
    residents: [],
    hoveredClusterSize: 0,
    scoreTotals: { Bread: 0, Crystal: 0, Iron: 0, Meat: 0, Plant: 0, Potion: 0 },
  };

  return {
    calls,
    snapshot,
    runtime: {
      loadTutorialBoard() {
        calls.push('loadTutorialBoard');
        snapshot.holding = false;
        snapshot.currentPiece = { rotation: 0 };
        snapshot.placedPieceCount = 0;
      },
      prepareSecondPlacementStep() {
        calls.push('prepareSecondPlacementStep');
        snapshot.holding = false;
      },
      loadResidentBoard() {
        calls.push('loadResidentBoard');
        snapshot.residents = [{ id: 1 }];
      },
      loadIllegalPlacementBoard() {
        calls.push('loadIllegalPlacementBoard');
        snapshot.holding = false;
        snapshot.ghostLegal = null;
      },
      loadClusterBoard() {
        calls.push('loadClusterBoard');
        snapshot.hoveredClusterSize = 0;
      },
      loadScoreBoard() {
        calls.push('loadScoreBoard');
        snapshot.scoreTotals = { Bread: 0, Crystal: 0, Iron: 0, Meat: 0, Plant: 0, Potion: 0 };
      },
      captureCameraBaseline() {
        return { ...snapshot.camera };
      },
      getSnapshot() {
        return snapshot;
      },
      saveGameSnapshot() {
        calls.push('saveGameSnapshot');
        return 'saved-game';
      },
      restoreGameSnapshot(serialized) {
        calls.push(`restore:${serialized}`);
      },
    },
  };
}

test('tutorial start saves current game and opens first step', () => {
  const { runtime, calls } = createRuntime();
  const tutorial = createTutorialController(runtime);

  const view = tutorial.start();

  assert.equal(view.active, true);
  assert.equal(view.stepIndex, 0);
  assert.equal(view.canGoNext, true);
  assert.deepEqual(calls.slice(0, 2), ['saveGameSnapshot', 'loadTutorialBoard']);
});

test('camera step requires camera interaction before allowing next', () => {
  const { runtime, snapshot } = createRuntime();
  const tutorial = createTutorialController(runtime);

  tutorial.start();
  let view = tutorial.next();
  assert.equal(view.stepIndex, 1);
  assert.equal(view.canGoNext, false);

  snapshot.camera.zoom = 1.2;
  view = tutorial.sync();
  assert.equal(view.completed, true);
  assert.equal(view.canGoNext, true);
});

test('later steps react to gameplay state and final close restores saved game', () => {
  const { runtime, snapshot, calls } = createRuntime();
  const tutorial = createTutorialController(runtime);

  tutorial.start();
  tutorial.next();

  snapshot.camera.x = 12;
  tutorial.sync();
  tutorial.next();

  snapshot.holding = true;
  tutorial.sync();
  tutorial.next();

  snapshot.currentPiece.rotation = 1;
  tutorial.sync();
  tutorial.next();

  snapshot.placedPieceCount = 1;
  tutorial.sync();
  tutorial.next();

  snapshot.placedPieceCount = 2;
  tutorial.sync();
  tutorial.next();

  snapshot.residents = [{ id: 1 }];
  tutorial.sync();
  tutorial.next();

  snapshot.holding = true;
  snapshot.ghostLegal = false;
  tutorial.sync();
  tutorial.next();

  snapshot.hoveredClusterSize = 3;
  tutorial.sync();
  tutorial.next();

  snapshot.scoreTotals.Bread = 2;
  tutorial.sync();
  tutorial.next();
  tutorial.next();

  const finalView = tutorial.next();

  assert.equal(finalView.active, false);
  assert.ok(calls.includes('prepareSecondPlacementStep'));
  assert.ok(calls.includes('loadResidentBoard'));
  assert.ok(calls.includes('loadIllegalPlacementBoard'));
  assert.ok(calls.includes('loadClusterBoard'));
  assert.ok(calls.includes('loadScoreBoard'));
  assert.ok(calls.includes('restore:saved-game'));
});
