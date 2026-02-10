import type { ModuleDefinition } from '@oven/module-registry';
import { mapsSchema } from './schema';
import { seedMaps } from './seed';
import * as tilesHandler from './api/tiles.handler';
import * as tilesByIdHandler from './api/tiles-by-id.handler';
import * as worldConfigsHandler from './api/world-configs.handler';
import * as worldConfigsByIdHandler from './api/world-configs-by-id.handler';
import * as worldConfigsActivateHandler from './api/world-configs-activate.handler';
import * as mapsHandler from './api/maps.handler';
import * as mapsByIdHandler from './api/maps-by-id.handler';
import * as mapsChunksHandler from './api/maps-chunks.handler';
import * as mapsGenerateHandler from './api/maps-generate.handler';

export const mapsModule: ModuleDefinition = {
  name: 'maps',
  schema: mapsSchema,
  seed: seedMaps,
  resources: [
    { name: 'tiles', options: { label: 'Tile Definitions' } },
    { name: 'world-configs', options: { label: 'World Configs' } },
    { name: 'maps', options: { label: 'Maps' } },
  ],
  menuItems: [
    { label: 'Tiles', to: '/tiles' },
    { label: 'World Configs', to: '/world-configs' },
    { label: 'Maps', to: '/maps' },
  ],
  events: {
    emits: [
      'maps.tile.created',
      'maps.tile.updated',
      'maps.tile.deleted',
      'maps.config.created',
      'maps.config.updated',
      'maps.config.activated',
      'maps.map.created',
      'maps.map.deleted',
      'maps.map.generated',
    ],
  },
  apiHandlers: {
    'tiles': { GET: tilesHandler.GET, POST: tilesHandler.POST },
    'tiles/[id]': { GET: tilesByIdHandler.GET, PUT: tilesByIdHandler.PUT, DELETE: tilesByIdHandler.DELETE },
    'world-configs': { GET: worldConfigsHandler.GET, POST: worldConfigsHandler.POST },
    'world-configs/[id]': { GET: worldConfigsByIdHandler.GET, PUT: worldConfigsByIdHandler.PUT, DELETE: worldConfigsByIdHandler.DELETE },
    'world-configs/[id]/activate': { POST: worldConfigsActivateHandler.POST },
    'maps': { GET: mapsHandler.GET, POST: mapsHandler.POST },
    'maps/[id]': { GET: mapsByIdHandler.GET, PUT: mapsByIdHandler.PUT, DELETE: mapsByIdHandler.DELETE },
    'maps/[id]/chunks': { GET: mapsChunksHandler.GET, POST: mapsChunksHandler.POST },
    'maps/[id]/generate': { POST: mapsGenerateHandler.POST },
  },
};

export { mapsSchema } from './schema';
export { seedMaps } from './seed';
export * from './types';
