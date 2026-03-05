import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { moduleConfigs } from './schema';

// Select types (read from DB)
export type ConfigEntry = InferSelectModel<typeof moduleConfigs>;

// Insert types (write to DB)
export type NewConfigEntry = InferInsertModel<typeof moduleConfigs>;

// Config scope — determines specificity of a config entry
export type ConfigScope = 'module' | 'instance';

// Source tier returned by the cascade resolver
export type ConfigSource =
  | 'tenant-instance'
  | 'tenant-module'
  | 'platform-instance'
  | 'platform-module'
  | 'schema'
  | 'default';

// Single-key resolve result
export interface ResolveResult {
  key: string;
  value: unknown;
  source: ConfigSource;
  tenantId: number | null;
  scopeId: string | null;
}

// Batch resolve result
export interface BatchResolveResult {
  results: Record<string, { value: unknown; source: ConfigSource }>;
}
