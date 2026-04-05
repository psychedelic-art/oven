import { describe, it, expect } from 'vitest';
import { compileToLangGraph } from '../engine/langgraph-compiler';
import type { AgentWorkflowDefinition } from '../types';

describe('LangGraphCompiler', () => {
  it('compiles a simple LLM → done workflow', () => {
    const definition: AgentWorkflowDefinition = {
      id: 'simple-chat',
      initial: 'llmCall',
      states: {
        llmCall: { invoke: { src: 'llm', input: { messages: [] }, onDone: 'done' } },
        done: { type: 'final' },
      },
    };
    const result = compileToLangGraph(definition);
    expect(result.nodes).toEqual(['llmCall']);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toEqual({ from: 'llmCall', to: 'END' });
    expect(result.entryPoint).toBe('llmCall');
    expect(result.code).toContain('StateGraph');
    expect(result.code).toContain("graph.set_entry_point('llmCall')");
    expect(result.code).toContain("graph.add_edge('llmCall', END)");
  });

  it('compiles a multi-node workflow with RAG + LLM', () => {
    const definition: AgentWorkflowDefinition = {
      id: 'rag-pipeline',
      initial: 'retrieve',
      states: {
        retrieve: { invoke: { src: 'rag', input: { query: '$.trigger.query' }, onDone: 'generate' } },
        generate: { invoke: { src: 'llm', input: { messages: [] }, onDone: 'done' } },
        done: { type: 'final' },
      },
    };
    const result = compileToLangGraph(definition);
    expect(result.nodes).toEqual(['retrieve', 'generate']);
    expect(result.edges).toHaveLength(2);
    expect(result.code).toContain("graph.add_node('retrieve'");
    expect(result.code).toContain("graph.add_node('generate'");
    expect(result.metadata.nodeCount).toBe(2);
  });

  it('detects conditional edges from guard definitions', () => {
    const definition: AgentWorkflowDefinition = {
      id: 'branching',
      initial: 'check',
      states: {
        check: {
          invoke: { src: 'condition', input: { field: 'score', operator: '>', value: 80 } },
          always: [
            { target: 'good', guard: { type: 'condition', params: { key: 'check.branch', operator: '==', value: 'true' } } },
            { target: 'bad' },
          ],
        },
        good: { invoke: { src: 'llm', input: { messages: [] }, onDone: 'done' } },
        bad: { invoke: { src: 'llm', input: { messages: [] }, onDone: 'done' } },
        done: { type: 'final' },
      },
    };
    const result = compileToLangGraph(definition);
    expect(result.metadata.hasConditionalEdges).toBe(true);
    expect(result.code).toContain('add_conditional_edges');
  });

  it('generates valid Python code with imports', () => {
    const definition: AgentWorkflowDefinition = {
      id: 'test',
      initial: 'start',
      context: { query: '', maxResults: 5 },
      states: {
        start: { invoke: { src: 'llm', input: { messages: [] }, onDone: 'done' } },
        done: { type: 'final' },
      },
    };
    const result = compileToLangGraph(definition);
    expect(result.code).toContain('from langgraph.graph import StateGraph, END');
    expect(result.code).toContain('class AgentState(TypedDict)');
    expect(result.code).toContain('query: str');
    expect(result.code).toContain('maxResults: float');
    expect(result.code).toContain('app = graph.compile()');
  });

  it('generates node functions for each node type', () => {
    const definition: AgentWorkflowDefinition = {
      id: 'multi-type',
      initial: 'rag',
      states: {
        rag: { invoke: { src: 'rag', input: { query: '$.trigger.query' }, onDone: 'memory' } },
        memory: { invoke: { src: 'memory', input: { mode: 'write' }, onDone: 'llm' } },
        llm: { invoke: { src: 'llm', input: { messages: [] }, onDone: 'done' } },
        done: { type: 'final' },
      },
    };
    const result = compileToLangGraph(definition);
    expect(result.code).toContain('RAG retrieval node');
    expect(result.code).toContain('Memory read/write node');
    expect(result.code).toContain('LLM invocation node');
    expect(result.nodes).toHaveLength(3);
  });
});
