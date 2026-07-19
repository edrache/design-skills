function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function getRoadWidthPx(
  zoom,
  widthAtCityIconZoomStart,
  cityIconZoomStart
) {
  if (cityIconZoomStart <= 0) {
    return widthAtCityIconZoomStart;
  }
  return widthAtCityIconZoomStart * (zoom / cityIconZoomStart);
}

export function getRoadTextureMix(zoom, textureZoomStart, textureZoomFull) {
  if (zoom <= textureZoomStart) {
    return 0;
  }
  if (textureZoomFull <= textureZoomStart) {
    return 1;
  }
  return clamp01((zoom - textureZoomStart) / (textureZoomFull - textureZoomStart));
}

export function getRoadRenderStyle({
  zoom,
  widthAtCityIconZoomStart,
  cityIconZoomStart,
  textureZoomFull,
}) {
  return {
    widthPx: getRoadWidthPx(zoom, widthAtCityIconZoomStart, cityIconZoomStart),
    textureMix: getRoadTextureMix(zoom, cityIconZoomStart, textureZoomFull),
  };
}

export function getRoadTextureTileSpanPx(widthPx, textureWidth, textureHeight) {
  if (widthPx <= 0 || textureWidth <= 0 || textureHeight <= 0) {
    return 0;
  }
  return widthPx * (textureWidth / textureHeight);
}
