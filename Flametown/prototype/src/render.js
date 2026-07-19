import {
  CITY_ICON_ZOOM_FULL,
  CITY_ICON_ZOOM_START,
  CLUSTER_HIGHLIGHT_FILL,
  CLUSTER_HIGHLIGHT_SOURCE_FILL,
  CLUSTER_HIGHLIGHT_STROKE,
  ROAD_TEXTURE_ZOOM_FULL,
  ROAD_WIDTH_AT_CITY_ICON_ZOOM_START,
  RESIDENT_PIVOT_X,
  RESIDENT_WORLD_HEIGHT,
} from '../config.js';
import { animationScale, easeOutQuint } from './anim.js';
import { visibleCellRange, worldToScreen } from './camera.js';
import {
  ELEMENT_OVERLAY_ICON_DEFINITIONS,
  catalogEntry,
  getElementOverlayIconIds,
} from './elementCatalog.js';
import { cellQuad, quadCentroid } from './grid.js';
import { absoluteCells, canPlacePiece } from './pieces.js';
import { getRoadRenderStyle, getRoadTextureTileSpanPx } from './roadStyle.js';
import { residentScaleY, residentWorldPosition } from './residents.js';

function cellKey(row, col) {
  return `${row}:${col}`;
}

export function renderGrid(ctx, state, viewportWidth, viewportHeight, now = performance.now()) {
  const {
    camera,
    vertices,
    gridSize,
    grid,
    assetManifest,
    animations = [],
    backgroundTexture,
    backgroundTileWorldSize,
    builtBackgroundTexture,
    builtBackgroundTileWorldSize,
    builtBackgroundTextureOpacity,
    builtBackgroundOverdrawWorldSize,
    builtBackgroundTint,
    builtEdgeDetailWorldSpacing,
    builtEdgeFringeWorldSize,
    builtEdgeFringeTextureOpacity,
    builtEdgeFringeTint,
    builtEdgeErosionWorldSize,
    builtEdgeErosionTextureOpacity,
    builtEdgeErosionTint,
    mapPointTexture,
    mapPointWorldSize,
    roadTexture,
    residents = [],
    residentSprite,
    scorePopups = [],
  } = state;
  const manifest = assetManifest || {};
  const range = visibleCellRange(camera, viewportWidth, viewportHeight, gridSize);
  const builtCellIconOverlay = getBuiltCellIconOverlayState(camera.zoom);
  const hoveredClusterLookup = buildHoveredClusterLookup(state.hoveredClusterCells);
  const hoveredSourceKey = state.hoveredCell
    ? cellKey(state.hoveredCell.row, state.hoveredCell.col)
    : null;

  drawBackground(
    ctx,
    camera,
    viewportWidth,
    viewportHeight,
    backgroundTexture,
    backgroundTileWorldSize
  );

  drawBuiltAreaBackground(
    ctx,
    camera,
    viewportWidth,
    viewportHeight,
    grid,
    vertices,
    range,
    backgroundTexture,
    backgroundTileWorldSize,
    builtBackgroundTexture,
    builtBackgroundTileWorldSize,
    builtBackgroundTextureOpacity,
    builtBackgroundOverdrawWorldSize,
    builtBackgroundTint,
    builtEdgeDetailWorldSpacing,
    builtEdgeFringeWorldSize,
    builtEdgeFringeTextureOpacity,
    builtEdgeFringeTint,
    builtEdgeErosionWorldSize,
    builtEdgeErosionTextureOpacity,
    builtEdgeErosionTint
  );

  for (let row = range.minRow; row <= range.maxRow; row += 1) {
    for (let col = range.minCol; col <= range.maxCol; col += 1) {
      const cell = grid[row][col];
      const quad = cellQuad(vertices, row, col);
      const screenQuad = quad.map((point) =>
        worldToScreen(camera, viewportWidth, viewportHeight, point.x, point.y)
      );

      ctx.beginPath();
      ctx.moveTo(screenQuad[0].x, screenQuad[0].y);
      for (let i = 1; i < screenQuad.length; i += 1) {
        ctx.lineTo(screenQuad[i].x, screenQuad[i].y);
      }
      ctx.closePath();
      const clusterKey = cellKey(row, col);
      const isHoveredClusterCell = hoveredClusterLookup.has(clusterKey);
      const isHoveredSourceCell = hoveredSourceKey === clusterKey;
      if (cell.elementType) {
        if (isHoveredClusterCell) {
          ctx.fillStyle = isHoveredSourceCell
            ? CLUSTER_HIGHLIGHT_SOURCE_FILL
            : CLUSTER_HIGHLIGHT_FILL;
          ctx.fill();
          ctx.strokeStyle = CLUSTER_HIGHLIGHT_STROKE;
          ctx.lineWidth = Math.max(1, camera.zoom * 0.08);
          ctx.stroke();
        }

        const anim = animations.find((entry) => entry.row === row && entry.col === col);
        const scale = anim ? animationScale(anim, now) : 1;
        drawElement(ctx, cell, quadCentroid(screenQuad), manifest, camera.zoom, scale);
        if (builtCellIconOverlay.visible) {
          drawElementOverlayIcons(
            ctx,
            cell.elementType,
            quadCentroid(screenQuad),
            Math.min(
              Math.hypot(screenQuad[1].x - screenQuad[0].x, screenQuad[1].y - screenQuad[0].y),
              Math.hypot(screenQuad[3].x - screenQuad[0].x, screenQuad[3].y - screenQuad[0].y)
            ),
            state.iconManifest,
            builtCellIconOverlay
          );
        }
      }

      drawRoads(ctx, cell, screenQuad, camera.zoom, roadTexture);
    }
  }

  drawMapPoints(
    ctx,
    camera,
    viewportWidth,
    viewportHeight,
    vertices,
    range,
    mapPointTexture,
    mapPointWorldSize
  );

  drawResidents(
    ctx,
    camera,
    viewportWidth,
    viewportHeight,
    state.vertices,
    residents,
    residentSprite
  );

  drawScorePopups(
    ctx,
    camera,
    viewportWidth,
    viewportHeight,
    scorePopups,
    state.iconManifest,
    now
  );

  drawHoveredClusterTooltip(
    ctx,
    state.hoveredPointerScreen,
    state.hoveredClusterEntries,
    state.iconManifest,
    viewportWidth,
    viewportHeight
  );
}

