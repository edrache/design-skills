import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CITY_ICON_ZOOM_START,
  ROAD_TEXTURE_ZOOM_FULL,
  ROAD_WIDTH_AT_CITY_ICON_ZOOM_START,
} from '../config.js';
import {
  getRoadRenderStyle,
  getRoadTextureTileSpanPx,
  getRoadTextureMix,
  getRoadWidthPx,
} from '../src/roadStyle.js';

test('road width matches legacy 3px look at CITY_ICON_ZOOM_START', () => {
  const widthPx = getRoadWidthPx(
    CITY_ICON_ZOOM_START,
    ROAD_WIDTH_AT_CITY_ICON_ZOOM_START,
    CITY_ICON_ZOOM_START
  );

  assert.equal(widthPx, ROAD_WIDTH_AT_CITY_ICON_ZOOM_START);
});

test('road width scales proportionally with zoom', () => {
  const farWidth = getRoadWidthPx(
    CITY_ICON_ZOOM_START * 0.5,
    ROAD_WIDTH_AT_CITY_ICON_ZOOM_START,
    CITY_ICON_ZOOM_START
  );
  const nearWidth = getRoadWidthPx(
    CITY_ICON_ZOOM_START * 2,
    ROAD_WIDTH_AT_CITY_ICON_ZOOM_START,
    CITY_ICON_ZOOM_START
  );

  assert.equal(farWidth, ROAD_WIDTH_AT_CITY_ICON_ZOOM_START * 0.5);
  assert.equal(nearWidth, ROAD_WIDTH_AT_CITY_ICON_ZOOM_START * 2);
  assert.ok(nearWidth > farWidth);
});

test('road texture stays off at CITY_ICON_ZOOM_START and reaches full at configured close zoom', () => {
  assert.equal(getRoadTextureMix(CITY_ICON_ZOOM_START, CITY_ICON_ZOOM_START, ROAD_TEXTURE_ZOOM_FULL), 0);
  assert.equal(getRoadTextureMix(ROAD_TEXTURE_ZOOM_FULL, CITY_ICON_ZOOM_START, ROAD_TEXTURE_ZOOM_FULL), 1);
});

test('combined road style keeps legacy look at CITY_ICON_ZOOM_START', () => {
  const style = getRoadRenderStyle({
    zoom: CITY_ICON_ZOOM_START,
    widthAtCityIconZoomStart: ROAD_WIDTH_AT_CITY_ICON_ZOOM_START,
    cityIconZoomStart: CITY_ICON_ZOOM_START,
    textureZoomFull: ROAD_TEXTURE_ZOOM_FULL,
  });

  assert.deepEqual(style, {
    widthPx: ROAD_WIDTH_AT_CITY_ICON_ZOOM_START,
    textureMix: 0,
  });
});

test('road texture tile span follows current road width for square textures', () => {
  assert.equal(getRoadTextureTileSpanPx(18, 64, 64), 18);
  assert.equal(getRoadTextureTileSpanPx(27, 64, 64), 27);
});

test('road texture tile span preserves texture aspect ratio', () => {
  assert.equal(getRoadTextureTileSpanPx(20, 128, 64), 40);
  assert.equal(getRoadTextureTileSpanPx(20, 64, 128), 10);
});
