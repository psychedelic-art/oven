import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

export async function seedWorkflowAgents(db: NeonHttpDatabase<Record<string, never>>) {
  console.log('[module-workflow-agents] Seed complete (no seed data needed — uses agent_node_definitions from agent-core)');
}