function buildHoveredClusterLookup(cells) {
  if (!cells) {
    return new Set();
  }

  if (cells instanceof Set) {
    return new Set(cells);
  }

  const lookup = new Set();
  for (const cell of cells) {
    if (typeof cell === 'string') {
      lookup.add(cell);
      continue;
    }
    if (cell && Number.isInteger(cell.row) && Number.isInteger(cell.col)) {
      lookup.add(cellKey(cell.row, cell.col));
    }
  }
  return lookup;
}

function createWorldPattern(
  ctx,
  camera,
  viewportWidth,
  viewportHeight,
  texture,
  tileWorldSize = 512
) {
  if (!texture) {
    return null;
  }

  const pattern = ctx.createPattern(texture, 'repeat');
  if (!pattern) {
    return null;
  }

  const scale = tileWorldSize / texture.width;
  pattern.setTransform(
    new DOMMatrix([
      scale * camera.zoom,
      0,
      0,
      scale * camera.zoom,
      viewportWidth / 2 - camera.x * camera.zoom,
      viewportHeight / 2 - camera.y * camera.zoom,
    ])
  );
  return pattern;
}

function drawBackground(
  ctx,
  camera,
  viewportWidth,
  viewportHeight,
  backgroundTexture,
  tileWorldSize = 512
) {
  ctx.fillStyle = '#171714';
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);

  if (!backgroundTexture) {
    return;
  }

  const pattern = createWorldPattern(
    ctx,
    camera,
    viewportWidth,
    viewportHeight,
    backgroundTexture,
    tileWorldSize
  );
  if (!pattern) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = 0.98;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);
  ctx.fillStyle = 'rgba(26, 36, 20, 0.18)';
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);
  ctx.restore();
}

