// Keep every exported config value documented inline so the file stays readable as new knobs are added.
export const DEFAULT_GRID_SIZE = 256; // Default world size used when starting a fresh game.
export const GRID_SIZE_MIN = 16; // Smallest grid size accepted by the New Game flow.
export const GRID_SIZE_MAX = 512; // Largest grid size accepted by the New Game flow.
export const CELL_SIZE = 32; // Base world-space size of one logical cell before camera zoom.
export const JITTER_AMOUNT = 0.2; // Strength of vertex jitter that makes the grid look less perfectly regular.
export const MAX_ASSET_VARIANTS = 20; // Safety cap for probing numbered sprite variants like house_1, house_2, etc.
export const ROAD_RANDOM_CHANCE = 0.5; // Chance used by road generation when a road connection is optional.
export const SAVE_KEY = 'flametown-save-v1'; // localStorage key for saved prototype state.
export const ZOOM_MIN = 0.3; // Lowest camera zoom allowed during play.
export const ZOOM_MAX = 20.0; // Highest camera zoom allowed during play.
export const CAMERA_PAN_SPEED = 600; // Keyboard pan speed in world units per second.
export const BACKGROUND_TEXTURE_PATH = 'assets/tiles/Terrain_Base.png'; // Texture path for the main grassland world background.
export const BACKGROUND_TILE_WORLD_SIZE = 256; // World-space size covered by one repeat of the main background texture.
export const BUILT_BACKGROUND_TEXTURE_PATH = 'assets/tiles/Terrain_Town.png'; // Texture path for the ground shown under occupied city cells.
export const BUILT_BACKGROUND_TILE_WORLD_SIZE = 20; // World-space size covered by one repeat of the built-area texture.
export const BUILT_BACKGROUND_TEXTURE_OPACITY = 1.0; // Opacity of the main built-area texture before any tint is applied.
export const BUILT_EDGE_FRINGE_WORLD_SIZE = 0; // How far the city ground can irregularly extend outside the strict occupied footprint.
export const BUILT_EDGE_FRINGE_TEXTURE_OPACITY = 0.1; // Opacity of the built-area texture on the outer fringe strip.

export const BUILT_BACKGROUND_OVERDRAW_WORLD_SIZE =5; // How far the main city-ground layer can extend beyond the strict occupied footprint before decorative fringe is applied.
export const BUILT_EDGE_DETAIL_WORLD_SPACING = 10; // Approximate world-space distance assigned to one edge-wave; lower means more frequent waves, higher means fewer waves.
export const BUILT_EDGE_EROSION_WORLD_SIZE = 0; // How far the city ground can irregularly recede inward along its outer edge.

export const BUILT_EDGE_EROSION_TEXTURE_OPACITY = 1.0; // Opacity of the terrain texture on the inward erosion strip.
export const BUILT_BACKGROUND_TINT = 'rgba(181, 129, 64, 0.0)'; // Warm translucent tint laid over the full built-area texture.
export const BUILT_EDGE_EROSION_TINT = 'rgba(0, 255, 255, 0.0)'; // Green translucent tint used on the inward edge erosion strip.
export const BUILT_EDGE_FRINGE_TINT = 'rgba(220, 174, 102, 0.0)'; // Warm translucent tint used on the outward edge fringe strip.
export const MAP_POINT_TEXTURE_PATH = 'assets/tiles/MapPoint.png'; // Texture path for the marker sprite rendered on grid vertices.
export const MAP_POINT_WORLD_SIZE = 10; // World-space size of each vertex marker sprite before camera zoom.
