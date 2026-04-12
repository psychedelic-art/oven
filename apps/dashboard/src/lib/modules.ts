import { registry } from '@oven/module-registry';
import { mapsModule } from '@oven/module-maps';
import { playersModule } from '@oven/module-players';
import { sessionsModule } from '@oven/module-sessions';
import { playerMapPositionModule } from '@oven/module-player-map-position';
import { workflowsModule } from '@oven/module-workflows';
import { rolesModule } from '@oven/module-roles';
import { configModule } from '@oven/module-config';
import { tenantsModule } from '@oven/module-tenants';
import { subscriptionsModule } from '@oven/module-subscriptions';
import { authModule, registerAuthAdapter } from '@oven/module-auth';
import { authJsAdapter } from '@oven/auth-authjs';
import { formsModule } from '@oven/module-forms';
import { flowsModule } from '@oven/module-flows';
import { uiFlowsModule } from '@oven/module-ui-flows';
import { aiModule } from '@oven/module-ai';
import { filesModule } from '@oven/module-files';
import { knowledgeBaseModule } from '@oven/module-knowledge-base';
import { agentCoreModule } from '@oven/module-agent-core';
import { chatModule } from '@oven/module-chat';
import { workflowAgentsModule } from '@oven/module-workflow-agents';
import {
  notificationsModule,
  registerNotificationAdapter,
} from '@oven/module-notifications';
import { metaAdapter } from '@oven/notifications-meta';

// Register auth adapter before module registration
registerAuthAdapter(authJsAdapter);

// Register modules in dependency order
registry.register(mapsModule);                    // No deps
registry.register(playersModule);                 // Depends on: maps
registry.register(sessionsModule);                // Depends on: maps, players
registry.register(playerMapPositionModule);       // Depends on: maps, players, sessions
registry.register(workflowsModule);              // No deps
registry.register(rolesModule);                  // No deps (scans others for API discovery)
registry.register(configModule);                 // No deps
registry.register(tenantsModule);                // Depends on: config
registry.register(filesModule);                  // Depends on: tenants
registry.register(subscriptionsModule);          // Depends on: config, tenants
registry.register(aiModule);                     // Depends on: subscriptions
registry.register(knowledgeBaseModule);          // Depends on: ai
registry.register(agentCoreModule);             // Depends on: ai
registry.register(chatModule);                  // Depends on: agent-core, ai
registry.register(workflowAgentsModule);        // Depends on: workflows, agent-core, ai
registry.register(notificationsModule);          // Depends on: config, tenants, agent-core
registry.register(authModule);                   // Depends on: roles
registry.register(formsModule);                  // Depends on: roles
registry.register(flowsModule);                  // Depends on: roles
registry.register(uiFlowsModule);               // Depends on: forms, tenants
