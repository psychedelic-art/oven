import type { AgentWorkflowDefinition, AgentStateDefinition, AgentConfig, GuardDefinition } from '../types';

// ─── LangGraph Compilation Output ───────────────────────────

export interface LangGraphOutput {
  code: string;
  nodes: string[];
  edges: Array<{ from: string; to: string; condition?: string }>;
  entryPoint: string;
  metadata: {
    workflowId: string;
    nodeCount: number;
    hasConditionalEdges: boolean;
    hasCycles: boolean;
  };
}

// ─── Compile Agent Workflow to LangGraph ─────────────────────
// Generates a Python-compatible LangGraph StateGraph definition from
// an AgentWorkflowDefinition. This follows the same compilation pattern
// as module-workflow-compiler (definition → code generation) but targets
// LangGraph's StateGraph API instead of XState.

export function compileToLangGraph(
  definition: AgentWorkflowDefinition,
  config?: AgentConfig,
): LangGraphOutput {
  const nodes: string[] = [];
  const edges: LangGraphOutput['edges'] = [];
  const nodeFunctions: string[] = [];
  let hasConditionalEdges = false;
  let hasCycles = false;
  const visited = new Set<string>();

  // Traverse all states to extract nodes and edges
  for (const [stateName, stateDef] of Object.entries(definition.states)) {
    if (stateDef.type === 'final') continue; // END node handled separately
    nodes.push(stateName);

    // Generate node function
    const nodeCode = generateNodeFunction(stateName, stateDef, config);
    nodeFunctions.push(nodeCode);

    // Extract edges
    const stateEdges = extractEdges(stateName, stateDef, definition);
    for (const edge of stateEdges) {
      edges.push(edge);
      if (edge.condition) hasConditionalEdges = true;
      if (visited.has(edge.to)) hasCycles = true;
    }
    visited.add(stateName);
  }

  const code = generateLangGraphCode(definition, config, nodeFunctions, nodes, edges);

  return {
    code,
    nodes,
    edges,
    entryPoint: definition.initial,
    metadata: {
      workflowId: definition.id,
      nodeCount: nodes.length,
      hasConditionalEdges,
      hasCycles,
    },
  };
}

// ─── Generate Node Function ─────────────────────────────────