function drawBuiltAreaBackground(
  ctx,
  camera,
  viewportWidth,
  viewportHeight,
  grid,
  vertices,
  range,
  backgroundTexture,
  backgroundTileWorldSize,
  texture,
  tileWorldSize = 512,
  builtBackgroundTextureOpacity = 0.92,
  builtBackgroundOverdrawWorldSize = 0,
  builtBackgroundTint = 'rgba(181, 129, 64, 0.14)',
  edgeDetailWorldSpacing = 18,
  fringeWorldSize = 0,
  fringeTextureOpacity = 0.8,
  fringeTint = 'rgba(220, 174, 102, 0.18)',
  erosionWorldSize = 0,
  erosionTextureOpacity = 0.86,
  erosionTint = 'rgba(76, 111, 34, 0.16)'
) {
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = viewportWidth;
  layerCanvas.height = viewportHeight;
  const layerCtx = layerCanvas.getContext('2d');
  if (!layerCtx) {
    return;
  }

  const pattern = createWorldPattern(
    layerCtx,
    camera,
    viewportWidth,
    viewportHeight,
    texture,
    tileWorldSize
  );
  if (!pattern) {
    return;
  }

  const boundaryEdges = collectBuiltAreaBoundaryEdges(
    grid,
    vertices,
    range,
    camera,
    viewportWidth,
    viewportHeight
  );

  layerCtx.save();
  layerCtx.beginPath();
  let hasOccupiedCells = false;

  for (let row = range.minRow; row <= range.maxRow; row += 1) {
    for (let col = range.minCol; col <= range.maxCol; col += 1) {
      if (!grid[row][col].elementType) {
        continue;
      }

      const quad = cellQuad(vertices, row, col);
      const screenQuad = quad.map((point) =>
        worldToScreen(camera, viewportWidth, viewportHeight, point.x, point.y)
      );

      layerCtx.moveTo(screenQuad[0].x, screenQuad[0].y);
      for (let i = 1; i < screenQuad.length; i += 1) {
        layerCtx.lineTo(screenQuad[i].x, screenQuad[i].y);
      }
      layerCtx.closePath();
      hasOccupiedCells = true;
    }
  }

  if (!hasOccupiedCells) {
    layerCtx.restore();
    return;
  }

  layerCtx.clip();
  layerCtx.globalAlpha = builtBackgroundTextureOpacity;
  layerCtx.fillStyle = pattern;
  layerCtx.fillRect(0, 0, viewportWidth, viewportHeight);
  layerCtx.globalAlpha = 1;
  layerCtx.fillStyle = builtBackgroundTint;
  layerCtx.fillRect(0, 0, viewportWidth, viewportHeight);
  layerCtx.strokeStyle = 'rgba(255, 220, 145, 0.16)';
  layerCtx.lineWidth = Math.max(1, camera.zoom * 0.75);
  layerCtx.stroke();
  layerCtx.restore();

  if (boundaryEdges.length === 0) {
    ctx.drawImage(layerCanvas, 0, 0);
    return;
  }

  if (builtBackgroundOverdrawWorldSize > 0) {
    drawBuiltAreaEdgeExtension(
      layerCtx,
      boundaryEdges,
      pattern,
      camera,
      builtBackgroundOverdrawWorldSize,
      builtBackgroundTextureOpacity,
      builtBackgroundTint,
      edgeDetailWorldSpacing
    );
  }

  if (erosionWorldSize > 0) {
    drawBuiltAreaEdgeErosion(
      layerCtx,
      boundaryEdges,
      camera,
      erosionWorldSize,
      erosionTextureOpacity,
      erosionTint,
      edgeDetailWorldSpacing
    );
  }

  if (fringeWorldSize > 0) {
    drawBuiltAreaEdgeFringe(
      layerCtx,
      boundaryEdges,
      pattern,
      camera,
      fringeWorldSize,
      fringeTextureOpacity,
      fringeTint,
      edgeDetailWorldSpacing
    );
  }

  ctx.drawImage(layerCanvas, 0, 0);
}

