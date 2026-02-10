import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
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

const eventSchemas: EventSchemaMap = {
  'maps.tile.created': {
    id: { type: 'number', description: 'Tile definition DB ID', required: true, example: 1 },
    tileId: { type: 'number', description: 'Tile numeric ID (0-65535)', required: true, example: 3 },
    name: { type: 'string', description: 'Tile name', required: true, example: 'Grass' },
    colorHex: { type: 'string', description: 'Color in #RRGGBBAA', required: true, example: '#4CAF50FF' },
    flags: { type: 'number', description: 'Bitmask flags (Walk=1, Swim=2, etc.)', required: true, example: 1 },
    category: { type: 'string', description: 'terrain | decoration | obstacle', required: true, example: 'terrain' },
  },
  'maps.tile.updated': {
    id: { type: 'number', description: 'Tile definition DB ID', required: true },
    tileId: { type: 'number', description: 'Tile numeric ID', required: true },
    name: { type: 'string', description: 'Tile name', required: true },
    colorHex: { type: 'string', description: 'Color in #RRGGBBAA', required: true },
    flags: { type: 'number', description: 'Bitmask flags', required: true },
    category: { type: 'string', description: 'Tile category', required: true },
  },
  'maps.tile.deleted': {
    id: { type: 'number', description: 'Tile definition DB ID', required: true },
    name: { type: 'string', description: 'Tile name (before deletion)', required: true },
  },
  'maps.config.created': {
    id: { type: 'number', description: 'Config DB ID', required: true },
    name: { type: 'string', description: 'Config name', required: true, example: 'Default World' },
    isActive: { type: 'boolean', description: 'Whether config is active', required: true },
    mapMode: { type: 'string', description: 'discovery | ai_generated | prebuilt', required: true },
  },
  'maps.config.updated': {
    id: { type: 'number', description: 'Config DB ID', required: true },
    name: { type: 'string', description: 'Config name', required: true },
    isActive: { type: 'boolean', description: 'Whether config is active', required: true },
    mapMode: { type: 'string', description: 'Map mode', required: true },
  },
  'maps.config.activated': {
    id: { type: 'number', description: 'Activated config ID', required: true, example: 1 },
    name: { type: 'string', description: 'Config name', required: true },
    isActive: { type: 'boolean', description: 'Always true', required: true, example: true },
    previousActiveId: { type: 'number', description: 'Previously active config ID' },
  },
  'maps.map.created': {
    id: { type: 'number', description: 'Map DB ID', required: true },
    name: { type: 'string', description: 'Map name', required: true, example: 'Overworld' },
    mode: { type: 'string', description: 'Map mode', required: true },
    status: { type: 'string', description: 'Map status', required: true, example: 'draft' },
    worldConfigId: { type: 'number', description: 'Associated config ID' },
    seed: { type: 'number', description: 'Generation seed' },
  },
  'maps.map.deleted': {
    id: { type: 'number', description: 'Map DB ID', required: true },
    name: { type: 'string', description: 'Map name (before deletion)', required: true },
  },
  'maps.map.generated': {
    id: { type: 'number', description: 'Map DB ID', required: true },
    name: { type: 'string', description: 'Map name', required: true },
    status: { type: 'string', description: 'Status after generation', required: true, example: 'ready' },
    totalChunks: { type: 'number', description: 'Chunks generated', required: true, example: 25 },
  },
};

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
    schemas: eventSchemas,
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
