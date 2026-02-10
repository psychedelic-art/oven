import { registry } from '@oven/module-registry';
import { mapsModule } from '@oven/module-maps';
import { playersModule } from '@oven/module-players';
import { sessionsModule } from '@oven/module-sessions';
import { playerMapPositionModule } from '@oven/module-player-map-position';

// Register modules in dependency order
registry.register(mapsModule);                    // No deps
registry.register(playersModule);                 // Depends on: maps
registry.register(sessionsModule);                // Depends on: maps, players
registry.register(playerMapPositionModule);       // Depends on: maps, players, sessions