function drawBuiltAreaEdgeExtension(
  ctx,
  boundaryEdges,
  builtPattern,
  camera,
  overdrawWorldSize,
  builtTextureOpacity,
  builtTint,
  edgeDetailWorldSpacing
) {
  const overdrawPx = overdrawWorldSize * camera.zoom;
  if (overdrawPx <= 0) {
    return;
  }

  ctx.save();
  for (const edge of boundaryEdges) {
    const { edgePoints, outerPoints } = buildEdgeStripPoints(
      edge,
      0,
      overdrawPx,
      0.55,
      edgeDetailWorldSpacing * camera.zoom
    );
    if (edgePoints.length < 2 || outerPoints.length < 2) {
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(outerPoints[0].x, outerPoints[0].y);
    for (let i = 1; i < outerPoints.length; i += 1) {
      ctx.lineTo(outerPoints[i].x, outerPoints[i].y);
    }
    for (let i = edgePoints.length - 1; i >= 0; i -= 1) {
      ctx.lineTo(edgePoints[i].x, edgePoints[i].y);
    }
    ctx.closePath();
    ctx.globalAlpha = builtTextureOpacity;
    ctx.fillStyle = builtPattern;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = builtTint;
    ctx.fill();
  }
  ctx.restore();
}

function collectBuiltAreaBoundaryEdges(
  grid,
  vertices,
  range,
  camera,
  viewportWidth,
  viewportHeight
) {
  const edgeDefs = [
    { dr: -1, dc: 0, corners: [0, 1], seedOffset: 11 },
    { dr: 0, dc: 1, corners: [1, 2], seedOffset: 23 },
    { dr: 1, dc: 0, corners: [3, 2], seedOffset: 37 },
    { dr: 0, dc: -1, corners: [0, 3], seedOffset: 53 },
  ];
  const edges = [];

  for (let row = range.minRow; row <= range.maxRow; row += 1) {
    for (let col = range.minCol; col <= range.maxCol; col += 1) {
      if (!grid[row][col].elementType) {
        continue;
      }

      const quad = cellQuad(vertices, row, col);
      const screenQuad = quad.map((point) =>
        worldToScreen(camera, viewportWidth, viewportHeight, point.x, point.y)
      );
      const center = quadCentroid(screenQuad);

      for (const edgeDef of edgeDefs) {
        const neighbor = grid[row + edgeDef.dr]?.[col + edgeDef.dc];
        if (neighbor?.elementType) {
          continue;
        }

        const a = screenQuad[edgeDef.corners[0]];
        const b = screenQuad[edgeDef.corners[1]];
        const midpoint = {
          x: (a.x + b.x) * 0.5,
          y: (a.y + b.y) * 0.5,
        };

        edges.push({
          a,
          b,
          outward: normalize({
            x: midpoint.x - center.x,
            y: midpoint.y - center.y,
          }),
          seed: row * 92821 + col * 68917 + edgeDef.seedOffset,
        });
      }
    }
  }

  return edges;
}

function drawBuiltAreaEdgeErosion(
  ctx,
  boundaryEdges,
  camera,
  erosionWorldSize,
  erosionTextureOpacity,
  erosionTint,
  edgeDetailWorldSpacing
) {
  const erosionPx = erosionWorldSize * camera.zoom;
  if (erosionPx <= 0) {
    return;
  }

  ctx.save();
  for (const edge of boundaryEdges) {
    const { edgePoints, innerPoints } = buildEdgeStripPoints(
      edge,
      erosionPx,
      0,
      0.45,
      edgeDetailWorldSpacing * camera.zoom
    );
    if (edgePoints.length < 2 || innerPoints.length < 2) {
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(edgePoints[0].x, edgePoints[0].y);
    for (let i = 1; i < edgePoints.length; i += 1) {
      ctx.lineTo(edgePoints[i].x, edgePoints[i].y);
    }
    for (let i = innerPoints.length - 1; i >= 0; i -= 1) {
      ctx.lineTo(innerPoints[i].x, innerPoints[i].y);
    }
    ctx.closePath();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = erosionTextureOpacity;
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = erosionTint;
    ctx.fill();
  }
  ctx.restore();
}

function drawBuiltAreaEdgeFringe(
  ctx,
  boundaryEdges,
  builtPattern,
  camera,
  fringeWorldSize,
  fringeTextureOpacity,
  fringeTint,
  edgeDetailWorldSpacing
) {
  const fringePx = fringeWorldSize * camera.zoom;
  if (fringePx <= 0) {
    return;
  }

  ctx.save();
  for (const edge of boundaryEdges) {
    const { edgePoints, outerPoints } = buildEdgeStripPoints(
      edge,
      0,
      fringePx,
      0.7,
      edgeDetailWorldSpacing * camera.zoom
    );
    if (edgePoints.length < 2 || outerPoints.length < 2) {
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(outerPoints[0].x, outerPoints[0].y);
    for (let i = 1; i < outerPoints.length; i += 1) {
      ctx.lineTo(outerPoints[i].x, outerPoints[i].y);
    }
    for (let i = edgePoints.length - 1; i >= 0; i -= 1) {
      ctx.lineTo(edgePoints[i].x, edgePoints[i].y);
    }
    ctx.closePath();
    ctx.globalAlpha = fringeTextureOpacity;
    ctx.fillStyle = builtPattern;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = fringeTint;
    ctx.fill();
  }
  ctx.restore();
}

function buildEdgeStripPoints(
  edge,
  innerDepthPx,
  outerDepthPx,
  noiseStrength = 0.5,
  detailSpacingPx = 18
) {
  const { a, b, outward, seed } = edge;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.001) {
    return { edgePoints: [], innerPoints: [], outerPoints: [] };
  }

  const spacing = Math.max(4, detailSpacingPx);
  const waveCount = Math.max(1, Math.min(80, length / spacing));
  const segments = Math.max(12, Math.ceil(waveCount * 3));
  const edgePoints = [];
  const innerPoints = [];
  const outerPoints = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = {
      x: a.x + dx * t,
      y: a.y + dy * t,
    };
    const outerNoise = sampleEdgeNoise(seed, t, waveCount);
    const innerNoise = sampleEdgeNoise(seed + 101, t, waveCount);
    const outerMagnitude =
      outerDepthPx > 0
        ? outerDepthPx * (0.45 + ((outerNoise + 1) * 0.5) * noiseStrength)
        : 0;
    const innerMagnitude =
      innerDepthPx > 0
        ? innerDepthPx * (0.15 + ((innerNoise + 1) * 0.5) * noiseStrength)
        : 0;

    edgePoints.push(point);
    innerPoints.push({
      x: point.x - outward.x * innerMagnitude,
      y: point.y - outward.y * innerMagnitude,
    });
    outerPoints.push({
      x: point.x + outward.x * outerMagnitude,
      y: point.y + outward.y * outerMagnitude,
    });
  }

  return { edgePoints, innerPoints, outerPoints };
}

function sampleEdgeNoise(seed, t, waveCount = 1) {
  const baseCycles = waveCount * Math.PI * 2;
  const low = Math.sin(seed * 0.173 + t * baseCycles);
  const high = Math.sin(seed * 0.617 + t * baseCycles * 2.15 + 1.7);
  return low * 0.72 + high * 0.28;
}

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y);
  if (length < 0.0001) {
    return { x: 0, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function drawElement(ctx, cell, center, assetManifest, zoom, scale = 1) {
  if (scale <= 0) {
    return;
  }

  const variants = assetManifest[cell.elementType];
  const size = 24 * zoom * scale;
  if (variants && variants.length > 0 && cell.elementVariant != null) {
    const img = variants[cell.elementVariant % variants.length];
    ctx.drawImage(img, center.x - size / 2, center.y - size / 2, size, size);
  } else {
    const entry = catalogEntry(cell.elementType);
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(entry.emoji, center.x, center.y);
  }
}

function drawElementOverlayIcons(ctx, elementType, center, size, iconManifest, options = {}) {
  const iconIds = getElementOverlayIconIds(elementType);
  if (iconIds.length === 0 || !iconManifest) {
    return;
  }

  const {
    iconScale = 0.88,
    minIconSize = 12,
    gapScale = 0.05,
    minGap = 2,
    alpha = 0.92,
  } = options;
  const baseIconSize = Math.max(minIconSize, size * iconScale);
  const gap = Math.max(minGap, size * gapScale);
  const totalWidth = iconIds.length * baseIconSize + (iconIds.length - 1) * gap;
  const startX = center.x - totalWidth / 2;
  const y = center.y - baseIconSize / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  for (const [index, iconId] of iconIds.entries()) {
    const iconImage = iconManifest[iconId];
    if (!iconImage) {
      continue;
    }

    const x = startX + index * (baseIconSize + gap);
    ctx.drawImage(iconImage, x, y, baseIconSize, baseIconSize);
  }
  ctx.restore();
}

function getBuiltCellIconOverlayState(zoom) {
  if (zoom > CITY_ICON_ZOOM_START) {
    return { visible: false };
  }

  const range = CITY_ICON_ZOOM_START - CITY_ICON_ZOOM_FULL;
  const progress =
    range <= 0 ? 1 : Math.max(0, Math.min(1, (CITY_ICON_ZOOM_START - zoom) / range));

  return {
    visible: true,
    alpha: 0.25 + progress * 0.67,
    iconScale: 0.36 + progress * 0.52,
    minIconSize: 8 + progress * 10,
    gapScale: 0.02 + progress * 0.03,
    minGap: 1 + progress,
  };
}

function drawRoads(ctx, cell, screenQuad, zoom, roadTexture) {
  const edges = {
    N: [screenQuad[0], screenQuad[1]],
    E: [screenQuad[1], screenQuad[2]],
    S: [screenQuad[3], screenQuad[2]],
    W: [screenQuad[0], screenQuad[3]],
  };
  const roadStyle = getRoadRenderStyle({
    zoom,
    widthAtCityIconZoomStart: ROAD_WIDTH_AT_CITY_ICON_ZOOM_START,
    cityIconZoomStart: CITY_ICON_ZOOM_START,
    textureZoomFull: ROAD_TEXTURE_ZOOM_FULL,
  });
  for (const dir of Object.keys(edges)) {
    if (!cell.roads[dir]) {
      continue;
    }
    const [a, b] = edges[dir];
    drawFlatRoadSegment(ctx, a, b, roadStyle.widthPx);
    if (roadTexture && roadStyle.textureMix > 0) {
      drawTexturedRoadSegment(
        ctx,
        a,
        b,
        roadStyle.widthPx,
        roadTexture,
        roadStyle.textureMix
      );
    }
  }
}

function drawFlatRoadSegment(ctx, a, b, widthPx) {
  ctx.save();
  ctx.strokeStyle = '#d8c27a';
  ctx.lineWidth = widthPx;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

function drawTexturedRoadSegment(ctx, a, b, widthPx, texture, alpha) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const tileLengthPx = getRoadTextureTileSpanPx(widthPx, texture.width, texture.height);
  if (length <= 0.001 || widthPx <= 0.001 || tileLengthPx <= 0.001) {
    return;
  }

  const angle = Math.atan2(dy, dx);
  const halfWidth = widthPx * 0.5;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(a.x, a.y);
  ctx.rotate(angle);

  for (let offset = 0; offset < length; offset += tileLengthPx) {
    const drawWidth = Math.min(tileLengthPx, length - offset);
    const sourceWidth = texture.width * (drawWidth / tileLengthPx);
    ctx.drawImage(
      texture,
      0,
      0,
      sourceWidth,
      texture.height,
      offset,
      -halfWidth,
      drawWidth,
      widthPx
    );
  }

  ctx.restore();
}

function drawMapPoints(
  ctx,
  camera,
  viewportWidth,
  viewportHeight,
  vertices,
  range,
  mapPointTexture,
  pointWorldSize = 10
) {
  if (!mapPointTexture) {
    return;
  }

  const size = pointWorldSize * camera.zoom;
  const halfSize = size / 2;

  ctx.save();
  ctx.globalAlpha = 0.9;

  for (let row = range.minRow; row <= range.maxRow + 1; row += 1) {
    for (let col = range.minCol; col <= range.maxCol + 1; col += 1) {
      const point = vertices[row]?.[col];
      if (!point) {
        continue;
      }

      const screenPoint = worldToScreen(
        camera,
        viewportWidth,
        viewportHeight,
        point.x,
        point.y
      );
      ctx.drawImage(
        mapPointTexture,
        screenPoint.x - halfSize,
        screenPoint.y - halfSize,
        size,
        size
      );
    }
  }

  ctx.restore();
}

function drawResidents(
  ctx,
  camera,
  viewportWidth,
  viewportHeight,
  vertices,
  residents,
  residentSprite
) {
  if (!residentSprite || !residents?.length) {
    return;
  }

  const positionedResidents = residents
    .map((resident) => {
      const worldPosition = residentWorldPosition(resident, vertices);
      return worldPosition ? { resident, worldPosition } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.worldPosition.y - b.worldPosition.y);

  ctx.save();
  for (const { resident, worldPosition } of positionedResidents) {
    const screenPosition = worldToScreen(
      camera,
      viewportWidth,
      viewportHeight,
      worldPosition.x,
      worldPosition.y
    );
    const height = RESIDENT_WORLD_HEIGHT * camera.zoom;
    const width = height * (residentSprite.width / residentSprite.height);
    const facing = resident.facing === -1 ? -1 : 1;
    const scaleY = residentScaleY(resident);
    const pivotX = width * RESIDENT_PIVOT_X;

    ctx.save();
    ctx.translate(screenPosition.x, screenPosition.y);
    ctx.fillStyle = 'rgba(48, 27, 12, 0.24)';
    ctx.beginPath();
    ctx.ellipse(0, -height * 0.04, width * 0.18, height * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(facing, scaleY);
    ctx.drawImage(residentSprite, -pivotX, -height, width, height);
    ctx.restore();
  }
  ctx.restore();
}

function drawScorePopups(
  ctx,
  camera,
  viewportWidth,
  viewportHeight,
  scorePopups,
  iconManifest,
  now
) {
  if (!Array.isArray(scorePopups) || scorePopups.length === 0) {
    return;
  }

  ctx.save();
  for (const popup of scorePopups) {
    if (!popup || now < popup.startTime) {
      continue;
    }

    const duration = Math.max(1, popup.duration || 900);
    const t = Math.max(0, Math.min(1, (now - popup.startTime) / duration));
    if (t >= 1) {
      continue;
    }

    const eased = easeOutQuint(t);
    const fade = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
    const screenPosition = worldToScreen(camera, viewportWidth, viewportHeight, popup.x, popup.y);
    const rise = (16 + camera.zoom * 1.8) * eased;
    const scale = 0.7 + 0.3 * eased;
    const iconSize = Math.max(18, camera.zoom * 1.35) * scale;
    const text = popup.amount > 1 ? `+${popup.amount}` : '';
    const hasText = text.length > 0;
    const paddingX = 8;
    const gap = hasText ? 6 : 0;

    ctx.save();
    ctx.translate(screenPosition.x, screenPosition.y - rise);
    ctx.globalAlpha = 0.94 * Math.max(0, fade);
    ctx.font = `600 ${Math.max(13, iconSize * 0.68)}px "Avenir Next", "Segoe UI", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textWidth = hasText ? ctx.measureText(text).width : 0;
    const pillWidth = paddingX * 2 + iconSize + gap + textWidth;
    const pillHeight = Math.max(iconSize + 8, 28);

    ctx.fillStyle = 'rgba(28, 19, 10, 0.78)';
    roundRect(ctx, -pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 221, 162, 0.32)';
    ctx.lineWidth = 1.25;
    ctx.stroke();

    const icon = iconManifest?.[popup.groupId];
    const iconX = -pillWidth / 2 + paddingX;
    const iconY = -iconSize / 2;
    if (icon) {
      ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
    } else {
      const fallbackIcon = ELEMENT_OVERLAY_ICON_DEFINITIONS[popup.groupId];
      ctx.fillStyle = '#f3d18a';
      ctx.fillText(fallbackIcon?.id?.[0] || '?', iconX, 0);
    }

    if (hasText) {
      ctx.fillStyle = '#fff3d6';
      ctx.fillText(text, iconX + iconSize + gap, 0);
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawHoveredClusterTooltip(
  ctx,
  hoveredPointerScreen,
  hoveredClusterEntries,
  iconManifest,
  viewportWidth,
  viewportHeight
) {
  if (
    !hoveredPointerScreen ||
    !Array.isArray(hoveredClusterEntries) ||
    hoveredClusterEntries.length === 0
  ) {
    return;
  }

  const paddingX = 10;
  const paddingY = 8;
  const iconSize = 16;
  const iconGap = 8;
  const lineHeight = 22;
  const cornerRadius = 12;

  ctx.save();
  ctx.font = '600 14px "Avenir Next", "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const lineMetrics = hoveredClusterEntries.map((entry) => {
    const text = `${entry.label}: ${entry.size}`;
    const width = iconSize + iconGap + ctx.measureText(text).width;
    return { ...entry, text, width };
  });
  const tooltipWidth = Math.max(...lineMetrics.map((line) => line.width)) + paddingX * 2;
  const tooltipHeight = lineMetrics.length * lineHeight + paddingY * 2;

  let x = hoveredPointerScreen.x + 16;
  let y = hoveredPointerScreen.y + 18;
  if (x + tooltipWidth > viewportWidth - 12) {
    x = Math.max(12, hoveredPointerScreen.x - tooltipWidth - 16);
  }
  if (y + tooltipHeight > viewportHeight - 12) {
    y = Math.max(12, hoveredPointerScreen.y - tooltipHeight - 18);
  }

  ctx.fillStyle = 'rgba(28, 19, 10, 0.86)';
  roundRect(ctx, x, y, tooltipWidth, tooltipHeight, cornerRadius);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 229, 176, 0.32)';
  ctx.lineWidth = 1;
  ctx.stroke();

  lineMetrics.forEach((entry, index) => {
    const lineY = y + paddingY + lineHeight * index + lineHeight / 2;
    const iconX = x + paddingX;
    const icon = resolveHoveredClusterTooltipIcon(entry, iconManifest);
    const emoji = resolveHoveredClusterTooltipEmoji(entry);

    if (icon) {
      ctx.drawImage(icon, iconX, lineY - iconSize / 2, iconSize, iconSize);
    } else {
      ctx.fillStyle = '#fff3d6';
      ctx.fillText(emoji || '•', iconX + 1, lineY);
    }

    ctx.fillStyle = '#fff3d6';
    ctx.fillText(entry.text, iconX + iconSize + iconGap, lineY);
  });

  ctx.restore();
}

function resolveHoveredClusterTooltipIcon(entry, iconManifest) {
  if (!entry?.iconId) {
    return null;
  }

  if (entry.targetType === 'house' || entry.targetType === 'park') {
    return null;
  }

  return iconManifest?.[entry.iconId] || null;
}

function resolveHoveredClusterTooltipEmoji(entry) {
  if (!entry?.targetType) {
    return null;
  }

  try {
    return catalogEntry(entry.targetType).emoji || null;
  } catch {
    return null;
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function renderGhost(ctx, state, viewportWidth, viewportHeight, mouseCell) {
  if (!state.holding || !state.currentPiece || !mouseCell) {
    return;
  }

  const { shapeId, rotation } = state.currentPiece;
  const isFirstPiece = state.placedPieceCount === 0;
  const legal = canPlacePiece(
    state.grid,
    state.gridSize,
    shapeId,
    rotation,
    mouseCell.row,
    mouseCell.col,
    isFirstPiece
  );
  const cells = absoluteCells(shapeId, rotation, mouseCell.row, mouseCell.col);
  const plannedCells = Array.isArray(state.currentPiece.plannedCells)
    ? state.currentPiece.plannedCells
    : [];

  ctx.save();
  for (const [cellIndex, [row, col]] of cells.entries()) {
    if (row < 0 || row >= state.gridSize || col < 0 || col >= state.gridSize) {
      continue;
    }

    const quad = cellQuad(state.vertices, row, col);
    const screenQuad = quad.map((point) =>
      worldToScreen(state.camera, viewportWidth, viewportHeight, point.x, point.y)
    );
    ctx.beginPath();
    ctx.moveTo(screenQuad[0].x, screenQuad[0].y);
    for (let i = 1; i < screenQuad.length; i += 1) {
      ctx.lineTo(screenQuad[i].x, screenQuad[i].y);
    }
    ctx.closePath();

    ctx.lineWidth = 3;
    ctx.strokeStyle = legal ? 'rgba(241, 196, 15, 0.95)' : 'rgba(192, 57, 43, 0.95)';
    ctx.fillStyle = legal ? 'rgba(255, 245, 190, 0.22)' : 'rgba(255, 140, 140, 0.16)';
    ctx.fill();
    ctx.stroke();

    const elementType = plannedCells[cellIndex]?.elementType;
    if (elementType) {
      drawElementOverlayIcons(
        ctx,
        elementType,
        quadCentroid(screenQuad),
        Math.min(
          Math.hypot(screenQuad[1].x - screenQuad[0].x, screenQuad[1].y - screenQuad[0].y),
          Math.hypot(screenQuad[3].x - screenQuad[0].x, screenQuad[3].y - screenQuad[0].y)
        ),
        state.iconManifest,
        {
          alpha: 0.92,
          iconScale: 0.88,
          minIconSize: 12,
          gapScale: 0.05,
          minGap: 2,
        }
      );
    }
  }
  ctx.restore();
}
