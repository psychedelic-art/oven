import { registry } from '@oven/module-registry';
import { mapsModule } from '@oven/module-maps';
import { playersModule } from '@oven/module-players';

// Register modules in dependency order
registry.register(mapsModule);       // No dependencies
registry.register(playersModule);     // Depends on "maps"
