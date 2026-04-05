import { getDb } from '@oven/module-registry/db';
import { mcpServerDefinitions } from '../schema';
import { eq, and } from 'drizzle-orm';
import type { AgentWorkflowDefinition } from '../types';

// ─── MCP Tool Schema ────────────────────────────────────────

export interface MCPToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

// ─── Compile Workflow to MCP Tool ───────────────────────────
// Extracts input parameters from the workflow definition's context schema
// and generates an MCP-compatible tool definition.

export function compileWorkflowToToolSchema(
  workflow: { name: string; slug: string; description?: string | null; definition: AgentWorkflowDefinition },
): MCPToolSchema {
  const properties: Record<string, { type: string; description?: string }> = {};
  const required: string[] = [];

  // Extract input schema from definition.context keys
  const context = workflow.definition.context ?? {};
  for (const [key, value] of Object.entries(context)) {
    const type = typeof value === 'number' ? 'number'
      : typeof value === 'boolean' ? 'boolean'
      : 'string';
    properties[key] = { type, description: `Input parameter: ${key}` };
    required.push(key);
  }

  return {
    name: `workflow.${workflow.slug}`,
    description: workflow.description ?? `Execute workflow: ${workflow.name}`,
    inputSchema: {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    },
  };
}

// ─── Compile and Store MCP Server Definition ────────────────
// Generates the tool schema and upserts into mcp_server_definitions table.

export async function compileAndStoreMCP(
  workflow: {
    id: number;
    tenantId: number | null;
    name: string;
    slug: string;
    description: string | null;
    definition: AgentWorkflowDefinition;
  },
): Promise<{ id: number; slug: string }> {
  const db = getDb();
  const toolSchema = compileWorkflowToToolSchema(workflow);
  const serverSlug = `wf-${workflow.slug}`;

  // Check if definition already exists
  const existing = await db.select().from(mcpServerDefinitions)
    .where(and(
      eq(mcpServerDefinitions.slug, serverSlug),
      eq(mcpServerDefinitions.tenantId, workflow.tenantId!),
    ))
    .limit(1);

  if (existing.length > 0) {
    // Update
    const [updated] = await db.update(mcpServerDefinitions).set({
      name: `Workflow: ${workflow.name}`,
      description: workflow.description,
      toolDefinitions: [toolSchema],
      updatedAt: new Date(),
    }).where(eq(mcpServerDefinitions.id, existing[0].id)).returning();
    return { id: updated.id as number, slug: serverSlug };
  }

  // Insert
  const [created] = await db.insert(mcpServerDefinitions).values({
    tenantId: workflow.tenantId,
    workflowId: workflow.id,
    name: `Workflow: ${workflow.name}`,
    slug: serverSlug,
    description: workflow.description,
    toolDefinitions: [toolSchema],
    enabled: true,
  }).returning();

  return { id: created.id as number, slug: serverSlug };
}
