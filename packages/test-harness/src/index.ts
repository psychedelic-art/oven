export { bootstrapHarness, type HarnessHandle, type BootstrapOptions, type SchemaSet } from './bootstrap';
export { createPgliteDb } from './pglite-driver';
export { EventRecorder, type RecordedEvent } from './event-recorder';
export { consumeSSE, collectSSE, type SSEEvent } from './sse-consumer';
export {
  mockAiModule,
  resetMockAi,
  queueAssistant,
  queueToolCall,
  queueEmbedding,
  getMockAiCalls,
  type QueuedAssistant,
  type QueuedToolCall,
  type QueuedTurn,
} from './mock-ai';
export {
  seedTenant,
  seedKnowledgeBaseRow,
  seedKbCategory,
  seedKbEntry,
  seedAgentWorkflow,
  seedWorkflowExecution,
  oneHotEmbedding,
  type SeedTenantOpts,
  type SeedKbEntryOpts,
  type SeedAgentWorkflowOpts,
  type SeedWorkflowExecutionOpts,
} from './fixtures';
