import { animationScale } from './anim.js';
import { visibleCellRange, worldToScreen } from './camera.js';
import { catalogEntry } from './elementCatalog.js';
import { cellQuad, quadCentroid } from './grid.js';
import { absoluteCells, canPlacePiece } from './pieces.js';

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
  } = state;
  const manifest = assetManifest || {};
  const range = visibleCellRange(camera, viewportWidth, viewportHeight, gridSize);

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
      if (cell.elementType) {
        const anim = animations.find((entry) => entry.row === row && entry.col === col);
        const scale = anim ? animationScale(anim, now) : 1;
        drawElement(ctx, cell, quadCentroid(screenQuad), manifest, camera.zoom, scale);
      }

      drawRoads(ctx, cell, screenQuad);
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
    if (!cell.roads[dir]) {
      continue;
    }
    const [a, b] = edges[dir];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
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

  ctx.save();
  for (const [row, col] of cells) {
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
    ctx.stroke();
  }
  ctx.restore();
}
