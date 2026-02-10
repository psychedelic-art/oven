import type { ModuleDefinition } from '@oven/module-registry';
import { playersSchema } from './schema';
import { seedPlayers } from './seed';
import * as playersHandler from './api/players.handler';
import * as playersByIdHandler from './api/players-by-id.handler';
import * as playersPositionsHandler from './api/players-positions.handler';
import * as sessionsHandler from './api/sessions.handler';
import * as sessionsByIdHandler from './api/sessions-by-id.handler';
import * as sessionsActiveHandler from './api/sessions-active.handler';

export const playersModule: ModuleDefinition = {
  name: 'players',
  dependencies: ['maps'],
  schema: playersSchema,
  seed: seedPlayers,
  resources: [
    { name: 'players', options: { label: 'Players' } },
    { name: 'sessions', options: { label: 'Sessions' } },
  ],
  menuItems: [
    { label: 'Players', to: '/players' },
    { label: 'Sessions', to: '/sessions' },
  ],
  events: {
    emits: [
      'players.player.created',
      'players.player.updated',
      'players.player.banned',
      'players.session.started',
      'players.session.ended',
      'players.position.recorded',
    ],
    listeners: {
      'maps.config.activated': async (payload) => {
        console.log(`[players] Map config activated:`, payload);
        // Could auto-update player defaults, reset positions, etc.
      },
    },
  },
  apiHandlers: {
    'players': { GET: playersHandler.GET, POST: playersHandler.POST },
    'players/[id]': { GET: playersByIdHandler.GET, PUT: playersByIdHandler.PUT },
    'players/[id]/positions': { GET: playersPositionsHandler.GET, POST: playersPositionsHandler.POST },
    'sessions': { GET: sessionsHandler.GET },
    'sessions/[id]': { GET: sessionsByIdHandler.GET },
    'sessions/active': { GET: sessionsActiveHandler.GET },
  },
};

export { playersSchema } from './schema';
export { seedPlayers } from './seed';
export * from './types';
