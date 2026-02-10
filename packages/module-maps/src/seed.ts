import { tileDefinitions, worldConfigs } from './schema';
import { TileFlags } from './types';

export async function seedMaps(db: any): Promise<void> {
  // Seed 6 tile definitions matching Unity's RuntimeTileRegistry
  const tiles = [
    {
      tileId: 1,
      name: 'Grass',
      colorHex: '#4CAF50FF',
      flags: TileFlags.Walkable,
      category: 'terrain',
      description: 'Standard walkable grass terrain',
    },
    {
      tileId: 2,
      name: 'Dirt',
      colorHex: '#8B6914FF',
      flags: TileFlags.Walkable,
      category: 'terrain',
      description: 'Walkable dirt path',
    },
    {
      tileId: 3,
      name: 'Water',
      colorHex: '#2196F3FF',
      flags: TileFlags.Swimmable,
      category: 'terrain',
      description: 'Non-walkable water tile',
    },
    {
      tileId: 4,
      name: 'Stone',
      colorHex: '#9E9E9EFF',
      flags: TileFlags.Walkable | TileFlags.Elevated,
      category: 'terrain',
      description: 'Elevated stone terrain',
    },
    {
      tileId: 5,
      name: 'Flower',
      colorHex: '#E94F79FF',
      flags: TileFlags.Walkable,
      category: 'decoration',
      description: 'Decorative flower on walkable ground',
    },
    {
      tileId: 6,
      name: 'Rock',
      colorHex: '#66666BFF',
      flags: TileFlags.None,
      category: 'obstacle',
      description: 'Non-walkable rock obstacle',
    },
  ];

  for (const tile of tiles) {
    await db
      .insert(tileDefinitions)
      .values(tile)
      .onConflictDoNothing({ target: tileDefinitions.tileId });
  }

  // Seed 1 default world config
  await db
    .insert(worldConfigs)
    .values({
      name: 'Default',
      isActive: true,
      chunkSize: 32,
      loadRadius: 2,
      maxLoadsPerFrame: 2,
      tilemapPoolSize: 30,
      terrainNoiseScale: 0.05,
      terrainNoiseOffset: 1000.0,
      decorationNoiseScale: 0.15,
      decorationNoiseThreshold: 0.78,
      biomeThresholds: { water: 0.3, dirt: 0.45, grass: 0.75 },
      playerMoveSpeed: 5.0,
      playerColor: { r: 1, g: 0.8, b: 0.2, a: 1 },
      cameraOrthoSize: 8.0,
      cameraSmoothSpeed: 10.0,
      cameraBgColor: { r: 0.051, g: 0.106, b: 0.165 },
      directionBias: -0.5,
      mapMode: 'discovery',
    })
    .onConflictDoNothing({ target: worldConfigs.name });

  console.log('[module-maps] Seeded 6 tile definitions + 1 default world config');
}
