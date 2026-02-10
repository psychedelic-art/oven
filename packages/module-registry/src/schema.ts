import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// ─── event_wirings ──────────────────────────────────────────────
// Connects a source module's event to a target module's action.
// This is the "state machine" glue: when sourceEvent fires,
// the wiring runtime calls targetAction on the target module.
export const eventWirings = pgTable(
  'event_wirings',
  {
    id: serial('id').primaryKey(),

    // Source: which module + event triggers this wiring
    sourceModule: varchar('source_module', { length: 64 }).notNull(),
    sourceEvent: varchar('source_event', { length: 128 }).notNull(),

    // Target: which module + action gets called
    targetModule: varchar('target_module', { length: 64 }).notNull(),
    targetAction: varchar('target_action', { length: 128 }).notNull(),

    // Optional JSONata/simple transform expression applied to payload
    // e.g. { "playerId": "$.id", "mapName": "$.name" }
    transform: jsonb('transform'),

    // Optional condition — simple key-value match on payload
    // e.g. { "status": "active" } means only fire if payload.status === "active"
    condition: jsonb('condition'),

    // Human-readable label for the wiring
    label: varchar('label', { length: 128 }),
    description: text('description'),

    enabled: boolean('enabled').notNull().default(true),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('event_wirings_source_idx').on(table.sourceModule, table.sourceEvent),
    index('event_wirings_target_idx').on(table.targetModule, table.targetAction),
  ]
);

export const registrySchema = {
  eventWirings,
};
