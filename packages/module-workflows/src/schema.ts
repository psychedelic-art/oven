import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';
// Re-export moduleConfigs from the canonical source so other files
// (like seed.ts) can import { moduleConfigs } from './schema'
export { moduleConfigs } from '@oven/module-config/schema';
import { moduleConfigs } from '@oven/module-config/schema';

// ─── workflows ──────────────────────────────────────────────────
// Stores workflow definitions as serializable XState machine configs.
// Each workflow can optionally be triggered by an event or run manually.
export const workflows = pgTable(
  'workflows',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    slug: varchar('slug', { length: 128 }).notNull().unique(),
    description: text('description'),

    // XState machine definition (states, transitions, guards, actions)
    definition: jsonb('definition').notNull(),

    // Optional event trigger — when this event fires, auto-start the workflow
    triggerEvent: varchar('trigger_event', { length: 128 }),
    // Optional condition on the trigger event payload
    triggerCondition: jsonb('trigger_condition'),

    enabled: boolean('enabled').notNull().default(true),
    version: integer('version').notNull().default(1),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('workflows_trigger_event_idx').on(table.triggerEvent),
    index('workflows_slug_idx').on(table.slug),
  ]
);

// ─── workflow_executions ────────────────────────────────────────
// Tracks each run of a workflow with state machine context + snapshot.
export const workflowExecutions = pgTable(
  'workflow_executions',
  {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id').notNull(),

    status: varchar('status', { length: 32 }).notNull().default('pending'),
    // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

    triggerEvent: varchar('trigger_event', { length: 128 }),
    triggerPayload: jsonb('trigger_payload'),

    // XState context — accumulated data from all completed nodes
    context: jsonb('context'),
    // XState persisted snapshot — for pause/resume support
    snapshotJson: jsonb('snapshot_json'),
    // Current state name in the machine
    currentState: varchar('current_state', { length: 128 }).notNull().default('initial'),

    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    error: text('error'),
  },
  (table) => [
    index('workflow_executions_workflow_id_idx').on(table.workflowId),
    index('workflow_executions_status_idx').on(table.status),
  ]
);

// ─── node_executions ────────────────────────────────────────────
// Per-node execution tracking within a workflow run.
export const nodeExecutions = pgTable(
  'node_executions',
  {
    id: serial('id').primaryKey(),
    executionId: integer('execution_id').notNull(),

    nodeId: varchar('node_id', { length: 128 }).notNull(),
    nodeType: varchar('node_type', { length: 64 }).notNull(),
    // 'api-call' | 'event-emit' | 'condition' | 'transform' | 'delay' | 'utility'

    status: varchar('status', { length: 32 }).notNull().default('pending'),
    // 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

    input: jsonb('input'),
    output: jsonb('output'),
    error: text('error'),

    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    durationMs: integer('duration_ms'),
  },
  (table) => [
    index('node_executions_execution_id_idx').on(table.executionId),
    index('node_executions_node_id_idx').on(table.nodeId),
  ]
);

// moduleConfigs is imported from @oven/module-config/schema
// (canonical definition lives in module-config package)

// ─── workflow_versions ─────────────────────────────────────────
// Stores historical snapshots of workflow definitions for version history.
// Created automatically when a workflow definition changes.
export const workflowVersions = pgTable(
  'workflow_versions',
  {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id').notNull(),
    version: integer('version').notNull(),
    definition: jsonb('definition').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('wv_workflow_id_idx').on(table.workflowId),
    unique('wv_unique').on(table.workflowId, table.version),
  ]
);

// Export schema for registry composition
export const workflowsSchema = {
  workflows,
  workflowExecutions,
  nodeExecutions,
  moduleConfigs,
  workflowVersions,
};
