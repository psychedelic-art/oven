import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { playerMapPositionSchema } from './schema';
import { seedPlayerMapPosition } from './seed';
import * as assignmentsHandler from './api/assignments.handler';
import * as assignmentsByIdHandler from './api/assignments-by-id.handler';
import * as assignmentsActiveHandler from './api/assignments-active.handler';
import * as positionsHandler from './api/positions.handler';
import * as visitedChunksHandler from './api/visited-chunks.handler';

const eventSchemas: EventSchemaMap = {
  'position.player.assigned': {
    playerId: { type: 'number', description: 'Player being assigned', required: true, example: 1 },
    mapId: { type: 'number', description: 'Map being assigned to', required: true, example: 1 },
    isActive: { type: 'boolean', description: 'Whether assignment is active', required: true, example: true },
    spawnTileX: { type: 'number', description: 'Spawn tile X', required: true, example: 0 },
    spawnTileY: { type: 'number', description: 'Spawn tile Y', required: true, example: 0 },
    assignedAt: { type: 'string', description: 'ISO timestamp of assignment', required: true },
  },
  'position.player.left': {
    playerId: { type: 'number', description: 'Player who left', required: true },
    mapId: { type: 'number', description: 'Map that was left', required: true },
    isActive: { type: 'boolean', description: 'Always false', required: true, example: false },
    leftAt: { type: 'string', description: 'ISO timestamp of departure', required: true },
    currentTileX: { type: 'number', description: 'Last tile X position' },
    currentTileY: { type: 'number', description: 'Last tile Y position' },
  },
  'position.player.moved': {
    playerId: { type: 'number', description: 'Player who moved', required: true },
    sessionId: { type: 'number', description: 'Active session ID', required: true },
    mapId: { type: 'number', description: 'Map the player is on', required: true },
    tileX: { type: 'number', description: 'Current tile X', required: true, example: 5 },
    tileY: { type: 'number', description: 'Current tile Y', required: true, example: 12 },
    chunkX: { type: 'number', description: 'Current chunk X', required: true, example: 0 },
    chunkY: { type: 'number', description: 'Current chunk Y', required: true, example: 0 },
    worldX: { type: 'number', description: 'World position X (float)', required: true, example: 5.5 },
    worldY: { type: 'number', description: 'World position Y (float)', required: true, example: 12.3 },
    recordedAt: { type: 'string', description: 'ISO timestamp of recording', required: true },
  },
  'position.chunk.visited': {
    playerId: { type: 'number', description: 'Player who visited', required: true },
    mapId: { type: 'number', description: 'Map containing the chunk', required: true },
    chunkX: { type: 'number', description: 'Chunk X coordinate', required: true, example: 2 },
    chunkY: { type: 'number', description: 'Chunk Y coordinate', required: true, example: -1 },
    firstVisitedAt: { type: 'string', description: 'ISO timestamp of first visit', required: true },
    visitCount: { type: 'number', description: 'Total visit count', required: true, example: 3 },
  },
};

export const playerMapPositionModule: ModuleDefinition = {
  name: 'player-map-position',
  dependencies: ['maps', 'players', 'sessions'],
  schema: playerMapPositionSchema,
  seed: seedPlayerMapPosition,
  resources: [
    { name: 'map-assignments', options: { label: 'Map Assignments' } },
    { name: 'player-positions', options: { label: 'Player Positions' } },
  ],
  menuItems: [
    { label: 'Map Assignments', to: '/map-assignments' },
  ],
  events: {
    emits: [
      'position.player.assigned',
      'position.player.left',
      'position.player.moved',
      'position.chunk.visited',
    ],
    schemas: eventSchemas,
    listeners: {
      'sessions.session.started': async (payload) => {
        console.log('[player-map-position] Session started, auto-assigning map:', payload);
        // TODO: Auto-create/activate map assignment when session starts
      },
      'sessions.session.ended': async (payload) => {
        console.log('[player-map-position] Session ended, updating position:', payload);
        // TODO: Update currentTileX/Y on assignment when session ends
      },
    },
  },
  apiHandlers: {
    'map-assignments': { GET: assignmentsHandler.GET, POST: assignmentsHandler.POST },
    'map-assignments/[id]': { GET: assignmentsByIdHandler.GET, PUT: assignmentsByIdHandler.PUT },
    'map-assignments/active': { GET: assignmentsActiveHandler.GET },
    'player-positions': { GET: positionsHandler.GET, POST: positionsHandler.POST },
    'visited-chunks': { GET: visitedChunksHandler.GET, POST: visitedChunksHandler.POST },
  },
};

export { playerMapPositionSchema } from './schema';
export { seedPlayerMapPosition } from './seed';
export * from './types';
