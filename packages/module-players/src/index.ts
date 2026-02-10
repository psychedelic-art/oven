import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { playersSchema } from './schema';
import { seedPlayers } from './seed';
import * as playersHandler from './api/players.handler';
import * as playersByIdHandler from './api/players-by-id.handler';

// NOTE: Sessions moved to @oven/module-sessions
// NOTE: Positions moved to @oven/module-player-map-position

const eventSchemas: EventSchemaMap = {
  'players.player.created': {
    id: { type: 'number', description: 'Player DB ID', required: true, example: 1 },
    username: { type: 'string', description: 'Unique username', required: true, example: 'hero42' },
    displayName: { type: 'string', description: 'Display name', required: true, example: 'Hero42' },
    status: { type: 'string', description: 'Player status', required: true, example: 'active' },
  },
  'players.player.updated': {
    id: { type: 'number', description: 'Player DB ID', required: true },
    username: { type: 'string', description: 'Unique username', required: true },
    displayName: { type: 'string', description: 'Display name', required: true },
    status: { type: 'string', description: 'Player status', required: true },
    totalPlayTimeSeconds: { type: 'number', description: 'Total play time in seconds', required: true },
  },
  'players.player.banned': {
    id: { type: 'number', description: 'Player DB ID', required: true },
    username: { type: 'string', description: 'Unique username', required: true },
    status: { type: 'string', description: 'Always "banned"', required: true, example: 'banned' },
  },
};

export const playersModule: ModuleDefinition = {
  name: 'players',
  dependencies: ['maps'],
  schema: playersSchema,
  seed: seedPlayers,
  resources: [
    { name: 'players', options: { label: 'Players' } },
  ],
  menuItems: [
    { label: 'Players', to: '/players' },
  ],
  events: {
    emits: [
      'players.player.created',
      'players.player.updated',
      'players.player.banned',
    ],
    schemas: eventSchemas,
    listeners: {
      'maps.config.activated': async (payload) => {
        console.log(`[players] Map config activated:`, payload);
      },
    },
  },
  apiHandlers: {
    'players': { GET: playersHandler.GET, POST: playersHandler.POST },
    'players/[id]': { GET: playersByIdHandler.GET, PUT: playersByIdHandler.PUT },
  },
};

export { playersSchema } from './schema';
export { seedPlayers } from './seed';
export * from './types';
