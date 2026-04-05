import { getDb } from '@oven/module-registry/db';
import { permissions } from '@oven/module-roles/schema';
import { agentNodeDefinitions } from './schema';

export async function seedAgentCore(db: ReturnType<typeof getDb>) {
  console.log('[module-agent-core] Starting seed...');

  // ─── 1. Permissions (idempotent via onConflictDoNothing) ──
  const modulePermissions = [
    { resource: 'agents', action: 'read', slug: 'agents.read', description: 'View agents' },
    { resource: 'agents', action: 'create', slug: 'agents.create', description: 'Create agents' },
    { resource: 'agents', action: 'update', slug: 'agents.update', description: 'Edit agents' },
    { resource: 'agents', action: 'delete', slug: 'agents.delete', description: 'Delete agents' },
    { resource: 'agents', action: 'invoke', slug: 'agents.invoke', description: 'Invoke agents' },
    { resource: 'agent-nodes', action: 'read', slug: 'agent-nodes.read', description: 'View node definitions' },
    { resource: 'agent-nodes', action: 'create', slug: 'agent-nodes.create', description: 'Create nodes' },
    { resource: 'agent-sessions', action: 'read', slug: 'agent-sessions.read', description: 'View sessions' },
    { resource: 'agent-sessions', action: 'create', slug: 'agent-sessions.create', description: 'Create sessions' },
    { resource: 'agent-executions', action: 'read', slug: 'agent-executions.read', description: 'View executions' },
  ];
  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // ─── 2. Built-in node definitions (delete+recreate per Rule 12) ──
  await db.delete(agentNodeDefinitions);
  const builtInNodes = [
    {
      name: 'LLM', slug: 'llm', category: 'llm', isSystem: true,
      description: 'Language model invocation — sends messages to LLM and returns response or tool calls',
      inputs: [
        { name: 'messages', type: 'array', description: 'Conversation message history', required: true },
        { name: 'model', type: 'string', description: 'Model alias (e.g., fast, smart, claude)', required: false },
        { name: 'systemPrompt', type: 'string', description: 'System prompt override', required: false },
        { name: 'temperature', type: 'number', description: 'Sampling temperature (0-2)', required: false },
      ],
      outputs: [
        { name: 'text', type: 'string', description: 'Generated text response' },
        { name: 'toolCalls', type: 'array', description: 'Tool call requests (if any)' },
        { name: 'tokens', type: 'object', description: 'Token usage { input, output, total }' },
      ],
      code: `async function execute({ input, context, config }) {\n  const { aiGenerateText } = require('@oven/module-ai');\n  const result = await aiGenerateText({\n    prompt: input.messages[input.messages.length - 1]?.content,\n    model: input.model || config.model || 'fast',\n    system: input.systemPrompt || config.systemPrompt,\n    temperature: input.temperature ?? config.temperature,\n  });\n  return { text: result.text, toolCalls: null, tokens: result.tokens };\n}`,
    },
    {
      name: 'Tool Executor', slug: 'tool-executor', category: 'tool', isSystem: true,
      description: 'Execute tool calls returned by LLM node — resolves endpoints via Tool Wrapper',
      inputs: [
        { name: 'toolCalls', type: 'array', description: 'Array of tool call requests from LLM', required: true },
      ],
      outputs: [
        { name: 'toolResults', type: 'array', description: 'Array of tool execution results' },
      ],
      code: `async function execute({ input, context, config }) {\n  const { executeTool } = require('@oven/module-agent-core');\n  const results = [];\n  for (const call of input.toolCalls || []) {\n    const result = await executeTool(call.tool, call.args);\n    results.push({ name: call.name, result });\n  }\n  return { toolResults: results };\n}`,
    },
    {
      name: 'Condition', slug: 'condition', category: 'condition', isSystem: true,
      description: 'Branch flow based on state evaluation (guards)',
      inputs: [
        { name: 'field', type: 'string', description: 'Context field to evaluate', required: true },
        { name: 'operator', type: 'string', description: 'Comparison operator (==, !=, >, <, exists)', required: true },
        { name: 'value', type: 'string', description: 'Value to compare against', required: false },
      ],
      outputs: [
        { name: 'branch', type: 'string', description: 'Result: "true" or "false"' },
      ],
      code: `async function execute({ input, context, config }) {\n  const fieldValue = context[input.field];\n  let result = false;\n  switch (input.operator) {\n    case '==': result = fieldValue == input.value; break;\n    case '!=': result = fieldValue != input.value; break;\n    case '>': result = fieldValue > input.value; break;\n    case '<': result = fieldValue < input.value; break;\n    case 'exists': result = fieldValue != null; break;\n  }\n  return { branch: result ? 'true' : 'false' };\n}`,
    },
    {
      name: 'Transform', slug: 'transform', category: 'transform', isSystem: true,
      description: 'Reshape, filter, or enrich state data before passing to next node',
      inputs: [
        { name: 'data', type: 'object', description: 'Input data to transform', required: true },
        { name: 'mapping', type: 'object', description: 'Key-value mapping of output fields to $.path expressions', required: false },
      ],
      outputs: [
        { name: 'result', type: 'object', description: 'Transformed output data' },
      ],
      code: `async function execute({ input, context, config }) {\n  const result = {};\n  const mapping = input.mapping || config.mapping || {};\n  for (const [outKey, srcPath] of Object.entries(mapping)) {\n    result[outKey] = context[srcPath] ?? input.data?.[srcPath];\n  }\n  return { result };\n}`,
    },
    {
      name: 'Human Review', slug: 'human-review', category: 'human-in-the-loop', isSystem: true,
      description: 'Pause execution and wait for human approval, edit, or rejection',
      inputs: [
        { name: 'proposal', type: 'object', description: 'Proposed action for review', required: true },
        { name: 'reason', type: 'string', description: 'Why review is needed', required: false },
      ],
      outputs: [
        { name: 'decision', type: 'string', description: 'Human decision: approve, edit, reject' },
        { name: 'feedback', type: 'string', description: 'Optional human feedback or edits' },
      ],
      code: `async function execute({ input, context, config }) {\n  // The workflow engine handles pause/resume.\n  // This code runs AFTER the human provides a decision.\n  return {\n    decision: input.decision || 'approve',\n    feedback: input.feedback || null,\n  };\n}`,
    },
    {
      name: 'Memory', slug: 'memory', category: 'memory', isSystem: true,
      description: 'Read from or write to agent long-term memory store',
      inputs: [
        { name: 'mode', type: 'string', description: '"read" or "write"', required: true },
        { name: 'query', type: 'string', description: 'Search query (for read mode)', required: false },
        { name: 'content', type: 'string', description: 'Content to store (for write mode)', required: false },
        { name: 'key', type: 'string', description: 'Memory key/topic', required: false },
      ],
      outputs: [
        { name: 'memories', type: 'array', description: 'Retrieved memories (read mode)' },
        { name: 'stored', type: 'boolean', description: 'Whether write was successful' },
      ],
      code: `async function execute({ input, context, config }) {\n  if (input.mode === 'read') {\n    // TODO: Use module-ai embeddings + vector store for semantic retrieval\n    return { memories: [], stored: false };\n  } else {\n    // TODO: Use module-ai to embed and store in vector DB\n    return { memories: [], stored: true };\n  }\n}`,
    },
  ];
  for (const node of builtInNodes) {
    await db.insert(agentNodeDefinitions).values(node);
  }

  console.log('[module-agent-core] Seeded 10 permissions + 6 built-in node definitions');
}
