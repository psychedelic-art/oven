import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { sessionsSchema } from './schema';
import { seedSessions } from './seed';
import * as sessionsHandler from './api/sessions.handler';
import * as sessionsByIdHandler from './api/sessions-by-id.handler';
import * as sessionsActiveHandler from './api/sessions-active.handler';

const eventSchemas: EventSchemaMap = {
  'sessions.session.started': {
    id: { type: 'number', description: 'Session DB ID', required: true, example: 1 },
    playerId: { type: 'number', description: 'Player who started session', required: true, example: 1 },
    mapId: { type: 'number', description: 'Map the session is on', required: true, example: 1 },
    startedAt: { type: 'string', description: 'ISO timestamp of session start', required: true },
    startTileX: { type: 'number', description: 'Starting tile X coordinate' },
    startTileY: { type: 'number', description: 'Starting tile Y coordinate' },
  },
  'sessions.session.ended': {
    id: { type: 'number', description: 'Session DB ID', required: true },
    playerId: { type: 'number', description: 'Player who ended session', required: true },
    mapId: { type: 'number', description: 'Map the session was on', required: true },
    startedAt: { type: 'string', description: 'ISO timestamp of session start', required: true },
    endedAt: { type: 'string', description: 'ISO timestamp of session end', required: true },
    endTileX: { type: 'number', description: 'Ending tile X coordinate' },
    endTileY: { type: 'number', description: 'Ending tile Y coordinate' },
    tilesTraveled: { type: 'number', description: 'Total tiles traversed', required: true },
    chunksLoaded: { type: 'number', description: 'Total chunks loaded', required: true },
  },
};

export const sessionsModule: ModuleDefinition = {
  name: 'sessions',
  dependencies: ['maps', 'players'],
  schema: sessionsSchema,
  seed: seedSessions,
  resources: [
    { name: 'sessions', options: { label: 'Sessions' } },
  ],
  menuItems: [
    { label: 'Sessions', to: '/sessions' },
  ],
  events: {
    emits: [
      'sessions.session.started',
      'sessions.session.ended',
    ],
    schemas: eventSchemas,
    listeners: {
      'players.player.banned': async (payload) => {
        console.log('[sessions] Player banned, should end active sessions:', payload);
        // TODO: End all active sessions for banned player
      },
    },
  },
  apiHandlers: {
    'sessions': { GET: sessionsHandler.GET, POST: sessionsHandler.POST },
    'sessions/[id]': { GET: sessionsByIdHandler.GET, PUT: sessionsByIdHandler.PUT },
    'sessions/active': { GET: sessionsActiveHandler.GET },
  },
};

export { sessionsSchema } from './schema';
export { seedSessions } from './seed';
export * from './types';
