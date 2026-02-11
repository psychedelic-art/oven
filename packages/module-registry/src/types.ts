import type { NextRequest, NextResponse } from 'next/server';
import type { ComponentType } from 'react';
import type { EventHandler, EventPayload } from './event-bus';

// Route handler function signature (Next.js App Router)
export type RouteHandler = (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

// Map of route patterns to HTTP method handlers
export type ApiHandlerMap = Record<
  string,
  Partial<Record<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', RouteHandler>>
>;

// React Admin resource configuration
export interface ResourceConfig {
  name: string;
  list?: ComponentType<any>;
  edit?: ComponentType<any>;
  create?: ComponentType<any>;
  show?: ComponentType<any>;
  icon?: ComponentType<any>;
  options?: Record<string, unknown>;
}

// React Admin custom route
export interface CustomRouteConfig {
  path: string;
  component: ComponentType<any>;
}

// Sidebar menu item
export interface MenuItemConfig {
  label: string;
  to: string;
  icon?: ComponentType<any>;
}

/**
 * Describes a single parameter in an event payload.
 * Used for documentation, autocomplete, and wiring transform hints.
 */
export interface EventParamSchema {
  /** JS type: 'number' | 'string' | 'boolean' | 'object' | 'array' */
  type: 'number' | 'string' | 'boolean' | 'object' | 'array';
  /** Human-readable description shown in UI */
  description?: string;
  /** Whether this field is always present */
  required?: boolean;
  /** Example value for documentation */
  example?: unknown;
}

/**
 * Describes the full payload contract for a single event.
 * Keys are the parameter names, values describe the parameter.
 */
export type EventPayloadSchema = Record<string, EventParamSchema>;

/**
 * Map of event name → payload schema for all events a module emits.
 */
export type EventSchemaMap = Record<string, EventPayloadSchema>;

/**
 * Describes a single config entry that a module supports.
 * Acts as a typed contract for the module's configurable constants.
 * Values are stored in the moduleConfigs table with 3-tier cascade:
 *   instance (per mapId/playerId) → module-level → schema default
 */
export interface ConfigSchemaEntry {
  /** Config key identifier, e.g., "START_CELL_POSITION" */
  key: string;
  /** JS type of the value */
  type: 'number' | 'string' | 'boolean' | 'object' | 'array';
  /** Human-readable description */
  description: string;
  /** Default value when no DB row exists (schema-level default) */
  defaultValue: unknown;
  /** If true, can be overridden per instance (e.g., per mapId, per playerId) */
  instanceScoped?: boolean;
  /** Example value for documentation/UI */
  example?: unknown;
}

// The core contract every module must implement
export interface ModuleDefinition {
  /** Unique module identifier: "maps", "players", "inventory" */
  name: string;

  /** Other modules this one requires (validated at registration) */
  dependencies?: string[];

  /** Drizzle table definitions keyed by table name */
  schema: Record<string, unknown>;

  /** Optional seed function */
  seed?: (db: any) => Promise<void>;

  /** React Admin CRUD resources */
  resources: ResourceConfig[];

  /** React Admin custom pages */
  customRoutes?: CustomRouteConfig[];

  /** Sidebar navigation entries */
  menuItems?: MenuItemConfig[];

  /** Next.js API route handlers grouped by route pattern */
  apiHandlers: ApiHandlerMap;

  /** Typed config schema — declares available config keys and their defaults */
  configSchema?: ConfigSchemaEntry[];

  /** Event bus integration */
  events?: {
    /** Events this module emits (for documentation/discovery) */
    emits?: string[];
    /** Event listeners: event name → handler */
    listeners?: Record<string, EventHandler<EventPayload>>;
    /**
     * Typed parameter schemas for emitted events.
     * Used by the wiring editor for autocomplete and transform validation.
     * Key = full event name (e.g. "maps.tile.created"), value = param schema.
     */
    schemas?: EventSchemaMap;
  };
}
