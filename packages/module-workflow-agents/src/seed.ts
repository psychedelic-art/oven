import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { agentWorkflows } from './schema';

export async function seedWorkflowAgents(db: NeonHttpDatabase<Record<string, never>>) {
  // Delete existing example workflows
  const { eq } = await import('drizzle-orm');
  await db.delete(agentWorkflows).where(eq(agentWorkflows.isTemplate, true));

  const examples: Array<{
    name: string; slug: string; description: string; category: string;
    tags: string[]; definition: Record<string, unknown>; agentConfig: Record<string, unknown>;
  }> = [
    // ─── 1. BASIC: Simple Chatbot ────────────────────────────
    {
      name: '01 - Simple Chatbot',
      slug: 'example-simple-chatbot',
      description: 'The simplest possible agent: takes a message, generates a response. Good for testing basic LLM connectivity.',
      category: 'assistant',
      tags: ['basic', 'chat', 'beginner'],
      definition: {
        id: 'simple-chatbot', initial: 'respond',
        states: {
          respond: { invoke: { src: 'llm', input: { messages: '$.trigger.messages' }, onDone: 'done' } },
          done: { type: 'final' },
        },
      },
      agentConfig: { model: 'fast', temperature: 0.7, maxSteps: 5 },
    },

    // ─── 2. BASIC: RAG Q&A ──────────────────────────────────
    // Flow: search KB → answer using context
    // The RAG node outputs { context: [...results], resultCount, query }
    // The LLM node reads $.trigger.message as prompt and $.retrieve.context as system context
    {
      name: '02 - RAG Q&A Assistant',
      slug: 'example-rag-qa',
      description: 'Retrieves relevant knowledge from the KB before answering. Flow: RAG search → LLM answer with retrieved context.',
      category: 'assistant',
      tags: ['basic', 'rag', 'knowledge-base'],
      definition: {
        id: 'rag-qa', initial: 'retrieve',
        states: {
          retrieve: { invoke: { src: 'rag', input: { query: '$.trigger.message', maxResults: 5 }, onDone: 'answer' } },
          answer: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'You are a helpful assistant. Use the following knowledge base results to answer the question. If the results are not relevant, say so.\n\nKnowledge Base Results: $.retrieve.context' }, onDone: 'done' } },
          done: { type: 'final' },
        },
      },
      agentConfig: { model: 'smart', temperature: 0.5, maxSteps: 10 },
    },

    // ─── 3. INTERMEDIATE: Tool-Calling Agent ─────────────────
    {
      name: '03 - Tool-Calling Agent',
      slug: 'example-tool-agent',
      description: 'LLM thinks → calls tools → synthesizes results. Demonstrates the ReAct pattern with tool execution.',
      category: 'assistant',
      tags: ['intermediate', 'tools', 'react-pattern'],
      definition: {
        id: 'tool-agent', initial: 'think',
        states: {
          think: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'You can call tools to help answer. Decide what tools to use.' }, onDone: 'act' } },
          act: { invoke: { src: 'tool-executor', input: { toolCalls: '$.think.toolCalls' }, onDone: 'synthesize', onError: 'synthesize' } },
          synthesize: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'Synthesize the tool results into a helpful answer.\n\nTool Results: $.act.toolResults' }, onDone: 'done' } },
          done: { type: 'final' },
        },
      },
      agentConfig: { model: 'smart', temperature: 0.3, maxSteps: 15, toolBindings: ['*'] },
    },

    // ─── 4. INTERMEDIATE: Approval Gate ──────────────────────
    {
      name: '04 - Human Approval Gate',
      slug: 'example-approval-gate',
      description: 'LLM drafts a response, human reviews it. If approved, delivers; if rejected, stops. Demonstrates HITL pattern.',
      category: 'approval',
      tags: ['intermediate', 'human-review', 'hitl'],
      definition: {
        id: 'approval-gate', initial: 'draft',
        states: {
          draft: { invoke: { src: 'llm', input: { messages: '$.trigger.messages' }, onDone: 'review' } },
          review: { invoke: { src: 'human-review', input: { proposal: '$.draft.text', reason: 'Review this AI response before sending to user' } } },
          checkApproval: { invoke: { src: 'condition', input: { field: 'review.decision', operator: '==', value: 'approve' } },
            always: [
              { target: 'done', guard: { type: 'condition', params: { key: 'checkApproval.branch', operator: '==', value: 'true' } } },
              { target: 'done' },
            ],
          },
          done: { type: 'final' },
        },
      },
      agentConfig: { model: 'smart', temperature: 0.7, maxSteps: 10 },
    },

    // ─── 5. INTERMEDIATE: Memory-Enhanced ────────────────────
    {
      name: '05 - Memory-Enhanced Agent',
      slug: 'example-memory-agent',
      description: 'Reads past memories → responds → writes new memories. Demonstrates persistent agent memory across sessions.',
      category: 'memory',
      tags: ['intermediate', 'memory', 'persistent'],
      definition: {
        id: 'memory-agent', initial: 'recall',
        states: {
          recall: { invoke: { src: 'memory', input: { mode: 'read', query: '$.trigger.message', key: 'user-context' }, onDone: 'respond' } },
          respond: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'You are a helpful assistant with memory. Use previous context to personalize responses.\n\nPrevious memories: $.recall.memories' }, onDone: 'remember' } },
          remember: { invoke: { src: 'memory', input: { mode: 'write', content: '$.respond.text', key: 'user-context' }, onDone: 'done' } },
          done: { type: 'final' },
        },
      },
      agentConfig: { model: 'smart', temperature: 0.7, maxSteps: 10 },
    },

    // ─── 6. ADVANCED: Support Triage Router ──────────────────
    {
      name: '06 - Support Triage Router',
      slug: 'example-support-triage',
      description: 'Classifies support requests → routes urgent to senior agent, normal to FAQ. Demonstrates the switch/routing pattern.',
      category: 'triage',
      tags: ['advanced', 'routing', 'switch', 'classification'],
      definition: {
        id: 'support-triage', initial: 'classify',
        states: {
          classify: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'Classify this support request. Reply with exactly one word: "urgent" or "normal".' }, onDone: 'route' } },
          route: { invoke: { src: 'condition', input: { field: 'classify.text', operator: 'contains', value: 'urgent' } },
            always: [
              { target: 'escalate', guard: { type: 'condition', params: { key: 'route.branch', operator: '==', value: 'true' } } },
              { target: 'selfServe' },
            ],
          },
          escalate: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'This is an URGENT support request. Provide immediate, detailed help.' }, onDone: 'done' } },
          selfServe: { invoke: { src: 'rag', input: { query: '$.trigger.message', maxResults: 3 }, onDone: 'answer' } },
          answer: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'Answer using these FAQ results:\n$.selfServe.context' }, onDone: 'done' } },
          done: { type: 'final' },
        },
      },
      agentConfig: { model: 'fast', temperature: 0.3, maxSteps: 15 },
    },

    // ─── 7. ADVANCED: Research Pipeline ──────────────────────
    {
      name: '07 - Research + Analyze + Summarize',
      slug: 'example-research-pipeline',
      description: 'Multi-step research: retrieve knowledge → deep analysis → concise summary. Demonstrates sequential multi-LLM reasoning.',
      category: 'research',
      tags: ['advanced', 'multi-step', 'analysis', 'summary'],
      definition: {
        id: 'research-pipeline', initial: 'research',
        states: {
          research: { invoke: { src: 'rag', input: { query: '$.trigger.message', maxResults: 10 }, onDone: 'analyze' } },
          analyze: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'You are a research analyst. Analyze these findings in depth with key insights.\n\nResearch Results: $.research.context' }, onDone: 'summarize' } },
          summarize: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'Summarize this analysis concisely in 3-5 bullet points.\n\nAnalysis: $.analyze.text' }, onDone: 'done' } },
          done: { type: 'final' },
        },
      },
      agentConfig: { model: 'smart', temperature: 0.4, maxSteps: 15 },
    },

    // ─── 8. ADVANCED: Multi-Step Planner ─────────────────────
    {
      name: '08 - Plan + Execute + Refine',
      slug: 'example-planner',
      description: 'Creates a plan → evaluates feasibility → executes tools → refines output. Demonstrates the planning-execution pattern.',
      category: 'planning',
      tags: ['advanced', 'planning', 'multi-step', 'tools'],
      definition: {
        id: 'planner', initial: 'plan',
        states: {
          plan: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'Create a step-by-step plan to accomplish the users goal. List each step clearly.' }, onDone: 'evaluate' } },
          evaluate: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'Review this plan and determine if tools are needed. Reply "yes" or "no" followed by explanation.\n\nPlan: $.plan.text' }, onDone: 'checkTools' } },
          checkTools: { invoke: { src: 'condition', input: { field: 'evaluate.text', operator: 'contains', value: 'yes' } },
            always: [
              { target: 'refine', guard: { type: 'condition', params: { key: 'checkTools.branch', operator: '==', value: 'true' } } },
              { target: 'refine' },
            ],
          },
          refine: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'Provide the final refined answer based on:\nPlan: $.plan.text\nEvaluation: $.evaluate.text' }, onDone: 'done' } },
          done: { type: 'final' },
        },
      },
      agentConfig: { model: 'smart', temperature: 0.5, maxSteps: 20 },
    },

    // ─── 9. BASIC: System Prompt Customizer ──────────────────
    {
      name: '09 - Custom System Prompt Agent',
      slug: 'example-custom-prompt',
      description: 'Assembles a dynamic system prompt from a template, then generates a response. Demonstrates the prompt assembly pattern.',
      category: 'assistant',
      tags: ['basic', 'prompt', 'customization'],
      definition: {
        id: 'custom-prompt', initial: 'buildPrompt',
        states: {
          buildPrompt: { invoke: { src: 'prompt', input: { template: 'You are {{role}}. Your expertise is {{expertise}}. Always respond in {{style}} style.', variables: { role: 'a friendly tutor', expertise: 'explaining complex topics simply', style: 'conversational' } }, onDone: 'respond' } },
          respond: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: '$.buildPrompt.systemPrompt' }, onDone: 'done' } },
          done: { type: 'final' },
        },
      },
      agentConfig: { model: 'fast', temperature: 0.7, maxSteps: 5 },
    },

    // ─── 10. COMPLEX: Full Agent Orchestrator ────────────────
    {
      name: '10 - Full Agent Orchestrator',
      slug: 'example-full-orchestrator',
      description: 'Complete agent pipeline: RAG context → memory recall → LLM generation → memory write. The kitchen sink example.',
      category: 'planning',
      tags: ['complex', 'full-pipeline', 'rag', 'memory'],
      definition: {
        id: 'full-orchestrator', initial: 'fetchContext',
        states: {
          fetchContext: { invoke: { src: 'rag', input: { query: '$.trigger.message', maxResults: 5 }, onDone: 'recallMemory' } },
          recallMemory: { invoke: { src: 'memory', input: { mode: 'read', query: '$.trigger.message' }, onDone: 'generate' } },
          generate: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'You are a comprehensive assistant. Use all available context.\n\nKnowledge Base: $.fetchContext.context\n\nMemories: $.recallMemory.memories' }, onDone: 'saveMemory' } },
          saveMemory: { invoke: { src: 'memory', input: { mode: 'write', content: '$.generate.text', key: 'conversation' }, onDone: 'done' } },
          done: { type: 'final' },
        },
      },
      agentConfig: { model: 'smart', temperature: 0.5, maxSteps: 20 },
    },
  ];

  for (const ex of examples) {
    await db.insert(agentWorkflows).values({
      tenantId: null,
      name: ex.name,
      slug: ex.slug,
      description: ex.description,
      definition: ex.definition,
      agentConfig: ex.agentConfig,
      status: 'active',
      category: ex.category,
      tags: ex.tags,
      isTemplate: true,
      templateSlug: ex.slug,
    }).onConflictDoNothing();
  }

  console.log(`[module-workflow-agents] Seeded ${examples.length} example agent workflows`);
}
