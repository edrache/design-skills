export const APP_VERSION = '0.1.10'; // Human-readable prototype version tracked in project docs and release notes.

// Keep every exported config value documented inline so the file stays readable as new knobs are added.
export const DEFAULT_GRID_SIZE = 64; // Default world size used when starting a fresh game.
export const GRID_SIZE_MIN = 16; // Smallest grid size accepted by the New Game flow.
export const GRID_SIZE_MAX = 512; // Largest grid size accepted by the New Game flow.
export const CELL_SIZE = 32; // Base world-space size of one logical cell before camera zoom.
export const JITTER_AMOUNT = 0.2; // Strength of vertex jitter that makes the grid look less perfectly regular.
export const MAX_ASSET_VARIANTS = 20; // Safety cap for probing numbered sprite variants like house_1, house_2, etc.
export const ROAD_RANDOM_CHANCE = 0.5; // Chance used by road generation when a road connection is optional.
export const SAVE_KEY = 'flametown-save-v1'; // localStorage key for saved prototype state.
export const DRAW_COST_AMOUNT = 20; // Goods cost to refill the hand by drawing up to its limit.
export const MARKET_STARTER_COST_ANY_AMOUNT = 100; // Cost of a starter offer, paid as one chosen goods type.
export const MARKET_RANDOM_COST_PER_GOOD_AMOUNT = 50; // Cost per goods token on a non-starter market offer.
export const MARKET_RANDOM_COST_GOOD_TYPES = 2; // Number of different goods types required for a non-starter market offer.
export const MARKET_REFRESH_COST_AMOUNT = 300; // Cost to reroll the shop, paid as one chosen goods type.

export const ZOOM_MIN = 0.3; // Lowest camera zoom allowed during play.
export const ZOOM_MAX = 20.0; // Highest camera zoom allowed during play.
export const CAMERA_PAN_SPEED = 300; // Target keyboard pan speed in world units per second once the camera reaches full glide speed.
export const CAMERA_PAN_ACCELERATION = 1400; // How quickly keyboard camera pan ramps up toward CAMERA_PAN_SPEED, in world units per second squared.
export const CAMERA_PAN_DECELERATION = 1400; // How quickly keyboard camera pan slows down after key release or direction changes, in world units per second squared.

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
export const CITY_ICON_ZOOM_START = 2.2; // Built-cell type icons start fading in once camera zoom drops to this value or below.
export const CITY_ICON_ZOOM_FULL = 1.5; // Built-cell type icons reach full size/opacity once camera zoom drops to this value or below.
export const CLUSTER_HIGHLIGHT_FILL = 'rgba(255, 214, 102, 0.24)'; // Fill color used for non-source cells in the hovered cluster.
export const CLUSTER_HIGHLIGHT_SOURCE_FILL = 'rgba(255, 232, 150, 0.42)'; // Stronger fill color used for the cell directly under the pointer.
export const CLUSTER_HIGHLIGHT_STROKE = 'rgba(255, 227, 163, 0.55)'; // Stroke color used to outline hovered cluster cells.

export const ROAD_WIDTH_AT_CITY_ICON_ZOOM_START = 14; // Road width in screen pixels at CITY_ICON_ZOOM_START; roads scale proportionally with camera zoom from this reference.
export const ROAD_TEXTURE_PATH = 'assets/tiles/Road.png'; // Texture path for close-up roads.
export const ROAD_TEXTURE_ZOOM_FULL = 2; // Close-up road texture reaches full strength at this zoom; at CITY_ICON_ZOOM_START roads still match the old flat rendering.

export const RESIDENT_SPRITE_PATH = 'assets/dragons/dragon_bread.png'; // Sprite used for residents walking around the city.
export const RESIDENT_EDGE_SPEED = 4; // Base world-units-per-second speed used when a resident moves along a non-road edge.
export const RESIDENT_ROAD_SPEED = 7; // World-units-per-second speed used when a resident moves along a road edge.
export const RESIDENT_WORLD_HEIGHT = 6; // Approximate world-space height of a resident sprite before camera zoom.
export const RESIDENT_PIVOT_X = 0.72; // Horizontal sprite pivot expressed as a fraction of sprite width, aligned near the resident's feet.
export const RESIDENT_WALK_SCALE_Y_AMPLITUDE = 0.18; // Peak y-scale variation applied while a resident is moving.
export const RESIDENT_WALK_BOB_DISTANCE = 7; // World distance traveled per full y-scale bob cycle.
