import { MAX_ASSET_VARIANTS } from '../config.js';

export function defaultLoadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function loadOptionalImage(url, loadImage = defaultLoadImage) {
  return loadImage(url);
}

export async function detectVariants(
  typeId,
  basePath,
  maxVariants = MAX_ASSET_VARIANTS,
  loadImage = defaultLoadImage
) {
  const variants = [];
  const directUrl = `${basePath}/${typeId}.png`;
  const directImage = await loadImage(directUrl);

  if (directImage) {
    variants.push(directImage);
    return variants;
  }

  for (let index = 1; index <= maxVariants; index += 1) {
    const url = `${basePath}/${typeId}_${index}.png`;
    const image = await loadImage(url);
    if (!image) {
      break;
    }
    variants.push(image);
  }

  return variants;
}

export async function loadAssetManifest(
  catalog,
  basePath,
  maxVariants = MAX_ASSET_VARIANTS,
  loadImage = defaultLoadImage
) {
  const manifest = {};

  for (const entry of catalog) {
    manifest[entry.id] = await detectVariants(entry.id, basePath, maxVariants, loadImage);
  }

  return manifest;
}