function generateNodeFunction(
  stateName: string,
  stateDef: AgentStateDefinition,
  config?: AgentConfig,
): string {
  if (!stateDef.invoke) {
    return `def ${sanitize(stateName)}(state: AgentState) -> AgentState:\n    return state`;
  }

  const src = stateDef.invoke.src;
  const inputStr = stateDef.invoke.input
    ? JSON.stringify(stateDef.invoke.input, null, 4).replace(/"/g, "'")
    : '{}';

  switch (src) {
    case 'llm':
      return generateLLMNode(stateName, inputStr, config);
    case 'tool-executor':
      return generateToolNode(stateName, inputStr);
    case 'condition':
      return generateConditionNode(stateName, inputStr);
    case 'rag':
      return generateRAGNode(stateName, inputStr);
    case 'memory':
      return generateMemoryNode(stateName, inputStr);
    case 'subagent':
      return generateSubagentNode(stateName, inputStr);
    case 'prompt':
      return generatePromptNode(stateName, inputStr);
    default:
      return `def ${sanitize(stateName)}(state: AgentState) -> AgentState:\n    # Node type: ${src}\n    return state`;
  }
}

function generateLLMNode(name: string, inputStr: string, config?: AgentConfig): string {
  const model = config?.model ?? 'gpt-4o-mini';
  const temp = config?.temperature ?? 0.7;
  return `def ${sanitize(name)}(state: AgentState) -> AgentState:
    """LLM invocation node"""
    messages = state.get('messages', [])
    response = llm.invoke(
        messages,
        model='${model}',
        temperature=${temp},
    )
    return {**state, '${name}': {'text': response.content, 'tokens': response.usage_metadata}}`;
}

function generateToolNode(name: string, inputStr: string): string {
  return `def ${sanitize(name)}(state: AgentState) -> AgentState:
    """Tool execution node"""
    tool_calls = state.get('tool_calls', [])
    results = []
    for call in tool_calls:
        result = execute_tool(call['name'], call.get('args', {}))
        results.append({'name': call['name'], 'result': result, 'status': 'success'})
    return {**state, '${name}': {'toolResults': results}}`;
}

function generateConditionNode(name: string, inputStr: string): string {
  return `def ${sanitize(name)}(state: AgentState) -> str:
    """Condition routing node"""
    input_config = ${inputStr}
    field = input_config.get('field', '')
    operator = input_config.get('operator', '==')
    value = input_config.get('value')
    actual = resolve_path(state, field)
    if operator == '==' and actual == value:
        return 'true'
    elif operator == '!=' and actual != value:
        return 'true'
    elif operator == 'exists' and actual is not None:
        return 'true'
    return 'false'`;
}

function generateRAGNode(name: string, inputStr: string): string {
  return `def ${sanitize(name)}(state: AgentState) -> AgentState:
    """RAG retrieval node"""
    query = state.get('query', '')
    results = knowledge_base.hybrid_search(query=query, max_results=5)
    return {**state, '${name}': {'context': results, 'resultCount': len(results)}}`;
}

function generateMemoryNode(name: string, inputStr: string): string {
  return `def ${sanitize(name)}(state: AgentState) -> AgentState:
    """Memory read/write node"""
    mode = state.get('mode', 'read')
    if mode == 'write':
        memory_store.write(key=state.get('key', ''), content=state.get('content', ''))
        return {**state, '${name}': {'stored': True}}
    else:
        memories = memory_store.search(query=state.get('query', ''))
        return {**state, '${name}': {'memories': memories}}`;
}

function generateSubagentNode(name: string, inputStr: string): string {
  return `def ${sanitize(name)}(state: AgentState) -> AgentState:
    """Subagent invocation node"""
    agent_slug = state.get('agentSlug', '')
    result = invoke_agent(agent_slug, state.get('message', ''))
    return {**state, '${name}': {'text': result.text, 'tokens': result.tokens}}`;
}

function generatePromptNode(name: string, inputStr: string): string {
  return `def ${sanitize(name)}(state: AgentState) -> AgentState:
    """Prompt assembly node"""
    template = state.get('template', '')
    variables = state.get('variables', {})
    rendered = template
    for key, val in variables.items():
        rendered = rendered.replace('{{' + key + '}}', str(val))
    return {**state, '${name}': {'systemPrompt': rendered}}`;
}

// ─── Extract Edges ──────────────────────────────────────────

function extractEdges(
  stateName: string,
  stateDef: AgentStateDefinition,
  definition: AgentWorkflowDefinition,
): LangGraphOutput['edges'] {
  const edges: LangGraphOutput['edges'] = [];

  if (stateDef.invoke?.onDone) {
    const onDone = stateDef.invoke.onDone;
    if (typeof onDone === 'string') {
      const target = onDone === 'done' || definition.states[onDone]?.type === 'final' ? 'END' : onDone;
      edges.push({ from: stateName, to: target });
    } else if (typeof onDone === 'object' && onDone.target) {
      const target = onDone.target === 'done' || definition.states[onDone.target]?.type === 'final' ? 'END' : onDone.target;
      const condition = onDone.guard ? formatGuard(onDone.guard) : undefined;
      edges.push({ from: stateName, to: target, condition });
    }
  }

  if (stateDef.invoke?.onError) {
    edges.push({ from: stateName, to: stateDef.invoke.onError, condition: 'on_error' });
  }

  if (stateDef.always) {
    const transitions = Array.isArray(stateDef.always) ? stateDef.always : [stateDef.always];
    for (const t of transitions) {
      if (typeof t === 'string') {
        edges.push({ from: stateName, to: t });
      } else {
        const condition = t.guard ? formatGuard(t.guard) : undefined;
        edges.push({ from: stateName, to: t.target, condition });
      }
    }
  }

  return edges;
}

// ─── Generate Full LangGraph Code ───────────────────────────

function generateLangGraphCode(
  definition: AgentWorkflowDefinition,
  config: AgentConfig | undefined,
  nodeFunctions: string[],
  nodes: string[],
  edges: LangGraphOutput['edges'],
): string {
  const lines: string[] = [];

  lines.push('"""');
  lines.push(`Auto-generated LangGraph workflow: ${definition.id}`);
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push('"""');
  lines.push('');
  lines.push('from typing import TypedDict, Annotated');
  lines.push('from langgraph.graph import StateGraph, END');
  lines.push('');
  lines.push('');
  lines.push('# ─── State Definition ─────────────────────────────────');
  lines.push('');
  lines.push('class AgentState(TypedDict):');
  lines.push('    messages: list');
  lines.push('    context: dict');

  // Add context keys from definition
  if (definition.context) {
    for (const [key, val] of Object.entries(definition.context)) {
      const pyType = typeof val === 'number' ? 'float' : typeof val === 'boolean' ? 'bool' : 'str';
      lines.push(`    ${key}: ${pyType}`);
    }
  }

  lines.push('');
  lines.push('');
  lines.push('# ─── Node Functions ───────────────────────────────────');
  lines.push('');

  for (const fn of nodeFunctions) {
    lines.push(fn);
    lines.push('');
    lines.push('');
  }

  lines.push('# ─── Graph Construction ───────────────────────────────');
  lines.push('');
  lines.push('graph = StateGraph(AgentState)');
  lines.push('');

  // Add nodes
  for (const node of nodes) {
    lines.push(`graph.add_node('${node}', ${sanitize(node)})`);
  }
  lines.push('');

  // Set entry point
  lines.push(`graph.set_entry_point('${definition.initial}')`);
  lines.push('');

  // Add edges
  const conditionalEdges = new Map<string, Array<{ to: string; condition?: string }>>();
  const simpleEdges: Array<{ from: string; to: string }> = [];

  for (const edge of edges) {
    if (edge.condition) {
      const existing = conditionalEdges.get(edge.from) ?? [];
      existing.push(edge);
      conditionalEdges.set(edge.from, existing);
    } else {
      simpleEdges.push(edge);
    }
  }

  for (const edge of simpleEdges) {
    lines.push(`graph.add_edge('${edge.from}', ${edge.to === 'END' ? 'END' : `'${edge.to}'`})`);
  }

  for (const [from, targets] of conditionalEdges.entries()) {
    lines.push(`graph.add_conditional_edges('${from}', ${sanitize(from)}, {`);
    for (const t of targets) {
      lines.push(`    '${t.condition ?? 'default'}': ${t.to === 'END' ? 'END' : `'${t.to}'`},`);
    }
    lines.push('})');
  }

  lines.push('');
  lines.push('# ─── Compile ─────────────────────────────────────────');
  lines.push('');
  lines.push('app = graph.compile()');
  lines.push('');

  return lines.join('\n');
}

// ─── Helpers ────────────────────────────────────────────────

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

function formatGuard(guard: GuardDefinition): string {
  return `${guard.params.key} ${guard.params.operator} ${guard.params.value ?? ''}`.trim();
}
