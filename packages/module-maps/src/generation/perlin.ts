import { createNoise2D } from 'simplex-noise';

// Biome thresholds matching Unity's ProceduralChunkProvider
const DEFAULT_BIOME_THRESHOLDS = {
  water: 0.3,
  dirt: 0.45,
  grass: 0.75,
};

// Tile IDs matching the seeded tile_definitions
// 1=Grass, 2=Dirt, 3=Water, 4=Stone, 5=Flower, 6=Rock
const TILE_IDS = {
  GRASS: 1,
  DIRT: 2,
  WATER: 3,
  STONE: 4,
  FLOWER: 5,
  ROCK: 6,
};

export interface GenerationConfig {
  chunkSize: number;
  terrainNoiseScale: number;
  terrainNoiseOffset: number;
  decorationNoiseScale: number;
  decorationNoiseThreshold: number;
  biomeThresholds: { water: number; dirt: number; grass: number };
  seed: number;
}

const DEFAULT_CONFIG: GenerationConfig = {
  chunkSize: 32,
  terrainNoiseScale: 0.05,
  terrainNoiseOffset: 1000.0,
  decorationNoiseScale: 0.15,
  decorationNoiseThreshold: 0.78,
  biomeThresholds: DEFAULT_BIOME_THRESHOLDS,
  seed: 42,
};

/**
 * Create a seeded PRNG for the noise function.
 * simplex-noise accepts an optional random function.
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generate chunk tile data as a Uint16Array of tileIds (chunkSize x chunkSize).
 * Matches Unity's ProceduralChunkProvider noise logic.
 */
export function generateChunkData(
  chunkX: number,
  chunkY: number,
  config: Partial<GenerationConfig> = {}
): Uint16Array {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const size = cfg.chunkSize;
  const totalTiles = size * size;
  const tiles = new Uint16Array(totalTiles);

  // Create noise functions with seed
  const rng = seededRandom(cfg.seed);
  const terrainNoise = createNoise2D(rng);
  const decoRng = seededRandom(cfg.seed + 12345);
  const decoNoise = createNoise2D(decoRng);

  const thresholds = cfg.biomeThresholds;

  for (let localY = 0; localY < size; localY++) {
    for (let localX = 0; localX < size; localX++) {
      const worldTileX = chunkX * size + localX;
      const worldTileY = chunkY * size + localY;

      // Terrain noise (matches Unity: tileX * scale + offset)
      const nx = worldTileX * cfg.terrainNoiseScale + cfg.terrainNoiseOffset;
      const ny = worldTileY * cfg.terrainNoiseScale + cfg.terrainNoiseOffset;
      const noiseVal = (terrainNoise(nx, ny) + 1) / 2; // Normalize to 0-1

      // Map to tile ID based on thresholds
      let tileId: number;
      if (noiseVal < thresholds.water) {
        tileId = TILE_IDS.WATER;
      } else if (noiseVal < thresholds.dirt) {
        tileId = TILE_IDS.DIRT;
      } else if (noiseVal < thresholds.grass) {
        tileId = TILE_IDS.GRASS;
      } else {
        tileId = TILE_IDS.STONE;
      }

      // Decoration noise (only on grass tiles)
      if (tileId === TILE_IDS.GRASS) {
        const dnx = worldTileX * cfg.decorationNoiseScale;
        const dny = worldTileY * cfg.decorationNoiseScale;
        const decoVal = (decoNoise(dnx, dny) + 1) / 2;
        if (decoVal > cfg.decorationNoiseThreshold) {
          tileId = TILE_IDS.FLOWER;
        }
      }

      // Rock decoration on stone
      if (tileId === TILE_IDS.STONE) {
        const dnx = worldTileX * cfg.decorationNoiseScale * 1.5;
        const dny = worldTileY * cfg.decorationNoiseScale * 1.5;
        const decoVal = (decoNoise(dnx, dny) + 1) / 2;
        if (decoVal > 0.85) {
          tileId = TILE_IDS.ROCK;
        }
      }

      tiles[localY * size + localX] = tileId;
    }
  }

  return tiles;
}

/**
 * Encode tile data as base64 string (Uint16 little-endian).
 * Format: raw bytes of Uint16Array → base64
 */
export function encodeTileData(tiles: Uint16Array): string {
  const buffer = Buffer.from(tiles.buffer, tiles.byteOffset, tiles.byteLength);
  return buffer.toString('base64');
}

/**
 * Decode base64 tile data back to Uint16Array.
 */
export function decodeTileData(base64: string): Uint16Array {
  const buffer = Buffer.from(base64, 'base64');
  return new Uint16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
}

/**
 * Generate a chunk and return it as a base64-encoded layerData string.
 */
export function generateChunkLayerData(
  chunkX: number,
  chunkY: number,
  config: Partial<GenerationConfig> = {}
): string {
  const tiles = generateChunkData(chunkX, chunkY, config);
  return encodeTileData(tiles);
}
