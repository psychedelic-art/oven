import type { AgentNodeTypeDefinition } from './types';

// ─── Agent Node Type Registry ───────────────────────────────
// Defines all available node types with their visual config,
// inspector form fields, and default values.

export const agentNodeTypes: AgentNodeTypeDefinition[] = [
  {
    slug: 'llm',
    label: 'LLM',
    category: 'AI',
    color: '#7C4DFF',
    icon: '🧠',
    description: 'Call a language model to generate text or reason',
    defaultConfig: { model: 'fast', temperature: 0.7, systemPrompt: '' },
    configFields: [
      { name: 'model', label: 'Model', type: 'select', options: [
        { value: 'fast', label: 'Fast (GPT-4o-mini)' },
        { value: 'smart', label: 'Smart (GPT-4o)' },
        { value: 'claude', label: 'Claude (Sonnet)' },
      ], defaultValue: 'fast' },
      { name: 'temperature', label: 'Temperature', type: 'number', defaultValue: 0.7, helperText: '0 = deterministic, 2 = creative' },
      { name: 'systemPrompt', label: 'System Prompt', type: 'textarea', defaultValue: '', helperText: 'Override agent system prompt for this node' },
    ],
  },
  {
    slug: 'tool-executor',
    label: 'Tool Executor',
    category: 'Tools',
    color: '#00BCD4',
    icon: '🔧',
    description: 'Execute tool calls returned by a previous LLM node',
    defaultConfig: {},
    configFields: [
      { name: 'toolName', label: 'Tool Name', type: 'text', helperText: 'Specific tool to execute (leave empty for auto-dispatch)' },
    ],
  },
  {
    slug: 'condition',
    label: 'Condition',
    category: 'Logic',
    color: '#FF9800',
    icon: '🔀',
    description: 'Branch the workflow based on a condition',
    defaultConfig: { field: '', operator: '==', value: '' },
    configFields: [
      { name: 'field', label: 'Field', type: 'text', helperText: 'Context path to evaluate (e.g., llmCall.text)' },
      { name: 'operator', label: 'Operator', type: 'select', options: [
        { value: '==', label: 'Equals (==)' },
        { value: '!=', label: 'Not Equals (!=)' },
        { value: '>', label: 'Greater Than (>)' },
        { value: '<', label: 'Less Than (<)' },
        { value: 'exists', label: 'Exists' },
        { value: 'contains', label: 'Contains' },
        { value: 'empty', label: 'Is Empty' },
      ], defaultValue: '==' },
      { name: 'value', label: 'Compare Value', type: 'text' },
    ],
  },
  {
    slug: 'transform',
    label: 'Transform',
    category: 'Logic',
    color: '#AB47BC',
    icon: '🔄',
    description: 'Reshape data using $.path mapping',
    defaultConfig: { mapping: {} },
    configFields: [
      { name: 'mapping', label: 'Output Mapping', type: 'json', defaultValue: {}, helperText: '{"outputKey": "$.sourceNode.field"}' },
    ],
  },
  {
    slug: 'rag',
    label: 'RAG Retrieval',
    category: 'Knowledge',
    color: '#4CAF50',
    icon: '📚',
    description: 'Search the knowledge base for relevant context',
    defaultConfig: { maxResults: 5, confidenceThreshold: 0.6 },
    configFields: [
      { name: 'query', label: 'Search Query', type: 'text', helperText: 'Use $.path to reference context (e.g., $.trigger.question)' },
      { name: 'knowledgeBaseId', label: 'Knowledge Base ID', type: 'number', helperText: 'Optional: specific KB to search' },
      { name: 'maxResults', label: 'Max Results', type: 'number', defaultValue: 5 },
      { name: 'confidenceThreshold', label: 'Confidence Threshold', type: 'number', defaultValue: 0.6, helperText: '0.0–1.0 (lower = more recall, higher = more precision)' },
    ],
  },
  {
    slug: 'memory',
    label: 'Memory',
    category: 'Knowledge',
    color: '#66BB6A',
    icon: '💾',
    description: 'Read from or write to agent long-term memory',
    defaultConfig: { mode: 'read' },
    configFields: [
      { name: 'mode', label: 'Mode', type: 'select', options: [
        { value: 'read', label: 'Read (search)' },
        { value: 'write', label: 'Write (store)' },
      ], defaultValue: 'read' },
      { name: 'key', label: 'Memory Key', type: 'text', helperText: 'Topic/namespace for the memory' },
      { name: 'query', label: 'Search Query (read mode)', type: 'text' },
      { name: 'content', label: 'Content (write mode)', type: 'textarea' },
    ],
  },
  {
    slug: 'human-review',
    label: 'Human Review',
    category: 'Control',
    color: '#FFC107',
    icon: '👤',
    description: 'Pause workflow and wait for human approval',
    defaultConfig: { reason: '' },
    configFields: [
      { name: 'reason', label: 'Review Reason', type: 'textarea', helperText: 'Why is human review needed?' },
      { name: 'proposal', label: 'Proposal', type: 'text', helperText: 'Use $.path to reference the proposed action' },
    ],
  },
  {
    slug: 'subagent',
    label: 'Subagent',
    category: 'AI',
    color: '#9C27B0',
    icon: '🤖',
    description: 'Invoke another agent to handle a sub-task',
    defaultConfig: { agentSlug: '' },
    configFields: [
      { name: 'agentSlug', label: 'Agent Slug', type: 'text', helperText: 'Slug of the agent to invoke' },
      { name: 'message', label: 'Message', type: 'textarea', helperText: 'Message to send to the subagent (use $.path)' },
    ],
  },
  {
    slug: 'prompt',
    label: 'Prompt Assembly',
    category: 'AI',
    color: '#E040FB',
    icon: '📝',
    description: 'Build a system prompt from a template',
    defaultConfig: { template: '' },
    configFields: [
      { name: 'template', label: 'Prompt Template', type: 'textarea', helperText: 'Use {{var}} for variable substitution' },
      { name: 'variables', label: 'Variables', type: 'json', defaultValue: {}, helperText: '{"var": "$.path.to.value"}' },
    ],
  },
  {
    slug: 'switch',
    label: 'Switch / Router',
    category: 'Logic',
    color: '#FF6F00',
    icon: '🔀',
    description: 'Route to different paths based on a field value. Supports multiple outputs.',
    defaultConfig: { field: '', cases: {} },
    configFields: [
      { name: 'field', label: 'Route Field', type: 'text', helperText: 'Context field to evaluate (e.g., classify.text)' },
      { name: 'cases', label: 'Cases (JSON)', type: 'json', defaultValue: { urgent: 'handleUrgent', normal: 'handleNormal', default: 'fallback' }, helperText: '{"value": "targetNodeId", "default": "fallbackNodeId"}' },
    ],
  },
  {
    slug: 'loop',
    label: 'Loop (Iterate)',
    category: 'Logic',
    color: '#5E35B1',
    icon: '🔁',
    description: 'Repeat a node for each item in a collection or while a condition holds.',
    defaultConfig: { type: 'forEach', collection: '', maxIterations: 10 },
    configFields: [
      { name: 'type', label: 'Loop Type', type: 'select', options: [
        { value: 'forEach', label: 'For Each (iterate collection)' },
        { value: 'while', label: 'While (repeat until condition)' },
      ], defaultValue: 'forEach' },
      { name: 'collection', label: 'Collection ($.path)', type: 'text', helperText: 'Path to array for forEach (e.g., $.rag.context)' },
      { name: 'maxIterations', label: 'Max Iterations', type: 'number', defaultValue: 10, helperText: 'Safety limit' },
    ],
  },
  {
    slug: 'setVariable',
    label: 'Set Variable',
    category: 'Logic',
    color: '#FFB300',
    icon: '📌',
    description: 'Set a variable in the workflow context for use by downstream nodes.',
    defaultConfig: { variableName: '', value: '' },
    configFields: [
      { name: 'variableName', label: 'Variable Name', type: 'text', helperText: 'Name of the variable to set' },
      { name: 'value', label: 'Value', type: 'text', helperText: 'Value to assign (use $.path to reference context)' },
    ],
  },
  {
    slug: 'end',
    label: 'End',
    category: 'Control',
    color: '#EF5350',
    icon: '🏁',
    description: 'Terminal node — workflow execution ends here',
    defaultConfig: {},
    configFields: [],
  },
];

// ─── Lookup Helpers ─────────────────────────────────────────

export function getNodeType(slug: string): AgentNodeTypeDefinition | undefined {
  return agentNodeTypes.find(n => n.slug === slug);
}

export function getNodeTypesByCategory(): Record<string, AgentNodeTypeDefinition[]> {
  const grouped: Record<string, AgentNodeTypeDefinition[]> = {};
  for (const node of agentNodeTypes) {
    const group = grouped[node.category] ?? [];
    group.push(node);
    grouped[node.category] = group;
  }
  return grouped;
}
