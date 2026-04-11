// ─── Template Metadata ──────────────────────────────────────

export interface WorkflowTemplate {
  slug: string;
  name: string;
  description: string;
  category: 'assistant' | 'approval' | 'research' | 'triage' | 'memory' | 'planning';
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  nodeCount: number;
  definition: Record<string, unknown>;
  agentConfig: Record<string, unknown>;
}

// ─── 8 Starter Templates ────────────────────────────────────

export const builtinTemplates: WorkflowTemplate[] = [
  {
    slug: 'basic-chat',
    name: 'Basic Chat Agent',
    description: 'Simple LLM agent that responds to user messages directly.',
    category: 'assistant',
    icon: '💬',
    difficulty: 'beginner',
    nodeCount: 2,
    definition: {
      id: 'basic-chat',
      initial: 'respond',
      states: {
        respond: { invoke: { src: 'llm', input: { messages: '$.trigger.messages' }, onDone: 'done' } },
        done: { type: 'final' },
      },
    },
    agentConfig: { model: 'fast', temperature: 0.7, maxSteps: 10 },
  },
  {
    slug: 'rag-assistant',
    name: 'RAG Assistant',
    description: 'Retrieves relevant knowledge before generating a response.',
    category: 'assistant',
    icon: '📚',
    difficulty: 'beginner',
    nodeCount: 3,
    definition: {
      id: 'rag-assistant',
      initial: 'retrieve',
      states: {
        retrieve: { invoke: { src: 'rag', input: { query: '$.trigger.question', tenantId: '$.trigger.tenantId' }, onDone: 'respond' } },
        respond: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: '$.trigger.question' }], systemPrompt: 'Use the following context to answer: $.retrieve.context' }, onDone: 'done' } },
        done: { type: 'final' },
      },
    },
    agentConfig: { model: 'smart', temperature: 0.5, maxSteps: 10 },
  },
  {
    slug: 'tool-agent',
    name: 'Tool-Using Agent',
    description: 'LLM that can call tools and process their results.',
    category: 'assistant',
    icon: '🔧',
    difficulty: 'intermediate',
    nodeCount: 4,
    definition: {
      id: 'tool-agent',
      initial: 'think',
      states: {
        think: { invoke: { src: 'llm', input: { messages: '$.trigger.messages' }, onDone: 'executeTool' } },
        executeTool: { invoke: { src: 'tool-executor', input: { toolCalls: '$.think.toolCalls' }, onDone: 'synthesize', onError: 'synthesize' } },
        synthesize: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: 'Synthesize the tool results: $.executeTool.toolResults' }] }, onDone: 'done' } },
        done: { type: 'final' },
      },
    },
    agentConfig: { model: 'smart', temperature: 0.3, maxSteps: 20, toolBindings: ['*'] },
  },
  {
    slug: 'approval-workflow',
    name: 'Approval Workflow',
    description: 'LLM drafts a response, human reviews before delivery.',
    category: 'approval',
    icon: '✅',
    difficulty: 'intermediate',
    nodeCount: 5,
    definition: {
      id: 'approval-workflow',
      initial: 'draft',
      states: {
        draft: { invoke: { src: 'llm', input: { messages: '$.trigger.messages' }, onDone: 'review' } },
        review: { invoke: { src: 'human-review', input: { proposal: '$.draft.text', reason: 'Review AI response before sending' }, onDone: 'checkDecision' } },
        checkDecision: { invoke: { src: 'condition', input: { field: 'review.decision', operator: '==', value: 'approve' } },
          always: [
            { target: 'deliver', guard: { type: 'condition', params: { key: 'checkDecision.branch', operator: '==', value: 'true' } } },
            { target: 'done' },
          ],
        },
        deliver: { invoke: { src: 'llm', input: { messages: [{ role: 'assistant', content: '$.draft.text' }] }, onDone: 'done' } },
        done: { type: 'final' },
      },
    },
    agentConfig: { model: 'smart', temperature: 0.7, maxSteps: 15 },
  },
  {
    slug: 'research-summarize',
    name: 'Research + Summarize',
    description: 'Retrieves information, then summarizes findings.',
    category: 'research',
    icon: '🔬',
    difficulty: 'intermediate',
    nodeCount: 4,
    definition: {
      id: 'research-summarize',
      initial: 'research',
      states: {
        research: { invoke: { src: 'rag', input: { query: '$.trigger.topic', maxResults: 10 }, onDone: 'analyze' } },
        analyze: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: 'Analyze these findings: $.research.context' }], systemPrompt: 'You are a research analyst.' }, onDone: 'summarize' } },
        summarize: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: 'Summarize concisely: $.analyze.text' }] }, onDone: 'done' } },
        done: { type: 'final' },
      },
    },
    agentConfig: { model: 'smart', temperature: 0.4, maxSteps: 15 },
  },
  {
    slug: 'support-triage',
    name: 'Support Triage',
    description: 'Classifies support requests and routes to appropriate handler.',
    category: 'triage',
    icon: '🏥',
    difficulty: 'advanced',
    nodeCount: 5,
    definition: {
      id: 'support-triage',
      initial: 'classify',
      states: {
        classify: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'Classify this support request as "urgent" or "normal". Respond with only the classification word.' }, onDone: 'route' } },
        route: { invoke: { src: 'condition', input: { field: 'classify.text', operator: 'contains', value: 'urgent' } },
          always: [
            { target: 'escalate', guard: { type: 'condition', params: { key: 'route.branch', operator: '==', value: 'true' } } },
            { target: 'respond' },
          ],
        },
        escalate: { invoke: { src: 'subagent', input: { agentSlug: 'senior-support', message: '$.trigger.messages' }, onDone: 'done' } },
        respond: { invoke: { src: 'llm', input: { messages: '$.trigger.messages', systemPrompt: 'You are a support agent. Help the user.' }, onDone: 'done' } },
        done: { type: 'final' },
      },
    },
    agentConfig: { model: 'fast', temperature: 0.3, maxSteps: 15 },
  },
  {
    slug: 'memory-enhanced',
    name: 'Memory-Enhanced Agent',
    description: 'Reads past memories before responding, writes new ones after.',
    category: 'memory',
    icon: '🧠',
    difficulty: 'intermediate',
    nodeCount: 4,
    definition: {
      id: 'memory-enhanced',
      initial: 'recall',
      states: {
        recall: { invoke: { src: 'memory', input: { mode: 'read', query: '$.trigger.question' }, onDone: 'respond' } },
        respond: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: '$.trigger.question' }], systemPrompt: 'Past memories: $.recall.memories' }, onDone: 'remember' } },
        remember: { invoke: { src: 'memory', input: { mode: 'write', content: '$.respond.text', key: 'conversation' }, onDone: 'done' } },
        done: { type: 'final' },
      },
    },
    agentConfig: { model: 'smart', temperature: 0.7, maxSteps: 10 },
  },
  {
    slug: 'multi-step-planner',
    name: 'Multi-Step Planner',
    description: 'Creates a plan, checks feasibility, then executes with tools.',
    category: 'planning',
    icon: '📋',
    difficulty: 'advanced',
    nodeCount: 5,
    definition: {
      id: 'multi-step-planner',
      initial: 'plan',
      states: {
        plan: { invoke: { src: 'prompt', input: { template: 'Create a step-by-step plan for: {{goal}}', variables: { goal: '$.trigger.goal' } }, onDone: 'evaluate' } },
        evaluate: { invoke: { src: 'llm', input: { messages: [{ role: 'user', content: 'Evaluate this plan and decide if tools are needed: $.plan.systemPrompt' }] }, onDone: 'checkTools' } },
        checkTools: { invoke: { src: 'condition', input: { field: 'evaluate.text', operator: 'contains', value: 'tool' } },
          always: [
            { target: 'executePlan', guard: { type: 'condition', params: { key: 'checkTools.branch', operator: '==', value: 'true' } } },
            { target: 'done' },
          ],
        },
        executePlan: { invoke: { src: 'tool-executor', input: { toolCalls: '$.evaluate.toolCalls' }, onDone: 'done' } },
        done: { type: 'final' },
      },
    },
    agentConfig: { model: 'smart', temperature: 0.5, maxSteps: 25, toolBindings: ['*'] },
  },
];

// ─── Helpers ────────────────────────────────────────────────

export function getTemplateBySlug(slug: string): WorkflowTemplate | undefined {
  return builtinTemplates.find(t => t.slug === slug);
}

export function getTemplatesByCategory(): Record<string, WorkflowTemplate[]> {
  const grouped: Record<string, WorkflowTemplate[]> = {};
  for (const t of builtinTemplates) {
    const group = grouped[t.category] ?? [];
    group.push(t);
    grouped[t.category] = group;
  }
  return grouped;
}
