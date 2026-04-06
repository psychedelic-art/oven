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
    {
      name: '02 - RAG Q&A Assistant',
      slug: 'example-rag-qa',
      description: 'Retrieves relevant knowledge from the KB before answering. Demonstrates the RAG pattern: retrieve → generate.',
      category: 'assistant',
      tags: ['basic', 'rag', 'knowledge-base'],
      definition: {
        id: 'rag-qa', initial: 'retrieve',
        states: {
          retrieve: { invoke: { src: 'rag', input: { query: '$.trigger.question', tenantId: '$.trigger.tenantId', maxResults: 5 }, onDone: 'answer' } },
          answer: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: '$.trigger.question' }], systemPrompt: 'Use this context to answer:\n$.retrieve.context' }, onDone: 'done' } },
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
          think: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'You can call tools. Decide what to do.' }, onDone: 'act' } },
          act: { invoke: { src: 'tool-executor', input: { toolCalls: '$.think.toolCalls' }, onDone: 'synthesize', onError: 'synthesize' } },
          synthesize: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: 'Tool results: $.act.toolResults\nSummarize the findings.' }] }, onDone: 'done' } },
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
          review: { invoke: { src: 'human-review', input: { proposal: '$.draft.text', reason: 'Review before sending to user' } } },
          checkApproval: { invoke: { src: 'condition', input: { field: 'review.decision', operator: '==', value: 'approve' } },
            always: [
              { target: 'deliver', guard: { type: 'condition', params: { key: 'checkApproval.branch', operator: '==', value: 'true' } } },
              { target: 'done' },
            ],
          },
          deliver: { invoke: { src: 'llm', input: { messages: [{ role: 'assistant', content: '$.draft.text' }] }, onDone: 'done' } },
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
          recall: { invoke: { src: 'memory', input: { mode: 'read', query: '$.trigger.question', key: 'user-context' }, onDone: 'respond' } },
          respond: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: '$.trigger.question' }], systemPrompt: 'Previous context: $.recall.memories\nUse this context to personalize your response.' }, onDone: 'remember' } },
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
          route: { invoke: { src: 'switch', input: { field: 'classify.text', cases: { urgent: 'escalate', normal: 'selfServe', default: 'selfServe' } } },
            always: [
              { target: 'escalate', guard: { type: 'condition', params: { key: 'route.matchedCase', operator: '==', value: 'urgent' } } },
              { target: 'selfServe' },
            ],
          },
          escalate: { invoke: { src: 'subagent', input: { agentSlug: 'senior-support', message: '$.trigger.messages' }, onDone: 'done' } },
          selfServe: { invoke: { src: 'rag', input: { query: '$.trigger.messages', maxResults: 3 }, onDone: 'answer' } },
          answer: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'Answer using FAQ context: $.selfServe.context' }, onDone: 'done' } },
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
          research: { invoke: { src: 'rag', input: { query: '$.trigger.topic', maxResults: 10 }, onDone: 'analyze' } },
          analyze: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: 'Analyze these findings in depth:\n$.research.context' }], systemPrompt: 'You are a research analyst. Provide detailed analysis with key insights.' }, onDone: 'summarize' } },
          summarize: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: 'Summarize this analysis concisely (3-5 bullet points):\n$.analyze.text' }] }, onDone: 'done' } },
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
        id: 'planner', initial: 'buildPrompt',
        states: {
          buildPrompt: { invoke: { src: 'prompt', input: { template: 'Create a step-by-step plan to: {{goal}}\nList each step clearly.', variables: { goal: '$.trigger.goal' } }, onDone: 'plan' } },
          plan: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: '$.buildPrompt.systemPrompt' }] }, onDone: 'evaluate' } },
          evaluate: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: 'Review this plan. Are tools needed? Reply "yes" or "no".\n$.plan.text' }] }, onDone: 'checkTools' } },
          checkTools: { invoke: { src: 'condition', input: { field: 'evaluate.text', operator: 'contains', value: 'yes' } },
            always: [
              { target: 'executePlan', guard: { type: 'condition', params: { key: 'checkTools.branch', operator: '==', value: 'true' } } },
              { target: 'refine' },
            ],
          },
          executePlan: { invoke: { src: 'tool-executor', input: { toolCalls: '$.evaluate.toolCalls' }, onDone: 'refine', onError: 'refine' } },
          refine: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: 'Refine and finalize based on: Plan: $.plan.text\nResults: $.executePlan' }] }, onDone: 'done' } },
          done: { type: 'final' },
        },
      },
      agentConfig: { model: 'smart', temperature: 0.5, maxSteps: 25, toolBindings: ['*'] },
    },

    // ─── 9. ADVANCED: Guardrailed Content Generator ──────────
    {
      name: '09 - Guardrailed Content Generator',
      slug: 'example-guardrailed-content',
      description: 'Generates content with safety guardrails: pre-check input → generate → post-check output → deliver or reject.',
      category: 'assistant',
      tags: ['advanced', 'guardrails', 'safety', 'content'],
      definition: {
        id: 'guardrailed-content', initial: 'checkInput',
        states: {
          checkInput: { invoke: { src: 'condition', input: { field: 'trigger.message', operator: 'exists' } },
            always: [
              { target: 'generate', guard: { type: 'condition', params: { key: 'checkInput.branch', operator: '==', value: 'true' } } },
              { target: 'reject' },
            ],
          },
          generate: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'Generate helpful, safe content.' }, onDone: 'validateOutput' } },
          validateOutput: { invoke: { src: 'condition', input: { field: 'generate.text', operator: 'exists' } },
            always: [
              { target: 'deliver', guard: { type: 'condition', params: { key: 'validateOutput.branch', operator: '==', value: 'true' } } },
              { target: 'reject' },
            ],
          },
          deliver: { invoke: { src: 'transform', input: { mapping: { response: '$.generate.text', safe: 'true' } }, onDone: 'done' } },
          reject: { invoke: { src: 'transform', input: { mapping: { response: 'Request could not be processed safely.', safe: 'false' } }, onDone: 'done' } },
          done: { type: 'final' },
        },
      },
      agentConfig: { model: 'smart', temperature: 0.3, maxSteps: 15 },
    },

    // ─── 10. COMPLEX: Full Agent Orchestrator ────────────────
    {
      name: '10 - Full Agent Orchestrator',
      slug: 'example-full-orchestrator',
      description: 'Complete agent pipeline: RAG context → memory recall → prompt assembly → LLM generation → tool execution → memory write → human review. The kitchen sink example.',
      category: 'planning',
      tags: ['complex', 'full-pipeline', 'rag', 'memory', 'tools', 'human-review'],
      definition: {
        id: 'full-orchestrator', initial: 'fetchContext',
        states: {
          fetchContext: { invoke: { src: 'rag', input: { query: '$.trigger.question', maxResults: 5 }, onDone: 'recallMemory' } },
          recallMemory: { invoke: { src: 'memory', input: { mode: 'read', query: '$.trigger.question' }, onDone: 'assemblePrompt' } },
          assemblePrompt: { invoke: { src: 'prompt', input: { template: 'Context: {{context}}\nMemories: {{memories}}\nQuestion: {{question}}', variables: { context: '$.fetchContext.context', memories: '$.recallMemory.memories', question: '$.trigger.question' } }, onDone: 'generate' } },
          generate: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: '$.assemblePrompt.systemPrompt' }] }, onDone: 'checkTools' } },
          checkTools: { invoke: { src: 'condition', input: { field: 'generate.toolCalls', operator: 'exists' } },
            always: [
              { target: 'executeTools', guard: { type: 'condition', params: { key: 'checkTools.branch', operator: '==', value: 'true' } } },
              { target: 'saveMemory' },
            ],
          },
          executeTools: { invoke: { src: 'tool-executor', input: { toolCalls: '$.generate.toolCalls' }, onDone: 'saveMemory', onError: 'saveMemory' } },
          saveMemory: { invoke: { src: 'memory', input: { mode: 'write', content: '$.generate.text', key: 'conversation' }, onDone: 'review' } },
          review: { invoke: { src: 'human-review', input: { proposal: '$.generate.text', reason: 'Final review before delivery' } } },
          checkReview: { invoke: { src: 'condition', input: { field: 'review.decision', operator: '==', value: 'approve' } },
            always: [
              { target: 'done', guard: { type: 'condition', params: { key: 'checkReview.branch', operator: '==', value: 'true' } } },
              { target: 'done' },
            ],
          },
          done: { type: 'final' },
        },
      },
      agentConfig: { model: 'smart', temperature: 0.5, maxSteps: 30, toolBindings: ['*'] },
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
